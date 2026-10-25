import { z } from "zod";
import { eq } from "drizzle-orm";
import { contacts } from "../../drizzle/schema";
import * as db from "../db";
import { router, publicProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  generateStripeInvoicePaymentLink,
  refundStripeInvoicePayment,
  sendInvoiceEmailNotification
} from "../services/invoiceService";
import { recordCaseActivity } from "../services/caseActivityService";
import { getSafeStripe } from "../stripeClient";

export const invoicesRouter = router({
  /**
   * Lists all invoices with client details and line items for the Invoice Management console.
   */
  list: adminProcedure
    .input(
      z.object({
        status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled", "Voided", "Uncollectible", "all"]).optional(),
        clientId: z.number().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return await db.listAllInvoicesDetailed({
        status: input?.status,
        clientId: input?.clientId,
        search: input?.search,
        ownerId: ctx.user.id,
      });
    }),

  /**
   * Retrieves a single detailed invoice by ID.
   */
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const inv = await db.getInvoiceWithDetails(input.id);
      if (!inv) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }
      return inv;
    }),

  /**
   * Creates a one-time invoice with multiple line items, optional discount, and Stripe integration.
   */
  create: adminProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
        projectId: z.number().optional(),
        invoiceNumber: z.string().optional(),
        title: z.string().optional(),
        serviceDescription: z.string().optional(),
        lineItems: z.array(
          z.object({
            serviceId: z.number().optional(),
            description: z.string().min(1, "Description is required"),
            quantity: z.number().min(0.01),
            unitPrice: z.number().min(0),
            total: z.number().min(0).optional(),
          })
        ).min(1, "At least one line item is required"),
        discountAmount: z.number().optional().default(0),
        discountNote: z.string().optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        clientNotes: z.string().optional(),
        dueDate: z.string().or(z.date()).optional(),
        status: z.enum(["Draft", "Sent"]).optional().default("Draft"),
        sendEmailImmediately: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Resolve line items and calculate subtotal, discount, and final total
      const resolvedLineItems = input.lineItems.map((item) => ({
        ...item,
        total: item.total !== undefined ? item.total : item.quantity * item.unitPrice,
      }));
      const subtotal = resolvedLineItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      const discount = Math.max(0, Number(input.discountAmount) || 0);
      const finalTotal = Math.max(0, subtotal - discount);

      // Generate invoice number if not specified
      const invNum = input.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      // 2. Persist invoice to database
      const createdInvoice = await db.createOneTimeInvoice({
        clientId: input.clientId,
        projectId: input.projectId,
        invoiceNumber: invNum,
        title: input.title,
        serviceDescription: input.serviceDescription,
        amount: subtotal.toFixed(2),
        tax: "0.00",
        total: finalTotal.toFixed(2),
        discountAmount: discount.toFixed(2),
        discountNote: input.discountNote ?? undefined,
        notes: input.notes ?? undefined,
        internalNotes: input.internalNotes ?? undefined,
        clientNotes: input.clientNotes ?? undefined,
        status: input.status || "Draft",
        dueDate: input.dueDate,
        lineItems: resolvedLineItems,
      }, ctx.user.id);

      if (!createdInvoice) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create invoice" });
      }


      // Log invoice creation in Case Activity Timeline
      if (input.clientId) {
        try {
          await recordCaseActivity({
            studentContactId: input.clientId,
            title: `Invoice ${createdInvoice.invoiceNumber} Created`,
            description: `One-time invoice #${createdInvoice.invoiceNumber} created for $${finalTotal.toFixed(2)} (${input.status || "Draft"}).`,
            eventType: "billing",
            ownerName: ctx.user.name || "Advocate",
            ownerRole: "Staff",
            categoryColor: "blue",
          });
        } catch (err) {
          console.warn("[Invoice Activity] Could not log creation activity:", err);
        }
      }

      // 3. If Send immediately was requested or status is 'Sent', generate Stripe link & dispatch email
      if (input.sendEmailImmediately || input.status === "Sent") {
        let paymentUrl = createdInvoice.stripePaymentUrl;
        let stripeSessionId: string | undefined;

        if (createdInvoice.client?.email) {
          try {
            const linkResult = await generateStripeInvoicePaymentLink({
              invoiceId: createdInvoice.id,
              invoiceNumber: createdInvoice.invoiceNumber,
              amountDollars: finalTotal,
              customerEmail: createdInvoice.client.email,
              customerName: `${createdInvoice.client.firstName || ""} ${createdInvoice.client.lastName || ""}`.trim() || "Client",
              lineItems: resolvedLineItems as any,
            });
            paymentUrl = linkResult.url;
            stripeSessionId = linkResult.stripeSessionId;

            // Send branded email notification
            await sendInvoiceEmailNotification({
              invoice: { ...createdInvoice, total: finalTotal },
              client: createdInvoice.client,
              paymentUrl: paymentUrl,
            });

            // Update invoice record with Stripe URL and Sent timestamp
            await db.updateOneTimeInvoice(createdInvoice.id, {
              status: "Sent",
              stripePaymentUrl: paymentUrl,
              sentAt: new Date(),
              sentToEmail: createdInvoice.client.email,
            });
          } catch (stripeErr: any) {
            console.error("[Invoice Create] Stripe link or email dispatch failed:", stripeErr.message);
          }
        }
      }

      return await db.getInvoiceWithDetails(createdInvoice.id);
    }),

  /**
   * Updates an existing invoice. Editing allowed while in Draft status.
   * Once finalized, preserves original financial record and prevents silent mutation.
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        clientId: z.number().optional(),
        projectId: z.number().optional(),
        invoiceNumber: z.string().optional(),
        title: z.string().optional(),
        serviceDescription: z.string().optional(),
        lineItems: z.array(
          z.object({
            serviceId: z.number().optional(),
            description: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            total: z.number(),
          })
        ).optional(),
        discountAmount: z.number().optional(),
        discountNote: z.string().optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        clientNotes: z.string().optional(),
        dueDate: z.string().or(z.date()).optional(),
        status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled", "Voided", "Uncollectible"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getInvoiceWithDetails(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      // Guardrail: If finalized (not Draft), forbid modifying financial figures/line items
      if (existing.status !== "Draft" && input.lineItems && input.lineItems.length > 0) {
        const isModifyingItems = JSON.stringify(input.lineItems) !== JSON.stringify(
          existing.lineItems?.map((li: any) => ({
            serviceId: li.serviceId,
            description: li.description,
            quantity: Number(li.quantity),
            unitPrice: Number(li.unitPrice),
            total: Number(li.total),
          }))
        );
        if (isModifyingItems) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot modify line items or amounts of a finalized invoice. Please void this invoice or create a revision/credit note instead.",
          });
        }
      }

      let subtotal = Number(existing.amount);
      if (input.lineItems) {
        subtotal = input.lineItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      }

      const discount = input.discountAmount !== undefined ? Math.max(0, input.discountAmount) : Number(existing.discountAmount || 0);
      const finalTotal = Math.max(0, subtotal - discount);

      const updated = await db.updateOneTimeInvoice(input.id, {
        clientId: input.clientId,
        projectId: input.projectId,
        invoiceNumber: input.invoiceNumber,
        title: input.title,
        serviceDescription: input.serviceDescription,
        amount: subtotal.toFixed(2),
        total: finalTotal.toFixed(2),
        discountAmount: discount.toFixed(2),
        discountNote: input.discountNote,
        notes: input.notes,
        internalNotes: input.internalNotes,
        clientNotes: input.clientNotes,
        status: input.status,
        dueDate: input.dueDate,
        lineItems: input.lineItems,
      });

      return updated;
    }),

  /**
   * Sends or resends an invoice to the client via email and generates/refreshes the Stripe payment link.
   */
  send: adminProcedure
    .input(
      z.object({
        id: z.number(),
        recipientEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await db.getInvoiceWithDetails(input.id);
      if (!inv) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      const targetEmail = input.recipientEmail || inv.client?.email;
      if (!targetEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email address found for this client. Please provide a recipient email.",
        });
      }

      // Generate or retrieve Stripe payment link
      const totalAmount = Number(inv.total) || 0;
      const clientName = inv.client
        ? `${inv.client.firstName || ""} ${inv.client.lastName || ""}`.trim()
        : "Client";

      const { url: paymentUrl } = await generateStripeInvoicePaymentLink({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountDollars: totalAmount,
        customerEmail: targetEmail,
        customerName: clientName,
        lineItems: inv.lineItems as any,
      });

      // Dispatch branded email notification
      await sendInvoiceEmailNotification({
        invoice: inv,
        client: { ...inv.client, email: targetEmail },
        paymentUrl,
      });

      // Mark status as 'Sent' if currently Draft
      const updated = await db.updateOneTimeInvoice(inv.id, {
        status: inv.status === "Draft" ? "Sent" : (inv.status as any),
        stripePaymentUrl: paymentUrl,
        sentAt: new Date(),
        sentToEmail: targetEmail,
      });

      return {
        success: true,
        invoice: updated,
        paymentUrl,
      };
    }),

  /**
   * Voids an unpaid invoice.
   */
  void: adminProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const voided = await db.voidInvoice(input.id, input.reason);

      if (voided.clientId) {
        try {
          await recordCaseActivity({
            studentContactId: voided.clientId,
            title: `Invoice ${voided.invoiceNumber} Voided`,
            description: `Invoice #${voided.invoiceNumber} was voided by ${ctx.user.name || "Advocate"}.${input.reason ? ` Reason: ${input.reason}` : ""}`,
            eventType: "billing",
            ownerName: ctx.user.name || "Advocate",
            ownerRole: "Staff",
            categoryColor: "rose",
          });
        } catch (err) {
          console.warn("[Invoice Activity] Could not log void activity:", err);
        }
      }

      return voided;
    }),

  /**
   * Issues a refund for a paid invoice through Stripe.
   */
  refund: adminProcedure
    .input(
      z.object({
        id: z.number(),
        amount: z.number().optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await db.getInvoiceWithDetails(input.id);
      if (!inv) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (inv.status !== "Paid") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only paid invoices can be refunded.",
        });
      }

      const refundAmount = input.amount !== undefined ? input.amount : Number(inv.total);
      if (refundAmount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Refund amount must be greater than $0." });
      }

      // Process refund through Stripe
      const refundResult = await refundStripeInvoicePayment({
        paymentIntentId: inv.stripePaymentIntentId,
        amountDollars: refundAmount,
        reason: input.reason,
      });

      // Update database record
      const isFullRefund = refundAmount >= Number(inv.total);
      const refundedRecord = await db.recordInvoiceRefund(inv.id, {
        refundedAmount: refundAmount.toFixed(2),
        refundStatus: isFullRefund ? "refunded" : "partially_refunded",
        reason: input.reason,
      });

      // Log in Case Activity Timeline
      if (inv.clientId) {
        try {
          await recordCaseActivity({
            studentContactId: inv.clientId,
            title: `Refund Processed for Invoice ${inv.invoiceNumber}`,
            description: `Refund of $${refundAmount.toFixed(2)} issued via Stripe (${refundResult.refundId}). Reason: ${input.reason || "Customer refund requested"}.`,
            eventType: "billing",
            ownerName: ctx.user.name || "Advocate",
            ownerRole: "Staff",
            categoryColor: "rose",
          });
        } catch (err) {
          console.warn("[Invoice Activity] Could not log refund activity:", err);
        }
      }

      return {
        success: true,
        refundId: refundResult.refundId,
        amountRefunded: refundResult.amountRefunded,
        invoice: refundedRecord,
      };
    }),

  /**
   * Staff Action: Records an external payment (check, wire, cash, offline card) against an invoice.
   */
  recordExternalPayment: adminProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        paymentMethod: z.string().min(1, "Payment method is required"),
        reference: z.string().optional(),
        notes: z.string().optional(),
        amountPaid: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getInvoiceWithDetails(input.invoiceId);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (existing.status === "Paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invoice is already marked as paid." });
      }

      if (existing.status === "Voided" || existing.status === "Cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot record payment on a voided invoice." });
      }

      const paidRecord = await db.recordExternalPayment(input.invoiceId, {
        paymentMethod: input.paymentMethod as any,
        reference: input.reference,
        notes: input.notes,
        amountPaid: input.amountPaid || existing.total,
        recordedBy: ctx.user.id,
      });

      // Record in Case Activity Timeline
      if (existing.clientId) {
        try {
          await recordCaseActivity({
            studentContactId: existing.clientId,
            title: `External Payment Recorded for Invoice ${existing.invoiceNumber}`,
            description: `Payment of $${input.amountPaid || existing.total} recorded via ${input.paymentMethod} by ${ctx.user.name || "Staff"}.${input.reference ? ` Ref: ${input.reference}.` : ""}${input.notes ? ` Notes: ${input.notes}` : ""}`,
            eventType: "billing",
            ownerName: ctx.user.name || "Advocate",
            ownerRole: "Staff",
            categoryColor: "emerald",
          });
        } catch (err) {
          console.warn("[Invoice Activity] Could not log external payment activity:", err);
        }
      }

      return paidRecord;
    }),

  /**
   * Returns complete payment and lifecycle audit history for an invoice.
   */
  getPaymentHistory: publicProcedure
    .input(z.object({ invoiceId: z.number() }))
    .query(async ({ input }) => {
      const inv = await db.getInvoiceWithDetails(input.invoiceId);
      if (!inv) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      const events: Array<{
        id: string;
        date: Date | string;
        title: string;
        description: string;
        type: "creation" | "issuance" | "payment" | "void" | "refund";
      }> = [];

      // Creation event
      events.push({
        id: "evt-create",
        date: inv.createdAt,
        title: `Invoice ${inv.invoiceNumber} Created`,
        description: `Created with amount $${inv.total}`,
        type: "creation",
      });

      // Issuance event
      if (inv.sentAt) {
        events.push({
          id: "evt-sent",
          date: inv.sentAt,
          title: "Invoice Dispatched",
          description: `Dispatched to ${inv.sentToEmail || "Client"} with secure payment link`,
          type: "issuance",
        });
      }

      // External payment event
      if (inv.externalPaymentRecordedAt) {
        events.push({
          id: "evt-ext-payment",
          date: inv.externalPaymentRecordedAt,
          title: `External Payment: ${inv.externalPaymentMethod}`,
          description: `Amount: $${inv.amountPaid || inv.total}${inv.externalPaymentReference ? ` | Ref: ${inv.externalPaymentReference}` : ""}`,
          type: "payment",
        });
      } else if (inv.paidDate && (inv.status === "Paid" || inv.stripePaymentIntentId)) {
        events.push({
          id: "evt-stripe-payment",
          date: inv.paidDate,
          title: "Payment Processed",
          description: `Processed online for $${inv.total}${inv.paymentStatusNote ? ` (${inv.paymentStatusNote})` : ""}`,
          type: "payment",
        });
      }

      // Refund event
      if (inv.refundStatus && inv.refundStatus !== "none") {
        events.push({
          id: "evt-refund",
          date: inv.updatedAt,
          title: `Refund Processed ($${inv.refundedAmount})`,
          description: `Refund status: ${inv.refundStatus}`,
          type: "refund",
        });
      }

      // Void event
      if (inv.status === "Voided") {
        events.push({
          id: "evt-void",
          date: inv.updatedAt,
          title: "Invoice Voided",
          description: inv.notes?.includes("[Voided") ? inv.notes : "Invoice marked as voided",
          type: "void",
        });
      }

      return events;
    }),

  /**
   * Retrieves outstanding invoices and aggregate payable balance for a family account.
   * Used by PG-023-STU contextual alert and Billing & Payments "Payment Due" section.
   */
  getFamilyOutstandingBalance: publicProcedure
    .input(z.object({ contactId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const clientId = input?.contactId || (ctx.user as any)?.contactId || (ctx.user as any)?.id;
      if (!clientId) {
        return { totalBalance: 0, count: 0, hasOverdue: false, invoices: [] };
      }

      const res = await db.getFamilyOutstandingInvoices(Number(clientId));
      const now = Date.now();
      const hasOverdue = res.invoices.some(
        (inv: any) =>
          inv.status === "Overdue" ||
          (inv.dueDate && new Date(inv.dueDate).getTime() < now)
      );

      // Sort invoices with overdue invoices first, then earliest due date, then newest
      const sortedInvoices = [...res.invoices].sort((a: any, b: any) => {
        const aOverdue = a.status === "Overdue" || (a.dueDate && new Date(a.dueDate).getTime() < now);
        const bOverdue = b.status === "Overdue" || (b.dueDate && new Date(b.dueDate).getTime() < now);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      return {
        totalBalance: res.totalBalance,
        count: res.count,
        hasOverdue,
        invoices: sortedInvoices.map((inv: any) => {
          const isOverdue = inv.status === "Overdue" || (inv.dueDate && new Date(inv.dueDate).getTime() < now);
          const totalNum = Number(inv.total) || 0;
          const paidNum = Number(inv.amountPaid) || 0;
          const remainingBalance = Math.max(0, totalNum - paidNum);
          return {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            title: inv.title || `Invoice ${inv.invoiceNumber}`,
            total: inv.total,
            amountPaid: inv.amountPaid || "0.00",
            remainingBalance: remainingBalance > 0 ? remainingBalance : totalNum,
            dueDate: inv.dueDate,
            status: isOverdue ? "Overdue" : inv.status,
            isOverdue: !!isOverdue,
            stripePaymentUrl: inv.stripePaymentUrl,
            createdAt: inv.createdAt,
          };
        }),
      };
    }),

  /**
   * Fast Payment Experience: Pay an invoice with family's saved payment method.
   * One-click payment confirmation without reentering billing details.
   */
  payWithSavedMethod: publicProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        paymentMethodId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await db.getInvoiceWithDetails(input.invoiceId);
      if (!inv) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      // ─── 1. SERVER-SIDE INVOICE OWNERSHIP & AUTH ENFORCEMENT ─────────────────
      let callerContactId: number | null = null;
      if ((ctx as any).portalContactId) {
        callerContactId = Number((ctx as any).portalContactId);
      } else if (ctx.user) {
        if (ctx.user.role === "admin" || (ctx as any).isAdminPreview) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Portal preview mode is view-only. Staff cannot submit payments on behalf of clients via portal preview.",
          });
        }
        callerContactId = Number((ctx.user as any).contactId ?? ctx.user.id);
      }

      if (!callerContactId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in to submit an invoice payment.",
        });
      }

      if (Number(inv.clientId) !== callerContactId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized: You do not have permission to pay an invoice belonging to another family account.",
        });
      }

      // Idempotency: If already paid, return early to prevent duplicate charges
      if (inv.status === "Paid") {
        return {
          success: true,
          alreadyPaid: true,
          amountPaid: inv.total,
          invoiceNumber: inv.invoiceNumber,
          receiptUrl: `/receipt/${inv.id}`,
          message: "This invoice has already been paid.",
        };
      }

      if (inv.status === "Voided" || inv.status === "Cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot pay a voided or cancelled invoice." });
      }

      // Retrieve saved payment methods for this family
      const savedMethods = await db.getFamilyPaymentMethods(inv.clientId);
      let targetMethod: any = null;

      if (input.paymentMethodId) {
        targetMethod = savedMethods.find((m: any) => m.id === input.paymentMethodId);
      } else {
        targetMethod = savedMethods.find((m: any) => m.isDefault) || savedMethods[0];
      }

      // Fallback: If no method in savedPaymentMethods table yet, check contact's default card
      const cardBrand = targetMethod?.brand || inv.client?.defaultPaymentMethodBrand || "Visa";
      const cardLast4 = targetMethod?.last4 || inv.client?.defaultPaymentMethodLast4 || "4242";
      const stripePmId = targetMethod?.stripePaymentMethodId || inv.client?.defaultPaymentMethodId;

      const isProduction = process.env.NODE_ENV === "production";
      const stripe = getSafeStripe();

      // ─── 2. PRODUCTION GATEWAY INTEGRITY (NO FABRICATED INTENTS) ────────────
      if (isProduction) {
        if (!stripe) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Payment processing gateway is not configured. Please contact Waypoint Advocates to complete your payment.",
          });
        }
        if (!stripePmId || stripePmId.startsWith("pm_mock_") || !inv.client?.stripeCustomerId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A verified payment method on file is required to complete this payment.",
          });
        }
      }

      let stripePaymentIntentId = `pi_dev_sim_${Date.now()}`;
      let isSimulated = false;

      if (stripe && stripePmId && !stripePmId.startsWith("pm_mock_") && inv.client?.stripeCustomerId) {
        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(inv.total) * 100),
            currency: "usd",
            customer: inv.client.stripeCustomerId,
            payment_method: stripePmId,
            off_session: false,
            confirm: true,
            return_url: `${process.env.BASE_URL || "http://localhost:3000"}/portal?tab=billing&invoiceId=${inv.id}`,
            metadata: {
              invoiceId: String(inv.id),
              invoiceNumber: inv.invoiceNumber,
            },
          });

          if (paymentIntent.status === "requires_action") {
            return {
              success: false,
              requiresAction: true,
              clientSecret: paymentIntent.client_secret,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
            };
          }

          stripePaymentIntentId = paymentIntent.id;
        } catch (stripeErr: any) {
          console.error("[Saved Payment Error]:", stripeErr.message);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Card processing failed: ${stripeErr.message}. Please try a different card.`,
          });
        }
      } else {
        if (isProduction) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Live gateway confirmation required in production.",
          });
        }
        isSimulated = true;
      }

      // Record invoice as Paid
      const paymentNote = isSimulated
        ? `[SIMULATED - DEV ONLY] Paid via saved card (${cardBrand.toUpperCase()} ending in ${cardLast4})`
        : `Paid via saved card (${cardBrand.toUpperCase()} ending in ${cardLast4})`;

      const updated = await db.recordInvoicePayment(inv.id, {
        stripePaymentIntentId,
        paymentNote,
      });

      // Record in Case Activity Timeline
      try {
        await recordCaseActivity({
          studentContactId: inv.clientId,
          title: `Invoice ${inv.invoiceNumber} Paid`,
          description: `Payment of $${Number(inv.total).toFixed(2)} received via saved payment method (${cardBrand.toUpperCase()} •••• ${cardLast4}).`,
          eventType: "billing",
          ownerName: "Client Portal",
          ownerRole: "Parent",
          categoryColor: "emerald",
        });
      } catch (err) {
        console.warn("[Invoice Activity] Could not log payment activity:", err);
      }

      return {
        success: true,
        alreadyPaid: false,
        amountPaid: inv.total,
        invoiceNumber: inv.invoiceNumber,
        receiptUrl: `/receipt/${inv.id}`,
        invoice: updated,
      };
    }),

  /**
   * Fast Payment Experience: Pay an invoice with a new payment method.
   * Supports optional saving for future payments without disrupting existing default.
   */
  payWithNewMethod: publicProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        brand: z.string().default("visa"),
        last4: z.string().default("4242"),
        expMonth: z.number().optional().default(12),
        expYear: z.number().optional().default(2028),
        saveForFuture: z.boolean().optional().default(false),
        setAsDefault: z.boolean().optional().default(false),
        stripePaymentMethodId: z.string().optional(),
        simulateRequiresAction: z.boolean().optional().default(false),
        simulateFailure: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await db.getInvoiceWithDetails(input.invoiceId);
      if (!inv) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      // ─── 1. SERVER-SIDE INVOICE OWNERSHIP & AUTH ENFORCEMENT ─────────────────
      let callerContactId: number | null = null;
      if ((ctx as any).portalContactId) {
        callerContactId = Number((ctx as any).portalContactId);
      } else if (ctx.user) {
        if (ctx.user.role === "admin" || (ctx as any).isAdminPreview) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Portal preview mode is view-only. Staff cannot submit payments on behalf of clients via portal preview.",
          });
        }
        callerContactId = Number((ctx.user as any).contactId ?? ctx.user.id);
      }

      if (!callerContactId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in to submit an invoice payment.",
        });
      }

      if (Number(inv.clientId) !== callerContactId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized: You do not have permission to pay an invoice belonging to another family account.",
        });
      }

      // Idempotency safeguard
      if (inv.status === "Paid") {
        return {
          success: true,
          alreadyPaid: true,
          amountPaid: inv.total,
          invoiceNumber: inv.invoiceNumber,
          receiptUrl: `/receipt/${inv.id}`,
          message: "This invoice has already been paid.",
        };
      }

      const isProduction = process.env.NODE_ENV === "production";

      // Error simulation / test handling (strictly prohibited in production)
      if (input.simulateFailure || input.simulateRequiresAction) {
        if (isProduction) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Payment simulation parameters are strictly disabled in production.",
          });
        }
      }

      if (input.simulateFailure) {
        if (inv.clientId) {
          try {
            await recordCaseActivity({
              studentContactId: inv.clientId,
              title: `Payment Attempt Failed for Invoice ${inv.invoiceNumber}`,
              description: `Payment attempt of $${Number(inv.total).toFixed(2)} with new card (${input.brand.toUpperCase()} •••• ${input.last4}) failed: Card was declined.`,
              eventType: "billing",
              ownerName: "Client Portal",
              ownerRole: "Parent",
              categoryColor: "rose",
            });
          } catch (err) {}
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Card was declined. Please check the details or try a different card.",
        });
      }

      // 3D Secure / additional authentication simulation
      if (input.simulateRequiresAction) {
        return {
          success: false,
          requiresAction: true,
          clientSecret: `pi_test_3ds_${inv.id}_secret`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
        };
      }

      const stripe = getSafeStripe();

      // ─── 2. PRODUCTION GATEWAY INTEGRITY ────────────────────────────────────
      if (isProduction) {
        if (!stripe) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Payment processing gateway is not configured. Please contact Waypoint Advocates to complete your payment.",
          });
        }
        if (!input.stripePaymentMethodId || input.stripePaymentMethodId.startsWith("pm_mock_")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A verified card token is required to complete payment.",
          });
        }
      }

      const stripePmId = input.stripePaymentMethodId || `pm_new_${Date.now()}`;
      let stripeIntentId = `pi_dev_sim_${Date.now()}`;
      let isSimulated = false;

      // Save payment method for future if requested
      if (input.saveForFuture && inv.clientId) {
        try {
          await db.addFamilyPaymentMethod({
            clientId: inv.clientId,
            stripePaymentMethodId: stripePmId,
            brand: input.brand,
            last4: input.last4,
            expMonth: input.expMonth,
            expYear: input.expYear,
            isDefault: input.setAsDefault,
          });
        } catch (err) {
          console.warn("[Saved Payment Method] Could not save new method:", err);
        }
      }

      if (stripe && input.stripePaymentMethodId && !input.stripePaymentMethodId.startsWith("pm_mock_") && inv.client?.stripeCustomerId) {
        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(inv.total) * 100),
            currency: "usd",
            customer: inv.client.stripeCustomerId,
            payment_method: input.stripePaymentMethodId,
            confirm: true,
            return_url: `${process.env.BASE_URL || "http://localhost:3000"}/portal?tab=billing&invoiceId=${inv.id}`,
            metadata: {
              invoiceId: String(inv.id),
              invoiceNumber: inv.invoiceNumber,
            },
          });

          if (paymentIntent.status === "requires_action") {
            return {
              success: false,
              requiresAction: true,
              clientSecret: paymentIntent.client_secret,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
            };
          }

          stripeIntentId = paymentIntent.id;
        } catch (stripeErr: any) {
          console.error("[New Payment Error]:", stripeErr.message);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Card processing failed: ${stripeErr.message}. Please check card details or try another payment method.`,
          });
        }
      } else {
        if (isProduction) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Live gateway confirmation required in production.",
          });
        }
        isSimulated = true;
      }

      // Mark invoice as Paid
      const paymentNote = isSimulated
        ? `[SIMULATED - DEV ONLY] Paid via new card (${input.brand.toUpperCase()} ending in ${input.last4})`
        : `Paid via new card (${input.brand.toUpperCase()} ending in ${input.last4})`;

      const updated = await db.recordInvoicePayment(inv.id, {
        stripePaymentIntentId: stripeIntentId,
        paymentNote,
      });

      // Record in Case Activity Timeline
      if (inv.clientId) {
        try {
          await recordCaseActivity({
            studentContactId: inv.clientId,
            title: `Invoice ${inv.invoiceNumber} Paid`,
            description: `Payment of $${Number(inv.total).toFixed(2)} received via new card (${input.brand.toUpperCase()} •••• ${input.last4}).`,
            eventType: "billing",
            ownerName: "Client Portal",
            ownerRole: "Parent",
            categoryColor: "emerald",
          });
        } catch (err) {
          console.warn("[Invoice Activity] Could not log payment activity:", err);
        }
      }

      return {
        success: true,
        alreadyPaid: false,
        amountPaid: inv.total,
        invoiceNumber: inv.invoiceNumber,
        receiptUrl: `/receipt/${inv.id}`,
        invoice: updated,
      };
    }),

  /**
   * Lists saved payment methods for a family account.
   * Strips sensitive credentials; only returns brand, masked last4, expiration, and default flag.
   */
  listPaymentMethods: publicProcedure
    .input(z.object({ contactId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const clientId = input?.contactId || (ctx.user as any)?.contactId || (ctx.user as any)?.id;
      if (!clientId) {
        return [];
      }

      const methods = await db.getFamilyPaymentMethods(Number(clientId));
      if (methods.length > 0) {
        return methods.map((m: any) => ({
          id: m.id,
          brand: m.brand,
          last4: m.last4,
          expMonth: m.expMonth,
          expYear: m.expYear,
          isDefault: Boolean(m.isDefault),
          createdAt: m.createdAt,
        }));
      }

      // If no rows in table yet, provide fallback from contact record
      const [contact] = await (await db.getDb())
        .select({
          brand: contacts.defaultPaymentMethodBrand,
          last4: contacts.defaultPaymentMethodLast4,
          exp: contacts.defaultPaymentMethodExp,
          id: contacts.defaultPaymentMethodId,
        })
        .from(contacts)
        .where(eq(contacts.id, Number(clientId)))
        .limit(1);

      if (contact && contact.last4) {
        return [
          {
            id: 1,
            brand: contact.brand || "visa",
            last4: contact.last4,
            expMonth: 12,
            expYear: 2028,
            isDefault: true,
            createdAt: new Date(),
          },
        ];
      }

      // Default mock fallback for standard parent view
      return [
        {
          id: 1,
          brand: "visa",
          last4: "4242",
          expMonth: 12,
          expYear: 2028,
          isDefault: true,
          createdAt: new Date(),
        },
      ];
    }),

  /**
   * Adds a new saved payment method for a family account.
   */
  addPaymentMethod: publicProcedure
    .input(
      z.object({
        contactId: z.number().optional(),
        brand: z.string().default("visa"),
        last4: z.string().min(4).max(4),
        expMonth: z.number().optional().default(12),
        expYear: z.number().optional().default(2028),
        isDefault: z.boolean().optional().default(false),
        stripePaymentMethodId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = input?.contactId || (ctx.user as any)?.contactId || (ctx.user as any)?.id;
      if (!clientId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No family account identified." });
      }

      const methodId = await db.addFamilyPaymentMethod({
        clientId: Number(clientId),
        stripePaymentMethodId: input.stripePaymentMethodId || `pm_${Date.now()}`,
        brand: input.brand,
        last4: input.last4,
        expMonth: input.expMonth,
        expYear: input.expYear,
        isDefault: input.isDefault,
      });

      return { success: true, methodId };
    }),

  /**
   * Sets a saved payment method as default.
   */
  setDefaultPaymentMethod: publicProcedure
    .input(
      z.object({
        methodId: z.number(),
        contactId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = input?.contactId || (ctx.user as any)?.contactId || (ctx.user as any)?.id;
      if (!clientId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No family account identified." });
      }

      await db.setDefaultFamilyPaymentMethod(Number(clientId), input.methodId);
      return { success: true };
    }),

  /**
   * Removes an eligible saved payment method.
   */
  removePaymentMethod: publicProcedure
    .input(
      z.object({
        methodId: z.number(),
        contactId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = input?.contactId || (ctx.user as any)?.contactId || (ctx.user as any)?.id;
      if (!clientId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No family account identified." });
      }

      const removed = await db.removeFamilyPaymentMethod(Number(clientId), input.methodId);
      return { success: removed };
    }),

  /**
   * Parent Portal Procedure: Returns client's invoices with itemized line items and payment links.
   * Sanitizes internal administrative notes.
   */
  clientList: publicProcedure
    .input(
      z.object({
        contactId: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Determine client ID from session or input
      const clientId = input?.contactId || (ctx.user as any)?.contactId || (ctx.user as any)?.id;
      if (!clientId) {
        return [];
      }

      const clientInvoices = await db.listAllInvoicesDetailed({
        clientId: Number(clientId),
      });

      // Sanitize internal notes for parent safety (never expose internalNotes)
      return clientInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        title: inv.title || `Invoice ${inv.invoiceNumber}`,
        serviceDescription: inv.serviceDescription,
        clientNotes: inv.clientNotes,
        amount: inv.amount,
        total: inv.total,
        discountAmount: inv.discountAmount,
        discountNote: inv.discountNote,
        status: inv.status,
        dueDate: inv.dueDate,
        paidDate: inv.paidDate,
        amountPaid: inv.amountPaid,
        externalPaymentMethod: inv.externalPaymentMethod,
        stripePaymentUrl: inv.stripePaymentUrl,
        createdAt: inv.createdAt,
        student: inv.student,
        lineItems: (inv.lineItems || []).map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      }));
    }),

  /**
   * Generates or refreshes a Stripe Checkout link for client to pay an invoice online.
   */
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        invoiceId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const inv = await db.getInvoiceWithDetails(input.invoiceId);
      if (!inv) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (inv.status === "Paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invoice is already paid." });
      }

      if (inv.status === "Voided" || inv.status === "Cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invoice has been voided." });
      }

      const clientEmail = inv.client?.email || "billing@waypointadvocates.com";
      const clientName = inv.client
        ? `${inv.client.firstName || ""} ${inv.client.lastName || ""}`.trim()
        : "Client";

      const result = await generateStripeInvoicePaymentLink({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountDollars: Number(inv.total),
        customerEmail: clientEmail,
        customerName: clientName,
        lineItems: inv.lineItems as any,
      });

      // Cache URL on invoice if not set
      if (!inv.stripePaymentUrl) {
        await db.updateOneTimeInvoice(inv.id, {
          stripePaymentUrl: result.url,
        });
      }

      return {
        url: result.url,
        invoiceNumber: inv.invoiceNumber,
        total: inv.total,
      };
    }),
});

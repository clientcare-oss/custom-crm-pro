import { z } from "zod";
import * as db from "../db";
import { router, publicProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  generateStripeInvoicePaymentLink,
  refundStripeInvoicePayment,
  sendInvoiceEmailNotification
} from "../services/invoiceService";
import { recordCaseActivity } from "../services/caseActivityService";

export const invoicesRouter = router({
  /**
   * Lists all invoices with client details and line items for the Invoice Management console.
   */
  list: adminProcedure
    .input(
      z.object({
        status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled", "Voided", "all"]).optional(),
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
        lineItems: z.array(
          z.object({
            serviceId: z.number().optional(),
            description: z.string().min(1, "Description is required"),
            quantity: z.number().min(0.01),
            unitPrice: z.number().min(0),
            total: z.number().min(0),
          })
        ).min(1, "At least one line item is required"),
        discountAmount: z.number().optional().default(0),
        discountNote: z.string().optional(),
        notes: z.string().optional(),
        dueDate: z.string().or(z.date()).optional(),
        status: z.enum(["Draft", "Sent"]).optional().default("Draft"),
        sendEmailImmediately: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Calculate subtotal, discount, and final total
      const subtotal = input.lineItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      const discount = Math.max(0, Number(input.discountAmount) || 0);
      const finalTotal = Math.max(0, subtotal - discount);

      // Generate invoice number if not specified
      const invNum = input.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      // 2. Persist invoice to database
      const createdInvoice = await db.createOneTimeInvoice({
        clientId: input.clientId,
        projectId: input.projectId,
        invoiceNumber: invNum,
        amount: subtotal.toFixed(2),
        tax: "0.00",
        total: finalTotal.toFixed(2),
        discountAmount: discount.toFixed(2),
        discountNote: input.discountNote ?? undefined,
        notes: input.notes ?? undefined,
        status: input.status || "Draft",
        dueDate: input.dueDate,
        lineItems: input.lineItems,
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
              lineItems: input.lineItems,
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
   * Updates an existing invoice.
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        clientId: z.number().optional(),
        invoiceNumber: z.string().optional(),
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
        dueDate: z.string().or(z.date()).optional(),
        status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled", "Voided"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getInvoiceWithDetails(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      let subtotal = Number(existing.amount);
      if (input.lineItems) {
        subtotal = input.lineItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      }

      const discount = input.discountAmount !== undefined ? Math.max(0, input.discountAmount) : Number(existing.discountAmount || 0);
      const finalTotal = Math.max(0, subtotal - discount);

      const updated = await db.updateOneTimeInvoice(input.id, {
        clientId: input.clientId,
        invoiceNumber: input.invoiceNumber,
        amount: subtotal.toFixed(2),
        total: finalTotal.toFixed(2),
        discountAmount: discount.toFixed(2),
        discountNote: input.discountNote,
        notes: input.notes,
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

      // Sanitize internal notes for parent safety
      return clientInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        total: inv.total,
        discountAmount: inv.discountAmount,
        discountNote: inv.discountNote,
        status: inv.status,
        dueDate: inv.dueDate,
        paidDate: inv.paidDate,
        stripePaymentUrl: inv.stripePaymentUrl,
        createdAt: inv.createdAt,
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

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requireStaffModule } from "../_core/trpc";
import { checkBackendActionPermission } from "../_core/staffAccess";
import {
  getPaymentStationConfigStatus,
  searchPaymentStationClients,
  getClientBillingContext,
  createCardByPhonePaymentIntent,
  chargeSavedCardPayment,
  createPaymentStationLink,
  verifyStripePaymentResult,
  sendPaymentStationReceipt,
  listRecentPaymentStationTransactions,
  type StaffCollectorIdentity,
} from "../services/paymentStationService";

const posReadProcedure = requireStaffModule("payment_station", "view");
const posCollectProcedure = requireStaffModule("payment_station", "edit");

function assertCanCollect(ctx: { staffAccess: Parameters<typeof checkBackendActionPermission>[0] }): void {
  const allowed =
    checkBackendActionPermission(ctx.staffAccess, "collect_payments") ||
    checkBackendActionPermission(ctx.staffAccess, "modify_billing") ||
    ctx.staffAccess.hasAdminAccess;
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your staff role is not authorized to collect payments at Payment Station.",
    });
  }
}

function buildCollector(ctx: {
  user: { id: number; name?: string | null; email?: string | null };
  staffAccess: { primaryRole: string };
}): StaffCollectorIdentity {
  return {
    userId: ctx.user.id,
    name: ctx.user.name || ctx.user.email || `Staff #${ctx.user.id}`,
    email: ctx.user.email || "",
    role: ctx.staffAccess.primaryRole,
  };
}

export const paymentStationRouter = router({
  getConfig: posReadProcedure.query(async ({ ctx }) => {
    const config = await getPaymentStationConfigStatus();
    const canCollect =
      checkBackendActionPermission(ctx.staffAccess, "collect_payments") ||
      checkBackendActionPermission(ctx.staffAccess, "modify_billing") ||
      ctx.staffAccess.hasAdminAccess;
    const canRefund =
      checkBackendActionPermission(ctx.staffAccess, "issue_refunds") ||
      ctx.staffAccess.hasAdminAccess;

    return {
      ...config,
      permissions: {
        canCollect,
        canRefund,
        role: ctx.staffAccess.primaryRole,
        staffName: ctx.user.name || ctx.user.email || "Authorized Staff",
      },
    };
  }),

  searchClients: posReadProcedure
    .input(z.object({ query: z.string().max(120).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await searchPaymentStationClients(ctx.user.id, input?.query);
    }),

  getClientBillingContext: posReadProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(async ({ input }) => {
      try {
        return await getClientBillingContext(input.clientId);
      } catch (err) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: err instanceof Error ? err.message : "Client billing context not found.",
        });
      }
    }),

  listRecentPayments: posReadProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const items = await listRecentPaymentStationTransactions(input?.limit ?? 25);
      const canRefund =
        checkBackendActionPermission(ctx.staffAccess, "issue_refunds") ||
        ctx.staffAccess.hasAdminAccess;
      return { items, canRefund };
    }),

  /**
   * PCI-safe Card by Phone: creates a Stripe PaymentIntent server-side and returns
   * `clientSecret` so raw card details are submitted directly via Stripe Elements.
   * Never accepts card number or CVC in request input.
   */
  createCardPaymentIntent: posCollectProcedure
    .input(
      z.object({
        idempotencyKey: z.string().min(8).max(120),
        mode: z.enum(["invoice", "service", "donation"]),
        amountCents: z.number().int().min(50).max(99_999_999),
        clientId: z.number().int().positive().nullable().optional(),
        invoiceId: z.number().int().positive().nullable().optional(),
        serviceId: z.number().int().positive().nullable().optional(),
        purposeLabel: z.string().max(200).nullable().optional(),
        donorName: z.string().max(200).nullable().optional(),
        donorEmail: z.string().email().or(z.literal("")).nullable().optional(),
        donorAddress: z.string().max(300).nullable().optional(),
        fundId: z.string().max(64).nullable().optional(),
        fundName: z.string().max(120).nullable().optional(),
        noGoodsOrServicesProvided: z.boolean().optional(),
        goodsOrServicesDescription: z.string().max(240).nullable().optional(),
        goodsOrServicesFmvCents: z.number().int().min(0).max(99_999_999).optional(),
        donationNote: z.string().max(300).nullable().optional(),
        saveCardToCustomer: z.boolean().optional(),
        setAsDefaultPaymentMethod: z.boolean().optional(),
        replacePaymentMethodId: z.string().max(200).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanCollect(ctx);
      try {
        return await createCardByPhonePaymentIntent({
          ownerId: ctx.user.id,
          collector: buildCollector(ctx),
          ...input,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unable to initialize card payment.";
        const isConfig = /not configured/i.test(msg);
        throw new TRPCError({
          code: isConfig ? "PRECONDITION_FAILED" : "BAD_REQUEST",
          message: msg,
        });
      }
    }),

  chargeSavedCard: posCollectProcedure
    .input(
      z.object({
        idempotencyKey: z.string().min(8).max(120),
        mode: z.enum(["invoice", "service", "donation"]),
        amountCents: z.number().int().min(50).max(99_999_999),
        clientId: z.number().int().positive(),
        paymentMethodId: z.string().min(4).max(200),
        invoiceId: z.number().int().positive().nullable().optional(),
        serviceId: z.number().int().positive().nullable().optional(),
        purposeLabel: z.string().max(200).nullable().optional(),
        donorName: z.string().max(200).nullable().optional(),
        donorEmail: z.string().email().or(z.literal("")).nullable().optional(),
        donorAddress: z.string().max(300).nullable().optional(),
        fundId: z.string().max(64).nullable().optional(),
        fundName: z.string().max(120).nullable().optional(),
        noGoodsOrServicesProvided: z.boolean().optional(),
        goodsOrServicesDescription: z.string().max(240).nullable().optional(),
        goodsOrServicesFmvCents: z.number().int().min(0).max(99_999_999).optional(),
        donationNote: z.string().max(300).nullable().optional(),
        saveCardToCustomer: z.boolean().optional(),
        setAsDefaultPaymentMethod: z.boolean().optional(),
        replacePaymentMethodId: z.string().max(200).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanCollect(ctx);
      try {
        return await chargeSavedCardPayment({
          ownerId: ctx.user.id,
          collector: buildCollector(ctx),
          ...input,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unable to charge saved card.";
        const isConfig = /not configured/i.test(msg);
        throw new TRPCError({
          code: isConfig ? "PRECONDITION_FAILED" : "BAD_REQUEST",
          message: msg,
        });
      }
    }),

  createPaymentLink: posCollectProcedure
    .input(
      z.object({
        idempotencyKey: z.string().min(8).max(120),
        mode: z.enum(["invoice", "service", "donation"]),
        amountCents: z.number().int().min(50).max(99_999_999),
        clientId: z.number().int().positive().nullable().optional(),
        invoiceId: z.number().int().positive().nullable().optional(),
        serviceId: z.number().int().positive().nullable().optional(),
        purposeLabel: z.string().max(200).nullable().optional(),
        donorName: z.string().max(200).nullable().optional(),
        donorEmail: z.string().email().or(z.literal("")).nullable().optional(),
        donorAddress: z.string().max(300).nullable().optional(),
        fundId: z.string().max(64).nullable().optional(),
        fundName: z.string().max(120).nullable().optional(),
        noGoodsOrServicesProvided: z.boolean().optional(),
        goodsOrServicesDescription: z.string().max(240).nullable().optional(),
        goodsOrServicesFmvCents: z.number().int().min(0).max(99_999_999).optional(),
        donationNote: z.string().max(300).nullable().optional(),
        sendByEmail: z.boolean().optional().default(false),
        recipientEmail: z.string().email().or(z.literal("")).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanCollect(ctx);
      const reqOrigin =
        (ctx.req?.headers?.origin as string | undefined) ||
        process.env.BASE_URL ||
        "http://localhost:3000";
      try {
        return await createPaymentStationLink({
          ownerId: ctx.user.id,
          collector: buildCollector(ctx),
          origin: reqOrigin,
          ...input,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unable to generate payment link.";
        const isConfig = /not configured/i.test(msg);
        throw new TRPCError({
          code: isConfig ? "PRECONDITION_FAILED" : "BAD_REQUEST",
          message: msg,
        });
      }
    }),

  verifyPaymentResult: posCollectProcedure
    .input(
      z.object({
        paymentIntentId: z.string().min(4).max(200).optional(),
        checkoutSessionId: z.string().min(4).max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanCollect(ctx);
      try {
        return await verifyStripePaymentResult({
          ownerId: ctx.user.id,
          collector: buildCollector(ctx),
          ...input,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not verify payment with Stripe.";
        throw new TRPCError({
          code: /not configured/i.test(msg) ? "PRECONDITION_FAILED" : "BAD_REQUEST",
          message: msg,
        });
      }
    }),

  sendReceipt: posCollectProcedure
    .input(
      z.object({
        transactionId: z.number().int().positive(),
        recipientEmail: z.string().email().or(z.literal("")).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanCollect(ctx);
      try {
        return await sendPaymentStationReceipt({
          ownerId: ctx.user.id,
          collector: buildCollector(ctx),
          transactionId: input.transactionId,
          recipientEmail: input.recipientEmail,
        });
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Could not send receipt.",
        });
      }
    }),
});

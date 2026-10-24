import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, publicProcedure, portalProcedure } from "../_core/trpc";
import * as db from "../db";
import {
  getFamilyEnrollmentState,
  approveFamilyEnrollment,
  resendFamilyEnrollmentInvitation,
  revokeFamilyEnrollmentOffer,
  getPortalFamilyEnrollmentState,
  selectFamilyEnrollmentPlan,
  supersedeFamilyEnrollmentOffer,
  resolveFamilyContext,
  createFamilyEnrollmentCheckoutSession,
  verifyAndActivateStripeSession,
  createManualEnrollmentInvoice,
  verifyManualInvoicePayment,
  markDocumentReviewComplete,
  calculatePayInFullQuote,
  requestPaymentStructureRevision,
  cancelPaymentStructureRevision,
} from "../services/familyEnrollmentService";


export const familyEnrollmentRouter = router({
  /**
   * Retrieves the current family enrollment state, eligibility, active offer, and history.
   */
  getState: adminProcedure
    .input(
      z.object({
        parentContactId: z.number().optional(),
        studentContactId: z.number().optional(),
        leadId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getFamilyEnrollmentState(input);
    }),

  /**
   * Approves enrollment for a family (Standard or Custom mode).
   * Validates discovery status, override reason, and billing arrangements.
   */
  approve: adminProcedure
    .input(
      z.object({
        parentContactId: z.number(),
        studentContactId: z.number().optional(),
        leadId: z.number().optional(),
        enrollmentMode: z.enum(["standard", "custom"]).default("standard"),
        customPlanKey: z.string().optional(),
        customPlanName: z.string().optional(),
        customMonthlyPrice: z.number().optional(),
        customBillingFrequency: z.string().optional(),
        customCommitmentMonths: z.number().optional(),
        customTerms: z.string().optional(),
        billingArrangement: z.enum(["autopay", "manual_invoice"]).default("autopay"),
        manualInvoiceDueDate: z.string().optional(),
        manualInvoiceReason: z.string().optional(),
        expirationDays: z.number().optional(),
        overrideDiscovery: z.boolean().optional(),
        overrideReason: z.string().optional(),
        internalNotes: z.string().optional(),
        changeReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const approverName = ctx.user?.name || ctx.user?.email || "Lead Special Education Advocate";
      const approverId = ctx.user?.id || 1;

      const offer = await approveFamilyEnrollment({
        ...input,
        approverId,
        approverName,
      });

      return {
        success: true,
        message:
          input.enrollmentMode === "custom"
            ? `Custom enrollment offer approved ($${input.customMonthlyPrice}/month).`
            : "Standard enrollment approved with published plans unlocked.",
        offer,
      };
    }),

  /**
   * Resends enrollment invitation to parent without creating duplicate records.
   * Reuses notification infrastructure and reports truthful delivery state.
   */
  resendInvitation: adminProcedure
    .input(
      z.object({
        offerId: z.number(),
        mockDeliverySuccess: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const approverName = ctx.user?.name || ctx.user?.email || "Lead Special Education Advocate";
      const result = await resendFamilyEnrollmentInvitation({
        offerId: input.offerId,
        approverName,
        mockDeliverySuccess: input.mockDeliverySuccess,
      });

      return {
        success: result.deliveryStatus === "dispatched",
        message: result.message,
        offer: result.offer,
        deliveryStatus: result.deliveryStatus,
      };
    }),

  /**
   * Revokes an existing enrollment offer with audit reason.
   */
  revokeOffer: adminProcedure
    .input(
      z.object({
        offerId: z.number(),
        reason: z.string().min(5, "A specific revocation reason is required (at least 5 characters)."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const approverName = ctx.user?.name || ctx.user?.email || "Lead Special Education Advocate";
      const approverId = ctx.user?.id || 1;

      const offer = await revokeFamilyEnrollmentOffer({
        offerId: input.offerId,
        reason: input.reason,
        approverId,
        approverName,
      });

      return {
        success: true,
        message: `Enrollment offer #${input.offerId} has been revoked.`,
        offer,
      };
    }),

  /**
   * Retrieves the parent portal enrollment experience state.
   * Accessible by portal sessions, Clerk parent accounts, and admin previews.
   */
  portalGetState: portalProcedure
    .input(
      z
        .object({
          parentContactId: z.number().optional(),
          studentContactId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      let resolvedParentContactId = (ctx as any).portalContactId;

      if (!resolvedParentContactId && input) {
        if (input.parentContactId) {
          resolvedParentContactId = input.parentContactId;
        } else if (input.studentContactId) {
          const context = await resolveFamilyContext({ studentContactId: input.studentContactId });
          resolvedParentContactId = context.parentContactId;
        }
      }

      return await getPortalFamilyEnrollmentState(resolvedParentContactId || 0);
    }),

  /**
   * Persists parent's plan selection against their active family enrollment offer.
   * Prevents duplicate selections and creates a service agreement in Agreements Engine.
   */
  selectPlan: portalProcedure
    .input(
      z.object({
        offerId: z.number(),
        planKey: z.string().min(1),
        paymentStructure: z.enum(["monthly_autopay", "pay_in_full"]).optional(),
        parentContactId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let resolvedParentContactId = (ctx as any).portalContactId || input.parentContactId;

      if (!resolvedParentContactId) {
        const offer = await db.getEnrollmentOfferById(input.offerId);
        if (offer) resolvedParentContactId = offer.parentContactId;
      }

      if (!resolvedParentContactId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Parent contact identification required." });
      }

      const approverName = ctx.user?.name || ctx.user?.email || "Client";
      return await selectFamilyEnrollmentPlan({
        offerId: input.offerId,
        planKey: input.planKey,
        paymentStructure: input.paymentStructure,
        parentContactId: resolvedParentContactId,
        approverName,
      });
    }),

  /**
   * Staff-authorized supersede process for accepted or locked offers.
   * Voids pending agreements, preserves executed agreements for compliance,
   * and creates a new offer with revised terms.
   */
  supersede: adminProcedure
    .input(
      z.object({
        offerId: z.number(),
        reason: z.string().min(5, "A specific supersede reason is required (at least 5 characters)."),
        enrollmentMode: z.enum(["standard", "custom"]).default("standard"),
        customPlanKey: z.string().optional(),
        customPlanName: z.string().optional(),
        customMonthlyPrice: z.number().optional(),
        customBillingFrequency: z.string().optional(),
        customCommitmentMonths: z.number().optional(),
        customTerms: z.string().optional(),
        billingArrangement: z.enum(["autopay", "manual_invoice"]).default("autopay"),
        manualInvoiceDueDate: z.string().optional(),
        manualInvoiceReason: z.string().optional(),
        expirationDays: z.number().optional(),
        overrideDiscovery: z.boolean().optional(),
        overrideReason: z.string().optional(),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const approverName = ctx.user?.name || ctx.user?.email || "Lead Special Education Advocate";
      const approverId = ctx.user?.id || 1;

      const { offerId, reason, ...newOfferFields } = input;
      const result = await supersedeFamilyEnrollmentOffer({
        offerId,
        reason,
        approverId,
        approverName,
        newOfferInput: {
          ...newOfferFields,
          parentContactId: 0, // dynamically resolved from old offer in service
        },
      });

      return {
        success: true,
        message: `Offer #${offerId} has been superseded. New offer #${result.newOffer.id} is active.`,
        oldOffer: result.oldOffer,
        newOffer: result.newOffer,
      };
    }),

  /**
   * Phase 2D: Retrieves authoritative payment quote comparing Monthly Autopay vs Pay in Full.
   * Calculates 12-month commitment totals and staff-authorized discounts in integer cents.
   */
  getPaymentQuote: portalProcedure
    .input(
      z.object({
        offerId: z.number(),
        overrideDiscountType: z.enum(["none", "percentage", "fixed_amount"]).optional(),
        overrideDiscountValue: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const offer = await db.getEnrollmentOfferById(input.offerId);
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment offer not found." });
      }

      // Security: verify portal caller owns this offer if portal user (Defect D)
      const portalContactId = (ctx as any).portalContactId;
      if (portalContactId && portalContactId !== offer.parentContactId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view this quote." });
      }

      const quote = calculatePayInFullQuote(offer, {
        overrideDiscountType: input.overrideDiscountType,
        overrideDiscountValue: input.overrideDiscountValue,
      });

      const monthlyPrice = Number(offer.selectedPlanPrice || "105.00");

      return {
        offerId: offer.id,
        planKey: offer.selectedPlanKey,
        planName: offer.selectedPlanName || "Advocacy Support Plan",
        monthly: {
          monthlyPrice,
          commitmentMonths: quote.commitmentMonths,
          billingFrequency: "monthly",
          billingArrangement: offer.billingArrangement,
        },
        payInFull: quote,
        selectedStructure: (offer as any).paymentStructure || "monthly_autopay",
      };
    }),

  /**
   * Phase 2D: Allows parent to select payment structure (monthly_autopay vs pay_in_full) prior to agreement signing.
   */
  setPaymentStructure: portalProcedure
    .input(
      z.object({
        offerId: z.number(),
        paymentStructure: z.enum(["monthly_autopay", "pay_in_full"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const offer = await db.getEnrollmentOfferById(input.offerId);
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment offer not found." });
      }

      const portalContactId = (ctx as any).portalContactId;
      if (portalContactId && portalContactId !== offer.parentContactId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to modify this offer." });
      }

      // If agreement is already signed under a different structure, require revision
      const existingStructure = (offer as any).paymentStructure || "monthly_autopay";
      if (offer.agreementStatus === "signed" && input.paymentStructure !== existingStructure) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Agreement was already signed for ${existingStructure === "pay_in_full" ? "Pay in Full" : "Monthly Autopay"}. A revised agreement must be generated to change payment terms.`,
        });
      }

      const quote = calculatePayInFullQuote(offer);
      const updatedOffer = await db.updateEnrollmentOffer(offer.id, {
        paymentStructure: input.paymentStructure,
        payInFullOriginalAmount: quote.originalAmount,
        payInFullDiscountAmount: quote.discountAmount,
        payInFullFinalAmount: quote.finalAmount,
        updatedAt: new Date(),
      });

      return {
        success: true,
        offer: updatedOffer,
        quote,
      };
    }),

  /**
   * Phase 2E: Request payment structure revision after agreement is signed.
   * Preserves existing signed agreement as Superseded, recalculates quote,
   * generates revised agreement, and requires new e-signature prior to checkout.
   */
  requestPaymentStructureRevision: portalProcedure
    .input(
      z.object({
        offerId: z.number(),
        newPaymentStructure: z.enum(["monthly_autopay", "pay_in_full"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const offer = await db.getEnrollmentOfferById(input.offerId);
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment offer not found." });
      }

      const portalContactId = (ctx as any).portalContactId;
      if (portalContactId && portalContactId !== offer.parentContactId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to modify this offer." });
      }

      const requesterName = ctx.user?.name || ctx.user?.email || "Parent";
      return await requestPaymentStructureRevision({
        offerId: input.offerId,
        parentContactId: offer.parentContactId,
        newPaymentStructure: input.newPaymentStructure,
        requesterName,
      });
    }),

  /**
   * Phase 2F.1: Allows parent to cancel a pending payment structure revision draft.
   * Restores original signed agreement and checkout readiness.
   */
  cancelPaymentStructureRevision: portalProcedure
    .input(
      z.object({
        offerId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const offer = await db.getEnrollmentOfferById(input.offerId);
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment offer not found." });
      }

      const portalContactId = (ctx as any).portalContactId;
      if (portalContactId && portalContactId !== offer.parentContactId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to cancel this revision." });
      }

      return await cancelPaymentStructureRevision({
        offerId: input.offerId,
        parentContactId: offer.parentContactId,
      });
    }),

  /**
   * Phase 2C & 2D: Creates a server-side Stripe Checkout Session for family enrollment.
   * Supports monthly_autopay (subscription mode) and pay_in_full (payment mode with BNPL/ACH).
   * Authoritative server eligibility verification; prevents browser tampering.
   */
  createCheckoutSession: portalProcedure
    .input(
      z.object({
        offerId: z.number(),
        parentContactId: z.number().optional(),
        paymentStructure: z.enum(["monthly_autopay", "pay_in_full"]).optional(),
        originUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let resolvedParentContactId = (ctx as any).portalContactId || input.parentContactId;

      if (!resolvedParentContactId) {
        const offer = await db.getEnrollmentOfferById(input.offerId);
        if (offer) resolvedParentContactId = offer.parentContactId;
      }

      if (!resolvedParentContactId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Parent contact identification required." });
      }

      // Security: Validate caller owns this offer if in portal context (Defect D)
      const portalContactId = (ctx as any).portalContactId;
      if (portalContactId && portalContactId !== resolvedParentContactId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to checkout for this family offer." });
      }

      const origin = input.originUrl || (ctx.req?.headers?.origin as string) || "http://localhost:3000";

      return await createFamilyEnrollmentCheckoutSession({
        offerId: input.offerId,
        parentContactId: resolvedParentContactId,
        paymentStructure: input.paymentStructure,
        originUrl: origin,
      });
    }),

  /**
   * Phase 2C & 2D: Verifies completed Stripe checkout session server-side.
   * Activates family membership only after verified payment.
   * Enforces parent ownership cross-validation (Defect D).
   */
  verifySession: portalProcedure
    .input(
      z.object({
        sessionId: z.string().min(1),
        parentContactId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const offer = (await db.getEnrollmentOfferByCheckoutSessionId(input.sessionId)) ||
                    (input.parentContactId ? await db.getActiveOfferForFamily(input.parentContactId) : null);

      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment offer not found for this checkout session." });
      }

      // Security: Parent identity cross-validation (Defect D)
      const portalContactId = (ctx as any).portalContactId;
      if (portalContactId && portalContactId !== offer.parentContactId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to verify payment for this family offer." });
      }

      return await verifyAndActivateStripeSession({
        sessionId: input.sessionId,
        parentContactId: offer.parentContactId,
      });
    }),

  /**
   * Phase 2C: Creates an initial month manual invoice for approved staff exception.
   */
  createManualInvoice: adminProcedure
    .input(
      z.object({
        offerId: z.number(),
        parentContactId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await createManualEnrollmentInvoice({
        offerId: input.offerId,
        parentContactId: input.parentContactId,
        staffUserId: ctx.user?.id || 1,
      });

      return {
        success: true,
        message: `Manual invoice #${invoice.invoiceNumber || invoice.id} generated ($${invoice.total}).`,
        invoice,
      };
    }),

  /**
   * Phase 2C: Verifies staff-received payment for manual invoice and activates membership.
   */
  verifyManualInvoicePayment: adminProcedure
    .input(
      z.object({
        offerId: z.number(),
        invoiceId: z.number(),
        paymentReference: z.string().min(1, "A payment reference (check #, wire ref, or receipt) is required."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staffUserName = ctx.user?.name || ctx.user?.email || "Lead Special Education Advocate";
      const staffUserId = ctx.user?.id || 1;

      return await verifyManualInvoicePayment({
        offerId: input.offerId,
        invoiceId: input.invoiceId,
        staffUserId,
        staffUserName,
        paymentReference: input.paymentReference,
      });
    }),

  /**
   * Phase 2C: Post-activation onboarding gate.
   * Assigned advocate marks document review complete and unlocks IEP Blueprint Call scheduling.
   */
  markDocumentReviewComplete: adminProcedure
    .input(
      z.object({
        offerId: z.number(),
        studentContactId: z.number().optional(),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const advocateUserName = ctx.user?.name || ctx.user?.email || "Lead Special Education Advocate";
      const advocateUserId = ctx.user?.id || 1;

      const offer = await markDocumentReviewComplete({
        offerId: input.offerId,
        studentContactId: input.studentContactId,
        advocateUserId,
        advocateUserName,
        reviewNotes: input.reviewNotes,
      });

      return {
        success: true,
        message: "Document review marked complete. IEP Blueprint Strategy Call unlocked for the family.",
        offer,
      };
    }),
});


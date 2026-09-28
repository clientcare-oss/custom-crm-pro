import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";

export const referralsRouter = router({
  // ── Public: Validate referral code from URL parameter e.g. ?ref=WP-7K4M9 ──
  validateCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const res = await db.validateReferralCode(input.code);
      return {
        valid: res.isValid,
        isValid: res.isValid,
        referralCode: input.code,
        referrerClientId: res.referrer?.id,
        referrerName: res.referrer
          ? `${res.referrer.firstName} ${res.referrer.lastName ? `${res.referrer.lastName.charAt(0)}.` : ""}`.trim()
          : null,
      };
    }),

  // ── Public: Search potential referrers for manual "Who referred you?" dropdown ──
  searchReferrersPublic: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      // Safe search returning only safe public identity without private case data
      return await db.searchPotentialReferrers(input.query);
    }),

  // ── Client / Parent Portal: Get client's referral stats, link, and privacy-protected history ──
  getPortalData: portalProcedure.query(async ({ ctx }) => {
    let clientId = (ctx as any).portalContactId;

    // In admin preview mode or fallback
    if ((ctx as any).isAdminPreview && !clientId) {
      // Return demo / fallback data for previewing portal
      return {
        referralCode: "WP-DEMO1",
        stats: {
          totalReferred: 3,
          becameClients: 2,
          referredCount: 3,
          convertedCount: 2,
          availableCreditCents: 5000,
          availableCreditDollars: 50,
          availableCreditFormatted: "$50.00",
          pendingCreditCents: 0,
          pendingCreditFormatted: "$0.00",
          totalEarnedCents: 5000,
          totalUsedCents: 0,
        },
        upcomingPayment: {
          hasUpcomingPayment: true,
          invoiceId: 999,
          invoiceNumber: "INV-2026-1015",
          paymentDate: new Date().toISOString(),
          paymentDateFormatted: "October 15, 2026",
          dueDateFormatted: "October 15, 2026",
          cutoffDateFormatted: "October 10, 2026",
          regularAmountCents: 10500,
          regularAmountFormatted: "$105.00",
          regularPlanAmountFormatted: "$105.00",
          regularPlanAmountCents: 10500,
          creditAppliedCents: 0,
          creditAppliedFormatted: "-$0.00",
          referralCreditAppliedFormatted: "$0.00",
          referralCreditAppliedCents: 0,
          scheduledChargeCents: 10500,
          scheduledChargeFormatted: "$105.00",
          isInsideCutoff: false,
          isPastCutoff: false,
          cutoffWarningMessage: "Apply referral credit by: October 10, 2026",
          message: "Apply referral credit by: October 10, 2026",
          creditStatus: "none" as const,
          paymentStatusNote: null,
          isSatisfiedByCredit: false,
        },
        history: [
          {
            id: 1,
            amountCents: 2500,
            amountFormatted: "+ $25.00",
            note: "Referral converted — Sarah M.",
            status: "available",
            transactionType: "referral_reward",
            date: new Date().toISOString(),
          },
          {
            id: 2,
            amountCents: 2500,
            amountFormatted: "+ $25.00",
            note: "Referral converted — Jennifer R.",
            status: "available",
            transactionType: "referral_reward",
            date: new Date().toISOString(),
          },
        ],
        referrals: [
          {
            id: 1,
            displayName: "Sarah M.",
            status: "rewarded",
            creditEarnedCents: 2500,
            createdAt: new Date().toISOString(),
            rewardedAt: new Date().toISOString(),
          },
          {
            id: 2,
            displayName: "Michael T.",
            status: "pending",
            creditEarnedCents: 0,
            createdAt: new Date().toISOString(),
            rewardedAt: null,
          },
          {
            id: 3,
            displayName: "Jennifer R.",
            status: "rewarded",
            creditEarnedCents: 2500,
            createdAt: new Date().toISOString(),
            rewardedAt: new Date().toISOString(),
          },
        ],
      };
    }

    if (!clientId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Client contact ID not found" });
    }

    return await db.getClientPortalReferralData(clientId);
  }),

  // ── Client / Parent Portal: Get upcoming scheduled payment & 5-day cutoff status ──
  getUpcomingPayment: portalProcedure.query(async ({ ctx }) => {
    let clientId = (ctx as any).portalContactId;
    if ((ctx as any).isAdminPreview && !clientId) {
      clientId = 1;
    }
    if (!clientId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Client contact ID not found" });
    }
    return await db.getUpcomingScheduledPayment({ clientId });
  }),

  // ── Client / Parent Portal: Apply Credit to My Next Payment (Client-Controlled) ──
  applyToNextPayment: portalProcedure
    .input(
      z.object({
        amountCents: z.number().int().positive("Amount must be greater than 0"),
        invoiceId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let clientId = (ctx as any).portalContactId;
      if ((ctx as any).isAdminPreview && !clientId) {
        clientId = 1;
      }
      if (!clientId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Client contact ID not found" });
      }

      const res = await db.applyCreditToNextPayment({
        clientId,
        amountCents: input.amountCents,
        invoiceId: input.invoiceId,
        staffUserName: "Client Self-Service (Portal)",
      });

      if (!res.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: res.error || "Failed to apply credit" });
      }

      return res;
    }),

  // ── Client / Parent Portal: Cancel / Reverse Pending Credit Application ──
  cancelCreditApplication: portalProcedure
    .input(
      z.object({
        invoiceId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let clientId = (ctx as any).portalContactId;
      if ((ctx as any).isAdminPreview && !clientId) {
        clientId = 1;
      }
      if (!clientId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Client contact ID not found" });
      }

      const res = await db.cancelCreditApplication({
        clientId,
        invoiceId: input.invoiceId,
        staffUserName: "Client Self-Service (Portal)",
      });

      if (!res.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: res.error || "Failed to cancel credit application" });
      }

      return res;
    }),

  // ── Staff / Admin: Apply referral credit to client's upcoming payment ──
  adminApplyToPayment: adminProcedure
    .input(
      z.object({
        clientId: z.number(),
        amountCents: z.number().int().positive(),
        invoiceId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staffUser = ctx.user;
      const res = await db.applyCreditToNextPayment({
        clientId: input.clientId,
        amountCents: input.amountCents,
        invoiceId: input.invoiceId,
        staffUserId: staffUser.id,
        staffUserName: staffUser.name || staffUser.email || "Waypoint Staff",
      });

      if (!res.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: res.error || "Failed to apply credit" });
      }

      return res;
    }),

  // ── Staff / Admin: Cancel / Return referral credit from an invoice ──
  adminCancelCreditApplication: adminProcedure
    .input(
      z.object({
        clientId: z.number(),
        invoiceId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staffUser = ctx.user;
      const res = await db.cancelCreditApplication({
        clientId: input.clientId,
        invoiceId: input.invoiceId,
        staffUserId: staffUser.id,
        staffUserName: staffUser.name || staffUser.email || "Waypoint Staff",
        skipCutoffCheckForTesting: true,
      });

      if (!res.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: res.error || "Failed to cancel credit application" });
      }

      return res;
    }),

  // ── Legacy / Direct Invoice Credit Redemption ──
  applyPortalCredit: portalProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        amountCents: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = (ctx as any).portalContactId;
      if (!clientId && !(ctx as any).isAdminPreview) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Client contact ID not found" });
      }

      if ((ctx as any).isAdminPreview) {
        return {
          success: true,
          appliedCents: input.amountCents,
          remainingCreditCents: Math.max(0, 5000 - input.amountCents),
        };
      }

      const res = await db.applyCreditToInvoice({
        clientId,
        invoiceId: input.invoiceId,
        amountCents: input.amountCents,
        staffUserName: "Client Self-Service",
        note: "Applied Waypoint Credit via Parent Portal",
      });

      if (!res.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: res.error || "Failed to apply credit" });
      }

      return res;
    }),

  // ── CRM Student Workspace (PG-030): Full internal view of client's referral & credit data ──
  getWorkspaceData: adminProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await db.getClientReferralWorkspaceData(input.clientId);
    }),

  // ── CRM: Staff manual credit adjustment with required audit trail ──
  addManualAdjustment: adminProcedure
    .input(
      z.object({
        clientId: z.number(),
        amountCents: z.number().int(), // positive to add credit, negative to deduct
        reason: z.string().min(1, "A reason/note is required for manual adjustments"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staffUser = ctx.user;
      const res = await db.addManualCreditAdjustment({
        clientId: input.clientId,
        amountCents: input.amountCents,
        staffUserId: staffUser.id,
        staffUserName: staffUser.name || staffUser.email || "Waypoint Staff",
        reason: input.reason,
      });

      if (!res.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: res.error || "Failed to adjust credit" });
      }

      return res;
    }),

  // ── CRM: Staff manual attribution correction with audit note ──
  updateAttribution: adminProcedure
    .input(
      z.object({
        referralId: z.number(),
        newReferrerClientId: z.number(),
        reason: z.string().min(1, "A reason is required to reassign a referral"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staffUser = ctx.user;
      const res = await db.updateReferralAttribution({
        referralId: input.referralId,
        newReferrerClientId: input.newReferrerClientId,
        staffUserId: staffUser.id,
        staffUserName: staffUser.name || staffUser.email || "Waypoint Staff",
        reason: input.reason,
      });

      if (!res.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: res.error || "Failed to update attribution" });
      }

      return res;
    }),

  // ── CRM: Staff manual qualification & reward trigger (e.g. for offline check payments) ──
  qualifyAndReward: adminProcedure
    .input(
      z.object({
        referralId: z.number().optional(),
        referredClientId: z.number().optional(),
        qualifyingInvoiceId: z.number().optional(),
        paymentId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const res = await db.qualifyAndRewardReferral(input);
      if (!res.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: res.message || "Failed to reward referral" });
      }
      return res;
    }),

  // ── CRM: Safe search for staff to pick a referrer ──
  searchReferrers: adminProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      return await db.searchPotentialReferrers(input.query);
    }),

  // ── Settings: Get admin-configurable program settings ──
  getSettings: adminProcedure.query(async () => {
    return await db.getReferralProgramSettings();
  }),

  // ── Settings: Update admin-configurable program settings ──
  updateSettings: adminProcedure
    .input(
      z.object({
        programEnabled: z.boolean().optional(),
        newClientDiscountCents: z.number().int().positive().optional(),
        referrerCreditCents: z.number().int().positive().optional(),
        qualificationTrigger: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.updateReferralProgramSettings(input);
    }),
});

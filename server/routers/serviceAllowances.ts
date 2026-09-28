import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { recordCaseActivity } from "../services/caseActivityService";

export const serviceAllowancesRouter = router({
  /**
   * Retrieves full Service Allowances & Usage breakdown for a student,
   * bounded by their current service/plan period, with zero double-counting.
   */
  getUsageSummary: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        customPeriod: z
          .object({
            start: z.string().optional(),
            end: z.string().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.getStudentServiceUsageSummary(input.studentContactId, input.customPeriod);
    }),

  /**
   * Retrieves student's raw allowance configuration rows.
   */
  getAllowances: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await db.getStudentAllowances(input.studentContactId);
    }),

  /**
   * Logs manual service usage.
   * Creates an audited entry in the EXISTING Student Activity Timeline (caseActivityTimeline)
   * and immediately triggers fresh usage calculation.
   */
  logUsage: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        caseId: z.string().optional(),
        serviceKey: z.string().min(1),
        serviceName: z.string().min(1),
        eventDate: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        note: z.string().optional(),
        staffMember: z.string().min(1).default("Byron Honea"),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Create entry in Activity Timeline
      const eventDateObj = new Date(input.eventDate + "T12:00:00Z");
      const title = `${input.serviceName} Provided`;
      const description = input.note && input.note.trim()
        ? input.note.trim()
        : `${input.serviceName} service delivered (${input.quantity} session).`;

      const sourceId = `manual-srv-${Date.now()}`;
      const activity = await recordCaseActivity({
        studentContactId: input.studentContactId,
        caseId: input.caseId,
        eventType: "service_usage",
        title,
        description,
        whyReason: `Direct service delivery logged by ${input.staffMember}`,
        ownerName: input.staffMember,
        ownerRole: "Advocate",
        sources: [
          {
            type: "task",
            label: `${input.serviceName} Usage Log`,
            id: sourceId,
            excerpt: input.note || `${input.quantity} unit(s) logged`,
            serviceKey: input.serviceKey,
            quantity: input.quantity,
          } as any,
        ],
        quoteText: undefined,
        nextStepAction: undefined,
        isActionNeeded: false,
        isCompleted: true,
        categoryColor: "blue",
        eventDate: eventDateObj,
      });

      return { success: true, activity };
    }),

  /**
   * Adds extra service allowance authorized for this student.
   * Updates allowance configuration AND adds an audit entry to the Activity Timeline.
   */
  addExtraAllowance: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        caseId: z.string().optional(),
        serviceKey: z.string().min(1),
        serviceName: z.string().min(1),
        additionalAmount: z.number().int().min(1),
        reason: z.string().optional(),
        authorizedBy: z.string().min(1).default("Byron Honea"),
        date: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Update allowance table
      const updated = await db.addExtraAllowance(
        input.studentContactId,
        input.serviceKey,
        input.additionalAmount
      );

      // 2. Record audit trail in Activity Timeline
      const eventDateObj = new Date(input.date + "T12:00:00Z");
      const title = `➕ Extra Allowance Added: ${input.serviceName} +${input.additionalAmount}`;
      const desc = `Authorized by ${input.authorizedBy}.${input.reason ? ` Reason: ${input.reason}` : ""}`;

      await recordCaseActivity({
        studentContactId: input.studentContactId,
        caseId: input.caseId,
        eventType: "allowance_adjustment",
        title,
        description: desc,
        whyReason: input.reason || "Additional client allowance authorization",
        ownerName: input.authorizedBy,
        ownerRole: "Advocate",
        sources: [
          {
            type: "note",
            label: "Extra Allowance Adjustment",
            excerpt: `+${input.additionalAmount} added to ${input.serviceName}`,
          },
        ],
        isActionNeeded: false,
        isCompleted: true,
        categoryColor: "teal",
        eventDate: eventDateObj,
      });

      return { success: true, allowance: updated };
    }),

  /**
   * Updates allowance configuration (baseline, tracking method, unlimited toggle, plan dates).
   */
  updateAllowanceConfig: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        serviceKey: z.string().min(1),
        serviceName: z.string().optional(),
        category: z.enum(["meeting", "advocacy", "review", "document"]).optional(),
        baseAllowance: z.number().int().min(0).optional(),
        allowanceType: z.enum(["limited", "unlimited", "not_included"]).optional(),
        trackingMethod: z.enum(["calendar", "timeline", "manual"]).optional(),
        reserveOnOpen: z.boolean().optional(),
        planPeriodStart: z.string().optional(),
        planPeriodEnd: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { studentContactId, serviceKey, ...updates } = input;
      const updated = await db.upsertStudentAllowance(studentContactId, serviceKey, updates);
      return { success: true, allowance: updated };
    }),

  /**
   * Retrieves master Plan Service Matrix defaults for all plans or a specific plan.
   */
  getPlanMatrix: protectedProcedure
    .input(z.object({ planKey: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return await db.getMasterPlanMatrix(input?.planKey);
    }),

  /**
   * Updates a master Plan Service Matrix entry (admin editability).
   */
  updatePlanMatrixEntry: protectedProcedure
    .input(
      z.object({
        planKey: z.string().min(1),
        serviceKey: z.string().min(1),
        allowanceType: z.enum(["limited", "unlimited", "not_included"]).optional(),
        baseAllowance: z.number().int().min(0).optional(),
        trackingMethod: z.enum(["calendar", "timeline", "manual"]).optional(),
        reserveOnOpen: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { planKey, serviceKey, ...updates } = input;
      const updated = await db.updateMasterPlanMatrixEntry(planKey, serviceKey, updates);
      return { success: true, entry: updated };
    }),

  /**
   * Applies a master plan's defaults to a student's allowances.
   * Updates BASE allowances to plan defaults while strictly preserving student-specific
   * extra allowances, notes, and activity/appointment history.
   */
  applyPlanToStudent: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        planKey: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Guard: Check if package allowances are configured before activation
      const isConfigured = await db.isPackageConfigured(input.planKey);
      if (!isConfigured) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "PACKAGE_ALLOWANCES_NOT_CONFIGURED: This Advocacy Package does not have Service Allowances configured yet. Configure allowances before activation.",
        });
      }

      const allowances = await db.applyPlanToStudent(
        input.studentContactId,
        input.planKey,
        (ctx as any)?.user?.name || "Byron Honea"
      );
      return { success: true, allowances };
    }),

  /**
   * Pre-flight check if an advocacy package has service allowances configured.
   */
  checkPackageConfiguration: protectedProcedure
    .input(z.object({ planKey: z.string().min(1) }))
    .query(async ({ input }) => {
      const isConfigured = await db.isPackageConfigured(input.planKey);
      return {
        planKey: input.planKey,
        isConfigured,
      };
    }),

  /**
   * Pre-check allowance limit before scheduling an appointment or starting an open service.
   * Warns staff if limit is reached/exceeded or service is not included in current plan,
   * and offers override or extra allowance option.
   */
  checkServiceAvailability: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        serviceKey: z.string(),
      })
    )
    .query(async ({ input }) => {
      const summary = await db.getStudentServiceUsageSummary(input.studentContactId);
      const svc = summary.services.find((s) => s.serviceKey === input.serviceKey);
      if (!svc) {
        return {
          found: false,
          isUnlimited: true,
          isNotIncluded: false,
          remaining: 999,
          isAtLimit: false,
          serviceName: input.serviceKey,
        };
      }

      const isNotIncluded = svc.allowanceType === "not_included" && svc.extraAllowance === 0;
      const isAtLimit = isNotIncluded || svc.status === "limit_reached" || svc.status === "over_limit";

      return {
        found: true,
        serviceKey: svc.serviceKey,
        serviceName: svc.serviceName,
        isUnlimited: svc.allowanceType === "unlimited",
        isNotIncluded,
        totalAllowance: svc.totalAllowance,
        used: svc.used,
        scheduledOpen: svc.scheduledOpen,
        remaining: isNotIncluded ? 0 : svc.remaining,
        isAtLimit,
        status: svc.status,
      };
    }),
});

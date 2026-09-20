import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

const metricsFilterSchema = z
  .object({
    dateRange: z.enum(["7d", "30d", "90d", "ytd", "12m", "all"]).optional(),
    compareWithPrevious: z.boolean().optional(),
    advocateId: z.union([z.number(), z.literal("all")]).optional(),
    planTier: z.union([z.enum(["$55", "$105", "Scholarship", "Pay Per Use"]), z.literal("all")]).optional(),
    state: z.string().optional(),
    district: z.string().optional(),
    caseType: z.string().optional(),
  })
  .optional();

export const metricsRouter = router({
  // 1. Top-Level Snapshot (6 cards)
  getSnapshot: protectedProcedure
    .input(metricsFilterSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot access company metrics." });
      }
      return await db.getMetricsSnapshot(input);
    }),

  // 2. Lead Journey (7-stage funnel + 7 supporting breakdowns)
  getLeadJourney: protectedProcedure
    .input(metricsFilterSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot access company metrics." });
      }
      return await db.getLeadJourneyMetrics(input);
    }),

  // 3. Plans & Revenue (Tiers, MRR, LTV, Plan comparison table)
  getPlansRevenue: protectedProcedure
    .input(metricsFilterSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot access company metrics." });
      }
      return await db.getPlansAndRevenueMetrics(input);
    }),

  // 4. Team Time & Workload (12 work types, advocate capacity radar)
  getTimeWorkload: protectedProcedure
    .input(metricsFilterSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot access company metrics." });
      }
      return await db.getTimeAndWorkloadMetrics(input);
    }),

  // 5. Services Delivered (Clickable counts)
  getServicesDelivered: protectedProcedure
    .input(metricsFilterSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot access company metrics." });
      }
      return await db.getServicesDeliveredMetrics(input);
    }),

  // 6. Advocacy Outcomes (Goals, accommodations, evaluations, complaints)
  getAdvocacyOutcomes: protectedProcedure
    .input(metricsFilterSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot access company metrics." });
      }
      return await db.getAdvocacyOutcomesMetrics(input);
    }),

  // 7. Client Readiness (Onboarding, missing records, Needs Attention)
  getClientReadiness: protectedProcedure
    .input(metricsFilterSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot access company metrics." });
      }
      return await db.getClientReadinessMetrics(input);
    }),

  // 8. Client Continuity (Renewals, retention, cancellations)
  getClientContinuity: protectedProcedure
    .input(metricsFilterSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot access company metrics." });
      }
      return await db.getClientContinuityMetrics(input);
    }),

  // 9. Family Experience (Satisfaction, NPS, confidence, testimonials)
  getFamilyExperience: protectedProcedure
    .input(metricsFilterSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot access company metrics." });
      }
      return await db.getFamilyExperienceMetrics(input);
    }),

  // 10. Metric Drilldown (Underlying records for any clicked metric)
  getDrilldown: protectedProcedure
    .input(
      z.object({
        metricKey: z.string(),
        filters: metricsFilterSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot access company metrics." });
      }
      return await db.getMetricDrilldown(input.metricKey, input.filters);
    }),
});

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { getMetricsSnapshot, getLeadJourneyMetrics, getPlansAndRevenueMetrics, getTimeAndWorkloadMetrics, getServicesDeliveredMetrics, getAdvocacyOutcomesMetrics, getClientReadinessMetrics, getClientContinuityMetrics, getFamilyExperienceMetrics, getMetricDrilldown } from "./db/metrics";

describe("Waypoint Metrics (PG-042) Engine", () => {
  it("should return top-level snapshot metrics with trendlines and change deltas", async () => {
    const snapshot = await getMetricsSnapshot();

    expect(snapshot).toHaveProperty("newLeads");
    expect(snapshot).toHaveProperty("conversionRate");
    expect(snapshot).toHaveProperty("activeFamilies");
    expect(snapshot).toHaveProperty("revenue");
    expect(snapshot).toHaveProperty("advocacyHours");
    expect(snapshot).toHaveProperty("renewalsDue");

    expect(snapshot.newLeads.value).toBeGreaterThan(0);
    expect(snapshot.newLeads.trend.length).toBeGreaterThan(0);
    expect(typeof snapshot.conversionRate.value).toBe("number");
    expect(typeof snapshot.revenue.value).toBe("number");
  });

  it("should return complete 7-stage lead journey funnel with conversion rates and durations", async () => {
    const leadJourney = await getLeadJourneyMetrics();

    expect(leadJourney.funnelStages.length).toBe(7);
    expect(leadJourney.funnelStages[0].stage).toBe("New Lead");
    expect(leadJourney.funnelStages[6].stage).toBe("Advocacy Started");

    expect(leadJourney.totalLeadToAdvocacyDays).toBeGreaterThan(0);
    expect(leadJourney.leadsByReferralSource.length).toBeGreaterThan(0);
    expect(leadJourney.leadsByState.length).toBeGreaterThan(0);
    expect(leadJourney.nonConversionReasons.length).toBeGreaterThan(0);

    // Verify Price and Attorney Needed reasons are captured
    const reasons = leadJourney.nonConversionReasons.map((r) => r.reason);
    expect(reasons).toContain("Price");
    expect(reasons).toContain("Attorney needed");
  });

  it("should calculate plans and revenue breakdown including the structured 6x4 plan comparison table", async () => {
    const plansRevenue = await getPlansAndRevenueMetrics();

    expect(plansRevenue.planBreakdown).toHaveProperty("plan55");
    expect(plansRevenue.planBreakdown).toHaveProperty("plan105");
    expect(plansRevenue.planBreakdown).toHaveProperty("scholarship");
    expect(plansRevenue.planBreakdown).toHaveProperty("payPerUse");

    expect(plansRevenue.totalCollectedRevenue).toBeGreaterThan(0);
    expect(plansRevenue.planComparisonTable.length).toBe(6);

    const metricsInTable = plansRevenue.planComparisonTable.map((r) => r.metric);
    expect(metricsInTable).toContain("Active clients");
    expect(metricsInTable).toContain("Revenue");
    expect(metricsInTable).toContain("Average service hours");
    expect(metricsInTable).toContain("Average meetings");
    expect(metricsInTable).toContain("Average cost to serve");
    expect(metricsInTable).toContain("Estimated margin");
  });

  it("should track team workload across the 12 work types and evaluate meeting capacity benchmark", async () => {
    const workload = await getTimeAndWorkloadMetrics();

    expect(workload.timeByWorkType.length).toBe(12);
    const workTypes = workload.timeByWorkType.map((w) => w.workType);
    expect(workTypes).toContain("Meeting preparation");
    expect(workTypes).toContain("IEP/504 meeting");
    expect(workTypes).toContain("Records review");
    expect(workTypes).toContain("Calls");
    expect(workTypes).toContain("SMS/messages");
    expect(workTypes).toContain("Email review");
    expect(workTypes).toContain("Email drafting");
    expect(workTypes).toContain("Complaint work");
    expect(workTypes).toContain("Research");
    expect(workTypes).toContain("Case strategy");
    expect(workTypes).toContain("Follow-up");
    expect(workTypes).toContain("Administrative work");

    expect(workload.teamCapacity.idealMeetingsPerWeekPerAdvocate).toBe(5);
    expect(workload.highUsageOutliers.length).toBeGreaterThan(0);
  });

  it("should return clickable services delivered metrics", async () => {
    const services = await getServicesDeliveredMetrics();

    expect(services).toHaveProperty("meetingsCompleted");
    expect(services).toHaveProperty("recordsReviewsCompleted");
    expect(services).toHaveProperty("emailsDrafted");
    expect(services).toHaveProperty("complaintsFiled");
    expect(services).toHaveProperty("documentsStillMissing");
    expect(services.documentsStillMissing.drilldownKey).toBe("documents_missing");
  });

  it("should return advocacy case outcomes with IDEA risk levels and multi-outcomes", async () => {
    const outcomes = await getAdvocacyOutcomesMetrics();

    expect(outcomes.goalAchievement).toHaveProperty("achieved");
    expect(outcomes.outcomesByType.length).toBeGreaterThan(0);
    expect(outcomes.ideaRiskLevels.length).toBe(4);
    expect(outcomes.stateComplaints.totalFiled).toBeGreaterThanOrEqual(0);
  });

  it("should return client readiness metrics with Needs Attention deck", async () => {
    const readiness = await getClientReadinessMetrics();

    expect(readiness.averageOnboardingDays).toBeGreaterThan(0);
    expect(readiness.mostCommonlyMissingDocuments.length).toBeGreaterThan(0);
    expect(readiness.needsAttentionDeck.length).toBeGreaterThan(0);

    const firstAlert = readiness.needsAttentionDeck[0];
    expect(firstAlert).toHaveProperty("studentId");
    expect(firstAlert).toHaveProperty("action");
  });

  it("should return client continuity and satisfaction surveys", async () => {
    const continuity = await getClientContinuityMetrics();
    expect(continuity.renewalRate).toBeGreaterThan(0);
    expect(continuity.cancellationReasons.length).toBeGreaterThan(0);

    const experience = await getFamilyExperienceMetrics();
    expect(experience.overallSatisfaction).toBeGreaterThanOrEqual(4.5);
    expect(experience.confidenceGainedPercentage).toBeGreaterThanOrEqual(90);
    expect(experience.featuredTestimonials.length).toBeGreaterThan(0);
  });

  it("should return drilldown records for clicked metric", async () => {
    const missingDocsDrilldown = await getMetricDrilldown("documents_missing");
    expect(missingDocsDrilldown.length).toBeGreaterThan(0);
    expect(missingDocsDrilldown[0]).toHaveProperty("title");
    expect(missingDocsDrilldown[0]).toHaveProperty("link");

    const newLeadsDrilldown = await getMetricDrilldown("new_leads");
    expect(newLeadsDrilldown.length).toBeGreaterThan(0);
  });

  it("should support tRPC appRouter caller procedures with role protection", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: "admin", openId: "admin_test", email: "byron@waypoint.com", name: "Byron Honea" } as any,
    });

    const snapshot = await caller.metrics.getSnapshot();
    expect(snapshot).toHaveProperty("newLeads");

    const funnel = await caller.metrics.getLeadJourney();
    expect(funnel.funnelStages.length).toBe(7);

    // Verify client role is rejected with FORBIDDEN
    const clientCaller = appRouter.createCaller({
      user: { id: 2, role: "client", openId: "client_test", email: "client@gmail.com", name: "Parent" } as any,
    });

    await expect(clientCaller.metrics.getSnapshot()).rejects.toThrow();
  });
});

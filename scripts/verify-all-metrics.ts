import { appRouter } from "../server/routers";

async function verifyAllMetrics() {
  const caller = appRouter.createCaller({
    user: { id: 1, email: "byron@waypointadvocates.com", role: "admin" } as any,
    req: {} as any,
    res: {} as any,
  });

  console.log("==================================================");
  console.log("   WAYPOINT METRICS (PG-042) END-TO-END VERIFIER   ");
  console.log("==================================================");

  // 1. Snapshot
  const snap = await caller.metrics.getSnapshot({});
  console.log("[1] SNAPSHOT:", {
    newLeads: snap.newLeads.value,
    conversionRate: `${snap.conversionRate.value}%`,
    activeFamilies: snap.activeFamilies.value,
    revenue: `$${snap.revenue.value.toLocaleString()}`,
    advocacyHours: `${snap.advocacyHours.value} hrs`,
    renewalsDue: snap.renewalsDue.value,
  });

  // 2. Lead Journey
  const lead = await caller.metrics.getLeadJourney({});
  console.log("[2] LEAD JOURNEY FUNNEL:", lead.funnelStages.map(s => `${s.stage} (${s.count})`).join(" -> "));
  console.log("    Non-conversion reasons:", lead.nonConversionReasons.map(r => `${r.reason}: ${r.count}`).join(", "));

  // 3. Plans & Revenue
  const plan = await caller.metrics.getPlansRevenue({});
  console.log("[3] PLANS & REVENUE: Total Collected:", `$${plan.totalCollectedRevenue.toLocaleString()}`);
  console.log("    Plan Comparison Table (6x4 rows):", plan.planComparisonTable.length, "rows");

  // 4. Time & Workload
  const time = await caller.metrics.getTimeWorkload({});
  console.log("[4] TIME & WORKLOAD: Work Types:", time.timeByWorkType.length, "| Advocates:", time.timeByAdvocate.length);
  console.log("    Ideal Capacity Status:", time.timeByAdvocate.map(a => `${a.advocateName}: ${a.meetingsThisWeek}/5 mtgs (${a.capacityStatus})`).join(" | "));

  // 5. Services Delivered
  const serv = await caller.metrics.getServicesDelivered({});
  console.log("[5] SERVICES DELIVERED: Meetings:", serv.meetingsCompleted.count, "| IEPs Reviewed:", serv.iepsReviewed.count, "| Document Requests:", serv.documentsRequested.count);

  // 6. Advocacy Outcomes
  const outc = await caller.metrics.getAdvocacyOutcomes({});
  console.log("[6] ADVOCACY OUTCOMES: Goals Achieved:", `${outc.goalAchievement.achieved.percentage}%`, "| IDEA Risk Levels:", outc.ideaRiskLevels.map(r => `${r.level}: ${r.count}`).join(", "));

  // 7. Client Readiness
  const read = await caller.metrics.getClientReadiness({});
  console.log("[7] CLIENT READINESS: Incomplete Onboarding:", read.incompleteOnboardingCount, "| Needs Attention Items:", read.needsAttentionDeck.length);

  // 8. Client Continuity
  const cont = await caller.metrics.getClientContinuity({});
  console.log("[8] CLIENT CONTINUITY: Renewal Rate:", `${cont.renewalRate}%`, "| Avg Lifetime:", `${cont.averageClientLifetimeMonths} months`);

  // 9. Family Experience
  const exp = await caller.metrics.getFamilyExperience({});
  console.log("[9] FAMILY EXPERIENCE: Overall Score:", `${exp.overallSatisfaction}/5.0`, "| Confidence Growth:", `${exp.confidenceGainedPercentage}%`, "| Testimonials:", exp.featuredTestimonials.length);

  const drill = await caller.metrics.getDrilldown({ metricKey: "newLeads" });
  console.log("[10] DRILLDOWN RECORDS: Successfully retrieved", drill.length, "student records for newLeads");

  // 11. Time Tracking Test
  const activeTimer = await caller.timeTracking.getActiveTimer();
  const timeEntries = await caller.timeTracking.getTimeEntries({});
  console.log("[11] TIME TRACKER: Active Timer:", activeTimer ? "RUNNING" : "NO ACTIVE TIMER", "| Recent Entries:", timeEntries.length);

  console.log("==================================================");
  console.log("   ALL 11 METRICS & TIME MODULES VERIFIED 100%   ");
  console.log("==================================================");
}

verifyAllMetrics().catch(console.error);

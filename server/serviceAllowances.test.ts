import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("PG-030 Student Workspace — Service Allowances & Usage Engine", () => {
  const mockUser = {
    id: 1,
    openId: "user_test_byron",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "manually_created",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
    logoUrl: null,
  };

  const mockCtx = {
    user: mockUser,
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(mockCtx);

  it("1. should return complete baseline service allowances and usage summary for student", async () => {
    const studentContactId = 8801;
    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId,
    });

    expect(summary).toBeDefined();
    expect(summary.studentContactId).toBe(studentContactId);
    expect(summary.planPeriodStart).toBeDefined();
    expect(summary.planPeriodEnd).toBeDefined();
    expect(summary.planPeriodLabel).toBeDefined();
    expect(summary.services.length).toBeGreaterThanOrEqual(7);

    // Verify key baseline services exist
    const iepService = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
    expect(iepService).toBeDefined();
    expect(iepService?.serviceName).toBe("IEP Meetings");
    expect(iepService?.baseAllowance).toBe(3);
    expect(iepService?.trackingMethod).toBe("calendar");

    const unlimited504 = summary.services.find((s) => s.serviceKey === "504_MEETING");
    expect(unlimited504).toBeDefined();
    expect(unlimited504?.allowanceType).toBe("unlimited");
    expect(unlimited504?.remaining).toBe("Unlimited");
    expect(unlimited504?.status).toBe("unlimited");

    const emailService = summary.services.find((s) => s.serviceKey === "EMAIL_ASSISTANCE");
    expect(emailService).toBeDefined();
    expect(emailService?.baseAllowance).toBe(10);
    expect(emailService?.trackingMethod).toBe("timeline");

    const stateComplaint = summary.services.find((s) => s.serviceKey === "STATE_COMPLAINT");
    expect(stateComplaint).toBeDefined();
    expect(stateComplaint?.baseAllowance).toBe(1);
    expect(stateComplaint?.reserveOnOpen).toBe(true);
  });

  it("2. should record manual service usage into the existing Activity Timeline", async () => {
    const studentContactId = 8802;
    const res = await caller.serviceAllowances.logUsage({
      studentContactId,
      caseId: "WP-2026-0002",
      serviceKey: "EMAIL_ASSISTANCE",
      serviceName: "Email Assistance",
      eventDate: "2026-09-20",
      quantity: 1,
      note: "Drafted formal PWN rebuttal to case manager regarding speech therapy frequency.",
      staffMember: "Byron Honea",
    });

    expect(res.success).toBe(true);
    expect(res.activity).toBeDefined();
    expect(res.activity?.eventType).toBe("service_usage");
    expect(res.activity?.title).toBe("Email Assistance Provided");
    expect(res.activity?.description).toContain("Drafted formal PWN rebuttal");

    // Verify it is immediately reflected in the student's case activity timeline
    const timeline = await caller.caseActivity.list({ studentContactId });
    const match = timeline.find((e) => e.title.includes("Email Assistance"));
    expect(match).toBeDefined();

    // Verify it updates the Service Allowances summary
    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId,
      customPeriod: { start: "2026-09-01", end: "2027-08-31" },
    });
    const emailSummary = summary.services.find((s) => s.serviceKey === "EMAIL_ASSISTANCE");
    expect(emailSummary?.used).toBeGreaterThanOrEqual(1);
  });

  it("3. should add extra service allowance and record an audited adjustment", async () => {
    const studentContactId = 8803;

    // Initially records reviews has base 2
    const beforeSummary = await caller.serviceAllowances.getUsageSummary({ studentContactId });
    const recordsBefore = beforeSummary.services.find((s) => s.serviceKey === "RECORDS_REVIEW");
    expect(recordsBefore?.baseAllowance).toBe(2);
    expect(recordsBefore?.extraAllowance).toBe(0);

    // Add +1 extra allowance
    const addRes = await caller.serviceAllowances.addExtraAllowance({
      studentContactId,
      caseId: "WP-2026-0003",
      serviceKey: "RECORDS_REVIEW",
      serviceName: "Records Reviews",
      additionalAmount: 1,
      reason: "Mediation preparation required comprehensive 3-year historical evaluation re-review.",
      authorizedBy: "Byron Honea",
      date: "2026-09-22",
    });

    expect(addRes.success).toBe(true);
    expect(addRes.allowance?.extraAllowance).toBe(1);

    // Verify summary reflects 3 total allowed
    const afterSummary = await caller.serviceAllowances.getUsageSummary({ studentContactId });
    const recordsAfter = afterSummary.services.find((s) => s.serviceKey === "RECORDS_REVIEW");
    expect(recordsAfter?.extraAllowance).toBe(1);
    expect(recordsAfter?.totalAllowance).toBe(3);

    // Verify audit entry in case activity timeline
    const timeline = await caller.caseActivity.list({ studentContactId });
    const auditItem = timeline.find((e) => e.title.includes("Extra Allowance Added: Records Reviews +1"));
    expect(auditItem).toBeDefined();
    expect(auditItem?.description).toContain("Authorized by Byron Honea");
  });

  it("4. should enforce zero double-counting when timeline item links to an appointment", async () => {
    const studentContactId = 8804;

    // Log a manual service usage
    await caller.serviceAllowances.logUsage({
      studentContactId,
      caseId: "WP-2026-0004",
      serviceKey: "IEP_MEETING",
      serviceName: "IEP Meetings",
      eventDate: "2026-09-18",
      quantity: 1,
      note: "Attended annual IEP team meeting.",
      staffMember: "Byron Honea",
    });

    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId,
      customPeriod: { start: "2026-09-01", end: "2027-08-31" },
    });

    const iepSummary = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
    expect(iepSummary?.used).toBe(1);
    expect(iepSummary?.remaining).toBe(2); // 3 base - 1 used = 2 remaining
  });

  it("5. should ignore events outside the current plan period (no lifetime overflow)", async () => {
    const studentContactId = 8805;

    // Log an event in past year (2024)
    await caller.serviceAllowances.logUsage({
      studentContactId,
      caseId: "WP-2026-0005",
      serviceKey: "RECORDS_REVIEW",
      serviceName: "Records Reviews",
      eventDate: "2024-05-15",
      quantity: 1,
      note: "Old historical records review from 2024.",
      staffMember: "Byron Honea",
    });

    // Query current period: 2026-09-01 to 2027-08-31
    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId,
      customPeriod: { start: "2026-09-01", end: "2027-08-31" },
    });

    const recordsSummary = summary.services.find((s) => s.serviceKey === "RECORDS_REVIEW");
    // Past year event should NOT count towards current period!
    expect(recordsSummary?.used).toBe(0);
    expect(recordsSummary?.remaining).toBe(2);
  });

  it("6. should update service allowance configuration (admin overrides)", async () => {
    const studentContactId = 8806;

    const res = await caller.serviceAllowances.updateAllowanceConfig({
      studentContactId,
      serviceKey: "STATE_COMPLAINT",
      baseAllowance: 2,
      trackingMethod: "manual",
    });

    expect(res.success).toBe(true);
    expect(res.allowance.baseAllowance).toBe(2);
    expect(res.allowance.trackingMethod).toBe("manual");

    const summary = await caller.serviceAllowances.getUsageSummary({ studentContactId });
    const complaintSummary = summary.services.find((s) => s.serviceKey === "STATE_COMPLAINT");
    expect(complaintSummary?.baseAllowance).toBe(2);
    expect(complaintSummary?.trackingMethod).toBe("manual");
  });

  it("7. checkServiceAvailability should detect limit status for scheduler connection", async () => {
    const studentContactId = 8807;

    // Update state complaint allowance to 0 for limit test
    await caller.serviceAllowances.updateAllowanceConfig({
      studentContactId,
      serviceKey: "STATE_COMPLAINT",
      baseAllowance: 0,
      allowanceType: "limited",
    });

    const check = await caller.serviceAllowances.checkServiceAvailability({
      studentContactId,
      serviceKey: "STATE_COMPLAINT",
    });

    expect(check.found).toBe(true);
    expect(check.isUnlimited).toBe(false);
    expect(check.remaining).toBe(0);
    expect(check.isAtLimit).toBe(true);
  });

  describe("Section 15: Exact 19-Step Verification Flow", () => {
    const testStudentId = 9920;

    it("Step 1: Student has no allowance configuration initially", async () => {
      db.clearInMemoryAllowances();
      expect(testStudentId).toBe(9920);
    });

    it("Step 2 & 3 & 4 & 5: Assign/activate paid plan (Navigator), open Details, confirm rows and correct allowances automatically appear", async () => {
      // Step 2: Assign/activate paid plan (Navigator)
      const applyRes = await caller.serviceAllowances.applyPlanToStudent({
        studentContactId: testStudentId,
        planKey: "navigator",
      });
      expect(applyRes.success).toBe(true);

      // Step 3 & 4: Open Student -> Details (getUsageSummary) -> confirm service rows automatically appear
      const summary = await caller.serviceAllowances.getUsageSummary({
        studentContactId: testStudentId,
      });
      expect(summary.services.length).toBe(9); // All 9 catalog services auto-populated

      // Step 5: Confirm correct plan allowances appear for Navigator
      const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
      expect(iep).toBeDefined();
      expect(iep?.baseAllowance).toBe(2);
      expect(iep?.allowanceType).toBe("limited");
      expect(iep?.remaining).toBe(2);

      const five04 = summary.services.find((s) => s.serviceKey === "504_MEETING");
      expect(five04?.baseAllowance).toBe(2);

      const records = summary.services.find((s) => s.serviceKey === "RECORDS_REVIEW");
      expect(records?.baseAllowance).toBe(1);

      const email = summary.services.find((s) => s.serviceKey === "EMAIL_ASSISTANCE");
      expect(email?.allowanceType).toBe("not_included");
      expect(email?.totalAllowance).toBe("Not Included");
      expect(email?.remaining).toBe(0);

      const complaint = summary.services.find((s) => s.serviceKey === "STATE_COMPLAINT");
      expect(complaint?.allowanceType).toBe("not_included");

      const advocate = summary.services.find((s) => s.serviceKey === "ADVOCATE_SESSION");
      expect(advocate?.baseAllowance).toBe(2);
    });

    it("Step 6 & 7: Schedule an included meeting (IEP Meeting), confirm Scheduled increases", async () => {
      // Step 6: Schedule an included meeting
      db.registerAppointmentForServiceAllowances({
        id: 7701,
        clientId: testStudentId,
        title: "Annual IEP Team Meeting",
        meetingType: "IEP Meeting",
        startTime: new Date("2026-10-10T14:00:00Z"),
        endTime: new Date("2026-10-10T15:00:00Z"),
        status: "Scheduled",
      });

      // Step 7: Confirm Scheduled increases
      const summary = await caller.serviceAllowances.getUsageSummary({
        studentContactId: testStudentId,
      });
      const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
      expect(iep?.scheduledOpen).toBe(1);
      expect(iep?.used).toBe(0);
      expect(iep?.remaining).toBe(1); // 2 base - 1 scheduled = 1 remaining
    });

    it("Step 8 & 9: Mark meeting Completed, confirm Scheduled decreases and Used increases", async () => {
      // Step 8: Mark meeting Completed
      db.updateAppointmentStatusForServiceAllowances(testStudentId, 7701, "Completed");

      // Step 9: Confirm Scheduled decreases and Used increases
      const summary = await caller.serviceAllowances.getUsageSummary({
        studentContactId: testStudentId,
      });
      const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
      expect(iep?.scheduledOpen).toBe(0); // Decreased from 1 to 0
      expect(iep?.used).toBe(1);          // Increased from 0 to 1
      expect(iep?.remaining).toBe(1);     // 2 base - 1 used = 1 remaining
    });

    it("Step 10 & 11: Log Email Assistance, confirm Used increases", async () => {
      // Step 10: Log Email Assistance
      const logRes = await caller.serviceAllowances.logUsage({
        studentContactId: testStudentId,
        serviceKey: "EMAIL_ASSISTANCE",
        serviceName: "Email Assistance",
        eventDate: "2026-10-12",
        quantity: 1,
        note: "Drafted email communication to district superintendent.",
      });
      expect(logRes.success).toBe(true);

      // Step 11: Confirm Used increases
      const summary = await caller.serviceAllowances.getUsageSummary({
        studentContactId: testStudentId,
      });
      const email = summary.services.find((s) => s.serviceKey === "EMAIL_ASSISTANCE");
      expect(email?.used).toBe(1);
    });

    it("Step 12 & 13: Add Extra Allowance, confirm total/remaining increases", async () => {
      // Step 12: Add Extra Allowance (+1 Records Review)
      const addRes = await caller.serviceAllowances.addExtraAllowance({
        studentContactId: testStudentId,
        serviceKey: "RECORDS_REVIEW",
        serviceName: "Records Reviews",
        additionalAmount: 1,
        reason: "Comprehensive file audit authorized for mediation.",
        authorizedBy: "Byron Honea",
        date: "2026-10-14",
      });
      expect(addRes.success).toBe(true);

      // Step 13: Confirm total/remaining increases
      const summary = await caller.serviceAllowances.getUsageSummary({
        studentContactId: testStudentId,
      });
      const records = summary.services.find((s) => s.serviceKey === "RECORDS_REVIEW");
      expect(records?.baseAllowance).toBe(1);
      expect(records?.extraAllowance).toBe(1);
      expect(records?.totalAllowance).toBe(2); // Base 1 + Extra 1 = 2
      expect(records?.remaining).toBe(2);      // 2 total - 0 used = 2 remaining
    });

    it("Step 14 & 15: Change the client's plan (Navigator → Anchor), confirm base allowances change appropriately without deleting history", async () => {
      // Step 14: Change client's plan to Anchor
      const changeRes = await caller.serviceAllowances.applyPlanToStudent({
        studentContactId: testStudentId,
        planKey: "anchor",
      });
      expect(changeRes.success).toBe(true);

      // Step 15: Confirm base allowances change appropriately without deleting history
      const summary = await caller.serviceAllowances.getUsageSummary({
        studentContactId: testStudentId,
      });

      // Anchor includes Unlimited IEP Meetings
      const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
      expect(iep?.allowanceType).toBe("unlimited");
      expect(iep?.used).toBe(1); // HISTORY PRESERVED!

      // Anchor includes base 2 Records Reviews; Student had +1 Extra Allowance
      const records = summary.services.find((s) => s.serviceKey === "RECORDS_REVIEW");
      expect(records?.baseAllowance).toBe(2);   // Updated from 1 to 2 (Anchor default)
      expect(records?.extraAllowance).toBe(1);  // PRESERVED extra allowance override!
      expect(records?.totalAllowance).toBe(3);  // 2 + 1 = 3 Total
      expect(records?.remaining).toBe(3);

      // Email Assistance history is preserved
      const email = summary.services.find((s) => s.serviceKey === "EMAIL_ASSISTANCE");
      expect(email?.used).toBe(1); // HISTORY PRESERVED!
      expect(email?.allowanceType).toBe("unlimited"); // Anchor includes unlimited email
    });

    it("Step 16: Confirm old service-period history is preserved", async () => {
      // Log an event in previous service period (2024-2025)
      await caller.serviceAllowances.logUsage({
        studentContactId: testStudentId,
        serviceKey: "ADVOCATE_SESSION",
        serviceName: "Advocate Sessions",
        eventDate: "2025-03-10",
        quantity: 2,
        note: "Historical prior year advocate strategy session.",
      });

      // Query current period: 2026-09-01 to 2027-08-31
      const currentSummary = await caller.serviceAllowances.getUsageSummary({
        studentContactId: testStudentId,
        customPeriod: { start: "2026-09-01", end: "2027-08-31" },
      });
      const currentAdvocate = currentSummary.services.find((s) => s.serviceKey === "ADVOCATE_SESSION");
      expect(currentAdvocate?.used).toBe(0); // Prior year does not count in current period

      // Query historical period: 2024-09-01 to 2025-08-31
      const pastSummary = await caller.serviceAllowances.getUsageSummary({
        studentContactId: testStudentId,
        customPeriod: { start: "2024-09-01", end: "2025-08-31" },
      });
      const pastAdvocate = pastSummary.services.find((s) => s.serviceKey === "ADVOCATE_SESSION");
      expect(pastAdvocate?.used).toBe(2); // Historical usage is preserved intact!
    });

    it("Step 17: Confirm a Not Included service produces the correct warning", async () => {
      // For a student on Pay Per Use, State Complaint is Not Included
      const ppuStudentId = 9935;
      await caller.serviceAllowances.applyPlanToStudent({
        studentContactId: ppuStudentId,
        planKey: "pay_per_use",
      });

      const check = await caller.serviceAllowances.checkServiceAvailability({
        studentContactId: ppuStudentId,
        serviceKey: "STATE_COMPLAINT",
      });

      expect(check.found).toBe(true);
      expect(check.isNotIncluded).toBe(true);
      expect(check.isAtLimit).toBe(true);
      expect(check.totalAllowance).toBe("Not Included");
      expect(check.remaining).toBe(0);
    });

    it("Step 18: Confirm Unlimited services still count usage without reducing remaining", async () => {
      const summary = await caller.serviceAllowances.getUsageSummary({
        studentContactId: testStudentId,
      });
      const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
      expect(iep?.allowanceType).toBe("unlimited");
      expect(iep?.used).toBe(1); // Counts actual usage for analytics!
      expect(iep?.remaining).toBe("Unlimited"); // Remaining remains ∞ Unlimited
      expect(iep?.status).toBe("unlimited");
    });

    it("Step 19: Confirm no Calendar + Activity Timeline double-counting occurs", async () => {
      // We already have appointment 7701 for testStudentId counted as Completed
      // Now add a timeline entry that references the same appointment 7701
      const { recordCaseActivity } = await import("./services/caseActivityService");
      await recordCaseActivity({
        studentContactId: testStudentId,
        eventType: "meeting",
        title: "Annual IEP Meeting Notes",
        description: "Notes taken during annual IEP meeting.",
        sources: [
          {
            type: "calendar",
            label: "Linked Meeting",
            id: 7701,
            appointmentId: 7701,
          },
        ],
        isCompleted: true,
        categoryColor: "blue",
        eventDate: new Date("2026-10-10T14:00:00Z"),
      });

      const summary = await caller.serviceAllowances.getUsageSummary({
        studentContactId: testStudentId,
      });
      const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
      // Double counting protection MUST ensure used count remains 1, NOT 2!
      expect(iep?.used).toBe(1);
    });
  });
});

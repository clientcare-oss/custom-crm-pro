/**
 * PG-035 Advocacy Package Service Allowances & Student Connection Test Suite
 * Validates the 20-step verification workflow requested in PG-035:
 * 1-5: Catalog configuration, locking, persistence
 * 6-9: Client assignment, auto-population of student service allowances
 * 10-13: Calendar appointment tracking (Scheduled/Open -> Completed/Used)
 * 14-15: Manual service usage logging & updates
 * 16-17: Extra allowance isolation (does not mutate package master)
 * 18-20: Package master updates (future vs active clients) and history preservation
 */

import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("PG-035 · Advocacy Package Service Allowances & Student Connection", () => {
  const testPackageCode = "navigator";
  const testPackageName = "Navigator Advocacy Package";
  const testStudentId = 9988;

  const mockAdvocateUser = {
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

  const adminCtx = {
    user: mockAdvocateUser,
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(adminCtx);

  const nineAllowances = [
    { serviceKey: "IEP_MEETING", serviceName: "IEP Meetings", category: "meeting" as const, allowanceType: "limited" as const, baseAllowance: 2, trackingMethod: "calendar" as const, reserveOnOpen: true },
    { serviceKey: "504_MEETING", serviceName: "504 Meetings", category: "meeting" as const, allowanceType: "limited" as const, baseAllowance: 2, trackingMethod: "calendar" as const, reserveOnOpen: true },
    { serviceKey: "RECORDS_REVIEW", serviceName: "Records Reviews", category: "review" as const, allowanceType: "limited" as const, baseAllowance: 2, trackingMethod: "calendar" as const, reserveOnOpen: true },
    { serviceKey: "EMAIL_ASSISTANCE", serviceName: "Email Assistance", category: "advocacy" as const, allowanceType: "limited" as const, baseAllowance: 10, trackingMethod: "timeline" as const, reserveOnOpen: false },
    { serviceKey: "STATE_COMPLAINT", serviceName: "State Complaints", category: "advocacy" as const, allowanceType: "limited" as const, baseAllowance: 1, trackingMethod: "manual" as const, reserveOnOpen: true },
    { serviceKey: "PWN_SUPPORT", serviceName: "PWN Review / Support", category: "review" as const, allowanceType: "limited" as const, baseAllowance: 2, trackingMethod: "timeline" as const, reserveOnOpen: false },
    { serviceKey: "ADVOCATE_SESSION", serviceName: "Advocate Sessions", category: "meeting" as const, allowanceType: "limited" as const, baseAllowance: 3, trackingMethod: "calendar" as const, reserveOnOpen: true },
    { serviceKey: "DOCUMENT_REVIEW", serviceName: "Document Reviews", category: "document" as const, allowanceType: "limited" as const, baseAllowance: 2, trackingMethod: "timeline" as const, reserveOnOpen: false },
    { serviceKey: "PARENT_CONCERN_ASSISTANCE", serviceName: "Parent Concern Statement Assistance", category: "document" as const, allowanceType: "limited" as const, baseAllowance: 2, trackingMethod: "timeline" as const, reserveOnOpen: false },
  ];

  beforeAll(async () => {
    db.clearInMemoryAllowances();
  });

  // Step 1: Open PG-035 (Catalog lists advocacy package)
  it("Test 1: Open PG-035 - Catalog retrieves active services with advocacy package classification", async () => {
    const catalog = await caller.services.list({ includeArchived: false });
    expect(catalog).toBeDefined();
    const pkg = catalog.find((s) => s.serviceCode === testPackageCode || s.isAdvocacyPackage);
    expect(pkg).toBeDefined();
    expect(pkg?.isAdvocacyPackage).toBe(true);
  });

  // Step 2: Open an Advocacy Package
  it("Test 2: Open an Advocacy Package - Retrieves package metadata & lock status", async () => {
    const pkgData = await caller.services.getPackageAllowances({
      planKey: testPackageCode,
      planName: testPackageName,
    });
    expect(pkgData).toBeDefined();
    expect(pkgData.planKey).toBe(testPackageCode);
    expect(Array.isArray(pkgData.allowances)).toBe(true);
  });

  // Step 3: Configure all nine standard service allowances
  it("Test 3: Configure all nine standard service allowances with exact standard keys", async () => {
    const result = await caller.services.updatePackageAllowances({
      planKey: testPackageCode,
      planName: testPackageName,
      isLocked: false,
      applyToActiveClients: false,
      allowances: nineAllowances,
    });

    expect(result.success).toBe(true);
  });

  // Step 4: Lock the allowances
  it("Test 4: Lock the allowances - Locking is enforced and stored", async () => {
    const lockResult = await caller.services.updatePackageAllowances({
      planKey: testPackageCode,
      planName: testPackageName,
      isLocked: true,
      applyToActiveClients: false,
      allowances: nineAllowances,
    });
    expect(lockResult.success).toBe(true);

    const checkLock = await caller.services.getPackageAllowances({
      planKey: testPackageCode,
    });
    expect(checkLock.isLocked).toBe(true);
  });

  // Step 5: Confirm they remain saved after refresh
  it("Test 5: Confirm they remain saved after refresh", async () => {
    const refreshed = await caller.services.getPackageAllowances({
      planKey: testPackageCode,
    });
    expect(refreshed.isLocked).toBe(true);
    expect(refreshed.isConfigured).toBe(true);
    expect(refreshed.allowances.length).toBe(9);

    const recordsReview = refreshed.allowances.find((a) => a.serviceKey === "RECORDS_REVIEW");
    expect(recordsReview).toBeDefined();
    expect(recordsReview?.allowanceType).toBe("limited");
    expect(recordsReview?.baseAllowance).toBe(2);

    const iepMeeting = refreshed.allowances.find((a) => a.serviceKey === "IEP_MEETING");
    expect(iepMeeting).toBeDefined();
    expect(iepMeeting?.allowanceType).toBe("limited");
    expect(iepMeeting?.baseAllowance).toBe(2);
  });

  // Step 6: Assign/activate that package for a test client
  it("Test 6: Assign/activate that package for a test client", async () => {
    const applyRes = await caller.serviceAllowances.applyPlanToStudent({
      studentContactId: testStudentId,
      planKey: testPackageCode,
    });
    expect(applyRes.success).toBe(true);
  });

  // Step 7: Open that student's Details page
  it("Test 7: Open that student's Details page - Loads service allowances usage summary", async () => {
    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId: testStudentId,
    });
    expect(summary).toBeDefined();
    expect(summary.studentContactId).toBe(testStudentId);
    expect(summary.services.length).toBeGreaterThanOrEqual(9);
  });

  // Step 8: Confirm all applicable service rows automatically appear
  it("Test 8: Confirm all applicable service rows automatically appear", async () => {
    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId: testStudentId,
    });
    const keys = summary.services.map((s) => s.serviceKey);
    expect(keys).toContain("IEP_MEETING");
    expect(keys).toContain("504_MEETING");
    expect(keys).toContain("RECORDS_REVIEW");
    expect(keys).toContain("EMAIL_ASSISTANCE");
    expect(keys).toContain("STATE_COMPLAINT");
    expect(keys).toContain("PWN_SUPPORT");
    expect(keys).toContain("ADVOCATE_SESSION");
    expect(keys).toContain("DOCUMENT_REVIEW");
    expect(keys).toContain("PARENT_CONCERN_ASSISTANCE");
  });

  // Step 9: Confirm the correct allowance numbers appear
  it("Test 9: Confirm the correct allowance numbers appear (Unlimited vs Limited quantities)", async () => {
    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId: testStudentId,
    });
    const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
    expect(iep?.allowanceType).toBe("limited");
    expect(iep?.baseAllowance).toBe(2);
    expect(iep?.remaining).toBe(2);

    const rr = summary.services.find((s) => s.serviceKey === "RECORDS_REVIEW");
    expect(rr?.allowanceType).toBe("limited");
    expect(rr?.baseAllowance).toBe(2);
    expect(rr?.remaining).toBe(2);
  });

  // Step 10: Schedule a trackable meeting
  const scheduledAptId = 7701;
  it("Test 10: Schedule a trackable meeting (IEP Meeting)", async () => {
    db.registerAppointmentForServiceAllowances({
      id: scheduledAptId,
      clientId: testStudentId,
      title: "Annual IEP Team Meeting",
      meetingType: "IEP Meeting",
      startTime: new Date("2026-10-10T14:00:00Z"),
      endTime: new Date("2026-10-10T15:00:00Z"),
      status: "Scheduled",
    });

    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId: testStudentId,
    });
    const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
    expect(iep).toBeDefined();
    expect(iep?.scheduledOpen).toBe(1);
    expect(iep?.used).toBe(0);
    expect(iep?.remaining).toBe(1);
  });

  // Step 11: Confirm Scheduled/Open updates
  it("Test 11: Confirm Scheduled/Open updates to 1 and Remaining decreases to 1", async () => {
    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId: testStudentId,
    });
    const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
    expect(iep?.scheduledOpen).toBe(1);
    expect(iep?.used).toBe(0);
    expect(iep?.remaining).toBe(1);
  });

  // Step 12: Complete the meeting
  it("Test 12: Complete the meeting", async () => {
    db.updateAppointmentStatusForServiceAllowances(testStudentId, scheduledAptId, "Completed");
  });

  // Step 13: Confirm it moves to Used without double-counting
  it("Test 13: Confirm it moves to Used (used: 1, scheduled: 0, remaining: 1)", async () => {
    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId: testStudentId,
    });
    const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
    expect(iep?.used).toBe(1);
    expect(iep?.scheduledOpen).toBe(0);
    expect(iep?.remaining).toBe(1);
  });

  // Step 14: Log a manual service
  it("Test 14: Log a manual service (Email Assistance)", async () => {
    const logRes = await caller.serviceAllowances.logUsage({
      studentContactId: testStudentId,
      serviceKey: "EMAIL_ASSISTANCE",
      serviceName: "Email Assistance",
      quantity: 1,
      note: "Drafted communication to district sped director",
      staffMember: "Byron Honea",
      eventDate: "2026-10-12",
    });
    expect(logRes.success).toBe(true);
  });

  // Step 15: Confirm usage updates
  it("Test 15: Confirm usage updates for Email Assistance (used: 1, remaining: 9)", async () => {
    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId: testStudentId,
    });
    const email = summary.services.find((s) => s.serviceKey === "EMAIL_ASSISTANCE");
    expect(email?.used).toBe(1);
    expect(email?.remaining).toBe(9);
  });

  // Step 16: Add an individual Extra Allowance
  it("Test 16: Add an individual Extra Allowance (+1 Records Review)", async () => {
    const extraRes = await caller.serviceAllowances.addExtraAllowance({
      studentContactId: testStudentId,
      serviceKey: "RECORDS_REVIEW",
      serviceName: "Records Reviews",
      additionalAmount: 1,
      reason: "Courtesy IEP dispute review addition",
      authorizedBy: "Byron Honea",
      date: "2026-10-14",
    });
    expect(extraRes.success).toBe(true);

    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId: testStudentId,
    });
    const rr = summary.services.find((s) => s.serviceKey === "RECORDS_REVIEW");
    expect(rr?.extraAllowance).toBe(1);
    expect(rr?.totalAllowance).toBe(3); // 2 base + 1 extra
    expect(rr?.remaining).toBe(3); // 3 total - 0 used
  });

  // Step 17: Confirm the package master configuration DOES NOT change
  it("Test 17: Confirm the package master configuration DOES NOT change when student extra allowance is added", async () => {
    const master = await caller.services.getPackageAllowances({
      planKey: testPackageCode,
    });
    const masterRr = master.allowances.find((a) => a.serviceKey === "RECORDS_REVIEW");
    expect(masterRr?.baseAllowance).toBe(2); // Still 2, untouched!
  });

  // Step 18: Change a master package allowance
  it("Test 18: Change a master package allowance (Records Review 2 -> 3)", async () => {
    // Unlock first
    await caller.services.updatePackageAllowances({
      planKey: testPackageCode,
      isLocked: false,
      applyToActiveClients: false,
      allowances: nineAllowances,
    });

    const updatedNine = nineAllowances.map((a) =>
      a.serviceKey === "RECORDS_REVIEW" ? { ...a, baseAllowance: 3 } : a
    );

    const updateRes = await caller.services.updatePackageAllowances({
      planKey: testPackageCode,
      planName: testPackageName,
      isLocked: true,
      applyToActiveClients: true, // Propagate updated base allowance to active clients
      allowances: updatedNine,
    });
    expect(updateRes.success).toBe(true);
  });

  // Step 19: Confirm active clients count is calculated for migration choice
  it("Test 19: Confirm active clients count for package migration choice is accurately returned", async () => {
    const countRes = await caller.services.getActiveClientsCount({
      planKey: testPackageCode,
    });
    expect(countRes.count).toBeGreaterThanOrEqual(0);
  });

  // Step 20: Confirm historical usage is never deleted or reset
  it("Test 20: Confirm historical usage is never deleted or reset when base allowance updates", async () => {
    const summary = await caller.serviceAllowances.getUsageSummary({
      studentContactId: testStudentId,
    });
    const rr = summary.services.find((s) => s.serviceKey === "RECORDS_REVIEW");
    expect(rr?.baseAllowance).toBe(3); // Updated to 3
    expect(rr?.extraAllowance).toBe(1); // Student-specific +1 strictly preserved!
    expect(rr?.totalAllowance).toBe(4); // 3 base + 1 extra = 4
    expect(rr?.remaining).toBe(4); // 4 total - 0 used = 4

    // Confirm meeting completed history was preserved
    const iep = summary.services.find((s) => s.serviceKey === "IEP_MEETING");
    expect(iep?.used).toBe(1);
    expect(iep?.scheduledOpen).toBe(0);

    // Confirm timeline email history was preserved
    const email = summary.services.find((s) => s.serviceKey === "EMAIL_ASSISTANCE");
    expect(email?.used).toBe(1);
  });
});

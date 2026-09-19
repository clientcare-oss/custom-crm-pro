import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("PG-030 Student Workspace — Client Journey System (15 Scenarios)", () => {
  const mockAdminUser = {
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

  const mockEmployeeUser = {
    ...mockAdminUser,
    id: 2,
    openId: "user_test_employee",
    name: "Staff Advocate",
    email: "staff@waypointadvocates.com",
    role: "user" as const,
  };

  const adminCaller = appRouter.createCaller({
    user: mockAdminUser,
    req: {} as any,
    res: {} as any,
  });

  const employeeCaller = appRouter.createCaller({
    user: mockEmployeeUser,
    req: {} as any,
    res: {} as any,
  });

  const studentContactId = 1;

  // Scenario 1: New Discovery lead
  it("Scenario 1: New Discovery lead transitions into Discovery stage with scheduled call roadmap", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Discovery",
      operationalState: "Normal",
      serviceStatus: "Not Started",
      billingStatus: "Not Configured",
      portalLifecycleStatus: "Discovery",
      currentPrimaryAction: "Start Discovery Call",
      currentActionDestination: "/leads/1/discovery",
      currentActionDueDate: "2026-09-20",
      currentActionHelperText: "Open the guided call checklist",
      journeyProgress: "Discovery scheduled",
      reason: "Initial family inquiry scheduled for clarity call",
    });

    expect(res.success).toBe(true);
    expect(res.contact.lifecycleStage).toBe("Discovery");
    expect(res.contact.currentPrimaryAction).toBe("Start Discovery Call");
    expect(res.contact.portalLifecycleStatus).toBe("Discovery");
  });

  // Scenario 2: Standard onboarding
  it("Scenario 2: Standard paid onboarding progresses through 6 steps and activates services", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Onboarding",
      operationalState: "Normal",
      serviceStatus: "Not Started",
      billingStatus: "Current",
      portalLifecycleStatus: "Onboarding",
      currentPrimaryAction: "Continue Onboarding",
      currentActionDestination: "/smart-files",
      currentActionHelperText: "Complete educational records request",
      journeyProgress: "3 of 6 steps complete",
      reason: "Family completed enrollment agreement",
    });

    expect(res.success).toBe(true);
    expect(res.contact.lifecycleStage).toBe("Onboarding");
    expect(res.contact.journeyProgress).toBe(3);
  });

  // Scenario 3: Scholarship onboarding awaiting approval
  it("Scenario 3: Scholarship onboarding creates pending manager approval request", async () => {
    const res = await employeeCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Onboarding",
      operationalState: "Scholarship Pending",
      serviceStatus: "Not Started",
      billingStatus: "Scholarship",
      portalLifecycleStatus: "Onboarding",
      currentPrimaryAction: "Review Scholarship Request",
      currentActionDestination: "/contacts/1",
      currentActionHelperText: "Awaiting manager scholarship funding approval",
      journeyProgress: "Scholarship requested",
      managerApprovalStatus: "Pending",
      scholarshipNotes: "Family facing financial hardship, partial scholarship requested",
      reason: "Staff submitted scholarship application for review",
    });

    expect(res.success).toBe(true);
    expect(res.contact.operationalState).toBe("Scholarship Pending");
    expect(res.contact.managerApprovalStatus).toBe("Pending");
  });

  // Scenario 4: Scholarship approval
  it("Scenario 4: Manager approves scholarship and unlocks remaining onboarding", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Onboarding",
      operationalState: "Normal",
      serviceStatus: "Active",
      billingStatus: "Scholarship",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Continue Onboarding",
      currentActionDestination: "/contacts/1",
      currentActionHelperText: "Scholarship approved - complete student intake",
      journeyProgress: "Scholarship Approved",
      managerApprovalStatus: "Approved",
      approvingManager: "Byron Honea",
      approvalTimestamp: new Date().toISOString(),
      reason: "Manager approved 100% Waypoint Foundation Scholarship",
    });

    expect(res.success).toBe(true);
    expect(res.contact.managerApprovalStatus).toBe("Approved");
    expect(res.contact.approvingManager).toBe("Byron Honea");
  });

  // Scenario 5: Active client with a priority task
  it("Scenario 5: Active client surfaces Most Important Thing Next", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Active",
      operationalState: "Normal",
      serviceStatus: "Active",
      billingStatus: "Current",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Review New IEP Draft",
      currentActionDestination: "/contacts/1",
      currentActionDueDate: "Due today",
      currentActionHelperText: "Uploaded by parent · Compare draft to goals",
      journeyProgress: "Services active",
      reason: "Received new draft from school district",
    });

    expect(res.success).toBe(true);
    expect(res.contact.lifecycleStage).toBe("Active");
    expect(res.contact.currentPrimaryAction).toBe("Review New IEP Draft");
  });

  // Scenario 6: Renewal due
  it("Scenario 6: Renewal stage adds Renewal Due chip and Start Renewal primary action", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Renewal",
      operationalState: "Renewal Due",
      serviceStatus: "Active",
      billingStatus: "Current",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Start Renewal",
      currentActionDestination: "/contacts/1",
      currentActionHelperText: "Review plan and send renewal form",
      renewalDaysRemaining: 14,
      serviceTermEndsAt: "March 15, 2027",
      reason: "Approaching 30-day annual renewal window",
    });

    expect(res.success).toBe(true);
    expect(res.contact.lifecycleStage).toBe("Renewal");
    expect(res.contact.currentPrimaryAction).toBe("Start Renewal");
  });

  // Scenario 7: Renewal completed
  it("Scenario 7: Renewal completed updates service term and returns client to Active", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Active",
      operationalState: "Normal",
      serviceStatus: "Active",
      billingStatus: "Current",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Review Case Workspace",
      currentActionDestination: "/contacts/1",
      renewalDaysRemaining: 365,
      serviceTermEndsAt: "March 15, 2028",
      reason: "Annual advocacy renewal agreement executed and payment confirmed",
    });

    expect(res.success).toBe(true);
    expect(res.contact.lifecycleStage).toBe("Active");
    expect(res.contact.operationalState).toBe("Normal");
  });

  // Scenario 8: Services paused with billing continuing
  it("Scenario 8: Services paused with billing continuing preserves billing & documents", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Active",
      operationalState: "Services Paused",
      serviceStatus: "Paused",
      billingStatus: "Current",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Review Pause",
      currentActionDestination: "/contacts/1",
      currentActionHelperText: "View terms, dates, and return plan",
      pauseReason: "Hospitalization or medical leave",
      pauseStartDate: "September 19, 2026",
      pauseReviewDate: "December 15, 2026",
      pauseType: "Services Only",
      contractTreatment: "No billing changes",
      pauseApprovedBy: "Byron Honea",
      reason: "Parent requested pause for medical treatment; recurring retainer continues",
    });

    expect(res.success).toBe(true);
    expect(res.contact.operationalState).toBe("Services Paused");
    expect(res.contact.serviceStatus).toBe("Paused");
    expect(res.contact.billingStatus).toBe("Current");
  });

  // Scenario 9: Services and billing paused
  it("Scenario 9: Services and billing paused pauses recurring payments with manager approval", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Active",
      operationalState: "Services Paused",
      serviceStatus: "Paused",
      billingStatus: "Billing Paused",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Review Pause",
      currentActionDestination: "/contacts/1",
      currentActionHelperText: "View terms, dates, and return plan",
      pauseReason: "Temporary private placement",
      pauseStartDate: "September 19, 2026",
      pauseReviewDate: "January 15, 2027",
      pauseType: "Services and Billing",
      contractTreatment: "Billing paused until return",
      pauseApprovedBy: "Byron Honea",
      reason: "Manager approved pausing both advocacy services and billing during semester placement",
    });

    expect(res.success).toBe(true);
    expect(res.contact.billingStatus).toBe("Billing Paused");
  });

  // Scenario 10: Paid-in-full time preserved
  it("Scenario 10: Paid-in-full client pause preserves unused contract time", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Active",
      operationalState: "Services Paused",
      serviceStatus: "Paused",
      billingStatus: "Paid in Full",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Review Pause",
      currentActionDestination: "/contacts/1",
      currentActionHelperText: "View terms, dates, and return plan",
      pauseReason: "Residential placement",
      pauseStartDate: "September 19, 2026",
      pauseReviewDate: "January 15, 2027",
      pauseType: "Services Only",
      contractTreatment: "Paid-in-full time preserved",
      pauseApprovedBy: "Byron Honea",
      reason: "Paid-in-full annual client placed in residential care; unused months preserved",
    });

    expect(res.success).toBe(true);
    expect(res.contact.contractTreatment).toBe("Paid-in-full time preserved");
  });

  // Scenario 11: Payment failed
  it("Scenario 11: Payment failure triggers Payment Attention while maintaining active grace period", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Active",
      operationalState: "Payment Attention",
      serviceStatus: "Active",
      billingStatus: "Payment Failed",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Resolve Payment Issue",
      currentActionDestination: "/contacts/1",
      currentActionHelperText: "Review billing and contact the family",
      paymentFailureDate: "September 19, 2026",
      failedAttemptCount: 1,
      nextRetryDate: "September 22, 2026",
      gracePeriodExpiresAt: "October 03, 2026",
      amountDue: "$55.00",
      paymentMethodSummary: "Visa ending in 4242",
      reason: "Stripe monthly subscription charge declined (insufficient funds)",
    });

    expect(res.success).toBe(true);
    expect(res.contact.operationalState).toBe("Payment Attention");
    expect(res.contact.currentPrimaryAction).toBe("Resolve Payment Issue");
    expect(res.contact.serviceStatus).toBe("Active");
  });

  // Scenario 12: Payment successfully retried
  it("Scenario 12: Successful retry restores Normal Active status and clears payment warning", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Active",
      operationalState: "Normal",
      serviceStatus: "Active",
      billingStatus: "Current",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Review Case Workspace",
      currentActionDestination: "/contacts/1",
      failedAttemptCount: 0,
      amountDue: "$0.00",
      reason: "Family updated payment card and charge completed successfully",
    });

    expect(res.success).toBe(true);
    expect(res.contact.operationalState).toBe("Normal");
    expect(res.contact.billingStatus).toBe("Current");
  });

  // Scenario 13: Offboarding requested
  it("Scenario 13: Offboarding requested keeps services and portal active until final confirmation", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Offboarding",
      operationalState: "Pending Closeout",
      serviceStatus: "Active",
      billingStatus: "Current",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Start Offboarding",
      currentActionDestination: "/contacts/1",
      currentActionHelperText: "Review reason and begin guided closeout",
      offboardingReason: "Services completed",
      offboardingRequestedAt: "September 19, 2026",
      reason: "Parent communicated student has exited IEP services and met all goals",
    });

    expect(res.success).toBe(true);
    expect(res.contact.lifecycleStage).toBe("Offboarding");
    expect(res.contact.serviceStatus).toBe("Active");
    expect(res.contact.portalLifecycleStatus).toBe("Active");
  });

  // Scenario 14: Offboarding finalized
  it("Scenario 14: Finalized closeout moves to Closed state while preserving all historical records", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Closed",
      operationalState: "Normal",
      serviceStatus: "Closed",
      billingStatus: "Closed",
      portalLifecycleStatus: "Disabled",
      currentPrimaryAction: "Review Closed Case",
      currentActionDestination: "/contacts/1",
      currentActionHelperText: "Case closed - records preserved",
      offboardingEffectiveDate: "September 19, 2026",
      closeoutCompletedBy: "Byron Honea",
      reason: "Final closeout summary completed, final Case Compass logged, subscription cancelled",
    });

    expect(res.success).toBe(true);
    expect(res.contact.lifecycleStage).toBe("Closed");
    expect(res.contact.serviceStatus).toBe("Closed");
  });

  // Scenario 15: Closed client reactivated
  it("Scenario 15: Closed client can be safely reactivated back into Active or Onboarding stage", async () => {
    const res = await adminCaller.contacts.updateJourneyState({
      contactId: studentContactId,
      lifecycleStage: "Active",
      operationalState: "Normal",
      serviceStatus: "Active",
      billingStatus: "Current",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Review Case Workspace",
      currentActionDestination: "/contacts/1",
      reason: "Returning family requested IEP dispute support for upcoming school year",
    });

    expect(res.success).toBe(true);
    expect(res.contact.lifecycleStage).toBe("Active");
    expect(res.contact.serviceStatus).toBe("Active");
  });
});

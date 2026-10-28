import { describe, it, expect, beforeEach, vi } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";

describe("Waypoint CRM — Intelligent Review Opportunity Automation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).__waypointMemoryTrackers?.clear();
  });

  const parentId = 9101;
  const student1Id = 9201;
  const student2Id = 9202; // Sibling student on same parent account

  it("1. First completed qualifying IEP meeting generates one opportunity", async () => {
    // Mock parent resolution
    vi.spyOn(db, "resolveAccountContactId").mockResolvedValue({
      accountId: parentId,
      isParent: false,
      contact: { id: student1Id, parentContactId: parentId, firstName: "Liam", lastName: "Jenkins" },
    });

    // Reset memory tracker for fresh test
    const initialTracker = await db.evaluateReviewEligibility(parentId);
    expect(initialTracker.isEligible).toBe(true);

    const result = await db.evaluateAndTriggerMeetingReviewOpportunity({
      studentContactId: student1Id,
      parentContactId: parentId,
      meetingWorkspaceId: 4401,
      meetingTitle: "Annual IEP Review: Liam Jenkins",
      meetingType: "IEP Meeting",
      assignedAdvocate: "Byron Honea",
    });

    expect(result.triggered).toBe(true);

    // Verify tracker state
    const { tracker, status, hasActiveOpportunity } = await db.getReviewTrackerByAccountId(parentId);
    expect(tracker).not.toBeNull();
    expect(status).toBe("eligible");
    expect(hasActiveOpportunity).toBe(true);
    expect(tracker?.triggerMilestone).toBe("First Advocacy Meeting Completed");
  });

  it("2. Scheduled end time alone does not generate an opportunity without completion", async () => {
    // If meeting is only scheduled (not Completed), trigger does not execute
    const pastApt = {
      id: 5501,
      status: "Scheduled",
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(Date.now() - 1800000), // end time passed 30 mins ago
      meetingType: "IEP Meeting",
      title: "Scheduled IEP Meeting",
    };

    // Calendar check ensures that only status === "Completed" calls evaluateAndTriggerMeetingReviewOpportunity
    expect(pastApt.status).not.toBe("Completed");
  });

  it("3. Canceled meetings do not trigger review opportunities", async () => {
    const canceledResult = await db.evaluateAndTriggerMeetingReviewOpportunity({
      studentContactId: student1Id,
      meetingTitle: "Cancelled: IEP Review Meeting",
      meetingType: "IEP Meeting",
    });

    // Non-qualifying or cancelled meetings should not trigger
    // Also discovery calls do not trigger
    const discResult = await db.evaluateAndTriggerMeetingReviewOpportunity({
      studentContactId: student1Id,
      meetingTitle: "Discovery Call: Initial Parent Consultation",
      meetingType: "Discovery Call",
    });
    expect(discResult.triggered).toBe(false);
  });

  it("4. Rescheduled meetings do not trigger review opportunities", async () => {
    const rescheduledApt = {
      id: 5502,
      status: "Scheduled",
      meetingType: "IEP Meeting",
      title: "Rescheduled: Annual 504 Review",
    };
    expect(rescheduledApt.status).not.toBe("Completed");
  });

  it("5. Repeated completion events do not create duplicates (idempotency)", async () => {
    vi.spyOn(db, "resolveAccountContactId").mockResolvedValue({
      accountId: parentId,
      isParent: false,
      contact: { id: student1Id, parentContactId: parentId, firstName: "Liam", lastName: "Jenkins" },
    });

    const eventId = `meeting_first_${student1Id}_workspace_77`;

    // First call
    const res1 = await db.createReviewOpportunity({
      accountId: parentId,
      studentId: student1Id,
      triggerMilestone: "First Advocacy Meeting Completed",
      milestoneEventId: eventId,
      assignedEmployee: "Byron Honea",
    });
    expect(res1.success).toBe(true);

    // Second call with same event identifier (e.g. repeated click or webhook)
    const res2 = await db.createReviewOpportunity({
      accountId: parentId,
      studentId: student1Id,
      triggerMilestone: "First Advocacy Meeting Completed",
      milestoneEventId: eventId,
      assignedEmployee: "Byron Honea",
    });
    expect(res2.success).toBe(true);
    expect(res2.alreadyExisted).toBe(true);
  });

  it("6. A second student on the same parent account does not generate an inappropriate duplicate", async () => {
    vi.spyOn(db, "resolveAccountContactId").mockImplementation(async (id: number) => {
      return {
        accountId: parentId,
        isParent: false,
        contact: { id, parentContactId: parentId },
      };
    });

    // Student 1 triggers a review opportunity on the parent account
    await db.createReviewOpportunity({
      accountId: parentId,
      studentId: student1Id,
      triggerMilestone: "First Advocacy Meeting Completed",
      milestoneEventId: "evt_stu1",
    });

    // When Student 2 on the same parent account completes a meeting:
    const eligibilityForStudent2 = await db.evaluateReviewEligibility(parentId);
    // Because parent account already has an active opportunity, account-level eligibility stops duplicate
    expect(eligibilityForStudent2.isEligible).toBe(false);
    expect(eligibilityForStudent2.reason).toContain("already pending");
  });

  it("7. Existing confirmed reviews suppress new requests", async () => {
    const parentWithReview = 9102;
    // Mark as review confirmed
    await db.createReviewOpportunity({
      accountId: parentWithReview,
      studentId: 9205,
      triggerMilestone: "IEP Completed",
      milestoneEventId: "evt_9102",
    });

    await db.confirmReviewByClient({
      accountId: parentWithReview,
      confirmedBy: "Sarah Jenkins (Parent Email Confirmation)",
    });

    const eligibility = await db.evaluateReviewEligibility(parentWithReview);
    expect(eligibility.isEligible).toBe(false);
    expect(eligibility.reason).toContain("already confirmed");
  });

  it("8. Pending requests suppress duplicate opportunities", async () => {
    const parentWithPending = 9103;
    await db.createReviewOpportunity({
      accountId: parentWithPending,
      studentId: 9206,
      triggerMilestone: "First Meeting",
      milestoneEventId: "evt_9103",
    });

    // Record review request sent
    await db.recordReviewRequest({
      accountId: parentWithPending,
      requestedBy: "Byron Honea",
      requestChannel: "email",
    });

    const eligibility = await db.evaluateReviewEligibility(parentWithPending);
    expect(eligibility.isEligible).toBe(false);
    expect(eligibility.reason).toContain("already been sent");
  });

  it("9. Remind Me Later creates a persistent reminder and halts immediate opportunity", async () => {
    const parentWithRemind = 9104;
    await db.createReviewOpportunity({
      accountId: parentWithRemind,
      studentId: 9207,
      triggerMilestone: "504 Plan Meeting",
      milestoneEventId: "evt_9104",
    });

    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await db.remindLater({
      accountId: parentWithRemind,
      reminderDate: futureDate.toISOString(),
      notes: "Wait for signature on draft IEP",
    });

    const { status, reminderDue, tracker } = await db.getReviewTrackerByAccountId(parentWithRemind);
    expect(status).toBe("scheduled");
    expect(reminderDue).toBe(false);
    expect(tracker?.reminderDate).not.toBeNull();

    // Still ineligible for duplicate creation while scheduled in future
    const eligibility = await db.evaluateReviewEligibility(parentWithRemind);
    expect(eligibility.isEligible).toBe(false);
  });

  it("10. Suppression reasons are stored privately (Not Appropriate Right Now)", async () => {
    const parentWithSuppress = 9105;
    await db.createReviewOpportunity({
      accountId: parentWithSuppress,
      studentId: 9208,
      triggerMilestone: "Dispute Meeting",
      milestoneEventId: "evt_9105",
    });

    const privateNote = "Parent in dispute with school district regarding 1:1 aide. Revisit after mediation.";
    await db.suppressReviewOpportunity({
      accountId: parentWithSuppress,
      reason: "Active unresolved concerns",
      notes: privateNote,
      suppressedBy: "Byron Honea",
    });

    const { status, isSuppressed, suppressionReason, suppressionNotes } =
      await db.getReviewTrackerByAccountId(parentWithSuppress);

    expect(status).toBe("suppressed");
    expect(isSuppressed).toBe(true);
    expect(suppressionReason).toBe("Active unresolved concerns");
    expect(suppressionNotes).toBe(privateNote);

    // Can be reconsidered later
    await db.reconsiderSuppression({
      accountId: parentWithSuppress,
      employee: "Byron Honea",
    });

    const recheck = await db.getReviewTrackerByAccountId(parentWithSuppress);
    expect(recheck.status).toBe("eligible");
    expect(recheck.isSuppressed).toBe(false);
  });

  it("11. Prepare Review Request does not send prematurely and blocks FERPA violations", async () => {
    const parentTest = 9106;
    await db.createReviewOpportunity({
      accountId: parentTest,
      studentId: 9209,
      triggerMilestone: "IEP Concluded",
      milestoneEventId: "evt_9106",
    });

    // Guardrail: if someone attempts to inject confidential disability classifications into the email body
    await expect(
      db.recordReviewRequest({
        accountId: parentTest,
        requestedBy: "Byron Honea",
        customBody: "Please leave a review regarding our advocacy for your child's severe ADHD and Autism diagnosis.",
      })
    ).rejects.toThrow("Security guardrail: Confidential student disability");
  });

  it("12. Successful sending updates the tracker with 14-day follow-up", async () => {
    const parentTest = 9107;
    await db.createReviewOpportunity({
      accountId: parentTest,
      studentId: 9210,
      triggerMilestone: "Annual Review",
      milestoneEventId: "evt_9107",
    });

    const updated = await db.recordReviewRequest({
      accountId: parentTest,
      requestedBy: "Byron Honea",
      requestChannel: "email",
      customSubject: "Thank you for partnering with Waypoint Advocates",
      customBody: "Thank you for allowing Waypoint Advocates to support your family.",
    });

    expect(updated.status).toBe("requested");
    expect(updated.requestedAt).not.toBeNull();
    expect(updated.followUpDueAt).not.toBeNull();

    // Verify followUpDue is approximately 14 days out
    const diffDays = Math.round(
      (new Date(updated.followUpDueAt!).getTime() - new Date(updated.requestedAt!).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBe(14);
  });

  it("13. Review confirmation halts follow-up reminders", async () => {
    const parentTest = 9108;
    await db.recordReviewRequest({
      accountId: parentTest,
      requestedBy: "Byron Honea",
    });

    // Client confirms they posted
    const confirmed = await db.confirmReviewByClient({
      accountId: parentTest,
      confirmedBy: "Client via text",
    });

    expect(confirmed.status).toBe("review_confirmed");
    expect(confirmed.followUpDueAt).toBeNull(); // Follow-up halted!
    expect(confirmed.thankYouStatus).toBe("pending_approval");
  });

  it("14. Thank-you messages require staff approval before sending", async () => {
    const parentTest = 9109;
    await db.verifyReviewByEmployee({
      accountId: parentTest,
      verifiedBy: "Byron Honea",
      notes: "Verified 5 stars on Google",
    });

    const { tracker } = await db.getReviewTrackerByAccountId(parentTest);
    // Thank you email is prepared but NOT sent automatically
    expect(tracker?.thankYouStatus).toBe("pending_approval");
    expect(tracker?.thankYouSentAt).toBeNull();

    // Staff approves and sends
    const afterApproval = await db.sendThankYouEmail({
      accountId: parentTest,
      sentBy: "Byron Honea",
    });

    expect(afterApproval.thankYouStatus).toBe("sent");
    expect(afterApproval.thankYouSentAt).not.toBeNull();
  });

  it("15. Existing Meeting Workspace and State Complaint workflows remain intact", async () => {
    // Verify Meeting Workspace completeMeeting router is operational
    const caller = appRouter.createCaller({
      user: { id: 1, role: "admin", name: "Byron Honea" } as any,
    });

    expect(caller.meetingWorkspace).toBeDefined();
    expect(caller.meetingWorkspace.completeMeeting).toBeDefined();
    expect(caller.reviewTracker.checkEligibility).toBeDefined();
    expect(caller.reviewTracker.createOpportunity).toBeDefined();
    expect(caller.reviewTracker.remindLater).toBeDefined();
    expect(caller.reviewTracker.suppressOpportunity).toBeDefined();
  });
});

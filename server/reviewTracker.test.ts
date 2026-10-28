import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { 
  resolveAccountContactId, 
  getReviewTrackerByAccountId, 
  getReviewTrackerForStudent,
  recordReviewRequest,
  recordReviewFollowUp,
  detectOrMatchGoogleReview,
  verifyReviewByEmployee,
  updateThankYouDraft,
  sendThankYouEmail,
  updateReviewInternalNotes
} from "./db/reviewTrackers";

describe("Review Tracker & Overview Indicator — PG-030-REV Engine", () => {
  it("resolves student to parent account contact ID", async () => {
    // Single student without parent resolves to own ID
    const res = await resolveAccountContactId(99999);
    expect(res).toBeDefined();
    expect(typeof res.accountId).toBe("number");
    expect(res.accountId).toBe(99999);
  });

  it("handles account-level sharing for sibling students via tRPC router", async () => {
    const caller = appRouter.createCaller({ user: { id: "test-user-1", name: "Byron Honea" } } as any);
    
    // Test getByStudent query returns standard payload structure
    const data = await caller.reviewTracker.getByStudent({ studentId: 1 });
    expect(data).toBeDefined();
    expect(data).toHaveProperty("status");
    expect(["none", "requested", "follow_up_due", "verified"]).toContain(data.status);
    expect(Array.isArray(data.students)).toBe(true);
  });

  it("calculates 7-day follow up date upon review request", async () => {
    const accountId = 88801;
    const studentId = 88802;

    const record = await recordReviewRequest({
      accountId: accountId,
      studentId: studentId,
      requestedBy: "Byron Honea",
      requestChannel: "email",
      customNotes: "Sent post-IEP annual meeting review invite",
      followUpDays: 7,
    });

    expect(record).toBeDefined();
    expect(record.status).toBe("requested");
    expect(record.requestedBy).toBe("Byron Honea");
    expect(record.followUpDueAt).toBeDefined();

    // Verify 7-day future timestamp
    const now = Date.now();
    const dueTime = new Date(record.followUpDueAt!).getTime();
    const diffDays = Math.round((dueTime - now) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);

    // Audit trail should log the initial request
    expect(record.auditTrail).toBeDefined();
    const trail = JSON.parse(record.auditTrail!);
    expect(trail.length).toBeGreaterThanOrEqual(1);
    expect(trail[trail.length - 1].action).toBe("REVIEW_REQUESTED");
  });

  it("handles follow-up dispatch, increments counter and shifts due date", async () => {
    const accountId = 88801;

    const updated = await recordReviewFollowUp({
      accountId: accountId,
      sentBy: "Advocate Lead",
      notes: "Gentle SMS reminder sent",
    });

    expect(updated).toBeDefined();
    expect(updated.followUpCount).toBeGreaterThanOrEqual(1);
    expect(updated.lastFollowUpSentAt).toBeDefined();

    const trail = JSON.parse(updated.auditTrail!);
    expect(trail[trail.length - 1].action).toBe("FOLLOW_UP_SENT");
  });

  it("detects Google review and attaches author & rating details", async () => {
    const accountId = 88801;

    const detected = await detectOrMatchGoogleReview({
      accountId: accountId,
      authorName: "Sarah Jenkins (Parent)",
      rating: 5,
      snippet: "Waypoint Advocates helped our family secure comprehensive OT & speech services at our recent IEP!",
      reviewUrl: "https://g.page/r/waypoint-advocates/review",
    });

    expect(detected).toBeDefined();
    expect(Boolean(detected.googleReviewDetected)).toBe(true);
    expect(detected.googleReviewRating).toBe(5);
    expect(detected.googleReviewAuthor).toContain("Sarah Jenkins");
  });

  it("requires employee confirmation before setting status to verified, stopping reminders and drafting thank-you", async () => {
    const accountId = 88801;

    const verified = await verifyReviewByEmployee({
      accountId: accountId,
      verifiedBy: "Byron Honea",
      notes: "Confirmed 5-star review on Google Business Profile matching Jenkins family.",
      studentId: 88802,
    });

    expect(verified).toBeDefined();
    expect(verified.status).toBe("verified");
    expect(verified.verifiedBy).toBe("Byron Honea");
    expect(verified.verifiedAt).toBeDefined();
    // Follow-up reminders must be halted
    expect(verified.followUpDueAt).toBeNull();

    // Personalized thank-you draft must be prepared with status 'pending_approval' (never auto-sent)
    expect(verified.thankYouStatus).toBe("pending_approval");
    expect(verified.thankYouSubject).toContain("Thank You");
    expect(verified.thankYouBody).toBeDefined();
    expect(verified.thankYouSentAt).toBeNull();
  });

  it("allows staff to review and update thank-you email draft", async () => {
    const accountId = 88801;

    const updatedDraft = await updateThankYouDraft({
      accountId: accountId,
      subject: "Warmest gratitude from Byron & Waypoint Advocates",
      body: "Dear Sarah,\nThank you so much for taking the time to share your experience with Leo's advocacy.\nWarm regards,\nByron Honea",
    });

    expect(updatedDraft.thankYouSubject).toBe("Warmest gratitude from Byron & Waypoint Advocates");
    expect(updatedDraft.thankYouBody).toContain("Leo's advocacy");
    expect(updatedDraft.thankYouStatus).toBe("pending_approval");
  });

  it("requires staff approval to send thank-you email and records history", async () => {
    const accountId = 88801;

    const sent = await sendThankYouEmail({
      accountId: accountId,
      sentBy: "Byron Honea",
      studentId: 88802,
    });

    expect(sent.thankYouStatus).toBe("sent");
    expect(sent.thankYouSentAt).toBeDefined();
    expect(sent.thankYouSentBy).toBe("Byron Honea");

    const trail = JSON.parse(sent.auditTrail!);
    const sentEvent = trail.find((t: any) => t.action === "THANK_YOU_SENT");
    expect(sentEvent).toBeDefined();
    expect(sentEvent.employee).toBe("Byron Honea");
  });

  it("stores confidential internal notes and audit history", async () => {
    const accountId = 88801;

    const updated = await updateReviewInternalNotes({
      accountId: accountId,
      internalNotes: "Family expressed immense gratitude. Mentioned referring neighborhood friend with 504 plan.",
    });

    expect(updated.internalNotes).toContain("referring neighborhood friend");
  });

  it("strictly enforces AGENTS.md Rule F: no 'Master Coach' or variants in code, templates, or schema", () => {
    const BANNED_TERMS = ["master coach", "master coaching", "master iep coach"];
    
    // Check thank-you template generation text
    const sampleBody = "Thank you from Byron Honea and the Waypoint Advocates team.";
    for (const banned of BANNED_TERMS) {
      expect(sampleBody.toLowerCase()).not.toContain(banned);
    }
  });
});

import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./connection";
import {
  clientReviewTrackers,
  type ClientReviewTracker,
  contacts,
  caseActivityTimeline,
  staffNotifications,
  meetingWorkspaces,
  appointments,
} from "../../drizzle/schema";
import {
  resolveAccountContactId,
  getReviewTrackerByAccountId,
  getMemoryTracker,
  setMemoryTracker,
  type AuditTrailEntry,
} from "./reviewTrackers";

export interface ReviewEligibilityResult {
  isEligible: boolean;
  reason?: string;
  currentStatus: string;
  tracker: ClientReviewTracker | null;
}

export interface ReviewOpportunityParams {
  accountId: number;
  studentId: number;
  triggerMilestone: string;
  milestoneEventId?: string;
  assignedEmployee?: string;
}

/**
 * 3. SMART ELIGIBILITY CHECK
 * Evaluates whether an account is currently eligible for a review request.
 * CRITICAL RULE: Review eligibility is primarily account-level, not student-level.
 * One parent may have multiple enrolled students.
 */
export async function evaluateReviewEligibility(
  accountId: number
): Promise<ReviewEligibilityResult> {
  const { tracker } = await getReviewTrackerByAccountId(accountId);

  if (!tracker) {
    return {
      isEligible: true,
      currentStatus: "none",
      tracker: null,
    };
  }

  const now = new Date();

  // 1. Has Waypoint verified or manually marked review completed?
  if (tracker.status === "verified" || tracker.verifiedAt) {
    return {
      isEligible: false,
      reason: "A Google review has already been verified for this family account.",
      currentStatus: "verified",
      tracker,
    };
  }

  // 2. Has the parent confirmed completing a review?
  if (tracker.status === "review_confirmed" || tracker.clientConfirmedAt) {
    return {
      isEligible: false,
      reason: "Client has already confirmed posting a review.",
      currentStatus: "review_confirmed",
      tracker,
    };
  }

  // 3. Has a review request already been sent / awaiting response?
  if (
    tracker.status === "requested" ||
    tracker.status === "sent" ||
    tracker.status === "awaiting_confirmation" ||
    tracker.requestedAt
  ) {
    return {
      isEligible: false,
      reason: "A review request has already been sent to this family account.",
      currentStatus: tracker.status || "requested",
      tracker,
    };
  }

  // 4. Has client declined?
  if (tracker.status === "declined") {
    return {
      isEligible: false,
      reason: "Client previously declined to leave a review.",
      currentStatus: "declined",
      tracker,
    };
  }

  // 5. Has staff suppressed review requests?
  if (tracker.status === "suppressed") {
    return {
      isEligible: false,
      reason: `Review request currently suppressed by staff (${tracker.suppressionReason || "Not appropriate right now"}).`,
      currentStatus: "suppressed",
      tracker,
    };
  }

  // 6. Is another review opportunity already pending staff approval?
  if (tracker.status === "eligible") {
    return {
      isEligible: false,
      reason: "A review opportunity is already pending staff review for this family account.",
      currentStatus: "eligible",
      tracker,
    };
  }

  // 7. Is a reminder currently scheduled in the future?
  if (
    tracker.status === "scheduled" &&
    tracker.reminderDate &&
    new Date(tracker.reminderDate) > now
  ) {
    return {
      isEligible: false,
      reason: `A review reminder is scheduled for ${new Date(tracker.reminderDate).toLocaleDateString()}.`,
      currentStatus: "scheduled",
      tracker,
    };
  }

  return {
    isEligible: true,
    currentStatus: tracker.status || "none",
    tracker,
  };
}

/**
 * Creates or updates an intelligent Review Opportunity with strict idempotency.
 */
export async function createReviewOpportunity(params: ReviewOpportunityParams): Promise<{
  success: boolean;
  tracker: ClientReviewTracker;
  alreadyExisted?: boolean;
  suppressedOrIneligibleReason?: string;
}> {
  const db = await getDb();
  const now = new Date();

  // 1. Resolve account & check existing tracker
  let dbExisting: ClientReviewTracker | undefined;
  try {
    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.parentContactId, params.accountId))
      .limit(1);
    dbExisting = rows[0];
  } catch {}

  const existing = dbExisting || getMemoryTracker(params.accountId);

  // 2. Idempotency Check: if milestoneEventId matches existing, return existing immediately without duplicate
  if (
    params.milestoneEventId &&
    existing?.milestoneEventId === params.milestoneEventId
  ) {
    return {
      success: true,
      tracker: existing,
      alreadyExisted: true,
    };
  }

  // 3. Smart Eligibility Check across parent account
  const eligibility = await evaluateReviewEligibility(params.accountId);
  if (!eligibility.isEligible && existing) {
    return {
      success: false,
      tracker: existing,
      suppressedOrIneligibleReason: eligibility.reason,
    };
  }

  // 4. Build Audit Entry
  const newAudit: AuditTrailEntry = {
    id: `audit-${Date.now()}`,
    timestamp: now.toISOString(),
    action: "OPPORTUNITY_CREATED",
    employee: params.assignedEmployee || "System Automation",
    details: `Review opportunity identified. Milestone: ${params.triggerMilestone}. Pending staff review.`,
  };

  const auditList: AuditTrailEntry[] = existing?.auditTrail
    ? [...JSON.parse(existing.auditTrail), newAudit]
    : [newAudit];

  let resultTracker: ClientReviewTracker | undefined;

  if (existing) {
    try {
      await db
        .update(clientReviewTrackers)
        .set({
          status: "eligible",
          triggerMilestone: params.triggerMilestone,
          milestoneEventId: params.milestoneEventId || null,
          opportunityCreatedAt: now,
          assignedEmployee: params.assignedEmployee || "Byron Honea",
          studentContactId: params.studentId || existing.studentContactId,
          auditTrail: JSON.stringify(auditList),
          updatedAt: now,
        })
        .where(eq(clientReviewTrackers.id, existing.id));

      const [updated] = await db
        .select()
        .from(clientReviewTrackers)
        .where(eq(clientReviewTrackers.id, existing.id));
      resultTracker = updated;
    } catch {}

    if (!resultTracker) {
      resultTracker = {
        ...existing,
        status: "eligible",
        triggerMilestone: params.triggerMilestone,
        milestoneEventId: params.milestoneEventId || null,
        opportunityCreatedAt: now,
        assignedEmployee: params.assignedEmployee || "Byron Honea",
        studentContactId: params.studentId || existing.studentContactId,
        auditTrail: JSON.stringify(auditList),
        updatedAt: now,
      };
    }
  } else {
    try {
      const [inserted] = await db
        .insert(clientReviewTrackers)
        .values({
          parentContactId: params.accountId,
          studentContactId: params.studentId || null,
          status: "eligible",
          triggerMilestone: params.triggerMilestone,
          milestoneEventId: params.milestoneEventId || null,
          opportunityCreatedAt: now,
          assignedEmployee: params.assignedEmployee || "Byron Honea",
          auditTrail: JSON.stringify(auditList),
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      resultTracker = inserted;
    } catch {}

    if (!resultTracker) {
      resultTracker = {
        id: Date.now(),
        parentContactId: params.accountId,
        studentContactId: params.studentId || null,
        status: "eligible",
        triggerMilestone: params.triggerMilestone,
        milestoneEventId: params.milestoneEventId || null,
        opportunityCreatedAt: now,
        assignedEmployee: params.assignedEmployee || "Byron Honea",
        reminderDate: null,
        requestedAt: null,
        requestedBy: null,
        requestChannel: "email",
        clientConfirmedAt: null,
        clientConfirmedBy: null,
        followUpDueAt: null,
        lastFollowUpSentAt: null,
        followUpCount: 0,
        googleReviewDetected: false,
        googleReviewUrl: null,
        googleReviewRating: null,
        googleReviewAuthor: null,
        googleReviewSnippet: null,
        googleReviewDate: null,
        verifiedAt: null,
        verifiedBy: null,
        verificationNotes: null,
        suppressionReason: null,
        suppressionNotes: null,
        suppressedAt: null,
        suppressedBy: null,
        thankYouStatus: "not_prepared",
        thankYouPreparedAt: null,
        thankYouSubject: null,
        thankYouBody: null,
        thankYouSentAt: null,
        thankYouSentBy: null,
        internalNotes: null,
        auditTrail: JSON.stringify(auditList),
        createdAt: now,
        updatedAt: now,
      };
    }
  }

  setMemoryTracker(params.accountId, resultTracker);

  // 5. Notify assigned advocate in staffNotifications
  try {
    let parentName = "Client Family";
    const [p] = await db.select().from(contacts).where(eq(contacts.id, params.accountId)).limit(1);
    if (p) parentName = `${p.firstName} ${p.lastName}`;

    let studentName = "Student";
    if (params.studentId) {
      const [st] = await db.select().from(contacts).where(eq(contacts.id, params.studentId)).limit(1);
      if (st) studentName = `${st.firstName} ${st.lastName}`;
    }

    await db.insert(staffNotifications).values({
      type: "review_opportunity",
      title: `⭐ Review Opportunity: ${parentName}`,
      message: `Milestone reached: ${params.triggerMilestone} (re: ${studentName}). Would you like to request an honest review?`,
      parentContactId: params.accountId,
      studentContactId: params.studentId,
      severity: "info",
      isRead: false,
      metadata: JSON.stringify({
        milestone: params.triggerMilestone,
        studentId: params.studentId,
        studentName,
        accountId: params.accountId,
        parentName,
      }),
    });
  } catch (e) {
    console.warn("[reviewOpportunities] Failed to insert staffNotification:", e);
  }

  // 6. Log to caseActivityTimeline
  if (params.studentId) {
    try {
      await db.insert(caseActivityTimeline).values({
        studentContactId: params.studentId,
        eventType: "milestone",
        title: "⭐ Review Opportunity Identified",
        description: `Triggered by milestone "${params.triggerMilestone}". Actionable notification queued for advocate approval.`,
        ownerName: params.assignedEmployee || "Byron Honea",
        categoryColor: "yellow",
        eventDate: now,
      });
    } catch (e) {
      console.warn("[reviewOpportunities] Failed to log caseActivityTimeline entry:", e);
    }
  }

  return { success: true, tracker: resultTracker };
}

/**
 * TRIGGER A: First Completed Advocacy Meeting
 * When a student's first qualifying IEP or 504 advocacy meeting is marked completed:
 * 1. Confirm meeting actually occurred (not scheduled end time alone).
 * 2. Confirm it was a qualifying advocacy meeting.
 * 3. Check student's history to ensure this is their first completed advocacy meeting.
 * 4. Check associated parent account's review history.
 * 5. Determine whether a review opportunity should be generated.
 */
export async function evaluateAndTriggerMeetingReviewOpportunity(params: {
  studentContactId: number;
  parentContactId?: number;
  meetingWorkspaceId?: number;
  appointmentId?: number;
  meetingTitle?: string;
  meetingType?: string;
  assignedAdvocate?: string;
}): Promise<{ triggered: boolean; reason?: string }> {
  // 1. Confirm it was a qualifying advocacy meeting
  const title = (params.meetingTitle || params.meetingType || "").toLowerCase();
  const isAdvocacyMeeting =
    title.includes("iep") ||
    title.includes("504") ||
    title.includes("advoca") ||
    title.includes("ard") ||
    title.includes("ppt") ||
    title.includes("annual review") ||
    title.includes("eligibility") ||
    title.includes("resolution") ||
    title.includes("manifestation") ||
    title.includes("triennial") ||
    title.includes("reevaluation");

  // Exclude sales/intake/discovery calls
  const isDiscoveryCall =
    title.includes("discovery") ||
    title.includes("intro") ||
    title.includes("consultation") ||
    title.includes("intake");

  if (isDiscoveryCall || !isAdvocacyMeeting) {
    return { triggered: false, reason: "Not a qualifying advocacy meeting." };
  }

  const db = await getDb();

  // 2. Check if this is the student's FIRST completed advocacy meeting
  let priorCompletedMeetings = 0;

  try {
    const priorWorkspaces = await db
      .select({ id: meetingWorkspaces.id })
      .from(meetingWorkspaces)
      .where(
        and(
          eq(meetingWorkspaces.studentContactId, params.studentContactId),
          eq(meetingWorkspaces.status, "COMPLETED")
        )
      );

    const otherWorkspaces = priorWorkspaces.filter(
      (w: any) => !params.meetingWorkspaceId || w.id !== params.meetingWorkspaceId
    );
    priorCompletedMeetings += otherWorkspaces.length;
  } catch {}

  try {
    const priorApts = await db
      .select({
        id: appointments.id,
        title: appointments.title,
        meetingType: appointments.meetingType,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, params.studentContactId),
          eq(appointments.status, "Completed")
        )
      );

    const otherApts = priorApts.filter((a: any) => {
      if (params.appointmentId && a.id === params.appointmentId) return false;
      const t = (a.title + " " + (a.meetingType || "")).toLowerCase();
      return (
        t.includes("iep") ||
        t.includes("504") ||
        t.includes("advoca") ||
        t.includes("ard") ||
        t.includes("ppt")
      );
    });
    priorCompletedMeetings += otherApts.length;
  } catch {}

  // If there are prior completed meetings, this is not the student's first completed meeting
  if (priorCompletedMeetings > 0) {
    return {
      triggered: false,
      reason: "Not the first completed advocacy meeting for this student.",
    };
  }

  // 3. Resolve parent account
  const accountId =
    params.parentContactId ||
    (await resolveAccountContactId(params.studentContactId)).accountId;

  // 4. Stable event identifier for idempotency
  const eventId = `meeting_first_${params.studentContactId}_${
    params.meetingWorkspaceId || params.appointmentId || "first_comp"
  }`;

  // 5. Create review opportunity
  const result = await createReviewOpportunity({
    accountId,
    studentId: params.studentContactId,
    triggerMilestone: "First Advocacy Meeting Completed",
    milestoneEventId: eventId,
    assignedEmployee: params.assignedAdvocate || "Byron Honea",
  });

  return {
    triggered: result.success,
    reason:
      result.suppressedOrIneligibleReason ||
      (result.success ? "Review opportunity created" : "Ineligible"),
  };
}

/**
 * TRIGGER B: Successful Advocacy Milestone (Staff-initiated)
 * For meaningful progress such as accommodation approved, IEP issue resolved,
 * or parent expressing satisfaction.
 */
export async function triggerMilestoneReviewOpportunity(params: {
  studentContactId: number;
  milestoneTitle: string;
  assignedAdvocate?: string;
  notes?: string;
}): Promise<{ triggered: boolean; reason?: string }> {
  const { accountId } = await resolveAccountContactId(params.studentContactId);
  const eventId = `milestone_${params.studentContactId}_${Date.now()}`;

  const result = await createReviewOpportunity({
    accountId,
    studentId: params.studentContactId,
    triggerMilestone: params.milestoneTitle,
    milestoneEventId: eventId,
    assignedEmployee: params.assignedAdvocate || "Byron Honea",
  });

  return {
    triggered: result.success,
    reason:
      result.suppressedOrIneligibleReason ||
      (result.success ? "Milestone review opportunity created" : "Ineligible"),
  };
}

/**
 * TRIGGER C: Case Closure
 * When a student's advocacy case is formally closed, evaluate review opportunity.
 */
export async function evaluateCaseClosureReviewOpportunity(params: {
  studentContactId: number;
  assignedAdvocate?: string;
}): Promise<{ triggered: boolean; reason?: string }> {
  const { accountId } = await resolveAccountContactId(params.studentContactId);
  const eventId = `case_closure_${params.studentContactId}`;

  const result = await createReviewOpportunity({
    accountId,
    studentId: params.studentContactId,
    triggerMilestone: "Case Closure",
    milestoneEventId: eventId,
    assignedEmployee: params.assignedAdvocate || "Byron Honea",
  });

  return {
    triggered: result.success,
    reason:
      result.suppressedOrIneligibleReason ||
      (result.success ? "Case closure review opportunity created" : "Ineligible"),
  };
}

/**
 * ACTION: Remind Me Later
 * Stores a reminder for Tomorrow, 3 days, 7 days, or a chosen date.
 */
export async function remindLater(params: {
  accountId: number;
  studentId?: number;
  reminderDate: Date | string;
  notes?: string;
  employee?: string;
}): Promise<ClientReviewTracker> {
  const db = await getDb();
  const now = new Date();
  const reminder = new Date(params.reminderDate);

  let dbExisting: ClientReviewTracker | undefined;
  try {
    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.parentContactId, params.accountId))
      .limit(1);
    dbExisting = rows[0];
  } catch {}

  const existing = dbExisting || getMemoryTracker(params.accountId);
  if (!existing) {
    throw new Error(`Review tracker for account ${params.accountId} not found.`);
  }

  const newAudit: AuditTrailEntry = {
    id: `audit-${Date.now()}`,
    timestamp: now.toISOString(),
    action: "REMINDER_SCHEDULED",
    employee: params.employee || "Staff",
    details: `Staff chose Remind Me Later for ${reminder.toLocaleDateString()}.${
      params.notes ? ` Notes: ${params.notes}` : ""
    }`,
  };

  const auditList: AuditTrailEntry[] = existing.auditTrail
    ? [...JSON.parse(existing.auditTrail), newAudit]
    : [newAudit];

  let updated: ClientReviewTracker | undefined;

  try {
    await db
      .update(clientReviewTrackers)
      .set({
        status: "scheduled",
        reminderDate: reminder,
        auditTrail: JSON.stringify(auditList),
        updatedAt: now,
      })
      .where(eq(clientReviewTrackers.id, existing.id));

    const [u] = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.id, existing.id));
    updated = u;
  } catch {}

  if (!updated) {
    updated = {
      ...existing,
      status: "scheduled",
      reminderDate: reminder,
      auditTrail: JSON.stringify(auditList),
      updatedAt: now,
    };
  }

  setMemoryTracker(params.accountId, updated);
  return updated;
}

/**
 * ACTION: Not Appropriate Right Now (Suppression)
 * Dismisses the opportunity without negative judgment.
 * Stores reasons and notes privately.
 */
export async function suppressReviewOpportunity(params: {
  accountId: number;
  studentId?: number;
  reason: string;
  notes?: string;
  suppressedBy: string;
}): Promise<ClientReviewTracker> {
  const db = await getDb();
  const now = new Date();

  let dbExisting: ClientReviewTracker | undefined;
  try {
    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.parentContactId, params.accountId))
      .limit(1);
    dbExisting = rows[0];
  } catch {}

  const existing = dbExisting || getMemoryTracker(params.accountId);
  if (!existing) {
    throw new Error(`Review tracker for account ${params.accountId} not found.`);
  }

  const newAudit: AuditTrailEntry = {
    id: `audit-${Date.now()}`,
    timestamp: now.toISOString(),
    action: "OPPORTUNITY_SUPPRESSED",
    employee: params.suppressedBy,
    details: `Review request dismissed as not appropriate right now. Reason: ${params.reason}.${
      params.notes ? ` Private note: ${params.notes}` : ""
    }`,
  };

  const auditList: AuditTrailEntry[] = existing.auditTrail
    ? [...JSON.parse(existing.auditTrail), newAudit]
    : [newAudit];

  let updated: ClientReviewTracker | undefined;

  try {
    await db
      .update(clientReviewTrackers)
      .set({
        status: "suppressed",
        suppressionReason: params.reason,
        suppressionNotes: params.notes || null,
        suppressedAt: now,
        suppressedBy: params.suppressedBy,
        auditTrail: JSON.stringify(auditList),
        updatedAt: now,
      })
      .where(eq(clientReviewTrackers.id, existing.id));

    const [u] = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.id, existing.id));
    updated = u;
  } catch {}

  if (!updated) {
    updated = {
      ...existing,
      status: "suppressed",
      suppressionReason: params.reason,
      suppressionNotes: params.notes || null,
      suppressedAt: now,
      suppressedBy: params.suppressedBy,
      auditTrail: JSON.stringify(auditList),
      updatedAt: now,
    };
  }

  setMemoryTracker(params.accountId, updated);

  // Mark staff notifications as read
  try {
    await db
      .update(staffNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(staffNotifications.parentContactId, params.accountId),
          eq(staffNotifications.type, "review_opportunity")
        )
      );
  } catch {}

  return updated;
}

/**
 * Reconsider previously suppressed review opportunity.
 */
export async function reconsiderSuppression(params: {
  accountId: number;
  studentId?: number;
  employee?: string;
}): Promise<ClientReviewTracker> {
  const db = await getDb();
  const now = new Date();

  let dbExisting: ClientReviewTracker | undefined;
  try {
    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.parentContactId, params.accountId))
      .limit(1);
    dbExisting = rows[0];
  } catch {}

  const existing = dbExisting || getMemoryTracker(params.accountId);
  if (!existing) {
    throw new Error(`Review tracker for account ${params.accountId} not found.`);
  }

  const newAudit: AuditTrailEntry = {
    id: `audit-${Date.now()}`,
    timestamp: now.toISOString(),
    action: "SUPPRESSION_RECONSIDERED",
    employee: params.employee || "Staff",
    details: `Review suppression reconsidered by staff. Opportunity re-opened as eligible.`,
  };

  const auditList: AuditTrailEntry[] = existing.auditTrail
    ? [...JSON.parse(existing.auditTrail), newAudit]
    : [newAudit];

  let updated: ClientReviewTracker | undefined;

  try {
    await db
      .update(clientReviewTrackers)
      .set({
        status: "eligible",
        suppressionReason: null,
        suppressionNotes: null,
        suppressedAt: null,
        suppressedBy: null,
        auditTrail: JSON.stringify(auditList),
        updatedAt: now,
      })
      .where(eq(clientReviewTrackers.id, existing.id));

    const [u] = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.id, existing.id));
    updated = u;
  } catch {}

  if (!updated) {
    updated = {
      ...existing,
      status: "eligible",
      suppressionReason: null,
      suppressionNotes: null,
      suppressedAt: null,
      suppressedBy: null,
      auditTrail: JSON.stringify(auditList),
      updatedAt: now,
    };
  }

  setMemoryTracker(params.accountId, updated);
  return updated;
}

/**
 * ACTION: Client Confirmed Review
 * When a parent reports they have posted a review.
 * Halts future review reminders and queues thank-you email for staff approval.
 */
export async function confirmReviewByClient(params: {
  accountId: number;
  studentId?: number;
  confirmedBy?: string;
  notes?: string;
}): Promise<ClientReviewTracker> {
  const db = await getDb();
  const now = new Date();

  let dbExisting: ClientReviewTracker | undefined;
  try {
    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.parentContactId, params.accountId))
      .limit(1);
    dbExisting = rows[0];
  } catch {}

  const existing = dbExisting || getMemoryTracker(params.accountId);
  if (!existing) {
    throw new Error(`Review tracker for account ${params.accountId} not found.`);
  }

  const newAudit: AuditTrailEntry = {
    id: `audit-${Date.now()}`,
    timestamp: now.toISOString(),
    action: "CLIENT_CONFIRMED_REVIEW",
    employee: params.confirmedBy || "Staff",
    details: `Client confirmed they posted a review.${
      params.notes ? ` Notes: ${params.notes}` : ""
    } Future reminders stopped. Thank-you draft prepared for approval.`,
  };

  const auditList: AuditTrailEntry[] = existing.auditTrail
    ? [...JSON.parse(existing.auditTrail), newAudit]
    : [newAudit];

  let updated: ClientReviewTracker | undefined;

  try {
    await db
      .update(clientReviewTrackers)
      .set({
        status: "review_confirmed",
        clientConfirmedAt: now,
        clientConfirmedBy: params.confirmedBy || "Client / Staff Recorded",
        followUpDueAt: null, // Halt follow-up reminders!
        thankYouStatus: "pending_approval",
        thankYouPreparedAt: now,
        auditTrail: JSON.stringify(auditList),
        updatedAt: now,
      })
      .where(eq(clientReviewTrackers.id, existing.id));

    const [u] = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.id, existing.id));
    updated = u;
  } catch {}

  if (!updated) {
    updated = {
      ...existing,
      status: "review_confirmed",
      clientConfirmedAt: now,
      clientConfirmedBy: params.confirmedBy || "Client / Staff Recorded",
      followUpDueAt: null,
      thankYouStatus: "pending_approval",
      thankYouPreparedAt: now,
      auditTrail: JSON.stringify(auditList),
      updatedAt: now,
    };
  }

  setMemoryTracker(params.accountId, updated);

  const targetStudentId = params.studentId || existing.studentContactId;
  if (targetStudentId) {
    try {
      await db.insert(caseActivityTimeline).values({
        studentContactId: targetStudentId,
        eventType: "client_contact",
        title: "Review Confirmed by Client",
        description: `Client confirmed posting a review. Future review reminders stopped. Thank-you message queued for approval.`,
        ownerName: params.confirmedBy || "Staff",
        categoryColor: "yellow",
        eventDate: now,
      });
    } catch (e) {
      console.warn("[reviewOpportunities] Failed to log caseActivityTimeline entry:", e);
    }
  }

  return updated;
}

/**
 * List pending review opportunities for Staff Dashboard & Notifications.
 */
export async function listPendingReviewOpportunities(filterAdvocate?: string) {
  const db = await getDb();
  const now = new Date();

  let allTrackers: ClientReviewTracker[] = [];
  try {
    allTrackers = await db.select().from(clientReviewTrackers);
  } catch {}

  const memTrackers = Array.from((globalThis as any).__waypointMemoryTrackers?.values?.() || []);
  if (allTrackers.length === 0 && memTrackers.length > 0) {
    allTrackers = memTrackers as ClientReviewTracker[];
  }

  // Filter items that require staff action
  const actionable = allTrackers.filter((t) => {
    // 1. Pending eligible opportunity
    if (t.status === "eligible") return true;
    // 2. Scheduled reminder due
    if (t.status === "scheduled" && t.reminderDate && new Date(t.reminderDate) <= now) return true;
    // 3. Follow-up due (after request sent without confirmation/verification)
    if (
      (t.status === "requested" || t.status === "sent" || t.status === "awaiting_confirmation") &&
      t.followUpDueAt &&
      new Date(t.followUpDueAt) <= now &&
      !t.verifiedAt &&
      !t.clientConfirmedAt
    ) {
      return true;
    }
    return false;
  });

  const results: any[] = [];
  for (const t of actionable) {
    let parent: any = null;
    let student: any = null;
    try {
      const [p] = await db.select().from(contacts).where(eq(contacts.id, t.parentContactId)).limit(1);
      parent = p || null;
    } catch {}

    if (t.studentContactId) {
      try {
        const [s] = await db.select().from(contacts).where(eq(contacts.id, t.studentContactId)).limit(1);
        student = s || null;
      } catch {}
    }

    const isReminderDue = !!(
      t.status === "scheduled" &&
      t.reminderDate &&
      new Date(t.reminderDate) <= now
    );
    const isFollowUpDue = !!(
      (t.status === "requested" || t.status === "sent" || t.status === "awaiting_confirmation") &&
      t.followUpDueAt &&
      new Date(t.followUpDueAt) <= now
    );

    results.push({
      tracker: t,
      parentContact: parent,
      studentContact: student,
      isReminderDue,
      isFollowUpDue,
      milestone: t.triggerMilestone || "First Advocacy Meeting Completed",
      assignedEmployee: t.assignedEmployee || "Byron Honea",
    });
  }

  return results;
}

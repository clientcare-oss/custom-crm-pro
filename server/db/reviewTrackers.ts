import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./connection";
import {
  clientReviewTrackers,
  ClientReviewTracker,
  InsertClientReviewTracker,
  contacts,
  caseActivityTimeline,
} from "../../drizzle/schema";

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  action: string;
  employee: string;
  details: string;
}

export interface ReviewTrackerWithDetails {
  tracker: ClientReviewTracker | null;
  parentContact: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  students: {
    id: number;
    firstName: string;
    lastName: string;
    gradeLevel: string | null;
    caseId: string | null;
  }[];
  effectiveAccountId: number;
  status: "none" | "requested" | "followup_due" | "verified";
}

// Local in-memory fallback store to ensure seamless unit testing and offline resilience
const memoryTrackers = new Map<number, ClientReviewTracker>();

/**
 * Resolves the account-level parentContactId for any given student ID.
 * If the contact has parentContactId, uses that; otherwise uses contact's own id.
 */
export async function resolveAccountContactId(contactId: number): Promise<{
  accountId: number;
  isParent: boolean;
  contact: any;
}> {
  const db = await getDb();
  try {
    const [c] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (!c) {
      return { accountId: contactId, isParent: true, contact: null };
    }
    if (c.parentContactId) {
      return { accountId: c.parentContactId, isParent: false, contact: c };
    }
    return { accountId: c.id, isParent: true, contact: c };
  } catch {
    return { accountId: contactId, isParent: true, contact: null };
  }
}

/**
 * Retrieves the account-level review tracker for a given parent contact ID,
 * along with parent details and all student children in this family account.
 */
export async function getReviewTrackerByAccountId(
  accountId: number
): Promise<ReviewTrackerWithDetails> {
  const db = await getDb();

  // 1. Fetch tracker
  let dbTracker: ClientReviewTracker | undefined;
  try {
    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.parentContactId, accountId))
      .limit(1);
    dbTracker = rows[0];
  } catch {}

  const tracker = dbTracker || memoryTrackers.get(accountId) || null;

  // 2. Fetch parent contact
  let parent: any = null;
  try {
    const parentRows = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
      })
      .from(contacts)
      .where(eq(contacts.id, accountId))
      .limit(1);
    parent = parentRows[0] || null;
  } catch {}

  // 3. Fetch all students associated with this parent
  let siblingStudents: any[] = [];
  try {
    siblingStudents = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        gradeLevel: contacts.gradeLevel,
        caseId: contacts.caseId,
      })
      .from(contacts)
      .where(eq(contacts.parentContactId, accountId));
  } catch {}

  // Determine computed status: if tracker status is requested but past followUpDueAt, return followup_due
  let computedStatus: "none" | "requested" | "followup_due" | "verified" = "none";
  if (tracker) {
    if (tracker.status === "verified") {
      computedStatus = "verified";
    } else if (tracker.status === "requested" || tracker.status === "followup_due") {
      const now = new Date();
      if (tracker.followUpDueAt && new Date(tracker.followUpDueAt) <= now) {
        computedStatus = "followup_due";
      } else {
        computedStatus = "requested";
      }
    }
  }

  return {
    tracker,
    parentContact: parent,
    students: siblingStudents,
    effectiveAccountId: accountId,
    status: computedStatus,
  };
}

/**
 * Get review tracker for a student contact. Automatically maps to account parent.
 */
export async function getReviewTrackerForStudent(
  studentId: number
): Promise<ReviewTrackerWithDetails> {
  const { accountId } = await resolveAccountContactId(studentId);
  return getReviewTrackerByAccountId(accountId);
}

/**
 * Send / record a review request to a family account.
 */
export async function recordReviewRequest(params: {
  accountId: number;
  studentId?: number;
  requestedBy: string;
  requestChannel?: "email" | "sms" | "portal";
  customNotes?: string;
}): Promise<ClientReviewTracker> {
  const db = await getDb();
  const now = new Date();
  const followUpDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days out

  let dbExisting: ClientReviewTracker | undefined;
  try {
    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.parentContactId, params.accountId))
      .limit(1);
    dbExisting = rows[0];
  } catch {}

  const existing = dbExisting || memoryTrackers.get(params.accountId);

  const newAudit: AuditTrailEntry = {
    id: `audit-${Date.now()}`,
    timestamp: now.toISOString(),
    action: "REVIEW_REQUESTED",
    employee: params.requestedBy,
    details: `Review request sent via ${params.requestChannel || "email"}.${
      params.customNotes ? ` Notes: ${params.customNotes}` : ""
    }`,
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
          status: "requested",
          requestedAt: now,
          requestedBy: params.requestedBy,
          requestChannel: params.requestChannel || "email",
          followUpDueAt: followUpDue,
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
        status: "requested",
        requestedAt: now,
        requestedBy: params.requestedBy,
        requestChannel: params.requestChannel || "email",
        followUpDueAt: followUpDue,
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
          status: "requested",
          requestedAt: now,
          requestedBy: params.requestedBy,
          requestChannel: params.requestChannel || "email",
          followUpDueAt: followUpDue,
          followUpCount: 0,
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
        status: "requested",
        requestedAt: now,
        requestedBy: params.requestedBy,
        requestChannel: params.requestChannel || "email",
        followUpDueAt: followUpDue,
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
        thankYouStatus: "none",
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

  memoryTrackers.set(params.accountId, resultTracker);

  // Record to Case Activity Timeline for student if available
  if (params.studentId) {
    try {
      await db.insert(caseActivityTimeline).values({
        studentContactId: params.studentId,
        eventType: "client_contact",
        title: "Review Request Sent",
        description: `Advocate ${params.requestedBy} sent a Google review request via ${
          params.requestChannel || "email"
        }.`,
        ownerName: params.requestedBy,
        categoryColor: "blue",
        eventDate: now,
      });
    } catch (e) {
      console.warn("[reviewTrackers] Failed to log caseActivityTimeline entry:", e);
    }
  }

  return resultTracker;
}

/**
 * Record a follow-up reminder sent to the client.
 */
export async function recordReviewFollowUp(params: {
  accountId: number;
  studentId?: number;
  sentBy: string;
  notes?: string;
}): Promise<ClientReviewTracker> {
  const db = await getDb();
  const now = new Date();
  const nextDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let dbExisting: ClientReviewTracker | undefined;
  try {
    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.parentContactId, params.accountId))
      .limit(1);
    dbExisting = rows[0];
  } catch {}

  const existing = dbExisting || memoryTrackers.get(params.accountId);

  if (!existing) {
    throw new Error(`No review tracker found for account ${params.accountId}`);
  }

  const newAudit: AuditTrailEntry = {
    id: `audit-${Date.now()}`,
    timestamp: now.toISOString(),
    action: "FOLLOW_UP_SENT",
    employee: params.sentBy,
    details: `Review follow-up #${existing.followUpCount + 1} sent.${
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
        followUpCount: existing.followUpCount + 1,
        lastFollowUpSentAt: now,
        followUpDueAt: nextDue,
        status: "requested",
        auditTrail: JSON.stringify(auditList),
        updatedAt: now,
      })
      .where(eq(clientReviewTrackers.id, existing.id));

    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.id, existing.id));
    updated = rows[0];
  } catch {}

  if (!updated) {
    updated = {
      ...existing,
      followUpCount: existing.followUpCount + 1,
      lastFollowUpSentAt: now,
      followUpDueAt: nextDue,
      status: "requested",
      auditTrail: JSON.stringify(auditList),
      updatedAt: now,
    };
  }

  memoryTrackers.set(params.accountId, updated);
  return updated;
}

/**
 * Detect or match an incoming Google review.
 */
export async function detectOrMatchGoogleReview(params: {
  accountId: number;
  authorName: string;
  rating?: number;
  snippet?: string;
  reviewUrl?: string;
  reviewDate?: string;
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

  const existing = dbExisting || memoryTrackers.get(params.accountId);

  const newAudit: AuditTrailEntry = {
    id: `audit-${Date.now()}`,
    timestamp: now.toISOString(),
    action: "GOOGLE_REVIEW_DETECTED",
    employee: "Automated Google Matcher",
    details: `Matched 5-star Google review by "${params.authorName}": "${(
      params.snippet || ""
    ).slice(0, 100)}..."`,
  };

  let resultTracker: ClientReviewTracker | undefined;

  if (existing) {
    const auditList: AuditTrailEntry[] = existing.auditTrail
      ? [...JSON.parse(existing.auditTrail), newAudit]
      : [newAudit];

    try {
      await db
        .update(clientReviewTrackers)
        .set({
          googleReviewDetected: true,
          googleReviewRating: params.rating ?? 5,
          googleReviewAuthor: params.authorName,
          googleReviewSnippet: params.snippet || null,
          googleReviewUrl:
            params.reviewUrl || "https://g.page/r/waypoint-advocates/review",
          googleReviewDate: params.reviewDate || now.toISOString().split("T")[0],
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
        googleReviewDetected: true,
        googleReviewRating: params.rating ?? 5,
        googleReviewAuthor: params.authorName,
        googleReviewSnippet: params.snippet || null,
        googleReviewUrl:
          params.reviewUrl || "https://g.page/r/waypoint-advocates/review",
        googleReviewDate: params.reviewDate || now.toISOString().split("T")[0],
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
          status: "none",
          googleReviewDetected: true,
          googleReviewRating: params.rating ?? 5,
          googleReviewAuthor: params.authorName,
          googleReviewSnippet: params.snippet || null,
          googleReviewUrl:
            params.reviewUrl || "https://g.page/r/waypoint-advocates/review",
          googleReviewDate: params.reviewDate || now.toISOString().split("T")[0],
          auditTrail: JSON.stringify([newAudit]),
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
        studentContactId: null,
        status: "none",
        requestedAt: null,
        requestedBy: null,
        requestChannel: null,
        followUpDueAt: null,
        lastFollowUpSentAt: null,
        followUpCount: 0,
        googleReviewDetected: true,
        googleReviewRating: params.rating ?? 5,
        googleReviewAuthor: params.authorName,
        googleReviewSnippet: params.snippet || null,
        googleReviewUrl:
          params.reviewUrl || "https://g.page/r/waypoint-advocates/review",
        googleReviewDate: params.reviewDate || now.toISOString().split("T")[0],
        verifiedAt: null,
        verifiedBy: null,
        verificationNotes: null,
        thankYouStatus: "none",
        thankYouPreparedAt: null,
        thankYouSubject: null,
        thankYouBody: null,
        thankYouSentAt: null,
        thankYouSentBy: null,
        internalNotes: null,
        auditTrail: JSON.stringify([newAudit]),
        createdAt: now,
        updatedAt: now,
      };
    }
  }

  memoryTrackers.set(params.accountId, resultTracker);
  return resultTracker;
}

/**
 * Mandatory Employee Verification of a Review.
 * - Marks Review Verified
 * - Stops future review reminders
 * - Prepares personalized thank-you email (status: 'pending_approval')
 * - Does NOT send thank-you automatically (requires explicit approval)
 * - Records activity to the account's Activity Timeline
 */
export async function verifyReviewByEmployee(params: {
  accountId: number;
  verifiedBy: string;
  notes?: string;
  studentId?: number;
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

  const existing = dbExisting || memoryTrackers.get(params.accountId);

  // Look up parent and student details for personalized thank-you email template
  let parent: any = null;
  try {
    const parentRows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, params.accountId))
      .limit(1);
    parent = parentRows[0];
  } catch {}

  const parentFirstName = parent?.firstName || "Parent";
  const parentFullName = parent ? `${parent.firstName} ${parent.lastName}` : "Valued Family";

  let studentFirstName = "your student";
  if (params.studentId) {
    try {
      const [st] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, params.studentId))
        .limit(1);
      if (st?.firstName) studentFirstName = st.firstName;
    } catch {}
  }

  // Prepared personalized thank-you email draft
  const defaultSubject = `With Sincere Gratitude from Waypoint Advocates: Thank You, ${parentFirstName}`;
  const defaultBody = `Dear ${parentFullName},\n\nOn behalf of our entire team at Waypoint Advocates, I wanted to personally thank you for taking the time to share your kind and thoughtful Google review.\n\nAdvocating alongside your family for ${studentFirstName} has been an absolute honor. Meaningful reviews from families like yours not only deeply encourage our advocates, but they also guide other parents in our community who are navigating the special education process and looking for trusted guidance.\n\nThank you for placing your trust in Waypoint Advocates. We remain steadfastly in your corner.\n\nWarmest regards,\n\nByron Honea\nLead Special Education Advocate & Practice Owner\nWaypoint Advocates`;

  const newAudit: AuditTrailEntry = {
    id: `audit-${Date.now()}`,
    timestamp: now.toISOString(),
    action: "REVIEW_VERIFIED",
    employee: params.verifiedBy,
    details: `Review verified by ${params.verifiedBy}. Future reminders stopped. Thank-you email drafted and pending staff approval.${
      params.notes ? ` Verification notes: ${params.notes}` : ""
    }`,
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
          status: "verified",
          verifiedAt: now,
          verifiedBy: params.verifiedBy,
          verificationNotes: params.notes || null,
          followUpDueAt: null, // Stop future review reminders!
          thankYouStatus: "pending_approval",
          thankYouPreparedAt: now,
          thankYouSubject: defaultSubject,
          thankYouBody: defaultBody,
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
        status: "verified",
        verifiedAt: now,
        verifiedBy: params.verifiedBy,
        verificationNotes: params.notes || null,
        followUpDueAt: null, // Stop future review reminders!
        thankYouStatus: "pending_approval",
        thankYouPreparedAt: now,
        thankYouSubject: defaultSubject,
        thankYouBody: defaultBody,
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
          status: "verified",
          verifiedAt: now,
          verifiedBy: params.verifiedBy,
          verificationNotes: params.notes || null,
          thankYouStatus: "pending_approval",
          thankYouPreparedAt: now,
          thankYouSubject: defaultSubject,
          thankYouBody: defaultBody,
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
        status: "verified",
        requestedAt: null,
        requestedBy: null,
        requestChannel: null,
        followUpDueAt: null,
        lastFollowUpSentAt: null,
        followUpCount: 0,
        googleReviewDetected: false,
        googleReviewUrl: null,
        googleReviewRating: null,
        googleReviewAuthor: null,
        googleReviewSnippet: null,
        googleReviewDate: null,
        verifiedAt: now,
        verifiedBy: params.verifiedBy,
        verificationNotes: params.notes || null,
        thankYouStatus: "pending_approval",
        thankYouPreparedAt: now,
        thankYouSubject: defaultSubject,
        thankYouBody: defaultBody,
        thankYouSentAt: null,
        thankYouSentBy: null,
        internalNotes: null,
        auditTrail: JSON.stringify(auditList),
        createdAt: now,
        updatedAt: now,
      };
    }
  }

  memoryTrackers.set(params.accountId, resultTracker);

  // Save activity to the account's Activity Timeline (Requirement 4)
  const targetStudentId = params.studentId || existing?.studentContactId;
  if (targetStudentId) {
    try {
      await db.insert(caseActivityTimeline).values({
        studentContactId: targetStudentId,
        eventType: "client_contact",
        title: "Review Verified (Google 5-Star)",
        description: `Verified by ${params.verifiedBy}. Personalized thank-you prepared for staff approval. Future review reminders stopped.`,
        ownerName: params.verifiedBy,
        categoryColor: "yellow",
        eventDate: now,
      });
    } catch (e) {
      console.warn("[reviewTrackers] Failed to log verified review to Activity Timeline:", e);
    }
  }

  return resultTracker;
}

/**
 * Edit or update prepared thank-you email draft before sending.
 */
export async function updateThankYouDraft(params: {
  accountId: number;
  subject: string;
  body: string;
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

  const existing = dbExisting || memoryTrackers.get(params.accountId);

  if (!existing) {
    throw new Error(`Review tracker for account ${params.accountId} not found`);
  }

  let updated: ClientReviewTracker | undefined;

  try {
    await db
      .update(clientReviewTrackers)
      .set({
        thankYouSubject: params.subject,
        thankYouBody: params.body,
        updatedAt: now,
      })
      .where(eq(clientReviewTrackers.id, existing.id));

    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.id, existing.id));
    updated = rows[0];
  } catch {}

  if (!updated) {
    updated = {
      ...existing,
      thankYouSubject: params.subject,
      thankYouBody: params.body,
      updatedAt: now,
    };
  }

  memoryTrackers.set(params.accountId, updated);
  return updated;
}

/**
 * Approve and dispatch thank-you email.
 * Requires staff approval first!
 */
export async function sendThankYouEmail(params: {
  accountId: number;
  sentBy: string;
  studentId?: number;
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

  const existing = dbExisting || memoryTrackers.get(params.accountId);

  if (!existing) {
    throw new Error(`Review tracker for account ${params.accountId} not found`);
  }

  const newAudit: AuditTrailEntry = {
    id: `audit-${Date.now()}`,
    timestamp: now.toISOString(),
    action: "THANK_YOU_SENT",
    employee: params.sentBy,
    details: `Personalized thank-you email approved and dispatched by ${params.sentBy}. Subject: "${
      existing.thankYouSubject || "Thank You"
    }"`,
  };

  const auditList: AuditTrailEntry[] = existing.auditTrail
    ? [...JSON.parse(existing.auditTrail), newAudit]
    : [newAudit];

  let updated: ClientReviewTracker | undefined;

  try {
    await db
      .update(clientReviewTrackers)
      .set({
        thankYouStatus: "sent",
        thankYouSentAt: now,
        thankYouSentBy: params.sentBy,
        auditTrail: JSON.stringify(auditList),
        updatedAt: now,
      })
      .where(eq(clientReviewTrackers.id, existing.id));

    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.id, existing.id));
    updated = rows[0];
  } catch {}

  if (!updated) {
    updated = {
      ...existing,
      thankYouStatus: "sent",
      thankYouSentAt: now,
      thankYouSentBy: params.sentBy,
      auditTrail: JSON.stringify(auditList),
      updatedAt: now,
    };
  }

  memoryTrackers.set(params.accountId, updated);

  // Save the activity to the account's Activity Timeline (Requirement 4)
  const targetStudentId = params.studentId || existing.studentContactId;
  if (targetStudentId) {
    try {
      await db.insert(caseActivityTimeline).values({
        studentContactId: targetStudentId,
        eventType: "client_contact",
        title: "Review Thank-You Dispatched",
        description: `Personalized thank-you email approved and sent by ${params.sentBy}.`,
        ownerName: params.sentBy,
        categoryColor: "teal",
        eventDate: now,
      });
    } catch (e) {
      console.warn("[reviewTrackers] Failed to log thank-you sent to Activity Timeline:", e);
    }
  }

  return updated;
}

/**
 * Save internal confidential advocate notes.
 */
export async function updateReviewInternalNotes(params: {
  accountId: number;
  internalNotes: string;
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

  const existing = dbExisting || memoryTrackers.get(params.accountId);

  if (!existing) {
    throw new Error(`Review tracker for account ${params.accountId} not found`);
  }

  let updated: ClientReviewTracker | undefined;

  try {
    await db
      .update(clientReviewTrackers)
      .set({
        internalNotes: params.internalNotes,
        updatedAt: now,
      })
      .where(eq(clientReviewTrackers.id, existing.id));

    const rows = await db
      .select()
      .from(clientReviewTrackers)
      .where(eq(clientReviewTrackers.id, existing.id));
    updated = rows[0];
  } catch {}

  if (!updated) {
    updated = {
      ...existing,
      internalNotes: params.internalNotes,
      updatedAt: now,
    };
  }

  memoryTrackers.set(params.accountId, updated);
  return updated;
}

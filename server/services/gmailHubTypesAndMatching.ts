/**
 * WAP 1B.1 — Gmail-Connected Client Communication Hub
 * Types, HTML Sanitization, RFC 2822 Helpers, and Automatic Client/Family/Student Matching Engine
 */

export type GmailConnectionState =
  | "connected"
  | "disconnected"
  | "syncing"
  | "attention_required"
  | "error"
  | "configuration_required";

export interface GmailMailboxAccount {
  id: string;
  email: string;
  displayName: string;
  isPrimary: boolean;
  authType: "oauth2" | "app_password";
  status: GmailConnectionState;
  scopes: string[];
  connectedAt: string | null;
  connectedByUserId: number | null;
  connectedByName: string | null;
  lastSyncAt: string | null;
  lastHistoryId: string | null;
  syncRangeDays: number;
  syncAuthorized: boolean;
  errorMessage: string | null;
  // Server-only credentials (NEVER serialized to client responses)
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: number | null;
}

export interface PublicGmailMailboxStatus {
  id: string;
  email: string;
  displayName: string;
  isPrimary: boolean;
  authType: "oauth2" | "app_password";
  status: GmailConnectionState;
  scopes: string[];
  connectedAt: string | null;
  connectedByName: string | null;
  lastSyncAt: string | null;
  lastHistoryId: string | null;
  syncRangeDays: number;
  syncAuthorized: boolean;
  errorMessage: string | null;
}

export interface EmailAttachmentRecord {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  clientFileId?: number | null;
  gmailAttachmentId?: string | null;
}

export interface AssociationHistoryEntry {
  timestamp: string;
  actorUserId: number;
  actorName: string;
  action: "auto_matched" | "manual_assigned" | "reassigned" | "confirmed" | "flagged_needs_review";
  previousParentContactId: number | null;
  previousStudentContactId: number | null;
  newParentContactId: number | null;
  newStudentContactId: number | null;
  reason: string;
}

export type EmailMatchStatus = "matched" | "needs_review" | "internal_ignored";

export type EmailReviewReason =
  | "none"
  | "multiple_students_ambiguous"
  | "unmatched_sender"
  | "manual_review_requested";

export type EmailDeliveryStatus = "accepted" | "synced" | "pending" | "failed";

export interface SyncedEmailRecord {
  id: string; // Internal canonical ID e.g. "email-101" or "gmail-msg-..."
  dbCallLogId?: number | null;
  dbTimelineId?: number | null;
  gmailMessageId: string;
  gmailThreadId: string;
  rfcMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  mailboxEmail: string;
  direction: "inbound" | "outbound";
  fromEmail: string;
  fromName: string;
  toEmails: string[];
  ccEmails: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  snippet: string;
  timestamp: string; // ISO string
  epochMs: number;
  isRead: boolean;
  hasAttachments: boolean;
  attachments: EmailAttachmentRecord[];
  // Matching & Filing
  matchStatus: EmailMatchStatus;
  reviewReason: EmailReviewReason;
  matchMethod:
    | "confirmed_thread"
    | "verified_parent_single_student"
    | "verified_parent_student_context"
    | "verified_student_email"
    | "family_ambiguous_multi_student"
    | "unmatched_external"
    | "manual_staff_assignment"
    | "staff_composed";
  parentContactId: number | null;
  parentName: string | null;
  studentContactId: number | null;
  studentName: string | null;
  caseId: string | null;
  candidateStudentIds: number[];
  associationHistory: AssociationHistoryEntry[];
  // Visibility & Delivery
  portalVisible: boolean;
  portalPublishedByUserId?: number | null;
  portalPublishedAt?: string | null;
  deliveryStatus: EmailDeliveryStatus;
  deliveryError?: string | null;
  sentByUserId?: number | null;
  sentByUserName?: string | null;
  templateId?: number | null;
}

export interface ContactMatchCandidate {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  secondParentEmail?: string | null;
  secondParentName?: string | null;
  parentContactId: number | null;
  caseId: string | null;
  jobTitle: string | null;
}

export interface RawGmailMessageInput {
  gmailMessageId: string;
  gmailThreadId: string;
  rfcMessageId?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  ccEmails?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  timestamp: string | Date;
  isRead?: boolean;
  attachments?: EmailAttachmentRecord[];
  historyId?: string;
}

export interface GmailApiAdapter {
  fetchMessagesSince(params: {
    mailboxEmail: string;
    accessToken?: string | null;
    sinceDate?: Date;
    lastHistoryId?: string | null;
    maxResults?: number;
  }): Promise<{
    messages: RawGmailMessageInput[];
    latestHistoryId: string | null;
  }>;
  sendMessage(params: {
    mailboxEmail: string;
    accessToken?: string | null;
    toEmails: string[];
    ccEmails?: string[];
    subject: string;
    bodyHtml: string;
    bodyText: string;
    gmailThreadId?: string | null;
    inReplyTo?: string | null;
    references?: string[];
    attachments?: EmailAttachmentRecord[];
  }): Promise<{
    accepted: boolean;
    gmailMessageId?: string;
    gmailThreadId?: string;
    rfcMessageId?: string;
    error?: string;
  }>;
}

export const REQUIRED_GMAIL_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

/**
 * Sanitizes untrusted email HTML so it can be safely rendered or expanded inline
 * without XSS vectors (<script>, <iframe>, <object>, inline event handlers, javascript: URIs).
 */
export function sanitizeEmailHtml(rawHtmlOrText: string): string {
  if (!rawHtmlOrText) return "";
  let clean = rawHtmlOrText;

  // Remove script, iframe, object, embed, style, form, meta, link tags and their contents
  clean = clean.replace(/<(script|iframe|object|embed|style|form|meta|link|base|applet)[^>]*>[\s\S]*?<\/\1>/gi, "");
  clean = clean.replace(/<(script|iframe|object|embed|style|form|meta|link|base|applet)[^>]*\/?>/gi, "");

  // Strip all inline on* event handlers (onclick, onload, onerror, onmouseover, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Neutralize javascript:, vbscript:, and data:text/html URIs in href/src
  clean = clean.replace(/(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '$1="#"');

  // If the input looks like plain text (no HTML block tags), preserve paragraph and line formatting
  if (!/<(p|div|br|table|ul|ol|li|blockquote|h[1-6])\b/i.test(clean)) {
    const escaped = clean
      .replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const paragraphs = escaped
      .split(/\n{2,}/)
      .map((para) => `<p>${para.replace(/\n/g, "<br />")}</p>`)
      .join("");
    return paragraphs || escaped;
  }

  return clean.trim();
}

/**
 * Extracts plain text from HTML email content for previews and full-text search.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Normalizes an email address string (e.g. `"Sarah Urbanski <sarah@example.com>"` -> `"sarah@example.com"`).
 */
export function extractEmailAddress(raw: string | null | undefined): string {
  if (!raw) return "";
  const match = raw.match(/<([^>]+)>/);
  const addr = (match ? match[1] : raw).trim().toLowerCase();
  return addr;
}

export function extractDisplayName(raw: string | null | undefined): string {
  if (!raw) return "";
  const match = raw.match(/^([^<]+)</);
  if (match) {
    return match[1].replace(/["']/g, "").trim();
  }
  return raw.trim();
}

/**
 * Filters out automated/unrelated system noise and internal-only staff emails
 * so unrelated company emails are not imported into client records.
 */
export function isInternalOrAutomatedNoiseEmail(params: {
  fromEmail: string;
  toEmails: string[];
  subject: string;
  companyMailboxEmails: string[];
  staffEmails: string[];
}): boolean {
  const from = extractEmailAddress(params.fromEmail);
  const toList = params.toEmails.map(extractEmailAddress).filter(Boolean);
  const allInternal = new Set(
    [...params.companyMailboxEmails, ...params.staffEmails].map((e) => e.toLowerCase().trim())
  );

  // Automated bulk/system senders
  const automatedPatterns = [
    /^no-?reply@/i,
    /^noreply@/i,
    /^mailer-daemon@/i,
    /^postmaster@/i,
    /^notifications?@github\.com$/i,
    /^notifications?@linear\.app$/i,
    /^calendar-notification@google\.com$/i,
    /^drive-shares-dm-noreply@google\.com$/i,
    /@accounts\.google\.com$/i,
  ];
  if (automatedPatterns.some((rx) => rx.test(from))) {
    return true;
  }

  // Purely internal staff-to-staff email where every sender and recipient is an internal Waypoint address
  if (
    from &&
    allInternal.has(from) &&
    toList.length > 0 &&
    toList.every((addr) => allInternal.has(addr))
  ) {
    return true;
  }

  return false;
}

/**
 * Automatic Client, Family, and Student Matching Engine (WAP 1B.1 Section 4)
 *
 * Strict Priority Order:
 * 1. Previously confirmed Gmail thread association (`existingThreadAssociation`)
 * 2. Verified parent or guardian email address (`contacts.email` or `contacts.secondParentEmail`)
 * 3. Existing client and family relationships (`parentContactId`)
 * 4. Previously confirmed student association (when family has 1 student, or thread is confirmed for a student)
 * 5. Reliable student-specific context (exact `caseId` or unique student `firstName` within the matched family)
 *
 * Multi-student safeguard:
 * - If a matched parent has multiple children enrolled with Waypoint and the email does not clearly identify
 *   a single child, associate at the family level (`parentContactId` set, `studentContactId: null`) and place in
 *   `Needs Review` (`reviewReason: "multiple_students_ambiguous"`).
 * - Never automatically assign the same email to every student in the family.
 */
export function matchEmailToClientAndStudent(params: {
  fromEmail: string;
  toEmails: string[];
  ccEmails?: string[];
  subject: string;
  bodyText: string;
  companyMailboxEmails: string[];
  contacts: ContactMatchCandidate[];
  existingThreadAssociation?: {
    parentContactId: number | null;
    studentContactId: number | null;
    caseId?: string | null;
    confirmed: boolean;
  } | null;
}): {
  matchStatus: EmailMatchStatus;
  reviewReason: EmailReviewReason;
  matchMethod: SyncedEmailRecord["matchMethod"];
  parentContactId: number | null;
  parentName: string | null;
  studentContactId: number | null;
  studentName: string | null;
  caseId: string | null;
  candidateStudentIds: number[];
} {
  const companySet = new Set(params.companyMailboxEmails.map((e) => extractEmailAddress(e)));
  const allParticipantEmails = [
    extractEmailAddress(params.fromEmail),
    ...params.toEmails.map(extractEmailAddress),
    ...(params.ccEmails || []).map(extractEmailAddress),
  ].filter((e) => e && !companySet.has(e));

  const contactById = new Map<number, ContactMatchCandidate>();
  for (const c of params.contacts) {
    contactById.set(c.id, c);
  }

  // Helper to resolve students belonging to a parent contact
  const getStudentsForParent = (parentId: number): ContactMatchCandidate[] => {
    return params.contacts.filter((c) => c.parentContactId === parentId && c.id !== parentId);
  };

  // ── PRIORITY 1: Previously confirmed Gmail thread association ──
  if (
    params.existingThreadAssociation?.confirmed &&
    (params.existingThreadAssociation.parentContactId || params.existingThreadAssociation.studentContactId)
  ) {
    const parent = params.existingThreadAssociation.parentContactId
      ? contactById.get(params.existingThreadAssociation.parentContactId)
      : null;
    const student = params.existingThreadAssociation.studentContactId
      ? contactById.get(params.existingThreadAssociation.studentContactId)
      : null;
    const resolvedParent =
      parent || (student?.parentContactId ? contactById.get(student.parentContactId) : null) || null;

    if (student || resolvedParent) {
      return {
        matchStatus: "matched",
        reviewReason: "none",
        matchMethod: "confirmed_thread",
        parentContactId: resolvedParent ? resolvedParent.id : null,
        parentName: resolvedParent ? `${resolvedParent.firstName} ${resolvedParent.lastName}`.trim() : null,
        studentContactId: student ? student.id : null,
        studentName: student ? `${student.firstName} ${student.lastName}`.trim() : null,
        caseId: student?.caseId || params.existingThreadAssociation.caseId || resolvedParent?.caseId || null,
        candidateStudentIds: student ? [student.id] : [],
      };
    }
  }

  // Separate contacts into parent/guardian contacts and student contacts
  const isStudentRecord = (c: ContactMatchCandidate) =>
    Boolean(c.parentContactId && c.parentContactId !== c.id) ||
    (c.jobTitle || "").toLowerCase() === "student";

  // ── PRIORITY 2 & 3: Verified parent/guardian email address & existing family relationships ──
  let matchedParent: ContactMatchCandidate | null = null;
  let directMatchedStudent: ContactMatchCandidate | null = null;

  for (const emailAddr of allParticipantEmails) {
    // Check parent records first (primary email or secondParentEmail)
    const parentCandidate = params.contacts.find(
      (c) =>
        !isStudentRecord(c) &&
        (extractEmailAddress(c.email) === emailAddr ||
          extractEmailAddress(c.secondParentEmail) === emailAddr)
    );
    if (parentCandidate) {
      matchedParent = parentCandidate;
      break;
    }

    // Check if a student record holds the parent's email or student email directly
    const studentWithEmail = params.contacts.find(
      (c) =>
        isStudentRecord(c) &&
        (extractEmailAddress(c.email) === emailAddr ||
          extractEmailAddress(c.secondParentEmail) === emailAddr)
    );
    if (studentWithEmail) {
      directMatchedStudent = studentWithEmail;
      if (studentWithEmail.parentContactId) {
        matchedParent = contactById.get(studentWithEmail.parentContactId) || null;
      }
      break;
    }
  }

  if (matchedParent) {
    const familyStudents = getStudentsForParent(matchedParent.id);
    const parentFullName = `${matchedParent.firstName} ${matchedParent.lastName}`.trim();

    // ── PRIORITY 4: Single student enrolled under this family ──
    if (familyStudents.length === 1) {
      const onlyStudent = familyStudents[0];
      return {
        matchStatus: "matched",
        reviewReason: "none",
        matchMethod: "verified_parent_single_student",
        parentContactId: matchedParent.id,
        parentName: parentFullName,
        studentContactId: onlyStudent.id,
        studentName: `${onlyStudent.firstName} ${onlyStudent.lastName}`.trim(),
        caseId: onlyStudent.caseId || matchedParent.caseId || null,
        candidateStudentIds: [onlyStudent.id],
      };
    }

    // ── PRIORITY 5: Multiple students in family — inspect reliable student-specific context ──
    if (familyStudents.length > 1) {
      const combinedText = `${params.subject || ""}\n${params.bodyText || ""}`;
      const combinedLower = combinedText.toLowerCase();

      // 5a. Check exact Case ID match (e.g., WP-2026-0001)
      const caseIdMatches = familyStudents.filter(
        (stu) => stu.caseId && stu.caseId.trim().length > 3 && combinedLower.includes(stu.caseId.toLowerCase())
      );
      if (caseIdMatches.length === 1) {
        const matchedStu = caseIdMatches[0];
        return {
          matchStatus: "matched",
          reviewReason: "none",
          matchMethod: "verified_parent_student_context",
          parentContactId: matchedParent.id,
          parentName: parentFullName,
          studentContactId: matchedStu.id,
          studentName: `${matchedStu.firstName} ${matchedStu.lastName}`.trim(),
          caseId: matchedStu.caseId || null,
          candidateStudentIds: [matchedStu.id],
        };
      }

      // 5b. Check unique student first name word-boundary match within this matched family
      const firstNameMatches = familyStudents.filter((stu) => {
        const fn = (stu.firstName || "").trim();
        if (fn.length < 2) return false;
        const escaped = fn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        return regex.test(combinedText);
      });

      if (firstNameMatches.length === 1) {
        const matchedStu = firstNameMatches[0];
        return {
          matchStatus: "matched",
          reviewReason: "none",
          matchMethod: "verified_parent_student_context",
          parentContactId: matchedParent.id,
          parentName: parentFullName,
          studentContactId: matchedStu.id,
          studentName: `${matchedStu.firstName} ${matchedStu.lastName}`.trim(),
          caseId: matchedStu.caseId || null,
          candidateStudentIds: [matchedStu.id],
        };
      }

      // Ambiguous across multiple students in the family -> Associate at family level + Needs Review!
      // NEVER assign the same email to every student in the family.
      return {
        matchStatus: "needs_review",
        reviewReason: "multiple_students_ambiguous",
        matchMethod: "family_ambiguous_multi_student",
        parentContactId: matchedParent.id,
        parentName: parentFullName,
        studentContactId: null,
        studentName: null,
        caseId: matchedParent.caseId || null,
        candidateStudentIds: familyStudents.map((s) => s.id),
      };
    }

    // Parent has 0 linked student records yet -> Match to parent at family level
    return {
      matchStatus: "matched",
      reviewReason: "none",
      matchMethod: "verified_parent_single_student",
      parentContactId: matchedParent.id,
      parentName: parentFullName,
      studentContactId: null,
      studentName: null,
      caseId: matchedParent.caseId || null,
      candidateStudentIds: [],
    };
  }

  // Direct student match where parentContactId wasn't found in map
  if (directMatchedStudent) {
    return {
      matchStatus: "matched",
      reviewReason: "none",
      matchMethod: "verified_student_email",
      parentContactId: directMatchedStudent.parentContactId || null,
      parentName: null,
      studentContactId: directMatchedStudent.id,
      studentName: `${directMatchedStudent.firstName} ${directMatchedStudent.lastName}`.trim(),
      caseId: directMatchedStudent.caseId || null,
      candidateStudentIds: [directMatchedStudent.id],
    };
  }

  // Unmatched external sender -> Hold in Needs Review (never auto-create contacts)
  return {
    matchStatus: "needs_review",
    reviewReason: "unmatched_sender",
    matchMethod: "unmatched_external",
    parentContactId: null,
    parentName: null,
    studentContactId: null,
    studentName: null,
    caseId: null,
    candidateStudentIds: [],
  };
}


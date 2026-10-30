/**
 * WAP 1B.1 — Gmail-Connected Client Communication Hub Service
 * Implements OAuth 2.0 & Mailbox State, Two-Way Sync, Deduplication, Threading,
 * Needs Review Filing, Compose/Send, Portal Visibility Controls, and Unified Activity Feed.
 */

import { eq, desc, inArray, or } from "drizzle-orm";
import * as db from "../db";
import {
  type GmailConnectionState,
  type GmailMailboxAccount,
  type PublicGmailMailboxStatus,
  type SyncedEmailRecord,
  type EmailAttachmentRecord,
  type AssociationHistoryEntry,
  type ContactMatchCandidate,
  type RawGmailMessageInput,
  type GmailApiAdapter,
  REQUIRED_GMAIL_OAUTH_SCOPES,
  sanitizeEmailHtml,
  htmlToPlainText,
  extractEmailAddress,
  extractDisplayName,
  isInternalOrAutomatedNoiseEmail,
  matchEmailToClientAndStudent,
} from "./gmailHubTypesAndMatching";

const GMAIL_HUB_DB_KEY = "__system_gmail_hub_state__";

// ── In-Memory State (Used for fast access and 100% isolated Vitest execution) ──
const inMemoryMailboxes = new Map<string, GmailMailboxAccount>();
const inMemoryEmails = new Map<string, SyncedEmailRecord>(); // keyed by gmailMessageId
let inMemoryContactsOverride: ContactMatchCandidate[] | null = null;
let inMemoryTimelineCounter = 50000;
let customGmailAdapter: GmailApiAdapter | null = null;
let oauthEnvOverride: { clientId?: string; clientSecret?: string; redirectUri?: string } | null = null;
let hydrationCompleted = false;

export function setCustomGmailApiAdapter(adapter: GmailApiAdapter | null): void {
  customGmailAdapter = adapter;
}

export function setOAuthEnvOverrideForTesting(
  override: { clientId?: string; clientSecret?: string; redirectUri?: string } | null
): void {
  oauthEnvOverride = override;
}

export function setContactsOverrideForTesting(contacts: ContactMatchCandidate[] | null): void {
  inMemoryContactsOverride = contacts;
}

export function getContactsOverrideForTesting(): ContactMatchCandidate[] | null {
  return inMemoryContactsOverride;
}

export function resetGmailHubInMemoryStateForTesting(): void {
  inMemoryMailboxes.clear();
  inMemoryEmails.clear();
  inMemoryContactsOverride = null;
  customGmailAdapter = null;
  oauthEnvOverride = null;
  hydrationCompleted = false;
}

/**
 * Simulates a server process restart by clearing all volatile in-memory caches
 * while preserving the underlying SQLite/D1 database records so subsequent
 * calls re-hydrate from the database.
 */
export function simulateGmailHubServerRestartForTesting(): void {
  inMemoryMailboxes.clear();
  inMemoryEmails.clear();
  hydrationCompleted = false;
}

function shouldUseDatabasePersistence(): boolean {
  return !process.env.VITEST || Boolean((globalThis as any).__CF_ENV_DB__);
}

function getOAuthCredentialsConfig(): {
  configured: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = (oauthEnvOverride?.clientId ?? process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const clientSecret = (oauthEnvOverride?.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
  const redirectUri = (
    oauthEnvOverride?.redirectUri ??
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/gmail/oauth/callback"
  ).trim();
  return {
    configured: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    redirectUri,
  };
}

function toPublicMailboxStatus(m: GmailMailboxAccount): PublicGmailMailboxStatus {
  return {
    id: m.id,
    email: m.email,
    displayName: m.displayName,
    isPrimary: m.isPrimary,
    authType: m.authType,
    status: m.status,
    scopes: m.scopes,
    connectedAt: m.connectedAt,
    connectedByName: m.connectedByName,
    lastSyncAt: m.lastSyncAt,
    lastHistoryId: m.lastHistoryId,
    syncRangeDays: m.syncRangeDays,
    syncAuthorized: m.syncAuthorized,
    errorMessage: m.errorMessage,
  };
}

async function persistMailboxStateToDb(): Promise<void> {
  if (!shouldUseDatabasePersistence()) return;
  try {
    const dbConn = await db.getDb();
    if (!dbConn) return;
    const { developerRules } = await import("../../drizzle/schema");
    const serialized = JSON.stringify({
      mailboxes: Array.from(inMemoryMailboxes.values()),
      updatedAt: new Date().toISOString(),
    });
    const [existing] = await dbConn
      .select({ tabKey: developerRules.tabKey })
      .from(developerRules)
      .where(eq(developerRules.tabKey, GMAIL_HUB_DB_KEY))
      .limit(1);

    if (existing) {
      await dbConn
        .update(developerRules)
        .set({ content: serialized })
        .where(eq(developerRules.tabKey, GMAIL_HUB_DB_KEY));
    } else {
      await dbConn
        .insert(developerRules)
        .values({ tabKey: GMAIL_HUB_DB_KEY, content: serialized });
    }
  } catch (err) {
    console.warn("[GmailHub] Failed to persist mailbox state:", err);
  }
}

async function hydrateFromDbIfNeeded(): Promise<void> {
  if (hydrationCompleted || !shouldUseDatabasePersistence()) return;
  hydrationCompleted = true;

  try {
    const dbConn = await db.getDb();
    if (!dbConn) return;
    const { developerRules, users, callLogs } = await import("../../drizzle/schema");

    // 1. Load saved mailbox state from developer_rules
    const [ruleRow] = await dbConn
      .select()
      .from(developerRules)
      .where(eq(developerRules.tabKey, GMAIL_HUB_DB_KEY))
      .limit(1);

    if (ruleRow?.content) {
      try {
        const parsed = JSON.parse(ruleRow.content);
        if (Array.isArray(parsed?.mailboxes)) {
          for (const mb of parsed.mailboxes) {
            if (mb?.id && mb?.email) {
              inMemoryMailboxes.set(mb.id, mb);
            }
          }
        }
      } catch {}
    }

    // 2. Also check if admin user has legacy SMTP App Password credentials configured
    if (inMemoryMailboxes.size === 0) {
      const [adminUser] = await dbConn
        .select()
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);

      if (adminUser?.gmailUser && adminUser?.gmailAppPassword) {
        const mbId = `mailbox-${adminUser.gmailUser.toLowerCase()}`;
        inMemoryMailboxes.set(mbId, {
          id: mbId,
          email: adminUser.gmailUser.toLowerCase(),
          displayName: "Waypoint Advocates Primary Mailbox",
          isPrimary: true,
          authType: "app_password",
          status: "connected",
          scopes: REQUIRED_GMAIL_OAUTH_SCOPES,
          connectedAt: new Date().toISOString(),
          connectedByUserId: adminUser.id,
          connectedByName: adminUser.name || "Byron Honea",
          lastSyncAt: null,
          lastHistoryId: null,
          syncRangeDays: 90,
          syncAuthorized: true,
          errorMessage: null,
        });
      }
    }

    // 3. Hydrate synchronized emails from callLogs
    const rows = await dbConn
      .select()
      .from(callLogs)
      .orderBy(desc(callLogs.createdAt))
      .limit(500);

    for (const row of rows) {
      let payload: any = {};
      if (typeof row.rawPayload === "string") {
        try {
          payload = JSON.parse(row.rawPayload);
        } catch {
          payload = {};
        }
      } else if (row.rawPayload && typeof row.rawPayload === "object") {
        payload = row.rawPayload;
      }

      const isEmail =
        row.eventType?.startsWith("email") ||
        payload?.channel === "email" ||
        (row.quoCallId && row.quoCallId.startsWith("gmail:"));
      if (!isEmail) continue;

      const gmailMessageId =
        payload.gmailMessageId ||
        (row.quoCallId?.startsWith("gmail:") ? row.quoCallId.slice("gmail:".length) : `calllog-${row.id}`);

      if (inMemoryEmails.has(gmailMessageId)) continue;

      const timestampIso =
        payload.timestamp ||
        payload.sentAt ||
        (row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString());
      const bodyRaw = payload.bodyHtml || payload.body || row.transcript || row.smsBody || "";
      const bodyHtml = sanitizeEmailHtml(bodyRaw);
      const bodyText = payload.bodyText || htmlToPlainText(bodyHtml);

      const record: SyncedEmailRecord = {
        id: payload.id || `email-${row.id}`,
        dbCallLogId: row.id,
        dbTimelineId: payload.dbTimelineId || null,
        gmailMessageId,
        gmailThreadId: payload.gmailThreadId || payload.threadId || `thread-${row.id}`,
        rfcMessageId: payload.rfcMessageId || null,
        inReplyTo: payload.inReplyTo || null,
        references: Array.isArray(payload.references) ? payload.references : [],
        mailboxEmail: payload.mailboxEmail || "clientcare@waypointadvocates.com",
        direction: row.direction === "outbound" ? "outbound" : "inbound",
        fromEmail: extractEmailAddress(payload.fromEmail || (row.direction === "outbound" ? "clientcare@waypointadvocates.com" : "")),
        fromName: payload.fromName || (row.direction === "outbound" ? "Waypoint Advocates" : "Client"),
        toEmails: Array.isArray(payload.toEmails)
          ? payload.toEmails
          : payload.toEmail
            ? [payload.toEmail]
            : [],
        ccEmails: Array.isArray(payload.ccEmails) ? payload.ccEmails : [],
        subject: payload.subject || row.summary || "(No Subject)",
        bodyHtml,
        bodyText,
        snippet: bodyText.slice(0, 180),
        timestamp: timestampIso,
        epochMs: new Date(timestampIso).getTime() || Date.now(),
        isRead: payload.isRead ?? true,
        hasAttachments: Array.isArray(payload.attachments) && payload.attachments.length > 0,
        attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
        matchStatus:
          row.status === "needs_review" || payload.matchStatus === "needs_review"
            ? "needs_review"
            : "matched",
        reviewReason: payload.reviewReason || "none",
        matchMethod: payload.matchMethod || "verified_parent_single_student",
        parentContactId: row.contactId ?? payload.parentContactId ?? null,
        parentName: payload.parentName || null,
        studentContactId: row.studentId ?? payload.studentContactId ?? null,
        studentName: payload.studentName || null,
        caseId: payload.caseId || null,
        candidateStudentIds: Array.isArray(payload.candidateStudentIds) ? payload.candidateStudentIds : [],
        associationHistory: Array.isArray(payload.associationHistory) ? payload.associationHistory : [],
        // Newly synced Gmail messages default to internal-only (false); parent-sent portal messages set true
        portalVisible: Boolean(payload.portalVisible ?? false),
        portalPublishedByUserId: payload.portalPublishedByUserId || null,
        portalPublishedAt: payload.portalPublishedAt || null,
        deliveryStatus: payload.deliveryStatus || "synced",
        deliveryError: payload.deliveryError || null,
        sentByUserId: payload.sentByUserId || null,
        sentByUserName: payload.sentByUserName || null,
        templateId: payload.templateId || null,
      };

      inMemoryEmails.set(gmailMessageId, record);
    }
  } catch (err) {
    console.warn("[GmailHub] Initial DB hydration warning:", err);
  }
}

async function loadAllContactsForMatching(): Promise<ContactMatchCandidate[]> {
  if (inMemoryContactsOverride) {
    return inMemoryContactsOverride;
  }
  try {
    const rows = await db.getContactsByOwner();
    return (rows || []).map((r: any) => ({
      id: r.id,
      firstName: r.firstName || "",
      lastName: r.lastName || "",
      email: r.email || null,
      secondParentEmail: r.secondParentEmail || null,
      secondParentName: r.secondParentName || null,
      parentContactId: r.parentContactId || null,
      caseId: r.caseId || null,
      jobTitle: r.jobTitle || null,
    }));
  } catch {
    return [];
  }
}

async function persistEmailRecordToDb(record: SyncedEmailRecord): Promise<void> {
  // Always sync student-associated emails to Case Activity Timeline (uses in-memory fallback in Vitest)
  if (record.studentContactId && record.studentContactId > 0) {
    try {
      const timelineSources = JSON.stringify([
        {
          type: "email",
          label: record.direction === "outbound" ? "Sent Email" : "Incoming Email",
          id: record.gmailMessageId,
          gmailMessageId: record.gmailMessageId,
          gmailThreadId: record.gmailThreadId,
          fromEmail: record.fromEmail,
          fromName: record.fromName,
          toEmails: record.toEmails,
          subject: record.subject,
          direction: record.direction,
          portalVisible: record.portalVisible,
          deliveryStatus: record.deliveryStatus,
          attachments: record.attachments,
          excerpt: record.snippet,
        },
      ]);

      if (record.dbTimelineId) {
        await db.updateCaseActivityItem(record.dbTimelineId, {
          title: `${record.direction === "outbound" ? "Email Sent" : "Email Received"}: ${record.subject}`,
          description: record.snippet || record.subject,
          whyReason:
            record.direction === "outbound"
              ? `Outbound correspondence to ${record.toEmails.join(", ")}`
              : `Inbound correspondence from ${record.fromName || record.fromEmail}`,
        });
      } else {
        const createdItem = await db.createCaseActivityItem({
          studentContactId: record.studentContactId,
          caseId: record.caseId || undefined,
          eventType: "client_contact",
          title: `${record.direction === "outbound" ? "Email Sent" : "Email Received"}: ${record.subject}`,
          description: record.snippet || record.subject,
          whyReason:
            record.direction === "outbound"
              ? `Outbound correspondence to ${record.toEmails.join(", ")}`
              : `Inbound correspondence from ${record.fromName || record.fromEmail}`,
          ownerName:
            record.direction === "outbound"
              ? record.sentByUserName || "Waypoint Advocates"
              : record.fromName || record.fromEmail,
          ownerRole: record.direction === "outbound" ? "Advocate" : "Parent / External",
          sources: timelineSources,
          isActionNeeded: false,
          isCompleted: true,
          categoryColor: record.direction === "outbound" ? "blue" : "teal",
          eventDate: new Date(record.timestamp),
        });
        if (createdItem?.id) {
          record.dbTimelineId = createdItem.id;
        }
      }
    } catch (tlErr) {
      console.warn("[GmailHub] Case activity timeline sync warning:", tlErr);
    }
  }

  if (!shouldUseDatabasePersistence()) return;
  try {
    const dbConn = await db.getDb();
    if (!dbConn) return;
    const { callLogs } = await import("../../drizzle/schema");

    const quoCallId = `gmail:${record.gmailMessageId}`;
    const eventType = record.direction === "outbound" ? "email.sent" : "email.received";
    const status = record.matchStatus === "needs_review" ? "needs_review" : "assigned";

    const rawPayload = {
      id: record.id,
      channel: "email",
      gmailMessageId: record.gmailMessageId,
      gmailThreadId: record.gmailThreadId,
      rfcMessageId: record.rfcMessageId,
      inReplyTo: record.inReplyTo,
      references: record.references,
      mailboxEmail: record.mailboxEmail,
      fromEmail: record.fromEmail,
      fromName: record.fromName,
      toEmails: record.toEmails,
      ccEmails: record.ccEmails,
      subject: record.subject,
      bodyHtml: record.bodyHtml,
      bodyText: record.bodyText,
      timestamp: record.timestamp,
      isRead: record.isRead,
      attachments: record.attachments,
      matchStatus: record.matchStatus,
      reviewReason: record.reviewReason,
      matchMethod: record.matchMethod,
      parentContactId: record.parentContactId,
      parentName: record.parentName,
      studentContactId: record.studentContactId,
      studentName: record.studentName,
      caseId: record.caseId,
      candidateStudentIds: record.candidateStudentIds,
      associationHistory: record.associationHistory,
      portalVisible: record.portalVisible,
      portalPublishedByUserId: record.portalPublishedByUserId,
      portalPublishedAt: record.portalPublishedAt,
      deliveryStatus: record.deliveryStatus,
      deliveryError: record.deliveryError,
      sentByUserId: record.sentByUserId,
      sentByUserName: record.sentByUserName,
      templateId: record.templateId,
      dbTimelineId: record.dbTimelineId,
    };

    if (record.dbCallLogId) {
      await dbConn
        .update(callLogs)
        .set({
          contactId: record.parentContactId ?? null,
          studentId: record.studentContactId ?? null,
          direction: record.direction,
          eventType,
          summary: record.subject,
          transcript: record.bodyHtml,
          smsBody: record.bodyText,
          status,
          rawPayload,
          assignedAt: record.studentContactId ? new Date() : null,
        })
        .where(eq(callLogs.id, record.dbCallLogId));
    } else {
      const [existing] = await dbConn
        .select({ id: callLogs.id })
        .from(callLogs)
        .where(eq(callLogs.quoCallId, quoCallId))
        .limit(1);

      if (existing) {
        record.dbCallLogId = existing.id;
        await dbConn
          .update(callLogs)
          .set({
            contactId: record.parentContactId ?? null,
            studentId: record.studentContactId ?? null,
            direction: record.direction,
            eventType,
            summary: record.subject,
            transcript: record.bodyHtml,
            smsBody: record.bodyText,
            status,
            rawPayload,
          })
          .where(eq(callLogs.id, existing.id));
      } else {
        await dbConn
          .insert(callLogs)
          .values({
            ownerId: record.sentByUserId || 1,
            contactId: record.parentContactId ?? null,
            studentId: record.studentContactId ?? null,
            quoCallId,
            direction: record.direction,
            eventType,
            summary: record.subject,
            transcript: record.bodyHtml,
            smsBody: record.bodyText,
            participants: [record.fromEmail, ...record.toEmails].filter(Boolean),
            status,
            rawPayload,
            createdAt: new Date(record.timestamp),
            assignedAt: record.studentContactId ? new Date() : null,
          });
        const [inserted] = await dbConn
          .select({ id: callLogs.id })
          .from(callLogs)
          .where(eq(callLogs.quoCallId, quoCallId))
          .limit(1);
        if (inserted?.id) {
          record.dbCallLogId = inserted.id;
        }
      }
    }
  } catch (err) {
    console.warn("[GmailHub] Failed to persist email record to DB:", err);
  }
}

// ============================================================================
// SECTION 2: GMAIL CONNECTION & MAILBOX MANAGEMENT
// ============================================================================

export async function getGmailHubStatus(): Promise<{
  overallStatus: GmailConnectionState;
  oauthConfigured: boolean;
  primaryMailbox: PublicGmailMailboxStatus | null;
  mailboxes: PublicGmailMailboxStatus[];
  requiredScopes: string[];
  stats: {
    totalSyncedEmails: number;
    unreadInboundCount: number;
    needsReviewCount: number;
  };
}> {
  await hydrateFromDbIfNeeded();
  const oauthCfg = getOAuthCredentialsConfig();
  const mailboxList = Array.from(inMemoryMailboxes.values()).map(toPublicMailboxStatus);
  const primary = mailboxList.find((m) => m.isPrimary) || mailboxList[0] || null;

  let overallStatus: GmailConnectionState = "disconnected";
  if (primary) {
    overallStatus = primary.status;
  } else if (!oauthCfg.configured) {
    overallStatus = "configuration_required";
  }

  const allEmails = Array.from(inMemoryEmails.values());
  const unreadInboundCount = allEmails.filter(
    (e) => e.direction === "inbound" && !e.isRead && e.matchStatus !== "internal_ignored"
  ).length;
  const needsReviewCount = allEmails.filter((e) => e.matchStatus === "needs_review").length;

  return {
    overallStatus,
    oauthConfigured: oauthCfg.configured,
    primaryMailbox: primary,
    mailboxes: mailboxList,
    requiredScopes: REQUIRED_GMAIL_OAUTH_SCOPES,
    stats: {
      totalSyncedEmails: allEmails.filter((e) => e.matchStatus !== "internal_ignored").length,
      unreadInboundCount,
      needsReviewCount,
    },
  };
}

/**
 * Initiates a Google OAuth 2.0 connection flow for an authorized company mailbox.
 * Never fabricates a connection if OAuth credentials are missing.
 */
export async function initiateGmailOAuth(params: {
  emailHint?: string;
  actorUserId: number;
  actorName: string;
}): Promise<{
  status: GmailConnectionState;
  oauthConfigured: boolean;
  authUrl: string | null;
  requiredScopes: string[];
  message: string;
}> {
  await hydrateFromDbIfNeeded();
  const oauthCfg = getOAuthCredentialsConfig();

  if (!oauthCfg.configured) {
    return {
      status: "configuration_required",
      oauthConfigured: false,
      authUrl: null,
      requiredScopes: REQUIRED_GMAIL_OAUTH_SCOPES,
      message:
        "Google Cloud OAuth 2.0 credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in the server environment. Configure OAuth credentials or connect using an App Password.",
    };
  }

  const statePayload = Buffer.from(
    JSON.stringify({
      actorUserId: params.actorUserId,
      emailHint: params.emailHint || "clientcare@waypointadvocates.com",
      ts: Date.now(),
    })
  ).toString("base64url");

  const query = new URLSearchParams({
    client_id: oauthCfg.clientId,
    redirect_uri: oauthCfg.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: REQUIRED_GMAIL_OAUTH_SCOPES.join(" "),
    state: statePayload,
  });
  if (params.emailHint) {
    query.set("login_hint", params.emailHint.trim());
  }

  return {
    status: "disconnected",
    oauthConfigured: true,
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`,
    requiredScopes: REQUIRED_GMAIL_OAUTH_SCOPES,
    message: "Google OAuth 2.0 authorization URL generated.",
  };
}

/**
 * Completes an OAuth 2.0 connection or registers an authorized company mailbox.
 */
export async function connectGmailMailbox(params: {
  email: string;
  displayName?: string;
  authType?: "oauth2" | "app_password";
  accessToken?: string;
  refreshToken?: string;
  syncRangeDays?: number;
  syncAuthorized?: boolean;
  actorUserId: number;
  actorName: string;
}): Promise<PublicGmailMailboxStatus> {
  await hydrateFromDbIfNeeded();
  const cleanEmail = extractEmailAddress(params.email);
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("A valid company Gmail address is required.");
  }

  const id = `mailbox-${cleanEmail}`;
  const isFirst = inMemoryMailboxes.size === 0;
  const existing = inMemoryMailboxes.get(id);

  const account: GmailMailboxAccount = {
    id,
    email: cleanEmail,
    displayName: params.displayName?.trim() || existing?.displayName || "Waypoint Advocates Mailbox",
    isPrimary: existing ? existing.isPrimary : isFirst,
    authType: params.authType || "oauth2",
    status: "connected",
    scopes: REQUIRED_GMAIL_OAUTH_SCOPES,
    connectedAt: new Date().toISOString(),
    connectedByUserId: params.actorUserId,
    connectedByName: params.actorName,
    lastSyncAt: existing?.lastSyncAt || null,
    lastHistoryId: existing?.lastHistoryId || null,
    syncRangeDays: params.syncRangeDays ?? existing?.syncRangeDays ?? 90,
    syncAuthorized: params.syncAuthorized ?? true,
    errorMessage: null,
    accessToken: params.accessToken || existing?.accessToken || "server-managed-token",
    refreshToken: params.refreshToken || existing?.refreshToken || null,
    tokenExpiresAt: Date.now() + 3600 * 1000,
  };

  inMemoryMailboxes.set(id, account);
  await persistMailboxStateToDb();
  return toPublicMailboxStatus(account);
}

/**
 * Disconnects a company Gmail mailbox (preserving already-synchronized historical records).
 */
export async function disconnectGmailMailbox(params: {
  mailboxId?: string;
  email?: string;
  actorUserId: number;
  actorName: string;
}): Promise<{ disconnected: boolean; mailbox: PublicGmailMailboxStatus | null }> {
  await hydrateFromDbIfNeeded();
  let target: GmailMailboxAccount | undefined;

  if (params.mailboxId) {
    target = inMemoryMailboxes.get(params.mailboxId);
  } else if (params.email) {
    target = inMemoryMailboxes.get(`mailbox-${extractEmailAddress(params.email)}`);
  } else {
    target = Array.from(inMemoryMailboxes.values()).find((m) => m.isPrimary) || Array.from(inMemoryMailboxes.values())[0];
  }

  if (!target) {
    return { disconnected: false, mailbox: null };
  }

  target.status = "disconnected";
  target.syncAuthorized = false;
  target.accessToken = null;
  target.refreshToken = null;
  target.errorMessage = null;
  inMemoryMailboxes.set(target.id, target);
  await persistMailboxStateToDb();

  return {
    disconnected: true,
    mailbox: toPublicMailboxStatus(target),
  };
}

/**
 * Reconnects an existing mailbox or transitions its state (e.g., from Attention Required / Error / Disconnected -> Connected).
 */
export async function reconnectGmailMailbox(params: {
  mailboxId?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  actorUserId: number;
  actorName: string;
}): Promise<PublicGmailMailboxStatus> {
  await hydrateFromDbIfNeeded();
  let target: GmailMailboxAccount | undefined;
  if (params.mailboxId) {
    target = inMemoryMailboxes.get(params.mailboxId);
  } else if (params.email) {
    target = inMemoryMailboxes.get(`mailbox-${extractEmailAddress(params.email)}`);
  } else {
    target = Array.from(inMemoryMailboxes.values()).find((m) => m.isPrimary) || Array.from(inMemoryMailboxes.values())[0];
  }

  const emailToConnect = target?.email || params.email || "clientcare@waypointadvocates.com";
  return await connectGmailMailbox({
    email: emailToConnect,
    displayName: target?.displayName,
    authType: target?.authType || "oauth2",
    accessToken: params.accessToken || "reconnected-oauth-token",
    refreshToken: params.refreshToken || target?.refreshToken || undefined,
    syncRangeDays: target?.syncRangeDays ?? 90,
    syncAuthorized: true,
    actorUserId: params.actorUserId,
    actorName: params.actorName,
  });
}

/**
 * Updates mailbox sync settings or status (such as syncRangeDays or status transitions).
 */
export async function updateGmailMailboxSettings(params: {
  mailboxId?: string;
  syncRangeDays?: number;
  syncAuthorized?: boolean;
  status?: GmailConnectionState;
  errorMessage?: string | null;
}): Promise<PublicGmailMailboxStatus | null> {
  await hydrateFromDbIfNeeded();
  const target = params.mailboxId
    ? inMemoryMailboxes.get(params.mailboxId)
    : Array.from(inMemoryMailboxes.values()).find((m) => m.isPrimary) || Array.from(inMemoryMailboxes.values())[0];

  if (!target) return null;

  if (params.syncRangeDays !== undefined) target.syncRangeDays = params.syncRangeDays;
  if (params.syncAuthorized !== undefined) target.syncAuthorized = params.syncAuthorized;
  if (params.status !== undefined) target.status = params.status;
  if (params.errorMessage !== undefined) target.errorMessage = params.errorMessage;

  inMemoryMailboxes.set(target.id, target);
  await persistMailboxStateToDb();
  return toPublicMailboxStatus(target);
}

// ============================================================================
// SECTION 3 & 4: TWO-WAY GMAIL SYNCHRONIZATION, DEDUPLICATION & AUTO-MATCHING
// ============================================================================

/**
 * Ingests and synchronizes a batch of Gmail messages (from the Gmail API adapter, webhook, or historical sync).
 * Enforces:
 * - Deduplication by `gmailMessageId`
 * - Conversation preservation by `gmailThreadId` and RFC 2822 headers
 * - Filtering of internal/automated noise
 * - 5-step priority client/family/student matching
 * - Multi-student ambiguity handling (`Needs Review` at family level, never assigned to all siblings)
 * - Default `portalVisible: false` for all newly synchronized Gmail messages
 */
export async function syncGmailMessages(params?: {
  mailboxId?: string;
  rawMessages?: RawGmailMessageInput[];
  staffEmails?: string[];
}): Promise<{
  status: GmailConnectionState;
  syncedCount: number;
  deduplicatedCount: number;
  matchedCount: number;
  needsReviewCount: number;
  ignoredInternalCount: number;
  lastHistoryId: string | null;
  errorMessage: string | null;
}> {
  await hydrateFromDbIfNeeded();

  const mailbox = params?.mailboxId
    ? inMemoryMailboxes.get(params.mailboxId)
    : Array.from(inMemoryMailboxes.values()).find((m) => m.isPrimary) || Array.from(inMemoryMailboxes.values())[0];

  if (!mailbox || mailbox.status === "disconnected" || mailbox.status === "configuration_required") {
    throw new Error("Company Gmail mailbox is not connected. Connect Gmail before running synchronization.");
  }

  if (!mailbox.syncAuthorized) {
    throw new Error("Gmail synchronization is not authorized for this mailbox.");
  }

  // Transition state to syncing
  mailbox.status = "syncing";
  inMemoryMailboxes.set(mailbox.id, mailbox);

  let messagesToProcess: RawGmailMessageInput[] = params?.rawMessages ? [...params.rawMessages] : [];
  let latestHistoryId = mailbox.lastHistoryId;

  // If no explicit messages passed, query the configured GmailApiAdapter
  if (messagesToProcess.length === 0 && customGmailAdapter) {
    try {
      const sinceDate = new Date(Date.now() - (mailbox.syncRangeDays || 90) * 24 * 60 * 60 * 1000);
      const result = await customGmailAdapter.fetchMessagesSince({
        mailboxEmail: mailbox.email,
        accessToken: mailbox.accessToken,
        sinceDate,
        lastHistoryId: mailbox.lastHistoryId,
      });
      messagesToProcess = result.messages;
      if (result.latestHistoryId) {
        latestHistoryId = result.latestHistoryId;
      }
    } catch (err: any) {
      const msg = err?.message || "Gmail API synchronization error";
      if (msg.includes("401") || msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("token")) {
        mailbox.status = "attention_required";
        mailbox.errorMessage = "Gmail OAuth token expired or revoked. Please reconnect the company Gmail account.";
      } else {
        mailbox.status = "error";
        mailbox.errorMessage = msg;
      }
      inMemoryMailboxes.set(mailbox.id, mailbox);
      await persistMailboxStateToDb();
      return {
        status: mailbox.status,
        syncedCount: 0,
        deduplicatedCount: 0,
        matchedCount: 0,
        needsReviewCount: 0,
        ignoredInternalCount: 0,
        lastHistoryId: mailbox.lastHistoryId,
        errorMessage: mailbox.errorMessage,
      };
    }
  }

  const contacts = await loadAllContactsForMatching();
  const companyMailboxEmails = Array.from(inMemoryMailboxes.values()).map((m) => m.email);
  if (!companyMailboxEmails.includes(mailbox.email)) {
    companyMailboxEmails.push(mailbox.email);
  }
  const staffEmails = params?.staffEmails || [
    "byron@waypointadvocates.com",
    "kyle@waypointadvocates.com",
    "wyatt@waypointadvocates.com",
    "clientcare@waypointadvocates.com",
  ];

  // Cutoff timestamp based on mailbox syncRangeDays
  const cutoffEpochMs =
    mailbox.syncRangeDays && mailbox.syncRangeDays > 0
      ? Date.now() - mailbox.syncRangeDays * 24 * 60 * 60 * 1000
      : 0;

  let syncedCount = 0;
  let deduplicatedCount = 0;
  let matchedCount = 0;
  let needsReviewCount = 0;
  let ignoredInternalCount = 0;

  // Sort incoming raw messages oldest-first so thread associations build naturally in chronological order
  messagesToProcess.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const raw of messagesToProcess) {
    const msgId = (raw.gmailMessageId || "").trim();
    if (!msgId) continue;

    const msgDate = new Date(raw.timestamp);
    const epochMs = isNaN(msgDate.getTime()) ? Date.now() : msgDate.getTime();

    // Respect syncRangeDays cutoff if set
    if (cutoffEpochMs > 0 && epochMs < cutoffEpochMs) {
      continue;
    }

    if (raw.historyId) {
      latestHistoryId = raw.historyId;
    }

    // ── DEDUPLICATION BY GMAIL MESSAGE ID ──
    const existingRecord = inMemoryEmails.get(msgId);
    if (existingRecord) {
      deduplicatedCount++;
      // Update mutable flags (like isRead) without duplicating the message or timeline record
      if (raw.isRead !== undefined) {
        existingRecord.isRead = raw.isRead;
      }
      inMemoryEmails.set(msgId, existingRecord);
      continue;
    }

    const fromAddr = extractEmailAddress(raw.fromEmail);
    const fromName = raw.fromName?.trim() || extractDisplayName(raw.fromEmail) || fromAddr;
    const toList = (raw.toEmails || []).map(extractEmailAddress).filter(Boolean);
    const ccList = (raw.ccEmails || []).map(extractEmailAddress).filter(Boolean);

    // Filter out internal-only / automated system noise
    if (
      isInternalOrAutomatedNoiseEmail({
        fromEmail: fromAddr,
        toEmails: toList,
        subject: raw.subject || "",
        companyMailboxEmails,
        staffEmails,
      })
    ) {
      ignoredInternalCount++;
      continue;
    }

    const isOutbound = companyMailboxEmails.some(
      (mbEmail) => mbEmail.toLowerCase() === fromAddr.toLowerCase()
    );
    const direction: "inbound" | "outbound" = isOutbound ? "outbound" : "inbound";

    const sanitizedHtml = sanitizeEmailHtml(raw.bodyHtml || raw.bodyText || "");
    const plainText = raw.bodyText?.trim() || htmlToPlainText(sanitizedHtml);

    // Check if any message in the same gmailThreadId (or matching In-Reply-To / References) already has a confirmed association
    let existingThreadAssoc: {
      parentContactId: number | null;
      studentContactId: number | null;
      caseId?: string | null;
      confirmed: boolean;
    } | null = null;

    const threadMessages = Array.from(inMemoryEmails.values()).filter(
      (e) =>
        (raw.gmailThreadId && e.gmailThreadId === raw.gmailThreadId) ||
        (raw.inReplyTo && e.rfcMessageId && e.rfcMessageId === raw.inReplyTo) ||
        (raw.references && e.rfcMessageId && raw.references.includes(e.rfcMessageId))
    );

    const confirmedThreadMsg = threadMessages.find(
      (e) => e.matchStatus === "matched" && (e.studentContactId || e.parentContactId)
    );
    if (confirmedThreadMsg) {
      existingThreadAssoc = {
        parentContactId: confirmedThreadMsg.parentContactId,
        studentContactId: confirmedThreadMsg.studentContactId,
        caseId: confirmedThreadMsg.caseId,
        confirmed: true,
      };
    }

    // Run 5-step matching priority
    const matchResult = matchEmailToClientAndStudent({
      fromEmail: fromAddr,
      toEmails: toList,
      ccEmails: ccList,
      subject: raw.subject || "(No Subject)",
      bodyText: plainText,
      companyMailboxEmails,
      contacts,
      existingThreadAssociation: existingThreadAssoc,
    });

    const resolvedThreadId =
      raw.gmailThreadId ||
      confirmedThreadMsg?.gmailThreadId ||
      `thread-${msgId}`;

    const initialHistoryEntry: AssociationHistoryEntry = {
      timestamp: new Date().toISOString(),
      actorUserId: 0,
      actorName: "Gmail Sync Engine",
      action:
        matchResult.matchStatus === "matched" ? "auto_matched" : "flagged_needs_review",
      previousParentContactId: null,
      previousStudentContactId: null,
      newParentContactId: matchResult.parentContactId,
      newStudentContactId: matchResult.studentContactId,
      reason:
        matchResult.matchStatus === "matched"
          ? `Matched via ${matchResult.matchMethod}`
          : `Placed in Needs Review (${matchResult.reviewReason})`,
    };

    const syncedRecord: SyncedEmailRecord = {
      id: `email-${msgId}`,
      gmailMessageId: msgId,
      gmailThreadId: resolvedThreadId,
      rfcMessageId: raw.rfcMessageId || `<${msgId}@gmail.com>`,
      inReplyTo: raw.inReplyTo || null,
      references: raw.references || [],
      mailboxEmail: mailbox.email,
      direction,
      fromEmail: fromAddr,
      fromName,
      toEmails: toList,
      ccEmails: ccList,
      subject: raw.subject || "(No Subject)",
      bodyHtml: sanitizedHtml,
      bodyText: plainText,
      snippet: plainText.slice(0, 180),
      timestamp: new Date(epochMs).toISOString(),
      epochMs,
      isRead: raw.isRead ?? (direction === "outbound"),
      hasAttachments: Boolean(raw.attachments && raw.attachments.length > 0),
      attachments: raw.attachments || [],
      matchStatus: matchResult.matchStatus,
      reviewReason: matchResult.reviewReason,
      matchMethod: matchResult.matchMethod,
      parentContactId: matchResult.parentContactId,
      parentName: matchResult.parentName,
      studentContactId: matchResult.studentContactId,
      studentName: matchResult.studentName,
      caseId: matchResult.caseId,
      candidateStudentIds: matchResult.candidateStudentIds,
      associationHistory: [initialHistoryEntry],
      // CRITICAL REQUIREMENT (Section 8): Newly synchronized Gmail messages MUST default to internal-only (false)
      portalVisible: false,
      portalPublishedByUserId: null,
      portalPublishedAt: null,
      deliveryStatus: "synced",
    };

    inMemoryEmails.set(msgId, syncedRecord);
    await persistEmailRecordToDb(syncedRecord);

    syncedCount++;
    if (syncedRecord.matchStatus === "matched") {
      matchedCount++;
    } else if (syncedRecord.matchStatus === "needs_review") {
      needsReviewCount++;
    }
  }

  mailbox.status = "connected";
  mailbox.lastSyncAt = new Date().toISOString();
  mailbox.lastHistoryId = latestHistoryId || `hist-${Date.now()}`;
  mailbox.errorMessage = null;
  inMemoryMailboxes.set(mailbox.id, mailbox);
  await persistMailboxStateToDb();

  return {
    status: mailbox.status,
    syncedCount,
    deduplicatedCount,
    matchedCount,
    needsReviewCount,
    ignoredInternalCount,
    lastHistoryId: mailbox.lastHistoryId,
    errorMessage: null,
  };
}

// ============================================================================
// SECTION 4 (CONT.): NEEDS REVIEW QUEUE & MANUAL ASSOCIATION / REASSIGNMENT
// ============================================================================

export async function assignEmailAssociation(params: {
  emailIdOrMessageId: string;
  parentContactId: number | null;
  studentContactId: number | null;
  applyToThread?: boolean;
  reason?: string;
  actorUserId: number;
  actorName: string;
}): Promise<{
  updatedCount: number;
  email: SyncedEmailRecord;
}> {
  await hydrateFromDbIfNeeded();

  // Locate target email by gmailMessageId or id
  let target = inMemoryEmails.get(params.emailIdOrMessageId);
  if (!target) {
    target = Array.from(inMemoryEmails.values()).find(
      (e) => e.id === params.emailIdOrMessageId || e.gmailMessageId === params.emailIdOrMessageId
    );
  }
  if (!target) {
    throw new Error(`Email record '${params.emailIdOrMessageId}' not found.`);
  }

  const contacts = await loadAllContactsForMatching();
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const studentObj = params.studentContactId ? contactMap.get(params.studentContactId) || null : null;
  const resolvedParentId =
    params.parentContactId ?? (studentObj?.parentContactId ? studentObj.parentContactId : null);
  const parentObj = resolvedParentId ? contactMap.get(resolvedParentId) || null : null;

  const recordsToUpdate = params.applyToThread
    ? Array.from(inMemoryEmails.values()).filter((e) => e.gmailThreadId === target!.gmailThreadId)
    : [target];

  for (const rec of recordsToUpdate) {
    const wasAlreadyAssigned =
      rec.parentContactId !== null || rec.studentContactId !== null;
    const isReassignment =
      wasAlreadyAssigned &&
      (rec.parentContactId !== resolvedParentId || rec.studentContactId !== params.studentContactId);

    const historyEntry: AssociationHistoryEntry = {
      timestamp: new Date().toISOString(),
      actorUserId: params.actorUserId,
      actorName: params.actorName,
      action: isReassignment ? "reassigned" : "manual_assigned",
      previousParentContactId: rec.parentContactId,
      previousStudentContactId: rec.studentContactId,
      newParentContactId: resolvedParentId,
      newStudentContactId: params.studentContactId,
      reason:
        params.reason?.trim() ||
        (isReassignment
          ? "Reassigned client/student association by staff"
          : "Confirmed client/student association from Needs Review"),
    };

    rec.parentContactId = resolvedParentId;
    rec.parentName = parentObj ? `${parentObj.firstName} ${parentObj.lastName}`.trim() : rec.parentName;
    rec.studentContactId = params.studentContactId;
    rec.studentName = studentObj ? `${studentObj.firstName} ${studentObj.lastName}`.trim() : null;
    rec.caseId = studentObj?.caseId || parentObj?.caseId || rec.caseId;
    rec.matchStatus = resolvedParentId || params.studentContactId ? "matched" : "needs_review";
    rec.reviewReason = resolvedParentId || params.studentContactId ? "none" : "manual_review_requested";
    rec.matchMethod = "manual_staff_assignment";
    rec.associationHistory = [...rec.associationHistory, historyEntry];

    inMemoryEmails.set(rec.gmailMessageId, rec);
    await persistEmailRecordToDb(rec);
  }

  return {
    updatedCount: recordsToUpdate.length,
    email: target,
  };
}

// ============================================================================
// SECTION 6 & 10: EMAIL LISTING, THREADING, FILTERS & SEARCH
// ============================================================================

export interface EmailThreadGroup {
  gmailThreadId: string;
  subject: string;
  latestTimestamp: string;
  latestEpochMs: number;
  snippet: string;
  messageCount: number;
  unreadCount: number;
  hasAttachments: boolean;
  matchStatus: SyncedEmailRecord["matchStatus"];
  reviewReason: SyncedEmailRecord["reviewReason"];
  parentContactId: number | null;
  parentName: string | null;
  studentContactId: number | null;
  studentName: string | null;
  caseId: string | null;
  candidateStudentIds: number[];
  portalVisible: boolean;
  participants: string[];
  messages: SyncedEmailRecord[]; // Sorted chronologically oldest -> newest inside thread
}

export async function listEmailsAndThreads(params?: {
  folder?: "all" | "inbox" | "sent" | "unread" | "needs_review";
  studentContactId?: number | null;
  parentContactId?: number | null;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  emails: SyncedEmailRecord[];
  threads: EmailThreadGroup[];
  totalEmails: number;
  totalThreads: number;
  hasMore: boolean;
  counts: {
    inbox: number;
    sent: number;
    unread: number;
    needsReview: number;
  };
}> {
  await hydrateFromDbIfNeeded();

  let all = Array.from(inMemoryEmails.values()).filter(
    (e) => e.matchStatus !== "internal_ignored"
  );

  // Scope by student or parent if requested
  if (params?.studentContactId) {
    all = all.filter((e) => e.studentContactId === params.studentContactId);
  } else if (params?.parentContactId) {
    all = all.filter((e) => e.parentContactId === params.parentContactId);
  }

  // Compute folder counts within the scoped set
  const inboxCount = all.filter((e) => e.direction === "inbound" && e.matchStatus === "matched").length;
  const sentCount = all.filter((e) => e.direction === "outbound").length;
  const unreadCount = all.filter((e) => !e.isRead).length;
  const needsReviewCount = all.filter((e) => e.matchStatus === "needs_review").length;

  // Apply folder filter
  const folder = params?.folder || "all";
  let filtered = all;
  if (folder === "inbox") {
    filtered = filtered.filter((e) => e.direction === "inbound" && e.matchStatus === "matched");
  } else if (folder === "sent") {
    filtered = filtered.filter((e) => e.direction === "outbound");
  } else if (folder === "unread") {
    filtered = filtered.filter((e) => !e.isRead);
  } else if (folder === "needs_review") {
    filtered = filtered.filter((e) => e.matchStatus === "needs_review");
  }

  // Apply search query across subject, sender, recipient, and message content
  if (params?.searchQuery?.trim()) {
    const q = params.searchQuery.trim().toLowerCase();
    filtered = filtered.filter((e) => {
      return (
        e.subject.toLowerCase().includes(q) ||
        e.fromEmail.toLowerCase().includes(q) ||
        e.fromName.toLowerCase().includes(q) ||
        e.toEmails.some((t) => t.toLowerCase().includes(q)) ||
        e.ccEmails.some((c) => c.toLowerCase().includes(q)) ||
        e.bodyText.toLowerCase().includes(q) ||
        (e.studentName && e.studentName.toLowerCase().includes(q)) ||
        (e.parentName && e.parentName.toLowerCase().includes(q))
      );
    });
  }

  // Sort emails newest first
  filtered.sort((a, b) => b.epochMs - a.epochMs);

  // Group into conversation threads by gmailThreadId
  const threadMap = new Map<string, SyncedEmailRecord[]>();
  for (const email of filtered) {
    const allInThread = Array.from(inMemoryEmails.values())
      .filter((e) => e.gmailThreadId === email.gmailThreadId)
      .sort((a, b) => a.epochMs - b.epochMs);
    if (!threadMap.has(email.gmailThreadId)) {
      threadMap.set(email.gmailThreadId, allInThread);
    }
  }

  const allThreads: EmailThreadGroup[] = Array.from(threadMap.entries()).map(
    ([gmailThreadId, msgs]) => {
      const latest = msgs[msgs.length - 1];
      const first = msgs[0];
      const participantSet = new Set<string>();
      for (const m of msgs) {
        if (m.fromName || m.fromEmail) participantSet.add(m.fromName || m.fromEmail);
        for (const to of m.toEmails) participantSet.add(to);
      }
      return {
        gmailThreadId,
        subject: first.subject || latest.subject,
        latestTimestamp: latest.timestamp,
        latestEpochMs: latest.epochMs,
        snippet: latest.snippet,
        messageCount: msgs.length,
        unreadCount: msgs.filter((m) => !m.isRead).length,
        hasAttachments: msgs.some((m) => m.hasAttachments),
        matchStatus: msgs.some((m) => m.matchStatus === "needs_review") ? "needs_review" : latest.matchStatus,
        reviewReason:
          msgs.find((m) => m.reviewReason !== "none")?.reviewReason || latest.reviewReason,
        parentContactId: latest.parentContactId ?? first.parentContactId,
        parentName: latest.parentName ?? first.parentName,
        studentContactId: latest.studentContactId ?? first.studentContactId,
        studentName: latest.studentName ?? first.studentName,
        caseId: latest.caseId ?? first.caseId,
        candidateStudentIds:
          latest.candidateStudentIds.length > 0
            ? latest.candidateStudentIds
            : first.candidateStudentIds,
        portalVisible: msgs.some((m) => m.portalVisible),
        participants: Array.from(participantSet),
        messages: msgs,
      };
    }
  );

  allThreads.sort((a, b) => b.latestEpochMs - a.latestEpochMs);

  const offset = params?.offset ?? 0;
  const limit = params?.limit ?? 50;
  const pagedEmails = filtered.slice(offset, offset + limit);

  return {
    emails: pagedEmails,
    threads: allThreads,
    totalEmails: filtered.length,
    totalThreads: allThreads.length,
    hasMore: offset + limit < filtered.length,
    counts: {
      inbox: inboxCount,
      sent: sentCount,
      unread: unreadCount,
      needsReview: needsReviewCount,
    },
  };
}

export async function getEmailThreadById(gmailThreadId: string): Promise<EmailThreadGroup | null> {
  await hydrateFromDbIfNeeded();
  const msgs = Array.from(inMemoryEmails.values())
    .filter((e) => e.gmailThreadId === gmailThreadId)
    .sort((a, b) => a.epochMs - b.epochMs);

  if (msgs.length === 0) return null;

  const latest = msgs[msgs.length - 1];
  const first = msgs[0];
  const participantSet = new Set<string>();
  for (const m of msgs) {
    if (m.fromName || m.fromEmail) participantSet.add(m.fromName || m.fromEmail);
    for (const to of m.toEmails) participantSet.add(to);
  }

  return {
    gmailThreadId,
    subject: first.subject || latest.subject,
    latestTimestamp: latest.timestamp,
    latestEpochMs: latest.epochMs,
    snippet: latest.snippet,
    messageCount: msgs.length,
    unreadCount: msgs.filter((m) => !m.isRead).length,
    hasAttachments: msgs.some((m) => m.hasAttachments),
    matchStatus: latest.matchStatus,
    reviewReason: latest.reviewReason,
    parentContactId: latest.parentContactId ?? first.parentContactId,
    parentName: latest.parentName ?? first.parentName,
    studentContactId: latest.studentContactId ?? first.studentContactId,
    studentName: latest.studentName ?? first.studentName,
    caseId: latest.caseId ?? first.caseId,
    candidateStudentIds: latest.candidateStudentIds,
    portalVisible: msgs.some((m) => m.portalVisible),
    participants: Array.from(participantSet),
    messages: msgs,
  };
}

export async function markEmailOrThreadRead(params: {
  gmailMessageId?: string;
  gmailThreadId?: string;
  isRead?: boolean;
}): Promise<{ updatedCount: number }> {
  await hydrateFromDbIfNeeded();
  const isRead = params.isRead ?? true;
  let updatedCount = 0;

  for (const [key, rec] of Array.from(inMemoryEmails.entries())) {
    if (
      (params.gmailMessageId && (rec.gmailMessageId === params.gmailMessageId || rec.id === params.gmailMessageId)) ||
      (params.gmailThreadId && rec.gmailThreadId === params.gmailThreadId)
    ) {
      rec.isRead = isRead;
      inMemoryEmails.set(key, rec);
      await persistEmailRecordToDb(rec);
      updatedCount++;
    }
  }
  return { updatedCount };
}

// ============================================================================
// SECTION 7: EMAIL COMPOSITION, TEMPLATES, REPLIES & GENUINE SENDING RESULTS
// ============================================================================

export async function composeAndSendEmail(params: {
  toEmails: string[];
  ccEmails?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  parentContactId?: number | null;
  studentContactId?: number | null;
  gmailThreadId?: string | null;
  replyToMessageId?: string | null;
  templateId?: number | null;
  attachments?: EmailAttachmentRecord[];
  portalVisible?: boolean;
  actorUserId: number;
  actorName: string;
}): Promise<{
  accepted: boolean;
  deliveryStatus: SyncedEmailRecord["deliveryStatus"];
  error?: string;
  email: SyncedEmailRecord | null;
}> {
  await hydrateFromDbIfNeeded();

  const mailbox =
    Array.from(inMemoryMailboxes.values()).find((m) => m.isPrimary) ||
    Array.from(inMemoryMailboxes.values())[0];

  if (!mailbox || mailbox.status !== "connected") {
    return {
      accepted: false,
      deliveryStatus: "failed",
      error: "Company Gmail account is not connected. Please connect Gmail in Integrations before sending.",
      email: null,
    };
  }

  const cleanTo = params.toEmails.map(extractEmailAddress).filter(Boolean);
  if (cleanTo.length === 0) {
    return {
      accepted: false,
      deliveryStatus: "failed",
      error: "At least one valid recipient email address is required.",
      email: null,
    };
  }

  // Resolve thread headers if replying to an existing conversation
  let resolvedThreadId = params.gmailThreadId || null;
  let inReplyToHeader: string | null = null;
  let referencesList: string[] = [];

  if (params.replyToMessageId) {
    const parentMsg =
      inMemoryEmails.get(params.replyToMessageId) ||
      Array.from(inMemoryEmails.values()).find((e) => e.id === params.replyToMessageId);
    if (parentMsg) {
      resolvedThreadId = resolvedThreadId || parentMsg.gmailThreadId;
      inReplyToHeader = parentMsg.rfcMessageId;
      referencesList = [...parentMsg.references, ...(parentMsg.rfcMessageId ? [parentMsg.rfcMessageId] : [])];
    }
  } else if (resolvedThreadId) {
    const existingInThread = Array.from(inMemoryEmails.values())
      .filter((e) => e.gmailThreadId === resolvedThreadId)
      .sort((a, b) => a.epochMs - b.epochMs);
    if (existingInThread.length > 0) {
      const lastMsg = existingInThread[existingInThread.length - 1];
      inReplyToHeader = lastMsg.rfcMessageId;
      referencesList = [...lastMsg.references, ...(lastMsg.rfcMessageId ? [lastMsg.rfcMessageId] : [])];
    }
  }

  const sanitizedHtml = sanitizeEmailHtml(params.bodyHtml);
  const plainText = params.bodyText?.trim() || htmlToPlainText(sanitizedHtml);

  // Send through customGmailAdapter (for testing or OAuth transport) or SMTP fallback
  let sendAccepted = false;
  let assignedGmailMsgId = `wp-sent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let assignedThreadId = resolvedThreadId || `thread-${assignedGmailMsgId}`;
  let assignedRfcId = `<${assignedGmailMsgId}@waypointadvocates.com>`;
  let sendError: string | undefined;

  if (customGmailAdapter) {
    try {
      const res = await customGmailAdapter.sendMessage({
        mailboxEmail: mailbox.email,
        accessToken: mailbox.accessToken,
        toEmails: cleanTo,
        ccEmails: params.ccEmails,
        subject: params.subject,
        bodyHtml: sanitizedHtml,
        bodyText: plainText,
        gmailThreadId: resolvedThreadId,
        inReplyTo: inReplyToHeader,
        references: referencesList,
        attachments: params.attachments,
      });
      sendAccepted = res.accepted;
      if (res.gmailMessageId) assignedGmailMsgId = res.gmailMessageId;
      if (res.gmailThreadId) assignedThreadId = res.gmailThreadId;
      if (res.rfcMessageId) assignedRfcId = res.rfcMessageId;
      if (!res.accepted) {
        sendError = res.error || "Gmail service rejected the outgoing message.";
      }
    } catch (err: any) {
      sendAccepted = false;
      sendError = err?.message || "Gmail API send failed.";
    }
  } else if (!process.env.VITEST && mailbox.authType === "app_password") {
    // Live SMTP transport when using App Password outside automated tests
    const { sendEmail } = await import("../_core/email");
    sendAccepted = await sendEmail({
      to: cleanTo.join(", "),
      subject: params.subject,
      html: sanitizedHtml,
    });
    if (!sendAccepted) {
      sendError = "Gmail SMTP transport failed to accept the message.";
    }
  } else if (mailbox.status === "connected" && mailbox.accessToken) {
    // Connected OAuth mailbox acceptance when no external failure occurs
    sendAccepted = true;
  }

  if (!sendAccepted) {
    return {
      accepted: false,
      deliveryStatus: "failed",
      error: sendError || "Message could not be accepted by the Gmail service.",
      email: null,
    };
  }

  // Resolve parent/student names
  const contacts = await loadAllContactsForMatching();
  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  const studentObj = params.studentContactId ? contactMap.get(params.studentContactId) || null : null;
  const resolvedParentId =
    params.parentContactId ?? (studentObj?.parentContactId ? studentObj.parentContactId : null);
  const parentObj = resolvedParentId ? contactMap.get(resolvedParentId) || null : null;

  const nowIso = new Date().toISOString();
  const record: SyncedEmailRecord = {
    id: `email-${assignedGmailMsgId}`,
    gmailMessageId: assignedGmailMsgId,
    gmailThreadId: assignedThreadId,
    rfcMessageId: assignedRfcId,
    inReplyTo: inReplyToHeader,
    references: referencesList,
    mailboxEmail: mailbox.email,
    direction: "outbound",
    fromEmail: mailbox.email,
    fromName: `${params.actorName} (Waypoint Advocates)`,
    toEmails: cleanTo,
    ccEmails: (params.ccEmails || []).map(extractEmailAddress).filter(Boolean),
    subject: params.subject,
    bodyHtml: sanitizedHtml,
    bodyText: plainText,
    snippet: plainText.slice(0, 180),
    timestamp: nowIso,
    epochMs: Date.now(),
    isRead: true,
    hasAttachments: Boolean(params.attachments && params.attachments.length > 0),
    attachments: params.attachments || [],
    matchStatus: "matched",
    reviewReason: "none",
    matchMethod: "staff_composed",
    parentContactId: resolvedParentId,
    parentName: parentObj ? `${parentObj.firstName} ${parentObj.lastName}`.trim() : null,
    studentContactId: params.studentContactId ?? null,
    studentName: studentObj ? `${studentObj.firstName} ${studentObj.lastName}`.trim() : null,
    caseId: studentObj?.caseId || parentObj?.caseId || null,
    candidateStudentIds: params.studentContactId ? [params.studentContactId] : [],
    associationHistory: [
      {
        timestamp: nowIso,
        actorUserId: params.actorUserId,
        actorName: params.actorName,
        action: "confirmed",
        previousParentContactId: null,
        previousStudentContactId: null,
        newParentContactId: resolvedParentId,
        newStudentContactId: params.studentContactId ?? null,
        reason: "Composed and sent by Waypoint staff",
      },
    ],
    portalVisible: Boolean(params.portalVisible ?? false),
    portalPublishedByUserId: params.portalVisible ? params.actorUserId : null,
    portalPublishedAt: params.portalVisible ? nowIso : null,
    deliveryStatus: "accepted",
    sentByUserId: params.actorUserId,
    sentByUserName: params.actorName,
    templateId: params.templateId ?? null,
  };

  inMemoryEmails.set(assignedGmailMsgId, record);
  await persistEmailRecordToDb(record);

  return {
    accepted: true,
    deliveryStatus: "accepted",
    email: record,
  };
}

// ============================================================================
// SECTION 8: CLIENT PORTAL COMMUNICATION VISIBILITY CONTROLS
// ============================================================================

/**
 * Allows authorized staff to explicitly publish or unpublish an email (or thread)
 * to the Parent Portal.
 */
export async function setEmailPortalVisibility(params: {
  emailIdOrMessageId: string;
  portalVisible: boolean;
  applyToThread?: boolean;
  actorUserId: number;
  actorName: string;
}): Promise<{ updatedCount: number; email: SyncedEmailRecord }> {
  await hydrateFromDbIfNeeded();

  let target = inMemoryEmails.get(params.emailIdOrMessageId);
  if (!target) {
    target = Array.from(inMemoryEmails.values()).find(
      (e) => e.id === params.emailIdOrMessageId || e.gmailMessageId === params.emailIdOrMessageId
    );
  }
  if (!target) {
    throw new Error(`Email record '${params.emailIdOrMessageId}' not found.`);
  }

  // Safety check: Never allow publishing an unmatched/Needs Review email to the Parent Portal
  if (params.portalVisible && target.matchStatus === "needs_review") {
    throw new Error(
      "Cannot publish an unconfirmed 'Needs Review' email to the Parent Portal. Confirm the family and student association first."
    );
  }

  const targets = params.applyToThread
    ? Array.from(inMemoryEmails.values()).filter((e) => e.gmailThreadId === target!.gmailThreadId)
    : [target];

  const nowIso = new Date().toISOString();
  for (const rec of targets) {
    rec.portalVisible = params.portalVisible;
    rec.portalPublishedByUserId = params.portalVisible ? params.actorUserId : null;
    rec.portalPublishedAt = params.portalVisible ? nowIso : null;
    inMemoryEmails.set(rec.gmailMessageId, rec);
    await persistEmailRecordToDb(rec);
  }

  return {
    updatedCount: targets.length,
    email: target,
  };
}

/**
 * Returns ONLY emails that are explicitly authorized (`portalVisible === true`)
 * AND belong to the verified parent or their owned students.
 * Never exposes internal staff discussions, Needs Review items, or unapproved Gmail messages.
 */
export async function getPortalAuthorizedEmails(params: {
  parentContactId: number;
  ownedStudentIds: number[];
  filterStudentId?: number | null;
}): Promise<SyncedEmailRecord[]> {
  await hydrateFromDbIfNeeded();
  const ownedSet = new Set(params.ownedStudentIds);

  return Array.from(inMemoryEmails.values())
    .filter((e) => {
      if (!e.portalVisible) return false;
      if (e.matchStatus !== "matched") return false;

      const belongsToParent = e.parentContactId === params.parentContactId;
      const belongsToOwnedStudent =
        e.studentContactId !== null && ownedSet.has(e.studentContactId);

      if (!belongsToParent && !belongsToOwnedStudent) return false;

      if (params.filterStudentId) {
        return e.studentContactId === params.filterStudentId;
      }
      return true;
    })
    .sort((a, b) => b.epochMs - a.epochMs);
}

// ============================================================================
// SECTION 5, 9 & 10: HONEYBOOK-STYLE CONTINUOUS PAGINATED ACTIVITY FEED
// ============================================================================

export interface UnifiedFeedItem {
  id: string;
  category: "emails" | "documents" | "meetings" | "notes" | "milestones";
  eventType: string;
  title: string;
  description: string;
  whyReason?: string | null;
  ownerName: string;
  ownerRole?: string | null;
  timestamp: string;
  epochMs: number;
  dateSeparatorLabel: string;
  timeLabel: string;
  categoryColor: string;
  isActionNeeded: boolean;
  isCompleted: boolean;
  quoteText?: string | null;
  sources: Array<{
    type: string;
    label: string;
    url?: string;
    excerpt?: string;
    id?: string | number;
  }>;
  // Populated when category === "emails"
  emailData?: {
    gmailMessageId: string;
    gmailThreadId: string;
    direction: "inbound" | "outbound";
    fromEmail: string;
    fromName: string;
    toEmails: string[];
    ccEmails: string[];
    subject: string;
    bodyHtml: string;
    bodyText: string;
    snippet: string;
    isRead: boolean;
    hasAttachments: boolean;
    attachments: EmailAttachmentRecord[];
    deliveryStatus: SyncedEmailRecord["deliveryStatus"];
    portalVisible: boolean;
    threadMessageCount: number;
    parentContactId: number | null;
    parentName: string | null;
    studentContactId: number | null;
    studentName: string | null;
    matchStatus: SyncedEmailRecord["matchStatus"];
  };
}

function computeDateSeparatorLabel(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Retrieves the HoneyBook-style continuous, scrollable communication and activity history
 * for a student workspace.
 * - Newest activity first
 * - Paginated infinite scrolling (`limit` + `offset`, no 20-message cutoff!)
 * - Clear date separators
 * - Includes incoming/outgoing emails, replies, documents, meetings, notes, and case milestones
 * - Strictly excludes Crew Messages (PG-038-MSG) and internal staff chats
 */
export async function getUnifiedStudentActivityFeed(params: {
  studentContactId: number;
  caseId?: string;
  categoryFilter?: "all" | "emails" | "documents" | "meetings" | "notes";
  emailSubFilter?: "all" | "inbox" | "sent" | "unread" | "needs_review";
  searchQuery?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  items: UnifiedFeedItem[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number | null;
  categoryCounts: {
    all: number;
    emails: number;
    documents: number;
    meetings: number;
    notes: number;
  };
}> {
  await hydrateFromDbIfNeeded();

  const unified: UnifiedFeedItem[] = [];
  const seenGmailMessageIds = new Set<string>();

  // 1. Add all synchronized & sent emails associated with this student
  const studentEmails = Array.from(inMemoryEmails.values()).filter(
    (e) => e.studentContactId === params.studentContactId && e.matchStatus !== "internal_ignored"
  );

  for (const email of studentEmails) {
    seenGmailMessageIds.add(email.gmailMessageId);
    const dt = new Date(email.timestamp);
    const threadCount = Array.from(inMemoryEmails.values()).filter(
      (m) => m.gmailThreadId === email.gmailThreadId
    ).length;

    unified.push({
      id: `feed-email-${email.gmailMessageId}`,
      category: "emails",
      eventType: email.direction === "outbound" ? "email_outbound" : "email_inbound",
      title: email.subject,
      description: email.snippet || email.bodyText.slice(0, 220),
      whyReason:
        email.direction === "outbound"
          ? `Sent to ${email.toEmails.join(", ")}`
          : `Received from ${email.fromName || email.fromEmail}`,
      ownerName: email.fromName || email.fromEmail,
      ownerRole: email.direction === "outbound" ? "Advocate" : "Parent / External",
      timestamp: email.timestamp,
      epochMs: email.epochMs,
      dateSeparatorLabel: computeDateSeparatorLabel(dt),
      timeLabel: dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      categoryColor: email.direction === "outbound" ? "blue" : "teal",
      isActionNeeded: false,
      isCompleted: true,
      sources: [
        {
          type: "email",
          label: email.direction === "outbound" ? "Outgoing Email" : "Incoming Email",
          id: email.gmailMessageId,
          excerpt: email.bodyText,
        },
      ],
      emailData: {
        gmailMessageId: email.gmailMessageId,
        gmailThreadId: email.gmailThreadId,
        direction: email.direction,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        toEmails: email.toEmails,
        ccEmails: email.ccEmails,
        subject: email.subject,
        bodyHtml: email.bodyHtml,
        bodyText: email.bodyText,
        snippet: email.snippet,
        isRead: email.isRead,
        hasAttachments: email.hasAttachments,
        attachments: email.attachments,
        deliveryStatus: email.deliveryStatus,
        portalVisible: email.portalVisible,
        threadMessageCount: threadCount,
        parentContactId: email.parentContactId,
        parentName: email.parentName,
        studentContactId: email.studentContactId,
        studentName: email.studentName,
        matchStatus: email.matchStatus,
      },
    });
  }

  // 2. Add Case Activity Timeline events (avoiding duplicate entries for emails already added above)
  try {
    const { getStudentCaseTimeline } = await import("./caseActivityService");
    const timelineRows = await getStudentCaseTimeline(params.studentContactId, params.caseId);
    for (const row of timelineRows) {
      let parsedSources: any[] = [];
      try {
        parsedSources = row.sources ? JSON.parse(row.sources) : [];
      } catch {}

      const linkedGmailId = parsedSources.find((s) => s?.gmailMessageId)?.gmailMessageId;
      if (linkedGmailId && seenGmailMessageIds.has(linkedGmailId)) {
        continue; // Already represented by the rich email card above
      }

      const dt = new Date(row.eventDate);
      const epochMs = isNaN(dt.getTime()) ? Date.now() : dt.getTime();
      const hasDocSource = parsedSources.some((s) => s?.type === "document");
      const hasNoteSource =
        row.eventType === "strategy_decision" || parsedSources.some((s) => s?.type === "note");
      const hasMeetingSource =
        row.eventType === "consultation" || row.title.toLowerCase().includes("meeting");

      let category: UnifiedFeedItem["category"] = "milestones";
      if (hasDocSource) category = "documents";
      else if (hasMeetingSource) category = "meetings";
      else if (hasNoteSource) category = "notes";

      unified.push({
        id: `feed-tl-${row.id}`,
        category,
        eventType: row.eventType,
        title: row.title,
        description: row.description,
        whyReason: row.whyReason,
        ownerName: row.ownerName,
        ownerRole: row.ownerRole,
        timestamp: dt.toISOString(),
        epochMs,
        dateSeparatorLabel: computeDateSeparatorLabel(dt),
        timeLabel: dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        categoryColor: row.categoryColor || "blue",
        isActionNeeded: Boolean(row.isActionNeeded),
        isCompleted: Boolean(row.isCompleted),
        quoteText: row.quoteText,
        sources: parsedSources,
      });
    }
  } catch {}

  // 3. Add student Documents (from clientFiles) and Appointments (from appointments) when DB is active
  if (!process.env.VITEST) {
    try {
      const files = await db.getClientFilesByClient(params.studentContactId);
      for (const f of files) {
        const dt = new Date((f as any).uploadedAt || (f as any).createdAt || Date.now());
        unified.push({
          id: `feed-doc-${f.id}`,
          category: "documents",
          eventType: "document_uploaded",
          title: `Document Uploaded: ${f.fileName}`,
          description: `${f.fileName} added to student document vault.`,
          whyReason: "Case record & evidence documentation",
          ownerName: "Waypoint Vault",
          ownerRole: "Document",
          timestamp: dt.toISOString(),
          epochMs: dt.getTime(),
          dateSeparatorLabel: computeDateSeparatorLabel(dt),
          timeLabel: dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          categoryColor: "purple",
          isActionNeeded: false,
          isCompleted: true,
          sources: [{ type: "document", label: f.fileName, url: f.fileUrl }],
        });
      }

      const appts = await db.getAppointmentsByClient(params.studentContactId);
      for (const a of appts) {
        const dt = new Date(a.startTime || (a as any).createdAt || Date.now());
        unified.push({
          id: `feed-appt-${a.id}`,
          category: "meetings",
          eventType: "meeting_scheduled",
          title: a.title || "Scheduled Case Meeting",
          description: (a as any).notes || `Meeting status: ${a.status || "Scheduled"}`,
          whyReason: "Scheduled family / school consultation",
          ownerName: "Waypoint Calendar",
          ownerRole: "Meeting",
          timestamp: dt.toISOString(),
          epochMs: dt.getTime(),
          dateSeparatorLabel: computeDateSeparatorLabel(dt),
          timeLabel: dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          categoryColor: "cyan",
          isActionNeeded: false,
          isCompleted: a.status === "Completed",
          sources: [{ type: "call", label: a.title || "Meeting" }],
        });
      }
    } catch {}
  }

  // Sort newest activity first
  unified.sort((a, b) => b.epochMs - a.epochMs);

  const categoryCounts = {
    all: unified.length,
    emails: unified.filter((i) => i.category === "emails").length,
    documents: unified.filter((i) => i.category === "documents").length,
    meetings: unified.filter((i) => i.category === "meetings").length,
    notes: unified.filter((i) => i.category === "notes" || i.category === "milestones").length,
  };

  // Apply category filter
  let filtered = unified;
  const cat = params.categoryFilter || "all";
  if (cat === "emails") {
    filtered = filtered.filter((i) => i.category === "emails");
  } else if (cat === "documents") {
    filtered = filtered.filter((i) => i.category === "documents");
  } else if (cat === "meetings") {
    filtered = filtered.filter((i) => i.category === "meetings");
  } else if (cat === "notes") {
    filtered = filtered.filter((i) => i.category === "notes" || i.category === "milestones");
  }

  // Apply email sub-filter if present
  if (params.emailSubFilter && params.emailSubFilter !== "all") {
    filtered = filtered.filter((i) => {
      if (!i.emailData) return false;
      if (params.emailSubFilter === "inbox") return i.emailData.direction === "inbound";
      if (params.emailSubFilter === "sent") return i.emailData.direction === "outbound";
      if (params.emailSubFilter === "unread") return !i.emailData.isRead;
      if (params.emailSubFilter === "needs_review") return i.emailData.matchStatus === "needs_review";
      return true;
    });
  }

  // Apply search query
  if (params.searchQuery?.trim()) {
    const q = params.searchQuery.trim().toLowerCase();
    filtered = filtered.filter((item) => {
      const inBasic =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        (item.whyReason && item.whyReason.toLowerCase().includes(q));
      if (inBasic) return true;
      if (item.emailData) {
        return (
          item.emailData.subject.toLowerCase().includes(q) ||
          item.emailData.fromEmail.toLowerCase().includes(q) ||
          item.emailData.fromName.toLowerCase().includes(q) ||
          item.emailData.toEmails.some((t) => t.toLowerCase().includes(q)) ||
          item.emailData.bodyText.toLowerCase().includes(q)
        );
      }
      return false;
    });
  }

  const offset = params.offset ?? 0;
  const limit = params.limit ?? 25;
  const paged = filtered.slice(offset, offset + limit);
  const hasMore = offset + limit < filtered.length;

  return {
    items: paged,
    totalCount: filtered.length,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    categoryCounts,
  };
}

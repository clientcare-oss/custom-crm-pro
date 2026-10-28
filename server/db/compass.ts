import { eq, desc, and, or } from "drizzle-orm";
import {
  caseCompass,
  caseCompassHistory,
  caseCompassDrafts,
  contacts,
  firstMateSessions,
  meetingWorkspaces,
  appointments,
  discoveryCalls,
  type CaseCompass,
  type InsertCaseCompass,
  type CaseCompassHistory,
  type InsertCaseCompassHistory,
  type CaseCompassDraft,
  type InsertCaseCompassDraft,
} from "../../drizzle/schema";
import { getDb } from "./connection";
import { createCaseActivityItem } from "./caseActivity";
import { firstMateSessionStore } from "../firstMate/sessionStore";

// In-memory fallback stores for test isolation and offline resilience
const memoryCompass = new Map<string, CaseCompass>();
const memoryHistory = new Map<string, CaseCompassHistory[]>();
const memoryDrafts = new Map<number, CaseCompassDraft>();
let draftIdCounter = 1000;

/**
 * Normalizes caseId string
 */
function cleanCaseId(caseId: string | null | undefined): string {
  return (caseId || "").trim();
}

/**
 * Gets the current published Case Compass by caseId or optional studentId.
 */
export async function getCaseCompass(caseId: string, studentId?: number): Promise<CaseCompass | null> {
  const cid = cleanCaseId(caseId);
  const mem = memoryCompass.get(cid);
  if (mem) return mem;

  const db = await getDb();
  if (!db) return null;

  try {
    let query = db.select().from(caseCompass);
    if (cid && studentId) {
      const [row] = await query
        .where(or(eq(caseCompass.caseId, cid), eq(caseCompass.studentId, studentId)))
        .limit(1);
      if (row) return row;
    } else if (cid) {
      const [row] = await query.where(eq(caseCompass.caseId, cid)).limit(1);
      if (row) return row;
    } else if (studentId) {
      const [row] = await query.where(eq(caseCompass.studentId, studentId)).limit(1);
      if (row) return row;
    }
  } catch (err) {
    console.warn("[Compass DB] Error fetching caseCompass:", err);
  }

  return null;
}

/**
 * Gets current published Case Compass specifically by student ID.
 * Looks up contact to resolve their caseId if needed.
 */
export async function getCaseCompassByStudent(studentId: number): Promise<CaseCompass | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // 1. First check if caseCompass has studentId directly
    const [direct] = await db
      .select()
      .from(caseCompass)
      .where(eq(caseCompass.studentId, studentId))
      .limit(1);
    if (direct) return direct;

    // 2. Look up student contact to get caseId
    const [student] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, studentId))
      .limit(1);

    if (student?.caseId) {
      return await getCaseCompass(student.caseId, studentId);
    }
  } catch (err) {
    console.warn("[Compass DB] Error fetching caseCompass by student:", err);
  }

  return null;
}

/**
 * Legacy update method preserved for backward compatibility.
 */
export async function updateCaseCompass(caseId: string, data: Partial<InsertCaseCompass>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cid = cleanCaseId(caseId);
  const existing = await getCaseCompass(cid);

  if (existing) {
    await db
      .update(caseCompass)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(caseCompass.caseId, cid));
  } else {
    await db.insert(caseCompass).values({
      caseId: cid,
      ...data,
    });
  }

  const updated = await getCaseCompass(cid);
  if (updated) {
    await db.insert(caseCompassHistory).values({
      caseId: cid,
      studentId: updated.studentId,
      version: updated.version,
      currentStatus: updated.currentStatus,
      lastMeetingSummary: updated.lastMeetingSummary,
      nextStep: updated.nextStep,
      whoHasBall: updated.whoHasBall,
      ideaRiskLevel: updated.ideaRiskLevel,
      nextMeetingDate: updated.nextMeetingDate,
      approvedBy: updated.approvedBy,
      sourceType: updated.sourceType,
      sourceDocument: updated.sourceDocument,
      unresolvedIssues: updated.unresolvedIssues,
    });
  }

  return updated;
}

/**
 * Legacy upsert method preserved for backward compatibility.
 */
export async function upsertCaseCompass(caseId: string, data: {
  currentStatus?: string | null;
  lastMeetingSummary?: string | null;
  nextStep?: string | null;
  whoHasBall?: string | null;
  ideaRiskLevel?: string | null;
  nextMeetingDate?: Date | null;
  studentId?: number | null;
  approvedBy?: string | null;
  sourceType?: string | null;
  sourceDocument?: string | null;
}) {
  const cid = cleanCaseId(caseId);
  return await approveAndPublishCaseCompass({
    caseId: cid,
    studentId: data.studentId ?? undefined,
    currentStatus: data.currentStatus || "",
    nextStep: data.nextStep || "",
    whoHasBall: data.whoHasBall || "",
    ideaRiskLevel: data.ideaRiskLevel || "Moderate",
    approvedBy: data.approvedBy || "Lead Advocate",
    sourceType: data.sourceType || "manual",
    sourceDocument: data.sourceDocument || undefined,
  });
}

/**
 * Fetches complete chronological history snapshots for a case.
 */
export async function getCaseCompassHistory(caseId: string, studentId?: number): Promise<CaseCompassHistory[]> {
  const cid = cleanCaseId(caseId);
  const memList = memoryHistory.get(cid);
  if (memList && memList.length > 0) {
    return [...memList].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }

  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.select().from(caseCompassHistory);
    let rows: CaseCompassHistory[] = [];

    if (cid && studentId) {
      rows = await query
        .where(or(eq(caseCompassHistory.caseId, cid), eq(caseCompassHistory.studentId, studentId)))
        .orderBy(desc(caseCompassHistory.savedAt));
    } else if (cid) {
      rows = await query
        .where(eq(caseCompassHistory.caseId, cid))
        .orderBy(desc(caseCompassHistory.savedAt));
    } else if (studentId) {
      rows = await query
        .where(eq(caseCompassHistory.studentId, studentId))
        .orderBy(desc(caseCompassHistory.savedAt));
    }

    if (rows && rows.length > 0) {
      memoryHistory.set(cid, rows);
      return rows;
    }
  } catch (err) {
    console.warn("[Compass DB] Error fetching history:", err);
  }

  return [];
}

/**
 * Fetches all pending and recent drafts for a case.
 */
export async function getCaseCompassDrafts(caseId: string, studentId?: number): Promise<CaseCompassDraft[]> {
  const cid = cleanCaseId(caseId);
  const mem = Array.from(memoryDrafts.values()).filter(
    (d) => d.caseId === cid || (studentId && d.studentId === studentId)
  );
  if (mem.length > 0) {
    return mem.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const db = await getDb();
  if (!db) return [];

  try {
    let rows: CaseCompassDraft[] = [];
    if (cid && studentId) {
      rows = await db
        .select()
        .from(caseCompassDrafts)
        .where(or(eq(caseCompassDrafts.caseId, cid), eq(caseCompassDrafts.studentId, studentId)))
        .orderBy(desc(caseCompassDrafts.createdAt));
    } else if (cid) {
      rows = await db
        .select()
        .from(caseCompassDrafts)
        .where(eq(caseCompassDrafts.caseId, cid))
        .orderBy(desc(caseCompassDrafts.createdAt));
    } else if (studentId) {
      rows = await db
        .select()
        .from(caseCompassDrafts)
        .where(eq(caseCompassDrafts.studentId, studentId))
        .orderBy(desc(caseCompassDrafts.createdAt));
    }

    return rows;
  } catch (err) {
    console.warn("[Compass DB] Error fetching drafts:", err);
    return [];
  }
}

/**
 * Gets a single draft by ID.
 */
export async function getCaseCompassDraftById(id: number): Promise<CaseCompassDraft | null> {
  const db = await getDb();
  if (db) {
    try {
      const [row] = await db
        .select()
        .from(caseCompassDrafts)
        .where(eq(caseCompassDrafts.id, id))
        .limit(1);
      if (row) {
        memoryDrafts.set(id, row);
        return row;
      }
    } catch (err) {
      console.warn("[Compass DB] Error fetching draft by id:", err);
    }
  }

  return memoryDrafts.get(id) ?? null;
}

/**
 * Saves a new AI or manual draft.
 * Implements deduplication to avoid creating duplicate drafts for the same meetingId / transcriptId.
 */
export async function createCaseCompassDraft(data: {
  caseId: string;
  studentId?: number;
  currentStatus: string;
  nextStep: string;
  whoHasBall: string;
  ideaRiskLevel?: string;
  sourceType?: string;
  meetingId?: string;
  transcriptId?: string;
  sourceReferences?: string;
  unresolvedIssues?: string;
  aiModel?: string;
  createdBy?: string;
}): Promise<CaseCompassDraft> {
  const cid = cleanCaseId(data.caseId);
  const db = await getDb();

  // Deduplication check: if a pending draft with same meetingId/transcriptId exists, update and return it
  if (data.meetingId || data.transcriptId) {
    const existingDrafts = await getCaseCompassDrafts(cid, data.studentId);
    const dup = existingDrafts.find(
      (d) =>
        d.status === "pending" &&
        ((data.meetingId && d.meetingId === data.meetingId) ||
          (data.transcriptId && d.transcriptId === data.transcriptId))
    );

    if (dup) {
      return await updateCaseCompassDraft(dup.id, {
        currentStatus: data.currentStatus,
        nextStep: data.nextStep,
        whoHasBall: data.whoHasBall,
        ideaRiskLevel: data.ideaRiskLevel || dup.ideaRiskLevel,
        sourceReferences: data.sourceReferences ?? dup.sourceReferences,
        unresolvedIssues: data.unresolvedIssues ?? dup.unresolvedIssues,
        aiModel: data.aiModel ?? dup.aiModel,
      });
    }
  }

  const draftToInsert: InsertCaseCompassDraft = {
    caseId: cid,
    studentId: data.studentId ?? null,
    currentStatus: data.currentStatus,
    nextStep: data.nextStep,
    whoHasBall: data.whoHasBall,
    ideaRiskLevel: data.ideaRiskLevel || "Moderate",
    status: "pending",
    sourceType: data.sourceType || "ai",
    meetingId: data.meetingId ?? null,
    transcriptId: data.transcriptId ?? null,
    sourceReferences: data.sourceReferences ?? null,
    unresolvedIssues: data.unresolvedIssues ?? null,
    aiModel: data.aiModel ?? null,
    createdBy: data.createdBy || "Waypoint AI Engine",
  };

  try {
    if (db) {
      const res = await db.insert(caseCompassDrafts).values(draftToInsert);
      const insertedId = (res as any)?.insertId || (res as any)?.[0]?.insertId;
      if (insertedId) {
        const created = await getCaseCompassDraftById(Number(insertedId));
        if (created) return created;
      }
    }
  } catch (err) {
    console.warn("[Compass DB] Insert draft failed, using in-memory:", err);
  }

  const fallbackId = ++draftIdCounter;
  const fallbackDraft: CaseCompassDraft = {
    id: fallbackId,
    caseId: cid,
    studentId: data.studentId ?? null,
    currentStatus: data.currentStatus,
    nextStep: data.nextStep,
    whoHasBall: data.whoHasBall,
    ideaRiskLevel: data.ideaRiskLevel || "Moderate",
    status: "pending",
    sourceType: data.sourceType || "ai",
    meetingId: data.meetingId ?? null,
    transcriptId: data.transcriptId ?? null,
    sourceReferences: data.sourceReferences ?? null,
    unresolvedIssues: data.unresolvedIssues ?? null,
    aiModel: data.aiModel ?? null,
    createdBy: data.createdBy || "Waypoint AI Engine",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memoryDrafts.set(fallbackId, fallbackDraft);
  return fallbackDraft;
}

/**
 * Updates an existing draft's fields.
 */
export async function updateCaseCompassDraft(
  id: number,
  data: Partial<InsertCaseCompassDraft>
): Promise<CaseCompassDraft> {
  const db = await getDb();

  try {
    if (db) {
      await db
        .update(caseCompassDrafts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(caseCompassDrafts.id, id));
    }
  } catch (err) {
    console.warn("[Compass DB] Update draft DB failed, using memory:", err);
  }

  const existing = memoryDrafts.get(id);
  const merged: CaseCompassDraft = {
    ...(existing || {}),
    ...data,
    id,
    updatedAt: new Date(),
  } as CaseCompassDraft;
  memoryDrafts.set(id, merged);
  return merged;
}

/**
 * Rejects a draft with reviewer attribution.
 */
export async function rejectCaseCompassDraft(id: number, reviewedBy: string): Promise<CaseCompassDraft> {
  return await updateCaseCompassDraft(id, {
    status: "rejected",
    reviewedBy,
    reviewedAt: new Date(),
  });
}

export interface ApproveAndPublishInput {
  caseId: string;
  studentId?: number;
  currentStatus: string;
  nextStep: string;
  whoHasBall: string;
  ideaRiskLevel: string;
  nextMeetingDate?: Date | null;
  approvedBy: string;
  sourceType?: string;
  sourceDocument?: string;
  unresolvedIssues?: string | string[];
  draftId?: number;
}

/**
 * Core publishing workflow:
 * 1. Retrieves current published record.
 * 2. If existing, creates complete immutable historical snapshot in caseCompassHistory.
 * 3. Increments version number.
 * 4. Upserts authoritative published caseCompass record.
 * 5. If draftId provided, marks draft as approved with reviewedAt and reviewedBy.
 * 6. Records publication event in Activity Timeline (caseActivityTimeline).
 * 7. Returns updated published record.
 */
export async function approveAndPublishCaseCompass(input: ApproveAndPublishInput): Promise<CaseCompass> {
  const cid = cleanCaseId(input.caseId);
  const db = await getDb();

  const existing = await getCaseCompass(cid, input.studentId);
  const prevVersion = existing?.version || 1;
  const newVersion = existing ? prevVersion + 1 : 1;

  const normalizedUnresolved = Array.isArray(input.unresolvedIssues)
    ? JSON.stringify(input.unresolvedIssues)
    : input.unresolvedIssues ?? existing?.unresolvedIssues ?? null;

  // 1. If previous published version exists, save complete immutable snapshot into caseCompassHistory
  if (existing) {
    const historyItem: InsertCaseCompassHistory = {
      caseId: cid,
      studentId: existing.studentId || input.studentId || null,
      version: existing.version || 1,
      currentStatus: existing.currentStatus,
      lastMeetingSummary: existing.lastMeetingSummary,
      nextStep: existing.nextStep,
      whoHasBall: existing.whoHasBall,
      ideaRiskLevel: existing.ideaRiskLevel || "Moderate",
      nextMeetingDate: existing.nextMeetingDate,
      approvedBy: existing.approvedBy || "Initial Record",
      sourceType: existing.sourceType || "manual",
      sourceDocument: existing.sourceDocument || null,
      unresolvedIssues: existing.unresolvedIssues || null,
      savedAt: new Date(),
    };

    try {
      if (db) {
        await db.insert(caseCompassHistory).values(historyItem);
      }
    } catch (err) {
      console.warn("[Compass DB] Failed to insert into caseCompassHistory, using memory:", err);
    }

    const currentHistory = memoryHistory.get(cid) || [];
    currentHistory.unshift({
      id: Date.now(),
      ...historyItem,
      savedAt: new Date(),
    } as CaseCompassHistory);
    memoryHistory.set(cid, currentHistory);
  }

  // 2. Publish new version to caseCompass
  const newPublishedData: Partial<InsertCaseCompass> = {
    caseId: cid,
    studentId: input.studentId || existing?.studentId || null,
    version: newVersion,
    currentStatus: input.currentStatus,
    nextStep: input.nextStep,
    whoHasBall: input.whoHasBall,
    ideaRiskLevel: input.ideaRiskLevel,
    nextMeetingDate: input.nextMeetingDate !== undefined ? input.nextMeetingDate : existing?.nextMeetingDate ?? null,
    approvedBy: input.approvedBy,
    sourceType: input.sourceType || "manual",
    sourceDocument: input.sourceDocument || null,
    unresolvedIssues: normalizedUnresolved,
    updatedAt: new Date(),
  };

  try {
    if (db) {
      if (existing) {
        await db
          .update(caseCompass)
          .set(newPublishedData)
          .where(eq(caseCompass.caseId, cid));
      } else {
        await db.insert(caseCompass).values({
          ...newPublishedData,
          caseId: cid,
          createdAt: new Date(),
        } as InsertCaseCompass);
      }
    }
  } catch (err) {
    console.warn("[Compass DB] Failed to upsert caseCompass DB, using memory:", err);
  }

  const publishedRecord: CaseCompass = {
    id: existing?.id || 1,
    caseId: cid,
    studentId: input.studentId || existing?.studentId || null,
    version: newVersion,
    currentStatus: input.currentStatus,
    lastMeetingSummary: existing?.lastMeetingSummary || null,
    nextStep: input.nextStep,
    whoHasBall: input.whoHasBall,
    ideaRiskLevel: input.ideaRiskLevel,
    nextMeetingDate: input.nextMeetingDate !== undefined ? input.nextMeetingDate : existing?.nextMeetingDate ?? null,
    approvedBy: input.approvedBy,
    sourceType: input.sourceType || "manual",
    sourceDocument: input.sourceDocument || null,
    unresolvedIssues: normalizedUnresolved,
    updatedAt: new Date(),
    createdAt: existing?.createdAt || new Date(),
  };

  memoryCompass.set(cid, publishedRecord);

  // 3. Mark draft as approved if draftId was provided
  if (input.draftId) {
    try {
      await updateCaseCompassDraft(input.draftId, {
        status: "approved",
        reviewedBy: input.approvedBy,
        reviewedAt: new Date(),
      });
    } catch (err) {
      console.warn("[Compass DB] Failed to mark draft approved:", err);
    }
  }

  // 4. Record publication into Activity Timeline (PG-030 Timeline)
  try {
    const studentContactId = input.studentId || existing?.studentId;
    if (studentContactId && studentContactId > 0) {
      await createCaseActivityItem({
        studentContactId,
        caseId: cid,
        eventType: "compass_update",
        title: `Case Compass Published (v${newVersion})`,
        description: `Approved update: ${input.currentStatus.slice(0, 140)}${
          input.currentStatus.length > 140 ? "..." : ""
        } · IDEA Risk Level: ${input.ideaRiskLevel} · Ball: ${input.whoHasBall}`,
        ownerName: input.approvedBy,
        ownerRole: "Lead Advocate",
        eventDate: new Date(),
      });
    }
  } catch (activityErr) {
    console.warn("[Compass DB] Timeline activity record notice:", activityErr);
  }

  return publishedRecord;
}

export interface AvailableCompassTranscript {
  id: string;
  source: "first_mate" | "meeting_workspace" | "appointment" | "discovery_call";
  sourceLabel: string;
  title: string;
  meetingType: string;
  date: string;
  turnCount?: number;
  wordCount: number;
  durationSeconds?: number;
  summary?: string;
  snippet?: string;
  fullTranscriptText: string;
}

export interface AvailableCompassTranscriptsResult {
  sessions: AvailableCompassTranscript[];
  latestSession: AvailableCompassTranscript | null;
  totalAvailable: number;
  connectedServices: {
    firstMate: boolean;
    meetingWorkspace: boolean;
    calendarAppointments: boolean;
    discoveryCalls: boolean;
  };
}

/**
 * Resolves all available meeting transcripts and closeout summaries for a student.
 * Scans First Mate audio runs, Meeting Workspace closeouts, and completed Calendar appointments.
 */
export async function getAvailableCompassTranscripts(
  studentId: number
): Promise<AvailableCompassTranscriptsResult> {
  const sessions: AvailableCompassTranscript[] = [];
  const seenIds = new Set<string>();

  // 1. In-memory First Mate session runs (for live sessions, offline resilience, and testing)
  try {
    const memRuns = firstMateSessionStore.listRecordedRuns({ studentContactId: studentId } as any);
    for (const r of memRuns) {
      if (seenIds.has(r.sessionId)) continue;
      seenIds.add(r.sessionId);

      let text = "";
      let turnCount = (r as any).turnCount || 0;
      let snippet = "";

      let rawEvents: any[] | null = null;
      if (Array.isArray(r.transcript)) {
        rawEvents = r.transcript;
      } else if ((r as any).transcriptJson) {
        try {
          rawEvents = JSON.parse((r as any).transcriptJson);
        } catch {}
      }

      if (Array.isArray(rawEvents) && rawEvents.length > 0) {
        turnCount = rawEvents.length;
        text = rawEvents.map((e: any) => `${e.speakerRole || "Speaker"}: ${e.text || ""}`).join("\n");
        snippet = rawEvents
          .slice(0, 3)
          .map((e: any) => `${e.speakerRole || "Speaker"}: ${e.text || ""}`)
          .join(" | ");
      }
      if (!text && r.summary) {
        text = r.summary;
        snippet = r.summary.slice(0, 160);
      }

      const wordCount = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

      sessions.push({
        id: r.sessionId,
        source: "first_mate",
        sourceLabel: "First Mate Audio Session",
        title: r.title || "First Mate Live Advocacy Session",
        meetingType: r.sessionType || "IEP Meeting",
        date: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        turnCount,
        wordCount,
        durationSeconds: r.durationSeconds || 0,
        summary: r.summary || undefined,
        snippet: snippet || "Live transcribed meeting turns",
        fullTranscriptText: text,
      });
    }
  } catch (err) {
    console.warn("[Compass DB] Error reading in-memory first mate runs:", err);
  }

  // 2. Database First Mate sessions
  const db = await getDb();
  if (db) {
    try {
      const dbFmSessions = await db
        .select()
        .from(firstMateSessions)
        .where(eq(firstMateSessions.studentContactId, studentId))
        .orderBy(desc(firstMateSessions.createdAt))
        .limit(25);

      for (const r of dbFmSessions) {
        if (seenIds.has(r.sessionId)) continue;
        seenIds.add(r.sessionId);

        let text = "";
        let turnCount = 0;
        let snippet = "";

        if (r.transcriptJson) {
          try {
            const events = JSON.parse(r.transcriptJson);
            if (Array.isArray(events) && events.length > 0) {
              turnCount = events.length;
              text = events.map((e: any) => `${e.speakerRole || "Speaker"}: ${e.text || ""}`).join("\n");
              snippet = events
                .slice(0, 3)
                .map((e: any) => `${e.speakerRole || "Speaker"}: ${e.text || ""}`)
                .join(" | ");
            }
          } catch {}
        }
        if (!text && r.summary) {
          text = r.summary;
          snippet = r.summary.slice(0, 160);
        }

        const wordCount = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

        sessions.push({
          id: r.sessionId,
          source: "first_mate",
          sourceLabel: "First Mate Audio Session",
          title: r.title || "First Mate Live Advocacy Session",
          meetingType: r.sessionType || "IEP Meeting",
          date: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          turnCount,
          wordCount,
          durationSeconds: r.durationSeconds || 0,
          summary: r.summary || undefined,
          snippet: snippet || "Live transcribed meeting turns",
          fullTranscriptText: text,
        });
      }
    } catch (err) {
      console.warn("[Compass DB] Error reading DB first mate sessions:", err);
    }

    // 3. Database Meeting Workspaces
    try {
      const mwRows = await db
        .select()
        .from(meetingWorkspaces)
        .where(eq(meetingWorkspaces.studentContactId, studentId))
        .orderBy(desc(meetingWorkspaces.updatedAt))
        .limit(20);

      for (const mw of mwRows) {
        const mwKey = `mw-${mw.id}`;
        if (seenIds.has(mwKey)) continue;
        seenIds.add(mwKey);

        let summaryObj: any = null;
        if (mw.completedSummary) {
          try {
            summaryObj = JSON.parse(mw.completedSummary);
          } catch {}
        }

        const agreed = summaryObj?.agreedTargets || [];
        const denied = summaryObj?.deniedTargets || [];
        const pwn = summaryObj?.pwnTargets || [];
        const notes = summaryObj?.notes || "";

        const textParts = [
          `Meeting Workspace: ${mw.title || mw.meetingType}`,
          `Status: ${mw.status}`,
          notes ? `Closeout Notes: ${notes}` : "",
          agreed.length ? `Agreed Targets (${agreed.length}): ${agreed.join(", ")}` : "",
          pwn.length ? `Prior Written Notice Flags (${pwn.length}): ${pwn.join(", ")}` : "",
          denied.length ? `Denied Requests (${denied.length}): ${denied.join(", ")}` : "",
          mw.parentConcernStatement ? `Parent Concerns: ${mw.parentConcernStatement}` : "",
        ].filter(Boolean);

        const fullText = textParts.join("\n\n");
        const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
        const totalItems = agreed.length + denied.length + pwn.length;

        const snippet =
          agreed.length > 0
            ? `Agreed: ${agreed.slice(0, 2).join(", ")}${
                pwn.length ? ` • PWN: ${pwn.slice(0, 2).join(", ")}` : ""
              }`
            : notes
            ? notes.slice(0, 160)
            : `${mw.status} workspace session`;

        const dateVal = mw.completedAt || mw.updatedAt || mw.createdAt;

        sessions.push({
          id: mwKey,
          source: "meeting_workspace",
          sourceLabel: "Meeting Workspace Closeout",
          title: mw.title || "IEP Meeting Workspace",
          meetingType: mw.meetingType || "Annual IEP Meeting",
          date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
          turnCount: totalItems,
          wordCount,
          summary: notes || undefined,
          snippet,
          fullTranscriptText: fullText,
        });
      }
    } catch (err) {
      console.warn("[Compass DB] Error reading DB meeting workspaces:", err);
    }

    // 4. Database Appointments (Completed meetings with notes)
    try {
      const apptRows = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.clientId, studentId),
            eq(appointments.status, "Completed")
          )
        )
        .orderBy(desc(appointments.startTime))
        .limit(10);

      for (const a of apptRows) {
        const apptKey = `appt-${a.id}`;
        if (seenIds.has(apptKey)) continue;
        seenIds.add(apptKey);

        const notes = (a as any).notes || (a as any).description || "";
        const fullText = `Appointment: ${a.title || "Advocacy Session"}\nStatus: Completed\nNotes: ${notes}`;
        const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

        sessions.push({
          id: apptKey,
          source: "appointment",
          sourceLabel: "Completed Calendar Session",
          title: a.title || "Completed IEP/504 Appointment",
          meetingType: (a as any).meetingType || (a as any).appointmentType || "Advocacy Meeting",
          date: a.startTime ? new Date(a.startTime).toISOString() : new Date().toISOString(),
          wordCount,
          summary: notes || undefined,
          snippet: notes ? notes.slice(0, 160) : "Completed advocacy appointment",
          fullTranscriptText: fullText,
        });
      }
    } catch (err) {
      console.warn("[Compass DB] Error reading DB appointments:", err);
    }

    // 5. Database Discovery Calls (Firm Foundation Kickoff notes & transcript)
    try {
      // Find student's parent contactId if available
      let parentId: number | null = null;
      try {
        const [studentRow] = await db
          .select({ parentId: (contacts as any).parentId })
          .from(contacts)
          .where(eq(contacts.id, studentId))
          .limit(1);
        if (studentRow?.parentId) parentId = Number(studentRow.parentId);
      } catch {}

      const dcConditions = [
        eq(discoveryCalls.studentContactId, studentId),
        eq(discoveryCalls.contactId, studentId),
      ];
      if (parentId) {
        dcConditions.push(eq(discoveryCalls.contactId, parentId));
      }

      const dcRows = await db
        .select()
        .from(discoveryCalls)
        .where(or(...dcConditions))
        .orderBy(desc(discoveryCalls.createdAt))
        .limit(10);

      for (const dc of dcRows) {
        const dcKey = `disc-${dc.id}`;
        if (seenIds.has(dcKey)) continue;
        seenIds.add(dcKey);

        const parts = [
          "=== WAYPOINT ADVOCATES DISCOVERY CALL RECORD ===",
          dc.theirStoryNotes ? `Family Story & Student Background:\n${dc.theirStoryNotes}` : "",
          dc.questionNotes ? `Intake Question Notes:\n${dc.questionNotes}` : "",
          dc.callScriptNotes ? `Advocate Assessment Notes:\n${dc.callScriptNotes}` : "",
          dc.pricingNotes ? `Advocacy Scope Notes:\n${dc.pricingNotes}` : "",
          dc.closingResponse ? `Client Commitment Status: ${dc.closingResponse}` : "",
          dc.additionalNotes ? `Agreed Next Steps:\n${dc.additionalNotes}` : "",
        ].filter(Boolean);

        const fullText = parts.join("\n\n");
        const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
        const turnCount = [
          dc.theirStoryNotes,
          dc.questionNotes,
          dc.callScriptNotes,
          dc.additionalNotes,
        ].filter(Boolean).length;

        const dateVal = dc.completedAt || dc.scheduledAt || dc.createdAt;

        sessions.push({
          id: dcKey,
          source: "discovery_call",
          sourceLabel: "Discovery Call & Intake",
          title: "Discovery Call (Firm Foundation Kickoff)",
          meetingType: "Discovery Call",
          date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
          turnCount,
          wordCount,
          summary: dc.theirStoryNotes || dc.additionalNotes || undefined,
          snippet: dc.theirStoryNotes
            ? dc.theirStoryNotes.slice(0, 160)
            : dc.additionalNotes
            ? dc.additionalNotes.slice(0, 160)
            : "Client intake & discovery session",
          fullTranscriptText: fullText,
        });
      }
    } catch (err) {
      console.warn("[Compass DB] Error reading DB discovery calls:", err);
    }
  }

  // Sort all sessions by date descending
  sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    sessions,
    latestSession: sessions[0] || null,
    totalAvailable: sessions.length,
    connectedServices: {
      firstMate: true,
      meetingWorkspace: true,
      calendarAppointments: true,
      discoveryCalls: true,
    },
  };
}


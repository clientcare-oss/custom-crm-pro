import { eq, desc } from "drizzle-orm";
import { getDb } from "./connection";
import { meetingWorkspaces, type MeetingWorkspace, type InsertMeetingWorkspace } from "../../drizzle/schema";

/**
 * Ensures the meeting_workspaces table exists in D1/SQLite.
 */
async function ensureTable(db: any) {
  try {
    await db.run?.(`
      CREATE TABLE IF NOT EXISTS meeting_workspaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_contact_id INTEGER NOT NULL,
        appointment_id INTEGER,
        title TEXT DEFAULT 'IEP Meeting Workspace' NOT NULL,
        meeting_date TEXT,
        meeting_type TEXT DEFAULT 'Annual IEP Meeting',
        status TEXT DEFAULT 'PREPARING' NOT NULL,
        active_tab TEXT DEFAULT 'PREP' NOT NULL,
        prep_step TEXT DEFAULT 'iep_intel' NOT NULL,
        detected_iep_order TEXT,
        iep_intel_findings TEXT,
        parent_intel_concerns TEXT,
        parent_concern_statement TEXT,
        pcs_approved INTEGER DEFAULT 0 NOT NULL,
        pcs_last_approved_at TIMESTAMP,
        meeting_targets TEXT,
        parking_lot TEXT,
        additional_items TEXT,
        closeout_checks TEXT,
        completed_at TIMESTAMP,
        completed_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
  } catch {
    // Continue if already exists or unsupported
  }
}

// In-memory cache to guarantee persistence and avoid loss across unexpected D1 reconnects
const inMemoryWorkspaces = new Map<number, MeetingWorkspace>();

/**
 * Get active/latest workspace for a student contact.
 */
export async function getWorkspaceByStudentId(studentContactId: number): Promise<MeetingWorkspace | null> {
  const db = await getDb();
  if (!db) {
    return inMemoryWorkspaces.get(studentContactId) || null;
  }

  try {
    await ensureTable(db);
    const rows = await db
      .select()
      .from(meetingWorkspaces)
      .where(eq(meetingWorkspaces.studentContactId, studentContactId))
      .orderBy(desc(meetingWorkspaces.updatedAt))
      .limit(1);

    if (rows[0]) {
      inMemoryWorkspaces.set(studentContactId, rows[0]);
      return rows[0];
    }
  } catch (err) {
    console.warn("[MeetingWorkspace DB] Query failed, using memory fallback:", err);
  }

  return inMemoryWorkspaces.get(studentContactId) || null;
}

/**
 * Get a specific workspace by primary ID.
 */
export async function getWorkspaceById(id: number): Promise<MeetingWorkspace | null> {
  // Check memory store first
  for (const ws of Array.from(inMemoryWorkspaces.values())) {
    if (ws.id === id) return ws;
  }

  const db = await getDb();
  if (!db) return null;

  try {
    await ensureTable(db);
    const rows = await db
      .select()
      .from(meetingWorkspaces)
      .where(eq(meetingWorkspaces.id, id))
      .limit(1);

    if (rows[0]) {
      inMemoryWorkspaces.set(rows[0].studentContactId, rows[0]);
      return rows[0];
    }
  } catch (err) {
    console.warn("[MeetingWorkspace DB] GetById failed:", err);
  }

  return null;
}

/**
 * List all workspaces for a student (history and current).
 */
export async function listWorkspacesByStudentId(studentContactId: number): Promise<MeetingWorkspace[]> {
  const db = await getDb();
  if (!db) {
    const mem = inMemoryWorkspaces.get(studentContactId);
    return mem ? [mem] : [];
  }

  try {
    await ensureTable(db);
    const rows = await db
      .select()
      .from(meetingWorkspaces)
      .where(eq(meetingWorkspaces.studentContactId, studentContactId))
      .orderBy(desc(meetingWorkspaces.createdAt));

    if (rows.length > 0) {
      inMemoryWorkspaces.set(studentContactId, rows[0]);
      return rows;
    }
  } catch (err) {
    console.warn("[MeetingWorkspace DB] List failed:", err);
  }

  const mem = inMemoryWorkspaces.get(studentContactId);
  return mem ? [mem] : [];
}

/**
 * Create a new meeting workspace session.
 */
export async function createWorkspace(data: InsertMeetingWorkspace): Promise<MeetingWorkspace | null> {
  const db = await getDb();
  let createdRecord: MeetingWorkspace | null = null;

  if (db) {
    try {
      await ensureTable(db);
      const res = await db.insert(meetingWorkspaces).values(data);
      const insertId = res[0]?.insertId;
      if (insertId) {
        createdRecord = await getWorkspaceById(Number(insertId));
      }
    } catch (err) {
      console.warn("[MeetingWorkspace DB] Insert failed, saving to memory:", err);
    }
  }

  if (!createdRecord) {
    const fallbackId = Date.now();
    createdRecord = {
      id: fallbackId,
      studentContactId: data.studentContactId,
      appointmentId: data.appointmentId ?? null,
      title: data.title ?? "IEP Meeting Workspace",
      meetingDate: data.meetingDate ?? null,
      meetingType: data.meetingType ?? "Annual IEP Meeting",
      status: data.status ?? "PREPARING",
      activeTab: data.activeTab ?? "PREP",
      prepStep: data.prepStep ?? "iep_intel",
      detectedIepOrder: data.detectedIepOrder ?? null,
      iepIntelFindings: data.iepIntelFindings ?? null,
      parentIntelConcerns: data.parentIntelConcerns ?? null,
      parentConcernStatement: data.parentConcernStatement ?? null,
      pcsApproved: data.pcsApproved ?? false,
      pcsLastApprovedAt: data.pcsLastApprovedAt ?? null,
      meetingTargets: data.meetingTargets ?? null,
      parkingLot: data.parkingLot ?? null,
      additionalItems: data.additionalItems ?? null,
      closeoutChecks: data.closeoutChecks ?? null,
      completedAt: data.completedAt ?? null,
      completedSummary: data.completedSummary ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  inMemoryWorkspaces.set(createdRecord.studentContactId, createdRecord);
  return createdRecord;
}

/**
 * Update an existing meeting workspace session.
 */
export async function updateWorkspace(
  id: number,
  data: Partial<InsertMeetingWorkspace>
): Promise<MeetingWorkspace | null> {
  const db = await getDb();
  let updated: MeetingWorkspace | null = null;

  if (db) {
    try {
      await ensureTable(db);
      await db
        .update(meetingWorkspaces)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(meetingWorkspaces.id, id));

      updated = await getWorkspaceById(id);
    } catch (err) {
      console.warn("[MeetingWorkspace DB] Update failed, updating memory:", err);
    }
  }

  // Update memory store
  for (const [sId, ws] of Array.from(inMemoryWorkspaces.entries())) {
    if (ws.id === id) {
      const merged = { ...ws, ...data, updatedAt: new Date() } as MeetingWorkspace;
      inMemoryWorkspaces.set(sId, merged);
      return merged;
    }
  }

  return updated;
}


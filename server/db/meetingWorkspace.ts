import { eq, desc } from "drizzle-orm";
import { getDb } from "./connection";
import { meetingWorkspaces, type MeetingWorkspace, type InsertMeetingWorkspace } from "../../drizzle/schema";

/**
 * Get active/latest workspace for a student contact.
 */
export async function getWorkspaceByStudentId(studentContactId: number): Promise<MeetingWorkspace | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(meetingWorkspaces)
    .where(eq(meetingWorkspaces.studentContactId, studentContactId))
    .orderBy(desc(meetingWorkspaces.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get a specific workspace by primary ID.
 */
export async function getWorkspaceById(id: number): Promise<MeetingWorkspace | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(meetingWorkspaces)
    .where(eq(meetingWorkspaces.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * List all workspaces for a student (history and current).
 */
export async function listWorkspacesByStudentId(studentContactId: number): Promise<MeetingWorkspace[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(meetingWorkspaces)
    .where(eq(meetingWorkspaces.studentContactId, studentContactId))
    .orderBy(desc(meetingWorkspaces.createdAt));
}

/**
 * Create a new meeting workspace session.
 */
export async function createWorkspace(data: InsertMeetingWorkspace): Promise<MeetingWorkspace | null> {
  const db = await getDb();
  if (!db) return null;
  const res = await db.insert(meetingWorkspaces).values(data);
  const insertId = res[0]?.insertId;
  if (!insertId) return null;
  return getWorkspaceById(Number(insertId));
}

/**
 * Update an existing meeting workspace session.
 */
export async function updateWorkspace(
  id: number,
  data: Partial<InsertMeetingWorkspace>
): Promise<MeetingWorkspace | null> {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(meetingWorkspaces)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(meetingWorkspaces.id, id));
  return getWorkspaceById(id);
}

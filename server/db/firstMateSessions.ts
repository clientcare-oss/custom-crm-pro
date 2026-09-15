import { eq, desc, and, like, or } from "drizzle-orm";
import { firstMateSessions, type FirstMateSessionRecord, type InsertFirstMateSessionRecord } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function saveFirstMateSessionRun(data: InsertFirstMateSessionRecord): Promise<FirstMateSessionRecord | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    // Check if session already exists
    const [existing] = await db
      .select()
      .from(firstMateSessions)
      .where(eq(firstMateSessions.sessionId, data.sessionId))
      .limit(1);

    if (existing) {
      await db
        .update(firstMateSessions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(firstMateSessions.sessionId, data.sessionId));

      const [updated] = await db
        .select()
        .from(firstMateSessions)
        .where(eq(firstMateSessions.sessionId, data.sessionId))
        .limit(1);
      return updated || null;
    }

    const insertResult = await db.insert(firstMateSessions).values(data);
    const insertId = Number((insertResult as any)?.insertId || (insertResult as any)?.lastInsertRowid || 0);

    if (insertId) {
      const [created] = await db
        .select()
        .from(firstMateSessions)
        .where(eq(firstMateSessions.id, insertId))
        .limit(1);
      return created || null;
    }

    const [createdFallback] = await db
      .select()
      .from(firstMateSessions)
      .where(eq(firstMateSessions.sessionId, data.sessionId))
      .limit(1);
    return createdFallback || null;
  } catch (err) {
    console.warn("[Database] Failed to save First Mate session run:", err);
    return null;
  }
}

export async function listFirstMateSessionRuns(filters?: {
  mode?: string;
  search?: string;
  studentContactId?: number;
  limit?: number;
}): Promise<FirstMateSessionRecord[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const conditions: any[] = [];

    if (filters?.mode && filters.mode !== "ALL") {
      conditions.push(eq(firstMateSessions.mode, filters.mode));
    }

    if (filters?.studentContactId) {
      conditions.push(eq(firstMateSessions.studentContactId, filters.studentContactId));
    }

    if (filters?.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          like(firstMateSessions.title, term),
          like(firstMateSessions.studentName, term),
          like(firstMateSessions.keyIssue, term),
          like(firstMateSessions.sayThis, term),
          like(firstMateSessions.advocateFeedback, term)
        )
      );
    }

    let query = db.select().from(firstMateSessions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const limit = filters?.limit || 100;
    const results = await (query as any).orderBy(desc(firstMateSessions.createdAt)).limit(limit);

    return results || [];
  } catch (err) {
    console.warn("[Database] Failed to list First Mate session runs:", err);
    return [];
  }
}

export async function getFirstMateSessionRunBySessionId(sessionId: string): Promise<FirstMateSessionRecord | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const [record] = await db
      .select()
      .from(firstMateSessions)
      .where(eq(firstMateSessions.sessionId, sessionId))
      .limit(1);

    return record || null;
  } catch (err) {
    console.warn("[Database] Failed to get First Mate session run:", err);
    return null;
  }
}

export async function updateFirstMateSessionFeedback(
  sessionId: string,
  data: { advocateRating?: number; advocateFeedback?: string; tags?: string }
): Promise<FirstMateSessionRecord | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    await db
      .update(firstMateSessions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(firstMateSessions.sessionId, sessionId));

    const [updated] = await db
      .select()
      .from(firstMateSessions)
      .where(eq(firstMateSessions.sessionId, sessionId))
      .limit(1);

    return updated || null;
  } catch (err) {
    console.warn("[Database] Failed to update First Mate session feedback:", err);
    return null;
  }
}

export async function deleteFirstMateSessionRun(sessionId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    await db.delete(firstMateSessions).where(eq(firstMateSessions.sessionId, sessionId));
    return true;
  } catch (err) {
    console.warn("[Database] Failed to delete First Mate session run:", err);
    return false;
  }
}

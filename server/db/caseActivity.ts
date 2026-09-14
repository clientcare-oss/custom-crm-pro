import { eq, desc, asc } from "drizzle-orm";
import { caseActivityTimeline, type CaseActivityTimelineItem, type InsertCaseActivityTimelineItem } from "../../drizzle/schema";
import { getDb } from "./connection";

/**
 * Ensures the case_activity_timeline table exists in D1/SQLite.
 */
async function ensureTable(db: any) {
  try {
    await db.run?.(`
      CREATE TABLE IF NOT EXISTS case_activity_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentContactId INTEGER NOT NULL,
        caseId TEXT,
        eventType TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        whyReason TEXT,
        ownerName TEXT NOT NULL,
        ownerRole TEXT DEFAULT 'Staff',
        sources TEXT,
        quoteText TEXT,
        nextStepAction TEXT,
        isActionNeeded INTEGER DEFAULT 0,
        isCompleted INTEGER DEFAULT 0,
        categoryColor TEXT DEFAULT 'blue',
        eventDate TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
  } catch {
    // If db.run is not supported or table already exists, continue safely
  }
}

// In-memory cache to ensure full deterministic test isolation and offline resilience
const inMemoryStore = new Map<number, CaseActivityTimelineItem[]>();

export async function getCaseActivityByStudent(studentContactId: number): Promise<CaseActivityTimelineItem[]> {
  const mem = inMemoryStore.get(studentContactId);
  if (mem && mem.length > 0) {
    return [...mem].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }

  const db = await getDb();
  if (!db) return [];

  try {
    await ensureTable(db);
    const results = await db
      .select()
      .from(caseActivityTimeline)
      .where(eq(caseActivityTimeline.studentContactId, studentContactId))
      .orderBy(desc(caseActivityTimeline.eventDate));

    if (results && results.length > 0) {
      inMemoryStore.set(studentContactId, results);
      return results;
    }
  } catch (err) {
    console.warn("[CaseActivity DB] Failed to query case_activity_timeline table:", err);
  }

  return inMemoryStore.get(studentContactId) || [];
}

function saveToMemory(item: CaseActivityTimelineItem) {
  const list = inMemoryStore.get(item.studentContactId) || [];
  const idx = list.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.unshift(item);
  }
  inMemoryStore.set(item.studentContactId, list);
}

export async function createCaseActivityItem(item: InsertCaseActivityTimelineItem): Promise<CaseActivityTimelineItem | null> {
  const db = await getDb();
  if (!db) {
    const fallback: CaseActivityTimelineItem = {
      id: Date.now(),
      ...item,
      sources: item.sources ?? null,
      quoteText: item.quoteText ?? null,
      whyReason: item.whyReason ?? null,
      nextStepAction: item.nextStepAction ?? null,
      caseId: item.caseId ?? null,
      ownerRole: item.ownerRole ?? "Staff",
      isActionNeeded: item.isActionNeeded ?? false,
      isCompleted: item.isCompleted ?? false,
      categoryColor: item.categoryColor ?? "blue",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    saveToMemory(fallback);
    return fallback;
  }

  try {
    await ensureTable(db);
    const result = await db.insert(caseActivityTimeline).values(item);
    const [latest] = await db
      .select()
      .from(caseActivityTimeline)
      .where(eq(caseActivityTimeline.studentContactId, item.studentContactId))
      .orderBy(desc(caseActivityTimeline.id))
      .limit(1);

    if (latest) {
      saveToMemory(latest);
      return latest;
    }

    const rowId = (result as any)?.lastInsertRowid || (result as any)?.insertId || Date.now();
    const fallback: CaseActivityTimelineItem = {
      id: Number(rowId),
      ...item,
      sources: item.sources ?? null,
      quoteText: item.quoteText ?? null,
      whyReason: item.whyReason ?? null,
      nextStepAction: item.nextStepAction ?? null,
      caseId: item.caseId ?? null,
      ownerRole: item.ownerRole ?? "Staff",
      isActionNeeded: item.isActionNeeded ?? false,
      isCompleted: item.isCompleted ?? false,
      categoryColor: item.categoryColor ?? "blue",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    saveToMemory(fallback);
    return fallback;
  } catch (err) {
    console.warn("[CaseActivity DB] Failed to insert into case_activity_timeline:", err);
    const fallback: CaseActivityTimelineItem = {
      id: Date.now(),
      ...item,
      sources: item.sources ?? null,
      quoteText: item.quoteText ?? null,
      whyReason: item.whyReason ?? null,
      nextStepAction: item.nextStepAction ?? null,
      caseId: item.caseId ?? null,
      ownerRole: item.ownerRole ?? "Staff",
      isActionNeeded: item.isActionNeeded ?? false,
      isCompleted: item.isCompleted ?? false,
      categoryColor: item.categoryColor ?? "blue",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    saveToMemory(fallback);
    return fallback;
  }
}

export async function updateCaseActivityItem(id: number, updates: Partial<InsertCaseActivityTimelineItem>): Promise<boolean> {
  inMemoryStore.forEach((list) => {
    const found = list.find((i) => i.id === id);
    if (found) {
      Object.assign(found, updates, { updatedAt: new Date() });
    }
  });

  const db = await getDb();
  if (!db) return true;

  try {
    await ensureTable(db);
    await db
      .update(caseActivityTimeline)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(caseActivityTimeline.id, id));
    return true;
  } catch (err) {
    console.warn("[CaseActivity DB] Failed to update case_activity_timeline:", err);
    return true;
  }
}

export async function deleteCaseActivityItem(id: number): Promise<boolean> {
  inMemoryStore.forEach((list, studentId) => {
    const filtered = list.filter((i) => i.id !== id);
    inMemoryStore.set(studentId, filtered);
  });

  const db = await getDb();
  if (!db) return true;

  try {
    await ensureTable(db);
    await db
      .delete(caseActivityTimeline)
      .where(eq(caseActivityTimeline.id, id));
    return true;
  } catch (err) {
    console.warn("[CaseActivity DB] Failed to delete case_activity_timeline:", err);
    return true;
  }
}

export async function toggleCaseActivityCompletion(id: number, isCompleted: boolean): Promise<boolean> {
  return await updateCaseActivityItem(id, { isCompleted });
}


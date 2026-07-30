import { eq, desc } from "drizzle-orm";
import { caseCompass, caseCompassHistory, InsertCaseCompass } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function getCaseCompass(caseId: string) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(caseCompass)
    .where(eq(caseCompass.caseId, caseId))
    .limit(1);

  return row ?? null;
}

export async function updateCaseCompass(caseId: string, data: Partial<InsertCaseCompass>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getCaseCompass(caseId);

  if (existing) {
    await db
      .update(caseCompass)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(caseCompass.caseId, caseId));
  } else {
    await db.insert(caseCompass).values({
      caseId,
      ...data,
    });
  }

  const updated = await getCaseCompass(caseId);
  if (updated) {
    await db.insert(caseCompassHistory).values({
      caseId,
      currentStatus: updated.currentStatus,
      lastMeetingSummary: updated.lastMeetingSummary,
      nextStep: updated.nextStep,
      whoHasBall: updated.whoHasBall,
      nextMeetingDate: updated.nextMeetingDate,
    });
  }

  return updated;
}

export async function upsertCaseCompass(caseId: string, data: {
  currentStatus?: string | null;
  lastMeetingSummary?: string | null;
  nextStep?: string | null;
  whoHasBall?: string | null;
  nextMeetingDate?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getCaseCompass(caseId);
  if (existing) {
    await db.insert(caseCompassHistory).values({
      caseId,
      currentStatus: existing.currentStatus,
      lastMeetingSummary: existing.lastMeetingSummary,
      nextStep: existing.nextStep,
      whoHasBall: existing.whoHasBall,
      nextMeetingDate: existing.nextMeetingDate,
    });
  }

  await db.insert(caseCompass)
    .values({ caseId, ...data })
    .onConflictDoUpdate({ target: caseCompass.caseId, set: data });

  return await getCaseCompass(caseId);
}

export async function getCaseCompassHistory(caseId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(caseCompassHistory)
    .where(eq(caseCompassHistory.caseId, caseId))
    .orderBy(desc(caseCompassHistory.savedAt));
}

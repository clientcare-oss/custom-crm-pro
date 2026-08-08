import { eq, and, desc, asc } from "drizzle-orm";
import { voyageLogs } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function getVoyageLogsForStudent(contactId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(voyageLogs)
    .where(eq(voyageLogs.contactId, contactId))
    .orderBy(desc(voyageLogs.recordingDate));
}

export async function getVoyageLogsForParent(portalUserId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(voyageLogs)
    .where(eq(voyageLogs.portalUserId, portalUserId))
    .orderBy(desc(voyageLogs.recordingDate));
}

export async function createVoyageLog(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertResult = await db.insert(voyageLogs).values(data);
  const insertId = Number(insertResult.lastInsertRowid || 0);
  
  if (insertId) {
    const records = await db.select().from(voyageLogs).where(eq(voyageLogs.id, insertId)).limit(1);
    return records[0];
  }
  return null;
}

export async function updateVoyageLog(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(voyageLogs)
    .set(data)
    .where(eq(voyageLogs.id, id));
    
  const records = await db.select().from(voyageLogs).where(eq(voyageLogs.id, id)).limit(1);
  return records[0];
}

export async function getVoyageLogById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(voyageLogs)
    .where(eq(voyageLogs.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

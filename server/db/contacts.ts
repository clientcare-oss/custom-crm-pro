import { eq, and, desc, asc } from "drizzle-orm";
import { contacts } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function getContactsByOwner(ownerId?: number) {
  const db = await getDb();
  if (!db) return [];

  // Practice CRM: Return all contacts across the practice
  return await db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.createdAt));
}

export async function getContactById(id: number, ownerId?: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getContactByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const [result] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.email, email))
    .limit(1);

  return result ?? undefined;
}

export async function createContact(data: any, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Auto-generate a unique caseId in WP-YYYY-NNNN format
  const year = new Date().getFullYear();
  const countResult = await db.select().from(contacts);
  const nextNum = String(countResult.length + 1).padStart(4, "0");
  const caseId = `WP-${year}-${nextNum}`;

  const result = await db.insert(contacts).values({
    ...data,
    ownerId,
    caseId,
  });

  return result;
}

export async function updateContact(id: number, ownerId: number, data: any): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    return await db
      .update(contacts)
      .set(data)
      .where(eq(contacts.id, id));
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("no such column")) {
      const colMatch = msg.match(/no such column:\s*([a-zA-Z0-9_]+)/i);
      const missingCol = colMatch ? colMatch[1] : null;
      if (missingCol && data[missingCol] !== undefined) {
        const nextData = { ...data };
        delete nextData[missingCol];
        return await updateContact(id, ownerId, nextData);
      }
      const coreKeys = [
        "firstName", "lastName", "email", "phone", "company", "jobTitle", "address", "city",
        "state", "zipCode", "country", "notes", "dateOfBirth", "diagnosis", "schoolName",
        "gradeLevel", "countyDistrict", "challenges", "previousSchool", "goingToSchool",
        "planType", "pipelineStage", "planTier", "accountStatus", "billingStatus", "contractStatus"
      ];
      const fallbackData: Record<string, any> = {};
      for (const k of coreKeys) {
        if (data[k] !== undefined) fallbackData[k] = data[k];
      }
      return await db.update(contacts).set(fallbackData).where(eq(contacts.id, id));
    }
    throw err;
  }
}

export async function updateContactById(id: number, data: any): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    return await db
      .update(contacts)
      .set(data)
      .where(eq(contacts.id, id));
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("no such column")) {
      const colMatch = msg.match(/no such column:\s*([a-zA-Z0-9_]+)/i);
      const missingCol = colMatch ? colMatch[1] : null;
      if (missingCol && data[missingCol] !== undefined) {
        const nextData = { ...data };
        delete nextData[missingCol];
        return await updateContactById(id, nextData);
      }
      const coreKeys = [
        "firstName", "lastName", "email", "phone", "company", "jobTitle", "address", "city",
        "state", "zipCode", "country", "notes", "dateOfBirth", "diagnosis", "schoolName",
        "gradeLevel", "countyDistrict", "challenges", "previousSchool", "goingToSchool",
        "planType", "pipelineStage", "planTier", "accountStatus", "billingStatus", "contractStatus"
      ];
      const fallbackData: Record<string, any> = {};
      for (const k of coreKeys) {
        if (data[k] !== undefined) fallbackData[k] = data[k];
      }
      return await db.update(contacts).set(fallbackData).where(eq(contacts.id, id));
    }
    throw err;
  }
}

export async function deleteContact(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(contacts)
    .where(eq(contacts.id, id));
}

export async function getStudentsByParentContactId(parentContactId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.parentContactId, parentContactId),
        eq(contacts.jobTitle, "Student")
      )
    )
    .orderBy(asc(contacts.firstName));
}

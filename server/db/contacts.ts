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

export async function updateContact(id: number, ownerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(contacts)
    .set(data)
    .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)));
}

export async function updateContactById(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(contacts)
    .set(data)
    .where(eq(contacts.id, id));
}

export async function deleteContact(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)));
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

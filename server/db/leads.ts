import { eq, desc, and } from "drizzle-orm";
import { leads, contacts } from "../../drizzle/schema";
import { getDb } from "./connection";

/**
 * Hydrates a lead with contact and student information if parentName or studentName is missing
 */
function hydrateLeadWithContact(lead: any, contactMap: Map<number, any>, studentMap: Map<number, any>) {
  if (!lead) return lead;
  const parentContact = lead.contactId ? contactMap.get(lead.contactId) : null;
  const studentContact = lead.contactId ? studentMap.get(lead.contactId) : null;

  let parentName = lead.parentName;
  let parentPhone = lead.parentPhone;
  let studentName = lead.studentName;
  let studentGrade = lead.studentGrade;

  if (!parentName && parentContact) {
    parentName = `${parentContact.firstName || ""} ${parentContact.lastName || ""}`.trim() || undefined;
  }
  if (!parentPhone && parentContact) {
    parentPhone = parentContact.phone || undefined;
  }

  if (!studentName && studentContact) {
    studentName = `${studentContact.firstName || ""} ${studentContact.lastName || ""}`.trim() || undefined;
    studentGrade = studentGrade || studentContact.gradeLevel || undefined;
  }

  // Fallback student name from notes if formatted as "Student: [Name]"
  if (!studentName && lead.notes) {
    const match = lead.notes.match(/Student:\s*([^.\n,]+)/i);
    if (match && match[1]) {
      studentName = match[1].trim();
    }
  }

  return {
    ...lead,
    parentName: parentName || lead.parentName,
    parentPhone: parentPhone || lead.parentPhone,
    studentName: studentName || lead.studentName,
    studentGrade: studentGrade || lead.studentGrade,
  };
}

export async function getLeadsByOwner(ownerId?: number) {
  const cfDb = (globalThis as any).__CF_ENV_DB__;
  let rawLeads: any[] = [];
  let rawContacts: any[] = [];

  if (cfDb) {
    try {
      const stmt = cfDb.prepare("SELECT * FROM leads ORDER BY createdAt DESC");
      const { results } = await stmt.all();
      if (results && Array.isArray(results)) {
        rawLeads = results;
      }
      const contactsStmt = cfDb.prepare("SELECT * FROM contacts");
      const cRes = await contactsStmt.all();
      if (cRes?.results && Array.isArray(cRes.results)) {
        rawContacts = cRes.results;
      }
    } catch (e) {
      console.warn("[getLeadsByOwner] CF D1 direct query error, falling back to Drizzle:", e);
    }
  }

  if (rawLeads.length === 0) {
    const db = await getDb();
    if (!db) return [];
    try {
      rawLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
      rawContacts = await db.select().from(contacts);
    } catch (err) {
      console.warn("[getLeadsByOwner] Drizzle select error:", err);
      try {
        rawLeads = await db.select().from(leads);
      } catch {
        return [];
      }
    }
  }

  const contactMap = new Map<number, any>();
  const studentMap = new Map<number, any>();

  for (const c of rawContacts) {
    contactMap.set(c.id, c);
    if (c.parentContactId) {
      studentMap.set(c.parentContactId, c);
    }
  }

  return rawLeads.map((l) => hydrateLeadWithContact(l, contactMap, studentMap));
}

export async function getLeadById(id: number, ownerId?: number) {
  const cfDb = (globalThis as any).__CF_ENV_DB__;
  let lead: any = undefined;

  if (cfDb) {
    try {
      const stmt = cfDb.prepare("SELECT * FROM leads WHERE id = ? LIMIT 1").bind(id);
      lead = await stmt.first();
    } catch (e) {
      console.warn("[getLeadById] CF D1 direct query error:", e);
    }
  }

  if (!lead) {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    lead = result.length > 0 ? result[0] : undefined;
  }

  if (!lead) return undefined;

  // Hydrate if contactId is present
  if (lead.contactId && (!lead.parentName || !lead.studentName)) {
    const db = await getDb();
    if (db) {
      const cRows = await db.select().from(contacts);
      const contactMap = new Map<number, any>();
      const studentMap = new Map<number, any>();
      for (const c of cRows) {
        contactMap.set(c.id, c);
        if (c.parentContactId) studentMap.set(c.parentContactId, c);
      }
      return hydrateLeadWithContact(lead, contactMap, studentMap);
    }
  }

  return lead;
}

export async function createLead(data: any, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(leads).values({
    ...data,
    ownerId,
  });
}

export async function updateLead(id: number, ownerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(leads)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id));
}

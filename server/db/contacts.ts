import { eq, and, desc, asc, sql } from "drizzle-orm";
import { contacts } from "../../drizzle/schema";
import { getDb } from "./connection";
import { resolveClientLocation } from "../../shared/locationResolver";
import { queryCloudflareD1, getLocalDbClient } from "../_core/d1Client";
import { recordCaseActivity } from "../services/caseActivityService";

export const inMemoryContacts = new Map<number, any>();

function mergeWithInMemory(list: any[]): any[] {
  const result = [...list];
  const memList = Array.from(inMemoryContacts.values());
  for (const mc of memList) {
    if (!result.some((r: any) => r.id === mc.id || (r.caseId && mc.caseId && r.caseId === mc.caseId))) {
      result.unshift(mc);
    }
  }
  return result;
}

function mergeLists(remoteList: any[], localList: any[]): any[] {
  const map = new Map<number, any>();
  if (Array.isArray(remoteList)) {
    for (const r of remoteList) if (r && r.id) map.set(r.id, r);
  }
  if (Array.isArray(localList)) {
    for (const l of localList) if (l && l.id) map.set(l.id, l);
  }
  const combined = Array.from(map.values()).sort((a, b) => (b.id || 0) - (a.id || 0));
  return mergeWithInMemory(combined);
}

export async function getContactsByOwner(ownerId?: number) {
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  if (isTest) {
    const db = await getDb();
    if (!db) return mergeWithInMemory([]);
    try {
      const raw = await (db as any).all(sql`SELECT * FROM contacts ORDER BY id DESC`);
      if (raw && Array.isArray(raw)) return mergeWithInMemory(raw);
    } catch {}
    try {
      const list = await db.select().from(contacts).orderBy(desc(contacts.createdAt));
      return mergeWithInMemory(list);
    } catch {
      return mergeWithInMemory([]);
    }
  }

  let localRows: any[] = [];
  try {
    const local = getLocalDbClient();
    const res = await local.execute("SELECT * FROM contacts ORDER BY id DESC");
    localRows = res.rows || [];
  } catch {}

  const cfDb = (globalThis as any).__CF_ENV_DB__;
  if (cfDb) {
    try {
      const stmt = cfDb.prepare("SELECT * FROM contacts ORDER BY id DESC");
      const { results } = await stmt.all();
      if (results && Array.isArray(results) && results.length > 0) {
        return mergeLists(results, localRows);
      }
    } catch (e) {
      console.warn("[getContactsByOwner] CF D1 direct query error:", e);
    }
  }

  // Node server / dev mode / fallback via queryCloudflareD1 (avoids SQLite 100-column projection limit)
  try {
    const directResults = await queryCloudflareD1("SELECT * FROM contacts ORDER BY id DESC");
    if (directResults && Array.isArray(directResults) && directResults.length > 0) {
      return mergeLists(directResults, localRows);
    }
  } catch (directErr) {
    console.warn("[getContactsByOwner] Direct query error, falling back to Drizzle:", directErr);
  }

  if (localRows.length > 0) {
    return mergeWithInMemory(localRows);
  }

  const db = await getDb();
  if (!db) return mergeWithInMemory([]);

  try {
    const rawResults = await (db as any).all(sql`SELECT * FROM contacts ORDER BY id DESC`);
    if (rawResults && Array.isArray(rawResults)) return mergeWithInMemory(rawResults);
  } catch {
    // fallback
  }

  try {
    const list = await db.select().from(contacts).orderBy(desc(contacts.createdAt));
    return mergeWithInMemory(list);
  } catch (err) {
    return mergeWithInMemory([]);
  }
}

export async function getContactById(id: number, ownerId?: number) {
  if (inMemoryContacts.has(id)) {
    return inMemoryContacts.get(id);
  }

  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  if (isTest) {
    const db = await getDb();
    if (!db) return inMemoryContacts.get(id) ?? undefined;

    try {
      const rawRows = await (db as any).all(sql`SELECT * FROM contacts WHERE id = ${id} LIMIT 1`);
      if (rawRows && Array.isArray(rawRows) && rawRows.length > 0) {
        return rawRows[0];
      }
    } catch {}

    try {
      const result = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, id))
        .limit(1);

      if (result.length > 0) return result[0];
    } catch {}

    return inMemoryContacts.get(id) ?? undefined;
  }

  // Check local.sqlite first for instant local resolution
  try {
    const local = getLocalDbClient();
    const res = await local.execute({ sql: "SELECT * FROM contacts WHERE id = ? LIMIT 1", args: [id] });
    if (res.rows && res.rows.length > 0) {
      return res.rows[0];
    }
  } catch {}

  const cfDb = (globalThis as any).__CF_ENV_DB__;
  if (cfDb) {
    try {
      const stmt = cfDb.prepare("SELECT * FROM contacts WHERE id = ? LIMIT 1").bind(id);
      const row = await stmt.first();
      if (row) return row;
    } catch (e) {
      console.warn("[getContactById] CF D1 direct query error:", e);
    }
  }

  // Node server / dev mode / fallback via queryCloudflareD1
  try {
    const directResults = await queryCloudflareD1("SELECT * FROM contacts WHERE id = ? LIMIT 1", [id]);
    if (directResults && Array.isArray(directResults) && directResults.length > 0) {
      return directResults[0];
    }
  } catch (directErr) {
    console.warn("[getContactById] Direct query error, falling back to Drizzle:", directErr);
  }

  const db = await getDb();
  if (!db) return inMemoryContacts.get(id) ?? undefined;

  try {
    const rawRows = await (db as any).all(sql`SELECT * FROM contacts WHERE id = ${id} LIMIT 1`);
    if (rawRows && Array.isArray(rawRows) && rawRows.length > 0) {
      return rawRows[0];
    }
  } catch {
    // fallback
  }

  try {
    const result = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (result.length > 0) return result[0];
  } catch {
    // ignore
  }

  return inMemoryContacts.get(id) ?? undefined;
}

export async function getContactByIdOrCaseId(idOrCaseId: number | string, ownerId?: number) {
  const numericId = typeof idOrCaseId === "number" ? idOrCaseId : parseInt(idOrCaseId, 10);
  if (!isNaN(numericId) && numericId > 0 && inMemoryContacts.has(numericId)) {
    return inMemoryContacts.get(numericId);
  }
  for (const c of Array.from(inMemoryContacts.values())) {
    if (c.caseId && String(c.caseId).toLowerCase() === String(idOrCaseId).toLowerCase()) {
      return c;
    }
  }

  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  if (isTest) {
    if (!isNaN(numericId) && numericId > 0) {
      return getContactById(numericId, ownerId);
    }
    const db = await getDb();
    if (db) {
      try {
        const [byCase] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.caseId, String(idOrCaseId)))
          .limit(1);
        if (byCase) return byCase;
      } catch {}
    }
    return undefined;
  }

  const caseIdStr = String(idOrCaseId).trim();

  // Check local.sqlite first
  try {
    const local = getLocalDbClient();
    const res = await local.execute({
      sql: "SELECT * FROM contacts WHERE id = ? OR caseId = ? LIMIT 1",
      args: [numericId || 0, caseIdStr]
    });
    if (res.rows && res.rows.length > 0) {
      return res.rows[0];
    }
  } catch {}

  const isNumeric = !isNaN(numericId) && numericId > 0 && !String(idOrCaseId).toUpperCase().startsWith("WP-");
  if (isNumeric) {
    const byId = await getContactById(numericId, ownerId);
    if (byId) return byId;
  }

  const cfDb = (globalThis as any).__CF_ENV_DB__;
  if (cfDb) {
    try {
      const stmt = cfDb.prepare("SELECT * FROM contacts WHERE caseId = ? OR id = ? LIMIT 1").bind(caseIdStr, numericId || 0);
      const row = await stmt.first();
      if (row) return row;
    } catch {}
  }

  try {
    const directResults = await queryCloudflareD1("SELECT * FROM contacts WHERE caseId = ? OR id = ? LIMIT 1", [caseIdStr, numericId || 0]);
    if (directResults && Array.isArray(directResults) && directResults.length > 0) {
      return directResults[0];
    }
  } catch {}

  const db = await getDb();
  if (db) {
    try {
      const [byCase] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.caseId, caseIdStr))
        .limit(1);
      if (byCase) return byCase;
    } catch {}

    if (!isNaN(numericId) && numericId > 0) {
      try {
        const [byId] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, numericId))
          .limit(1);
        if (byId) return byId;
      } catch {}
    }
  }

  return inMemoryContacts.get(numericId) ?? undefined;
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
  let caseId = data.caseId;
  if (!caseId) {
    const countResult = await db.select().from(contacts);
    const nextNum = String(countResult.length + 1).padStart(4, "0");
    caseId = `WP-${year}-${nextNum}`;
  }

  // Automatic Location Resolution (PG-041)
  const loc = resolveClientLocation({
    city: data.city,
    state: data.state,
    zipCode: data.zipCode,
    latitude: data.latitude ?? data.mapLatitude,
    longitude: data.longitude ?? data.mapLongitude,
  });

  const enrichedData = {
    ...data,
    ownerId,
    caseId,
    mapLatitude: loc.hasLocation ? loc.latitude : (data.mapLatitude ?? null),
    mapLongitude: loc.hasLocation ? loc.longitude : (data.mapLongitude ?? null),
    latitude: loc.hasLocation && loc.latitude != null ? String(loc.latitude) : (data.latitude ?? null),
    longitude: loc.hasLocation && loc.longitude != null ? String(loc.longitude) : (data.longitude ?? null),
    mapLocationAccuracy: loc.mapLocationAccuracy,
    mapLocationSource: loc.mapLocationSource,
    mapLocationUpdatedAt: loc.mapLocationUpdatedAt,
    mapLocationStatus: loc.mapLocationStatus,
    confirmedTimeZone: data.confirmedTimeZone || (loc.hasLocation ? loc.timeZone : undefined),
    timezone: data.timezone || (loc.hasLocation ? loc.timeZone : undefined),
  };

  const result = await db.insert(contacts).values(enrichedData);
  return result;
}

export async function updateContact(id: number, ownerId: number, data: any): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let updateData = { ...data };

  // Recalculate location when location fields change (PG-041)
  if (
    data.city !== undefined ||
    data.state !== undefined ||
    data.zipCode !== undefined ||
    data.latitude !== undefined ||
    data.longitude !== undefined ||
    data.mapLatitude !== undefined
  ) {
    let existingCity = data.city;
    let existingState = data.state;
    let existingZip = data.zipCode;

    if (existingCity === undefined || existingState === undefined || existingZip === undefined) {
      const [existing] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
      if (existing) {
        if (existingCity === undefined) existingCity = existing.city;
        if (existingState === undefined) existingState = existing.state;
        if (existingZip === undefined) existingZip = existing.zipCode;
      }
    }

    const loc = resolveClientLocation({
      city: existingCity,
      state: existingState,
      zipCode: existingZip,
      latitude: data.latitude ?? data.mapLatitude,
      longitude: data.longitude ?? data.mapLongitude,
    });
    updateData.mapLatitude = loc.hasLocation ? loc.latitude : null;
    updateData.mapLongitude = loc.hasLocation ? loc.longitude : null;
    if (loc.hasLocation && loc.latitude != null) updateData.latitude = String(loc.latitude);
    if (loc.hasLocation && loc.longitude != null) updateData.longitude = String(loc.longitude);
    updateData.mapLocationAccuracy = loc.mapLocationAccuracy;
    updateData.mapLocationSource = loc.mapLocationSource;
    updateData.mapLocationUpdatedAt = loc.mapLocationUpdatedAt;
    updateData.mapLocationStatus = loc.mapLocationStatus;
    if (loc.hasLocation) {
      if (!updateData.confirmedTimeZone) updateData.confirmedTimeZone = loc.timeZone;
      if (!updateData.timezone) updateData.timezone = loc.timeZone;
    }
  }

  try {
    return await db
      .update(contacts)
      .set(updateData)
      .where(eq(contacts.id, id));
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("no such column")) {
      const colMatch = msg.match(/no such column:\s*([a-zA-Z0-9_]+)/i);
      const missingCol = colMatch ? colMatch[1] : null;
      if (missingCol && updateData[missingCol] !== undefined) {
        const nextData = { ...updateData };
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
        if (updateData[k] !== undefined) fallbackData[k] = updateData[k];
      }
      return await db.update(contacts).set(fallbackData).where(eq(contacts.id, id));
    }
    throw err;
  }
}

export async function updateContactById(id: number, data: any): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let updateData = { ...data };

  // Recalculate location when location fields change (PG-041)
  if (
    data.city !== undefined ||
    data.state !== undefined ||
    data.zipCode !== undefined ||
    data.latitude !== undefined ||
    data.longitude !== undefined ||
    data.mapLatitude !== undefined
  ) {
    let existingCity = data.city;
    let existingState = data.state;
    let existingZip = data.zipCode;

    if (existingCity === undefined || existingState === undefined || existingZip === undefined) {
      const [existing] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
      if (existing) {
        if (existingCity === undefined) existingCity = existing.city;
        if (existingState === undefined) existingState = existing.state;
        if (existingZip === undefined) existingZip = existing.zipCode;
      }
    }

    const loc = resolveClientLocation({
      city: existingCity,
      state: existingState,
      zipCode: existingZip,
      latitude: data.latitude ?? data.mapLatitude,
      longitude: data.longitude ?? data.mapLongitude,
    });
    updateData.mapLatitude = loc.hasLocation ? loc.latitude : null;
    updateData.mapLongitude = loc.hasLocation ? loc.longitude : null;
    if (loc.hasLocation && loc.latitude != null) updateData.latitude = String(loc.latitude);
    if (loc.hasLocation && loc.longitude != null) updateData.longitude = String(loc.longitude);
    updateData.mapLocationAccuracy = loc.mapLocationAccuracy;
    updateData.mapLocationSource = loc.mapLocationSource;
    updateData.mapLocationUpdatedAt = loc.mapLocationUpdatedAt;
    updateData.mapLocationStatus = loc.mapLocationStatus;
    if (loc.hasLocation) {
      if (!updateData.confirmedTimeZone) updateData.confirmedTimeZone = loc.timeZone;
      if (!updateData.timezone) updateData.timezone = loc.timeZone;
    }
  }

  try {
    return await db
      .update(contacts)
      .set(updateData)
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

export interface BulkImportClientItem {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  studentFirstName?: string;
  studentLastName?: string;
  schoolName?: string;
  gradeLevel?: string;
  dateOfBirth?: string;
  diagnosis?: string;
  iepEligibility?: string;
  planType?: string;
  pipelineStage?: string;
  planTier?: string;
  accountStatus?: string;
  billingStatus?: string;
  hourlyRate?: number | string;
  howHeardAboutUs?: string;
  referredBy?: string;
  caseId?: string;
}

export interface BulkImportOptions {
  sourceCrm: string;
  duplicateStrategy: "skip" | "update" | "create_new";
  defaultPlanTier?: string;
  defaultPipelineStage?: string;
  clients: BulkImportClientItem[];
}

export interface BulkImportResult {
  success: boolean;
  totalProcessed: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  createdContacts: Array<{ id: number; name: string; caseId: string; email: string | null; role: string }>;
  updatedContacts: Array<{ id: number; name: string; caseId: string; email: string | null }>;
  skippedContacts: Array<{ name: string; email: string | null; reason: string }>;
  errors: string[];
}

export async function bulkImportContacts(
  options: BulkImportOptions,
  ownerId: number = 1
): Promise<BulkImportResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: BulkImportResult = {
    success: true,
    totalProcessed: options.clients.length,
    importedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    createdContacts: [],
    updatedContacts: [],
    skippedContacts: [],
    errors: [],
  };

  if (!options.clients || options.clients.length === 0) {
    return result;
  }

  // Load existing contacts to check for duplicates
  let existingContacts: any[] = [];
  try {
    existingContacts = await db.select().from(contacts);
  } catch (err) {
    console.warn("[bulkImportContacts] Failed to load existing contacts:", err);
  }

  // Merge with inMemoryContacts (for test isolation & memory resilience)
  const memList = Array.from(inMemoryContacts.values());
  for (const mc of memList) {
    if (!existingContacts.some((e) => e.id === mc.id)) {
      existingContacts.push(mc);
    }
  }

  const emailMap = new Map<string, any>();
  const phoneMap = new Map<string, any>();

  for (const c of existingContacts) {
    if (c.email && typeof c.email === "string") {
      emailMap.set(c.email.trim().toLowerCase(), c);
    }
    if (c.phone && typeof c.phone === "string") {
      const cleanPhone = c.phone.replace(/\D/g, "");
      if (cleanPhone.length >= 7) {
        phoneMap.set(cleanPhone, c);
      }
    }
  }

  // Determine starting sequence number for caseId
  const currentYear = new Date().getFullYear();
  let maxSeq = existingContacts.length;
  for (const c of existingContacts) {
    if (c.caseId && typeof c.caseId === "string") {
      const match = c.caseId.match(/WP-\d{4}-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }
  let nextSeq = maxSeq + 1;

  for (let i = 0; i < options.clients.length; i++) {
    const item = options.clients[i];
    const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || `Client #${i + 1}`;
    const cleanEmail = item.email ? item.email.trim().toLowerCase() : "";
    const cleanPhoneDigits = item.phone ? item.phone.replace(/\D/g, "") : "";

    try {
      // Duplicate detection
      let existingMatch: any = null;
      let matchReason = "";

      if (cleanEmail && emailMap.has(cleanEmail)) {
        existingMatch = emailMap.get(cleanEmail);
        matchReason = `Email already exists (${cleanEmail})`;
      } else if (cleanPhoneDigits.length >= 7 && phoneMap.has(cleanPhoneDigits)) {
        existingMatch = phoneMap.get(cleanPhoneDigits);
        matchReason = `Phone number already exists (${item.phone})`;
      }

      if (existingMatch && options.duplicateStrategy === "skip") {
        result.skippedCount++;
        result.skippedContacts.push({
          name: fullName,
          email: item.email || null,
          reason: matchReason,
        });
        continue;
      }

      if (existingMatch && options.duplicateStrategy === "update") {
        const updatePayload: Record<string, any> = {};
        if (item.phone && !existingMatch.phone) updatePayload.phone = item.phone.trim();
        if (item.company && !existingMatch.company) updatePayload.company = item.company.trim();
        if (item.address && !existingMatch.address) updatePayload.address = item.address.trim();
        if (item.city && !existingMatch.city) updatePayload.city = item.city.trim();
        if (item.state && !existingMatch.state) updatePayload.state = item.state.trim();
        if (item.zipCode && !existingMatch.zipCode) updatePayload.zipCode = item.zipCode.trim();
        if (item.schoolName && !existingMatch.schoolName) updatePayload.schoolName = item.schoolName.trim();
        if (item.gradeLevel && !existingMatch.gradeLevel) updatePayload.gradeLevel = item.gradeLevel.trim();
        if (item.diagnosis && !existingMatch.diagnosis) updatePayload.diagnosis = item.diagnosis.trim();
        if (item.planType && !existingMatch.planType) updatePayload.planType = item.planType.trim();
        if (item.planTier && (!existingMatch.planTier || existingMatch.planTier === "$55")) {
          updatePayload.planTier = item.planTier;
        }
        if (item.notes) {
          updatePayload.notes = existingMatch.notes
            ? `${existingMatch.notes}\n[Updated from ${options.sourceCrm}]: ${item.notes}`
            : `[Imported from ${options.sourceCrm}]: ${item.notes}`;
        }

        if (Object.keys(updatePayload).length > 0) {
          try {
            await updateContact(existingMatch.id, ownerId, updatePayload);
          } catch {}
          const merged = { ...existingMatch, ...updatePayload };
          inMemoryContacts.set(existingMatch.id, merged);
        }

        result.updatedCount++;
        result.updatedContacts.push({
          id: existingMatch.id,
          name: fullName,
          caseId: existingMatch.caseId || `ID-${existingMatch.id}`,
          email: existingMatch.email || null,
        });
        continue;
      }

      // Create new contact
      const assignedCaseId = item.caseId || `WP-${currentYear}-${String(nextSeq++).padStart(4, "0")}`;

      // Location resolution (PG-041)
      const loc = resolveClientLocation({
        city: item.city,
        state: item.state,
        zipCode: item.zipCode,
      });

      const parentNotes = item.notes
        ? `[Imported from ${options.sourceCrm}] ${item.notes}`
        : `[Imported from ${options.sourceCrm}]`;

      const parentInsert = {
        ownerId,
        firstName: item.firstName.trim(),
        lastName: item.lastName.trim(),
        email: item.email?.trim() || null,
        phone: item.phone?.trim() || null,
        company: item.company?.trim() || null,
        jobTitle: item.jobTitle?.trim() || "Client",
        address: item.address?.trim() || null,
        city: item.city?.trim() || null,
        state: item.state?.trim() || null,
        zipCode: item.zipCode?.trim() || null,
        country: item.country?.trim() || "USA",
        notes: parentNotes,
        caseId: assignedCaseId,
        planTier: item.planTier || options.defaultPlanTier || "$55",
        pipelineStage: item.pipelineStage || options.defaultPipelineStage || "Active",
        accountStatus: item.accountStatus || "Active",
        billingStatus: item.billingStatus || "Current",
        contractStatus: "Active",
        hourlyRate: item.hourlyRate != null && item.hourlyRate !== "" ? String(item.hourlyRate) : null,
        howHeardAboutUs: item.howHeardAboutUs || `CRM Migration (${options.sourceCrm})`,
        referredBy: item.referredBy || null,
        schoolName: item.schoolName?.trim() || null,
        gradeLevel: item.gradeLevel?.trim() || null,
        dateOfBirth: item.dateOfBirth?.trim() || null,
        diagnosis: item.diagnosis?.trim() || null,
        iepEligibility: item.iepEligibility?.trim() || null,
        planType: item.planType?.trim() || "IEP",
        mapLatitude: loc.hasLocation ? loc.latitude : null,
        mapLongitude: loc.hasLocation ? loc.longitude : null,
        latitude: loc.hasLocation && loc.latitude != null ? String(loc.latitude) : null,
        longitude: loc.hasLocation && loc.longitude != null ? String(loc.longitude) : null,
        mapLocationAccuracy: loc.mapLocationAccuracy,
        mapLocationSource: loc.mapLocationSource,
        mapLocationUpdatedAt: loc.mapLocationUpdatedAt,
        mapLocationStatus: loc.mapLocationStatus,
        confirmedTimeZone: loc.hasLocation ? loc.timeZone : undefined,
        timezone: loc.hasLocation ? loc.timeZone : undefined,
      };

      let insertedParentId: number = 0;
      try {
        const parentInsertRes: any = await db.insert(contacts).values(parentInsert).returning({ id: contacts.id });
        insertedParentId = parentInsertRes?.[0]?.id || parentInsertRes?.[0]?.insertId || parentInsertRes?.insertId || 0;
      } catch (insertErr) {
        console.warn("[bulkImportContacts] DB insert parent warning:", insertErr);
      }

      if (!insertedParentId) {
        // Look up by caseId
        try {
          const [found] = await db.select().from(contacts).where(eq(contacts.caseId, assignedCaseId)).limit(1);
          if (found) insertedParentId = found.id;
        } catch {}
      }

      if (!insertedParentId) {
        insertedParentId = 1000 + inMemoryContacts.size + i + 1;
      }

      const savedParentRecord = { id: insertedParentId, ...parentInsert };
      inMemoryContacts.set(insertedParentId, savedParentRecord);

      result.importedCount++;
      result.createdContacts.push({
        id: insertedParentId,
        name: fullName,
        caseId: assignedCaseId,
        email: item.email || null,
        role: "Client",
      });

      // Update duplicate maps
      if (cleanEmail) emailMap.set(cleanEmail, savedParentRecord);
      if (cleanPhoneDigits.length >= 7) phoneMap.set(cleanPhoneDigits, savedParentRecord);

      // If separate student details exist and student name is different from parent
      const studentFirst = item.studentFirstName?.trim();
      const studentLast = (item.studentLastName?.trim() || item.lastName.trim());
      const isDistinctStudent = Boolean(studentFirst && studentFirst.toLowerCase() !== item.firstName.trim().toLowerCase());

      if (isDistinctStudent && insertedParentId) {
        const studentCaseId = `WP-${currentYear}-${String(nextSeq++).padStart(4, "0")}`;
        const studentInsert = {
          ownerId,
          firstName: studentFirst,
          lastName: studentLast,
          email: null,
          phone: null,
          parentContactId: insertedParentId,
          jobTitle: "Student",
          caseId: studentCaseId,
          schoolName: item.schoolName?.trim() || null,
          gradeLevel: item.gradeLevel?.trim() || null,
          dateOfBirth: item.dateOfBirth?.trim() || null,
          diagnosis: item.diagnosis?.trim() || null,
          iepEligibility: item.iepEligibility?.trim() || null,
          planType: item.planType?.trim() || "IEP",
          planTier: item.planTier || options.defaultPlanTier || "$55",
          pipelineStage: item.pipelineStage || options.defaultPipelineStage || "Active",
          city: item.city?.trim() || null,
          state: item.state?.trim() || null,
          zipCode: item.zipCode?.trim() || null,
          country: item.country?.trim() || "USA",
          notes: `Student linked to parent contact ${fullName}. Imported from ${options.sourceCrm}.`,
        };

        let insertedStudentId: number = 0;
        try {
          const studentInsertRes: any = await db.insert(contacts).values(studentInsert).returning({ id: contacts.id });
          insertedStudentId = studentInsertRes?.[0]?.id || studentInsertRes?.[0]?.insertId || studentInsertRes?.insertId || 0;
        } catch (studentErr) {
          console.warn("[bulkImportContacts] DB insert student warning:", studentErr);
        }

        if (!insertedStudentId) {
          try {
            const [found] = await db.select().from(contacts).where(eq(contacts.caseId, studentCaseId)).limit(1);
            if (found) insertedStudentId = found.id;
          } catch {}
        }

        if (!insertedStudentId) {
          insertedStudentId = 2000 + inMemoryContacts.size + i + 1;
        }

        inMemoryContacts.set(insertedStudentId, { id: insertedStudentId, ...studentInsert });

        result.importedCount++;
        result.createdContacts.push({
          id: insertedStudentId,
          name: `${studentFirst} ${studentLast}`,
          caseId: studentCaseId,
          email: null,
          role: "Student",
        });
      }
    } catch (err: any) {
      console.error(`[bulkImportContacts] Error processing row ${i + 1} (${fullName}):`, err);
      result.errors.push(`Row ${i + 1} (${fullName}): ${err.message || String(err)}`);
    }
  }

  return result;
}

export interface ExpressStudentSetupInput {
  parentName: string;
  studentName: string;
  email?: string;
  phone?: string;
  schoolName?: string;
  gradeLevel?: string;
  diagnosis?: string;
  planType?: string;
  planTier?: string;
  city?: string;
  state?: string;
  notes?: string;
}

export interface ExpressStudentSetupResult {
  success: boolean;
  parentContactId: number;
  studentContactId: number;
  parentName: string;
  studentName: string;
  caseId: string;
  planTier: string;
  workspaceUrl: string;
  meetingWorkspaceUrl: string;
}

export async function expressStudentSetup(
  input: ExpressStudentSetupInput,
  ownerId: number = 1
): Promise<ExpressStudentSetupResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Parse parent name
  const parentParts = input.parentName.trim().split(/\s+/);
  const parentFirstName = parentParts[0] || "Parent";
  const parentLastName = parentParts.slice(1).join(" ") || "Client";

  // Parse student name
  const studentParts = input.studentName.trim().split(/\s+/);
  const studentFirstName = studentParts[0] || "Student";
  const studentLastName = studentParts.slice(1).join(" ") || parentLastName;

  const currentYear = new Date().getFullYear();

  // Find next sequence number
  let existingList: any[] = [];
  try {
    existingList = await db.select().from(contacts);
  } catch {}
  const memList = Array.from(inMemoryContacts.values());
  for (const mc of memList) {
    if (!existingList.some((e) => e.id === mc.id)) {
      existingList.push(mc);
    }
  }

  let maxSeq = existingList.length;
  for (const c of existingList) {
    if (c.caseId && typeof c.caseId === "string") {
      const match = c.caseId.match(/WP-\d{4}-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }
  let nextSeq = maxSeq + 1;

  const parentCaseId = `WP-${currentYear}-${String(nextSeq++).padStart(4, "0")}`;
  const studentCaseId = `WP-${currentYear}-${String(nextSeq++).padStart(4, "0")}`;

  const city = input.city?.trim() || "Atlanta";
  const state = input.state?.trim() || "GA";

  // 1. Create Parent Contact
  const parentData = {
    ownerId,
    firstName: parentFirstName,
    lastName: parentLastName,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    jobTitle: "Parent",
    company: `${parentLastName} Family`,
    city,
    state,
    country: "USA",
    caseId: parentCaseId,
    planTier: input.planTier || "$55",
    pipelineStage: "Active",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    notes: input.notes ? `[Express Setup] ${input.notes}` : "[Express Setup] Contact created via 30-Second Express Onboard.",
  };

  let parentContactId = 0;
  try {
    const pRes: any = await db.insert(contacts).values(parentData).returning({ id: contacts.id });
    parentContactId = pRes?.[0]?.id || pRes?.[0]?.insertId || pRes?.insertId || 0;
  } catch (err) {
    console.warn("[expressStudentSetup] Parent insert error:", err);
  }

  if (!parentContactId) {
    try {
      const [found] = await db.select().from(contacts).where(eq(contacts.caseId, parentCaseId)).limit(1);
      if (found) parentContactId = found.id;
    } catch {}
  }

  if (!parentContactId) {
    parentContactId = 1000 + inMemoryContacts.size + 1;
  }
  inMemoryContacts.set(parentContactId, { id: parentContactId, ...parentData });

  // 2. Create Student Contact
  const studentData = {
    ownerId,
    firstName: studentFirstName,
    lastName: studentLastName,
    jobTitle: "Student",
    parentContactId: parentContactId || null,
    caseId: studentCaseId,
    schoolName: input.schoolName?.trim() || null,
    gradeLevel: input.gradeLevel?.trim() || null,
    diagnosis: input.diagnosis?.trim() || "IEP Advocacy Client",
    iepEligibility: "Specific Learning Disability (SLD)",
    planType: input.planType || "IEP",
    planTier: input.planTier || "$55",
    pipelineStage: "Active",
    lifecycleStage: "Active",
    operationalState: "Normal",
    serviceStatus: "Active",
    accountStatus: "Active",
    billingStatus: "Current",
    contractStatus: "Active",
    city,
    state,
    country: "USA",
    currentPrimaryAction: "Initial Case Review & IEP Records Ingestion",
    currentActionDestination: `/contacts/${studentCaseId}`,
    currentActionDueDate: "Immediate",
    currentActionHelperText: "Ready for live meeting recording, PWN decoding, and advocacy guidance.",
    notes: `Student linked to parent ${parentFirstName} ${parentLastName}. Initialized via Express Setup.`,
  };

  let studentContactId = 0;
  try {
    const sRes: any = await db.insert(contacts).values(studentData).returning({ id: contacts.id });
    studentContactId = sRes?.[0]?.id || sRes?.[0]?.insertId || sRes?.insertId || 0;
  } catch (err) {
    console.warn("[expressStudentSetup] Student insert error:", err);
  }

  if (!studentContactId) {
    try {
      const [found] = await db.select().from(contacts).where(eq(contacts.caseId, studentCaseId)).limit(1);
      if (found) studentContactId = found.id;
    } catch {}
  }

  if (!studentContactId) {
    studentContactId = 2000 + inMemoryContacts.size + 1;
  }
  inMemoryContacts.set(studentContactId, { id: studentContactId, ...studentData });

  // 3. Log Initial Case Activity
  try {
    await recordCaseActivity({
      studentContactId,
      caseId: studentCaseId,
      eventType: "express_setup",
      title: "Case Created via Express Setup",
      description: `Student file initialized for ${studentFirstName} ${studentLastName} with linked parent ${parentFirstName} ${parentLastName}. Ready for full advocacy support.`,
      whyReason: "Rapid Client Intake",
      ownerName: "Byron Clausen",
      ownerRole: "Advocate",
    });
  } catch {}

  return {
    success: true,
    parentContactId,
    studentContactId,
    parentName: `${parentFirstName} ${parentLastName}`,
    studentName: `${studentFirstName} ${studentLastName}`,
    caseId: studentCaseId,
    planTier: input.planTier || "$55",
    workspaceUrl: `/contacts/${studentContactId}`,
    meetingWorkspaceUrl: `/meeting-workspace/${studentContactId}`,
  };
}

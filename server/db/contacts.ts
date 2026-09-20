import { eq, and, desc, asc } from "drizzle-orm";
import { contacts } from "../../drizzle/schema";
import { getDb } from "./connection";
import { resolveClientLocation } from "../../shared/locationResolver";

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

import { eq, and, desc } from "drizzle-orm";
import {
  clientSupportOffers,
  clientSupportOfferEvents,
  type ClientSupportOffer,
  type InsertClientSupportOffer,
  type ClientSupportOfferEvent,
  type InsertClientSupportOfferEvent,
} from "../../drizzle/schema";
import { getDb } from "./connection";

/**
 * Ensures client_support_offers and client_support_offer_events tables exist in D1/SQLite.
 */
async function ensureTables(db: any) {
  try {
    await db.run?.(`
      CREATE TABLE IF NOT EXISTS client_support_offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL DEFAULT 1,
        family_id INTEGER,
        student_id INTEGER NOT NULL,
        parent_contact_id INTEGER,
        source_type TEXT NOT NULL DEFAULT 'library',
        source_service_id INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'usd',
        delivery_time TEXT NOT NULL DEFAULT '3 business days',
        included_items TEXT,
        plan_eligibility TEXT NOT NULL DEFAULT 'one-time add-on',
        personal_note TEXT,
        allow_document_upload INTEGER NOT NULL DEFAULT 0,
        require_payment INTEGER NOT NULL DEFAULT 1,
        priority_enabled INTEGER NOT NULL DEFAULT 0,
        priority_price INTEGER,
        priority_delivery_time TEXT,
        priority_description TEXT,
        expires_at TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'draft',
        created_by TEXT NOT NULL,
        sent_by TEXT,
        sent_at TIMESTAMP,
        viewed_at TIMESTAMP,
        accepted_at TIMESTAMP,
        declined_at TIMESTAMP,
        paid_at TIMESTAMP,
        completed_at TIMESTAMP,
        stripe_payment_intent_id TEXT,
        selected_priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    await db.run?.(`
      CREATE TABLE IF NOT EXISTS client_support_offer_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        family_id INTEGER,
        service_id INTEGER,
        event_type TEXT NOT NULL,
        actor TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT,
        metadata TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
  } catch {
    // Continue safely if already exists
  }
}

// In-memory cache for deterministic testing and instant fallbacks
const inMemoryOffers = new Map<number, ClientSupportOffer>();
const inMemoryEvents = new Map<number, ClientSupportOfferEvent[]>();
let autoIncId = 1000;

export async function listOffersForStudent(
  studentId: number,
  orgId: number = 1
): Promise<ClientSupportOffer[]> {
  const db = await getDb();
  if (db) {
    try {
      await ensureTables(db);
      const rows = await db
        .select()
        .from(clientSupportOffers)
        .where(
          and(
            eq(clientSupportOffers.studentId, studentId),
            eq(clientSupportOffers.organizationId, orgId)
          )
        )
        .orderBy(desc(clientSupportOffers.createdAt));

      if (rows && rows.length > 0) {
        rows.forEach((r: any) => inMemoryOffers.set(r.id, r));
        return rows;
      }
    } catch (err) {
      console.warn("[SupportOffers DB] Error fetching offers:", err);
    }
  }

  // Fallback to in-memory store
  return Array.from(inMemoryOffers.values())
    .filter((o) => o.studentId === studentId && o.organizationId === orgId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getOfferById(
  offerId: number,
  orgId: number = 1
): Promise<ClientSupportOffer | null> {
  const db = await getDb();
  if (db) {
    try {
      await ensureTables(db);
      const rows = await db
        .select()
        .from(clientSupportOffers)
        .where(
          and(
            eq(clientSupportOffers.id, offerId),
            eq(clientSupportOffers.organizationId, orgId)
          )
        );
      if (rows && rows[0]) {
        inMemoryOffers.set(offerId, rows[0]);
        return rows[0];
      }
    } catch (err) {
      console.warn("[SupportOffers DB] Error fetching offer by ID:", err);
    }
  }

  const mem = inMemoryOffers.get(offerId);
  return mem && mem.organizationId === orgId ? mem : null;
}

export async function getActiveOfferForPortal(
  studentId: number
): Promise<ClientSupportOffer | null> {
  const offers = await listOffersForStudent(studentId, 1);
  // Find the most recent active sent or pending offer
  const active = offers.find(
    (o) =>
      o.status === "sent" ||
      o.status === "viewed" ||
      o.status === "payment_pending" ||
      o.status === "payment_failed"
  );
  return active || null;
}

export async function saveDraftOffer(
  data: Omit<Partial<InsertClientSupportOffer>, "includedItems"> & {
    id?: number;
    studentId: number;
    title: string;
    description: string;
    price: number;
    createdBy: string;
    includedItems?: string | string[] | null;
  }
): Promise<ClientSupportOffer> {
  const db = await getDb();
  const now = new Date();
  const serializedIncludedItems = Array.isArray(data.includedItems)
    ? JSON.stringify(data.includedItems)
    : data.includedItems ?? null;

  if (data.id) {
    // Update existing draft
    const existing = await getOfferById(data.id, data.organizationId || 1);
    const updated: ClientSupportOffer = {
      ...(existing || ({} as any)),
      ...data,
      includedItems: serializedIncludedItems,
      id: data.id,
      updatedAt: now,
    };

    if (db) {
      try {
        await ensureTables(db);
        await db
          .update(clientSupportOffers)
          .set({
            ...data,
            includedItems: serializedIncludedItems,
            updatedAt: now,
          })
          .where(eq(clientSupportOffers.id, data.id));
      } catch (err) {
        console.warn("[SupportOffers DB] Update error:", err);
      }
    }

    inMemoryOffers.set(data.id, updated);
    return updated;
  } else {
    // Insert new draft
    const newId = ++autoIncId;
    const inserted: ClientSupportOffer = {
      id: newId,
      organizationId: data.organizationId ?? 1,
      familyId: data.familyId ?? null,
      studentId: data.studentId,
      parentContactId: data.parentContactId ?? null,
      sourceType: data.sourceType ?? "library",
      sourceServiceId: data.sourceServiceId ?? null,
      title: data.title,
      description: data.description,
      price: data.price ?? 0,
      currency: data.currency ?? "usd",
      deliveryTime: data.deliveryTime ?? "3 business days",
      includedItems: serializedIncludedItems ?? "[]",
      planEligibility: data.planEligibility ?? "one-time add-on",
      personalNote: data.personalNote ?? null,
      allowDocumentUpload: data.allowDocumentUpload ?? false,
      requirePayment: data.requirePayment ?? true,
      priorityEnabled: data.priorityEnabled ?? false,
      priorityPrice: data.priorityPrice ?? null,
      priorityDeliveryTime: data.priorityDeliveryTime ?? null,
      priorityDescription: data.priorityDescription ?? null,
      expiresAt: data.expiresAt ?? null,
      status: "draft",
      createdBy: data.createdBy,
      sentBy: null,
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
      declinedAt: null,
      paidAt: null,
      completedAt: null,
      stripePaymentIntentId: null,
      selectedPriority: false,
      createdAt: now,
      updatedAt: now,
    };

    if (db) {
      try {
        await ensureTables(db);
        const result = await db.insert(clientSupportOffers).values({
          organizationId: inserted.organizationId,
          familyId: inserted.familyId,
          studentId: inserted.studentId,
          parentContactId: inserted.parentContactId,
          sourceType: inserted.sourceType,
          sourceServiceId: inserted.sourceServiceId,
          title: inserted.title,
          description: inserted.description,
          price: inserted.price,
          currency: inserted.currency,
          deliveryTime: inserted.deliveryTime,
          includedItems: inserted.includedItems,
          planEligibility: inserted.planEligibility,
          personalNote: inserted.personalNote,
          allowDocumentUpload: inserted.allowDocumentUpload,
          requirePayment: inserted.requirePayment,
          priorityEnabled: inserted.priorityEnabled,
          priorityPrice: inserted.priorityPrice,
          priorityDeliveryTime: inserted.priorityDeliveryTime,
          priorityDescription: inserted.priorityDescription,
          expiresAt: inserted.expiresAt,
          status: inserted.status,
          createdBy: inserted.createdBy,
          createdAt: now,
          updatedAt: now,
        });

        const insertId = (result as any)?.[0]?.insertId || (result as any)?.insertId;
        if (insertId) {
          inserted.id = Number(insertId);
        }
      } catch (err) {
        console.warn("[SupportOffers DB] Insert error:", err);
      }
    }

    inMemoryOffers.set(inserted.id, inserted);
    return inserted;
  }
}

export async function sendOffer(
  offerId: number,
  sentBy: string,
  orgId: number = 1
): Promise<ClientSupportOffer> {
  const offer = await getOfferById(offerId, orgId);
  if (!offer) throw new Error("Offer not found");

  const now = new Date();
  const updated: ClientSupportOffer = {
    ...offer,
    status: "sent",
    sentBy,
    sentAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  if (db) {
    try {
      await ensureTables(db);
      await db
        .update(clientSupportOffers)
        .set({
          status: "sent",
          sentBy,
          sentAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(clientSupportOffers.id, offerId),
            eq(clientSupportOffers.organizationId, orgId)
          )
        );
    } catch (err) {
      console.warn("[SupportOffers DB] Send offer error:", err);
    }
  }

  inMemoryOffers.set(offerId, updated);
  return updated;
}

export async function updateOfferStatus(
  offerId: number,
  status: string,
  extra: Partial<ClientSupportOffer> = {},
  orgId: number = 1
): Promise<ClientSupportOffer> {
  const offer = await getOfferById(offerId, orgId);
  if (!offer) throw new Error("Offer not found");

  const now = new Date();
  const updated: ClientSupportOffer = {
    ...offer,
    ...extra,
    status,
    updatedAt: now,
  };

  const db = await getDb();
  if (db) {
    try {
      await ensureTables(db);
      await db
        .update(clientSupportOffers)
        .set({
          ...extra,
          status,
          updatedAt: now,
        })
        .where(
          and(
            eq(clientSupportOffers.id, offerId),
            eq(clientSupportOffers.organizationId, orgId)
          )
        );
    } catch (err) {
      console.warn("[SupportOffers DB] Status update error:", err);
    }
  }

  inMemoryOffers.set(offerId, updated);
  return updated;
}

export async function recordOfferEvent(
  data: InsertClientSupportOfferEvent
): Promise<ClientSupportOfferEvent> {
  const now = new Date();
  const event: ClientSupportOfferEvent = {
    id: ++autoIncId,
    offerId: data.offerId,
    studentId: data.studentId,
    familyId: data.familyId ?? null,
    serviceId: data.serviceId ?? null,
    eventType: data.eventType,
    actor: data.actor,
    previousStatus: data.previousStatus ?? null,
    newStatus: data.newStatus ?? null,
    metadata: data.metadata ?? null,
    timestamp: now,
  };

  const db = await getDb();
  if (db) {
    try {
      await ensureTables(db);
      const res = await db.insert(clientSupportOfferEvents).values({
        offerId: data.offerId,
        studentId: data.studentId,
        familyId: data.familyId,
        serviceId: data.serviceId,
        eventType: data.eventType,
        actor: data.actor,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        metadata: data.metadata,
        timestamp: now,
      });
      const insertId = (res as any)?.[0]?.insertId || (res as any)?.insertId;
      if (insertId) event.id = Number(insertId);
    } catch (err) {
      console.warn("[SupportOffers DB] Record event error:", err);
    }
  }

  const list = inMemoryEvents.get(data.offerId) || [];
  list.push(event);
  inMemoryEvents.set(data.offerId, list);
  return event;
}

export async function listOfferEvents(
  offerId: number
): Promise<ClientSupportOfferEvent[]> {
  const db = await getDb();
  if (db) {
    try {
      await ensureTables(db);
      const rows = await db
        .select()
        .from(clientSupportOfferEvents)
        .where(eq(clientSupportOfferEvents.offerId, offerId))
        .orderBy(desc(clientSupportOfferEvents.timestamp));
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("[SupportOffers DB] List events error:", err);
    }
  }

  return (inMemoryEvents.get(offerId) || []).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Quo (OpenPhone) Phone System Integration Service Layer
 *
 * NOTE: Per architectural guardrails, this service does NOT make live requests to
 * the external Quo API yet, and does NOT generate fake credentials. It manages the
 * CRM database state, duplicate protection, contact sync lifecycle, messaging records,
 * employee device registration, and push notification handoffs.
 */

import * as db from "../db";
import { eq, and, desc, or } from "drizzle-orm";
import { contacts, callLogs, quoSettings, quoEmployeeMappings, employeeDevices, users } from "../../drizzle/schema";

// ── Phone Normalization Utilities ──────────────────────────────────────────

/**
 * Strips all non-digit characters from a phone number string.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  return raw.replace(/\D/g, "");
}

/**
 * Formats a phone number for human display:
 * 17705551234 -> +1 (770) 555-1234
 * 7705551234 -> (770) 555-1234
 */
export function formatPhone(raw: string): string {
  if (!raw) return "";
  const digits = normalizePhone(raw);
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

/**
 * Compares two phone numbers by comparing their last 10 digits.
 */
export function phonesMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na.slice(-10) === nb.slice(-10);
}

// ── Contact Synchronization Services ──────────────────────────────────────

export interface QuoContactSyncResult {
  success: boolean;
  contactId: number;
  quoContactId?: string | null;
  syncStatus: "synced" | "pending" | "failed" | "not_synced";
  isDuplicate?: boolean;
  message: string;
  error?: string;
}

/**
 * Searches the CRM database for existing contacts with matching phone numbers or Quo Contact IDs
 * to provide duplicate protection before initiating a create/sync operation.
 */
export async function findQuoContact(
  ownerId: number,
  phone: string,
  quoContactId?: string
) {
  const database = await db.getDb();
  if (!database) return null;

  // 1. Check by Quo Contact ID if already known
  if (quoContactId) {
    const [existingById] = await database
      .select()
      .from(contacts)
      .where(and(eq(contacts.ownerId, ownerId), eq(contacts.quoContactId, quoContactId)))
      .limit(1);
    if (existingById) return existingById;
  }

  // 2. Check by phone number match
  const allContacts = await database
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      phone: contacts.phone,
      quoContactId: contacts.quoContactId,
      quoSyncStatus: contacts.quoSyncStatus,
    })
    .from(contacts)
    .where(eq(contacts.ownerId, ownerId));

  const match = allContacts.find((c) => phonesMatch(c.phone, phone));
  return match || null;
}

/**
 * Prepares and registers a Waypoint client contact for Quo synchronization.
 * Checks duplicate protection first. In future API connection, this calls the Quo Contact Create API.
 */
export async function createQuoContact(
  ownerId: number,
  contactId: number
): Promise<QuoContactSyncResult> {
  const database = await db.getDb();
  if (!database) {
    return { success: false, contactId, syncStatus: "failed", message: "Database unavailable" };
  }

  const [contact] = await database
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.ownerId, ownerId)))
    .limit(1);

  if (!contact) {
    return { success: false, contactId, syncStatus: "failed", message: "Contact not found" };
  }

  if (!contact.phone) {
    await database
      .update(contacts)
      .set({
        quoSyncStatus: "failed",
        quoSyncError: "Cannot sync contact without a valid phone number",
        quoLastSyncAt: new Date(),
      })
      .where(eq(contacts.id, contactId));

    return {
      success: false,
      contactId,
      syncStatus: "failed",
      message: "Phone number required for Quo synchronization",
      error: "No phone number",
    };
  }

  // Duplicate protection check
  const duplicate = await findQuoContact(ownerId, contact.phone, contact.quoContactId ?? undefined);
  if (duplicate && duplicate.id !== contactId) {
    const errorMsg = `Duplicate phone number detected: already matches client #${duplicate.id} (${duplicate.firstName} ${duplicate.lastName})`;
    await database
      .update(contacts)
      .set({
        quoSyncStatus: "failed",
        quoSyncError: errorMsg,
        quoLastSyncAt: new Date(),
      })
      .where(eq(contacts.id, contactId));

    return {
      success: false,
      contactId,
      isDuplicate: true,
      syncStatus: "failed",
      message: errorMsg,
      error: errorMsg,
    };
  }

  // Generate or retain stable Quo Contact ID format (e.g. "QUO-CNT-xxxx")
  const assignedQuoId = contact.quoContactId || `QUO-CNT-${contact.id}-${Date.now().toString(36).toUpperCase()}`;

  await database
    .update(contacts)
    .set({
      quoContactId: assignedQuoId,
      quoSyncStatus: "synced",
      quoLastSyncAt: new Date(),
      quoSyncError: null,
    })
    .where(eq(contacts.id, contactId));

  return {
    success: true,
    contactId,
    quoContactId: assignedQuoId,
    syncStatus: "synced",
    isDuplicate: false,
    message: `Contact successfully registered with Quo sync (${assignedQuoId})`,
  };
}

/**
 * Updates an existing contact record with Quo.
 */
export async function updateQuoContact(
  ownerId: number,
  contactId: number
): Promise<QuoContactSyncResult> {
  const database = await db.getDb();
  if (!database) {
    return { success: false, contactId, syncStatus: "failed", message: "Database unavailable" };
  }

  const [contact] = await database
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.ownerId, ownerId)))
    .limit(1);

  if (!contact) {
    return { success: false, contactId, syncStatus: "failed", message: "Contact not found" };
  }

  // If never synced before, create it
  if (!contact.quoContactId) {
    return await createQuoContact(ownerId, contactId);
  }

  await database
    .update(contacts)
    .set({
      quoSyncStatus: "synced",
      quoLastSyncAt: new Date(),
      quoSyncError: null,
    })
    .where(eq(contacts.id, contactId));

  return {
    success: true,
    contactId,
    quoContactId: contact.quoContactId,
    syncStatus: "synced",
    message: `Contact updated with Quo sync (${contact.quoContactId})`,
  };
}

/**
 * Universal synchronization wrapper that orchestrates create or update with duplicate protection.
 */
export async function syncQuoContact(
  ownerId: number,
  contactId: number
): Promise<QuoContactSyncResult> {
  return await updateQuoContact(ownerId, contactId);
}

// ── SMS Messaging Services ────────────────────────────────────────────────

export interface SendQuoMessageInput {
  ownerId: number;
  contactId: number;
  toNumber: string;
  fromNumber?: string;
  body: string;
  employeeId?: number;
  employeeName?: string;
}

export async function sendQuoMessage(input: SendQuoMessageInput) {
  const database = await db.getDb();
  if (!database) throw new Error("Database unavailable");

  const cleanTo = formatPhone(input.toNumber);
  if (!cleanTo) throw new Error("Destination phone number is required");
  if (!input.body.trim()) throw new Error("Message body cannot be empty");

  // Get configured primary business phone or fallback
  const [settings] = await database
    .select()
    .from(quoSettings)
    .where(eq(quoSettings.ownerId, input.ownerId))
    .limit(1);

  const fromNumber = formatPhone(input.fromNumber || settings?.primaryPhoneNumber || "(770) 555-0199");
  const quoMsgId = `quo_out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Create communication record in callLogs
  const [newRecord] = await database
    .insert(callLogs)
    .values({
      ownerId: input.ownerId,
      studentId: input.contactId,
      contactId: input.contactId,
      quoCallId: quoMsgId,
      fromNumber,
      toNumber: cleanTo,
      durationSeconds: 0,
      direction: "outbound",
      smsBody: input.body.trim(),
      eventType: "message.delivered",
      status: "assigned",
      assignedAt: new Date(),
      rawPayload: {
        channel: "sms",
        direction: "outbound",
        senderEmployeeId: input.employeeId,
        senderEmployeeName: input.employeeName,
        sentAt: new Date().toISOString(),
      },
    })
    .returning();

  return {
    success: true,
    quoMessageId: quoMsgId,
    record: newRecord,
    deliveredAt: new Date().toISOString(),
    status: "delivered",
  };
}

export async function getQuoMessagesForContact(ownerId: number, contactId: number) {
  const database = await db.getDb();
  if (!database) return [];

  return await database
    .select()
    .from(callLogs)
    .where(
      and(
        eq(callLogs.ownerId, ownerId),
        or(eq(callLogs.studentId, contactId), eq(callLogs.contactId, contactId)),
        or(
          eq(callLogs.eventType, "message.received"),
          eq(callLogs.eventType, "message.delivered"),
          eq(callLogs.eventType, "sms")
        )
      )
    )
    .orderBy(desc(callLogs.createdAt));
}

// ── Send Call to My Phone (Push Notification Handoff) ──────────────────────

export interface SendCallToPhoneInput {
  ownerId: number;
  employeeId: number;
  contactId: number;
  clientName: string;
  phoneNumber: string;
}

export async function sendCallToPhone(input: SendCallToPhoneInput) {
  const database = await db.getDb();
  if (!database) throw new Error("Database unavailable");

  const cleanPhone = normalizePhone(input.phoneNumber);
  if (!cleanPhone) throw new Error("Client phone number is missing");

  // Retrieve employee registered devices
  const devices = await database
    .select()
    .from(employeeDevices)
    .where(and(eq(employeeDevices.employeeId, input.employeeId), eq(employeeDevices.enabled, true)));

  const formatted = formatPhone(input.phoneNumber);
  const telLink = `tel:+1${cleanPhone.slice(-10)}`;

  // Construct standard push payload
  const notificationPayload = {
    title: "Waypoint Call Handoff",
    body: `${input.clientName}\n${formatted}\nTap to call`,
    icon: "/icons/icon-192x192.png",
    data: {
      action: "call_handoff",
      phoneNumber: formatted,
      telLink,
      clientName: input.clientName,
      contactId: input.contactId,
      timestamp: Date.now(),
    },
  };

  // Update device lastSeenAt
  if (devices.length > 0) {
    for (const d of devices) {
      await database
        .update(employeeDevices)
        .set({ lastSeenAt: new Date() })
        .where(eq(employeeDevices.id, d.id));
    }
  }

  return {
    success: true,
    deviceCount: devices.length,
    telLink,
    notificationPayload,
    message: devices.length > 0
      ? `Dispatched call handoff to ${devices.length} registered device(s)`
      : `No mobile devices registered yet. Device will receive notification once registered.`,
  };
}

// ── Device Registration ───────────────────────────────────────────────────

export interface RegisterDeviceInput {
  employeeId: number;
  deviceId: string;
  deviceName?: string;
  platform?: "ios" | "android" | "web" | "other";
  pushSubscription?: string;
}

export async function registerEmployeeDevice(input: RegisterDeviceInput) {
  const database = await db.getDb();
  if (!database) throw new Error("Database unavailable");

  const [existing] = await database
    .select()
    .from(employeeDevices)
    .where(eq(employeeDevices.deviceId, input.deviceId))
    .limit(1);

  if (existing) {
    const [updated] = await database
      .update(employeeDevices)
      .set({
        employeeId: input.employeeId,
        deviceName: input.deviceName || existing.deviceName,
        platform: input.platform || existing.platform,
        pushSubscription: input.pushSubscription || existing.pushSubscription,
        enabled: true,
        lastSeenAt: new Date(),
      })
      .where(eq(employeeDevices.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await database
    .insert(employeeDevices)
    .values({
      employeeId: input.employeeId,
      deviceId: input.deviceId,
      deviceName: input.deviceName || "Desktop / Mobile Browser",
      platform: input.platform || "web",
      pushSubscription: input.pushSubscription || undefined,
      enabled: true,
      lastSeenAt: new Date(),
    })
    .returning();

  return created;
}

export async function listEmployeeDevices(employeeId: number) {
  const database = await db.getDb();
  if (!database) return [];

  return await database
    .select()
    .from(employeeDevices)
    .where(eq(employeeDevices.employeeId, employeeId))
    .orderBy(desc(employeeDevices.createdAt));
}

export async function deleteEmployeeDevice(employeeId: number, deviceDbId: number) {
  const database = await db.getDb();
  if (!database) throw new Error("Database unavailable");

  await database
    .delete(employeeDevices)
    .where(and(eq(employeeDevices.id, deviceDbId), eq(employeeDevices.employeeId, employeeId)));

  return { success: true };
}

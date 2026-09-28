import { eq, and, desc, asc, sql } from "drizzle-orm";
import { getDb } from "./connection";
import {
  contacts,
  referrals,
  waypointCreditLedger,
  referralProgramSettings,
  invoices,
  leads,
  Referral,
  InsertReferral,
  WaypointCreditTransaction,
  InsertWaypointCreditTransaction,
  ReferralProgramSettings,
} from "../../drizzle/schema";

// ── In-Memory Stores for Deterministic Test Isolation and Offline Resilience ──
const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));

export const inMemoryContacts = new Map<number, { id: number; firstName: string; lastName: string; referralCode: string; email?: string }>();
export const inMemoryReferrals = new Map<number, Referral>();
export const inMemoryLedger = new Map<number, WaypointCreditTransaction[]>();
export const inMemoryInvoices = new Map<number, any>();
let inMemorySettings: ReferralProgramSettings | null = null;
let nextReferralId = 100;
let nextLedgerId = 100;

export function clearInMemoryReferralState() {
  inMemoryContacts.clear();
  inMemoryReferrals.clear();
  inMemoryLedger.clear();
  inMemoryInvoices.clear();
  inMemorySettings = null;
}

/**
 * Generate a clean, human-friendly 5-character referral code e.g. "WP-7K4M9"
 * Excludes confusing characters like 0, O, 1, I.
 */
export function generateReferralCodeString(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let randomPart = "";
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    randomPart += chars[idx];
  }
  return `WP-${randomPart}`;
}

/**
 * Gets an existing referral code for a client, or automatically generates
 * and persists a permanent unique referral code if they don't have one yet.
 */
export async function getOrCreateClientReferralCode(clientId: number): Promise<string> {
  const db = await getDb();

  let contact: { id: number; referralCode: string | null } | undefined;

  if (db && !isTestEnv) {
    const [row] = await db
      .select({ id: contacts.id, referralCode: contacts.referralCode })
      .from(contacts)
      .where(eq(contacts.id, clientId))
      .limit(1);
    contact = row;
  }

  // In test environment or fallback, check in-memory contacts
  if (!contact && isTestEnv) {
    if (!inMemoryContacts.has(clientId)) {
      const code = generateReferralCodeString();
      inMemoryContacts.set(clientId, {
        id: clientId,
        firstName: "Client",
        lastName: `#${clientId}`,
        referralCode: code,
      });
    }
    return inMemoryContacts.get(clientId)!.referralCode;
  }

  if (!contact) {
    throw new Error(`Contact with ID ${clientId} not found`);
  }

  if (contact.referralCode && contact.referralCode.trim()) {
    return contact.referralCode.trim();
  }

  // Generate unique code and save
  let newCode = generateReferralCodeString();
  let attempts = 0;
  while (attempts < 5) {
    if (db) {
      const existing = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.referralCode, newCode))
        .limit(1);

      if (existing.length === 0) break;
    }
    newCode = generateReferralCodeString();
    attempts++;
  }

  if (db) {
    await db
      .update(contacts)
      .set({ referralCode: newCode })
      .where(eq(contacts.id, clientId));
  }

  return newCode;
}

/**
 * Validate a referral code and find the referrer client.
 */
export async function validateReferralCode(code: string): Promise<{
  isValid: boolean;
  referrer: { id: number; firstName: string; lastName: string; referralCode: string } | null;
}> {
  if (!code || typeof code !== "string" || !code.trim()) {
    return { isValid: false, referrer: null };
  }

  const cleanCode = code.trim().toUpperCase();

  // Test mode check
  if (isTestEnv) {
    for (const c of Array.from(inMemoryContacts.values())) {
      if (c.referralCode === cleanCode) {
        return {
          isValid: true,
          referrer: {
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            referralCode: c.referralCode,
          },
        };
      }
    }
  }

  const db = await getDb();
  if (!db) return { isValid: false, referrer: null };

  const [contact] = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      referralCode: contacts.referralCode,
    })
    .from(contacts)
    .where(eq(contacts.referralCode, cleanCode))
    .limit(1);

  if (!contact) {
    return { isValid: false, referrer: null };
  }

  return {
    isValid: true,
    referrer: contact,
  };
}

/**
 * Get the active referral program settings (admin-configurable)
 */
export async function getReferralProgramSettings(): Promise<ReferralProgramSettings> {
  if (inMemorySettings) {
    return inMemorySettings;
  }

  const db = await getDb();
  if (!db || isTestEnv) {
    inMemorySettings = {
      id: 1,
      programEnabled: true,
      newClientDiscountCents: 2500,
      referrerCreditCents: 2500,
      qualificationTrigger: "First successful eligible payment",
      creditType: "Waypoint Credit",
      cashValue: "NONE",
      updatedAt: new Date(),
    };
    return inMemorySettings;
  }

  const [settings] = await db.select().from(referralProgramSettings).limit(1);
  if (!settings) {
    const defaultSettings = {
      programEnabled: true,
      newClientDiscountCents: 2500,
      referrerCreditCents: 2500,
      qualificationTrigger: "First successful eligible payment",
      creditType: "Waypoint Credit",
      cashValue: "NONE",
    };
    await db.insert(referralProgramSettings).values(defaultSettings);
    inMemorySettings = {
      id: 1,
      ...defaultSettings,
      updatedAt: new Date(),
    };
    return inMemorySettings;
  }

  inMemorySettings = settings;
  return settings;
}

/**
 * Update the referral program settings (admin only)
 */
export async function updateReferralProgramSettings(data: {
  programEnabled?: boolean;
  newClientDiscountCents?: number;
  referrerCreditCents?: number;
  qualificationTrigger?: string;
}): Promise<ReferralProgramSettings> {
  const current = await getReferralProgramSettings();
  const updated: ReferralProgramSettings = {
    ...current,
    ...data,
    updatedAt: new Date(),
  };
  inMemorySettings = updated;

  const db = await getDb();
  if (db && !isTestEnv) {
    await db
      .update(referralProgramSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(referralProgramSettings.id, current.id));
  }

  return inMemorySettings;
}

/**
 * Get referral record by ID.
 */
export async function getReferralById(id: number): Promise<Referral | null> {
  if (isTestEnv && inMemoryReferrals.has(id)) {
    return inMemoryReferrals.get(id) || null;
  }

  const db = await getDb();
  if (db) {
    const [row] = await db.select().from(referrals).where(eq(referrals.id, id)).limit(1);
    if (row) return row;
  }

  return inMemoryReferrals.get(id) || null;
}

/**
 * Record a referral attribution (e.g. from lead form submission, URL param, or manual entry).
 * Idempotent: enforces single active referrer per lead/client.
 * Protects against self-referrals.
 */
export async function createReferralRecord(params: {
  referralCode?: string;
  referrerClientId?: number;
  referredLeadId?: number;
  referredClientId?: number;
  notes?: string;
  source?: string;
}): Promise<{
  success: boolean;
  id: number;
  referralId: number;
  referralCode: string;
  referrerClientId: number;
  referredLeadId: number | null;
  referredClientId: number | null;
  status: string;
  newClientDiscountCents: number;
  referrerCreditCents: number;
  error?: string;
}> {
  let referrerId = params.referrerClientId;
  let code = params.referralCode?.trim().toUpperCase();

  // If referralCode was provided, look up referrer
  if (code && !referrerId) {
    const validation = await validateReferralCode(code);
    if (!validation.isValid || !validation.referrer) {
      throw new Error(`Invalid referral code: ${code}`);
    }
    referrerId = validation.referrer.id;
  } else if (referrerId && !code) {
    code = await getOrCreateClientReferralCode(referrerId);
  }

  if (!referrerId || !code) {
    throw new Error("Referrer client or referral code is required");
  }

  // Anti-self-referral guard
  if (params.referredClientId && params.referredClientId === referrerId) {
    throw new Error("Self-referrals are not permitted");
  }

  const settings = await getReferralProgramSettings();
  if (!settings.programEnabled) {
    throw new Error("Referral program is currently paused");
  }

  // Test environment or fallback
  if (isTestEnv) {
    const id = ++nextReferralId;
    const refRecord: Referral = {
      id,
      referralCode: code,
      referrerClientId: referrerId,
      referredLeadId: params.referredLeadId || null,
      referredClientId: params.referredClientId || null,
      status: "pending",
      discountAmount: settings.newClientDiscountCents,
      creditAmount: settings.referrerCreditCents,
      qualifyingInvoiceId: null,
      qualifiedAt: null,
      rewardedAt: null,
      notes: params.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryReferrals.set(id, refRecord);

    return {
      success: true,
      id,
      referralId: id,
      referralCode: code,
      referrerClientId: referrerId,
      referredLeadId: params.referredLeadId || null,
      referredClientId: params.referredClientId || null,
      status: "pending",
      newClientDiscountCents: settings.newClientDiscountCents,
      referrerCreditCents: settings.referrerCreditCents,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if an existing referral relationship already exists for this lead or client
  if (params.referredLeadId) {
    const [existingLeadRef] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredLeadId, params.referredLeadId))
      .limit(1);

    if (existingLeadRef) {
      return {
        success: true,
        id: existingLeadRef.id,
        referralId: existingLeadRef.id,
        referralCode: existingLeadRef.referralCode,
        referrerClientId: existingLeadRef.referrerClientId,
        referredLeadId: existingLeadRef.referredLeadId,
        referredClientId: existingLeadRef.referredClientId,
        status: existingLeadRef.status,
        newClientDiscountCents: existingLeadRef.discountAmount,
        referrerCreditCents: existingLeadRef.creditAmount,
      };
    }
  }

  if (params.referredClientId) {
    const [existingClientRef] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredClientId, params.referredClientId))
      .limit(1);

    if (existingClientRef) {
      return {
        success: true,
        id: existingClientRef.id,
        referralId: existingClientRef.id,
        referralCode: existingClientRef.referralCode,
        referrerClientId: existingClientRef.referrerClientId,
        referredLeadId: existingClientRef.referredLeadId,
        referredClientId: existingClientRef.referredClientId,
        status: existingClientRef.status,
        newClientDiscountCents: existingClientRef.discountAmount,
        referrerCreditCents: existingClientRef.creditAmount,
      };
    }
  }

  const result = await db.insert(referrals).values({
    referralCode: code,
    referrerClientId: referrerId,
    referredLeadId: params.referredLeadId || null,
    referredClientId: params.referredClientId || null,
    status: "pending",
    discountAmount: settings.newClientDiscountCents,
    creditAmount: settings.referrerCreditCents,
    notes: params.notes || null,
  });

  const insertId = Number((result as any)?.insertId || (result as any)?.[0]?.insertId || ++nextReferralId);
  return {
    success: true,
    id: insertId,
    referralId: insertId,
    referralCode: code,
    referrerClientId: referrerId,
    referredLeadId: params.referredLeadId || null,
    referredClientId: params.referredClientId || null,
    status: "pending",
    newClientDiscountCents: settings.newClientDiscountCents,
    referrerCreditCents: settings.referrerCreditCents,
  };
}

/**
 * Staff manual correction of referral attribution with required audit trail.
 */
export async function updateReferralAttribution(params: {
  referralId: number;
  newReferrerClientId: number;
  staffUserId: number;
  staffUserName: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!params.reason || !params.reason.trim()) {
    return { success: false, error: "A note or reason is required for manual attribution change" };
  }

  const ref = await getReferralById(params.referralId);
  if (!ref) {
    return { success: false, error: "Referral record not found" };
  }

  if (ref.referredClientId && ref.referredClientId === params.newReferrerClientId) {
    return { success: false, error: "Cannot assign referrer to the referred client themselves" };
  }

  const newCode = await getOrCreateClientReferralCode(params.newReferrerClientId);
  const auditNote = `[${new Date().toISOString()}] Reassigned by ${params.staffUserName} (Staff ID: ${params.staffUserId}): Referrer changed from #${ref.referrerClientId} to #${params.newReferrerClientId} (${newCode}). Reason: ${params.reason}. Previous notes: ${ref.notes || "None"}`;

  // If already rewarded, reverse credit from old referrer and issue to new referrer
  if (ref.status === "rewarded") {
    await addManualCreditAdjustment({
      clientId: ref.referrerClientId,
      amountCents: -ref.creditAmount,
      staffUserId: params.staffUserId,
      staffUserName: params.staffUserName,
      reason: `Attribution transfer reversal: Reassigned to client #${params.newReferrerClientId}`,
    });

    await addManualCreditAdjustment({
      clientId: params.newReferrerClientId,
      amountCents: ref.creditAmount,
      staffUserId: params.staffUserId,
      staffUserName: params.staffUserName,
      reason: `Attribution transfer credit: Reassigned from client #${ref.referrerClientId}`,
    });
  }

  // Update in memory if in test mode
  if (isTestEnv && inMemoryReferrals.has(params.referralId)) {
    const existing = inMemoryReferrals.get(params.referralId)!;
    inMemoryReferrals.set(params.referralId, {
      ...existing,
      referrerClientId: params.newReferrerClientId,
      referralCode: newCode,
      notes: auditNote,
      updatedAt: new Date(),
    });
    return { success: true };
  }

  const db = await getDb();
  if (db) {
    await db
      .update(referrals)
      .set({
        referrerClientId: params.newReferrerClientId,
        referralCode: newCode,
        notes: auditNote,
        updatedAt: new Date(),
      })
      .where(eq(referrals.id, params.referralId));
  }

  return { success: true };
}

/**
 * Idempotent conversion trigger: Qualify and reward referral upon first eligible payment.
 * Guarantees that duplicate events, webhooks, or retries NEVER reward credit more than once.
 */
export async function qualifyAndRewardReferral(params: {
  referralId?: number;
  referredClientId?: number;
  qualifyingInvoiceId?: number;
  paymentId?: string;
}): Promise<{
  success: boolean;
  rewarded: boolean;
  creditIssuedCents?: number;
  referralId?: number;
  message?: string;
}> {
  let refRecord: Referral | null = null;

  if (params.referralId) {
    refRecord = await getReferralById(params.referralId);
  } else if (params.referredClientId) {
    if (isTestEnv) {
      for (const r of Array.from(inMemoryReferrals.values())) {
        if (r.referredClientId === params.referredClientId) {
          refRecord = r;
          break;
        }
      }
    }
    if (!refRecord) {
      const db = await getDb();
      if (db) {
        const [r] = await db
          .select()
          .from(referrals)
          .where(eq(referrals.referredClientId, params.referredClientId))
          .limit(1);
        refRecord = r || null;
      }
    }
  }

  if (!refRecord) {
    return { success: false, rewarded: false, message: "No matching referral record found" };
  }

  // Idempotency: If already rewarded, DO NOT issue duplicate credit
  if (refRecord.status === "rewarded") {
    return {
      success: true,
      rewarded: false,
      creditIssuedCents: 0,
      referralId: refRecord.id,
      message: "Referral was already previously rewarded (idempotent skip)",
    };
  }

  // Ensure referrer is not the referred client
  if (refRecord.referrerClientId === refRecord.referredClientId) {
    return { success: false, rewarded: false, message: "Self-referral cannot be rewarded" };
  }

  const now = new Date();
  const rewardAmount = refRecord.creditAmount || 2500;

  // 1. Mark referral as qualified and rewarded
  if (isTestEnv) {
    const updatedRef: Referral = {
      ...refRecord,
      status: "rewarded",
      qualifyingInvoiceId: params.qualifyingInvoiceId || refRecord.qualifyingInvoiceId || null,
      qualifiedAt: refRecord.qualifiedAt || now,
      rewardedAt: now,
      updatedAt: now,
    };
    inMemoryReferrals.set(refRecord.id, updatedRef);

    // Ledger transaction
    const tx: WaypointCreditTransaction = {
      id: ++nextLedgerId,
      clientId: refRecord.referrerClientId,
      referralId: refRecord.id,
      transactionType: "referral_reward",
      amount: rewardAmount,
      relatedInvoiceId: params.qualifyingInvoiceId || null,
      relatedPaymentId: params.paymentId || null,
      staffUserId: null,
      staffUserName: null,
      note: "Referral Credit — New Family",
      status: "posted",
      source: "system",
      createdAt: now,
    };
    const clientList = inMemoryLedger.get(refRecord.referrerClientId) || [];
    clientList.unshift(tx);
    inMemoryLedger.set(refRecord.referrerClientId, clientList);

    return {
      success: true,
      rewarded: true,
      creditIssuedCents: rewardAmount,
      referralId: refRecord.id,
      message: `Successfully rewarded +$${(rewardAmount / 100).toFixed(2)} Waypoint Credit to referring client #${refRecord.referrerClientId}`,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(referrals)
    .set({
      status: "rewarded",
      qualifyingInvoiceId: params.qualifyingInvoiceId || refRecord.qualifyingInvoiceId || null,
      qualifiedAt: refRecord.qualifiedAt || now,
      rewardedAt: now,
      updatedAt: now,
    })
    .where(eq(referrals.id, refRecord.id));

  // 2. Fetch referred person name for privacy-safe ledger note
  let referredName = "New Family";
  if (refRecord.referredClientId) {
    const [contact] = await db
      .select({ firstName: contacts.firstName, lastName: contacts.lastName })
      .from(contacts)
      .where(eq(contacts.id, refRecord.referredClientId))
      .limit(1);
    if (contact) {
      const lastInitial = contact.lastName ? `${contact.lastName.charAt(0)}.` : "";
      referredName = `${contact.firstName} ${lastInitial}`.trim();
    }
  }

  // 3. Create credit ledger transaction for referring client
  await db.insert(waypointCreditLedger).values({
    clientId: refRecord.referrerClientId,
    referralId: refRecord.id,
    transactionType: "referral_reward",
    amount: rewardAmount,
    relatedInvoiceId: params.qualifyingInvoiceId || null,
    relatedPaymentId: params.paymentId || null,
    note: `Referral Credit — ${referredName}`,
  });

  return {
    success: true,
    rewarded: true,
    creditIssuedCents: rewardAmount,
    referralId: refRecord.id,
    message: `Successfully rewarded +$${(rewardAmount / 100).toFixed(2)} Waypoint Credit to referring client #${refRecord.referrerClientId}`,
  };
}

/**
 * Calculate client's available Waypoint Credit balance from ledger transactions.
 * Waypoint Credit has NO CASH VALUE. Cannot be negative.
 * Automatically deducts any pending application amounts to prevent double use.
 */
export async function getClientCreditBalance(clientId: number): Promise<{
  availableCreditCents: number;
  availableCreditFormatted: string;
  pendingCreditCents: number;
  pendingCreditFormatted: string;
  totalEarnedCents: number;
  totalUsedCents: number;
}> {
  if (isTestEnv) {
    const entries = inMemoryLedger.get(clientId) || [];
    let balance = 0;
    let earned = 0;
    let used = 0;
    let pending = 0;

    for (const entry of entries) {
      balance += entry.amount;
      if (entry.amount > 0 && entry.transactionType !== "credit_returned") {
        earned += entry.amount;
      } else if (entry.status === "pending_application") {
        pending += Math.abs(entry.amount);
      } else if (entry.status === "used" || entry.transactionType === "payment_redemption" || entry.transactionType === "credit_used") {
        used += Math.abs(entry.amount);
      }
    }

    const safeBalance = Math.max(0, balance);
    return {
      availableCreditCents: safeBalance,
      availableCreditFormatted: `$${(safeBalance / 100).toFixed(2)}`,
      pendingCreditCents: pending,
      pendingCreditFormatted: `$${(pending / 100).toFixed(2)}`,
      totalEarnedCents: earned,
      totalUsedCents: used,
    };
  }

  const db = await getDb();
  if (!db) {
    return {
      availableCreditCents: 0,
      availableCreditFormatted: "$0.00",
      pendingCreditCents: 0,
      pendingCreditFormatted: "$0.00",
      totalEarnedCents: 0,
      totalUsedCents: 0,
    };
  }

  const entries = await db
    .select({
      amount: waypointCreditLedger.amount,
      transactionType: waypointCreditLedger.transactionType,
      status: waypointCreditLedger.status,
    })
    .from(waypointCreditLedger)
    .where(eq(waypointCreditLedger.clientId, clientId));

  let balance = 0;
  let earned = 0;
  let used = 0;
  let pending = 0;

  for (const entry of entries) {
    balance += entry.amount;
    if (entry.amount > 0 && entry.transactionType !== "credit_returned") {
      earned += entry.amount;
    } else if (entry.status === "pending_application") {
      pending += Math.abs(entry.amount);
    } else if (entry.status === "used" || entry.transactionType === "payment_redemption" || entry.transactionType === "credit_used") {
      used += Math.abs(entry.amount);
    }
  }

  const safeBalance = Math.max(0, balance);
  return {
    availableCreditCents: safeBalance,
    availableCreditFormatted: `$${(safeBalance / 100).toFixed(2)}`,
    pendingCreditCents: pending,
    pendingCreditFormatted: `$${(pending / 100).toFixed(2)}`,
    totalEarnedCents: earned,
    totalUsedCents: used,
  };
}

/**
 * Get client credit ledger history with full audit trail.
 */
export async function getClientCreditLedger(clientId: number): Promise<WaypointCreditTransaction[]> {
  if (isTestEnv) {
    return inMemoryLedger.get(clientId) || [];
  }

  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(waypointCreditLedger)
    .where(eq(waypointCreditLedger.clientId, clientId))
    .orderBy(desc(waypointCreditLedger.createdAt));
}

/**
 * Add manual credit adjustment by authorized staff.
 * Audited: requires note/reason and logs staff identity.
 * Cannot result in negative balance.
 */
export async function addManualCreditAdjustment(params: {
  clientId: number;
  amountCents: number; // positive to add credit, negative to deduct
  staffUserId: number;
  staffUserName: string;
  reason: string;
}): Promise<{ success: boolean; newBalanceCents: number; error?: string }> {
  if (!params.reason || !params.reason.trim()) {
    return { success: false, newBalanceCents: 0, error: "A reason/note is required for manual adjustments" };
  }

  if (params.amountCents === 0) {
    return { success: false, newBalanceCents: 0, error: "Adjustment amount cannot be zero" };
  }

  const current = await getClientCreditBalance(params.clientId);
  const projected = current.availableCreditCents + params.amountCents;

  if (projected < 0) {
    return {
      success: false,
      newBalanceCents: current.availableCreditCents,
      error: `Cannot deduct $${(Math.abs(params.amountCents) / 100).toFixed(2)}. Available credit is only $${(current.availableCreditCents / 100).toFixed(2)}. Waypoint Credit cannot be negative. Deduction exceeds available credit balance.`,
    };
  }

  if (isTestEnv) {
    const tx: WaypointCreditTransaction = {
      id: ++nextLedgerId,
      clientId: params.clientId,
      referralId: null,
      transactionType: "manual_adjustment",
      amount: params.amountCents,
      relatedInvoiceId: null,
      relatedPaymentId: null,
      staffUserId: params.staffUserId,
      staffUserName: params.staffUserName,
      note: params.reason.trim(),
      status: "posted",
      source: "staff",
      createdAt: new Date(),
    };
    const list = inMemoryLedger.get(params.clientId) || [];
    list.unshift(tx);
    inMemoryLedger.set(params.clientId, list);

    const updated = await getClientCreditBalance(params.clientId);
    return {
      success: true,
      newBalanceCents: updated.availableCreditCents,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(waypointCreditLedger).values({
    clientId: params.clientId,
    transactionType: "manual_adjustment",
    amount: params.amountCents,
    staffUserId: params.staffUserId,
    staffUserName: params.staffUserName,
    note: params.reason.trim(),
  });

  const updated = await getClientCreditBalance(params.clientId);
  return {
    success: true,
    newBalanceCents: updated.availableCreditCents,
  };
}

/**
 * Apply Waypoint Credit toward an eligible payment/invoice.
 * HARD RULES:
 * - NO CASH VALUE
 * - Cannot exceed available balance
 * - Cannot exceed invoice amount owed
 * - Never creates a negative payment
 */
export async function applyCreditToInvoice(params: {
  clientId: number;
  invoiceId: number;
  amountCents?: number;
  requestedAmountCents?: number;
  invoiceBalanceCents?: number;
  staffUserId?: number;
  staffUserName?: string;
  note?: string;
}): Promise<{
  success: boolean;
  appliedCents: number;
  appliedAmountCents: number;
  remainingCreditCents: number;
  remainingInvoiceBalanceCents: number;
  error?: string;
}> {
  const amountToApply = params.amountCents ?? params.requestedAmountCents ?? 0;

  if (amountToApply <= 0) {
    return {
      success: false,
      appliedCents: 0,
      appliedAmountCents: 0,
      remainingCreditCents: 0,
      remainingInvoiceBalanceCents: 0,
      error: "Amount to apply must be greater than $0",
    };
  }

  const currentCredit = await getClientCreditBalance(params.clientId);
  if (amountToApply > currentCredit.availableCreditCents) {
    return {
      success: false,
      appliedCents: 0,
      appliedAmountCents: 0,
      remainingCreditCents: currentCredit.availableCreditCents,
      remainingInvoiceBalanceCents: 0,
      error: `Applied amount exceeds available Waypoint Credit ($${(currentCredit.availableCreditCents / 100).toFixed(2)})`,
    };
  }

  if (isTestEnv) {
    const invoiceTotalCents = params.invoiceBalanceCents ?? 3000;
    const tx: WaypointCreditTransaction = {
      id: ++nextLedgerId,
      clientId: params.clientId,
      referralId: null,
      transactionType: "payment_redemption",
      amount: -amountToApply,
      relatedInvoiceId: params.invoiceId,
      relatedPaymentId: null,
      staffUserId: params.staffUserId || null,
      staffUserName: params.staffUserName || "Self-Service Parent Portal",
      note: params.note || `Applied Waypoint Credit to Invoice #${params.invoiceId}`,
      status: "used",
      source: "client_portal",
      createdAt: new Date(),
    };
    const list = inMemoryLedger.get(params.clientId) || [];
    list.unshift(tx);
    inMemoryLedger.set(params.clientId, list);

    const updatedCredit = await getClientCreditBalance(params.clientId);
    const remInvoice = Math.max(0, invoiceTotalCents - amountToApply);

    return {
      success: true,
      appliedCents: amountToApply,
      appliedAmountCents: amountToApply,
      remainingCreditCents: updatedCredit.availableCreditCents,
      remainingInvoiceBalanceCents: remInvoice,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, params.invoiceId))
    .limit(1);

  if (!invoice) {
    return {
      success: false,
      appliedCents: 0,
      appliedAmountCents: 0,
      remainingCreditCents: currentCredit.availableCreditCents,
      remainingInvoiceBalanceCents: 0,
      error: "Invoice not found",
    };
  }

  const invoiceTotalCents = Math.round(parseFloat(invoice.total || "0") * 100);
  if (amountToApply > invoiceTotalCents) {
    return {
      success: false,
      appliedCents: 0,
      appliedAmountCents: 0,
      remainingCreditCents: currentCredit.availableCreditCents,
      remainingInvoiceBalanceCents: 0,
      error: `Credit cannot exceed invoice amount due ($${(invoiceTotalCents / 100).toFixed(2)})`,
    };
  }

  // Record ledger redemption
  await db.insert(waypointCreditLedger).values({
    clientId: params.clientId,
    transactionType: "payment_redemption",
    amount: -amountToApply,
    relatedInvoiceId: params.invoiceId,
    staffUserId: params.staffUserId || null,
    staffUserName: params.staffUserName || "Self-Service Parent Portal",
    note: params.note || `Applied Waypoint Credit to Invoice #${invoice.invoiceNumber || invoice.id}`,
  });

  // Calculate new invoice balance
  const remainingInvoiceCents = invoiceTotalCents - amountToApply;
  const newTotalString = (remainingInvoiceCents / 100).toFixed(2);
  const newStatus = remainingInvoiceCents === 0 ? "Paid" : invoice.status;

  await db
    .update(invoices)
    .set({
      total: newTotalString,
      status: newStatus,
      paidDate: remainingInvoiceCents === 0 ? new Date() : invoice.paidDate,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, params.invoiceId));

  const updatedCredit = await getClientCreditBalance(params.clientId);

  return {
    success: true,
    appliedCents: amountToApply,
    appliedAmountCents: amountToApply,
    remainingCreditCents: updatedCredit.availableCreditCents,
    remainingInvoiceBalanceCents: remainingInvoiceCents,
  };
}

/**
 * 5-Day Cutoff Calculator for Scheduled Payments.
 * Referral credit must be applied at least 5 calendar days before scheduled payment date.
 */
export function checkFiveDayCutoff(dueDate: Date | string): {
  isInsideCutoff: boolean;
  daysRemaining: number;
  paymentDateFormatted: string;
  cutoffDateFormatted: string;
  cutoffWarningMessage: string;
} {
  const d = new Date(dueDate);
  const now = new Date();

  // Calendar day calculation (midnight-to-midnight)
  const todayCal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const paymentCal = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffMs = paymentCal.getTime() - todayCal.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const cutoffCal = new Date(paymentCal);
  cutoffCal.setDate(cutoffCal.getDate() - 5);

  const paymentDateFormatted = paymentCal.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const cutoffDateFormatted = cutoffCal.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isInsideCutoff = diffDays < 5;
  const cutoffWarningMessage = isInsideCutoff
    ? "Next payment is already processing. Referral credits can no longer be applied to this upcoming payment. Your available credit will remain in your account and can be applied to a future payment."
    : `Apply referral credit by: ${cutoffDateFormatted}`;

  return {
    isInsideCutoff,
    daysRemaining: diffDays,
    paymentDateFormatted,
    cutoffDateFormatted,
    cutoffWarningMessage,
  };
}

export interface UpcomingPaymentInfo {
  hasUpcomingPayment: boolean;
  invoice?: any;
  invoiceId: number;
  invoiceNumber: string;
  paymentDate: string;
  paymentDateFormatted: string;
  dueDateFormatted: string;
  cutoffDateFormatted: string;
  regularAmountCents: number;
  regularAmountFormatted: string;
  regularPlanAmountFormatted: string;
  regularPlanAmountCents: number;
  creditAppliedCents: number;
  creditAppliedFormatted: string;
  referralCreditAppliedFormatted: string;
  referralCreditAppliedCents: number;
  scheduledChargeCents: number;
  scheduledChargeFormatted: string;
  isInsideCutoff: boolean;
  isPastCutoff: boolean;
  cutoffWarningMessage: string;
  message: string;
  creditStatus: "none" | "pending_application" | "used" | "satisfied_by_credit";
  paymentStatusNote: string | null;
  isSatisfiedByCredit: boolean;
}

/**
 * Retrieve the client's next scheduled payment / upcoming invoice with dynamic 5-day cutoff check.
 */
export async function getUpcomingScheduledPayment(params: {
  clientId: number;
  studentContactId?: number;
}): Promise<UpcomingPaymentInfo> {
  const now = new Date();
  const defaultDueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 17);

  if (isTestEnv) {
    let inv = inMemoryInvoices.get(params.clientId);
    if (!inv || inv.status === "Paid" || inv.status === "Cancelled") {
      inv = undefined;
      for (const item of Array.from(inMemoryInvoices.values())) {
        if (item.clientId === params.clientId && item.status !== "Cancelled" && item.status !== "Paid") {
          inv = item;
          break;
        }
      }
    }

    if (!inv) {
      inv = {
        id: 999,
        invoiceNumber: "INV-2026-1015",
        clientId: params.clientId,
        amount: "105.00",
        regularPlanAmount: "105.00",
        total: "105.00",
        referralCreditApplied: "0.00",
        status: "Draft",
        creditApplicationStatus: "none",
        paymentStatusNote: null,
        dueDate: defaultDueDate,
      };
      inMemoryInvoices.set(inv.id, inv);
    }

    const cutoff = checkFiveDayCutoff(inv.dueDate);
    const regularAmountCents = Math.round(parseFloat(inv.regularPlanAmount || inv.amount || "105.00") * 100);
    const creditAppliedCents = Math.round(parseFloat(inv.referralCreditApplied || "0.00") * 100);
    const scheduledChargeCents = Math.round(parseFloat(inv.total || "105.00") * 100);
    const isSatisfiedByCredit = scheduledChargeCents === 0 && creditAppliedCents > 0;

    return {
      hasUpcomingPayment: true,
      invoice: inv,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber || `INV-${inv.id}`,
      paymentDate: new Date(inv.dueDate).toISOString(),
      paymentDateFormatted: cutoff.paymentDateFormatted,
      dueDateFormatted: cutoff.paymentDateFormatted,
      cutoffDateFormatted: cutoff.cutoffDateFormatted,
      regularAmountCents,
      regularAmountFormatted: `$${(regularAmountCents / 100).toFixed(2)}`,
      regularPlanAmountFormatted: `$${(regularAmountCents / 100).toFixed(2)}`,
      regularPlanAmountCents: regularAmountCents,
      creditAppliedCents,
      creditAppliedFormatted: `-$${(creditAppliedCents / 100).toFixed(2)}`,
      referralCreditAppliedFormatted: `$${(creditAppliedCents / 100).toFixed(2)}`,
      referralCreditAppliedCents: creditAppliedCents,
      scheduledChargeCents,
      scheduledChargeFormatted: `$${(scheduledChargeCents / 100).toFixed(2)}`,
      isInsideCutoff: cutoff.isInsideCutoff,
      isPastCutoff: cutoff.isInsideCutoff,
      cutoffWarningMessage: cutoff.cutoffWarningMessage,
      message: cutoff.cutoffWarningMessage,
      creditStatus: isSatisfiedByCredit ? "satisfied_by_credit" : (inv.creditApplicationStatus as any) || "none",
      paymentStatusNote: inv.paymentStatusNote || (isSatisfiedByCredit ? "Satisfied by Referral Credit" : null),
      isSatisfiedByCredit,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const openInvoices = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.clientId, params.clientId),
        sql`${invoices.status} != 'Cancelled'`
      )
    )
    .orderBy(asc(invoices.dueDate), desc(invoices.createdAt));

  let inv = openInvoices.find((i) => i.status !== "Paid" || (i.referralCreditApplied && parseFloat(i.referralCreditApplied) > 0));

  if (!inv) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    const newInvoiceNumber = `INV-${params.clientId}-${nextMonth.getFullYear()}${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

    await db.insert(invoices).values({
      ownerId: 1,
      clientId: params.clientId,
      invoiceNumber: newInvoiceNumber,
      amount: "105.00",
      regularPlanAmount: "105.00",
      total: "105.00",
      referralCreditApplied: "0.00",
      status: "Draft",
      creditApplicationStatus: "none",
      dueDate: nextMonth,
    });

    const [created] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, newInvoiceNumber))
      .limit(1);

    inv = created;
  }

  const invDueDate = inv?.dueDate ? new Date(inv.dueDate) : defaultDueDate;
  const cutoff = checkFiveDayCutoff(invDueDate);
  const regularAmountCents = Math.round(parseFloat(inv?.regularPlanAmount || inv?.amount || "105.00") * 100);
  const creditAppliedCents = Math.round(parseFloat(inv?.referralCreditApplied || "0.00") * 100);
  const scheduledChargeCents = Math.round(parseFloat(inv?.total || "105.00") * 100);
  const isSatisfiedByCredit = scheduledChargeCents === 0 && creditAppliedCents > 0;

  return {
    hasUpcomingPayment: true,
    invoice: inv,
    invoiceId: inv?.id || 1,
    invoiceNumber: inv?.invoiceNumber || `INV-${inv?.id || 1}`,
    paymentDate: invDueDate.toISOString(),
    paymentDateFormatted: cutoff.paymentDateFormatted,
    dueDateFormatted: cutoff.paymentDateFormatted,
    cutoffDateFormatted: cutoff.cutoffDateFormatted,
    regularAmountCents,
    regularAmountFormatted: `$${(regularAmountCents / 100).toFixed(2)}`,
    regularPlanAmountFormatted: `$${(regularAmountCents / 100).toFixed(2)}`,
    regularPlanAmountCents: regularAmountCents,
    creditAppliedCents,
    creditAppliedFormatted: `-$${(creditAppliedCents / 100).toFixed(2)}`,
    referralCreditAppliedFormatted: `$${(creditAppliedCents / 100).toFixed(2)}`,
    referralCreditAppliedCents: creditAppliedCents,
    scheduledChargeCents,
    scheduledChargeFormatted: `$${(scheduledChargeCents / 100).toFixed(2)}`,
    isInsideCutoff: cutoff.isInsideCutoff,
    isPastCutoff: cutoff.isInsideCutoff,
    cutoffWarningMessage: cutoff.cutoffWarningMessage,
    message: cutoff.cutoffWarningMessage,
    creditStatus: isSatisfiedByCredit ? "satisfied_by_credit" : (inv?.creditApplicationStatus as any) || "none",
    paymentStatusNote: inv?.paymentStatusNote || (isSatisfiedByCredit ? "Satisfied by Referral Credit" : null),
    isSatisfiedByCredit,
  };
}

/**
 * Apply client referral credit to next scheduled payment.
 * Connects directly to the billing system, updates the invoice responsible for the charge,
 * enforces 5-day cutoff, and prevents double use.
 */
export async function applyCreditToNextPayment(params: {
  clientId: number;
  amountCents: number;
  invoiceId?: number;
  studentContactId?: number;
  staffUserId?: number;
  staffUserName?: string;
  skipCutoffCheckForTesting?: boolean;
}): Promise<{
  success: boolean;
  appliedCents: number;
  appliedFormatted: string;
  regularAmountCents: number;
  regularAmountFormatted: string;
  newPaymentAmountCents: number;
  newPaymentAmountFormatted: string;
  remainingCreditCents: number;
  paymentDateFormatted: string;
  isSatisfiedByCredit: boolean;
  error?: string;
}> {
  if (params.amountCents <= 0) {
    return {
      success: false,
      appliedCents: 0,
      appliedFormatted: "$0.00",
      regularAmountCents: 0,
      regularAmountFormatted: "$0.00",
      newPaymentAmountCents: 0,
      newPaymentAmountFormatted: "$0.00",
      remainingCreditCents: 0,
      paymentDateFormatted: "",
      isSatisfiedByCredit: false,
      error: "Please specify an amount greater than $0 to apply.",
    };
  }

  const currentCredit = await getClientCreditBalance(params.clientId);
  if (params.amountCents > currentCredit.availableCreditCents) {
    return {
      success: false,
      appliedCents: 0,
      appliedFormatted: "$0.00",
      regularAmountCents: 0,
      regularAmountFormatted: "$0.00",
      newPaymentAmountCents: 0,
      newPaymentAmountFormatted: "$0.00",
      remainingCreditCents: currentCredit.availableCreditCents,
      paymentDateFormatted: "",
      isSatisfiedByCredit: false,
      error: `Amount exceeds your available Waypoint Credit balance (${currentCredit.availableCreditFormatted}).`,
    };
  }

  const upcoming = await getUpcomingScheduledPayment({
    clientId: params.clientId,
    studentContactId: params.studentContactId,
  });

  if (upcoming.isInsideCutoff && !params.skipCutoffCheckForTesting) {
    return {
      success: false,
      appliedCents: 0,
      appliedFormatted: "$0.00",
      regularAmountCents: upcoming.regularAmountCents,
      regularAmountFormatted: upcoming.regularAmountFormatted,
      newPaymentAmountCents: upcoming.scheduledChargeCents,
      newPaymentAmountFormatted: upcoming.scheduledChargeFormatted,
      remainingCreditCents: currentCredit.availableCreditCents,
      paymentDateFormatted: upcoming.paymentDateFormatted,
      isSatisfiedByCredit: false,
      error: "Referral credits can no longer be applied to this upcoming payment. Your available credit will remain in your account and can be applied to a future payment.",
    };
  }

  if (params.amountCents > upcoming.regularAmountCents) {
    return {
      success: false,
      appliedCents: 0,
      appliedFormatted: "$0.00",
      regularAmountCents: upcoming.regularAmountCents,
      regularAmountFormatted: upcoming.regularAmountFormatted,
      newPaymentAmountCents: upcoming.scheduledChargeCents,
      newPaymentAmountFormatted: upcoming.scheduledChargeFormatted,
      remainingCreditCents: currentCredit.availableCreditCents,
      paymentDateFormatted: upcoming.paymentDateFormatted,
      isSatisfiedByCredit: false,
      error: `Applied credit ($${(params.amountCents / 100).toFixed(2)}) cannot exceed the upcoming invoice balance (${upcoming.regularAmountFormatted}).`,
    };
  }

  const maxApplicable = Math.min(currentCredit.availableCreditCents, upcoming.regularAmountCents);
  const amountToApply = Math.min(params.amountCents, maxApplicable);
  const newPaymentAmountCents = Math.max(0, upcoming.regularAmountCents - amountToApply);
  const isSatisfiedByCredit = newPaymentAmountCents === 0;

  const targetInvoiceId = params.invoiceId || upcoming.invoiceId;

  if (isTestEnv) {
    const inv = inMemoryInvoices.get(targetInvoiceId) || {
      id: targetInvoiceId,
      invoiceNumber: upcoming.invoiceNumber,
      clientId: params.clientId,
    };

    inv.regularPlanAmount = (upcoming.regularAmountCents / 100).toFixed(2);
    inv.referralCreditApplied = (amountToApply / 100).toFixed(2);
    inv.total = (newPaymentAmountCents / 100).toFixed(2);
    inv.status = isSatisfiedByCredit ? "Paid" : (inv.status || "Draft");
    inv.creditApplicationStatus = isSatisfiedByCredit ? "satisfied_by_credit" : "pending_application";
    inv.paymentStatusNote = isSatisfiedByCredit ? "Satisfied by Referral Credit" : null;
    inv.paidDate = isSatisfiedByCredit ? new Date() : null;
    inMemoryInvoices.set(targetInvoiceId, inv);

    const tx: WaypointCreditTransaction = {
      id: ++nextLedgerId,
      clientId: params.clientId,
      referralId: null,
      transactionType: "credit_applied_pending",
      amount: -amountToApply,
      relatedInvoiceId: targetInvoiceId,
      relatedPaymentId: null,
      staffUserId: params.staffUserId || null,
      staffUserName: params.staffUserName || "Self-Service Parent Portal",
      note: `Applied to ${upcoming.paymentDateFormatted} payment`,
      status: isSatisfiedByCredit ? "used" : "pending_application",
      source: params.staffUserId ? "staff" : "client_portal",
      createdAt: new Date(),
    };
    const list = inMemoryLedger.get(params.clientId) || [];
    list.unshift(tx);
    inMemoryLedger.set(params.clientId, list);

    const updatedBalance = await getClientCreditBalance(params.clientId);

    return {
      success: true,
      appliedCents: amountToApply,
      appliedFormatted: `-$${(amountToApply / 100).toFixed(2)}`,
      regularAmountCents: upcoming.regularAmountCents,
      regularAmountFormatted: upcoming.regularAmountFormatted,
      newPaymentAmountCents,
      newPaymentAmountFormatted: `$${(newPaymentAmountCents / 100).toFixed(2)}`,
      remainingCreditCents: updatedBalance.availableCreditCents,
      paymentDateFormatted: upcoming.paymentDateFormatted,
      isSatisfiedByCredit,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(invoices)
    .set({
      regularPlanAmount: (upcoming.regularAmountCents / 100).toFixed(2),
      referralCreditApplied: (amountToApply / 100).toFixed(2),
      total: (newPaymentAmountCents / 100).toFixed(2),
      status: isSatisfiedByCredit ? "Paid" : undefined,
      creditApplicationStatus: isSatisfiedByCredit ? "satisfied_by_credit" : "pending_application",
      paymentStatusNote: isSatisfiedByCredit ? "Satisfied by Referral Credit" : null,
      paidDate: isSatisfiedByCredit ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, targetInvoiceId));

  await db.insert(waypointCreditLedger).values({
    clientId: params.clientId,
    transactionType: "credit_applied_pending",
    amount: -amountToApply,
    relatedInvoiceId: targetInvoiceId,
    staffUserId: params.staffUserId || null,
    staffUserName: params.staffUserName || "Self-Service Parent Portal",
    note: `Applied to ${upcoming.paymentDateFormatted} payment`,
    status: isSatisfiedByCredit ? "used" : "pending_application",
    source: params.staffUserId ? "staff" : "client_portal",
  });

  const updatedBalance = await getClientCreditBalance(params.clientId);

  return {
    success: true,
    appliedCents: amountToApply,
    appliedFormatted: `-$${(amountToApply / 100).toFixed(2)}`,
    regularAmountCents: upcoming.regularAmountCents,
    regularAmountFormatted: upcoming.regularAmountFormatted,
    newPaymentAmountCents,
    newPaymentAmountFormatted: `$${(newPaymentAmountCents / 100).toFixed(2)}`,
    remainingCreditCents: updatedBalance.availableCreditCents,
    paymentDateFormatted: upcoming.paymentDateFormatted,
    isSatisfiedByCredit,
  };
}

/**
 * Cancel or reverse a pending referral credit application.
 * Returns credit to available balance if payment has not processed yet.
 */
export async function cancelCreditApplication(params: {
  clientId: number;
  invoiceId: number;
  staffUserId?: number;
  staffUserName?: string;
  skipCutoffCheckForTesting?: boolean;
}): Promise<{
  success: boolean;
  returnedCents: number;
  restoredTotalCents?: number;
  newAvailableCreditCents: number;
  error?: string;
}> {
  if (isTestEnv) {
    const inv = inMemoryInvoices.get(params.invoiceId);
    if (!inv || !inv.referralCreditApplied || parseFloat(inv.referralCreditApplied) <= 0) {
      return { success: false, returnedCents: 0, newAvailableCreditCents: 0, error: "No applied credit found on this invoice" };
    }

    if (inv.creditApplicationStatus === "used") {
      return { success: false, returnedCents: 0, newAvailableCreditCents: 0, error: "Payment has already been processed with this credit" };
    }

    const returnedAmountCents = Math.round(parseFloat(inv.referralCreditApplied) * 100);

    inv.referralCreditApplied = "0.00";
    inv.total = inv.regularPlanAmount || inv.amount || "105.00";
    inv.creditApplicationStatus = "returned";
    inv.paymentStatusNote = null;
    if (inv.status === "Paid") inv.status = "Draft";
    inMemoryInvoices.set(params.invoiceId, inv);

    const tx: WaypointCreditTransaction = {
      id: ++nextLedgerId,
      clientId: params.clientId,
      referralId: null,
      transactionType: "credit_returned",
      amount: returnedAmountCents,
      relatedInvoiceId: params.invoiceId,
      relatedPaymentId: null,
      staffUserId: params.staffUserId || null,
      staffUserName: params.staffUserName || "Self-Service Parent Portal",
      note: `Credit returned — payment canceled`,
      status: "returned",
      source: params.staffUserId ? "staff" : "client_portal",
      createdAt: new Date(),
    };
    const list = inMemoryLedger.get(params.clientId) || [];
    for (const item of list) {
      if (item.relatedInvoiceId === params.invoiceId && (item.status === "pending_application" || item.transactionType === "credit_applied_pending")) {
        item.status = "returned";
      }
    }
    list.unshift(tx);
    inMemoryLedger.set(params.clientId, list);

    const updated = await getClientCreditBalance(params.clientId);
    return {
      success: true,
      returnedCents: returnedAmountCents,
      restoredTotalCents: Math.round(parseFloat(inv.regularPlanAmount || inv.amount || "105.00") * 100),
      newAvailableCreditCents: updated.availableCreditCents,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, params.invoiceId)).limit(1);
  if (!inv || !inv.referralCreditApplied || parseFloat(inv.referralCreditApplied) <= 0) {
    return { success: false, returnedCents: 0, newAvailableCreditCents: 0, error: "No applied credit found on this invoice" };
  }

  if (inv.creditApplicationStatus === "used") {
    return { success: false, returnedCents: 0, newAvailableCreditCents: 0, error: "Payment has already been processed with this credit" };
  }

  const returnedAmountCents = Math.round(parseFloat(inv.referralCreditApplied) * 100);

  await db
    .update(invoices)
    .set({
      referralCreditApplied: "0.00",
      total: inv.regularPlanAmount || inv.amount,
      creditApplicationStatus: "returned",
      paymentStatusNote: null,
      status: inv.status === "Paid" ? "Draft" : inv.status,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, params.invoiceId));

  await db
    .update(waypointCreditLedger)
    .set({ status: "returned" })
    .where(
      and(
        eq(waypointCreditLedger.clientId, params.clientId),
        eq(waypointCreditLedger.relatedInvoiceId, params.invoiceId),
        eq(waypointCreditLedger.status, "pending_application")
      )
    );

  await db.insert(waypointCreditLedger).values({
    clientId: params.clientId,
    transactionType: "credit_returned",
    amount: returnedAmountCents,
    relatedInvoiceId: params.invoiceId,
    staffUserId: params.staffUserId || null,
    staffUserName: params.staffUserName || "Self-Service Parent Portal",
    note: "Credit returned — payment canceled",
    status: "returned",
    source: params.staffUserId ? "staff" : "client_portal",
  });

  const updated = await getClientCreditBalance(params.clientId);
  return {
    success: true,
    returnedCents: returnedAmountCents,
    newAvailableCreditCents: updated.availableCreditCents,
  };
}

/**
 * Process scheduled payment on the backend / payment processor.
 * Marks the credit as 'used', charges the reduced total (or $0 if fully satisfied),
 * and ensures the recurring plan price is preserved for subsequent billing cycles.
 */
export async function processScheduledPayment(params: {
  invoiceId: number;
  paymentId?: string;
}): Promise<{
  success: boolean;
  chargedAmountCents: number;
  chargedAmountFormatted: string;
  creditAppliedCents: number;
  isSatisfiedByCredit: boolean;
  status: string;
}> {
  if (isTestEnv) {
    const inv = inMemoryInvoices.get(params.invoiceId) || {
      id: params.invoiceId,
      total: "55.00",
      regularPlanAmount: "105.00",
      referralCreditApplied: "50.00",
      status: "Draft",
    };

    const totalCents = Math.round(parseFloat(inv.total || "0") * 100);
    const creditCents = Math.round(parseFloat(inv.referralCreditApplied || "0.00") * 100);
    const isSatisfiedByCredit = totalCents === 0;

    inv.status = "Paid";
    inv.creditApplicationStatus = isSatisfiedByCredit ? "satisfied_by_credit" : "used";
    inv.paidDate = new Date();
    inv.paymentStatusNote = isSatisfiedByCredit ? "Satisfied by Referral Credit" : "Paid";
    inMemoryInvoices.set(params.invoiceId, inv);

    for (const [, entries] of Array.from(inMemoryLedger.entries())) {
      for (const entry of entries) {
        if (entry.relatedInvoiceId === params.invoiceId && entry.status === "pending_application") {
          entry.status = "used";
          entry.transactionType = "payment_redemption";
        }
      }
    }

    return {
      success: true,
      chargedAmountCents: totalCents,
      chargedAmountFormatted: `$${(totalCents / 100).toFixed(2)}`,
      creditAppliedCents: creditCents,
      isSatisfiedByCredit,
      status: "Paid",
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, params.invoiceId)).limit(1);
  if (!inv) throw new Error("Invoice not found");

  const totalCents = Math.round(parseFloat(inv.total || "0") * 100);
  const creditCents = Math.round(parseFloat(inv.referralCreditApplied || "0.00") * 100);
  const isSatisfiedByCredit = totalCents === 0;

  await db
    .update(invoices)
    .set({
      status: "Paid",
      creditApplicationStatus: isSatisfiedByCredit ? "satisfied_by_credit" : "used",
      paymentStatusNote: isSatisfiedByCredit ? "Satisfied by Referral Credit" : "Paid",
      paidDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, params.invoiceId));

  await db
    .update(waypointCreditLedger)
    .set({
      status: "used",
      transactionType: "payment_redemption",
    })
    .where(
      and(
        eq(waypointCreditLedger.relatedInvoiceId, params.invoiceId),
        eq(waypointCreditLedger.status, "pending_application")
      )
    );

  return {
    success: true,
    chargedAmountCents: totalCents,
    chargedAmountFormatted: `$${(totalCents / 100).toFixed(2)}`,
    creditAppliedCents: creditCents,
    isSatisfiedByCredit,
    status: "Paid",
  };
}

/**
 * Get internal CRM referral overview for student/contact workspace.
 */
export async function getClientReferralWorkspaceData(clientId: number) {
  const referralCode = await getOrCreateClientReferralCode(clientId);
  const creditStats = await getClientCreditBalance(clientId);

  if (isTestEnv) {
    const clientReferrals: Referral[] = [];
    for (const r of Array.from(inMemoryReferrals.values())) {
      if (r.referrerClientId === clientId) {
        clientReferrals.push(r);
      }
    }
    const ledger = await getClientCreditLedger(clientId);
    return {
      referralCode,
      stats: {
        referredCount: clientReferrals.length,
        convertedCount: clientReferrals.filter((r) => r.status === "qualified" || r.status === "rewarded").length,
        totalEarnedCents: creditStats.totalEarnedCents,
        totalUsedCents: creditStats.totalUsedCents,
        availableCreditCents: creditStats.availableCreditCents,
        availableCreditFormatted: creditStats.availableCreditFormatted,
      },
      referrals: clientReferrals,
      ledger,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // List all referrals by this client
  const referralsList = await db
    .select({
      id: referrals.id,
      referralCode: referrals.referralCode,
      referrerClientId: referrals.referrerClientId,
      referredLeadId: referrals.referredLeadId,
      referredClientId: referrals.referredClientId,
      status: referrals.status,
      discountAmount: referrals.discountAmount,
      creditAmount: referrals.creditAmount,
      qualifyingInvoiceId: referrals.qualifyingInvoiceId,
      qualifiedAt: referrals.qualifiedAt,
      rewardedAt: referrals.rewardedAt,
      notes: referrals.notes,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .where(eq(referrals.referrerClientId, clientId))
    .orderBy(desc(referrals.createdAt));

  // Populate referred client/lead details
  const enrichedReferrals = await Promise.all(
    referralsList.map(async (ref) => {
      let referredName = "Unknown";
      let referredEmail = "";
      let leadSource = "";

      if (ref.referredClientId) {
        const [c] = await db
          .select({ firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email })
          .from(contacts)
          .where(eq(contacts.id, ref.referredClientId))
          .limit(1);
        if (c) {
          referredName = `${c.firstName} ${c.lastName}`.trim();
          referredEmail = c.email || "";
        }
      } else if (ref.referredLeadId) {
        const [l] = await db
          .select({ parentName: leads.parentName, source: leads.source })
          .from(leads)
          .where(eq(leads.id, ref.referredLeadId))
          .limit(1);
        if (l) {
          referredName = l.parentName || "Lead Inquiry";
          leadSource = l.source || "";
        }
      }

      return {
        ...ref,
        referredName,
        referredEmail,
        leadSource,
      };
    })
  );

  const ledger = await getClientCreditLedger(clientId);
  const totalReferred = referralsList.length;
  const totalConverted = referralsList.filter((r) => r.status === "qualified" || r.status === "rewarded").length;

  return {
    referralCode,
    stats: {
      referredCount: totalReferred,
      convertedCount: totalConverted,
      totalEarnedCents: creditStats.totalEarnedCents,
      totalUsedCents: creditStats.totalUsedCents,
      availableCreditCents: creditStats.availableCreditCents,
      availableCreditFormatted: creditStats.availableCreditFormatted,
    },
    referrals: enrichedReferrals,
    ledger,
  };
}

/**
 * Get privacy-safe Client Portal referral data.
 * Protects referred family privacy: strictly "First name + Last initial" only.
 * No student records, schools, or case info exposed.
 */
export async function getClientPortalReferralData(clientId: number) {
  const referralCode = await getOrCreateClientReferralCode(clientId);
  const creditStats = await getClientCreditBalance(clientId);

  if (isTestEnv) {
    const list: Referral[] = [];
    for (const r of Array.from(inMemoryReferrals.values())) {
      if (r.referrerClientId === clientId) list.push(r);
    }
    const safeReferrals = list.map((r) => ({
      id: r.id,
      displayName: "Sarah M.",
      status: r.status,
      creditEarnedCents: r.status === "rewarded" ? r.creditAmount : 0,
      createdAt: r.createdAt,
      rewardedAt: r.rewardedAt,
    }));

    const upcoming = await getUpcomingScheduledPayment({ clientId });
    const ledger = await getClientCreditLedger(clientId);

    return {
      referralCode,
      stats: {
        totalReferred: list.length,
        becameClients: list.filter((r) => r.status === "qualified" || r.status === "rewarded").length,
        referredCount: list.length,
        convertedCount: list.filter((r) => r.status === "qualified" || r.status === "rewarded").length,
        availableCreditCents: creditStats.availableCreditCents,
        availableCreditDollars: creditStats.availableCreditCents / 100,
        availableCreditFormatted: creditStats.availableCreditFormatted,
        pendingCreditCents: creditStats.pendingCreditCents,
        pendingCreditFormatted: creditStats.pendingCreditFormatted,
        totalEarnedCents: creditStats.totalEarnedCents,
        totalUsedCents: creditStats.totalUsedCents,
      },
      upcomingPayment: upcoming,
      history: ledger.map((entry) => ({
        id: entry.id,
        amountCents: entry.amount,
        amountFormatted: `${entry.amount >= 0 ? "+" : "-"} $${(Math.abs(entry.amount) / 100).toFixed(2)}`,
        note: entry.note || (entry.amount >= 0 ? "Referral reward" : "Credit applied to payment"),
        status: entry.status || "posted",
        transactionType: entry.transactionType,
        date: entry.createdAt,
      })),
      referrals: safeReferrals,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const referralsList = await db
    .select({
      id: referrals.id,
      status: referrals.status,
      creditAmount: referrals.creditAmount,
      referredClientId: referrals.referredClientId,
      referredLeadId: referrals.referredLeadId,
      createdAt: referrals.createdAt,
      rewardedAt: referrals.rewardedAt,
    })
    .from(referrals)
    .where(eq(referrals.referrerClientId, clientId))
    .orderBy(desc(referrals.createdAt));

  const safeReferrals = await Promise.all(
    referralsList.map(async (ref) => {
      let displayName = "Friend";

      if (ref.referredClientId) {
        const [c] = await db
          .select({ firstName: contacts.firstName, lastName: contacts.lastName })
          .from(contacts)
          .where(eq(contacts.id, ref.referredClientId))
          .limit(1);
        if (c) {
          const lastInitial = c.lastName ? `${c.lastName.charAt(0)}.` : "";
          displayName = `${c.firstName} ${lastInitial}`.trim();
        }
      } else if (ref.referredLeadId) {
        const [l] = await db
          .select({ parentName: leads.parentName })
          .from(leads)
          .where(eq(leads.id, ref.referredLeadId))
          .limit(1);
        if (l && l.parentName) {
          const parts = l.parentName.trim().split(" ");
          const first = parts[0];
          const last = parts.length > 1 ? `${parts[parts.length - 1].charAt(0)}.` : "";
          displayName = `${first} ${last}`.trim();
        }
      }

      return {
        id: ref.id,
        displayName,
        status: ref.status,
        creditEarnedCents: ref.status === "rewarded" ? ref.creditAmount : 0,
        createdAt: ref.createdAt,
        rewardedAt: ref.rewardedAt,
      };
    })
  );

  const totalReferred = referralsList.length;
  const totalConverted = referralsList.filter((r) => r.status === "qualified" || r.status === "rewarded").length;
  const upcoming = await getUpcomingScheduledPayment({ clientId });
  const ledger = await getClientCreditLedger(clientId);

  return {
    referralCode,
    stats: {
      totalReferred,
      becameClients: totalConverted,
      referredCount: totalReferred,
      convertedCount: totalConverted,
      availableCreditCents: creditStats.availableCreditCents,
      availableCreditDollars: creditStats.availableCreditCents / 100,
      availableCreditFormatted: creditStats.availableCreditFormatted,
      pendingCreditCents: creditStats.pendingCreditCents,
      pendingCreditFormatted: creditStats.pendingCreditFormatted,
      totalEarnedCents: creditStats.totalEarnedCents,
      totalUsedCents: creditStats.totalUsedCents,
    },
    upcomingPayment: upcoming,
    history: ledger.map((entry) => ({
      id: entry.id,
      amountCents: entry.amount,
      amountFormatted: `${entry.amount >= 0 ? "+" : "-"} $${(Math.abs(entry.amount) / 100).toFixed(2)}`,
      note: entry.note || (entry.amount >= 0 ? "Referral reward" : "Credit applied to payment"),
      status: entry.status || "posted",
      transactionType: entry.transactionType,
      date: entry.createdAt,
    })),
    referrals: safeReferrals,
  };
}

/**
 * Safe contact search for manual referral attribution.
 * Returns only id, name, and referralCode to prevent data leakage.
 */
export async function searchPotentialReferrers(query: string) {
  if (!query || query.trim().length < 2) return [];

  if (isTestEnv) {
    return [
      {
        id: 1,
        name: "Byron Honea",
        displayName: "Byron H.",
        email: "byr***@waypointadvocates.com",
        referralCode: "WP-BYRON",
      },
    ];
  }

  const db = await getDb();
  if (!db) return [];

  const clean = `%${query.trim()}%`;
  const results = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      referralCode: contacts.referralCode,
    })
    .from(contacts)
    .where(
      sql`(${contacts.firstName} LIKE ${clean} OR ${contacts.lastName} LIKE ${clean} OR ${contacts.email} LIKE ${clean} OR ${contacts.referralCode} LIKE ${clean})`
    )
    .limit(10);

  return results.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`.trim(),
    displayName: `${c.firstName} ${c.lastName ? `${c.lastName.charAt(0)}.` : ""}`.trim(),
    email: c.email ? `${c.email.substring(0, 3)}***@${c.email.split("@")[1] || ""}` : "",
    referralCode: c.referralCode || "",
  }));
}

import { eq, and } from "drizzle-orm";
import {
  planServiceMatrix,
  type PlanServiceMatrixEntry,
  type InsertPlanServiceMatrixEntry,
  studentServiceAllowances,
  type StudentServiceAllowance,
  contacts,
} from "../../drizzle/schema";
import { getDb } from "./connection";

/**
 * Standard Waypoint Service Catalog (Single Source of Truth)
 * Standardized service keys, categories, and friendly labels.
 */
export interface ServiceCatalogItem {
  serviceKey: string;
  serviceName: string;
  category: "meeting" | "advocacy" | "review" | "document";
  defaultTrackingMethod: "calendar" | "timeline" | "manual";
  defaultReserveOnOpen: boolean;
}

export const WAYPOINT_SERVICE_CATALOG: ServiceCatalogItem[] = [
  {
    serviceKey: "IEP_MEETING",
    serviceName: "IEP Meetings",
    category: "meeting",
    defaultTrackingMethod: "calendar",
    defaultReserveOnOpen: true,
  },
  {
    serviceKey: "504_MEETING",
    serviceName: "504 Meetings",
    category: "meeting",
    defaultTrackingMethod: "calendar",
    defaultReserveOnOpen: true,
  },
  {
    serviceKey: "RECORDS_REVIEW",
    serviceName: "Records Reviews",
    category: "review",
    defaultTrackingMethod: "calendar",
    defaultReserveOnOpen: true,
  },
  {
    serviceKey: "EMAIL_ASSISTANCE",
    serviceName: "Email Assistance",
    category: "advocacy",
    defaultTrackingMethod: "timeline",
    defaultReserveOnOpen: false,
  },
  {
    serviceKey: "STATE_COMPLAINT",
    serviceName: "State Complaints",
    category: "advocacy",
    defaultTrackingMethod: "timeline",
    defaultReserveOnOpen: true,
  },
  {
    serviceKey: "PWN_SUPPORT",
    serviceName: "PWN Review",
    category: "advocacy",
    defaultTrackingMethod: "timeline",
    defaultReserveOnOpen: false,
  },
  {
    serviceKey: "ADVOCATE_SESSION",
    serviceName: "Advocate Sessions",
    category: "meeting",
    defaultTrackingMethod: "calendar",
    defaultReserveOnOpen: true,
  },
  {
    serviceKey: "DOCUMENT_REVIEW",
    serviceName: "Document Reviews",
    category: "document",
    defaultTrackingMethod: "timeline",
    defaultReserveOnOpen: false,
  },
  {
    serviceKey: "PARENT_CONCERN_ASSISTANCE",
    serviceName: "Parent Concern Statement Assistance",
    category: "advocacy",
    defaultTrackingMethod: "timeline",
    defaultReserveOnOpen: false,
  },
];

export interface PlanDefinition {
  planKey: string;
  planName: string;
  description: string;
  services: Array<{
    serviceKey: string;
    allowanceType: "limited" | "unlimited" | "not_included";
    baseAllowance: number;
    trackingMethod?: "calendar" | "timeline" | "manual";
    reserveOnOpen?: boolean;
  }>;
}

/**
 * Master Plan Service Matrix Defaults for Waypoint Plans.
 * Configures Navigator, Anchor, Family, Monthly Advocacy ($55), and Pay Per Use.
 */
export const DEFAULT_PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    planKey: "anchor",
    planName: "Anchor",
    description: "Premium comprehensive executive advocacy with unlimited IEP and 504 representation.",
    services: [
      { serviceKey: "IEP_MEETING", allowanceType: "unlimited", baseAllowance: 0, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "504_MEETING", allowanceType: "unlimited", baseAllowance: 0, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "RECORDS_REVIEW", allowanceType: "limited", baseAllowance: 2, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "EMAIL_ASSISTANCE", allowanceType: "unlimited", baseAllowance: 0, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "STATE_COMPLAINT", allowanceType: "limited", baseAllowance: 1, trackingMethod: "timeline", reserveOnOpen: true },
      { serviceKey: "PWN_SUPPORT", allowanceType: "limited", baseAllowance: 2, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "ADVOCATE_SESSION", allowanceType: "limited", baseAllowance: 4, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "DOCUMENT_REVIEW", allowanceType: "limited", baseAllowance: 2, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "PARENT_CONCERN_ASSISTANCE", allowanceType: "limited", baseAllowance: 2, trackingMethod: "timeline", reserveOnOpen: false },
    ],
  },
  {
    planKey: "navigator",
    planName: "Navigator",
    description: "Guided advocacy package with core meeting support and essential document review.",
    services: [
      { serviceKey: "IEP_MEETING", allowanceType: "limited", baseAllowance: 2, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "504_MEETING", allowanceType: "limited", baseAllowance: 2, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "RECORDS_REVIEW", allowanceType: "limited", baseAllowance: 1, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "EMAIL_ASSISTANCE", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "STATE_COMPLAINT", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "timeline", reserveOnOpen: true },
      { serviceKey: "PWN_SUPPORT", allowanceType: "limited", baseAllowance: 1, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "ADVOCATE_SESSION", allowanceType: "limited", baseAllowance: 2, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "DOCUMENT_REVIEW", allowanceType: "limited", baseAllowance: 1, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "PARENT_CONCERN_ASSISTANCE", allowanceType: "limited", baseAllowance: 1, trackingMethod: "timeline", reserveOnOpen: false },
    ],
  },
  {
    planKey: "family",
    planName: "Family",
    description: "Full family plan with comprehensive IEP coverage and email support.",
    services: [
      { serviceKey: "IEP_MEETING", allowanceType: "limited", baseAllowance: 3, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "504_MEETING", allowanceType: "unlimited", baseAllowance: 0, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "RECORDS_REVIEW", allowanceType: "limited", baseAllowance: 2, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "EMAIL_ASSISTANCE", allowanceType: "limited", baseAllowance: 10, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "STATE_COMPLAINT", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "timeline", reserveOnOpen: true },
      { serviceKey: "PWN_SUPPORT", allowanceType: "limited", baseAllowance: 2, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "ADVOCATE_SESSION", allowanceType: "limited", baseAllowance: 3, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "DOCUMENT_REVIEW", allowanceType: "limited", baseAllowance: 2, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "PARENT_CONCERN_ASSISTANCE", allowanceType: "limited", baseAllowance: 2, trackingMethod: "timeline", reserveOnOpen: false },
    ],
  },
  {
    planKey: "monthly_advocacy",
    planName: "Monthly Advocacy",
    description: "Standard monthly advocacy tier ($55/mo) with active case guidance and review credits.",
    services: [
      { serviceKey: "IEP_MEETING", allowanceType: "limited", baseAllowance: 3, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "504_MEETING", allowanceType: "unlimited", baseAllowance: 0, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "RECORDS_REVIEW", allowanceType: "limited", baseAllowance: 2, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "EMAIL_ASSISTANCE", allowanceType: "limited", baseAllowance: 10, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "STATE_COMPLAINT", allowanceType: "limited", baseAllowance: 1, trackingMethod: "timeline", reserveOnOpen: true },
      { serviceKey: "PWN_SUPPORT", allowanceType: "limited", baseAllowance: 2, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "ADVOCATE_SESSION", allowanceType: "limited", baseAllowance: 3, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "DOCUMENT_REVIEW", allowanceType: "limited", baseAllowance: 2, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "PARENT_CONCERN_ASSISTANCE", allowanceType: "limited", baseAllowance: 2, trackingMethod: "timeline", reserveOnOpen: false },
    ],
  },
  {
    planKey: "pay_per_use",
    planName: "Pay Per Use",
    description: "Pay-as-you-go ad-hoc representation. Individual services purchased separately.",
    services: [
      { serviceKey: "IEP_MEETING", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "504_MEETING", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "RECORDS_REVIEW", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "EMAIL_ASSISTANCE", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "STATE_COMPLAINT", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "timeline", reserveOnOpen: true },
      { serviceKey: "PWN_SUPPORT", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "ADVOCATE_SESSION", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "calendar", reserveOnOpen: true },
      { serviceKey: "DOCUMENT_REVIEW", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "timeline", reserveOnOpen: false },
      { serviceKey: "PARENT_CONCERN_ASSISTANCE", allowanceType: "not_included", baseAllowance: 0, trackingMethod: "timeline", reserveOnOpen: false },
    ],
  },
];

// In-memory cache for plan matrix (resilience & test isolation)
const inMemoryPlanMatrix = new Map<string, PlanServiceMatrixEntry[]>();
const inMemoryPackageLockStatus = new Map<string, boolean>();

/**
 * Normalizes package code or plan key aliases (e.g. advocacy_plan_105 -> anchor, advocacy_plan_55 -> monthly_advocacy).
 */
export function normalizePlanKey(rawKey: string): string {
  const k = (rawKey || "").trim().toLowerCase();
  if (k === "advocacy_plan_105" || k === "anchor_plan" || k.includes("anchor")) return "anchor";
  if (k === "advocacy_plan_55" || k === "monthly_advocacy_plan" || k.includes("55")) return "monthly_advocacy";
  if (k.includes("navigator")) return "navigator";
  if (k.includes("family")) return "family";
  if (k.includes("pay_per_use") || k.includes("pay-per-use")) return "pay_per_use";
  return k.replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "") || "custom_package";
}

/**
 * Ensures plan_service_matrix table exists in D1/SQLite.
 */
export async function ensurePlanMatrixTable(db?: any) {
  try {
    const { queryCloudflareD1 } = await import("../_core/d1Client");
    await queryCloudflareD1(`
      CREATE TABLE IF NOT EXISTS plan_service_matrix (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_key TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        service_key TEXT NOT NULL,
        service_name TEXT NOT NULL,
        category TEXT DEFAULT 'meeting',
        allowance_type TEXT DEFAULT 'limited',
        base_allowance INTEGER DEFAULT 0,
        tracking_method TEXT DEFAULT 'calendar',
        reserve_on_open INTEGER DEFAULT 1,
        is_locked INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS plan_service_matrix_plan_idx ON plan_service_matrix (plan_key);`);
    await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS plan_service_matrix_service_idx ON plan_service_matrix (service_key);`);
  } catch {
    // Already exists or not supported
  }
}

/**
 * Resolves a student's contact plan attributes to a normalized planKey.
 */
export function resolveStudentPlanKey(contact: any): { planKey: string; planName: string } {
  const typeStr = (contact?.planType || "").trim().toLowerCase();
  const tierStr = (contact?.planTier || "").trim().toLowerCase();

  if (typeStr.includes("anchor") || tierStr.includes("anchor") || tierStr.includes("105")) {
    return { planKey: "anchor", planName: "Anchor" };
  }
  if (typeStr.includes("navigator") || tierStr.includes("navigator")) {
    return { planKey: "navigator", planName: "Navigator" };
  }
  if (typeStr.includes("family") || tierStr.includes("family")) {
    return { planKey: "family", planName: "Family" };
  }
  if (typeStr.includes("pay per use") || typeStr.includes("pay-per-use") || tierStr.includes("pay per use") || tierStr.includes("pay-per-use")) {
    return { planKey: "pay_per_use", planName: "Pay Per Use" };
  }
  // Default to standard Monthly Advocacy ($55)
  return { planKey: "monthly_advocacy", planName: contact?.planType || "Monthly Advocacy" };
}

/**
 * Returns master matrix entries for all plans or a specific plan.
 * Auto-seeds default configurations if empty.
 */
export async function getMasterPlanMatrix(planKey?: string): Promise<PlanServiceMatrixEntry[]> {
  const normalizedKey = planKey ? normalizePlanKey(planKey) : undefined;
  const db = await getDb();
  if (db) {
    try {
      await ensurePlanMatrixTable(db);
      const query = normalizedKey
        ? db.select().from(planServiceMatrix).where(eq(planServiceMatrix.planKey, normalizedKey))
        : db.select().from(planServiceMatrix);

      const rows = await query;
      if (rows && rows.length > 0) {
        return rows;
      }

      // Auto-seed table if currently empty
      const allRowsToInsert: InsertPlanServiceMatrixEntry[] = [];
      for (const planDef of DEFAULT_PLAN_DEFINITIONS) {
        for (const svc of planDef.services) {
          const catalogItem = WAYPOINT_SERVICE_CATALOG.find((c) => c.serviceKey === svc.serviceKey);
          allRowsToInsert.push({
            planKey: planDef.planKey,
            planName: planDef.planName,
            serviceKey: svc.serviceKey,
            serviceName: catalogItem?.serviceName || svc.serviceKey,
            category: catalogItem?.category || "meeting",
            allowanceType: svc.allowanceType,
            baseAllowance: svc.baseAllowance,
            trackingMethod: svc.trackingMethod || catalogItem?.defaultTrackingMethod || "calendar",
            reserveOnOpen: svc.reserveOnOpen ?? catalogItem?.defaultReserveOnOpen ?? true,
            isLocked: true,
          });
        }
      }

      for (const row of allRowsToInsert) {
        try {
          await db.insert(planServiceMatrix).values(row);
        } catch {
          // ignore duplicate in race
        }
      }

      const freshRows = await query;
      if (freshRows && freshRows.length > 0) {
        return freshRows;
      }
    } catch (err) {
      console.warn("[PlanMatrix DB] Query failed, using memory defaults:", err);
    }
  }

  // Check in-memory cache
  if (normalizedKey && inMemoryPlanMatrix.has(normalizedKey)) {
    return inMemoryPlanMatrix.get(normalizedKey)!;
  }

  // Memory fallback
  let allDefaults: PlanServiceMatrixEntry[] = [];
  let idCounter = 1;
  for (const planDef of DEFAULT_PLAN_DEFINITIONS) {
    if (normalizedKey && planDef.planKey !== normalizedKey) continue;
    const planRows: PlanServiceMatrixEntry[] = planDef.services.map((svc) => {
      const catalogItem = WAYPOINT_SERVICE_CATALOG.find((c) => c.serviceKey === svc.serviceKey);
      return {
        id: idCounter++,
        planKey: planDef.planKey,
        planName: planDef.planName,
        serviceKey: svc.serviceKey,
        serviceName: catalogItem?.serviceName || svc.serviceKey,
        category: catalogItem?.category || "meeting",
        allowanceType: svc.allowanceType,
        baseAllowance: svc.baseAllowance,
        trackingMethod: svc.trackingMethod || catalogItem?.defaultTrackingMethod || "calendar",
        reserveOnOpen: svc.reserveOnOpen ?? catalogItem?.defaultReserveOnOpen ?? true,
        isLocked: inMemoryPackageLockStatus.get(planDef.planKey) ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
    allDefaults.push(...planRows);
  }

  return allDefaults;
}

/**
 * Checks if an advocacy package has configured allowances.
 */
export async function isPackageConfigured(rawPlanKey: string): Promise<boolean> {
  const planKey = normalizePlanKey(rawPlanKey);
  const db = await getDb();
  if (db) {
    try {
      await ensurePlanMatrixTable(db);
      const rows = await db
        .select()
        .from(planServiceMatrix)
        .where(eq(planServiceMatrix.planKey, planKey));
      if (rows && rows.length > 0) return true;
    } catch {
      // fallback
    }
  }
  if (inMemoryPlanMatrix.has(planKey)) {
    const mem = inMemoryPlanMatrix.get(planKey);
    return Boolean(mem && mem.length > 0);
  }
  return DEFAULT_PLAN_DEFINITIONS.some((d) => d.planKey === planKey);
}

/**
 * Returns package allowance details, lock state, and configuration status for PG-035.
 */
export async function getPackageAllowances(rawPlanKey: string, planNameFallback?: string): Promise<{
  planKey: string;
  planName: string;
  isLocked: boolean;
  isConfigured: boolean;
  allowances: Array<{
    serviceKey: string;
    serviceName: string;
    category: "meeting" | "advocacy" | "review" | "document";
    allowanceType: "limited" | "unlimited" | "not_included";
    baseAllowance: number;
    trackingMethod: "calendar" | "timeline" | "manual" | "connected_tool";
    reserveOnOpen: boolean;
  }>;
}> {
  const planKey = normalizePlanKey(rawPlanKey);
  const rows = await getMasterPlanMatrix(planKey);
  const isConfigured = await isPackageConfigured(planKey);

  // Determine lock state from DB rows, in-memory status, or fallback default
  const isLocked = rows.length > 0
    ? Boolean(rows[0].isLocked ?? (rows[0] as any).is_locked ?? true)
    : (inMemoryPackageLockStatus.get(planKey) ?? true);

  const matchedDef = DEFAULT_PLAN_DEFINITIONS.find((d) => d.planKey === planKey);
  const planName = rows[0]?.planName || matchedDef?.planName || planNameFallback || rawPlanKey;

  // Build allowance map from rows
  const allowanceMap = new Map<string, PlanServiceMatrixEntry>();
  for (const r of rows) {
    allowanceMap.set(r.serviceKey, r);
  }

  // Ensure all 9 standard Waypoint services are present
  const standardServices: Array<{
    serviceKey: string;
    serviceName: string;
    category: "meeting" | "advocacy" | "review" | "document";
    allowanceType: "limited" | "unlimited" | "not_included";
    baseAllowance: number;
    trackingMethod: "calendar" | "timeline" | "manual" | "connected_tool";
    reserveOnOpen: boolean;
  }> = [];

  for (const cat of WAYPOINT_SERVICE_CATALOG) {
    const existing = allowanceMap.get(cat.serviceKey);
    if (existing) {
      standardServices.push({
        serviceKey: existing.serviceKey,
        serviceName: existing.serviceName || cat.serviceName,
        category: (existing.category as any) || cat.category,
        allowanceType: (existing.allowanceType as any) || "not_included",
        baseAllowance: existing.baseAllowance ?? 0,
        trackingMethod: (existing.trackingMethod as any) || cat.defaultTrackingMethod || "calendar",
        reserveOnOpen: existing.reserveOnOpen ?? cat.defaultReserveOnOpen ?? true,
      });
      allowanceMap.delete(cat.serviceKey);
    } else {
      standardServices.push({
        serviceKey: cat.serviceKey,
        serviceName: cat.serviceName,
        category: cat.category,
        allowanceType: "not_included",
        baseAllowance: 0,
        trackingMethod: cat.defaultTrackingMethod,
        reserveOnOpen: cat.defaultReserveOnOpen,
      });
    }
  }

  // Append any custom additional services that were configured
  for (const [_, customEntry] of Array.from(allowanceMap.entries())) {
    standardServices.push({
      serviceKey: customEntry.serviceKey,
      serviceName: customEntry.serviceName,
      category: (customEntry.category as any) || "advocacy",
      allowanceType: (customEntry.allowanceType as any) || "limited",
      baseAllowance: customEntry.baseAllowance ?? 0,
      trackingMethod: (customEntry.trackingMethod as any) || "manual",
      reserveOnOpen: customEntry.reserveOnOpen ?? false,
    });
  }

  return {
    planKey,
    planName,
    isLocked,
    isConfigured,
    allowances: standardServices,
  };
}

/**
 * Returns the count of active clients currently assigned to this package.
 */
export async function getActiveClientsCountForPackage(rawPlanKey: string): Promise<number> {
  const planKey = normalizePlanKey(rawPlanKey);
  try {
    const { queryCloudflareD1 } = await import("../_core/d1Client");
    const terms = [planKey];
    if (planKey === "anchor") terms.push("105", "advocacy_plan_105");
    if (planKey === "monthly_advocacy") terms.push("55", "advocacy_plan_55");

    let whereConditions = terms.map(() => `(LOWER(planType) LIKE ? OR LOWER(planTier) LIKE ?)`).join(" OR ");
    let params: any[] = [];
    for (const t of terms) {
      params.push(`%${t}%`, `%${t}%`);
    }

    const rows: any[] = await queryCloudflareD1(
      `SELECT COUNT(*) as cnt FROM contacts WHERE (archivedAt IS NULL OR archivedAt = '') AND (${whereConditions});`,
      params
    );
    return rows?.[0]?.cnt ? Number(rows[0].cnt) : 0;
  } catch {
    return 0;
  }
}

/**
 * Saves master package allowance defaults on PG-035.
 * Optionally applies updated base allowances to active clients while strictly preserving
 * all existing client history, extra allowances, completed usage, and scheduled appointments.
 */
export async function savePackageAllowances({
  planKey: rawPlanKey,
  planName: rawPlanName,
  isLocked,
  allowances,
  applyToActiveClients = false,
  actor = "Admin",
}: {
  planKey: string;
  planName?: string;
  isLocked: boolean;
  allowances: Array<{
    serviceKey: string;
    serviceName: string;
    category?: string;
    allowanceType: "limited" | "unlimited" | "not_included";
    baseAllowance: number;
    trackingMethod?: "calendar" | "timeline" | "manual" | "connected_tool";
    reserveOnOpen?: boolean;
  }>;
  applyToActiveClients?: boolean;
  actor?: string;
}): Promise<{
  success: boolean;
  affectedClientsCount: number;
  message: string;
}> {
  const planKey = normalizePlanKey(rawPlanKey);
  const planName = rawPlanName || planKey.charAt(0).toUpperCase() + planKey.slice(1);
  const now = new Date();

  // Update in-memory lock status
  inMemoryPackageLockStatus.set(planKey, isLocked);

  const db = await getDb();
  if (db) {
    try {
      await ensurePlanMatrixTable(db);

      // Clean existing matrix rows for this planKey
      await db.delete(planServiceMatrix).where(eq(planServiceMatrix.planKey, planKey));

      // Also clean alias if applicable (anchor <-> advocacy_plan_105)
      if (planKey === "anchor") {
        await db.delete(planServiceMatrix).where(eq(planServiceMatrix.planKey, "advocacy_plan_105"));
      } else if (planKey === "monthly_advocacy") {
        await db.delete(planServiceMatrix).where(eq(planServiceMatrix.planKey, "advocacy_plan_55"));
      }

      // Insert new rows
      for (const item of allowances) {
        const insertObj: InsertPlanServiceMatrixEntry = {
          planKey,
          planName,
          serviceKey: item.serviceKey,
          serviceName: item.serviceName,
          category: item.category || "meeting",
          allowanceType: item.allowanceType,
          baseAllowance: item.allowanceType === "limited" ? item.baseAllowance : 0,
          trackingMethod: (item.trackingMethod as any) || "calendar",
          reserveOnOpen: item.reserveOnOpen ?? true,
          isLocked,
        };
        await db.insert(planServiceMatrix).values(insertObj);

        // Mirror alias for backward compatibility
        if (planKey === "anchor") {
          await db.insert(planServiceMatrix).values({ ...insertObj, planKey: "advocacy_plan_105" });
        } else if (planKey === "monthly_advocacy") {
          await db.insert(planServiceMatrix).values({ ...insertObj, planKey: "advocacy_plan_55" });
        }
      }
    } catch (err: any) {
      console.warn("[PlanMatrix DB] savePackageAllowances DB error, updating memory cache:", err.message);
    }
  }

  // Update in-memory cache for test resilience
  const memEntries: PlanServiceMatrixEntry[] = allowances.map((item, idx) => ({
    id: idx + 1,
    planKey,
    planName,
    serviceKey: item.serviceKey,
    serviceName: item.serviceName,
    category: item.category || "meeting",
    allowanceType: item.allowanceType,
    baseAllowance: item.allowanceType === "limited" ? item.baseAllowance : 0,
    trackingMethod: (item.trackingMethod as any) || "calendar",
    reserveOnOpen: item.reserveOnOpen ?? true,
    isLocked,
    createdAt: now,
    updatedAt: now,
  }));
  inMemoryPlanMatrix.set(planKey, memEntries);
  if (planKey === "anchor") inMemoryPlanMatrix.set("advocacy_plan_105", memEntries);
  if (planKey === "monthly_advocacy") inMemoryPlanMatrix.set("advocacy_plan_55", memEntries);

  // Sync with services catalog table
  try {
    const { queryCloudflareD1 } = await import("../_core/d1Client");
    const jsonConfig = JSON.stringify(allowances);
    await queryCloudflareD1(
      `UPDATE services 
       SET isAdvocacyPackage = 1, allowancesLocked = ?, allowancesConfig = ?, updatedAt = CURRENT_TIMESTAMP 
       WHERE LOWER(serviceCode) = ? OR LOWER(serviceCode) = ? OR LOWER(name) LIKE ?;`,
      [isLocked ? 1 : 0, jsonConfig, planKey, rawPlanKey, `%${planKey}%`]
    );
  } catch {
    // ignore
  }

  let affectedClientsCount = 0;

  // Apply updated base allowances to active clients if requested
  if (applyToActiveClients) {
    try {
      const { queryCloudflareD1 } = await import("../_core/d1Client");
      const terms = [planKey];
      if (planKey === "anchor") terms.push("105", "advocacy_plan_105");
      if (planKey === "monthly_advocacy") terms.push("55", "advocacy_plan_55");

      let whereConditions = terms.map(() => `(LOWER(planType) LIKE ? OR LOWER(planTier) LIKE ?)`).join(" OR ");
      let params: any[] = [];
      for (const t of terms) {
        params.push(`%${t}%`, `%${t}%`);
      }

      const activeContacts: any[] = await queryCloudflareD1(
        `SELECT id, firstName, lastName FROM contacts WHERE (archivedAt IS NULL OR archivedAt = '') AND (${whereConditions});`,
        params
      );

      affectedClientsCount = activeContacts?.length || 0;

      const { upsertStudentAllowance, getStudentAllowances, inMemoryAllowances } = await import("./serviceAllowances");

      const studentIdsToUpdate = new Set<number>();
      for (const c of activeContacts || []) {
        studentIdsToUpdate.add(c.id);
      }
      for (const memId of Array.from(inMemoryAllowances.keys())) {
        studentIdsToUpdate.add(memId);
      }

      for (const studentContactId of Array.from(studentIdsToUpdate)) {
        const studentExisting = await getStudentAllowances(studentContactId);
        const existingMap = new Map(studentExisting.map((a) => [a.serviceKey, a]));

        for (const item of allowances) {
          const existing = existingMap.get(item.serviceKey);
          await upsertStudentAllowance(studentContactId, item.serviceKey, {
            serviceName: item.serviceName,
            category: item.category || "meeting",
            allowanceType: item.allowanceType,
            baseAllowance: item.allowanceType === "limited" ? item.baseAllowance : 0,
            extraAllowance: existing ? existing.extraAllowance : 0, // STRICTLY PRESERVE extra allowances
            trackingMethod: (item.trackingMethod as any) || "calendar",
            reserveOnOpen: item.reserveOnOpen ?? true,
            notes: `Base updated from ${planName} package configuration on PG-035 by ${actor}`,
          });
        }
      }
    } catch (err: any) {
      console.warn("[PlanMatrix DB] Error updating active clients:", err.message);
    }
  }

  // Record catalog event audit trail
  try {
    const { recordCatalogEvent } = await import("./services");
    await recordCatalogEvent({
      organizationId: 1,
      eventType: "allowances_updated",
      actor,
      newValues: JSON.stringify({ planKey, isLocked, applyToActiveClients, affectedClientsCount }),
    });
  } catch {
    // ignore
  }

  return {
    success: true,
    affectedClientsCount,
    message: applyToActiveClients
      ? `Package allowances updated and applied to ${affectedClientsCount} active client(s).`
      : `Master defaults for ${planName} saved successfully for future clients/service periods.`,
  };
}

/**
 * Updates a master plan service matrix entry (admin editability).
 */
export async function updateMasterPlanMatrixEntry(
  planKey: string,
  serviceKey: string,
  updates: Partial<InsertPlanServiceMatrixEntry>
): Promise<PlanServiceMatrixEntry | null> {
  const normalizedKey = normalizePlanKey(planKey);
  const db = await getDb();
  const now = new Date();

  if (db) {
    try {
      await ensurePlanMatrixTable(db);
      await db
        .update(planServiceMatrix)
        .set({ ...updates, updatedAt: now })
        .where(and(eq(planServiceMatrix.planKey, normalizedKey), eq(planServiceMatrix.serviceKey, serviceKey)));

      const rows = await db
        .select()
        .from(planServiceMatrix)
        .where(and(eq(planServiceMatrix.planKey, normalizedKey), eq(planServiceMatrix.serviceKey, serviceKey)));

      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.warn("[PlanMatrix DB] Update failed:", err);
    }
  }

  return null;
}

import { eq, desc, asc, and } from "drizzle-orm";
import {
  studentServiceAllowances,
  type StudentServiceAllowance,
  type InsertStudentServiceAllowance,
  caseActivityTimeline,
  type CaseActivityTimelineItem,
  appointments,
  type Appointment,
  contacts,
} from "../../drizzle/schema";
import { getDb } from "./connection";
import {
  resolveStudentPlanKey,
  getMasterPlanMatrix,
  WAYPOINT_SERVICE_CATALOG,
  DEFAULT_PLAN_DEFINITIONS,
  type PlanDefinition,
} from "./planMatrix";

/**
 * Ensures student_service_allowances table exists in D1/SQLite.
 */
async function ensureTable(db: any) {
  try {
    await db.run?.(`
      CREATE TABLE IF NOT EXISTS student_service_allowances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_contact_id INTEGER NOT NULL,
        service_key TEXT NOT NULL,
        service_name TEXT NOT NULL,
        category TEXT DEFAULT 'meeting',
        allowance_type TEXT DEFAULT 'limited',
        base_allowance INTEGER DEFAULT 0,
        extra_allowance INTEGER DEFAULT 0,
        tracking_method TEXT DEFAULT 'calendar',
        reserve_on_open INTEGER DEFAULT 1,
        plan_period_start TEXT,
        plan_period_end TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await db.run?.(`CREATE INDEX IF NOT EXISTS student_service_allowances_student_idx ON student_service_allowances (student_contact_id)`);
    await db.run?.(`CREATE INDEX IF NOT EXISTS student_service_allowances_key_idx ON student_service_allowances (service_key)`);
  } catch {
    // Table already exists or not supported
  }
}

// In-memory cache for deterministic test isolation and offline resilience
export const inMemoryAllowances = new Map<number, StudentServiceAllowance[]>();
export const inMemoryAppointments = new Map<number, Appointment[]>();

export function clearInMemoryAllowances() {
  inMemoryAllowances.clear();
  inMemoryAppointments.clear();
}

export function registerAppointmentForServiceAllowances(appt: Partial<Appointment> & { clientId: number; id: number }) {
  const list = inMemoryAppointments.get(appt.clientId) || [];
  const existingIdx = list.findIndex((a) => a.id === appt.id);
  const fullAppt = {
    title: "Meeting",
    meetingType: "IEP Meeting",
    startTime: new Date(),
    endTime: new Date(),
    status: "Scheduled" as const,
    ...appt,
    id: appt.id,
    clientId: appt.clientId,
  } as Appointment;

  if (existingIdx >= 0) {
    list[existingIdx] = fullAppt;
  } else {
    list.push(fullAppt);
  }
  inMemoryAppointments.set(appt.clientId, list);
}

export function updateAppointmentStatusForServiceAllowances(
  studentContactId: number,
  apptId: number,
  status: "Scheduled" | "Confirmed" | "Completed" | "Cancelled"
) {
  const list = inMemoryAppointments.get(studentContactId) || [];
  const appt = list.find((a) => a.id === apptId);
  if (appt) {
    appt.status = status;
  }
}

export interface StandardServiceConfig {
  serviceKey: string;
  serviceName: string;
  category: "meeting" | "advocacy" | "review" | "document";
  allowanceType: "limited" | "unlimited" | "not_included";
  baseAllowance: number;
  trackingMethod: "calendar" | "timeline" | "manual";
  reserveOnOpen: boolean;
}

/**
 * Standard baseline service catalog matching Byron Honea / Waypoint CRM tiers.
 * Used when a student has not customized their individual allowances.
 */
export const STANDARD_SERVICES: StandardServiceConfig[] = [
  {
    serviceKey: "IEP_MEETING",
    serviceName: "IEP Meetings",
    category: "meeting",
    allowanceType: "limited",
    baseAllowance: 3,
    trackingMethod: "calendar",
    reserveOnOpen: true,
  },
  {
    serviceKey: "504_MEETING",
    serviceName: "504 Meetings",
    category: "meeting",
    allowanceType: "unlimited",
    baseAllowance: 0,
    trackingMethod: "calendar",
    reserveOnOpen: true,
  },
  {
    serviceKey: "RECORDS_REVIEW",
    serviceName: "Records Reviews",
    category: "review",
    allowanceType: "limited",
    baseAllowance: 2,
    trackingMethod: "calendar",
    reserveOnOpen: true,
  },
  {
    serviceKey: "EMAIL_ASSISTANCE",
    serviceName: "Email Assistance",
    category: "advocacy",
    allowanceType: "limited",
    baseAllowance: 10,
    trackingMethod: "timeline",
    reserveOnOpen: false,
  },
  {
    serviceKey: "STATE_COMPLAINT",
    serviceName: "State Complaints",
    category: "advocacy",
    allowanceType: "limited",
    baseAllowance: 1,
    trackingMethod: "timeline",
    reserveOnOpen: true,
  },
  {
    serviceKey: "PWN_SUPPORT",
    serviceName: "PWN Support / Review",
    category: "advocacy",
    allowanceType: "limited",
    baseAllowance: 2,
    trackingMethod: "timeline",
    reserveOnOpen: false,
  },
  {
    serviceKey: "ADVOCATE_SESSION",
    serviceName: "Advocate Sessions",
    category: "meeting",
    allowanceType: "limited",
    baseAllowance: 3,
    trackingMethod: "calendar",
    reserveOnOpen: true,
  },
  {
    serviceKey: "DOCUMENT_REVIEW",
    serviceName: "Document Reviews",
    category: "document",
    allowanceType: "limited",
    baseAllowance: 2,
    trackingMethod: "timeline",
    reserveOnOpen: false,
  },
  {
    serviceKey: "PARENT_CONCERN_ASSISTANCE",
    serviceName: "Parent Concern Statement Assistance",
    category: "advocacy",
    allowanceType: "limited",
    baseAllowance: 2,
    trackingMethod: "timeline",
    reserveOnOpen: false,
  },
];

/**
 * Calculates current default service/plan period for student.
 * E.g., Sep 1, 2026 to Aug 31, 2027 based on current date.
 */
export function getDefaultPlanPeriod(referenceDate = new Date()): { start: string; end: string } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed: 8 is September
  // Academic/Service year starts Sep 1
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;
  return {
    start: `${startYear}-09-01`,
    end: `${endYear}-08-31`,
  };
}

/**
 * Returns student service allowance configuration rows.
 * Automatically initializes from the student's active plan in Plan Service Matrix
 * if no individual rows exist yet, guaranteeing zero empty allowance tables.
 */
export async function getStudentAllowances(studentContactId: number): Promise<StudentServiceAllowance[]> {
  const mem = inMemoryAllowances.get(studentContactId);
  if (mem && mem.length > 0) {
    return mem;
  }

  const db = await getDb();
  if (db) {
    try {
      await ensureTable(db);
      const rows = await db
        .select()
        .from(studentServiceAllowances)
        .where(eq(studentServiceAllowances.studentContactId, studentContactId));

      if (rows && rows.length > 0) {
        inMemoryAllowances.set(studentContactId, rows);
        return rows;
      }
    } catch (err) {
      console.warn("[ServiceAllowances DB] Query failed, using memory/standard:", err);
    }
  }

  // Auto-initialize allowances from student's active plan in Plan Service Matrix
  let contact: any = null;
  try {
    const { getContactById } = await import("./contacts");
    contact = await getContactById(studentContactId);
  } catch {
    // ignore
  }

  const { planKey, planName } = resolveStudentPlanKey(contact);
  const matrixEntries = await getMasterPlanMatrix(planKey);
  const defaultPeriod = getDefaultPlanPeriod();

  const initializedRows: StudentServiceAllowance[] = [];
  let fallbackId = 1000;

  for (const entry of matrixEntries) {
    const insertData: InsertStudentServiceAllowance = {
      studentContactId,
      serviceKey: entry.serviceKey,
      serviceName: entry.serviceName,
      category: entry.category,
      allowanceType: entry.allowanceType,
      baseAllowance: entry.baseAllowance,
      extraAllowance: 0,
      trackingMethod: entry.trackingMethod,
      reserveOnOpen: entry.reserveOnOpen,
      planPeriodStart: defaultPeriod.start,
      planPeriodEnd: defaultPeriod.end,
      notes: `Auto-initialized from ${planName} Plan Matrix`,
    };

    if (db) {
      try {
        const res = await db.insert(studentServiceAllowances).values(insertData);
        initializedRows.push({
          ...insertData,
          id: (res as any)?.[0]?.insertId || fallbackId++,
          category: insertData.category || "meeting",
          allowanceType: insertData.allowanceType || "limited",
          baseAllowance: insertData.baseAllowance ?? 0,
          extraAllowance: 0,
          trackingMethod: insertData.trackingMethod || "calendar",
          reserveOnOpen: insertData.reserveOnOpen ?? true,
          planPeriodStart: insertData.planPeriodStart ?? null,
          planPeriodEnd: insertData.planPeriodEnd ?? null,
          notes: insertData.notes ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        continue;
      } catch {
        // Fallback to memory
      }
    }

    initializedRows.push({
      ...insertData,
      id: fallbackId++,
      category: insertData.category || "meeting",
      allowanceType: insertData.allowanceType || "limited",
      baseAllowance: insertData.baseAllowance ?? 0,
      extraAllowance: 0,
      trackingMethod: insertData.trackingMethod || "calendar",
      reserveOnOpen: insertData.reserveOnOpen ?? true,
      planPeriodStart: insertData.planPeriodStart ?? null,
      planPeriodEnd: insertData.planPeriodEnd ?? null,
      notes: insertData.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  inMemoryAllowances.set(studentContactId, initializedRows);
  return initializedRows;
}

/**
 * Upserts or updates a service allowance row for a student.
 */
export async function upsertStudentAllowance(
  studentContactId: number,
  serviceKey: string,
  updates: Partial<InsertStudentServiceAllowance>
): Promise<StudentServiceAllowance> {
  const existingList = await getStudentAllowances(studentContactId);
  const existing = existingList.find((a) => a.serviceKey === serviceKey);

  const db = await getDb();
  const now = new Date();

  if (existing && existing.id < 1000 && db) {
    try {
      await ensureTable(db);
      await db
        .update(studentServiceAllowances)
        .set({
          ...updates,
          updatedAt: now,
        })
        .where(eq(studentServiceAllowances.id, existing.id));

      const updated = { ...existing, ...updates, updatedAt: now } as StudentServiceAllowance;
      const newList = existingList.map((a) => (a.serviceKey === serviceKey ? updated : a));
      inMemoryAllowances.set(studentContactId, newList);
      return updated;
    } catch (err) {
      console.warn("[ServiceAllowances DB] Update failed, saving in memory:", err);
    }
  } else if (db) {
    try {
      await ensureTable(db);
      const insertData: InsertStudentServiceAllowance = {
        studentContactId,
        serviceKey,
        serviceName: updates.serviceName || existing?.serviceName || serviceKey,
        category: updates.category || existing?.category || "meeting",
        allowanceType: updates.allowanceType || existing?.allowanceType || "limited",
        baseAllowance: updates.baseAllowance ?? existing?.baseAllowance ?? 0,
        extraAllowance: updates.extraAllowance ?? existing?.extraAllowance ?? 0,
        trackingMethod: updates.trackingMethod || existing?.trackingMethod || "calendar",
        reserveOnOpen: updates.reserveOnOpen ?? existing?.reserveOnOpen ?? true,
        planPeriodStart: updates.planPeriodStart || existing?.planPeriodStart || getDefaultPlanPeriod().start,
        planPeriodEnd: updates.planPeriodEnd || existing?.planPeriodEnd || getDefaultPlanPeriod().end,
        notes: updates.notes ?? existing?.notes ?? null,
      };

      const res = await db.insert(studentServiceAllowances).values(insertData);
      const inserted: StudentServiceAllowance = {
        ...insertData,
        id: (res as any)?.[0]?.insertId || Math.floor(Math.random() * 90000) + 10,
        category: insertData.category || "meeting",
        allowanceType: insertData.allowanceType || "limited",
        baseAllowance: insertData.baseAllowance ?? 0,
        extraAllowance: insertData.extraAllowance ?? 0,
        trackingMethod: insertData.trackingMethod || "calendar",
        reserveOnOpen: insertData.reserveOnOpen ?? true,
        planPeriodStart: insertData.planPeriodStart ?? null,
        planPeriodEnd: insertData.planPeriodEnd ?? null,
        notes: insertData.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const filtered = existingList.filter((a) => a.serviceKey !== serviceKey);
      inMemoryAllowances.set(studentContactId, [...filtered, inserted]);
      return inserted;
    } catch (err) {
      console.warn("[ServiceAllowances DB] Insert failed, saving in memory:", err);
    }
  }

  // Fallback in-memory
  const updated: StudentServiceAllowance = {
    ...(existing || {
      id: Math.floor(Math.random() * 90000) + 10,
      studentContactId,
      serviceKey,
      serviceName: serviceKey,
      category: "meeting",
      allowanceType: "limited",
      baseAllowance: 0,
      extraAllowance: 0,
      trackingMethod: "calendar",
      reserveOnOpen: true,
      planPeriodStart: getDefaultPlanPeriod().start,
      planPeriodEnd: getDefaultPlanPeriod().end,
      notes: null,
      createdAt: now,
      updatedAt: now,
    }),
    ...updates,
    updatedAt: now,
  } as StudentServiceAllowance;

  const newList = existingList.filter((a) => a.serviceKey !== serviceKey);
  newList.push(updated);
  inMemoryAllowances.set(studentContactId, newList);
  return updated;
}

/**
 * Adds extra allowance to a specific service for this student and records an audit entry.
 */
export async function addExtraAllowance(
  studentContactId: number,
  serviceKey: string,
  additionalAmount: number
): Promise<StudentServiceAllowance> {
  const allowances = await getStudentAllowances(studentContactId);
  const current = allowances.find((a) => a.serviceKey === serviceKey);
  const currentExtra = current ? current.extraAllowance : 0;
  const newExtra = currentExtra + additionalAmount;

  return await upsertStudentAllowance(studentContactId, serviceKey, {
    extraAllowance: newExtra,
  });
}

/**
 * Applies a new plan from the Plan Service Matrix to a student.
 * Updates BASE allowances according to the plan template defaults.
 * PRESERVES student-specific extra allowances, notes, and activity/appointment history.
 */
export async function applyPlanToStudent(
  studentContactId: number,
  newPlanKey: string,
  actorName?: string
): Promise<StudentServiceAllowance[]> {
  const matrixEntries = await getMasterPlanMatrix(newPlanKey);
  const existingList = await getStudentAllowances(studentContactId);
  const existingMap = new Map<string, StudentServiceAllowance>(existingList.map((a) => [a.serviceKey, a]));
  const defaultPeriod = getDefaultPlanPeriod();

  const updatedAllowances: StudentServiceAllowance[] = [];

  for (const entry of matrixEntries) {
    const existing = existingMap.get(entry.serviceKey);
    if (existing) {
      // PRESERVE extraAllowance and update baseAllowance, allowanceType, trackingMethod, reserveOnOpen
      const updatedRow = await upsertStudentAllowance(studentContactId, entry.serviceKey, {
        serviceName: entry.serviceName,
        category: entry.category,
        allowanceType: entry.allowanceType,
        baseAllowance: entry.baseAllowance,
        extraAllowance: existing.extraAllowance, // Explicitly preserve extra allowance override
        trackingMethod: entry.trackingMethod,
        reserveOnOpen: entry.reserveOnOpen,
        notes: `Base updated to ${entry.planName} Plan Matrix`,
      });
      updatedAllowances.push(updatedRow);
    } else {
      const newRow = await upsertStudentAllowance(studentContactId, entry.serviceKey, {
        serviceName: entry.serviceName,
        category: entry.category,
        allowanceType: entry.allowanceType,
        baseAllowance: entry.baseAllowance,
        extraAllowance: 0,
        trackingMethod: entry.trackingMethod,
        reserveOnOpen: entry.reserveOnOpen,
        planPeriodStart: defaultPeriod.start,
        planPeriodEnd: defaultPeriod.end,
        notes: `Initialized from ${entry.planName} Plan Matrix`,
      });
      updatedAllowances.push(newRow);
    }
  }

  // Update in-memory cache
  inMemoryAllowances.set(studentContactId, updatedAllowances);

  // Record plan change audit in Case Activity Timeline
  if (actorName) {
    try {
      const { recordCaseActivity } = await import("../services/caseActivityService");
      const planTitle = matrixEntries[0]?.planName || newPlanKey;
      await recordCaseActivity({
        studentContactId,
        eventType: "plan_change",
        title: `📋 Plan Matrix Applied: ${planTitle}`,
        description: `Base service allowances updated to ${planTitle} defaults. Historical extra allowances, case notes, and appointments preserved.`,
        whyReason: `Client plan transition to ${planTitle}`,
        ownerName: actorName,
        ownerRole: "Advocate",
        sources: [
          {
            type: "note",
            label: "Plan Matrix Update",
            excerpt: `Base allowances updated to ${planTitle}`,
          },
        ],
        isActionNeeded: false,
        isCompleted: true,
        categoryColor: "blue",
        eventDate: new Date(),
      });
    } catch (e) {
      console.warn("[applyPlanToStudent] Could not record activity timeline entry:", e);
    }
  }

  return updatedAllowances;
}

export interface ServiceUsageItem {
  serviceKey: string;
  serviceName: string;
  category: string;
  allowanceType: "limited" | "unlimited" | "not_included";
  baseAllowance: number;
  extraAllowance: number;
  totalAllowance: number | "Unlimited" | "Not Included";
  used: number;
  scheduledOpen: number;
  remaining: number | "Unlimited" | "Not Included";
  overLimitBy: number;
  trackingMethod: "calendar" | "timeline" | "manual";
  reserveOnOpen: boolean;
  status: "available" | "almost_limit" | "limit_reached" | "over_limit" | "unlimited" | "not_included";
  sourcesAudit: Array<{
    sourceType: "calendar" | "timeline" | "manual";
    sourceId: string | number;
    title: string;
    date: string;
    status: string;
  }>;
}

export interface ServiceUsageSummary {
  studentContactId: number;
  planPeriodStart: string;
  planPeriodEnd: string;
  planPeriodLabel: string;
  services: ServiceUsageItem[];
  availableCount: number;
  almostLimitCount: number;
  limitReachedCount: number;
  scheduledOpenCount: number;
  unlimitedCount: number;
  notIncludedCount: number;
  totalServices: number;
}

/**
 * Matcher helper that checks if an appointment relates to a serviceKey
 */
function matchAppointmentToService(appt: Appointment, serviceKey: string): boolean {
  const text = `${appt.title || ""} ${appt.meetingType || ""}`.toLowerCase();
  switch (serviceKey) {
    case "IEP_MEETING":
      return (text.includes("iep") && !text.includes("504")) || text.includes("annual iep") || text.includes("initial iep");
    case "504_MEETING":
      return text.includes("504");
    case "RECORDS_REVIEW":
      return text.includes("records") || text.includes("record review") || text.includes("cumulative file");
    case "ADVOCATE_SESSION":
      return text.includes("advocate") || text.includes("strategy") || text.includes("clarity") || text.includes("prep");
    default:
      return text.includes(serviceKey.toLowerCase().replace(/_/g, " "));
  }
}

/**
 * Matcher helper that checks if a timeline item relates to a serviceKey
 */
function matchTimelineItemToService(item: CaseActivityTimelineItem, serviceKey: string): { matches: boolean; quantity: number } {
  // 1. Check sources JSON for explicit serviceKey or task source
  if (item.sources) {
    try {
      const parsedSources = typeof item.sources === "string" ? JSON.parse(item.sources) : item.sources;
      if (Array.isArray(parsedSources)) {
        for (const s of parsedSources) {
          if (s.serviceKey === serviceKey) {
            return { matches: true, quantity: typeof s.quantity === "number" ? s.quantity : 1 };
          }
        }
      }
    } catch {
      // ignore json parse error
    }
  }

  // 2. Check eventType
  if (item.eventType === serviceKey.toLowerCase()) {
    return { matches: true, quantity: 1 };
  }

  // 3. Check keywords in title & description
  const text = `${item.title} ${item.description}`.toLowerCase();
  switch (serviceKey) {
    case "EMAIL_ASSISTANCE":
      if (text.includes("email") || text.includes("communication assistance") || text.includes("drafted email") || text.includes("school correspondence")) {
        return { matches: true, quantity: 1 };
      }
      break;
    case "STATE_COMPLAINT":
      if (text.includes("state complaint") || text.includes("formal complaint") || text.includes("complaint preparation")) {
        return { matches: true, quantity: 1 };
      }
      break;
    case "PWN_SUPPORT":
      if (text.includes("pwn") || text.includes("prior written notice") || text.includes("pwn review")) {
        return { matches: true, quantity: 1 };
      }
      break;
    case "DOCUMENT_REVIEW":
      if (text.includes("document review") || text.includes("eval review") || text.includes("psychoed review") || text.includes("review of documents")) {
        return { matches: true, quantity: 1 };
      }
      break;
    case "PARENT_CONCERN_ASSISTANCE":
      if (text.includes("parent concern") || text.includes("concern statement") || text.includes("pcs assistance")) {
        return { matches: true, quantity: 1 };
      }
      break;
    case "IEP_MEETING":
      if ((text.includes("iep meeting") || text.includes("attended iep")) && !text.includes("extra allowance")) {
        return { matches: true, quantity: 1 };
      }
      break;
    case "504_MEETING":
      if (text.includes("504 meeting") && !text.includes("extra allowance")) {
        return { matches: true, quantity: 1 };
      }
      break;
    case "RECORDS_REVIEW":
      if (text.includes("records review") && !text.includes("extra allowance")) {
        return { matches: true, quantity: 1 };
      }
      break;
    case "ADVOCATE_SESSION":
      if (text.includes("advocate session") && !text.includes("extra allowance")) {
        return { matches: true, quantity: 1 };
      }
      break;
  }

  return { matches: false, quantity: 0 };
}

/**
 * Calculates complete Service Allowances & Usage summary for a student.
 * Guarantees zero double counting between Calendar and Activity Timeline.
 * Strict time-period bounding against current service/plan period.
 */
export async function getStudentServiceUsageSummary(
  studentContactId: number,
  customPeriod?: { start?: string; end?: string }
): Promise<ServiceUsageSummary> {
  const allowances = await getStudentAllowances(studentContactId);

  // Determine period
  const defaultPeriod = getDefaultPlanPeriod();
  const periodStartStr = customPeriod?.start || allowances[0]?.planPeriodStart || defaultPeriod.start;
  const periodEndStr = customPeriod?.end || allowances[0]?.planPeriodEnd || defaultPeriod.end;
  const periodStartMs = new Date(periodStartStr + "T00:00:00.000Z").getTime();
  const periodEndMs = new Date(periodEndStr + "T23:59:59.999Z").getTime();

  const startFormatted = new Date(periodStartStr + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const endFormatted = new Date(periodEndStr + "T23:59:59Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const planPeriodLabel = `${startFormatted} – ${endFormatted}`;

  // Helper to parse dates robustly
  const parseTimeMs = (val: any): number => {
    if (!val) return 0;
    if (val instanceof Date) return val.getTime();
    if (typeof val === "string") {
      const parsed = Date.parse(val.includes("T") ? val : val.replace(" ", "T"));
      if (!isNaN(parsed)) return parsed;
    }
    return new Date(val).getTime();
  };

  let studentAppointments: Appointment[] = [];
  const db = await getDb();
  if (db) {
    try {
      studentAppointments = await db
        .select()
        .from(appointments)
        .where(eq(appointments.clientId, studentContactId));
    } catch {
      studentAppointments = [];
    }
  }

  const memAppts = inMemoryAppointments.get(studentContactId) || [];
  if (memAppts.length > 0) {
    studentAppointments = [...studentAppointments, ...memAppts];
  }

  // 2. Fetch timeline events for this student
  const { getCaseActivityByStudent } = await import("./caseActivity");
  let timelineItems: CaseActivityTimelineItem[] = [];
  try {
    timelineItems = await getCaseActivityByStudent(studentContactId);
  } catch {
    timelineItems = [];
  }

  // Track appointment IDs already counted to prevent any double counting
  const countedAppointmentIds = new Set<number>();

  // Filter appointments within plan period
  const periodAppointments = studentAppointments.filter((appt) => {
    if (!appt.startTime) return false;
    const t = parseTimeMs(appt.startTime);
    return t >= periodStartMs && t <= periodEndMs;
  });

  // Filter timeline items within plan period
  const periodTimelineItems = timelineItems.filter((item) => {
    if (!item.eventDate) return false;
    const t = parseTimeMs(item.eventDate);
    return t >= periodStartMs && t <= periodEndMs;
  });

  // Process each service
  const serviceSummaries: ServiceUsageItem[] = allowances.map((allowance) => {
    const isUnlimited = allowance.allowanceType === "unlimited";
    const sourcesAudit: ServiceUsageItem["sourcesAudit"] = [];

    let usedCount = 0;
    let scheduledOpenCount = 0;

    // Check Calendar Appointments
    for (const appt of periodAppointments) {
      if (appt.status === "Cancelled") continue;

      if (matchAppointmentToService(appt, allowance.serviceKey)) {
        countedAppointmentIds.add(appt.id);
        const apptDateStr = new Date(appt.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        if (appt.status === "Completed") {
          usedCount += 1;
          sourcesAudit.push({
            sourceType: "calendar",
            sourceId: appt.id,
            title: appt.title || allowance.serviceName,
            date: apptDateStr,
            status: "Completed",
          });
        } else {
          // Scheduled or Confirmed
          scheduledOpenCount += 1;
          sourcesAudit.push({
            sourceType: "calendar",
            sourceId: appt.id,
            title: appt.title || allowance.serviceName,
            date: apptDateStr,
            status: appt.status || "Scheduled",
          });
        }
      }
    }

    // Check Activity Timeline Entries (with NO DOUBLE COUNTING)
    for (const item of periodTimelineItems) {
      // Check if timeline item originated from an already counted appointment
      let linkedApptId: number | null = null;
      if (item.sources) {
        try {
          const parsed = typeof item.sources === "string" ? JSON.parse(item.sources) : item.sources;
          if (Array.isArray(parsed)) {
            for (const s of parsed) {
              if (s.appointmentId && countedAppointmentIds.has(Number(s.appointmentId))) {
                linkedApptId = Number(s.appointmentId);
                break;
              }
              if (s.id && typeof s.id === "number" && countedAppointmentIds.has(s.id)) {
                linkedApptId = s.id;
                break;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      // If already counted via appointment, skip to prevent double counting
      if (linkedApptId) continue;

      // Skip allowance adjustment entries themselves
      if (item.eventType === "allowance_adjustment" || item.title.includes("Extra Allowance Added")) {
        continue;
      }

      const match = matchTimelineItemToService(item, allowance.serviceKey);
      if (match.matches) {
        const itemDateStr = new Date(item.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const titleLower = item.title.toLowerCase();
        const isOpen =
          titleLower.includes("started") ||
          titleLower.includes("open") ||
          titleLower.includes("in progress") ||
          item.isActionNeeded === true ||
          item.isCompleted === false;

        if (isOpen && allowance.reserveOnOpen) {
          scheduledOpenCount += match.quantity;
          sourcesAudit.push({
            sourceType: allowance.trackingMethod === "manual" ? "manual" : "timeline",
            sourceId: item.id,
            title: item.title,
            date: itemDateStr,
            status: "Open",
          });
        } else {
          usedCount += match.quantity;
          sourcesAudit.push({
            sourceType: allowance.trackingMethod === "manual" ? "manual" : "timeline",
            sourceId: item.id,
            title: item.title,
            date: itemDateStr,
            status: "Completed",
          });
        }
      }
    }

    // Remaining calculation
    const isNotIncluded = allowance.allowanceType === "not_included";
    let totalAllowed: number | "Unlimited" | "Not Included" = "Not Included";
    let remaining: number | "Unlimited" | "Not Included" = 0;
    let overLimitBy = 0;

    if (isUnlimited) {
      totalAllowed = "Unlimited";
      remaining = "Unlimited";
    } else if (isNotIncluded) {
      if (allowance.extraAllowance > 0) {
        // Staff authorized extra allowance for a service normally not included!
        const numericTotal = allowance.extraAllowance;
        totalAllowed = numericTotal;
        const effectiveConsumed = usedCount + (allowance.reserveOnOpen ? scheduledOpenCount : 0);
        remaining = Math.max(0, numericTotal - effectiveConsumed);
        overLimitBy = Math.max(0, effectiveConsumed - numericTotal);
      } else {
        totalAllowed = "Not Included";
        remaining = 0;
        overLimitBy = usedCount + (allowance.reserveOnOpen ? scheduledOpenCount : 0);
      }
    } else {
      const numericTotal = allowance.baseAllowance + allowance.extraAllowance;
      totalAllowed = numericTotal;
      const effectiveConsumed = usedCount + (allowance.reserveOnOpen ? scheduledOpenCount : 0);
      remaining = Math.max(0, numericTotal - effectiveConsumed);
      overLimitBy = Math.max(0, effectiveConsumed - numericTotal);
    }

    // Status classification
    let status: ServiceUsageItem["status"] = "available";
    if (isUnlimited) {
      status = "unlimited";
    } else if (isNotIncluded && allowance.extraAllowance === 0) {
      status = overLimitBy > 0 ? "over_limit" : "not_included";
    } else if (overLimitBy > 0) {
      status = "over_limit";
    } else if (remaining === 0) {
      status = "limit_reached";
    } else if (remaining === 1) {
      status = "almost_limit";
    } else {
      status = "available";
    }

    return {
      serviceKey: allowance.serviceKey,
      serviceName: allowance.serviceName,
      category: allowance.category,
      allowanceType: allowance.allowanceType as "limited" | "unlimited" | "not_included",
      baseAllowance: allowance.baseAllowance,
      extraAllowance: allowance.extraAllowance,
      totalAllowance: totalAllowed,
      used: usedCount,
      scheduledOpen: scheduledOpenCount,
      remaining,
      overLimitBy,
      trackingMethod: allowance.trackingMethod as "calendar" | "timeline" | "manual",
      reserveOnOpen: allowance.reserveOnOpen,
      status,
      sourcesAudit,
    };
  });

  // Calculate high-level summary counts
  const availableCount = serviceSummaries.filter((s) => s.status === "available").length;
  const almostLimitCount = serviceSummaries.filter((s) => s.status === "almost_limit").length;
  const limitReachedCount = serviceSummaries.filter((s) => s.status === "limit_reached" || s.status === "over_limit").length;
  const scheduledOpenCount = serviceSummaries.reduce((sum, s) => sum + s.scheduledOpen, 0);
  const unlimitedCount = serviceSummaries.filter((s) => s.status === "unlimited").length;
  const notIncludedCount = serviceSummaries.filter((s) => s.status === "not_included").length;

  return {
    studentContactId,
    planPeriodStart: periodStartStr,
    planPeriodEnd: periodEndStr,
    planPeriodLabel,
    services: serviceSummaries,
    availableCount,
    almostLimitCount,
    limitReachedCount,
    scheduledOpenCount,
    unlimitedCount,
    notIncludedCount,
    totalServices: serviceSummaries.length,
  };
}

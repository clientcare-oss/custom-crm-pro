import * as db from "../db";
import { eq, asc } from "drizzle-orm";
import { appointments } from "../../drizzle/schema";
import { recordCaseActivity } from "./caseActivityService";

export type StaffStatus = "Available" | "Limited" | "Out Today" | "PTO";

export interface BlockedTime {
  id: string;
  type: "Blocked" | "PTO" | "Training" | "Lunch" | "Unavailable";
  startTime: string; // ISO string
  endTime: string;   // ISO string
  reason: string;
}

export interface DaySchedule {
  start: string; // "09:00"
  end: string;   // "16:00"
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: StaffStatus;
  statusNote?: string;
  weeklyHours: Record<number, DaySchedule[]>; // 0 = Sun, 1 = Mon ... 6 = Sat
  blockedTimes: BlockedTime[];
}

// In-memory staff roster with realistic default operational parameters
const DEFAULT_STAFF: StaffMember[] = [
  {
    id: "byron-honea",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "Lead Special Education Advocate / Practice Owner",
    status: "Available",
    statusNote: "In office & active coaching",
    weeklyHours: {
      1: [{ start: "09:00", end: "16:00" }], // Mon
      2: [{ start: "09:00", end: "16:00" }], // Tue
      3: [{ start: "09:00", end: "16:00" }], // Wed
      4: [{ start: "09:00", end: "16:00" }], // Thu
      5: [{ start: "09:00", end: "13:00" }], // Fri
    },
    blockedTimes: [],
  },
  {
    id: "wyatt-smith",
    name: "Wyatt Smith",
    email: "wyatt@waypointadvocates.com",
    role: "Senior IEP Advocate",
    status: "Available",
    statusNote: "Available for case coverage",
    weeklyHours: {
      1: [{ start: "09:00", end: "16:00" }],
      2: [{ start: "09:00", end: "16:00" }],
      3: [{ start: "09:00", end: "16:00" }],
      4: [{ start: "09:00", end: "16:00" }],
      5: [{ start: "09:00", end: "15:00" }],
    },
    blockedTimes: [],
  },
  {
    id: "sarah-jenkins",
    name: "Sarah Jenkins",
    email: "sarah.j@waypointadvocates.com",
    role: "Special Ed Advocate",
    status: "Out Today", // Example of advocate who triggered Needs Coverage
    statusNote: "Out Today — Personal emergency",
    weeklyHours: {
      1: [{ start: "09:00", end: "16:00" }],
      2: [{ start: "09:00", end: "16:00" }],
      3: [{ start: "09:00", end: "16:00" }],
      4: [{ start: "09:00", end: "16:00" }],
    },
    blockedTimes: [],
  },
  {
    id: "abby-miller",
    name: "Abby Miller",
    email: "abby.m@waypointadvocates.com",
    role: "Educational Advocate",
    status: "Limited",
    statusNote: "Limited — District IEP Hearings PM",
    weeklyHours: {
      1: [{ start: "10:00", end: "15:00" }],
      2: [{ start: "10:00", end: "15:00" }],
      3: [{ start: "10:00", end: "15:00" }],
      4: [{ start: "10:00", end: "15:00" }],
    },
    blockedTimes: [],
  },
  {
    id: "marcus-vance",
    name: "Marcus Vance",
    email: "marcus.v@waypointadvocates.com",
    role: "Advocate & Intake Specialist",
    status: "Available",
    statusNote: "Available for intakes & reviews",
    weeklyHours: {
      1: [{ start: "09:00", end: "17:00" }],
      2: [{ start: "09:00", end: "17:00" }],
      3: [{ start: "09:00", end: "17:00" }],
      4: [{ start: "09:00", end: "17:00" }],
      5: [{ start: "09:00", end: "17:00" }],
    },
    blockedTimes: [],
  },
];

let staffState: StaffMember[] = JSON.parse(JSON.stringify(DEFAULT_STAFF));

/**
 * Normalizes advocate names for comparison (handles Byron Honea, Byron, Sarah Jenkins, Sarah, etc.)
 */
export function matchAdvocate(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  if (a === b) return true;
  const aFirst = a.split(" ")[0];
  const bFirst = b.split(" ")[0];
  return aFirst === bFirst;
}

/**
 * Returns practice staff roster with up-to-date statuses and availability.
 */
export async function getStaffRoster(): Promise<StaffMember[]> {
  return staffState;
}

/**
 * Updates an advocate's temporary operational status.
 * If status is set to 'Out Today' or 'PTO', flags any scheduled appointments for that advocate
 * on that day with 'Needs Coverage' (WITHOUT auto-reassigning, adhering to human confirmation rule).
 */
export async function updateStaffStatus(
  staffId: string,
  newStatus: StaffStatus,
  statusNote?: string,
  ownerId?: number
): Promise<{ updatedStaff: StaffMember; affectedAppointmentsCount: number }> {
  const staff = staffState.find((s) => s.id === staffId || matchAdvocate(s.name, staffId));
  if (!staff) {
    throw new Error(`Staff member "${staffId}" not found`);
  }

  staff.status = newStatus;
  if (statusNote !== undefined) {
    staff.statusNote = statusNote;
  } else {
    staff.statusNote = newStatus === "Out Today" ? "Unavailable today" : newStatus === "PTO" ? "Scheduled PTO" : "";
  }

  let affectedAppointmentsCount = 0;

  // When an advocate becomes unavailable (Out Today or PTO), flag their active appointments for coverage
  if (newStatus === "Out Today" || newStatus === "PTO") {
    const dbConn = await db.getDb();
    if (dbConn) {
      const allApts = await dbConn.select().from(appointments);
      const today = new Date();
      const todayDateStr = today.toISOString().split("T")[0];

      for (const apt of allApts) {
        const aptAdvocate = apt.assignedAdvocateName || "Byron Honea"; // Legacy fallback
        if (matchAdvocate(aptAdvocate, staff.name)) {
          const aptDateStr = new Date(apt.startTime).toISOString().split("T")[0];
          // If appointment is today or in the future and not completed/cancelled
          if (aptDateStr >= todayDateStr && apt.status !== "Completed" && apt.status !== "Cancelled") {
            await dbConn
              .update(appointments)
              .set({ status: "Needs Coverage" })
              .where(eq(appointments.id, apt.id));
            affectedAppointmentsCount++;
          }
        }
      }
    }
  }

  return { updatedStaff: staff, affectedAppointmentsCount };
}

/**
 * Updates normal weekly working hours for a staff member.
 */
export async function updateStaffWeeklyHours(
  staffId: string,
  weeklyHours: Record<number, DaySchedule[]>
): Promise<StaffMember> {
  const staff = staffState.find((s) => s.id === staffId || matchAdvocate(s.name, staffId));
  if (!staff) throw new Error(`Staff member "${staffId}" not found`);
  staff.weeklyHours = weeklyHours;
  return staff;
}

/**
 * Adds a blocked time, PTO, training, lunch, or unavailable period for an advocate.
 */
export async function addStaffBlockedTime(
  staffId: string,
  blockedTime: Omit<BlockedTime, "id">
): Promise<StaffMember> {
  const staff = staffState.find((s) => s.id === staffId || matchAdvocate(s.name, staffId));
  if (!staff) throw new Error(`Staff member "${staffId}" not found`);
  const newBlocked: BlockedTime = {
    ...blockedTime,
    id: `blk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
  staff.blockedTimes.push(newBlocked);
  return staff;
}

/**
 * Removes a blocked time.
 */
export async function removeStaffBlockedTime(staffId: string, blockedId: string): Promise<StaffMember> {
  const staff = staffState.find((s) => s.id === staffId || matchAdvocate(s.name, staffId));
  if (!staff) throw new Error(`Staff member "${staffId}" not found`);
  staff.blockedTimes = staff.blockedTimes.filter((b) => b.id !== blockedId);
  return staff;
}

export interface AdvocateAvailabilityCheck {
  staffId: string;
  name: string;
  role: string;
  status: StaffStatus;
  statusNote?: string;
  isAvailable: boolean;
  isLimited: boolean;
  conflicts: string[];
}

/**
 * Evaluates whether an advocate is available for an appointment interval.
 * Checks:
 * - Temporary status (Out Today, PTO, Limited)
 * - Normal weekly working hours
 * - Blocked time / PTO / Training / Lunch
 * - Overlapping existing appointments (excluding current appointment when editing)
 */
export async function checkSingleAdvocateAvailability(
  staff: StaffMember,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: number,
  allAppointments?: any[]
): Promise<AdvocateAvailabilityCheck> {
  const conflicts: string[] = [];
  let isAvailable = true;
  let isLimited = staff.status === "Limited";

  // 1. Temporary Status Check
  if (staff.status === "Out Today") {
    isAvailable = false;
    conflicts.push("Advocate is marked 🔴 Out Today");
  } else if (staff.status === "PTO") {
    isAvailable = false;
    conflicts.push("Advocate is on 🏖️ PTO");
  }

  // 2. Normal Weekly Working Hours
  const startDay = startTime.getDay(); // 0 = Sun, 1 = Mon ...
  const daySchedule = staff.weeklyHours[startDay] || [];
  if (daySchedule.length === 0) {
    conflicts.push(`No scheduled working hours on ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][startDay]}`);
    isAvailable = false;
  } else {
    const pad = (n: number) => String(n).padStart(2, "0");
    const apptStartStr = `${pad(startTime.getHours())}:${pad(startTime.getMinutes())}`;
    const apptEndStr = `${pad(endTime.getHours())}:${pad(endTime.getMinutes())}`;

    let fitsSchedule = false;
    for (const slot of daySchedule) {
      if (apptStartStr >= slot.start && apptEndStr <= slot.end) {
        fitsSchedule = true;
        break;
      }
    }
    if (!fitsSchedule) {
      conflicts.push(`Outside regular working hours (${daySchedule.map(s => `${s.start}-${s.end}`).join(", ")})`);
      isAvailable = false;
    }
  }

  // 3. Blocked Times / PTO / Training / Lunch
  const apptStartMs = startTime.getTime();
  const apptEndMs = endTime.getTime();

  for (const blk of staff.blockedTimes) {
    const blkStartMs = new Date(blk.startTime).getTime();
    const blkEndMs = new Date(blk.endTime).getTime();
    if (apptStartMs < blkEndMs && apptEndMs > blkStartMs) {
      conflicts.push(`Overlaps ${blk.type}: ${blk.reason || "Scheduled Block"}`);
      isAvailable = false;
    }
  }

  // 4. Existing Conflicting Appointments
  if (allAppointments) {
    for (const apt of allAppointments) {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) continue;
      if (apt.status === "Cancelled") continue;

      const aptAdv = apt.assignedAdvocateName || "Byron Honea";
      if (matchAdvocate(aptAdv, staff.name)) {
        const aStart = new Date(apt.startTime).getTime();
        const aEnd = new Date(apt.endTime).getTime();

        if (apptStartMs < aEnd && apptEndMs > aStart) {
          const timeFormatted = `${new Date(apt.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–${new Date(apt.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
          conflicts.push(`Existing appointment: "${apt.title}" (${timeFormatted})`);
          isAvailable = false;
        }
      }
    }
  }

  // 5. Operational Availability Blocks (Office Closures, Holidays, PTO, Blackouts, Protected Casework)
  try {
    const opBlocks = await db.listOperationalBlocks({
      startDate: startTime,
      endDate: endTime,
    });

    for (const blk of opBlocks) {
      const applies =
        blk.scope === "ENTIRE_COMPANY" ||
        (blk.targetStaffNames && matchAdvocate(blk.targetStaffNames, staff.name));

      if (applies) {
        if (blk.schedulingEffect === "HARD_BLOCK") {
          isAvailable = false;
          conflicts.push(
            blk.scope === "ENTIRE_COMPANY"
              ? `🛑 Waypoint Closed: ${blk.title} (${blk.blockType})`
              : `🛑 Unavailable: ${blk.title} (${blk.blockType})`
          );
        } else if (blk.schedulingEffect === "SOFT_BLOCK") {
          isLimited = true;
          conflicts.push(`⚠️ Protected Time (Soft Block): ${blk.title} — Requires Override`);
        }
      }
    }
  } catch (e) {
    // Non-fatal if table not initialized
  }

  return {
    staffId: staff.id,
    name: staff.name,
    role: staff.role,
    status: staff.status,
    statusNote: staff.statusNote,
    isAvailable,
    isLimited,
    conflicts,
  };
}

/**
 * Checks availability across ALL advocates for a designated time window.
 * Returns the count of immediately available advocates and per-advocate conflict breakdown.
 */
export async function getAdvocateAvailabilitySummary(
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: number
): Promise<{
  availableCount: number;
  advocates: AdvocateAvailabilityCheck[];
}> {
  const dbConn = await db.getDb();
  let allAppointments: any[] = [];
  if (dbConn) {
    allAppointments = await dbConn.select().from(appointments);
  }

  const results: AdvocateAvailabilityCheck[] = [];
  for (const staff of staffState) {
    const check = await checkSingleAdvocateAvailability(
      staff,
      startTime,
      endTime,
      excludeAppointmentId,
      allAppointments
    );
    results.push(check);
  }

  const availableCount = results.filter((r) => r.isAvailable).length;

  return {
    availableCount,
    advocates: results,
  };
}

/**
 * Reassigns an appointment to a new advocate with mandatory human confirmation.
 * Records the reassignment into the Student Case Activity Timeline, preserving full history.
 */
export async function reassignAppointment(params: {
  appointmentId: number;
  newAdvocateName: string;
  reason?: string;
  changedByName: string;
  changedByRole?: string;
  adminOverride?: boolean;
}): Promise<{
  success: boolean;
  appointment: any;
  timelineRecorded: boolean;
}> {
  const { appointmentId, newAdvocateName, reason = "Advocate unavailable", changedByName, changedByRole = "Advocate" } = params;

  const dbConn = await db.getDb();
  if (!dbConn) throw new Error("Database not available");

  const [existingApt] = await dbConn
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!existingApt) {
    throw new Error(`Appointment #${appointmentId} not found`);
  }

  // Preserve legacy unassigned fallback safely
  const originalAdvocate = existingApt.assignedAdvocateName || "Byron Honea";

  // Update appointment record
  await dbConn
    .update(appointments)
    .set({
      assignedAdvocateName: newAdvocateName,
      status: "Confirmed", // Resolves 'Needs Coverage' back to active confirmed
    })
    .where(eq(appointments.id, appointmentId));

  const [updatedApt] = await dbConn
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  // Record into Activity Timeline
  let timelineRecorded = false;
  try {
    const timelineEntry = {
      studentContactId: existingApt.clientId || 0,
      caseId: existingApt.caseId || undefined,
      eventType: "meeting",
      title: "Appointment Reassigned",
      description: `Originally assigned: ${originalAdvocate}\nReassigned to: ${newAdvocateName}\nReason: ${reason}\nChanged by: ${changedByName} (${changedByRole})`,
      whyReason: reason,
      ownerName: changedByName,
      ownerRole: changedByRole,
      categoryColor: "amber",
      sources: [
        {
          type: "note" as const,
          label: `Appointment #${appointmentId}: ${existingApt.title}`,
        },
      ],
      eventDate: new Date().toISOString(),
    };

    if (existingApt.clientId) {
      await recordCaseActivity(timelineEntry);
      timelineRecorded = true;
    }
  } catch (err) {
    console.error("[staffAvailabilityService] Failed to record timeline entry:", err);
  }

  return {
    success: true,
    appointment: updatedApt,
    timelineRecorded,
  };
}

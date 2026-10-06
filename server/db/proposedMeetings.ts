import { eq, and, desc, asc, gte, lte, inArray, or, ne, sql } from "drizzle-orm";
import { getDb } from "./connection";
import {
  proposedMeetings,
  candidateTimeSlots,
  appointments,
  type ProposedMeeting,
  type InsertProposedMeeting,
  type CandidateTimeSlot,
  type InsertCandidateTimeSlot,
} from "../../drizzle/schema";
import { recordCaseActivity } from "../services/caseActivityService";
import { getLocalDbClient } from "../_core/d1Client";

let _tablesEnsured = false;
async function ensureTables() {
  if (_tablesEnsured) return;
  const ddl1 = `
    CREATE TABLE IF NOT EXISTS proposed_meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      assigned_advocate_name TEXT DEFAULT 'Byron Honea' NOT NULL,
      client_id INTEGER,
      parent_contact_id INTEGER,
      lead_id INTEGER,
      case_id TEXT,
      student_name TEXT NOT NULL,
      parent_name TEXT,
      parent_email TEXT,
      parent_phone TEXT,
      meeting_type TEXT DEFAULT 'Meeting Type Not Yet Determined' NOT NULL,
      school_district TEXT,
      location TEXT,
      virtual_meeting_link TEXT,
      notes TEXT,
      internal_notes TEXT,
      client_time_zone TEXT DEFAULT 'America/New_York',
      status TEXT DEFAULT 'AWAITING_CONFIRMATION' NOT NULL,
      waiting_on TEXT DEFAULT 'School' NOT NULL,
      waiting_on_other_explanation TEXT,
      final_date_process TEXT DEFAULT 'WAYPOINT_CONFIRMS' NOT NULL,
      parent_preferred_slot_id INTEGER,
      parent_selected_at TIMESTAMP,
      follow_up_by TEXT,
      confirmed_slot_id INTEGER,
      confirmed_appointment_id INTEGER,
      confirmed_by TEXT,
      confirmed_at TIMESTAMP,
      release_reason TEXT,
      released_by TEXT,
      released_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `;
  const ddl2 = `
    CREATE TABLE IF NOT EXISTS candidate_time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposed_meeting_id INTEGER NOT NULL,
      slot_order INTEGER DEFAULT 1 NOT NULL,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      duration_minutes INTEGER DEFAULT 60 NOT NULL,
      status TEXT DEFAULT 'HELD' NOT NULL,
      notes TEXT,
      released_reason TEXT,
      released_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `;
  try {
    const cfDb = (globalThis as any).__CF_ENV_DB__;
    if (cfDb) {
      await cfDb.prepare(ddl1).run();
      await cfDb.prepare(ddl2).run();
    }
  } catch {}
  try {
    const local = getLocalDbClient();
    await local.execute(ddl1);
    await local.execute(ddl2);
  } catch {}
  _tablesEnsured = true;
}

export interface CandidateSlotInput {
  startTime: Date | string;
  endTime: Date | string;
  durationMinutes?: number;
  notes?: string;
}

export interface CreateProposedMeetingInput {
  ownerId: number;
  assignedAdvocateName?: string;
  clientId?: number;
  parentContactId?: number;
  leadId?: number;
  caseId?: string;
  studentName: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  meetingType?: string;
  schoolDistrict?: string;
  location?: string;
  virtualMeetingLink?: string;
  notes?: string;
  internalNotes?: string;
  clientTimeZone?: string;
  waitingOn?: "Parent / Client" | "School" | "Waypoint" | "Multiple Parties" | "Other";
  waitingOnOtherExplanation?: string;
  finalDateProcess?: "WAYPOINT_CONFIRMS" | "PARENT_CAN_CONFIRM" | "PARENT_PREFERENCE_THEN_WAYPOINT";
  followUpBy?: string; // YYYY-MM-DD
  candidateSlots: CandidateSlotInput[];
}

/**
 * List proposed meetings with their candidate time slots
 */
export async function listProposedMeetings(filters?: {
  ownerId?: number;
  clientId?: number;
  status?: string;
  includeCompleted?: boolean;
}) {
  await ensureTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(proposedMeetings);
  const conditions: any[] = [];

  if (filters?.ownerId) {
    conditions.push(eq(proposedMeetings.ownerId, filters.ownerId));
  }
  if (filters?.clientId) {
    conditions.push(eq(proposedMeetings.clientId, filters.clientId));
  }
  if (filters?.status) {
    conditions.push(eq(proposedMeetings.status, filters.status));
  } else if (!filters?.includeCompleted) {
    conditions.push(
      inArray(proposedMeetings.status, [
        "AWAITING_CONFIRMATION",
        "WAITING_ON_PARENT",
        "WAITING_ON_SCHOOL",
        "PARENT_SELECTED",
        "AWAITING_NEW_DATES",
      ])
    );
  }

  const meetings = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(proposedMeetings.createdAt))
    : await query.orderBy(desc(proposedMeetings.createdAt));

  if (meetings.length === 0) return [];

  const meetingIds = meetings.map((m) => m.id);
  const slots = await db
    .select()
    .from(candidateTimeSlots)
    .where(inArray(candidateTimeSlots.proposedMeetingId, meetingIds))
    .orderBy(asc(candidateTimeSlots.startTime));

  const slotsByMeeting = new Map<number, CandidateTimeSlot[]>();
  for (const slot of slots) {
    const list = slotsByMeeting.get(slot.proposedMeetingId) || [];
    list.push(slot);
    slotsByMeeting.set(slot.proposedMeetingId, list);
  }

  return meetings.map((m) => ({
    ...m,
    candidateSlots: slotsByMeeting.get(m.id) || [],
  }));
}

/**
 * Get a single proposed meeting by ID with all sibling candidate slots
 */
export async function getProposedMeetingById(id: number) {
  await ensureTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [meeting] = await db
    .select()
    .from(proposedMeetings)
    .where(eq(proposedMeetings.id, id))
    .limit(1);

  if (!meeting) return null;

  const slots = await db
    .select()
    .from(candidateTimeSlots)
    .where(eq(candidateTimeSlots.proposedMeetingId, id))
    .orderBy(asc(candidateTimeSlots.startTime));

  return {
    ...meeting,
    candidateSlots: slots,
  };
}

/**
 * Create a new Proposed Meeting with linked candidate time slots
 * Fulfills Core Principle: "Never create unrelated tentative holds. Create ONE Proposed Meeting with sibling slots."
 */
export async function createProposedMeeting(input: CreateProposedMeetingInput) {
  await ensureTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!input.candidateSlots || input.candidateSlots.length === 0) {
    throw new Error("A proposed meeting must contain at least one candidate time slot.");
  }

  const meetingType = input.meetingType?.trim() || "Meeting Type Not Yet Determined";

  // Derive initial status based on waitingOn
  let initialStatus = "AWAITING_CONFIRMATION";
  if (input.waitingOn === "Parent / Client") initialStatus = "WAITING_ON_PARENT";
  else if (input.waitingOn === "School") initialStatus = "WAITING_ON_SCHOOL";

  const [insertedMeeting] = await db
    .insert(proposedMeetings)
    .values({
      ownerId: input.ownerId,
      assignedAdvocateName: input.assignedAdvocateName || "Byron Honea",
      clientId: input.clientId,
      parentContactId: input.parentContactId,
      leadId: input.leadId,
      caseId: input.caseId,
      studentName: input.studentName,
      parentName: input.parentName,
      parentEmail: input.parentEmail,
      parentPhone: input.parentPhone,
      meetingType,
      schoolDistrict: input.schoolDistrict,
      location: input.location,
      virtualMeetingLink: input.virtualMeetingLink,
      notes: input.notes,
      internalNotes: input.internalNotes,
      clientTimeZone: input.clientTimeZone || "America/New_York",
      status: initialStatus,
      waitingOn: input.waitingOn || "School",
      waitingOnOtherExplanation: input.waitingOnOtherExplanation,
      finalDateProcess: input.finalDateProcess || "WAYPOINT_CONFIRMS",
      followUpBy: input.followUpBy,
    })
    .returning();

  const proposedMeetingId = insertedMeeting.id;

  // Insert candidate time slots
  const slotInserts = input.candidateSlots.map((slot, index) => {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    const duration = slot.durationMinutes || Math.round((end.getTime() - start.getTime()) / 60000) || 60;
    return {
      proposedMeetingId,
      slotOrder: index + 1,
      startTime: start,
      endTime: end,
      durationMinutes: duration,
      status: "HELD",
      notes: slot.notes || null,
    };
  });

  const insertedSlots = await db
    .insert(candidateTimeSlots)
    .values(slotInserts)
    .returning();

  // Log to student case activity timeline if student is connected
  if (input.clientId) {
    try {
      await recordCaseActivity({
        studentContactId: input.clientId,
        caseId: input.caseId || undefined,
        ownerName: input.assignedAdvocateName || "Byron Honea",
        ownerRole: "Advocate",
        eventDate: new Date(),
        eventType: "MEETING_HOLD_CREATED",
        title: `Proposed Meeting Created: ${meetingType}`,
        description: `Created proposed meeting with ${insertedSlots.length} candidate date(s) held on calendar. Waiting on: ${input.waitingOn || "School"}.`,
        sources: [{ type: "task", label: "Calendar Scheduling Engine" }],
      });
    } catch (e) {
      console.warn("[ProposedMeetings] Failed to log case activity:", e);
    }
  }

  return {
    ...insertedMeeting,
    candidateSlots: insertedSlots,
  };
}

/**
 * Add an additional candidate date/time option to an existing Proposed Meeting
 */
export async function addCandidateSlotToMeeting(
  proposedMeetingId: number,
  slot: CandidateSlotInput
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [meeting] = await db
    .select()
    .from(proposedMeetings)
    .where(eq(proposedMeetings.id, proposedMeetingId))
    .limit(1);

  if (!meeting) throw new Error("Proposed meeting not found");

  const existingSlots = await db
    .select()
    .from(candidateTimeSlots)
    .where(eq(candidateTimeSlots.proposedMeetingId, proposedMeetingId));

  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);
  const duration = slot.durationMinutes || Math.round((end.getTime() - start.getTime()) / 60000) || 60;

  const [newSlot] = await db
    .insert(candidateTimeSlots)
    .values({
      proposedMeetingId,
      slotOrder: existingSlots.length + 1,
      startTime: start,
      endTime: end,
      durationMinutes: duration,
      status: "HELD",
      notes: slot.notes || null,
    })
    .returning();

  // If proposed meeting was in AWAITING_NEW_DATES, restore to AWAITING_CONFIRMATION
  if (meeting.status === "AWAITING_NEW_DATES") {
    await db
      .update(proposedMeetings)
      .set({ status: "AWAITING_CONFIRMATION" })
      .where(eq(proposedMeetings.id, proposedMeetingId));
  }

  return newSlot;
}

/**
 * Update the time or notes of a specific candidate slot
 */
export async function updateCandidateSlot(
  slotId: number,
  updates: { startTime?: Date | string; endTime?: Date | string; durationMinutes?: number; notes?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const setObj: any = {};
  if (updates.startTime) setObj.startTime = new Date(updates.startTime);
  if (updates.endTime) setObj.endTime = new Date(updates.endTime);
  if (updates.durationMinutes) setObj.durationMinutes = updates.durationMinutes;
  if (updates.notes !== undefined) setObj.notes = updates.notes;

  const [updated] = await db
    .update(candidateTimeSlots)
    .set(setObj)
    .where(eq(candidateTimeSlots.id, slotId))
    .returning();

  return updated;
}

/**
 * Release a single candidate slot (e.g. parent or school says this specific date does not work)
 * Sibling slots remain held.
 */
export async function releaseCandidateSlot(slotId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [slot] = await db
    .select()
    .from(candidateTimeSlots)
    .where(eq(candidateTimeSlots.id, slotId))
    .limit(1);

  if (!slot) throw new Error("Candidate slot not found");

  const [released] = await db
    .update(candidateTimeSlots)
    .set({
      status: "RELEASED",
      releasedReason: reason || "Date unavailable or rejected",
      releasedAt: new Date(),
    })
    .where(eq(candidateTimeSlots.id, slotId))
    .returning();

  // Check if any other slots remain active
  const remainingActive = await db
    .select()
    .from(candidateTimeSlots)
    .where(
      and(
        eq(candidateTimeSlots.proposedMeetingId, slot.proposedMeetingId),
        inArray(candidateTimeSlots.status, ["HELD", "PARENT_SELECTED"])
      )
    );

  // If no holds remain active, move proposed meeting to AWAITING_NEW_DATES
  if (remainingActive.length === 0) {
    await db
      .update(proposedMeetings)
      .set({ status: "AWAITING_NEW_DATES" })
      .where(eq(proposedMeetings.id, slot.proposedMeetingId));
  }

  return released;
}

/**
 * Release all holds for a Proposed Meeting (e.g. none work, canceled, postponed)
 * Preserves history while immediately restoring calendar availability.
 */
export async function releaseAllHoldsForMeeting(
  proposedMeetingId: number,
  reason: string,
  newStatus: "AWAITING_NEW_DATES" | "POSTPONED" | "CANCELED" | "CLOSED" = "AWAITING_NEW_DATES",
  releasedBy: string = "Staff"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Release all active candidate slots
  await db
    .update(candidateTimeSlots)
    .set({
      status: "RELEASED",
      releasedReason: reason,
      releasedAt: new Date(),
    })
    .where(
      and(
        eq(candidateTimeSlots.proposedMeetingId, proposedMeetingId),
        inArray(candidateTimeSlots.status, ["HELD", "PARENT_SELECTED"])
      )
    );

  // Update master proposed meeting record
  const [updatedMeeting] = await db
    .update(proposedMeetings)
    .set({
      status: newStatus,
      releaseReason: reason,
      releasedBy,
      releasedAt: new Date(),
    })
    .where(eq(proposedMeetings.id, proposedMeetingId))
    .returning();

  // Log to activity timeline
  if (updatedMeeting?.clientId) {
    try {
      await recordCaseActivity({
        studentContactId: updatedMeeting.clientId,
        caseId: updatedMeeting.caseId || undefined,
        ownerName: releasedBy || updatedMeeting.assignedAdvocateName || "Byron Honea",
        ownerRole: "Advocate",
        eventDate: new Date(),
        eventType: "MEETING_HOLDS_RELEASED",
        title: `Calendar Holds Released (${newStatus})`,
        description: `All candidate holds for ${updatedMeeting.meetingType} released. Reason: ${reason}.`,
        sources: [{ type: "task", label: "Calendar Scheduling Engine" }],
      });
    } catch (e) {
      console.warn("[ProposedMeetings] Failed to log case activity:", e);
    }
  }

  return updatedMeeting;
}

/**
 * Set parent preference for a candidate slot ("THIS DATE WORKS FOR ME")
 * Changes slot to PARENT_SELECTED, updates proposed meeting status, does NOT confirm or release siblings yet.
 */
export async function setParentPreference(
  proposedMeetingId: number,
  candidateSlotId: number,
  parentName?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Reset any other parent selected slot back to HELD
  await db
    .update(candidateTimeSlots)
    .set({ status: "HELD" })
    .where(
      and(
        eq(candidateTimeSlots.proposedMeetingId, proposedMeetingId),
        eq(candidateTimeSlots.status, "PARENT_SELECTED")
      )
    );

  // Mark the chosen slot as PARENT_SELECTED
  await db
    .update(candidateTimeSlots)
    .set({ status: "PARENT_SELECTED" })
    .where(eq(candidateTimeSlots.id, candidateSlotId));

  // Update proposed meeting
  const [updated] = await db
    .update(proposedMeetings)
    .set({
      status: "PARENT_SELECTED",
      waitingOn: "School", // Usually waiting on school to finalize parent's preferred time
      parentPreferredSlotId: candidateSlotId,
      parentSelectedAt: new Date(),
    })
    .where(eq(proposedMeetings.id, proposedMeetingId))
    .returning();

  return updated;
}

/**
 * ATOMIC CONFIRMATION WORKFLOW
 * Confirms one candidate slot into the Confirmed Appointment.
 * Automatically releases all sibling holds, restores calendar availability,
 * creates the real appointment, and logs to the student's activity timeline.
 */
export async function confirmProposedMeetingSlot(
  proposedMeetingId: number,
  candidateSlotId: number,
  confirmedBy: string = "Byron Honea",
  extraDetails?: {
    location?: string;
    virtualMeetingLink?: string;
    internalNotes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [meeting] = await db
    .select()
    .from(proposedMeetings)
    .where(eq(proposedMeetings.id, proposedMeetingId))
    .limit(1);

  if (!meeting) throw new Error("Proposed meeting not found");

  const [winningSlot] = await db
    .select()
    .from(candidateTimeSlots)
    .where(eq(candidateTimeSlots.id, candidateSlotId))
    .limit(1);

  if (!winningSlot) throw new Error("Candidate slot not found");

  // 1. Mark the selected candidate slot as CONFIRMED
  await db
    .update(candidateTimeSlots)
    .set({ status: "CONFIRMED" })
    .where(eq(candidateTimeSlots.id, candidateSlotId));

  // 2. Release every other active candidate slot for this proposed meeting
  const siblingSlots = await db
    .select()
    .from(candidateTimeSlots)
    .where(
      and(
        eq(candidateTimeSlots.proposedMeetingId, proposedMeetingId),
        ne(candidateTimeSlots.id, candidateSlotId),
        inArray(candidateTimeSlots.status, ["HELD", "PARENT_SELECTED"])
      )
    );

  const releasedCount = siblingSlots.length;

  if (releasedCount > 0) {
    const formattedWinnerDate = new Date(winningSlot.startTime).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    await db
      .update(candidateTimeSlots)
      .set({
        status: "RELEASED",
        releasedReason: `Released automatically upon confirmation of ${formattedWinnerDate}`,
        releasedAt: new Date(),
      })
      .where(
        and(
          eq(candidateTimeSlots.proposedMeetingId, proposedMeetingId),
          ne(candidateTimeSlots.id, candidateSlotId)
        )
      );
  }

  // 3. Create the real Confirmed Appointment in `appointments` table
  const appointmentTitle = `${meeting.studentName} — ${meeting.meetingType}`;
  const [createdAppointment] = await db
    .insert(appointments)
    .values({
      ownerId: meeting.ownerId,
      clientId: meeting.clientId,
      caseId: meeting.caseId,
      title: appointmentTitle,
      description: meeting.notes || `Confirmed from Proposed Meeting #${proposedMeetingId}`,
      startTime: winningSlot.startTime,
      endTime: winningSlot.endTime,
      meetingType: meeting.meetingType,
      location: extraDetails?.location || meeting.location,
      videoLink: extraDetails?.virtualMeetingLink || meeting.virtualMeetingLink,
      clientMeetingLink: extraDetails?.virtualMeetingLink || meeting.virtualMeetingLink,
      parentName: meeting.parentName,
      parentPhone: meeting.parentPhone,
      studentName: meeting.studentName,
      clientTimeZone: meeting.clientTimeZone || "America/New_York",
      assignedAdvocateName: meeting.assignedAdvocateName || confirmedBy,
      status: "Confirmed",
      proposedMeetingId: meeting.id,
      candidateSlotId: winningSlot.id,
      confirmedBy,
      confirmedAt: new Date(),
    })
    .returning();

  // 4. Update the proposed meeting status to CONFIRMED
  const [updatedMeeting] = await db
    .update(proposedMeetings)
    .set({
      status: "CONFIRMED",
      confirmedSlotId: winningSlot.id,
      confirmedAppointmentId: createdAppointment.id,
      confirmedBy,
      confirmedAt: new Date(),
      location: extraDetails?.location || meeting.location,
      virtualMeetingLink: extraDetails?.virtualMeetingLink || meeting.virtualMeetingLink,
      internalNotes: extraDetails?.internalNotes || meeting.internalNotes,
    })
    .where(eq(proposedMeetings.id, proposedMeetingId))
    .returning();

  // 5. Connect to Student Activity Timeline
  if (meeting.clientId) {
    try {
      const formattedDate = new Date(winningSlot.startTime).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      await recordCaseActivity({
        studentContactId: meeting.clientId,
        caseId: meeting.caseId || undefined,
        ownerName: confirmedBy || meeting.assignedAdvocateName || "Byron Honea",
        ownerRole: "Advocate",
        eventDate: new Date(),
        eventType: "MEETING_CONFIRMED",
        title: `Meeting Confirmed: ${meeting.meetingType}`,
        description: `Confirmed for ${formattedDate} by ${confirmedBy}. Automatically released ${releasedCount} other proposed hold(s).`,
        sources: [{ type: "task", label: "Calendar Scheduling Engine" }],
      });
    } catch (e) {
      console.warn("[ProposedMeetings] Failed to log case activity:", e);
    }
  }

  return {
    success: true,
    appointment: createdAppointment,
    proposedMeeting: updatedMeeting,
    releasedCount,
  };
}

/**
 * Work Queue: HOLDS NEEDING ATTENTION
 * Surfaces proposed meetings that:
 * - Passed their Follow Up By date
 * - Have been held for > 3 days
 * - Have a parent preference waiting for Waypoint confirmation
 * - Have candidate dates approaching soon (< 72 hours)
 */
export async function getHoldsNeedingAttention(ownerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allActive = await listProposedMeetings({ ownerId });

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  const attentionList = allActive.map((meeting) => {
    const reasons: string[] = [];

    // Check overdue follow up
    if (meeting.followUpBy && meeting.followUpBy <= todayStr) {
      reasons.push(`Follow-up overdue (${meeting.followUpBy})`);
    }

    // Check parent selected preference
    if (meeting.status === "PARENT_SELECTED" || meeting.parentPreferredSlotId) {
      const preferredSlot = meeting.candidateSlots.find((s) => s.id === meeting.parentPreferredSlotId);
      const slotStr = preferredSlot
        ? new Date(preferredSlot.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";
      reasons.push(`Parent preferred ${slotStr} · Awaiting final confirmation`);
    }

    // Check approaching candidate dates
    const approachingSlots = meeting.candidateSlots.filter((s) => {
      const start = new Date(s.startTime);
      return (s.status === "HELD" || s.status === "PARENT_SELECTED") && start >= now && start <= in72Hours;
    });

    if (approachingSlots.length > 0) {
      reasons.push(`${approachingSlots.length} held date(s) within 72 hours`);
    }

    // Check held for > 3 days
    const createdDate = new Date(meeting.createdAt);
    const daysHeld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysHeld >= 3) {
      reasons.push(`Held for ${daysHeld} days`);
    }

    return {
      meeting,
      daysHeld,
      reasons,
      needsAttention: reasons.length > 0,
    };
  }).filter((item) => item.needsAttention);

  return attentionList;
}

/**
 * Detect scheduling conflicts with confirmed appointments or active held candidate slots
 */
export async function detectSchedulingConflicts(
  startTime: Date | string,
  endTime: Date | string,
  options?: { advocateName?: string; excludeMeetingId?: number; excludeAppointmentId?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const start = new Date(startTime);
  const end = new Date(endTime);

  // Check confirmed appointments
  const apts = await db
    .select()
    .from(appointments)
    .where(
      and(
        ne(appointments.status, "Cancelled"),
        options?.excludeAppointmentId ? ne(appointments.id, options.excludeAppointmentId) : undefined,
        // Overlap condition: start < apt.endTime AND end > apt.startTime
        sql`${appointments.startTime} < ${end.toISOString()} AND ${appointments.endTime} > ${start.toISOString()}`
      )
    );

  // Check active held candidate slots
  const slots = await db
    .select({
      slot: candidateTimeSlots,
      meeting: proposedMeetings,
    })
    .from(candidateTimeSlots)
    .innerJoin(proposedMeetings, eq(candidateTimeSlots.proposedMeetingId, proposedMeetings.id))
    .where(
      and(
        inArray(candidateTimeSlots.status, ["HELD", "PARENT_SELECTED"]),
        options?.excludeMeetingId ? ne(candidateTimeSlots.proposedMeetingId, options.excludeMeetingId) : undefined,
        sql`${candidateTimeSlots.startTime} < ${end.toISOString()} AND ${candidateTimeSlots.endTime} > ${start.toISOString()}`
      )
    );

  const conflicts = [
    ...apts.map((a) => ({
      type: "CONFIRMED_APPOINTMENT" as const,
      id: a.id,
      title: a.title,
      studentName: a.studentName,
      advocateName: a.assignedAdvocateName || "Assigned Advocate",
      startTime: a.startTime,
      endTime: a.endTime,
      isHold: false,
    })),
    ...slots.map(({ slot, meeting }) => ({
      type: "TENTATIVE_HOLD" as const,
      id: slot.id,
      proposedMeetingId: meeting.id,
      title: `${meeting.studentName} — ${meeting.meetingType}`,
      studentName: meeting.studentName,
      advocateName: meeting.assignedAdvocateName || "Assigned Advocate",
      startTime: slot.startTime,
      endTime: slot.endTime,
      isHold: true,
      waitingOn: meeting.waitingOn,
      status: slot.status,
    })),
  ];

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

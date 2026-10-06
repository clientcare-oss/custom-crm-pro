import { eq, and, desc, asc, gte, lte, or, sql } from "drizzle-orm";
import { getDb } from "./connection";
import {
  operationalBlocks,
  appointments,
  candidateTimeSlots,
  proposedMeetings,
  type OperationalBlock,
  type InsertOperationalBlock,
} from "../../drizzle/schema";
import { getLocalDbClient } from "../_core/d1Client";

let _tableEnsured = false;
async function ensureOperationalBlocksTable() {
  if (_tableEnsured) return;
  const ddl = `
    CREATE TABLE IF NOT EXISTS operational_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      block_type TEXT NOT NULL,
      category_family TEXT DEFAULT 'OPERATIONAL_BLOCK' NOT NULL,
      scheduling_effect TEXT DEFAULT 'HARD_BLOCK' NOT NULL,
      scope TEXT DEFAULT 'ONE_EMPLOYEE' NOT NULL,
      target_staff_ids TEXT,
      target_staff_names TEXT,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      is_all_day INTEGER DEFAULT 0 NOT NULL,
      all_day_date TEXT,
      all_day_end_date TEXT,
      recurrence_rule TEXT DEFAULT 'NONE' NOT NULL,
      recurrence_days TEXT,
      recurrence_end_type TEXT DEFAULT 'NO_END_DATE',
      recurrence_end_date TEXT,
      recurrence_count INTEGER,
      reason TEXT,
      notes TEXT,
      location TEXT,
      created_by INTEGER,
      created_by_name TEXT,
      is_archived INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `;
  try {
    const raw = getLocalDbClient();
    if (raw) {
      raw.exec(ddl);
    }
    _tableEnsured = true;
  } catch (e) {
    console.warn("[operationalBlocks] ensureTable warning:", e);
  }
}

/**
 * Normalizes advocate names for comparison (handles Byron Honea, Byron, Sarah Jenkins, Sarah, etc.)
 */
function matchAdvocateName(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const normA = a.trim().toLowerCase();
  const normB = b.trim().toLowerCase();
  if (normA === normB) return true;
  const aFirst = normA.split(" ")[0];
  const bFirst = normB.split(" ")[0];
  return aFirst === bFirst;
}

/**
 * 1. List operational blocks with optional filters
 */
export async function listOperationalBlocks(filters?: {
  startDate?: Date | string;
  endDate?: Date | string;
  staffName?: string;
  scope?: string;
  blockType?: string;
  schedulingEffect?: string;
  includeArchived?: boolean;
}): Promise<OperationalBlock[]> {
  await ensureOperationalBlocksTable();
  const db = await getDb();
  const conditions: any[] = [];

  if (!filters?.includeArchived) {
    conditions.push(eq(operationalBlocks.isArchived, false));
  }

  if (filters?.scope) {
    conditions.push(eq(operationalBlocks.scope, filters.scope));
  }

  if (filters?.blockType) {
    conditions.push(eq(operationalBlocks.blockType, filters.blockType));
  }

  if (filters?.schedulingEffect) {
    conditions.push(eq(operationalBlocks.schedulingEffect, filters.schedulingEffect));
  }

  if (filters?.startDate && filters?.endDate) {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    conditions.push(
      or(
        and(gte(operationalBlocks.startTime, start), lte(operationalBlocks.startTime, end)),
        and(gte(operationalBlocks.endTime, start), lte(operationalBlocks.endTime, end)),
        and(lte(operationalBlocks.startTime, start), gte(operationalBlocks.endTime, end))
      )
    );
  }

  const query = db
    .select()
    .from(operationalBlocks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(operationalBlocks.startTime));

  const allBlocks = await query;

  // Filter by staffName if provided (checking scope, targetStaffNames, and targetStaffIds)
  if (filters?.staffName && filters.staffName !== "all") {
    return allBlocks.filter((b) => {
      if (b.scope === "ENTIRE_COMPANY") return true;
      if (!b.targetStaffNames) return false;
      return (
        b.targetStaffNames.toLowerCase().includes(filters.staffName!.toLowerCase()) ||
        matchAdvocateName(b.targetStaffNames, filters.staffName)
      );
    });
  }

  return allBlocks;
}

/**
 * 2. Get single operational block by ID
 */
export async function getOperationalBlockById(id: number): Promise<OperationalBlock | null> {
  await ensureOperationalBlocksTable();
  const db = await getDb();
  if (!db) return null;

  const [block] = await db
    .select()
    .from(operationalBlocks)
    .where(eq(operationalBlocks.id, id))
    .limit(1);

  return block || null;
}

/**
 * 3. Create a new operational block
 */
export async function createOperationalBlock(
  input: InsertOperationalBlock
): Promise<OperationalBlock> {
  await ensureOperationalBlocksTable();
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [result] = await db
    .insert(operationalBlocks)
    .values({
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .$returningId();

  const createdId = result?.id || (result as any);
  const created = await getOperationalBlockById(Number(createdId));
  if (!created) throw new Error("Failed to create operational block");
  return created;
}

/**
 * 4. Update an existing operational block
 */
export async function updateOperationalBlock(
  id: number,
  data: Partial<InsertOperationalBlock>
): Promise<OperationalBlock> {
  await ensureOperationalBlocksTable();
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  await db
    .update(operationalBlocks)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(operationalBlocks.id, id));

  const updated = await getOperationalBlockById(id);
  if (!updated) throw new Error(`Operational block #${id} not found`);
  return updated;
}

/**
 * 5. Delete or archive an operational block
 */
export async function deleteOperationalBlock(id: number): Promise<boolean> {
  await ensureOperationalBlocksTable();
  const db = await getDb();
  if (!db) return false;

  await db.delete(operationalBlocks).where(eq(operationalBlocks.id, id));
  return true;
}

/**
 * 6. Conflict Checker for Operational Blocks:
 * Checks if the proposed operational block overlaps existing Confirmed Appointments or Candidate Holds.
 */
export async function checkOperationalBlockConflicts(input: {
  startTime: Date | string;
  endTime: Date | string;
  scope?: string;
  targetStaffNames?: string;
  targetStaffIds?: string;
}): Promise<{
  overlappingAppointments: Array<{
    id: number;
    title: string;
    studentName?: string | null;
    parentName?: string | null;
    startTime: Date;
    endTime: Date;
    assignedAdvocateName?: string | null;
  }>;
  overlappingCandidateHolds: Array<{
    id: number;
    proposedMeetingId: number;
    studentName: string;
    parentName?: string | null;
    startTime: Date;
    endTime: Date;
    slotOrder: number;
    siblingCount: number;
  }>;
}> {
  await ensureOperationalBlocksTable();
  const db = await getDb();
  if (!db) return { overlappingAppointments: [], overlappingCandidateHolds: [] };

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  // 1. Check existing confirmed appointments
  const allApts = await db.select().from(appointments);
  const overlappingAppointments = allApts
    .filter((apt) => {
      if (apt.status === "Cancelled") return false;
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      // Overlap check
      const overlaps = aptStart < end && aptEnd > start;
      if (!overlaps) return false;

      // Scope check: If ENTIRE_COMPANY, any appointment conflicts. If specific staff, check advocate match
      if (input.scope === "ENTIRE_COMPANY") return true;
      if (input.targetStaffNames) {
        return matchAdvocateName(apt.assignedAdvocateName, input.targetStaffNames);
      }
      return true;
    })
    .map((apt) => ({
      id: apt.id,
      title: apt.title,
      studentName: apt.studentName,
      parentName: apt.parentName,
      startTime: new Date(apt.startTime),
      endTime: new Date(apt.endTime),
      assignedAdvocateName: apt.assignedAdvocateName,
    }));

  // 2. Check candidate time slots (active holds)
  const allSlots = await db
    .select()
    .from(candidateTimeSlots)
    .where(eq(candidateTimeSlots.status, "HELD"));

  const overlappingCandidateHolds: any[] = [];
  for (const slot of allSlots) {
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    const overlaps = slotStart < end && slotEnd > start;
    if (overlaps) {
      const [pm] = await db
        .select()
        .from(proposedMeetings)
        .where(eq(proposedMeetings.id, slot.proposedMeetingId))
        .limit(1);

      if (pm && pm.status !== "RELEASED" && pm.status !== "CONFIRMED") {
        if (
          input.scope === "ENTIRE_COMPANY" ||
          !input.targetStaffNames ||
          matchAdvocateName(pm.assignedAdvocateName, input.targetStaffNames)
        ) {
          overlappingCandidateHolds.push({
            id: slot.id,
            proposedMeetingId: pm.id,
            studentName: pm.studentName,
            parentName: pm.parentName,
            startTime: slotStart,
            endTime: slotEnd,
            slotOrder: slot.slotOrder,
            siblingCount: 1,
          });
        }
      }
    }
  }

  return {
    overlappingAppointments,
    overlappingCandidateHolds,
  };
}

/**
 * 7. Real-Time Operational Availability Check:
 * Given a proposed appointment time window and advocate, determines whether:
 * - A HARD BLOCK prevents scheduling (e.g. Office Closed, Company Blackout, Advocate PTO)
 * - A SOFT BLOCK exists (e.g. Protected Casework) that requires intentional override
 * - An INFORMATIONAL event is present
 */
export async function checkOperationalAvailability(input: {
  startTime: Date | string;
  endTime: Date | string;
  advocateName?: string;
}): Promise<{
  isHardBlocked: boolean;
  hardBlockReason?: string;
  hardBlockTitle?: string;
  isSoftBlocked: boolean;
  softBlockReason?: string;
  softBlockTitle?: string;
  activeBlocks: OperationalBlock[];
}> {
  await ensureOperationalBlocksTable();
  const db = await getDb();
  if (!db) {
    return { isHardBlocked: false, isSoftBlocked: false, activeBlocks: [] };
  }

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  const activeBlocks = await listOperationalBlocks({
    startDate: start,
    endDate: end,
    staffName: input.advocateName,
  });

  let isHardBlocked = false;
  let hardBlockReason: string | undefined = undefined;
  let hardBlockTitle: string | undefined = undefined;

  let isSoftBlocked = false;
  let softBlockReason: string | undefined = undefined;
  let softBlockTitle: string | undefined = undefined;

  for (const block of activeBlocks) {
    // Check if block affects this advocate
    const applies =
      block.scope === "ENTIRE_COMPANY" ||
      !input.advocateName ||
      matchAdvocateName(block.targetStaffNames, input.advocateName);

    if (!applies) continue;

    if (block.schedulingEffect === "HARD_BLOCK") {
      isHardBlocked = true;
      hardBlockTitle = block.title;
      hardBlockReason =
        block.scope === "ENTIRE_COMPANY"
          ? `Entire Waypoint Organization Closed: ${block.title} (${block.blockType})`
          : `${block.targetStaffNames || input.advocateName} Unavailable: ${block.title} (${block.blockType})`;
      break; // Hard block has highest priority
    } else if (block.schedulingEffect === "SOFT_BLOCK" && !isSoftBlocked) {
      isSoftBlocked = true;
      softBlockTitle = block.title;
      softBlockReason = `Protected Time: ${block.title} (${block.blockType}) — Requires Confirmation`;
    }
  }

  return {
    isHardBlocked,
    hardBlockReason,
    hardBlockTitle,
    isSoftBlocked,
    softBlockReason,
    softBlockTitle,
    activeBlocks,
  };
}

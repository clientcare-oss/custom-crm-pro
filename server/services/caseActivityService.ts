import * as db from "../db";
import type { CaseActivityTimelineItem, InsertCaseActivityTimelineItem } from "../../drizzle/schema";

export interface CaseActivityInput {
  studentContactId: number;
  caseId?: string;
  eventType: string;
  title: string;
  description: string;
  whyReason?: string;
  ownerName: string;
  ownerRole?: string;
  sources?: Array<{
    type: "email" | "call" | "note" | "document" | "task";
    label: string;
    url?: string;
    excerpt?: string;
    id?: string | number;
  }>;
  quoteText?: string;
  nextStepAction?: string;
  isActionNeeded?: boolean;
  isCompleted?: boolean;
  categoryColor?: string;
  eventDate?: Date | string;
}

/**
 * Standard seed events matching the approved Kylie Hitchcock / Waypoint design reference.
 * Used when a student has not accumulated custom live timeline events yet.
 */
export function getDefaultTimelineEvents(studentContactId: number, caseId?: string): (InsertCaseActivityTimelineItem & { id: number; createdAt: Date; updatedAt: Date })[] {
  const now = new Date();
  return [
    {
      id: 101,
      studentContactId,
      caseId: caseId || "WP-2026-0001",
      eventType: "next_step",
      title: "Send parent guidance",
      description: "Request alternate dates and three times for the DPR meeting.",
      whyReason: "Secure school availability for the rescheduled DPR review session.",
      ownerName: "Byron Clausen",
      ownerRole: "Advocate",
      sources: JSON.stringify([
        { type: "note", label: "Advocate note", excerpt: "Need to coordinate three alternate slots for DPR meeting." }
      ]),
      quoteText: undefined,
      nextStepAction: "Send parent guidance",
      isActionNeeded: true,
      isCompleted: false,
      categoryColor: "yellow",
      eventDate: new Date("2026-09-15T09:00:00Z"),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 102,
      studentContactId,
      caseId: caseId || "WP-2026-0001",
      eventType: "school_response",
      title: "School Response Received",
      description: "School explained the DPR process, confirmed they will complete a data dig, and outlined MTSS next steps.",
      whyReason: "School responding to formal Direct Parent Request for comprehensive psychoeducational evaluation.",
      ownerName: "Bentonville Schools",
      ownerRole: "School / District",
      sources: JSON.stringify([
        { type: "email", label: "Email", excerpt: "Received formal evaluation request. Initiating data dig through MTSS team." }
      ]),
      quoteText: '"We have received your request for an evaluation. We will begin with a data dig... Based on the results, we will determine next steps through MTSS..."',
      nextStepAction: undefined,
      isActionNeeded: false,
      isCompleted: true,
      categoryColor: "purple",
      eventDate: new Date("2026-09-14T08:15:00Z"),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 103,
      studentContactId,
      caseId: caseId || "WP-2026-0001",
      eventType: "client_contact",
      title: "Client Contacted",
      description: "Client was instructed to cancel or reschedule the meeting and request three alternate dates and times.",
      whyReason: "Allow time for DPR process to begin.",
      ownerName: "Byron Clausen",
      ownerRole: "Advocate",
      sources: JSON.stringify([
        { type: "call", label: "Call transcript", excerpt: "Byron advised parent to request postponement so evaluation paperwork is properly lodged." },
        { type: "task", label: "Request 3 alternative dates" }
      ]),
      quoteText: undefined,
      nextStepAction: "Request 3 alternative dates",
      isActionNeeded: false,
      isCompleted: true,
      categoryColor: "teal",
      eventDate: new Date("2026-09-06T09:03:00Z"),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 104,
      studentContactId,
      caseId: caseId || "WP-2026-0001",
      eventType: "strategy_decision",
      title: "Strategy Decision",
      description: "Recommended postponing the upcoming meeting while the Direct Parent Request process begins.",
      whyReason: "Start DPR/evaluation process first.",
      ownerName: "Byron Clausen",
      ownerRole: "Advocate",
      sources: JSON.stringify([
        { type: "call", label: "Call transcript", excerpt: "Advocate strategy consultation: hold off on routine review until evaluation window opens." },
        { type: "note", label: "Note", excerpt: "Strategic hold advised to maximize parent rights under state timeline." }
      ]),
      quoteText: undefined,
      nextStepAction: undefined,
      isActionNeeded: false,
      isCompleted: true,
      categoryColor: "amber",
      eventDate: new Date("2026-09-05T14:18:00Z"),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 105,
      studentContactId,
      caseId: caseId || "WP-2026-0001",
      eventType: "evaluation_request",
      title: "Evaluation Request Sent",
      description: "Parent requested an academic evaluation from Dr. Sabata.",
      whyReason: "Concerns regarding academic performance.",
      ownerName: "Mrs. Urbanski",
      ownerRole: "Parent",
      sources: JSON.stringify([
        { type: "email", label: "Email", excerpt: "Formal letter requesting academic and cognitive testing sent to school psychologist Dr. Sabata." }
      ]),
      quoteText: undefined,
      nextStepAction: undefined,
      isActionNeeded: false,
      isCompleted: true,
      categoryColor: "blue",
      eventDate: new Date("2026-09-04T10:42:00Z"),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 106,
      studentContactId,
      caseId: caseId || "WP-2026-0001",
      eventType: "consultation",
      title: "Initial consultation",
      description: "Initial intake and case review with parent regarding student needs and IEP goals.",
      whyReason: "Onboarding family and assessing student special education services.",
      ownerName: "Byron Clausen",
      ownerRole: "Advocate",
      sources: JSON.stringify([
        { type: "call", label: "Call transcript", excerpt: "Initial consultation call: discussed 7th grade math and reading challenges." }
      ]),
      quoteText: undefined,
      nextStepAction: undefined,
      isActionNeeded: false,
      isCompleted: true,
      categoryColor: "cyan",
      eventDate: new Date("2026-08-28T11:00:00Z"),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Reusable action capture helper for any CRM workflow in the student workspace.
 * Automatically associates the action with the student, caseId, actor, and sources.
 */
export async function recordCaseActivity(input: CaseActivityInput): Promise<CaseActivityTimelineItem | null> {
  const insertData: InsertCaseActivityTimelineItem = {
    studentContactId: input.studentContactId,
    caseId: input.caseId,
    eventType: input.eventType,
    title: input.title,
    description: input.description,
    whyReason: input.whyReason,
    ownerName: input.ownerName || "Staff Advocate",
    ownerRole: input.ownerRole || "Advocate",
    sources: input.sources ? JSON.stringify(input.sources) : undefined,
    quoteText: input.quoteText,
    nextStepAction: input.nextStepAction,
    isActionNeeded: input.isActionNeeded ?? false,
    isCompleted: input.isCompleted ?? false,
    categoryColor: input.categoryColor || "blue",
    eventDate: input.eventDate ? new Date(input.eventDate) : new Date(),
  };

  return await db.createCaseActivityItem(insertData);
}

/**
 * Retrieves the full activity timeline for a student.
 * If empty in database, automatically provisions the default timeline so the workspace is immediately live.
 */
export async function getStudentCaseTimeline(studentContactId: number, caseId?: string): Promise<CaseActivityTimelineItem[]> {
  const existing = await db.getCaseActivityByStudent(studentContactId);
  if (existing && existing.length > 0) {
    return existing;
  }

  // Auto-seed default events for immediate working experience
  const defaults = getDefaultTimelineEvents(studentContactId, caseId);
  for (const item of defaults) {
    await db.createCaseActivityItem(item);
  }

  const seeded = await db.getCaseActivityByStudent(studentContactId);
  return seeded && seeded.length > 0 ? seeded : (defaults as unknown as CaseActivityTimelineItem[]);
}

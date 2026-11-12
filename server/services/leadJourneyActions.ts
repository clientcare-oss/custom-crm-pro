import { eq, and } from "drizzle-orm";
import * as db from "../db";
import { getDb } from "../db/connection";
import {
  contacts,
  leads,
  projects,
  discoveryCalls,
  agreements,
  invoices,
} from "../../drizzle/schema";
import { extractInsertId } from "./familyIdentityService";
import {
  approveFamilyEnrollment,
  selectFamilyEnrollmentPlan,
  activateFamilyMembership,
  createManualEnrollmentInvoice,
  verifyManualInvoicePayment,
  onAgreementSignedForEnrollment,
} from "./familyEnrollmentService";
import {
  triggerSpecificAutomation,
  listAutomations,
} from "../db/automations";
import {
  type LeadStage,
  type DiscoveryOutcome,
  type DecisionChoice,
  type InquiryStudentItem,
  type CallAttemptRecord,
  type DecisionDetailsRecord,
  type SharedHistoryEntry,
  parseDiscoveryPricingBlob,
  serializeDiscoveryPricingBlob,
  reconcileLeadAutomationsAndTasks,
  getHydratedLeadWorkspace,
  inMemoryDiscoveryCalls,
  inMemoryLeadAppointments,
  inMemoryLeadOffers,
} from "./leadJourneyService";
import { inMemoryContacts } from "../db/contacts";

/**
 * Updates Inquiry stage information (parent details, multi-student list, main concerns, desired outcome, contact preferences).
 */
export async function updateInquiryDetails(params: {
  ownerId: number;
  leadId: number;
  actorName?: string;
  parent?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    preferredContactMethod?: string;
    availability?: string;
  };
  students?: InquiryStudentItem[];
  concerns?: string;
  desiredOutcome?: string;
  timeZone?: string;
  assignedAdvocate?: string;
  sendSchedulingLink?: boolean;
  recordContactAttempt?: string;
  progressDirectlyToDecision?: boolean;
  directToDecisionNote?: string;
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");

  const workspace = await getHydratedLeadWorkspace(params.leadId, params.ownerId);
  if (!workspace) throw new Error("Lead not found");

  const parentId = workspace.parentContact?.id;

  // 1. Update Parent Contact
  if (parentId && params.parent) {
    const pUpdates: Record<string, any> = {};
    if (params.parent.firstName !== undefined) pUpdates.firstName = params.parent.firstName.trim();
    if (params.parent.lastName !== undefined) pUpdates.lastName = params.parent.lastName.trim();
    if (params.parent.phone !== undefined) pUpdates.phone = params.parent.phone.trim() || null;
    if (params.parent.email !== undefined) pUpdates.email = params.parent.email.trim().toLowerCase() || null;
    if (params.parent.preferredContactMethod !== undefined) {
      pUpdates.preferredCommunicationMethod = params.parent.preferredContactMethod;
    }
    if (params.parent.availability !== undefined) {
      pUpdates.bestTimeToCall = params.parent.availability;
    }
    if (params.concerns !== undefined) {
      pUpdates.challenges = params.concerns;
    }
    if (Object.keys(pUpdates).length > 0) {
      await db.updateContactById(parentId, pUpdates);
    }
  }

  // 2. Update or Add Students under this Parent Contact
  if (parentId && params.students && params.students.length > 0) {
    const existingStudents = await db.getStudentsByParentContactId(parentId);
    for (const stu of params.students) {
      const sFirst = (stu.firstName || "").trim();
      const sLast = (stu.lastName || params.parent?.lastName || workspace.parentContact?.lastName || "Family").trim();
      if (!sFirst) continue;

      const match = stu.id
        ? existingStudents.find((es: any) => es.id === stu.id)
        : existingStudents.find(
            (es: any) => (es.firstName || "").trim().toLowerCase() === sFirst.toLowerCase()
          );

      if (match) {
        await db.updateContactById(match.id, {
          firstName: sFirst,
          lastName: sLast,
          gradeLevel: stu.gradeLevel ?? match.gradeLevel,
          schoolName: stu.schoolName ?? match.schoolName,
          planType: stu.iepOr504 ?? match.planType,
          diagnosis: stu.diagnosis ?? match.diagnosis,
          challenges: stu.challenges ?? params.concerns ?? match.challenges,
        });
      } else {
        const year = new Date().getFullYear();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const caseId = `WP-${year}-${randomSuffix}`;
        const sIns = await db.createContact(
          {
            firstName: sFirst,
            lastName: sLast,
            jobTitle: "Student",
            parentContactId: parentId,
            caseId,
            gradeLevel: stu.gradeLevel || null,
            schoolName: stu.schoolName || null,
            planType: stu.iepOr504 || "IEP",
            diagnosis: stu.diagnosis || null,
            challenges: stu.challenges || params.concerns || null,
            lifecycleStage: "Discovery",
            portalLifecycleStatus: "Discovery",
          } as any,
          params.ownerId
        );
        const newStudentId = extractInsertId(sIns);
        await dbConn.insert(projects).values({
          ownerId: params.ownerId,
          clientId: newStudentId,
          name: `${sFirst} ${sLast} — Case`,
          description: `Case established from Lead Center inquiry.`,
          status: "Planning",
        });
      }
    }
  }

  // 3. Update Lead & DiscoveryCall journey metadata
  const dCall = workspace.discoveryCall;
  const { journey } = parseDiscoveryPricingBlob(dCall?.pricingNotes);
  const nowIso = new Date().toISOString();
  const actor = params.actorName || "Lead Special Education Advocate";
  const newConcerns = params.concerns !== undefined ? params.concerns : journey.concerns;
  const newDesired = params.desiredOutcome !== undefined ? params.desiredOutcome : journey.desiredOutcome;

  const history: SharedHistoryEntry[] = [...(journey.sharedHistory || [])];
  const callAttempts: CallAttemptRecord[] = [...(journey.callAttempts || [])];
  let nextStage: LeadStage = journey.stage || "inquiry";
  let nextActionObj = journey.nextAction;
  let schedulingLinkSent = journey.schedulingLinkSent;
  let schedulingLinkSentAt = journey.schedulingLinkSentAt;
  let progressedDirectlyToDecision = journey.progressedDirectlyToDecision;

  if (params.sendSchedulingLink) {
    schedulingLinkSent = true;
    schedulingLinkSentAt = nowIso;
    nextActionObj = {
      label: "Follow up",
      dueDate: null,
      type: "awaiting_scheduling_link",
    };
    history.unshift({
      id: `hist_${Date.now()}_link`,
      timestamp: nowIso,
      type: "inquiry",
      title: "Discovery Scheduling Link Sent",
      summary: `Sent scheduling link to ${params.parent?.email || workspace.lead.parentEmail || workspace.lead.parentPhone || workspace.lead.parentName}. Lead remains in New Leads until discovery conversation starts.`,
      actor,
      stage: "inquiry",
    });
  }

  if (params.recordContactAttempt && params.recordContactAttempt.trim()) {
    callAttempts.unshift({
      id: `att_${Date.now()}_inq`,
      timestamp: nowIso,
      outcome: "call_logged",
      outcomeLabel: "Contact attempt recorded",
      note: params.recordContactAttempt.trim(),
      actorName: actor,
    });
    history.unshift({
      id: `hist_${Date.now()}_att`,
      timestamp: nowIso,
      type: "call",
      title: "Contact Attempt Recorded",
      summary: params.recordContactAttempt.trim(),
      actor,
      stage: nextStage,
    });
  }

  if (params.progressDirectlyToDecision) {
    nextStage = "decision";
    progressedDirectlyToDecision = true;
    nextActionObj = {
      label: "Prepare offer",
      dueDate: nowIso,
      type: "record_decision",
    };
    history.unshift({
      id: `hist_${Date.now()}_direct_dec`,
      timestamp: nowIso,
      type: "decision",
      title: "Progressed Directly to Decision",
      summary:
        params.directToDecisionNote?.trim() ||
        "Discovery call bypassed by advocate; progressed directly to Decision stage.",
      actor,
      stage: "decision",
    });
    await db.updateLead(params.leadId, params.ownerId, {
      status: "Discovery Completed",
    });
  }

  const updatedBlob = serializeDiscoveryPricingBlob(dCall?.pricingNotes, {
    stage: nextStage,
    concerns: newConcerns,
    desiredOutcome: newDesired,
    preferredContactMethod:
      params.parent?.preferredContactMethod ?? journey.preferredContactMethod,
    availability: params.parent?.availability ?? journey.availability,
    timeZone: params.timeZone ?? journey.timeZone ?? "Eastern",
    assignedAdvocate: params.assignedAdvocate ?? journey.assignedAdvocate ?? "Byron Honea",
    schedulingLinkSent,
    schedulingLinkSentAt,
    progressedDirectlyToDecision,
    directToDecisionNote: params.directToDecisionNote ?? journey.directToDecisionNote,
    callAttempts,
    nextAction: nextActionObj,
    sharedHistory: history,
  });

  if (dCall) {
    const updatedFields = {
      theirStoryNotes: newConcerns || dCall.theirStoryNotes,
      status: params.progressDirectlyToDecision ? "Completed" : dCall.status,
      pricingNotes: updatedBlob,
    };
    await dbConn
      .update(discoveryCalls)
      .set(updatedFields)
      .where(eq(discoveryCalls.id, dCall.id));
    inMemoryDiscoveryCalls.set(params.leadId, { ...dCall, ...updatedFields });
  }

  const parentFullName = params.parent
    ? `${params.parent.firstName || workspace.parentContact?.firstName || ""} ${
        params.parent.lastName || workspace.parentContact?.lastName || ""
      }`.trim()
    : workspace.lead.parentName;

  const studentNamesStr = params.students
    ? params.students
        .filter((s) => s.firstName?.trim())
        .map((s) => `${s.firstName.trim()} ${(s.lastName || "").trim()}`.trim())
        .join(", ")
    : workspace.lead.studentName;

  await db.updateLead(params.leadId, params.ownerId, {
    parentName: parentFullName || undefined,
    parentPhone: params.parent?.phone ?? workspace.lead.parentPhone,
    studentName: studentNamesStr || undefined,
    studentGrade: params.students?.[0]?.gradeLevel ?? workspace.lead.studentGrade,
  });

  return await getHydratedLeadWorkspace(params.leadId, params.ownerId);
}

/**
 * Schedules or reschedules a Discovery Call using the existing appointment system and links it to the lead.
 * Booking an appointment does NOT move a lead into Discovery — the lead remains in New Leads (`inquiry`)
 * until staff explicitly starts the discovery conversation.
 * Reuses existing appointment record for this lead when rescheduling to prevent duplicate appointments.
 */
export async function scheduleLeadDiscovery(params: {
  ownerId: number;
  leadId: number;
  startTime: Date;
  durationMinutes?: number;
  assignedAdvocateName?: string;
  timeZone?: string;
  notes?: string;
  actorName?: string;
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");

  const workspace = await getHydratedLeadWorkspace(params.leadId, params.ownerId);
  if (!workspace) throw new Error("Lead not found");

  const duration = params.durationMinutes || 30;
  const endTime = new Date(params.startTime.getTime() + duration * 60 * 1000);
  const parentId = workspace.parentContact?.id || workspace.lead.contactId || undefined;
  const studentId = workspace.students[0]?.id || undefined;
  const studentNames = workspace.students.map((s: any) => `${s.firstName} ${s.lastName}`.trim()).join(", ");
  const dCall = workspace.discoveryCall;
  const { journey } = parseDiscoveryPricingBlob(dCall?.pricingNotes);
  const resolvedTz = params.timeZone || journey.timeZone || "Eastern";

  const aptPayload = {
    clientId: studentId || parentId,
    parentContactId: parentId,
    leadId: params.leadId,
    discoveryCallId: workspace.discoveryCall?.id,
    title: `Discovery Call — ${workspace.lead.parentName || "Family"}`,
    description:
      params.notes ||
      `Discovery consultation for ${studentNames || "Student"}. Concerns: ${workspace.journey.concerns || "See lead workspace"}`,
    startTime: params.startTime,
    endTime,
    meetingType: "Discovery Call",
    parentName: workspace.lead.parentName,
    parentPhone: workspace.lead.parentPhone,
    studentName: studentNames || workspace.lead.studentName,
    assignedAdvocateName: params.assignedAdvocateName || params.actorName || "Byron Honea",
    clientTimeZone: resolvedTz,
    status: "Scheduled" as const,
  };

  // Check if an existing discovery appointment already exists for this lead so we update instead of duplicating
  const existingApt =
    workspace.appointments?.find(
      (a: any) =>
        (a.leadId && Number(a.leadId) === Number(params.leadId)) ||
        (dCall?.appointmentId && Number(a.id) === Number(dCall.appointmentId)) ||
        String(a.meetingType || a.title || "").toLowerCase().includes("discovery")
    ) || null;

  let appointmentId: number;
  if (existingApt?.id) {
    appointmentId = Number(existingApt.id);
    try {
      await db.updateAppointment(appointmentId, params.ownerId, aptPayload as any);
    } catch {}
    inMemoryLeadAppointments.set(appointmentId, {
      ...existingApt,
      id: appointmentId,
      ownerId: params.ownerId,
      ...aptPayload,
    });
  } else {
    const aptRes = await db.createAppointment(aptPayload as any, params.ownerId);
    appointmentId = extractInsertId(aptRes) || Date.now();
    inMemoryLeadAppointments.set(appointmentId, {
      id: appointmentId,
      ownerId: params.ownerId,
      ...aptPayload,
    });
  }

  // Reconcile obsolete booking reminders
  const studentIds = workspace.students.map((s: any) => s.id).filter(Boolean);
  const reconciled = await reconcileLeadAutomationsAndTasks({
    parentContactId: parentId,
    studentContactIds: studentIds,
    leadId: params.leadId,
    transitionReason: "discovery_booked",
  });

  const nowIso = new Date().toISOString();
  const formattedTime = params.startTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Preserve stage: booking an appointment does NOT move a lead into Discovery!
  const preservedStage: LeadStage = workspace.journey.hasStartedDiscovery
    ? "discovery"
    : "inquiry";

  const history: SharedHistoryEntry[] = [
    {
      id: `hist_${Date.now()}_sched`,
      timestamp: nowIso,
      type: "discovery",
      title: existingApt ? "Discovery Call Rescheduled" : "Discovery Call Scheduled",
      summary: `Scheduled for ${formattedTime} (${resolvedTz})${params.notes ? ` · ${params.notes}` : ""}`,
      actor: params.actorName || "Waypoint Staff",
      stage: preservedStage,
      outcome: "scheduled",
    },
    ...(journey.sharedHistory || []),
  ];

  const reconciledEvents = [
    {
      timestamp: nowIso,
      reason: reconciled.summary,
      canceledRuns: reconciled.canceledRuns,
      canceledJobs: reconciled.canceledJobs,
      canceledTasks: reconciled.canceledTasks,
    },
    ...(journey.reconciledEvents || []),
  ];

  const updatedBlob = serializeDiscoveryPricingBlob(dCall?.pricingNotes, {
    stage: preservedStage,
    isClosed: false,
    discoveryState: workspace.journey.hasStartedDiscovery ? "in_progress" : "scheduled",
    discoveryOutcome: "pending",
    appointmentStatus: "scheduled",
    timeZone: resolvedTz,
    assignedAdvocate:
      params.assignedAdvocateName || journey.assignedAdvocate || "Byron Honea",
    nextAction: {
      label: workspace.journey.hasStartedDiscovery ? "Resume discovery" : "Start discovery",
      dueDate: params.startTime.toISOString(),
      type: "conduct_discovery",
    },
    sharedHistory: history,
    reconciledEvents,
  });

  if (dCall) {
    const updatedFields = {
      scheduledAt: params.startTime,
      appointmentId: appointmentId || dCall.appointmentId,
      status: workspace.journey.hasStartedDiscovery ? "In Progress" : "Preparing",
      pricingNotes: updatedBlob,
    };
    await dbConn
      .update(discoveryCalls)
      .set(updatedFields)
      .where(eq(discoveryCalls.id, dCall.id));
    inMemoryDiscoveryCalls.set(params.leadId, { ...dCall, ...updatedFields });
  }

  await db.updateLead(params.leadId, params.ownerId, {
    discoveryCallDate: params.startTime,
  });

  if (parentId) {
    await db.updateContactById(parentId, {
      currentPrimaryAction: `Start discovery (${formattedTime})`,
      currentActionDueDate: params.startTime,
    });
  }

  return await getHydratedLeadWorkspace(params.leadId, params.ownerId);
}

/**
 * Starts a live Discovery session immediately (`Start Discovery Now` or `Start Discovery`).
 * This is the ONLY action that transitions a lead from New Leads (`inquiry`) into `Discovery` (`discovery`).
 */
export async function startLeadDiscoveryNow(params: {
  ownerId: number;
  leadId: number;
  actorName?: string;
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");

  const workspace = await getHydratedLeadWorkspace(params.leadId, params.ownerId);
  if (!workspace) throw new Error("Lead not found");

  const dCall = workspace.discoveryCall;
  const { journey } = parseDiscoveryPricingBlob(dCall?.pricingNotes);
  const nowIso = new Date().toISOString();
  const isResuming = Boolean(journey.discoveryStartedAt || workspace.journey.hasStartedDiscovery);

  const history: SharedHistoryEntry[] = [
    {
      id: `hist_${Date.now()}_start`,
      timestamp: nowIso,
      type: "discovery",
      title: isResuming ? "Discovery Session Resumed" : "Discovery Session Started",
      summary: isResuming
        ? "Resumed live discovery conversation with saved progress."
        : "Live discovery conversation started.",
      actor: params.actorName || "Waypoint Staff",
      stage: "discovery",
      outcome: "in_progress",
    },
    ...(journey.sharedHistory || []),
  ];

  const updatedBlob = serializeDiscoveryPricingBlob(dCall?.pricingNotes, {
    stage: "discovery",
    isClosed: false,
    discoveryState: "in_progress",
    discoveryOutcome: "pending",
    discoveryStartedAt: journey.discoveryStartedAt || nowIso,
    nextAction: {
      label: "Resume discovery",
      dueDate: nowIso,
      type: "complete_discovery",
    },
    sharedHistory: history,
  });

  if (dCall) {
    const updatedFields = {
      status: "In Progress",
      pricingNotes: updatedBlob,
    };
    await dbConn
      .update(discoveryCalls)
      .set(updatedFields)
      .where(eq(discoveryCalls.id, dCall.id));
    inMemoryDiscoveryCalls.set(params.leadId, { ...dCall, ...updatedFields });
  }

  return await getHydratedLeadWorkspace(params.leadId, params.ownerId);
}

/**
 * Records the outcome of a Discovery Call attempt (`completed`, `no_answer`, `reschedule_needed`, `cancelled`, or early `declined`).
 * - Stores every call attempt in `callAttempts` without overwriting prior attempts.
 * - `completed` transitions the lead to `decision`.
 * - `no_answer`, `reschedule_needed`, and `cancelled` keep the lead in `discovery` and set the next action.
 * - `declined` closes the lead intentionally with a recorded reason.
 */
export async function completeLeadDiscovery(params: {
  ownerId: number;
  leadId: number;
  outcome:
    | "completed"
    | "no_answer"
    | "reschedule_needed"
    | "follow_up_later"
    | "cancelled"
    | "declined";
  note?: string;
  nextActionLabel?: string;
  nextActionDate?: Date | null;
  rescheduleStartTime?: Date | null;
  declineReason?: string;
  theirStoryNotes?: string;
  howItWorksNotes?: string;
  additionalNotes?: string;
  questionNotes?: Record<string, string>;
  actorName?: string;
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");

  const workspace = await getHydratedLeadWorkspace(params.leadId, params.ownerId);
  if (!workspace) throw new Error("Lead not found");

  if (params.outcome === "declined" && !(params.declineReason || params.note || "").trim()) {
    throw new Error("A reason is required when closing a lead because the family declined.");
  }

  const dCall = workspace.discoveryCall;
  const { journey } = parseDiscoveryPricingBlob(dCall?.pricingNotes);
  const now = new Date();
  const nowIso = now.toISOString();
  const parentId = workspace.parentContact?.id || workspace.lead.contactId || undefined;
  const studentIds = workspace.students.map((s: any) => s.id).filter(Boolean);

  const outcomeLabels: Record<string, string> = {
    completed: "Completed",
    no_answer: "No answer",
    reschedule_needed: "Reschedule needed",
    follow_up_later: "Follow up later",
    cancelled: "Canceled",
    declined: "Not proceeding",
  };

  // Append non-destructively to callAttempts
  const newAttempt: CallAttemptRecord = {
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    outcome: params.outcome,
    outcomeLabel: outcomeLabels[params.outcome] || params.outcome,
    note: params.note || params.declineReason || undefined,
    nextAction: params.nextActionLabel,
    nextActionDate: params.nextActionDate ? params.nextActionDate.toISOString() : null,
    actorName: params.actorName || "Lead Special Education Advocate",
    appointmentId: dCall?.appointmentId || null,
  };

  const updatedAttempts = [newAttempt, ...(journey.callAttempts || [])];

  let nextStage: LeadStage = "discovery";
  let isClosed = false;
  let closedStage: LeadStage | undefined = undefined;
  let dState = journey.discoveryState || "unscheduled";
  let nextActionObj = journey.nextAction;
  let leadDbStatus = workspace.lead.status;
  let callDbStatus: "Preparing" | "In Progress" | "Completed" | "Lost" = "Preparing";
  const reconciledEvents = [...(journey.reconciledEvents || [])];

  if (params.outcome === "completed") {
    nextStage = "decision";
    dState = "completed";
    leadDbStatus = "Discovery Completed";
    callDbStatus = "Completed";
    nextActionObj = {
      label: "Record family decision",
      dueDate: nowIso,
      type: "record_decision",
    };

    const rec = await reconcileLeadAutomationsAndTasks({
      parentContactId: parentId,
      studentContactIds: studentIds,
      leadId: params.leadId,
      transitionReason: "discovery_completed",
    });
    reconciledEvents.unshift({
      timestamp: nowIso,
      reason: rec.summary,
      canceledRuns: rec.canceledRuns,
      canceledJobs: rec.canceledJobs,
      canceledTasks: rec.canceledTasks,
    });
  } else if (params.outcome === "declined") {
    nextStage = "discovery";
    isClosed = true;
    closedStage = "discovery";
    dState = "completed";
    leadDbStatus = "Lost";
    callDbStatus = "Lost";
    nextActionObj = {
      label: "Closed — No pending outreach",
      dueDate: null,
      type: "closed",
    };

    const rec = await reconcileLeadAutomationsAndTasks({
      parentContactId: parentId,
      studentContactIds: studentIds,
      leadId: params.leadId,
      transitionReason: "lead_closed",
    });
    reconciledEvents.unshift({
      timestamp: nowIso,
      reason: rec.summary,
      canceledRuns: rec.canceledRuns,
      canceledJobs: rec.canceledJobs,
      canceledTasks: rec.canceledTasks,
    });
  } else {
    // Non-terminal outcomes: "no_answer" | "reschedule_needed" | "cancelled"
    // If discovery conversation was never started, stay in New Leads (`inquiry`); otherwise stay in `discovery`.
    nextStage = workspace.journey.hasStartedDiscovery ? "discovery" : "inquiry";
    isClosed = false;
    callDbStatus = workspace.journey.hasStartedDiscovery ? "In Progress" : "Preparing";

    const existingApt =
      workspace.appointments?.find(
        (a: any) =>
          (a.leadId && Number(a.leadId) === Number(params.leadId)) ||
          (dCall?.appointmentId && Number(a.id) === Number(dCall.appointmentId)) ||
          String(a.meetingType || a.title || "").toLowerCase().includes("discovery")
      ) || null;

    if (params.rescheduleStartTime) {
      dState = "scheduled";
      const formatted = params.rescheduleStartTime.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      nextActionObj = {
        label: params.nextActionLabel || "Start discovery",
        dueDate: params.rescheduleStartTime.toISOString(),
        type: "conduct_discovery",
      };

      const reschedPayload = {
        clientId: studentIds[0] || parentId,
        parentContactId: parentId,
        leadId: params.leadId,
        discoveryCallId: dCall?.id,
        title: `Discovery Call (Rescheduled) — ${workspace.lead.parentName || "Family"}`,
        description: params.note || "Rescheduled discovery consultation",
        startTime: params.rescheduleStartTime,
        endTime: new Date(params.rescheduleStartTime.getTime() + 30 * 60 * 1000),
        meetingType: "Discovery Call",
        parentName: workspace.lead.parentName,
        parentPhone: workspace.lead.parentPhone,
        status: "Scheduled" as const,
      };
      if (existingApt?.id) {
        const rAptId = Number(existingApt.id);
        try {
          await db.updateAppointment(rAptId, params.ownerId, reschedPayload as any);
        } catch {}
        inMemoryLeadAppointments.set(rAptId, {
          ...existingApt,
          id: rAptId,
          ownerId: params.ownerId,
          ...reschedPayload,
        });
      } else {
        const rApt = await db.createAppointment(reschedPayload, params.ownerId);
        const rAptId = extractInsertId(rApt) || Date.now();
        inMemoryLeadAppointments.set(rAptId, {
          id: rAptId,
          ownerId: params.ownerId,
          ...reschedPayload,
        });
      }
      await db.updateLead(params.leadId, params.ownerId, {
        discoveryCallDate: params.rescheduleStartTime,
      });
    } else {
      dState = "unscheduled";
      if (existingApt?.id) {
        const rAptId = Number(existingApt.id);
        const cancelStatus = params.outcome === "cancelled" ? "Cancelled" : "No-Show";
        try {
          await db.updateAppointment(rAptId, params.ownerId, { status: cancelStatus } as any);
        } catch {}
        inMemoryLeadAppointments.set(rAptId, {
          ...existingApt,
          id: rAptId,
          status: cancelStatus,
        });
      }
      const tomorrow = new Date(now.getTime() + 86400000);
      const defaultDate = params.nextActionDate || tomorrow;
      const defaultLabel = "Reschedule discovery";
      nextActionObj = {
        label: params.nextActionLabel || defaultLabel,
        dueDate: defaultDate.toISOString(),
        type: "retry_discovery",
      };
    }
  }

  const history: SharedHistoryEntry[] = [
    {
      id: `hist_${Date.now()}_disc`,
      timestamp: nowIso,
      type: "discovery",
      title: `Discovery Outcome: ${outcomeLabels[params.outcome]}`,
      summary: [
        params.note || params.declineReason || null,
        nextActionObj?.label ? `Next: ${nextActionObj.label}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      actor: params.actorName || "Lead Special Education Advocate",
      stage: nextStage,
      outcome: params.outcome,
    },
    ...(journey.sharedHistory || []),
  ];

  const updatedBlob = serializeDiscoveryPricingBlob(dCall?.pricingNotes, {
    stage: nextStage,
    isClosed,
    closedStage,
    discoveryState: dState,
    discoveryOutcome: params.rescheduleStartTime ? "pending" : params.outcome,
    appointmentStatus:
      params.outcome === "completed" || params.outcome === "declined"
        ? journey.appointmentStatus
        : params.rescheduleStartTime
        ? "scheduled"
        : params.outcome === "cancelled"
        ? "cancelled"
        : "missed",
    callAttempts: updatedAttempts,
    ...(params.outcome === "declined"
      ? {
          decision: {
            choice: "not_proceeding",
            closedReason: params.declineReason || params.note || "Declined during discovery",
            closedNote: params.note,
            closedAt: nowIso,
            savedAt: nowIso,
            savedBy: params.actorName || "Lead Special Education Advocate",
          },
        }
      : {}),
    nextAction: nextActionObj,
    sharedHistory: history,
    reconciledEvents,
  });

  if (dCall) {
    const updatedFields = {
      status: callDbStatus,
      completedAt: params.outcome === "completed" ? now : dCall.completedAt,
      scheduledAt: params.rescheduleStartTime || dCall.scheduledAt,
      theirStoryNotes: params.theirStoryNotes ?? dCall.theirStoryNotes,
      howItWorksNotes: params.howItWorksNotes ?? dCall.howItWorksNotes,
      additionalNotes: params.additionalNotes ?? dCall.additionalNotes,
      questionNotes: params.questionNotes
        ? JSON.stringify(params.questionNotes)
        : dCall.questionNotes,
      closingResponse: outcomeLabels[params.outcome],
      pricingNotes: updatedBlob,
    };
    await dbConn
      .update(discoveryCalls)
      .set(updatedFields)
      .where(eq(discoveryCalls.id, dCall.id));
    inMemoryDiscoveryCalls.set(params.leadId, { ...dCall, ...updatedFields });
  }

  await db.updateLead(params.leadId, params.ownerId, {
    status: leadDbStatus,
  });

  if (parentId && nextActionObj) {
    await db.updateContactById(parentId, {
      currentPrimaryAction: nextActionObj.label,
      currentActionDueDate: nextActionObj.dueDate ? new Date(nextActionObj.dueDate) : null,
    });
  }

  return await getHydratedLeadWorkspace(params.leadId, params.ownerId);
}

/**
 * Manages the family's Decision in the Decision Unit (`PG-003-DEC`):
 * - `ready_to_start`: Approves enrollment & selects service plan, moves lead to `onboarding`.
 * - `needs_time`: Keeps lead in `decision` with `Needs time` status, saves follow-up date & optional sequence.
 * - `another_conversation`: Keeps original discovery notes attached, schedules or plans second conversation.
 * - `not_proceeding`: Closes lead with reason, cancels pending outreach, preserves history for later reopen.
 */
export async function saveLeadDecision(params: {
  ownerId: number;
  leadId: number;
  choice:
    | "considering"
    | "ready_to_start"
    | "ready_to_proceed"
    | "needs_time"
    | "another_conversation"
    | "not_proceeding"
    | "declined";
  // Ready to start / proceed fields
  selectedPlanKey?: string;
  enrollmentMode?: "standard" | "custom";
  customPlanName?: string;
  customMonthlyPrice?: number;
  paymentStructure?: "monthly_autopay" | "pay_in_full";
  billingArrangement?: "autopay" | "manual_invoice";
  manualInvoiceDueDate?: string;
  manualInvoiceReason?: string;
  // Needs time fields
  reason?: string;
  followUpDate?: Date | null;
  followUpSequenceId?: number | null;
  note?: string;
  // Another conversation fields
  conversationPurpose?: string;
  conversationScheduledAt?: Date | null;
  nextContactAction?: string;
  nextContactDate?: Date | null;
  // Not proceeding fields
  closedReason?: string;
  assignedStaff?: string;
  actorName?: string;
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");

  const workspace = await getHydratedLeadWorkspace(params.leadId, params.ownerId);
  if (!workspace) throw new Error("Lead not found");

  const dCall = workspace.discoveryCall;
  const { journey } = parseDiscoveryPricingBlob(dCall?.pricingNotes);
  const now = new Date();
  const nowIso = now.toISOString();
  const parentId = workspace.parentContact?.id || workspace.lead.contactId || 0;
  const studentIds = workspace.students.map((s: any) => s.id).filter(Boolean);
  const actor = params.actorName || "Lead Special Education Advocate";

  // Always reconcile previous decision reminders/tasks first so old follow-ups do not continue!
  const reconciledEvents = [...(journey.reconciledEvents || [])];
  const baseRec = await reconcileLeadAutomationsAndTasks({
    parentContactId: parentId,
    studentContactIds: studentIds,
    leadId: params.leadId,
    transitionReason:
      params.choice === "ready_to_start"
        ? "onboarding_started"
        : params.choice === "not_proceeding"
        ? "lead_closed"
        : "decision_updated",
  });
  reconciledEvents.unshift({
    timestamp: nowIso,
    reason: baseRec.summary,
    canceledRuns: baseRec.canceledRuns,
    canceledJobs: baseRec.canceledJobs,
    canceledTasks: baseRec.canceledTasks,
  });

  let nextStage: LeadStage = "decision";
  let isClosed = false;
  let closedStage: LeadStage | undefined = undefined;
  let leadDbStatus = workspace.lead.status;
  let nextActionObj = journey.nextAction;
  const enrolledSequenceKeys = new Set<string>(journey.enrolledSequenceKeys || []);

  const decisionRecord: DecisionDetailsRecord = {
    choice: params.choice,
    savedAt: nowIso,
    savedBy: actor,
    assignedStaff: params.assignedStaff || actor,
  };

  let offerPreparedFlag = journey.offerPrepared;

  if (params.choice === "considering" || params.choice === "ready_to_proceed") {
    const planKey =
      params.selectedPlanKey || journey.decision?.selectedPlanKey || "anchor";
    decisionRecord.selectedPlanKey = planKey;
    decisionRecord.note = params.note;
    decisionRecord.followUpDate = params.followUpDate
      ? params.followUpDate.toISOString()
      : journey.decision?.followUpDate || null;
    nextStage = "decision";
    leadDbStatus = "Discovery Completed";

    if (params.selectedPlanKey || params.choice === "ready_to_proceed") {
      offerPreparedFlag = true;
      const planLabelMap: Record<string, { name: string; price: number }> = {
        anchor: { name: "Anchor", price: 105 },
        compass: { name: "Compass", price: 165 },
        horizon: { name: "Horizon", price: 265 },
        family: { name: "Family Plan", price: 225 },
        custom_offer: {
          name: params.customPlanName || "Custom Advocacy Plan",
          price: params.customMonthlyPrice || 150,
        },
      };
      const fallbackPlan = planLabelMap[planKey] || { name: "Anchor", price: 105 };
      decisionRecord.selectedPlanName = fallbackPlan.name;
      decisionRecord.selectedPlanPrice = fallbackPlan.price;

      if (parentId) {
        let preparedOffer: any = workspace.enrollment.activeOffer;
        try {
          if (!preparedOffer) {
            preparedOffer = await approveFamilyEnrollment({
              parentContactId: parentId,
              studentContactId: studentIds[0] || undefined,
              leadId: params.leadId,
              enrollmentMode: params.enrollmentMode || "standard",
              billingArrangement: params.billingArrangement || "autopay",
              overrideDiscovery: true,
              overrideReason: "Offer prepared in Lead Center Decision",
              approverId: params.ownerId,
              approverName: actor,
            });
          }
          const planRes = await selectFamilyEnrollmentPlan({
            offerId: preparedOffer.id,
            planKey,
            paymentStructure: params.paymentStructure || "monthly_autopay",
            parentContactId: parentId,
            approverName: actor,
          });
          preparedOffer = planRes.offer;
        } catch {
          const memId = preparedOffer?.id || Date.now();
          preparedOffer = {
            ...(preparedOffer || {}),
            id: memId,
            parentContactId: parentId,
            studentContactId: studentIds[0] || null,
            leadId: params.leadId,
            enrollmentMode: params.enrollmentMode || "standard",
            billingArrangement: params.billingArrangement || "autopay",
            selectedPlanKey: planKey,
            selectedPlanName: fallbackPlan.name,
            selectedPlanPrice: String(fallbackPlan.price),
            paymentStructure: params.paymentStructure || "monthly_autopay",
            agreementId: preparedOffer?.agreementId || memId + 1,
            agreementStatus: preparedOffer?.agreementStatus || "pending",
            paymentStatus: preparedOffer?.paymentStatus || "unpaid",
            status: "agreement_pending",
          };
        }
        inMemoryLeadOffers.set(parentId, preparedOffer);
      }
    }

    nextActionObj = {
      label:
        params.choice === "ready_to_proceed"
          ? offerPreparedFlag
            ? "Send offer"
            : "Prepare offer"
          : params.followUpDate
          ? `Follow up ${params.followUpDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}`
          : "Prepare offer",
      dueDate: decisionRecord.followUpDate || nowIso,
      type: "decision_considering",
    };
  } else if (params.choice === "ready_to_start") {
    if (!parentId) {
      throw new Error("A valid Parent Contact record is required to start onboarding.");
    }

    const planKey =
      params.selectedPlanKey ||
      (params.enrollmentMode === "custom" ? "custom_offer" : "anchor");
    const planLabelMap: Record<string, { name: string; price: number }> = {
      anchor: { name: "Anchor", price: 105 },
      compass: { name: "Compass", price: 165 },
      horizon: { name: "Horizon", price: 265 },
      custom_offer: {
        name: params.customPlanName || "Custom Advocacy Plan",
        price: params.customMonthlyPrice || 150,
      },
    };
    const fallbackPlan = planLabelMap[planKey] || planLabelMap.anchor;

    let selectedPlanName = fallbackPlan.name;
    let selectedPlanPrice = fallbackPlan.price;
    let resolvedOffer: any = null;

    try {
      // Use existing familyEnrollment service to approve and select plan
      const offer = await approveFamilyEnrollment({
        parentContactId: parentId,
        studentContactId: studentIds[0] || undefined,
        leadId: params.leadId,
        enrollmentMode: params.enrollmentMode || "standard",
        customPlanKey: params.enrollmentMode === "custom" ? "custom_offer" : undefined,
        customPlanName: params.customPlanName,
        customMonthlyPrice: params.customMonthlyPrice,
        billingArrangement: params.billingArrangement || "autopay",
        manualInvoiceDueDate: params.manualInvoiceDueDate,
        manualInvoiceReason:
          params.billingArrangement === "manual_invoice"
            ? params.manualInvoiceReason || "Authorized during Lead Center Decision"
            : undefined,
        overrideDiscovery: true,
        overrideReason: "Discovery completed in Lead Center workspace",
        approverId: params.ownerId,
        approverName: actor,
        internalNotes: params.note,
      });

      const planResult = await selectFamilyEnrollmentPlan({
        offerId: offer.id,
        planKey,
        paymentStructure: params.paymentStructure || "monthly_autopay",
        parentContactId: parentId,
        approverName: actor,
      });
      resolvedOffer = planResult.offer;
      selectedPlanName = planResult.offer.selectedPlanName || fallbackPlan.name;
      selectedPlanPrice = Number(planResult.offer.selectedPlanPrice || fallbackPlan.price);
    } catch {
      const memId = Date.now();
      resolvedOffer = {
        id: memId,
        parentContactId: parentId,
        studentContactId: studentIds[0] || null,
        leadId: params.leadId,
        enrollmentMode: params.enrollmentMode || "standard",
        billingArrangement: params.billingArrangement || "autopay",
        selectedPlanKey: planKey,
        selectedPlanName,
        selectedPlanPrice: String(selectedPlanPrice),
        paymentStructure: params.paymentStructure || "monthly_autopay",
        agreementId: memId + 1,
        agreementStatus: "pending",
        paymentStatus: "unpaid",
        status: "agreement_pending",
      };
    }

    if (parentId && resolvedOffer) {
      inMemoryLeadOffers.set(parentId, resolvedOffer);
    }

    decisionRecord.selectedPlanKey = planKey;
    decisionRecord.selectedPlanName = selectedPlanName;
    decisionRecord.selectedPlanPrice = selectedPlanPrice;
    decisionRecord.paymentStructure = params.paymentStructure || "monthly_autopay";
    decisionRecord.billingArrangement = params.billingArrangement || "autopay";
    decisionRecord.note = params.note;

    nextStage = "onboarding";
    leadDbStatus = "Approved for Enrollment";
    nextActionObj = {
      label: "Complete agreement & initial payment",
      dueDate: nowIso,
      type: "onboarding",
    };
  } else if (params.choice === "needs_time") {
    // Validate required info if an active follow-up sequence is selected
    let sequenceName: string | null = null;
    if (params.followUpSequenceId) {
      if (!params.followUpDate) {
        throw new Error(
          "A follow-up date is required when enrolling the family in an active follow-up sequence."
        );
      }
      if (!workspace.lead.parentEmail && !workspace.lead.parentPhone) {
        throw new Error(
          "A valid email address or phone number is required to schedule an outbound follow-up sequence."
        );
      }

      const autos = await listAutomations();
      const matchedAuto = autos.find((a) => a.id === params.followUpSequenceId);
      sequenceName = matchedAuto?.name || `Follow-up Sequence #${params.followUpSequenceId}`;

      // Prevent duplicate enrollment for the same sequence + date
      const seqDedupKey = `seq_${params.followUpSequenceId}_${params.followUpDate.toISOString().slice(0, 10)}`;
      if (!enrolledSequenceKeys.has(seqDedupKey) && matchedAuto) {
        enrolledSequenceKeys.add(seqDedupKey);
        try {
          // Run in dryRun/preview-safe mode so no real external emails are sent during implementation/testing
          await triggerSpecificAutomation(
            matchedAuto.id,
            studentIds[0] || parentId,
            true,
            {
              eventKey: seqDedupKey,
              eventDate: params.followUpDate,
              actorName: actor,
            }
          );
        } catch {}
      }
    }

    decisionRecord.reason = params.reason || "Family requested time to review";
    decisionRecord.followUpDate = params.followUpDate ? params.followUpDate.toISOString() : null;
    decisionRecord.followUpSequenceId = params.followUpSequenceId || null;
    decisionRecord.followUpSequenceName = sequenceName;
    decisionRecord.followUpChannel = workspace.lead.parentEmail ? "Email" : "Phone";
    decisionRecord.followUpRecipient =
      workspace.lead.parentEmail || workspace.lead.parentPhone || workspace.lead.parentName;
    decisionRecord.note = params.note;

    nextStage = "decision";
    leadDbStatus = "14 Day Follow-up";

    if (params.followUpDate) {
      const formatted = params.followUpDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      nextActionObj = {
        label: `Follow up ${formatted}`,
        dueDate: params.followUpDate.toISOString(),
        type: "follow_up",
      };
    } else {
      nextActionObj = {
        label: "Unscheduled · Awaiting family outreach",
        dueDate: null,
        type: "unscheduled_decision",
      };
    }
  } else if (params.choice === "another_conversation") {
    let convAptId: number | null = null;
    if (params.conversationScheduledAt) {
      const convAptPayload = {
        clientId: studentIds[0] || parentId,
        parentContactId: parentId,
        leadId: params.leadId,
        discoveryCallId: dCall?.id,
        title: `Follow-up Conversation — ${workspace.lead.parentName || "Family"}`,
        description:
          params.conversationPurpose ||
          params.note ||
          "Second discovery/decision conversation",
        startTime: params.conversationScheduledAt,
        endTime: new Date(params.conversationScheduledAt.getTime() + 30 * 60 * 1000),
        meetingType: "Discovery Call",
        parentName: workspace.lead.parentName,
        parentPhone: workspace.lead.parentPhone,
        status: "Scheduled" as const,
      };
      const aptRes = await db.createAppointment(convAptPayload, params.ownerId);
      convAptId = extractInsertId(aptRes) || Date.now();
      inMemoryLeadAppointments.set(convAptId, {
        id: convAptId,
        ownerId: params.ownerId,
        ...convAptPayload,
      });
    }

    decisionRecord.conversationPurpose =
      params.conversationPurpose || "Second conversation requested";
    decisionRecord.conversationScheduledAt = params.conversationScheduledAt
      ? params.conversationScheduledAt.toISOString()
      : null;
    decisionRecord.conversationAppointmentId = convAptId;
    decisionRecord.nextContactAction =
      params.nextContactAction || "Call family to confirm time";
    decisionRecord.nextContactDate = params.nextContactDate
      ? params.nextContactDate.toISOString()
      : null;
    decisionRecord.note = params.note;

    nextStage = "decision";
    leadDbStatus = "Discovery Completed";

    if (params.conversationScheduledAt) {
      const formatted = params.conversationScheduledAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      nextActionObj = {
        label: `Second conversation (${formatted})`,
        dueDate: params.conversationScheduledAt.toISOString(),
        type: "second_conversation",
      };
    } else {
      nextActionObj = {
        label: decisionRecord.nextContactAction || "Schedule second conversation",
        dueDate: decisionRecord.nextContactDate || null,
        type: "schedule_conversation",
      };
    }
  } else if (params.choice === "not_proceeding" || params.choice === "declined") {
    const cReason = (params.closedReason || params.reason || "").trim();
    if (!cReason) {
      throw new Error("Please select or enter a reason before closing the lead.");
    }

    decisionRecord.choice = "not_proceeding";
    decisionRecord.closedReason = cReason;
    decisionRecord.closedNote = params.note;
    decisionRecord.closedAt = nowIso;
    decisionRecord.note = params.note;

    nextStage = "decision";
    isClosed = true;
    closedStage = "decision";
    leadDbStatus = "Lost";
    nextActionObj = {
      label: "Closed — No pending outreach",
      dueDate: null,
      type: "closed",
    };
  }

  const choiceTitleMap: Record<string, string> = {
    considering: "Decision: Considering Options",
    ready_to_proceed: "Decision: Ready to Proceed",
    ready_to_start: `Decision: Ready to Start (${decisionRecord.selectedPlanName || "Onboarding"})`,
    needs_time: `Decision: Needs Time${decisionRecord.reason ? ` (${decisionRecord.reason})` : ""}`,
    another_conversation: `Decision: Another Conversation (${decisionRecord.conversationPurpose || "Scheduled"})`,
    not_proceeding: `Decision: Declined (${decisionRecord.closedReason})`,
    declined: `Decision: Declined (${decisionRecord.closedReason})`,
  };

  const history: SharedHistoryEntry[] = [
    {
      id: `hist_${Date.now()}_dec`,
      timestamp: nowIso,
      type: "decision",
      title: choiceTitleMap[params.choice] || "Decision Updated",
      summary: [
        params.note || null,
        nextActionObj?.label ? `Next: ${nextActionObj.label}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      actor,
      stage: nextStage,
      outcome: params.choice,
    },
    ...(journey.sharedHistory || []),
  ];

  const updatedBlob = serializeDiscoveryPricingBlob(dCall?.pricingNotes, {
    stage: nextStage,
    isClosed,
    closedStage,
    decision: decisionRecord,
    offerPrepared: offerPreparedFlag,
    nextAction: nextActionObj,
    sharedHistory: history,
    reconciledEvents,
    enrolledSequenceKeys: Array.from(enrolledSequenceKeys),
  });

  if (dCall) {
    await dbConn
      .update(discoveryCalls)
      .set({
        pricingNotes: updatedBlob,
      })
      .where(eq(discoveryCalls.id, dCall.id));
    inMemoryDiscoveryCalls.set(params.leadId, { ...dCall, pricingNotes: updatedBlob });
  }

  await db.updateLead(params.leadId, params.ownerId, {
    status: leadDbStatus,
  });

  if (parentId && nextActionObj) {
    await db.updateContactById(parentId, {
      currentPrimaryAction: nextActionObj.label,
      currentActionDueDate: nextActionObj.dueDate ? new Date(nextActionObj.dueDate) : null,
    });
  }

  return await getHydratedLeadWorkspace(params.leadId, params.ownerId);
}

/**
 * Explicitly reopens a previously closed/not-proceeding lead, preserving full history.
 */
export async function reopenLeadFromClosed(params: {
  ownerId: number;
  leadId: number;
  targetStage?: "discovery" | "decision";
  note?: string;
  actorName?: string;
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");

  const workspace = await getHydratedLeadWorkspace(params.leadId, params.ownerId);
  if (!workspace) throw new Error("Lead not found");

  const dCall = workspace.discoveryCall;
  const { journey } = parseDiscoveryPricingBlob(dCall?.pricingNotes);
  const nowIso = new Date().toISOString();
  const stage: LeadStage =
    params.targetStage ||
    (journey.discoveryOutcome === "completed" ? "decision" : "discovery");

  const history: SharedHistoryEntry[] = [
    {
      id: `hist_${Date.now()}_reopen`,
      timestamp: nowIso,
      type: "decision",
      title: "Lead Reopened",
      summary: params.note || `Lead reopened to ${stage === "decision" ? "Decision" : "Discovery"} stage.`,
      actor: params.actorName || "Lead Special Education Advocate",
      stage,
    },
    ...(journey.sharedHistory || []),
  ];

  const updatedBlob = serializeDiscoveryPricingBlob(dCall?.pricingNotes, {
    stage,
    isClosed: false,
    closedStage: undefined,
    discoveryOutcome: stage === "decision" ? "completed" : "pending",
    decision: {
      ...(journey.decision || { choice: "undecided" }),
      choice: "undecided",
      reopenedAt: nowIso,
    },
    nextAction: {
      label: stage === "decision" ? "Record family decision" : "Schedule discovery call",
      dueDate: nowIso,
      type: "reopened",
    },
    sharedHistory: history,
  });

  if (dCall) {
    const updatedFields = {
      status: stage === "decision" ? "Completed" : "Preparing",
      pricingNotes: updatedBlob,
    };
    await dbConn
      .update(discoveryCalls)
      .set(updatedFields)
      .where(eq(discoveryCalls.id, dCall.id));
    inMemoryDiscoveryCalls.set(params.leadId, { ...dCall, ...updatedFields });
  }

  await db.updateLead(params.leadId, params.ownerId, {
    status: stage === "decision" ? "Discovery Completed" : "New",
  });

  return await getHydratedLeadWorkspace(params.leadId, params.ownerId);
}

/**
 * Performs connected Onboarding actions (`select_plan`, `mark_agreement_signed`, `issue_manual_invoice`, `verify_payment`)
 * using the real underlying familyEnrollment, agreements, and invoices records.
 */
export async function advanceOnboardingStep(params: {
  ownerId: number;
  leadId: number;
  action:
    | "prepare_offer"
    | "send_offer"
    | "select_plan"
    | "send_agreement"
    | "mark_agreement_signed"
    | "issue_manual_invoice"
    | "send_purchase_link"
    | "verify_payment"
    | "continue_to_onboarding";
  planKey?: string;
  paymentStructure?: "monthly_autopay" | "pay_in_full";
  signerName?: string;
  paymentReference?: string;
  recipient?: string;
  messageContent?: string;
  actorName?: string;
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");

  const workspace = await getHydratedLeadWorkspace(params.leadId, params.ownerId);
  if (!workspace) throw new Error("Lead not found");

  const parentId = workspace.parentContact?.id || workspace.lead.contactId || 0;
  const studentId = workspace.students[0]?.id || undefined;
  const actor = params.actorName || "Lead Special Education Advocate";
  const dCall = workspace.discoveryCall;
  const { journey } = parseDiscoveryPricingBlob(dCall?.pricingNotes);
  const nowIso = new Date().toISOString();
  const history: SharedHistoryEntry[] = [...(journey.sharedHistory || [])];
  const journeyPatch: Partial<typeof journey> = {};

  let activeOffer = workspace.enrollment.activeOffer;
  if (!activeOffer) {
    try {
      activeOffer = await approveFamilyEnrollment({
        parentContactId: parentId,
        studentContactId: studentId,
        leadId: params.leadId,
        enrollmentMode: "standard",
        billingArrangement: "autopay",
        overrideDiscovery: true,
        overrideReason: "Initialized in Lead Center",
        approverId: params.ownerId,
        approverName: actor,
      });
    } catch {
      const memId = Date.now();
      activeOffer = {
        id: memId,
        parentContactId: parentId,
        studentContactId: studentId || null,
        leadId: params.leadId,
        enrollmentMode: "standard",
        billingArrangement: "autopay",
        selectedPlanKey: params.planKey || "anchor",
        selectedPlanName: "Anchor",
        selectedPlanPrice: "105",
        paymentStructure: params.paymentStructure || "monthly_autopay",
        agreementId: memId + 1,
        agreementStatus: "pending",
        paymentStatus: "unpaid",
        status: "approved_pending_plan",
      };
    }
    if (parentId && activeOffer) {
      inMemoryLeadOffers.set(parentId, activeOffer);
    }
  }

  const ensureSelectedOffer = async () => {
    const planKey = params.planKey || activeOffer.selectedPlanKey || "anchor";
    const planLabelMap: Record<string, { name: string; price: string }> = {
      anchor: { name: "Anchor", price: "105" },
      compass: { name: "Compass", price: "165" },
      horizon: { name: "Horizon", price: "265" },
    };
    const fallback = planLabelMap[planKey] || planLabelMap.anchor;
    try {
      const planRes = await selectFamilyEnrollmentPlan({
        offerId: activeOffer.id,
        planKey,
        paymentStructure: params.paymentStructure || "monthly_autopay",
        parentContactId: parentId,
        approverName: actor,
      });
      activeOffer = planRes.offer;
    } catch {
      activeOffer = {
        ...activeOffer,
        selectedPlanKey: planKey,
        selectedPlanName: fallback.name,
        selectedPlanPrice: fallback.price,
        paymentStructure: params.paymentStructure || "monthly_autopay",
        agreementId: activeOffer.agreementId || Date.now() + 1,
        status: "agreement_pending",
      };
    }
    if (parentId && activeOffer) {
      inMemoryLeadOffers.set(parentId, activeOffer);
    }
  };

  if (params.action === "prepare_offer" || params.action === "select_plan") {
    await ensureSelectedOffer();
    journeyPatch.offerPrepared = true;
    journeyPatch.offerPreparedAt = nowIso;
    history.unshift({
      id: `hist_${Date.now()}_prep`,
      timestamp: nowIso,
      type: "decision",
      title: `Offer Prepared (${activeOffer.selectedPlanName || "Anchor"})`,
      summary: `Recommended plan ${activeOffer.selectedPlanName || "Anchor"} ($${activeOffer.selectedPlanPrice || 105}/mo) prepared.`,
      actor,
      stage: journey.stage || "decision",
    });
  } else if (params.action === "send_offer") {
    if (!activeOffer.selectedPlanKey) {
      await ensureSelectedOffer();
    }
    const recipient =
      params.recipient ||
      workspace.lead.parentEmail ||
      workspace.lead.parentPhone ||
      workspace.lead.parentName;
    journeyPatch.offerPrepared = true;
    journeyPatch.offerSent = true;
    journeyPatch.offerSentAt = nowIso;
    journeyPatch.offerRecipient = recipient;
    history.unshift({
      id: `hist_${Date.now()}_send_offer`,
      timestamp: nowIso,
      type: "decision",
      title: `Service Offer Sent to ${recipient}`,
      summary:
        params.messageContent ||
        `Sent ${activeOffer.selectedPlanName || "Anchor"} service offer ($${activeOffer.selectedPlanPrice || 105}/mo) to ${recipient}.`,
      actor,
      stage: journey.stage || "decision",
    });
  } else if (params.action === "send_agreement") {
    if (!activeOffer.selectedPlanKey) {
      await ensureSelectedOffer();
    }
    const recipient =
      params.recipient ||
      workspace.lead.parentEmail ||
      workspace.lead.parentPhone ||
      workspace.lead.parentName;
    journeyPatch.offerPrepared = true;
    journeyPatch.offerSent = true;
    journeyPatch.agreementSent = true;
    journeyPatch.agreementSentAt = nowIso;
    journeyPatch.agreementRecipient = recipient;
    history.unshift({
      id: `hist_${Date.now()}_send_ag`,
      timestamp: nowIso,
      type: "decision",
      title: `Service Agreement Sent to ${recipient}`,
      summary:
        params.messageContent ||
        `Sent Educational Advocacy Services Agreement (${activeOffer.selectedPlanName || "Anchor"}) for e-signature to ${recipient}. Agreement remains unsigned until executed.`,
      actor,
      stage: journey.stage || "decision",
    });
  } else if (params.action === "mark_agreement_signed") {
    if (!activeOffer.selectedPlanKey) {
      await ensureSelectedOffer();
    }
    const agId = activeOffer.agreementId || 1;
    if (activeOffer.agreementId) {
      try {
        await dbConn
          .update(agreements)
          .set({
            status: "Signed",
            signedAt: new Date(),
            contentLocked: true,
          })
          .where(eq(agreements.id, activeOffer.agreementId));
      } catch {}
    }
    try {
      await onAgreementSignedForEnrollment({
        agreementId: agId,
        clientId: parentId,
        signerName: params.signerName || workspace.lead.parentName || "Parent Signer",
      });
    } catch {}
    activeOffer = {
      ...activeOffer,
      agreementId: agId,
      agreementStatus: "signed",
      agreementSignedAt: new Date(),
      status: "payment_pending",
    };
    if (parentId) {
      inMemoryLeadOffers.set(parentId, activeOffer);
    }
    journeyPatch.offerPrepared = true;
    journeyPatch.offerSent = true;
    journeyPatch.agreementSent = true;
    history.unshift({
      id: `hist_${Date.now()}_signed`,
      timestamp: nowIso,
      type: "onboarding",
      title: "Service Agreement Signed",
      summary: `Executed by ${params.signerName || workspace.lead.parentName || "Parent Signer"}.`,
      actor,
      stage: journey.stage || "decision",
    });
  } else if (params.action === "issue_manual_invoice" || params.action === "send_purchase_link") {
    try {
      await db.updateEnrollmentOffer(activeOffer.id, {
        billingArrangement: "manual_invoice",
        manualInvoiceReason: "Issued from Lead Center",
        manualInvoiceDueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      });
      await createManualEnrollmentInvoice({
        offerId: activeOffer.id,
        parentContactId: parentId,
        staffUserId: params.ownerId,
      });
    } catch {}
    activeOffer = {
      ...activeOffer,
      billingArrangement: "manual_invoice",
      initialInvoiceId: activeOffer.initialInvoiceId || Date.now() + 2,
    };
    if (parentId) {
      inMemoryLeadOffers.set(parentId, activeOffer);
    }
    const recipient =
      params.recipient ||
      workspace.lead.parentEmail ||
      workspace.lead.parentPhone ||
      workspace.lead.parentName;
    journeyPatch.purchaseLinkSent = true;
    journeyPatch.purchaseLinkSentAt = nowIso;
    journeyPatch.purchaseLinkRecipient = recipient;
    history.unshift({
      id: `hist_${Date.now()}_purch_link`,
      timestamp: nowIso,
      type: "decision",
      title: `Purchase Link / Invoice Sent to ${recipient}`,
      summary:
        params.messageContent ||
        `Sent payment checkout link for ${activeOffer.selectedPlanName || "Anchor"} plan to ${recipient}. Payment remains unpaid until verified.`,
      actor,
      stage: journey.stage || "decision",
    });
  } else if (params.action === "verify_payment") {
    try {
      if (activeOffer.initialInvoiceId) {
        await verifyManualInvoicePayment({
          offerId: activeOffer.id,
          invoiceId: activeOffer.initialInvoiceId,
          staffUserId: params.ownerId,
          staffUserName: actor,
          paymentReference: params.paymentReference || `VERIFIED-${Date.now().toString().slice(-6)}`,
        });
      } else {
        await db.updateEnrollmentOffer(activeOffer.id, {
          paymentStatus: "paid",
          paidAt: new Date(),
        });
      }
    } catch {}
    activeOffer = {
      ...activeOffer,
      paymentStatus: "paid",
      paidAt: new Date(),
      status: "payment_pending",
    };
    if (parentId) {
      inMemoryLeadOffers.set(parentId, activeOffer);
    }
    history.unshift({
      id: `hist_${Date.now()}_paid`,
      timestamp: nowIso,
      type: "onboarding",
      title: "Initial Payment Verified",
      summary: `Payment reference: ${params.paymentReference || "Verified in billing ledger"}.`,
      actor,
      stage: journey.stage || "onboarding",
    });
  } else if (params.action === "continue_to_onboarding") {
    journeyPatch.stage = "onboarding";
    if (!journey.onboardingTransitionedAt) {
      journeyPatch.onboardingTransitionedAt = nowIso;
      history.unshift({
        id: `hist_${Date.now()}_to_onb`,
        timestamp: nowIso,
        type: "onboarding",
        title: "Progressed to Onboarding",
        summary: "Family decision & initial enrollment steps completed; transitioned into Onboarding.",
        actor,
        stage: "onboarding",
      });
    }
    await db.updateLead(params.leadId, params.ownerId, {
      status: "Approved for Enrollment",
    });
  }

  // Re-check whether both Agreement Signed AND Payment Verified are now satisfied -> auto-transition to Onboarding once
  const refreshedState = await getHydratedLeadWorkspace(params.leadId, params.ownerId);
  const isNowSigned = Boolean(
    refreshedState?.enrollment.isAgreementSigned ||
      activeOffer?.agreementStatus === "signed"
  );
  const isNowPaid = Boolean(
    refreshedState?.enrollment.isPaymentVerified ||
      activeOffer?.paymentStatus === "paid"
  );
  if (isNowSigned && isNowPaid && !journey.onboardingTransitionedAt) {
    journeyPatch.stage = "onboarding";
    journeyPatch.onboardingTransitionedAt = nowIso;
    journeyPatch.nextAction = {
      label: "Activate Client",
      dueDate: nowIso,
      type: "activate_client",
    };
    history.unshift({
      id: `hist_${Date.now()}_auto_onb`,
      timestamp: nowIso,
      type: "onboarding",
      title: "Agreement & Payment Complete · Moved to Onboarding",
      summary:
        "Both signed agreement and initial payment requirements are satisfied. Lead automatically progressed to Onboarding.",
      actor,
      stage: "onboarding",
    });
    await db.updateLead(params.leadId, params.ownerId, {
      status: "Approved for Enrollment",
    });
  }

  journeyPatch.sharedHistory = history;
  if (dCall) {
    const latestCall = await dbConn
      .select()
      .from(discoveryCalls)
      .where(eq(discoveryCalls.leadId, params.leadId))
      .limit(1);
    const memCall = inMemoryDiscoveryCalls.get(params.leadId);
    const baseNotes = memCall?.pricingNotes || latestCall[0]?.pricingNotes || dCall.pricingNotes;
    const updatedBlob = serializeDiscoveryPricingBlob(baseNotes, journeyPatch);
    await dbConn
      .update(discoveryCalls)
      .set({ pricingNotes: updatedBlob })
      .where(eq(discoveryCalls.leadId, params.leadId));
    inMemoryDiscoveryCalls.set(params.leadId, {
      ...(latestCall[0] || {}),
      ...(memCall || dCall),
      pricingNotes: updatedBlob,
    });
  }

  return await getHydratedLeadWorkspace(params.leadId, params.ownerId);
}

/**
 * Transitions the family from Onboarding into Active Client (`Activate Client`)
 * ONLY when required onboarding items (Signed Agreement + Verified Payment) are satisfied.
 * Reuses existing family and student records without duplicating student data.
 */
export async function activateClientFromLead(params: {
  ownerId: number;
  leadId: number;
  actorName?: string;
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");

  const workspace = await getHydratedLeadWorkspace(params.leadId, params.ownerId);
  if (!workspace) throw new Error("Lead not found");

  if (!workspace.enrollment.canActivate) {
    throw new Error(
      `Cannot activate client yet: ${workspace.enrollment.onboardingBlockers.join(" ")}`
    );
  }

  const activeOffer = workspace.enrollment.activeOffer;
  if (!activeOffer) {
    throw new Error("Cannot activate client: No active enrollment offer found.");
  }

  const parentId = workspace.parentContact?.id || workspace.lead.contactId || 0;
  const studentIds = workspace.students.map((s: any) => s.id).filter(Boolean);
  const nowIso = new Date().toISOString();

  // Activate membership via authoritative service if not already active
  if (activeOffer.status !== "active") {
    try {
      await activateFamilyMembership({
        offerId: activeOffer.id,
        source: `lead_center_onboarding_activated_by_${params.actorName || "staff"}`,
        verifiedByStaffId: params.ownerId,
      });
    } catch {}
    if (parentId) {
      inMemoryLeadOffers.set(parentId, {
        ...activeOffer,
        status: "active",
        activatedAt: new Date(),
      });
    }
  }

  // Reconcile/stop all lead follow-ups
  const rec = await reconcileLeadAutomationsAndTasks({
    parentContactId: parentId,
    studentContactIds: studentIds,
    leadId: params.leadId,
    transitionReason: "client_activated",
  });

  // Update Parent & Student lifecycle status to Active without duplicating any student records
  if (parentId) {
    await db.updateContactById(parentId, {
      accountStatus: "active",
      billingStatus: "active",
      contractStatus: "active",
      lifecycleStage: "Active Support",
      portalLifecycleStatus: "Active Support",
      currentPrimaryAction: "Active Client Services",
      currentActionDueDate: null,
    });
  }

  for (const sid of studentIds) {
    await db.updateContactById(sid, {
      lifecycleStage: "Active Support",
      portalLifecycleStatus: "Active Support",
    });
  }

  const dCall = workspace.discoveryCall;
  const { journey } = parseDiscoveryPricingBlob(dCall?.pricingNotes);

  const history: SharedHistoryEntry[] = [
    {
      id: `hist_${Date.now()}_act`,
      timestamp: nowIso,
      type: "onboarding",
      title: "Client Activated · Transitioned to Active Services",
      summary: `Family membership activated under ${activeOffer.selectedPlanName || "Advocacy Plan"}. All ${studentIds.length} student record(s) linked directly to Student Workspace.`,
      actor: params.actorName || "Lead Special Education Advocate",
      stage: "active",
      outcome: "active",
    },
    ...(journey.sharedHistory || []),
  ];

  const reconciledEvents = [
    {
      timestamp: nowIso,
      reason: rec.summary,
      canceledRuns: rec.canceledRuns,
      canceledJobs: rec.canceledJobs,
      canceledTasks: rec.canceledTasks,
    },
    ...(journey.reconciledEvents || []),
  ];

  const updatedBlob = serializeDiscoveryPricingBlob(dCall?.pricingNotes, {
    stage: "active",
    isClosed: false,
    nextAction: {
      label: "Open Student Workspace",
      dueDate: null,
      type: "active_client",
    },
    sharedHistory: history,
    reconciledEvents,
  });

  if (dCall) {
    const updatedFields = {
      status: "Completed",
      pricingNotes: updatedBlob,
    };
    await dbConn
      .update(discoveryCalls)
      .set(updatedFields)
      .where(eq(discoveryCalls.id, dCall.id));
    inMemoryDiscoveryCalls.set(params.leadId, { ...dCall, ...updatedFields });
  }

  await db.updateLead(params.leadId, params.ownerId, {
    status: "Won",
  });

  return await getHydratedLeadWorkspace(params.leadId, params.ownerId);
}

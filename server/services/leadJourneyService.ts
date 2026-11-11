import { eq, and, or, desc, asc, inArray } from "drizzle-orm";
import * as db from "../db";
import { getDb } from "../db/connection";
import {
  contacts,
  leads,
  projects,
  discoveryCalls,
  appointments,
  callLogs,
  internalTasks,
  agreements,
  invoices,
  familyEnrollmentOffers,
} from "../../drizzle/schema";
import {
  normalizeEmail,
  normalizePhone,
  extractInsertId,
} from "./familyIdentityService";
import {
  getFamilyEnrollmentState,
  approveFamilyEnrollment,
  selectFamilyEnrollmentPlan,
  activateFamilyMembership,
  createManualEnrollmentInvoice,
  verifyManualInvoicePayment,
  onAgreementSignedForEnrollment,
  PUBLISHED_MEMBERSHIP_PLANS,
} from "./familyEnrollmentService";
import {
  listAutomations,
  listAutomationRuns,
  listAutomationJobs,
  cancelAutomationRun,
  cancelAutomationJob,
  triggerSpecificAutomation,
} from "../db/automations";
import { recordCaseActivity } from "./caseActivityService";
import { inMemoryContacts } from "../db/contacts";

export const inMemoryDiscoveryCalls = new Map<number, any>();
export const inMemoryLeadAppointments = new Map<number, any>();
export const inMemoryLeadOffers = new Map<number, any>();

export type LeadStage = "inquiry" | "discovery" | "decision" | "onboarding" | "active";

export type DiscoveryState = "unscheduled" | "scheduled" | "in_progress" | "completed";

export type DiscoveryOutcome =
  | "pending"
  | "completed"
  | "no_answer"
  | "reschedule_needed"
  | "follow_up_later"
  | "cancelled"
  | "declined";

export type DecisionChoice =
  | "undecided"
  | "considering"
  | "ready_to_start"
  | "ready_to_proceed"
  | "needs_time"
  | "another_conversation"
  | "not_proceeding"
  | "declined";

export interface InquiryStudentItem {
  id?: number;
  firstName: string;
  lastName: string;
  gradeLevel?: string;
  schoolName?: string;
  iepOr504?: string;
  diagnosis?: string;
  challenges?: string;
  caseId?: string;
}

export interface CallAttemptRecord {
  id: string;
  timestamp: string;
  outcome: DiscoveryOutcome | "call_logged" | "scheduled" | "second_conversation";
  outcomeLabel: string;
  note?: string;
  nextAction?: string;
  nextActionDate?: string | null;
  actorName?: string;
  appointmentId?: number | null;
}

export interface DecisionDetailsRecord {
  choice: DecisionChoice;
  savedAt?: string;
  savedBy?: string;
  // Ready to start
  selectedPlanKey?: string;
  selectedPlanName?: string;
  selectedPlanPrice?: number;
  paymentStructure?: "monthly_autopay" | "pay_in_full";
  billingArrangement?: "autopay" | "manual_invoice";
  manualInvoiceDueDate?: string;
  manualInvoiceReason?: string;
  // Needs time
  reason?: string;
  followUpDate?: string | null;
  followUpSequenceId?: number | null;
  followUpSequenceName?: string | null;
  followUpChannel?: string | null;
  followUpRecipient?: string | null;
  note?: string;
  // Another conversation
  conversationPurpose?: string;
  conversationScheduledAt?: string | null;
  conversationAppointmentId?: number | null;
  nextContactAction?: string;
  nextContactDate?: string | null;
  // Not proceeding
  closedReason?: string;
  closedNote?: string;
  closedAt?: string | null;
  reopenedAt?: string | null;
  assignedStaff?: string;
}

export interface SharedHistoryEntry {
  id: string;
  timestamp: string;
  type: "inquiry" | "call" | "discovery" | "decision" | "onboarding" | "automation" | "note";
  title: string;
  summary: string;
  actor?: string;
  stage?: string;
  outcome?: string;
}

export interface PersistedLeadJourneyMeta {
  stage?: LeadStage;
  isClosed?: boolean;
  closedStage?: LeadStage;
  discoveryState?: DiscoveryState;
  discoveryOutcome?: DiscoveryOutcome;
  concerns?: string;
  desiredOutcome?: string;
  preferredContactMethod?: string;
  availability?: string;
  timeZone?: string;
  assignedAdvocate?: string;
  schedulingLinkSent?: boolean;
  schedulingLinkSentAt?: string | null;
  progressedDirectlyToDecision?: boolean;
  directToDecisionNote?: string;
  offerPrepared?: boolean;
  offerPreparedAt?: string | null;
  offerSent?: boolean;
  offerSentAt?: string | null;
  offerRecipient?: string | null;
  agreementSent?: boolean;
  agreementSentAt?: string | null;
  agreementRecipient?: string | null;
  purchaseLinkSent?: boolean;
  purchaseLinkSentAt?: string | null;
  purchaseLinkRecipient?: string | null;
  onboardingTransitionedAt?: string | null;
  portalProvisionedAt?: string | null;
  originatingCallLogId?: number | null;
  callAttempts?: CallAttemptRecord[];
  decision?: DecisionDetailsRecord;
  nextAction?: {
    label: string;
    dueDate?: string | null;
    type?: string;
  };
  sharedHistory?: SharedHistoryEntry[];
  reconciledEvents?: Array<{
    timestamp: string;
    reason: string;
    canceledRuns: number;
    canceledJobs: number;
    canceledTasks: number;
  }>;
  enrolledSequenceKeys?: string[];
}

/**
 * Safely parses the JSON stored in `discoveryCalls.pricingNotes` without losing
 * any existing fields (`studentCount`, `selectedPlan`, `notes`, etc.).
 */
export function parseDiscoveryPricingBlob(raw?: string | null): {
  rawObject: Record<string, any>;
  journey: PersistedLeadJourneyMeta;
} {
  if (!raw) {
    return { rawObject: {}, journey: {} };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        rawObject: parsed,
        journey: (parsed.leadJourney && typeof parsed.leadJourney === "object"
          ? parsed.leadJourney
          : {}) as PersistedLeadJourneyMeta,
      };
    }
  } catch {
    // Plain text fallback
    return {
      rawObject: { notes: raw },
      journey: {},
    };
  }
  return { rawObject: {}, journey: {} };
}

export function serializeDiscoveryPricingBlob(
  existingRaw: string | null | undefined,
  journeyPatch: Partial<PersistedLeadJourneyMeta>,
  extraTopLevel?: Record<string, any>
): string {
  const { rawObject, journey } = parseDiscoveryPricingBlob(existingRaw);
  const mergedJourney: PersistedLeadJourneyMeta = {
    ...journey,
    ...journeyPatch,
  };
  return JSON.stringify({
    ...rawObject,
    ...(extraTopLevel || {}),
    leadJourney: mergedJourney,
  });
}

/**
 * Reconciles pending automations and open follow-up tasks when a lead changes stage or outcome.
 * Preserves communication history and completed tasks.
 * Prevents obsolete reminders from continuing after stage changes.
 */
export async function reconcileLeadAutomationsAndTasks(params: {
  parentContactId?: number | null;
  studentContactIds?: number[];
  leadId: number;
  transitionReason:
    | "discovery_booked"
    | "discovery_completed"
    | "decision_updated"
    | "onboarding_started"
    | "lead_closed"
    | "client_activated";
  existingJourney?: PersistedLeadJourneyMeta;
}): Promise<{
  canceledRuns: number;
  canceledJobs: number;
  canceledTasks: number;
  summary: string;
}> {
  const targetContactIds = new Set<number>();
  if (params.parentContactId) targetContactIds.add(params.parentContactId);
  for (const sid of params.studentContactIds || []) {
    if (sid) targetContactIds.add(sid);
  }

  let canceledRuns = 0;
  let canceledJobs = 0;
  let canceledTasks = 0;

  const reasonLabelMap: Record<string, string> = {
    discovery_booked: "Discovery booked — obsolete booking reminders cancelled",
    discovery_completed: "Discovery completed — obsolete discovery reminders stopped",
    decision_updated: "Decision updated — prior follow-up reminders reconciled",
    onboarding_started: "Onboarding started — incompatible sales follow-ups stopped",
    lead_closed: "Lead closed — pending lead outreach cancelled",
    client_activated: "Client activated — lead follow-ups stopped",
  };
  const reasonText = reasonLabelMap[params.transitionReason] || "Stage updated — reconciled pending actions";

  // 1. Cancel matching queued automation jobs & runs for these contact IDs
  for (const cid of Array.from(targetContactIds)) {
    try {
      const queuedJobs = await listAutomationJobs({ contactId: cid, status: "queued" });
      for (const job of queuedJobs) {
        const titleLower = `${job.automationName || ""} ${job.stepTitle || ""} ${job.triggerType || ""}`.toLowerCase();
        const shouldCancel =
          params.transitionReason === "lead_closed" ||
          params.transitionReason === "client_activated" ||
          params.transitionReason === "decision_updated" ||
          (params.transitionReason === "discovery_booked" &&
            (titleLower.includes("inquiry") || titleLower.includes("book") || titleLower.includes("schedule"))) ||
          (params.transitionReason === "discovery_completed" &&
            (titleLower.includes("discovery") || titleLower.includes("reminder") || titleLower.includes("meeting_scheduled"))) ||
          (params.transitionReason === "onboarding_started" &&
            (titleLower.includes("follow") || titleLower.includes("not yet") || titleLower.includes("stay in touch") || titleLower.includes("nurture") || titleLower.includes("lead")));

        if (shouldCancel) {
          await cancelAutomationJob(job.id, reasonText);
          canceledJobs++;
        }
      }

      const queuedRuns = await listAutomationRuns({ contactId: cid, status: "queued" });
      for (const run of queuedRuns) {
        const nameLower = `${run.automationName || ""} ${run.triggerEvent || ""}`.toLowerCase();
        const shouldCancel =
          params.transitionReason === "lead_closed" ||
          params.transitionReason === "client_activated" ||
          params.transitionReason === "decision_updated" ||
          (params.transitionReason === "discovery_booked" &&
            (nameLower.includes("inquiry") || nameLower.includes("book"))) ||
          (params.transitionReason === "discovery_completed" &&
            (nameLower.includes("discovery") || nameLower.includes("meeting_scheduled"))) ||
          (params.transitionReason === "onboarding_started" &&
            (nameLower.includes("follow") || nameLower.includes("not yet") || nameLower.includes("stay in touch") || nameLower.includes("lead")));

        if (shouldCancel) {
          await cancelAutomationRun(run.id, reasonText);
          canceledRuns++;
        }
      }
    } catch (e) {
      // Non-fatal in test/offline mode
    }
  }

  // 2. Reconcile open obsolete follow-up tasks in `internal_tasks` while preserving completed tasks!
  try {
    const dbConn = await getDb();
    if (dbConn && targetContactIds.size > 0) {
      const openTasks = await dbConn
        .select()
        .from(internalTasks)
        .where(
          and(
            inArray(internalTasks.linkedStudentId, Array.from(targetContactIds)),
            inArray(internalTasks.status, ["not_started", "in_progress"])
          )
        );

      for (const task of openTasks) {
        const tLower = `${task.title || ""} ${task.description || ""}`.toLowerCase();
        const isObsolete =
          params.transitionReason === "lead_closed" ||
          params.transitionReason === "client_activated" ||
          (params.transitionReason === "discovery_booked" &&
            (tLower.includes("schedule discovery") || tLower.includes("book discovery"))) ||
          (params.transitionReason === "discovery_completed" &&
            (tLower.includes("discovery call") || tLower.includes("retry call"))) ||
          (params.transitionReason === "onboarding_started" &&
            (tLower.includes("follow up") || tLower.includes("follow-up") || tLower.includes("decision"))) ||
          (params.transitionReason === "decision_updated" &&
            (tLower.includes("follow up") || tLower.includes("follow-up")));

        if (isObsolete) {
          await dbConn
            .update(internalTasks)
            .set({
              status: "paused",
              pausedAt: new Date(),
              description: `${task.description || ""}\n[Reconciled: ${reasonText}]`.trim(),
            })
            .where(eq(internalTasks.id, task.id));
          canceledTasks++;
        }
      }
    }
  } catch (e) {
    // Non-fatal
  }

  return {
    canceledRuns,
    canceledJobs,
    canceledTasks,
    summary: reasonText,
  };
}

/**
 * Checks for existing contacts or leads before creating a new inquiry from Call Center or Lead Center.
 * Never silently merges ambiguous matches.
 */
export async function checkInquiryMatches(params: {
  ownerId: number;
  parentFirstName?: string;
  parentLastName?: string;
  parentEmail?: string;
  parentPhone?: string;
  studentName?: string;
}) {
  const cleanEmail = normalizeEmail(params.parentEmail);
  const cleanPhone = normalizePhone(params.parentPhone);
  const cleanLast = (params.parentLastName || "").trim().toLowerCase();
  const cleanFirst = (params.parentFirstName || "").trim().toLowerCase();

  const allContacts = await db.getContactsByOwner(params.ownerId);
  const allLeads = await db.getLeadsByOwner(params.ownerId);

  const parentContacts = allContacts.filter(
    (c: any) => !c.parentContactId || c.jobTitle === "Parent" || c.jobTitle === "Parent / Client" || c.jobTitle === "Parent / Guardian"
  );

  const matches: Array<{
    contactId: number;
    parentName: string;
    email: string | null;
    phone: string | null;
    students: Array<{ id: number; name: string; gradeLevel?: string | null }>;
    leadId: number | null;
    currentStage: LeadStage;
    stageLabel: string;
    outcomeLabel: string;
    matchType: "exact_email" | "phone_and_lastname" | "ambiguous_phone" | "ambiguous_name";
    isAmbiguous: boolean;
    reason: string;
  }> = [];

  for (const cand of parentContacts) {
    const candEmail = normalizeEmail(cand.email);
    const candPhone = normalizePhone(cand.phone);
    const candLast = (cand.lastName || "").trim().toLowerCase();
    const candFirst = (cand.firstName || "").trim().toLowerCase();

    let matchType: "exact_email" | "phone_and_lastname" | "ambiguous_phone" | "ambiguous_name" | null = null;
    let isAmbiguous = false;
    let reason = "";

    if (cleanEmail && candEmail && cleanEmail === candEmail) {
      matchType = "exact_email";
      isAmbiguous = false;
      reason = `Exact email match (${cand.email})`;
    } else if (cleanPhone && cleanPhone.length >= 10 && candPhone === cleanPhone) {
      if (cleanLast && candLast === cleanLast) {
        matchType = "phone_and_lastname";
        isAmbiguous = false;
        reason = `Matching phone number and family last name (${cand.phone})`;
      } else {
        matchType = "ambiguous_phone";
        isAmbiguous = true;
        reason = `Phone number matches ${cand.firstName} ${cand.lastName} (${cand.phone}), but family name differs`;
      }
    } else if (cleanFirst && cleanLast && candFirst === cleanFirst && candLast === cleanLast) {
      matchType = "ambiguous_name";
      isAmbiguous = true;
      reason = `Same parent name (${cand.firstName} ${cand.lastName}) with different contact info`;
    }

    if (matchType) {
      const familyStudents = allContacts
        .filter((s: any) => s.parentContactId === cand.id)
        .map((s: any) => ({
          id: s.id,
          name: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
          gradeLevel: s.gradeLevel,
        }));

      const linkedLead = allLeads.find((l: any) => l.contactId === cand.id) || null;
      let currentStage: LeadStage = "inquiry";
      let stageLabel = "New Inquiry";
      let outcomeLabel = "Ready for discovery";

      if (linkedLead) {
        const resolved = deriveStageAndOutcomeSummary(linkedLead, null, cand, null);
        currentStage = resolved.stage;
        stageLabel = resolved.stageLabel;
        outcomeLabel = resolved.statusSummary;
      } else if (cand.accountStatus === "active" || cand.billingStatus === "active") {
        currentStage = "active";
        stageLabel = "Active Client";
        outcomeLabel = "Active Services";
      }

      matches.push({
        contactId: cand.id,
        parentName: `${cand.firstName || ""} ${cand.lastName || ""}`.trim(),
        email: cand.email || null,
        phone: cand.phone || null,
        students: familyStudents,
        leadId: linkedLead?.id || null,
        existingLeadId: linkedLead?.id || null,
        currentStage,
        stageLabel,
        outcomeLabel,
        matchType,
        isAmbiguous,
        reason,
      } as any);
    }
  }

  const exactMatches = matches.filter((m) => !m.isAmbiguous);
  return {
    matches,
    exactMatches,
    hasExactOrStrongMatch: exactMatches.length > 0,
  };
}

/**
 * Helper to derive stage, outcome, and next action cleanly from a lead, discoveryCall, parentContact, and activeOffer.
 */
export function deriveStageAndOutcomeSummary(
  lead: any,
  discoveryCall: any,
  parentContact: any,
  activeOffer: any
): {
  stage: LeadStage;
  stageLabel: string;
  isClosed: boolean;
  discoveryState: DiscoveryState;
  discoveryOutcome: DiscoveryOutcome;
  decisionChoice: DecisionChoice;
  callStatusLabel: "Scheduled" | "Completed" | "No answer" | "Reschedule needed" | "Canceled" | "Unscheduled";
  decisionStatusLabel: "Considering" | "Needs time" | "Ready to proceed" | "Declined";
  statusSummary: string;
  nextActionLabel: string;
  nextActionDueDate: string | null;
  isOverdue: boolean;
} {
  const { journey } = parseDiscoveryPricingBlob(discoveryCall?.pricingNotes);

  // 1. Determine if Active Client
  const isOfferActive = activeOffer?.status === "active";
  const isContactActive =
    parentContact?.accountStatus === "active" && parentContact?.billingStatus === "active";
  const isLeadWon = lead?.status === "Won";

  if (journey.stage === "active" || isOfferActive || isContactActive || isLeadWon) {
    return {
      stage: "active",
      stageLabel: "Active Client",
      isClosed: false,
      discoveryState: "completed",
      discoveryOutcome: "completed",
      decisionChoice: "ready_to_start",
      callStatusLabel: "Completed",
      decisionStatusLabel: "Ready to proceed",
      statusSummary: "Active Client · Services underway",
      nextActionLabel: journey.nextAction?.label || "Open Student Workspace",
      nextActionDueDate: null,
      isOverdue: false,
    };
  }

  // 2. Determine if Closed / Not Proceeding / Declined
  const isClosed =
    Boolean(journey.isClosed) ||
    lead?.status === "Lost" ||
    journey.decision?.choice === "not_proceeding" ||
    journey.decision?.choice === "declined" ||
    journey.discoveryOutcome === "declined";

  if (isClosed) {
    const closedStage: LeadStage =
      journey.closedStage ||
      (journey.discoveryOutcome === "declined" ? "discovery" : "decision");
    const reason =
      journey.decision?.closedReason ||
      journey.decision?.reason ||
      "Declined / Not proceeding";
    return {
      stage: closedStage,
      stageLabel: closedStage === "discovery" ? "Discovery (Closed)" : "Decision (Closed)",
      isClosed: true,
      discoveryState: journey.discoveryState || "completed",
      discoveryOutcome: journey.discoveryOutcome || "declined",
      decisionChoice: "not_proceeding",
      callStatusLabel: closedStage === "discovery" ? "Canceled" : "Completed",
      decisionStatusLabel: "Declined",
      statusSummary: `Declined · ${reason}`,
      nextActionLabel: "Reopen",
      nextActionDueDate: null,
      isOverdue: false,
    };
  }

  // 3. Determine Onboarding stage
  const agreementDone = activeOffer?.agreementStatus === "signed";
  const paymentDone = activeOffer?.paymentStatus === "paid";
  const bothSatisfied = Boolean(agreementDone && paymentDone);
  const hasOnboardingOffer =
    activeOffer &&
    [
      "approved",
      "invitation_sent",
      "plan_selected",
      "agreement_pending",
      "agreement_signed",
      "payment_pending",
      "payment_attention",
    ].includes(activeOffer.status);

  if (
    journey.stage === "onboarding" ||
    bothSatisfied ||
    Boolean(journey.onboardingTransitionedAt) ||
    (journey.stage !== "decision" &&
      (lead?.status === "Approved for Enrollment" || hasOnboardingOffer))
  ) {
    let nextStep = "Select plan & generate agreement";
    if (activeOffer?.selectedPlanKey && !agreementDone) {
      nextStep = "Send or record signed agreement";
    } else if (agreementDone && !paymentDone) {
      nextStep = "Verify initial payment to activate";
    } else if (agreementDone && paymentDone) {
      nextStep = "Activate Client";
    }

    return {
      stage: "onboarding",
      stageLabel: "Onboarding",
      isClosed: false,
      discoveryState: "completed",
      discoveryOutcome: "completed",
      decisionChoice: "ready_to_start",
      callStatusLabel: "Completed",
      decisionStatusLabel: "Ready to proceed",
      statusSummary: `Onboarding · ${activeOffer?.selectedPlanName || "Setup in progress"}`,
      nextActionLabel: journey.nextAction?.label || nextStep,
      nextActionDueDate: journey.nextAction?.dueDate || null,
      isOverdue: false,
    };
  }

  // 4. Determine Decision stage
  const isDiscoveryCompleted =
    journey.discoveryOutcome === "completed" ||
    journey.stage === "decision" ||
    Boolean(journey.progressedDirectlyToDecision) ||
    discoveryCall?.status === "Completed" ||
    lead?.status === "Discovery Completed" ||
    ["14 Day Follow-up", "30 Day Follow-up", "60 Day Follow-up", "90 Day Follow-up"].includes(
      lead?.status || ""
    );

  if (isDiscoveryCompleted) {
    const choice: DecisionChoice =
      journey.decision?.choice ||
      (["14 Day Follow-up", "30 Day Follow-up", "60 Day Follow-up", "90 Day Follow-up"].includes(
        lead?.status || ""
      )
        ? "needs_time"
        : "considering");

    const dueDate =
      journey.decision?.followUpDate ||
      journey.decision?.conversationScheduledAt ||
      journey.decision?.nextContactDate ||
      journey.nextAction?.dueDate ||
      (parentContact?.currentActionDueDate
        ? new Date(parentContact.currentActionDueDate).toISOString()
        : null);

    const isOverdue = Boolean(
      dueDate && new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
    );

    let decisionStatusLabel: "Considering" | "Needs time" | "Ready to proceed" | "Declined" =
      "Considering";
    if (choice === "needs_time") {
      decisionStatusLabel = "Needs time";
    } else if (choice === "ready_to_start" || choice === "ready_to_proceed") {
      decisionStatusLabel = "Ready to proceed";
    }

    const offerSent = Boolean(
      journey.offerSent ||
        activeOffer?.status === "invitation_sent" ||
        activeOffer?.agreementId ||
        journey.agreementSent
    );
    const agreementSent = Boolean(journey.agreementSent || activeOffer?.agreementId);
    const offerPrepared = Boolean(
      journey.offerPrepared || activeOffer?.selectedPlanKey || offerSent
    );

    let statusSummary = `Decision · ${decisionStatusLabel}`;
    let nextActionLabel = "Prepare offer";

    if (choice === "needs_time") {
      statusSummary = `Needs time${journey.decision?.reason ? ` · ${journey.decision.reason}` : ""}`;
      if (dueDate) {
        const formatted = new Date(dueDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        nextActionLabel = `Follow up (${formatted})`;
      } else {
        nextActionLabel = "Follow up";
      }
    } else if (choice === "another_conversation") {
      statusSummary = "Considering · Second conversation";
      if (journey.decision?.conversationScheduledAt) {
        const formatted = new Date(journey.decision.conversationScheduledAt).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" }
        );
        nextActionLabel = `Second conversation (${formatted})`;
      } else {
        nextActionLabel = journey.decision?.nextContactAction || "Schedule second conversation";
      }
    } else {
      // Derive next action from checklist: Offer sent -> Agreement signed -> Payment complete
      if (!offerPrepared) {
        nextActionLabel = "Prepare offer";
      } else if (!offerSent) {
        nextActionLabel = "Send offer";
      } else if (!agreementDone) {
        nextActionLabel = agreementSent ? "Record signed agreement" : "Send agreement";
      } else if (!paymentDone) {
        nextActionLabel = journey.purchaseLinkSent ? "Verify payment" : "Send purchase link";
      } else {
        nextActionLabel = "Continue to onboarding";
      }
    }

    return {
      stage: "decision",
      stageLabel: "Decision",
      isClosed: false,
      discoveryState: "completed",
      discoveryOutcome: "completed",
      decisionChoice: choice,
      callStatusLabel: "Completed",
      decisionStatusLabel,
      statusSummary,
      nextActionLabel: journey.nextAction?.label || nextActionLabel,
      nextActionDueDate: dueDate || null,
      isOverdue,
    };
  }

  // 5. Determine Discovery stage
  const scheduledDate =
    discoveryCall?.scheduledAt || lead?.discoveryCallDate || null;
  const inDiscoveryStage =
    journey.stage === "discovery" ||
    Boolean(scheduledDate) ||
    discoveryCall?.status === "In Progress";

  if (inDiscoveryStage) {
    const outcome: DiscoveryOutcome = journey.discoveryOutcome || "pending";
    let dState: DiscoveryState = journey.discoveryState || "unscheduled";
    if (discoveryCall?.status === "In Progress" || journey.discoveryState === "in_progress") {
      dState = "in_progress";
    } else if (scheduledDate && outcome === "pending") {
      dState = "scheduled";
    }

    const dueDate =
      journey.nextAction?.dueDate ||
      (scheduledDate ? new Date(scheduledDate).toISOString() : null);
    const isOverdue = Boolean(
      dueDate && new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
    );

    let callStatusLabel: "Scheduled" | "Completed" | "No answer" | "Reschedule needed" | "Canceled" | "Unscheduled" =
      "Scheduled";
    let statusSummary = "Scheduled";
    let nextActionLabel = "Run Discovery";

    if (outcome === "no_answer") {
      callStatusLabel = "No answer";
      statusSummary = "No answer";
      nextActionLabel = journey.nextAction?.label || "Retry the call tomorrow";
    } else if (outcome === "reschedule_needed" || outcome === "follow_up_later") {
      callStatusLabel = "Reschedule needed";
      statusSummary = outcome === "follow_up_later" ? "Follow up later" : "Reschedule needed";
      nextActionLabel = journey.nextAction?.label || "Reschedule discovery call";
    } else if (outcome === "cancelled") {
      callStatusLabel = "Canceled";
      statusSummary = "Canceled";
      nextActionLabel = journey.nextAction?.label || "Follow up to reschedule";
    } else if (dState === "in_progress") {
      callStatusLabel = "Scheduled";
      statusSummary = "Discovery in progress";
      nextActionLabel = "Run Discovery";
    } else if (scheduledDate) {
      callStatusLabel = "Scheduled";
      statusSummary = "Scheduled";
      nextActionLabel = "Run Discovery";
    } else {
      callStatusLabel = "Unscheduled";
      statusSummary = "Reschedule needed";
      nextActionLabel = "Schedule Discovery";
    }

    return {
      stage: "discovery",
      stageLabel: "Discovery",
      isClosed: false,
      discoveryState: dState,
      discoveryOutcome: outcome,
      decisionChoice: "undecided",
      callStatusLabel,
      decisionStatusLabel: "Considering",
      statusSummary,
      nextActionLabel,
      nextActionDueDate: dueDate,
      isOverdue,
    };
  }

  // 6. Default: New Leads stage (`stage === "inquiry"`)
  const isLinkSent = Boolean(journey.schedulingLinkSent);
  return {
    stage: "inquiry",
    stageLabel: "New Leads",
    isClosed: false,
    discoveryState: "unscheduled",
    discoveryOutcome: "pending",
    decisionChoice: "undecided",
    callStatusLabel: "Unscheduled",
    decisionStatusLabel: "Considering",
    statusSummary: isLinkSent ? "Scheduling link sent" : "New lead · Ready for discovery",
    nextActionLabel: journey.nextAction?.label || "Schedule Discovery",
    nextActionDueDate: journey.nextAction?.dueDate || null,
    isOverdue: false,
  };
}

/**
 * Creates a New Service Inquiry (or links to an explicitly chosen existing family)
 * supporting multiple students, concerns, desired outcome, preferred contact method & availability,
 * and shared Call Center -> Lead Center history.
 */
export async function createServiceInquiry(params: {
  ownerId: number;
  actorName?: string;
  existingContactId?: number;
  forceCreateSeparate?: boolean;
  parent?: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    preferredContactMethod?: string;
    availability?: string;
    state?: string;
    city?: string;
  };
  parentFirstName?: string;
  parentLastName?: string;
  parentPhone?: string;
  parentEmail?: string;
  preferredContactMethod?: string;
  availability?: string;
  students: InquiryStudentItem[];
  concerns: string;
  desiredOutcome: string;
  source?: string;
  originatingCallLogId?: number;
  callNotes?: string;
  initialCallNotes?: string;
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");

  const { ownerId, students, concerns, desiredOutcome } = params;
  const parent = params.parent || {
    firstName: params.parentFirstName || "Parent",
    lastName: params.parentLastName || "Family",
    phone: params.parentPhone,
    email: params.parentEmail,
    preferredContactMethod: params.preferredContactMethod,
    availability: params.availability,
  };
  const cleanEmail = normalizeEmail(parent.email);
  let parentContactId = params.existingContactId || 0;
  let parentContact: any = null;

  // 1. Resolve or create Parent Contact
  if (parentContactId) {
    parentContact = await db.getContactById(parentContactId, ownerId);
  }

  if (!parentContact) {
    const pData = {
      ownerId,
      firstName: parent.firstName.trim() || "Parent",
      lastName: parent.lastName.trim() || "Family",
      email: cleanEmail || null,
      phone: parent.phone?.trim() || null,
      jobTitle: "Parent",
      company: `${parent.lastName.trim() || "Client"} Family`,
      preferredCommunicationMethod: parent.preferredContactMethod || "Phone",
      bestTimeToCall: parent.availability || null,
      challenges: concerns || null,
      notes: desiredOutcome ? `Desired Outcome: ${desiredOutcome}\nConcerns: ${concerns}` : concerns || null,
      city: parent.city || null,
      state: parent.state || null,
      lifecycleStage: "Discovery",
      portalLifecycleStatus: "Discovery",
      accountStatus: "Onboarding",
      billingStatus: "Not Applicable",
      contractStatus: "Not Started",
      currentPrimaryAction: "Schedule Discovery",
    };
    const insertRes: any = await db.createContact(pData, ownerId);
    parentContactId = insertRes?.id || insertRes?.insertId || extractInsertId(insertRes);
    if (!parentContactId) {
      parentContactId = 5000 + inMemoryContacts.size + 1;
      inMemoryContacts.set(parentContactId, { id: parentContactId, ...pData });
    }
    parentContact = await db.getContactById(parentContactId, ownerId);
  } else {
    // Update parent contact non-destructively with new inquiry details
    const updates: Record<string, any> = {};
    if (parent.phone && !parentContact.phone) updates.phone = parent.phone;
    if (cleanEmail && !parentContact.email) updates.email = cleanEmail;
    if (parent.preferredContactMethod) updates.preferredCommunicationMethod = parent.preferredContactMethod;
    if (parent.availability) updates.bestTimeToCall = parent.availability;
    if (concerns) updates.challenges = concerns;
    if (Object.keys(updates).length > 0) {
      await db.updateContactById(parentContactId, updates);
    }
  }

  // 2. Resolve or create all Students under this Parent Contact (supporting multiple students)
  const existingStudents = await db.getStudentsByParentContactId(parentContactId);
  const studentRecords: InquiryStudentItem[] = [];
  const studentContactIds: number[] = [];

  const normalizedInputStudents =
    students.length > 0
      ? students
      : [{ firstName: "Student", lastName: parent.lastName || "Family" }];

  for (const stu of normalizedInputStudents) {
    const sFirst = (stu.firstName || "").trim();
    const sLast = (stu.lastName || parent.lastName || "").trim();
    if (!sFirst) continue;

    const found = existingStudents.find(
      (es: any) => (es.firstName || "").trim().toLowerCase() === sFirst.toLowerCase()
    );

    if (found) {
      studentContactIds.push(found.id);
      if (stu.gradeLevel || stu.schoolName || stu.iepOr504 || stu.diagnosis || concerns) {
        await db.updateContactById(found.id, {
          gradeLevel: stu.gradeLevel || found.gradeLevel,
          schoolName: stu.schoolName || found.schoolName,
          planType: stu.iepOr504 || found.planType,
          diagnosis: stu.diagnosis || found.diagnosis,
          challenges: stu.challenges || concerns || found.challenges,
        });
      }
      studentRecords.push({
        id: found.id,
        firstName: found.firstName,
        lastName: found.lastName,
        gradeLevel: stu.gradeLevel || found.gradeLevel,
        schoolName: stu.schoolName || found.schoolName,
        iepOr504: stu.iepOr504 || found.planType,
        diagnosis: stu.diagnosis || found.diagnosis,
        challenges: stu.challenges || concerns || found.challenges,
        caseId: found.caseId,
      });
    } else {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const caseId = `WP-${year}-${randomSuffix}`;
      const sData = {
        ownerId,
        firstName: sFirst,
        lastName: sLast,
        jobTitle: "Student",
        parentContactId,
        caseId,
        gradeLevel: stu.gradeLevel || null,
        schoolName: stu.schoolName || null,
        planType: stu.iepOr504 || "IEP",
        diagnosis: stu.diagnosis || null,
        challenges: stu.challenges || concerns || null,
        city: parent.city || null,
        state: parent.state || null,
        lifecycleStage: "Discovery",
        portalLifecycleStatus: "Discovery",
      };
      const sIns: any = await db.createContact(sData, ownerId);
      let newStudentId = sIns?.id || sIns?.insertId || extractInsertId(sIns);
      if (!newStudentId) {
        newStudentId = 6000 + inMemoryContacts.size + 1;
        inMemoryContacts.set(newStudentId, { id: newStudentId, ...sData });
      }
      studentContactIds.push(newStudentId);

      // Ensure a case project exists for the student
      await dbConn.insert(projects).values({
        ownerId,
        clientId: newStudentId,
        name: `${sFirst} ${sLast} — Case`,
        description: `Case established from service inquiry. Concerns: ${concerns || "Not specified"}. Desired outcome: ${desiredOutcome || "Not specified"}.`,
        status: "Planning",
      });

      studentRecords.push({
        id: newStudentId,
        firstName: sFirst,
        lastName: sLast,
        gradeLevel: stu.gradeLevel,
        schoolName: stu.schoolName,
        iepOr504: stu.iepOr504 || "IEP",
        diagnosis: stu.diagnosis,
        challenges: stu.challenges || concerns,
        caseId,
      });
    }
  }

  // 3. Find or create Lead record for this family
  const allOwnerLeads = await db.getLeadsByOwner(ownerId);
  const existingLead = !params.forceCreateSeparate
    ? allOwnerLeads.find(
        (l: any) => l.contactId === parentContactId && l.status !== "Lost" && l.status !== "Won"
      )
    : null;

  const formattedParentName = `${parent.firstName.trim()} ${parent.lastName.trim()}`.trim();
  const formattedStudentNames = studentRecords
    .map((s) => `${s.firstName} ${s.lastName}`.trim())
    .join(", ");
  const firstStudentGrade = studentRecords[0]?.gradeLevel || undefined;
  const summaryNotes = [
    concerns ? `Concerns: ${concerns}` : null,
    desiredOutcome ? `Desired Outcome: ${desiredOutcome}` : null,
    params.callNotes ? `Originating Call Notes: ${params.callNotes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let leadId: number;
  if (existingLead) {
    leadId = existingLead.id;
    await db.updateLead(leadId, ownerId, {
      parentName: formattedParentName || existingLead.parentName,
      parentPhone: parent.phone || existingLead.parentPhone,
      studentName: formattedStudentNames || existingLead.studentName,
      studentGrade: firstStudentGrade || existingLead.studentGrade,
      notes: summaryNotes || existingLead.notes,
    });
  } else {
    const createRes = await db.createLead(
      {
        contactId: parentContactId,
        source: params.source || "Call Center Inquiry",
        status: "New",
        parentName: formattedParentName,
        parentPhone: parent.phone || undefined,
        studentName: formattedStudentNames,
        studentGrade: firstStudentGrade,
        notes: summaryNotes,
      },
      ownerId
    );
    leadId = extractInsertId(createRes);
  }

  // 4. Create or update the unified discoveryCalls record with structured `leadJourney` metadata
  const [dbExistingCall] = await dbConn
    .select()
    .from(discoveryCalls)
    .where(and(eq(discoveryCalls.leadId, leadId), eq(discoveryCalls.ownerId, ownerId)))
    .limit(1);
  const existingCall = dbExistingCall || inMemoryDiscoveryCalls.get(leadId);

  const nowIso = new Date().toISOString();
  const initialHistory: SharedHistoryEntry[] = [];
  const { journey: priorJourney } = parseDiscoveryPricingBlob(existingCall?.pricingNotes);
  if (priorJourney.sharedHistory) {
    initialHistory.push(...priorJourney.sharedHistory);
  }

  initialHistory.unshift({
    id: `hist_${Date.now()}_inq`,
    timestamp: nowIso,
    type: "inquiry",
    title: "Service Inquiry Recorded",
    summary: `Concerns: ${concerns || "None noted"}. Desired outcome: ${desiredOutcome || "None noted"}.${
      params.callNotes ? ` Call notes: ${params.callNotes}` : ""
    }`,
    actor: params.actorName || "Waypoint Staff",
    stage: "inquiry",
  });

  const updatedPricingBlob = serializeDiscoveryPricingBlob(
    existingCall?.pricingNotes,
    {
      stage: priorJourney.stage || "inquiry",
      isClosed: false,
      discoveryState: priorJourney.discoveryState || "unscheduled",
      discoveryOutcome: priorJourney.discoveryOutcome || "pending",
      concerns,
      desiredOutcome,
      preferredContactMethod: parent.preferredContactMethod || "Phone",
      availability: parent.availability || "",
      originatingCallLogId: params.originatingCallLogId || priorJourney.originatingCallLogId || null,
      nextAction: priorJourney.nextAction || {
        label: "Schedule Discovery",
        dueDate: null,
        type: "schedule_discovery",
      },
      sharedHistory: initialHistory,
    },
    {
      studentCount: Math.max(1, studentRecords.length),
    }
  );

  if (existingCall) {
    const updatedFields = {
      contactId: parentContactId,
      studentContactId: studentContactIds[0] || existingCall.studentContactId,
      theirStoryNotes: existingCall.theirStoryNotes || concerns || null,
      additionalNotes: params.callNotes
        ? `${existingCall.additionalNotes ? existingCall.additionalNotes + "\n" : ""}${params.callNotes}`
        : existingCall.additionalNotes,
      pricingNotes: updatedPricingBlob,
    };
    await dbConn
      .update(discoveryCalls)
      .set(updatedFields)
      .where(eq(discoveryCalls.id, existingCall.id));
    inMemoryDiscoveryCalls.set(leadId, { ...existingCall, ...updatedFields });
  } else {
    const newCallValues = {
      leadId,
      ownerId,
      contactId: parentContactId,
      studentContactId: studentContactIds[0] || null,
      status: "Preparing",
      theirStoryNotes: concerns || null,
      additionalNotes: params.callNotes || null,
      pricingNotes: updatedPricingBlob,
    };
    const insCall = await dbConn.insert(discoveryCalls).values(newCallValues);
    const callId = extractInsertId(insCall) || Date.now();
    inMemoryDiscoveryCalls.set(leadId, { id: callId, ...newCallValues });
  }

  // 5. Link originating call log if present
  if (params.originatingCallLogId && studentContactIds[0]) {
    try {
      await dbConn
        .update(callLogs)
        .set({
          studentId: studentContactIds[0],
          status: "assigned",
          assignedAt: new Date(),
        })
        .where(eq(callLogs.id, params.originatingCallLogId));
    } catch {}
  }

  // Record case activity for student timeline
  if (studentContactIds[0]) {
    try {
      await recordCaseActivity({
        studentContactId: studentContactIds[0],
        eventType: "service_inquiry_created",
        title: "Service Inquiry Saved · Ready for Discovery",
        description: `Inquiry created for ${formattedParentName} (${formattedStudentNames}). Concerns: ${concerns}. Desired outcome: ${desiredOutcome}.`,
        ownerName: params.actorName || "Waypoint Staff",
        ownerRole: "Call Center / Intake",
        categoryColor: "blue",
        isActionNeeded: true,
        isCompleted: true,
      });
    } catch {}
  }

  return {
    leadId,
    parentContactId,
    studentContactIds,
    students: studentRecords,
    stage: (priorJourney.stage || "inquiry") as LeadStage,
    confirmation: "Inquiry saved · Ready for discovery",
    confirmationText: "Inquiry saved · Ready for discovery",
  };
}

/**
 * Appends a call note from Call Center to an existing lead's shared history without duplicating the family or lead.
 */
export async function logCallToExistingLead(params: {
  ownerId: number;
  leadId: number;
  callLogId?: number;
  callNotes: string;
  actorName?: string;
}) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");

  const lead = await db.getLeadById(params.leadId, params.ownerId);
  if (!lead) throw new Error("Lead not found");

  const [dbCall] = await dbConn
    .select()
    .from(discoveryCalls)
    .where(eq(discoveryCalls.leadId, params.leadId))
    .limit(1);
  const call = dbCall || inMemoryDiscoveryCalls.get(params.leadId);

  const { journey } = parseDiscoveryPricingBlob(call?.pricingNotes);
  const nowIso = new Date().toISOString();

  const history = [...(journey.sharedHistory || [])];
  history.unshift({
    id: `hist_${Date.now()}_call`,
    timestamp: nowIso,
    type: "call",
    title: "Call Center Note Logged",
    summary: params.callNotes,
    actor: params.actorName || "Call Center Staff",
    stage: journey.stage || "inquiry",
  });

  const newPricingBlob = serializeDiscoveryPricingBlob(call?.pricingNotes, {
    sharedHistory: history,
    originatingCallLogId: params.callLogId || journey.originatingCallLogId || null,
  });

  if (call) {
    const updatedFields = {
      additionalNotes: call.additionalNotes
        ? `${call.additionalNotes}\n[${new Date().toLocaleDateString()}] ${params.callNotes}`
        : params.callNotes,
      pricingNotes: newPricingBlob,
    };
    await dbConn
      .update(discoveryCalls)
      .set(updatedFields)
      .where(eq(discoveryCalls.id, call.id));
    inMemoryDiscoveryCalls.set(params.leadId, { ...call, ...updatedFields });
  } else {
    const newCallValues = {
      leadId: params.leadId,
      ownerId: params.ownerId,
      contactId: lead.contactId || null,
      status: "Preparing",
      additionalNotes: params.callNotes,
      pricingNotes: newPricingBlob,
    };
    const insCall = await dbConn.insert(discoveryCalls).values(newCallValues);
    const callId = extractInsertId(insCall) || Date.now();
    inMemoryDiscoveryCalls.set(params.leadId, { id: callId, ...newCallValues });
  }

  if (params.callLogId && lead.contactId) {
    const students = await db.getStudentsByParentContactId(lead.contactId);
    const targetId = students?.[0]?.id || lead.contactId;
    try {
      await dbConn
        .update(callLogs)
        .set({
          studentId: targetId,
          status: "assigned",
          assignedAt: new Date(),
        })
        .where(eq(callLogs.id, params.callLogId));
    } catch {}
  }

  return { success: true, leadId: params.leadId };
}

/**
 * Lists all leads for the Lead Center overview hydrated with their true journey stage,
 * outcome, next action, due date, overdue status, and family/student details.
 */
export async function listHydratedLeads(ownerId: number) {
  const dbConn = await getDb();
  const rawLeads = await db.getLeadsByOwner(ownerId);
  const allContacts = await db.getContactsByOwner(ownerId);

  let allDiscoveryCalls: any[] = [];
  let allOffers: any[] = [];
  if (dbConn) {
    try {
      allDiscoveryCalls = await dbConn.select().from(discoveryCalls);
    } catch {}
    try {
      allOffers = await dbConn
        .select()
        .from(familyEnrollmentOffers)
        .orderBy(desc(familyEnrollmentOffers.createdAt));
    } catch {}
  }
  if (allDiscoveryCalls.length === 0 && inMemoryDiscoveryCalls.size > 0) {
    allDiscoveryCalls = Array.from(inMemoryDiscoveryCalls.values());
  }
  if (allOffers.length === 0 && inMemoryLeadOffers.size > 0) {
    allOffers = Array.from(inMemoryLeadOffers.values());
  }

  const contactById = new Map<number, any>();
  const studentsByParentId = new Map<number, any[]>();
  for (const c of allContacts) {
    contactById.set(c.id, c);
    if (c.parentContactId) {
      const list = studentsByParentId.get(c.parentContactId) || [];
      list.push(c);
      studentsByParentId.set(c.parentContactId, list);
    }
  }

  const callByLeadId = new Map<number, any>();
  for (const dc of allDiscoveryCalls) {
    if (dc.leadId && !callByLeadId.has(dc.leadId)) {
      callByLeadId.set(dc.leadId, dc);
    }
  }

  const activeOfferByParentId = new Map<number, any>();
  for (const off of allOffers) {
    if (
      off.parentContactId &&
      !activeOfferByParentId.has(off.parentContactId) &&
      off.status !== "revoked" &&
      off.status !== "superseded"
    ) {
      activeOfferByParentId.set(off.parentContactId, off);
    }
  }

  return rawLeads.map((lead: any) => {
    const contact = lead.contactId ? contactById.get(lead.contactId) : null;
    const parentContact =
      contact?.jobTitle === "Student" && contact?.parentContactId
        ? contactById.get(contact.parentContactId) || contact
        : contact;
    const parentId = parentContact?.id || lead.contactId || 0;
    const students = parentId ? studentsByParentId.get(parentId) || [] : [];
    const dbCall = callByLeadId.get(lead.id);
    const memCall = inMemoryDiscoveryCalls.get(lead.id);
    const dCall =
      dbCall || memCall ? { ...(dbCall || {}), ...(memCall || {}) } : null;
    const dbOffer = parentId ? activeOfferByParentId.get(parentId) : null;
    const memOffer = parentId ? inMemoryLeadOffers.get(parentId) : null;
    const activeOffer =
      dbOffer || memOffer ? { ...(dbOffer || {}), ...(memOffer || {}) } : null;
    const { journey } = parseDiscoveryPricingBlob(dCall?.pricingNotes);

    const summary = deriveStageAndOutcomeSummary(lead, dCall, parentContact, activeOffer);

    const studentNames =
      students.length > 0
        ? students.map((s: any) => `${s.firstName || ""} ${s.lastName || ""}`.trim()).filter(Boolean)
        : lead.studentName
        ? [lead.studentName]
        : [];

    return {
      ...lead,
      parentContactId: parentId || null,
      parentName:
        lead.parentName ||
        (parentContact ? `${parentContact.firstName || ""} ${parentContact.lastName || ""}`.trim() : "Unknown Family"),
      parentEmail: parentContact?.email || null,
      parentPhone: lead.parentPhone || parentContact?.phone || null,
      studentNames,
      studentCount: Math.max(1, studentNames.length),
      concerns: journey.concerns || parentContact?.challenges || students[0]?.challenges || "",
      desiredOutcome: journey.desiredOutcome || "",
      timeZone: journey.timeZone || "Eastern",
      assignedAdvocate: journey.assignedAdvocate || "Byron Honea",
      schedulingLinkSent: Boolean(journey.schedulingLinkSent),
      stage: summary.stage,
      stageLabel: summary.stageLabel,
      isClosed: summary.isClosed,
      discoveryState: summary.discoveryState,
      discoveryOutcome: summary.discoveryOutcome,
      decisionChoice: summary.decisionChoice,
      callStatusLabel: summary.callStatusLabel,
      decisionStatusLabel: summary.decisionStatusLabel,
      statusSummary: summary.statusSummary,
      nextActionLabel: summary.nextActionLabel,
      nextActionDueDate: summary.nextActionDueDate,
      isOverdue: summary.isOverdue,
      callAttemptsCount: journey.callAttempts?.length || 0,
    };
  });
}

/**
 * Retrieves the full Lead Center workspace state for a single family lead.
 */
export async function getHydratedLeadWorkspace(leadId: number, ownerId: number) {
  const dbConn = await getDb();
  const lead = await db.getLeadById(leadId, ownerId);
  if (!lead) return null;

  let parentContact: any = null;
  let students: any[] = [];
  if (lead.contactId) {
    const c = await db.getContactById(lead.contactId, ownerId);
    if (c) {
      if (c.jobTitle === "Student" && c.parentContactId) {
        parentContact = (await db.getContactById(c.parentContactId, ownerId)) || c;
      } else {
        parentContact = c;
      }
    }
  }

  if (parentContact?.id) {
    students = await db.getStudentsByParentContactId(parentContact.id);
  }

  // Get or create discoveryCall session
  let dCall: any = null;
  if (dbConn) {
    const [existingCall] = await dbConn
      .select()
      .from(discoveryCalls)
      .where(eq(discoveryCalls.leadId, leadId))
      .limit(1);
    const memCall = inMemoryDiscoveryCalls.get(leadId);
    if (existingCall || memCall) {
      dCall = { ...(existingCall || {}), ...(memCall || {}) };
    } else {
      const newCallValues = {
        leadId,
        ownerId,
        contactId: parentContact?.id || lead.contactId || null,
        studentContactId: students[0]?.id || null,
        status: "Preparing",
        pricingNotes: null as string | null,
      };
      const ins = await dbConn.insert(discoveryCalls).values(newCallValues);
      const callId = extractInsertId(ins) || Date.now();
      const [created] = await dbConn
        .select()
        .from(discoveryCalls)
        .where(eq(discoveryCalls.id, callId))
        .limit(1);
      dCall = created || { id: callId, ...newCallValues };
      inMemoryDiscoveryCalls.set(leadId, dCall);
    }
  }

  const { journey } = parseDiscoveryPricingBlob(dCall?.pricingNotes);

  // Get appointments linked to this lead or family
  let allAppointments = await db.getAppointmentsByOwner(ownerId);
  if (allAppointments.length === 0 && inMemoryLeadAppointments.size > 0) {
    allAppointments = Array.from(inMemoryLeadAppointments.values());
  }
  const familyContactIds = new Set<number>();
  if (parentContact?.id) familyContactIds.add(parentContact.id);
  for (const s of students) if (s.id) familyContactIds.add(s.id);

  const leadAppointments = allAppointments.filter(
    (a: any) =>
      a.leadId === leadId ||
      (a.parentContactId && familyContactIds.has(a.parentContactId)) ||
      (a.clientId && familyContactIds.has(a.clientId))
  );

  // Get family enrollment state
  const enrollmentState = await getFamilyEnrollmentState({
    parentContactId: parentContact?.id || undefined,
    studentContactId: students[0]?.id || undefined,
    leadId,
  });

  const memOffer = parentContact?.id ? inMemoryLeadOffers.get(parentContact.id) : null;
  const activeOffer =
    enrollmentState.activeOffer || memOffer
      ? { ...(enrollmentState.activeOffer || {}), ...(memOffer || {}) }
      : null;
  const summary = deriveStageAndOutcomeSummary(lead, dCall, parentContact, activeOffer);

  // Identify blocking issues for Inquiry stage (missing info that actually blocks next action)
  const parentName =
    (parentContact ? `${parentContact.firstName || ""} ${parentContact.lastName || ""}`.trim() : "") ||
    lead.parentName ||
    "";
  const parentPhone = parentContact?.phone || lead.parentPhone || "";
  const parentEmail = parentContact?.email || "";
  const concerns =
    journey.concerns ||
    parentContact?.challenges ||
    students[0]?.challenges ||
    dCall?.theirStoryNotes ||
    "";
  const desiredOutcome = journey.desiredOutcome || "";

  const blockingIssues: string[] = [];
  if (!parentName || parentName === "Unknown Parent") {
    blockingIssues.push("Parent or guardian name is required before scheduling discovery.");
  }
  if (!parentPhone && !parentEmail) {
    blockingIssues.push("A phone number or email address is required to contact the family.");
  }
  if (students.length === 0 && !lead.studentName) {
    blockingIssues.push("At least one student name is required.");
  }
  if (!concerns.trim()) {
    blockingIssues.push("Main concerns are needed to prepare for discovery.");
  }

  // Real Onboarding Requirements & Connected Statuses
  let agreementRecord: any = null;
  let initialInvoiceRecord: any = null;
  if (dbConn && activeOffer?.agreementId) {
    try {
      const [ag] = await dbConn
        .select()
        .from(agreements)
        .where(eq(agreements.id, activeOffer.agreementId))
        .limit(1);
      agreementRecord = ag || null;
    } catch {}
  }
  if (!agreementRecord && activeOffer?.agreementId) {
    const { inMemoryAgreements } = await import("../routers/agreements");
    agreementRecord = inMemoryAgreements?.get(activeOffer.agreementId) || null;
  }

  if (dbConn && activeOffer?.initialInvoiceId) {
    try {
      const [inv] = await dbConn
        .select()
        .from(invoices)
        .where(eq(invoices.id, activeOffer.initialInvoiceId))
        .limit(1);
      initialInvoiceRecord = inv || null;
    } catch {}
  }

  const isAgreementSigned =
    activeOffer?.agreementStatus === "signed" ||
    agreementRecord?.status === "Signed" ||
    agreementRecord?.status === "Completed" ||
    Boolean(agreementRecord?.contentLocked);

  const isPaymentVerified =
    activeOffer?.paymentStatus === "paid" ||
    initialInvoiceRecord?.status === "Paid" ||
    parentContact?.billingStatus === "active";

  const isPortalProvisioned = Boolean(
    parentContact?.portalUserId || parentContact?.portalAccess === "active"
  );

  const isIntakeSatisfied = Boolean(
    (students.length > 0 || lead.studentName) && concerns.trim().length > 0
  );

  const onboardingBlockers: string[] = [];
  if (!activeOffer) {
    onboardingBlockers.push("Enrollment offer must be initialized in Decision / Onboarding.");
  } else {
    if (!activeOffer.selectedPlanKey) {
      onboardingBlockers.push("Advocacy service plan must be selected.");
    }
    if (!isAgreementSigned) {
      onboardingBlockers.push("Educational Advocacy Services Agreement must be signed.");
    }
    if (!isPaymentVerified) {
      onboardingBlockers.push("Initial payment must be verified.");
    }
  }

  const onboardingRequirements = [
    {
      key: "agreement",
      label: "Service Agreement",
      required: true,
      completed: isAgreementSigned,
      statusLabel: isAgreementSigned
        ? "Signed & Locked"
        : activeOffer?.agreementId
        ? "Sent · Awaiting Signature"
        : "Select a plan to generate agreement",
      detail: activeOffer?.selectedPlanName
        ? `Advocacy Services Agreement — ${activeOffer.selectedPlanName} ($${activeOffer.selectedPlanPrice || "105"}/mo)`
        : "Standard 12-month Waypoint Advocacy Agreement",
      agreementId: activeOffer?.agreementId || null,
    },
    {
      key: "payment",
      label: "First Payment",
      required: true,
      completed: isPaymentVerified,
      statusLabel: isPaymentVerified
        ? "Verified & Paid"
        : activeOffer?.initialInvoiceId
        ? `Invoice Issued (${initialInvoiceRecord?.invoiceNumber || "#" + activeOffer.initialInvoiceId}) · Unpaid`
        : activeOffer?.billingArrangement === "manual_invoice"
        ? "Manual Invoice Ready to Issue"
        : "Awaiting First Payment",
      detail:
        activeOffer?.billingArrangement === "manual_invoice"
          ? `Manual Monthly Invoicing (Due: ${activeOffer.manualInvoiceDueDate || "Upon receipt"})`
          : (activeOffer as any)?.paymentStructure === "pay_in_full"
          ? `Pay in Full ($${(activeOffer as any)?.payInFullFinalAmount || "1,260.00"})`
          : `Monthly Autopay ($${activeOffer?.selectedPlanPrice || "105.00"}/mo)`,
      invoiceId: activeOffer?.initialInvoiceId || null,
    },
    {
      key: "intake",
      label: "Required Intake Profile",
      required: true,
      completed: isIntakeSatisfied,
      statusLabel: isIntakeSatisfied ? "Completed" : "Missing student or concern details",
      detail: `${students.length || 1} student(s) linked · Concerns & desired outcome recorded`,
    },
    {
      key: "portal_access",
      label: "Parent Portal Access",
      required: false,
      completed: isPortalProvisioned,
      statusLabel: isPortalProvisioned
        ? `Active (${parentEmail || "Provisioned"})`
        : "Optional before activation · Can be provisioned anytime",
      detail: "Grants family login to Student Home, Document Vault, and Case Timeline",
    },
    {
      key: "records_upload",
      label: "IEP & Evaluation Records Upload",
      required: false,
      completed: activeOffer?.documentReviewStatus === "approved",
      statusLabel:
        activeOffer?.documentReviewStatus === "approved"
          ? "Reviewed by Advocate"
          : "Permitted after activation",
      detail: "School records and IEP documents are collected and reviewed after client activation",
    },
  ];

  // Shared call logs for this family
  let familyCallLogs: any[] = [];
  if (dbConn) {
    try {
      const allLogs = await dbConn
        .select()
        .from(callLogs)
        .orderBy(desc(callLogs.createdAt))
        .limit(50);
      const cleanParentPhone = normalizePhone(parentPhone);
      familyCallLogs = allLogs.filter((cl: any) => {
        if (cl.studentId && familyContactIds.has(cl.studentId)) return true;
        if (journey.originatingCallLogId && cl.id === journey.originatingCallLogId) return true;
        if (cleanParentPhone && cleanParentPhone.length >= 10) {
          const fromClean = normalizePhone(cl.fromNumber || cl.callerPhone);
          const toClean = normalizePhone(cl.toNumber);
          if (fromClean === cleanParentPhone || toClean === cleanParentPhone) return true;
        }
        return false;
      });
    } catch {}
  }

  const offerSent = Boolean(
    journey.offerSent ||
      activeOffer?.status === "invitation_sent" ||
      activeOffer?.agreementId ||
      journey.agreementSent
  );
  const offerPrepared = Boolean(
    journey.offerPrepared || activeOffer?.selectedPlanKey || offerSent
  );
  const agreementSent = Boolean(journey.agreementSent || activeOffer?.agreementId);
  const purchaseLinkSent = Boolean(
    journey.purchaseLinkSent || activeOffer?.initialInvoiceId
  );

  const offerStatusLabel: "Not prepared" | "Offer prepared" | "Offer sent" = offerSent
    ? "Offer sent"
    : offerPrepared
    ? "Offer prepared"
    : "Not prepared";

  const agreementStatusLabel: "Not sent" | "Agreement sent" | "Agreement signed" =
    isAgreementSigned
      ? "Agreement signed"
      : agreementSent
      ? "Agreement sent"
      : "Not sent";

  const paymentStatusLabel: "Unpaid" | "Purchase link sent" | "Payment complete" =
    isPaymentVerified
      ? "Payment complete"
      : purchaseLinkSent
      ? "Purchase link sent"
      : "Unpaid";

  return {
    lead: {
      ...lead,
      parentName,
      parentPhone,
      parentEmail,
    },
    parentContact,
    students:
      students.length > 0
        ? students.map((s: any) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            gradeLevel: s.gradeLevel,
            schoolName: s.schoolName,
            iepOr504: s.planType || "IEP",
            diagnosis: s.diagnosis,
            challenges: s.challenges,
            caseId: s.caseId,
          }))
        : lead.studentName
        ? [
            {
              id: 0,
              firstName: lead.studentName.split(" ")[0] || lead.studentName,
              lastName: lead.studentName.split(" ").slice(1).join(" ") || "",
              gradeLevel: lead.studentGrade || "",
              schoolName: "",
              iepOr504: "IEP",
              diagnosis: "",
              challenges: concerns,
              caseId: "",
            },
          ]
        : [],
    discoveryCall: dCall,
    appointments: leadAppointments,
    enrollment: {
      activeOffer,
      publishedPlans: PUBLISHED_MEMBERSHIP_PLANS,
      onboardingRequirements,
      onboardingBlockers,
      canActivate: onboardingBlockers.length === 0,
      offerStatusLabel,
      agreementStatusLabel,
      paymentStatusLabel,
      offerPrepared,
      offerSent,
      agreementSent,
      isAgreementSigned,
      purchaseLinkSent,
      isPaymentVerified,
    },
    journey: {
      stage: summary.stage,
      stageLabel: summary.stageLabel,
      isClosed: summary.isClosed,
      discoveryState: summary.discoveryState,
      discoveryOutcome: summary.discoveryOutcome,
      decisionChoice: summary.decisionChoice,
      callStatusLabel: summary.callStatusLabel,
      decisionStatusLabel: summary.decisionStatusLabel,
      statusSummary: summary.statusSummary,
      nextActionLabel: summary.nextActionLabel,
      nextActionDueDate: summary.nextActionDueDate,
      isOverdue: summary.isOverdue,
      concerns,
      desiredOutcome,
      preferredContactMethod:
        journey.preferredContactMethod || parentContact?.preferredCommunicationMethod || "Phone",
      availability: journey.availability || parentContact?.bestTimeToCall || "",
      timeZone: journey.timeZone || "Eastern",
      assignedAdvocate: journey.assignedAdvocate || "Byron Honea",
      schedulingLinkSent: Boolean(journey.schedulingLinkSent),
      schedulingLinkSentAt: journey.schedulingLinkSentAt || null,
      offerPrepared,
      offerSent,
      agreementSent,
      purchaseLinkSent,
      onboardingTransitionedAt: journey.onboardingTransitionedAt || null,
      blockingIssues,
      callAttempts: journey.callAttempts || [],
      decision: journey.decision || { choice: summary.decisionChoice },
      sharedHistory: journey.sharedHistory || [],
      reconciledEvents: journey.reconciledEvents || [],
    },
    callLogs: familyCallLogs,
  };
}

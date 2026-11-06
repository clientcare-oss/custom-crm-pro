import { eq, and, asc, desc } from "drizzle-orm";
import { mysqlTable, int, varchar, text, boolean, timestamp } from "drizzle-orm/mysql-core";
import {
  referencehbptlAutomations,
  referencehbptlAutomationSteps,
  referencehbptlAutomationRuns,
  contacts,
  projects,
  projectTasks,
  internalTasks,
  smartFileAssignments,
  callLogs,
  developerRules,
  appointments,
} from "../../drizzle/schema";
import { getDb } from "./connection";
import { inMemoryContacts } from "./contacts";
import { recordCaseActivity } from "../services/caseActivityService";
import {
  sendEmailDetailed,
  getEmailProviderStatus,
  type EmailDeliveryStatus,
} from "../_core/email";
import {
  DEFAULT_BUSINESS_TIMEZONE,
  BUILTIN_SMART_FILE_TEMPLATES,
  listAvailableSmartFileTemplatesForAutomations,
  resolveValidatedSmartFileTemplate,
  resolveAutomationEmailTemplateWithOverrides,
  formatInBusinessTimeZone,
  addDelayInTimeZone,
  resolveFieldConditionValueDistinct,
  __markSmartFileTemplateDeletedForTests,
  __resetSmartFileTemplateTestState,
} from "./automationHelpers";

export {
  DEFAULT_BUSINESS_TIMEZONE,
  BUILTIN_SMART_FILE_TEMPLATES,
  listAvailableSmartFileTemplatesForAutomations,
  resolveValidatedSmartFileTemplate,
  formatInBusinessTimeZone,
  addDelayInTimeZone,
  __markSmartFileTemplateDeletedForTests,
};

/**
 * Real SQLite / D1 table definitions matching the actual database table names
 * (`honeybook_automations`, `honeybook_automation_steps`, `honeybook_automation_runs`)
 */
export const honeybookAutomations = mysqlTable("honeybook_automations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerEvent: varchar("triggerEvent", { length: 128 }).notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  triggerConfig: text("triggerConfig"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const honeybookAutomationSteps = mysqlTable("honeybook_automation_steps", {
  id: int("id").autoincrement().primaryKey(),
  automationId: int("automationId").notNull(),
  stepNumber: int("stepNumber").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  delayValue: int("delayValue").default(0).notNull(),
  delayUnit: varchar("delayUnit", { length: 50 }).default("minutes").notNull(),
  delayAnchor: varchar("delayAnchor", { length: 100 }).default("after_trigger").notNull(),
  config: text("config").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const honeybookAutomationRuns = mysqlTable("honeybook_automation_runs", {
  id: int("id").autoincrement().primaryKey(),
  automationId: int("automationId").notNull(),
  contactId: int("contactId").notNull(),
  status: varchar("status", { length: 55 }).default("completed").notNull(),
  logText: text("logText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AutomationRunStatus =
  | "simulated"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "canceled"
  | "held_paused";

export type AutomationJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "skipped"
  | "canceled"
  | "held_paused"
  | "held_overdue";

export interface AutomationStepItem {
  id?: number;
  automationId?: number;
  stepNumber: number;
  type: "email" | "task" | "file";
  title: string;
  delayValue: number;
  delayUnit: string;
  delayAnchor: string;
  config: Record<string, any>;
}

export interface AutomationWorkflowRecord {
  id: number;
  name: string;
  description: string;
  triggerEvent: string;
  isActive: boolean;
  triggerConfig: Record<string, any> | null;
  steps: AutomationStepItem[];
  activeRunsCount?: number;
  queuedRunsCount?: number;
  runningRunsCount?: number;
  completedRunsCount?: number;
  failedRunsCount?: number;
  skippedRunsCount?: number;
  canceledRunsCount?: number;
  totalRunsCount?: number;
  lastRunAt?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface StepExecutionResultMeta {
  stepNumber: number;
  stepTitle: string;
  stepType: "email" | "task" | "file";
  status:
    | "simulated"
    | "queued"
    | "processing"
    | "submitted_to_provider"
    | "delivered"
    | "provider_unconfigured"
    | "completed"
    | "failed"
    | "skipped"
    | "canceled"
    | "held_paused"
    | "held_overdue";
  detail: string;
  scheduledFor?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  providerMessageId?: string | null;
  deliveryStatus?: string | null;
  jobId?: number | null;
  errorMessage?: string | null;
  uncertainDelivery?: boolean;
}

export interface AutomationRunRecord {
  id: number;
  automationId: number;
  automationName: string;
  triggerEvent: string;
  contactId: number;
  contactName: string;
  status: AutomationRunStatus;
  logText: string;
  eventKey: string | null;
  retryCount: number;
  errorMessage?: string | null;
  completedStepNumbers?: number[];
  stepResults?: StepExecutionResultMeta[];
  createdAt: string;
}

export interface AutomationJobRecord {
  id: number;
  runId: number;
  automationId: number;
  automationName: string;
  contactId: number;
  contactName: string;
  triggerType: string;
  stepNumber: number;
  stepIndex?: number;
  stepType: "email" | "task" | "file";
  stepTitle: string;
  step: AutomationStepItem;
  eventContext?: AutomationEventContext;
  status: AutomationJobStatus;
  scheduledFor: string;
  scheduledForFormatted?: string;
  dueDate?: string | null;
  appointmentId?: number | null;
  eventDate?: string | null;
  waitingOnStepNumber?: number | null;
  jobDedupKey: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string | null;
  lockedAt?: string | null;
  workerId?: string | null;
  providerMessageId?: string | null;
  deliveryStatus?: string | null;
  resultDetail?: string | null;
  errorMessage?: string | null;
  uncertainDelivery?: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface SimulationStepPreview {
  stepNumber: number;
  stepIndex?: number;
  type: "email" | "task" | "file";
  stepType?: "email" | "task" | "file";
  title: string;
  conditionEvaluated: boolean;
  conditionSummary: string | null;
  conditionReason?: string | null;
  conditionPassed: boolean;
  willExecute: boolean;
  proposedOutcome?: string;
  executionMode: "immediate" | "queued_delayed" | "skipped_condition" | "skipped_past_window";
  calculatedExecutionTimeIso: string;
  calculatedExecutionTimeFormatted: string;
  scheduledTimeFormatted?: string;
  taskCreationTimeFormatted?: string;
  taskDueDateIso?: string;
  taskDueDateFormatted?: string;
  recipient?: string | null;
  recipientEmail?: string | null;
  recipientValid?: boolean;
  templateId?: string | number | null;
  templateName?: string | null;
  selectedTemplate?: string | null;
  resolvedSubject?: string | null;
  resolvedBodyPreview?: string | null;
  usedCustomSubject?: boolean;
  usedCustomBody?: boolean;
  usedCustomSubjectOverride?: boolean;
  usedCustomBodyOverride?: boolean;
  smartFileTemplateId?: number | null;
  smartFileName?: string | null;
  notifyParentByEmail?: boolean;
  validationError?: string | null;
}

export interface AutomationEventContext {
  eventKey?: string;
  appointmentId?: number;
  meetingType?: string;
  meetingTitle?: string;
  eventDate?: Date | string;
  stageFrom?: string;
  stageTo?: string;
  tagAdded?: string;
  fileName?: string;
  templateId?: number;
  actorName?: string;
  forceDuplicate?: boolean;
  nowOverride?: Date | string;
  onlyStepNumbers?: number[];
  skipStepNumbers?: number[];
}

export interface AutomatedTaskRecord {
  id: number;
  automationId: number;
  automationName: string;
  contactId: number;
  studentContactId: number;
  projectId: number;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  taskCreatedAt: Date;
  dueDate: Date;
  assignmentSource: "system_automation";
  createdAt: string;
}

export interface AutomatedEmailRecord {
  id: number;
  automationId: number;
  automationName: string;
  contactId: number;
  studentContactId: number;
  parentContactId: number | null;
  toEmail: string;
  subject: string;
  body: string;
  templateId: string | number;
  templateName: string;
  deliveryMode: EmailDeliveryStatus | "logged_safe";
  deliveryStatus: EmailDeliveryStatus;
  providerMessageId?: string | null;
  senderEmail?: string | null;
  usedCustomSubject?: boolean;
  usedCustomBody?: boolean;
  createdAt: string;
}

export interface AutomatedFileRecord {
  id: number;
  automationId: number;
  automationName: string;
  contactId: number;
  studentContactId: number;
  templateId: number;
  fileId: string;
  fileName: string;
  status: "assigned_to_portal" | "sent";
  portalAssigned: boolean;
  parentNotified: boolean;
  createdAt: string;
}

export interface AutomationTriggerRequestItem {
  id: number;
  requestedByUserId: number | null;
  requestedByName: string;
  description: string;
  requestedTriggerText?: string;
  status: "submitted" | "planned" | "implemented";
  createdAt: string;
}

const AUTOMATIONS_META_DB_KEY = "wap_automations_meta_v1";

/**
 * Core Waypoint Advocates Automation Workflows covering all 9 prioritized CRM lifecycle areas.
 */
export const DEFAULT_WAYPOINT_AUTOMATIONS: AutomationWorkflowRecord[] = [
  {
    id: 1001,
    name: "New Client Inquiry & Intake Follow-Up",
    description:
      "Immediately welcomes new families upon lead form submission, shares Waypoint's phone number (1-833-696-4377), and assigns an intake review task.",
    triggerEvent: "lead_form_submitted",
    isActive: true,
    triggerConfig: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    steps: [
      {
        stepNumber: 1,
        type: "email",
        title: "Send Lead Inquiry Welcome & Discovery Guide",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          templateId: "tpl_intake_welcome",
          templateName: "Welcome to Waypoint Advocates — Next Steps & Portal Access",
          hasCondition: false,
        },
      },
      {
        stepNumber: 2,
        type: "task",
        title: "Review New Family Intake & Prepare Discovery Call",
        delayValue: 1,
        delayUnit: "hours",
        delayAnchor: "after_trigger",
        config: {
          taskTitle: "Review submitted intake details and prepare discovery consultation script",
          taskPriority: "high",
          taskTimingMode: "create_now_due_later",
          hasCondition: false,
        },
      },
    ],
  },
  {
    id: 1002,
    name: "Intake Questionnaire Submitted Review",
    description:
      "Notifies the assigned advocate when a parent completes their intake questionnaire and queues a records preparation task.",
    triggerEvent: "questionnaire_submitted",
    isActive: true,
    triggerConfig: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    steps: [
      {
        stepNumber: 1,
        type: "task",
        title: "Analyze Completed Parent Questionnaire & Key Concerns",
        delayValue: 2,
        delayUnit: "hours",
        delayAnchor: "after_trigger",
        config: {
          taskTitle: "Review parent's top 3 special education concerns from questionnaire",
          taskPriority: "high",
          taskTimingMode: "create_now_due_later",
          hasCondition: false,
        },
      },
    ],
  },
  {
    id: 1003,
    name: "Discovery Call & Meeting Scheduled Preparation",
    description:
      "Sends the IEP/Discovery Meeting Prep Checklist when a session is scheduled and creates a pre-meeting strategy preparation task 1 day before the event.",
    triggerEvent: "meeting_scheduled",
    isActive: true,
    triggerConfig: { meetingType: "Any Meeting" },
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    steps: [
      {
        stepNumber: 1,
        type: "email",
        title: "Send IEP & Consultation Preparation Checklist",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          templateId: "tpl_prep_checklist",
          templateName: "IEP Meeting Prep Checklist",
          hasCondition: false,
        },
      },
      {
        stepNumber: 2,
        type: "task",
        title: "Prepare Pre-Meeting Strategy Brief & Agenda",
        delayValue: 1,
        delayUnit: "days",
        delayAnchor: "before_event",
        config: {
          taskTitle: "Prepare pre-meeting strategy brief and verify latest IEP/504 draft",
          taskPriority: "high",
          taskTimingMode: "create_now_due_later",
          hasCondition: false,
        },
      },
    ],
  },
  {
    id: 1004,
    name: "Client Onboarding & School Notification Sequence",
    description:
      "Triggers when an advocacy agreement/contract is signed: sends onboarding welcome email, attaches FERPA release packet, and creates school notification task.",
    triggerEvent: "contract_signed",
    isActive: true,
    triggerConfig: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    steps: [
      {
        stepNumber: 1,
        type: "email",
        title: "Send Signed Contract Confirmation & Portal Onboarding",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          templateId: "tpl_contract_thanks",
          templateName: "Signed Contract Confirmation",
          hasCondition: false,
        },
      },
      {
        stepNumber: 2,
        type: "file",
        title: "Attach FERPA Release & School Notification Packet",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          fileId: "101",
          fileName: "FERPA Release Authorization & School Notification Form",
          notifyParentByEmail: false,
          hasCondition: false,
        },
      },
      {
        stepNumber: 3,
        type: "task",
        title: "Step 2: Notify School of Advocate & Request Educational Records",
        delayValue: 1,
        delayUnit: "days",
        delayAnchor: "after_trigger",
        config: {
          taskTitle:
            "Send formal notification of advocate representation and records request to school",
          taskPriority: "high",
          taskTimingMode: "create_now_due_later",
          hasCondition: false,
        },
      },
    ],
  },
  {
    id: 1005,
    name: "First Payment & Onboarding Activation",
    description:
      "Queues billing authorization verification and activates the Records Review onboarding phase when the initial family billing-account payment is recorded.",
    triggerEvent: "first_payment_paid",
    isActive: true,
    triggerConfig: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    steps: [
      {
        stepNumber: 1,
        type: "task",
        title: "Step 1: Verify Billing Authorization & Activate Records Review Phase",
        delayValue: 0,
        delayUnit: "hours",
        delayAnchor: "after_trigger",
        config: {
          taskTitle:
            "Verify initial plan payment receipt and transition student to Records Review stage",
          taskPriority: "high",
          taskTimingMode: "create_now_due_later",
          hasCondition: false,
        },
      },
    ],
  },
  {
    id: 1006,
    name: "Document & Smart File Upload Review",
    description:
      "Creates an immediate IEP/psychological evaluation audit task and sends a confirmation update when a family uploads or completes required documents.",
    triggerEvent: "file_completed",
    isActive: true,
    triggerConfig: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    steps: [
      {
        stepNumber: 1,
        type: "task",
        title: "Step 3: Audit Uploaded IEP / Psychological Evaluation Documents",
        delayValue: 2,
        delayUnit: "hours",
        delayAnchor: "after_trigger",
        config: {
          taskTitle:
            "Review uploaded IEP, 504, or psychoeducational evaluation and update Case Compass",
          taskPriority: "high",
          taskTimingMode: "create_now_due_later",
          hasCondition: false,
        },
      },
      {
        stepNumber: 2,
        type: "email",
        title: "Send Document Receipt & Case Progress Update",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          templateId: "90006",
          templateName: "Case Progress & Next Steps Update",
          hasCondition: false,
        },
      },
    ],
  },
  {
    id: 1007,
    name: "Post-Meeting Follow-Up & Case Compass Summary",
    description:
      "When an IEP/504 session ends, assigns a task to update the Waypoint Case Compass (WCC) from the meeting transcript and sends post-meeting action items.",
    triggerEvent: "session_ends",
    isActive: true,
    triggerConfig: { meetingType: "Any Meeting" },
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    steps: [
      {
        stepNumber: 1,
        type: "task",
        title: "Update Waypoint Case Compass (WCC) & Extract Meeting Action Items",
        delayValue: 1,
        delayUnit: "hours",
        delayAnchor: "after_event",
        config: {
          taskTitle: "Update Case Compass from meeting transcript and assign follow-up tasks",
          taskPriority: "high",
          taskTimingMode: "create_now_due_later",
          hasCondition: false,
        },
      },
      {
        stepNumber: 2,
        type: "email",
        title: "Send Post-Meeting Action Items & Updated Compass",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_event",
        config: {
          templateId: "tpl_post_session",
          templateName: "Post-Meeting Action Items",
          hasCondition: false,
        },
      },
    ],
  },
  {
    id: 1008,
    name: "Post-Meeting Google Review & Testimonial Follow-Up",
    description:
      "Follows up after a qualifying first IEP/504 advocacy meeting with a personalized Google Review & video testimonial invitation.",
    triggerEvent: "review_request_point",
    isActive: true,
    triggerConfig: {
      meetingType: "First IEP Meeting",
      googleReviewUrl: "https://g.page/r/waypoint-advocates/review",
      testimonialUrl: "https://waypointadvocates.com/testimonial",
    },
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    steps: [
      {
        stepNumber: 1,
        type: "email",
        title: "Send Google Review & Video Testimonial Invitation",
        delayValue: 0,
        delayUnit: "days",
        delayAnchor: "after_event",
        config: {
          templateId: "tpl_review_request",
          templateName: "Google Review & Testimonial Request",
          googleReviewUrl: "https://g.page/r/waypoint-advocates/review",
          testimonialUrl: "https://waypointadvocates.com/testimonial",
          hasCondition: false,
        },
      },
      {
        stepNumber: 2,
        type: "task",
        title: "Verify Family Review Tracker Follow-Up",
        delayValue: 3,
        delayUnit: "days",
        delayAnchor: "after_event",
        config: {
          taskTitle: "Check Review Opportunity Tracker status for family response",
          taskPriority: "medium",
          taskTimingMode: "create_now_due_later",
          hasCondition: false,
        },
      },
    ],
  },
  {
    id: 1009,
    name: "Case Stage Progression Follow-Up",
    description:
      "When a student's advocacy pipeline or lifecycle stage changes, queues a stage milestone verification task.",
    triggerEvent: "stage_changed",
    isActive: true,
    triggerConfig: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    steps: [
      {
        stepNumber: 1,
        type: "task",
        title: "Verify Stage Transition Deliverables & Update Family Portal",
        delayValue: 0,
        delayUnit: "hours",
        delayAnchor: "after_trigger",
        config: {
          taskTitle: "Confirm stage checklist completion and update student Case Compass",
          taskPriority: "medium",
          taskTimingMode: "create_now_due_later",
          hasCondition: false,
        },
      },
    ],
  },
];

// ─── Runtime State & DB Hydration ────────────────────────────────────────────

let hydrationCompleted = false;
let queueTableEnsured = false;
let nextAutomationId = 2001;
let nextRunId = 5001;
let nextJobId = 9001;
let nextActionRecordId = 8001;
let nextTriggerReqId = 1;

const inMemoryAutomations = new Map<number, AutomationWorkflowRecord>();
const deletedAutomationIds = new Set<number>();
const inMemoryRuns = new Map<number, AutomationRunRecord>();
const inMemoryJobs = new Map<number, AutomationJobRecord>();
const inMemoryTriggerRequests = new Map<number, AutomationTriggerRequestItem>();
const processedEventKeys = new Set<string>();
const processedJobDedupKeys = new Set<string>();
const recordedFirstPaymentAccounts = new Set<string>();
const recordedPaidInFullInvoices = new Set<string>();

const inMemoryAutomationTasks: AutomatedTaskRecord[] = [];
const inMemoryAutomationEmails: AutomatedEmailRecord[] = [];
const inMemoryAutomationFiles: AutomatedFileRecord[] = [];

function shouldUseDatabasePersistence(): boolean {
  return !process.env.VITEST || Boolean((globalThis as any).__CF_ENV_DB__);
}

async function ensureQueueAndRequestTables(): Promise<void> {
  if (queueTableEnsured) return;
  queueTableEnsured = true;
  if (!shouldUseDatabasePersistence()) return;

  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS honeybook_automation_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      automation_id INTEGER NOT NULL,
      automation_name TEXT NOT NULL,
      contact_id INTEGER NOT NULL,
      contact_name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      step_type TEXT NOT NULL,
      step_title TEXT NOT NULL,
      step_json TEXT NOT NULL,
      event_context_json TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      scheduled_for TEXT NOT NULL,
      due_date TEXT,
      appointment_id INTEGER,
      event_date TEXT,
      job_dedup_key TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      next_retry_at TEXT,
      locked_at TEXT,
      worker_id TEXT,
      provider_message_id TEXT,
      delivery_status TEXT,
      result_detail TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_hb_jobs_dedup_key ON honeybook_automation_jobs(job_dedup_key)`,
    `CREATE INDEX IF NOT EXISTS idx_hb_jobs_status_sched ON honeybook_automation_jobs(status, scheduled_for)`,
    `CREATE INDEX IF NOT EXISTS idx_hb_jobs_appt ON honeybook_automation_jobs(appointment_id)`,
    `CREATE TABLE IF NOT EXISTS automation_trigger_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requested_by_user_id INTEGER,
      requested_by_name TEXT,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at TEXT NOT NULL
    )`,
  ];

  const cfDb = (globalThis as any).__CF_ENV_DB__;
  if (cfDb) {
    for (const stmt of ddlStatements) {
      try {
        if (typeof cfDb.exec === "function") {
          await cfDb.exec(stmt);
        } else {
          await cfDb.prepare(stmt).run();
        }
      } catch {}
    }
  }
}

function seedDefaultsIntoMemoryIfEmpty(): void {
  for (const def of DEFAULT_WAYPOINT_AUTOMATIONS) {
    if (deletedAutomationIds.has(def.id)) continue;
    if (!inMemoryAutomations.has(def.id)) {
      inMemoryAutomations.set(def.id, {
        ...def,
        triggerConfig: def.triggerConfig ? { ...def.triggerConfig } : null,
        steps: def.steps.map((s) => ({ ...s, config: { ...s.config } })),
      });
    }
  }
}

function parseRunLogWithMeta(rawLogText: string | null | undefined): {
  cleanLogText: string;
  meta: {
    eventKey?: string | null;
    retryCount?: number;
    triggerEvent?: string;
    automationName?: string;
    contactName?: string;
    errorMessage?: string | null;
    completedStepNumbers?: number[];
    stepResults?: StepExecutionResultMeta[];
  };
} {
  const textVal = rawLogText || "";
  const match = textVal.match(/\n<!-- META:(\{[\s\S]*?\}) -->\s*$/);
  if (!match) {
    return { cleanLogText: textVal, meta: {} };
  }
  const cleanLogText = textVal.slice(0, match.index).trimEnd();
  try {
    const meta = JSON.parse(match[1]);
    return { cleanLogText, meta: meta || {} };
  } catch {
    return { cleanLogText, meta: {} };
  }
}

function formatRunLogWithMeta(
  cleanLogText: string,
  meta: {
    eventKey?: string | null;
    retryCount?: number;
    triggerEvent?: string;
    automationName?: string;
    contactName?: string;
    errorMessage?: string | null;
    completedStepNumbers?: number[];
    stepResults?: StepExecutionResultMeta[];
  }
): string {
  return `${cleanLogText}\n<!-- META:${JSON.stringify(meta)} -->`;
}

async function persistDeletedDefaultIdsToDb(): Promise<void> {
  if (!shouldUseDatabasePersistence()) return;
  try {
    const db = await getDb();
    if (!db) return;
    const payload = JSON.stringify({
      deletedIds: Array.from(deletedAutomationIds.values()),
      updatedAt: new Date().toISOString(),
    });
    const [existing] = await db
      .select({ tabKey: developerRules.tabKey })
      .from(developerRules)
      .where(eq(developerRules.tabKey, AUTOMATIONS_META_DB_KEY))
      .limit(1);
    if (existing) {
      await db
        .update(developerRules)
        .set({ content: payload })
        .where(eq(developerRules.tabKey, AUTOMATIONS_META_DB_KEY));
    } else {
      await db
        .insert(developerRules)
        .values({ tabKey: AUTOMATIONS_META_DB_KEY, content: payload });
    }
  } catch {}
}

async function persistJobToDb(job: AutomationJobRecord): Promise<void> {
  if (!shouldUseDatabasePersistence()) return;
  await ensureQueueAndRequestTables();
  const cfDb = (globalThis as any).__CF_ENV_DB__;
  if (cfDb) {
    try {
      await cfDb
        .prepare(
          `INSERT OR REPLACE INTO honeybook_automation_jobs (
            id, run_id, automation_id, automation_name, contact_id, contact_name,
            trigger_type, step_number, step_type, step_title, step_json, event_context_json,
            status, scheduled_for, due_date, appointment_id, event_date, job_dedup_key,
            retry_count, max_retries, next_retry_at, locked_at, worker_id,
            provider_message_id, delivery_status, result_detail, error_message,
            created_at, updated_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          job.id,
          job.runId,
          job.automationId,
          job.automationName,
          job.contactId,
          job.contactName,
          job.triggerType,
          job.stepNumber,
          job.stepType,
          job.stepTitle,
          JSON.stringify(job.step),
          job.eventContext
            ? JSON.stringify({
                ...job.eventContext,
                waitingOnStepNumber: job.waitingOnStepNumber ?? null,
                uncertainDelivery: job.uncertainDelivery ?? false,
              })
            : JSON.stringify({
                waitingOnStepNumber: job.waitingOnStepNumber ?? null,
                uncertainDelivery: job.uncertainDelivery ?? false,
              }),
          job.status,
          job.scheduledFor,
          job.dueDate ?? null,
          job.appointmentId ?? null,
          job.eventDate ?? null,
          job.jobDedupKey,
          job.retryCount,
          job.maxRetries,
          job.nextRetryAt ?? null,
          job.lockedAt ?? null,
          job.workerId ?? null,
          job.providerMessageId ?? null,
          job.deliveryStatus ?? null,
          job.resultDetail ?? null,
          job.errorMessage ?? null,
          job.createdAt,
          job.updatedAt,
          job.completedAt ?? null
        )
        .run();
    } catch (err) {
      console.warn("[Automations] persistJobToDb warning:", err);
    }
  }
}

async function persistRunToDb(run: AutomationRunRecord): Promise<void> {
  if (!shouldUseDatabasePersistence()) return;
  try {
    const db = await getDb();
    if (!db) return;
    const meta = {
      eventKey: run.eventKey,
      retryCount: run.retryCount,
      triggerEvent: run.triggerEvent,
      automationName: run.automationName,
      contactName: run.contactName,
      errorMessage: run.errorMessage,
      completedStepNumbers: run.completedStepNumbers || [],
      stepResults: run.stepResults || [],
    };
    const [existing] = await db
      .select({ id: honeybookAutomationRuns.id })
      .from(honeybookAutomationRuns)
      .where(eq(honeybookAutomationRuns.id, run.id))
      .limit(1);
    if (existing) {
      await db
        .update(honeybookAutomationRuns)
        .set({
          status: run.status,
          logText: formatRunLogWithMeta(run.logText, meta),
        })
        .where(eq(honeybookAutomationRuns.id, run.id));
    } else {
      await db.insert(honeybookAutomationRuns).values({
        id: run.id,
        automationId: run.automationId,
        contactId: run.contactId,
        status: run.status,
        logText: formatRunLogWithMeta(run.logText, meta),
        createdAt: new Date(run.createdAt),
      });
    }
  } catch {}
}

async function hydrateAutomationsFromDbIfNeeded(): Promise<void> {
  if (hydrationCompleted) {
    seedDefaultsIntoMemoryIfEmpty();
    return;
  }
  hydrationCompleted = true;

  if (!shouldUseDatabasePersistence()) {
    seedDefaultsIntoMemoryIfEmpty();
    return;
  }

  await ensureQueueAndRequestTables();

  try {
    const db = await getDb();
    if (!db) {
      seedDefaultsIntoMemoryIfEmpty();
      return;
    }

    // 1. Load deleted default IDs if any
    try {
      const [metaRow] = await db
        .select()
        .from(developerRules)
        .where(eq(developerRules.tabKey, AUTOMATIONS_META_DB_KEY))
        .limit(1);
      if (metaRow?.content) {
        const parsed = JSON.parse(metaRow.content);
        if (Array.isArray(parsed?.deletedIds)) {
          for (const id of parsed.deletedIds) {
            deletedAutomationIds.add(Number(id));
          }
        }
      }
    } catch {}

    // 2. Load automations & steps from honeybook_automations (with fallback to referencehbptl_automations)
    let dbAutos: any[] = [];
    let dbSteps: any[] = [];
    let dbRuns: any[] = [];

    try {
      dbAutos = await db
        .select()
        .from(honeybookAutomations)
        .orderBy(desc(honeybookAutomations.createdAt));
      dbSteps = await db
        .select()
        .from(honeybookAutomationSteps)
        .orderBy(asc(honeybookAutomationSteps.stepNumber));
      dbRuns = await db
        .select()
        .from(honeybookAutomationRuns)
        .orderBy(desc(honeybookAutomationRuns.createdAt));
    } catch {
      try {
        dbAutos = await db
          .select()
          .from(referencehbptlAutomations)
          .orderBy(desc(referencehbptlAutomations.createdAt));
        dbSteps = await db
          .select()
          .from(referencehbptlAutomationSteps)
          .orderBy(asc(referencehbptlAutomationSteps.stepNumber));
        dbRuns = await db
          .select()
          .from(referencehbptlAutomationRuns)
          .orderBy(desc(referencehbptlAutomationRuns.createdAt));
      } catch {}
    }

    for (const row of dbAutos) {
      const id = Number(row.id);
      if (deletedAutomationIds.has(id)) continue;
      if (id >= nextAutomationId) nextAutomationId = id + 1;

      const matchingSteps = dbSteps
        .filter((s: any) => Number(s.automationId) === id)
        .sort((a: any, b: any) => Number(a.stepNumber) - Number(b.stepNumber))
        .map((s: any) => {
          let parsedCfg: Record<string, any> = {};
          try {
            parsedCfg = typeof s.config === "string" ? JSON.parse(s.config) : s.config || {};
          } catch {}
          return {
            id: Number(s.id),
            automationId: id,
            stepNumber: Number(s.stepNumber),
            type: (s.type as "email" | "task" | "file") || "task",
            title: s.title || "Step",
            delayValue: Number(s.delayValue ?? 0),
            delayUnit: s.delayUnit || "days",
            delayAnchor: s.delayAnchor || "after_trigger",
            config: parsedCfg,
          };
        });

      let parsedTriggerCfg: Record<string, any> | null = null;
      if (row.triggerConfig) {
        try {
          parsedTriggerCfg =
            typeof row.triggerConfig === "string"
              ? JSON.parse(row.triggerConfig)
              : row.triggerConfig;
        } catch {}
      }

      inMemoryAutomations.set(id, {
        id,
        name: row.name,
        description: row.description || "",
        triggerEvent: row.triggerEvent,
        isActive: Boolean(row.isActive),
        triggerConfig: parsedTriggerCfg,
        steps: matchingSteps,
        createdAt: row.createdAt
          ? new Date(row.createdAt).toISOString()
          : new Date().toISOString(),
        updatedAt: row.updatedAt
          ? new Date(row.updatedAt).toISOString()
          : new Date().toISOString(),
      });
    }

    seedDefaultsIntoMemoryIfEmpty();

    // 3. Hydrate execution runs
    for (const r of dbRuns) {
      const runId = Number(r.id);
      if (runId >= nextRunId) nextRunId = runId + 1;
      const autoId = Number(r.automationId);
      const autoObj = inMemoryAutomations.get(autoId);
      const { cleanLogText, meta } = parseRunLogWithMeta(r.logText);

      const runRecord: AutomationRunRecord = {
        id: runId,
        automationId: autoId,
        automationName: meta.automationName || autoObj?.name || `Automation #${autoId}`,
        triggerEvent: meta.triggerEvent || autoObj?.triggerEvent || "unknown",
        contactId: Number(r.contactId),
        contactName: meta.contactName || `Contact #${r.contactId}`,
        status: (r.status as AutomationRunStatus) || "completed",
        logText: cleanLogText,
        eventKey: meta.eventKey || null,
        retryCount: Number(meta.retryCount ?? 0),
        errorMessage: meta.errorMessage || null,
        completedStepNumbers: meta.completedStepNumbers || [],
        stepResults: meta.stepResults || [],
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      };
      inMemoryRuns.set(runId, runRecord);

      if (
        (runRecord.status === "completed" ||
          runRecord.status === "queued" ||
          runRecord.status === "running" ||
          runRecord.status === "held_paused") &&
        runRecord.eventKey
      ) {
        processedEventKeys.add(`${autoId}:${runRecord.contactId}:${runRecord.eventKey}`);
      }
      if (runRecord.eventKey && runRecord.eventKey.startsWith("first_payment_account:")) {
        recordedFirstPaymentAccounts.add(runRecord.eventKey);
      }
      if (runRecord.eventKey && runRecord.eventKey.startsWith("invoice_paid_in_full:")) {
        recordedPaidInFullInvoices.add(runRecord.eventKey);
      }
    }

    // 4. Hydrate durable jobs from honeybook_automation_jobs
    const cfDb = (globalThis as any).__CF_ENV_DB__;
    if (cfDb) {
      try {
        const { results } = await cfDb
          .prepare("SELECT * FROM honeybook_automation_jobs ORDER BY id ASC")
          .bind()
          .all();
        if (Array.isArray(results)) {
          for (const j of results) {
            const jobId = Number(j.id);
            if (jobId >= nextJobId) nextJobId = jobId + 1;
            let parsedStep: AutomationStepItem = {
              stepNumber: Number(j.step_number || 1),
              type: (j.step_type as "email" | "task" | "file") || "task",
              title: j.step_title || "Step",
              delayValue: 0,
              delayUnit: "minutes",
              delayAnchor: "after_trigger",
              config: {},
            };
            try {
              parsedStep = JSON.parse(j.step_json);
            } catch {}

            let parsedCtx: any = {};
            try {
              parsedCtx = j.event_context_json ? JSON.parse(j.event_context_json) : {};
            } catch {}

            const jobRecord: AutomationJobRecord = {
              id: jobId,
              runId: Number(j.run_id),
              automationId: Number(j.automation_id),
              automationName: j.automation_name,
              contactId: Number(j.contact_id),
              contactName: j.contact_name,
              triggerType: j.trigger_type,
              stepNumber: Number(j.step_number),
              stepIndex: Math.max(0, Number(j.step_number) - 1),
              stepType: (j.step_type as "email" | "task" | "file") || "task",
              stepTitle: j.step_title,
              step: parsedStep,
              eventContext: parsedCtx,
              status: (j.status as AutomationJobStatus) || "queued",
              scheduledFor: j.scheduled_for,
              scheduledForFormatted: formatInBusinessTimeZone(j.scheduled_for),
              dueDate: j.due_date || null,
              appointmentId: j.appointment_id != null ? Number(j.appointment_id) : null,
              eventDate: j.event_date || null,
              waitingOnStepNumber: parsedCtx?.waitingOnStepNumber ?? null,
              jobDedupKey: j.job_dedup_key,
              retryCount: Number(j.retry_count || 0),
              maxRetries: Number(j.max_retries || 3),
              nextRetryAt: j.next_retry_at || null,
              lockedAt: j.locked_at || null,
              workerId: j.worker_id || null,
              providerMessageId: j.provider_message_id || null,
              deliveryStatus: j.delivery_status || null,
              resultDetail: j.result_detail || null,
              errorMessage: j.error_message || null,
              uncertainDelivery: Boolean(parsedCtx?.uncertainDelivery),
              createdAt: j.created_at,
              updatedAt: j.updated_at,
              completedAt: j.completed_at || null,
            };
            inMemoryJobs.set(jobId, jobRecord);
            processedJobDedupKeys.add(jobRecord.jobDedupKey);
          }
        }
      } catch {}

      try {
        const { results: reqRows } = await cfDb
          .prepare("SELECT * FROM automation_trigger_requests ORDER BY id DESC")
          .bind()
          .all();
        if (Array.isArray(reqRows)) {
          for (const row of reqRows) {
            const reqId = Number(row.id);
            if (reqId >= nextTriggerReqId) nextTriggerReqId = reqId + 1;
            inMemoryTriggerRequests.set(reqId, {
              id: reqId,
              requestedByUserId:
                row.requested_by_user_id != null ? Number(row.requested_by_user_id) : null,
              requestedByName: row.requested_by_name || "Waypoint Staff",
              description: row.description,
              requestedTriggerText: row.description,
              status: (row.status as "submitted" | "planned" | "implemented") || "submitted",
              createdAt: row.created_at,
            });
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn("[Automations] DB hydration fallback:", err);
    seedDefaultsIntoMemoryIfEmpty();
  }
}

// ─── Public CRUD & Query Operations ──────────────────────────────────────────

function computeAutomationRunCounts(automationId: number) {
  const runsForAuto = Array.from(inMemoryRuns.values()).filter(
    (r) => r.automationId === automationId && r.status !== "simulated"
  );
  const jobsForAuto = Array.from(inMemoryJobs.values()).filter(
    (j) => j.automationId === automationId
  );

  const queuedRunsCount =
    runsForAuto.filter((r) => r.status === "queued" || r.status === "held_paused").length ||
    jobsForAuto.filter(
      (j) => j.status === "queued" || j.status === "held_paused" || j.status === "held_overdue"
    ).length;
  const runningRunsCount =
    runsForAuto.filter((r) => r.status === "running").length ||
    jobsForAuto.filter((j) => j.status === "processing").length;
  const completedRunsCount = runsForAuto.filter((r) => r.status === "completed").length;
  const failedRunsCount = runsForAuto.filter((r) => r.status === "failed").length;
  const skippedRunsCount = runsForAuto.filter((r) => r.status === "skipped").length;
  const canceledRunsCount = runsForAuto.filter((r) => r.status === "canceled").length;
  const lastRun = runsForAuto.sort(
    (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
  )[0];

  return {
    activeRunsCount: queuedRunsCount + runningRunsCount,
    queuedRunsCount,
    runningRunsCount,
    completedRunsCount,
    failedRunsCount,
    skippedRunsCount,
    canceledRunsCount,
    totalRunsCount: runsForAuto.length,
    lastRunAt: lastRun?.createdAt || null,
  };
}

export async function listAutomations(): Promise<AutomationWorkflowRecord[]> {
  await hydrateAutomationsFromDbIfNeeded();

  const list = Array.from(inMemoryAutomations.values())
    .filter((a) => !deletedAutomationIds.has(a.id))
    .map((a) => ({
      ...a,
      ...computeAutomationRunCounts(a.id),
    }));

  return list.sort((a, b) => a.id - b.id);
}

export async function getAutomationById(id: number): Promise<AutomationWorkflowRecord | null> {
  await hydrateAutomationsFromDbIfNeeded();
  if (deletedAutomationIds.has(id)) return null;
  const item = inMemoryAutomations.get(id);
  if (!item) return null;
  return {
    ...item,
    ...computeAutomationRunCounts(id),
  };
}

export async function getAutomationStats() {
  await hydrateAutomationsFromDbIfNeeded();
  const autos = Array.from(inMemoryAutomations.values()).filter(
    (a) => !deletedAutomationIds.has(a.id)
  );
  const runs = Array.from(inMemoryRuns.values()).filter((r) => r.status !== "simulated");
  const jobs = Array.from(inMemoryJobs.values());
  const emailProviderStatus = await getEmailProviderStatus();

  return {
    totalAutomations: autos.length,
    activeAutomations: autos.filter((a) => a.isActive).length,
    draftAutomations: autos.filter((a) => !a.isActive).length,
    queuedRuns: runs.filter((r) => r.status === "queued" || r.status === "held_paused").length,
    runningRuns: runs.filter((r) => r.status === "running").length,
    completedRuns: runs.filter((r) => r.status === "completed").length,
    failedRuns: runs.filter((r) => r.status === "failed").length,
    skippedRuns: runs.filter((r) => r.status === "skipped").length,
    canceledRuns: runs.filter((r) => r.status === "canceled").length,
    queuedJobs: jobs.filter((j) => j.status === "queued").length,
    processingJobs: jobs.filter((j) => j.status === "processing").length,
    heldJobs: jobs.filter((j) => j.status === "held_paused" || j.status === "held_overdue").length,
    emailProviderStatus,
    businessTimeZone: DEFAULT_BUSINESS_TIMEZONE,
  };
}

/**
 * Deletes an automation definition, cancels any pending queued jobs for it,
 * and strictly preserves all completed/historical run records.
 */
export async function deleteAutomation(id: number): Promise<{
  success: boolean;
  canceledPendingJobsCount: number;
  preservedHistoryCount: number;
}> {
  await hydrateAutomationsFromDbIfNeeded();
  const existingAuto = inMemoryAutomations.get(id);
  const snapshotName = existingAuto?.name || `Deleted Automation #${id}`;

  deletedAutomationIds.add(id);
  inMemoryAutomations.delete(id);

  // Cancel any pending queued or held jobs for this automation
  let canceledPendingJobsCount = 0;
  const nowIso = new Date().toISOString();
  for (const job of Array.from(inMemoryJobs.values())) {
    if (
      job.automationId === id &&
      (job.status === "queued" || job.status === "held_paused" || job.status === "held_overdue")
    ) {
      job.status = "canceled";
      job.errorMessage = "Canceled because parent automation was deleted.";
      job.updatedAt = nowIso;
      job.completedAt = nowIso;
      canceledPendingJobsCount++;
      await persistJobToDb(job);
    }
  }

  // Preserve historical runs with their automationName snapshot; cancel only queued runs
  let preservedHistoryCount = 0;
  for (const run of Array.from(inMemoryRuns.values())) {
    if (run.automationId === id) {
      if (!run.automationName) run.automationName = snapshotName;
      if (run.status === "queued" || run.status === "held_paused" || run.status === "running") {
        run.status = "canceled";
        run.errorMessage = "Canceled because automation was deleted before queued steps ran.";
        run.logText += `\n🛑 Run canceled (${nowIso}): automation "${snapshotName}" was deleted.`;
        await persistRunToDb(run);
      } else {
        preservedHistoryCount++;
      }
    }
  }

  if (shouldUseDatabasePersistence()) {
    try {
      const db = await getDb();
      if (db) {
        try {
          await db
            .delete(honeybookAutomationSteps)
            .where(eq(honeybookAutomationSteps.automationId, id));
          await db.delete(honeybookAutomations).where(eq(honeybookAutomations.id, id));
        } catch {
          await db
            .delete(referencehbptlAutomationSteps)
            .where(eq(referencehbptlAutomationSteps.automationId, id));
          await db.delete(referencehbptlAutomations).where(eq(referencehbptlAutomations.id, id));
        }
      }
    } catch (err) {
      console.warn("[Automations] Delete DB warning:", err);
    }
    await persistDeletedDefaultIdsToDb();
  }

  return {
    success: true,
    canceledPendingJobsCount,
    preservedHistoryCount,
  };
}

/**
 * Duplicates an existing automation as an inactive draft (`isActive: false`)
 * with a new ID and zero copied execution history.
 */
export async function duplicateAutomation(sourceId: number): Promise<AutomationWorkflowRecord> {
  await hydrateAutomationsFromDbIfNeeded();
  const source = inMemoryAutomations.get(sourceId);
  if (!source || deletedAutomationIds.has(sourceId)) {
    throw new Error(`Automation #${sourceId} not found.`);
  }

  const saved = await saveAutomation({
    name: `${source.name} (Copy)`,
    description: source.description,
    triggerEvent: source.triggerEvent,
    isActive: false, // Copies must always start as inactive drafts
    triggerConfig: source.triggerConfig ? { ...source.triggerConfig } : null,
    steps: source.steps.map((s) => ({
      type: s.type,
      title: s.title,
      delayValue: s.delayValue,
      delayUnit: s.delayUnit,
      delayAnchor: s.delayAnchor,
      config: { ...s.config },
    })),
  });

  const created = await getAutomationById(saved.id);
  if (!created) {
    throw new Error("Failed to load duplicated automation.");
  }
  return created;
}

export async function saveAutomation(data: {
  id?: number;
  name: string;
  description?: string;
  triggerEvent: string;
  isActive: boolean;
  triggerConfig?: any;
  steps: any[];
}): Promise<{ id: number }> {
  await hydrateAutomationsFromDbIfNeeded();

  // Validate Project Date trigger requires a defined date source before activation
  if (data.triggerEvent === "project_date" && data.isActive) {
    const dateSource = data.triggerConfig?.projectDateSource;
    const validSources = new Set([
      "project_start_date",
      "project_end_date",
      "student_renewal_date",
      "service_term_ends_at",
      "plan_expires_at",
    ]);
    if (!dateSource || !validSources.has(String(dateSource))) {
      throw new Error(
        "Project Date trigger requires selecting a valid Date Source field (Project Start Date, Project End Date, Student Renewal Date, Service Term End Date, or Plan Expiration Date) before activating."
      );
    }
  }

  // Validate Smart File steps have a valid template selected before activation
  for (let i = 0; i < (data.steps || []).length; i++) {
    const s = data.steps[i];
    if (s.type === "file" && data.isActive) {
      const cfg =
        typeof s.config === "string" ? JSON.parse(s.config || "{}") : { ...(s.config || {}) };
      await resolveValidatedSmartFileTemplate(cfg.fileId, cfg.fileName);
    }
  }

  const now = new Date();
  let automationId = data.id;
  const previousRecord = automationId ? inMemoryAutomations.get(automationId) : undefined;

  if (!automationId) {
    automationId = nextAutomationId++;
  }
  deletedAutomationIds.delete(automationId);

  const normalizedSteps: AutomationStepItem[] = (data.steps || []).map((step, idx) => ({
    stepNumber: idx + 1,
    type: (step.type as "email" | "task" | "file") || "task",
    title: step.title || `Step ${idx + 1}`,
    delayValue: Number(step.delayValue ?? 0),
    delayUnit: step.delayUnit || "days",
    delayAnchor: step.delayAnchor || "after_trigger",
    config:
      typeof step.config === "string"
        ? JSON.parse(step.config || "{}")
        : { ...(step.config || {}) },
  }));

  const record: AutomationWorkflowRecord = {
    id: automationId,
    name: data.name.trim(),
    description: data.description || "",
    triggerEvent: data.triggerEvent,
    isActive: Boolean(data.isActive),
    triggerConfig: data.triggerConfig || null,
    steps: normalizedSteps,
    createdAt: previousRecord?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };

  inMemoryAutomations.set(automationId, record);

  // Handle pause/resume state transitions on pending jobs
  if (previousRecord && previousRecord.isActive !== record.isActive) {
    await handleAutomationActiveToggleJobs(automationId, record.isActive, now);
  }

  if (shouldUseDatabasePersistence()) {
    try {
      const db = await getDb();
      if (db) {
        const triggerConfigStr = data.triggerConfig ? JSON.stringify(data.triggerConfig) : null;
        let existingDbRows: any[] = [];
        try {
          existingDbRows = await db
            .select({ id: honeybookAutomations.id })
            .from(honeybookAutomations)
            .where(eq(honeybookAutomations.id, automationId))
            .limit(1);
        } catch {}

        if (existingDbRows.length > 0) {
          await db
            .update(honeybookAutomations)
            .set({
              name: record.name,
              description: record.description,
              triggerEvent: record.triggerEvent,
              isActive: record.isActive,
              triggerConfig: triggerConfigStr,
              updatedAt: now,
            })
            .where(eq(honeybookAutomations.id, automationId));
          await db
            .delete(honeybookAutomationSteps)
            .where(eq(honeybookAutomationSteps.automationId, automationId));
        } else {
          const insertValues: any = {
            id: automationId,
            name: record.name,
            description: record.description,
            triggerEvent: record.triggerEvent,
            isActive: record.isActive,
            triggerConfig: triggerConfigStr,
            createdAt: now,
            updatedAt: now,
          };
          await db.insert(honeybookAutomations).values(insertValues);
        }

        for (let i = 0; i < normalizedSteps.length; i++) {
          const step = normalizedSteps[i];
          await db.insert(honeybookAutomationSteps).values({
            automationId,
            stepNumber: i + 1,
            type: step.type,
            title: step.title,
            delayValue: step.delayValue,
            delayUnit: step.delayUnit,
            delayAnchor: step.delayAnchor,
            config: JSON.stringify(step.config || {}),
            createdAt: now,
          });
        }
      }
    } catch (err) {
      console.warn("[Automations] Save DB persistence warning:", err);
    }
  }

  return { id: automationId };
}

/**
 * When an automation is paused (`isActive = false`), holds all pending queued jobs.
 * When resumed (`isActive = true`), restores future jobs to `queued`, and holds overdue
 * external emails/files as `held_overdue` so overdue messages are never silently released!
 */
async function handleAutomationActiveToggleJobs(
  automationId: number,
  isActive: boolean,
  now: Date = new Date()
): Promise<void> {
  const nowIso = now.toISOString();
  const nowMs = now.getTime();

  for (const job of Array.from(inMemoryJobs.values())) {
    if (job.automationId !== automationId) continue;

    if (!isActive && job.status === "queued") {
      job.status = "held_paused";
      job.updatedAt = nowIso;
      job.errorMessage = "Held while parent automation is paused.";
      await persistJobToDb(job);

      const parentRun = inMemoryRuns.get(job.runId);
      if (parentRun && parentRun.status === "queued") {
        parentRun.status = "held_paused";
        parentRun.logText += `\n⏸️ Pending step #${job.stepNumber} ("${job.stepTitle}") held because automation was paused.`;
        await persistRunToDb(parentRun);
      }
    } else if (isActive && job.status === "held_paused") {
      const schedMs = new Date(job.scheduledFor).getTime();
      const isOverdue = schedMs <= nowMs;

      if (isOverdue && (job.stepType === "email" || job.stepType === "file")) {
        job.status = "held_overdue";
        job.updatedAt = nowIso;
        job.errorMessage = `Scheduled time (${formatInBusinessTimeZone(
          job.scheduledFor
        )}) passed while automation was paused. Explicit confirmation required to send or skip.`;
        await persistJobToDb(job);

        const parentRun = inMemoryRuns.get(job.runId);
        if (parentRun) {
          parentRun.status = "held_paused";
          parentRun.logText += `\n⚠️ Overdue external step #${job.stepNumber} ("${job.stepTitle}") held upon resume — requires manual release or skip.`;
          await persistRunToDb(parentRun);
        }
      } else {
        job.status = "queued";
        job.updatedAt = nowIso;
        job.errorMessage = null;
        await persistJobToDb(job);

        const parentRun = inMemoryRuns.get(job.runId);
        if (parentRun && parentRun.status === "held_paused") {
          parentRun.status = "queued";
          parentRun.logText += `\n▶️ Pending step #${job.stepNumber} ("${job.stepTitle}") resumed to queue.`;
          await persistRunToDb(parentRun);
        }
      }
    }
  }
}

export async function listAutomationRuns(filters?: {
  automationId?: number;
  contactId?: number;
  status?: string;
  limit?: number;
}): Promise<AutomationRunRecord[]> {
  await hydrateAutomationsFromDbIfNeeded();
  let runs = Array.from(inMemoryRuns.values());

  if (filters?.automationId !== undefined) {
    runs = runs.filter((r) => r.automationId === filters.automationId);
  }
  if (filters?.contactId !== undefined) {
    runs = runs.filter((r) => r.contactId === filters.contactId);
  }
  if (filters?.status) {
    runs = runs.filter((r) => r.status === filters.status);
  }

  runs.sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return timeDiff !== 0 ? timeDiff : b.id - a.id;
  });
  const limit = filters?.limit ?? 100;
  return runs.slice(0, limit);
}

export async function listAutomationJobs(filters?: {
  automationId?: number;
  runId?: number;
  contactId?: number;
  status?: string;
  limit?: number;
}): Promise<AutomationJobRecord[]> {
  await hydrateAutomationsFromDbIfNeeded();
  let jobs = Array.from(inMemoryJobs.values());

  if (filters?.automationId !== undefined) {
    jobs = jobs.filter((j) => j.automationId === filters.automationId);
  }
  if (filters?.runId !== undefined) {
    jobs = jobs.filter((j) => j.runId === filters.runId);
  }
  if (filters?.contactId !== undefined) {
    jobs = jobs.filter((j) => j.contactId === filters.contactId);
  }
  if (filters?.status) {
    jobs = jobs.filter((j) => j.status === filters.status);
  }

  jobs.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  const limit = filters?.limit ?? 100;
  return jobs.slice(0, limit).map((j) => ({
    ...j,
    scheduledForFormatted: formatInBusinessTimeZone(j.scheduledFor),
  }));
}

// ─── Contact & Condition Resolution Helpers ──────────────────────────────────

async function resolveTargetContactAndFamily(contactId: number): Promise<{
  target: any | null;
  student: any | null;
  parent: any | null;
}> {
  const db = await getDb();
  let target: any | null = inMemoryContacts.get(contactId) || null;

  if (!target && db) {
    try {
      const [row] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
      if (row) target = row;
    } catch {}
  }

  if (!target) {
    return { target: null, student: null, parent: null };
  }

  let student: any = target;
  let parent: any = null;

  if (target.parentContactId) {
    // Target is a student; look up parent
    parent = inMemoryContacts.get(Number(target.parentContactId)) || null;
    if (!parent && db) {
      try {
        const [pRow] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, Number(target.parentContactId)))
          .limit(1);
        if (pRow) parent = pRow;
      } catch {}
    }
  } else {
    // Target may be a parent or standalone lead; look for a linked student
    parent = target;
    let foundStudent: any = null;
    for (const c of Array.from(inMemoryContacts.values())) {
      if (Number(c.parentContactId) === Number(contactId)) {
        foundStudent = c;
        break;
      }
    }
    if (!foundStudent && db) {
      try {
        const [sRow] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.parentContactId, contactId))
          .limit(1);
        if (sRow) foundStudent = sRow;
      } catch {}
    }
    if (foundStudent) {
      student = foundStudent;
    }
  }

  return { target, student, parent: parent || target };
}

function doesMeetingTypeMatchFilter(
  requiredFilter: string | undefined,
  actualMeetingType?: string,
  actualMeetingTitle?: string
): boolean {
  if (!requiredFilter || requiredFilter === "Any Meeting") return true;
  const actual = `${actualMeetingType || ""} ${actualMeetingTitle || ""}`.trim().toLowerCase();
  if (!actual) return true;

  const req = requiredFilter.toLowerCase();
  if (req.includes("discovery")) {
    return (
      actual.includes("discovery") ||
      actual.includes("consultation") ||
      actual.includes("intake") ||
      actual.includes("intro")
    );
  }
  if (req.includes("first iep")) {
    return (
      actual.includes("first iep") ||
      actual.includes("iep") ||
      actual.includes("504") ||
      actual.includes("ard")
    );
  }
  if (req.includes("annual")) {
    return actual.includes("annual") || actual.includes("review");
  }
  if (req.includes("eligibility")) {
    return actual.includes("eligibility") || actual.includes("eval");
  }
  return actual.includes(req);
}

function evaluateConditionRule(
  resolvedValue: string,
  operator: string,
  expectedValue: string
): boolean {
  const target = expectedValue.trim().toLowerCase();
  const actual = resolvedValue.trim().toLowerCase();
  const segments = actual.split("|").map((s) => s.trim());

  if (operator === "equals") {
    return actual === target || segments.includes(target);
  }
  if (operator === "contains") {
    return actual.includes(target);
  }
  if (operator === "not_equals") {
    return actual !== target && !segments.includes(target);
  }
  return true;
}

/**
 * Computes both the step execution timestamp (`scheduledFor`) and, for task steps,
 * the task's `dueDate`, honoring the configured business timezone (`America/New_York` default),
 * `after_prev` chaining, and `before_event` / `after_event` appointment anchors.
 */
function computeStepScheduleAndDueDate(
  step: AutomationStepItem,
  options: {
    now: Date;
    prevStepCompletionTime: Date;
    prevStepQueued: boolean;
    eventDate?: Date | string;
    timeZone?: string;
  }
): {
  shouldQueueStep: boolean;
  scheduledFor: Date;
  taskDueDate: Date;
  pastWindowDetected: boolean;
  skipBecauseEventPassed: boolean;
} {
  const tz = options.timeZone || DEFAULT_BUSINESS_TIMEZONE;
  const val = Math.max(0, Number(step.delayValue || 0));
  const unit = (step.delayUnit || "days").toLowerCase();
  const anchor = step.delayAnchor || "after_trigger";
  const cfg = step.config || {};

  const parsedEventDate = options.eventDate ? new Date(options.eventDate) : null;
  const hasValidEventDate = Boolean(parsedEventDate && !isNaN(parsedEventDate.getTime()));

  let baseDate = options.now;
  let direction: "add" | "subtract" = "add";

  if (anchor === "after_prev") {
    baseDate = options.prevStepCompletionTime;
  } else if (anchor === "before_event" && hasValidEventDate) {
    baseDate = parsedEventDate!;
    direction = "subtract";
  } else if (anchor === "after_event" && hasValidEventDate) {
    baseDate = parsedEventDate!;
    direction = "add";
  }

  const targetTime = addDelayInTimeZone(baseDate, val, unit, direction, tz);
  const isTargetInPast = targetTime.getTime() <= options.now.getTime();
  const isEventInPast = hasValidEventDate && parsedEventDate!.getTime() < options.now.getTime();

  // Check if a before_event external step's event has already passed completely
  if (
    anchor === "before_event" &&
    hasValidEventDate &&
    isTargetInPast &&
    (step.type === "email" || step.type === "file")
  ) {
    const policy = cfg.pastScheduleBehavior || "skip_if_event_past";
    if (isEventInPast || policy === "skip_if_window_passed") {
      return {
        shouldQueueStep: false,
        scheduledFor: options.now,
        taskDueDate: options.now,
        pastWindowDetected: true,
        skipBecauseEventPassed: true,
      };
    }
  }

  if (step.type === "task") {
    const taskTimingMode =
      cfg.taskTimingMode ||
      (cfg.queueTaskCreation ||
      cfg.queueStepExecution ||
      cfg.createImmediateTaskWithDueDate === false
        ? "queue_creation"
        : "create_now_due_later");

    if (options.prevStepQueued && anchor === "after_prev") {
      // Must wait for previous queued step to complete before creating task
      const dueOffsetDays = Number(cfg.taskDueOffsetDays ?? 1);
      const due = addDelayInTimeZone(targetTime, dueOffsetDays, "days", "add", tz);
      return {
        shouldQueueStep: true,
        scheduledFor: targetTime,
        taskDueDate: due,
        pastWindowDetected: isTargetInPast,
        skipBecauseEventPassed: false,
      };
    }

    if (taskTimingMode === "queue_creation" && val > 0 && !isTargetInPast) {
      const dueOffsetDays = Number(cfg.taskDueOffsetDays ?? 1);
      const due = addDelayInTimeZone(targetTime, dueOffsetDays, "days", "add", tz);
      return {
        shouldQueueStep: true,
        scheduledFor: targetTime,
        taskDueDate: due,
        pastWindowDetected: false,
        skipBecauseEventPassed: false,
      };
    }

    // Default task mode ("create_now_due_later"): create task immediately so advocate sees it on board,
    // and set task dueDate to the calculated targetTime (or now if targetTime already passed).
    const effectiveDueDate =
      val === 0 && anchor === "after_trigger"
        ? addDelayInTimeZone(options.now, 1, "days", "add", tz)
        : isTargetInPast && !hasValidEventDate
          ? options.now
          : targetTime;

    return {
      shouldQueueStep: false,
      scheduledFor: options.now,
      taskDueDate: effectiveDueDate,
      pastWindowDetected: isTargetInPast && val > 0,
      skipBecauseEventPassed: false,
    };
  }

  // Email or Smart File steps:
  // Queue whenever:
  // 1) Previous step is queued and this step is anchored after_prev, OR
  // 2) delayValue > 0 and targetTime > now, OR
  // 3) before_event / after_event where targetTime > now
  const shouldQueue =
    (options.prevStepQueued && anchor === "after_prev") ||
    (targetTime.getTime() > options.now.getTime() && (val > 0 || anchor !== "after_trigger"));

  return {
    shouldQueueStep: shouldQueue,
    scheduledFor: shouldQueue ? targetTime : options.now,
    taskDueDate: targetTime,
    pastWindowDetected: isTargetInPast && val > 0,
    skipBecauseEventPassed: false,
  };
}

function personalizeTemplateText(
  rawText: string,
  tokens: {
    studentName: string;
    studentFirstName: string;
    parentName: string;
    parentFirstName: string;
    caseId: string;
    advocateName: string;
    googleReviewUrl: string;
    testimonialUrl: string;
  }
): string {
  return (rawText || "")
    .replace(/\{\{\s*student_name\s*\}\}/gi, tokens.studentName)
    .replace(/\{\{\s*studentName\s*\}\}/g, tokens.studentName)
    .replace(/\{\{\s*student_first_name\s*\}\}/gi, tokens.studentFirstName)
    .replace(/\{\{\s*studentFirstName\s*\}\}/g, tokens.studentFirstName)
    .replace(/\{\{\s*parent_name\s*\}\}/gi, tokens.parentName)
    .replace(/\{\{\s*parentName\s*\}\}/g, tokens.parentName)
    .replace(/\{\{\s*parent_first_name\s*\}\}/gi, tokens.parentFirstName)
    .replace(/\{\{\s*parentFirstName\s*\}\}/g, tokens.parentFirstName)
    .replace(/\{\{\s*case_id\s*\}\}/gi, tokens.caseId)
    .replace(/\{\{\s*caseId\s*\}\}/g, tokens.caseId)
    .replace(/\{\{\s*advocate_name\s*\}\}/gi, tokens.advocateName)
    .replace(/\{\{\s*advocateName\s*\}\}/g, tokens.advocateName)
    .replace(/\{\{\s*google_review_url\s*\}\}/gi, tokens.googleReviewUrl)
    .replace(/\{\{\s*googleReviewUrl\s*\}\}/g, tokens.googleReviewUrl)
    .replace(/\{\{\s*testimonial_url\s*\}\}/gi, tokens.testimonialUrl)
    .replace(/\{\{\s*testimonialUrl\s*\}\}/g, tokens.testimonialUrl);
}

export async function resolveAutomationEmailTemplate(config: Record<string, any>) {
  return resolveAutomationEmailTemplateWithOverrides(config);
}

// ─── Single Step Action Executor (Used by Immediate Execution & Queue Worker) ──

async function executeSingleAutomationStepAction(params: {
  auto: AutomationWorkflowRecord;
  step: AutomationStepItem;
  contactId: number;
  student: any;
  parent: any;
  triggerEvent: string;
  eventContext?: AutomationEventContext;
  taskDueDate: Date;
  now: Date;
  jobDedupKey: string;
}): Promise<StepExecutionResultMeta> {
  const {
    auto,
    step,
    contactId,
    student,
    parent,
    triggerEvent,
    eventContext,
    taskDueDate,
    now,
    jobDedupKey,
  } = params;
  const db = await getDb();
  const config = step.config || {};
  const triggerConfig = auto.triggerConfig || {};

  const studentName =
    `${student.firstName || ""} ${student.lastName || ""}`.trim() || `Student #${student.id}`;
  const parentName =
    `${parent?.firstName || ""} ${parent?.lastName || ""}`.trim() || studentName;

  if (config.simulateFailure === true || step.title.includes("[FAIL_TEST]")) {
    throw new Error(
      config.failureReason || `Simulated step execution failure in "${step.title}"`
    );
  }

  const googleUrl =
    triggerConfig.googleReviewUrl ||
    config.googleReviewUrl ||
    "https://g.page/r/waypoint-advocates/review";
  const testimonialUrl =
    triggerConfig.testimonialUrl ||
    config.testimonialUrl ||
    "https://waypointadvocates.com/testimonial";

  if (step.type === "task") {
    const priority: "High" | "Medium" | "Low" =
      config.taskPriority === "high"
        ? "High"
        : config.taskPriority === "low"
          ? "Low"
          : "Medium";
    const taskTitle = step.title?.trim();
    if (!taskTitle) {
      throw new Error(`Task step #${step.stepNumber} is missing a required task title.`);
    }
    const taskDesc = config.taskTitle || step.title;
    let projId = 1;

    if (db) {
      try {
        let [proj] = await db
          .select()
          .from(projects)
          .where(eq(projects.clientId, student.id))
          .limit(1);
        if (!proj) {
          const insertProj = await db.insert(projects).values({
            name: `${studentName}'s Advocacy Onboarding`,
            clientId: student.id,
            ownerId: student.ownerId || 1,
            status: "Planning",
          });
          const newProjId = Number((insertProj as any)?.lastInsertRowid || 1);
          proj = { id: newProjId } as any;
        }
        projId = proj?.id || 1;

        await db.insert(projectTasks).values({
          projectId: projId,
          title: taskTitle,
          description: taskDesc,
          status: "Todo",
          priority,
          dueDate: taskDueDate,
          assignmentSource: "system_automation",
          assignedByName: auto.name,
        });

        await db.insert(internalTasks).values({
          title: taskTitle,
          description: taskDesc,
          status: "not_started",
          projectId: projId,
          dueDate: taskDueDate,
          linkedStudentId: student.id,
          linkedStudentName: studentName,
          createdBy: student.ownerId || 1,
          assignmentSource: "system_automation",
          assignedByName: auto.name,
        });
      } catch {}
    }

    inMemoryAutomationTasks.push({
      id: nextActionRecordId++,
      automationId: auto.id,
      automationName: auto.name,
      contactId,
      studentContactId: student.id,
      projectId: projId,
      title: taskTitle,
      description: taskDesc,
      priority,
      taskCreatedAt: now,
      dueDate: taskDueDate,
      assignmentSource: "system_automation",
      createdAt: now.toISOString(),
    });

    try {
      await recordCaseActivity({
        studentContactId: student.id,
        caseId: student.caseId || `WP-${student.id}`,
        eventType: "next_step",
        title: `Automated Task Created: ${taskTitle}`,
        description: `Workflow "${auto.name}" created CRM task "${taskTitle}" (${priority} Priority, Created ${formatInBusinessTimeZone(
          now
        )}, Due ${formatInBusinessTimeZone(taskDueDate)}).`,
        whyReason: `Triggered by ${triggerEvent}`,
        ownerName: "Waypoint Automation Engine",
        ownerRole: "System Automation",
        categoryColor: "amber",
        isActionNeeded: true,
        eventDate: now,
      });
    } catch {}

    return {
      stepNumber: step.stepNumber,
      stepTitle: step.title,
      stepType: "task",
      status: "completed",
      detail: `✅ Created CRM Task: "${taskTitle}" linked to project ID ${projId} (Created: ${formatInBusinessTimeZone(
        now
      )}, Due: ${formatInBusinessTimeZone(taskDueDate)})`,
      dueDate: taskDueDate.toISOString(),
      completedAt: now.toISOString(),
    };
  }

  if (step.type === "email") {
    const recipientEmail = String(parent?.email || student?.email || "").trim();
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      throw new Error(
        `Missing or invalid recipient email address for ${parentName} (Student: ${studentName}). Please add a valid email address on the contact record before running this email step.`
      );
    }

    const tpl = await resolveAutomationEmailTemplateWithOverrides(config);
    const tokens = {
      studentName,
      studentFirstName: student.firstName || studentName,
      parentName,
      parentFirstName: parent?.firstName || parentName,
      caseId: student.caseId || parent?.caseId || `WP-${student.id}`,
      advocateName: student.assignedAdvocateName || "Byron Honea",
      googleReviewUrl: googleUrl,
      testimonialUrl,
    };
    const personalizedSubject = personalizeTemplateText(tpl.subject, tokens).trim();
    const personalizedBody = personalizeTemplateText(tpl.body, tokens).trim();

    if (!personalizedSubject || !personalizedBody) {
      throw new Error(
        `Email step "${step.title}" resolved an empty subject or body. Verify the selected template or custom override.`
      );
    }

    const deliveryResult = await sendEmailDetailed({
      to: recipientEmail,
      subject: personalizedSubject,
      html: personalizedBody,
      idempotencyKey: jobDedupKey,
    });

    if (deliveryResult.status === "failed") {
      const err: any = new Error(
        deliveryResult.error || `Email delivery to ${recipientEmail} failed.`
      );
      err.uncertainDelivery = Boolean(deliveryResult.uncertainDelivery);
      throw err;
    }

    if (
      deliveryResult.status === "provider_unconfigured" &&
      config.failWhenProviderUnconfigured === true
    ) {
      throw new Error(
        deliveryResult.error ||
          "Outbound email provider is not configured. Configure Gmail credentials in Integrations → Gmail (PG-014)."
      );
    }

    const effectiveDeliveryStatus: EmailDeliveryStatus = deliveryResult.status;
    const providerMessageId =
      deliveryResult.messageId || `unconfigured-${auto.id}-${student.id}-${now.getTime()}`;

    inMemoryAutomationEmails.push({
      id: nextActionRecordId++,
      automationId: auto.id,
      automationName: auto.name,
      contactId,
      studentContactId: student.id,
      parentContactId: parent?.id || null,
      toEmail: recipientEmail,
      subject: personalizedSubject,
      body: personalizedBody,
      templateId: tpl.id,
      templateName: tpl.name,
      deliveryMode: effectiveDeliveryStatus,
      deliveryStatus: effectiveDeliveryStatus,
      providerMessageId: deliveryResult.messageId || null,
      senderEmail: deliveryResult.senderEmail || null,
      usedCustomSubject: tpl.usedCustomSubject,
      usedCustomBody: tpl.usedCustomBody,
      createdAt: now.toISOString(),
    });

    if (shouldUseDatabasePersistence() && db) {
      try {
        await db.insert(callLogs).values({
          ownerId: student.ownerId || 1,
          contactId: parent?.id || student.id,
          studentId: student.id,
          quoCallId: `gmail:${providerMessageId}`,
          direction: "outbound",
          eventType:
            effectiveDeliveryStatus === "submitted_to_provider" ||
            effectiveDeliveryStatus === "delivered"
              ? "email.submitted_to_provider"
              : "email.provider_unconfigured",
          summary: personalizedSubject,
          transcript: personalizedBody,
          smsBody: personalizedBody.replace(/<[^>]+>/g, " ").trim(),
          status: "assigned",
          rawPayload: {
            id: providerMessageId,
            channel: "email",
            gmailMessageId: deliveryResult.messageId || null,
            gmailThreadId: `thread-auto-${student.id}`,
            fromEmail: deliveryResult.senderEmail || "unconfigured@waypointadvocates.com",
            fromName: "Waypoint Advocates",
            toEmails: [recipientEmail],
            subject: personalizedSubject,
            bodyHtml: personalizedBody,
            timestamp: now.toISOString(),
            matchStatus: "matched",
            parentContactId: parent?.id || null,
            parentName,
            studentContactId: student.id,
            studentName,
            deliveryStatus: effectiveDeliveryStatus,
            missingConfig: deliveryResult.missingConfig || [],
            usedCustomSubject: tpl.usedCustomSubject,
            usedCustomBody: tpl.usedCustomBody,
            templateId: tpl.id,
            automationId: auto.id,
          },
          assignedAt: now,
        });
      } catch {}
    }

    try {
      await recordCaseActivity({
        studentContactId: student.id,
        caseId: student.caseId || `WP-${student.id}`,
        eventType: "client_contact",
        title:
          effectiveDeliveryStatus === "submitted_to_provider" ||
          effectiveDeliveryStatus === "delivered"
            ? `Automated Email Submitted to Provider: ${personalizedSubject}`
            : `Automated Email Pending Provider Config: ${personalizedSubject}`,
        description:
          effectiveDeliveryStatus === "submitted_to_provider" ||
          effectiveDeliveryStatus === "delivered"
            ? `Workflow "${auto.name}" submitted "${personalizedSubject}" to ${recipientEmail} (Message ID: ${
                deliveryResult.messageId || "N/A"
              }).`
            : `Workflow "${auto.name}" prepared "${personalizedSubject}" for ${recipientEmail}, but external sending is awaiting Gmail SMTP credentials in Integrations (PG-014).`,
        whyReason: `Triggered by ${triggerEvent}`,
        ownerName: "Waypoint Automation Engine",
        ownerRole: "System Automation",
        categoryColor: "blue",
        eventDate: now,
      });
    } catch {}

    const statusBadgeText =
      effectiveDeliveryStatus === "submitted_to_provider"
        ? `Submitted to Provider (Message ID: ${deliveryResult.messageId})`
        : effectiveDeliveryStatus === "delivered"
          ? `Delivered (Message ID: ${deliveryResult.messageId})`
          : `Provider Unconfigured (No external email sent — configure Gmail in PG-014)`;

    return {
      stepNumber: step.stepNumber,
      stepTitle: step.title,
      stepType: "email",
      status: effectiveDeliveryStatus,
      detail: `📧 Email "${personalizedSubject}" -> ${recipientEmail} [${statusBadgeText}]\n   └─ Resolved links -> Google: ${googleUrl} | Testimonial: ${testimonialUrl}`,
      completedAt: now.toISOString(),
      providerMessageId: deliveryResult.messageId || null,
      deliveryStatus: effectiveDeliveryStatus,
    };
  }

  // step.type === "file"
  const validatedTemplate = await resolveValidatedSmartFileTemplate(
    config.fileId,
    config.fileName || eventContext?.fileName
  );
  const exactTemplateId = validatedTemplate.templateId;
  const resolvedFileName = validatedTemplate.fileName;

  // Duplicate Smart File assignment prevention per student + template + automation
  const existingFileAssignment = inMemoryAutomationFiles.find(
    (f) =>
      f.studentContactId === student.id &&
      f.templateId === exactTemplateId &&
      f.automationId === auto.id &&
      !eventContext?.forceDuplicate
  );

  if (existingFileAssignment) {
    return {
      stepNumber: step.stepNumber,
      stepTitle: step.title,
      stepType: "file",
      status: "completed",
      detail: `📄 Smart File "${resolvedFileName}" (Template #${exactTemplateId}) is already assigned to ${studentName}'s portal — duplicate assignment prevented.`,
      completedAt: now.toISOString(),
    };
  }

  if (shouldUseDatabasePersistence() && db) {
    try {
      await db.insert(smartFileAssignments).values({
        templateId: exactTemplateId,
        ownerId: student.ownerId || 1,
        contactId: parent?.id || student.id,
        studentContactId: student.id,
        status: "assigned",
        sentAt: now,
        internalNotes: `Assigned to portal by automation "${auto.name}" (Template #${exactTemplateId}: ${resolvedFileName})`,
      });
    } catch {}
  }

  let parentNotified = false;
  if (config.notifyParentByEmail === true) {
    const recipientEmail = String(parent?.email || student?.email || "").trim();
    if (recipientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      const notifyRes = await sendEmailDetailed({
        to: recipientEmail,
        subject: `New Portal Form Assigned for ${studentName}: ${resolvedFileName}`,
        html: `<p>Hi ${parentName},</p><p>A new document/form (<strong>${resolvedFileName}</strong>) has been assigned to <strong>${studentName}</strong>'s Family Portal.</p><p>Warm regards,<br/>Waypoint Advocates</p>`,
        idempotencyKey: `${jobDedupKey}:notify`,
      });
      parentNotified = notifyRes.sent;
    }
  }

  inMemoryAutomationFiles.push({
    id: nextActionRecordId++,
    automationId: auto.id,
    automationName: auto.name,
    contactId,
    studentContactId: student.id,
    templateId: exactTemplateId,
    fileId: String(exactTemplateId),
    fileName: resolvedFileName,
    status: "assigned_to_portal",
    portalAssigned: true,
    parentNotified,
    createdAt: now.toISOString(),
  });

  try {
    await recordCaseActivity({
      studentContactId: student.id,
      caseId: student.caseId || `WP-${student.id}`,
      eventType: "next_step",
      title: `Smart File Assigned to Portal: ${resolvedFileName}`,
      description: `Workflow "${auto.name}" assigned Smart File Template #${exactTemplateId} ("${resolvedFileName}") to ${studentName}'s portal workspace (${
        parentNotified ? "Parent notified by email" : "Assigned to portal without email notification"
      }).`,
      whyReason: `Triggered by ${triggerEvent}`,
      ownerName: "Waypoint Automation Engine",
      ownerRole: "System Automation",
      categoryColor: "purple",
      eventDate: now,
    });
  } catch {}

  return {
    stepNumber: step.stepNumber,
    stepTitle: step.title,
    stepType: "file",
    status: "completed",
    detail: `📄 Assigned Smart File "${resolvedFileName}" (Template #${exactTemplateId}) to student portal workspace [Portal: Assigned | Parent Email Notification: ${
      parentNotified ? "Submitted" : config.notifyParentByEmail ? "Not Sent (Unconfigured/Missing Email)" : "Off (Portal Only)"
    }].`,
    completedAt: now.toISOString(),
  };
}

// ─── Core Automation Execution Engine ────────────────────────────────────────

export async function triggerAutomationFlow(
  triggerEvent: string,
  contactId: number,
  dryRun: boolean = false,
  eventContext?: AutomationEventContext
): Promise<{
  success: boolean;
  status?: string;
  logs: string[];
  runsCreated?: AutomationRunRecord[];
  jobsCreated?: AutomationJobRecord[];
  simulationSteps?: SimulationStepPreview[];
  skippedDuplicate?: boolean;
}> {
  await hydrateAutomationsFromDbIfNeeded();

  // Match active automations for this triggerEvent
  const matchedAutomations = Array.from(inMemoryAutomations.values()).filter(
    (a) =>
      !deletedAutomationIds.has(a.id) &&
      a.triggerEvent === triggerEvent &&
      Boolean(a.isActive) === true
  );

  return executeAutomationsList({
    automationsToRun: matchedAutomations,
    triggerEvent,
    contactId,
    dryRun,
    eventContext,
  });
}

/**
 * Runs or simulates a specific automation by ID (`automationId`),
 * allowing safe Test Run previews on Draft or Paused automations without activating them,
 * as well as explicit `manual_trigger` ("Run Now") executions.
 */
export async function triggerSpecificAutomation(
  automationId: number,
  contactId: number,
  dryRun: boolean = true,
  eventContext?: AutomationEventContext
): Promise<{
  success: boolean;
  status?: string;
  logs: string[];
  runsCreated?: AutomationRunRecord[];
  jobsCreated?: AutomationJobRecord[];
  simulationSteps?: SimulationStepPreview[];
  skippedDuplicate?: boolean;
  automationName?: string;
  isDraftOrPaused?: boolean;
}> {
  await hydrateAutomationsFromDbIfNeeded();
  const auto = inMemoryAutomations.get(automationId);
  if (!auto || deletedAutomationIds.has(automationId)) {
    throw new Error(`Automation #${automationId} not found.`);
  }

  if (!dryRun && !auto.isActive && auto.triggerEvent !== "manual_trigger") {
    throw new Error(
      `Automation "${auto.name}" is currently Paused / Draft. Use Test Run (Simulation) to preview it safely, or activate the automation before running it live.`
    );
  }

  const res = await executeAutomationsList({
    automationsToRun: [auto],
    triggerEvent: auto.triggerEvent,
    contactId,
    dryRun,
    eventContext,
  });

  return {
    ...res,
    automationName: auto.name,
    isDraftOrPaused: !auto.isActive,
  };
}

async function executeAutomationsList(params: {
  automationsToRun: AutomationWorkflowRecord[];
  triggerEvent: string;
  contactId: number;
  dryRun: boolean;
  eventContext?: AutomationEventContext;
}): Promise<{
  success: boolean;
  status?: string;
  logs: string[];
  runsCreated?: AutomationRunRecord[];
  jobsCreated?: AutomationJobRecord[];
  simulationSteps?: SimulationStepPreview[];
  skippedDuplicate?: boolean;
}> {
  const { automationsToRun, triggerEvent, contactId, dryRun, eventContext } = params;
  const now = eventContext?.nowOverride ? new Date(eventContext.nowOverride) : new Date();
  const logs: string[] = [];
  const simulationSteps: SimulationStepPreview[] = [];

  logs.push(
    `🚀 Initiating ${dryRun ? "[SIMULATION PREVIEW] " : ""}workflow trigger: "${triggerEvent}" for target contact ID: ${contactId}`
  );

  const { target, student, parent } = await resolveTargetContactAndFamily(contactId);
  if (!target || !student) {
    logs.push(`❌ Target contact profile not found. Cancelling run.`);
    return { success: false, logs, runsCreated: [], jobsCreated: [], simulationSteps: [] };
  }

  const studentName =
    `${student.firstName || ""} ${student.lastName || ""}`.trim() || `Student #${student.id}`;
  const parentName =
    `${parent?.firstName || ""} ${parent?.lastName || ""}`.trim() || studentName;
  const timeZone =
    student.confirmedTimeZone ||
    student.timezone ||
    parent?.confirmedTimeZone ||
    parent?.timezone ||
    DEFAULT_BUSINESS_TIMEZONE;

  logs.push(
    `🔗 Student Target: ${studentName} (Parent/Family: ${parentName} | Time Zone: ${timeZone})`
  );

  if (automationsToRun.length === 0) {
    logs.push(`⚠️ No active automations matching trigger "${triggerEvent}" configured.`);
    return { success: true, logs, runsCreated: [], jobsCreated: [], simulationSteps: [] };
  }

  const runsCreated: AutomationRunRecord[] = [];
  const jobsCreated: AutomationJobRecord[] = [];
  let anySkippedDuplicate = false;

  for (const auto of automationsToRun) {
    const autoLogs: string[] = [
      `🚀 ${dryRun ? "[SIMULATION] " : ""}Trigger "${triggerEvent}" matched workflow "${auto.name}" for ${studentName}`,
    ];
    logs.push(`⚙️ Processing workflow sequence: "${auto.name}"`);

    const triggerConfig = auto.triggerConfig || {};

    // 1. Check workflow-level meetingType filter if configured
    if (
      triggerConfig.meetingType &&
      !doesMeetingTypeMatchFilter(
        triggerConfig.meetingType,
        eventContext?.meetingType,
        eventContext?.meetingTitle
      )
    ) {
      const skipMsg = `⏭️ Workflow "${auto.name}" skipped: meeting type "${
        eventContext?.meetingType || eventContext?.meetingTitle || "Unknown"
      }" does not match required "${triggerConfig.meetingType}".`;
      logs.push(skipMsg);
      autoLogs.push(skipMsg);
      continue;
    }

    // 2. Duplicate Execution Guard (Idempotency)
    const effectiveEventKey = eventContext?.eventKey || `${triggerEvent}:${contactId}`;
    const dedupKey = `${auto.id}:${contactId}:${effectiveEventKey}`;

    if (!dryRun && !eventContext?.forceDuplicate && processedEventKeys.has(dedupKey)) {
      const dupMsg = `⏭️ Duplicate execution prevented for workflow "${auto.name}" (event key: ${effectiveEventKey}).`;
      logs.push(dupMsg);
      anySkippedDuplicate = true;
      continue;
    }

    const steps = [...(auto.steps || [])].sort((a, b) => a.stepNumber - b.stepNumber);
    let runStatus: AutomationRunStatus = dryRun ? "simulated" : "completed";
    let executedStepsCount = 0;
    let queuedStepsCount = 0;
    let errorMessage: string | null = null;
    const completedStepNumbers: number[] = [...(eventContext?.skipStepNumbers || [])];
    const stepResults: StepExecutionResultMeta[] = [];

    const assignedRunId = dryRun ? 0 : nextRunId++;
    let prevStepCompletionTime = new Date(now.getTime());
    let prevStepQueued = false;

    for (const step of steps) {
      // If retrying a run where this step already completed, skip it without re-running!
      if (eventContext?.skipStepNumbers?.includes(step.stepNumber)) {
        const skipDoneMsg = `⏭️ [Step ${step.stepNumber}] "${step.title}" already completed in prior attempt — skipping duplicate step execution.`;
        logs.push(skipDoneMsg);
        autoLogs.push(skipDoneMsg);
        executedStepsCount++;
        continue;
      }
      if (
        eventContext?.onlyStepNumbers &&
        !eventContext.onlyStepNumbers.includes(step.stepNumber)
      ) {
        continue;
      }

      const config = step.config || {};
      let conditionPassed = true;
      let conditionSummary: string | null = null;

      if (config.hasCondition) {
        const field = config.conditionField || "student_tag";
        const val = String(config.conditionValue || "");
        const op = config.conditionOperator || "equals";

        const resolvedFieldVal = await resolveFieldConditionValueDistinct(
          field,
          student,
          parent,
          eventContext
        );
        conditionPassed = evaluateConditionRule(resolvedFieldVal, op, val);
        conditionSummary = `If ${field} ${op} "${val}" (Actual: "${resolvedFieldVal || "none"}")`;

        const condMsg = `🔍 [Step Filter — Skips this step only] ${conditionSummary} -> ${
          conditionPassed ? "PASSED" : "SKIPPED"
        }`;
        logs.push(condMsg);
        autoLogs.push(condMsg);
      }

      const scheduleInfo = computeStepScheduleAndDueDate(step, {
        now,
        prevStepCompletionTime,
        prevStepQueued,
        eventDate: eventContext?.eventDate,
        timeZone,
      });

      if (!conditionPassed || scheduleInfo.skipBecauseEventPassed) {
        const skipReason = !conditionPassed
          ? "Step filter condition not satisfied."
          : "Scheduled before_event window and event have already passed.";
        const skipStepMsg = `⚠️ [Step ${step.stepNumber}] Action SKIPPED: ${skipReason}`;
        logs.push(skipStepMsg);
        autoLogs.push(skipStepMsg);

        stepResults.push({
          stepNumber: step.stepNumber,
          stepTitle: step.title,
          stepType: step.type,
          status: "skipped",
          detail: skipStepMsg,
        });

        if (dryRun) {
          simulationSteps.push({
            stepNumber: step.stepNumber,
            stepIndex: step.stepNumber - 1,
            type: step.type,
            stepType: step.type,
            title: step.title,
            conditionEvaluated: Boolean(config.hasCondition),
            conditionSummary,
            conditionReason: conditionSummary,
            conditionPassed,
            willExecute: false,
            proposedOutcome: !conditionPassed ? "skipped_condition" : "skipped_past_window",
            executionMode: !conditionPassed ? "skipped_condition" : "skipped_past_window",
            calculatedExecutionTimeIso: scheduleInfo.scheduledFor.toISOString(),
            calculatedExecutionTimeFormatted: formatInBusinessTimeZone(
              scheduleInfo.scheduledFor,
              timeZone
            ),
            scheduledTimeFormatted: formatInBusinessTimeZone(
              scheduleInfo.scheduledFor,
              timeZone
            ),
          });
        }
        continue;
      }

      const googleUrl =
        triggerConfig.googleReviewUrl ||
        config.googleReviewUrl ||
        "https://g.page/r/waypoint-advocates/review";
      const testimonialUrl =
        triggerConfig.testimonialUrl ||
        config.testimonialUrl ||
        "https://waypointadvocates.com/testimonial";

      if (dryRun) {
        executedStepsCount++;
        const execMode = scheduleInfo.shouldQueueStep ? "queued_delayed" : "immediate";

        if (step.type === "email") {
          const tpl = await resolveAutomationEmailTemplateWithOverrides(config);
          const recipientEmail = String(parent?.email || student?.email || "").trim();
          const recipientValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail);
          const tokens = {
            studentName,
            studentFirstName: student.firstName || studentName,
            parentName,
            parentFirstName: parent?.firstName || parentName,
            caseId: student.caseId || parent?.caseId || `WP-${student.id}`,
            advocateName: student.assignedAdvocateName || "Byron Honea",
            googleReviewUrl: googleUrl,
            testimonialUrl,
          };
          const resolvedSubject = personalizeTemplateText(tpl.subject, tokens);
          const resolvedBody = personalizeTemplateText(tpl.body, tokens);

          const msg = `📧 [Simulation Preview — Not Sent] Email "${resolvedSubject}" (Template: "${tpl.name}") -> ${
            recipientEmail || "MISSING EMAIL"
          } [${
            scheduleInfo.shouldQueueStep
              ? `Would queue for ${formatInBusinessTimeZone(scheduleInfo.scheduledFor, timeZone)}`
              : "Would execute immediately"
          }]`;
          const linkMsg = `   └─ Resolved links -> Google: ${googleUrl} | Testimonial: ${testimonialUrl}`;
          logs.push(msg, linkMsg);
          autoLogs.push(msg, linkMsg);

          simulationSteps.push({
            stepNumber: step.stepNumber,
            stepIndex: step.stepNumber - 1,
            type: "email",
            stepType: "email",
            title: step.title,
            conditionEvaluated: Boolean(config.hasCondition),
            conditionSummary,
            conditionReason: conditionSummary,
            conditionPassed: true,
            willExecute: recipientValid,
            proposedOutcome: execMode,
            executionMode: execMode,
            calculatedExecutionTimeIso: scheduleInfo.scheduledFor.toISOString(),
            calculatedExecutionTimeFormatted: formatInBusinessTimeZone(
              scheduleInfo.scheduledFor,
              timeZone
            ),
            scheduledTimeFormatted: formatInBusinessTimeZone(
              scheduleInfo.scheduledFor,
              timeZone
            ),
            recipient: recipientEmail || null,
            recipientEmail: recipientEmail || null,
            recipientValid,
            templateId: tpl.id,
            templateName: tpl.name,
            selectedTemplate: tpl.name,
            resolvedSubject,
            resolvedBodyPreview: resolvedBody.replace(/<[^>]+>/g, " ").trim().slice(0, 260),
            usedCustomSubject: tpl.usedCustomSubject,
            usedCustomBody: tpl.usedCustomBody,
            usedCustomSubjectOverride: tpl.usedCustomSubject,
            usedCustomBodyOverride: tpl.usedCustomBody,
            validationError: recipientValid
              ? null
              : `Contact ${parentName} is missing a valid email address.`,
          });
        } else if (step.type === "file") {
          let validTpl: { templateId: number; fileName: string } | null = null;
          let validationError: string | null = null;
          try {
            validTpl = await resolveValidatedSmartFileTemplate(config.fileId, config.fileName);
          } catch (err: any) {
            validationError = err?.message || "Invalid Smart File template";
          }
          const msg = validTpl
            ? `📄 [Simulation Preview — Not Assigned] Smart File "${validTpl.fileName}" (Template #${validTpl.templateId}) would assign to ${studentName}'s portal`
            : `❌ [Simulation Preview] Smart File configuration error: ${validationError}`;
          logs.push(msg);
          autoLogs.push(msg);

          simulationSteps.push({
            stepNumber: step.stepNumber,
            stepIndex: step.stepNumber - 1,
            type: "file",
            stepType: "file",
            title: step.title,
            conditionEvaluated: Boolean(config.hasCondition),
            conditionSummary,
            conditionReason: conditionSummary,
            conditionPassed: true,
            willExecute: Boolean(validTpl),
            proposedOutcome: execMode,
            executionMode: execMode,
            calculatedExecutionTimeIso: scheduleInfo.scheduledFor.toISOString(),
            calculatedExecutionTimeFormatted: formatInBusinessTimeZone(
              scheduleInfo.scheduledFor,
              timeZone
            ),
            scheduledTimeFormatted: formatInBusinessTimeZone(
              scheduleInfo.scheduledFor,
              timeZone
            ),
            recipient: `${studentName} Portal`,
            selectedTemplate: validTpl?.fileName ?? config.fileName ?? null,
            smartFileTemplateId: validTpl?.templateId ?? null,
            smartFileName: validTpl?.fileName ?? config.fileName ?? null,
            notifyParentByEmail: Boolean(config.notifyParentByEmail),
            validationError,
          });
        } else {
          const msg = `✅ [Simulation Preview — Not Created] Task "${step.title}" would create (${formatInBusinessTimeZone(
            scheduleInfo.scheduledFor,
            timeZone
          )}) with Due Date ${formatInBusinessTimeZone(scheduleInfo.taskDueDate, timeZone)}`;
          logs.push(msg);
          autoLogs.push(msg);

          simulationSteps.push({
            stepNumber: step.stepNumber,
            stepIndex: step.stepNumber - 1,
            type: "task",
            stepType: "task",
            title: step.title,
            conditionEvaluated: Boolean(config.hasCondition),
            conditionSummary,
            conditionReason: conditionSummary,
            conditionPassed: true,
            willExecute: true,
            proposedOutcome: execMode,
            executionMode: execMode,
            calculatedExecutionTimeIso: scheduleInfo.scheduledFor.toISOString(),
            calculatedExecutionTimeFormatted: formatInBusinessTimeZone(
              scheduleInfo.scheduledFor,
              timeZone
            ),
            scheduledTimeFormatted: formatInBusinessTimeZone(
              scheduleInfo.scheduledFor,
              timeZone
            ),
            recipient: student.assignedAdvocateName || "Byron Honea",
            selectedTemplate: step.title,
            taskCreationTimeFormatted: formatInBusinessTimeZone(
              scheduleInfo.scheduledFor,
              timeZone
            ),
            taskDueDateIso: scheduleInfo.taskDueDate.toISOString(),
            taskDueDateFormatted: formatInBusinessTimeZone(scheduleInfo.taskDueDate, timeZone),
          });
        }

        prevStepCompletionTime = scheduleInfo.scheduledFor;
        prevStepQueued = scheduleInfo.shouldQueueStep;
        continue;
      }

      // Live Execution: Check if step should be queued in durable background queue
      const jobDedupKey = `${dedupKey}:step:${step.stepNumber}`;

      if (scheduleInfo.shouldQueueStep) {
        if (!eventContext?.forceDuplicate && processedJobDedupKeys.has(jobDedupKey)) {
          const dupJobMsg = `⏭️ [Step ${step.stepNumber}] Queued job already exists for key ${jobDedupKey}.`;
          logs.push(dupJobMsg);
          autoLogs.push(dupJobMsg);
          prevStepCompletionTime = scheduleInfo.scheduledFor;
          prevStepQueued = true;
          queuedStepsCount++;
          continue;
        }

        const jobId = nextJobId++;
        const nowIso = now.toISOString();
        const jobRecord: AutomationJobRecord = {
          id: jobId,
          runId: assignedRunId,
          automationId: auto.id,
          automationName: auto.name,
          contactId,
          contactName: studentName,
          triggerType: triggerEvent,
          stepNumber: step.stepNumber,
          stepIndex: Math.max(0, step.stepNumber - 1),
          stepType: step.type,
          stepTitle: step.title,
          step: { ...step, config: { ...config } },
          eventContext: eventContext ? { ...eventContext } : undefined,
          status: "queued",
          scheduledFor: scheduleInfo.scheduledFor.toISOString(),
          scheduledForFormatted: formatInBusinessTimeZone(scheduleInfo.scheduledFor, timeZone),
          dueDate: step.type === "task" ? scheduleInfo.taskDueDate.toISOString() : null,
          appointmentId: eventContext?.appointmentId ?? null,
          eventDate: eventContext?.eventDate
            ? new Date(eventContext.eventDate).toISOString()
            : null,
          waitingOnStepNumber:
            prevStepQueued && step.delayAnchor === "after_prev" ? step.stepNumber - 1 : null,
          jobDedupKey,
          retryCount: 0,
          maxRetries: 3,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        inMemoryJobs.set(jobId, jobRecord);
        processedJobDedupKeys.add(jobDedupKey);
        jobsCreated.push(jobRecord);
        await persistJobToDb(jobRecord);

        const queueMsg = `⏳ [Step ${step.stepNumber}] Queued "${step.title}" (${step.type.toUpperCase()}) for ${formatInBusinessTimeZone(
          scheduleInfo.scheduledFor,
          timeZone
        )} (Job #${jobId})`;
        logs.push(queueMsg);
        autoLogs.push(queueMsg);

        stepResults.push({
          stepNumber: step.stepNumber,
          stepTitle: step.title,
          stepType: step.type,
          status: "queued",
          detail: queueMsg,
          scheduledFor: jobRecord.scheduledFor,
          dueDate: jobRecord.dueDate,
          jobId,
        });

        queuedStepsCount++;
        prevStepCompletionTime = scheduleInfo.scheduledFor;
        prevStepQueued = true;
        continue;
      }

      // Immediate Step Execution
      try {
        const stepMeta = await executeSingleAutomationStepAction({
          auto,
          step,
          contactId,
          student,
          parent,
          triggerEvent,
          eventContext,
          taskDueDate: scheduleInfo.taskDueDate,
          now,
          jobDedupKey,
        });

        logs.push(stepMeta.detail);
        autoLogs.push(stepMeta.detail);
        stepResults.push(stepMeta);
        completedStepNumbers.push(step.stepNumber);
        executedStepsCount++;
        prevStepCompletionTime = new Date();
        prevStepQueued = false;
      } catch (stepErr: any) {
        runStatus = "failed";
        errorMessage = stepErr?.message || "Step execution failed";
        const errMsg = `❌ [Step ${step.stepNumber}] Action FAILED: ${errorMessage}`;
        logs.push(errMsg);
        autoLogs.push(errMsg);
        stepResults.push({
          stepNumber: step.stepNumber,
          stepTitle: step.title,
          stepType: step.type,
          status: "failed",
          detail: errMsg,
          errorMessage,
          uncertainDelivery: Boolean(stepErr?.uncertainDelivery),
        });
        // Stop executing subsequent dependent steps when a step fails
        break;
      }
    }

    if (!dryRun) {
      if (runStatus !== "failed") {
        if (queuedStepsCount > 0) {
          runStatus = "queued";
        } else if (executedStepsCount === 0 && steps.length > 0) {
          runStatus = "skipped";
        } else {
          runStatus = "completed";
        }
      }

      if (runStatus === "completed" || runStatus === "queued") {
        processedEventKeys.add(dedupKey);
      }

      const nowIso = now.toISOString();
      const cleanLogText = autoLogs.join("\n");

      const runRecord: AutomationRunRecord = {
        id: assignedRunId,
        automationId: auto.id,
        automationName: auto.name,
        triggerEvent,
        contactId,
        contactName: studentName,
        status: runStatus,
        logText: cleanLogText,
        eventKey: effectiveEventKey,
        retryCount: 0,
        errorMessage,
        completedStepNumbers,
        stepResults,
        createdAt: nowIso,
      };
      inMemoryRuns.set(assignedRunId, runRecord);
      runsCreated.push(runRecord);
      await persistRunToDb(runRecord);
    }
  }

  const summaryStatus = dryRun
    ? "simulated"
    : runsCreated.some((r) => r.status === "failed")
      ? "failed"
      : runsCreated.some((r) => r.status === "queued")
        ? "queued"
        : runsCreated.some((r) => r.status === "skipped") &&
            runsCreated.every((r) => r.status === "skipped")
          ? "skipped"
          : "completed";

  return {
    success: runsCreated.every((r) => r.status !== "failed"),
    status: summaryStatus,
    logs,
    runsCreated,
    jobsCreated,
    simulationSteps,
    skippedDuplicate: anySkippedDuplicate,
  };
}

// ─── Background Queue Worker & Scheduler (`processDueAutomationJobs`) ────────

const activeClaimedJobIds = new Set<number>();

export async function processDueAutomationJobs(
  optionsOrNow?:
    | Date
    | {
        now?: Date | string;
        workerId?: string;
        limit?: number;
      }
): Promise<{
  processedCount: number;
  completedCount: number;
  failedCount: number;
  heldCount: number;
  canceledCount: number;
  requeuedRetryCount: number;
  claimed: number;
  completed: number;
  failed: number;
  logs: string[];
}> {
  await hydrateAutomationsFromDbIfNeeded();
  const options =
    optionsOrNow instanceof Date ? { now: optionsOrNow } : optionsOrNow;
  const now = options?.now ? new Date(options.now) : new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  const workerId = options?.workerId || `worker-${process.pid || 1}-${nowMs}`;
  const limit = options?.limit ?? 50;

  const logs: string[] = [];
  let processedCount = 0;
  let completedCount = 0;
  let failedCount = 0;
  let heldCount = 0;
  let canceledCount = 0;
  let requeuedRetryCount = 0;

  // Find due jobs in deterministic order
  const dueCandidates = Array.from(inMemoryJobs.values())
    .filter((job) => {
      if (job.status !== "queued") return false;
      if (activeClaimedJobIds.has(job.id)) return false;
      if (job.waitingOnStepNumber != null) {
        // Check if preceding step in the same run is still pending
        const priorJob = Array.from(inMemoryJobs.values()).find(
          (p) => p.runId === job.runId && p.stepNumber === job.waitingOnStepNumber
        );
        if (priorJob && priorJob.status !== "completed") {
          return false;
        }
      }
      const schedMs = new Date(job.scheduledFor).getTime();
      if (schedMs > nowMs) return false;
      if (job.nextRetryAt && new Date(job.nextRetryAt).getTime() > nowMs) return false;
      return true;
    })
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    .slice(0, limit);

  for (const job of dueCandidates) {
    // Atomic claim check
    if (job.status !== "queued" || activeClaimedJobIds.has(job.id)) continue;

    // If backed by SQLite/D1, perform atomic conditional UPDATE WHERE status = 'queued'
    const cfDb = (globalThis as any).__CF_ENV_DB__;
    if (shouldUseDatabasePersistence() && cfDb) {
      try {
        const checkRow: any = await cfDb
          .prepare("SELECT status FROM honeybook_automation_jobs WHERE id = ?")
          .bind(job.id)
          .first();
        if (checkRow && checkRow.status !== "queued") {
          job.status = checkRow.status as AutomationJobStatus;
          continue;
        }
      } catch {}
    }

    activeClaimedJobIds.add(job.id);
    job.status = "processing";
    job.lockedAt = nowIso;
    job.workerId = workerId;
    job.updatedAt = nowIso;
    await persistJobToDb(job);
    processedCount++;

    try {
      // 1. Recheck automation existence & active state before executing queued action
      const auto = inMemoryAutomations.get(job.automationId);
      if (!auto || deletedAutomationIds.has(job.automationId)) {
        job.status = "canceled";
        job.errorMessage = "Canceled: parent automation was deleted.";
        job.completedAt = nowIso;
        job.updatedAt = nowIso;
        canceledCount++;
        await persistJobToDb(job);
        await syncParentRunFromJobState(job.runId, nowIso);
        continue;
      }

      if (!auto.isActive) {
        job.status = "held_paused";
        job.errorMessage = "Held: parent automation is currently paused.";
        job.updatedAt = nowIso;
        heldCount++;
        await persistJobToDb(job);
        await syncParentRunFromJobState(job.runId, nowIso);
        continue;
      }

      // 2. Recheck target contact / student state
      const { target, student, parent } = await resolveTargetContactAndFamily(job.contactId);
      if (
        !target ||
        !student ||
        student.archivedAt ||
        String(student.accountStatus || "").toLowerCase() === "archived"
      ) {
        job.status = "canceled";
        job.errorMessage = "Canceled: target student/contact record was deleted or archived.";
        job.completedAt = nowIso;
        job.updatedAt = nowIso;
        canceledCount++;
        await persistJobToDb(job);
        await syncParentRunFromJobState(job.runId, nowIso);
        continue;
      }

      // 3. Recheck linked appointment state if applicable
      if (job.appointmentId) {
        const db = await getDb();
        if (db) {
          try {
            const [apt] = await db
              .select()
              .from(appointments)
              .where(eq(appointments.id, job.appointmentId))
              .limit(1);
            if (apt && /cancel|no_show/i.test(String(apt.status || ""))) {
              job.status = "canceled";
              job.errorMessage = `Canceled: linked appointment #${job.appointmentId} is ${apt.status}.`;
              job.completedAt = nowIso;
              job.updatedAt = nowIso;
              canceledCount++;
              await persistJobToDb(job);
              await syncParentRunFromJobState(job.runId, nowIso);
              continue;
            }
          } catch {}
        }
      }

      // 4. Execute the step action
      const stepDueDate = job.dueDate ? new Date(job.dueDate) : now;
      const resultMeta = await executeSingleAutomationStepAction({
        auto,
        step: job.step,
        contactId: job.contactId,
        student,
        parent,
        triggerEvent: job.triggerType,
        eventContext: job.eventContext,
        taskDueDate: stepDueDate,
        now,
        jobDedupKey: job.jobDedupKey,
      });

      job.status = "completed";
      job.providerMessageId = resultMeta.providerMessageId || null;
      job.deliveryStatus = resultMeta.deliveryStatus || resultMeta.status;
      job.resultDetail = resultMeta.detail;
      job.errorMessage = null;
      job.completedAt = nowIso;
      job.updatedAt = nowIso;
      completedCount++;
      logs.push(resultMeta.detail);
      await persistJobToDb(job);

      // 5. Update any subsequent `after_prev` step in the same run so its schedule anchors to this step's actual completion time!
      const timeZone =
        student.confirmedTimeZone || student.timezone || DEFAULT_BUSINESS_TIMEZONE;
      for (const nextJob of Array.from(inMemoryJobs.values())) {
        if (
          nextJob.runId === job.runId &&
          nextJob.waitingOnStepNumber === job.stepNumber &&
          nextJob.status === "queued"
        ) {
          nextJob.waitingOnStepNumber = null;
          const nextSched = addDelayInTimeZone(
            now,
            nextJob.step.delayValue,
            nextJob.step.delayUnit,
            "add",
            timeZone
          );
          nextJob.scheduledFor = nextSched.toISOString();
          nextJob.scheduledForFormatted = formatInBusinessTimeZone(nextSched, timeZone);
          nextJob.updatedAt = nowIso;
          await persistJobToDb(nextJob);
        }
      }

      await syncParentRunFromJobState(job.runId, nowIso, resultMeta);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isUncertain = Boolean(err?.uncertainDelivery);
      job.retryCount = (job.retryCount || 0) + 1;
      job.errorMessage = errMsg;
      job.uncertainDelivery = isUncertain;
      job.updatedAt = nowIso;

      // If provider response is uncertain (e.g. network timeout during email send) or max retries reached,
      // transition to terminal failed state so we NEVER blindly send duplicate external emails!
      if (isUncertain || job.retryCount >= job.maxRetries) {
        job.status = "failed";
        job.completedAt = nowIso;
        if (isUncertain) {
          job.errorMessage = `Uncertain provider delivery (${errMsg}). Automatic retry blocked to prevent duplicate external message; verify in Call/Email Logs before manual retry.`;
        }
        failedCount++;
        logs.push(`❌ Job #${job.id} failed permanently: ${job.errorMessage}`);
      } else {
        // Bounded retry with exponential backoff (5m, 10m, 20m)
        const backoffMinutes = 5 * Math.pow(2, job.retryCount - 1);
        const nextRetry = new Date(nowMs + backoffMinutes * 60 * 1000);
        job.status = "queued";
        job.nextRetryAt = nextRetry.toISOString();
        requeuedRetryCount++;
        logs.push(
          `⚠️ Job #${job.id} attempt #${job.retryCount} failed (${errMsg}). Scheduled retry at ${job.nextRetryAt}.`
        );
      }

      await persistJobToDb(job);
      await syncParentRunFromJobState(job.runId, nowIso);
    } finally {
      activeClaimedJobIds.delete(job.id);
    }
  }

  return {
    processedCount,
    completedCount,
    failedCount,
    heldCount,
    canceledCount,
    requeuedRetryCount,
    claimed: processedCount,
    completed: completedCount,
    failed: failedCount,
    logs,
  };
}

async function syncParentRunFromJobState(
  runId: number,
  nowIso: string,
  latestCompletedStep?: StepExecutionResultMeta
): Promise<void> {
  const run = inMemoryRuns.get(runId);
  if (!run) return;

  if (latestCompletedStep) {
    if (!run.completedStepNumbers) run.completedStepNumbers = [];
    if (!run.completedStepNumbers.includes(latestCompletedStep.stepNumber)) {
      run.completedStepNumbers.push(latestCompletedStep.stepNumber);
    }
    if (!run.stepResults) run.stepResults = [];
    const idx = run.stepResults.findIndex(
      (s) => s.stepNumber === latestCompletedStep.stepNumber
    );
    if (idx >= 0) {
      run.stepResults[idx] = latestCompletedStep;
    } else {
      run.stepResults.push(latestCompletedStep);
    }
    run.logText += `\n✅ [Background Queue Worker @ ${nowIso}] ${latestCompletedStep.detail}`;
  }

  const jobsForRun = Array.from(inMemoryJobs.values()).filter((j) => j.runId === runId);
  if (jobsForRun.length === 0) return;

  const anyFailed = jobsForRun.some((j) => j.status === "failed");
  const anyProcessing = jobsForRun.some((j) => j.status === "processing");
  const anyHeld = jobsForRun.some(
    (j) => j.status === "held_paused" || j.status === "held_overdue"
  );
  const anyQueued = jobsForRun.some((j) => j.status === "queued");
  const allCanceled = jobsForRun.every((j) => j.status === "canceled");

  if (anyFailed) {
    const failedJob = jobsForRun.find((j) => j.status === "failed");
    run.status = "failed";
    run.errorMessage = failedJob?.errorMessage || run.errorMessage || "Queued step failed.";
    run.logText += `\n❌ [Background Queue Worker @ ${nowIso}] Step #${failedJob?.stepNumber} failed: ${run.errorMessage}`;
  } else if (anyProcessing) {
    run.status = "running";
  } else if (anyHeld) {
    run.status = "held_paused";
  } else if (anyQueued) {
    run.status = "queued";
  } else if (allCanceled) {
    run.status = "canceled";
  } else {
    run.status = "completed";
    run.errorMessage = null;
  }

  await persistRunToDb(run);
}

// ─── Cancellation & Held Job Resolution Controls ─────────────────────────────

export async function cancelAutomationRun(
  runId: number,
  reason = "Canceled manually by staff."
): Promise<{
  success: boolean;
  run: AutomationRunRecord;
  canceledJobsCount: number;
}> {
  await hydrateAutomationsFromDbIfNeeded();
  const run = inMemoryRuns.get(runId);
  if (!run) {
    throw new Error(`Automation run #${runId} not found.`);
  }

  const nowIso = new Date().toISOString();
  let canceledJobsCount = 0;

  for (const job of Array.from(inMemoryJobs.values())) {
    if (
      job.runId === runId &&
      (job.status === "queued" || job.status === "held_paused" || job.status === "held_overdue")
    ) {
      job.status = "canceled";
      job.errorMessage = reason;
      job.updatedAt = nowIso;
      job.completedAt = nowIso;
      canceledJobsCount++;
      await persistJobToDb(job);
    }
  }

  run.status = "canceled";
  run.errorMessage = reason;
  run.logText += `\n🛑 Run canceled (${nowIso}): ${reason}`;
  await persistRunToDb(run);

  return {
    success: true,
    run,
    canceledJobsCount,
  };
}

export async function cancelAutomationJob(
  jobId: number,
  reason = "Canceled manually by staff."
): Promise<{
  success: boolean;
  job: AutomationJobRecord;
}> {
  await hydrateAutomationsFromDbIfNeeded();
  const job = inMemoryJobs.get(jobId);
  if (!job) {
    throw new Error(`Automation job #${jobId} not found.`);
  }
  if (job.status === "completed" || job.status === "canceled") {
    throw new Error(`Job #${jobId} is already ${job.status} and cannot be canceled.`);
  }

  const nowIso = new Date().toISOString();
  job.status = "canceled";
  job.errorMessage = reason;
  job.updatedAt = nowIso;
  job.completedAt = nowIso;
  await persistJobToDb(job);
  await syncParentRunFromJobState(job.runId, nowIso);

  return { success: true, job };
}

export async function resolveHeldAutomationJob(
  jobId: number,
  action: "send_now" | "skip" | "cancel"
): Promise<{
  success: boolean;
  job: AutomationJobRecord;
}> {
  await hydrateAutomationsFromDbIfNeeded();
  const job = inMemoryJobs.get(jobId);
  if (!job) {
    throw new Error(`Automation job #${jobId} not found.`);
  }

  const now = new Date();
  const nowIso = now.toISOString();

  if (action === "cancel" || action === "skip") {
    job.status = action === "skip" ? "skipped" : "canceled";
    job.errorMessage =
      action === "skip"
        ? "Skipped manually after overdue pause hold."
        : "Canceled manually after overdue pause hold.";
    job.updatedAt = nowIso;
    job.completedAt = nowIso;
    await persistJobToDb(job);
    await syncParentRunFromJobState(job.runId, nowIso);
    return { success: true, job };
  }

  // action === "send_now"
  job.status = "queued";
  job.scheduledFor = nowIso;
  job.errorMessage = null;
  job.updatedAt = nowIso;
  await persistJobToDb(job);
  await processDueAutomationJobs({ now, limit: 10 });

  return { success: true, job: inMemoryJobs.get(jobId)! };
}

// ─── Appointment Reschedule & Cancellation Synchronization ───────────────────

export async function handleAppointmentScheduleChange(params: {
  appointmentId: number;
  contactId?: number | null;
  newScheduledAt?: Date | string | null;
  status?: string | null;
}): Promise<{
  recalculatedJobsCount: number;
  canceledJobsCount: number;
}> {
  await hydrateAutomationsFromDbIfNeeded();
  const { appointmentId, contactId, newScheduledAt, status } = params;
  const nowIso = new Date().toISOString();

  let recalculatedJobsCount = 0;
  let canceledJobsCount = 0;

  const isCanceledOrNoShow = Boolean(
    status && /cancel|no_show/i.test(String(status).trim())
  );

  for (const job of Array.from(inMemoryJobs.values())) {
    const matchesAppointment =
      job.appointmentId === appointmentId ||
      (job.appointmentId == null &&
        contactId != null &&
        job.contactId === contactId &&
        (job.step.delayAnchor === "before_event" || job.step.delayAnchor === "after_event"));

    if (!matchesAppointment) continue;
    if (
      job.status !== "queued" &&
      job.status !== "held_paused" &&
      job.status !== "held_overdue"
    ) {
      continue;
    }

    if (isCanceledOrNoShow) {
      job.status = "canceled";
      job.errorMessage = `Canceled automatically because appointment #${appointmentId} was marked "${status}".`;
      job.updatedAt = nowIso;
      job.completedAt = nowIso;
      canceledJobsCount++;
      await persistJobToDb(job);
      await syncParentRunFromJobState(job.runId, nowIso);
    } else if (newScheduledAt) {
      const newEventDate = new Date(newScheduledAt);
      if (!isNaN(newEventDate.getTime())) {
        const direction = job.step.delayAnchor === "before_event" ? "subtract" : "add";
        const newSched = addDelayInTimeZone(
          newEventDate,
          job.step.delayValue,
          job.step.delayUnit,
          direction,
          DEFAULT_BUSINESS_TIMEZONE
        );
        job.appointmentId = appointmentId;
        job.eventDate = newEventDate.toISOString();
        job.scheduledFor = newSched.toISOString();
        job.scheduledForFormatted = formatInBusinessTimeZone(newSched);
        if (job.stepType === "task") {
          job.dueDate = newSched.toISOString();
        }
        job.updatedAt = nowIso;
        recalculatedJobsCount++;
        await persistJobToDb(job);

        const parentRun = inMemoryRuns.get(job.runId);
        if (parentRun) {
          parentRun.logText += `\n🔄 Step #${job.stepNumber} ("${job.stepTitle}") rescheduled to ${job.scheduledForFormatted} following appointment #${appointmentId} update.`;
          await persistRunToDb(parentRun);
        }
      }
    }
  }

  return { recalculatedJobsCount, canceledJobsCount };
}

// ─── Scheduled Time Triggers (`session_starts` & `project_date`) ─────────────

export interface ScheduledTriggerSourceCandidate {
  id: number;
  contactId: number;
  title?: string;
  sessionTypeName?: string;
  scheduledAt?: Date | string;
  status?: string;
  projectStartDate?: Date | string | null;
  projectEndDate?: Date | string | null;
  studentRenewalDate?: Date | string | null;
  serviceTermEndsAt?: Date | string | null;
  planExpiresAt?: Date | string | null;
}

export async function evaluateScheduledTimeTriggers(options?: {
  now?: Date | string;
  appointmentsOverride?: ScheduledTriggerSourceCandidate[];
  projectDatesOverride?: ScheduledTriggerSourceCandidate[];
}): Promise<{
  sessionStartsTriggered: number;
  projectDatesTriggered: number;
  configurationWarnings: string[];
}> {
  await hydrateAutomationsFromDbIfNeeded();
  const now = options?.now ? new Date(options.now) : new Date();
  const nowMs = now.getTime();
  // Active window: [now - 15 minutes, now + 5 minutes] — prevents replaying historical backlog on rollout!
  const windowStartMs = nowMs - 15 * 60 * 1000;
  const windowEndMs = nowMs + 5 * 60 * 1000;

  let sessionStartsTriggered = 0;
  let projectDatesTriggered = 0;
  const configurationWarnings: string[] = [];

  const activeAutomations = Array.from(inMemoryAutomations.values()).filter(
    (a) => !deletedAutomationIds.has(a.id) && a.isActive
  );

  // 1. Evaluate `session_starts`
  const hasSessionStartsAuto = activeAutomations.some(
    (a) => a.triggerEvent === "session_starts"
  );
  if (hasSessionStartsAuto) {
    let candidateAppts: ScheduledTriggerSourceCandidate[] = options?.appointmentsOverride || [];
    if (!options?.appointmentsOverride) {
      const db = await getDb();
      if (db) {
        try {
          const rows = await db
            .select()
            .from(appointments)
            .where(eq(appointments.status, "Scheduled"));
          candidateAppts = rows
            .filter((r: any) => r.contactId && r.scheduledAt)
            .map((r: any) => ({
              id: Number(r.id),
              contactId: Number(r.contactId),
              title: r.title,
              scheduledAt: r.scheduledAt,
              status: r.status,
            }));
        } catch {}
      }
    }

    for (const apt of candidateAppts) {
      if (!apt.contactId || !apt.scheduledAt) continue;
      if (apt.status && /cancel|no_show/i.test(apt.status)) continue;
      const startMs = new Date(apt.scheduledAt).getTime();
      if (isNaN(startMs) || startMs < windowStartMs || startMs > windowEndMs) {
        continue; // Outside current window; do not replay old historical appointments
      }

      const res = await triggerAutomationFlow("session_starts", apt.contactId, false, {
        eventKey: `session_starts:apt_${apt.id}`,
        appointmentId: apt.id,
        meetingType: apt.sessionTypeName || apt.title || "Advocacy Session",
        meetingTitle: apt.title || "Advocacy Session",
        eventDate: apt.scheduledAt,
        nowOverride: now,
      });
      if (res.runsCreated && res.runsCreated.length > 0) {
        sessionStartsTriggered += res.runsCreated.length;
      }
    }
  }

  // 2. Evaluate `project_date`
  const projectDateAutos = activeAutomations.filter((a) => a.triggerEvent === "project_date");
  for (const auto of projectDateAutos) {
    const dateSource = auto.triggerConfig?.projectDateSource;
    if (!dateSource) {
      configurationWarnings.push(
        `Automation "${auto.name}" (#${auto.id}) uses Project Date trigger but has no configured Date Source field.`
      );
      continue;
    }

    let candidates: ScheduledTriggerSourceCandidate[] = options?.projectDatesOverride || [];
    if (!options?.projectDatesOverride) {
      const db = await getDb();
      if (db) {
        try {
          if (dateSource === "project_start_date" || dateSource === "project_end_date") {
            const projRows = await db.select().from(projects);
            candidates = projRows
              .filter((p: any) => p.clientId)
              .map((p: any) => ({
                id: Number(p.id),
                contactId: Number(p.clientId),
                projectStartDate: p.startDate,
                projectEndDate: p.endDate,
              }));
          } else {
            const contactRows = await db.select().from(contacts);
            candidates = contactRows.map((c: any) => ({
              id: Number(c.id),
              contactId: Number(c.id),
              studentRenewalDate: c.renewalDate,
              serviceTermEndsAt: c.serviceTermEndsAt,
              planExpiresAt: c.planExpiresAt,
            }));
          }
        } catch {}
      }
    }

    for (const item of candidates) {
      const rawDate =
        dateSource === "project_start_date"
          ? item.projectStartDate
          : dateSource === "project_end_date"
            ? item.projectEndDate
            : dateSource === "student_renewal_date"
              ? item.studentRenewalDate
              : dateSource === "service_term_ends_at"
                ? item.serviceTermEndsAt
                : item.planExpiresAt;
      if (!rawDate) continue;
      const targetDate = new Date(rawDate);
      if (isNaN(targetDate.getTime())) continue;

      // Match same calendar day in business timezone (and not in historical past > 24h)
      const nowDay = formatInBusinessTimeZone(now).split(",")[0];
      const targetDay = formatInBusinessTimeZone(targetDate).split(",")[0];
      if (nowDay !== targetDay) continue;

      const dateKey = targetDate.toISOString().slice(0, 10);
      const res = await triggerSpecificAutomation(auto.id, item.contactId, false, {
        eventKey: `project_date:${dateSource}:${item.id}:${dateKey}`,
        eventDate: targetDate,
        nowOverride: now,
      });
      if (res.runsCreated && res.runsCreated.length > 0) {
        projectDatesTriggered += res.runsCreated.length;
      }
    }
  }

  return {
    sessionStartsTriggered,
    projectDatesTriggered,
    configurationWarnings,
  };
}

// ─── Accurate Payment Triggers Dispatcher (Section 5) ────────────────────────

export interface PaymentTriggerDispatchInput {
  paymentId: string | number;
  contactId: number;
  parentContactId?: number | null;
  invoiceId?: number | string | null;
  status?: string;
  paymentStatus?: string;
  invoiceStatus?: string;
  amountCents: number;
  refundAmountCents?: number;
  priorPriorSuccessfulPaymentsCount?: number;
  invoiceTotalCents?: number | null;
  invoicePaidBeforeCents?: number | null;
  invoicePaidAfterCents?: number | null;
  invoicePreviousBalanceCents?: number | null;
  invoiceRemainingBalanceCents?: number | null;
  remainingBalanceCents?: number | null;
  paymentType?: "one_time" | "deposit" | "installment" | "subscription" | "invoice_payment";
}

export async function dispatchPaymentAutomationTriggers(
  input: PaymentTriggerDispatchInput
): Promise<{
  paymentReceivedFired: boolean;
  firstPaymentPaidFired: boolean;
  invoicePaidInFullFired: boolean;
  firedTriggers: string[];
  skippedReason?: string;
}> {
  await hydrateAutomationsFromDbIfNeeded();

  const rawStatus = input.status || input.paymentStatus || "";
  const normStatus = String(rawStatus).trim().toUpperCase();
  const isSuccessStatus =
    normStatus === "PAID" || normStatus === "SUCCEEDED" || normStatus === "COMPLETED";

  // Guard 1: Failed, pending, zero-amount, or refunded payments never fire payment triggers
  if (
    !isSuccessStatus ||
    Number(input.amountCents || 0) <= 0 ||
    Number(input.refundAmountCents || 0) > 0
  ) {
    return {
      paymentReceivedFired: false,
      firstPaymentPaidFired: false,
      invoicePaidInFullFired: false,
      firedTriggers: [],
      skippedReason: "Payment is not a positive non-refunded successful charge.",
    };
  }

  const { target, student, parent } = await resolveTargetContactAndFamily(input.contactId);
  const targetContactId = student?.id || target?.id || input.contactId;
  const billingAccountId =
    input.parentContactId || parent?.id || student?.parentContactId || targetContactId;

  const stablePaymentKey = String(input.paymentId).trim();

  // 1. `payment_received` fires for every distinct successful payment
  const paymentRcvdEventKey = `payment_received:${stablePaymentKey}`;
  const paymentRes = await triggerAutomationFlow("payment_received", targetContactId, false, {
    eventKey: paymentRcvdEventKey,
  });
  const paymentReceivedFired = !paymentRes.skippedDuplicate;

  // If this exact payment notification was already processed, do not re-evaluate downstream triggers
  if (paymentRes.skippedDuplicate) {
    return {
      paymentReceivedFired: false,
      firstPaymentPaidFired: false,
      invoicePaidInFullFired: false,
      firedTriggers: [],
      skippedReason: `Duplicate payment notification (${stablePaymentKey}) ignored.`,
    };
  }

  // 2. `first_payment_paid` fires ONCE at the billing-account level (`billingAccountId`)
  const accountFirstPaymentKey = `first_payment_account:${billingAccountId}`;
  let firstPaymentPaidFired = false;
  const hasPriorSuccessOverride =
    input.priorPriorSuccessfulPaymentsCount != null &&
    Number(input.priorPriorSuccessfulPaymentsCount) > 0;
  if (!hasPriorSuccessOverride && !recordedFirstPaymentAccounts.has(accountFirstPaymentKey)) {
    recordedFirstPaymentAccounts.add(accountFirstPaymentKey);
    const firstPayRes = await triggerAutomationFlow(
      "first_payment_paid",
      targetContactId,
      false,
      {
        eventKey: accountFirstPaymentKey,
      }
    );
    firstPaymentPaidFired =
      !firstPayRes.skippedDuplicate && (firstPayRes.runsCreated?.length ?? 0) > 0;
  }

  // 3. `invoice_paid_in_full` fires ONLY when an invoice transitions from an outstanding balance (> 0) to fully paid
  let invoicePaidInFullFired = false;
  const prevBal =
    input.invoicePreviousBalanceCents != null
      ? Number(input.invoicePreviousBalanceCents)
      : null;
  const remBal =
    input.invoiceRemainingBalanceCents != null
      ? Number(input.invoiceRemainingBalanceCents)
      : input.remainingBalanceCents != null
        ? Number(input.remainingBalanceCents)
        : null;

  const totalCents =
    input.invoiceTotalCents != null
      ? Number(input.invoiceTotalCents)
      : prevBal != null
        ? prevBal
        : null;
  const paidBeforeCents =
    input.invoicePaidBeforeCents != null ? Number(input.invoicePaidBeforeCents) : 0;
  const paidAfterCents =
    input.invoicePaidAfterCents != null
      ? Number(input.invoicePaidAfterCents)
      : totalCents != null && remBal === 0
        ? totalCents
        : paidBeforeCents + Number(input.amountCents);
  const remainingCents =
    remBal != null
      ? remBal
      : totalCents != null
        ? Math.max(0, totalCents - paidAfterCents)
        : null;

  const transitionedToPaidInFull =
    totalCents != null &&
    totalCents > 0 &&
    paidBeforeCents < totalCents &&
    paidAfterCents >= totalCents &&
    (remainingCents === null || remainingCents <= 0) &&
    input.paymentType !== "deposit";

  if (transitionedToPaidInFull) {
    const invoiceEntityId = input.invoiceId || stablePaymentKey;
    const paidInFullKey = `invoice_paid_in_full:${invoiceEntityId}`;
    if (!recordedPaidInFullInvoices.has(paidInFullKey)) {
      recordedPaidInFullInvoices.add(paidInFullKey);
      const fullRes = await triggerAutomationFlow(
        "invoice_paid_in_full",
        targetContactId,
        false,
        {
          eventKey: paidInFullKey,
        }
      );
      invoicePaidInFullFired = !fullRes.skippedDuplicate;
    }
  }

  const firedTriggers: string[] = [];
  if (paymentReceivedFired) firedTriggers.push("payment_received");
  if (firstPaymentPaidFired) firedTriggers.push("first_payment_paid");
  if (invoicePaidInFullFired) firedTriggers.push("invoice_paid_in_full");

  return {
    paymentReceivedFired,
    firstPaymentPaidFired,
    invoicePaidInFullFired,
    firedTriggers,
  };
}

// ─── Step-Aware Retry Recovery (`retryAutomationRun`) ────────────────────────

export async function retryAutomationRun(
  runId: number,
  options?: { clearFailureFlags?: boolean }
): Promise<{
  success: boolean;
  run: AutomationRunRecord;
  logs: string[];
}> {
  await hydrateAutomationsFromDbIfNeeded();
  const existingRun = inMemoryRuns.get(runId);
  if (!existingRun) {
    throw new Error(`Automation run #${runId} not found.`);
  }

  const auto = inMemoryAutomations.get(existingRun.automationId);
  if (!auto) {
    throw new Error(`Automation workflow #${existingRun.automationId} not found.`);
  }

  if (options?.clearFailureFlags) {
    auto.steps = auto.steps.map((s) => ({
      ...s,
      title: s.title.replace("[FAIL_TEST]", "").trim(),
      config: { ...s.config, simulateFailure: false },
    }));
  }

  const alreadyCompletedSteps = existingRun.completedStepNumbers || [];
  const wasActive = auto.isActive;
  auto.isActive = true;

  const retryRes = await executeAutomationsList({
    automationsToRun: [auto],
    triggerEvent: auto.triggerEvent,
    contactId: existingRun.contactId,
    dryRun: false,
    eventContext: {
      eventKey: existingRun.eventKey || `retry_${runId}_${Date.now()}`,
      forceDuplicate: true,
      skipStepNumbers: alreadyCompletedSteps,
    },
  });

  auto.isActive = wasActive;

  const latestRun = retryRes.runsCreated?.[0];
  const updatedRetryCount = (existingRun.retryCount || 0) + 1;

  if (latestRun && latestRun.id !== existingRun.id) {
    inMemoryRuns.delete(latestRun.id);
    existingRun.status = latestRun.status;
    existingRun.retryCount = updatedRetryCount;
    existingRun.errorMessage = latestRun.errorMessage;
    existingRun.completedStepNumbers = Array.from(
      new Set([...alreadyCompletedSteps, ...(latestRun.completedStepNumbers || [])])
    );
    existingRun.stepResults = latestRun.stepResults || existingRun.stepResults;
    existingRun.logText = `${existingRun.logText}\n─── Retry #${updatedRetryCount} (${new Date().toISOString()}) ───\n${latestRun.logText}`;

    // Re-link any newly queued jobs to existingRun.id
    for (const j of Array.from(inMemoryJobs.values())) {
      if (j.runId === latestRun.id) {
        j.runId = existingRun.id;
        await persistJobToDb(j);
      }
    }

    if (shouldUseDatabasePersistence()) {
      try {
        const db = await getDb();
        if (db) {
          await db
            .delete(honeybookAutomationRuns)
            .where(eq(honeybookAutomationRuns.id, latestRun.id));
        }
      } catch {}
      await persistRunToDb(existingRun);
    }
  }

  return {
    success: existingRun.status === "completed" || existingRun.status === "queued",
    run: existingRun,
    logs: retryRes.logs,
  };
}

// ─── Trigger Requests Persistence ────────────────────────────────────────────

export async function createAutomationTriggerRequest(input: {
  requestedByUserId?: number | null;
  requestedByName?: string;
  description: string;
}): Promise<AutomationTriggerRequestItem> {
  await hydrateAutomationsFromDbIfNeeded();
  const cleanDesc = String(input.description || "").trim();
  if (!cleanDesc) {
    throw new Error("Please enter a description for the requested trigger.");
  }

  const nowIso = new Date().toISOString();
  const id = nextTriggerReqId++;
  const record: AutomationTriggerRequestItem = {
    id,
    requestedByUserId: input.requestedByUserId ?? null,
    requestedByName: input.requestedByName || "Waypoint Staff",
    description: cleanDesc,
    requestedTriggerText: cleanDesc,
    status: "submitted",
    createdAt: nowIso,
  };

  inMemoryTriggerRequests.set(id, record);

  if (shouldUseDatabasePersistence()) {
    await ensureQueueAndRequestTables();
    const cfDb = (globalThis as any).__CF_ENV_DB__;
    if (cfDb) {
      try {
        await cfDb
          .prepare(
            "INSERT INTO automation_trigger_requests (id, requested_by_user_id, requested_by_name, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
          )
          .bind(
            record.id,
            record.requestedByUserId,
            record.requestedByName,
            record.description,
            record.status,
            record.createdAt
          )
          .run();
      } catch {}
    }
  }

  return record;
}

export async function listAutomationTriggerRequests(): Promise<AutomationTriggerRequestItem[]> {
  await hydrateAutomationsFromDbIfNeeded();
  return Array.from(inMemoryTriggerRequests.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─── Test & Inspection Helpers ───────────────────────────────────────────────

export function getAutomationCreatedTasks(): AutomatedTaskRecord[] {
  return [...inMemoryAutomationTasks];
}

export function getAutomationSentEmails(): AutomatedEmailRecord[] {
  return [...inMemoryAutomationEmails];
}

export function getAutomationAttachedFiles(): AutomatedFileRecord[] {
  return [...inMemoryAutomationFiles];
}

export function __resetAutomationsMemoryOnlyForRestartTest(): void {
  hydrationCompleted = false;
  queueTableEnsured = false;
  inMemoryAutomations.clear();
  deletedAutomationIds.clear();
  inMemoryRuns.clear();
  inMemoryJobs.clear();
  inMemoryTriggerRequests.clear();
  processedEventKeys.clear();
  processedJobDedupKeys.clear();
  recordedFirstPaymentAccounts.clear();
  recordedPaidInFullInvoices.clear();
  activeClaimedJobIds.clear();
}

export function __resetAutomationsStateForTests(): void {
  hydrationCompleted = false;
  queueTableEnsured = false;
  nextAutomationId = 2001;
  nextRunId = 5001;
  nextJobId = 9001;
  nextActionRecordId = 8001;
  nextTriggerReqId = 1;
  inMemoryAutomations.clear();
  deletedAutomationIds.clear();
  inMemoryRuns.clear();
  inMemoryJobs.clear();
  inMemoryTriggerRequests.clear();
  processedEventKeys.clear();
  processedJobDedupKeys.clear();
  recordedFirstPaymentAccounts.clear();
  recordedPaidInFullInvoices.clear();
  activeClaimedJobIds.clear();
  inMemoryAutomationTasks.length = 0;
  inMemoryAutomationEmails.length = 0;
  inMemoryAutomationFiles.length = 0;
  __resetSmartFileTemplateTestState();
}

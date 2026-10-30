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
  contracts,
  smartFileAssignments,
  emailTemplates,
  callLogs,
  developerRules,
} from "../../drizzle/schema";
import { getDb } from "./connection";
import { inMemoryContacts } from "./contacts";
import { recordCaseActivity } from "../services/caseActivityService";
import {
  mergeDbTemplatesWithOverlay,
  markTemplateUsed,
} from "../services/emailTemplateCategories";

/**
 * Real SQLite / D1 table definitions matching the actual database table names
 * (`honeybook_automations`, `honeybook_automation_steps`, `honeybook_automation_runs`)
 * while preserving `drizzle/schema.ts` 100% untouched.
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
  lastRunAt?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AutomationRunRecord {
  id: number;
  automationId: number;
  automationName: string;
  triggerEvent: string;
  contactId: number;
  contactName: string;
  status: "completed" | "failed" | "skipped";
  logText: string;
  eventKey: string | null;
  retryCount: number;
  errorMessage?: string | null;
  createdAt: string;
}

export interface AutomationEventContext {
  eventKey?: string;
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
  deliveryMode: "logged_safe";
  createdAt: string;
}

export interface AutomatedFileRecord {
  id: number;
  automationId: number;
  automationName: string;
  contactId: number;
  studentContactId: number;
  fileId: string;
  fileName: string;
  status: "sent";
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
          fileId: "file_ferpa",
          fileName: "FERPA Release Authorization & School Notification Form",
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
          taskTitle: "Send formal notification of advocate representation and records request to school",
          taskPriority: "high",
          hasCondition: false,
        },
      },
    ],
  },
  {
    id: 1005,
    name: "First Payment & Onboarding Activation",
    description:
      "Queues billing authorization verification and activates the Records Review onboarding phase when the initial retainer/plan payment is recorded.",
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
          taskTitle: "Verify initial plan payment receipt and transition student to Records Review stage",
          taskPriority: "high",
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
          taskTitle: "Review uploaded IEP, 504, or psychoeducational evaluation and update Case Compass",
          taskPriority: "high",
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
          hasCondition: false,
        },
      },
      {
        stepNumber: 2,
        type: "email",
        title: "Send Post-Meeting Action Items & Updated Compass",
        delayValue: 2,
        delayUnit: "hours",
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
        delayValue: 1,
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
          hasCondition: false,
        },
      },
    ],
  },
];

const BUILTIN_AUTOMATION_EMAIL_TEMPLATES: Record<
  string,
  { name: string; subject: string; body: string }
> = {
  tpl_intake_welcome: {
    name: "Lead Inquiry Welcome & Discovery Guide",
    subject: "Welcome to Waypoint Advocates! Next Steps for {{student_name}}",
    body: `<p>Hi {{parent_name}},</p><p>Thank you for reaching out to Waypoint Advocates regarding <strong>{{student_name}}</strong>. Please save our main number <strong>1-833-696-4377</strong> so you never miss our call.</p><p>We look forward to learning more about {{student_first_name}}'s educational journey!</p><p>Warm regards,<br/>{{advocate_name}}<br/>Waypoint Advocates</p>`,
  },
  tpl_prep_checklist: {
    name: "IEP Meeting Prep Checklist",
    subject: "Meeting Preparation Checklist for {{student_name}}",
    body: `<p>Hi {{parent_name}},</p><p>Your upcoming session for <strong>{{student_name}}</strong> is confirmed. Before we meet, please upload any latest draft IEPs, 504 plans, or school evaluations to your Family Portal.</p><p>Warm regards,<br/>{{advocate_name}}<br/>Waypoint Advocates</p>`,
  },
  tpl_post_session: {
    name: "Post-Meeting Action Items",
    subject: "Post-Meeting Action Items & Case Compass Update — {{student_name}}",
    body: `<p>Hi {{parent_name}},</p><p>Thank you for meeting with us today regarding <strong>{{student_name}}</strong> ({{case_id}}). Your updated Waypoint Case Compass and next-step action items have been posted to your portal.</p><p>Warm regards,<br/>{{advocate_name}}<br/>Waypoint Advocates</p>`,
  },
  tpl_contract_thanks: {
    name: "Signed Contract Confirmation",
    subject: "Welcome Aboard! Signed Agreement Confirmation for {{student_name}}",
    body: `<p>Hi {{parent_name}},</p><p>We have received your signed advocacy agreement for <strong>{{student_name}}</strong>! Your onboarding checklist and FERPA release authorization are now ready in your Family Portal.</p><p>Warm regards,<br/>{{advocate_name}}<br/>Waypoint Advocates</p>`,
  },
  tpl_review_request: {
    name: "Google Review & Testimonial Request",
    subject: "How did your meeting go for {{student_name}}? Share your experience",
    body: `<p>Hi {{parent_name}},</p><p>It was an honor advocating alongside your family for <strong>{{student_name}}</strong>! If you found our support helpful, would you consider sharing an honest review to help other families find advocacy support?</p><p><a href="{{google_review_url}}">Leave a Google Review</a> | <a href="{{testimonial_url}}">Share a Testimonial</a></p><p>With gratitude,<br/>{{advocate_name}}<br/>Waypoint Advocates</p>`,
  },
};

// ─── Runtime State & DB Hydration ────────────────────────────────────────────

let hydrationCompleted = false;
let nextAutomationId = 2001;
let nextRunId = 5001;
let nextActionRecordId = 8001;

const inMemoryAutomations = new Map<number, AutomationWorkflowRecord>();
const deletedAutomationIds = new Set<number>();
const inMemoryRuns = new Map<number, AutomationRunRecord>();
const processedEventKeys = new Set<string>();

const inMemoryAutomationTasks: AutomatedTaskRecord[] = [];
const inMemoryAutomationEmails: AutomatedEmailRecord[] = [];
const inMemoryAutomationFiles: AutomatedFileRecord[] = [];

function shouldUseDatabasePersistence(): boolean {
  return !process.env.VITEST || Boolean((globalThis as any).__CF_ENV_DB__);
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
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
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
        status: (r.status as "completed" | "failed" | "skipped") || "completed",
        logText: cleanLogText,
        eventKey: meta.eventKey || null,
        retryCount: Number(meta.retryCount ?? 0),
        errorMessage: meta.errorMessage || null,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      };
      inMemoryRuns.set(runId, runRecord);

      if (runRecord.status === "completed" && runRecord.eventKey) {
        processedEventKeys.add(`${autoId}:${runRecord.contactId}:${runRecord.eventKey}`);
      }
    }
  } catch (err) {
    console.warn("[Automations] DB hydration fallback:", err);
    seedDefaultsIntoMemoryIfEmpty();
  }
}

// ─── Public CRUD & Query Operations ──────────────────────────────────────────

export async function listAutomations(): Promise<AutomationWorkflowRecord[]> {
  await hydrateAutomationsFromDbIfNeeded();

  const allRuns = Array.from(inMemoryRuns.values());
  const list = Array.from(inMemoryAutomations.values())
    .filter((a) => !deletedAutomationIds.has(a.id))
    .map((a) => {
      const runsForAuto = allRuns.filter((r) => r.automationId === a.id);
      const lastRun = runsForAuto.sort(
        (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
      )[0];
      return {
        ...a,
        activeRunsCount: runsForAuto.length,
        lastRunAt: lastRun?.createdAt || null,
      };
    });

  return list.sort((a, b) => a.id - b.id);
}

export async function getAutomationById(id: number): Promise<AutomationWorkflowRecord | null> {
  await hydrateAutomationsFromDbIfNeeded();
  if (deletedAutomationIds.has(id)) return null;
  const item = inMemoryAutomations.get(id);
  if (!item) return null;
  const runsForAuto = Array.from(inMemoryRuns.values()).filter((r) => r.automationId === id);
  return {
    ...item,
    activeRunsCount: runsForAuto.length,
  };
}

export async function deleteAutomation(id: number): Promise<{ success: boolean }> {
  await hydrateAutomationsFromDbIfNeeded();
  deletedAutomationIds.add(id);
  inMemoryAutomations.delete(id);

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

  return { success: true };
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

  const now = new Date();
  let automationId = data.id;
  const isUpdatingExisting = Boolean(automationId && inMemoryAutomations.has(automationId));

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

  const existingRecord = inMemoryAutomations.get(automationId);
  const record: AutomationWorkflowRecord = {
    id: automationId,
    name: data.name.trim(),
    description: data.description || "",
    triggerEvent: data.triggerEvent,
    isActive: Boolean(data.isActive),
    triggerConfig: data.triggerConfig || null,
    steps: normalizedSteps,
    createdAt: existingRecord?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };

  inMemoryAutomations.set(automationId, record);

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

  runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const limit = filters?.limit ?? 100;
  return runs.slice(0, limit);
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
  if (!actual) return true; // If caller did not specify a meeting subtype, allow execution

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

async function resolveFieldConditionValue(
  field: string,
  student: any,
  parent: any,
  eventContext?: AutomationEventContext
): Promise<string> {
  const db = await getDb();
  if (field === "contact_status") {
    const parts = [
      student?.portalAccess,
      student?.accountStatus,
      student?.lifecycleStage,
      student?.pipelineStage,
      parent?.portalAccess,
      parent?.accountStatus,
      eventContext?.stageTo,
    ]
      .filter(Boolean)
      .map((s) => String(s).trim());
    return parts.length > 0 ? parts.join(" | ") : "lead";
  }

  if (field === "student_tag") {
    const parts = [
      student?.diagnosis,
      student?.iepEligibility,
      student?.planType,
      student?.gradeLevel,
      student?.notes,
      parent?.notes,
      eventContext?.tagAdded,
    ]
      .filter(Boolean)
      .map((s) => String(s).trim());
    return parts.join(" | ");
  }

  if (field === "contract_status") {
    const explicitStatus = student?.contractStatus || parent?.contractStatus;
    if (explicitStatus) {
      const lower = String(explicitStatus).toLowerCase();
      if (lower === "signed" || lower === "active" || lower === "renewed") {
        return `${explicitStatus} | signed`;
      }
      return String(explicitStatus);
    }
    if (db) {
      try {
        const rows = await db
          .select()
          .from(contracts)
          .where(eq(contracts.clientId, parent?.id || student?.id));
        const hasSigned = rows.some(
          (c: any) =>
            String(c.status || "").toLowerCase() === "signed" || Boolean(c.clientSignedAt)
        );
        if (hasSigned) return "signed";
        if (rows.length > 0) return String(rows[0].status || "pending").toLowerCase();
      } catch {}
    }
    return "unsigned";
  }

  return "";
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

function computeScheduledDate(
  step: AutomationStepItem,
  eventContext?: AutomationEventContext
): Date {
  const val = Number(step.delayValue || 0);
  const unit = (step.delayUnit || "days").toLowerCase();
  let offsetMs = 0;
  if (unit === "minutes") offsetMs = val * 60 * 1000;
  else if (unit === "hours") offsetMs = val * 60 * 60 * 1000;
  else if (unit === "weeks") offsetMs = val * 7 * 24 * 60 * 60 * 1000;
  else offsetMs = (val || 1) * 24 * 60 * 60 * 1000;

  const anchorDate = eventContext?.eventDate ? new Date(eventContext.eventDate) : new Date();
  const baseMs = isNaN(anchorDate.getTime()) ? Date.now() : anchorDate.getTime();

  if (step.delayAnchor === "before_event" && eventContext?.eventDate) {
    return new Date(baseMs - offsetMs);
  }
  return new Date(baseMs + offsetMs);
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

async function resolveAutomationEmailTemplate(config: Record<string, any>): Promise<{
  id: string | number;
  name: string;
  subject: string;
  body: string;
}> {
  const requestedId = String(config?.templateId || "").trim();
  const requestedName = String(config?.templateName || "").trim();

  // 1. Check built-in starter templates first if ID starts with tpl_
  if (requestedId && BUILTIN_AUTOMATION_EMAIL_TEMPLATES[requestedId]) {
    const b = BUILTIN_AUTOMATION_EMAIL_TEMPLATES[requestedId];
    return { id: requestedId, name: b.name, subject: b.subject, body: b.body };
  }

  // 2. Check saved CRM email templates (DB + Category Overlay)
  try {
    const db = await getDb();
    let dbRows: any[] = [];
    if (db) {
      try {
        dbRows = await db.select().from(emailTemplates);
      } catch {}
    }
    const allTemplates = mergeDbTemplatesWithOverlay(dbRows);

    const numericId = Number(requestedId);
    if (!isNaN(numericId) && numericId > 0) {
      const byId = allTemplates.find((t) => Number(t.id) === numericId);
      if (byId) {
        await markTemplateUsed(byId.id);
        return { id: byId.id, name: byId.name, subject: byId.subject, body: byId.body };
      }
    }

    if (requestedName) {
      const lowerName = requestedName.toLowerCase();
      const byName = allTemplates.find(
        (t) =>
          t.name.toLowerCase() === lowerName ||
          t.name.toLowerCase().includes(lowerName) ||
          lowerName.includes(t.name.toLowerCase())
      );
      if (byName) {
        await markTemplateUsed(byName.id);
        return { id: byName.id, name: byName.name, subject: byName.subject, body: byName.body };
      }
    }
  } catch {}

  // 3. Fallback starter template
  return {
    id: requestedId || "tpl_default",
    name: requestedName || "Waypoint Client Update",
    subject: `${requestedName || "Waypoint Advocates Update"} — {{student_name}}`,
    body: `<p>Hi {{parent_name}},</p><p>Here is an automated update from Waypoint Advocates regarding <strong>{{student_name}}</strong>: ${requestedName || "Next Steps"}.</p>`,
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
  logs: string[];
  runsCreated?: AutomationRunRecord[];
  skippedDuplicate?: boolean;
}> {
  await hydrateAutomationsFromDbIfNeeded();
  const db = await getDb();

  const logs: string[] = [];
  logs.push(
    `🚀 Initiating workflow trigger: "${triggerEvent}" for target contact ID: ${contactId}`
  );

  const { target, student, parent } = await resolveTargetContactAndFamily(contactId);
  if (!target || !student) {
    logs.push(`❌ Target contact profile not found. Cancelling run.`);
    return { success: false, logs, runsCreated: [] };
  }

  const studentName = `${student.firstName || ""} ${student.lastName || ""}`.trim() || `Student #${student.id}`;
  const parentName =
    `${parent?.firstName || ""} ${parent?.lastName || ""}`.trim() || studentName;
  logs.push(`🔗 Student Target: ${studentName} (Parent/Family: ${parentName})`);

  // Match active automations for this triggerEvent
  const matchedAutomations = Array.from(inMemoryAutomations.values()).filter(
    (a) =>
      !deletedAutomationIds.has(a.id) &&
      a.triggerEvent === triggerEvent &&
      Boolean(a.isActive) === true
  );

  if (matchedAutomations.length === 0) {
    logs.push(`⚠️ No active automations matching trigger "${triggerEvent}" configured.`);
    return { success: true, logs, runsCreated: [] };
  }

  const runsCreated: AutomationRunRecord[] = [];
  let anySkippedDuplicate = false;

  for (const auto of matchedAutomations) {
    const autoLogs: string[] = [
      `🚀 Trigger "${triggerEvent}" matched workflow "${auto.name}" for ${studentName}`,
    ];
    logs.push(`⚙️ Processing matching workflow sequence: "${auto.name}"`);

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
    const effectiveEventKey =
      eventContext?.eventKey || `${triggerEvent}:${contactId}`;
    const dedupKey = `${auto.id}:${contactId}:${effectiveEventKey}`;

    if (!dryRun && !eventContext?.forceDuplicate && processedEventKeys.has(dedupKey)) {
      const dupMsg = `⏭️ Duplicate execution prevented for workflow "${auto.name}" (event key: ${effectiveEventKey}).`;
      logs.push(dupMsg);
      anySkippedDuplicate = true;
      continue;
    }

    const steps = [...(auto.steps || [])].sort((a, b) => a.stepNumber - b.stepNumber);
    let runStatus: "completed" | "failed" | "skipped" = "completed";
    let executedStepsCount = 0;
    let errorMessage: string | null = null;

    for (const step of steps) {
      const config = step.config || {};
      let conditionPassed = true;

      if (config.hasCondition) {
        const field = config.conditionField || "student_tag";
        const val = String(config.conditionValue || "");
        const op = config.conditionOperator || "equals";

        const resolvedFieldVal = await resolveFieldConditionValue(
          field,
          student,
          parent,
          eventContext
        );
        conditionPassed = evaluateConditionRule(resolvedFieldVal, op, val);

        const condMsg = `🔍 [Rule Check] Evaluating condition: If ${field} ${op} "${val}" (Resolved: "${resolvedFieldVal}") -> ${
          conditionPassed ? "PASSED" : "SKIPPED"
        }`;
        logs.push(condMsg);
        autoLogs.push(condMsg);
      }

      if (!conditionPassed) {
        const skipStepMsg = `⚠️ [Step ${step.stepNumber}] Action SKIPPED. Condition rules not satisfied.`;
        logs.push(skipStepMsg);
        autoLogs.push(skipStepMsg);
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
        if (step.type === "email") {
          const tpl = await resolveAutomationEmailTemplate(config);
          const msg = `📧 [Dry Run] Email template "${tpl.name}" would send to ${parentName} (re: ${studentName})`;
          const linkMsg = `   └─ Resolved links -> Google: ${googleUrl} | Testimonial: ${testimonialUrl}`;
          logs.push(msg, linkMsg);
          autoLogs.push(msg, linkMsg);
        } else if (step.type === "file") {
          const msg = `📄 [Dry Run] Smart File "${
            config.fileName || "Form"
          }" would attach to ${studentName}'s portal`;
          logs.push(msg);
          autoLogs.push(msg);
        } else {
          const msg = `✅ [Dry Run] Task "${
            config.taskTitle || step.title
          }" would create on ${studentName}'s project`;
          logs.push(msg);
          autoLogs.push(msg);
        }
        continue;
      }

      // Real execution with per-step error handling
      try {
        if (config.simulateFailure === true || step.title.includes("[FAIL_TEST]")) {
          throw new Error(
            config.failureReason || `Simulated step execution failure in "${step.title}"`
          );
        }

        if (step.type === "task") {
          const dueDate = computeScheduledDate(step, eventContext);
          const priority: "High" | "Medium" | "Low" =
            config.taskPriority === "high"
              ? "High"
              : config.taskPriority === "low"
                ? "Low"
                : "Medium";
          const taskTitle = step.title;
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
                dueDate,
                assignmentSource: "system_automation",
                assignedByName: auto.name,
              });

              await db.insert(internalTasks).values({
                title: taskTitle,
                description: taskDesc,
                status: "not_started",
                projectId: projId,
                dueDate,
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
            dueDate,
            assignmentSource: "system_automation",
            createdAt: new Date().toISOString(),
          });

          try {
            await recordCaseActivity({
              studentContactId: student.id,
              caseId: student.caseId || `WP-${student.id}`,
              eventType: "next_step",
              title: `Automated Task Created: ${taskTitle}`,
              description: `Workflow "${auto.name}" created CRM task "${taskTitle}" (${priority} Priority, Due ${dueDate.toLocaleDateString()}).`,
              whyReason: `Triggered by ${triggerEvent}`,
              ownerName: "Waypoint Automation Engine",
              ownerRole: "System Automation",
              categoryColor: "amber",
              isActionNeeded: true,
              eventDate: new Date(),
            });
          } catch {}

          const msg = `✅ Created CRM Task: "${taskTitle}" linked to project ID ${projId}`;
          logs.push(msg);
          autoLogs.push(msg);
          executedStepsCount++;
        } else if (step.type === "email") {
          const tpl = await resolveAutomationEmailTemplate(config);
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
          const personalizedSubject = personalizeTemplateText(tpl.subject, tokens);
          const personalizedBody = personalizeTemplateText(tpl.body, tokens);
          const recipientEmail =
            parent?.email || student?.email || `family-${student.id}@waypointadvocates.com`;

          // Safe internal logging (never sends live external emails in tests)
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
            deliveryMode: "logged_safe",
            createdAt: new Date().toISOString(),
          });

          if (shouldUseDatabasePersistence() && db) {
            try {
              const autoMsgId = `auto-email-${auto.id}-${student.id}-${Date.now()}`;
              await db.insert(callLogs).values({
                ownerId: student.ownerId || 1,
                contactId: parent?.id || student.id,
                studentId: student.id,
                quoCallId: `gmail:${autoMsgId}`,
                direction: "outbound",
                eventType: "email.sent",
                summary: personalizedSubject,
                transcript: personalizedBody,
                smsBody: personalizedBody.replace(/<[^>]+>/g, " ").trim(),
                status: "assigned",
                rawPayload: {
                  id: autoMsgId,
                  channel: "email",
                  gmailMessageId: autoMsgId,
                  gmailThreadId: `thread-auto-${student.id}`,
                  fromEmail: "clientcare@waypointadvocates.com",
                  fromName: "Waypoint Advocates",
                  toEmails: [recipientEmail],
                  subject: personalizedSubject,
                  bodyHtml: personalizedBody,
                  timestamp: new Date().toISOString(),
                  matchStatus: "matched",
                  parentContactId: parent?.id || null,
                  parentName,
                  studentContactId: student.id,
                  studentName,
                  deliveryStatus: "automated_logged",
                  templateId: tpl.id,
                  automationId: auto.id,
                },
                assignedAt: new Date(),
              });
            } catch {}
          }

          try {
            await recordCaseActivity({
              studentContactId: student.id,
              caseId: student.caseId || `WP-${student.id}`,
              eventType: "client_contact",
              title: `Automated Email Logged: ${personalizedSubject}`,
              description: `Workflow "${auto.name}" prepared template "${tpl.name}" for ${parentName} (${recipientEmail}).`,
              whyReason: `Triggered by ${triggerEvent}`,
              ownerName: "Waypoint Automation Engine",
              ownerRole: "System Automation",
              categoryColor: "blue",
              eventDate: new Date(),
            });
          } catch {}

          const msg = `📧 Dispatched template "${tpl.name}" ("${personalizedSubject}") to ${recipientEmail}.`;
          const linkMsg = `   └─ Resolved links -> Google: ${googleUrl} | Testimonial: ${testimonialUrl}`;
          logs.push(msg, linkMsg);
          autoLogs.push(msg, linkMsg);
          executedStepsCount++;
        } else if (step.type === "file") {
          const fileName =
            config.fileName || eventContext?.fileName || "Intake & Authorization Packet";
          const fileId = String(config.fileId || "file_intake");

          if (shouldUseDatabasePersistence() && db) {
            try {
              await db.insert(smartFileAssignments).values({
                templateId: Number(fileId.replace(/\D/g, "")) || 1,
                ownerId: student.ownerId || 1,
                contactId: parent?.id || student.id,
                studentContactId: student.id,
                status: "sent",
                sentAt: new Date(),
                internalNotes: `Attached by automation "${auto.name}": ${fileName}`,
              });
            } catch {}
          }

          inMemoryAutomationFiles.push({
            id: nextActionRecordId++,
            automationId: auto.id,
            automationName: auto.name,
            contactId,
            studentContactId: student.id,
            fileId,
            fileName,
            status: "sent",
            createdAt: new Date().toISOString(),
          });

          try {
            await recordCaseActivity({
              studentContactId: student.id,
              caseId: student.caseId || `WP-${student.id}`,
              eventType: "next_step",
              title: `Smart File Attached: ${fileName}`,
              description: `Workflow "${auto.name}" attached Smart File "${fileName}" to ${studentName}'s portal workspace.`,
              whyReason: `Triggered by ${triggerEvent}`,
              ownerName: "Waypoint Automation Engine",
              ownerRole: "System Automation",
              categoryColor: "purple",
              eventDate: new Date(),
            });
          } catch {}

          const msg = `📄 Attached smart file "${fileName}" inside student portal workspace.`;
          logs.push(msg);
          autoLogs.push(msg);
          executedStepsCount++;
        }
      } catch (stepErr: any) {
        runStatus = "failed";
        errorMessage = stepErr?.message || "Step execution failed";
        const errMsg = `❌ [Step ${step.stepNumber}] Action FAILED: ${errorMessage}`;
        logs.push(errMsg);
        autoLogs.push(errMsg);
      }
    }

    if (runStatus === "completed" && executedStepsCount === 0 && steps.length > 0) {
      runStatus = "skipped";
    }

    if (!dryRun) {
      if (runStatus === "completed") {
        processedEventKeys.add(dedupKey);
      }

      const nowIso = new Date().toISOString();
      let assignedRunId = nextRunId++;
      const cleanLogText = autoLogs.join("\n");
      const meta = {
        eventKey: effectiveEventKey,
        retryCount: 0,
        triggerEvent,
        automationName: auto.name,
        contactName: studentName,
        errorMessage,
      };

      if (shouldUseDatabasePersistence() && db) {
        try {
          await db.insert(honeybookAutomationRuns).values({
            id: assignedRunId,
            automationId: auto.id,
            contactId,
            status: runStatus,
            logText: formatRunLogWithMeta(cleanLogText, meta),
            createdAt: new Date(nowIso),
          });
        } catch {}
      }

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
        createdAt: nowIso,
      };
      inMemoryRuns.set(assignedRunId, runRecord);
      runsCreated.push(runRecord);
    }
  }

  return {
    success: runsCreated.every((r) => r.status !== "failed"),
    logs,
    runsCreated,
    skippedDuplicate: anySkippedDuplicate,
  };
}

/**
 * Retries a failed or skipped automation run and updates its execution history record.
 */
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

  // If requested, clear temporary simulateFailure flags on the workflow steps before retrying
  if (options?.clearFailureFlags) {
    auto.steps = auto.steps.map((s) => ({
      ...s,
      title: s.title.replace("[FAIL_TEST]", "").trim(),
      config: { ...s.config, simulateFailure: false },
    }));
  }

  // Temporarily ensure the workflow is active for the explicit retry run
  const wasActive = auto.isActive;
  auto.isActive = true;
  const retryRes = await triggerAutomationFlow(
    auto.triggerEvent,
    existingRun.contactId,
    false,
    {
      eventKey: existingRun.eventKey || `retry_${runId}_${Date.now()}`,
      forceDuplicate: true,
    }
  );
  auto.isActive = wasActive;

  const latestRun = retryRes.runsCreated?.[0];
  const updatedRetryCount = (existingRun.retryCount || 0) + 1;

  if (latestRun && latestRun.id !== existingRun.id) {
    // Merge into the original run record so the history entry reflects the retry state cleanly
    inMemoryRuns.delete(latestRun.id);
    existingRun.status = latestRun.status;
    existingRun.retryCount = updatedRetryCount;
    existingRun.errorMessage = latestRun.errorMessage;
    existingRun.logText = `${existingRun.logText}\n─── Retry #${updatedRetryCount} (${new Date().toISOString()}) ───\n${latestRun.logText}`;

    if (shouldUseDatabasePersistence()) {
      try {
        const db = await getDb();
        if (db) {
          await db
            .delete(honeybookAutomationRuns)
            .where(eq(honeybookAutomationRuns.id, latestRun.id));
          await db
            .update(honeybookAutomationRuns)
            .set({
              status: existingRun.status,
              logText: formatRunLogWithMeta(existingRun.logText, {
                eventKey: existingRun.eventKey,
                retryCount: updatedRetryCount,
                triggerEvent: existingRun.triggerEvent,
                automationName: existingRun.automationName,
                contactName: existingRun.contactName,
                errorMessage: existingRun.errorMessage,
              }),
            })
            .where(eq(honeybookAutomationRuns.id, existingRun.id));
        }
      } catch {}
    }
  }

  return {
    success: existingRun.status === "completed",
    run: existingRun,
    logs: retryRes.logs,
  };
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
  inMemoryAutomations.clear();
  deletedAutomationIds.clear();
  inMemoryRuns.clear();
  processedEventKeys.clear();
}

export function __resetAutomationsStateForTests(): void {
  hydrationCompleted = false;
  nextAutomationId = 2001;
  nextRunId = 5001;
  nextActionRecordId = 8001;
  inMemoryAutomations.clear();
  deletedAutomationIds.clear();
  inMemoryRuns.clear();
  processedEventKeys.clear();
  inMemoryAutomationTasks.length = 0;
  inMemoryAutomationEmails.length = 0;
  inMemoryAutomationFiles.length = 0;
}

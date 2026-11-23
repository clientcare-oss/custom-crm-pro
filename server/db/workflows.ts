import { eq, asc } from "drizzle-orm";
import { workflows, emailTemplates } from "../../drizzle/schema";
import { getDb } from "./connection";
import { queryCloudflareD1, getLocalDbClient } from "../_core/d1Client";
import {
  parseWorkflowCanvasData,
  evaluateTransitionApprovalGates,
  type WorkflowDocumentV2,
} from "../../shared/workflowModel";
import {
  listPipelineStages,
  listPipelineCards,
  updatePipelineCardStage,
} from "./pipeline";
import {
  listAutomations,
  listAvailableSmartFileTemplatesForAutomations,
} from "./automations";
import { DEFAULT_PLAN_DEFINITIONS } from "./planMatrix";
import { listServices } from "./services";
import { createCaseActivityItem } from "./caseActivity";
import type { StaffAccessProfile } from "../_core/staffAccess";

export interface CaseGuideStepProgressRecord {
  workflowId: number;
  contactId: number;
  stageId: string;
  stepId: string;
  completed: boolean;
  completedBy?: string | null;
  completedAt?: string | null;
  note?: string | null;
}

export interface CaseGateApprovalRecord {
  workflowId: number;
  contactId: number;
  gateId: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string | null;
  approvedByRole?: string | null;
  approvedAt?: string | null;
  note?: string | null;
}

export interface CaseWorkflowProgressBundle {
  workflowId: number;
  contactId: number;
  steps: CaseGuideStepProgressRecord[];
  gates: CaseGateApprovalRecord[];
}

// ─── In-memory store (used in test mode & as fast write-through cache) ───────
const inMemoryStepProgress = new Map<string, CaseGuideStepProgressRecord>();
const inMemoryGateApprovals = new Map<string, CaseGateApprovalRecord>();
const inMemoryWorkflows = new Map<number, any>();
let tablesEnsured = false;

function stepKey(workflowId: number, contactId: number, stageId: string, stepId: string) {
  return `${workflowId}:${contactId}:${stageId}:${stepId}`;
}

function gateKey(workflowId: number, contactId: number, gateId: string) {
  return `${workflowId}:${contactId}:${gateId}`;
}

function isTestMode(): boolean {
  return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
}

async function execRawSql(sql: string, params: any[] = []): Promise<any[]> {
  if (isTestMode()) return [];
  const cfDb = (globalThis as any).__CF_ENV_DB__;
  if (cfDb) {
    const stmt = cfDb.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const res = await bound.all();
    return res?.results || [];
  }
  try {
    const res = await queryCloudflareD1(sql, params);
    return Array.isArray(res) ? res : res?.results || [];
  } catch {
    try {
      const localRes = await getLocalDbClient().execute({ sql, args: params });
      return (localRes.rows as any[]) || [];
    } catch {
      return [];
    }
  }
}

async function ensureProgressTables(): Promise<void> {
  if (tablesEnsured || isTestMode()) return;
  try {
    await execRawSql(`
      CREATE TABLE IF NOT EXISTS workflow_case_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL,
        contact_id INTEGER NOT NULL,
        stage_id TEXT NOT NULL,
        step_id TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        completed_by TEXT,
        completed_at TEXT,
        note TEXT,
        UNIQUE(workflow_id, contact_id, stage_id, step_id)
      )
    `);
    await execRawSql(`
      CREATE TABLE IF NOT EXISTS workflow_gate_approvals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL,
        contact_id INTEGER NOT NULL,
        gate_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        approved_by TEXT,
        approved_by_role TEXT,
        approved_at TEXT,
        note TEXT,
        UNIQUE(workflow_id, contact_id, gate_id)
      )
    `);
    tablesEnsured = true;
  } catch (err) {
    console.warn("[Workflows DB] Table ensure warning:", err);
  }
}

export function __resetWorkflowProgressTestState(): void {
  inMemoryStepProgress.clear();
  inMemoryGateApprovals.clear();
  inMemoryWorkflows.clear();
}

export function __seedWorkflowForTest(wf: {
  id: number;
  title: string;
  canvasData: string;
  description?: string | null;
  category?: string | null;
  color?: string;
}): void {
  inMemoryWorkflows.set(wf.id, {
    ...wf,
    color: wf.color || "#3b82f6",
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function getWorkflowRecordById(id: number): Promise<any | null> {
  if (inMemoryWorkflows.has(id)) {
    return inMemoryWorkflows.get(id);
  }
  const database = await getDb();
  if (!database) return null;
  const [wf] = await database.select().from(workflows).where(eq(workflows.id, id));
  return wf || null;
}

export async function listWorkflowRecords(): Promise<any[]> {
  if (isTestMode() && inMemoryWorkflows.size > 0) {
    return Array.from(inMemoryWorkflows.values());
  }
  const database = await getDb();
  if (!database) return Array.from(inMemoryWorkflows.values());
  return await database.select().from(workflows).orderBy(asc(workflows.createdAt));
}

export async function getCaseWorkflowProgress(
  workflowId: number,
  contactId: number
): Promise<CaseWorkflowProgressBundle> {
  await ensureProgressTables();

  const stepsMap = new Map<string, CaseGuideStepProgressRecord>();
  const gatesMap = new Map<string, CaseGateApprovalRecord>();

  // Hydrate from DB first
  if (!isTestMode()) {
    try {
      const stepRows = await execRawSql(
        `SELECT workflow_id, contact_id, stage_id, step_id, completed, completed_by, completed_at, note
         FROM workflow_case_progress WHERE workflow_id = ? AND contact_id = ?`,
        [workflowId, contactId]
      );
      for (const r of stepRows) {
        const rec: CaseGuideStepProgressRecord = {
          workflowId: Number(r.workflow_id),
          contactId: Number(r.contact_id),
          stageId: String(r.stage_id),
          stepId: String(r.step_id),
          completed: Boolean(r.completed),
          completedBy: r.completed_by ? String(r.completed_by) : null,
          completedAt: r.completed_at ? String(r.completed_at) : null,
          note: r.note ? String(r.note) : null,
        };
        stepsMap.set(stepKey(rec.workflowId, rec.contactId, rec.stageId, rec.stepId), rec);
      }

      const gateRows = await execRawSql(
        `SELECT workflow_id, contact_id, gate_id, status, approved_by, approved_by_role, approved_at, note
         FROM workflow_gate_approvals WHERE workflow_id = ? AND contact_id = ?`,
        [workflowId, contactId]
      );
      for (const r of gateRows) {
        const rec: CaseGateApprovalRecord = {
          workflowId: Number(r.workflow_id),
          contactId: Number(r.contact_id),
          gateId: String(r.gate_id),
          status: (r.status === "approved" || r.status === "rejected" ? r.status : "pending"),
          approvedBy: r.approved_by ? String(r.approved_by) : null,
          approvedByRole: r.approved_by_role ? String(r.approved_by_role) : null,
          approvedAt: r.approved_at ? String(r.approved_at) : null,
          note: r.note ? String(r.note) : null,
        };
        gatesMap.set(gateKey(rec.workflowId, rec.contactId, rec.gateId), rec);
      }
    } catch (err) {
      console.warn("[Workflows DB] Progress read warning:", err);
    }
  }

  // Merge in-memory updates
  for (const rec of Array.from(inMemoryStepProgress.values())) {
    if (rec.workflowId === workflowId && rec.contactId === contactId) {
      stepsMap.set(stepKey(rec.workflowId, rec.contactId, rec.stageId, rec.stepId), rec);
    }
  }
  for (const rec of Array.from(inMemoryGateApprovals.values())) {
    if (rec.workflowId === workflowId && rec.contactId === contactId) {
      gatesMap.set(gateKey(rec.workflowId, rec.contactId, rec.gateId), rec);
    }
  }

  return {
    workflowId,
    contactId,
    steps: Array.from(stepsMap.values()),
    gates: Array.from(gatesMap.values()),
  };
}

export async function setCaseGuideStepCompletion(params: {
  workflowId: number;
  contactId: number;
  stageId: string;
  stepId: string;
  stepTitle?: string;
  completed: boolean;
  actorName: string;
  actorRole?: string;
  note?: string;
}): Promise<CaseGuideStepProgressRecord> {
  await ensureProgressTables();
  const nowIso = new Date().toISOString();
  const record: CaseGuideStepProgressRecord = {
    workflowId: params.workflowId,
    contactId: params.contactId,
    stageId: params.stageId,
    stepId: params.stepId,
    completed: params.completed,
    completedBy: params.completed ? params.actorName : null,
    completedAt: params.completed ? nowIso : null,
    note: params.note ?? null,
  };

  inMemoryStepProgress.set(
    stepKey(record.workflowId, record.contactId, record.stageId, record.stepId),
    record
  );

  if (!isTestMode()) {
    try {
      await execRawSql(
        `INSERT INTO workflow_case_progress (workflow_id, contact_id, stage_id, step_id, completed, completed_by, completed_at, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(workflow_id, contact_id, stage_id, step_id) DO UPDATE SET
           completed = excluded.completed,
           completed_by = excluded.completed_by,
           completed_at = excluded.completed_at,
           note = excluded.note`,
        [
          record.workflowId,
          record.contactId,
          record.stageId,
          record.stepId,
          record.completed ? 1 : 0,
          record.completedBy,
          record.completedAt,
          record.note,
        ]
      );
    } catch (err) {
      console.warn("[Workflows DB] Step save warning:", err);
    }

    if (params.completed) {
      try {
        await createCaseActivityItem({
          studentContactId: params.contactId,
          eventType: "task_completed",
          title: `Workflow Guide Step Completed: ${params.stepTitle || params.stepId}`,
          description: params.note || `Marked complete by ${params.actorName} in Workflow Guide.`,
          ownerName: params.actorName,
          ownerRole: params.actorRole || "Advocate",
          isCompleted: true,
          categoryColor: "blue",
          eventDate: new Date(),
        });
      } catch {}
    }
  }

  return record;
}

export function doesStaffSatisfyGateRole(
  staffAccess: StaffAccessProfile | null | undefined,
  requiredRole: string
): boolean {
  if (!staffAccess) return false;
  if (staffAccess.isProtectedOwner || staffAccess.hasAdminAccess) return true;
  if (staffAccess.primaryRole === "management" || staffAccess.additionalRoles?.includes("management")) {
    return true;
  }
  const req = requiredRole.toLowerCase();
  const roles = [staffAccess.primaryRole, ...(staffAccess.additionalRoles || [])].map((r) =>
    String(r).toLowerCase()
  );
  if (req.includes("management") || req.includes("admin")) {
    return roles.includes("management");
  }
  if (req.includes("advocate")) {
    return roles.includes("advocate") || roles.includes("management");
  }
  if (req.includes("operation") || req.includes("billing")) {
    return roles.includes("operations") || roles.includes("management");
  }
  if (req.includes("documentation")) {
    return roles.includes("documentation") || roles.includes("advocate") || roles.includes("management");
  }
  if (req.includes("intake") || req.includes("call")) {
    return roles.includes("call_center") || roles.includes("advocate") || roles.includes("management");
  }
  return staffAccess.isStaff;
}

export async function submitCaseGateApproval(params: {
  workflowId: number;
  contactId: number;
  gateId: string;
  status: "approved" | "rejected" | "pending";
  note?: string;
  actorName: string;
  actorRole: string;
  staffAccess?: StaffAccessProfile | null;
}): Promise<{
  success: boolean;
  record?: CaseGateApprovalRecord;
  error?: string;
}> {
  await ensureProgressTables();
  const wf = await getWorkflowRecordById(params.workflowId);
  if (!wf) {
    return { success: false, error: "Workflow definition not found." };
  }
  const doc: WorkflowDocumentV2 = parseWorkflowCanvasData(wf.canvasData);
  const gate = doc.approvalGates.find((g) => g.id === params.gateId);
  if (!gate) {
    return { success: false, error: "Approval gate not found in workflow definition." };
  }

  // Enforce required role authorization on backend
  if (
    params.status === "approved" &&
    params.staffAccess &&
    !doesStaffSatisfyGateRole(params.staffAccess, gate.requiredRole)
  ) {
    return {
      success: false,
      error: `Approval requires role "${gate.requiredRole}". Your current role (${params.actorRole}) is not authorized to approve this gate.`,
    };
  }

  // Enforce required guide steps completion before approving gate
  if (params.status === "approved" && gate.requiredStepIds.length > 0) {
    const progress = await getCaseWorkflowProgress(params.workflowId, params.contactId);
    const completedSet = new Set(
      progress.steps.filter((s) => s.completed).map((s) => s.stepId)
    );
    const srcStage = doc.stages.find((s) => s.id === gate.fromStageId);
    const missing = gate.requiredStepIds.filter((sid) => !completedSet.has(sid));
    if (missing.length > 0) {
      const missingTitles = missing.map(
        (sid) => srcStage?.guideSteps.find((gs) => gs.id === sid)?.title || sid
      );
      return {
        success: false,
        error: `Complete required guide steps before approving "${gate.title}": ${missingTitles.join(", ")}.`,
      };
    }
  }

  const nowIso = new Date().toISOString();
  const record: CaseGateApprovalRecord = {
    workflowId: params.workflowId,
    contactId: params.contactId,
    gateId: params.gateId,
    status: params.status,
    approvedBy: params.status === "pending" ? null : params.actorName,
    approvedByRole: params.status === "pending" ? null : params.actorRole,
    approvedAt: params.status === "pending" ? null : nowIso,
    note: params.note ?? null,
  };

  inMemoryGateApprovals.set(
    gateKey(record.workflowId, record.contactId, record.gateId),
    record
  );

  if (!isTestMode()) {
    try {
      await execRawSql(
        `INSERT INTO workflow_gate_approvals (workflow_id, contact_id, gate_id, status, approved_by, approved_by_role, approved_at, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(workflow_id, contact_id, gate_id) DO UPDATE SET
           status = excluded.status,
           approved_by = excluded.approved_by,
           approved_by_role = excluded.approved_by_role,
           approved_at = excluded.approved_at,
           note = excluded.note`,
        [
          record.workflowId,
          record.contactId,
          record.gateId,
          record.status,
          record.approvedBy,
          record.approvedByRole,
          record.approvedAt,
          record.note,
        ]
      );
    } catch (err) {
      console.warn("[Workflows DB] Gate approval save warning:", err);
    }

    try {
      await createCaseActivityItem({
        studentContactId: params.contactId,
        eventType: "strategy_decision",
        title: `Approval Gate ${params.status === "approved" ? "Approved" : params.status === "rejected" ? "Rejected" : "Reset"}: ${gate.title}`,
        description: params.note || `${params.actorName} (${params.actorRole}) marked "${gate.title}" as ${params.status}.`,
        ownerName: params.actorName,
        ownerRole: params.actorRole,
        isCompleted: params.status === "approved",
        categoryColor: params.status === "approved" ? "emerald" : "amber",
        eventDate: new Date(),
      });
    } catch {}
  }

  return { success: true, record };
}

/**
 * Authoritative backend stage transition with strict Approval Gate enforcement (Rule 15 & 9).
 * Refuses to move a case past any unsatisfied approval gate or incomplete required steps.
 */
export async function advanceCaseStageWithGates(params: {
  workflowId: number;
  contactId: number;
  fromStageId: string;
  targetStageId: string;
  actorName: string;
  actorRole: string;
}): Promise<{
  allowed: boolean;
  blockingReasons: string[];
  stageResult?: any;
}> {
  const wf = await getWorkflowRecordById(params.workflowId);
  if (!wf) {
    return { allowed: false, blockingReasons: ["Workflow definition not found."] };
  }

  const doc = parseWorkflowCanvasData(wf.canvasData);
  const targetStage = doc.stages.find((s) => s.id === params.targetStageId);
  if (!targetStage) {
    return { allowed: false, blockingReasons: ["Target stage not found in workflow definition."] };
  }

  const progress = await getCaseWorkflowProgress(params.workflowId, params.contactId);
  const completedStepIds = new Set(
    progress.steps.filter((s) => s.completed).map((s) => s.stepId)
  );
  const approvedGateIds = new Set(
    progress.gates.filter((g) => g.status === "approved").map((g) => g.gateId)
  );

  const evaluation = evaluateTransitionApprovalGates({
    doc,
    fromStageId: params.fromStageId,
    toStageId: params.targetStageId,
    completedStepIds,
    approvedGateIds,
  });

  if (!evaluation.allowed) {
    const blockingReasons = evaluation.blockingGates.map((bg) => {
      const parts: string[] = [];
      if (bg.missingStepTitles.length > 0) {
        parts.push(`incomplete steps (${bg.missingStepTitles.join(", ")})`);
      }
      if (bg.needsRoleSignOff) {
        parts.push(`requires ${bg.gate.requiredRole} sign-off`);
      }
      return `"${bg.gate.title}": ${parts.join(" and ")}`;
    });
    return { allowed: false, blockingReasons };
  }

  // All gates satisfied -> execute real pipeline stage transition (updates contact, logs activity, fires idempotent stage_changed automations)
  const stageResult = await updatePipelineCardStage({
    contactId: params.contactId,
    stage: targetStage.name,
    actorName: params.actorName,
    actorRole: params.actorRole,
  });

  return {
    allowed: true,
    blockingReasons: [],
    stageResult,
  };
}

/**
 * Aggregates real CRM context for Workflow Designer (read-only, zero side effects):
 * - Real configured pipeline stages
 * - Real configured plans from plan matrix + active services catalog (no hardcoded pricing)
 * - Real automations from PG-013
 * - Real templates & smart files
 * - Real student/family cases for Employee Preview / Case Train view
 */
export async function getWorkflowDesignerContextData() {
  const [pipelineStages, automations, smartFiles, pipelineCards] = await Promise.all([
    listPipelineStages().catch(() => []),
    listAutomations().catch(() => []),
    listAvailableSmartFileTemplatesForAutomations().catch(() => []),
    listPipelineCards().catch(() => []),
  ]);

  // Read existing configured plans from planMatrix + active services catalog
  let catalogServices: any[] = [];
  try {
    catalogServices = await listServices({
      organizationId: 1,
      status: "active",
      includeArchived: false,
    });
  } catch {
    catalogServices = [];
  }

  const planMap = new Map<string, { key: string; name: string; description: string }>();
  for (const def of DEFAULT_PLAN_DEFINITIONS) {
    planMap.set(def.planKey.toLowerCase(), {
      key: def.planKey,
      name: def.planName,
      description: def.description,
    });
  }
  for (const svc of catalogServices) {
    if (svc?.name && (svc.billingType === "subscription" || svc.billingType === "retainer" || svc.availableInPortal)) {
      const k = String(svc.serviceCode || svc.name).toLowerCase().replace(/[^a-z0-9]+/g, "_");
      if (!planMap.has(k) && !Array.from(planMap.values()).some((p) => p.name.toLowerCase() === String(svc.name).toLowerCase())) {
        planMap.set(k, {
          key: k,
          name: String(svc.name),
          description: String(svc.description || "Configured service plan"),
        });
      }
    }
  }

  // Read existing email templates
  let templates: Array<{ id: string; name: string; category?: string }> = [];
  try {
    const database = await getDb();
    if (database) {
      const rows = await database.select().from(emailTemplates).limit(100);
      templates = rows.map((r: any) => ({
        id: String(r.id),
        name: String(r.name || r.subject || `Template #${r.id}`),
        category: r.category ? String(r.category) : undefined,
      }));
    }
  } catch {
    templates = [];
  }

  // Compact active case summaries for Employee Preview (no fake data)
  const cases = (pipelineCards || []).slice(0, 60).map((c) => ({
    contactId: c.id,
    fullName: c.fullName,
    parentName: c.parentName,
    caseId: c.caseId,
    leadId: c.leadId,
    pipelineStage: c.pipelineStage,
    planTier: c.planTier,
    planType: c.planType,
    assignedAdvocateName: c.assignedAdvocateName,
    openTaskCount: c.openTaskCount,
    primaryTask: c.primaryTask,
    compassNextStep: c.compassNextStep,
    lastActivitySummary: c.lastActivitySummary,
    schoolName: c.schoolName,
    gradeLevel: c.gradeLevel,
  }));

  return {
    pipelineStages,
    plans: Array.from(planMap.values()),
    automations: (automations || []).map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      triggerEvent: a.triggerEvent,
      isActive: a.isActive,
      triggerConfig: a.triggerConfig,
      steps: a.steps,
      failedRunsCount: a.failedRunsCount || 0,
      completedRunsCount: a.completedRunsCount || 0,
      queuedRunsCount: a.queuedRunsCount || 0,
      lastRunAt: a.lastRunAt || null,
    })),
    templates: [
      ...templates,
      ...(smartFiles || []).map((sf: any) => ({
        id: `sf-${sf.id}`,
        name: `[Smart File] ${sf.name}`,
        category: "Smart File",
      })),
    ],
    cases,
  };
}

/**
 * Shared Workflow Definition & Monorail Geometry Model
 * ----------------------------------------------------
 * Single source of truth connecting Waypoint's Traditional React Flow canvas
 * and the new interactive Monorail Map view.
 *
 * Key Invariants:
 * 1. Stable IDs connect stages, guide steps, approval gates, and Traditional nodes.
 * 2. Visual canvas coordinates (`monorailLayout`) are stored strictly SEPARATE from
 *    business logic (`order`, `transitions`, `approvalGates`, `linkedAutomationIds`).
 * 3. Active case progress is NEVER stored inside reusable workflow definitions.
 * 4. Editing or renaming a stage in either view updates the shared canonical record.
 */

export type WorkflowViewMode = "traditional" | "monorail";
export type WorkflowExperienceMode = "designer" | "employee_preview";

export type StageIconKey =
  | "user-plus"
  | "search"
  | "layers"
  | "file-text"
  | "compass"
  | "calendar"
  | "message-circle"
  | "refresh-cw"
  | "handshake"
  | "shield-check"
  | "scale"
  | "upload"
  | "credit-card"
  | "school"
  | "activity"
  | "check-circle";

export interface TraditionalFlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    notes?: string;
    color: string;
    stageId?: string;
    gateId?: string;
    [key: string]: any;
  };
  selected?: boolean;
}

export interface TraditionalFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, any>;
  selected?: boolean;
}

export interface WorkflowGuideStep {
  id: string;
  title: string;
  shortExplanation: string;
  detailedInstructions: string;
  assignedRole: string;
  assignedEmployeeName?: string;
  required: boolean;
  relativeDueDays?: number | null; // e.g., +2 days after stage entry
  dueLabel?: string; // e.g., "Within 48 hours"
  templateId?: string | null;
  templateName?: string | null;
  workspaceLinkType?:
    | "none"
    | "student_dossier"
    | "discovery_console"
    | "meeting_assemble"
    | "meeting_blueprint"
    | "meeting_space"
    | "post_meeting_review"
    | "state_complaint"
    | "documents_vault"
    | "agreements"
    | "calendar"
    | "tasks";
  customWorkspaceUrl?: string;
  completionRequirement?: string;
  requiresApproval?: boolean;
  approvalRole?: string;
  /** Steps sharing the same non-empty parallelGroup execute in parallel rather than strict sequence */
  parallelGroup?: string | null;
  order: number;
  /** Empty array = applies to all plans; otherwise restricted to listed plan keys */
  applicablePlans?: string[];
  /** Empty array = applies to all project types; otherwise restricted to listed project types */
  applicableProjectTypes?: string[];
  isOptionalAddOn?: boolean;
}

export interface WorkflowStageAutomationLink {
  id: string;
  /** ID of real automation in PG-013 (`honeybook_automations`) when connected */
  automationId?: number | null;
  title: string;
  triggerLabel: string;
  triggerEvent: string;
  conditionSummary?: string;
  actionType: "task" | "email" | "file" | "prepare_draft" | "notify_advocate";
  actionSummary: string;
  requiresApproval: boolean;
  enabled: boolean;
  /** Distinguishes draft preparation from direct outbound send (Safeguard Rule 14) */
  communicationMode?: "internal_only" | "prepare_draft" | "send_after_approval" | "automatic_send";
}

export interface WorkflowStageDefinition {
  id: string;
  name: string;
  order: number;
  description: string;
  icon: StageIconKey;
  accentColor: string;
  assignedRole: string;
  waitingOnDefault?: string;
  /** Links this station directly to a real configured pipeline stage without duplicating pipelines */
  pipelineStageId?: number | null;
  pipelineStageSlug?: string | null;
  pipelineGroup?: "opportunity" | "active_project" | "custom";
  workspaceLinkType?: WorkflowGuideStep["workspaceLinkType"];
  guideSteps: WorkflowGuideStep[];
  automations: WorkflowStageAutomationLink[];
  /** Empty = always applies; otherwise scoped to specific plan keys */
  applicablePlans?: string[];
  /** Empty = always applies; otherwise scoped to specific project types */
  applicableProjectTypes?: string[];
  isOptional?: boolean;
}

export interface WorkflowTransitionRule {
  id: string;
  fromStageId: string;
  toStageId: string;
  label?: string;
  conditionSummary?: string;
  conditionField?: string;
  conditionOperator?: "equals" | "contains" | "not_equals";
  conditionValue?: string;
}

export interface WorkflowApprovalGate {
  id: string;
  title: string;
  description: string;
  fromStageId: string;
  toStageId: string;
  requiredRole: string;
  requiredStepIds: string[];
  requiredEvidenceNote?: string;
  enabled: boolean;
}

export type RailPieceKind =
  | "straight"
  | "quarter_turn"
  | "u_turn"
  | "branch"
  | "merge";

export type RailTrayItemKind =
  | RailPieceKind
  | "station"
  | "guide_step"
  | "automation"
  | "approval_gate";

export interface MonorailCosmeticPiece {
  id: string;
  kind: RailPieceKind;
  routeType: "main" | "guide" | "automation";
  x: number;
  y: number;
  rotationDeg: number;
  /** Optional parent socket reference so connected pieces stay attached when moved */
  attachedTo?: {
    targetType: "station" | "piece";
    targetId: string;
    socketName: string;
  } | null;
  label?: string;
}

export interface MonorailVisualPrefs {
  expandedGuideStageIds?: string[];
  expandedAutomationStageIds?: string[];
}

export interface WorkflowDocumentV2 {
  schemaVersion: 2;
  definitionVersion: number;
  nodes: TraditionalFlowNode[];
  edges: TraditionalFlowEdge[];
  stages: WorkflowStageDefinition[];
  transitions: WorkflowTransitionRule[];
  approvalGates: WorkflowApprovalGate[];
  /** Visual Monorail layout offsets keyed by stable stage.id — NEVER affects business sequence */
  monorailLayout: Record<string, { x: number; y: number }>;
  /** Cosmetic premade snap rail pieces (bends, curves, branches, merges) — visual only, never alters execution logic */
  monorailRailPieces?: MonorailCosmeticPiece[];
  /** Visual presentation preferences (expanded branches, etc.) — visual only */
  monorailVisualPrefs?: MonorailVisualPrefs;
  meta: {
    syncedWithPipeline?: boolean;
    lastMigratedAt?: string;
    projectTypes?: string[];
  };
}

export interface PipelineStageInput {
  id: number;
  name: string;
  slug: string;
  order: number;
  accentColor?: string;
  iconName?: string;
  category?: string;
  pipelineGroup?: "opportunity" | "active_project";
  isArchived?: boolean;
}

export const DEFAULT_PROJECT_TYPES = [
  "IEP Meeting",
  "Initial Evaluation",
  "504 Plan Review",
  "Triennial Re-Eval",
  "Manifestation (MDR)",
  "State Complaint",
  "Ongoing Advocacy",
];

export const ROLE_OPTIONS = [
  "Lead Special Education Advocate",
  "Assigned Advocate",
  "Intake Coordinator",
  "Operations & Billing",
  "Documentation Specialist",
  "Management",
];

export const WORKSPACE_LINK_LABELS: Record<
  NonNullable<WorkflowGuideStep["workspaceLinkType"]>,
  string
> = {
  none: "No linked workspace",
  student_dossier: "Student Dossier (PG-030)",
  discovery_console: "Discovery Call Console (PG-003)",
  meeting_assemble: "Meeting Workspace → 1. Assemble (PG-043-ASM)",
  meeting_blueprint: "Meeting Workspace → 2. Blueprint (PG-043-BLP)",
  meeting_space: "Meeting Workspace → 3. Meeting Space (PG-043-MTG)",
  post_meeting_review: "Post-Meeting Review (PG-044)",
  state_complaint: "State Complaint Builder (PG-020)",
  documents_vault: "Student Document Vault (PG-030)",
  agreements: "Agreements Engine (PG-046)",
  calendar: "Appointments & Calendar (PG-007)",
  tasks: "Tasks Queue (PG-009)",
};

export function resolveWorkspaceHref(
  linkType: WorkflowGuideStep["workspaceLinkType"] | undefined,
  caseContext?: { contactId?: number | null; leadId?: number | null }
): string | null {
  const sid = caseContext?.contactId;
  const lid = caseContext?.leadId;
  switch (linkType) {
    case "student_dossier":
      return sid ? `/students/${sid}` : "/students";
    case "discovery_console":
      return lid ? `/leads/${lid}/discovery` : "/leads";
    case "meeting_assemble":
      return sid ? `/meeting-workspace/${sid}?tab=assemble` : "/meeting-workspace?tab=assemble";
    case "meeting_blueprint":
      return sid ? `/meeting-workspace/${sid}?tab=blueprint` : "/meeting-workspace?tab=blueprint";
    case "meeting_space":
      return sid ? `/meeting-workspace/${sid}?tab=meeting-space` : "/meeting-workspace?tab=meeting-space";
    case "post_meeting_review":
      return sid ? `/post-meeting-review/${sid}` : "/post-meeting-review";
    case "state_complaint":
      return sid ? `/state-complaint-builder?studentId=${sid}` : "/state-complaint-builder";
    case "documents_vault":
      return sid ? `/students/${sid}?tab=documents` : "/students";
    case "agreements":
      return "/agreements";
    case "calendar":
      return "/calendar";
    case "tasks":
      return "/tasks";
    default:
      return null;
  }
}

export function inferStageIcon(name: string, iconName?: string): StageIconKey {
  const raw = `${name} ${iconName || ""}`.toLowerCase();
  if (raw.includes("new lead") || raw.includes("inquiry") || raw.includes("lead")) return "user-plus";
  if (raw.includes("discovery") || raw.includes("free session")) return "search";
  if (raw.includes("onboard") || raw.includes("intake") || raw.includes("proposal")) return "layers";
  if (raw.includes("billing") || raw.includes("payment")) return "credit-card";
  if (raw.includes("upload")) return "upload";
  if (raw.includes("record") || raw.includes("review")) return "file-text";
  if (raw.includes("blueprint") || raw.includes("strategy")) return "compass";
  if (raw.includes("school")) return "school";
  if (raw.includes("meeting")) return "calendar";
  if (raw.includes("parent update") || raw.includes("update") || raw.includes("debrief")) return "message-circle";
  if (raw.includes("follow") || raw.includes("reconnect")) return "refresh-cw";
  if (raw.includes("complaint") || raw.includes("legal") || raw.includes("mdr")) return "scale";
  if (raw.includes("ongoing") || raw.includes("support") || raw.includes("monitor")) return "handshake";
  if (raw.includes("closed") || raw.includes("complete")) return "check-circle";
  return "layers";
}

function inferWorkspaceLink(name: string): WorkflowGuideStep["workspaceLinkType"] {
  const lower = name.toLowerCase();
  if (lower.includes("discovery") || lower.includes("lead") || lower.includes("free session")) return "discovery_console";
  if (lower.includes("onboard") || lower.includes("billing") || lower.includes("proposal") || lower.includes("agreement")) return "agreements";
  if (lower.includes("upload")) return "documents_vault";
  if (lower.includes("record")) return "meeting_assemble";
  if (lower.includes("blueprint")) return "meeting_blueprint";
  if (lower.includes("meeting")) return "meeting_space";
  if (lower.includes("parent update") || lower.includes("follow")) return "post_meeting_review";
  if (lower.includes("complaint")) return "state_complaint";
  return "student_dossier";
}

function buildStarterGuideSteps(stageId: string, stageName: string): WorkflowGuideStep[] {
  const lower = stageName.toLowerCase();
  if (lower.includes("record")) {
    return [
      {
        id: `${stageId}-gs-1`,
        title: "Request records",
        shortExplanation: "Send FERPA records request or confirm parent portal uploads.",
        detailedInstructions:
          "Verify whether the family has uploaded the latest IEP, psychoeducational evaluation, and progress monitoring reports. If documents are missing, send the FERPA Records Request template.",
        assignedRole: "Assigned Advocate",
        required: true,
        relativeDueDays: 1,
        dueLabel: "Day 1 of stage",
        templateName: "FERPA Educational Records Request",
        workspaceLinkType: "documents_vault",
        completionRequirement: "Records request dispatched or existing files verified",
        parallelGroup: null,
        order: 1,
      },
      {
        id: `${stageId}-gs-2`,
        title: "Confirm documents received",
        shortExplanation: "Verify all IEP pages, evaluations, and prior PWNs are legible.",
        detailedInstructions:
          "Check the Student Document Vault for complete IEP pages, signature pages, evaluation reports, and recent Prior Written Notices.",
        assignedRole: "Documentation Specialist",
        required: true,
        relativeDueDays: 3,
        dueLabel: "Within 3 days",
        workspaceLinkType: "documents_vault",
        completionRequirement: "Complete file set confirmed in vault",
        parallelGroup: null,
        order: 2,
      },
      {
        id: `${stageId}-gs-3`,
        title: "Review IEP and evaluations",
        shortExplanation: "Identify documented needs, missing information, and parent priorities.",
        detailedInstructions:
          "Open Step 1: Assemble in the Meeting Workspace, run IEP Intelligence audit, and flag baseline gaps, vague measurable goals, or unaddressed evaluation recommendations.",
        assignedRole: "Assigned Advocate",
        required: true,
        relativeDueDays: 5,
        dueLabel: "Within 5 days",
        workspaceLinkType: "meeting_assemble",
        completionRequirement: "IEP & evaluation audit findings logged",
        parallelGroup: "analysis",
        order: 3,
      },
      {
        id: `${stageId}-gs-4`,
        title: "Draft findings",
        shortExplanation: "Summarize key compliance findings and recommended advocacy priorities.",
        detailedInstructions:
          "Compile concise, parent-friendly findings and concrete service/accommodation asks so the Blueprint session stays focused and strategic.",
        assignedRole: "Assigned Advocate",
        required: true,
        relativeDueDays: 6,
        dueLabel: "Within 6 days",
        workspaceLinkType: "meeting_assemble",
        completionRequirement: "Draft findings saved to student record",
        parallelGroup: "analysis",
        order: 4,
      },
      {
        id: `${stageId}-gs-5`,
        title: "Advocate review",
        shortExplanation: "Lead advocate confirms audit quality before unlocking Blueprint.",
        detailedInstructions:
          "Review drafted findings and verify statutory IDEA alignment before moving the family into Meeting Blueprint.",
        assignedRole: "Lead Special Education Advocate",
        required: true,
        requiresApproval: true,
        approvalRole: "Lead Special Education Advocate",
        relativeDueDays: 7,
        dueLabel: "Before Blueprint",
        workspaceLinkType: "meeting_blueprint",
        completionRequirement: "Lead advocate sign-off recorded",
        parallelGroup: null,
        order: 5,
      },
    ];
  }
  if (lower.includes("discovery")) {
    return [
      {
        id: `${stageId}-gs-1`,
        title: "Review intake submission",
        shortExplanation: "Inspect family concerns, school district, and preferred time.",
        detailedInstructions:
          "Review the submitted Discovery Call Form on the Student Dossier to understand current IEP/504 status and urgent school deadlines.",
        assignedRole: "Intake Coordinator",
        required: true,
        dueLabel: "Before call",
        workspaceLinkType: "discovery_console",
        order: 1,
      },
      {
        id: `${stageId}-gs-2`,
        title: "Conduct discovery consultation",
        shortExplanation: "Capture student history, parent goals, and recommended plan.",
        detailedInstructions:
          "Open the Discovery Call Console to walk through family priorities, document timeline pressures, and recommend an appropriate advocacy plan.",
        assignedRole: "Lead Special Education Advocate",
        required: true,
        dueLabel: "At scheduled slot",
        workspaceLinkType: "discovery_console",
        order: 2,
      },
      {
        id: `${stageId}-gs-3`,
        title: "Approve enrollment offer",
        shortExplanation: "Authorize family portal plan selection and agreement access.",
        detailedInstructions:
          "Submit enrollment approval so the parent receives their portal invitation to choose their plan, sign the advocacy agreement, and activate support.",
        assignedRole: "Lead Special Education Advocate",
        required: true,
        dueLabel: "Within 24 hours",
        workspaceLinkType: "student_dossier",
        order: 3,
      },
    ];
  }
  if (lower.includes("onboard") || lower.includes("intake")) {
    return [
      {
        id: `${stageId}-gs-1`,
        title: "Verify signed agreement",
        shortExplanation: "Confirm service agreement execution in Agreements Engine.",
        detailedInstructions:
          "Ensure the family has executed the advocacy representation agreement before initiating school contact.",
        assignedRole: "Operations & Billing",
        required: true,
        dueLabel: "Day 1",
        workspaceLinkType: "agreements",
        parallelGroup: "onboarding_checks",
        order: 1,
      },
      {
        id: `${stageId}-gs-2`,
        title: "Verify billing authorization",
        shortExplanation: "Confirm retainer payment or approved scholarship/manual invoice.",
        detailedInstructions:
          "Confirm active subscription, first payment clearance, or authorized manual billing arrangement.",
        assignedRole: "Operations & Billing",
        required: true,
        dueLabel: "Day 1",
        workspaceLinkType: "student_dossier",
        parallelGroup: "onboarding_checks",
        order: 2,
      },
      {
        id: `${stageId}-gs-3`,
        title: "Confirm parent portal access",
        shortExplanation: "Ensure parent can upload records and view case milestones.",
        detailedInstructions:
          "Verify portal invitation delivery and confirm initial student profile fields are populated.",
        assignedRole: "Intake Coordinator",
        required: false,
        dueLabel: "Day 2",
        workspaceLinkType: "student_dossier",
        order: 3,
      },
    ];
  }
  if (lower.includes("blueprint")) {
    return [
      {
        id: `${stageId}-gs-1`,
        title: "Finalize measurable IEP goals",
        shortExplanation: "Draft specific, measurable annual goal proposals.",
        detailedInstructions:
          "Use Step 2: Blueprint in the Meeting Workspace to craft clear baselines, target mastery criteria, and evaluation schedules.",
        assignedRole: "Assigned Advocate",
        required: true,
        dueLabel: "5 days before meeting",
        workspaceLinkType: "meeting_blueprint",
        order: 1,
      },
      {
        id: `${stageId}-gs-2`,
        title: "Align talking points with parent",
        shortExplanation: "Review requested accommodations and roles before school table.",
        detailedInstructions:
          "Walk through the Blueprint agenda with the family so parent and advocate present a unified, calm, data-backed plan.",
        assignedRole: "Assigned Advocate",
        required: true,
        dueLabel: "48 hours before meeting",
        workspaceLinkType: "meeting_blueprint",
        order: 2,
      },
    ];
  }
  if (lower.includes("meeting")) {
    return [
      {
        id: `${stageId}-gs-1`,
        title: "Run live IEP meeting",
        shortExplanation: "Open Meeting Space with First Mate & Voyage Recorder ready.",
        detailedInstructions:
          "Track district proposals, refusals, and service commitments live inside Step 3: Meeting Space.",
        assignedRole: "Assigned Advocate",
        required: true,
        dueLabel: "Meeting day",
        workspaceLinkType: "meeting_space",
        order: 1,
      },
      {
        id: `${stageId}-gs-2`,
        title: "Log team commitments & deadlines",
        shortExplanation: "Document every agreed service minute, evaluation, and PWN item.",
        detailedInstructions:
          "Record each school commitment with responsible personnel and statutory timelines before closing the session.",
        assignedRole: "Assigned Advocate",
        required: true,
        dueLabel: "Same day",
        workspaceLinkType: "meeting_space",
        order: 2,
      },
    ];
  }
  if (lower.includes("parent update") || lower.includes("follow")) {
    return [
      {
        id: `${stageId}-gs-1`,
        title: "Audit Prior Written Notice (PWN)",
        shortExplanation: "Cross-check district PWN against live meeting commitments.",
        detailedInstructions:
          "Run the PWN Decoder / Post-Meeting Review to confirm nothing discussed at the IEP table was omitted or mischaracterized.",
        assignedRole: "Assigned Advocate",
        required: true,
        dueLabel: "Upon PWN receipt",
        workspaceLinkType: "post_meeting_review",
        order: 1,
      },
      {
        id: `${stageId}-gs-2`,
        title: "Prepare parent summary & next steps",
        shortExplanation: "Draft clear parent update and follow-up documentation.",
        detailedInstructions:
          "Compile the meeting summary, upload final documents to the portal, and schedule any needed follow-up check-ins.",
        assignedRole: "Assigned Advocate",
        required: true,
        dueLabel: "Within 48 hours",
        workspaceLinkType: "post_meeting_review",
        order: 2,
      },
    ];
  }

  return [
    {
      id: `${stageId}-gs-1`,
      title: `Complete ${stageName} checklist`,
      shortExplanation: `Execute core advocacy steps for ${stageName}.`,
      detailedInstructions: `Review the student dossier and complete all required tasks before transitioning out of ${stageName}.`,
      assignedRole: "Assigned Advocate",
      required: true,
      workspaceLinkType: inferWorkspaceLink(stageName),
      order: 1,
    },
  ];
}

function buildStarterAutomations(stageId: string, stageName: string): WorkflowStageAutomationLink[] {
  const lower = stageName.toLowerCase();
  if (lower.includes("onboard") || lower.includes("intake")) {
    return [
      {
        id: `${stageId}-auto-1`,
        automationId: null,
        title: "Create tasks",
        triggerLabel: "Stage entered",
        triggerEvent: "stage_changed",
        conditionSummary: `Stage equals "${stageName}"`,
        actionType: "task",
        actionSummary: "Create records request & onboarding checklist tasks",
        requiresApproval: false,
        enabled: true,
        communicationMode: "internal_only",
      },
      {
        id: `${stageId}-auto-2`,
        automationId: null,
        title: "Send reminder",
        triggerLabel: "2 days after entry",
        triggerEvent: "stage_changed",
        conditionSummary: "Portal documents still pending",
        actionType: "email",
        actionSummary: "Queue parent document upload reminder (approval required before sending)",
        requiresApproval: true,
        enabled: true,
        communicationMode: "send_after_approval",
      },
      {
        id: `${stageId}-auto-3`,
        automationId: null,
        title: "Prepare update",
        triggerLabel: "Records received",
        triggerEvent: "file_completed",
        conditionSummary: "Required IEP file uploaded",
        actionType: "prepare_draft",
        actionSummary: "Prepare advocate notification & parent status draft (does not auto-send)",
        requiresApproval: true,
        enabled: true,
        communicationMode: "prepare_draft",
      },
    ];
  }
  if (lower.includes("record")) {
    return [
      {
        id: `${stageId}-auto-1`,
        automationId: null,
        title: "Create records task",
        triggerLabel: "Stage entered",
        triggerEvent: "stage_changed",
        conditionSummary: `Stage equals "${stageName}"`,
        actionType: "task",
        actionSummary: "Create records request & IEP audit task for assigned advocate",
        requiresApproval: false,
        enabled: true,
        communicationMode: "internal_only",
      },
    ];
  }
  if (lower.includes("parent update") || lower.includes("follow")) {
    return [
      {
        id: `${stageId}-auto-1`,
        automationId: null,
        title: "Prepare parent update draft",
        triggerLabel: "Review approved",
        triggerEvent: "session_ends",
        conditionSummary: "Post-meeting notes saved",
        actionType: "prepare_draft",
        actionSummary: "Prepare parent summary draft for advocate approval before sending",
        requiresApproval: true,
        enabled: true,
        communicationMode: "prepare_draft",
      },
    ];
  }
  return [];
}

/**
 * Generates Traditional React Flow nodes & edges cleanly synchronized from stages & approval gates.
 * Preserves existing node positions and non-stage nodes (like sticky notes) without data loss!
 */
export function syncTraditionalFromStages(
  stages: WorkflowStageDefinition[],
  approvalGates: WorkflowApprovalGate[],
  existingNodes: TraditionalFlowNode[],
  existingEdges: TraditionalFlowEdge[]
): { nodes: TraditionalFlowNode[]; edges: TraditionalFlowEdge[] } {
  const orderedStages = [...stages].sort((a, b) => a.order - b.order);
  const existingNodeMap = new Map(existingNodes.map((n) => [n.id, n]));
  const stageIds = new Set(orderedStages.map((s) => s.id));
  const gateIds = new Set(approvalGates.map((g) => g.id));

  // Keep sticky notes or unmapped legacy diamond nodes intact
  const preservedExtras = existingNodes.filter(
    (n) =>
      !stageIds.has(n.id) &&
      !gateIds.has(n.id) &&
      (n.type === "sticky" || (n.type === "diamond" && !n.data?.gateId))
  );

  const stageNodes: TraditionalFlowNode[] = orderedStages.map((stage, idx) => {
    const prev = existingNodeMap.get(stage.id);
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const defaultPos = { x: 80 + col * 260, y: 70 + row * 185 };
    return {
      id: stage.id,
      type: prev?.type && prev.type !== "diamond" ? prev.type : "card",
      position: prev?.position ?? defaultPos,
      data: {
        ...(prev?.data ?? {}),
        label: stage.name,
        notes: stage.description || `${stage.guideSteps.length} guide step(s) · ${stage.assignedRole}`,
        color: stage.accentColor || prev?.data?.color || "#3b82f6",
        stageId: stage.id,
      },
    };
  });

  const gateNodes: TraditionalFlowNode[] = approvalGates.map((gate, idx) => {
    const prev = existingNodeMap.get(gate.id);
    const fromNode = stageNodes.find((n) => n.id === gate.fromStageId);
    const toNode = stageNodes.find((n) => n.id === gate.toStageId);
    const defaultPos =
      fromNode && toNode
        ? {
            x: Math.round((fromNode.position.x + toNode.position.x) / 2),
            y: Math.round((fromNode.position.y + toNode.position.y) / 2) - 20,
          }
        : { x: 200 + idx * 140, y: 240 };
    return {
      id: gate.id,
      type: "diamond",
      position: prev?.position ?? defaultPos,
      data: {
        ...(prev?.data ?? {}),
        label: gate.title,
        notes: `Approval required: ${gate.requiredRole}`,
        color: gate.enabled ? "#d4af37" : "#64748b",
        gateId: gate.id,
      },
    };
  });

  // Build main sequential edges (inserting approval gate diamonds cleanly where present)
  const newMainEdges: TraditionalFlowEdge[] = [];
  for (let i = 0; i < orderedStages.length - 1; i++) {
    const src = orderedStages[i];
    const dst = orderedStages[i + 1];
    const gateBetween = approvalGates.find(
      (g) => g.fromStageId === src.id && g.toStageId === dst.id
    );
    if (gateBetween) {
      newMainEdges.push({
        id: `edge-${src.id}-${gateBetween.id}`,
        source: src.id,
        target: gateBetween.id,
        animated: true,
        style: { stroke: "#C9A55A", strokeWidth: 2 },
      });
      newMainEdges.push({
        id: `edge-${gateBetween.id}-${dst.id}`,
        source: gateBetween.id,
        target: dst.id,
        animated: true,
        style: { stroke: "#C9A55A", strokeWidth: 2 },
      });
    } else {
      newMainEdges.push({
        id: `edge-${src.id}-${dst.id}`,
        source: src.id,
        target: dst.id,
        animated: true,
        style: { stroke: "#64748b", strokeWidth: 2 },
      });
    }
  }

  // Keep any custom edges connected to preserved extras (sticky notes etc.)
  const extraIds = new Set(preservedExtras.map((n) => n.id));
  const preservedExtraEdges = existingEdges.filter(
    (e) => extraIds.has(e.source) || extraIds.has(e.target)
  );

  return {
    nodes: [...stageNodes, ...gateNodes, ...preservedExtras],
    edges: [...newMainEdges, ...preservedExtraEdges],
  };
}

/**
 * Syncs edits performed inside the Traditional React Flow canvas BACK into the structured
 * WorkflowDocumentV2 so Monorail immediately reflects renamed cards, added cards, deleted cards,
 * or edited decisions without losing Monorail-specific guide steps, automations, or layout!
 */
export function syncStagesFromTraditional(
  doc: WorkflowDocumentV2,
  updatedNodes: TraditionalFlowNode[],
  updatedEdges: TraditionalFlowEdge[]
): WorkflowDocumentV2 {
  const existingStageMap = new Map(doc.stages.map((s) => [s.id, s]));
  const existingGateMap = new Map(doc.approvalGates.map((g) => [g.id, g]));

  // Card nodes map 1:1 to stages by stable ID
  const cardNodes = updatedNodes.filter((n) => (n.type ?? "card") === "card");
  const nextStages: WorkflowStageDefinition[] = cardNodes.map((node, index) => {
    const existing = existingStageMap.get(node.id);
    if (existing) {
      return {
        ...existing,
        name: node.data.label || existing.name,
        description: node.data.notes ?? existing.description,
        accentColor: node.data.color || existing.accentColor,
      };
    }
    const label = node.data.label || `Stage ${index + 1}`;
    return {
      id: node.id,
      name: label,
      order: doc.stages.length + index + 1,
      description: node.data.notes || "",
      icon: inferStageIcon(label),
      accentColor: node.data.color || "#3b82f6",
      assignedRole: "Assigned Advocate",
      workspaceLinkType: inferWorkspaceLink(label),
      guideSteps: buildStarterGuideSteps(node.id, label),
      automations: [],
      applicablePlans: [],
      applicableProjectTypes: [],
    };
  });

  // Preserve relative business order of existing stages, placing new cards at the end
  nextStages.sort((a, b) => a.order - b.order);
  const reindexedStages = nextStages.map((s, idx) => ({ ...s, order: idx + 1 }));
  const validStageIds = new Set(reindexedStages.map((s) => s.id));

  // Sync approval gates represented by diamond nodes
  const diamondNodes = updatedNodes.filter((n) => n.type === "diamond");
  const nextGates: WorkflowApprovalGate[] = [];
  for (const dn of diamondNodes) {
    const existing = existingGateMap.get(dn.id);
    if (existing && validStageIds.has(existing.fromStageId) && validStageIds.has(existing.toStageId)) {
      nextGates.push({
        ...existing,
        title: dn.data.label || existing.title,
      });
    } else if (existing) {
      // Gate's endpoints were deleted in Traditional; prune orphaned gate safely
      continue;
    } else {
      // Newly added diamond node in Traditional: infer endpoints from edges if connected
      const inEdge = updatedEdges.find((e) => e.target === dn.id && validStageIds.has(e.source));
      const outEdge = updatedEdges.find((e) => e.source === dn.id && validStageIds.has(e.target));
      if (inEdge && outEdge) {
        nextGates.push({
          id: dn.id,
          title: dn.data.label || "Advocate approval",
          description: dn.data.notes || "Approval required before advancing to the next stage.",
          fromStageId: inEdge.source,
          toStageId: outEdge.target,
          requiredRole: "Lead Special Education Advocate",
          requiredStepIds: [],
          enabled: true,
        });
      }
    }
  }

  return {
    ...doc,
    nodes: updatedNodes,
    edges: updatedEdges,
    stages: reindexedStages,
    approvalGates: nextGates,
  };
}

/**
 * Normalizes any stored `workflows.canvasData` string (legacy `{nodes, edges}` OR v2 document)
 * into a complete WorkflowDocumentV2 without ever losing legacy diagram data.
 */
export function parseWorkflowCanvasData(rawCanvasData: string | null | undefined): WorkflowDocumentV2 {
  if (!rawCanvasData) {
    return {
      schemaVersion: 2,
      definitionVersion: 1,
      nodes: [],
      edges: [],
      stages: [],
      transitions: [],
      approvalGates: [],
      monorailLayout: {},
      meta: { projectTypes: DEFAULT_PROJECT_TYPES },
    };
  }

  try {
    const parsed = JSON.parse(rawCanvasData);
    const nodes: TraditionalFlowNode[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const edges: TraditionalFlowEdge[] = Array.isArray(parsed.edges) ? parsed.edges : [];

    // Already v2 structured workflow
    if (parsed.schemaVersion === 2 && Array.isArray(parsed.stages)) {
      const stages: WorkflowStageDefinition[] = parsed.stages
        .map((s: any, i: number) => ({
          ...s,
          id: String(s.id || `stage-${i + 1}`),
          name: String(s.name || `Stage ${i + 1}`),
          order: typeof s.order === "number" ? s.order : i + 1,
          description: String(s.description || ""),
          icon: (s.icon || inferStageIcon(String(s.name || ""))) as StageIconKey,
          accentColor: String(s.accentColor || "#3b82f6"),
          assignedRole: String(s.assignedRole || "Assigned Advocate"),
          guideSteps: Array.isArray(s.guideSteps) ? s.guideSteps : [],
          automations: Array.isArray(s.automations) ? s.automations : [],
          applicablePlans: Array.isArray(s.applicablePlans) ? s.applicablePlans : [],
          applicableProjectTypes: Array.isArray(s.applicableProjectTypes) ? s.applicableProjectTypes : [],
        }))
        .sort((a: WorkflowStageDefinition, b: WorkflowStageDefinition) => a.order - b.order);

      return {
        schemaVersion: 2,
        definitionVersion: typeof parsed.definitionVersion === "number" ? parsed.definitionVersion : 1,
        nodes,
        edges,
        stages,
        transitions: Array.isArray(parsed.transitions) ? parsed.transitions : [],
        approvalGates: Array.isArray(parsed.approvalGates) ? parsed.approvalGates : [],
        monorailLayout: parsed.monorailLayout && typeof parsed.monorailLayout === "object" ? parsed.monorailLayout : {},
        monorailRailPieces: Array.isArray(parsed.monorailRailPieces) ? parsed.monorailRailPieces : [],
        monorailVisualPrefs:
          parsed.monorailVisualPrefs && typeof parsed.monorailVisualPrefs === "object"
            ? parsed.monorailVisualPrefs
            : undefined,
        meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : { projectTypes: DEFAULT_PROJECT_TYPES },
      };
    }

    // Legacy `{ nodes, edges }` diagram -> lift seamlessly into v2 using topological order
    const cardNodes = nodes.filter((n) => (n.type ?? "card") === "card");
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const n of cardNodes) {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    }
    for (const e of edges) {
      if (adj.has(e.source) && inDegree.has(e.target)) {
        adj.get(e.source)!.push(e.target);
        inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
      }
    }
    const queue = cardNodes
      .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
      .sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0) || (a.position?.x ?? 0) - (b.position?.x ?? 0));

    const orderedCards: TraditionalFlowNode[] = [];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr.id)) continue;
      visited.add(curr.id);
      orderedCards.push(curr);
      for (const nextId of adj.get(curr.id) ?? []) {
        const deg = (inDegree.get(nextId) ?? 1) - 1;
        inDegree.set(nextId, deg);
        if (deg <= 0) {
          const nextNode = cardNodes.find((n) => n.id === nextId);
          if (nextNode) queue.push(nextNode);
        }
      }
    }
    for (const n of cardNodes) {
      if (!visited.has(n.id)) orderedCards.push(n);
    }

    const stages: WorkflowStageDefinition[] = orderedCards.map((node, idx) => {
      const label = node.data?.label || `Stage ${idx + 1}`;
      return {
        id: node.id,
        name: label,
        order: idx + 1,
        description: node.data?.notes || "",
        icon: inferStageIcon(label),
        accentColor: node.data?.color || "#3b82f6",
        assignedRole: "Assigned Advocate",
        workspaceLinkType: inferWorkspaceLink(label),
        guideSteps: buildStarterGuideSteps(node.id, label),
        automations: [],
        applicablePlans: [],
        applicableProjectTypes: [],
      };
    });

    // Convert any diamond nodes connected between cards into approval gates
    const stageIdSet = new Set(stages.map((s) => s.id));
    const approvalGates: WorkflowApprovalGate[] = [];
    for (const dn of nodes.filter((n) => n.type === "diamond")) {
      const inE = edges.find((e) => e.target === dn.id && stageIdSet.has(e.source));
      const outE = edges.find((e) => e.source === dn.id && stageIdSet.has(e.target));
      if (inE && outE) {
        approvalGates.push({
          id: dn.id,
          title: dn.data?.label || "Advocate approval",
          description: dn.data?.notes || "Approval required before advancing.",
          fromStageId: inE.source,
          toStageId: outE.target,
          requiredRole: "Lead Special Education Advocate",
          requiredStepIds: [],
          enabled: true,
        });
      }
    }

    return {
      schemaVersion: 2,
      definitionVersion: 1,
      nodes,
      edges,
      stages,
      transitions: edges
        .filter((e) => stageIdSet.has(e.source) && stageIdSet.has(e.target))
        .map((e) => ({
          id: e.id,
          fromStageId: e.source,
          toStageId: e.target,
          label: e.label,
        })),
      approvalGates,
      monorailLayout: {},
      monorailRailPieces: [],
      meta: { projectTypes: DEFAULT_PROJECT_TYPES },
    };
  } catch {
    return {
      schemaVersion: 2,
      definitionVersion: 1,
      nodes: [],
      edges: [],
      stages: [],
      transitions: [],
      approvalGates: [],
      monorailLayout: {},
      monorailRailPieces: [],
      meta: { projectTypes: DEFAULT_PROJECT_TYPES },
    };
  }
}

export function serializeWorkflowDocument(doc: WorkflowDocumentV2): string {
  const cleanNodes = doc.nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      onAddBelow: undefined,
      isAdmin: undefined,
    },
  }));
  return JSON.stringify({
    ...doc,
    schemaVersion: 2,
    nodes: cleanNodes,
  });
}

/**
 * Builds a real pipeline-linked WorkflowDocumentV2 from Waypoint's configured pipeline stages
 * (reusing existing pipeline stage IDs & slugs so admins never maintain duplicate pipelines).
 */
export function buildWorkflowDocumentFromPipelineStages(
  pipelineStages: PipelineStageInput[],
  options?: { includeOpportunity?: boolean; maxStages?: number }
): WorkflowDocumentV2 {
  const activeStages = pipelineStages
    .filter((s) => !s.isArchived)
    .filter((s) => (options?.includeOpportunity === false ? s.pipelineGroup !== "opportunity" : true))
    .sort((a, b) => a.order - b.order);

  const selected = options?.maxStages ? activeStages.slice(0, options.maxStages) : activeStages;

  const stages: WorkflowStageDefinition[] = selected.map((ps, idx) => {
    const stageId = `pipe-stage-${ps.id}`;
    return {
      id: stageId,
      name: ps.name,
      order: idx + 1,
      description:
        ps.pipelineGroup === "opportunity"
          ? `Prospective family & discovery milestone (${ps.name}).`
          : `Active advocacy workflow milestone (${ps.name}).`,
      icon: inferStageIcon(ps.name, ps.iconName),
      accentColor: ps.accentColor || "#3b82f6",
      assignedRole:
        ps.slug.includes("billing") || ps.slug.includes("onboarding")
          ? "Operations & Billing"
          : ps.slug.includes("discovery")
          ? "Lead Special Education Advocate"
          : "Assigned Advocate",
      waitingOnDefault: ps.slug.includes("record")
        ? "Parent records"
        : ps.slug.includes("upload")
        ? "Client uploads"
        : ps.slug.includes("billing")
        ? "Billing authorization"
        : undefined,
      pipelineStageId: ps.id,
      pipelineStageSlug: ps.slug,
      pipelineGroup: ps.pipelineGroup || "active_project",
      workspaceLinkType: inferWorkspaceLink(ps.name),
      guideSteps: buildStarterGuideSteps(stageId, ps.name),
      automations: buildStarterAutomations(stageId, ps.name),
      applicablePlans: [],
      applicableProjectTypes:
        ps.slug === "state-complaint" ? ["State Complaint"] : [],
      isOptional: ps.slug === "state-complaint",
    };
  });

  // Add an approval gate right after Records Review (or between stages if configured)
  const approvalGates: WorkflowApprovalGate[] = [];
  const recordsIdx = stages.findIndex((s) => s.name.toLowerCase().includes("record"));
  if (recordsIdx >= 0 && recordsIdx < stages.length - 1) {
    const recStage = stages[recordsIdx];
    const nextStage = stages[recordsIdx + 1];
    approvalGates.push({
      id: `gate-${recStage.id}-to-${nextStage.id}`,
      title: "Advocate approval",
      description: `Lead Special Education Advocate must review findings before moving from ${recStage.name} to ${nextStage.name}.`,
      fromStageId: recStage.id,
      toStageId: nextStage.id,
      requiredRole: "Lead Special Education Advocate",
      requiredStepIds: recStage.guideSteps.filter((gs) => gs.required).map((gs) => gs.id),
      requiredEvidenceNote: "Completed IEP & evaluation findings saved in student dossier",
      enabled: true,
    });
  }

  const transitions: WorkflowTransitionRule[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    transitions.push({
      id: `trans-${stages[i].id}-${stages[i + 1].id}`,
      fromStageId: stages[i].id,
      toStageId: stages[i + 1].id,
    });
  }

  const synced = syncTraditionalFromStages(stages, approvalGates, [], []);

  return {
    schemaVersion: 2,
    definitionVersion: 1,
    nodes: synced.nodes,
    edges: synced.edges,
    stages,
    transitions,
    approvalGates,
    monorailLayout: {},
    meta: {
      syncedWithPipeline: true,
      projectTypes: DEFAULT_PROJECT_TYPES,
    },
  };
}

/**
 * Evaluates whether a stage or guide step applies to the currently previewed Plan & Project Type.
 * Empty applicability arrays mean "always applies".
 */
export function isApplicableToScope(
  item: { applicablePlans?: string[]; applicableProjectTypes?: string[] },
  planFilter: string,
  projectTypeFilter: string
): boolean {
  const plans = item.applicablePlans || [];
  const projects = item.applicableProjectTypes || [];

  const planOk =
    !planFilter ||
    planFilter === "all" ||
    plans.length === 0 ||
    plans.some((p) => p.toLowerCase() === planFilter.toLowerCase());

  const projectOk =
    !projectTypeFilter ||
    projectTypeFilter === "all" ||
    projects.length === 0 ||
    projects.some((p) => p.toLowerCase() === projectTypeFilter.toLowerCase());

  return planOk && projectOk;
}

// ─── Serpentine Monorail Geometry Engine ─────────────────────────────────────
// Consistent coordinate system independent of viewport size; transforms cleanly for zoom & pan.

export interface StationPosition {
  stageId: string;
  x: number;
  y: number;
  row: number;
  colInRow: number;
  direction: 1 | -1; // 1 = left-to-right, -1 = right-to-left
}

export interface MonorailGeometry {
  width: number;
  height: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  stations: StationPosition[];
  stationMap: Record<string, StationPosition>;
  mainPathD: string;
  segmentPaths: Array<{
    fromStageId: string;
    toStageId: string;
    d: string;
    midPoint: { x: number; y: number };
    angleDeg: number;
    isTurn: boolean;
  }>;
}

export interface RailPieceSocketDef {
  name: string;
  role: "in" | "out" | "branch_out" | "branch_in";
  routeType: "main" | "guide" | "automation";
  x: number;
  y: number;
  angleDeg: number;
}

export interface RailPieceGeometryResult {
  localPathD: string;
  worldSockets: RailPieceSocketDef[];
  localSockets: RailPieceSocketDef[];
}

/**
 * Exact geometric definitions for all 5 premade cosmetic snap rail pieces.
 * All paths start at local origin (0, 0) pointing east (0 deg) so snapping
 * a piece's "in" socket to any target socket aligns smoothly along the target's tangent angle!
 */
export function getRailPieceGeometry(piece: MonorailCosmeticPiece): RailPieceGeometryResult {
  let localPathD = "";
  let localSockets: RailPieceSocketDef[] = [];
  const rt = piece.routeType || "main";

  switch (piece.kind) {
    case "straight":
      localPathD = "M 0 0 L 140 0";
      localSockets = [
        { name: "in", role: "in", routeType: rt, x: 0, y: 0, angleDeg: 180 },
        { name: "out", role: "out", routeType: rt, x: 140, y: 0, angleDeg: 0 },
      ];
      break;
    case "quarter_turn":
      localPathD = "M 0 0 C 56 0, 96 40, 96 96";
      localSockets = [
        { name: "in", role: "in", routeType: rt, x: 0, y: 0, angleDeg: 180 },
        { name: "out", role: "out", routeType: rt, x: 96, y: 96, angleDeg: 90 },
      ];
      break;
    case "u_turn":
      localPathD = "M 0 0 C 110 0, 110 144, 0 144";
      localSockets = [
        { name: "in", role: "in", routeType: rt, x: 0, y: 0, angleDeg: 180 },
        { name: "out", role: "out", routeType: rt, x: 0, y: 144, angleDeg: 180 },
      ];
      break;
    case "branch":
      localPathD = "M 0 0 L 140 0 M 28 0 C 66 0, 82 54, 134 54";
      localSockets = [
        { name: "in", role: "in", routeType: rt, x: 0, y: 0, angleDeg: 180 },
        { name: "out", role: "out", routeType: rt, x: 140, y: 0, angleDeg: 0 },
        { name: "branch_out", role: "branch_out", routeType: rt, x: 134, y: 54, angleDeg: 0 },
      ];
      break;
    case "merge":
      localPathD = "M 0 0 L 140 0 M 6 54 C 58 54, 74 0, 112 0";
      localSockets = [
        { name: "in", role: "in", routeType: rt, x: 0, y: 0, angleDeg: 180 },
        { name: "branch_in", role: "branch_in", routeType: rt, x: 6, y: 54, angleDeg: 180 },
        { name: "out", role: "out", routeType: rt, x: 140, y: 0, angleDeg: 0 },
      ];
      break;
  }

  const rad = (piece.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const worldSockets: RailPieceSocketDef[] = localSockets.map((s) => ({
    ...s,
    x: Math.round((piece.x + s.x * cos - s.y * sin) * 10) / 10,
    y: Math.round((piece.y + s.x * sin + s.y * cos) * 10) / 10,
    angleDeg: ((s.angleDeg + piece.rotationDeg) % 360 + 360) % 360,
  }));

  return { localPathD, localSockets, worldSockets };
}

/**
 * Generates the signature 9-station Waypoint Starter Monorail layout matching the visual reference.
 * Strictly used as an explicit sample preview on empty workflows — NEVER saved until the user clicks "Use this starter".
 */
export function buildSampleStarterWorkflowDocument(): WorkflowDocumentV2 {
  const starterSpecs: Array<{
    id: string;
    name: string;
    icon: StageIconKey;
    role: string;
    waitingOn?: string;
    workspace: WorkflowGuideStep["workspaceLinkType"];
    description: string;
  }> = [
    {
      id: "starter-new-lead",
      name: "New Lead",
      icon: "user-plus",
      role: "Intake Coordinator",
      workspace: "discovery_console",
      description: "Initial family inquiry captured and routed for advocacy review.",
    },
    {
      id: "starter-discovery",
      name: "Discovery",
      icon: "search",
      role: "Lead Special Education Advocate",
      workspace: "discovery_console",
      description: "Initial discovery consultation to map IEP history, priorities, and plan fit.",
    },
    {
      id: "starter-onboarding",
      name: "Onboarding",
      icon: "layers",
      role: "Operations & Billing",
      waitingOn: "Signed agreement & portal setup",
      workspace: "agreements",
      description: "Agreement execution, billing confirmation, and family portal activation.",
    },
    {
      id: "starter-records-review",
      name: "Records Review",
      icon: "file-text",
      role: "Assigned Advocate",
      waitingOn: "Parent records",
      workspace: "meeting_assemble",
      description: "Comprehensive IEP, evaluation, and PWN audit before strategy planning.",
    },
    {
      id: "starter-blueprint",
      name: "Blueprint",
      icon: "layers",
      role: "Assigned Advocate",
      workspace: "meeting_blueprint",
      description: "Measurable goals, service proposals, and talking points prepared with family.",
    },
    {
      id: "starter-meeting",
      name: "Meeting",
      icon: "calendar",
      role: "Assigned Advocate",
      workspace: "meeting_space",
      description: "Live IEP/504 table representation with real-time commitment logging.",
    },
    {
      id: "starter-parent-update",
      name: "Parent Update",
      icon: "message-circle",
      role: "Assigned Advocate",
      workspace: "post_meeting_review",
      description: "Post-meeting debrief, PWN verification, and parent summary delivery.",
    },
    {
      id: "starter-follow-up",
      name: "Follow-Up",
      icon: "refresh-cw",
      role: "Assigned Advocate",
      workspace: "post_meeting_review",
      description: "Verify school delivery of agreed services, evaluations, and final IEP copy.",
    },
    {
      id: "starter-ongoing-support",
      name: "Ongoing Support",
      icon: "handshake",
      role: "Assigned Advocate",
      workspace: "student_dossier",
      description: "Continuous progress monitoring and proactive school communication.",
    },
  ];

  const stages: WorkflowStageDefinition[] = starterSpecs.map((spec, idx) => ({
    id: spec.id,
    name: spec.name,
    order: idx + 1,
    description: spec.description,
    icon: spec.icon,
    accentColor: "#C9A55A",
    assignedRole: spec.role,
    waitingOnDefault: spec.waitingOn,
    workspaceLinkType: spec.workspace,
    guideSteps: buildStarterGuideSteps(spec.id, spec.name),
    automations: buildStarterAutomations(spec.id, spec.name),
    applicablePlans: [],
    applicableProjectTypes: [],
  }));

  const recordsStage = stages.find((s) => s.id === "starter-records-review")!;
  const approvalGates: WorkflowApprovalGate[] = [
    {
      id: "starter-gate-advocate-approval",
      title: "Advocate approval",
      description: "Lead Special Education Advocate reviews Blueprint & IEP strategy before the school meeting proceeds to Parent Update.",
      fromStageId: "starter-meeting",
      toStageId: "starter-parent-update",
      requiredRole: "Lead Special Education Advocate",
      requiredStepIds: recordsStage.guideSteps.filter((gs) => gs.required).slice(0, 3).map((gs) => gs.id),
      requiredEvidenceNote: "Verified IEP goals & PWN alignment reviewed",
      enabled: true,
    },
  ];

  const transitions: WorkflowTransitionRule[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    transitions.push({
      id: `starter-trans-${i + 1}`,
      fromStageId: stages[i].id,
      toStageId: stages[i + 1].id,
    });
  }

  const synced = syncTraditionalFromStages(stages, approvalGates, [], []);

  return {
    schemaVersion: 2,
    definitionVersion: 1,
    nodes: synced.nodes,
    edges: synced.edges,
    stages,
    transitions,
    approvalGates,
    monorailLayout: {},
    monorailRailPieces: [],
    monorailVisualPrefs: {
      expandedGuideStageIds: ["starter-records-review"],
      expandedAutomationStageIds: ["starter-onboarding"],
    },
    meta: {
      syncedWithPipeline: false,
      projectTypes: DEFAULT_PROJECT_TYPES,
    },
  };
}

/**
 * Computes a spacious, balanced serpentine monorail layout matching the reference map:
 * - Row 0: left -> right
 * - Right U-turn curve down to Row 1
 * - Row 1: right -> left
 * - Left U-turn curve down to Row 2
 * - Row 2: left -> right
 * Respects user custom positions (`monorailLayout`) while keeping rail endpoints attached!
 */
export function computeMonorailGeometry(
  stages: WorkflowStageDefinition[],
  customLayout: Record<string, { x: number; y: number }> = {},
  options?: { stationsPerRow?: number; railPieces?: MonorailCosmeticPiece[] }
): MonorailGeometry {
  const ordered = [...stages].sort((a, b) => a.order - b.order);
  const count = ordered.length;
  const perRow = options?.stationsPerRow ?? (count <= 4 ? Math.max(count, 1) : count <= 12 ? 3 : 4);

  const marginX = 215;
  const colSpacing = perRow === 4 ? 270 : 325;
  const rowSpacing = 228;
  const topPadding = 118;
  const rows = Math.max(1, Math.ceil(count / perRow));

  const width = Math.max(1140, marginX * 2 + (Math.min(count, perRow) - 1) * colSpacing);
  const height = Math.max(660, topPadding + (rows - 1) * rowSpacing + 185);

  const stations: StationPosition[] = ordered.map((stage, idx) => {
    const row = Math.floor(idx / perRow);
    const posInRow = idx % perRow;
    const itemsInThisRow = Math.min(perRow, count - row * perRow);
    const direction: 1 | -1 = row % 2 === 0 ? 1 : -1;

    // Evenly space stations across the track width
    const trackSpan = (Math.min(count, perRow) - 1) * colSpacing;
    const effectiveSpacing = itemsInThisRow > 1 ? trackSpan / (itemsInThisRow - 1) : 0;
    const colIndex = direction === 1 ? posInRow : itemsInThisRow - 1 - posInRow;

    const autoX =
      itemsInThisRow === 1
        ? width / 2
        : marginX + colIndex * effectiveSpacing;
    const autoY = topPadding + row * rowSpacing;

    const override = customLayout[stage.id];
    return {
      stageId: stage.id,
      x: override ? override.x : autoX,
      y: override ? override.y : autoY,
      row,
      colInRow: colIndex,
      direction,
    };
  });

  const stationMap: Record<string, StationPosition> = {};
  for (const st of stations) stationMap[st.stageId] = st;

  // Build smooth connected rail segments between sequential stations
  const segmentPaths: MonorailGeometry["segmentPaths"] = [];
  const mainPathParts: string[] = [];

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const expandBounds = (x: number, y: number, padX = 95, padY = 85) => {
    if (x - padX < minX) minX = x - padX;
    if (x + padX > maxX) maxX = x + padX;
    if (y - padY < minY) minY = y - padY;
    if (y + padY > maxY) maxY = y + padY;
  };

  for (const st of stations) {
    expandBounds(st.x, st.y, 110, 95);
  }

  for (let i = 0; i < stations.length; i++) {
    const curr = stations[i];
    if (i === 0) {
      mainPathParts.push(`M ${curr.x} ${curr.y}`);
      continue;
    }
    const prev = stations[i - 1];
    let segD = "";
    let midPoint = { x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 };
    let angleDeg = (Math.atan2(curr.y - prev.y, curr.x - prev.x) * 180) / Math.PI;
    let isTurn = false;

    const sameRow = Math.abs(prev.y - curr.y) < 35;
    if (sameRow) {
      const dx = curr.x - prev.x;
      const cp1x = prev.x + dx * 0.35;
      const cp2x = prev.x + dx * 0.65;
      segD = `M ${prev.x} ${prev.y} C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`;
      mainPathParts.push(`C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`);
    } else {
      // Smooth wide semicircular serpentine turn at the right or left end of the row
      isTurn = true;
      const turnRight = prev.direction === 1;
      const bow = 168;
      const outerX = turnRight
        ? Math.max(prev.x, curr.x) + bow
        : Math.min(prev.x, curr.x) - bow;
      segD = `M ${prev.x} ${prev.y} C ${outerX} ${prev.y}, ${outerX} ${curr.y}, ${curr.x} ${curr.y}`;
      mainPathParts.push(`C ${outerX} ${prev.y}, ${outerX} ${curr.y}, ${curr.x} ${curr.y}`);
      // Cubic bezier midpoint at t=0.5: 0.125*P0 + 0.375*P1 + 0.375*P2 + 0.125*P3
      midPoint = {
        x: 0.125 * prev.x + 0.375 * outerX + 0.375 * outerX + 0.125 * curr.x,
        y: (prev.y + curr.y) / 2,
      };
      angleDeg = curr.y >= prev.y ? 90 : -90;
      expandBounds(midPoint.x, midPoint.y, 48, 36);
    }

    segmentPaths.push({
      fromStageId: prev.stageId,
      toStageId: curr.stageId,
      d: segD,
      midPoint,
      angleDeg,
      isTurn,
    });
  }

  // Include any user-placed cosmetic rail pieces in Fit-to-Screen bounds
  for (const piece of options?.railPieces || []) {
    const geo = getRailPieceGeometry(piece);
    expandBounds(piece.x, piece.y, 45, 45);
    for (const sock of geo.worldSockets) {
      expandBounds(sock.x, sock.y, 45, 45);
    }
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = width;
    maxY = height;
  }

  return {
    width: Math.max(width, maxX - minX),
    height: Math.max(height, maxY - minY),
    bounds: { minX, minY, maxX, maxY },
    stations,
    stationMap,
    mainPathD: mainPathParts.join(" "),
    segmentPaths,
  };
}

/**
 * Evaluates approval gates for a case transition from `currentStageId` to `targetStageId`.
 * Pure shared validator used by both backend enforcement and frontend gate status UI.
 */
export function evaluateTransitionApprovalGates(params: {
  doc: WorkflowDocumentV2;
  fromStageId: string;
  toStageId: string;
  completedStepIds: Set<string>;
  approvedGateIds: Set<string>;
}): {
  allowed: boolean;
  blockingGates: Array<{
    gate: WorkflowApprovalGate;
    missingStepIds: string[];
    missingStepTitles: string[];
    needsRoleSignOff: boolean;
  }>;
} {
  const { doc, fromStageId, toStageId, completedStepIds, approvedGateIds } = params;
  const stageMap = new Map(doc.stages.map((s) => [s.id, s]));

  // Find all enabled gates directly guarding this transition OR on any intermediate stage when jumping forward
  const fromOrder = stageMap.get(fromStageId)?.order ?? 0;
  const toOrder = stageMap.get(toStageId)?.order ?? 0;

  const relevantGates = doc.approvalGates.filter((g) => {
    if (!g.enabled) return false;
    if (g.fromStageId === fromStageId && g.toStageId === toStageId) return true;
    // Prevent skipping past an unapproved forward gate
    if (toOrder > fromOrder) {
      const gateFromOrder = stageMap.get(g.fromStageId)?.order ?? 0;
      const gateToOrder = stageMap.get(g.toStageId)?.order ?? 0;
      return gateFromOrder >= fromOrder && gateToOrder <= toOrder;
    }
    return false;
  });

  const blockingGates: Array<{
    gate: WorkflowApprovalGate;
    missingStepIds: string[];
    missingStepTitles: string[];
    needsRoleSignOff: boolean;
  }> = [];

  for (const gate of relevantGates) {
    const srcStage = stageMap.get(gate.fromStageId);
    const missingStepIds = (gate.requiredStepIds || []).filter(
      (sid) => !completedStepIds.has(sid)
    );
    const missingStepTitles = missingStepIds.map(
      (sid) => srcStage?.guideSteps.find((gs) => gs.id === sid)?.title || sid
    );
    const needsRoleSignOff = !approvedGateIds.has(gate.id);

    if (missingStepIds.length > 0 || needsRoleSignOff) {
      blockingGates.push({
        gate,
        missingStepIds,
        missingStepTitles,
        needsRoleSignOff,
      });
    }
  }

  return {
    allowed: blockingGates.length === 0,
    blockingGates,
  };
}

import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Zap,
  ListChecks,
  Sliders,
  AlertTriangle,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  DEFAULT_PROJECT_TYPES,
  ROLE_OPTIONS,
  WORKSPACE_LINK_LABELS,
  type StageIconKey,
  type WorkflowApprovalGate,
  type WorkflowDocumentV2,
  type WorkflowGuideStep,
  type WorkflowStageAutomationLink,
  type WorkflowStageDefinition,
} from "@shared/workflowModel";

const ICON_OPTIONS: Array<{ value: StageIconKey; label: string }> = [
  { value: "user-plus", label: "New Lead" },
  { value: "search", label: "Discovery / Search" },
  { value: "layers", label: "Onboarding / Layers" },
  { value: "file-text", label: "Records / Document" },
  { value: "compass", label: "Blueprint / Compass" },
  { value: "calendar", label: "Meeting / Calendar" },
  { value: "message-circle", label: "Parent Update" },
  { value: "refresh-cw", label: "Follow-Up" },
  { value: "handshake", label: "Ongoing Support" },
  { value: "scale", label: "Legal / State Complaint" },
  { value: "shield-check", label: "Compliance / Approval" },
  { value: "check-circle", label: "Completed" },
];

const SUPPORTED_AUTOMATION_TRIGGERS = [
  { value: "stage_changed", label: "Stage entered (stage_changed)" },
  { value: "file_completed", label: "Records / file completed (file_completed)" },
  { value: "meeting_scheduled", label: "Meeting scheduled (meeting_scheduled)" },
  { value: "session_ends", label: "Session ended (session_ends)" },
  { value: "contract_signed", label: "Contract signed (contract_signed)" },
  { value: "first_payment_paid", label: "First payment paid (first_payment_paid)" },
  { value: "manual_trigger", label: "Manual trigger (manual_trigger)" },
];

interface WorkflowRouteEditorDrawerProps {
  open: boolean;
  stageId: string | null;
  initialTab?: "stage" | "steps" | "gates" | "automations";
  onClose: () => void;
  doc: WorkflowDocumentV2;
  plans: Array<{ key: string; name: string }>;
  templates: Array<{ id: string; name: string }>;
  realAutomations: Array<{
    id: number;
    name: string;
    triggerEvent: string;
    isActive: boolean;
    steps: any[];
  }>;
  onUpdateStage: (stageId: string, updater: (prev: WorkflowStageDefinition) => WorkflowStageDefinition) => void;
  onReorderStage: (stageId: string, direction: "earlier" | "later") => void;
  onDeleteStage: (stageId: string) => void;
  onUpsertGate: (gate: WorkflowApprovalGate) => void;
  onDeleteGate: (gateId: string) => void;
  onRefreshContext: () => void;
}

export function WorkflowRouteEditorDrawer({
  open,
  stageId,
  initialTab = "stage",
  onClose,
  doc,
  plans,
  templates,
  realAutomations,
  onUpdateStage,
  onReorderStage,
  onDeleteStage,
  onUpsertGate,
  onDeleteGate,
  onRefreshContext,
}: WorkflowRouteEditorDrawerProps) {
  const [tab, setTab] = useState<"stage" | "steps" | "gates" | "automations">(initialTab);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepParallel, setNewStepParallel] = useState("");
  const [newAutoTitle, setNewAutoTitle] = useState("");
  const [newAutoTrigger, setNewAutoTrigger] = useState("stage_changed");
  const [newAutoActionType, setNewAutoActionType] = useState<"task" | "email" | "file" | "prepare_draft">("task");
  const [newAutoRequiresApproval, setNewAutoRequiresApproval] = useState(true);
  const [createLiveInEngine, setCreateLiveInEngine] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const saveRealAutomationMutation = trpc.automations.save.useMutation({
    onSuccess: () => {
      onRefreshContext();
    },
    onError: (err) => {
      toast.error(err.message || "Could not create rule in Automations Engine.");
    },
  });

  React.useEffect(() => {
    setTab(initialTab);
    setConfirmDeleteOpen(false);
  }, [initialTab, stageId, open]);

  if (!open || !stageId) return null;

  const orderedStages = [...doc.stages].sort((a, b) => a.order - b.order);
  const stageIdx = orderedStages.findIndex((s) => s.id === stageId);
  const stage = orderedStages[stageIdx];
  if (!stage) return null;

  const nextStage = stageIdx < orderedStages.length - 1 ? orderedStages[stageIdx + 1] : null;
  const attachedGates = doc.approvalGates.filter(
    (g) => g.fromStageId === stage.id || g.toStageId === stage.id
  );
  const outgoingGates = doc.approvalGates.filter((g) => g.fromStageId === stage.id);

  const handleAddGuideStep = () => {
    const clean = newStepTitle.trim();
    if (!clean) {
      toast.error("Enter a guide step title.");
      return;
    }
    const nextStep: WorkflowGuideStep = {
      id: `${stage.id}-gs-${Date.now()}`,
      title: clean,
      shortExplanation: `Complete "${clean}" during ${stage.name}.`,
      detailedInstructions: "",
      assignedRole: stage.assignedRole || "Assigned Advocate",
      required: true,
      parallelGroup: newStepParallel.trim() || null,
      workspaceLinkType: stage.workspaceLinkType || "student_dossier",
      order: stage.guideSteps.length + 1,
    };
    onUpdateStage(stage.id, (prev) => ({
      ...prev,
      guideSteps: [...prev.guideSteps, nextStep],
    }));
    setNewStepTitle("");
    setNewStepParallel("");
  };

  const handleAddGate = () => {
    if (!nextStage) {
      toast.error("Add a following station before placing an approval gate after this stage.");
      return;
    }
    const newGate: WorkflowApprovalGate = {
      id: `gate-${Date.now()}`,
      title: "Advocate approval",
      description: `Required approval before moving from ${stage.name} to ${nextStage.name}.`,
      fromStageId: stage.id,
      toStageId: nextStage.id,
      requiredRole: "Lead Special Education Advocate",
      requiredStepIds: stage.guideSteps.filter((gs) => gs.required).map((gs) => gs.id),
      enabled: true,
    };
    onUpsertGate(newGate);
    toast.success("Approval gate added to route.");
  };

  const handleAddAutomation = async () => {
    const title = newAutoTitle.trim();
    if (!title) {
      toast.error("Enter an automation title.");
      return;
    }

    let createdAutomationId: number | null = null;
    if (createLiveInEngine) {
      try {
        const engineStepType: "task" | "email" | "file" =
          newAutoActionType === "prepare_draft" ? "task" : newAutoActionType;
        const res = await saveRealAutomationMutation.mutateAsync({
          name: `${stage.name} · ${title}`,
          description: `Configured via Workflow Designer for stage "${stage.name}".`,
          triggerEvent: newAutoTrigger,
          isActive: !newAutoRequiresApproval, // Keep paused draft when approval required!
          triggerConfig: { stageTo: stage.name },
          steps: [
            {
              type: engineStepType,
              title:
                newAutoActionType === "prepare_draft"
                  ? `[Draft Only] ${title}`
                  : title,
              delayValue: 0,
              delayUnit: "minutes",
              delayAnchor: "after_trigger",
              config:
                engineStepType === "task"
                  ? {
                      taskTitle:
                        newAutoActionType === "prepare_draft"
                          ? `Prepare draft: ${title}`
                          : title,
                      taskPriority: "medium",
                    }
                  : engineStepType === "email"
                  ? {
                      templateId: "tpl_post_session",
                      templateName: title,
                      notifyParentByEmail: !newAutoRequiresApproval,
                    }
                  : {
                      fileId: "102",
                      fileName: title,
                      notifyParentByEmail: false,
                    },
            },
          ],
        });
        createdAutomationId = (res as any)?.id ?? null;
      } catch {
        return;
      }
    }

    const newLink: WorkflowStageAutomationLink = {
      id: `${stage.id}-auto-${Date.now()}`,
      automationId: createdAutomationId,
      title,
      triggerLabel:
        SUPPORTED_AUTOMATION_TRIGGERS.find((t) => t.value === newAutoTrigger)?.label.split(" (")[0] ||
        "Stage entered",
      triggerEvent: newAutoTrigger,
      conditionSummary: `Stage equals "${stage.name}"`,
      actionType: newAutoActionType,
      actionSummary:
        newAutoActionType === "prepare_draft"
          ? "Prepare draft document/message for review (remains unsent)"
          : newAutoActionType === "task"
          ? `Create internal task: ${title}`
          : newAutoActionType === "email"
          ? newAutoRequiresApproval
            ? "Queue email draft requiring approval before sending"
            : "Send configured email template"
          : `Assign Smart File: ${title}`,
      requiresApproval: newAutoRequiresApproval || newAutoActionType === "prepare_draft",
      enabled: true,
      communicationMode:
        newAutoActionType === "prepare_draft"
          ? "prepare_draft"
          : newAutoActionType === "task"
          ? "internal_only"
          : newAutoRequiresApproval
          ? "send_after_approval"
          : "automatic_send",
    };

    onUpdateStage(stage.id, (prev) => ({
      ...prev,
      automations: [...prev.automations, newLink],
    }));
    setNewAutoTitle("");
    toast.success(
      createdAutomationId
        ? `Automation created in PG-013 (#${createdAutomationId}) and attached to ${stage.name}.`
        : "Automation node added to stage."
    );
  };

  const toggleScopeChip = (field: "applicablePlans" | "applicableProjectTypes", val: string) => {
    onUpdateStage(stage.id, (prev) => {
      const current = prev[field] || [];
      const exists = current.includes(val);
      return {
        ...prev,
        [field]: exists ? current.filter((v) => v !== val) : [...current, val],
      };
    });
  };

  return (
    <aside
      data-testid="workflow-route-editor-drawer"
      aria-label={`Edit stage ${stage.name}`}
      className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[440px] max-w-full bg-[#040D24]/98 border-l border-[#C9A55A]/55 shadow-[-18px_0_48px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#182C54] bg-[#06122E] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#E5C784]">
            Edit Station · Step {stageIdx + 1} of {orderedStages.length}
          </span>
          <h3
            className="text-base font-bold text-white truncate"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {stage.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close editor"
          className="p-1.5 rounded-lg text-[#9FB2CE] hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Sub-Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1.5 bg-[#030A1C] border-b border-[#182C54] text-[11px]">
        {[
          { id: "stage", label: "Stage", icon: Sliders },
          { id: "steps", label: `Guide (${stage.guideSteps.length})`, icon: ListChecks },
          { id: "gates", label: `Gates (${outgoingGates.length})`, icon: ShieldCheck },
          { id: "automations", label: `Auto (${stage.automations.length})`, icon: Zap },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={cn(
                "py-1.5 px-1 rounded-md font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors",
                tab === t.id
                  ? "bg-[#12264E] text-[#F5E3B8] border border-[#C9A55A]/55"
                  : "text-[#8FA4C2] hover:text-white border border-transparent"
              )}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Bodies */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {tab === "stage" && (
          <>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#C8D7EC] block">
                Station Name (syncs with Traditional view)
              </label>
              <input
                type="text"
                data-testid="editor-stage-name-input"
                value={stage.name}
                onChange={(e) =>
                  onUpdateStage(stage.id, (prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full h-9 rounded-lg bg-[#06112B] border border-[#243B64] px-3 text-white focus:border-[#E5C784] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#C8D7EC] block">
                Description
              </label>
              <textarea
                rows={2}
                value={stage.description}
                onChange={(e) =>
                  onUpdateStage(stage.id, (prev) => ({ ...prev, description: e.target.value }))
                }
                className="w-full rounded-lg bg-[#06112B] border border-[#243B64] px-3 py-2 text-white focus:border-[#E5C784] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#C8D7EC] block">Station Icon</label>
                <select
                  value={stage.icon}
                  onChange={(e) =>
                    onUpdateStage(stage.id, (prev) => ({ ...prev, icon: e.target.value as StageIconKey }))
                  }
                  className="w-full h-8.5 rounded-lg bg-[#06112B] border border-[#243B64] px-2 text-white"
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#C8D7EC] block">Assigned Role</label>
                <select
                  value={stage.assignedRole}
                  onChange={(e) =>
                    onUpdateStage(stage.id, (prev) => ({ ...prev, assignedRole: e.target.value }))
                  }
                  className="w-full h-8.5 rounded-lg bg-[#06112B] border border-[#243B64] px-2 text-white"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#C8D7EC] block">
                  Waiting On Label
                </label>
                <input
                  type="text"
                  value={stage.waitingOnDefault || ""}
                  placeholder="e.g. Parent records"
                  onChange={(e) =>
                    onUpdateStage(stage.id, (prev) => ({ ...prev, waitingOnDefault: e.target.value }))
                  }
                  className="w-full h-8.5 rounded-lg bg-[#06112B] border border-[#243B64] px-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#C8D7EC] block">
                  Linked Workspace
                </label>
                <select
                  value={stage.workspaceLinkType || "student_dossier"}
                  onChange={(e) =>
                    onUpdateStage(stage.id, (prev) => ({
                      ...prev,
                      workspaceLinkType: e.target.value as any,
                    }))
                  }
                  className="w-full h-8.5 rounded-lg bg-[#06112B] border border-[#243B64] px-2 text-white"
                >
                  {Object.entries(WORKSPACE_LINK_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Plan Applicability (Rule 16 — reads real plans) */}
            <div className="space-y-1.5 pt-2 border-t border-[#182C54]">
              <label className="text-[11px] font-semibold text-[#C8D7EC] block">
                Applies to Plans (leave empty for All Plans)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {plans.map((p) => {
                  const active = (stage.applicablePlans || []).includes(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => toggleScopeChip("applicablePlans", p.key)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] border cursor-pointer transition-colors",
                        active
                          ? "bg-[#193261] border-[#E5C784] text-[#FFF4D4] font-semibold"
                          : "bg-[#06112B] border-[#213863] text-[#9FB2CE] hover:text-white"
                      )}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Project Type Applicability (Rule 16) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#C8D7EC] block">
                Applies to Project Types (leave empty for All Projects)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_PROJECT_TYPES.map((pt) => {
                  const active = (stage.applicableProjectTypes || []).includes(pt);
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => toggleScopeChip("applicableProjectTypes", pt)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] border cursor-pointer transition-colors",
                        active
                          ? "bg-[#193261] border-[#60A5FA] text-white font-semibold"
                          : "bg-[#06112B] border-[#213863] text-[#9FB2CE] hover:text-white"
                      )}
                    >
                      {pt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explicit Reorder Controls (Moving visually on canvas NEVER changes order; reordering is explicit!) */}
            <div className="pt-3 border-t border-[#182C54] space-y-2">
              <span className="text-[11px] font-semibold text-[#C8D7EC] block">
                Explicit Workflow Sequence
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="editor-move-stage-earlier"
                  disabled={stageIdx <= 0}
                  onClick={() => onReorderStage(stage.id, "earlier")}
                  className="h-8 rounded-lg bg-[#081736] hover:bg-[#102552] disabled:opacity-40 border border-[#243B64] text-[#DCE6F5] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Move Earlier</span>
                </button>
                <button
                  type="button"
                  data-testid="editor-move-stage-later"
                  disabled={stageIdx >= orderedStages.length - 1}
                  onClick={() => onReorderStage(stage.id, "later")}
                  className="h-8 rounded-lg bg-[#081736] hover:bg-[#102552] disabled:opacity-40 border border-[#243B64] text-[#DCE6F5] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Move Later</span>
                </button>
              </div>
            </div>

            {/* Remove Stage with Dependency Check (Rule 17) */}
            <div className="pt-3 border-t border-[#182C54]">
              {!confirmDeleteOpen ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="w-full h-8 rounded-lg bg-rose-950/40 hover:bg-rose-950/75 border border-rose-500/40 text-rose-300 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Station</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-rose-950/45 border border-rose-500/55 space-y-2">
                  <div className="flex items-start gap-2 text-rose-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <div>
                      <p className="font-semibold">Dependency Check before removing "{stage.name}"</p>
                      <p className="text-[11px] text-rose-200/80 mt-0.5">
                        Contains {stage.guideSteps.length} guide step(s), {stage.automations.length} automation link(s), and{" "}
                        {attachedGates.length} connected approval gate(s). Existing active cases are NOT reset.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(false)}
                      className="h-7.5 rounded-lg bg-[#0A1836] border border-[#243B64] text-[#DCE6F5] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteStage(stage.id);
                        onClose();
                      }}
                      className="h-7.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                    >
                      Confirm Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "steps" && (
          <>
            <div className="p-3 rounded-xl bg-[#071530] border border-[#223B6B] space-y-2">
              <span className="text-[11px] font-semibold text-[#93C5FD] block">
                Add Blue Guide Step
              </span>
              <input
                type="text"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                placeholder="e.g. Confirm IEP evaluations received"
                className="w-full h-8 rounded-lg bg-[#040C20] border border-[#243B64] px-2.5 text-white"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStepParallel}
                  onChange={(e) => setNewStepParallel(e.target.value)}
                  placeholder="Optional parallel group (e.g. audit)"
                  className="flex-1 h-8 rounded-lg bg-[#040C20] border border-[#243B64] px-2.5 text-white text-[11px]"
                />
                <button
                  type="button"
                  onClick={handleAddGuideStep}
                  className="px-3 h-8 rounded-lg bg-gradient-to-b from-[#DFC07C] to-[#987634] text-[#061028] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {stage.guideSteps.map((step, i) => (
                <div
                  key={step.id}
                  className="p-3 rounded-xl bg-[#06112B] border border-[#1E3560] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-[#93C5FD]">Step #{i + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStage(stage.id, (prev) => ({
                          ...prev,
                          guideSteps: prev.guideSteps
                            .filter((gs) => gs.id !== step.id)
                            .map((gs, idx) => ({ ...gs, order: idx + 1 })),
                        }))
                      }
                      className="text-rose-400 hover:text-rose-300 cursor-pointer"
                      title="Delete guide step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) =>
                      onUpdateStage(stage.id, (prev) => ({
                        ...prev,
                        guideSteps: prev.guideSteps.map((gs) =>
                          gs.id === step.id ? { ...gs, title: e.target.value } : gs
                        ),
                      }))
                    }
                    className="w-full h-8 rounded bg-[#040C20] border border-[#243B64] px-2 text-white font-medium"
                  />
                  <input
                    type="text"
                    value={step.shortExplanation}
                    placeholder="Short purpose explanation"
                    onChange={(e) =>
                      onUpdateStage(stage.id, (prev) => ({
                        ...prev,
                        guideSteps: prev.guideSteps.map((gs) =>
                          gs.id === step.id ? { ...gs, shortExplanation: e.target.value } : gs
                        ),
                      }))
                    }
                    className="w-full h-7.5 rounded bg-[#040C20] border border-[#1E335C] px-2 text-[#C8D7EC] text-[11px]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={step.workspaceLinkType || "none"}
                      onChange={(e) =>
                        onUpdateStage(stage.id, (prev) => ({
                          ...prev,
                          guideSteps: prev.guideSteps.map((gs) =>
                            gs.id === step.id
                              ? { ...gs, workspaceLinkType: e.target.value as any }
                              : gs
                          ),
                        }))
                      }
                      className="h-7.5 rounded bg-[#040C20] border border-[#1E335C] px-1.5 text-[11px] text-white"
                    >
                      {Object.entries(WORKSPACE_LINK_LABELS).map(([k, lbl]) => (
                        <option key={k} value={k}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                    <select
                      value={step.templateId || ""}
                      onChange={(e) => {
                        const found = templates.find((t) => t.id === e.target.value);
                        onUpdateStage(stage.id, (prev) => ({
                          ...prev,
                          guideSteps: prev.guideSteps.map((gs) =>
                            gs.id === step.id
                              ? {
                                  ...gs,
                                  templateId: found?.id || null,
                                  templateName: found?.name || null,
                                }
                              : gs
                          ),
                        }));
                      }}
                      className="h-7.5 rounded bg-[#040C20] border border-[#1E335C] px-1.5 text-[11px] text-white"
                    >
                      <option value="">No template attached</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4 pt-1 text-[11px] text-[#C8D7EC]">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={step.required}
                        onChange={(e) =>
                          onUpdateStage(stage.id, (prev) => ({
                            ...prev,
                            guideSteps: prev.guideSteps.map((gs) =>
                              gs.id === step.id ? { ...gs, required: e.target.checked } : gs
                            ),
                          }))
                        }
                      />
                      <span>Required</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(step.requiresApproval)}
                        onChange={(e) =>
                          onUpdateStage(stage.id, (prev) => ({
                            ...prev,
                            guideSteps: prev.guideSteps.map((gs) =>
                              gs.id === step.id
                                ? { ...gs, requiresApproval: e.target.checked }
                                : gs
                            ),
                          }))
                        }
                      />
                      <span>Needs Approval</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "gates" && (
          <>
            <button
              type="button"
              onClick={handleAddGate}
              disabled={!nextStage}
              className="w-full h-9 rounded-lg bg-gradient-to-b from-[#DFC07C] to-[#987634] disabled:opacity-40 text-[#061028] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {nextStage
                  ? `Add Approval Gate → ${nextStage.name}`
                  : "No following station for gate"}
              </span>
            </button>

            {outgoingGates.length === 0 ? (
              <p className="text-[#9FB2CE] italic p-3 rounded-lg bg-[#06112B] border border-[#182C54]">
                No approval gates configured after {stage.name}.
              </p>
            ) : (
              outgoingGates.map((gate) => (
                <div
                  key={gate.id}
                  className="p-3 rounded-xl bg-[#07132E] border border-[#C9A55A]/45 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#E5C784]">
                      Enforced Route Gate
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteGate(gate.id)}
                      className="text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={gate.title}
                    onChange={(e) => onUpsertGate({ ...gate, title: e.target.value })}
                    className="w-full h-8 rounded bg-[#040C20] border border-[#243B64] px-2.5 text-white font-semibold"
                  />
                  <select
                    value={gate.requiredRole}
                    onChange={(e) => onUpsertGate({ ...gate, requiredRole: e.target.value })}
                    className="w-full h-8 rounded bg-[#040C20] border border-[#243B64] px-2 text-white"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        Approver: {r}
                      </option>
                    ))}
                  </select>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#9FB2CE] block">
                      Required Steps Before Approval
                    </span>
                    {stage.guideSteps.map((gs) => {
                      const checked = gate.requiredStepIds.includes(gs.id);
                      return (
                        <label
                          key={gs.id}
                          className="flex items-center gap-2 text-[11px] text-[#DCE6F5] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextIds = e.target.checked
                                ? [...gate.requiredStepIds, gs.id]
                                : gate.requiredStepIds.filter((id) => id !== gs.id);
                              onUpsertGate({ ...gate, requiredStepIds: nextIds });
                            }}
                          />
                          <span>{gs.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === "automations" && (
          <>
            {/* Connect Existing Live PG-013 Automation */}
            {realAutomations.length > 0 && (
              <div className="p-3 rounded-xl bg-[#0B102E] border border-[#7C3AED]/45 space-y-2">
                <span className="text-[11px] font-semibold text-[#DDD6FE] flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span>Attach Existing PG-013 Automation</span>
                </span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const found = realAutomations.find((a) => a.id === id);
                    if (!found) return;
                    const firstType = found.steps?.[0]?.type || "task";
                    onUpdateStage(stage.id, (prev) => ({
                      ...prev,
                      automations: [
                        ...prev.automations,
                        {
                          id: `${stage.id}-auto-${Date.now()}`,
                          automationId: found.id,
                          title: found.name.slice(0, 32),
                          triggerLabel: found.triggerEvent.replace(/_/g, " "),
                          triggerEvent: found.triggerEvent,
                          actionType: firstType,
                          actionSummary: found.steps.map((s: any) => s.title).join(" → ") || found.name,
                          requiresApproval: firstType === "email",
                          enabled: found.isActive,
                          communicationMode:
                            firstType === "task" ? "internal_only" : "send_after_approval",
                        },
                      ],
                    }));
                    e.target.value = "";
                    toast.success(`Linked "${found.name}" to ${stage.name}.`);
                  }}
                  className="w-full h-8.5 rounded-lg bg-[#050A20] border border-[#4C2F9E] px-2 text-white"
                >
                  <option value="">Select a live PG-013 automation…</option>
                  {realAutomations.map((ra) => (
                    <option key={ra.id} value={ra.id}>
                      {ra.name} ({ra.isActive ? "Active" : "Draft"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Create New Automation Node (Optionally creating live rule in PG-013) */}
            <div className="p-3 rounded-xl bg-[#091130] border border-[#5B35C9]/55 space-y-2">
              <span className="text-[11px] font-semibold text-[#DDD6FE] block">
                Create Stage Automation
              </span>
              <input
                type="text"
                value={newAutoTitle}
                onChange={(e) => setNewAutoTitle(e.target.value)}
                placeholder="e.g. Prepare parent update draft"
                className="w-full h-8 rounded bg-[#040A1E] border border-[#322963] px-2.5 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newAutoTrigger}
                  onChange={(e) => setNewAutoTrigger(e.target.value)}
                  className="h-8 rounded bg-[#040A1E] border border-[#322963] px-2 text-white text-[11px]"
                >
                  {SUPPORTED_AUTOMATION_TRIGGERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <select
                  value={newAutoActionType}
                  onChange={(e) => setNewAutoActionType(e.target.value as any)}
                  className="h-8 rounded bg-[#040A1E] border border-[#322963] px-2 text-white text-[11px]"
                >
                  <option value="task">Create Task (Internal)</option>
                  <option value="prepare_draft">Prepare Draft (Unsent)</option>
                  <option value="email">Queue Email (Approval)</option>
                  <option value="file">Assign Smart File</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-[#C8D7EC]">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAutoRequiresApproval}
                    onChange={(e) => setNewAutoRequiresApproval(e.target.checked)}
                  />
                  <span>Requires approval</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createLiveInEngine}
                    onChange={(e) => setCreateLiveInEngine(e.target.checked)}
                  />
                  <span>Save in PG-013</span>
                </label>
              </div>
              <button
                type="button"
                disabled={saveRealAutomationMutation.isPending}
                onClick={handleAddAutomation}
                className="w-full h-8 rounded-lg bg-[#6D44D8] hover:bg-[#7C52E8] text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                {saveRealAutomationMutation.isPending ? "Saving..." : "+ Add Automation to Route"}
              </button>
            </div>

            {/* Existing Stage Automations */}
            <div className="space-y-2">
              {stage.automations.map((auto) => (
                <div
                  key={auto.id}
                  className="p-2.5 rounded-xl bg-[#06112B] border border-[#2C255A] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{auto.title}</p>
                    <p className="text-[10.5px] text-[#A89CC8] truncate">
                      {auto.triggerLabel} · {auto.requiresApproval ? "Approval required" : "Automatic"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStage(stage.id, (prev) => ({
                          ...prev,
                          automations: prev.automations.map((a) =>
                            a.id === auto.id ? { ...a, enabled: !a.enabled } : a
                          ),
                        }))
                      }
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border",
                        auto.enabled
                          ? "bg-emerald-950/60 border-emerald-500/45 text-emerald-300"
                          : "bg-slate-900 border-slate-700 text-slate-400"
                      )}
                    >
                      {auto.enabled ? "On" : "Off"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStage(stage.id, (prev) => ({
                          ...prev,
                          automations: prev.automations.filter((a) => a.id !== auto.id),
                        }))
                      }
                      className="text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

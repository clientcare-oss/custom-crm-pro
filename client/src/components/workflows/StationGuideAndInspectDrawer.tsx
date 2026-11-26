import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Zap,
  ArrowRight,
  Lock,
  FileText,
  Clock,
  RefreshCw,
  TrainFront,
  Pencil,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  resolveWorkspaceHref,
  WORKSPACE_LINK_LABELS,
  type WorkflowApprovalGate,
  type WorkflowDocumentV2,
  type WorkflowExperienceMode,
  type WorkflowGuideStep,
  type WorkflowStageAutomationLink,
  type WorkflowStageDefinition,
} from "@shared/workflowModel";
import type { ConnectedCaseSummary } from "./MonorailCanvas";

export type ActiveDrawerState =
  | { kind: "none" }
  | { kind: "guide_me"; stageId: string; focusedStepId?: string | null }
  | { kind: "gate"; gateId: string }
  | { kind: "automation"; stageId: string; automationLinkId: string }
  | { kind: "case_train"; caseItem: ConnectedCaseSummary };

interface StationGuideAndInspectDrawerProps {
  drawer: ActiveDrawerState;
  onClose: () => void;
  doc: WorkflowDocumentV2;
  workflowId: number | null;
  experienceMode: WorkflowExperienceMode;
  canEdit: boolean;
  primaryCase: ConnectedCaseSummary | null;
  completedStepIds: Set<string>;
  gateStatusMap: Record<string, "pending" | "approved" | "rejected">;
  gateRecordMap: Record<
    string,
    { approvedBy?: string | null; approvedByRole?: string | null; approvedAt?: string | null; note?: string | null }
  >;
  realAutomations: Array<{
    id: number;
    name: string;
    description: string;
    triggerEvent: string;
    isActive: boolean;
    steps: any[];
  }>;
  onNavigate: (path: string) => void;
  onToggleGuideStep: (stageId: string, step: WorkflowGuideStep, nextCompleted: boolean) => void;
  onSubmitGateApproval: (gateId: string, status: "approved" | "rejected" | "pending", note?: string) => void;
  onAdvanceCaseToNextStage: (fromStageId: string, targetStageId: string) => void;
  onOpenStageEditor: (stage: WorkflowStageDefinition, initialTab?: "stage" | "steps" | "gates" | "automations") => void;
  isMutating?: boolean;
}

export function StationGuideAndInspectDrawer({
  drawer,
  onClose,
  doc,
  workflowId,
  experienceMode,
  canEdit,
  primaryCase,
  completedStepIds,
  gateStatusMap,
  gateRecordMap,
  realAutomations,
  onNavigate,
  onToggleGuideStep,
  onSubmitGateApproval,
  onAdvanceCaseToNextStage,
  onOpenStageEditor,
  isMutating = false,
}: StationGuideAndInspectDrawerProps) {
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});
  const [approvalNote, setApprovalNote] = useState("");

  // Load real case-scoped automation runs ONLY when inspecting a connected automation in Employee/Case mode
  const activeAutoLink =
    drawer.kind === "automation"
      ? doc.stages
          .find((s) => s.id === drawer.stageId)
          ?.automations.find((a) => a.id === drawer.automationLinkId) || null
      : null;

  const { data: caseRuns = [], refetch: refetchRuns } = trpc.automations.listRuns.useQuery(
    {
      automationId: activeAutoLink?.automationId || undefined,
      contactId: primaryCase?.contactId || undefined,
      limit: 10,
    },
    {
      enabled:
        drawer.kind === "automation" &&
        experienceMode === "employee_preview" &&
        Boolean(activeAutoLink?.automationId && primaryCase?.contactId),
    }
  );

  const retryRunMutation = trpc.automations.retryRun.useMutation({
    onSuccess: () => {
      toast.success("Automation retry queued safely (duplicate side effects prevented).");
      refetchRuns();
    },
    onError: (err) => toast.error(err.message || "Retry failed."),
  });

  if (drawer.kind === "none") return null;

  const toggleExpand = (stepId: string) => {
    setExpandedStepIds((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const renderDrawerShell = (title: string, subtitle: string, badge: React.ReactNode, body: React.ReactNode) => (
    <aside
      data-testid={`workflow-drawer-${drawer.kind}`}
      aria-label={title}
      className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[400px] max-w-full bg-[#040D24]/98 border-l border-[#C9A55A]/45 shadow-[-16px_0_48px_rgba(0,0,0,0.88)] flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200"
    >
      <div className="px-4 py-3.5 border-b border-[#182C54] flex items-start justify-between gap-3 bg-[#06122E]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {badge}
          </div>
          <h3
            className="text-base font-bold text-[#FFF4D4] mt-1 leading-snug"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {title}
          </h3>
          <p className="text-xs text-[#9FB2CE] mt-0.5">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="p-1.5 rounded-lg text-[#9FB2CE] hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">{body}</div>
    </aside>
  );

  // ── 1. GUIDE ME DRAWER (Requirement 12) ──────────────────────────────────
  if (drawer.kind === "guide_me") {
    const orderedStages = [...doc.stages].sort((a, b) => a.order - b.order);
    const stageIdx = orderedStages.findIndex((s) => s.id === drawer.stageId);
    const stage = orderedStages[stageIdx];
    if (!stage) return null;

    const nextStage = stageIdx >= 0 && stageIdx < orderedStages.length - 1 ? orderedStages[stageIdx + 1] : null;
    const steps = [...stage.guideSteps].sort((a, b) => a.order - b.order);
    const completedCount = steps.filter((s) => completedStepIds.has(s.id)).length;
    const focusedStep =
      (drawer.focusedStepId ? steps.find((s) => s.id === drawer.focusedStepId) : null) ||
      steps.find((s) => s.required && !completedStepIds.has(s.id)) ||
      steps.find((s) => !completedStepIds.has(s.id)) ||
      steps[0] ||
      null;
    const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

    return renderDrawerShell(
      stage.name,
      `Step ${stageIdx + 1} of ${orderedStages.length} · ${stage.assignedRole}`,
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#0E244F] border border-[#60A5FA]/50 text-[#BAE6FD]">
        Guide Me · {completedCount} of {steps.length} completed
      </span>,
      <>
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#C8D7EC] font-medium">Stage progress</span>
            <span className="font-mono text-[#E5C784] font-semibold">
              {completedCount} / {steps.length} ({progressPct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#091736] border border-[#1E3664] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] via-[#7CC4FF] to-[#E5C784] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Connected case or preview indicator */}
        {primaryCase ? (
          <div className="px-3 py-2 rounded-lg bg-[#081736] border border-[#244075] flex items-center justify-between text-xs">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-[#93C5FD] block">
                Active Case
              </span>
              <span className="font-semibold text-white truncate block">{primaryCase.fullName}</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(`/students/${primaryCase.contactId}`)}
              className="text-[11px] text-[#E5C784] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Dossier</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="px-3 py-2 rounded-lg bg-[#07132D] border border-[#1F3561] text-[11px] text-[#9FB2CE] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#93C5FD] shrink-0 mt-0.5" />
            <span>
              Previewing reusable workflow definition. Select a real case in <strong>Employee view</strong> to record saved step completion.
            </span>
          </div>
        )}

        {/* Next Required Action Spotlight */}
        {focusedStep && (
          <div className="rounded-xl p-3.5 bg-gradient-to-b from-[#0D2148] to-[#071530] border border-[#60A5FA]/55 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#93C5FD]">
                {completedStepIds.has(focusedStep.id) ? "Focused Step" : "Next Required Action"}
              </span>
              {focusedStep.dueLabel && (
                <span className="text-[10px] text-[#E5C784] inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {focusedStep.dueLabel}
                </span>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">{focusedStep.title}</h4>
              <p className="text-xs text-[#C8D7EC] mt-1 leading-relaxed">
                <strong className="text-[#E5C784]">Purpose:</strong> {focusedStep.shortExplanation}
              </p>
            </div>

            {/* Linked template/document if present */}
            {focusedStep.templateName && (
              <div className="text-[11px] text-[#BAE6FD] flex items-center gap-1.5 bg-[#061129] px-2.5 py-1.5 rounded-lg border border-[#1D396B]">
                <FileText className="w-3.5 h-3.5 shrink-0 text-[#60A5FA]" />
                <span className="truncate">Template: {focusedStep.templateName}</span>
              </div>
            )}

            {/* Expandable deeper instructions */}
            {focusedStep.detailedInstructions && (
              <div>
                <button
                  type="button"
                  onClick={() => toggleExpand(focusedStep.id)}
                  className="text-[11px] font-medium text-[#93C5FD] hover:text-white inline-flex items-center gap-1 cursor-pointer"
                >
                  {expandedStepIds[focusedStep.id] ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Hide instructions</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>View instructions</span>
                    </>
                  )}
                </button>
                {expandedStepIds[focusedStep.id] && (
                  <p className="mt-1.5 p-2.5 rounded-lg bg-[#050E24] border border-[#1A315E] text-[11.5px] text-[#DCE6F5] leading-relaxed">
                    {focusedStep.detailedInstructions}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {(() => {
                const href =
                  focusedStep.customWorkspaceUrl ||
                  resolveWorkspaceHref(focusedStep.workspaceLinkType, {
                    contactId: primaryCase?.contactId,
                    leadId: primaryCase?.leadId,
                  });
                if (!href) return null;
                return (
                  <button
                    type="button"
                    onClick={() => onNavigate(href)}
                    className="flex-1 min-w-[140px] h-8 px-3 rounded-lg bg-[#102854] hover:bg-[#17366E] border border-[#60A5FA]/55 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Open workspace</span>
                    <ExternalLink className="w-3 h-3 text-[#93C5FD]" />
                  </button>
                );
              })()}

              <button
                type="button"
                data-testid="guide-me-complete-focused-btn"
                disabled={!primaryCase || isMutating || !workflowId}
                onClick={() =>
                  onToggleGuideStep(stage.id, focusedStep, !completedStepIds.has(focusedStep.id))
                }
                title={
                  primaryCase
                    ? "Save completion state for this case"
                    : "Select an active case in Employee view to save completion"
                }
                className="flex-1 min-w-[140px] h-8 px-3 rounded-lg bg-gradient-to-b from-[#DFC07C] via-[#C4A056] to-[#987634] hover:brightness-110 disabled:opacity-45 text-[#061028] font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {completedStepIds.has(focusedStep.id)
                    ? "Completed"
                    : focusedStep.requiresApproval
                    ? "Submit for review"
                    : "Mark complete"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Full Stage Guide Steps List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#9FB2CE]">
              All Guide Steps ({steps.length})
            </h5>
            {canEdit && experienceMode === "designer" && (
              <button
                type="button"
                onClick={() => onOpenStageEditor(stage, "steps")}
                className="text-[11px] text-[#E5C784] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit steps</span>
              </button>
            )}
          </div>

          {steps.length === 0 ? (
            <p className="text-xs text-[#8FA4C2] italic p-3 rounded-lg bg-[#06112B] border border-[#182C54]">
              No guide steps configured for this stage yet.
            </p>
          ) : (
            steps.map((step) => {
              const isDone = completedStepIds.has(step.id);
              const isExpanded = Boolean(expandedStepIds[step.id]);
              return (
                <div
                  key={step.id}
                  className={cn(
                    "rounded-xl p-3 border transition-colors",
                    isDone
                      ? "bg-[#061A28]/90 border-emerald-500/40"
                      : "bg-[#06112B] border-[#1A305B] hover:border-[#345B9E]"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      disabled={!primaryCase || isMutating}
                      onClick={() => onToggleGuideStep(stage.id, step, !isDone)}
                      aria-label={`Mark ${step.title} as ${isDone ? "incomplete" : "complete"}`}
                      className="mt-0.5 text-[#93C5FD] hover:text-emerald-300 disabled:opacity-45 cursor-pointer shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            isDone ? "text-emerald-200 line-through" : "text-white"
                          )}
                        >
                          {step.title}
                        </span>
                        {step.required ? (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#0E234A] text-[#BAE6FD] border border-[#3B82F6]/35">
                            Required
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#0C1933] text-[#9FB2CE]">
                            Optional
                          </span>
                        )}
                        {step.parallelGroup && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#142048] text-[#C4B5FD] border border-[#8B5CF6]/40">
                            Parallel: {step.parallelGroup}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9FB2CE] mt-0.5 leading-snug">
                        {step.shortExplanation}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#8AA0C0]">
                        <span>{step.assignedRole}</span>
                        {step.dueLabel && <span>· {step.dueLabel}</span>}
                        {step.detailedInstructions && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(step.id)}
                            className="text-[#93C5FD] hover:text-white cursor-pointer ml-auto"
                          >
                            {isExpanded ? "Less" : "Instructions"}
                          </button>
                        )}
                      </div>
                      {isExpanded && step.detailedInstructions && (
                        <p className="mt-2 p-2 rounded bg-[#040B1D] border border-[#172B52] text-[11px] text-[#DCE6F5] leading-relaxed">
                          {step.detailedInstructions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Real Case Stage Transition Action (Backend Approval-Gate Enforced) */}
        {experienceMode === "employee_preview" && primaryCase && nextStage && (
          <div className="pt-3 border-t border-[#182C54] space-y-2">
            <button
              type="button"
              data-testid="guide-me-advance-stage-btn"
              disabled={isMutating}
              onClick={() => onAdvanceCaseToNextStage(stage.id, nextStage.id)}
              className="w-full h-9 rounded-lg bg-gradient-to-r from-[#DFC07C] via-[#C4A056] to-[#987634] hover:brightness-110 disabled:opacity-50 text-[#061028] font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>Advance Case to {nextStage.name}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <p className="text-[10.5px] text-[#8FA4C2] text-center">
              Verified by backend approval gates before advancing the live case.
            </p>
          </div>
        )}
      </>
    );
  }

  // ── 2. APPROVAL GATE INSPECTOR (Requirement 15) ──────────────────────────
  if (drawer.kind === "gate") {
    const gate = doc.approvalGates.find((g) => g.id === drawer.gateId);
    if (!gate) return null;

    const fromStage = doc.stages.find((s) => s.id === gate.fromStageId);
    const toStage = doc.stages.find((s) => s.id === gate.toStageId);
    const status = experienceMode === "employee_preview" ? gateStatusMap[gate.id] || "pending" : "pending";
    const record = gateRecordMap[gate.id];

    const requiredSteps = (gate.requiredStepIds || []).map((sid) => ({
      id: sid,
      title: fromStage?.guideSteps.find((gs) => gs.id === sid)?.title || sid,
      completed: completedStepIds.has(sid),
    }));

    return renderDrawerShell(
      gate.title,
      `${fromStage?.name || "Previous"} → ${toStage?.name || "Next"}`,
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
          status === "approved"
            ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
            : status === "rejected"
            ? "bg-rose-950/70 border-rose-500/50 text-rose-300"
            : "bg-[#241B0A] border-[#C9A55A]/60 text-[#F5E3B8]"
        )}
      >
        <ShieldCheck className="w-3 h-3" />
        Approval Gate · {status}
      </span>,
      <>
        <div className="rounded-xl p-3.5 bg-[#07132E] border border-[#C9A55A]/40 space-y-2 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#9FB2CE] block">
              What must be approved
            </span>
            <p className="text-[#EFF4FF] mt-0.5 leading-relaxed">{gate.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#182C54]">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#9FB2CE] block">
                Required Role
              </span>
              <span className="font-semibold text-[#F5E3B8]">{gate.requiredRole}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#9FB2CE] block">
                Backend Enforced
              </span>
              <span className="font-semibold text-emerald-300">Yes · Blocks transition</span>
            </div>
          </div>

          {gate.requiredEvidenceNote && (
            <div className="pt-2 border-t border-[#182C54]">
              <span className="text-[10px] uppercase tracking-wider text-[#9FB2CE] block">
                Required Evidence
              </span>
              <p className="text-[#DCE6F5] mt-0.5">{gate.requiredEvidenceNote}</p>
            </div>
          )}
        </div>

        {/* Required completed steps checklist */}
        <div className="space-y-1.5">
          <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#9FB2CE]">
            Prerequisite Steps ({requiredSteps.filter((r) => r.completed).length}/{requiredSteps.length})
          </h5>
          {requiredSteps.length === 0 ? (
            <p className="text-xs text-[#9FB2CE] italic">No specific prerequisite guide steps configured.</p>
          ) : (
            requiredSteps.map((rs) => (
              <div
                key={rs.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#06112B] border border-[#182C54] text-xs"
              >
                {rs.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-[#E5C784] shrink-0" />
                )}
                <span className={rs.completed ? "text-emerald-200" : "text-[#DCE6F5]"}>
                  {rs.title}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Sign-off audit info if already recorded */}
        {record?.approvedBy && (
          <div className="p-3 rounded-lg bg-[#061A2A] border border-emerald-500/35 text-xs space-y-0.5">
            <p className="text-emerald-200 font-semibold">
              {status === "approved" ? "Approved" : "Reviewed"} by {record.approvedBy} ({record.approvedByRole})
            </p>
            {record.approvedAt && (
              <p className="text-[11px] text-[#9FB2CE]">
                {new Date(record.approvedAt).toLocaleString()}
              </p>
            )}
            {record.note && <p className="text-[#DCE6F5] pt-1">Note: {record.note}</p>}
          </div>
        )}

        {/* Real approval sign-off controls in Employee View with a connected case */}
        {experienceMode === "employee_preview" && primaryCase ? (
          <div className="space-y-2.5 pt-2 border-t border-[#182C54]">
            <label className="text-[11px] font-medium text-[#C8D7EC] block">
              Approval / Review Note
            </label>
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              rows={2}
              placeholder="Optional approval rationale or missing items..."
              className="w-full rounded-lg bg-[#051029] border border-[#243B64] px-3 py-2 text-xs text-white placeholder:text-[#6C82A6] focus:border-[#E5C784] focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="gate-approve-btn"
                disabled={isMutating}
                onClick={() => onSubmitGateApproval(gate.id, "approved", approvalNote)}
                className="h-8.5 rounded-lg bg-gradient-to-b from-[#DFC07C] to-[#9E7C3A] text-[#061028] font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                Approve Gate
              </button>
              <button
                type="button"
                data-testid="gate-reject-btn"
                disabled={isMutating}
                onClick={() => onSubmitGateApproval(gate.id, "rejected", approvalNote)}
                className="h-8.5 rounded-lg bg-[#1A0D18] hover:bg-[#2B1224] border border-rose-500/45 text-rose-200 font-semibold text-xs cursor-pointer disabled:opacity-50"
              >
                Request Revision
              </button>
            </div>
          </div>
        ) : (
          canEdit &&
          fromStage && (
            <button
              type="button"
              onClick={() => onOpenStageEditor(fromStage, "gates")}
              className="w-full h-8.5 rounded-lg bg-[#0D1E45] hover:bg-[#142C61] border border-[#C9A55A]/55 text-[#F5E3B8] text-xs font-semibold cursor-pointer"
            >
              Configure Approval Gate in Editor
            </button>
          )
        )}
      </>
    );
  }

  // ── 3. AUTOMATION INSPECTOR (Requirements 13 & 14) ───────────────────────
  if (drawer.kind === "automation") {
    const stage = doc.stages.find((s) => s.id === drawer.stageId);
    const autoLink = stage?.automations.find((a) => a.id === drawer.automationLinkId);
    if (!stage || !autoLink) return null;

    const linkedRealAuto = autoLink.automationId
      ? realAutomations.find((r) => r.id === autoLink.automationId) || null
      : null;

    return renderDrawerShell(
      autoLink.title,
      `Stage: ${stage.name}`,
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#1B113B] border border-[#A78BFA]/55 text-[#DDD6FE]">
        <Zap className="w-3 h-3" />
        {autoLink.enabled ? "Enabled" : "Disabled"} ·{" "}
        {autoLink.communicationMode === "prepare_draft"
          ? "Prepare Draft Only"
          : autoLink.requiresApproval
          ? "Approval Required"
          : "Automatic"}
      </span>,
      <>
        <div className="rounded-xl p-3.5 bg-[#091130] border border-[#7C3AED]/45 space-y-2.5 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#A89CC8] block">Trigger</span>
            <p className="text-white font-semibold mt-0.5">
              {autoLink.triggerLabel}{" "}
              <span className="font-mono text-[10px] text-[#C4B5FD]">({autoLink.triggerEvent})</span>
            </p>
          </div>
          {autoLink.conditionSummary && (
            <div className="pt-2 border-t border-[#1D2050]">
              <span className="text-[10px] uppercase tracking-wider text-[#A89CC8] block">
                Conditions
              </span>
              <p className="text-[#DCE6F5] mt-0.5">{autoLink.conditionSummary}</p>
            </div>
          )}
          <div className="pt-2 border-t border-[#1D2050]">
            <span className="text-[10px] uppercase tracking-wider text-[#A89CC8] block">Action</span>
            <p className="text-[#DCE6F5] mt-0.5">{autoLink.actionSummary}</p>
          </div>
          <div className="pt-2 border-t border-[#1D2050] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[#A89CC8]">
              Communication Safeguard
            </span>
            <span className="text-[11px] font-semibold text-[#F5E3B8]">
              {autoLink.communicationMode === "prepare_draft"
                ? "Prepare draft (unsent)"
                : autoLink.requiresApproval
                ? "Held until approved"
                : autoLink.communicationMode === "internal_only"
                ? "Internal task only"
                : "Automatic send"}
            </span>
          </div>
        </div>

        {/* Real PG-013 Engine Connection Status (Never fake!) */}
        {linkedRealAuto ? (
          <div className="p-3 rounded-xl bg-[#07182B] border border-emerald-500/40 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-300">
                Connected to Live Automation Engine (PG-013)
              </span>
              <span className="font-mono text-[10px] text-[#9FB2CE]">#{linkedRealAuto.id}</span>
            </div>
            <p className="text-[#C8D7EC]">
              {linkedRealAuto.name} ({linkedRealAuto.isActive ? "Active" : "Paused Draft"} ·{" "}
              {linkedRealAuto.steps.length} step(s))
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigate(`/automations?id=${linkedRealAuto.id}`)}
                className="text-[11px] text-[#C4B5FD] hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open #{linkedRealAuto.id} in Automations (PG-013)</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onOpenStageEditor(stage, "automations")}
                  className="ml-auto px-2.5 py-1 rounded-md bg-[#16103A] hover:bg-[#24195C] border border-[#8B5CF6]/55 text-[#E9D5FF] text-[10.5px] font-semibold cursor-pointer"
                >
                  Edit Label / ID
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#1A1309] border border-[#C9A55A]/45 text-xs space-y-2">
            <p className="font-semibold text-[#F5E3B8]">
              {autoLink.automationId
                ? `Linked to Automation ID #${autoLink.automationId} (not found in current PG-013 list)`
                : "Design Node — Not Yet Linked to a Live PG-013 Automation ID"}
            </p>
            <p className="text-[11px] text-[#C8B99B] leading-relaxed">
              Connect this violet node&apos;s label to the actual ID of an automation you created in the Automations tool (PG-013).
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => onOpenStageEditor(stage, "automations")}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-[#DFC07C] to-[#9E7C3A] text-[#061028] font-bold text-[11px] cursor-pointer"
              >
                Edit Label &amp; Connect Automation ID
              </button>
            )}
          </div>
        )}

        {/* Case-Specific Execution History ONLY in connected case view (Rule 13) */}
        {experienceMode === "employee_preview" && primaryCase && linkedRealAuto && (
          <div className="space-y-2 pt-2 border-t border-[#182C54]">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#9FB2CE]">
              Execution History for {primaryCase.fullName}
            </h5>
            {caseRuns.length === 0 ? (
              <p className="text-xs text-[#8FA4C2] italic">
                No execution runs recorded for this case yet. Viewing the map never triggers automations.
              </p>
            ) : (
              caseRuns.map((run: any) => (
                <div
                  key={run.id}
                  className="p-2.5 rounded-lg bg-[#06112B] border border-[#1E335E] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white capitalize">{run.status}</span>
                    <span className="text-[10px] text-[#9FB2CE]">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {run.errorMessage && (
                    <p className="text-[11px] text-rose-300">{run.errorMessage}</p>
                  )}
                  {run.status === "failed" && canEdit && (
                    <button
                      type="button"
                      onClick={() => retryRunMutation.mutate({ runId: run.id, clearFailureFlags: true })}
                      disabled={retryRunMutation.isPending}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/70 border border-rose-500/50 text-rose-200 text-[11px] hover:bg-rose-900/70 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Safe Retry</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </>
    );
  }

  // ── 4. CASE TRAIN SUMMARY POPOVER/DRAWER (Requirement 9) ─────────────────
  if (drawer.kind === "case_train") {
    const c = drawer.caseItem;
    const matchedStage = doc.stages.find(
      (s) =>
        s.name.toLowerCase() === (c.pipelineStage || "").toLowerCase() ||
        (c.pipelineStage || "").toLowerCase().includes(s.name.toLowerCase())
    );
    const doneSteps = matchedStage
      ? matchedStage.guideSteps.filter((gs) => completedStepIds.has(gs.id)).length
      : 0;

    return renderDrawerShell(
      c.fullName,
      `${c.caseId} · Parent: ${c.parentName}`,
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#0E244F] border border-[#C9A55A]/55 text-[#F5E3B8]">
        <TrainFront className="w-3 h-3" />
        Active Case Progress
      </span>,
      <>
        <div className="rounded-xl p-3.5 bg-[#07132E] border border-[#243B64] space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#9FB2CE]">Current Station</span>
            <span className="font-semibold text-[#FFF4D4]">{c.pipelineStage}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9FB2CE]">Assigned Advocate</span>
            <span className="font-medium text-white">{c.assignedAdvocateName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9FB2CE]">Plan Tier</span>
            <span className="font-medium text-[#93C5FD]">{c.planTier}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9FB2CE]">Open Tasks</span>
            <span className="font-mono text-[#E5C784]">{c.openTaskCount}</span>
          </div>
          {matchedStage && (
            <div className="flex justify-between pt-1.5 border-t border-[#182C54]">
              <span className="text-[#9FB2CE]">Guide Steps Completed</span>
              <span className="font-mono text-emerald-300">
                {doneSteps} / {matchedStage.guideSteps.length}
              </span>
            </div>
          )}
        </div>

        {(c.compassNextStep || c.primaryTask) && (
          <div className="rounded-xl p-3 bg-[#06112B] border border-[#1A305B] text-xs space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#93C5FD] block">
              Current Focus / Next Action
            </span>
            <p className="text-[#EFF4FF] leading-relaxed">{c.compassNextStep || c.primaryTask}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {matchedStage && (
            <button
              type="button"
              onClick={() => onNavigate(`/students/${c.contactId}`)}
              className="w-full h-9 rounded-lg bg-gradient-to-b from-[#DFC07C] to-[#987634] text-[#061028] font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Open Student Dossier</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </>
    );
  }

  return null;
}

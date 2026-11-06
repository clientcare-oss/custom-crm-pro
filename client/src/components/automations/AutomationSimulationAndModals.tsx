import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Layers,
  Loader2,
  Info,
  Mail,
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  CheckSquare,
  Send,
  User,
} from "lucide-react";

interface SimulationWorkspaceProps {
  selectedAutomation: any;
  hasUnsavedChanges: boolean;
  onSaveAndTest: () => Promise<void>;
  contactsList: any[];
  selectedContactId: number | null;
  setSelectedContactId: (id: number | null) => void;
  startSimulation: () => void;
  isSimulating: boolean;
  simLogs: string[];
  simStepPreviews: any[];
  onClose: () => void;
  getTriggerLabel: (id: string) => string;
}

export function AutomationSimulationWorkspace({
  selectedAutomation,
  hasUnsavedChanges,
  onSaveAndTest,
  contactsList,
  selectedContactId,
  setSelectedContactId,
  startSimulation,
  isSimulating,
  simLogs,
  simStepPreviews,
  onClose,
  getTriggerLabel,
}: SimulationWorkspaceProps) {
  return (
    <div className="space-y-6 text-left">
      {/* Unsaved Changes Warning Banner */}
      {hasUnsavedChanges && (
        <div className="bg-amber-950/80 border border-amber-500/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-serif font-bold text-sm text-[#FFF4D4]">
                Unsaved Builder Edits Detected
              </h4>
              <p className="text-xs text-[#E8D1A7] mt-0.5">
                Test Run evaluates the <strong>currently saved database version</strong> of{" "}
                <strong>{selectedAutomation.name}</strong> without activating it. Save your current canvas edits first if you want them included in this dry run.
              </p>
            </div>
          </div>
          <Button
            onClick={onSaveAndTest}
            disabled={isSimulating}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0"
          >
            Save Edits &amp; Test Run
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Simulation Setup Card (Left 5 Cols) */}
        <div className="lg:col-span-5 bg-[#07162B]/60 border border-[#3A2C18] rounded-2xl p-6 space-y-5 self-start">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-emerald-400 fill-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Safe Dry-Run Sandbox
              </h3>
            </div>
            <Badge className="bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-mono">
              {selectedAutomation.isActive ? "Active (Safe Preview)" : "Draft / Paused (No Activation)"}
            </Badge>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#FFF4D4]">
              Choose Target Student / Family Profile
            </label>
            <select
              value={selectedContactId || ""}
              onChange={(e) =>
                setSelectedContactId(e.target.value ? parseInt(e.target.value, 10) : null)
              }
              className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:border-amber-500"
            >
              {contactsList?.map((contact: any) => (
                <option key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName} — {contact.email || "No email on file"} (ID: {contact.id})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-[#020A17]/80 rounded-xl p-4 border border-[#3A2C18] space-y-2.5">
            <h4 className="text-xs font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#C5A059]" />
              Zero Live Side-Effects Guarantee
            </h4>
            <p className="text-[11px] text-[#C6B697] leading-relaxed">
              This dry run tests only <strong>{selectedAutomation.name}</strong> (including Draft or Paused states) without activating it. It will <strong>never</strong> send external emails, create live tasks, assign portal Smart Files, or enqueue background jobs.
            </p>
            <div className="text-[11px] text-[#E8D1A7] space-y-1 border-t border-white/10 pt-2 mt-2 font-mono">
              <div>
                <strong>Automation ID:</strong>{" "}
                {String(selectedAutomation.id).startsWith("auto-")
                  ? "Unsaved Draft (Save first)"
                  : `#${selectedAutomation.id}`}
              </div>
              <div>
                <strong>Trigger Event:</strong>{" "}
                {getTriggerLabel(selectedAutomation.triggerEvent) || "Manual Trigger"}
              </div>
              <div>
                <strong>Configured Steps:</strong> {selectedAutomation.steps.length}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={startSimulation}
              disabled={isSimulating}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-2 fill-white" />
                  Run Safe Preview
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/15 hover:bg-white/5 text-slate-200 font-bold text-xs"
            >
              Back to Builder
            </Button>
          </div>
        </div>

        {/* Right 7 Cols: Structured Step Preview + Log Console */}
        <div className="lg:col-span-7 space-y-5">
          {/* Structured Preview Card */}
          <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#3A2C18]/80 pb-3">
              <div>
                <h4 className="font-serif font-bold text-sm text-[#FFF4D4]">
                  Resolved Recipients, Conditions, Templates &amp; Schedule Preview
                </h4>
                <p className="text-[11px] text-[#C6B697]">
                  Calculated in configured business timezone (America/New_York).
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/30 text-purple-300">
                {simStepPreviews.length} steps evaluated
              </span>
            </div>

            {simStepPreviews.length === 0 ? (
              <div className="text-xs text-[#A69371] py-8 text-center font-serif">
                Click <strong>Run Safe Preview</strong> to inspect resolved merge fields, recipient addresses, step conditions, and scheduled times.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {simStepPreviews.map((sp: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-[#020A17]/90 border border-[#3A2C18]/80 rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#05142B] border border-[#3A2C18] text-[#FFE394]">
                          Step #{Number(sp.stepIndex ?? idx) + 1} · {String(sp.stepType).toUpperCase()}
                        </span>
                        <span className="font-serif font-bold text-xs text-white">
                          {sp.title}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                          sp.conditionPassed === false
                            ? "bg-slate-900 border-slate-600 text-slate-400"
                            : "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                        }`}
                      >
                        {sp.conditionPassed === false
                          ? "Condition False → Step Skipped"
                          : `Will ${String(sp.proposedOutcome || "Execute").replace(/_/g, " ")}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#C6B697] font-mono">
                      <div>
                        <strong className="text-[#FFE394]">Recipient / Target:</strong>{" "}
                        {sp.recipient || "Internal"}
                      </div>
                      <div>
                        <strong className="text-[#FFE394]">Scheduled (ET):</strong>{" "}
                        {sp.scheduledTimeFormatted || "Immediate"}
                      </div>
                      <div className="sm:col-span-2">
                        <strong className="text-[#FFE394]">Template / Payload:</strong>{" "}
                        {sp.selectedTemplate || "Default"}
                        {sp.usedCustomSubjectOverride && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                            Custom Subject Override
                          </span>
                        )}
                        {sp.usedCustomBodyOverride && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                            Custom Body Override
                          </span>
                        )}
                      </div>
                      <div className="sm:col-span-2 text-[#A69371]">
                        <strong className="text-[#E8D1A7]">Condition Check:</strong>{" "}
                        {sp.conditionReason || "No step filter configured"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Terminal Log Output */}
          <div className="bg-slate-950 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="border-b border-white/10 pb-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Dry-Run Execution Trace Log
              </span>
              <span className="text-[10px] bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-mono">
                Simulated Only — 0 External Emails Sent
              </span>
            </div>

            <div className="my-3 bg-black/60 rounded-xl p-3.5 border border-white/5 font-mono text-[11px] leading-relaxed text-slate-300 space-y-1.5 max-h-56 overflow-y-auto">
              {simLogs.length === 0 ? (
                <p className="text-slate-500 italic text-center py-10">
                  Ready to run safe dry-run trace...
                </p>
              ) : (
                simLogs.map((log, idx) => (
                  <div key={idx} className="text-slate-300">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RunNowModalProps {
  automation: any | null;
  contactsList: any[];
  selectedContactId: number | null;
  setSelectedContactId: (id: number | null) => void;
  onClose: () => void;
  onPreviewDryRun: () => void;
  onExecuteLive: () => void;
  isRunning: boolean;
  previewSteps: any[];
  previewLogs: string[];
}

export function RunManualAutomationModal({
  automation,
  contactsList,
  selectedContactId,
  setSelectedContactId,
  onClose,
  onPreviewDryRun,
  onExecuteLive,
  isRunning,
  previewSteps,
  previewLogs,
}: RunNowModalProps) {
  if (!automation) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm text-left">
      <div className="w-full max-w-2xl bg-[#07162B] border border-[#3A2C18] rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-y-auto space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 border-b border-[#3A2C18] pb-3">
          <Play className="h-5 w-5 text-[#C5A059]" />
          <div>
            <h3 className="font-serif font-bold text-base text-[#FFF4D4]">
              Run Manual Automation Now: {automation.name}
            </h3>
            <p className="text-xs text-[#C6B697]">
              Select a specific student/family profile, preview proposed actions, and execute immediately.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-[#FFF4D4] flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-[#C5A059]" />
            Select Target Student / Client Record
          </label>
          <select
            value={selectedContactId || ""}
            onChange={(e) =>
              setSelectedContactId(e.target.value ? parseInt(e.target.value, 10) : null)
            }
            className="w-full bg-[#020A17] border border-[#3A2C18] text-white rounded-lg p-2.5 text-xs"
          >
            {contactsList?.map((contact: any) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName} ({contact.email || "No email"}) — ID #{contact.id}
              </option>
            ))}
          </select>
        </div>

        {/* Action Preview Box */}
        <div className="bg-[#020A17]/90 border border-[#3A2C18] rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-serif font-bold text-[#FFE394]">
              Action Preview ({automation.steps?.length || 0} steps)
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isRunning || !selectedContactId}
              onClick={onPreviewDryRun}
              className="border-[#3A2C18] text-[#FFE394] hover:bg-white/5 text-xs h-7"
            >
              Preview Actions First
            </Button>
          </div>

          {previewSteps.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {previewSteps.map((sp: any, i: number) => (
                <div
                  key={i}
                  className="text-[11px] font-mono bg-[#05142B] border border-[#3A2C18] rounded-lg p-2.5 text-[#E8D1A7]"
                >
                  <div>
                    <strong>Step #{i + 1} ({sp.stepType}):</strong> {sp.title} →{" "}
                    <span className="text-emerald-300">{sp.proposedOutcome}</span>
                  </div>
                  <div className="text-[10px] text-[#A69371]">
                    Target: {sp.recipient} | Schedule: {sp.scheduledTimeFormatted} | {sp.conditionReason}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1.5 text-xs text-[#C6B697]">
              {(automation.steps || []).map((s: any, idx: number) => (
                <li key={s.id || idx} className="flex items-center justify-between font-mono text-[11px]">
                  <span>
                    #{idx + 1} [{String(s.type).toUpperCase()}] {s.title}
                  </span>
                  <span className="text-[#FFE394]">
                    {Number(s.delayValue || 0) === 0
                      ? "Immediate"
                      : `${s.delayValue} ${s.delayUnit} (${s.delayAnchor})`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {previewLogs.length > 0 && (
            <div className="bg-black/60 border border-white/10 rounded-lg p-2.5 font-mono text-[10px] text-slate-300 max-h-36 overflow-y-auto space-y-1">
              {previewLogs.map((l, idx) => (
                <div key={idx}>{l}</div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-[#3A2C18] pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-300 hover:bg-white/5 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isRunning || !selectedContactId}
            onClick={onExecuteLive}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs px-5"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5 fill-[#07162B]" />
                Execute Live Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


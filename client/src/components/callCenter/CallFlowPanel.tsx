import React, { useState } from "react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { CALL_FLOWS, CallFlowDefinition, CallFlowStep } from "./callFlowRegistry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  ExternalLink,
  AlertTriangle,
  Quote,
  MessageSquare,
  Sparkles,
  FileText,
  Calendar,
  FolderLock,
  Compass,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface CallFlowPanelProps {
  onOpenGuide: () => void;
  onScrollToWrapUp?: () => void;
}

export const CallFlowPanel: React.FC<CallFlowPanelProps> = ({
  onOpenGuide,
  onScrollToWrapUp,
}) => {
  const {
    call,
    setStepIndex,
    toggleStepComplete,
    setStepNote,
    updateCall,
  } = useActiveCall();

  const activeCallType = call.callType || "General Question";
  const flow: CallFlowDefinition = CALL_FLOWS[activeCallType] || CALL_FLOWS["General Question"];

  const steps = flow.steps || [];
  const currentStepIndex = Math.min(call.currentStepIndex || 0, Math.max(0, steps.length - 1));
  const completedIds = new Set(call.completedStepIds || []);

  // Track user-expanded steps (current step is always expanded)
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const percentComplete = steps.length > 0
    ? Math.round((completedIds.size / steps.length) * 100)
    : 0;

  const handleToggleComplete = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStepComplete(stepId);
  };

  const handleNextStep = () => {
    const currentStep = steps[currentStepIndex];
    if (currentStep && !completedIds.has(currentStep.id)) {
      toggleStepComplete(currentStep.id);
    }
    if (currentStepIndex < steps.length - 1) {
      setStepIndex(currentStepIndex + 1);
    } else if (onScrollToWrapUp) {
      onScrollToWrapUp();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setStepIndex(currentStepIndex + 1);
      toast.info(`Skipped step ${currentStepIndex + 1}`);
    } else if (onScrollToWrapUp) {
      onScrollToWrapUp();
    }
  };

  const handleNavigateExternal = (path: string, label: string) => {
    toast.success(`Opening ${label}. Call session remains active in top bar.`);
    window.location.href = path;
  };

  return (
    <Card className="rounded-2xl border border-slate-800 bg-[#07162B] shadow-xl overflow-hidden">
      {/* Flow Header */}
      <div className="p-5 border-b border-slate-800/80 bg-gradient-to-r from-[#091D38] via-[#07162B] to-[#0A2242] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={`text-xs px-2.5 py-0.5 font-semibold border ${flow.badgeColor}`}>
              {flow.category}
            </Badge>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{flow.name} Flow</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">{flow.description}</p>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={onOpenGuide}
            className="h-9 px-3.5 text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm rounded-xl transition-all"
          >
            <BookOpen className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
            Call Guide / SOP
          </Button>

          {onScrollToWrapUp && (
            <Button
              size="sm"
              variant="outline"
              onClick={onScrollToWrapUp}
              className="h-9 px-3 text-xs border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl"
            >
              Wrap Up Call →
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-800/60 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-400 transition-all duration-300"
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      {/* Interactive Step-by-Step Checklist */}
      <div className="p-5 space-y-3">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentStepIndex;
          const isCompleted = completedIds.has(step.id);
          const isExpanded = isCurrent || expandedStepId === step.id;
          const currentNote = call.stepNotes?.[step.id] || "";

          return (
            <div
              key={step.id}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isCurrent
                  ? "border-amber-400/60 bg-[#092244]/80 shadow-md shadow-amber-950/20 ring-1 ring-amber-400/20"
                  : isCompleted
                  ? "border-emerald-500/30 bg-[#061830]/60 hover:bg-[#061830]"
                  : "border-slate-800/80 bg-[#040D1A]/50 hover:bg-[#061830]/40"
              }`}
            >
              {/* Step Header Row */}
              <div
                onClick={() => {
                  setStepIndex(idx);
                  setExpandedStepId(expandedStepId === step.id ? null : step.id);
                }}
                className="p-3.5 sm:p-4 flex items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  {/* Step Completion Circle Indicator */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleComplete(step.id, e)}
                    className="flex-shrink-0 mt-0.5 sm:mt-0 focus:outline-none transition-transform active:scale-95"
                    title={isCompleted ? "Mark incomplete" : "Mark step completed"}
                  >
                    {isCompleted ? (
                      <div className="h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center shadow-sm">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    ) : isCurrent ? (
                      <div className="h-6 w-6 rounded-full bg-amber-400/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center font-bold text-xs animate-pulse">
                        {idx + 1}
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </div>
                    )}
                  </button>

                  {/* Title & Preview */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-semibold tracking-tight ${
                          isCurrent
                            ? "text-amber-200"
                            : isCompleted
                            ? "text-emerald-300 line-through decoration-emerald-500/40"
                            : "text-slate-200"
                        }`}
                      >
                        Step {idx + 1}: {step.title}
                      </span>
                      {isCurrent && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] py-0 px-2 font-mono">
                          ACTIVE
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-2 font-mono">
                          DONE
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Right chevron and note count badge */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentNote && (
                    <Badge variant="outline" className="border-sky-500/30 text-sky-300 text-[10px] hidden sm:flex items-center gap-1">
                      <MessageSquare className="h-2.5 w-2.5" /> Note
                    </Badge>
                  )}
                  <button
                    type="button"
                    className="text-slate-400 hover:text-white p-1 rounded-md"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Step Body */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 space-y-3.5 bg-black/20 text-xs">
                  {/* Instructions Bullet List */}
                  {step.instructions && step.instructions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Directions & SOP:
                      </div>
                      <ul className="space-y-1 pl-1">
                        {step.instructions.map((inst, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-300 leading-relaxed">
                            <span className="text-sky-400 mt-1 flex-shrink-0">•</span>
                            <span>{inst}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Phrasing Box */}
                  {step.suggestedPhrasing && (
                    <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-[11px] text-sky-300">
                        <Quote className="h-3 w-3 text-sky-400" />
                        Suggested Script / Phrasing:
                      </div>
                      <p className="italic text-xs leading-relaxed text-sky-100">
                        {step.suggestedPhrasing}
                      </p>
                    </div>
                  )}

                  {/* What NOT to Promise Banner */}
                  {step.whatNotToPromise && (
                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[11px] text-rose-300 uppercase tracking-wider">
                          What NOT to Promise:
                        </div>
                        <p className="text-xs text-rose-100 leading-relaxed">
                          {step.whatNotToPromise}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Smart Navigation Actions based on Caller Record */}
                  <div className="pt-1 flex flex-wrap gap-2">
                    {call.contactId && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleNavigateExternal(`/contacts/${call.contactId}`, "Student Workspace")}
                          className="h-7 text-xs border-sky-500/40 bg-sky-950/40 hover:bg-sky-900/60 text-sky-200 rounded-lg"
                        >
                          <FolderLock className="h-3 w-3 mr-1 text-sky-400" />
                          Open Student Workspace →
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleNavigateExternal(`/contacts/${call.contactId}?tab=vault`, "Document Vault")}
                          className="h-7 text-xs border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-lg"
                        >
                          <FileText className="h-3 w-3 mr-1 text-amber-400" />
                          Open Document Vault →
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleNavigateExternal(`/contacts/${call.contactId}?tab=blueprint`, "IEP Blueprint")}
                          className="h-7 text-xs border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-lg"
                        >
                          <Compass className="h-3 w-3 mr-1 text-cyan-400" />
                          Open IEP Blueprint →
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNavigateExternal(`/scheduler${call.contactId ? `?contactId=${call.contactId}` : ""}`, "Appointment Scheduler")}
                      className="h-7 text-xs border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-lg"
                    >
                      <Calendar className="h-3 w-3 mr-1 text-emerald-400" />
                      Open Appointment Scheduler →
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNavigateExternal("/invoices", "Billing")}
                      className="h-7 text-xs border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-lg"
                    >
                      Open Billing →
                    </Button>
                  </div>

                  {/* Step Note Input */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3 text-sky-400" />
                      Notes for Step {idx + 1}:
                    </label>
                    <textarea
                      rows={2}
                      value={currentNote}
                      onChange={(e) => setStepNote(step.id, e.target.value)}
                      placeholder={`Document details specifically for "${step.title}"...`}
                      className="w-full text-xs rounded-xl bg-[#040D1A] border border-slate-800 p-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/50 resize-y"
                    />
                  </div>

                  {/* Step Action Buttons */}
                  {isCurrent && (
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/80">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={idx === 0}
                        onClick={handlePrevStep}
                        className="h-8 text-xs text-slate-400 hover:text-white"
                      >
                        <ArrowLeft className="h-3 w-3 mr-1" />
                        Previous Step
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSkipStep}
                          className="h-8 text-xs text-slate-400 hover:text-slate-200"
                        >
                          <SkipForward className="h-3 w-3 mr-1" />
                          Skip Step
                        </Button>

                        <Button
                          size="sm"
                          onClick={handleNextStep}
                          className="h-8 px-4 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg shadow-sm"
                        >
                          {idx === steps.length - 1 ? (
                            <>Proceed to Wrap Up ↓</>
                          ) : (
                            <>
                              Mark Complete & Next
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

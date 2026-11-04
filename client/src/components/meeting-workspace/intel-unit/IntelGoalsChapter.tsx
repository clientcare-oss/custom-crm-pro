import React, { useState } from "react";
import {
  Target,
  Plus,
  Bookmark,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Send,
  Save,
  GitCompare,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  GoalAuditWorkspaceItem,
  CheckTriState,
  GoalImprovementSuggestion,
} from "./intelUnitTypes";
import type { FocusedSourcePassage } from "./IntelDocumentSurface";

interface IntelGoalsChapterProps {
  studentName: string;
  goals: GoalAuditWorkspaceItem[];
  selectedGoalId: string;
  onSelectGoal: (id: string) => void;
  onUpdateGoal: (updated: GoalAuditWorkspaceItem) => void;
  onAddGoalSlot: () => void;
  onSaveGoalForDiscussion: (goal: GoalAuditWorkspaceItem) => void;
  onSendGoalToBlueprint: (goal: GoalAuditWorkspaceItem) => void;
  onOpenPriorCheck: (scopeLabel: string, currentWording: string, sourceRef: string) => void;
  onFocusPassage: (passage: FocusedSourcePassage) => void;
}

const CHECK_LABELS: {
  field: "baselineCheck" | "measurementCheck" | "conditionCheck" | "alignmentCheck";
  label: string;
  hint: string;
}[] = [
  {
    field: "baselineCheck",
    label: "Baseline Data Check",
    hint: "Does the goal include a specific quantitative baseline anchored in Present Levels?",
  },
  {
    field: "measurementCheck",
    label: "Measurement & Criterion",
    hint: "Are mastery criteria, accuracy/frequency, and evaluation schedule explicitly defined?",
  },
  {
    field: "conditionCheck",
    label: "Observable Skill & Condition",
    hint: "Are the instructional condition and observable student behavior clearly stated?",
  },
  {
    field: "alignmentCheck",
    label: "Alignment with Documented Need",
    hint: "Does the goal directly address an area of need identified in evaluations or Present Levels?",
  },
];

function nextTriState(current: CheckTriState): CheckTriState {
  if (current === "unchecked") return "gap_identified";
  if (current === "gap_identified") return "documented";
  return "unchecked";
}

export function IntelGoalsChapter({
  studentName,
  goals,
  selectedGoalId,
  onSelectGoal,
  onUpdateGoal,
  onAddGoalSlot,
  onSaveGoalForDiscussion,
  onSendGoalToBlueprint,
  onOpenPriorCheck,
  onFocusPassage,
}: IntelGoalsChapterProps) {
  // Track which of the 3 improvement suggestions are expanded (default #1 open so structure is immediately clear)
  const [expandedSuggestions, setExpandedSuggestions] = useState<Record<string, boolean>>({
    clarify_skill: true,
    strengthen_measurement: false,
    improve_alignment: false,
  });

  const activeGoal =
    goals.find((g) => g.id === selectedGoalId) || goals[0];

  const toggleSuggestion = (key: string) => {
    setExpandedSuggestions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpdateSuggestionWording = (
    key: GoalImprovementSuggestion["key"],
    newWording: string
  ) => {
    if (!activeGoal) return;
    const updatedSuggestions = activeGoal.suggestions.map((s) =>
      s.key === key ? { ...s, proposedWording: newWording } : s
    );
    onUpdateGoal({
      ...activeGoal,
      suggestions: updatedSuggestions,
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Top Chapter Header & Secondary Prior-IEP Check Action ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#3A2C18]/80">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#DFBE77]" />
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#FFF4D4]">
              Goals &amp; Goal Auditor
            </h3>
          </div>
          <p className="text-[11px] text-[#A69371]">
            Examine annual goals, verify baseline and measurement rigor, and evaluate three targeted improvement paths.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onOpenPriorCheck(
                activeGoal?.domain
                  ? `Annual Goals · ${activeGoal.domain}`
                  : "Annual Goals",
                activeGoal?.originalGoal || "",
                activeGoal?.sourcePage || ""
              )
            }
            className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#020A1E] text-[#D8C7A5] hover:bg-[#081C3A] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer gap-1.5"
          >
            <GitCompare className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>Check against previous IEP</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddGoalSlot}
            className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#04112B] text-[#FFE394] hover:border-[#C5A059] cursor-pointer gap-1"
          >
            <Plus className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>New Goal Audit Slot</span>
          </Button>
        </div>
      </div>

      {/* ── Goal Selection Area ── */}
      <div className="rounded-xl bg-[#01071A] border border-[#3A2C18]/80 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#C6B697]">
            Goal Selection ({goals.length} {goals.length === 1 ? "Slot" : "Slots"})
          </span>
          <span className="text-[10.5px] text-[#8EA6C9]">
            Automated goal extraction from IEP PDF connects in Phase 2
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Select goal to audit">
          {goals.map((goal, idx) => {
            const isSelected = goal.id === activeGoal?.id;
            const hasContent = Boolean(goal.originalGoal.trim());
            return (
              <button
                key={goal.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectGoal(goal.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-2",
                  isSelected
                    ? "bg-gradient-to-b from-[#102752] to-[#081633] border-[#C5A059] text-[#FFF4D4] shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
                    : "bg-[#000820] border-[#263859] text-[#A69371] hover:text-[#FFF4D4] hover:border-[#3A5688]"
                )}
              >
                <span className="font-mono text-[10.5px] text-[#DFBE77]">
                  G{idx + 1}
                </span>
                <span className="truncate max-w-[160px]">
                  {goal.domain || `Goal Slot ${idx + 1}`}
                </span>
                {goal.sentToBlueprint && (
                  <Badge className="bg-emerald-950/90 text-emerald-300 border-emerald-500/40 text-[9px] px-1 py-0">
                    In Blueprint
                  </Badge>
                )}
                {!hasContent && !goal.sentToBlueprint && (
                  <span className="text-[9.5px] text-[#8EA6C9]/70 font-mono">
                    (Empty)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Goal Auditor Surface ── */}
      {activeGoal && (
        <div className="rounded-xl bg-[#020A1E]/95 border border-[#3A2C18] p-4 space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
          {/* 1. Original Goal and Source */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
                1. Original Goal &amp; Source Location
              </span>
              {activeGoal.sourcePage && (
                <button
                  type="button"
                  onClick={() => {
                    const parsedNum = parseInt(
                      activeGoal.sourcePage.replace(/[^0-9]/g, ""),
                      10
                    );
                    onFocusPassage({
                      chapterLabel: "Annual Goals",
                      pageLabel: activeGoal.sourcePage,
                      pageNumber: !isNaN(parsedNum) ? parsedNum : undefined,
                      quote: activeGoal.originalGoal || activeGoal.sourceQuote || undefined,
                      sectionRef: activeGoal.domain || "Annual Goals",
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0A1E40] border border-[#3E68A8]/60 text-[10.5px] font-mono text-[#FFE394] hover:border-[#C5A059] cursor-pointer"
                  title="Jump to source location in the document viewer"
                >
                  <Bookmark className="h-3 w-3 text-[#DFBE77]" />
                  <span>{activeGoal.sourcePage}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10.5px] text-[#A69371] font-semibold mb-1 block">
                  Goal Area / Domain
                </label>
                <Input
                  value={activeGoal.domain}
                  onChange={(e) =>
                    onUpdateGoal({ ...activeGoal, domain: e.target.value })
                  }
                  placeholder="e.g., Reading Comprehension, Written Expression, Self-Regulation..."
                  className="h-8 text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#A69371] font-semibold mb-1 block">
                  Source Page &amp; Section Reference
                </label>
                <Input
                  value={activeGoal.sourcePage}
                  onChange={(e) =>
                    onUpdateGoal({ ...activeGoal, sourcePage: e.target.value })
                  }
                  placeholder="e.g., Page 14 · Section V (Annual Goals)"
                  className="h-8 text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
                />
              </div>
            </div>

            <div>
              <label className="text-[10.5px] text-[#A69371] font-semibold mb-1 block">
                Original Goal Wording (Exact IEP Text)
              </label>
              <Textarea
                value={activeGoal.originalGoal}
                onChange={(e) =>
                  onUpdateGoal({ ...activeGoal, originalGoal: e.target.value })
                }
                rows={2}
                placeholder={`No goal text extracted for ${studentName} yet. Select an IEP and run Phase 2 extraction, or paste the exact goal text here to audit...`}
                className="text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] font-serif leading-relaxed placeholder:text-[#8EA6C9]/45"
              />
            </div>
          </div>

          {/* 2. Baseline and Measurement Checks */}
          <div className="space-y-2 pt-2 border-t border-[#3A2C18]/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
                2. Baseline &amp; Measurement Checks
              </span>
              <span className="text-[10.5px] text-[#8EA6C9]">
                Click any check to cycle status (Unchecked → Gap Identified → Documented)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CHECK_LABELS.map((chk) => {
                const state = activeGoal[chk.field];
                return (
                  <button
                    key={chk.field}
                    type="button"
                    onClick={() =>
                      onUpdateGoal({
                        ...activeGoal,
                        [chk.field]: nextTriState(state),
                      })
                    }
                    className={cn(
                      "rounded-lg border p-2.5 text-left transition-all cursor-pointer flex items-start gap-2.5",
                      state === "documented"
                        ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
                        : state === "gap_identified"
                        ? "bg-amber-950/35 border-amber-500/60 text-amber-100"
                        : "bg-[#000820] border-[#263859] text-[#C6B697] hover:border-[#3E5E94]"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {state === "documented" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : state === "gap_identified" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      ) : (
                        <HelpCircle className="h-4 w-4 text-[#8EA6C9]/70" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold text-[#FFF4D4]">
                          {chk.label}
                        </span>
                        <span className="text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/40">
                          {state === "documented"
                            ? "Verified"
                            : state === "gap_identified"
                            ? "Gap Found"
                            : "Pending"}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[#A69371] mt-0.5 leading-snug">
                        {chk.hint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Finding and Reasoning */}
          <div className="space-y-2.5 pt-2 border-t border-[#3A2C18]/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
                3. Goal Finding &amp; Reasoning
              </span>
              <span className="text-[10.5px] text-[#8EA6C9] font-mono">
                AI Goal Audit Engine: Pending Phase 2 Connection
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <div>
                <label className="text-[10.5px] text-[#A69371] font-semibold mb-1 block">
                  Core Audit Finding
                </label>
                <Input
                  value={activeGoal.findingSummary}
                  onChange={(e) =>
                    onUpdateGoal({ ...activeGoal, findingSummary: e.target.value })
                  }
                  placeholder="Summarize the primary issue (e.g., Missing numeric baseline; subjective teacher observation metric)..."
                  className="h-8 text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#A69371] font-semibold mb-1 block">
                  Clinical &amp; Educational Reasoning
                </label>
                <Textarea
                  value={activeGoal.reasoning}
                  onChange={(e) =>
                    onUpdateGoal({ ...activeGoal, reasoning: e.target.value })
                  }
                  rows={2}
                  placeholder="Explain why the current goal structure prevents meaningful progress monitoring or FAPE alignment..."
                  className="text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
                />
              </div>
            </div>
          </div>

          {/* 4. Three Expandable Improvement Suggestions */}
          <div className="space-y-2.5 pt-2 border-t border-[#3A2C18]/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
                4. Three Improvement Suggestions
              </span>
              <span className="text-[10.5px] text-[#A69371]">
                Expand any path to draft or select a proposed revision
              </span>
            </div>

            <div className="space-y-2">
              {activeGoal.suggestions.map((suggestion) => {
                const isExpanded = Boolean(expandedSuggestions[suggestion.key]);
                const isSelectedPath =
                  activeGoal.selectedSuggestionKey === suggestion.key;

                return (
                  <div
                    key={suggestion.key}
                    className={cn(
                      "rounded-xl border transition-all overflow-hidden",
                      isSelectedPath
                        ? "bg-[#081A3A] border-[#C5A059] shadow-[0_2px_14px_rgba(197,160,89,0.18)]"
                        : "bg-[#000820] border-[#293D63]"
                    )}
                  >
                    {/* Accordion Trigger Header */}
                    <button
                      type="button"
                      onClick={() => toggleSuggestion(suggestion.key)}
                      aria-expanded={isExpanded}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "h-5 w-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0",
                            isSelectedPath
                              ? "bg-[#DFBE77] text-[#000820]"
                              : "bg-[#0C2146] text-[#FFE394] border border-[#3A5688]"
                          )}
                        >
                          {suggestion.number}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-serif font-bold text-[#FFF4D4]">
                              {suggestion.title}
                            </span>
                            {isSelectedPath && (
                              <Badge className="bg-[#C5A059]/25 text-[#FFE394] border border-[#C5A059]/50 text-[9.5px] px-1.5 py-0">
                                Selected Revision Path
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10.5px] text-[#8EA6C9] truncate">
                            {suggestion.promptHint}
                          </p>
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[#C6B697] shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#C6B697] shrink-0" />
                      )}
                    </button>

                    {/* Expandable Body */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-[#223556]/70 space-y-2.5">
                        <div className="flex items-start gap-2 text-[11px] text-[#B0C7E8] bg-[#020B21] rounded-lg p-2 border border-[#1E3358]">
                          <Info className="h-3.5 w-3.5 text-[#DFBE77] shrink-0 mt-0.5" />
                          <span>{suggestion.rationale}</span>
                        </div>

                        <div>
                          <label className="text-[10.5px] text-[#D8C7A5] font-semibold mb-1 block">
                            Proposed Goal Wording ({suggestion.title})
                          </label>
                          <Textarea
                            value={suggestion.proposedWording}
                            onChange={(e) =>
                              handleUpdateSuggestionWording(
                                suggestion.key,
                                e.target.value
                              )
                            }
                            rows={2}
                            placeholder={`Draft or refine "${suggestion.title}" revision wording (AI suggestion generation connects in Phase 2)...`}
                            className="text-xs bg-[#020B21] border-[#2C446E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant={isSelectedPath ? "default" : "outline"}
                            onClick={() =>
                              onUpdateGoal({
                                ...activeGoal,
                                selectedSuggestionKey: isSelectedPath
                                  ? null
                                  : suggestion.key,
                              })
                            }
                            className={cn(
                              "h-7 text-[11px] cursor-pointer",
                              isSelectedPath
                                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50"
                                : "border-[#3A2C18] bg-[#041028] text-[#FFE394] hover:border-[#C5A059]"
                            )}
                          >
                            {isSelectedPath
                              ? "Selected for Blueprint"
                              : `Use Path ${suggestion.number}: ${suggestion.title}`}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Footer Actions: Save for Discussion & Send to Blueprint */}
          <div className="pt-3 border-t border-[#3A2C18] flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-[#A69371]">
              {activeGoal.savedToDiscussion ? (
                <span className="text-emerald-300 font-medium">
                  ✓ Saved to workspace discussion findings
                </span>
              ) : (
                <span>Save your goal audit notes or send directly to the Blueprint.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSaveGoalForDiscussion(activeGoal)}
                className="h-8 px-3 text-xs border-[#3A2C18] bg-[#000820] text-[#FFF4D4] hover:border-[#C5A059] cursor-pointer gap-1.5"
              >
                <Save className="h-3.5 w-3.5 text-[#DFBE77]" />
                <span>Save for Discussion</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => onSendGoalToBlueprint(activeGoal)}
                className="h-8 px-3.5 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md cursor-pointer hover:brightness-105 gap-1.5"
              >
                <Send className="h-3.5 w-3.5 text-[#07162B]" />
                <span>
                  {activeGoal.sentToBlueprint ? "Update in Blueprint" : "Send to Blueprint"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Bookmark,
  RotateCcw,
  CheckCircle2,
  MessageSquarePlus,
  Check,
  XCircle,
  FileText,
  ExternalLink,
  AlertCircle,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  Trash2,
  CornerUpLeft,
  Map as MapIcon,
  PlayCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  IepIntelFinding,
  MeetingTarget,
  MeetingWorkspaceStatus,
} from "../types";
import {
  type VaultDocumentOption,
  type IntelBoundingBox,
  formatShortFileName,
  getFindingEffectiveIepPage,
  sortFindingsInIepDocumentOrder,
} from "./intelUnitTypes";
import { getFindingStageStatus } from "./connectedFindingWorkflow";

interface GuidedIepReviewPanelProps {
  studentName: string;
  currentIepDoc: VaultDocumentOption | null;
  activeOpenDoc: VaultDocumentOption | null;
  isViewingEvaluationInReader: boolean;
  onReturnToIepFromEvaluation: () => void;
  findings: IepIntelFinding[];
  targets: MeetingTarget[];
  workspaceStatus?: MeetingWorkspaceStatus;
  activeFindingId: string | null;
  findingQuestionsMap: Record<string, string>;
  aiDraftFindingIds: string[];
  onSelectFindingAndSyncReader: (finding: IepIntelFinding) => void;
  onReturnToActiveFindingPassage: (finding: IepIntelFinding) => void;
  onOpenEvaluationCitation: (params: {
    fileId: number;
    fileName: string;
    pageNumber: number | null;
    printedPageLabel?: string | null;
    excerpt: string | null;
    sectionLabel: string;
    boundingBoxes?: IntelBoundingBox[];
    verificationStatus?: "verified" | "page_only" | "unverified";
  }) => void;
  onOpenIepSectionPageOnly: (params: {
    fileId: number;
    fileName: string;
    pageNumber: number;
    sectionLabel: string;
  }) => void;
  onSaveFindingDecision: (
    finding: IepIntelFinding,
    editedQuestion?: string
  ) => void;
  onAddMeetingQuestionDecision: (
    finding: IepIntelFinding,
    questionText: string
  ) => void;
  onMarkReviewedDecision: (finding: IepIntelFinding) => void;
  onDismissSuggestionDecision: (finding: IepIntelFinding) => void;
  onRestoreDismissedFinding?: (finding: IepIntelFinding) => void;
  onSendFindingToBlueprint: (
    finding: IepIntelFinding,
    questionText?: string
  ) => void;
  onOpenFindingInStage?: (
    finding: IepIntelFinding,
    stage: "blueprint" | "meeting_space"
  ) => void;
  onRemoveFindingFromBlueprint?: (finding: IepIntelFinding) => void;
  onRequestDeleteFinding?: (finding: IepIntelFinding) => void;
  onStartAiReview?: () => void;
  onChooseIep?: () => void;
  isRunningReview?: boolean;
}

export function GuidedIepReviewPanel({
  currentIepDoc,
  activeOpenDoc,
  isViewingEvaluationInReader,
  onReturnToIepFromEvaluation,
  findings,
  targets,
  workspaceStatus,
  activeFindingId,
  findingQuestionsMap,
  aiDraftFindingIds,
  onSelectFindingAndSyncReader,
  onReturnToActiveFindingPassage,
  onOpenEvaluationCitation,
  onOpenIepSectionPageOnly,
  onSaveFindingDecision,
  onAddMeetingQuestionDecision,
  onMarkReviewedDecision,
  onDismissSuggestionDecision,
  onRestoreDismissedFinding,
  onSendFindingToBlueprint,
  onOpenFindingInStage,
  onRemoveFindingFromBlueprint,
  onRequestDeleteFinding,
  onStartAiReview,
  onChooseIep,
  isRunningReview = false,
}: GuidedIepReviewPanelProps) {
  const [showAllFindingsDrawer, setShowAllFindingsDrawer] =
    useState<boolean>(false);
  const [showDismissedInDrawer, setShowDismissedInDrawer] =
    useState<boolean>(false);
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>(
    {}
  );

  // Arrange non-dismissed findings strictly by IEP page and section order (never by severity or AI generation order)
  const orderedFindings = useMemo(() => {
    const visible = findings.filter(
      (f) => f.status !== "dismiss" && f.reviewDecision !== "dismissed"
    );
    return sortFindingsInIepDocumentOrder(visible, currentIepDoc?.id ?? null);
  }, [findings, currentIepDoc?.id]);

  const dismissedFindings = useMemo(
    () =>
      findings.filter(
        (f) => f.status === "dismiss" || f.reviewDecision === "dismissed"
      ),
    [findings]
  );

  const activeIndex = useMemo(() => {
    if (orderedFindings.length === 0) return -1;
    if (!activeFindingId) return 0;
    const idx = orderedFindings.findIndex((f) => f.id === activeFindingId);
    return idx >= 0 ? idx : 0;
  }, [orderedFindings, activeFindingId]);

  const activeFinding =
    activeIndex >= 0 ? orderedFindings[activeIndex] || null : null;

  // Initialize editable question draft when active finding changes
  useEffect(() => {
    if (!activeFinding) return;
    setQuestionDrafts((prev) => {
      if (prev[activeFinding.id] !== undefined) return prev;
      const defaultQ =
        findingQuestionsMap[activeFinding.id] ||
        activeFinding.proposedQuestion ||
        `How does the team plan to address and monitor this ${(
          activeFinding.section ||
          activeFinding.category ||
          "IEP"
        ).toLowerCase()} provision?`;
      return { ...prev, [activeFinding.id]: defaultQ };
    });
  }, [activeFinding?.id, findingQuestionsMap]);

  if (orderedFindings.length === 0) {
    return (
      <aside
        data-testid="guided-iep-review-panel"
        className="w-full lg:w-[390px] xl:w-[420px] shrink-0 bg-[#0E2850] border-l border-[#C5A059]/35 p-6 flex flex-col justify-center text-center space-y-3.5"
      >
        <div className="h-11 w-11 rounded-2xl bg-[#18407C] border border-[#DFBE77]/60 flex items-center justify-center mx-auto shadow-inner">
          <ListOrdered className="h-5 w-5 text-[#FFE394]" />
        </div>
        <div className="space-y-1.5">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#0A1F3F] border border-[#C5A059]/50 text-[10.5px] font-mono font-bold text-[#FFE394] uppercase tracking-wider">
            Step 2 · Review Findings
          </span>
          <h3 className="text-sm sm:text-base font-serif font-bold text-[#FFF7E0]">
            Guided IEP Review
          </h3>
          <p className="text-xs text-[#D5E6FA] leading-relaxed">
            {currentIepDoc
              ? "Review the IEP for potential concerns and compare recommendations from your selected evaluations in document order."
              : "Choose a Current IEP from the Student Vault in Step 1 to begin an AI-assisted or manual guided review."}
          </p>
        </div>
        <div className="pt-1 flex justify-center">
          {currentIepDoc && onStartAiReview ? (
            <Button
              type="button"
              size="sm"
              disabled={isRunningReview}
              onClick={onStartAiReview}
              className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 cursor-pointer gap-1.5 shadow-md"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {isRunningReview ? "Running AI Review…" : "Start AI Review"}
              </span>
            </Button>
          ) : onChooseIep ? (
            <Button
              type="button"
              size="sm"
              onClick={onChooseIep}
              className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 cursor-pointer gap-1.5 shadow-md"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Choose IEP</span>
            </Button>
          ) : null}
        </div>
      </aside>
    );
  }

  if (!activeFinding) return null;

  const totalCount = orderedFindings.length;
  const positionNumber = activeIndex + 1;
  const effectiveIepPage = getFindingEffectiveIepPage(
    activeFinding,
    currentIepDoc?.id ?? null
  );
  const isAiSuggestion =
    aiDraftFindingIds.includes(activeFinding.id) ||
    Boolean(activeFinding.aiGeneratedDraft && !activeFinding.advocateConfirmed);
  const decisionState =
    activeFinding.reviewDecision ||
    (activeFinding.advocateConfirmed ? "saved" : "pending");

  const { stageStatus, connectedTarget } = getFindingStageStatus(
    activeFinding,
    targets,
    workspaceStatus
  );
  const isAdvanced =
    stageStatus === "in_blueprint" || stageStatus === "on_meeting_agenda";

  const hasExactIepHighlight =
    activeFinding.iepLocateStatus !== "Not located" &&
    activeFinding.sourceRef?.verificationStatus === "verified" &&
    Boolean(
      activeFinding.sourceRef?.boundingBoxes &&
        activeFinding.sourceRef.boundingBoxes.length > 0
    );

  const isMissingInIep = activeFinding.iepLocateStatus === "Not located";
  const currentQuestionText =
    questionDrafts[activeFinding.id] ??
    findingQuestionsMap[activeFinding.id] ??
    activeFinding.proposedQuestion ??
    "";

  const handleGoPrev = () => {
    if (activeIndex <= 0) return;
    const prevFinding = orderedFindings[activeIndex - 1];
    if (prevFinding) {
      onSelectFindingAndSyncReader(prevFinding);
    }
  };

  const handleGoNext = () => {
    if (activeIndex >= orderedFindings.length - 1) return;
    const nextFinding = orderedFindings[activeIndex + 1];
    if (nextFinding) {
      onSelectFindingAndSyncReader(nextFinding);
    }
  };

  return (
    <aside
      data-testid="guided-iep-review-panel"
      aria-label="Guided IEP Review in Document Order"
      className="w-full lg:w-[400px] xl:w-[435px] shrink-0 bg-[#0E2850] border-l border-[#C5A059]/35 flex flex-col relative select-text"
    >
      {/* ── 1. TOP SEQUENCE BAR: Position Indicator + Previous / Next + All Findings Drawer Trigger ── */}
      <div className="px-4 py-3 bg-[#133466] border-b border-[#3B5E94] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              data-testid="guided-finding-position-indicator"
              className="text-xs font-serif font-bold text-[#FFE394] tracking-wide"
            >
              Finding {positionNumber} of {totalCount}
            </span>
            <Badge className="bg-[#081C3E] text-[#9BB2D6] border border-[#253E6B] text-[9.5px] px-1.5 py-0 font-mono">
              {effectiveIepPage < 9999
                ? `IEP p. ${effectiveIepPage}`
                : "Document Order"}
            </Badge>
          </div>

          {/* Collapsible Full Findings List Drawer Toggle */}
          <button
            type="button"
            data-testid="guided-all-findings-drawer-btn"
            onClick={() => setShowAllFindingsDrawer((v) => !v)}
            className={cn(
              "px-2.5 py-1 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors",
              showAllFindingsDrawer
                ? "bg-[#0B2248] border-[#C5A059] text-[#FFE394]"
                : "bg-[#03102A] border-[#223963] text-[#D8C7A5] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
            )}
          >
            <ListOrdered className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>All Findings ({totalCount})</span>
          </button>
        </div>

        {/* Previous Finding / Next Finding Navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={activeIndex <= 0}
            data-testid="guided-prev-finding-btn"
            onClick={handleGoPrev}
            className="h-8 flex-1 text-xs border-[#243B67] bg-[#000820] text-[#D8C7A5] hover:bg-[#071A3C] hover:text-[#FFF4D4] disabled:opacity-40 cursor-pointer gap-1.5"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>Previous finding</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={activeIndex >= totalCount - 1}
            data-testid="guided-next-finding-btn"
            onClick={handleGoNext}
            className="h-8 flex-1 text-xs border-[#243B67] bg-[#000820] text-[#FFF4D4] hover:bg-[#071A3C] hover:border-[#C5A059]/60 disabled:opacity-40 cursor-pointer gap-1.5"
          >
            <span>Next finding</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#DFBE77]" />
          </Button>
        </div>
      </div>

      {/* ── COLLAPSIBLE FULL FINDINGS LIST DRAWER ── */}
      {showAllFindingsDrawer && (
        <div
          data-testid="guided-all-findings-drawer"
          className="border-b border-[#1E335C] bg-[#00071B] max-h-[340px] overflow-y-auto p-3 space-y-2 shadow-inner"
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#9BB2D6]">
              Jump to Finding (IEP Page &amp; Section Order)
            </span>
            <button
              type="button"
              onClick={() => setShowAllFindingsDrawer(false)}
              className="text-[#8EA6C9] hover:text-white cursor-pointer"
              aria-label="Close findings list drawer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {orderedFindings.map((item, idx) => {
              const isCurrent = item.id === activeFinding.id;
              const pageNum = getFindingEffectiveIepPage(
                item,
                currentIepDoc?.id ?? null
              );
              const itemStage = getFindingStageStatus(
                item,
                targets,
                workspaceStatus
              ).stageStatus;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`guided-drawer-finding-item-${idx + 1}`}
                  onClick={() => {
                    onSelectFindingAndSyncReader(item);
                    setShowAllFindingsDrawer(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2",
                    isCurrent
                      ? "bg-[#092046] border-[#C5A059] text-[#FFF4D4] shadow-sm"
                      : "bg-[#020B22] border-[#1A2D50] text-[#D8C7A5] hover:bg-[#061634] hover:border-[#2C4878]"
                  )}
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-[#FFE394]">
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] font-mono text-[#8EA6C9]">
                        {pageNum < 9999 ? `IEP p. ${pageNum}` : "Unpaged"}
                      </span>
                      <span className="text-[10px] text-[#9BB2D6]">·</span>
                      <span className="text-[10.5px] font-semibold text-[#FFF4D4] truncate">
                        {item.section || item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#B8CCE8] line-clamp-1">
                      {item.text}
                    </p>
                  </div>

                  <Badge
                    className={cn(
                      "text-[9px] px-1.5 py-0 shrink-0 border",
                      itemStage === "on_meeting_agenda"
                        ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                        : itemStage === "in_blueprint"
                        ? "bg-[#1A2410] text-[#FFE394] border-[#C5A059]/50"
                        : itemStage === "saved_for_later"
                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                        : "bg-[#071836] text-[#9BB2D6] border-[#253E6B]"
                    )}
                  >
                    {itemStage === "on_meeting_agenda"
                      ? "On Agenda"
                      : itemStage === "in_blueprint"
                      ? "In Blueprint"
                      : itemStage === "saved_for_later"
                      ? "Saved"
                      : "Review"}
                  </Badge>
                </button>
              );
            })}
          </div>

          {dismissedFindings.length > 0 && (
            <div className="pt-2 border-t border-[#182949] space-y-2">
              <button
                type="button"
                data-testid="toggle-dismissed-findings-btn"
                onClick={() => setShowDismissedInDrawer((v) => !v)}
                className="text-[10.5px] text-[#8EA6C9] hover:text-[#FFF4D4] cursor-pointer"
              >
                {showDismissedInDrawer
                  ? "Hide dismissed suggestions"
                  : `Dismissed suggestions (${dismissedFindings.length}) · Restore`}
              </button>

              {showDismissedInDrawer && (
                <div className="space-y-1.5">
                  {dismissedFindings.map((df) => (
                    <div
                      key={df.id}
                      className="px-2.5 py-1.5 rounded-lg bg-[#030D22] border border-[#1E3256] flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-[11px] text-[#8EA6C9] truncate">
                        {df.text}
                      </span>
                      {onRestoreDismissedFinding && (
                        <button
                          type="button"
                          data-testid={`restore-dismissed-${df.id}`}
                          onClick={() => onRestoreDismissedFinding(df)}
                          className="text-[10.5px] font-semibold text-[#FFE394] hover:underline shrink-0 cursor-pointer"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Return to IEP Banner when user opened an Evaluation citation ── */}
      {isViewingEvaluationInReader && (
        <div
          data-testid="guided-return-to-iep-banner"
          className="px-4 py-2.5 bg-[#081F44] border-b border-[#C5A059]/60 flex items-center justify-between gap-2 text-xs"
        >
          <span className="text-[#FFE394] font-medium truncate">
            Viewing Evaluation:{" "}
            {formatShortFileName(activeOpenDoc?.fileName, 22)}
          </span>
          <Button
            type="button"
            size="sm"
            data-testid="guided-return-to-iep-btn"
            onClick={onReturnToIepFromEvaluation}
            className="h-7 px-2.5 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer shrink-0 gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Return to IEP</span>
          </Button>
        </div>
      )}

      {/* ── 2. SINGLE ACTIVE FINDING CARD ── */}
      <div
        data-testid="guided-active-finding-card"
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Active Finding Header & Return to Passage Action */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-[#081C3E] text-[#FFE394] border border-[#C5A059]/45 text-[10.5px] font-semibold">
              {activeFinding.section || activeFinding.category}
            </Badge>

            {stageStatus === "on_meeting_agenda" ? (
              <Badge
                data-testid="finding-advanced-status-badge"
                className="bg-amber-950/80 text-amber-200 border border-amber-500/45 text-[10px]"
              >
                <PlayCircle className="h-2.5 w-2.5 mr-1" />
                On meeting agenda
              </Badge>
            ) : stageStatus === "in_blueprint" ? (
              <Badge
                data-testid="finding-advanced-status-badge"
                className="bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50 text-[10px]"
              >
                <MapIcon className="h-2.5 w-2.5 mr-1" />
                In Blueprint
              </Badge>
            ) : stageStatus === "withdrawn_history" ? (
              <Badge className="bg-[#1B2234] text-[#B8CCE8] border border-[#3B4C73] text-[10px]">
                Withdrawn (History Kept)
              </Badge>
            ) : decisionState === "saved" ? (
              <Badge className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px]">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                Saved for later
              </Badge>
            ) : decisionState === "reviewed" ? (
              <Badge className="bg-[#0B2246] text-[#B8D8FF] border border-[#325996] text-[10px]">
                <Check className="h-2.5 w-2.5 mr-1" />
                Marked Reviewed
              </Badge>
            ) : isAiSuggestion ? (
              <Badge className="bg-[#18153A] text-[#DFC8FF] border border-[#6E59C9]/55 text-[10px]">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                AI Suggestion
              </Badge>
            ) : null}
          </div>

          {/* Return to Passage Control (restores exact finding page & highlight after free scrolling) */}
          <button
            type="button"
            data-testid="guided-return-to-passage-btn"
            onClick={() => onReturnToActiveFindingPassage(activeFinding)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#051532] border border-[#2C4878] hover:border-[#C5A059] text-[10.5px] text-[#FFE394] font-semibold cursor-pointer shrink-0 transition-colors"
            title="Scroll the document back to this finding's page and passage"
          >
            <RotateCcw className="h-3 w-3 text-[#DFBE77]" />
            <span>Return to passage</span>
          </button>
        </div>

        {/* Source Material Changed / Unavailable Flag (Preserves finding & history) */}
        {activeFinding.sourceMaterialFlaggedForReview && (
          <div
            data-testid="finding-source-changed-flag"
            className="rounded-lg bg-[#1C1408] border border-[#C5A059]/50 p-2.5 flex items-start gap-2 text-xs text-[#FFE394]"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-[#DFBE77] shrink-0 mt-0.5" />
            <span>
              {activeFinding.sourceMaterialFlagReason ||
                "Source material changed since this finding was saved. Verify citation against the current record."}
            </span>
          </div>
        )}

        {/* Finding Explanation */}
        <div className="space-y-1.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8EA6C9]">
            Finding &amp; Explanation
          </div>
          <p className="text-xs sm:text-[13px] font-serif text-[#FFF4D4] leading-relaxed">
            {activeFinding.text}
          </p>
        </div>

        {/* ── SOURCE LINKS & SUPPORTING EVIDENCE (IEP + Evaluation Comparison) ── */}
        <div className="rounded-xl bg-[#020C24] border border-[#1B2F56] p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#9BB2D6]">
              Original Document Evidence
            </span>

            {/* Highlight / Navigation Fidelity Indicator */}
            {isMissingInIep ? (
              <span
                data-testid="guided-source-missing-status"
                className="text-[10px] font-mono text-[#FFE394] bg-[#141A38] border border-[#C5A059]/40 px-2 py-0.5 rounded"
              >
                Not located in Current IEP
              </span>
            ) : hasExactIepHighlight ? (
              <span
                data-testid="guided-source-highlight-status"
                className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/35 px-2 py-0.5 rounded"
              >
                Exact Passage Highlighted · p.{" "}
                {activeFinding.sourceRef?.pdfPageNumber}
              </span>
            ) : (
              <span
                data-testid="guided-source-page-only-status"
                className="text-[10px] font-mono text-[#FFE394] bg-[#091D3E] border border-[#C5A059]/40 px-2 py-0.5 rounded"
              >
                Page-Level Navigation Only
              </span>
            )}
          </div>

          {/* Missing in IEP Explanation + Relevant IEP Section Link (Never fabricates a highlight) */}
          {isMissingInIep ? (
            <div className="space-y-2 text-xs text-[#D8C7A5]">
              <div className="flex items-start gap-2 rounded-lg bg-[#05132C] border border-[#233B66] p-2.5">
                <AlertCircle className="h-4 w-4 text-[#DFBE77] shrink-0 mt-0.5" />
                <p className="text-[11.5px] leading-relaxed">
                  No matching passage was located in the reviewed Current IEP
                  pages. No highlight is shown on the IEP for absent
                  information.
                </p>
              </div>

              {currentIepDoc &&
                activeFinding.relevantIepSectionPage &&
                activeFinding.relevantIepSectionPage > 0 && (
                  <button
                    type="button"
                    data-testid="guided-open-relevant-iep-section-btn"
                    onClick={() =>
                      onOpenIepSectionPageOnly({
                        fileId: currentIepDoc.id,
                        fileName: currentIepDoc.fileName,
                        pageNumber: activeFinding.relevantIepSectionPage!,
                        sectionLabel: `${
                          activeFinding.section || activeFinding.category
                        } (Section Review)`,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#061838] hover:bg-[#0B2450] border border-[#2C4878] hover:border-[#C5A059] text-left flex items-center justify-between gap-2 text-xs text-[#FFF4D4] cursor-pointer transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-[#DFBE77]" />
                      <span>
                        Review IEP {activeFinding.section || "Section"} (Page{" "}
                        {activeFinding.relevantIepSectionPage} · Page-only)
                      </span>
                    </span>
                    <ExternalLink className="h-3 w-3 text-[#FFE394]" />
                  </button>
                )}
            </div>
          ) : (
            /* Located IEP Passage & Source Button */
            <div className="space-y-2">
              {activeFinding.sourceRef && (
                <button
                  type="button"
                  data-testid="guided-open-iep-source-btn"
                  onClick={() => onReturnToActiveFindingPassage(activeFinding)}
                  className="w-full px-3 py-2 rounded-lg bg-[#051532] hover:bg-[#0A224A] border border-[#284578] hover:border-[#C5A059] text-left flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <Bookmark className="h-3.5 w-3.5 text-[#DFBE77] shrink-0" />
                    <span className="font-semibold text-[#FFE394] truncate">
                      Current IEP:{" "}
                      {formatShortFileName(
                        activeFinding.sourceRef.fileName,
                        24
                      )}{" "}
                      · PDF p. {activeFinding.sourceRef.pdfPageNumber || 1}
                    </span>
                  </span>
                  <span className="text-[10.5px] text-[#9BB2D6] shrink-0">
                    Show in IEP
                  </span>
                </button>
              )}

              {(activeFinding.sourceRef?.excerpt || activeFinding.quote) && (
                <blockquote className="text-xs font-serif italic text-[#FFF4D4] bg-[#010718] border-l-2 border-[#C5A059] px-3 py-2 rounded-r-lg leading-relaxed">
                  &ldquo;
                  {activeFinding.sourceRef?.excerpt || activeFinding.quote}
                  &rdquo;
                </blockquote>
              )}

              {!hasExactIepHighlight && (
                <p className="text-[11px] text-[#8EA6C9]">
                  Only page-level navigation is available for this item; no
                  guessed highlight box is drawn.
                </p>
              )}
            </div>
          )}

          {/* Connected Evaluation Source Link */}
          {activeFinding.evalSourceRef && (
            <div className="pt-2.5 border-t border-[#162749] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#C9B8FF]">
                  {activeFinding.evalSourceRef.recordGroup ===
                  "outside_evaluation"
                    ? "Outside Evaluation Source"
                    : "School Evaluation Source"}
                </span>
                {activeFinding.evalSourceRef.documentDate && (
                  <span className="text-[10px] text-[#8EA6C9]">
                    {activeFinding.evalSourceRef.documentDate}
                  </span>
                )}
              </div>

              <button
                type="button"
                data-testid="guided-open-eval-source-btn"
                onClick={() =>
                  onOpenEvaluationCitation({
                    fileId: activeFinding.evalSourceRef!.documentId,
                    fileName: activeFinding.evalSourceRef!.fileName,
                    pageNumber: activeFinding.evalSourceRef!.pdfPageNumber,
                    printedPageLabel:
                      activeFinding.evalSourceRef!.printedPageLabel,
                    excerpt: activeFinding.evalSourceRef!.excerpt || null,
                    sectionLabel: `${
                      activeFinding.section || activeFinding.category
                    } · Evaluation Recommendation`,
                    boundingBoxes: activeFinding.evalSourceRef!.boundingBoxes,
                    verificationStatus:
                      activeFinding.evalSourceRef!.verificationStatus,
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#0A1435] hover:bg-[#112052] border border-[#3B4B8C] hover:border-[#C5A059] text-left flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors"
              >
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-[#DFBE77] shrink-0" />
                  <span className="font-semibold text-[#FFF4D4] truncate">
                    {formatShortFileName(
                      activeFinding.evalSourceRef.fileName,
                      24
                    )}
                    {activeFinding.evalSourceRef.pdfPageNumber
                      ? ` · PDF p. ${activeFinding.evalSourceRef.pdfPageNumber}`
                      : ""}
                  </span>
                </span>
                <span className="text-[10.5px] text-[#FFE394] inline-flex items-center gap-1 shrink-0">
                  <span>Open Eval</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </button>

              {activeFinding.evalSourceRef.excerpt && (
                <blockquote className="text-[11.5px] font-serif italic text-[#E2ECF8] bg-[#010718] border-l-2 border-[#6A52B8] px-3 py-1.5 rounded-r-lg leading-relaxed">
                  &ldquo;{activeFinding.evalSourceRef.excerpt}&rdquo;
                </blockquote>
              )}
            </div>
          )}
        </div>

        {/* ── SUGGESTED MEETING QUESTION ── */}
        <div className="space-y-1.5">
          <label
            htmlFor="guided-finding-question-input"
            className="text-[10.5px] font-semibold uppercase tracking-wider text-[#9BB2D6] block"
          >
            Suggested Meeting Question / Request
          </label>
          <Textarea
            id="guided-finding-question-input"
            data-testid="guided-finding-question-input"
            value={currentQuestionText}
            onChange={(e) =>
              setQuestionDrafts((prev) => ({
                ...prev,
                [activeFinding.id]: e.target.value,
              }))
            }
            rows={2}
            className="bg-[#00071B] border-[#223965] text-xs text-[#FFF4D4] resize-none"
          />
        </div>

        {/* ── 3. CLEAR FINDING ACTIONS (Strictly Separate from Navigation) ── */}
        <div className="pt-2 border-t border-[#182949] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8EA6C9]">
              Finding Actions
            </span>

            {/* Secondary Actions Contextual Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="finding-contextual-menu-btn"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#020B20] border border-[#1E3256] text-[11px] text-[#9BB2D6] hover:text-[#FFF4D4] hover:border-[#3A5A90] cursor-pointer"
                  aria-label="More finding actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>More</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#01091E] border border-[#284372] text-[#FFF4D4] shadow-2xl p-1.5 z-50"
              >
                <DropdownMenuItem
                  data-testid="guided-decision-mark-reviewed-btn"
                  onClick={() => onMarkReviewedDecision(activeFinding)}
                  className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 focus:bg-[#092046] focus:text-[#FFE394]"
                >
                  <Check className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>
                    {decisionState === "reviewed"
                      ? "Marked reviewed"
                      : "Mark reviewed"}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-testid="guided-decision-add-question-btn"
                  onClick={() =>
                    onAddMeetingQuestionDecision(
                      activeFinding,
                      currentQuestionText.trim()
                    )
                  }
                  className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 focus:bg-[#092046] focus:text-[#FFE394]"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>Save standalone question</span>
                </DropdownMenuItem>

                {isAdvanced && onRemoveFindingFromBlueprint && (
                  <>
                    <DropdownMenuSeparator className="bg-[#1A2D50] my-1" />
                    <DropdownMenuItem
                      data-testid="finding-action-remove-from-blueprint"
                      onClick={() => onRemoveFindingFromBlueprint(activeFinding)}
                      className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 text-[#FFE394] focus:bg-[#092046]"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5 text-[#DFBE77]" />
                      <span>Remove from Blueprint / agenda</span>
                    </DropdownMenuItem>
                  </>
                )}

                {onRequestDeleteFinding && (
                  <>
                    <DropdownMenuSeparator className="bg-[#1A2D50] my-1" />
                    <DropdownMenuItem
                      data-testid="finding-action-delete"
                      onClick={() => onRequestDeleteFinding(activeFinding)}
                      className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 text-rose-300 focus:bg-rose-950/60 focus:text-rose-200"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      <span>Delete finding…</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Primary Actions: Save for later + Send to Blueprint (or Advanced Status + Open) + Dismiss */}
          {isAdvanced ? (
            <div className="space-y-2">
              <div
                data-testid="finding-advanced-status-box"
                className="rounded-xl bg-[#04142E] border border-[#C5A059]/50 p-2.5 flex items-center justify-between gap-2"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {stageStatus === "on_meeting_agenda" ? (
                      <PlayCircle className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                    ) : (
                      <MapIcon className="h-3.5 w-3.5 text-[#DFBE77] shrink-0" />
                    )}
                    <span className="text-xs font-bold text-[#FFE394]">
                      {stageStatus === "on_meeting_agenda"
                        ? "On meeting agenda"
                        : "In Blueprint"}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#9BB2D6] truncate">
                    {connectedTarget?.meetingStatus &&
                    connectedTarget.meetingStatus !== "NOT_DISCUSSED"
                      ? `Outcome: ${connectedTarget.meetingStatus}`
                      : connectedTarget?.targetName || "Connected target"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="finding-action-save-for-later"
                    onClick={() =>
                      onSaveFindingDecision(
                        activeFinding,
                        currentQuestionText.trim()
                      )
                    }
                    className="h-7 px-2.5 text-[11px] border-[#284578] bg-[#04122C] text-[#D8C7A5] hover:text-[#FFF4D4] cursor-pointer"
                  >
                    Save edits
                  </Button>
                  {onOpenFindingInStage && (
                    <Button
                      type="button"
                      size="sm"
                      data-testid="finding-open-in-stage-btn"
                      onClick={() =>
                        onOpenFindingInStage(
                          activeFinding,
                          stageStatus === "on_meeting_agenda"
                            ? "meeting_space"
                            : "blueprint"
                        )
                      }
                      className="h-7 px-3 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1"
                    >
                      <span>Open</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="finding-action-save-for-later"
                  onClick={() =>
                    onSaveFindingDecision(
                      activeFinding,
                      currentQuestionText.trim()
                    )
                  }
                  className={cn(
                    "h-8 text-xs font-semibold cursor-pointer gap-1.5",
                    decisionState === "saved"
                      ? "bg-emerald-950/80 text-emerald-200 border-emerald-500/50"
                      : "bg-[#04122C] border-[#284578] text-[#FFF4D4] hover:border-[#C5A059]/60"
                  )}
                >
                  <Bookmark className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>
                    {decisionState === "saved"
                      ? "Saved for later"
                      : "Save for later"}
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  data-testid="finding-action-send-to-blueprint"
                  onClick={() =>
                    onSendFindingToBlueprint(
                      activeFinding,
                      currentQuestionText.trim()
                    )
                  }
                  className="h-8 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 cursor-pointer gap-1.5"
                >
                  <span>Send to Blueprint</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="finding-action-dismiss"
                  onClick={() => onDismissSuggestionDecision(activeFinding)}
                  className="h-7 w-full text-[11px] border-[#1E3256] bg-[#020B20] text-[#9BB2D6] hover:text-rose-300 hover:border-rose-500/40 cursor-pointer gap-1.5"
                >
                  <XCircle className="h-3 w-3" />
                  <span>Dismiss suggestion</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

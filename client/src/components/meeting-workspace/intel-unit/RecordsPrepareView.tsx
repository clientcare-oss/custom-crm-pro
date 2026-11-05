import React, { useState } from "react";
import {
  Check,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  MessageSquarePlus,
  Bookmark,
  MoreHorizontal,
  CornerUpLeft,
  XCircle,
  RotateCcw,
  Map as MapIcon,
  PlayCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  ALL_INTEL_CHAPTERS,
  type IntelChapterId,
  type FindingPriority,
  type SavedMeetingQuestionItem,
  type IntelBoundingBox,
  formatShortFileName,
  sortFindingsInIepDocumentOrder,
} from "./intelUnitTypes";
import { getFindingStageStatus } from "./connectedFindingWorkflow";

interface RecordsPrepareViewProps {
  findings: IepIntelFinding[];
  targets: MeetingTarget[];
  workspaceStatus?: MeetingWorkspaceStatus;
  activeChapter: IntelChapterId;
  onSelectChapter: (chapter: IntelChapterId) => void;
  findingQuestionsMap: Record<string, string>;
  findingPrioritiesMap: Record<string, FindingPriority>;
  aiDraftFindingIds: string[];
  savedMeetingQuestions: SavedMeetingQuestionItem[];
  onUpdateFinding: (
    findingId: string,
    updates: Partial<IepIntelFinding>,
    meetingQuestion?: string,
    priority?: FindingPriority,
    confirmAiDraft?: boolean
  ) => void;
  onAddManualFinding: (params: {
    category: string;
    section: string;
    text: string;
    quote?: string;
    meetingQuestion?: string;
    priority: FindingPriority;
  }) => void;
  onDeleteFinding: (findingId: string) => void;
  onRequestDeleteFinding?: (finding: IepIntelFinding) => void;
  onRemoveFindingFromBlueprint?: (finding: IepIntelFinding) => void;
  onDismissFinding?: (finding: IepIntelFinding) => void;
  onRestoreDismissedFinding?: (finding: IepIntelFinding) => void;
  onOpenFindingInStage?: (
    finding: IepIntelFinding,
    stage: "blueprint" | "meeting_space"
  ) => void;
  onSendFindingToBlueprint: (
    finding: IepIntelFinding,
    meetingQuestion?: string
  ) => void;
  onSendMultipleFindingsToBlueprint: (findingIds: string[]) => void;
  onAddMeetingQuestion: (params: {
    section: string;
    question: string;
    sourceCitation?: string;
    priority: FindingPriority;
  }) => void;
  onUpdateMeetingQuestion: (
    id: string,
    updates: Partial<SavedMeetingQuestionItem>
  ) => void;
  onDeleteMeetingQuestion: (id: string) => void;
  onAddQuestionToBlueprint: (q: SavedMeetingQuestionItem) => void;
  onOpenCitationInReader: (params: {
    fileId: number | null;
    fileName: string;
    pageNumber: number | null;
    printedPageLabel?: string | null;
    excerpt: string | null;
    sectionLabel: string;
    boundingBoxes?: IntelBoundingBox[];
    verificationStatus?: "verified" | "page_only" | "unverified";
  }) => void;
  chapterDetailNode?: React.ReactNode;
}

const PRIORITY_STYLES: Record<FindingPriority, string> = {
  high: "bg-[#1A1538] text-[#FFE394] border-[#C5A059]/60",
  medium: "bg-[#091D3E] text-[#B8D8FF] border-[#2C4E86]",
  low: "bg-[#041026] text-[#8EA6C9] border-[#1B2F56]",
};

const PRIORITY_LABELS: Record<FindingPriority, string> = {
  high: "High Priority",
  medium: "Standard",
  low: "Note / Low",
};

export function RecordsPrepareView({
  findings,
  targets,
  workspaceStatus,
  activeChapter,
  onSelectChapter,
  findingQuestionsMap,
  findingPrioritiesMap,
  aiDraftFindingIds,
  savedMeetingQuestions,
  onUpdateFinding,
  onAddManualFinding,
  onDeleteFinding,
  onRequestDeleteFinding,
  onRemoveFindingFromBlueprint,
  onDismissFinding,
  onRestoreDismissedFinding,
  onOpenFindingInStage,
  onSendFindingToBlueprint,
  onSendMultipleFindingsToBlueprint,
  onAddMeetingQuestion,
  onUpdateMeetingQuestion,
  onDeleteMeetingQuestion,
  onAddQuestionToBlueprint,
  onOpenCitationInReader,
  chapterDetailNode,
}: RecordsPrepareViewProps) {
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([]);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [showDismissedItems, setShowDismissedItems] = useState<boolean>(false);
  const [editDraft, setEditDraft] = useState<{
    text: string;
    section: string;
    quote: string;
    question: string;
    priority: FindingPriority;
  } | null>(null);

  const [showNewFindingForm, setShowNewFindingForm] = useState<boolean>(false);
  const [newFindingText, setNewFindingText] = useState<string>("");
  const [newFindingQuote, setNewFindingQuote] = useState<string>("");
  const [newFindingQuestion, setNewFindingQuestion] = useState<string>("");
  const [newFindingPriority, setNewFindingPriority] =
    useState<FindingPriority>("high");

  const [showNewQuestionForm, setShowNewQuestionForm] = useState<boolean>(false);
  const [newQuestionText, setNewQuestionText] = useState<string>("");
  const [newQuestionCitation, setNewQuestionCitation] = useState<string>("");

  const activeChapterMeta =
    ALL_INTEL_CHAPTERS.find((c) => c.id === activeChapter) ||
    ALL_INTEL_CHAPTERS[0];

  const getFindingPriority = (f: IepIntelFinding): FindingPriority => {
    if (findingPrioritiesMap[f.id]) return findingPrioritiesMap[f.id];
    if (f.priority) return f.priority;
    if (f.status === "important") return "high";
    if (f.status === "dismiss") return "low";
    return "medium";
  };

  // Filter findings by activeChapter when not on "overview", and always order by IEP page & section order
  const orderedAllFindings = sortFindingsInIepDocumentOrder(findings);
  const chapterMatchedFindings =
    activeChapter === "overview"
      ? orderedAllFindings
      : orderedAllFindings.filter((f) => {
          const sec = `${f.category || ""} ${f.section || ""}`.toLowerCase();
          return (
            sec.includes(activeChapterMeta.shortLabel.toLowerCase()) ||
            sec.includes(
              activeChapterMeta.iepSectionName.split("/")[0].trim().toLowerCase()
            )
          );
        });

  const filteredFindings = chapterMatchedFindings.filter(
    (f) => f.status !== "dismiss" && f.reviewDecision !== "dismissed"
  );
  const dismissedFindings = chapterMatchedFindings.filter(
    (f) => f.status === "dismiss" || f.reviewDecision === "dismissed"
  );

  const toggleSelectFinding = (id: string) => {
    setSelectedFindingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const startEditFinding = (f: IepIntelFinding) => {
    setEditingFindingId(f.id);
    setEditDraft({
      text: f.text,
      section: f.section || f.category || activeChapterMeta.iepSectionName,
      quote: f.quote || f.sourceRef?.excerpt || "",
      question: findingQuestionsMap[f.id] || f.proposedQuestion || "",
      priority: getFindingPriority(f),
    });
  };

  return (
    <div
      data-testid="records-prepare-view"
      className="p-4 sm:p-6 space-y-5 text-[#F7F2E8]"
    >
      {/* 1. Top Control Strip: Single Contextual Chapter Selector + Batch Blueprint Action */}
      <div className="rounded-xl bg-[#020A1E]/95 border border-[#1B2F56] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="prepare-chapter-selector"
              className="text-xs font-serif font-bold text-[#FFE394]"
            >
              Review Section:
            </label>
            <select
              id="prepare-chapter-selector"
              data-testid="prepare-chapter-selector"
              value={activeChapter}
              onChange={(e) =>
                onSelectChapter(e.target.value as IntelChapterId)
              }
              className="h-8 rounded-lg bg-[#000820] border border-[#243B67] px-3 text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
            >
              {ALL_INTEL_CHAPTERS.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.label}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-[#93AECD]">
            {activeChapterMeta.description}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowNewFindingForm((v) => !v)}
            className="h-8 px-3 text-xs bg-[#000820] border-[#243B67] text-[#E2ECF8] hover:text-white hover:border-[#C5A059]/60 cursor-pointer gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>New Finding</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowNewQuestionForm((v) => !v)}
            className="h-8 px-3 text-xs bg-[#000820] border-[#243B67] text-[#E2ECF8] hover:text-white hover:border-[#C5A059]/60 cursor-pointer gap-1.5"
          >
            <MessageSquarePlus className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>Add Meeting Question</span>
          </Button>

          {selectedFindingIds.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onSendMultipleFindingsToBlueprint(selectedFindingIds);
                setSelectedFindingIds([]);
              }}
              data-testid="prepare-batch-add-blueprint-btn"
              className="h-8 px-3.5 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1.5"
            >
              <span>
                Add Selected to Blueprint ({selectedFindingIds.length})
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Inline New Finding Form */}
      {showNewFindingForm && (
        <div className="rounded-xl bg-[#04112B] border border-[#C5A059]/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-serif font-bold text-[#FFE394]">
              Add Advocate-Confirmed Finding ({activeChapterMeta.shortLabel})
            </h4>
            <div className="flex items-center gap-1.5">
              {(["high", "medium", "low"] as FindingPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewFindingPriority(p)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10.5px] border cursor-pointer",
                    newFindingPriority === p
                      ? "bg-[#C5A059]/25 border-[#C5A059] text-[#FFE394] font-semibold"
                      : "bg-[#000820] border-[#1F3560] text-[#93AECD]"
                  )}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={newFindingText}
            onChange={(e) => setNewFindingText(e.target.value)}
            placeholder="Describe the finding, student need, or recommendation..."
            rows={2}
            className="bg-[#000820] border-[#223965] text-xs text-[#FFF4D4]"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              value={newFindingQuote}
              onChange={(e) => setNewFindingQuote(e.target.value)}
              placeholder="Source citation / quote (e.g., Current IEP · PDF p. 3)"
              className="h-8 bg-[#000820] border-[#223965] text-xs text-[#FFF4D4]"
            />
            <Input
              value={newFindingQuestion}
              onChange={(e) => setNewFindingQuestion(e.target.value)}
              placeholder="Optional meeting question for the team..."
              className="h-8 bg-[#000820] border-[#223965] text-xs text-[#FFF4D4]"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowNewFindingForm(false)}
              className="h-7 text-xs bg-[#000820] border-[#223965] text-[#93AECD]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!newFindingText.trim()) return;
                onAddManualFinding({
                  category: activeChapterMeta.shortLabel,
                  section:
                    activeChapter === "overview"
                      ? "Present Levels / Academics"
                      : activeChapterMeta.iepSectionName,
                  text: newFindingText.trim(),
                  quote: newFindingQuote.trim() || undefined,
                  meetingQuestion: newFindingQuestion.trim() || undefined,
                  priority: newFindingPriority,
                });
                setNewFindingText("");
                setNewFindingQuote("");
                setNewFindingQuestion("");
                setShowNewFindingForm(false);
              }}
              className="h-7 px-3 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer"
            >
              Save Confirmed Finding
            </Button>
          </div>
        </div>
      )}

      {/* Inline New Meeting Question Form */}
      {showNewQuestionForm && (
        <div className="rounded-xl bg-[#04112B] border border-[#C5A059]/50 p-4 space-y-3">
          <h4 className="text-xs font-serif font-bold text-[#FFE394]">
            Save Question for IEP Meeting
          </h4>
          <Textarea
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            placeholder="Write the question you want to ask the IEP team..."
            rows={2}
            className="bg-[#000820] border-[#223965] text-xs text-[#FFF4D4]"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              value={newQuestionCitation}
              onChange={(e) => setNewQuestionCitation(e.target.value)}
              placeholder="Optional source reference (e.g., Psychoed Eval p. 6)"
              className="h-8 max-w-sm bg-[#000820] border-[#223965] text-xs text-[#FFF4D4]"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowNewQuestionForm(false)}
                className="h-7 text-xs bg-[#000820] border-[#223965] text-[#93AECD]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!newQuestionText.trim()) return;
                  onAddMeetingQuestion({
                    section:
                      activeChapter === "overview"
                        ? "General / Present Levels"
                        : activeChapterMeta.iepSectionName,
                    question: newQuestionText.trim(),
                    sourceCitation: newQuestionCitation.trim() || undefined,
                    priority: "high",
                  });
                  setNewQuestionText("");
                  setNewQuestionCitation("");
                  setShowNewQuestionForm(false);
                }}
                className="h-7 px-3 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer"
              >
                Save Question
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Saved Findings List (Advocate-Confirmed vs AI Drafts) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
            Saved Findings ({filteredFindings.length})
          </h4>
          <span className="text-[11px] text-[#8EA6C9]">
            Select items to add to Blueprint · Duplicate entries are prevented automatically
          </span>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="rounded-xl bg-[#020A1E]/80 border border-[#1B2F56] p-7 text-center text-xs text-[#93AECD]">
            No findings recorded for this section yet. Capture a passage while reading, confirm an item in Compare, or click &ldquo;New Finding&rdquo; above.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredFindings.map((finding) => {
              const isAiDraft =
                aiDraftFindingIds.includes(finding.id) ||
                Boolean(finding.aiGeneratedDraft && !finding.advocateConfirmed);
              const { stageStatus, connectedTarget } = getFindingStageStatus(
                finding,
                targets,
                workspaceStatus
              );
              const inBlueprint =
                stageStatus === "in_blueprint" ||
                stageStatus === "on_meeting_agenda";
              const isSelected = selectedFindingIds.includes(finding.id);
              const priority = getFindingPriority(finding);
              const attachedQuestion =
                findingQuestionsMap[finding.id] ||
                finding.proposedQuestion ||
                "";
              const isEditing = editingFindingId === finding.id;

              return (
                <div
                  key={finding.id}
                  data-testid={`prepare-finding-card-${finding.id}`}
                  className={cn(
                    "rounded-xl border p-4 transition-all",
                    isAiDraft
                      ? "bg-[#050F26]/95 border-[#493D8A]/60"
                      : "bg-[#020A1E]/95 border-[#1C3058] hover:border-[#2E4B82]"
                  )}
                >
                  {isEditing && editDraft ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-serif font-bold text-[#FFE394]">
                          Edit Finding &amp; Meeting Question
                        </span>
                        <div className="flex items-center gap-1">
                          {(["high", "medium", "low"] as FindingPriority[]).map(
                            (p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() =>
                                  setEditDraft({ ...editDraft, priority: p })
                                }
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] border cursor-pointer",
                                  editDraft.priority === p
                                    ? "bg-[#C5A059]/25 border-[#C5A059] text-[#FFE394]"
                                    : "bg-[#000820] border-[#1F3560] text-[#93AECD]"
                                )}
                              >
                                {PRIORITY_LABELS[p]}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      <Textarea
                        value={editDraft.text}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, text: e.target.value })
                        }
                        rows={2}
                        className="bg-[#000820] border-[#223965] text-xs text-[#FFF4D4]"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <Input
                          value={editDraft.quote}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, quote: e.target.value })
                          }
                          placeholder="Source citation / excerpt"
                          className="h-8 bg-[#000820] border-[#223965] text-xs text-[#FFF4D4]"
                        />
                        <Input
                          value={editDraft.question}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              question: e.target.value,
                            })
                          }
                          placeholder="Meeting question for the IEP team"
                          className="h-8 bg-[#000820] border-[#223965] text-xs text-[#FFF4D4]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingFindingId(null);
                            setEditDraft(null);
                          }}
                          className="h-7 text-xs bg-[#000820] border-[#223965] text-[#93AECD]"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            onUpdateFinding(
                              finding.id,
                              {
                                text: editDraft.text.trim() || finding.text,
                                section: editDraft.section,
                                quote: editDraft.quote.trim() || finding.quote,
                                proposedQuestion: editDraft.question.trim(),
                                priority: editDraft.priority,
                                reviewDecision: "saved",
                                advocateConfirmed: true,
                                aiGeneratedDraft: false,
                                status:
                                  editDraft.priority === "high"
                                    ? "important"
                                    : "keep",
                              },
                              editDraft.question.trim(),
                              editDraft.priority,
                              true
                            );
                            setEditingFindingId(null);
                            setEditDraft(null);
                          }}
                          className="h-7 px-3 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer"
                        >
                          Confirm &amp; Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Selection Checkbox for Blueprint */}
                        <button
                          type="button"
                          onClick={() => toggleSelectFinding(finding.id)}
                          aria-label="Select finding for Blueprint"
                          className={cn(
                            "mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 cursor-pointer",
                            isSelected
                              ? "bg-[#C5A059] border-[#C5A059] text-[#000820]"
                              : "bg-[#000820] border-[#2A4575]"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </button>

                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Advocate-Confirmed vs AI Draft Distinction */}
                            {isAiDraft ? (
                              <Badge className="bg-[#1B153E] text-[#DFC8FF] border border-[#6E59C9]/60 text-[10px]">
                                <Sparkles className="h-2.5 w-2.5 mr-1" />
                                AI Suggestion · Unconfirmed
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 text-[10px]">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                Saved for later
                              </Badge>
                            )}

                            <Badge className="bg-[#081A38] text-[#E2ECF8] border border-[#243E6E] text-[10px]">
                              {finding.section || finding.category}
                            </Badge>

                            {/* Priority Selector Pill */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextP: FindingPriority =
                                  priority === "high"
                                    ? "medium"
                                    : priority === "medium"
                                    ? "low"
                                    : "high";
                                onUpdateFinding(
                                  finding.id,
                                  {
                                    priority: nextP,
                                    status:
                                      nextP === "high" ? "important" : "keep",
                                  },
                                  undefined,
                                  nextP
                                );
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] border font-medium cursor-pointer",
                                PRIORITY_STYLES[priority]
                              )}
                              title="Click to cycle priority"
                            >
                              {PRIORITY_LABELS[priority]}
                            </button>

                            {/* Clickable Source Citation */}
                            {(finding.sourceRef || finding.quote) && (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenCitationInReader({
                                    fileId:
                                      finding.sourceRef?.documentId ?? null,
                                    fileName:
                                      finding.sourceRef?.fileName ||
                                      "Selected Record",
                                    pageNumber:
                                      finding.sourceRef?.pdfPageNumber ?? null,
                                    printedPageLabel:
                                      finding.sourceRef?.printedPageLabel,
                                    excerpt:
                                      finding.sourceRef?.excerpt ||
                                      finding.quote ||
                                      null,
                                    sectionLabel:
                                      finding.section ||
                                      finding.category ||
                                      "Saved Finding",
                                    boundingBoxes:
                                      finding.sourceRef?.boundingBoxes,
                                    verificationStatus:
                                      finding.sourceRef?.verificationStatus,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#05132C] border border-[#284578] hover:border-[#C5A059] text-[10.5px] font-mono text-[#FFE394] cursor-pointer"
                                title="Open source citation in document reader"
                              >
                                <Bookmark className="h-2.5 w-2.5 text-[#DFBE77]" />
                                <span>
                                  {finding.sourceRef?.fileName
                                    ? `${formatShortFileName(
                                        finding.sourceRef.fileName,
                                        20
                                      )} · p. ${
                                        finding.sourceRef.pdfPageNumber || "?"
                                      }`
                                    : (finding.quote || "").slice(0, 36)}
                                </span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </button>
                            )}

                            {stageStatus === "on_meeting_agenda" ? (
                              <Badge
                                data-testid={`finding-blueprint-badge-${finding.id}`}
                                className="bg-amber-950/80 text-amber-200 border border-amber-500/50 text-[10px] font-semibold"
                              >
                                <PlayCircle className="h-2.5 w-2.5 mr-1" />
                                On meeting agenda
                                {connectedTarget?.meetingStatus &&
                                connectedTarget.meetingStatus !== "NOT_DISCUSSED"
                                  ? ` · ${connectedTarget.meetingStatus}`
                                  : ""}
                              </Badge>
                            ) : stageStatus === "in_blueprint" ? (
                              <Badge
                                data-testid={`finding-blueprint-badge-${finding.id}`}
                                className="bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/60 text-[10px] font-semibold"
                              >
                                <MapIcon className="h-2.5 w-2.5 mr-1" />
                                In Blueprint
                              </Badge>
                            ) : stageStatus === "withdrawn_history" ? (
                              <Badge className="bg-[#1B2234] text-[#B8CCE8] border border-[#3B4C73] text-[10px]">
                                Withdrawn (History Kept)
                              </Badge>
                            ) : null}
                          </div>

                          {finding.sourceMaterialFlaggedForReview && (
                            <div
                              data-testid={`prepare-finding-source-flag-${finding.id}`}
                              className="rounded-lg bg-[#1C1408] border border-[#C5A059]/50 px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] text-[#FFE394]"
                            >
                              <AlertTriangle className="h-3 w-3 text-[#DFBE77] shrink-0" />
                              <span>
                                {finding.sourceMaterialFlagReason ||
                                  "Source material changed since this finding was saved. Verify citation against the current record."}
                              </span>
                            </div>
                          )}

                          <p className="text-xs sm:text-[13px] text-[#FFF4D4] leading-relaxed">
                            {finding.text}
                          </p>

                          {finding.quote && (
                            <p className="text-[11px] font-serif italic text-[#93AECD] border-l-2 border-[#C5A059]/40 pl-2.5">
                              {finding.quote}
                            </p>
                          )}

                          {attachedQuestion && (
                            <div className="rounded-lg bg-[#04112B] border border-[#1E3560] px-3 py-1.5 text-[11.5px] text-[#FFE394]">
                              <strong className="text-[#C6B697]">
                                Meeting Question:{" "}
                              </strong>
                              {attachedQuestion}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Actions: Save for later, Send to Blueprint (or Open in Stage), Contextual More Menu */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAiDraft && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            data-testid={`prepare-save-for-later-${finding.id}`}
                            onClick={() =>
                              onUpdateFinding(
                                finding.id,
                                {
                                  advocateConfirmed: true,
                                  aiGeneratedDraft: false,
                                  reviewDecision: "saved",
                                },
                                undefined,
                                undefined,
                                true
                              )
                            }
                            className="h-7 px-2.5 text-[11px] bg-emerald-950/50 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/60 cursor-pointer"
                          >
                            Save for later
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => startEditFinding(finding)}
                          className="p-1.5 rounded-lg bg-[#041028] border border-[#1D325A] text-[#93AECD] hover:text-white hover:border-[#C5A059]/50 cursor-pointer"
                          title="Edit finding or meeting question"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {inBlueprint ? (
                          <Button
                            type="button"
                            size="sm"
                            data-testid={`prepare-open-in-stage-${finding.id}`}
                            onClick={() =>
                              onOpenFindingInStage?.(
                                finding,
                                stageStatus === "on_meeting_agenda"
                                  ? "meeting_space"
                                  : "blueprint"
                              )
                            }
                            className="h-7 px-2.5 text-[11px] font-semibold bg-[#0B2248] border border-[#C5A059] text-[#FFE394] hover:bg-[#102E60] cursor-pointer gap-1"
                          >
                            <span>
                              {stageStatus === "on_meeting_agenda"
                                ? "Open in Meeting Space"
                                : "Open in Blueprint"}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              onSendFindingToBlueprint(finding, attachedQuestion)
                            }
                            data-testid={`prepare-add-blueprint-${finding.id}`}
                            className="h-7 px-2.5 text-[11px] font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1"
                          >
                            <span>Send to Blueprint</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}

                        {/* Contextual More Menu (Dismiss / Remove from Blueprint / Delete finding) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              data-testid={`prepare-finding-more-${finding.id}`}
                              className="p-1.5 rounded-lg bg-[#041028] border border-[#1D325A] text-[#93AECD] hover:text-white hover:border-[#C5A059]/50 cursor-pointer"
                              aria-label="More finding actions"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-56 bg-[#01091E] border border-[#284372] text-[#FFF4D4] shadow-2xl p-1.5 z-50"
                          >
                            {!inBlueprint && onDismissFinding && (
                              <DropdownMenuItem
                                data-testid={`prepare-dismiss-${finding.id}`}
                                onClick={() => onDismissFinding(finding)}
                                className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 focus:bg-[#092046] focus:text-[#FFE394]"
                              >
                                <XCircle className="h-3.5 w-3.5 text-[#DFBE77]" />
                                <span>Dismiss suggestion</span>
                              </DropdownMenuItem>
                            )}

                            {inBlueprint && onRemoveFindingFromBlueprint && (
                              <DropdownMenuItem
                                data-testid={`prepare-remove-blueprint-${finding.id}`}
                                onClick={() =>
                                  onRemoveFindingFromBlueprint(finding)
                                }
                                className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 text-[#FFE394] focus:bg-[#092046]"
                              >
                                <CornerUpLeft className="h-3.5 w-3.5 text-[#DFBE77]" />
                                <span>Remove from Blueprint / agenda</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-[#1A2D50] my-1" />

                            <DropdownMenuItem
                              data-testid={`prepare-delete-${finding.id}`}
                              onClick={() => {
                                if (onRequestDeleteFinding) {
                                  onRequestDeleteFinding(finding);
                                } else {
                                  onDeleteFinding(finding.id);
                                }
                              }}
                              className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 text-rose-300 focus:bg-rose-950/60 focus:text-rose-200"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                              <span>Delete finding…</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Dismissed Suggestions Restoration Drawer */}
        {dismissedFindings.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              data-testid="prepare-toggle-dismissed-btn"
              onClick={() => setShowDismissedItems((v) => !v)}
              className="text-xs text-[#8EA6C9] hover:text-[#FFF4D4] cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3 w-3 text-[#DFBE77]" />
              <span>
                {showDismissedItems
                  ? "Hide dismissed items"
                  : `Dismissed items (${dismissedFindings.length}) · Restore`}
              </span>
            </button>
            {showDismissedItems && (
              <div className="mt-2 space-y-1.5">
                {dismissedFindings.map((df) => (
                  <div
                    key={df.id}
                    className="rounded-xl bg-[#020A1E]/80 border border-[#1B2F56] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-[#93AECD] truncate">{df.text}</span>
                    {onRestoreDismissedFinding && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-testid={`prepare-restore-dismissed-${df.id}`}
                        onClick={() => onRestoreDismissedFinding(df)}
                        className="h-7 px-2.5 text-[11px] bg-[#04122C] border-[#284578] text-[#FFE394] hover:border-[#C5A059] cursor-pointer"
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Saved Meeting Questions Section */}
      {savedMeetingQuestions.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
            Prepared Meeting Questions ({savedMeetingQuestions.length})
          </h4>
          <div className="space-y-2">
            {savedMeetingQuestions.map((q) => (
              <div
                key={q.id}
                className="rounded-xl bg-[#020A1E]/95 border border-[#1C3058] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-[#081A38] text-[#FFE394] border border-[#C5A059]/40 text-[10px]">
                      {q.section}
                    </Badge>
                    {q.sourceCitation && (
                      <span className="text-[10.5px] font-mono text-[#93AECD]">
                        {q.sourceCitation}
                      </span>
                    )}
                    {q.addedToBlueprint && (
                      <Badge className="bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50 text-[10px]">
                        In Blueprint
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-[13px] text-[#FFF4D4]">
                    {q.question}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onDeleteMeetingQuestion(q.id)}
                    className="p-1.5 rounded-lg bg-[#041028] border border-[#1D325A] text-[#93AECD] hover:text-rose-300 cursor-pointer"
                    title="Delete question"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={q.addedToBlueprint}
                    onClick={() => onAddQuestionToBlueprint(q)}
                    className="h-7 px-2.5 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer disabled:opacity-60"
                  >
                    {q.addedToBlueprint ? "In Blueprint" : "Add to Blueprint"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Contextual Chapter Deep-Dive (when a specific chapter like Goals or Accommodations is selected) */}
      {activeChapter !== "overview" && chapterDetailNode && (
        <div className="pt-3 border-t border-[#182949]">{chapterDetailNode}</div>
      )}
    </div>
  );
}


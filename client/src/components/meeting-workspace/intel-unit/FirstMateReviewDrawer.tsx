import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  FileText,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Loader2,
  Send,
  Compass,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { IepIntelFinding } from "../types";
import {
  type VaultDocumentOption,
  type RecordReviewGroup,
  type SavedMeetingQuestionItem,
  type IntelBoundingBox,
  resolveClientRecordGroup,
  formatShortFileName,
} from "./intelUnitTypes";

interface FirstMateReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  studentContactId: number;
  workspaceId?: number;
  vaultDocuments: VaultDocumentOption[];
  recordGroupOverrides?: Record<number, RecordReviewGroup>;
  selectedDocument: VaultDocumentOption | null;
  selectedPassageQuote: string | null;
  selectedPassagePage: number | null;
  onClearSelectedPassage: () => void;
  onOpenCitation: (params: {
    documentId: number;
    fileName: string;
    pdfPageNumber: number;
    printedPageLabel: string | null;
    excerpt: string;
    boundingBoxes: IntelBoundingBox[];
  }) => void;
  onSaveDraftFinding: (finding: IepIntelFinding, isAiDraft?: boolean) => void;
  onSaveMeetingQuestion: (question: SavedMeetingQuestionItem) => void;
}

const STARTING_ACTIONS: Array<{
  id:
    | "explain_passage"
    | "compare_eval_with_iep"
    | "find_recommendations"
    | "turn_into_question";
  label: string;
  description: string;
}> = [
  {
    id: "explain_passage",
    label: "Explain this passage",
    description:
      "Clarify educational terms, scores, or provisions in plain language",
  },
  {
    id: "compare_eval_with_iep",
    label: "Compare this evaluation with the IEP",
    description:
      "Check how findings in the selected evaluation connect to the IEP",
  },
  {
    id: "find_recommendations",
    label: "Find recommendations that may need discussion",
    description:
      "Identify evaluation recommendations or baselines to review",
  },
  {
    id: "turn_into_question",
    label: "Turn this into a meeting question",
    description:
      "Draft a collaborative, parent-centered question for the IEP team",
  },
];

export function FirstMateReviewDrawer({
  isOpen,
  onClose,
  studentContactId,
  workspaceId,
  vaultDocuments,
  recordGroupOverrides,
  selectedDocument,
  selectedPassageQuote,
  selectedPassagePage,
  onClearSelectedPassage,
  onOpenCitation,
  onSaveDraftFinding,
  onSaveMeetingQuestion,
}: FirstMateReviewDrawerProps) {
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [showRecordPicker, setShowRecordPicker] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [expandedSuggestionId, setExpandedSuggestionId] = useState<
    string | null
  >(null);
  const [confirmedSuggestionIds, setConfirmedSuggestionIds] = useState<
    Record<string, boolean>
  >({});

  // Default source selection: active document + designated Current IEP
  useEffect(() => {
    if (vaultDocuments.length === 0) return;
    setSelectedDocIds((prev) => {
      const validPrev = prev.filter((id) =>
        vaultDocuments.some((d) => d.id === id)
      );
      if (validPrev.length > 0) {
        if (selectedDocument && !validPrev.includes(selectedDocument.id)) {
          return [...validPrev, selectedDocument.id];
        }
        return validPrev;
      }
      const initialIds = new Set<number>();
      if (selectedDocument) initialIds.add(selectedDocument.id);
      const currentIep = vaultDocuments.find(
        (d) => resolveClientRecordGroup(d, recordGroupOverrides) === "current_iep"
      );
      if (currentIep) initialIds.add(currentIep.id);
      return Array.from(initialIds);
    });
  }, [vaultDocuments, selectedDocument?.id]);

  const askFirstMateMutation =
    trpc.meetingWorkspace.askFirstMateRecordsReview.useMutation({
      onSuccess: (res) => {
        if (res.draftFindings.length > 0) {
          setExpandedSuggestionId(res.draftFindings[0].id);
        }
      },
      onError: (err) => {
        toast.error(
          err.message || "First Mate could not complete this request."
        );
      },
    });

  if (!isOpen) return null;

  const toggleDocId = (docId: number) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  const handleRunAction = (
    action:
      | "explain_passage"
      | "compare_eval_with_iep"
      | "find_recommendations"
      | "turn_into_question"
      | "custom_question"
  ) => {
    const effectiveIds =
      selectedDocIds.length > 0
        ? selectedDocIds
        : selectedDocument
        ? [selectedDocument.id]
        : [];

    if (effectiveIds.length === 0 && !selectedPassageQuote) {
      toast.error("Select at least one record from the student vault first.");
      return;
    }

    askFirstMateMutation.mutate({
      studentContactId,
      workspaceId,
      action,
      selectedFileIds: effectiveIds,
      activeFileId: selectedDocument?.id ?? null,
      activePageNumber: selectedPassagePage ?? null,
      selectedPassageText: selectedPassageQuote || null,
      customPrompt:
        action === "custom_question" ? customPrompt.trim() : null,
    });
  };

  const result = askFirstMateMutation.data;
  const activeRecords = vaultDocuments.filter((d) =>
    selectedDocIds.includes(d.id)
  );

  return (
    <aside
      data-testid="first-mate-review-drawer"
      aria-label="First Mate Contextual Review Drawer"
      className="w-full xl:w-[400px] 2xl:w-[430px] shrink-0 bg-[#000820] border-l border-[#24395E] flex flex-col max-h-[820px] shadow-[-16px_0_40px_rgba(0,0,0,0.75)] z-30"
    >
      {/* Top Header */}
      <div className="px-4 py-3 bg-[#020C28] border-b border-[#1D3052] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-[#091E42] border border-[#C5A059]/45 flex items-center justify-center shrink-0">
            <Compass className="h-3.5 w-3.5 text-[#DFBE77]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-serif font-bold text-[#FFF4D4]">
                First Mate
              </h3>
              <Badge className="bg-[#0B2246] text-[#FFE394] border border-[#C5A059]/40 text-[9.5px] px-1.5 py-0">
                Draft Assist
              </Badge>
            </div>
            <p className="text-[10.5px] text-[#8EA6C9] truncate">
              Source-linked analysis · Advocate confirms all findings
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-testid="close-first-mate-drawer-btn"
          className="text-[#8EA6C9] hover:text-[#FFF4D4] p-1 rounded-md hover:bg-[#081A38] cursor-pointer"
          aria-label="Close First Mate drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Source Records Context Strip */}
        <div className="rounded-xl bg-[#030F29] border border-[#1E3256] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#9BB2D6]">
              Records in Scope ({activeRecords.length})
            </span>
            <button
              type="button"
              onClick={() => setShowRecordPicker((v) => !v)}
              data-testid="first-mate-adjust-records-btn"
              className="inline-flex items-center gap-1 text-[10.5px] text-[#FFE394] hover:underline cursor-pointer"
            >
              <SlidersHorizontal className="h-3 w-3 text-[#DFBE77]" />
              <span>{showRecordPicker ? "Done" : "Adjust Records"}</span>
            </button>
          </div>

          {activeRecords.length === 0 ? (
            <p className="text-[11px] text-[#8EA6C9]">
              No records selected. Choose records below to ground First Mate
              responses.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {activeRecords.map((doc) => {
                const grp = resolveClientRecordGroup(doc, recordGroupOverrides);
                return (
                  <span
                    key={doc.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#071A3E] border border-[#2C4878] text-[10.5px] text-[#FFF4D4]"
                  >
                    <FileText className="h-2.5 w-2.5 text-[#DFBE77] shrink-0" />
                    <span className="truncate max-w-[165px]">
                      {formatShortFileName(doc.fileName, 26)}
                    </span>
                    <span className="text-[9.5px] text-[#8EA6C9]">
                      (
                      {grp === "current_iep"
                        ? "IEP"
                        : grp === "school_evaluation"
                        ? "School"
                        : "Outside"}
                      )
                    </span>
                  </span>
                );
              })}
            </div>
          )}

          {showRecordPicker && (
            <div className="pt-2 border-t border-[#1A2C4C] space-y-1.5 max-h-44 overflow-y-auto">
              {vaultDocuments.map((doc) => {
                const checked = selectedDocIds.includes(doc.id);
                const grp = resolveClientRecordGroup(doc, recordGroupOverrides);
                return (
                  <label
                    key={doc.id}
                    className={cn(
                      "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors",
                      checked
                        ? "bg-[#092046] border-[#C5A059]/60 text-[#FFF4D4]"
                        : "bg-[#01091C] border-[#1A2C4C] text-[#8EA6C9] hover:text-[#FFF4D4]"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDocId(doc.id)}
                        className="accent-[#DFBE77]"
                      />
                      <span className="truncate">
                        {formatShortFileName(doc.fileName, 32)}
                      </span>
                    </div>
                    <Badge className="bg-[#05142E] text-[#9BB2D6] border border-[#243B64] text-[9px] px-1.5 py-0 shrink-0">
                      {grp === "current_iep"
                        ? "Current IEP"
                        : grp === "school_evaluation"
                        ? "School Eval"
                        : grp === "outside_evaluation"
                        ? "Outside Eval"
                        : "Historical"}
                    </Badge>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Passage Pill (when focused in reader) */}
        {selectedPassageQuote && (
          <div className="rounded-xl bg-[#061838] border border-[#C5A059]/45 p-2.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFE394]">
                Selected Passage{" "}
                {selectedPassagePage ? `· PDF p. ${selectedPassagePage}` : ""}
              </span>
              <button
                type="button"
                onClick={onClearSelectedPassage}
                className="text-[#8EA6C9] hover:text-[#FFF4D4] cursor-pointer"
                aria-label="Clear selected passage"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[11px] font-serif italic text-[#FFF4D4] line-clamp-3">
              &ldquo;{selectedPassageQuote}&rdquo;
            </p>
          </div>
        )}

        {/* 4 Starting Actions */}
        <div className="space-y-1.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8EA6C9]">
            Starting Actions
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {STARTING_ACTIONS.map((act) => (
              <button
                key={act.id}
                type="button"
                disabled={askFirstMateMutation.isPending}
                data-testid={`first-mate-action-${act.id}`}
                onClick={() => handleRunAction(act.id)}
                className="w-full text-left px-3 py-2 rounded-xl bg-[#030E26] hover:bg-[#081D42] border border-[#1E3256] hover:border-[#C5A059]/60 transition-all cursor-pointer group flex items-start justify-between gap-2 disabled:opacity-50"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-semibold text-[#FFF4D4] group-hover:text-[#FFE394] flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[#DFBE77] shrink-0" />
                    <span>{act.label}</span>
                  </div>
                  <p className="text-[10.5px] text-[#8EA6C9] leading-snug">
                    {act.description}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-[#8EA6C9] group-hover:text-[#FFE394] shrink-0 mt-1" />
              </button>
            ))}
          </div>
        </div>

        {/* Custom Question Input */}
        <div className="rounded-xl bg-[#020B20] border border-[#1E3256] p-2.5 space-y-2">
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={2}
            data-testid="first-mate-custom-question-input"
            placeholder="Ask about selected text, the open document, or the selected set of records..."
            className="bg-[#000614] border-[#1E3256] text-xs text-[#FFF4D4] placeholder:text-[#8EA6C9]/50 resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-[#8EA6C9]">
              Grounded strictly in selected records
            </span>
            <Button
              type="button"
              size="sm"
              disabled={!customPrompt.trim() || askFirstMateMutation.isPending}
              data-testid="first-mate-ask-btn"
              onClick={() => handleRunAction("custom_question")}
              className="h-7 px-3 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1.5"
            >
              {askFirstMateMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              <span>Ask First Mate</span>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {askFirstMateMutation.isPending && (
          <div className="rounded-xl bg-[#030F29] border border-[#1E3256] p-5 text-center space-y-2">
            <Loader2 className="h-5 w-5 animate-spin text-[#DFBE77] mx-auto" />
            <p className="text-xs font-serif font-bold text-[#FFF4D4]">
              Reviewing Selected Records...
            </p>
            <p className="text-[11px] text-[#8EA6C9]">
              Verifying page citations and extraction coverage
            </p>
          </div>
        )}

        {/* Results & Telemetry */}
        {result && !askFirstMateMutation.isPending && (
          <div
            data-testid="first-mate-results-panel"
            className="space-y-3 pt-1 border-t border-[#1D3052]"
          >
            {/* OCR & Extraction Status / Review Limitations */}
            <div className="rounded-xl bg-[#020A1E] border border-[#1E3256] p-2.5 space-y-1.5 text-[10.5px]">
              <div className="font-semibold text-[#9BB2D6] uppercase tracking-wider text-[10px]">
                Source Extraction Status
              </div>
              {result.sourceRecordsUsed.map((rec) => (
                <div
                  key={rec.fileId}
                  className="flex items-center justify-between gap-2 text-[#D8C7A5]"
                >
                  <span className="truncate font-medium text-[#FFF4D4]">
                    {formatShortFileName(rec.fileName, 26)}
                  </span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-mono shrink-0",
                      rec.overallStatus === "complete"
                        ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/30"
                        : rec.overallStatus === "partial"
                        ? "bg-amber-950/70 text-amber-200 border border-amber-500/30"
                        : "bg-rose-950/70 text-rose-200 border border-rose-500/30"
                    )}
                  >
                    {rec.readablePageCount}/{rec.pageCount} readable
                  </span>
                </div>
              ))}

              {result.reviewLimitations.length > 0 && (
                <div className="pt-1.5 border-t border-[#1A2C4C] space-y-1 text-amber-200/90">
                  {result.reviewLimitations.map((lim, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                      <span>{lim}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Concise Summary */}
            <div className="rounded-xl bg-[#041230] border border-[#284372] p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFE394]">
                  First Mate Synthesis (Draft)
                </span>
              </div>
              <p className="text-xs text-[#FFF4D4] leading-relaxed">
                {result.answerSummary}
              </p>
              {result.expandableDetails.length > 0 && (
                <ul className="pt-1 space-y-1 text-[11px] text-[#9BB2D6] list-disc pl-4">
                  {result.expandableDetails.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Source-Linked Expandable Draft Findings */}
            <div className="space-y-2">
              {result.draftFindings.map((sug) => {
                const isExpanded = expandedSuggestionId === sug.id;
                const isConfirmed = Boolean(confirmedSuggestionIds[sug.id]);

                return (
                  <div
                    key={sug.id}
                    data-testid={`first-mate-suggestion-${sug.id}`}
                    className="rounded-xl bg-[#030E26] border border-[#1E3256] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSuggestionId(isExpanded ? null : sug.id)
                      }
                      className="w-full px-3 py-2.5 text-left flex items-start justify-between gap-2 hover:bg-[#071838]/60 cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            className={cn(
                              "text-[9.5px] px-1.5 py-0 border",
                              isConfirmed
                                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                                : "bg-[#091E40] text-[#FFE394] border-[#C5A059]/40"
                            )}
                          >
                            {isConfirmed ? "Confirmed" : "AI Draft"}
                          </Badge>
                          {sug.citation && (
                            <span className="text-[10px] font-mono text-[#8EA6C9]">
                              {formatShortFileName(sug.citation.fileName, 22)} ·
                              p. {sug.citation.pdfPageNumber || 1}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-serif font-bold text-[#FFF4D4]">
                          {sug.category}
                        </h4>
                        <p className="text-[11px] text-[#C6B697] line-clamp-2">
                          {sug.text}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-[#FFE394] shrink-0 mt-1" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#8EA6C9] shrink-0 mt-1" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-2 border-t border-[#182949] bg-[#010818]/90 space-y-2.5">
                        <p className="text-xs text-[#D8C7A5] leading-relaxed">
                          {sug.text}
                        </p>

                        {sug.citation && (
                          <div className="rounded-lg bg-[#030F28] border border-[#1E3256] p-2 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono text-[#FFE394]">
                                {formatShortFileName(
                                  sug.citation.fileName,
                                  26
                                )}{" "}
                                · PDF p. {sug.citation.pdfPageNumber || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenCitation({
                                    documentId: sug.citation!.fileId,
                                    fileName: sug.citation!.fileName,
                                    pdfPageNumber:
                                      sug.citation!.pdfPageNumber || 1,
                                    printedPageLabel:
                                      sug.citation!.printedPageLabel,
                                    excerpt: sug.citation!.excerpt,
                                    boundingBoxes: sug.citation!.boundingBoxes,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0A2248] border border-[#3E68A8]/60 text-[10px] text-[#FFE394] hover:bg-[#123266] cursor-pointer font-semibold"
                              >
                                <BookOpen className="h-2.5 w-2.5 text-[#DFBE77]" />
                                <span>
                                  Open Original p.{" "}
                                  {sug.citation.pdfPageNumber || 1}
                                </span>
                              </button>
                            </div>
                            <p className="text-[11px] font-serif italic text-[#FFF4D4]">
                              &ldquo;{sug.citation.excerpt}&rdquo;
                            </p>
                          </div>
                        )}

                        {sug.proposedMeetingQuestion && (
                          <div className="rounded-lg bg-[#020A1D] border border-[#1E3256] p-2 space-y-1">
                            <div className="text-[10px] font-semibold text-[#8EA6C9] flex items-center gap-1">
                              <HelpCircle className="h-3 w-3 text-[#DFBE77]" />
                              <span>Proposed Meeting Question</span>
                            </div>
                            <p className="text-[11px] text-[#FFF4D4]">
                              {sug.proposedMeetingQuestion}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                          {sug.proposedMeetingQuestion && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onSaveMeetingQuestion({
                                  id: `q-fm-${sug.id}`,
                                  question: sug.proposedMeetingQuestion,
                                  section: sug.section,
                                  priority:
                                    sug.priority === "high" ? "high" : "medium",
                                  confirmed: true,
                                  sourceCitation: sug.citation
                                    ? `${formatShortFileName(
                                        sug.citation.fileName,
                                        24
                                      )} · p. ${
                                        sug.citation.pdfPageNumber || 1
                                      }`
                                    : "First Mate Review",
                                  sourceDocId: sug.citation?.fileId ?? null,
                                  sourcePageNumber:
                                    sug.citation?.pdfPageNumber ?? null,
                                  addedToBlueprint: false,
                                });
                                toast.success(
                                  "Saved meeting question to Prepare view"
                                );
                              }}
                              className="h-7 px-2.5 text-[10.5px] border-[#263E68] bg-[#04112A] text-[#FFE394] hover:bg-[#0A2146] cursor-pointer"
                            >
                              Save Question
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              const newFinding: IepIntelFinding = {
                                id: `fm-confirmed-${sug.id}`,
                                category: sug.category,
                                section: sug.section,
                                text: sug.text,
                                quote: sug.quote,
                                status:
                                  sug.priority === "high"
                                    ? "important"
                                    : "keep",
                                isCustom: true,
                                advocateConfirmed: true,
                                aiGeneratedDraft: false,
                                proposedQuestion: sug.proposedMeetingQuestion,
                                sourceRef: sug.citation
                                  ? {
                                      documentId: sug.citation.fileId,
                                      fileName: sug.citation.fileName,
                                      pdfPageNumber:
                                        sug.citation.pdfPageNumber || 1,
                                      printedPageLabel:
                                        sug.citation.printedPageLabel,
                                      excerpt: sug.citation.excerpt,
                                      boundingBoxes: sug.citation.boundingBoxes,
                                      verificationStatus:
                                        sug.citation.verificationStatus,
                                    }
                                  : undefined,
                              };
                              onSaveDraftFinding(newFinding, false);
                              setConfirmedSuggestionIds((prev) => ({
                                ...prev,
                                [sug.id]: true,
                              }));
                            }}
                            className="h-7 px-2.5 text-[10.5px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              {isConfirmed
                                ? "Saved to Findings"
                                : "Confirm & Save Finding"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

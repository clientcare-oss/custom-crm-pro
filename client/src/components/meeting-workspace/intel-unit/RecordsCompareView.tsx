import React, { useState } from "react";
import {
  Check,
  ChevronDown,
  FileText,
  ExternalLink,
  AlertTriangle,
  Plus,
  Sparkles,
  Loader2,
  FolderOpen,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  COMPARISON_IEP_SECTIONS,
  type ComparisonIepSection,
  type ComparisonConnectionStatus,
  type VaultDocumentOption,
  type RecordReviewGroup,
  type IntelBoundingBox,
  resolveClientRecordGroup,
  formatShortFileName,
} from "./intelUnitTypes";

interface RecordsCompareViewProps {
  studentContactId: number;
  workspaceId?: number;
  studentName: string;
  vaultDocuments: VaultDocumentOption[];
  designatedCurrentIepId: number | null;
  recordGroupOverrides?: Record<number, RecordReviewGroup>;
  selectedEvalIds: number[];
  onToggleEvalId: (docId: number) => void;
  onOpenRecordsDrawer: () => void;
  onOpenUploadPicker: () => void;
  onOpenCitationInReader: (params: {
    fileId: number;
    fileName: string;
    pageNumber: number | null;
    printedPageLabel?: string | null;
    excerpt: string | null;
    sectionLabel: string;
    boundingBoxes?: IntelBoundingBox[];
    verificationStatus?: "verified" | "page_only" | "unverified";
  }) => void;
  confirmedFindingIds: Set<string>;
  blueprintTargetSourceIds: Set<string>;
  onConfirmConnectionAsFinding: (params: {
    connectionId: string;
    section: ComparisonIepSection;
    findingText: string;
    meetingQuestion: string;
    evalCitationLabel: string;
    evalFileId: number;
    evalFileName: string;
    evalPageNumber: number | null;
    evalExcerpt: string;
    evalBoundingBoxes: IntelBoundingBox[];
    verificationStatus: "verified" | "page_only" | "unverified";
  }) => void;
  onAddConnectionToBlueprint: (params: {
    connectionId: string;
    section: ComparisonIepSection;
    findingText: string;
    meetingQuestion: string;
    evalCitationLabel: string;
    iepCitationLabel?: string | null;
  }) => void;
}

const STATUS_BADGE_STYLES: Record<ComparisonConnectionStatus, string> = {
  Addressed:
    "bg-emerald-950/70 text-emerald-200 border-emerald-500/40",
  "Partially addressed":
    "bg-[#102447] text-[#FFE394] border-[#C5A059]/45",
  "Not located":
    "bg-[#0B1730] text-[#B8D0F0] border-[#2C4878]",
  "Needs review":
    "bg-[#1C1638] text-[#DFC8FF] border-[#6A52B8]/55",
};

export function RecordsCompareView({
  studentContactId,
  workspaceId,
  vaultDocuments,
  designatedCurrentIepId,
  recordGroupOverrides,
  selectedEvalIds,
  onToggleEvalId,
  onOpenRecordsDrawer,
  onOpenUploadPicker,
  onOpenCitationInReader,
  confirmedFindingIds,
  blueprintTargetSourceIds,
  onConfirmConnectionAsFinding,
  onAddConnectionToBlueprint,
}: RecordsCompareViewProps) {
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [editedQuestions, setEditedQuestions] = useState<Record<string, string>>({});

  const currentIepDoc =
    vaultDocuments.find((d) => d.id === designatedCurrentIepId) ||
    vaultDocuments.find(
      (d) => resolveClientRecordGroup(d, recordGroupOverrides) === "current_iep"
    ) ||
    null;

  const schoolEvaluations = vaultDocuments.filter(
    (d) =>
      d.id !== currentIepDoc?.id &&
      resolveClientRecordGroup(d, recordGroupOverrides) === "school_evaluation"
  );

  const outsideEvaluations = vaultDocuments.filter(
    (d) =>
      d.id !== currentIepDoc?.id &&
      resolveClientRecordGroup(d, recordGroupOverrides) === "outside_evaluation"
  );

  const allEvaluations = [...schoolEvaluations, ...outsideEvaluations];

  // If no evaluations are explicitly toggled yet, default to all available evaluations
  const effectiveEvalIds =
    selectedEvalIds.length > 0
      ? selectedEvalIds.filter((id) => id !== currentIepDoc?.id)
      : allEvaluations.map((d) => d.id);

  const canRunComparison =
    studentContactId > 0 &&
    Boolean(currentIepDoc) &&
    effectiveEvalIds.length > 0;

  const {
    data: comparisonData,
    isLoading: comparisonLoading,
  } = trpc.meetingWorkspace.compareEvaluationsWithIep.useQuery(
    {
      studentContactId,
      workspaceId,
      currentIepFileId: currentIepDoc?.id || 0,
      evaluationFileIds: effectiveEvalIds,
      sectionFilter,
    },
    {
      enabled: canRunComparison,
      retry: false,
      staleTime: 30_000,
    }
  );

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Calm selection state when Current IEP or evaluations are missing
  if (!currentIepDoc || allEvaluations.length === 0) {
    return (
      <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center min-h-[420px]">
        <div className="w-full max-w-lg rounded-2xl bg-[#020A1E]/90 border border-[#1B2F56] p-7 space-y-4 shadow-[0_18px_48px_rgba(0,0,0,0.75)]">
          <div className="h-11 w-11 rounded-xl bg-[#071838] border border-[#C5A059]/40 flex items-center justify-center mx-auto">
            <FileText className="h-5 w-5 text-[#DFBE77]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#FFF4D4]">
              Connect Evaluations to the Current IEP
            </h3>
            <p className="text-xs text-[#93AECD] leading-relaxed">
              {!currentIepDoc
                ? "Select or upload a Current IEP in the Records drawer to compare school and outside evaluations against it."
                : "Add or categorize at least one School Evaluation or Outside Evaluation in the Records drawer to compare its findings and recommendations with the Current IEP."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <Button
              type="button"
              size="sm"
              onClick={onOpenRecordsDrawer}
              className="h-8 px-4 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1.5"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Choose from Student Vault</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenUploadPicker}
              className="h-8 px-4 text-xs bg-[#000820] border-[#243B67] text-[#E2ECF8] hover:text-white hover:border-[#C5A059]/60 cursor-pointer gap-1.5"
            >
              <Upload className="h-3.5 w-3.5 text-[#DFBE77]" />
              <span>Upload PDF</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const connections = comparisonData?.connections || [];

  return (
    <div
      data-testid="records-compare-view"
      className="p-4 sm:p-6 space-y-5 text-[#F7F2E8]"
    >
      {/* 1. Evaluation Source Selector & Single Contextual IEP Section Selector */}
      <div className="rounded-xl bg-[#020A1E]/90 border border-[#1B2F56] p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-serif font-bold text-[#FFF4D4]">
                Comparing Against Current IEP:
              </span>
              <Badge className="bg-[#0B1E40] text-[#FFE394] border border-[#C5A059]/45 text-[11px] font-medium">
                {formatShortFileName(currentIepDoc.fileName, 36)}
                {currentIepDoc.documentDate
                  ? ` · ${currentIepDoc.documentDate}`
                  : ""}
              </Badge>
            </div>
            <p className="text-[11px] text-[#93AECD]">
              Select which school and outside evaluations to compare. Click any citation to inspect the original page.
            </p>
          </div>

          {/* Single Contextual IEP Section Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="compare-section-selector"
              className="text-[11px] text-[#93AECD] font-medium"
            >
              IEP Section:
            </label>
            <select
              id="compare-section-selector"
              data-testid="compare-section-selector"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="h-8 rounded-lg bg-[#000820] border border-[#243B67] px-3 text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
            >
              <option value="all">All Reviewed IEP Sections (7)</option>
              {COMPARISON_IEP_SECTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-Evaluation Selection Pills Grouped by School vs Outside */}
        <div className="pt-2 border-t border-[#162749] flex flex-wrap items-center gap-2">
          {schoolEvaluations.map((ev) => {
            const active = effectiveEvalIds.includes(ev.id);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onToggleEvalId(ev.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs border inline-flex items-center gap-1.5 cursor-pointer transition-all",
                  active
                    ? "bg-[#091D3E] border-[#C5A059]/70 text-[#FFF4D4]"
                    : "bg-[#010716] border-[#1A2D50] text-[#7E99BE] hover:text-[#E2ECF8]"
                )}
              >
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded flex items-center justify-center border",
                    active
                      ? "bg-[#C5A059] border-[#C5A059] text-[#000820]"
                      : "border-[#2D4875]"
                  )}
                >
                  {active && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8EA6C9]">
                  School Eval
                </span>
                <span className="font-medium">
                  {formatShortFileName(ev.fileName, 26)}
                </span>
                {ev.documentDate && (
                  <span className="text-[10.5px] text-[#C6B697]">
                    ({ev.documentDate})
                  </span>
                )}
              </button>
            );
          })}

          {outsideEvaluations.map((ev) => {
            const active = effectiveEvalIds.includes(ev.id);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onToggleEvalId(ev.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs border inline-flex items-center gap-1.5 cursor-pointer transition-all",
                  active
                    ? "bg-[#12183B] border-[#C5A059]/70 text-[#FFF4D4]"
                    : "bg-[#010716] border-[#1A2D50] text-[#7E99BE] hover:text-[#E2ECF8]"
                )}
              >
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded flex items-center justify-center border",
                    active
                      ? "bg-[#C5A059] border-[#C5A059] text-[#000820]"
                      : "border-[#2D4875]"
                  )}
                >
                  {active && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#C9B8FF]">
                  Outside Eval
                </span>
                <span className="font-medium">
                  {formatShortFileName(ev.fileName, 26)}
                </span>
                {ev.documentDate && (
                  <span className="text-[10.5px] text-[#C6B697]">
                    ({ev.documentDate})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Reviewed Documents & Limitations Transparency Bar */}
        {comparisonData?.reviewedDocuments && (
          <div className="pt-2 border-t border-[#162749] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8EA6C9]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[#C6B697] font-medium">
                Documents Reviewed:
              </span>
              {comparisonData.reviewedDocuments.map((doc) => (
                <span key={doc.fileId} className="inline-flex items-center gap-1">
                  <strong className="text-[#E2ECF8]">
                    {formatShortFileName(doc.fileName, 24)}
                  </strong>
                  <span>
                    ({doc.readablePageCount}/{doc.pageCount} readable pages
                    {doc.documentDate ? ` · ${doc.documentDate}` : ""})
                  </span>
                </span>
              ))}
            </div>
            <span className="text-[10.5px] text-[#93AECD]">
              “Not located” means not found in the reviewed material (not an automatic violation).
            </span>
          </div>
        )}

        {comparisonData?.limitations && comparisonData.limitations.length > 0 && (
          <div className="rounded-lg bg-[#0D1A36] border border-[#C5A059]/40 px-3 py-2 text-[11px] text-[#FFE394] flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#DFBE77]" />
            <div>{comparisonData.limitations.join(" · ")}</div>
          </div>
        )}
      </div>

      {/* 2. Focused Comparison Connections List (Expandable Detail) */}
      {comparisonLoading ? (
        <div className="py-14 flex flex-col items-center justify-center gap-2.5 text-xs text-[#93AECD]">
          <Loader2 className="h-6 w-6 animate-spin text-[#DFBE77]" />
          <span>
            Comparing evaluation findings &amp; recommendations with Current IEP...
          </span>
        </div>
      ) : connections.length === 0 ? (
        <div className="rounded-xl bg-[#020A1E]/80 border border-[#1B2F56] p-8 text-center text-xs text-[#93AECD]">
          No evaluation connections matched the selected filter in the readable pages of the chosen records.
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((item) => {
            const isExpanded = Boolean(expandedCardIds[item.id]);
            const isConfirmed = confirmedFindingIds.has(`fnd-${item.id}`);
            const isAddedToBlueprint = blueprintTargetSourceIds.has(
              `target-from-fnd-${item.id}`
            );
            const questionValue =
              editedQuestions[item.id] ?? item.proposedMeetingQuestion;
            const evalCitationLabel = `${item.evalSource.fileName}${
              item.evalSource.pdfPageNumber
                ? ` · PDF p. ${item.evalSource.pdfPageNumber}`
                : ""
            }`;
            const iepCitationLabel = item.iepPassage
              ? `${item.iepPassage.fileName}${
                  item.iepPassage.pdfPageNumber
                    ? ` · PDF p. ${item.iepPassage.pdfPageNumber}`
                    : ""
                }`
              : null;

            return (
              <div
                key={item.id}
                data-testid={`compare-connection-card-${item.id}`}
                className="rounded-xl bg-[#020A1E]/95 border border-[#1C3058] hover:border-[#2E4B82] transition-all overflow-hidden"
              >
                {/* Compact Summary Header */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-[#081A38] text-[#FFE394] border border-[#C5A059]/40 text-[10.5px] font-semibold">
                        {item.iepSection}
                      </Badge>

                      <Badge
                        className={cn(
                          "text-[10.5px] border font-semibold",
                          STATUS_BADGE_STYLES[item.status]
                        )}
                      >
                        {item.status}
                      </Badge>

                      <Badge
                        className={cn(
                          "text-[10px] border",
                          item.evalSource.recordGroup === "outside_evaluation"
                            ? "bg-[#15183B] text-[#D8C8FF] border-[#56489E]/50"
                            : "bg-[#071833] text-[#B0C7E8] border-[#244272]"
                        )}
                      >
                        {item.evalSource.recordGroup === "outside_evaluation"
                          ? "Outside Evaluation"
                          : "School Evaluation"}
                        {item.evalSource.documentDate
                          ? ` · ${item.evalSource.documentDate}`
                          : ""}
                      </Badge>

                      {/* Clickable Evaluation Citation Pill */}
                      <button
                        type="button"
                        onClick={() =>
                          onOpenCitationInReader({
                            fileId: item.evalSource.fileId,
                            fileName: item.evalSource.fileName,
                            pageNumber: item.evalSource.pdfPageNumber,
                            printedPageLabel: item.evalSource.printedPageLabel,
                            excerpt: item.evalSource.excerpt,
                            sectionLabel: `${item.iepSection} · Evaluation Source`,
                            boundingBoxes: item.evalSource.boundingBoxes,
                            verificationStatus:
                              item.evalSource.verificationStatus,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#05132C] border border-[#284578] hover:border-[#C5A059] text-[10.5px] font-mono text-[#FFE394] cursor-pointer"
                        title="Open original evaluation page and highlight passage"
                      >
                        <span>
                          {formatShortFileName(item.evalSource.fileName, 22)}
                          {item.evalSource.pdfPageNumber
                            ? ` · p. ${item.evalSource.pdfPageNumber}`
                            : ""}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </button>

                      {/* Clickable Related IEP Citation Pill (when located) */}
                      {item.iepPassage && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenCitationInReader({
                              fileId: item.iepPassage!.fileId,
                              fileName: item.iepPassage!.fileName,
                              pageNumber: item.iepPassage!.pdfPageNumber,
                              printedPageLabel:
                                item.iepPassage!.printedPageLabel,
                              excerpt: item.iepPassage!.excerpt,
                              sectionLabel: `${item.iepSection} · Current IEP`,
                              boundingBoxes: item.iepPassage!.boundingBoxes,
                              verificationStatus:
                                item.iepPassage!.verificationStatus,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#071B38] border border-[#325996] hover:border-[#C5A059] text-[10.5px] font-mono text-[#B8D8FF] cursor-pointer"
                          title="Open related Current IEP page and highlight passage"
                        >
                          <span>
                            Current IEP
                            {item.iepPassage.pdfPageNumber
                              ? ` · p. ${item.iepPassage.pdfPageNumber}`
                              : ""}
                          </span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      )}

                      {isConfirmed && (
                        <Badge className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px]">
                          Saved to Findings
                        </Badge>
                      )}
                      {isAddedToBlueprint && (
                        <Badge className="bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50 text-[10px]">
                          In Blueprint
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs sm:text-[13px] font-serif text-[#FFF4D4] leading-relaxed">
                      {item.evalFindingOrRecommendation}
                    </p>

                    <p className="text-[11.5px] text-[#93AECD] leading-snug">
                      {item.explanation}
                    </p>

                    {item.conflictNote && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-[#FFE394] bg-[#141A38] border border-[#C5A059]/40 rounded px-2 py-0.5">
                        <AlertTriangle className="h-3 w-3 text-[#DFBE77] shrink-0" />
                        <span>{item.conflictNote}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Actions: Quick Save + Expand Detail */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onConfirmConnectionAsFinding({
                          connectionId: item.id,
                          section: item.iepSection,
                          findingText: `${item.evalFindingOrRecommendation} (${item.status})`,
                          meetingQuestion: questionValue,
                          evalCitationLabel,
                          evalFileId: item.evalSource.fileId,
                          evalFileName: item.evalSource.fileName,
                          evalPageNumber: item.evalSource.pdfPageNumber,
                          evalExcerpt: item.evalSource.excerpt,
                          evalBoundingBoxes: item.evalSource.boundingBoxes,
                          verificationStatus:
                            item.evalSource.verificationStatus,
                        })
                      }
                      className={cn(
                        "h-7 px-2.5 text-[11px] cursor-pointer gap-1",
                        isConfirmed
                          ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                          : "bg-[#000820] border-[#263F6E] text-[#E2ECF8] hover:border-[#C5A059]/60 hover:text-white"
                      )}
                    >
                      {isConfirmed ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 text-[#DFBE77]" />
                          <span>Save Finding</span>
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => toggleExpandCard(item.id)}
                      className="h-7 px-2.5 rounded-lg bg-[#04112B] border border-[#1E3560] hover:border-[#C5A059]/50 text-[11px] text-[#B0C7E8] hover:text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? "Hide detail" : "Details & Question"}</span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Expandable Comparison Detail & Proposed Meeting Question */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#162749] bg-[#010716]/90 space-y-3.5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Left: Original Evaluation Passage */}
                      <div className="rounded-lg bg-[#030D24] border border-[#1B2F56] p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#FFE394]">
                            Evaluation Passage ({evalCitationLabel})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenCitationInReader({
                                fileId: item.evalSource.fileId,
                                fileName: item.evalSource.fileName,
                                pageNumber: item.evalSource.pdfPageNumber,
                                printedPageLabel:
                                  item.evalSource.printedPageLabel,
                                excerpt: item.evalSource.excerpt,
                                sectionLabel: `${item.iepSection} · Evaluation`,
                                boundingBoxes: item.evalSource.boundingBoxes,
                                verificationStatus:
                                  item.evalSource.verificationStatus,
                              })
                            }
                            className="text-[10.5px] text-[#FFE394] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open in Original PDF</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        <p className="text-xs font-serif italic text-[#E2ECF8] leading-relaxed">
                          &ldquo;{item.evalSource.excerpt}&rdquo;
                        </p>
                      </div>

                      {/* Right: Related Current IEP Passage */}
                      <div className="rounded-lg bg-[#030D24] border border-[#1B2F56] p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#B8D8FF]">
                            Related Current IEP Passage
                          </span>
                          {item.iepPassage && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenCitationInReader({
                                  fileId: item.iepPassage!.fileId,
                                  fileName: item.iepPassage!.fileName,
                                  pageNumber: item.iepPassage!.pdfPageNumber,
                                  printedPageLabel:
                                    item.iepPassage!.printedPageLabel,
                                  excerpt: item.iepPassage!.excerpt,
                                  sectionLabel: `${item.iepSection} · Current IEP`,
                                  boundingBoxes: item.iepPassage!.boundingBoxes,
                                  verificationStatus:
                                    item.iepPassage!.verificationStatus,
                                })
                              }
                              className="text-[10.5px] text-[#B8D8FF] hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>
                                Open IEP p. {item.iepPassage.pdfPageNumber}
                              </span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                        {item.iepPassage?.excerpt ? (
                          <p className="text-xs font-serif italic text-[#E2ECF8] leading-relaxed">
                            &ldquo;{item.iepPassage.excerpt}&rdquo;
                          </p>
                        ) : (
                          <p className="text-xs text-[#8EA6C9]">
                            Not located in the reviewed Current IEP pages.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Proposed Meeting Question + Actions */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#C6B697] flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-[#DFBE77]" />
                        <span>Proposed Meeting Question (editable):</span>
                      </label>
                      <Textarea
                        value={questionValue}
                        onChange={(e) =>
                          setEditedQuestions((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        rows={2}
                        className="bg-[#000820] border-[#223965] text-xs text-[#FFF4D4]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onConfirmConnectionAsFinding({
                            connectionId: item.id,
                            section: item.iepSection,
                            findingText: `${item.evalFindingOrRecommendation} (${item.status})`,
                            meetingQuestion: questionValue,
                            evalCitationLabel,
                            evalFileId: item.evalSource.fileId,
                            evalFileName: item.evalSource.fileName,
                            evalPageNumber: item.evalSource.pdfPageNumber,
                            evalExcerpt: item.evalSource.excerpt,
                            evalBoundingBoxes: item.evalSource.boundingBoxes,
                            verificationStatus:
                              item.evalSource.verificationStatus,
                          })
                        }
                        className="h-7 px-3 text-xs bg-[#000820] border-[#263F6E] text-[#FFF4D4] hover:border-[#C5A059] cursor-pointer"
                      >
                        {isConfirmed
                          ? "Update Saved Finding & Question"
                          : "Confirm & Save Finding"}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={isAddedToBlueprint}
                        onClick={() =>
                          onAddConnectionToBlueprint({
                            connectionId: item.id,
                            section: item.iepSection,
                            findingText: item.evalFindingOrRecommendation,
                            meetingQuestion: questionValue,
                            evalCitationLabel,
                            iepCitationLabel,
                          })
                        }
                        className="h-7 px-3 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer disabled:opacity-60"
                      >
                        {isAddedToBlueprint
                          ? "Added to Blueprint"
                          : "Add to Blueprint"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


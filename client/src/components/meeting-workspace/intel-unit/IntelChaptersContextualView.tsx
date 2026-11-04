import React, { useState } from "react";
import {
  Compass,
  BookOpen,
  Layers,
  GitCompare,
  Bookmark,
  Plus,
  Send,
  Save,
  Check,
  Flag,
  Trash2,
  ArrowUpRight,
  FileText,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { IepIntelFinding, FindingStatus, MeetingTarget } from "../types";
import {
  ALL_INTEL_CHAPTERS,
  type IntelChapterId,
  type ChapterReviewState,
  type VaultDocumentOption,
} from "./intelUnitTypes";
import type { FocusedSourcePassage } from "./IntelDocumentSurface";

interface IntelOverviewChapterProps {
  studentName: string;
  selectedDocument: VaultDocumentOption | null;
  localPdfName: string | null;
  findings: IepIntelFinding[];
  targets: MeetingTarget[];
  chapterStates: Record<string, ChapterReviewState>;
  onSelectChapter: (chapter: IntelChapterId) => void;
  onUpdateFindings: (findings: IepIntelFinding[]) => void;
  onSendFindingToBlueprint: (finding: IepIntelFinding) => void;
  onFocusPassage: (passage: FocusedSourcePassage) => void;
  onOpenImportModal: () => void;
  onOpenLegacyTools: () => void;
}

export function IntelOverviewChapter({
  studentName,
  selectedDocument,
  localPdfName,
  findings,
  targets,
  chapterStates,
  onSelectChapter,
  onUpdateFindings,
  onSendFindingToBlueprint,
  onFocusPassage,
  onOpenImportModal,
  onOpenLegacyTools,
}: IntelOverviewChapterProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState("Present Levels");
  const [newSection, setNewSection] = useState("Present Levels / Academics");
  const [newText, setNewText] = useState("");
  const [newQuote, setNewQuote] = useState("");

  const activeFindings = findings.filter((f) => f.status !== "dismiss");
  const priorityFindings = activeFindings.filter((f) => f.status === "important");

  const handleStatusChange = (id: string, status: FindingStatus) => {
    onUpdateFindings(findings.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  const handleAddFinding = () => {
    if (!newText.trim()) return;
    const created: IepIntelFinding = {
      id: `intel-manual-${Date.now()}`,
      category: newCategory.trim() || "General",
      section: newSection.trim() || "General IEP Review",
      text: newText.trim(),
      quote: newQuote.trim() || undefined,
      status: "keep",
      isCustom: true,
    };
    onUpdateFindings([created, ...findings]);
    setNewText("");
    setNewQuote("");
    setShowAddForm(false);
  };

  const reviewChapters = ALL_INTEL_CHAPTERS.filter((c) => c.id !== "overview");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#3A2C18]/80">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[#DFBE77]" />
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#FFF4D4]">
              Review Overview &amp; Saved Discussion Items
            </h3>
          </div>
          <p className="text-[11px] text-[#A69371]">
            Evidence-based coverage across IEP chapters, saved advocate findings, and Blueprint handoffs for {studentName}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenImportModal}
            className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#020A1E] text-[#D8C7A5] hover:bg-[#081C3A] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer gap-1.5"
          >
            <Upload className="h-3 w-3 text-[#DFBE77]" />
            <span>Import Advocate Ready</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#04112B] text-[#FFE394] hover:border-[#C5A059] cursor-pointer gap-1"
          >
            <Plus className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>Add Finding</span>
          </Button>
        </div>
      </div>

      {/* Honest Telemetry Summary Strip (Zero invented scores) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-[#000820] border border-[#3A2C18]/80 p-3 space-y-1">
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#A69371]">
            Source IEP Status
          </span>
          <div className="text-xs font-serif font-bold text-[#FFF4D4] truncate">
            {localPdfName || selectedDocument?.fileName || "No IEP Selected"}
          </div>
          <p className="text-[10.5px] text-[#8EA6C9]">
            {localPdfName
              ? "Local PDF pages rendered"
              : selectedDocument
              ? `${selectedDocument.documentType} selected`
              : "Awaiting IEP selection"}
          </p>
        </div>

        <div className="rounded-xl bg-[#000820] border border-[#3A2C18]/80 p-3 space-y-1">
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#A69371]">
            Saved Findings
          </span>
          <div className="text-sm font-serif font-bold text-[#FFE394]">
            {activeFindings.length} Active{" "}
            <span className="text-xs font-normal text-[#C6B697]">
              ({priorityFindings.length} Priority)
            </span>
          </div>
          <p className="text-[10.5px] text-[#8EA6C9]">
            {activeFindings.length === 0
              ? "No findings recorded yet"
              : "Preserved in workspace record"}
          </p>
        </div>

        <div className="rounded-xl bg-[#000820] border border-[#3A2C18]/80 p-3 space-y-1">
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#A69371]">
            Blueprint Agenda Items
          </span>
          <div className="text-sm font-serif font-bold text-emerald-300">
            {targets.length} {targets.length === 1 ? "Target" : "Targets"}
          </div>
          <p className="text-[10.5px] text-[#8EA6C9]">
            Connected to 2. Blueprint &amp; 3. Meeting Space
          </p>
        </div>
      </div>

      {/* Chapter Coverage Directory */}
      <div className="rounded-xl bg-[#01071A] border border-[#3A2C18]/80 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
            Chapter Coverage Directory
          </span>
          <span className="text-[10.5px] text-[#8EA6C9]">
            Automated AI review coverage connects in Phase 2
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {reviewChapters.map((chap) => {
            const st = chapterStates[chap.id];
            const hasDraftNotes = Boolean(
              st &&
                (st.documentedProvisions.trim() ||
                  st.identifiedNeedsOrBaselines.trim() ||
                  st.reviewQuestions.trim() ||
                  st.advocateNotes.trim() ||
                  st.proposedWording.trim())
            );
            const matchingFindingsCount = activeFindings.filter(
              (f) =>
                f.section.toLowerCase().includes(chap.shortLabel.toLowerCase()) ||
                f.category.toLowerCase().includes(chap.shortLabel.toLowerCase())
            ).length;

            return (
              <button
                key={chap.id}
                type="button"
                onClick={() => onSelectChapter(chap.id)}
                className="rounded-lg bg-[#000820] border border-[#24385B] hover:border-[#C5A059]/70 px-3 py-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] truncate">
                    {chap.label}
                  </div>
                  <div className="text-[10px] text-[#8EA6C9] truncate">
                    {matchingFindingsCount > 0
                      ? `${matchingFindingsCount} saved ${
                          matchingFindingsCount === 1 ? "finding" : "findings"
                        }`
                      : hasDraftNotes
                      ? "Advocate notes in progress"
                      : "Pending inspection"}
                  </div>
                </div>
                <span className="text-[10.5px] font-mono text-[#DFBE77] shrink-0">
                  Open →
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Manual Finding Form */}
      {showAddForm && (
        <div className="rounded-xl border border-[#C5A059]/60 bg-[#05142E] p-3.5 space-y-3">
          <div className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
            Add Manual Discussion Finding
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10.5px] text-[#D8C7A5] font-semibold mb-1 block">
                Chapter / Category
              </label>
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., Present Levels, Goals, Accommodations"
                className="h-8 text-xs bg-[#000820] border-[#2C446E] text-[#FFF4D4]"
              />
            </div>
            <div>
              <label className="text-[10.5px] text-[#D8C7A5] font-semibold mb-1 block">
                IEP Section Name
              </label>
              <Input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="e.g., Present Levels / Academics"
                className="h-8 text-xs bg-[#000820] border-[#2C446E] text-[#FFF4D4]"
              />
            </div>
          </div>
          <div>
            <label className="text-[10.5px] text-[#D8C7A5] font-semibold mb-1 block">
              Finding &amp; Discussion Point *
            </label>
            <Textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={2}
              placeholder="Record a documented observation, gap, or discussion point..."
              className="text-xs bg-[#000820] border-[#2C446E] text-[#FFF4D4]"
            />
          </div>
          <div>
            <label className="text-[10.5px] text-[#D8C7A5] font-semibold mb-1 block">
              Exact Source Quote &amp; Page Reference (Optional)
            </label>
            <Input
              value={newQuote}
              onChange={(e) => setNewQuote(e.target.value)}
              placeholder="e.g., Page 6: 'Current benchmark not yet recorded.'"
              className="h-8 text-xs bg-[#000820] border-[#2C446E] text-[#FFF4D4]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
              className="h-7 text-xs text-[#A69371] hover:text-[#FFF4D4]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddFinding}
              className="h-7 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B]"
            >
              Save Finding
            </Button>
          </div>
        </div>
      )}

      {/* Saved Discussion Items & Findings List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
            Saved Findings &amp; Discussion Items ({activeFindings.length})
          </span>
          <button
            type="button"
            onClick={onOpenLegacyTools}
            className="text-[11px] text-[#DFBE77] hover:text-[#FFE394] underline underline-offset-4 cursor-pointer"
          >
            Open Parent Preparation &amp; Existing Tools
          </button>
        </div>

        {activeFindings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#3A2C18] bg-[#000820]/70 p-6 text-center space-y-2">
            <FileText className="h-6 w-6 text-[#DFBE77]/60 mx-auto" />
            <p className="text-xs font-serif font-bold text-[#FFF4D4]">
              No Saved Findings for {studentName} Yet
            </p>
            <p className="text-[11px] text-[#A69371] max-w-md mx-auto leading-relaxed">
              No artificial or generic findings are auto-generated. Inspect a chapter above (such as Goals or Accommodations), add a manual finding, or import an Advocate Ready document.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeFindings.map((finding) => {
              const alreadyInBlueprint = targets.some(
                (t) =>
                  t.id === `target-from-${finding.id}` ||
                  t.targetName.toLowerCase() === finding.category.toLowerCase() ||
                  (finding.text && t.whyWeWantIt && finding.text.includes(t.targetName))
              );

              return (
                <div
                  key={finding.id}
                  className={cn(
                    "rounded-xl border p-3 transition-all space-y-2",
                    finding.status === "important"
                      ? "bg-[#061633] border-[#C5A059]/70"
                      : "bg-[#000820] border-[#283B5E]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-[#091D3E] text-[#FFE394] border border-[#3A2C18] text-[10px]">
                        {finding.category}
                      </Badge>
                      <span className="text-[11px] text-[#A69371]">
                        {finding.section}
                      </span>
                      {finding.status === "important" && (
                        <Badge className="bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50 text-[9.5px]">
                          Priority
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(
                            finding.id,
                            finding.status === "important" ? "keep" : "important"
                          )
                        }
                        title="Toggle priority flag"
                        className={cn(
                          "p-1 rounded cursor-pointer",
                          finding.status === "important"
                            ? "text-[#FFE394] bg-[#C5A059]/20"
                            : "text-[#8EA6C9] hover:text-[#FFE394]"
                        )}
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(finding.id, "dismiss")}
                        title="Dismiss finding"
                        className="p-1 rounded text-[#8EA6C9] hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#FFF4D4] leading-relaxed">
                    {finding.text}
                  </p>

                  {(finding.quote || finding.sourceRef) && (
                    <button
                      type="button"
                      onClick={() => {
                        const sRef = finding.sourceRef;
                        const parsedPageFromQuote =
                          !sRef?.pdfPageNumber && finding.quote
                            ? (() => {
                                const m = finding.quote.match(/\b(?:page|p\.?)\s*(\d+)\b/i);
                                return m ? parseInt(m[1], 10) : undefined;
                              })()
                            : undefined;

                        onFocusPassage({
                          chapterLabel: finding.category,
                          pageLabel: sRef?.pdfPageNumber
                            ? `PDF p. ${sRef.pdfPageNumber}${
                                sRef.printedPageLabel ? ` (${sRef.printedPageLabel})` : ""
                              }`
                            : parsedPageFromQuote
                            ? `PDF p. ${parsedPageFromQuote}`
                            : "Cited Source Passage",
                          pageNumber: sRef?.pdfPageNumber ?? parsedPageFromQuote,
                          printedPageLabel: sRef?.printedPageLabel ?? null,
                          quote: sRef?.excerpt ?? finding.quote,
                          sectionRef: finding.section,
                          documentId: sRef?.documentId ?? null,
                          verificationStatus: sRef?.verificationStatus,
                          verificationReason: sRef?.verificationReason,
                          boundingBoxes: sRef?.boundingBoxes,
                        });
                      }}
                      className="text-left w-full px-2.5 py-1.5 rounded-lg bg-[#020B21] border border-[#24385B] hover:border-[#C5A059]/60 text-[11px] font-mono text-[#C6B697] flex items-center justify-between gap-2 cursor-pointer"
                      title="Focus this quoted passage in the Source Document Viewer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {finding.sourceRef?.verificationStatus === "verified" ? (
                          <Badge className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[9.5px] px-1.5 py-0 shrink-0">
                            Verified Source · p. {finding.sourceRef.pdfPageNumber}
                          </Badge>
                        ) : finding.sourceRef?.verificationStatus === "page_only" ? (
                          <Badge className="bg-[#0B2246] text-[#FFE394] border border-[#C5A059]/40 text-[9.5px] px-1.5 py-0 shrink-0">
                            Page only · p. {finding.sourceRef.pdfPageNumber}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-950/90 text-amber-200 border border-amber-500/40 text-[9.5px] px-1.5 py-0 shrink-0">
                            Source needs verification
                          </Badge>
                        )}
                        <span className="truncate">
                          &ldquo;{finding.sourceRef?.excerpt || finding.quote || "Page Reference"}&rdquo;
                        </span>
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-[#DFBE77] shrink-0" />
                    </button>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onSendFindingToBlueprint(finding)}
                      className="h-7 px-2.5 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 cursor-pointer gap-1"
                    >
                      <Send className="h-3 w-3 text-[#07162B]" />
                      <span>
                        {alreadyInBlueprint ? "Send / Refresh in Blueprint" : "Send to Blueprint"}
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Generic Structured Chapter View for:
 * - Present Levels
 * - Services
 * - Placement
 * - More: Evaluations, Behavior Supports, Assistive Technology, Transition
 * ──────────────────────────────────────────────────────────────────────────── */

interface IntelStructuredChapterProps {
  chapterId: IntelChapterId;
  studentName: string;
  state: ChapterReviewState;
  onChangeState: (updated: ChapterReviewState) => void;
  chapterFindings: IepIntelFinding[];
  onSaveChapterFinding: () => void;
  onSendChapterToBlueprint: () => void;
  onOpenPriorCheck: (scopeLabel: string, currentWording: string, sourceRef: string) => void;
  onFocusPassage: (passage: FocusedSourcePassage) => void;
}

const CHAPTER_FIELD_LABELS: Record<
  string,
  {
    box1Title: string;
    box1Placeholder: string;
    box2Title: string;
    box2Placeholder: string;
    box3Title: string;
    box3Placeholder: string;
    wordingTitle: string;
    wordingPlaceholder: string;
  }
> = {
  present_levels: {
    box1Title: "1. Documented Baselines (Academic, Functional & Communication)",
    box1Placeholder:
      "No Present Levels baselines extracted yet. Select an IEP for Phase 2 extraction or record documented baseline data and assessment scores here...",
    box2Title: "2. Identified Student Needs & Impact of Disability",
    box2Placeholder:
      "Record documented needs in Present Levels that require corresponding annual goals, accommodations, or services...",
    box3Title: "3. Source-Linked Questions for the IEP Team",
    box3Placeholder:
      "Draft specific evidence-linked questions to ask the school team regarding missing baselines, outdated testing, or present level discrepancies...",
    wordingTitle: "4. Proposed Present Levels Clarification / Parent Input Wording",
    wordingPlaceholder:
      "Draft specific wording or data additions to request in the Present Levels narrative...",
  },
  services: {
    box1Title: "1. Documented Service Grid Provisions (Special Ed & Related Services)",
    box1Placeholder:
      "No service grid provisions extracted yet. Record documented service type, frequency, minutes, setting (push-in vs. pull-out), and start/end dates...",
    box2Title: "2. Identified Service Gaps & Unmet Needs",
    box2Placeholder:
      "Note discrepancies between documented student needs and current service minutes, group size, or related service frequency (SLP, OT, PT, Counseling)...",
    box3Title: "3. Review Questions for the IEP Team",
    box3Placeholder:
      "List questions regarding service delivery models, missed sessions, compensatory minutes, or progress data...",
    wordingTitle: "4. Proposed Service Grid Provision & Frequency Wording",
    wordingPlaceholder:
      "Specify proposed service type, exact minutes/week, individual vs. small-group setting, and provider...",
  },
  placement: {
    box1Title: "1. Documented Placement & LRE Provisions",
    box1Placeholder:
      "No LRE placement breakdown extracted yet. Record general education percentage, special education setting, and LRE justification...",
    box2Title: "2. Placement Analysis & Supplementary Aids Consideration",
    box2Placeholder:
      "Evaluate whether supplementary aids and services were thoroughly considered to support the student in the Least Restrictive Environment...",
    box3Title: "3. LRE & Placement Questions for the IEP Team",
    box3Placeholder:
      "Questions regarding continuum of placement options, peer interaction, transition times, and classroom environment...",
    wordingTitle: "4. Proposed Placement / LRE Justification Wording",
    wordingPlaceholder:
      "Draft proposed LRE placement terms or conditions required for a successful setting...",
  },
  default: {
    box1Title: "1. Documented IEP Provisions & Records",
    box1Placeholder:
      "No provisions extracted for this review area yet. Select an IEP for Phase 2 review or record documented provisions here...",
    box2Title: "2. Identified Gaps & Supporting Evidence",
    box2Placeholder:
      "Summarize any omissions, outdated evaluations, or unmet student needs in this area...",
    box3Title: "3. Source-Linked Review Questions",
    box3Placeholder:
      "Record targeted questions to raise with the IEP team linked to specific document pages...",
    wordingTitle: "4. Advocate Notes & Proposed IEP Wording",
    wordingPlaceholder:
      "Draft proposed IEP language, evaluation requests, or action items for the Blueprint...",
  },
};

export function IntelStructuredChapter({
  chapterId,
  studentName,
  state,
  onChangeState,
  chapterFindings,
  onSaveChapterFinding,
  onSendChapterToBlueprint,
  onOpenPriorCheck,
  onFocusPassage,
}: IntelStructuredChapterProps) {
  const chapterMeta =
    ALL_INTEL_CHAPTERS.find((c) => c.id === chapterId) || ALL_INTEL_CHAPTERS[1];

  const labels =
    CHAPTER_FIELD_LABELS[chapterId] || CHAPTER_FIELD_LABELS.default;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#3A2C18]/80">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#DFBE77]" />
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#FFF4D4]">
              {chapterMeta.label}
            </h3>
            {chapterMeta.isMore && (
              <Badge className="bg-[#091D3E] text-[#FFE394] border border-[#3E68A8]/50 text-[10px]">
                Extended Review Area
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-[#A69371]">{chapterMeta.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid={`mark-reviewed-${chapterId}`}
            onClick={() =>
              onChangeState({
                ...state,
                explicitlyReviewed: !state.explicitlyReviewed,
              })
            }
            className={cn(
              "h-7 px-2.5 text-[11px] cursor-pointer gap-1.5",
              state.explicitlyReviewed
                ? "border-emerald-500/60 bg-emerald-950/60 text-emerald-300"
                : "border-[#3A2C18] bg-[#020A1E] text-[#D8C7A5] hover:border-[#C5A059]/60"
            )}
          >
            <Check className="h-3 w-3" />
            <span>{state.explicitlyReviewed ? "Chapter Reviewed" : "Mark Reviewed"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid={`check-prior-iep-${chapterId}`}
            onClick={() =>
              onOpenPriorCheck(
                chapterMeta.label,
                state.documentedProvisions || "",
                state.sourceReference || ""
              )
            }
            className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#020A1E] text-[#D8C7A5] hover:bg-[#081C3A] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer gap-1.5"
          >
            <GitCompare className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>Check against previous IEP</span>
          </Button>
        </div>
      </div>

      {/* Main Inspection Card */}
      <div className="rounded-xl bg-[#020A1E]/95 border border-[#3A2C18] p-4 space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
        {/* Source Reference Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Bookmark className="h-3.5 w-3.5 text-[#DFBE77] shrink-0" />
            <Input
              value={state.sourceReference}
              onChange={(e) =>
                onChangeState({ ...state, sourceReference: e.target.value })
              }
              placeholder={`Source page / section reference in ${studentName}'s IEP (e.g., Page 5 · Section II)`}
              className="h-8 text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
            />
          </div>

          {state.sourceReference && (
            <button
              type="button"
              onClick={() => {
                const parsedNum = parseInt(
                  state.sourceReference.replace(/[^0-9]/g, ""),
                  10
                );
                onFocusPassage({
                  chapterLabel: chapterMeta.label,
                  pageLabel: state.sourceReference,
                  pageNumber: !isNaN(parsedNum) ? parsedNum : undefined,
                  quote: state.documentedProvisions || undefined,
                  sectionRef: chapterMeta.iepSectionName,
                });
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A1E40] border border-[#3E68A8]/60 text-[11px] font-mono text-[#FFE394] hover:border-[#C5A059] cursor-pointer"
            >
              <span>Focus Source in Viewer</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Box 1: Documented Baselines / Provisions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
              {labels.box1Title}
            </label>
            <span className="text-[10px] font-mono text-[#8EA6C9]">
              Phase 2 AI Extraction Pending
            </span>
          </div>
          <Textarea
            value={state.documentedProvisions}
            onChange={(e) =>
              onChangeState({ ...state, documentedProvisions: e.target.value })
            }
            rows={2}
            placeholder={labels.box1Placeholder}
            className="text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] font-serif placeholder:text-[#8EA6C9]/45"
          />
        </div>

        {/* Box 2: Identified Needs */}
        <div className="space-y-1.5 pt-2 border-t border-[#3A2C18]/60">
          <label className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394] block">
            {labels.box2Title}
          </label>
          <Textarea
            value={state.identifiedNeedsOrBaselines}
            onChange={(e) =>
              onChangeState({
                ...state,
                identifiedNeedsOrBaselines: e.target.value,
              })
            }
            rows={2}
            placeholder={labels.box2Placeholder}
            className="text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
          />
        </div>

        {/* Box 3: Source-Linked Questions */}
        <div className="space-y-1.5 pt-2 border-t border-[#3A2C18]/60">
          <label className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394] block">
            {labels.box3Title}
          </label>
          <Textarea
            value={state.reviewQuestions}
            onChange={(e) =>
              onChangeState({ ...state, reviewQuestions: e.target.value })
            }
            rows={2}
            placeholder={labels.box3Placeholder}
            className="text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
          />
        </div>

        {/* Box 4: Advocate Notes & Proposed Wording */}
        <div className="space-y-1.5 pt-2 border-t border-[#3A2C18]/60">
          <label className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394] block">
            {labels.wordingTitle}
          </label>
          <Textarea
            value={state.proposedWording}
            onChange={(e) =>
              onChangeState({ ...state, proposedWording: e.target.value })
            }
            rows={2}
            placeholder={labels.wordingPlaceholder}
            className="text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] font-serif placeholder:text-[#8EA6C9]/45"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#3A2C18] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-[#A69371]">
            {chapterFindings.length > 0
              ? `${chapterFindings.length} saved ${
                  chapterFindings.length === 1 ? "finding" : "findings"
                } in ${chapterMeta.shortLabel}`
              : `No saved findings in ${chapterMeta.shortLabel} yet`}
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSaveChapterFinding}
              className="h-8 px-3 text-xs border-[#3A2C18] bg-[#000820] text-[#FFF4D4] hover:border-[#C5A059] cursor-pointer gap-1.5"
            >
              <Save className="h-3.5 w-3.5 text-[#DFBE77]" />
              <span>Save for Discussion</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onSendChapterToBlueprint}
              className="h-8 px-3.5 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md cursor-pointer hover:brightness-105 gap-1.5"
            >
              <Send className="h-3.5 w-3.5 text-[#07162B]" />
              <span>Send to Blueprint</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


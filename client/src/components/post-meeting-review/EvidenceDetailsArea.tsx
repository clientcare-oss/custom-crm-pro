import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  PlayCircle,
  BookOpen,
  Sparkles,
  Layers,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortmasterFinding } from "./types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EvidenceDetailsAreaProps {
  finding: PortmasterFinding;
  onUpdateNotes?: (notes: string) => void;
}

export function EvidenceDetailsArea({ finding }: EvidenceDetailsAreaProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeModal, setActiveModal] = useState<
    "comparison" | "meeting" | "fulltext" | "ai" | null
  >(null);

  return (
    <>
      <div className="rounded-2xl border border-[#0F355E] bg-[#03152C]/90 overflow-hidden shadow-md select-none">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#07244A] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-blue-400" />
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
              Evidence &amp; Details{" "}
              <span className="text-blue-300/70 font-normal">
                ({isExpanded ? "Collapse" : "Expand to view"})
              </span>
            </span>
          </div>

          <span className="text-blue-300/60">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </button>

        {/* 4 Horizontal Action Tiles */}
        {isExpanded && (
          <div className="p-3.5 sm:p-4 border-t border-[#0F355E] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#020F24]">
            {/* Tile 1: Document Comparison */}
            <div className="rounded-xl bg-[#041B38] border border-[#0F3B6E] p-3 flex flex-col justify-between space-y-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-300" />
                  <h5 className="text-xs font-bold text-white">Document Comparison</h5>
                </div>
                <p className="text-[11px] text-blue-200/70 leading-snug">
                  View highlighted changes side by side.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal("comparison")}
                className="w-full h-7 rounded-lg bg-[#0A264E] hover:bg-[#12386E] border border-[#1A4B82] text-xs font-semibold text-blue-100 hover:text-white cursor-pointer transition-colors inline-flex items-center justify-center"
              >
                View Comparison
              </button>
            </div>

            {/* Tile 2: Meeting Evidence */}
            <div className="rounded-xl bg-[#041B38] border border-[#0F3B6E] p-3 flex flex-col justify-between space-y-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-teal-300" />
                  <h5 className="text-xs font-bold text-white">Meeting Evidence</h5>
                </div>
                <p className="text-[11px] text-blue-200/70 leading-snug">
                  Transcript, timestamps, and key discussion.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal("meeting")}
                className="w-full h-7 rounded-lg bg-[#0A264E] hover:bg-[#12386E] border border-[#1A4B82] text-xs font-semibold text-blue-100 hover:text-white cursor-pointer transition-colors inline-flex items-center justify-center"
              >
                View Meeting Evidence
              </button>
            </div>

            {/* Tile 3: Full Text */}
            <div className="rounded-xl bg-[#041B38] border border-[#0F3B6E] p-3 flex flex-col justify-between space-y-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-300" />
                  <h5 className="text-xs font-bold text-white">Full Text</h5>
                </div>
                <p className="text-[11px] text-blue-200/70 leading-snug">
                  Read the complete section from each IEP.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal("fulltext")}
                className="w-full h-7 rounded-lg bg-[#0A264E] hover:bg-[#12386E] border border-[#1A4B82] text-xs font-semibold text-blue-100 hover:text-white cursor-pointer transition-colors inline-flex items-center justify-center"
              >
                View Documents
              </button>
            </div>

            {/* Tile 4: AI Analysis */}
            <div className="rounded-xl bg-[#041B38] border border-[#0F3B6E] p-3 flex flex-col justify-between space-y-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-300" />
                  <h5 className="text-xs font-bold text-white">AI Analysis</h5>
                </div>
                <p className="text-[11px] text-blue-200/70 leading-snug">
                  How Portmaster reached this finding.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal("ai")}
                className="w-full h-7 rounded-lg bg-[#0A264E] hover:bg-[#12386E] border border-[#1A4B82] text-xs font-semibold text-blue-100 hover:text-white cursor-pointer transition-colors inline-flex items-center justify-center"
              >
                View Analysis
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog for the 4 Detail Views */}
      <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-2xl bg-[#03152C] border-[#0F355E] text-slate-100 p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2 font-mono">
              {activeModal === "comparison" && "📄 Document Comparison: Side-by-Side Diff"}
              {activeModal === "meeting" && "🎙️ Meeting Evidence & Audio Verification"}
              {activeModal === "fulltext" && "📖 Full Section Text Extraction"}
              {activeModal === "ai" && "✨ Portmaster AI Reconciliation Logic"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 space-y-3 text-xs">
            {activeModal === "comparison" && (
              <div className="space-y-3">
                <p className="text-blue-200/80">
                  Exact text comparison between Previous IEP (Page {finding.previousIep.page}) and Updated IEP (Page {finding.updatedIep.page}):
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#EFE8DB] text-[#221C16] border border-[#D5C6AC] space-y-1.5 shadow-sm">
                    <span className="text-[11px] font-bold text-[#1C1610] uppercase block font-sans">
                      Previous IEP (Aug 14, 2025)
                    </span>
                    <p className="text-xs text-[#44382C] leading-relaxed font-sans">
                      {finding.previousIep.details}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#EFE8DB] text-[#221C16] border border-[#D5C6AC] space-y-1.5 shadow-sm">
                    <span className="text-[11px] font-bold text-[#631B24] uppercase block font-sans">
                      Updated IEP (Sept 25, 2026)
                    </span>
                    <p className="text-xs text-[#44382C] leading-relaxed font-sans">
                      {finding.updatedIep.details}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeModal === "meeting" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#061E38] border border-teal-500/40 space-y-2">
                  <div className="flex items-center justify-between font-mono text-[11px] text-teal-300">
                    <span>Meeting: Annual IEP (Sept 18, 2026)</span>
                    <span>Timestamp: {finding.meetingRecord?.evidence?.timestamp || "01:14:22"}</span>
                  </div>
                  <p className="text-xs text-white leading-relaxed italic">
                    &ldquo;{finding.meetingRecord?.evidence?.transcriptExcerpt || "Team agreed to maintain reading supports at 5x/week. Progress has been positive."}&rdquo;
                  </p>
                  <div className="text-[11px] text-blue-200/70 font-mono">
                    Speaker: {finding.meetingRecord?.evidence?.speaker || "Special Education Lead / IEP Team"}
                  </div>
                </div>
              </div>
            )}

            {activeModal === "fulltext" && (
              <div className="space-y-3">
                <p className="text-blue-200/80">
                  Full text verbatim extraction from Section &quot;{finding.category}&quot;:
                </p>
                <div className="p-3 rounded-xl bg-[#020B16] border border-[#0D2F54] font-mono text-[11.5px] text-blue-100 leading-relaxed max-h-60 overflow-y-auto">
                  {`// SECTION: ${finding.previousIep.section}
Previous Value: ${finding.previousIep.value}
Previous Narrative: ${finding.previousIep.details}

// AMENDED SECTION: ${finding.updatedIep.section}
Updated Value: ${finding.updatedIep.value}
Updated Narrative: ${finding.updatedIep.details}`}
                </div>
              </div>
            )}

            {activeModal === "ai" && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#091E3B] border border-purple-500/40 space-y-2">
                  <h4 className="text-xs font-bold text-purple-200 font-mono">
                    Multi-Source Reconciliation Trace:
                  </h4>
                  <p className="text-xs text-blue-100/90 leading-relaxed">
                    {finding.whyPortmasterFlagged}
                  </p>
                  <div className="p-2 rounded bg-[#030E1F] border border-blue-500/20 text-[11px] text-blue-300/80 font-mono">
                    Deterministic cross-check between IEP meeting transcripts and OCR document parsed entities flagged an unagreed decrement in service frequency.
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import React, { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Wrench,
  MessageSquare,
  Edit3,
  BookOpen,
  Info,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DecodedConcernItem, AdvocateReviewStatus } from "./types";

interface PwnPotentialProblemsProps {
  concerns: DecodedConcernItem[];
  onUpdateConcern: (
    concernId: number,
    status: AdvocateReviewStatus,
    note?: string | null,
    correction?: string | null
  ) => void;
}

export const PwnPotentialProblems: React.FC<PwnPotentialProblemsProps> = ({
  concerns,
  onUpdateConcern,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState<string>("");
  const [editingCorrectionId, setEditingCorrectionId] = useState<number | null>(null);
  const [correctionText, setCorrectionText] = useState<string>("");

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenNote = (concern: DecodedConcernItem) => {
    setEditingNoteId(concern.id);
    setNoteText(concern.advocateNote || "");
  };

  const handleSaveNote = (concern: DecodedConcernItem) => {
    onUpdateConcern(concern.id, concern.advocateStatus, noteText.trim() || null, concern.advocateCorrection);
    setEditingNoteId(null);
  };

  const handleOpenCorrection = (concern: DecodedConcernItem) => {
    setEditingCorrectionId(concern.id);
    setCorrectionText(concern.advocateCorrection || "");
  };

  const handleSaveCorrection = (concern: DecodedConcernItem) => {
    onUpdateConcern(concern.id, concern.advocateStatus, concern.advocateNote, correctionText.trim() || null);
    setEditingCorrectionId(null);
  };

  return (
    <div id="section-problems" className="w-full space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span className="text-rose-400">🚩</span>
            <span>POTENTIAL PROBLEMS RADAR</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            AI-flagged documentation weaknesses, missing elements, and vague rationale. You confirm, dismiss, or correct each item.
          </p>
        </div>

        <div className="text-xs text-slate-400 self-start sm:self-auto">
          <span>{concerns.length} Findings Identified</span>
        </div>
      </div>

      {/* Finding Cards */}
      <div className="space-y-4">
        {concerns.map((concern) => {
          const isExpanded = expandedId === concern.id;
          const isNoteOpen = editingNoteId === concern.id;
          const isCorrectionOpen = editingCorrectionId === concern.id;

          const status = concern.advocateStatus || "UNREVIEWED";

          return (
            <div
              key={concern.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                status === "CONFIRMED"
                  ? "border-rose-500/50 bg-[#000820] shadow-md shadow-rose-950/20"
                  : status === "DISMISSED"
                  ? "border-slate-800 bg-[#000820]/60 opacity-70"
                  : status === "UNDER_REVIEW"
                  ? "border-amber-500/40 bg-[#000820]"
                  : "border-slate-800 bg-[#000820] hover:border-slate-700"
              }`}
            >
              {/* Card Main Header */}
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-rose-300 flex items-center gap-1.5">
                        <span>🚩</span>
                        <span>{concern.title}</span>
                      </span>

                      {/* Advocate Status Badge */}
                      {status === "CONFIRMED" && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-bold text-rose-300">
                          ✓ Confirmed Concern
                        </span>
                      )}
                      {status === "DISMISSED" && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-400">
                          Dismissed (Not a concern)
                        </span>
                      )}
                      {status === "UNDER_REVIEW" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                          🛠️ Advocate Review Open
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span className="text-amber-300 font-semibold">
                        Decision: {concern.relatedDecision}
                      </span>
                      {concern.documentLocation && (
                        <span>• {concern.documentLocation}</span>
                      )}
                      <span>• {concern.source || "34 C.F.R. §300.503"}</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(concern.id)}
                    className="h-7 text-xs text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 self-start"
                  >
                    <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 ml-1" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    )}
                  </Button>
                </div>

                {/* What the PWN Says */}
                {concern.relevantPwnLanguage && (
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 text-xs space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      What the PWN Says:
                    </span>
                    <blockquote className="italic text-slate-200 border-l-2 border-amber-400/50 pl-2.5 py-0.5">
                      "{concern.relevantPwnLanguage}"
                    </blockquote>
                  </div>
                )}

                {/* Why Flagged */}
                <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/30 p-3 rounded-xl border border-white/5">
                  <strong className="text-amber-400/90 font-semibold block mb-0.5">
                    Why Decoder Flagged It:
                  </strong>
                  <span>{concern.whyFlagged}</span>
                </div>

                {/* Authoritative Advocate Correction if present */}
                {concern.advocateCorrection && (
                  <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Authoritative Advocate Interpretation:</span>
                    </div>
                    <p className="text-sky-100 leading-relaxed font-medium">
                      {concern.advocateCorrection}
                    </p>
                  </div>
                )}

                {/* Advocate Note if present */}
                {concern.advocateNote && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                      <span>Advocate Note:</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">
                      {concern.advocateNote}
                    </p>
                  </div>
                )}

                {/* ADVOCATE REVIEW CONTROLS (Row of Action Buttons) */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                  {/* Button 1: Confirm Concern */}
                  <Button
                    size="sm"
                    onClick={() =>
                      onUpdateConcern(
                        concern.id,
                        status === "CONFIRMED" ? "UNREVIEWED" : "CONFIRMED",
                        concern.advocateNote,
                        concern.advocateCorrection
                      )
                    }
                    className={`h-8 text-xs font-semibold rounded-lg px-3 flex items-center gap-1.5 transition-all ${
                      status === "CONFIRMED"
                        ? "bg-rose-500 text-white hover:bg-rose-600"
                        : "bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-white/10"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>✓ Confirm Concern</span>
                  </Button>

                  {/* Button 2: Not a Concern (Dismiss) */}
                  <Button
                    size="sm"
                    onClick={() =>
                      onUpdateConcern(
                        concern.id,
                        status === "DISMISSED" ? "UNREVIEWED" : "DISMISSED",
                        concern.advocateNote,
                        concern.advocateCorrection
                      )
                    }
                    className={`h-8 text-xs font-medium rounded-lg px-3 flex items-center gap-1.5 transition-all ${
                      status === "DISMISSED"
                        ? "bg-slate-700 text-slate-200"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-white/10"
                    }`}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Not a Concern</span>
                  </Button>

                  {/* Button 3: Advocate Review */}
                  <Button
                    size="sm"
                    onClick={() =>
                      onUpdateConcern(
                        concern.id,
                        status === "UNDER_REVIEW" ? "UNREVIEWED" : "UNDER_REVIEW",
                        concern.advocateNote,
                        concern.advocateCorrection
                      )
                    }
                    className={`h-8 text-xs font-medium rounded-lg px-3 flex items-center gap-1.5 transition-all ${
                      status === "UNDER_REVIEW"
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-slate-900 hover:bg-amber-950/30 text-slate-400 hover:text-amber-300 border border-white/10"
                    }`}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>🛠️ Advocate Review</span>
                  </Button>

                  {/* Button 4: Add / Edit Note */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenNote(concern)}
                    className="h-8 text-xs text-slate-300 hover:text-white hover:bg-white/5 border-white/10 rounded-lg"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    <span>{concern.advocateNote ? "Edit Note" : "Add Note"}</span>
                  </Button>

                  {/* Button 5: AI Interpreted Incorrectly */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenCorrection(concern)}
                    className="h-8 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 border-sky-500/20 rounded-lg ml-auto"
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    <span>AI interpreted this incorrectly</span>
                  </Button>
                </div>

                {/* Inline Note Editor */}
                {isNoteOpen && (
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-slate-950 space-y-2 mt-2">
                    <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Advocate Case Note for this Finding:
                    </label>
                    <Textarea
                      rows={3}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add strategic advocacy notes, follow-up items, or parent communication context..."
                      className="w-full bg-[#000820] border-slate-700 text-xs text-slate-200"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingNoteId(null)}
                        className="h-7 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveNote(concern)}
                        className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                      >
                        Save Note
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inline Advocate Correction Editor */}
                {isCorrectionOpen && (
                  <div className="p-3 rounded-xl border border-sky-500/40 bg-slate-950 space-y-2 mt-2">
                    <div className="space-y-0.5">
                      <label className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                        <Edit3 className="h-3.5 w-3.5" />
                        Correct Interpretation (Authoritative over AI):
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Provide your authoritative advocate interpretation. This replaces the AI's flagged interpretation on this review.
                      </p>
                    </div>
                    <Textarea
                      rows={3}
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      placeholder="Explain what the PWN actually meant or why this was incorrectly categorized..."
                      className="w-full bg-[#000820] border-sky-700/80 text-xs text-slate-200"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCorrectionId(null)}
                        className="h-7 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveCorrection(concern)}
                        className="h-7 text-xs bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                      >
                        Save Authoritative Correction
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Expandable "Show The AI's Work" Section */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-white/5 bg-slate-950/50 space-y-3.5 text-xs">
                  <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Reasoning & Documentation Analysis</span>
                  </div>

                  {/* What Should Have Been Documented (Category Guidance) */}
                  <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-950/20 space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                      What Should Have Been Documented?
                    </span>
                    <p className="text-slate-200 leading-relaxed">
                      {concern.strongerDocumentationWouldIdentify ||
                        "Stronger documentation would identify specific student assessment data, explicit reasoning connecting records to the decision, and reasons alternatives were considered and rejected."}
                    </p>
                    <p className="text-[10px] text-amber-400/80 italic mt-1">
                      Note: The Decoder explains the missing CATEGORY of information without inventing fake evidence or claims.
                    </p>
                  </div>

                  {/* Metadata Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-400 bg-[#000820] p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="font-semibold text-slate-300">Related PWN Requirement: </span>
                      <span>{concern.relatedRequirement}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-300">Statutory Source: </span>
                      <span>{concern.source || "34 C.F.R. §300.503"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-300">Document Location: </span>
                      <span>{concern.documentLocation || "PWN Document"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-300">Concern Classification: </span>
                      <span className="capitalize">{concern.concernType.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

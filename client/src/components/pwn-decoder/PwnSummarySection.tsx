import React, { useState } from "react";
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  Save,
  CheckCheck,
  Award,
  Printer,
  Edit2,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FullPwnReview } from "./types";

interface PwnSummarySectionProps {
  review: FullPwnReview;
  onSaveReview: (status: "DRAFT" | "ADVOCATE_REVIEWED" | "COMPLETED", notes?: string) => void;
  isSaving: boolean;
  onOpenPrint: () => void;
}

export const PwnSummarySection: React.FC<PwnSummarySectionProps> = ({
  review,
  onSaveReview,
  isSaving,
  onOpenPrint,
}) => {
  const [advocateNotes, setAdvocateNotes] = useState(review.advocateNotes || "");
  const [isNotesExpanded, setIsNotesExpanded] = useState(!!review.advocateNotes);

  return (
    <div id="section-summary" className="w-full space-y-6">
      {/* 1. Synthesis Summary Card */}
      <div className="rounded-2xl border border-slate-700/80 bg-[#000820] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            <span>PWN REVIEW SUMMARY</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Advocate: {review.advocateName || "Byron Honea"} • {new Date(review.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Generated Synthesis Text */}
        <p className="text-sm text-slate-200 leading-relaxed font-normal bg-slate-950/40 p-4 rounded-xl border border-white/5">
          {review.summary}
        </p>

        {/* HIGHEST ATTENTION ITEMS */}
        {review.highestAttentionItems && review.highestAttentionItems.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>Highest Attention Items</span>
            </h3>
            <div className="space-y-2">
              {review.highestAttentionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/25 text-xs text-slate-200 flex items-start gap-2.5"
                >
                  <span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legal Language Guardrail Reminder Banner */}
        <div className="p-3.5 rounded-xl border border-white/10 bg-slate-950/60 text-xs text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 uppercase tracking-wider text-[10px]">
            <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
            <span>Legal Language Guardrail</span>
          </div>
          <p className="leading-relaxed">
            The Decoder distinguishes between <em>"Required element not located"</em> and <em>"Legal violation established"</em>.
            AI findings represent potential documentation and compliance concerns for advocate verification; legal conclusions remain the exclusive province of the advocate and parent team.
          </p>
        </div>

        {/* General Advocate Case Notes Section */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Edit2 className="h-3.5 w-3.5 text-amber-400" />
              <span>Advocate Strategy & Next Steps Notes</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNotesExpanded(!isNotesExpanded)}
              className="h-6 text-[11px] text-slate-400 hover:text-white"
            >
              {isNotesExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>

          {isNotesExpanded && (
            <Textarea
              rows={4}
              value={advocateNotes}
              onChange={(e) => setAdvocateNotes(e.target.value)}
              placeholder="Record strategic recommendations, questions for the IEP team, Parent Ready discussion points, or dispute posture..."
              className="w-full bg-[#000820] border-slate-700 text-xs text-slate-200 leading-relaxed"
            />
          )}
        </div>
      </div>

      {/* 2. Review Actions Bar: SAVE DRAFT, MARK ADVOCATE REVIEWED, COMPLETE REVIEW, PRINTER FRIENDLY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-[#000820]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Review Status:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            {review.status || "DRAFT"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Button: Printer Friendly Review */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPrint}
            className="h-9 text-xs border-white/10 hover:bg-white/5 text-slate-200 flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4 text-slate-400" />
            <span>Printer Friendly Review</span>
          </Button>

          {/* Button: SAVE DRAFT */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => onSaveReview("DRAFT", advocateNotes)}
            className="h-9 text-xs border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5"
          >
            <Save className="h-4 w-4 text-slate-400" />
            <span>Save Draft</span>
          </Button>

          {/* Button: MARK ADVOCATE REVIEWED */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => onSaveReview("ADVOCATE_REVIEWED", advocateNotes)}
            className="h-9 text-xs border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold flex items-center gap-1.5"
          >
            <CheckCheck className="h-4 w-4 text-amber-400" />
            <span>Mark Advocate Reviewed</span>
          </Button>

          {/* Button: COMPLETE REVIEW */}
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => onSaveReview("COMPLETED", advocateNotes)}
            className="h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
          >
            <Award className="h-4 w-4 text-emerald-200" />
            <span>Complete Review</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

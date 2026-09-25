import React from "react";
import { CheckCircle2, ShieldAlert, FileText, AlertTriangle, ArrowDown } from "lucide-react";
import type { FullPwnReview, DocumentationStrength } from "./types";

interface PwnAtAGlanceProps {
  review: FullPwnReview;
  onJumpToSection: (sectionId: string) => void;
}

const STRENGTH_CONFIG: Record<
  DocumentationStrength,
  { label: string; dot: string; bg: string; border: string; text: string }
> = {
  STRONG: {
    label: "STRONG",
    dot: "🟢",
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/40",
    text: "text-emerald-300",
  },
  ADEQUATE: {
    label: "ADEQUATE",
    dot: "🔵",
    bg: "bg-sky-950/40",
    border: "border-sky-500/40",
    text: "text-sky-300",
  },
  THIN: {
    label: "THIN",
    dot: "🟡",
    bg: "bg-amber-950/40",
    border: "border-amber-500/40",
    text: "text-amber-300",
  },
  SERIOUS_CONCERN: {
    label: "SERIOUS CONCERN",
    dot: "🔴",
    bg: "bg-rose-950/40",
    border: "border-rose-500/40",
    text: "text-rose-300",
  },
};

export const PwnAtAGlance: React.FC<PwnAtAGlanceProps> = ({ review, onJumpToSection }) => {
  const strengthInfo = STRENGTH_CONFIG[review.documentationStrength] || STRENGTH_CONFIG.THIN;

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
          <span>PWN AT A GLANCE</span>
        </h2>
        <span className="text-[11px] text-slate-400">
          Click any card to jump directly to its detailed breakdown
        </span>
      </div>

      {/* 4 Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Required Elements */}
        <button
          type="button"
          onClick={() => onJumpToSection("section-requirements")}
          className="text-left p-4 rounded-xl border border-slate-700/80 bg-[#000820] hover:border-amber-500/50 hover:bg-slate-900/60 transition-all group flex flex-col justify-between shadow-md"
        >
          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Required Elements</span>
            <CheckCircle2 className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {review.elementsNeedReviewCount > 0 ? (
                <span className="text-amber-300">{review.elementsNeedReviewCount} Need Review</span>
              ) : (
                <span className="text-emerald-300">All 9 Located</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Federal Core 34 C.F.R. §300.503
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-medium group-hover:translate-y-0.5 transition-transform">
            <span>View requirements</span>
            <ArrowDown className="h-3 w-3" />
          </div>
        </button>

        {/* Card 2: Documentation Strength */}
        <button
          type="button"
          onClick={() => onJumpToSection("section-strength")}
          className={`text-left p-4 rounded-xl border ${strengthInfo.border} ${strengthInfo.bg} hover:brightness-110 transition-all group flex flex-col justify-between shadow-md`}
        >
          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Documentation Strength</span>
            <span className="text-base leading-none">{strengthInfo.dot}</span>
          </div>
          <div className="my-2">
            <div className={`text-xl sm:text-2xl font-bold ${strengthInfo.text} tracking-tight`}>
              {strengthInfo.dot} {strengthInfo.label}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 line-clamp-1">
              {review.documentationStrengthReason || "Specificity & student-specific reasoning"}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-300 font-medium group-hover:translate-y-0.5 transition-transform">
            <span>View reasoning</span>
            <ArrowDown className="h-3 w-3" />
          </div>
        </button>

        {/* Card 3: Proposals / Refusals Found */}
        <button
          type="button"
          onClick={() => onJumpToSection("section-decisions")}
          className="text-left p-4 rounded-xl border border-slate-700/80 bg-[#000820] hover:border-amber-500/50 hover:bg-slate-900/60 transition-all group flex flex-col justify-between shadow-md"
        >
          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Proposals / Refusals</span>
            <FileText className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {review.decisionsCount} Decisions Identified
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              One decision per discrete action card
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-medium group-hover:translate-y-0.5 transition-transform">
            <span>Explore decisions</span>
            <ArrowDown className="h-3 w-3" />
          </div>
        </button>

        {/* Card 4: Potential Problems */}
        <button
          type="button"
          onClick={() => onJumpToSection("section-problems")}
          className="text-left p-4 rounded-xl border border-slate-700/80 bg-[#000820] hover:border-rose-500/50 hover:bg-slate-900/60 transition-all group flex flex-col justify-between shadow-md"
        >
          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Potential Problems</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold text-rose-300 tracking-tight flex items-center gap-1.5">
              <span>🚩</span>
              <span>{review.potentialProblemsCount} Findings</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Potential compliance & documentation concerns
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-rose-400 font-medium group-hover:translate-y-0.5 transition-transform">
            <span>Review radar findings</span>
            <ArrowDown className="h-3 w-3" />
          </div>
        </button>
      </div>

      {/* Rationale explanation banner for Documentation Strength */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-[#000820] text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
        <span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">Strength Analysis:</span>
        <span className="text-slate-300">{review.documentationStrengthReason}</span>
      </div>
    </div>
  );
};

import React from "react";
import { FileText, SlidersHorizontal, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortmasterFinding } from "./types";

interface PortmasterReviewSummaryProps {
  totalAnalyzed: number;
  clearedAutomatically: number;
  findings: PortmasterFinding[];
  isFullComparisonOpen?: boolean;
  onToggleFullComparison?: () => void;
  activeViewMode?: "review" | "comparison";
  onSelectViewMode?: (mode: "review" | "comparison") => void;
}

export function PortmasterReviewSummary({
  totalAnalyzed = 42,
  clearedAutomatically = 37,
  findings = [],
  isFullComparisonOpen = false,
  onToggleFullComparison,
  activeViewMode = "review",
  onSelectViewMode,
}: PortmasterReviewSummaryProps) {
  const reviewFirstCount = findings.filter((f) => f.severity === "review_first").length || 2;
  const checkCount = findings.filter((f) => f.severity === "check").length || 3;

  return (
    <div className="rounded-2xl bg-[#04162D]/95 border border-[#0D3866] p-3.5 sm:p-4 shadow-lg flex items-center justify-between gap-4 flex-wrap select-none">
      {/* Left: Document icon + Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0C3B70] to-[#041B38] border border-[#1B5797] text-blue-300 flex items-center justify-center shadow-md shrink-0">
          <FileText className="h-5 w-5 text-blue-300" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Portmaster Review Summary
          </h2>
          <p className="text-xs text-blue-200/70">
            We compared the previous IEP, meeting record, and updated IEP.
          </p>
        </div>
      </div>

      {/* Middle: 4 Stat Columns */}
      <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
        {/* Total Analyzed */}
        <div className="text-center">
          <span className="text-lg sm:text-xl font-bold text-white font-mono block leading-none">
            {totalAnalyzed}
          </span>
          <span className="text-[11px] text-blue-200/70 block mt-1">items analyzed</span>
        </div>

        {/* Review First */}
        <div className="text-center">
          <span className="text-lg sm:text-xl font-bold text-rose-400 font-mono block leading-none">
            {reviewFirstCount}
          </span>
          <span className="text-[11px] font-semibold text-rose-400 block mt-1">Review First</span>
        </div>

        {/* Check */}
        <div className="text-center">
          <span className="text-lg sm:text-xl font-bold text-[#F5B544] font-mono block leading-none">
            {checkCount}
          </span>
          <span className="text-[11px] font-semibold text-[#F5B544] block mt-1">Check</span>
        </div>

        {/* Cleared */}
        <div className="text-center">
          <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono block leading-none">
            {clearedAutomatically}
          </span>
          <span className="text-[11px] font-semibold text-emerald-400 block mt-1">Cleared</span>
        </div>
      </div>

      {/* Right: Full Comparison & Review Mode Toggles */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleFullComparison}
          className={cn(
            "h-8.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 border",
            isFullComparisonOpen
              ? "bg-[#113867] text-white border-blue-400 shadow-sm"
              : "bg-[#061C38] border-[#103D6D] text-blue-200 hover:text-white hover:border-[#1E5D9C]"
          )}
        >
          <BookOpen className="h-3.5 w-3.5 text-blue-300" />
          <span>Full Comparison</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectViewMode?.("review")}
          className={cn(
            "h-8.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm border",
            activeViewMode === "review"
              ? "bg-[#1D4ED8] text-white border-blue-400 shadow-[0_0_12px_rgba(29,78,216,0.5)]"
              : "bg-[#061C38] border-[#103D6D] text-blue-200 hover:text-white"
          )}
        >
          <span>Review Mode</span>
        </button>
      </div>
    </div>
  );
}

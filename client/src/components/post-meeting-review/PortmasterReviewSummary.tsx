import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Filter, Layers, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FindingCategory, PortmasterFinding } from "./types";

interface PortmasterReviewSummaryProps {
  totalAnalyzed: number;
  clearedAutomatically: number;
  findings: PortmasterFinding[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Findings", value: "all" },
  { label: "Services", value: "Services" },
  { label: "Goals", value: "Goals" },
  { label: "Accommodations", value: "Accommodations" },
  { label: "Placement", value: "Placement" },
  { label: "Behavior", value: "Behavior" },
  { label: "Related Services", value: "Related Services" },
  { label: "Transportation", value: "Transportation" },
];

export function PortmasterReviewSummary({
  totalAnalyzed,
  clearedAutomatically,
  findings,
  selectedCategory,
  onSelectCategory,
}: PortmasterReviewSummaryProps) {
  const reviewFirstCount = findings.filter((f) => f.severity === "review_first").length;
  const checkCount = findings.filter((f) => f.severity === "check").length;
  const confirmedCount = findings.filter((f) => f.decision === "confirmed").length;
  const dismissedCount = findings.filter((f) => f.decision === "not_a_concern").length;

  return (
    <div className="rounded-xl bg-[#081F3B]/90 border border-[#144A7E] p-3 sm:p-3.5 shadow-md space-y-3">
      {/* Top Counts Strip */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-teal-500/20 text-teal-300">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <span>Portmaster Review Summary</span>
            </h3>
            <p className="text-[11px] text-blue-200/70">
              Only findings requiring human advocacy judgment are elevated to this queue.
            </p>
          </div>
        </div>

        {/* Priority Counters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2.5 py-1 rounded-lg bg-[#04101F] border border-[#103862] text-xs flex items-center gap-1.5">
            <span className="text-[11px] text-blue-300/70 font-mono">Analyzed:</span>
            <span className="font-bold text-white font-mono">{totalAnalyzed}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5 font-bold">
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
            <span>{reviewFirstCount} Review First</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-1.5 font-bold">
            <AlertTriangle className="h-3.5 w-3.5 text-[#F5B544]" />
            <span>{checkCount} Check</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-400/80 px-2 py-1 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>{clearedAutomatically} cleared automatically</span>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar (Clicking filters the same review queue) */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#0F355E]/70">
        <span className="text-[10.5px] font-mono text-blue-300/60 uppercase tracking-wide mr-1 flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Filter:
        </span>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.value;
          const count =
            cat.value === "all"
              ? findings.length
              : findings.filter((f) => f.category === cat.value).length;

          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => onSelectCategory(cat.value)}
              className={cn(
                "h-6 px-2.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1 border",
                isSelected
                  ? "bg-[#F5B544] text-slate-950 border-amber-400 shadow-xs font-bold"
                  : "bg-[#05162A] text-blue-200 hover:text-white hover:bg-[#092244] border-[#0E355E]"
              )}
            >
              <span>{cat.label}</span>
              <span
                className={cn(
                  "text-[9.5px] font-mono px-1 rounded",
                  isSelected ? "bg-slate-950/30 text-slate-950" : "bg-white/10 text-blue-300"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

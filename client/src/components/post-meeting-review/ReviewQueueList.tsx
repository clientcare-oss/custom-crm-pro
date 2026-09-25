import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Anchor,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortmasterFinding } from "./types";

interface ReviewQueueListProps {
  findings: PortmasterFinding[];
  selectedFindingId: string | null;
  onSelectFinding: (id: string) => void;
  selectedFilter?: string;
  onSelectFilter?: (filter: string) => void;
}

export function ReviewQueueList({
  findings,
  selectedFindingId,
  onSelectFinding,
  selectedFilter = "all",
  onSelectFilter,
}: ReviewQueueListProps) {
  const [isClearedOpen, setIsClearedOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-[#03152C]/95 border border-[#0D3866] p-4 sm:p-5 shadow-lg space-y-4 select-none">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Anchor className="h-4 w-4 text-[#F5B544]" />
            <span>Review Queue ({findings.length})</span>
          </h3>
          <p className="text-xs text-blue-200/70">Items that need your review.</p>
        </div>

        {/* Dropdown filter selector */}
        <select
          value={selectedFilter}
          onChange={(e) => onSelectFilter?.(e.target.value)}
          className="h-8 px-2.5 rounded-lg bg-[#071F3B] border border-[#144A7E] text-xs font-semibold text-blue-200 focus:outline-none focus:border-blue-400 cursor-pointer"
        >
          <option value="all">All Items</option>
          <option value="review_first">Review First</option>
          <option value="check">Check</option>
          <option value="Services">Services</option>
          <option value="Accommodations">Accommodations</option>
          <option value="Behavior">Behavior</option>
          <option value="Transportation">Transportation</option>
        </select>
      </div>

      {/* Findings List */}
      <div className="space-y-2.5">
        {findings.map((finding, idx) => {
          const isSelected = selectedFindingId === finding.id;
          const isReviewFirst = finding.severity === "review_first";

          return (
            <div
              key={finding.id}
              onClick={() => onSelectFinding(finding.id)}
              className={cn(
                "rounded-xl p-3 sm:p-3.5 border transition-all cursor-pointer flex items-center justify-between gap-3 relative group",
                isSelected
                  ? "bg-[#0B2A56] border-[#2563EB] shadow-[0_0_16px_rgba(37,99,235,0.4)] ring-1 ring-[#3B82F6]/50"
                  : "bg-[#051C38] border-[#0F355E] hover:border-[#1E5D9C] hover:bg-[#072346]"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Severity Circular Icon */}
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm",
                    isReviewFirst
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/50"
                      : "bg-amber-500/20 text-[#F5B544] border border-amber-500/50"
                  )}
                >
                  {isReviewFirst ? "!" : "!"}
                </div>

                {/* Finding Details */}
                <div className="min-w-0 space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                    {finding.title}
                  </h4>
                  <p className="text-[11.5px] text-blue-200/75 truncate">
                    {finding.oneLineExplanation.split(".")[0]}
                  </p>

                  {/* Severity Badge */}
                  <div className="pt-0.5">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase inline-block font-mono",
                        isReviewFirst
                          ? "bg-rose-950/80 text-rose-300 border border-rose-500/50"
                          : "bg-amber-950/80 text-[#F5B544] border border-amber-500/50"
                      )}
                    >
                      {isReviewFirst ? "Review First" : "Check"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Index Number */}
              <div className="text-sm font-bold font-mono text-blue-300/50 group-hover:text-blue-200 transition-colors shrink-0 px-1">
                {idx + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cleared Items Collapsible Drawer */}
      <div className="rounded-xl border border-[#0F355E] bg-[#051C38]/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsClearedOpen(!isClearedOpen)}
          className="w-full p-3 flex items-center justify-between text-left hover:bg-[#07244A] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xs font-bold">
              ✓
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Cleared Items (37)
              </span>
              <span className="text-[11px] text-blue-200/60 block">
                No issues identified.
              </span>
            </div>
          </div>

          <span className="text-blue-300/60">
            {isClearedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {isClearedOpen && (
          <div className="p-3 border-t border-[#0F355E] space-y-1.5 text-xs text-blue-200/70 bg-[#020E1F]">
            <p className="text-[11.5px] italic text-emerald-300/90 pb-1">
              37 items matched agreed decisions or experienced no substantive changes between IEPs.
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <div className="p-1.5 rounded bg-[#04162D] border border-[#0C2A4A] flex items-center justify-between">
                <span>Extended School Year (ESY)</span>
                <span className="text-emerald-400 font-bold">✓</span>
              </div>
              <div className="p-1.5 rounded bg-[#04162D] border border-[#0C2A4A] flex items-center justify-between">
                <span>Speech Language Therapy</span>
                <span className="text-emerald-400 font-bold">✓</span>
              </div>
              <div className="p-1.5 rounded bg-[#04162D] border border-[#0C2A4A] flex items-center justify-between">
                <span>Testing Accommodations</span>
                <span className="text-emerald-400 font-bold">✓</span>
              </div>
              <div className="p-1.5 rounded bg-[#04162D] border border-[#0C2A4A] flex items-center justify-between">
                <span>Assistive Technology Device</span>
                <span className="text-emerald-400 font-bold">✓</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

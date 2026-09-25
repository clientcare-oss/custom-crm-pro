import React from "react";
import { AlertCircle, AlertTriangle, Check, CheckCircle2, ChevronRight, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortmasterFinding } from "./types";

interface ReviewQueueListProps {
  findings: PortmasterFinding[];
  selectedFindingId: string | null;
  onSelectFinding: (id: string) => void;
}

export function ReviewQueueList({
  findings,
  selectedFindingId,
  onSelectFinding,
}: ReviewQueueListProps) {
  const renderSourceTag = (tag: string) => {
    switch (tag) {
      case "comparator_found":
        return (
          <span
            key={tag}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#0A2647] border border-[#1A4B82] text-blue-200 inline-flex items-center gap-1"
          >
            <span>🔀</span>
            <span>Comparator Found</span>
          </span>
        );
      case "meeting_conflict":
        return (
          <span
            key={tag}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/70 border border-rose-500/50 text-rose-300 inline-flex items-center gap-1"
          >
            <span>⚓</span>
            <span>Meeting Conflict</span>
          </span>
        );
      case "meeting_verification":
        return (
          <span
            key={tag}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#07241A] border border-emerald-500/40 text-emerald-300 inline-flex items-center gap-1"
          >
            <span>⚓</span>
            <span>Meeting Verification</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <span>Review Queue</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[#0A2649] text-teal-300 border border-[#144A7E]">
            {findings.length}
          </span>
        </h3>
        <span className="text-[10.5px] text-blue-300/60 font-mono">
          Click to inspect
        </span>
      </div>

      <div className="space-y-2">
        {findings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#144A7E] p-6 text-center text-xs text-blue-200/60 bg-[#05162A]/40">
            No findings in this category. All items successfully verified.
          </div>
        ) : (
          findings.map((finding) => {
            const isSelected = selectedFindingId === finding.id;
            const isReviewFirst = finding.severity === "review_first";

            return (
              <div
                key={finding.id}
                onClick={() => onSelectFinding(finding.id)}
                className={cn(
                  "rounded-xl p-3 border transition-all cursor-pointer text-left relative group",
                  isSelected
                    ? "bg-[#09274D] border-[#F5B544] shadow-[0_0_15px_rgba(245,181,68,0.2)]"
                    : "bg-[#061B35]/85 border-[#0F3865] hover:border-[#1E5D9C] hover:bg-[#072040]"
                )}
              >
                {/* Header row: Severity icon, Title, Status stamp */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">
                      {isReviewFirst ? "🚨" : "⚠️"}
                    </span>
                    <h4 className="text-xs font-bold text-white truncate">
                      {finding.title}
                    </h4>
                  </div>

                  {/* Decision Stamp if already touched */}
                  {finding.decision !== "unreviewed" && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider shrink-0",
                        finding.decision === "confirmed" && "bg-teal-950 border border-teal-500/60 text-teal-300",
                        finding.decision === "not_a_concern" && "bg-slate-900 border border-slate-700 text-slate-400 line-through",
                        finding.decision === "hold" && "bg-amber-950 border border-amber-500/60 text-amber-300"
                      )}
                    >
                      {finding.decision === "confirmed" && "✓ Confirmed"}
                      {finding.decision === "not_a_concern" && "Dismissed"}
                      {finding.decision === "hold" && "? Hold"}
                    </span>
                  )}
                </div>

                {/* One line explanation */}
                <p className="text-[11.5px] text-blue-100/85 leading-snug line-clamp-2 mb-2 font-normal">
                  {finding.oneLineExplanation}
                </p>

                {/* Source Tags row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {finding.sourceTags.map((tag) => renderSourceTag(tag))}
                </div>

                {/* Selection Arrow indicator */}
                <div
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 transition-opacity",
                    isSelected ? "opacity-100 text-[#F5B544]" : "opacity-0 group-hover:opacity-40 text-blue-300"
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

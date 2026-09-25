import React from "react";
import { Check, X, HelpCircle, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FindingDecision } from "./types";

interface AdvocateDecisionControlsProps {
  currentDecision: FindingDecision;
  onDecide: (decision: FindingDecision) => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

export function AdvocateDecisionControls({
  currentDecision,
  onDecide,
  onUndo,
  canUndo = false,
}: AdvocateDecisionControlsProps) {
  return (
    <div className="rounded-xl bg-[#030F1F] border border-[#103D6D] p-3 sm:p-4 flex items-center justify-between gap-3 flex-wrap shadow-md">
      <div className="space-y-0.5">
        <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono block">
          Advocate Decision
        </span>
        <p className="text-[11px] text-blue-200/60">
          Decide whether this finding requires school follow-up or can be cleared.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Button 1: Confirm Concern */}
        <Button
          type="button"
          onClick={() => onDecide("confirmed")}
          className={cn(
            "h-8 sm:h-8.5 px-3.5 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm border",
            currentDecision === "confirmed"
              ? "bg-teal-500 text-slate-950 border-teal-300 ring-2 ring-teal-400/40"
              : "bg-[#062920] border-teal-500/50 text-teal-300 hover:bg-teal-900/60 hover:text-white"
          )}
          title="Mark as confirmed concern requiring district follow-up or clarification"
        >
          <Check className="h-3.5 w-3.5 text-teal-400" />
          <span>✓ Confirm Concern</span>
        </Button>

        {/* Button 2: Not a Concern */}
        <Button
          type="button"
          onClick={() => onDecide("not_a_concern")}
          className={cn(
            "h-8 sm:h-8.5 px-3.5 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm border",
            currentDecision === "not_a_concern"
              ? "bg-slate-700 text-white border-slate-500 ring-2 ring-slate-400/40"
              : "bg-[#071626] border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          )}
          title="Dismiss from active queue as reviewed non-issue"
        >
          <X className="h-3.5 w-3.5 text-slate-400" />
          <span>✕ Not a Concern</span>
        </Button>

        {/* Button 3: Hold */}
        <Button
          type="button"
          onClick={() => onDecide("hold")}
          className={cn(
            "h-8 sm:h-8.5 px-3 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm border",
            currentDecision === "hold"
              ? "bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/40 font-bold"
              : "bg-[#251A08] border-amber-500/50 text-amber-300 hover:bg-amber-950 hover:text-white"
          )}
          title="Hold in queue for further advocate deliberation"
        >
          <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
          <span>? Hold</span>
        </Button>

        {/* Undo button */}
        {canUndo && onUndo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onUndo}
            className="h-8 px-2 text-xs text-blue-300 hover:text-white hover:bg-white/10 cursor-pointer inline-flex items-center gap-1 ml-1"
            title="Undo previous decision"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Undo</span>
          </Button>
        )}
      </div>
    </div>
  );
}

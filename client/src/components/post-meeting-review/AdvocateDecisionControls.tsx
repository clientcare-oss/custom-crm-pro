import React from "react";
import { Check, X, HelpCircle, RotateCcw } from "lucide-react";
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
    <div className="space-y-2 select-none">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Button 1: Confirm Concern (Coral / Red) */}
        <button
          type="button"
          onClick={() => onDecide("confirmed")}
          className={cn(
            "h-10 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-md border",
            currentDecision === "confirmed"
              ? "bg-[#BE123C] text-white border-rose-300 ring-2 ring-rose-500/50"
              : "bg-[#DC2626] text-white border-rose-400 hover:bg-[#B91C1C]"
          )}
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
          <span>Confirm Concern</span>
        </button>

        {/* Button 2: Not a Concern (Navy / Blue) */}
        <button
          type="button"
          onClick={() => onDecide("not_a_concern")}
          className={cn(
            "h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm border",
            currentDecision === "not_a_concern"
              ? "bg-[#113867] text-white border-blue-400 ring-2 ring-blue-500/50"
              : "bg-[#0B254E] text-blue-200 border-[#1A4B82] hover:bg-[#12386E] hover:text-white"
          )}
        >
          <X className="h-4 w-4 stroke-[2.5]" />
          <span>Not a Concern</span>
        </button>

        {/* Button 3: Hold for Now (Navy / Blue) */}
        <button
          type="button"
          onClick={() => onDecide("hold")}
          className={cn(
            "h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm border",
            currentDecision === "hold"
              ? "bg-[#113867] text-amber-300 border-amber-400 ring-2 ring-amber-500/50"
              : "bg-[#0B254E] text-blue-200 border-[#1A4B82] hover:bg-[#12386E] hover:text-white"
          )}
        >
          <span className="font-bold text-base leading-none">?</span>
          <span>Hold for Now</span>
        </button>
      </div>

      {/* Undo option if decision was made */}
      {canUndo && onUndo && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onUndo}
            className="text-xs text-blue-300/70 hover:text-blue-100 cursor-pointer inline-flex items-center gap-1 font-mono transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Undo decision</span>
          </button>
        </div>
      )}
    </div>
  );
}

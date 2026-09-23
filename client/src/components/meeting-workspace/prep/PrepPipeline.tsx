import React from "react";
import { CheckCircle2, Circle, Sparkles, User, FileText, Map, PlayCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PrepStep } from "../types";

interface PrepPipelineProps {
  currentStep: PrepStep;
  onSelectStep: (step: PrepStep) => void;
  hasIepIntel: boolean;
  hasParentIntel: boolean;
  pcsApproved: boolean;
  hasBlueprint: boolean;
  isReady: boolean;
  onOpenImportModal?: () => void;
  isManualImport?: boolean;
}

export function PrepPipeline({
  currentStep,
  onSelectStep,
  hasIepIntel,
  hasParentIntel,
  pcsApproved,
  hasBlueprint,
  isReady,
  onOpenImportModal,
  isManualImport,
}: PrepPipelineProps) {
  const steps: {
    key: PrepStep;
    stepNumber: number;
    shortLabel: string;
    icon: any;
    isComplete: boolean;
  }[] = [
    { key: "iep_intel", stepNumber: 1, shortLabel: "IEP Intel", icon: Sparkles, isComplete: hasIepIntel },
    { key: "parent_intel", stepNumber: 2, shortLabel: "Parent Intel", icon: User, isComplete: hasParentIntel },
    { key: "pcs", stepNumber: 3, shortLabel: "Parent Concerns (PCS)", icon: FileText, isComplete: pcsApproved },
    { key: "blueprint", stepNumber: 4, shortLabel: "IEP Blueprint", icon: Map, isComplete: hasBlueprint },
    { key: "ready", stepNumber: 5, shortLabel: "Ready for Meeting", icon: PlayCircle, isComplete: isReady },
  ];

  return (
    <div className="space-y-2.5 w-full">
      {/* Top Pipeline Bar + Secondary Import Trigger */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-200/70 tracking-wide uppercase">
            Preparation Pipeline
          </span>
          {isManualImport && (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-950/40 text-amber-300 text-[10px] py-0">
              MANUAL PREP IMPORT
            </Badge>
          )}
        </div>

        {onOpenImportModal && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenImportModal}
            className="text-xs h-7 border-[#144A7E] bg-[#071C3C] text-blue-200 hover:text-[#F5B544] hover:border-[#F5B544]/60 gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="h-3 w-3 text-[#F5B544]" />
            <span>📥 Import Advocate Ready</span>
          </Button>
        )}
      </div>

      <div className="rounded-2xl bg-[#092244]/90 border border-[#103E70] p-2.5 sm:p-3 shadow-xl w-full">
        {/* 5-Column Grid: Fits 100% at any zoom without horizontal scrollbars */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 w-full">
          {steps.map((step) => {
            const isActive = currentStep === step.key;
            const isDone = step.isComplete;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => onSelectStep(step.key)}
                className={cn(
                  "min-w-0 h-9 sm:h-9.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none",
                  isActive
                    ? "bg-gradient-to-r from-[#0E427B] to-[#13599E] border border-[#2A76C9] text-white shadow-[0_2px_10px_rgba(245,181,68,0.25)] ring-1 ring-[#F5B544]/60 font-bold"
                    : isDone
                    ? "bg-[#071C38] border border-emerald-500/40 text-emerald-200 hover:bg-[#0C2A54]"
                    : "bg-[#06172E] border border-transparent text-blue-300/70 hover:text-white hover:bg-[#0A264D]"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : isActive ? (
                  <span className="h-2 w-2 rounded-full bg-[#F5B544] animate-pulse shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 text-blue-400/40 shrink-0" />
                )}
                <span className="truncate">
                  {step.stepNumber}. {step.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

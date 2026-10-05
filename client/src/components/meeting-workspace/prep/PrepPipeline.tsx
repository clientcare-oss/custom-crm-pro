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
          <span className="text-xs font-serif font-bold text-[#FFE394] tracking-wide uppercase">
            Preparation Pipeline
          </span>
          {isManualImport && (
            <Badge variant="outline" className="border-[#C5A059]/40 bg-[#020A17] text-[#FFE394] text-[10px] py-0 font-mono">
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
            className="text-xs h-7 border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="h-3 w-3 text-[#DFBE77]" />
            <span>📥 Import Advocate Ready</span>
          </Button>
        )}
      </div>

      <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] p-2.5 sm:p-3 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] w-full">
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
                  "min-w-0 h-9 sm:h-9.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none border",
                  isActive
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
                    : isDone
                    ? "bg-[#020A17] border-emerald-500/40 text-emerald-300 hover:bg-[#07162B]"
                    : "bg-[#020A17]/60 border-[#3A2C18]/60 text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#07162B]"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : isActive ? (
                  <span className="h-2 w-2 rounded-full bg-[#07162B] animate-pulse shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 text-[#A69371]/60 shrink-0" />
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

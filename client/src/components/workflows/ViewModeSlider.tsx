import React from "react";
import { GitBranch, Route, Sliders, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowExperienceMode, WorkflowViewMode } from "@shared/workflowModel";

interface ViewModeSliderProps {
  value: WorkflowViewMode;
  onChange: (mode: WorkflowViewMode) => void;
  className?: string;
}

/**
 * Premium tactile two-position segmented slider: Traditional | Monorail
 * Keyboard accessible (Tab, ArrowLeft/Right, Enter/Space) with sliding pill thumb.
 */
export function WorkflowViewModeSlider({ value, onChange, className }: ViewModeSliderProps) {
  const isMonorail = value === "monorail";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      onChange(isMonorail ? "traditional" : "monorail");
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Workflow Designer view mode"
      data-testid="workflow-view-slider"
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-grid grid-cols-2 items-center p-[3px] rounded-full select-none",
        "bg-[#040D24] border border-[#C9A55A]/45",
        "shadow-[inset_0_2px_6px_rgba(0,0,0,0.85),0_2px_10px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {/* Tactile Sliding Metallic Pill Thumb */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] w-[calc(50%-3px)] rounded-full",
          "transition-transform duration-250 ease-out motion-reduce:transition-none",
          "bg-gradient-to-b from-[#E5C98B] via-[#C9A55A] to-[#9A7938]",
          "border border-[#FFF1C7]/70",
          "shadow-[0_2px_10px_rgba(201,165,90,0.38),inset_0_1px_1px_rgba(255,255,255,0.6)]",
          isMonorail ? "translate-x-full" : "translate-x-0"
        )}
      />

      <button
        type="button"
        role="radio"
        aria-checked={!isMonorail}
        data-testid="workflow-view-traditional-btn"
        onClick={() => onChange("traditional")}
        className={cn(
          "relative z-10 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C98B] focus-visible:ring-offset-1 focus-visible:ring-offset-[#000820]",
          !isMonorail ? "text-[#061028]" : "text-[#B6C5DC] hover:text-white"
        )}
      >
        <GitBranch className="w-3.5 h-3.5 shrink-0" />
        <span>Traditional</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={isMonorail}
        data-testid="workflow-view-monorail-btn"
        onClick={() => onChange("monorail")}
        className={cn(
          "relative z-10 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C98B] focus-visible:ring-offset-1 focus-visible:ring-offset-[#000820]",
          isMonorail ? "text-[#061028]" : "text-[#B6C5DC] hover:text-white"
        )}
      >
        <Route className="w-3.5 h-3.5 shrink-0" />
        <span>Monorail</span>
      </button>
    </div>
  );
}

interface ExperienceModeToggleProps {
  value: WorkflowExperienceMode;
  onChange: (mode: WorkflowExperienceMode) => void;
  canEdit: boolean;
  className?: string;
}

export function WorkflowExperienceModeToggle({
  value,
  onChange,
  canEdit,
  className,
}: ExperienceModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Workflow workspace mode"
      className={cn(
        "inline-flex items-center p-0.5 rounded-lg bg-[#051029] border border-[#243B64]",
        className
      )}
    >
      {canEdit && (
        <button
          type="button"
          data-testid="workflow-mode-designer-btn"
          onClick={() => onChange("designer")}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C98B]",
            value === "designer"
              ? "bg-[#12264B] text-[#F5E3B8] border border-[#C9A55A]/55 shadow-sm"
              : "text-[#9FB2CE] hover:text-white border border-transparent"
          )}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Designer</span>
        </button>
      )}
      <button
        type="button"
        data-testid="workflow-mode-employee-btn"
        onClick={() => onChange("employee_preview")}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C98B]",
          value === "employee_preview"
            ? "bg-[#12264B] text-[#93C5FD] border border-[#60A5FA]/55 shadow-sm"
            : "text-[#9FB2CE] hover:text-white border border-transparent"
        )}
      >
        <UserCheck className="w-3.5 h-3.5" />
        <span>Employee view</span>
      </button>
    </div>
  );
}

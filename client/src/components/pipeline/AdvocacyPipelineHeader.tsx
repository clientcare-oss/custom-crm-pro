import React from "react";
import {
  Archive,
  GripVertical,
  Check,
  List,
  LayoutGrid,
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import { cn } from "@/lib/utils";
import { ADVOCATE_ROSTER } from "./pipelineDefaults";

interface AdvocacyPipelineHeaderProps {
  onAddStage?: () => void;
  onViewArchive?: () => void;
  isArchiveActive?: boolean;
  selectedAdvocate?: string;
  onSelectAdvocate?: (advocate?: string) => void;
  onCustomizePipeline?: () => void;
  isCustomizingPipeline?: boolean;
  viewMode?: "board" | "list";
  onViewModeChange?: (mode: "board" | "list") => void;
}

export function AdvocacyPipelineHeader({
  onAddStage,
  onViewArchive,
  isArchiveActive = false,
  selectedAdvocate,
  onSelectAdvocate,
  onCustomizePipeline,
  isCustomizingPipeline = false,
  viewMode = "list",
  onViewModeChange,
}: AdvocacyPipelineHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap pb-1">
      <div className="flex items-center gap-2.5">
        <h1 className="text-[22px] sm:text-[24px] font-serif font-bold text-[#FAF6EC] tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
          Pipeline
        </h1>
        <PageIdBadge id="PG-039" />
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {onSelectAdvocate && (
          <>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectAdvocate(undefined)}
                className={cn(
                  "w-8 h-8 rounded-full text-[11px] font-serif font-semibold flex items-center justify-center cursor-pointer",
                  !selectedAdvocate
                    ? "adm-pipe-avatar-active text-[#FFE8A8] z-10"
                    : "adm-pipe-avatar text-[#C8D6EA]"
                )}
                title="All Employees"
              >
                All
              </button>
              {ADVOCATE_ROSTER.slice(0, 4).map((adv) => {
                const isSelected =
                  selectedAdvocate?.toLowerCase() === adv.name.toLowerCase();
                return (
                  <button
                    key={adv.name}
                    type="button"
                    onClick={() =>
                      onSelectAdvocate(isSelected ? undefined : adv.name)
                    }
                    title={`Filter by ${adv.name}`}
                    className={cn(
                      "w-8 h-8 rounded-full text-[10.5px] font-serif font-semibold flex items-center justify-center cursor-pointer",
                      isSelected
                        ? "adm-pipe-avatar-active text-[#FFE8A8] z-10"
                        : "adm-pipe-avatar text-[#C8D6EA]"
                    )}
                  >
                    {adv.initials}
                  </button>
                );
              })}
            </div>
            <div className="h-5 w-px bg-gradient-to-b from-transparent via-[#c8b288]/40 to-transparent" />
          </>
        )}

        {onViewModeChange && (
          <div className="adm-pipe-pill flex items-center rounded-[9px] p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "h-7 w-7 rounded-[7px] flex items-center justify-center transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-[#1a3458] text-[#F4E6C0] border border-[#9cbce6]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                  : "text-[#9AB0CE] hover:text-[#FFF4D4] border border-transparent"
              )}
              title="Stage Case Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("board")}
              className={cn(
                "h-7 w-7 rounded-[7px] flex items-center justify-center transition-all cursor-pointer",
                viewMode === "board"
                  ? "bg-[#1a3458] text-[#F4E6C0] border border-[#9cbce6]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                  : "text-[#9AB0CE] hover:text-[#FFF4D4] border border-transparent"
              )}
              title="Stage Columns View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onViewArchive || onAddStage}
          className={cn(
            "adm-pipe-pill h-8 px-3.5 rounded-[9px] text-[12px] font-serif font-semibold inline-flex items-center gap-2 cursor-pointer",
            isArchiveActive
              ? "text-[#FFE8A8] ring-1 ring-[#F2CD80]/60"
              : "text-[#F6E9C8] hover:text-[#FFF8E4]"
          )}
          title="View Archived Cases"
        >
          <Archive className="h-3.5 w-3.5 text-[#E8C574]" />
          <span>View Archive</span>
        </button>
      </div>
    </div>
  );
}

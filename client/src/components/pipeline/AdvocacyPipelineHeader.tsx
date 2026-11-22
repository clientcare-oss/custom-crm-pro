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
        <h1 className="text-xl font-serif font-bold text-[#FFF4D4] tracking-tight">
          Advocacy Pipeline
        </h1>
        <PageIdBadge id="PG-039" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {onSelectAdvocate && (
          <>
            <div className="flex items-center -space-x-1">
              <button
                type="button"
                onClick={() => onSelectAdvocate(undefined)}
                className={cn(
                  "w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center border transition-all cursor-pointer",
                  !selectedAdvocate
                    ? "bg-[#153563] text-[#FFE394] border-[#F2CD80] z-10"
                    : "bg-[#0C1D3A] text-[#CBD5E1] border-[#2C446E] hover:text-[#FFF4D4]"
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
                      "w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center border transition-all cursor-pointer",
                      isSelected
                        ? "bg-[#C5A059] text-[#07162B] border-[#FFE394] z-10 scale-105"
                        : "bg-[#0C1D3A] text-[#CBD5E1] border-[#2C446E] hover:border-[#94A3B8] hover:text-[#FFF4D4]"
                    )}
                  >
                    {adv.initials}
                  </button>
                );
              })}
            </div>
            <div className="h-4 w-px bg-[#2C446E]" />
          </>
        )}

        {onViewModeChange && (
          <div className="flex items-center bg-[#0C1D3A] border border-[#2C446E] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                viewMode === "list"
                  ? "bg-[#17396B] text-[#FFE394]"
                  : "text-[#94A3B8] hover:text-[#FFF4D4]"
              )}
              title="Stage Case Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("board")}
              className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                viewMode === "board"
                  ? "bg-[#17396B] text-[#FFE394]"
                  : "text-[#94A3B8] hover:text-[#FFF4D4]"
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
            "h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border",
            isArchiveActive
              ? "bg-[#C5A059] text-[#07162B] border-[#FFE394]"
              : "bg-[#0C1D3A] hover:bg-[#132E57] text-[#FFE394] border-[#2C446E] hover:border-[#C5A059]/70"
          )}
          title="View Archived Cases"
        >
          <Archive
            className={cn(
              "h-3.5 w-3.5",
              isArchiveActive ? "text-[#07162B]" : "text-[#F2CD80]"
            )}
          />
          <span>View Archive</span>
        </button>
      </div>
    </div>
  );
}

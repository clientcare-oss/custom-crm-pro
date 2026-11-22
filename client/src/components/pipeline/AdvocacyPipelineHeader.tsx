import React from "react";
import { Archive } from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import { cn } from "@/lib/utils";

interface AdvocacyPipelineHeaderProps {
  onAddStage?: () => void;
  onViewArchive?: () => void;
  isArchiveActive?: boolean;
}

export function AdvocacyPipelineHeader({
  onAddStage,
  onViewArchive,
  isArchiveActive = false,
}: AdvocacyPipelineHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 pb-1">
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl font-serif font-bold text-[#FFF4D4] tracking-tight">
          Advocacy Pipeline
        </h1>
        <PageIdBadge id="PG-039" />
      </div>

      <button
        type="button"
        onClick={onViewArchive || onAddStage}
        className={cn(
          "h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border",
          isArchiveActive
            ? "bg-[#C5A059] text-[#07162B] border-[#FFE394] shadow-xs"
            : "bg-[#0A192F] hover:bg-[#102B4E] text-[#FFE394] border-[#233554] hover:border-[#C5A059]/60"
        )}
        title="View Archived Cases"
      >
        <Archive
          className={cn(
            "h-3.5 w-3.5",
            isArchiveActive ? "text-[#07162B]" : "text-[#C5A059]"
          )}
        />
        <span>View Archive</span>
      </button>
    </div>
  );
}

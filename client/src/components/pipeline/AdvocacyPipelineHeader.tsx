import React from "react";
import { Plus } from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";

interface AdvocacyPipelineHeaderProps {
  onAddStage: () => void;
}

export function AdvocacyPipelineHeader({
  onAddStage,
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
        onClick={onAddStage}
        className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-[#0A192F] hover:bg-[#102B4E] text-[#FFE394] border border-[#233554] hover:border-[#C5A059]/60 inline-flex items-center gap-1 transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5 text-[#C5A059]" />
        <span>New Stage</span>
      </button>
    </div>
  );
}

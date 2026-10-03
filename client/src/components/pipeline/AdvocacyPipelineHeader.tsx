import React from "react";
import { Button } from "@/components/ui/button";
import { Settings2, Plus, Workflow } from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";

interface AdvocacyPipelineHeaderProps {
  onCustomizePipeline: () => void;
  onAddStage: () => void;
}

export function AdvocacyPipelineHeader({
  onCustomizePipeline,
  onAddStage,
}: AdvocacyPipelineHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3A2C18]">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] shadow-md shadow-black/40 shrink-0">
          <Workflow className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] tracking-wide">
              Advocacy Pipeline
            </h1>
            <PageIdBadge id="PG-039" />
          </div>
          <p className="text-xs sm:text-sm text-[#C6B697] mt-0.5">
            Interactive Kanban-style case management tracking each family through the advocacy journey.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCustomizePipeline}
          className="h-9 px-3.5 text-xs font-semibold border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] cursor-pointer rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Settings2 className="h-3.5 w-3.5 text-[#FFE394]" />
          <span>Customize Pipeline</span>
        </Button>

        <Button
          size="sm"
          onClick={onAddStage}
          className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer rounded-xl inline-flex items-center gap-1.5 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Stage</span>
        </Button>
      </div>
    </div>
  );
}

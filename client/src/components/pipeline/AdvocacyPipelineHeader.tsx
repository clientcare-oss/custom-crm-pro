import React from "react";
import { Button } from "@/components/ui/button";
import { Settings2, Plus, SlidersHorizontal, Sparkles } from "lucide-react";

interface AdvocacyPipelineHeaderProps {
  onCustomizePipeline: () => void;
  onAddStage: () => void;
  onNewView: () => void;
}

export function AdvocacyPipelineHeader({
  onCustomizePipeline,
  onAddStage,
  onNewView,
}: AdvocacyPipelineHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#0D366B]/50">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
            Advocacy Pipeline
          </h1>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0F2342] border border-[#F5B544]/30 text-[#F5B544]">
            PG-039
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300">
          Track each family through the advocacy process.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onCustomizePipeline}
          className="h-9 px-3.5 text-xs font-semibold border-[#0E3A73] bg-[#071F42] text-slate-200 hover:text-white hover:bg-[#0A2954] cursor-pointer rounded-lg inline-flex items-center gap-2 shadow-xs transition-all"
        >
          <Settings2 className="h-4 w-4 text-sky-400" />
          <span>Customize Pipeline</span>
        </Button>

        <Button
          size="sm"
          onClick={onAddStage}
          className="h-9 px-4 text-xs font-bold bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 cursor-pointer rounded-lg inline-flex items-center gap-1.5 shadow-md transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add Stage</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onNewView}
          className="h-9 px-3.5 text-xs font-semibold border-[#0E3A73] bg-[#071F42] text-slate-200 hover:text-white hover:bg-[#0A2954] cursor-pointer rounded-lg inline-flex items-center gap-1.5 shadow-xs transition-all"
        >
          <Plus className="h-3.5 w-3.5 text-[#F5B544]" />
          <span>New View</span>
        </Button>
      </div>
    </div>
  );
}

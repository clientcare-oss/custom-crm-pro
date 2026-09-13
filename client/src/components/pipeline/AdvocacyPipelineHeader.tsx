import React from "react";
import { Button } from "@/components/ui/button";
import { Settings2, Plus } from "lucide-react";

interface AdvocacyPipelineHeaderProps {
  onCustomizePipeline: () => void;
  onAddStage: () => void;
}

export function AdvocacyPipelineHeader({
  onCustomizePipeline,
  onAddStage,
}: AdvocacyPipelineHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#0D366B]/40">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
            Advocacy Pipeline
          </h1>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0F2342] border border-[#F5B544]/30 text-[#F5B544]">
            PG-039
          </span>
        </div>
        <p className="text-xs text-slate-300">
          Track each family through the advocacy process.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCustomizePipeline}
          className="h-8 px-3 text-xs font-semibold border-[#0E3A73] bg-[#071F42] text-slate-200 hover:text-white hover:bg-[#0A2954] cursor-pointer rounded-lg inline-flex items-center gap-1.5 shadow-xs transition-all"
        >
          <Settings2 className="h-3.5 w-3.5 text-sky-400" />
          <span>Customize Pipeline</span>
        </Button>

        <Button
          size="sm"
          onClick={onAddStage}
          className="h-8 px-3.5 text-xs font-bold bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 cursor-pointer rounded-lg inline-flex items-center gap-1.5 shadow-md transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Stage</span>
        </Button>
      </div>
    </div>
  );
}

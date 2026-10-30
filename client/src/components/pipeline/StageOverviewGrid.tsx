import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Compass, Briefcase, Layers } from "lucide-react";
import type { PipelineStageItem, PipelineCardItem, PipelineGroupType } from "./types";

interface StageOverviewGridProps {
  stages: PipelineStageItem[];
  cards: PipelineCardItem[];
  activeGroupFilter: "all" | PipelineGroupType;
  selectedStageName: string | null;
  onSelectGroup: (group: "all" | PipelineGroupType) => void;
  onSelectStage: (stageName: string | null) => void;
  onDropCardOnStage?: (cardId: number, targetStageName: string) => void;
}

export function StageOverviewGrid({
  stages,
  cards,
  activeGroupFilter,
  selectedStageName,
  onSelectGroup,
  onSelectStage,
  onDropCardOnStage,
}: StageOverviewGridProps) {
  const [dragOverStageName, setDragOverStageName] = useState<string | null>(null);

  const activeStages = stages
    .filter((s) => !s.isArchived)
    .sort((a, b) => a.order - b.order);

  // Compute accurate counts per stage from filtered cards
  const countByStage = new Map<string, number>();
  for (const c of cards) {
    const k = (c.pipelineStage || "Discovery").toLowerCase();
    countByStage.set(k, (countByStage.get(k) || 0) + 1);
  }

  const opportunityStages = activeStages.filter(
    (s) => (s.pipelineGroup || (s.category === "opportunity" ? "opportunity" : "active_project")) === "opportunity"
  );
  const projectStages = activeStages.filter(
    (s) => (s.pipelineGroup || (s.category === "opportunity" ? "opportunity" : "active_project")) !== "opportunity"
  );

  const opportunityCount = opportunityStages.reduce(
    (sum, s) => sum + (countByStage.get(s.name.toLowerCase()) || 0),
    0
  );
  const projectCount = projectStages.reduce(
    (sum, s) => sum + (countByStage.get(s.name.toLowerCase()) || 0),
    0
  );

  const visibleStages =
    activeGroupFilter === "opportunity"
      ? opportunityStages
      : activeGroupFilter === "active_project"
        ? projectStages
        : activeStages;

  const handleDragOverTile = (e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStageName !== stageName) {
      setDragOverStageName(stageName);
    }
  };

  const handleDropOnTile = (e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    setDragOverStageName(null);
    const cardIdStr = e.dataTransfer.getData("text/plain");
    const cardId = Number(cardIdStr);
    if (cardId && onDropCardOnStage) {
      onDropCardOnStage(cardId, stageName);
    }
  };

  return (
    <div className="rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] p-3 space-y-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
      {/* Top Group Selector Header (Opportunities vs Active Advocacy Projects — No Horizontal Scroll) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              onSelectGroup("all");
              onSelectStage(null);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border",
              activeGroupFilter === "all" && !selectedStageName
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]/60 shadow-xs"
                : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] hover:border-[#C5A059]/60"
            )}
          >
            <Layers className="h-3 w-3" />
            <span>All Pipeline Stages</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                activeGroupFilter === "all" && !selectedStageName
                  ? "bg-[#07162B] text-[#FFE394]"
                  : "bg-[#05142B] text-[#A69371]"
              )}
            >
              {cards.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectGroup("opportunity");
              onSelectStage(null);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border",
              activeGroupFilter === "opportunity"
                ? "bg-[#1A1238] border-[#A78BFA] text-[#E9D5FF] shadow-[0_0_10px_rgba(167,139,250,0.25)]"
                : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] hover:border-[#A78BFA]/50"
            )}
          >
            <Compass className="h-3 w-3 text-[#A78BFA]" />
            <span>Opportunities</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#020A17] border border-[#3A2C18] text-[#C084FC]">
              {opportunityCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectGroup("active_project");
              onSelectStage(null);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border",
              activeGroupFilter === "active_project"
                ? "bg-[#04241B] border-[#34D399] text-[#A7F3D0] shadow-[0_0_10px_rgba(52,211,153,0.25)]"
                : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] hover:border-[#34D399]/50"
            )}
          >
            <Briefcase className="h-3 w-3 text-[#34D399]" />
            <span>Projects / Active Advocacy</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#020A17] border border-[#3A2C18] text-[#34D399]">
              {projectCount}
            </span>
          </button>
        </div>

        {selectedStageName && (
          <button
            type="button"
            onClick={() => onSelectStage(null)}
            className="text-[11px] font-semibold text-[#FFE394] hover:underline cursor-pointer"
          >
            Showing Stage: {selectedStageName} (Click to Show All)
          </button>
        )}
      </div>

      {/* Responsive Wrapping Stage Overview Grid (Zero Horizontal Scrollbar at 100% Zoom) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-1.5">
        {/* "All" Summary Card (matches HoneyBook left-most dark summary tile) */}
        <button
          type="button"
          onClick={() => onSelectStage(null)}
          className={cn(
            "rounded-xl p-2 text-left transition-all cursor-pointer border flex flex-col justify-between min-h-[58px]",
            !selectedStageName
              ? "bg-gradient-to-br from-[#102B4E] to-[#05142B] border-[#C5A059] text-[#FFF4D4] shadow-[0_0_12px_rgba(197,160,89,0.25)]"
              : "bg-[#020A17]/90 border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
          )}
        >
          <span className="text-base font-serif font-bold text-[#FFE394] leading-none">
            {activeGroupFilter === "opportunity"
              ? opportunityCount
              : activeGroupFilter === "active_project"
                ? projectCount
                : cards.length}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider truncate mt-1">
            {activeGroupFilter === "opportunity"
              ? "All Opps"
              : activeGroupFilter === "active_project"
                ? "All Projects"
                : "All Cases"}
          </span>
        </button>

        {/* Individual Stage Tiles */}
        {visibleStages.map((stage) => {
          const count = countByStage.get(stage.name.toLowerCase()) || 0;
          const isSelected =
            selectedStageName?.toLowerCase() === stage.name.toLowerCase();
          const isDragOver = dragOverStageName === stage.name;
          const isOpportunity =
            (stage.pipelineGroup ||
              (stage.category === "opportunity" ? "opportunity" : "active_project")) ===
            "opportunity";

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() =>
                onSelectStage(isSelected ? null : stage.name)
              }
              onDragOver={(e) => handleDragOverTile(e, stage.name)}
              onDragLeave={() => setDragOverStageName(null)}
              onDrop={(e) => handleDropOnTile(e, stage.name)}
              title={`${stage.name} (${count} ${count === 1 ? "case" : "cases"}) — Click to focus or drop a card here`}
              className={cn(
                "rounded-xl p-2 text-left transition-all cursor-pointer border flex flex-col justify-between min-h-[58px] relative overflow-hidden group",
                isSelected
                  ? "bg-[#07162B] border-[#C5A059] text-[#FFF4D4] ring-1 ring-[#FFE394]/50 shadow-[0_0_12px_rgba(197,160,89,0.3)]"
                  : isDragOver
                    ? "bg-[#102B4E] border-[#FFE394] text-[#FFF4D4] scale-[1.02]"
                    : "bg-[#020A17]/80 hover:bg-[#07162B] border-[#3A2C18]/90 hover:border-[#C5A059]/60 text-[#C6B697] hover:text-[#FFF4D4]"
              )}
            >
              {/* Top Color Bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: stage.accentColor || "#C5A059" }}
              />

              <div className="flex items-center justify-between gap-1 pt-0.5 w-full">
                <span
                  className={cn(
                    "text-sm font-serif font-bold leading-none",
                    count > 0 ? "text-[#FFF4D4]" : "text-[#A69371]/70"
                  )}
                >
                  {count}
                </span>
                <span
                  className={cn(
                    "text-[8px] font-bold uppercase px-1 py-0.2 rounded",
                    isOpportunity
                      ? "bg-[#1A1238] text-[#C084FC]"
                      : "bg-[#04241B] text-[#34D399]"
                  )}
                >
                  {isOpportunity ? "Opp" : "Proj"}
                </span>
              </div>

              <span className="text-[10px] font-medium leading-tight line-clamp-1 mt-1 text-[#D8C7A5] group-hover:text-[#FFF4D4]">
                {stage.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


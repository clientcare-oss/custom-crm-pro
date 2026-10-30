import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  LOGICAL_STAGE_GROUPS,
  resolveLogicalStageGroup,
  resolveCaseActionStatus,
} from "./pipelineDefaults";
import type {
  PipelineStageItem,
  PipelineCardItem,
} from "./types";

interface StageOverviewGridProps {
  stages: PipelineStageItem[];
  cards: PipelineCardItem[];
  selectedStageName: string | null;
  onSelectStage: (stageName: string | null) => void;
  onDropCardOnStage?: (cardId: number, targetStageName: string) => void;
}

export function StageOverviewGrid({
  stages,
  cards,
  selectedStageName,
  onSelectStage,
  onDropCardOnStage,
}: StageOverviewGridProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const stageRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [dragOverStageName, setDragOverStageName] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Click-and-drag horizontal rail scrolling state
  const isPointerDownRef = useRef(false);
  const didDragRailRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const activeStages = stages
    .filter((s) => !s.isArchived)
    .sort((a, b) => a.order - b.order);

  // Compute accurate counts & overdue counts per stage from filtered cards
  const countByStage = new Map<string, number>();
  const overdueByStage = new Map<string, number>();

  for (const c of cards) {
    const k = (c.pipelineStage || "Discovery").toLowerCase();
    countByStage.set(k, (countByStage.get(k) || 0) + 1);
    const statusMeta = resolveCaseActionStatus(c);
    if (statusMeta.isOverdue || c.needsAttention) {
      overdueByStage.set(k, (overdueByStage.get(k) || 0) + 1);
    }
  }

  const updateScrollIndicators = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollIndicators();
    window.addEventListener("resize", updateScrollIndicators);
    return () => window.removeEventListener("resize", updateScrollIndicators);
  }, [updateScrollIndicators, activeStages.length]);

  // Automatically scroll selected stage into view when selected or restored
  useEffect(() => {
    const key = selectedStageName ? selectedStageName.toLowerCase() : "__all__";
    const targetEl = stageRefs.current[key];
    if (targetEl && railRef.current) {
      targetEl.scrollIntoView({
        behavior: "smooth",
        inline: "nearest",
        block: "nearest",
      });
    }
  }, [selectedStageName]);

  const scrollByAmount = (delta: number) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  // Support Shift + wheel and vertical wheel inside rail for smooth horizontal scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = railRef.current;
    if (!el) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // native trackpad horizontal gesture
    if (e.shiftKey || el.scrollWidth > el.clientWidth) {
      el.scrollLeft += e.deltaY;
      updateScrollIndicators();
    }
  };

  // Click-and-drag scrolling on the stage rail
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !railRef.current) return;
    isPointerDownRef.current = true;
    didDragRailRef.current = false;
    startXRef.current = e.pageX - railRef.current.offsetLeft;
    scrollLeftStartRef.current = railRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || !railRef.current) return;
    const x = e.pageX - railRef.current.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 6) {
      didDragRailRef.current = true;
      railRef.current.scrollLeft = scrollLeftStartRef.current - walk;
      updateScrollIndicators();
    }
  };

  const handleMouseUpOrLeave = () => {
    isPointerDownRef.current = false;
  };

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
    <div className="relative w-full max-w-full select-none pt-0.5 pb-1">
      {/* Subtle Left Edge Scroll Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-360)}
          aria-label="Scroll stages left"
          className="absolute left-0 top-[44px] z-20 h-14 w-6 rounded-r-lg bg-[#051024]/95 hover:bg-[#0D1E38] border border-l-0 border-[#233554] text-[#CBD5E1] hover:text-[#FFF4D4] flex items-center justify-center shadow-lg transition-opacity cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Subtle Right Edge Scroll Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(360)}
          aria-label="Scroll stages right"
          className="absolute right-0 top-[44px] z-20 h-14 w-6 rounded-l-lg bg-[#051024]/95 hover:bg-[#0D1E38] border border-r-0 border-[#233554] text-[#CBD5E1] hover:text-[#FFF4D4] flex items-center justify-center shadow-lg transition-opacity cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* ONE Continuous Horizontal Stage Rail (Never wraps onto a second row) */}
      <div
        ref={railRef}
        onScroll={updateScrollIndicators}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="flex flex-nowrap items-end gap-1.5 w-full max-w-full overflow-x-auto pb-2 scroll-smooth"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#233554 #050E1D",
        }}
      >
        {/* 1. Left-Most "All" Summary Segment (Matches HoneyBook's dark "All" block) */}
        <div className="shrink-0 w-[116px] sm:w-[124px] flex flex-col justify-end">
          <div className="h-5 mb-1" />
          <button
            ref={(el) => {
              stageRefs.current["__all__"] = el;
            }}
            type="button"
            onClick={() => {
              if (didDragRailRef.current) return;
              onSelectStage(null);
            }}
            className={cn(
              "w-full h-[76px] rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer border flex flex-col justify-between relative overflow-hidden",
              !selectedStageName
                ? "bg-[#0D2142] border-[#C5A059] text-[#FFF4D4] shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
                : "bg-[#051022] hover:bg-[#0A192F] border-[#1E2E48] text-[#94A3B8] hover:text-[#FFF4D4]"
            )}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                backgroundColor: !selectedStageName ? "#C5A059" : "#334155",
              }}
            />
            <span className="text-xl font-semibold tracking-tight text-[#FFF4D4] leading-none pt-0.5">
              {cards.length}
            </span>
            <span className="text-xs font-medium text-[#CBD5E1] truncate">
              All
            </span>
          </button>
        </div>

        {/* 2. Connected Individual Stage Segments in One Horizontal Sequence */}
        {activeStages.map((stage, idx) => {
          const count = countByStage.get(stage.name.toLowerCase()) || 0;
          const overdueCount = overdueByStage.get(stage.name.toLowerCase()) || 0;
          const isSelected =
            selectedStageName?.toLowerCase() === stage.name.toLowerCase();
          const isDragOver = dragOverStageName === stage.name;

          const logicalGroup = resolveLogicalStageGroup(
            stage.name,
            stage.category,
            stage.logicalGroup
          );
          const groupMeta = LOGICAL_STAGE_GROUPS.find(
            (g) => g.key === logicalGroup
          );

          // Show subtle non-interactive group label above the first stage of each contiguous group
          const prevStage = idx > 0 ? activeStages[idx - 1] : null;
          const prevLogicalGroup = prevStage
            ? resolveLogicalStageGroup(
                prevStage.name,
                prevStage.category,
                prevStage.logicalGroup
              )
            : null;
          const isFirstInLogicalGroup = logicalGroup !== prevLogicalGroup;

          const topBarColor =
            stage.accentColor || groupMeta?.barColor || "#60A5FA";

          return (
            <div
              key={stage.id}
              className="shrink-0 w-[132px] sm:w-[142px] flex flex-col justify-end"
            >
              {/* Subtle Non-Interactive Group Label Above First Stage in Group */}
              <div className="h-5 mb-1 flex items-center">
                {isFirstInLogicalGroup && groupMeta ? (
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded border truncate",
                      groupMeta.badgeClass
                    )}
                  >
                    {groupMeta.shortLabel}
                  </span>
                ) : null}
              </div>

              <button
                ref={(el) => {
                  stageRefs.current[stage.name.toLowerCase()] = el;
                }}
                type="button"
                onClick={() => {
                  if (didDragRailRef.current) return;
                  onSelectStage(isSelected ? null : stage.name);
                }}
                onDragOver={(e) => handleDragOverTile(e, stage.name)}
                onDragLeave={() => setDragOverStageName(null)}
                onDrop={(e) => handleDropOnTile(e, stage.name)}
                title={`${stage.name} (${count} ${count === 1 ? "case" : "cases"})`}
                className={cn(
                  "w-full h-[76px] rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer border flex flex-col justify-between relative overflow-hidden group",
                  isSelected
                    ? "bg-[#0D2142] border-[#C5A059] text-[#FFF4D4] shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
                    : isDragOver
                      ? "bg-[#102B4E] border-[#C5A059]/80 text-[#FFF4D4]"
                      : "bg-[#071326] hover:bg-[#0B1C36] border-[#1A2942] hover:border-[#2C4268] text-[#CBD5E1]"
                )}
              >
                {/* Thin Top Colored Border */}
                <div
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ backgroundColor: topBarColor }}
                />

                {/* Top Row: Prominent Count + Restrained Overdue Indicator + Subtle Progression Chevron */}
                <div className="flex items-center justify-between w-full pt-0.5">
                  <span
                    className={cn(
                      "text-xl font-semibold tracking-tight leading-none",
                      isSelected
                        ? "text-[#FFE394]"
                        : count > 0
                          ? "text-[#FFF4D4]"
                          : "text-[#64748B]"
                    )}
                  >
                    {count}
                  </span>

                  <div className="flex items-center gap-1">
                    {overdueCount > 0 && (
                      <span
                        className="w-2 h-2 rounded-full bg-rose-400 shrink-0"
                        title={`${overdueCount} case(s) need attention`}
                      />
                    )}
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 transition-transform group-hover:translate-x-0.5",
                        isSelected ? "text-[#C5A059]" : "text-[#334155]"
                      )}
                    />
                  </div>
                </div>

                {/* Bottom Row: Short Stage Name */}
                <span
                  className={cn(
                    "text-[11px] leading-snug line-clamp-2",
                    isSelected
                      ? "text-[#FFF4D4] font-semibold"
                      : count > 0
                        ? "text-[#CBD5E1] group-hover:text-[#FFF4D4]"
                        : "text-[#64748B] group-hover:text-[#94A3B8]"
                  )}
                >
                  {stage.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

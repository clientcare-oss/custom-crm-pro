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

interface StageJewelPalette {
  bg: string;
  selectedBg: string;
  border: string;
  topBar: string;
  text: string;
  countText: string;
}

/**
 * Waypoint Admiralty Jewel & Brass palette for pipeline stage tiles,
 * matching the rich jewel-toned Company Tags palette.
 */
const STAGE_JEWEL_PALETTES: StageJewelPalette[] = [
  // 0: SeaGlass Teal (Discovery)
  {
    bg: "linear-gradient(180deg, #10495C 0%, #0A313F 100%)",
    selectedBg: "linear-gradient(180deg, #17647D 0%, #0E4254 100%)",
    border: "#2B8CA3",
    topBar: "#38BDF8",
    text: "#B6F0FA",
    countText: "#E6FAFF",
  },
  // 1: Imperial Amethyst (Free Session)
  {
    bg: "linear-gradient(180deg, #321E61 0%, #211342 100%)",
    selectedBg: "linear-gradient(180deg, #452A85 0%, #2C1A57 100%)",
    border: "#7D56C9",
    topBar: "#A78BFA",
    text: "#E5D4FF",
    countText: "#F5EEFF",
  },
  // 2: Burgundy Plum (Proposal)
  {
    bg: "linear-gradient(180deg, #4D1940 0%, #33102B 100%)",
    selectedBg: "linear-gradient(180deg, #692257 0%, #451639 100%)",
    border: "#A34187",
    topBar: "#E879F9",
    text: "#FAD1E8",
    countText: "#FFEBF6",
  },
  // 3: Admiralty Cobalt (2-Week Follow-Up)
  {
    bg: "linear-gradient(180deg, #153769 0%, #0D2345 100%)",
    selectedBg: "linear-gradient(180deg, #1E4C8F 0%, #13315E 100%)",
    border: "#3E79C9",
    topBar: "#60A5FA",
    text: "#C7E0FF",
    countText: "#EDF5FF",
  },
  // 4: Royal Indigo (30-Day Follow-Up)
  {
    bg: "linear-gradient(180deg, #1E2966 0%, #131B45 100%)",
    selectedBg: "linear-gradient(180deg, #29388A 0%, #1A245C 100%)",
    border: "#586DD4",
    topBar: "#818CF8",
    text: "#D6E0FF",
    countText: "#F0F4FF",
  },
  // 5: Burnished Copper (60-Day Follow-Up / School Contact)
  {
    bg: "linear-gradient(180deg, #54290F 0%, #381B0A 100%)",
    selectedBg: "linear-gradient(180deg, #703714 0%, #4A240D 100%)",
    border: "#C26D2E",
    topBar: "#FB923C",
    text: "#FFE0BA",
    countText: "#FFF2E2",
  },
  // 6: Crimson Garnet (Reconnect Review / State Complaint)
  {
    bg: "linear-gradient(180deg, #571820 0%, #3B1015 100%)",
    selectedBg: "linear-gradient(180deg, #75202B 0%, #4F151C 100%)",
    border: "#BD3E4B",
    topBar: "#F87171",
    text: "#FFD1D6",
    countText: "#FFECEE",
  },
  // 7: Emerald Forest (Intake / Onboarding / Monitoring)
  {
    bg: "linear-gradient(180deg, #114A3A 0%, #0B3026 100%)",
    selectedBg: "linear-gradient(180deg, #18634E 0%, #0F4234 100%)",
    border: "#2E8B6D",
    topBar: "#34D399",
    text: "#B8F5D8",
    countText: "#E8FDF3",
  },
  // 8: Sovereign Brass (Records Review / Renewal)
  {
    bg: "linear-gradient(180deg, #4A340F 0%, #30220A 100%)",
    selectedBg: "linear-gradient(180deg, #634614 0%, #422F0D 100%)",
    border: "#C5A059",
    topBar: "#FBBF24",
    text: "#FFE394",
    countText: "#FFF6D6",
  },
  // 9: Aged Parchment (Archive / Closed)
  {
    bg: "linear-gradient(180deg, #382C20 0%, #241C14 100%)",
    selectedBg: "linear-gradient(180deg, #4D3C2B 0%, #33281D 100%)",
    border: "#8F7556",
    topBar: "#D4B895",
    text: "#EADBC6",
    countText: "#F7EFE4",
  },
];

function resolveStageJewelPalette(stageName: string, idx: number): StageJewelPalette {
  const lower = (stageName || "").toLowerCase();
  if (lower.includes("discovery") || lower.includes("upload")) return STAGE_JEWEL_PALETTES[0];
  if (lower.includes("free session") || lower.includes("meeting")) return STAGE_JEWEL_PALETTES[1];
  if (lower.includes("proposal")) return STAGE_JEWEL_PALETTES[2];
  if (lower.includes("2-week")) return STAGE_JEWEL_PALETTES[3];
  if (lower.includes("30-day")) return STAGE_JEWEL_PALETTES[4];
  if (lower.includes("60-day") || lower.includes("school")) return STAGE_JEWEL_PALETTES[5];
  if (lower.includes("reconnect") || lower.includes("complaint") || lower.includes("due process")) return STAGE_JEWEL_PALETTES[6];
  if (lower.includes("intake") || lower.includes("onboarding") || lower.includes("billing") || lower.includes("monitoring")) return STAGE_JEWEL_PALETTES[7];
  if (lower.includes("records") || lower.includes("renewal") || lower.includes("draft")) return STAGE_JEWEL_PALETTES[8];
  if (lower.includes("closed") || lower.includes("archiv")) return STAGE_JEWEL_PALETTES[9];
  return STAGE_JEWEL_PALETTES[idx % STAGE_JEWEL_PALETTES.length];
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="flex flex-nowrap items-end gap-1.5 w-full max-w-full overflow-x-auto pb-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#233554 #050E1D",
        }}
      >
        {/* 1. Left-Most "All" Summary Segment (Sovereign Brass Jewel Fill) */}
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
            style={{
              background: !selectedStageName
                ? "linear-gradient(180deg, #523A12 0%, #33230A 100%)"
                : "linear-gradient(180deg, #3B2A0C 0%, #241907 100%)",
              borderColor: !selectedStageName ? "#F2CD80" : "#C5A059",
            }}
            className={cn(
              "w-full h-[76px] rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer border flex flex-col justify-between relative overflow-hidden hover:brightness-110",
              !selectedStageName
                ? "shadow-[0_4px_16px_rgba(197,160,89,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] ring-1 ring-[#FFE394]/50"
                : "shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
            )}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[3.5px]"
              style={{
                backgroundColor: "#F2CD80",
              }}
            />
            <span className="text-xl font-bold tracking-tight text-[#FFF4D4] leading-none pt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              {cards.length}
            </span>
            <span className="text-xs font-semibold text-[#FFE394] truncate">
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

          const jewel = resolveStageJewelPalette(stage.name, idx);
          const topBarColor = stage.accentColor || jewel.topBar;

          return (
            <div
              key={stage.id}
              className="shrink-0 w-[132px] sm:w-[142px] flex flex-col justify-end"
            >
              {/* Group Label Above First Stage in Group */}
              <div className="h-5 mb-1 flex items-center">
                {isFirstInLogicalGroup && groupMeta ? (
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-0.5 rounded-md border truncate shadow-xs",
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
                style={{
                  background: isSelected || isDragOver ? jewel.selectedBg : jewel.bg,
                  borderColor: isSelected ? "#F2CD80" : jewel.border,
                }}
                className={cn(
                  "w-full h-[76px] rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer border flex flex-col justify-between relative overflow-hidden group hover:brightness-115",
                  isSelected
                    ? "shadow-[0_4px_16px_rgba(197,160,89,0.35),inset_0_1px_1px_rgba(255,255,255,0.22)] ring-1 ring-[#FFE394]/60"
                    : "shadow-[0_3px_10px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.1)]"
                )}
              >
                {/* Top Colored Accent Bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-[3.5px]"
                  style={{ backgroundColor: topBarColor }}
                />

                {/* Top Row: Prominent Count + Overdue Indicator + Progression Chevron */}
                <div className="flex items-center justify-between w-full pt-0.5">
                  <span
                    style={{
                      color: isSelected
                        ? "#FFE394"
                        : count > 0
                          ? jewel.countText
                          : jewel.text,
                    }}
                    className={cn(
                      "text-xl font-bold tracking-tight leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]",
                      count === 0 && !isSelected && "opacity-75"
                    )}
                  >
                    {count}
                  </span>

                  <div className="flex items-center gap-1">
                    {overdueCount > 0 && (
                      <span
                        className="w-2 h-2 rounded-full bg-rose-400 shrink-0 shadow-[0_0_6px_rgba(251,113,133,0.8)]"
                        title={`${overdueCount} case(s) need attention`}
                      />
                    )}
                    <ChevronRight
                      style={{ color: isSelected ? "#FFE394" : jewel.text }}
                      className="h-3.5 w-3.5 opacity-75 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </div>

                {/* Bottom Row: Short Stage Name */}
                <span
                  style={{
                    color: isSelected ? "#FFF4D4" : jewel.text,
                  }}
                  className={cn(
                    "text-[11px] font-semibold leading-snug line-clamp-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]",
                    isSelected && "font-bold"
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

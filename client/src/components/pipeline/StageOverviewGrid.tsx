import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  Check,
  X,
} from "lucide-react";
import {
  LOGICAL_STAGE_GROUPS,
  resolveLogicalStageGroup,
  resolveCaseActionStatus,
} from "./pipelineDefaults";
import type {
  PipelineStageItem,
  PipelineCardItem,
  LogicalStageGroup,
} from "./types";

interface StageOverviewGridProps {
  stages: PipelineStageItem[];
  cards: PipelineCardItem[];
  selectedStageName: string | null;
  onSelectStage: (stageName: string | null) => void;
  onDropCardOnStage?: (cardId: number, targetStageName: string) => void;
  isCustomizingOrder?: boolean;
  onToggleCustomizingOrder?: () => void;
  onReorderStages?: (draggedStageId: number, targetStageId: number) => void;
  onInsertStageAtOrder?: (
    insertOrder: number,
    inlineStageData?: Partial<PipelineStageItem>
  ) => void;
  onAssignStageGroup?: (
    stageId: number,
    logicalGroup: LogicalStageGroup
  ) => void;
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
  // 10: Obsidian Bloodstone (Blacklisted)
  {
    bg: "linear-gradient(180deg, #2B0910 0%, #140307 100%)",
    selectedBg: "linear-gradient(180deg, #3F0D17 0%, #22060C 100%)",
    border: "#881337",
    topBar: "#E11D48",
    text: "#FDA4AF",
    countText: "#FFE4E6",
  },
];

function resolveStageJewelPalette(stageName: string, idx: number): StageJewelPalette {
  const lower = (stageName || "").toLowerCase();
  if (lower.includes("blacklist") || lower.includes("do not serve")) return STAGE_JEWEL_PALETTES[10];
  if (lower.includes("30 days past due")) return STAGE_JEWEL_PALETTES[5];
  if (lower.includes("60 days past due") || lower.includes("90 days past due")) return STAGE_JEWEL_PALETTES[6];
  if (lower.includes("discovery") || lower.includes("upload")) return STAGE_JEWEL_PALETTES[0];
  if (lower.includes("free session") || lower.includes("meeting")) return STAGE_JEWEL_PALETTES[1];
  if (lower.includes("proposal")) return STAGE_JEWEL_PALETTES[2];
  if (lower.includes("2-week")) return STAGE_JEWEL_PALETTES[3];
  if (lower.includes("30-day")) return STAGE_JEWEL_PALETTES[4];
  if (lower.includes("60-day") || lower.includes("school")) return STAGE_JEWEL_PALETTES[5];
  if (
    lower.includes("needs attention") ||
    lower.includes("attention") ||
    lower.includes("reconnect") ||
    lower.includes("complaint") ||
    lower.includes("due process")
  )
    return STAGE_JEWEL_PALETTES[6];
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
  isCustomizingOrder = false,
  onToggleCustomizingOrder,
  onReorderStages,
  onInsertStageAtOrder,
  onAssignStageGroup,
}: StageOverviewGridProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const stageRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [dragOverStageName, setDragOverStageName] = useState<string | null>(null);
  const [draggedStageId, setDraggedStageId] = useState<number | null>(null);
  const [hoveredAddSlotAfterIdx, setHoveredAddSlotAfterIdx] = useState<number | null>(null);
  const [inlineDraftAfterIdx, setInlineDraftAfterIdx] = useState<{
    afterIdx: number;
    insertOrder: number;
    groupKey: string;
    accentColor: string;
  } | null>(null);
  const [inlineDraftName, setInlineDraftName] = useState("");
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedGroupBubbleKey, setSelectedGroupBubbleKey] =
    useState<LogicalStageGroup | null>(null);
  const [dropGapSlot, setDropGapSlot] = useState<{
    targetStageId: number;
    side: "before" | "after";
  } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Reset selected group bubble and inline draft when exiting customize mode
  useEffect(() => {
    if (!isCustomizingOrder) {
      setSelectedGroupBubbleKey(null);
      setInlineDraftAfterIdx(null);
      setInlineDraftName("");
    }
  }, [isCustomizingOrder]);

  useEffect(() => {
    if (inlineDraftAfterIdx) {
      setTimeout(() => inlineInputRef.current?.focus(), 40);
    }
  }, [inlineDraftAfterIdx]);

  // Click-and-drag horizontal rail scrolling state
  const isPointerDownRef = useRef(false);
  const didDragRailRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const activeStages = stages
    .filter((s) => !s.isArchived)
    .sort((a, b) => a.order - b.order);

  // Group contiguous active stages by their logical stage group so we can render a spanning bracket header above each group
  const stageGroupRuns = React.useMemo(() => {
    const runs: {
      groupKey: string;
      groupMeta: (typeof LOGICAL_STAGE_GROUPS)[number] | undefined;
      items: { stage: PipelineStageItem; globalIdx: number }[];
    }[] = [];

    activeStages.forEach((stage, globalIdx) => {
      const logicalGroup = resolveLogicalStageGroup(
        stage.name,
        stage.category,
        stage.logicalGroup
      );
      const groupMeta = LOGICAL_STAGE_GROUPS.find((g) => g.key === logicalGroup);
      const lastRun = runs[runs.length - 1];
      if (lastRun && lastRun.groupKey === logicalGroup) {
        lastRun.items.push({ stage, globalIdx });
      } else {
        runs.push({
          groupKey: logicalGroup,
          groupMeta,
          items: [{ stage, globalIdx }],
        });
      }
    });

    return runs;
  }, [activeStages]);

  // Compute accurate counts & overdue counts per stage from filtered cards
  const countByStage = new Map<string, number>();
  const overdueByStage = new Map<string, number>();

  for (const c of cards) {
    const rawStage = (c.pipelineStage || "Discovery").toLowerCase();
    const k = rawStage === "closed" ? "archived" : rawStage;
    countByStage.set(k, (countByStage.get(k) || 0) + 1);
    const statusMeta = resolveCaseActionStatus(c);
    if (statusMeta.isOverdue || c.needsAttention) {
      overdueByStage.set(k, (overdueByStage.get(k) || 0) + 1);
      if (k !== "needs attention") {
        countByStage.set(
          "needs attention",
          (countByStage.get("needs attention") || 0) + 1
        );
      }
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

  // Automatically scroll selected stage into view ONLY when a specific stage is selected
  // (Never scroll back to the "All" card when deselecting a stage on second click)
  useEffect(() => {
    if (!selectedStageName) return;
    const key = selectedStageName.toLowerCase();
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

  // Click-and-drag scrolling on the stage rail (disabled when reordering stages via 6-dots grab)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCustomizingOrder) return;
    if (e.button !== 0 || !railRef.current) return;
    isPointerDownRef.current = true;
    didDragRailRef.current = false;
    startXRef.current = e.pageX - railRef.current.offsetLeft;
    scrollLeftStartRef.current = railRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCustomizingOrder) return;
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

  const handleStageDragStart = (e: React.DragEvent, stageId: number) => {
    if (!isCustomizingOrder) return;
    setDraggedStageId(stageId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-waypoint-stage-id", String(stageId));
  };

  const handleStageDragEnd = () => {
    setDraggedStageId(null);
    setDragOverStageName(null);
    setDropGapSlot(null);
  };

  const handleDragOverTile = (
    e: React.DragEvent,
    stageName: string,
    targetStageId: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStageName !== stageName) {
      setDragOverStageName(stageName);
    }

    if (isCustomizingOrder && draggedStageId && draggedStageId !== targetStageId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const draggedIdx = activeStages.findIndex((s) => s.id === draggedStageId);
      const targetIdx = activeStages.findIndex((s) => s.id === targetStageId);
      // Determine whether to open the push-apart drop gap before or after the hovered card
      let side: "before" | "after" = e.clientX < midX ? "before" : "after";
      if (draggedIdx !== -1 && targetIdx !== -1) {
        side = draggedIdx > targetIdx ? "before" : "after";
      }
      if (
        !dropGapSlot ||
        dropGapSlot.targetStageId !== targetStageId ||
        dropGapSlot.side !== side
      ) {
        setDropGapSlot({ targetStageId, side });
      }
    }
  };

  const handleDropOnTile = (
    e: React.DragEvent,
    stageName: string,
    targetStageId: number
  ) => {
    e.preventDefault();
    setDragOverStageName(null);
    setDropGapSlot(null);

    // 1. Check if reordering a pipeline stage tile via the 6-dots grab handle
    const stageIdStr = e.dataTransfer.getData("application/x-waypoint-stage-id");
    const activeDragStageId = stageIdStr ? Number(stageIdStr) : draggedStageId;
    if (isCustomizingOrder && activeDragStageId && onReorderStages) {
      if (activeDragStageId !== targetStageId) {
        onReorderStages(activeDragStageId, targetStageId);
      }
      setDraggedStageId(null);
      return;
    }

    // 2. Otherwise handle dropping a student/case card onto this stage
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
        className="flex flex-nowrap items-end gap-[2px] w-full max-w-full overflow-x-auto pb-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#233554 #050E1D",
        }}
      >
        {/* 1. Left-Most "All" Summary Segment (Sovereign Brass Jewel Fill) + Customize Pill Directly Above It */}
        <div className="shrink-0 w-[116px] sm:w-[124px] flex flex-col justify-end">
          <div className="h-8 mb-1 flex items-center justify-center">
            {onToggleCustomizingOrder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCustomizingOrder();
                }}
                className={cn(
                  "h-6 w-full px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer border",
                  isCustomizingOrder
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394] shadow-[0_0_12px_rgba(197,160,89,0.5)]"
                    : "bg-[#0C1D3A] text-[#E2E8F0] border-[#2C446E] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 hover:bg-[#132E57]"
                )}
                title={
                  isCustomizingOrder
                    ? "Click when finished customizing stages"
                    : "Click to show 6-dot grab handles and drag stages to reorder"
                }
              >
                {isCustomizingOrder ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#07162B] stroke-[2.5]" />
                    <span>Done</span>
                  </>
                ) : (
                  <>
                    <GripVertical className="h-3.5 w-3.5 text-[#F2CD80]" />
                    <span>Customize</span>
                  </>
                )}
              </button>
            )}
          </div>
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
              "w-full h-[76px] rounded-lg px-2.5 pt-2 pb-1.5 text-center transition-all cursor-pointer border flex flex-col items-center justify-between relative overflow-hidden hover:brightness-110",
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
            {/* Dead-Center Number (Center by Center) */}
            <div className="flex-1 w-full flex items-center justify-center">
              <span className="text-2xl font-bold tracking-tight text-[#FFF4D4] leading-none text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                {cards.length}
              </span>
            </div>
            <span className="w-full text-center text-xs font-semibold text-[#FFE394] truncate">
              All
            </span>
          </button>
        </div>

        {/* 2. Connected Contiguous Stage Groups with Spanning Bracket Headers Above */}
        {stageGroupRuns.map((run, runIdx) => {
          const isUngroupedRun = run.groupKey === "ungrouped";
          const groupMeta = run.groupMeta;
          const bracketColor = groupMeta?.accentColor || "#C5A059";
          const groupTitle =
            run.groupKey === "opportunities"
              ? "LEAD OPPORTUNITIES"
              : (groupMeta?.shortLabel || run.groupKey).toUpperCase();
          const isGroupBubbleSelected =
            isCustomizingOrder && selectedGroupBubbleKey === run.groupKey;
          const activeEditingGroupMeta = selectedGroupBubbleKey
            ? LOGICAL_STAGE_GROUPS.find((g) => g.key === selectedGroupBubbleKey)
            : null;
          const activeEditingGroupColor =
            activeEditingGroupMeta?.accentColor || "#FFE394";

          return (
            <div
              key={`${run.groupKey}-${runIdx}`}
              className="shrink-0 flex flex-col justify-end"
            >
              {/* Spanning Bracket Line + Centered Flat-Bottom Group Bubble (Only shown for grouped runs) */}
              <div className="relative h-8 mb-1 w-full flex items-center justify-center px-3">
                {!isUngroupedRun && (
                  <>
                    {/* Left-to-Right Spanning Bracket Shape (┌─────── LABEL ───────┐) */}
                    <div
                      className="absolute inset-x-2.5 top-[13px] bottom-0 border-t-[1.5px] border-l-[1.5px] border-r-[1.5px] rounded-t-[3px] pointer-events-none transition-all duration-300"
                      style={{
                        borderColor: bracketColor,
                        opacity: isGroupBubbleSelected ? 1 : 0.78,
                      }}
                    />

                    {/* Centered Interactive Group Bubble (Click in Customize mode to choose which cards are contained in this group) */}
                    <button
                      type="button"
                      disabled={!isCustomizingOrder}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isCustomizingOrder) return;
                        setSelectedGroupBubbleKey((prev) =>
                          prev === (run.groupKey as LogicalStageGroup)
                            ? null
                            : (run.groupKey as LogicalStageGroup)
                        );
                      }}
                      title={
                        isCustomizingOrder
                          ? isGroupBubbleSelected
                            ? `Editing "${groupTitle}" — click any stage card below to add or remove it from this group bracket`
                            : `Click "${groupTitle}" bubble to choose which stage cards belong inside this group bracket`
                          : groupTitle
                      }
                      className={cn(
                        "relative z-10 inline-flex items-center justify-center gap-1.5 px-3.5 py-0.5 rounded-full border text-[10px] font-serif font-bold tracking-[0.14em] uppercase shadow-[0_2px_8px_rgba(0,0,0,0.85)] whitespace-nowrap transition-all",
                        groupMeta?.badgeClass ||
                          "bg-[#0A192F] border-[#C5A059] text-[#FFE394]",
                        isCustomizingOrder
                          ? "cursor-pointer hover:brightness-125 hover:scale-105"
                          : "cursor-default",
                        isGroupBubbleSelected &&
                          "ring-2 ring-[#FFE394] scale-105 shadow-[0_0_16px_rgba(255,227,148,0.65)]"
                      )}
                      style={{
                        borderColor: isGroupBubbleSelected
                          ? "#FFE394"
                          : bracketColor,
                      }}
                    >
                      <span>{groupTitle}</span>
                      {isCustomizingOrder && (
                        <span
                          className={cn(
                            "text-[9px] font-sans font-bold px-1.5 py-0.2 rounded-full transition-colors",
                            isGroupBubbleSelected
                              ? "bg-[#FFE394] text-[#07162B]"
                              : "bg-black/35 text-white/85"
                          )}
                        >
                          {isGroupBubbleSelected
                            ? "Select Cards ▾"
                            : run.items.length}
                        </span>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Cards Row Inside This Bracket Group */}
              <div className="flex flex-nowrap items-end gap-[2px]">
                {run.items.map(({ stage, globalIdx: idx }) => {
                  const count =
                    countByStage.get(stage.name.toLowerCase()) || 0;
                  const overdueCount =
                    overdueByStage.get(stage.name.toLowerCase()) || 0;
                  const isSelected =
                    selectedStageName?.toLowerCase() ===
                    stage.name.toLowerCase();
                  const isDragOver = dragOverStageName === stage.name;
                  const isBeingDragged = draggedStageId === stage.id;
                  const stageLogicalGroup = resolveLogicalStageGroup(
                    stage.name,
                    stage.category,
                    stage.logicalGroup
                  );
                  const isInSelectedGroup =
                    Boolean(selectedGroupBubbleKey) &&
                    stageLogicalGroup === selectedGroupBubbleKey;

                  const jewel = resolveStageJewelPalette(stage.name, idx);
                  const topBarColor = stage.accentColor || jewel.topBar;
                  const showDropSlotBefore =
                    isCustomizingOrder &&
                    draggedStageId !== null &&
                    draggedStageId !== stage.id &&
                    dropGapSlot?.targetStageId === stage.id &&
                    dropGapSlot.side === "before";
                  const showDropSlotAfter =
                    isCustomizingOrder &&
                    draggedStageId !== null &&
                    draggedStageId !== stage.id &&
                    dropGapSlot?.targetStageId === stage.id &&
                    dropGapSlot.side === "after";
                  const isAddSlotHoveredAfterThis =
                    isCustomizingOrder &&
                    draggedStageId === null &&
                    hoveredAddSlotAfterIdx === idx;
                  const isAddSlotHoveredBeforeThis =
                    isCustomizingOrder &&
                    draggedStageId === null &&
                    idx > 0 &&
                    hoveredAddSlotAfterIdx === idx - 1;

                  return (
                    <React.Fragment key={stage.id}>
                      {/* Animated Push-Apart Drop Zone BEFORE target card */}
                      <div
                        onDragOver={(e) =>
                          handleDragOverTile(e, stage.name, stage.id)
                        }
                        onDrop={(e) =>
                          handleDropOnTile(e, stage.name, stage.id)
                        }
                        style={{
                          transition:
                            "width 420ms cubic-bezier(0.22, 1, 0.36, 1), margin 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 340ms ease",
                        }}
                        className={cn(
                          "shrink-0 flex flex-col justify-end overflow-hidden will-change-[width,margin,opacity]",
                          showDropSlotBefore
                            ? "w-[56px] sm:w-[64px] mx-1 opacity-100"
                            : "w-0 mx-0 opacity-0 pointer-events-none"
                        )}
                      >
                        <div className="w-full h-[76px] rounded-lg border-2 border-dashed border-[#FFE394] bg-[#C5A059]/20 shadow-[0_0_16px_rgba(255,227,148,0.35)] flex flex-col items-center justify-center gap-1">
                          <div className="w-1.5 h-6 rounded-full bg-[#FFE394]" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#FFE394]">
                            Drop
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          transition:
                            "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                        }}
                        className="shrink-0 w-[132px] sm:w-[142px] flex flex-col justify-end"
                      >
                        <button
                          ref={(el) => {
                            stageRefs.current[stage.name.toLowerCase()] = el;
                          }}
                          type="button"
                          draggable={isCustomizingOrder}
                          onDragStart={(e) => handleStageDragStart(e, stage.id)}
                          onDragEnd={handleStageDragEnd}
                          onClick={() => {
                            if (didDragRailRef.current) return;
                            if (isCustomizingOrder) {
                              if (
                                selectedGroupBubbleKey &&
                                onAssignStageGroup
                              ) {
                                // Toggle whether this stage card is contained inside the selected group bracket
                                const nextGroup: LogicalStageGroup =
                                  isInSelectedGroup
                                    ? "ungrouped"
                                    : selectedGroupBubbleKey;
                                onAssignStageGroup(stage.id, nextGroup);
                              }
                              return;
                            }
                            onSelectStage(isSelected ? null : stage.name);
                          }}
                          onDragOver={(e) =>
                            handleDragOverTile(e, stage.name, stage.id)
                          }
                          onDragLeave={() => {
                            setDragOverStageName(null);
                          }}
                          onDrop={(e) =>
                            handleDropOnTile(e, stage.name, stage.id)
                          }
                          title={
                            isCustomizingOrder
                              ? selectedGroupBubbleKey
                                ? isInSelectedGroup
                                  ? `Click to remove "${stage.name}" from this group bracket`
                                  : `Click to include "${stage.name}" inside the selected group bracket`
                                : `Click a group bubble above to edit which cards are in that group, or drag 6-dots handle to reorder "${stage.name}"`
                              : `${stage.name} (${count} ${count === 1 ? "case" : "cases"})`
                          }
                          style={{
                            background:
                              isSelected || isDragOver
                                ? jewel.selectedBg
                                : jewel.bg,
                            borderColor: isDragOver
                              ? "#34D399"
                              : selectedGroupBubbleKey
                                ? isInSelectedGroup
                                  ? activeEditingGroupColor
                                  : "#334155"
                                : isSelected
                                  ? "#F2CD80"
                                  : isCustomizingOrder
                                    ? "#FFE394"
                                    : jewel.border,
                          }}
                          className={cn(
                            "w-full h-[76px] rounded-lg px-2.5 pt-2 pb-1.5 text-center transition-all border flex flex-col items-center justify-between relative overflow-hidden group hover:brightness-115",
                            isCustomizingOrder
                              ? selectedGroupBubbleKey
                                ? "cursor-pointer"
                                : "cursor-grab active:cursor-grabbing ring-1 ring-[#FFE394]/60 border-dashed"
                              : "cursor-pointer",
                            selectedGroupBubbleKey &&
                              (isInSelectedGroup
                                ? "ring-2 ring-[#FFE394] shadow-[0_0_16px_rgba(255,227,148,0.45)]"
                                : "opacity-60 hover:opacity-100 border-dashed"),
                            isBeingDragged && "opacity-45 scale-95",
                            isDragOver && "ring-2 ring-emerald-400 scale-[1.03]",
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

                          {/* Top-Left 6-Dots Grab Handle when Customize Order Mode is Active */}
                          {isCustomizingOrder && (
                            <div
                              className="absolute top-1.5 left-1.5 z-10 p-0.5 rounded bg-[#020A17]/80 border border-[#FFE394]/60 text-[#FFE394] shadow-sm flex items-center justify-center"
                              title="Grab and drag to reorder stage"
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                          )}

                          {/* Top-Right Group Membership Badge when a Group Bubble is clicked in Customize mode */}
                          {isCustomizingOrder && selectedGroupBubbleKey ? (
                            <div
                              className={cn(
                                "absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 border shadow-sm transition-colors",
                                isInSelectedGroup
                                  ? "bg-[#FFE394] border-white text-[#07162B]"
                                  : "bg-[#051024]/90 border-[#475569] text-[#CBD5E1] group-hover:border-[#FFE394] group-hover:text-[#FFE394]"
                              )}
                            >
                              {isInSelectedGroup ? (
                                <>
                                  <Check className="h-2.5 w-2.5 stroke-[3.2]" />
                                  <span>In Group</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-2.5 w-2.5 stroke-[2.8]" />
                                  <span>Add</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none">
                              {overdueCount > 0 && (
                                <span
                                  className="w-2 h-2 rounded-full bg-rose-400 shrink-0 shadow-[0_0_6px_rgba(251,113,133,0.8)]"
                                  title={`${overdueCount} case(s) need attention`}
                                />
                              )}
                              <ChevronRight
                                style={{
                                  color: isSelected ? "#FFE394" : jewel.text,
                                }}
                                className="h-3.5 w-3.5 opacity-75 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5"
                              />
                            </div>
                          )}

                          {/* Center-by-Center Prominent Count */}
                          <div className="flex-1 w-full flex items-center justify-center">
                            <span
                              style={{
                                color: isSelected
                                  ? "#FFE394"
                                  : count > 0
                                    ? jewel.countText
                                    : jewel.text,
                              }}
                              className={cn(
                                "text-2xl font-bold tracking-tight leading-none text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]",
                                count === 0 && !isSelected && "opacity-75"
                              )}
                            >
                              {count}
                            </span>
                          </div>

                          {/* Bottom Row: Centered Short Stage Name */}
                          <span
                            style={{
                              color: isSelected ? "#FFF4D4" : jewel.text,
                            }}
                            className={cn(
                              "w-full text-center text-[11px] font-semibold leading-tight truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]",
                              isSelected && "font-bold"
                            )}
                          >
                            {stage.name.toLowerCase() === "closed"
                              ? "Archived"
                              : stage.name}
                          </span>
                        </button>
                      </div>

                      {/* Animated Push-Apart Drop Zone AFTER target card */}
                      <div
                        onDragOver={(e) =>
                          handleDragOverTile(e, stage.name, stage.id)
                        }
                        onDrop={(e) =>
                          handleDropOnTile(e, stage.name, stage.id)
                        }
                        style={{
                          transition:
                            "width 420ms cubic-bezier(0.22, 1, 0.36, 1), margin 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 340ms ease",
                        }}
                        className={cn(
                          "shrink-0 flex flex-col justify-end overflow-hidden will-change-[width,margin,opacity]",
                          showDropSlotAfter
                            ? "w-[56px] sm:w-[64px] mx-1 opacity-100"
                            : "w-0 mx-0 opacity-0 pointer-events-none"
                        )}
                      >
                        <div className="w-full h-[76px] rounded-lg border-2 border-dashed border-[#FFE394] bg-[#C5A059]/20 shadow-[0_0_16px_rgba(255,227,148,0.35)] flex flex-col items-center justify-center gap-1">
                          <div className="w-1.5 h-6 rounded-full bg-[#FFE394]" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#FFE394]">
                            Drop
                          </span>
                        </div>
                      </div>

                      {/* Hoverable "+ Add Card Here" Seam Between Stage Cards & At Very End (NEVER before All or before first card) */}
                      {isCustomizingOrder && draggedStageId === null && (
                        inlineDraftAfterIdx?.afterIdx === idx ? (
                          /* Inline New Stage Card Editor directly on the rail (No popup box!) */
                          <div className="shrink-0 w-[142px] sm:w-[152px] mx-1 flex flex-col justify-end z-30">
                            <div
                              style={{
                                background: jewel.selectedBg,
                                borderColor: "#FFE394",
                              }}
                              className="w-full h-[76px] rounded-lg px-2 py-1.5 border-2 border-dashed flex flex-col items-center justify-between relative overflow-hidden shadow-[0_4px_20px_rgba(255,227,148,0.4)]"
                            >
                              <div
                                className="absolute top-0 left-0 right-0 h-[3.5px]"
                                style={{ backgroundColor: topBarColor }}
                              />
                              <input
                                ref={inlineInputRef}
                                type="text"
                                value={inlineDraftName}
                                onChange={(e) =>
                                  setInlineDraftName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const trimmed = inlineDraftName.trim();
                                    if (trimmed && onInsertStageAtOrder) {
                                      onInsertStageAtOrder(idx + 2, {
                                        name: trimmed,
                                        accentColor: topBarColor,
                                        logicalGroup: run.groupKey as any,
                                        pipelineGroup:
                                          run.groupKey === "opportunities" ||
                                          run.groupKey === "follow_up"
                                            ? "opportunity"
                                            : "active_project",
                                        category: "active",
                                      });
                                    }
                                    setInlineDraftAfterIdx(null);
                                    setInlineDraftName("");
                                  } else if (e.key === "Escape") {
                                    setInlineDraftAfterIdx(null);
                                    setInlineDraftName("");
                                  }
                                }}
                                placeholder="Stage name..."
                                className="w-full mt-1 px-1.5 py-1 rounded bg-[#020A17]/85 border border-[#FFE394]/60 text-[11px] font-semibold text-[#FFF4D4] placeholder:text-[#94A3B8] text-center focus:outline-hidden"
                              />
                              <div className="flex items-center justify-center gap-1.5 w-full">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const trimmed = inlineDraftName.trim();
                                    if (trimmed && onInsertStageAtOrder) {
                                      onInsertStageAtOrder(idx + 2, {
                                        name: trimmed,
                                        accentColor: topBarColor,
                                        logicalGroup: run.groupKey as any,
                                        pipelineGroup:
                                          run.groupKey === "opportunities" ||
                                          run.groupKey === "follow_up"
                                            ? "opportunity"
                                            : "active_project",
                                        category: "active",
                                      });
                                    }
                                    setInlineDraftAfterIdx(null);
                                    setInlineDraftName("");
                                  }}
                                  className="px-2 py-0.5 rounded bg-emerald-500 text-[#04130D] text-[9px] font-bold uppercase tracking-wider hover:brightness-110 cursor-pointer"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineDraftAfterIdx(null);
                                    setInlineDraftName("");
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600 text-[9px] font-bold uppercase tracking-wider hover:text-white cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                        <div
                          onMouseEnter={() => setHoveredAddSlotAfterIdx(idx)}
                          onMouseLeave={() =>
                            setHoveredAddSlotAfterIdx((prev) =>
                              prev === idx ? null : prev
                            )
                          }
                          style={{
                            transition:
                              "width 460ms cubic-bezier(0.22, 1, 0.36, 1), margin 460ms cubic-bezier(0.22, 1, 0.36, 1)",
                          }}
                          className={cn(
                            "shrink-0 relative flex flex-col justify-end select-none z-20 will-change-[width,margin]",
                            isAddSlotHoveredAfterThis
                              ? "w-[88px] sm:w-[96px] mx-1"
                              : "w-[14px] -mx-[5px]"
                          )}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHoveredAddSlotAfterIdx(null);
                              setInlineDraftName("");
                              setInlineDraftAfterIdx({
                                afterIdx: idx,
                                insertOrder: idx + 2,
                                groupKey: run.groupKey,
                                accentColor: topBarColor,
                              });
                            }}
                            title="Add Card Here"
                            style={{
                              transition:
                                "background-color 380ms cubic-bezier(0.22, 1, 0.36, 1), border-color 380ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 380ms cubic-bezier(0.22, 1, 0.36, 1)",
                            }}
                            className={cn(
                              "w-full h-[76px] rounded-lg relative overflow-hidden flex items-center justify-center cursor-pointer",
                              isAddSlotHoveredAfterThis
                                ? "border-2 border-dashed border-[#FFE394]/90 bg-[#0A1E3C]/95 hover:bg-[#102B4E] shadow-[0_4px_20px_rgba(255,227,148,0.3)]"
                                : "border border-transparent bg-transparent"
                            )}
                          >
                            {/* Collapsed Pill Hint (fades out gently on hover) */}
                            <div
                              style={{
                                transition:
                                  "opacity 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
                              }}
                              className={cn(
                                "absolute inset-0 flex items-center justify-center pointer-events-none",
                                isAddSlotHoveredAfterThis
                                  ? "opacity-0 scale-75"
                                  : "opacity-75 scale-100"
                              )}
                            >
                              <div className="w-4 h-7 rounded-full bg-[#07162B]/90 border border-[#C5A059]/60 text-[#FFE394] flex items-center justify-center shadow-sm">
                                <Plus className="h-2.5 w-2.5 stroke-[2.8]" />
                              </div>
                            </div>

                            {/* Expanded "+ Add Card Here" Content (fades and glides in gently without layout wrapping) */}
                            <div
                              style={{
                                transition:
                                  "opacity 360ms cubic-bezier(0.22, 1, 0.36, 1) 40ms, transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                              }}
                              className={cn(
                                "w-[84px] shrink-0 flex flex-col items-center justify-center gap-1.5 px-1 pointer-events-none",
                                isAddSlotHoveredAfterThis
                                  ? "opacity-100 scale-100 translate-y-0"
                                  : "opacity-0 scale-90 translate-y-0.5"
                              )}
                            >
                              <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#F2CD80] to-[#C5A059] text-[#07162B] flex items-center justify-center shadow-[0_2px_10px_rgba(242,205,128,0.55)]">
                                <Plus className="h-3.5 w-3.5 stroke-[3]" />
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#FFF4D4] leading-tight text-center whitespace-nowrap">
                                Add Card Here
                              </span>
                            </div>
                          </button>
                        </div>
                        )
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

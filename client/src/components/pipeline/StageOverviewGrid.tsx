import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import {
  LOGICAL_STAGE_GROUPS,
  PIPELINE_GROUP_COLOR_THEMES,
  loadPipelineGroups,
  savePipelineGroups,
  resolveLogicalStageGroup,
  resolveCaseActionStatus,
} from "./pipelineDefaults";
import type {
  PipelineStageItem,
  PipelineCardItem,
  LogicalStageGroup,
  PipelineGroupDefinition,
} from "./types";

interface StageOverviewGridProps {
  stages: PipelineStageItem[];
  cards: PipelineCardItem[];
  groups?: PipelineGroupDefinition[];
  selectedStageName: string | null;
  onSelectStage: (stageName: string | null) => void;
  onDropCardOnStage?: (cardId: number, targetStageName: string) => void;
  isCustomizingOrder?: boolean;
  onToggleCustomizingOrder?: () => void;
  onOpenGroupModifications?: (focusedGroupKey?: LogicalStageGroup | null) => void;
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
  topBarGradient: string;
  topBarGlow: string;
  text: string;
  countText: string;
}

/**
 * Waypoint Admiralty Neon-Lit Calfskin Leather palette for pipeline stage tiles:
 * dark full-grain leather plaques illuminated downward by a blazing top-edge light bar.
 */
const STAGE_JEWEL_PALETTES: StageJewelPalette[] = [
  // 0: Electric Cyan-Teal (Discovery)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(44, 218, 238, 0.34) 0%, rgba(16, 94, 118, 0.2) 48%, rgba(6, 20, 32, 0.96) 100%), linear-gradient(180deg, #0b2433 0%, #071623 60%, #050f1a 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(62, 232, 250, 0.46) 0%, rgba(22, 118, 146, 0.28) 52%, rgba(8, 26, 40, 0.96) 100%), linear-gradient(180deg, #103246 0%, #0a1f30 60%, #061422 100%)",
    border: "rgba(62, 212, 230, 0.42)",
    topBar: "#4CEEF8",
    topBarGradient: "linear-gradient(90deg, #1caac0 0%, #86fdff 32%, #44e2f2 68%, #1d8aa0 100%)",
    topBarGlow: "0 2px 16px rgba(68, 236, 255, 0.75)",
    text: "#D6E8F4",
    countText: "#FAF7EE",
  },
  // 1: Imperial Violet-Amethyst (Free Session)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(154, 108, 255, 0.34) 0%, rgba(64, 38, 128, 0.22) 48%, rgba(12, 13, 30, 0.96) 100%), linear-gradient(180deg, #1d163e 0%, #11102a 60%, #0b0c1e 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(176, 134, 255, 0.46) 0%, rgba(82, 50, 158, 0.3) 52%, rgba(16, 16, 38, 0.96) 100%), linear-gradient(180deg, #281e54 0%, #171538 60%, #0f1028 100%)",
    border: "rgba(150, 114, 240, 0.42)",
    topBar: "#A78BFA",
    topBarGradient: "linear-gradient(90deg, #6f45d8 0%, #d2bcff 36%, #9b72f8 70%, #5b36b4 100%)",
    topBarGlow: "0 2px 16px rgba(158, 116, 255, 0.75)",
    text: "#DDD8F4",
    countText: "#FAF7EE",
  },
  // 2: Luminous Rose-Plum (Proposal)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(232, 92, 154, 0.34) 0%, rgba(108, 34, 70, 0.22) 48%, rgba(20, 11, 22, 0.96) 100%), linear-gradient(180deg, #2c1427 0%, #1a0e1d 60%, #120a16 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(248, 116, 174, 0.46) 0%, rgba(132, 44, 86, 0.3) 52%, rgba(26, 14, 28, 0.96) 100%), linear-gradient(180deg, #3b1b34 0%, #241328 60%, #180d1d 100%)",
    border: "rgba(218, 98, 152, 0.42)",
    topBar: "#F472B6",
    topBarGradient: "linear-gradient(90deg, #bd3d7a 0%, #ffa4ce 38%, #e45a9a 70%, #942c5e 100%)",
    topBarGlow: "0 2px 16px rgba(242, 102, 166, 0.75)",
    text: "#EEDAE6",
    countText: "#FAF7EE",
  },
  // 3: Admiralty Sapphire-Cobalt (2-Week Follow-Up)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(70, 144, 255, 0.34) 0%, rgba(26, 66, 138, 0.22) 48%, rgba(8, 17, 34, 0.96) 100%), linear-gradient(180deg, #10254b 0%, #0a1833 60%, #061024 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(92, 166, 255, 0.46) 0%, rgba(36, 86, 172, 0.3) 52%, rgba(11, 22, 44, 0.96) 100%), linear-gradient(180deg, #173466 0%, #0f2246 60%, #091630 100%)",
    border: "rgba(88, 152, 240, 0.42)",
    topBar: "#60A5FA",
    topBarGradient: "linear-gradient(90deg, #296ad4 0%, #92c5ff 36%, #4a93f6 70%, #2254ae 100%)",
    topBarGlow: "0 2px 16px rgba(84, 158, 255, 0.75)",
    text: "#D6E4F6",
    countText: "#FAF7EE",
  },
  // 4: Electric Periwinkle-Indigo (30-Day Follow-Up)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(110, 128, 255, 0.34) 0%, rgba(42, 54, 134, 0.22) 48%, rgba(10, 15, 34, 0.96) 100%), linear-gradient(180deg, #161e4c 0%, #0e1434 60%, #080d24 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(132, 148, 255, 0.46) 0%, rgba(56, 70, 168, 0.3) 52%, rgba(14, 20, 44, 0.96) 100%), linear-gradient(180deg, #1f2a66 0%, #141c46 60%, #0c1230 100%)",
    border: "rgba(116, 130, 240, 0.42)",
    topBar: "#818CF8",
    topBarGradient: "linear-gradient(90deg, #485ad4 0%, #b4bfff 38%, #6c7ef6 70%, #3848ae 100%)",
    topBarGlow: "0 2px 16px rgba(118, 134, 255, 0.75)",
    text: "#DBE0F8",
    countText: "#FAF7EE",
  },
  // 5: Burnished Amber-Copper (60-Day Follow-Up / School Contact)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(242, 144, 62, 0.32) 0%, rgba(116, 56, 18, 0.22) 48%, rgba(22, 14, 12, 0.96) 100%), linear-gradient(180deg, #2b1a12 0%, #1a110e 60%, #110b0a 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(255, 166, 86, 0.44) 0%, rgba(142, 70, 24, 0.3) 52%, rgba(28, 18, 14, 0.96) 100%), linear-gradient(180deg, #3a2318 0%, #241712 60%, #170f0c 100%)",
    border: "rgba(222, 134, 64, 0.42)",
    topBar: "#FB923C",
    topBarGradient: "linear-gradient(90deg, #c26422 0%, #ffc48c 38%, #f08938 70%, #984c18 100%)",
    topBarGlow: "0 2px 16px rgba(246, 148, 68, 0.72)",
    text: "#F0E2D4",
    countText: "#FAF7EE",
  },
  // 6: Crimson Garnet (Reconnect Review / Needs Attention / Past Due)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(238, 86, 102, 0.32) 0%, rgba(114, 28, 38, 0.22) 48%, rgba(22, 10, 14, 0.96) 100%), linear-gradient(180deg, #2c1218 0%, #1b0c12 60%, #12080d 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(252, 108, 124, 0.44) 0%, rgba(142, 36, 48, 0.3) 52%, rgba(28, 12, 18, 0.96) 100%), linear-gradient(180deg, #3b1820 0%, #251018 60%, #180a10 100%)",
    border: "rgba(224, 88, 104, 0.42)",
    topBar: "#F87171",
    topBarGradient: "linear-gradient(90deg, #bf3644 0%, #ffa2ac 38%, #ec5b6a 70%, #942632 100%)",
    topBarGlow: "0 2px 16px rgba(244, 96, 112, 0.72)",
    text: "#F2DCE0",
    countText: "#FAF7EE",
  },
  // 7: Luminous Emerald-Jade (Intake / Onboarding / Monitoring)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(48, 212, 156, 0.32) 0%, rgba(18, 92, 68, 0.2) 48%, rgba(8, 20, 22, 0.96) 100%), linear-gradient(180deg, #0d2724 0%, #081819 60%, #051012 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(68, 232, 174, 0.44) 0%, rgba(24, 118, 86, 0.28) 52%, rgba(10, 26, 28, 0.96) 100%), linear-gradient(180deg, #133632 0%, #0c2222 60%, #071618 100%)",
    border: "rgba(56, 204, 152, 0.42)",
    topBar: "#34D399",
    topBarGradient: "linear-gradient(90deg, #1f9e72 0%, #90fad2 38%, #3dd49e 70%, #177c58 100%)",
    topBarGlow: "0 2px 16px rgba(58, 218, 162, 0.72)",
    text: "#D6EFE6",
    countText: "#FAF7EE",
  },
  // 8: Sovereign Champagne-Gold (Records Review / Renewal)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(236, 192, 92, 0.3) 0%, rgba(108, 80, 28, 0.2) 48%, rgba(18, 16, 14, 0.96) 100%), linear-gradient(180deg, #241d14 0%, #151415 60%, #0d0e14 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(250, 210, 114, 0.42) 0%, rgba(134, 100, 36, 0.28) 52%, rgba(24, 20, 16, 0.96) 100%), linear-gradient(180deg, #32281a 0%, #1e1a18 60%, #131318 100%)",
    border: "rgba(220, 182, 98, 0.44)",
    topBar: "#FBBF24",
    topBarGradient: "linear-gradient(90deg, #b88c34 0%, #fff0b8 38%, #e4b654 70%, #926d24 100%)",
    topBarGlow: "0 2px 16px rgba(242, 198, 102, 0.7)",
    text: "#EFE6D2",
    countText: "#FAF7EE",
  },
  // 9: Brushed Slate-Pewter (Archive / Closed)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(168, 184, 210, 0.26) 0%, rgba(62, 74, 96, 0.2) 48%, rgba(12, 16, 26, 0.96) 100%), linear-gradient(180deg, #1b2232 0%, #101624 60%, #090e1a 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(192, 208, 232, 0.36) 0%, rgba(80, 96, 122, 0.28) 52%, rgba(16, 22, 34, 0.96) 100%), linear-gradient(180deg, #252e42 0%, #171f32 60%, #0e1424 100%)",
    border: "rgba(164, 180, 206, 0.38)",
    topBar: "#CBD5E1",
    topBarGradient: "linear-gradient(90deg, #74849c 0%, #e4edf8 38%, #a6b6cc 70%, #5a687e 100%)",
    topBarGlow: "0 2px 14px rgba(180, 198, 224, 0.55)",
    text: "#D8E0EC",
    countText: "#FAF7EE",
  },
  // 10: Obsidian Bloodstone (Blacklisted)
  {
    bg: "radial-gradient(ellipse 96% 62% at 50% 0%, rgba(216, 48, 86, 0.32) 0%, rgba(92, 16, 34, 0.22) 48%, rgba(18, 6, 12, 0.96) 100%), linear-gradient(180deg, #240a14 0%, #14060d 60%, #0c0409 100%)",
    selectedBg: "radial-gradient(ellipse 98% 68% at 50% 0%, rgba(238, 68, 108, 0.44) 0%, rgba(118, 22, 46, 0.3) 52%, rgba(24, 8, 16, 0.96) 100%), linear-gradient(180deg, #320e1c 0%, #1d0912 60%, #12060c 100%)",
    border: "rgba(196, 48, 84, 0.45)",
    topBar: "#E11D48",
    topBarGradient: "linear-gradient(90deg, #981634 0%, #ff86a2 38%, #dc2f58 70%, #781028 100%)",
    topBarGlow: "0 2px 16px rgba(226, 46, 88, 0.72)",
    text: "#F2D2DA",
    countText: "#FAF7EE",
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
  groups,
  selectedStageName,
  onSelectStage,
  onDropCardOnStage,
  isCustomizingOrder = false,
  onToggleCustomizingOrder,
  onOpenGroupModifications,
  onReorderStages,
  onInsertStageAtOrder,
  onAssignStageGroup,
}: StageOverviewGridProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const stageRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [localGroups, setLocalGroups] = useState<PipelineGroupDefinition[]>(() =>
    loadPipelineGroups()
  );

  useEffect(() => {
    const syncGroups = () => setLocalGroups(loadPipelineGroups());
    window.addEventListener("waypoint-pipeline-groups-updated", syncGroups);
    return () =>
      window.removeEventListener("waypoint-pipeline-groups-updated", syncGroups);
  }, []);

  const effectiveGroups =
    groups && groups.length > 0 ? groups : localGroups || LOGICAL_STAGE_GROUPS;

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
  const [inlineRenameGroupKey, setInlineRenameGroupKey] =
    useState<string | null>(null);
  const [inlineRenameText, setInlineRenameText] = useState("");
  const [inlineDeleteGroupKey, setInlineDeleteGroupKey] =
    useState<string | null>(null);
  const [inlineNewGroupRunIdx, setInlineNewGroupRunIdx] =
    useState<number | null>(null);
  const [inlineNewGroupText, setInlineNewGroupText] = useState("");
  const inlineGroupRenameInputRef = useRef<HTMLInputElement | null>(null);
  const inlineNewGroupInputRef = useRef<HTMLInputElement | null>(null);
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
      setInlineRenameGroupKey(null);
      setInlineRenameText("");
      setInlineDeleteGroupKey(null);
      setInlineNewGroupRunIdx(null);
      setInlineNewGroupText("");
      setInlineDraftAfterIdx(null);
      setInlineDraftName("");
    }
  }, [isCustomizingOrder]);

  useEffect(() => {
    if (inlineRenameGroupKey) {
      setTimeout(() => inlineGroupRenameInputRef.current?.focus(), 30);
    }
  }, [inlineRenameGroupKey]);

  useEffect(() => {
    if (inlineNewGroupRunIdx !== null) {
      setTimeout(() => inlineNewGroupInputRef.current?.focus(), 30);
    }
  }, [inlineNewGroupRunIdx]);

  const handleSaveInlineGroupRename = (groupKey: string) => {
    const trimmed = inlineRenameText.trim();
    if (!trimmed) {
      setInlineRenameGroupKey(null);
      return;
    }
    const currentGroups = [...effectiveGroups];
    const existingIdx = currentGroups.findIndex((g) => g.key === groupKey);
    if (existingIdx >= 0) {
      currentGroups[existingIdx] = {
        ...currentGroups[existingIdx],
        label: trimmed,
        shortLabel: trimmed,
      };
    } else {
      const theme = PIPELINE_GROUP_COLOR_THEMES[3];
      currentGroups.push({
        key: groupKey as LogicalStageGroup,
        label: trimmed,
        shortLabel: trimmed,
        badgeClass: theme.badgeClass,
        barColor: theme.barColor,
        accentColor: theme.accentColor,
        order: currentGroups.length + 1,
        isCustom: true,
      });
    }
    setLocalGroups(currentGroups);
    savePipelineGroups(currentGroups);
    setInlineRenameGroupKey(null);
    setInlineRenameText("");
    toast.success(`Renamed group to "${trimmed}"`);
  };

  const handleConfirmInlineGroupDelete = (
    groupKey: string,
    runItems: { stage: PipelineStageItem; globalIdx: number }[]
  ) => {
    if (onAssignStageGroup) {
      runItems.forEach(({ stage }) => {
        onAssignStageGroup(stage.id, "ungrouped");
      });
    }
    const updatedGroups = effectiveGroups.filter(
      (g) => !(g.isCustom && g.key === groupKey)
    );
    setLocalGroups(updatedGroups);
    savePipelineGroups(updatedGroups);
    if (selectedGroupBubbleKey === groupKey) {
      setSelectedGroupBubbleKey(null);
    }
    setInlineDeleteGroupKey(null);
    toast.success("Group removed — cards are now ungrouped");
  };

  const handleCreateInlineNewGroup = (
    runItems: { stage: PipelineStageItem; globalIdx: number }[]
  ) => {
    const trimmed = inlineNewGroupText.trim();
    if (!trimmed) {
      setInlineNewGroupRunIdx(null);
      return;
    }
    const newKey = `custom_${trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")}_${Date.now().toString().slice(-4)}` as LogicalStageGroup;
    const theme =
      PIPELINE_GROUP_COLOR_THEMES[
        effectiveGroups.length % PIPELINE_GROUP_COLOR_THEMES.length
      ];
    const newGroupDef: PipelineGroupDefinition = {
      key: newKey,
      label: trimmed,
      shortLabel: trimmed,
      badgeClass: theme.badgeClass,
      barColor: theme.barColor,
      accentColor: theme.accentColor,
      order: effectiveGroups.length + 1,
      isCustom: true,
    };
    const nextGroups = [...effectiveGroups, newGroupDef];
    setLocalGroups(nextGroups);
    savePipelineGroups(nextGroups);
    if (onAssignStageGroup) {
      runItems.forEach(({ stage }) => {
        onAssignStageGroup(stage.id, newKey);
      });
    }
    setInlineNewGroupRunIdx(null);
    setInlineNewGroupText("");
    setSelectedGroupBubbleKey(newKey);
    toast.success(`Created group "${trimmed}" — click any cards to include or remove them`);
  };

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
      groupMeta: PipelineGroupDefinition | undefined;
      items: { stage: PipelineStageItem; globalIdx: number }[];
    }[] = [];

    activeStages.forEach((stage, globalIdx) => {
      const logicalGroup = resolveLogicalStageGroup(
        stage.name,
        stage.category,
        stage.logicalGroup
      );
      const groupMeta = effectiveGroups.find((g) => g.key === logicalGroup);
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
  }, [activeStages, effectiveGroups]);

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
          className="adm-pipe-pill absolute left-0 top-[62px] z-20 h-14 w-6 rounded-r-lg text-[#DCE6F4] hover:text-[#FFF4D4] flex items-center justify-center transition-opacity cursor-pointer"
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
          className="adm-pipe-pill absolute right-0 top-[62px] z-20 h-14 w-6 rounded-l-lg text-[#DCE6F4] hover:text-[#FFF4D4] flex items-center justify-center transition-opacity cursor-pointer"
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
        className="flex flex-nowrap items-end gap-3 w-full max-w-full overflow-x-auto pb-2.5 pt-1"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#233554 #050E1D",
        }}
      >
        {/* 1. Left-Most "All" Summary Segment (Dark Calfskin Leather in Blazing 3D Solid-Gold Frame) + Customize Pill Directly Above It */}
        <div className="shrink-0 w-[124px] sm:w-[136px] flex flex-col justify-end">
          <div className="h-9 mb-2 flex items-center justify-center">
            {onToggleCustomizingOrder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCustomizingOrder();
                }}
                className={cn(
                  "h-[30px] w-full px-3 rounded-[9px] text-[12px] font-serif font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer",
                  isCustomizingOrder
                    ? "bg-gradient-to-r from-[#E6C87E] via-[#C8A257] to-[#9F7E3D] text-[#07162B] border border-[#FFF0C2] shadow-[0_0_14px_rgba(232,196,118,0.5)]"
                    : "adm-pipe-pill text-[#EEF3FA] hover:text-[#FFF8E4]"
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
                    <GripVertical className="h-3.5 w-3.5 text-[#C8D4E6]" />
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
            className={cn(
              "adm-stage-card-all w-full h-[94px] rounded-[14px] px-3 pt-2.5 pb-2.5 text-center cursor-pointer flex flex-col items-center justify-between",
              selectedStageName && "adm-stage-card-all-idle"
            )}
          >
            {/* Dead-Center Bold Serif Numeral */}
            <div className="flex-1 w-full flex items-center justify-center">
              <span className="text-[32px] font-serif font-bold tracking-tight text-[#FAF6EC] leading-none text-center tabular-nums drop-shadow-[0_3px_8px_rgba(0,0,0,0.85)]">
                {cards.length}
              </span>
            </div>
            <span className="w-full text-center text-[13px] font-serif font-medium text-[#F4E3B8] truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              All
            </span>
          </button>
        </div>

        {/* 2. Connected Contiguous Stage Groups with Spanning Champagne-Gold Bracket Headers Above */}
        {stageGroupRuns.map((run, runIdx) => {
          const isUngroupedRun = run.groupKey === "ungrouped";
          const groupMeta = run.groupMeta;
          const bracketColor = isCustomizingOrder
            ? groupMeta?.accentColor || "#E4C072"
            : "#D8B878";
          const groupTitle = (
            groupMeta?.label ||
            groupMeta?.shortLabel ||
            (run.groupKey === "opportunities"
              ? "LEAD OPPORTUNITIES"
              : run.groupKey)
          ).toUpperCase();
          const isGroupBubbleSelected =
            isCustomizingOrder && selectedGroupBubbleKey === run.groupKey;
          const activeEditingGroupMeta = selectedGroupBubbleKey
            ? effectiveGroups.find((g) => g.key === selectedGroupBubbleKey)
            : null;
          const activeEditingGroupColor =
            activeEditingGroupMeta?.accentColor || "#FFE394";

          return (
            <div
              key={`${run.groupKey}-${runIdx}`}
              className="shrink-0 flex flex-col justify-end"
            >
              {/* Spanning Champagne-Gold Bracket Line + Centered Sculpted Obsidian Group Capsule */}
              <div className="relative h-9 mb-2 w-full flex items-center justify-center px-3">
                {!isUngroupedRun ? (
                  <>
                    {/* Left-to-Right Spanning Bracket Shape (┌─────── LABEL ───────┐) */}
                    <div
                      className="absolute inset-x-1.5 top-[15px] bottom-[-2px] border-t-[1.25px] border-l-[1.25px] border-r-[1.25px] rounded-t-[6px] pointer-events-none transition-all duration-300"
                      style={{
                        borderColor: bracketColor,
                        opacity: isGroupBubbleSelected ? 1 : 0.72,
                      }}
                    />

                    {/* Centered Sculpted Obsidian-Navy & Gold Group Capsule */}
                    <div
                      className={cn(
                        "adm-pipe-group-pill relative z-10 inline-flex items-center justify-center gap-1.5 px-4 py-1 rounded-full text-[10.5px] font-serif font-bold tracking-[0.18em] text-[#F5E8C6] uppercase whitespace-nowrap transition-all",
                        isGroupBubbleSelected &&
                          "ring-2 ring-[#FFE394] scale-105 shadow-[0_0_16px_rgba(255,227,148,0.65)]"
                      )}
                    >
                      {isCustomizingOrder &&
                      inlineRenameGroupKey === run.groupKey ? (
                        /* ── Inline Pencil Rename Input Inside Bubble (No Popup) ── */
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={inlineGroupRenameInputRef}
                            type="text"
                            value={inlineRenameText}
                            onChange={(e) =>
                              setInlineRenameText(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveInlineGroupRename(run.groupKey);
                              } else if (e.key === "Escape") {
                                setInlineRenameGroupKey(null);
                                setInlineRenameText("");
                              }
                            }}
                            placeholder="Group name..."
                            className="w-28 sm:w-36 px-1.5 py-0.2 rounded bg-[#020A17]/90 border border-[#FFE394] text-[10px] font-serif font-bold text-[#FFF4D4] tracking-wider uppercase focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveInlineGroupRename(run.groupKey)
                            }
                            title="Save group name"
                            className="p-0.5 rounded-full bg-emerald-500 text-[#04130D] hover:brightness-110 cursor-pointer"
                          >
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInlineRenameGroupKey(null);
                              setInlineRenameText("");
                            }}
                            title="Cancel rename"
                            className="p-0.5 rounded-full bg-black/50 text-white/80 hover:text-white cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5 stroke-[2.5]" />
                          </button>
                        </div>
                      ) : isCustomizingOrder &&
                        inlineDeleteGroupKey === run.groupKey ? (
                        /* ── Inline Trash Can Delete Confirmation Inside Bubble (No Popup) ── */
                        <div
                          className="inline-flex items-center gap-1.5 font-sans tracking-normal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] font-bold text-rose-200">
                            Delete "{groupTitle}"?
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleConfirmInlineGroupDelete(
                                run.groupKey,
                                run.items
                              )
                            }
                            className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold uppercase hover:bg-rose-400 cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setInlineDeleteGroupKey(null)}
                            className="px-1.5 py-0.2 rounded-full bg-black/50 text-white/85 text-[9px] font-bold uppercase hover:text-white cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        /* ── Standard Group Bubble Label + Pencil, Gear, Trash Can Icons ── */
                        <>
                          <span>{groupTitle}</span>
                          {isCustomizingOrder && (
                            <span className="inline-flex items-center gap-1 ml-1 pl-1 border-l border-white/20">
                              {/* 1. PENCIL ICON: Edit Group Name Inline */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInlineDeleteGroupKey(null);
                                  setInlineRenameGroupKey(run.groupKey);
                                  setInlineRenameText(
                                    groupMeta?.label ||
                                      groupMeta?.shortLabel ||
                                      groupTitle
                                  );
                                }}
                                title={`Edit "${groupTitle}" name`}
                                className="inline-flex items-center justify-center rounded-full p-1 bg-black/35 text-white/90 hover:bg-[#FFE394] hover:text-[#07162B] transition-colors cursor-pointer"
                              >
                                <Pencil className="h-2.5 w-2.5 shrink-0" />
                              </button>

                              {/* 2. GEAR ICON: Choose Cards in This Group */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInlineRenameGroupKey(null);
                                  setInlineDeleteGroupKey(null);
                                  setSelectedGroupBubbleKey((prev) =>
                                    prev === (run.groupKey as LogicalStageGroup)
                                      ? null
                                      : (run.groupKey as LogicalStageGroup)
                                  );
                                }}
                                title={
                                  isGroupBubbleSelected
                                    ? `Done choosing cards for "${groupTitle}"`
                                    : `Choose which stage cards belong in "${groupTitle}"`
                                }
                                className={cn(
                                  "inline-flex items-center justify-center rounded-full transition-colors cursor-pointer",
                                  isGroupBubbleSelected
                                    ? "bg-[#FFE394] text-[#07162B] px-1.5 py-0.5 text-[9px] font-sans font-bold gap-0.5"
                                    : "bg-black/35 text-white/90 p-1 hover:bg-[#FFE394] hover:text-[#07162B]"
                                )}
                              >
                                <Settings className="h-2.5 w-2.5 shrink-0" />
                                {isGroupBubbleSelected && <span>Cards</span>}
                              </button>

                              {/* 3. TRASH CAN ICON: Offer Inline Delete */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInlineRenameGroupKey(null);
                                  setInlineDeleteGroupKey(run.groupKey);
                                }}
                                title={`Delete "${groupTitle}" group`}
                                className="inline-flex items-center justify-center rounded-full p-1 bg-black/35 text-rose-300 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-2.5 w-2.5 shrink-0" />
                              </button>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  /* Ungrouped Cards in Customize Mode: Offer Inline "+ New Group" Bubble Above Ungrouped Cards */
                  isCustomizingOrder && (
                    <div className="relative z-10 inline-flex items-center justify-center">
                      {inlineNewGroupRunIdx === runIdx ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#FFE394] bg-[#0A192F] shadow-md">
                          <input
                            ref={inlineNewGroupInputRef}
                            type="text"
                            value={inlineNewGroupText}
                            onChange={(e) =>
                              setInlineNewGroupText(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateInlineNewGroup(run.items);
                              } else if (e.key === "Escape") {
                                setInlineNewGroupRunIdx(null);
                                setInlineNewGroupText("");
                              }
                            }}
                            placeholder="New group name..."
                            className="w-28 px-1.5 py-0.2 rounded bg-[#020A17] border border-[#FFE394]/60 text-[10px] font-serif font-bold text-[#FFF4D4] uppercase focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleCreateInlineNewGroup(run.items)
                            }
                            className="p-0.5 rounded-full bg-emerald-500 text-[#04130D] cursor-pointer"
                            title="Create group"
                          >
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInlineNewGroupRunIdx(null);
                              setInlineNewGroupText("");
                            }}
                            className="p-0.5 rounded-full bg-black/50 text-white/80 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="h-2.5 w-2.5 stroke-[2.5]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineNewGroupRunIdx(runIdx);
                            setInlineNewGroupText("");
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-dashed border-[#C5A059]/70 bg-[#0A192F]/90 text-[#FFE394] hover:border-[#FFE394] text-[10px] font-serif font-bold uppercase tracking-wider cursor-pointer"
                          title="Create a new group bracket for these ungrouped cards"
                        >
                          <Plus className="h-2.5 w-2.5 stroke-[2.8]" />
                          <span>New Group</span>
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Cards Row Inside This Bracket Group */}
              <div className="flex flex-nowrap items-end gap-2">
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
                        <div className="w-full h-[94px] rounded-[14px] border-2 border-dashed border-[#FFE394] bg-[#C5A059]/20 shadow-[0_0_16px_rgba(255,227,148,0.35)] flex flex-col items-center justify-center gap-1">
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
                        className="shrink-0 w-[148px] sm:w-[162px] flex flex-col justify-end"
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
                                  ? "#F4D484"
                                  : isCustomizingOrder
                                    ? "#FFE394"
                                    : jewel.border,
                          }}
                          className={cn(
                            "adm-stage-card w-full h-[94px] rounded-[14px] px-3 pt-3 pb-2.5 text-center border-[1.25px] flex flex-col items-center justify-between group",
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
                            isSelected &&
                              "ring-1 ring-[#FFE394]/70 shadow-[0_0_20px_rgba(244,204,114,0.34),0_12px_26px_rgba(0,0,0,0.86)]"
                          )}
                        >
                          {/* Blazing Luminous Top-Edge Neon Light Bar */}
                          <div
                            aria-hidden="true"
                            className="adm-stage-topbar"
                            style={{
                              background: jewel.topBarGradient,
                              boxShadow: jewel.topBarGlow,
                            }}
                          />

                          {/* Top-Left 6-Dots Grab Handle when Customize Order Mode is Active */}
                          {isCustomizingOrder && (
                            <div
                              className="absolute top-2 left-2 z-10 p-0.5 rounded bg-[#020A17]/80 border border-[#FFE394]/60 text-[#FFE394] shadow-sm flex items-center justify-center"
                              title="Grab and drag to reorder stage"
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                          )}

                          {/* Top-Right Group Membership Badge when a Group Bubble is clicked in Customize mode */}
                          {isCustomizingOrder && selectedGroupBubbleKey ? (
                            <div
                              className={cn(
                                "absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 border shadow-sm transition-colors",
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
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 pointer-events-none z-10">
                              {overdueCount > 0 && (
                                <span
                                  className="w-2 h-2 rounded-full bg-rose-400 shrink-0 shadow-[0_0_6px_rgba(251,113,133,0.85)]"
                                  title={`${overdueCount} case(s) need attention`}
                                />
                              )}
                              <ChevronRight
                                style={{
                                  color: isSelected ? "#FFE394" : "#DCE5F2",
                                }}
                                className="h-3.5 w-3.5 opacity-80 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5"
                              />
                            </div>
                          )}

                          {/* Center-by-Center Prominent Serif Count */}
                          <div className="flex-1 w-full flex items-center justify-center">
                            <span
                              style={{
                                color: isSelected ? "#FFE8A8" : jewel.countText,
                              }}
                              className={cn(
                                "text-[31px] font-serif font-bold tracking-tight leading-none text-center tabular-nums drop-shadow-[0_3px_8px_rgba(0,0,0,0.85)]",
                                count === 0 && !isSelected && "opacity-92"
                              )}
                            >
                              {count}
                            </span>
                          </div>

                          {/* Bottom Row: Centered Refined Stage Name */}
                          <span
                            style={{
                              color: isSelected ? "#FFF4D4" : jewel.text,
                            }}
                            className={cn(
                              "w-full text-center text-[12px] font-normal leading-tight truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]",
                              isSelected && "font-semibold"
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
                        <div className="w-full h-[94px] rounded-[14px] border-2 border-dashed border-[#FFE394] bg-[#C5A059]/20 shadow-[0_0_16px_rgba(255,227,148,0.35)] flex flex-col items-center justify-center gap-1">
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
                              className="w-full h-[94px] rounded-[14px] px-2 py-1.5 border-2 border-dashed flex flex-col items-center justify-between relative overflow-hidden shadow-[0_4px_20px_rgba(255,227,148,0.4)]"
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
                                : "w-[42px] mx-0.5"
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
                                "w-full h-[94px] rounded-[14px] relative overflow-hidden flex items-center justify-center cursor-pointer",
                                isAddSlotHoveredAfterThis
                                  ? "border-2 border-dashed border-[#FFE394]/90 bg-[#0A1E3C]/95 hover:bg-[#102B4E] shadow-[0_4px_20px_rgba(255,227,148,0.3)]"
                                  : "border border-transparent bg-transparent"
                              )}
                            >
                              {/* Default Bigger Square "+" Box Between Cards (fades out gently on hover) */}
                              <div
                                style={{
                                  transition:
                                    "opacity 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
                                }}
                                className={cn(
                                  "absolute inset-0 flex items-center justify-center pointer-events-none",
                                  isAddSlotHoveredAfterThis
                                    ? "opacity-0 scale-75"
                                    : "opacity-100 scale-100"
                                )}
                              >
                                <div className="w-9 h-9 rounded-lg bg-[#07162B] border-2 border-[#C5A059]/85 text-[#FFE394] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.75)]">
                                  <Plus className="h-4.5 w-4.5 stroke-[3]" />
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
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-[#F2CD80] to-[#C5A059] text-[#07162B] flex items-center justify-center shadow-[0_2px_10px_rgba(242,205,128,0.55)]">
                                  <Plus className="h-4 w-4 stroke-[3]" />
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

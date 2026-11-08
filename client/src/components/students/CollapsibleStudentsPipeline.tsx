import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  AlertCircle,
  X,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SavedViewsBar } from "@/components/pipeline/SavedViewsBar";
import { StageOverviewGrid } from "@/components/pipeline/StageOverviewGrid";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { PipelineCaseDrawer } from "@/components/pipeline/PipelineCaseDrawer";
import { CustomizePipelineModal } from "@/components/pipeline/CustomizePipelineModal";
import { NewViewModal } from "@/components/pipeline/NewViewModal";
import { AddStageModal } from "@/components/pipeline/AddStageModal";
import {
  DEFAULT_PIPELINE_STAGES_CLIENT,
  DEFAULT_SAVED_VIEWS_CLIENT,
  INITIAL_DEMO_CARDS,
  resolveLogicalStageGroup,
  resolveCaseActionStatus,
} from "@/components/pipeline/pipelineDefaults";
import type {
  PipelineStageItem,
  PipelineCardItem,
  SavedViewItem,
  PipelineFilters,
  PipelineGroupType,
  LogicalStageGroup,
  PipelineSortField,
  PipelineSortDirection,
} from "@/components/pipeline/types";

function matchesPlanFilter(cardPlan: string, filterPlan: string): boolean {
  const c = (cardPlan || "").toLowerCase();
  const f = (filterPlan || "").toLowerCase();
  if (f === "$55" || f === "navigator") return c === "$55" || c.includes("navigator");
  if (f === "$105" || f === "anchor") return c === "$105" || c.includes("anchor");
  if (f === "family") return c.includes("family");
  if (f === "scholarship") return c.includes("scholarship");
  if (f === "pay per use") return c.includes("pay per use");
  if (f === "tools only") return c.includes("tools") || c.includes("vault");
  if (f === "on hold") return c.includes("hold");
  return c === f;
}

export interface PipelineActiveFilterSummary {
  hasActivePipelineFilter: boolean;
  matchingStudentIds: Set<number> | null;
  selectedStageName: string | null;
  activeViewName: string;
  searchQuery: string;
  needsAttentionOnly: boolean;
  selectedAdvocate?: string;
  clearAllPipelineFilters: () => void;
}

interface CollapsibleStudentsPipelineProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  onFilterStateChange?: (summary: PipelineActiveFilterSummary) => void;
}

export function CollapsibleStudentsPipeline({
  isOpen,
  onToggleOpen,
  onFilterStateChange,
}: CollapsibleStudentsPipelineProps) {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const currentUserName = user?.name || "Byron Honea";

  // ── Backend Queries ─────────────────────────────────────────────────────────
  const { data: serverStages } = trpc.pipeline.stages.list.useQuery();
  const { data: serverViews } = trpc.pipeline.views.list.useQuery();
  const { data: serverCards } = trpc.pipeline.cards.list.useQuery();

  // ── Backend Mutations ───────────────────────────────────────────────────────
  const updateStageMutation = trpc.pipeline.cards.updateStage.useMutation({
    onSuccess: () => {
      utils.pipeline.cards.list.invalidate();
      utils.contacts.list.invalidate();
      utils.caseActivity.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to update pipeline stage"),
  });

  const assignAdvocateMutation = trpc.pipeline.cards.assignAdvocate.useMutation({
    onSuccess: () => {
      utils.pipeline.cards.list.invalidate();
      utils.contacts.list.invalidate();
      utils.caseActivity.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to assign advocate"),
  });

  const upsertStageMutation = trpc.pipeline.stages.upsert.useMutation({
    onSuccess: () => {
      utils.pipeline.stages.list.invalidate();
      utils.pipeline.cards.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to save stage"),
  });

  const reorderStagesMutation = trpc.pipeline.stages.reorder.useMutation({
    onSuccess: () => utils.pipeline.stages.list.invalidate(),
    onError: (err) => toast.error(err.message || "Failed to reorder stages"),
  });

  const archiveStageMutation = trpc.pipeline.stages.archive.useMutation({
    onSuccess: () => {
      utils.pipeline.stages.list.invalidate();
      utils.pipeline.cards.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to archive stage"),
  });

  const deleteStageMutation = trpc.pipeline.stages.delete.useMutation({
    onSuccess: () => {
      utils.pipeline.stages.list.invalidate();
      utils.pipeline.cards.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to delete stage"),
  });

  const upsertViewMutation = trpc.pipeline.views.upsert.useMutation({
    onSuccess: () => utils.pipeline.views.list.invalidate(),
    onError: (err) => toast.error(err.message || "Failed to save pipeline view"),
  });

  const deleteViewMutation = trpc.pipeline.views.delete.useMutation({
    onSuccess: () => utils.pipeline.views.list.invalidate(),
    onError: (err) => toast.error(err.message || "Failed to delete custom view"),
  });

  // ── UI State ────────────────────────────────────────────────────────────────
  const [stagesState, setStagesState] = useState<PipelineStageItem[]>(
    DEFAULT_PIPELINE_STAGES_CLIENT
  );
  const [cardsState, setCardsState] = useState<PipelineCardItem[]>(
    INITIAL_DEMO_CARDS
  );
  const [customViewsState, setCustomViewsState] = useState<SavedViewItem[]>([]);

  const [activeViewSlug, setActiveViewSlug] = useState("all-clients");
  const [filters, setFilters] = useState<PipelineFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null);
  const [pipelineDisplayMode, setPipelineDisplayMode] = useState<"list" | "board">("list");
  const [sortField, setSortField] = useState<PipelineSortField>("name");
  const [sortDirection, setSortDirection] = useState<PipelineSortDirection>("asc");
  const [selectedCaseForDrawer, setSelectedCaseForDrawer] =
    useState<PipelineCardItem | null>(null);

  // Modals
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [showNewViewModal, setShowNewViewModal] = useState(false);

  useEffect(() => {
    if (serverStages && serverStages.length > 0) {
      const normalized = serverStages
        .map((ss: any, idx: number) => ({
          id: ss.id,
          name: ss.name,
          slug: ss.slug || ss.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          order: ss.order ?? idx + 1,
          accentColor: ss.accentColor || "#60A5FA",
          iconName: ss.iconName || "Compass",
          category: ss.category || "active",
          pipelineGroup: (ss.pipelineGroup || "active_project") as PipelineGroupType,
          logicalGroup: resolveLogicalStageGroup(
            ss.name,
            ss.category,
            ss.logicalGroup
          ),
          isArchived: Boolean(ss.isArchived),
          isDefault: Boolean(ss.isDefault),
        }))
        .sort((a, b) => a.order - b.order);
      setStagesState(normalized);
    }
  }, [serverStages]);

  useEffect(() => {
    if (serverCards && Array.isArray(serverCards)) {
      if (serverCards.length > 0) {
        const realIds = new Set(serverCards.map((c: any) => Number(c.id)));
        const merged = [
          ...(serverCards as PipelineCardItem[]),
          ...INITIAL_DEMO_CARDS.filter((d) => !realIds.has(d.id)),
        ];
        setCardsState(merged);
      }
    }
  }, [serverCards]);

  const allSavedViews: SavedViewItem[] = useMemo(() => {
    const map = new Map<string, SavedViewItem>();
    DEFAULT_SAVED_VIEWS_CLIENT.forEach((v) => map.set(v.slug, v));
    if (serverViews && Array.isArray(serverViews)) {
      serverViews.forEach((sv: any) => {
        const defaultMatch = DEFAULT_SAVED_VIEWS_CLIENT.find(
          (dv) => dv.slug === sv.slug
        );
        map.set(sv.slug, {
          ...sv,
          name: defaultMatch ? defaultMatch.name : sv.name,
        });
      });
    }
    customViewsState.forEach((cv) => map.set(cv.slug, cv));
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [serverViews, customViewsState]);

  const activeViewObj = useMemo(
    () => allSavedViews.find((v) => v.slug === activeViewSlug),
    [allSavedViews, activeViewSlug]
  );

  const viewRules = useMemo(() => {
    if (!activeViewObj?.filtersJson) return {};
    try {
      return JSON.parse(activeViewObj.filtersJson);
    } catch {
      return {};
    }
  }, [activeViewObj]);

  const matchesCardRules = (card: PipelineCardItem, rules: PipelineFilters) => {
    if (rules.isMyWork) {
      const adv = (card.assignedAdvocateName || "").toLowerCase();
      const cur = currentUserName.toLowerCase();
      const isMatch =
        adv.includes(cur) ||
        cur.includes(adv) ||
        adv === "byron honea" ||
        adv === "erin smith";
      if (!isMatch) return false;
    }
    if (rules.pipelineGroup) {
      const group =
        card.pipelineGroup || (card.isOpportunity ? "opportunity" : "active_project");
      if (group !== rules.pipelineGroup) return false;
    }
    if (rules.logicalGroup) {
      const lg = resolveLogicalStageGroup(
        card.pipelineStage,
        undefined,
        card.logicalGroup
      );
      if (lg !== rules.logicalGroup) return false;
    }
    if (rules.planTier && !matchesPlanFilter(card.planTier, rules.planTier)) {
      return false;
    }
    if (
      rules.accountStatus &&
      (card.accountStatus || "").toLowerCase() !== rules.accountStatus.toLowerCase()
    ) {
      return false;
    }
    if (
      rules.billingStatus &&
      (card.billingStatus || "").toLowerCase() !== rules.billingStatus.toLowerCase()
    ) {
      return false;
    }
    if (
      rules.advocate &&
      (card.assignedAdvocateName || "").toLowerCase() !== rules.advocate.toLowerCase()
    ) {
      return false;
    }
    if (
      rules.district &&
      !(card.countyDistrict || "").toLowerCase().includes(rules.district.toLowerCase())
    ) {
      return false;
    }
    if (
      rules.caseType &&
      (card.planType || "").toLowerCase() !== rules.caseType.toLowerCase()
    ) {
      return false;
    }
    if (
      rules.stage &&
      (card.pipelineStage || "").toLowerCase() !== rules.stage.toLowerCase()
    ) {
      return false;
    }
    if (rules.needsAttentionOnly) {
      const statusMeta = resolveCaseActionStatus(card);
      if (!card.needsAttention && !statusMeta.isOverdue) {
        return false;
      }
    }
    return true;
  };

  const filteredCards = useMemo(() => {
    const stageOrderMap = new Map<string, number>();
    stagesState.forEach((s) => stageOrderMap.set(s.name.toLowerCase(), s.order));

    const result = cardsState.filter((card) => {
      if (!matchesCardRules(card, viewRules)) return false;
      if (!matchesCardRules(card, filters)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = [
          card.fullName,
          card.parentName,
          card.parentEmail,
          card.schoolName,
          card.countyDistrict,
          card.caseId,
          card.pipelineStage,
          card.assignedAdvocateName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      if (sortField === "name") return a.fullName.localeCompare(b.fullName) * dir;
      if (sortField === "family") {
        return (a.parentName || a.lastName).localeCompare(b.parentName || b.lastName) * dir;
      }
      if (sortField === "stage") {
        const oa = stageOrderMap.get(a.pipelineStage.toLowerCase()) ?? 99;
        const ob = stageOrderMap.get(b.pipelineStage.toLowerCase()) ?? 99;
        return (oa - ob) * dir;
      }
      if (sortField === "lastActivity") {
        const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return (tb - ta) * dir;
      }
      if (sortField === "nextDate") {
        return (a.meetingDate || a.primaryTask || "").localeCompare(
          b.meetingDate || b.primaryTask || ""
        ) * dir;
      }
      return 0;
    });

    return result;
  }, [
    cardsState,
    viewRules,
    filters,
    searchQuery,
    sortField,
    sortDirection,
    stagesState,
    currentUserName,
  ]);

  const displayedCards = useMemo(() => {
    if (!selectedStageFilter) return filteredCards;
    return filteredCards.filter(
      (c) => c.pipelineStage.toLowerCase() === selectedStageFilter.toLowerCase()
    );
  }, [filteredCards, selectedStageFilter]);

  const displayedStages = useMemo(() => {
    return stagesState.filter((s) => {
      if (s.isArchived) return false;
      if (
        selectedStageFilter &&
        s.name.toLowerCase() !== selectedStageFilter.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [stagesState, selectedStageFilter]);

  const attentionCount = useMemo(
    () =>
      filteredCards.filter(
        (c) => resolveCaseActionStatus(c).isOverdue || c.needsAttention
      ).length,
    [filteredCards]
  );

  const viewCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allSavedViews.forEach((view) => {
      try {
        const rules = JSON.parse(view.filtersJson || "{}");
        counts[view.slug] = cardsState.filter((card) =>
          matchesCardRules(card, rules)
        ).length;
      } catch {
        counts[view.slug] = cardsState.length;
      }
    });
    return counts;
  }, [cardsState, allSavedViews, currentUserName]);

  const hasActivePipelineFilter = Boolean(
    activeViewSlug !== "all-clients" ||
      selectedStageFilter ||
      searchQuery.trim() ||
      Object.keys(filters).some((k) => Boolean((filters as any)[k]))
  );

  const clearAllPipelineFilters = () => {
    setActiveViewSlug("all-clients");
    setSelectedStageFilter(null);
    setFilters({});
    setSearchQuery("");
  };

  // Notify parent Students page whenever pipeline filters change so the student list/cards below stay in sync
  useEffect(() => {
    if (!onFilterStateChange) return;
    const matchingIds = hasActivePipelineFilter
      ? new Set(displayedCards.map((c) => Number(c.id)))
      : null;

    onFilterStateChange({
      hasActivePipelineFilter,
      matchingStudentIds: matchingIds,
      selectedStageName: selectedStageFilter,
      activeViewName: activeViewObj?.name || "Main View",
      searchQuery,
      needsAttentionOnly: Boolean(filters.needsAttentionOnly),
      selectedAdvocate: filters.advocate,
      clearAllPipelineFilters,
    });
  }, [
    hasActivePipelineFilter,
    displayedCards,
    selectedStageFilter,
    activeViewObj?.name,
    searchQuery,
    filters,
  ]);

  // ── Action Handlers ─────────────────────────────────────────────────────────
  const handleMoveCard = (cardId: number, targetStageName: string) => {
    const targetStageObj = stagesState.find(
      (s) => s.name.toLowerCase() === targetStageName.toLowerCase()
    );
    const nextGroup: PipelineGroupType =
      targetStageObj?.pipelineGroup || "active_project";
    const nextLogicalGroup: LogicalStageGroup = resolveLogicalStageGroup(
      targetStageName,
      targetStageObj?.category,
      targetStageObj?.logicalGroup
    );

    setCardsState((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const updated: PipelineCardItem = {
          ...c,
          pipelineStage: targetStageName,
          pipelineGroup: nextGroup,
          logicalGroup: nextLogicalGroup,
          isOpportunity: nextGroup === "opportunity",
          lastActivityText: `Moved to ${targetStageName}`,
          lastActivityAt: new Date().toISOString(),
        };
        if (selectedCaseForDrawer?.id === cardId) {
          setSelectedCaseForDrawer(updated);
        }
        return updated;
      })
    );

    toast.success(`Moved case to ${targetStageName}`);
    updateStageMutation.mutate({
      contactId: cardId,
      stage: targetStageName,
    });
  };

  const handleAssignAdvocate = (cardId: number, advocateName: string) => {
    const initials = advocateName
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2);

    setCardsState((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const updated: PipelineCardItem = {
          ...c,
          assignedAdvocateName: advocateName,
          assignedAdvocateInitials: initials,
        };
        if (selectedCaseForDrawer?.id === cardId) {
          setSelectedCaseForDrawer(updated);
        }
        return updated;
      })
    );

    toast.success(`Assigned advocate: ${advocateName}`);
    assignAdvocateMutation.mutate({
      contactId: cardId,
      advocateName,
    });
  };

  const handleReorderStages = (draggedStageId: number, targetStageId: number) => {
    setStagesState((prev) => {
      const draggedIdx = prev.findIndex((s) => s.id === draggedStageId);
      const targetIdx = prev.findIndex((s) => s.id === targetStageId);
      if (draggedIdx < 0 || targetIdx < 0) return prev;

      const copy = [...prev];
      const [moved] = copy.splice(draggedIdx, 1);
      copy.splice(targetIdx, 0, moved);
      const reordered = copy.map((s, idx) => ({ ...s, order: idx + 1 }));

      reorderStagesMutation.mutate(
        reordered.map((s) => ({ id: s.id, order: s.order }))
      );
      toast.success("Pipeline stages reordered");
      return reordered;
    });
  };

  const handleSaveStages = (updatedStages: PipelineStageItem[]) => {
    setStagesState(updatedStages);
    reorderStagesMutation.mutate(
      updatedStages.map((s, idx) => ({ id: s.id, order: idx + 1 }))
    );
    updatedStages.forEach((s) => {
      upsertStageMutation.mutate({
        id: s.id,
        name: s.name,
        order: s.order,
        accentColor: s.accentColor,
        iconName: s.iconName,
        category: s.category,
        pipelineGroup: s.pipelineGroup,
        isArchived: s.isArchived,
      });
    });
    toast.success("Pipeline stages saved");
  };

  const handleAddCustomStage = (stageData: Partial<PipelineStageItem>) => {
    if (!stageData.name) return;
    const newStage: PipelineStageItem = {
      id: Date.now(),
      name: stageData.name,
      slug: stageData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      order: stagesState.length + 1,
      accentColor: stageData.accentColor || "#60A5FA",
      iconName: stageData.iconName || "Compass",
      category: stageData.category || "active",
      pipelineGroup: stageData.pipelineGroup || "active_project",
      logicalGroup: resolveLogicalStageGroup(
        stageData.name,
        stageData.category,
        stageData.logicalGroup
      ),
      isArchived: false,
      isDefault: false,
    };

    setStagesState((prev) => [...prev, newStage]);
    upsertStageMutation.mutate({
      name: newStage.name,
      accentColor: newStage.accentColor,
      category: newStage.category,
      pipelineGroup: newStage.pipelineGroup,
      iconName: newStage.iconName,
      order: newStage.order,
    });
  };

  const handleSaveNewView = (newViewData: {
    name: string;
    filters: PipelineFilters;
    isPinned: boolean;
    isPrivate: boolean;
  }) => {
    const slug = newViewData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newViewItem: SavedViewItem = {
      id: Date.now(),
      name: newViewData.name,
      slug,
      filtersJson: JSON.stringify(newViewData.filters),
      isPinned: newViewData.isPinned,
      isPrivate: newViewData.isPrivate,
      isDefault: false,
      order: allSavedViews.length + 1,
    };

    setCustomViewsState((prev) => [...prev, newViewItem]);
    upsertViewMutation.mutate({
      name: newViewData.name,
      slug,
      filtersJson: newViewItem.filtersJson,
      isPinned: newViewData.isPinned,
      isPrivate: newViewData.isPrivate,
      order: newViewItem.order,
    });
    setActiveViewSlug(slug);
    toast.success(`Saved view "${newViewData.name}" created`);
  };

  const handleDeleteView = (view: SavedViewItem) => {
    if (view.isDefault) return;
    setCustomViewsState((prev) => prev.filter((v) => v.slug !== view.slug));
    if (view.id) {
      deleteViewMutation.mutate({ id: view.id });
    }
    if (activeViewSlug === view.slug) {
      setActiveViewSlug("all-clients");
    }
    toast.success(`Deleted custom view "${view.name}"`);
  };

  // Top stages with cases for the ultra-compact collapsed preview strip
  const populatedStagesPreview = useMemo(() => {
    const counts = new Map<string, number>();
    filteredCards.forEach((c) => {
      const k = (c.pipelineStage || "Discovery").toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return stagesState
      .filter((s) => !s.isArchived && (counts.get(s.name.toLowerCase()) || 0) > 0)
      .slice(0, 5)
      .map((s) => ({
        name: s.name,
        count: counts.get(s.name.toLowerCase()) || 0,
        color: s.accentColor || "#60A5FA",
      }));
  }, [stagesState, filteredCards]);

  return (
    <div className="w-full bg-[#000820] border-b border-[#8A6731]/35 transition-all select-none">
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12 py-2">
        {!isOpen ? (
          /* ── Closed State: ONLY the "Open Pipeline ⌄" pill is visible ── */
          <div className="flex items-center">
            <button
              type="button"
              onClick={onToggleOpen}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#071326] text-[#94A3B8] border border-[#1E2E48] hover:border-[#C5A059]/50 hover:text-[#FFF4D4] transition-all cursor-pointer focus:outline-hidden"
              title="Open Pipeline"
            >
              <span>Open Pipeline</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#C5A059]" />
            </button>
          </div>
        ) : (
          /* ── Open State: Full "Pipeline" Header + Saved Views + Stage Rail ── */
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={onToggleOpen}
                  className="group inline-flex items-center gap-2 text-left cursor-pointer focus:outline-hidden"
                  title="Close Pipeline"
                >
                  <span className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] tracking-tight transition-colors">
                    Pipeline
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#102B4E] text-[#FFE394] border border-[#C5A059]/60 shadow-xs transition-all">
                    <span>Close Pipeline</span>
                    <ChevronUp className="h-3.5 w-3.5 text-[#C5A059]" />
                  </span>
                </button>
              </div>

              {/* Right Side Actions: + New Stage */}
              <div className="flex items-center gap-2">
                {hasActivePipelineFilter && (
                  <button
                    type="button"
                    onClick={clearAllPipelineFilters}
                    className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-[#C5A059]/15 hover:bg-[#C5A059]/25 text-[#FFE394] border border-[#C5A059]/45 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                    <span>
                      Clear Filter
                      {selectedStageFilter ? `: ${selectedStageFilter}` : ""}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAddStageModal(true)}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-[#0A192F] hover:bg-[#102B4E] text-[#FFE394] border border-[#233554] hover:border-[#C5A059]/60 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-[#C5A059]" />
                  <span>New Stage</span>
                </button>
              </div>
            </div>

            <div className="mt-2.5 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* LEVEL 1: Saved Views + LEVEL 2: Compact Toolbar */}
              <SavedViewsBar
                views={allSavedViews}
                activeViewSlug={activeViewSlug}
                onSelectView={(view) => {
                  setActiveViewSlug(view.slug);
                }}
                onTogglePinView={(view) => {
                  setCustomViewsState((prev) =>
                    prev.map((v) =>
                      v.slug === view.slug ? { ...v, isPinned: !v.isPinned } : v
                    )
                  );
                  upsertViewMutation.mutate({
                    id: view.id,
                    name: view.name,
                    slug: view.slug,
                    filtersJson: view.filtersJson,
                    isPinned: !view.isPinned,
                    isPrivate: view.isPrivate,
                    order: view.order,
                  });
                }}
                onDeleteView={handleDeleteView}
                onNewView={() => setShowNewViewModal(true)}
                viewCounts={viewCounts}
                filters={filters}
                onChangeFilters={setFilters}
                onClearFilters={() => {
                  setFilters({});
                  setSelectedStageFilter(null);
                }}
                matchingCount={displayedCards.length}
                attentionCount={attentionCount}
                sortField={sortField}
                sortDirection={sortDirection}
                onChangeSort={(field, dir) => {
                  setSortField(field);
                  if (dir) setSortDirection(dir);
                }}
                stages={stagesState}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedAdvocate={filters.advocate}
                onSelectAdvocate={(advocate) =>
                  setFilters((prev) => ({ ...prev, advocate }))
                }
                onCustomizePipeline={() => setShowCustomizeModal(true)}
                viewMode={pipelineDisplayMode}
                onViewModeChange={setPipelineDisplayMode}
              />

              {/* LEVEL 3: One Continuous Horizontal Pipeline Stage Rail */}
              <StageOverviewGrid
                stages={stagesState}
                cards={filteredCards}
                selectedStageName={selectedStageFilter}
                onSelectStage={setSelectedStageFilter}
                onDropCardOnStage={handleMoveCard}
              />

              {/* Optional Interactive Stage Columns Board when user switches Pipeline toggle to Board */}
              {pipelineDisplayMode === "board" && (
                <div className="pt-2 border-t border-[#1E2E48]/80">
                  <KanbanBoard
                    stages={displayedStages}
                    allStages={stagesState}
                    cards={displayedCards}
                    onMoveCard={handleMoveCard}
                    onAssignAdvocate={handleAssignAdvocate}
                    onSelectCard={(card) => setSelectedCaseForDrawer(card)}
                    onReorderStages={handleReorderStages}
                    onAddCard={(stageName) => {
                      toast.info(`Opening intake for ${stageName}`);
                      setLocation("/leads");
                    }}
                    onAddCustomStage={() => setShowAddStageModal(true)}
                    onEditStage={() => setShowCustomizeModal(true)}
                    onArchiveStage={(stage) =>
                      archiveStageMutation.mutate({ id: stage.id })
                    }
                    onDeleteStage={(stage) =>
                      deleteStageMutation.mutate({ id: stage.id })
                    }
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Contextual Case Details Drawer */}
      <PipelineCaseDrawer
        card={selectedCaseForDrawer}
        open={Boolean(selectedCaseForDrawer)}
        onOpenChange={(open) => {
          if (!open) setSelectedCaseForDrawer(null);
        }}
        stages={stagesState}
        onMoveCard={handleMoveCard}
        onAssignAdvocate={handleAssignAdvocate}
      />

      {/* Pipeline Modals */}
      <CustomizePipelineModal
        open={showCustomizeModal}
        onOpenChange={setShowCustomizeModal}
        stages={stagesState}
        onSaveStages={handleSaveStages}
      />

      <NewViewModal
        open={showNewViewModal}
        onOpenChange={setShowNewViewModal}
        onSaveView={handleSaveNewView}
      />

      <AddStageModal
        open={showAddStageModal}
        onOpenChange={setShowAddStageModal}
        onAddStage={handleAddCustomStage}
      />
    </div>
  );
}


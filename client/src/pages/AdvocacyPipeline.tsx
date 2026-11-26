import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { AdvocacyPipelineHeader } from "@/components/pipeline/AdvocacyPipelineHeader";
import { SavedViewsBar } from "@/components/pipeline/SavedViewsBar";
import { StageOverviewGrid } from "@/components/pipeline/StageOverviewGrid";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { PipelineListView } from "@/components/pipeline/PipelineListView";
import { PipelineCaseDrawer } from "@/components/pipeline/PipelineCaseDrawer";
import { CustomizePipelineModal } from "@/components/pipeline/CustomizePipelineModal";
import { PipelineGroupModificationsModal } from "@/components/pipeline/PipelineGroupModificationsModal";
import { NewViewModal } from "@/components/pipeline/NewViewModal";
import { AddStageModal } from "@/components/pipeline/AddStageModal";
import {
  DEFAULT_PIPELINE_STAGES_CLIENT,
  DEFAULT_SAVED_VIEWS_CLIENT,
  INITIAL_DEMO_CARDS,
  loadPipelineGroups,
  savePipelineGroups,
  resolveLogicalStageGroup,
  resolveCaseActionStatus,
} from "@/components/pipeline/pipelineDefaults";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import type {
  PipelineStageItem,
  PipelineCardItem,
  SavedViewItem,
  PipelineFilters,
  PipelineGroupType,
  LogicalStageGroup,
  PipelineGroupDefinition,
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

export default function AdvocacyPipeline() {
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
      utils.caseActivity.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to update pipeline stage"),
  });

  const assignAdvocateMutation = trpc.pipeline.cards.assignAdvocate.useMutation({
    onSuccess: () => {
      utils.pipeline.cards.list.invalidate();
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
  const [viewMode, setViewMode] = useState<"board" | "list">("list");
  const [sortField, setSortField] = useState<PipelineSortField>("name");
  const [sortDirection, setSortDirection] = useState<PipelineSortDirection>("asc");
  const [selectedCaseForDrawer, setSelectedCaseForDrawer] =
    useState<PipelineCardItem | null>(null);

  // Modals & Inline Customize Order Mode
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showGroupModificationsModal, setShowGroupModificationsModal] =
    useState(false);
  const [focusedGroupForModal, setFocusedGroupForModal] =
    useState<LogicalStageGroup | null>(null);
  const [pipelineGroups, setPipelineGroups] = useState<
    PipelineGroupDefinition[]
  >(() => loadPipelineGroups());
  const [isCustomizingOrder, setIsCustomizingOrder] = useState(false);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [pendingInsertStageOrder, setPendingInsertStageOrder] = useState<number | null>(null);
  const [showNewViewModal, setShowNewViewModal] = useState(false);

  const [stageGroupOverrides, setStageGroupOverrides] = useState<
    Record<string, LogicalStageGroup>
  >(() => {
    try {
      const saved = localStorage.getItem("waypoint_pipeline_stage_groups");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync stages from server without overwriting existing custom stages
  useEffect(() => {
    if (serverStages && serverStages.length > 0) {
      const normalized = serverStages
        .map((ss: any, idx: number) => {
          const displayName =
            String(ss.name || "").trim().toLowerCase() === "closed"
              ? "Archived"
              : ss.name;
          const overrideGroup =
            stageGroupOverrides[displayName.toLowerCase()];
          return {
            id: ss.id,
            name: displayName,
            slug: ss.slug || displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            order: ss.order ?? idx + 1,
            accentColor: ss.accentColor || "#60A5FA",
            iconName: ss.iconName || "Compass",
            category: ss.category || "active",
            pipelineGroup: (ss.pipelineGroup || "active_project") as PipelineGroupType,
            logicalGroup: resolveLogicalStageGroup(
              displayName,
              ss.category,
              overrideGroup || ss.logicalGroup
            ),
            isArchived: Boolean(ss.isArchived),
            isDefault: Boolean(ss.isDefault),
          };
        })
        .sort((a, b) => a.order - b.order);

      const requiredTrailingStages: {
        id: number;
        name: string;
        slug: string;
        accentColor: string;
        iconName: string;
      }[] = [
        {
          id: 9017,
          name: "Needs Attention",
          slug: "needs-attention",
          accentColor: "#F87171",
          iconName: "AlertCircle",
        },
        {
          id: 9018,
          name: "30 Days Past Due",
          slug: "30-days-past-due",
          accentColor: "#FB923C",
          iconName: "Clock",
        },
        {
          id: 9019,
          name: "60 Days Past Due",
          slug: "60-days-past-due",
          accentColor: "#F87171",
          iconName: "AlertCircle",
        },
        {
          id: 9020,
          name: "90 Days Past Due",
          slug: "90-days-past-due",
          accentColor: "#E11D48",
          iconName: "AlertCircle",
        },
        {
          id: 9021,
          name: "Blacklisted",
          slug: "blacklisted",
          accentColor: "#991B1B",
          iconName: "Shield",
        },
      ];

      requiredTrailingStages.forEach((req) => {
        const exists = normalized.some(
          (s) => s.name.toLowerCase() === req.name.toLowerCase()
        );
        if (!exists) {
          const overrideGroup = stageGroupOverrides[req.name.toLowerCase()];
          normalized.push({
            id: req.id,
            name: req.name,
            slug: req.slug,
            order: normalized.length + 1,
            accentColor: req.accentColor,
            iconName: req.iconName,
            category: "escalation",
            pipelineGroup: "active_project",
            logicalGroup: overrideGroup || "attention_past_due",
            isArchived: false,
            isDefault: true,
          });
        }
      });
      setStagesState(normalized);
    }
  }, [serverStages, stageGroupOverrides]);

  // Sync real student & family cards from server merged with demo cards
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

  // Combine default + server + custom views (preserving short readable names)
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

  // ── Filtering & Sorting Engine ──────────────────────────────────────────────
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
      const group = card.pipelineGroup || (card.isOpportunity ? "opportunity" : "active_project");
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
      if (sortField === "name") {
        return a.fullName.localeCompare(b.fullName) * dir;
      }
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
    const target = selectedStageFilter.toLowerCase();
    return filteredCards.filter((c) => {
      const st = c.pipelineStage.toLowerCase();
      if (target === "needs attention") {
        return (
          st === "needs attention" ||
          Boolean(c.needsAttention) ||
          resolveCaseActionStatus(c).isOverdue
        );
      }
      if (target === "archived" || target === "closed") {
        return st === "archived" || st === "closed";
      }
      return st === target;
    });
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

    toast.success(`Assigned employee: ${advocateName}`);
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

  const handleAssignStageGroup = (
    stageId: number,
    logicalGroup: LogicalStageGroup
  ) => {
    setStagesState((prev) =>
      prev.map((s) => {
        if (s.id !== stageId) return s;
        setStageGroupOverrides((ov) => {
          const next = { ...ov, [s.name.toLowerCase()]: logicalGroup };
          try {
            localStorage.setItem(
              "waypoint_pipeline_stage_groups",
              JSON.stringify(next)
            );
          } catch {}
          return next;
        });
        return { ...s, logicalGroup };
      })
    );
  };

  const handleSaveGroupModifications = ({
    groups: updatedGroups,
    stageGroupAssignments,
    newStagesToCreate,
    reorderStagesByGroupOrder,
  }: {
    groups: PipelineGroupDefinition[];
    stageGroupAssignments: Record<number, LogicalStageGroup>;
    newStagesToCreate?: {
      name: string;
      accentColor: string;
      logicalGroup: LogicalStageGroup;
    }[];
    reorderStagesByGroupOrder?: boolean;
  }) => {
    setPipelineGroups(updatedGroups);
    savePipelineGroups(updatedGroups);

    setStagesState((prev) => {
      const nextOverrides = { ...stageGroupOverrides };
      let updatedList = prev.map((stage) => {
        const assignedGroup = stageGroupAssignments[stage.id];
        if (!assignedGroup) return stage;
        nextOverrides[stage.name.toLowerCase()] = assignedGroup;
        return {
          ...stage,
          logicalGroup: assignedGroup,
        };
      });

      if (newStagesToCreate && newStagesToCreate.length > 0) {
        newStagesToCreate.forEach((ns, idx) => {
          const createdStage: PipelineStageItem = {
            id: Date.now() + idx,
            name: ns.name,
            slug: ns.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            order: updatedList.length + 1,
            accentColor: ns.accentColor || "#C5A059",
            iconName: "Compass",
            category: "active",
            pipelineGroup: "active_project",
            logicalGroup: ns.logicalGroup,
            isArchived: false,
            isDefault: false,
          };
          nextOverrides[createdStage.name.toLowerCase()] = ns.logicalGroup;
          updatedList.push(createdStage);
          upsertStageMutation.mutate({
            name: createdStage.name,
            accentColor: createdStage.accentColor,
            category: createdStage.category,
            pipelineGroup: createdStage.pipelineGroup,
            iconName: createdStage.iconName,
            order: createdStage.order,
          });
        });
      }

      if (reorderStagesByGroupOrder) {
        const groupRank = new Map<string, number>();
        updatedGroups.forEach((g, i) => groupRank.set(g.key, i + 1));
        groupRank.set("ungrouped", 999);

        updatedList = [...updatedList]
          .sort((a, b) => {
            const ga =
              groupRank.get(
                resolveLogicalStageGroup(a.name, a.category, a.logicalGroup)
              ) ?? 998;
            const gb =
              groupRank.get(
                resolveLogicalStageGroup(b.name, b.category, b.logicalGroup)
              ) ?? 998;
            if (ga !== gb) return ga - gb;
            return a.order - b.order;
          })
          .map((s, idx) => ({ ...s, order: idx + 1 }));

        reorderStagesMutation.mutate(
          updatedList.map((s) => ({ id: s.id, order: s.order }))
        );
      }

      setStageGroupOverrides(nextOverrides);
      try {
        localStorage.setItem(
          "waypoint_pipeline_stage_groups",
          JSON.stringify(nextOverrides)
        );
      } catch {}

      return updatedList;
    });

    toast.success("Pipeline group modifications saved");
  };

  const handleAddCustomStage = (stageData: Partial<PipelineStageItem>) => {
    if (!stageData.name) return;
    const targetOrder = pendingInsertStageOrder ?? stagesState.length + 1;
    const newStage: PipelineStageItem = {
      id: Date.now(),
      name: stageData.name,
      slug: stageData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      order: targetOrder,
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

    setStagesState((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const insertIdx = Math.max(0, Math.min(sorted.length, targetOrder - 1));
      sorted.splice(insertIdx, 0, newStage);
      const reordered = sorted.map((s, i) => ({ ...s, order: i + 1 }));
      reorderStagesMutation.mutate(
        reordered.map((s) => ({ id: s.id, order: s.order }))
      );
      return reordered;
    });
    setPendingInsertStageOrder(null);
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

  return (
    <ScopedErrorBoundary moduleName="Advocacy Pipeline">
      <div className="min-h-screen text-slate-100 relative bg-[#040c18] w-full max-w-full overflow-x-hidden">
        <div className="adm-pipeline-deck px-4 sm:px-6 lg:px-8 pt-4 pb-3 space-y-3">
          {/* Compact Page Title Bar */}
          <AdvocacyPipelineHeader
          onViewArchive={() => setLocation("/archive")}
          selectedAdvocate={filters.advocate}
          onSelectAdvocate={(advocate) =>
            setFilters((prev) => ({ ...prev, advocate }))
          }
          onCustomizePipeline={() => setIsCustomizingOrder((prev) => !prev)}
          isCustomizingPipeline={isCustomizingOrder}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

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
          onCustomizePipeline={() => setIsCustomizingOrder((prev) => !prev)}
          isCustomizingPipeline={isCustomizingOrder}
          onViewArchive={() => setLocation("/archive")}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* LEVEL 3: One Continuous Horizontal Pipeline Stage Rail */}
        <StageOverviewGrid
          stages={stagesState}
          cards={filteredCards}
          groups={pipelineGroups}
          selectedStageName={selectedStageFilter}
          onSelectStage={setSelectedStageFilter}
          onDropCardOnStage={handleMoveCard}
          isCustomizingOrder={isCustomizingOrder}
          onToggleCustomizingOrder={() =>
            setIsCustomizingOrder((prev) => !prev)
          }
          onOpenGroupModifications={(focusedGroupKey) => {
            setFocusedGroupForModal(focusedGroupKey ?? null);
            setShowGroupModificationsModal(true);
          }}
          onReorderStages={handleReorderStages}
          onAssignStageGroup={handleAssignStageGroup}
          onInsertStageAtOrder={(insertOrder, inlineStageData) => {
            if (inlineStageData?.name) {
              const newStage: PipelineStageItem = {
                id: Date.now(),
                name: inlineStageData.name,
                slug: inlineStageData.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-"),
                order: insertOrder,
                accentColor: inlineStageData.accentColor || "#60A5FA",
                iconName: inlineStageData.iconName || "Compass",
                category: inlineStageData.category || "active",
                pipelineGroup:
                  inlineStageData.pipelineGroup || "active_project",
                logicalGroup: resolveLogicalStageGroup(
                  inlineStageData.name,
                  inlineStageData.category,
                  inlineStageData.logicalGroup
                ),
                isArchived: false,
                isDefault: false,
              };
              setStagesState((prev) => {
                const sorted = [...prev].sort((a, b) => a.order - b.order);
                const insertIdx = Math.max(
                  0,
                  Math.min(sorted.length, insertOrder - 1)
                );
                sorted.splice(insertIdx, 0, newStage);
                const reordered = sorted.map((s, i) => ({
                  ...s,
                  order: i + 1,
                }));
                reorderStagesMutation.mutate(
                  reordered.map((s) => ({ id: s.id, order: s.order }))
                );
                return reordered;
              });
              upsertStageMutation.mutate({
                name: newStage.name,
                accentColor: newStage.accentColor,
                category: newStage.category,
                pipelineGroup: newStage.pipelineGroup,
                iconName: newStage.iconName,
                order: newStage.order,
              });
              toast.success(`Added "${newStage.name}" card to pipeline`);
              return;
            }
            setPendingInsertStageOrder(insertOrder);
            setShowAddStageModal(true);
          }}
        />
        </div>

        {/* Focused Case Workspace Directly Beneath the Pipeline */}
        <div className="p-3 sm:px-6 lg:px-8 py-4 space-y-3">
        {viewMode === "list" || selectedStageFilter ? (
          <PipelineListView
            cards={displayedCards}
            stages={stagesState}
            selectedStageName={selectedStageFilter}
            onClearStageFilter={() => setSelectedStageFilter(null)}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={(field) => {
              if (sortField === field) {
                setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
              } else {
                setSortField(field);
                setSortDirection("asc");
              }
            }}
            onMoveCard={handleMoveCard}
            onAssignAdvocate={handleAssignAdvocate}
            onSelectCase={(card) => setSelectedCaseForDrawer(card)}
          />
        ) : (
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
            onArchiveStage={(stage) => archiveStageMutation.mutate({ id: stage.id })}
            onDeleteStage={(stage) => deleteStageMutation.mutate({ id: stage.id })}
          />
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

        {/* Modals */}
        <CustomizePipelineModal
          open={showCustomizeModal}
          onOpenChange={setShowCustomizeModal}
          stages={stagesState}
          groups={pipelineGroups}
          onSaveStages={handleSaveStages}
          onOpenGroupModifications={() => {
            setFocusedGroupForModal(null);
            setShowGroupModificationsModal(true);
          }}
        />

        <PipelineGroupModificationsModal
          open={showGroupModificationsModal}
          onOpenChange={setShowGroupModificationsModal}
          groups={pipelineGroups}
          stages={stagesState}
          initialFocusedGroupKey={focusedGroupForModal}
          onSaveGroupModifications={handleSaveGroupModifications}
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
    </ScopedErrorBoundary>
  );
}

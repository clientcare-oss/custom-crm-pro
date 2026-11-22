import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  RotateCcw,
  Pencil,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  LOGICAL_STAGE_GROUPS,
  PIPELINE_GROUP_COLOR_THEMES,
  resolveGroupThemeByAccent,
  resolveLogicalStageGroup,
} from "./pipelineDefaults";
import type {
  PipelineGroupDefinition,
  PipelineStageItem,
  LogicalStageGroup,
} from "./types";

interface PipelineGroupModificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: PipelineGroupDefinition[];
  stages: PipelineStageItem[];
  initialFocusedGroupKey?: LogicalStageGroup | null;
  onSaveGroupModifications: (payload: {
    groups: PipelineGroupDefinition[];
    stageGroupAssignments: Record<number, LogicalStageGroup>;
    newStagesToCreate?: {
      name: string;
      accentColor: string;
      logicalGroup: LogicalStageGroup;
    }[];
    reorderStagesByGroupOrder?: boolean;
  }) => void;
}

export function PipelineGroupModificationsModal({
  open,
  onOpenChange,
  groups,
  stages,
  initialFocusedGroupKey,
  onSaveGroupModifications,
}: PipelineGroupModificationsModalProps) {
  const [groupList, setGroupList] = useState<PipelineGroupDefinition[]>(groups);
  const [stageAssignments, setStageAssignments] = useState<
    Record<number, LogicalStageGroup>
  >({});
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  // Create New Group Form State
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAccent, setNewGroupAccent] = useState("#A78BFA");
  const [newGroupStarterStageName, setNewGroupStarterStageName] = useState("");
  const [selectedStageIdsForNewGroup, setSelectedStageIdsForNewGroup] =
    useState<number[]>([]);
  const [pendingNewStages, setPendingNewStages] = useState<
    { name: string; accentColor: string; logicalGroup: LogicalStageGroup }[]
  >([]);
  const [reorderStagesByGroup, setReorderStagesByGroup] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGroupList(groups);
    const initialMap: Record<number, LogicalStageGroup> = {};
    stages.forEach((s) => {
      initialMap[s.id] = resolveLogicalStageGroup(
        s.name,
        s.category,
        s.logicalGroup
      );
    });
    setStageAssignments(initialMap);
    setPendingNewStages([]);
    setReorderStagesByGroup(false);
    if (initialFocusedGroupKey) {
      setExpandedGroupKey(initialFocusedGroupKey);
    } else if (groups.length > 0) {
      setExpandedGroupKey(groups[0].key);
    }
  }, [open, groups, stages, initialFocusedGroupKey]);

  const activeStages = stages
    .filter((s) => !s.isArchived)
    .sort((a, b) => a.order - b.order);

  const handleRenameGroup = (groupKey: string, nextTitle: string) => {
    setGroupList((prev) =>
      prev.map((g) =>
        g.key === groupKey
          ? {
              ...g,
              label: nextTitle,
              shortLabel: nextTitle,
            }
          : g
      )
    );
  };

  const handleChangeGroupColor = (groupKey: string, accentColor: string) => {
    const theme = resolveGroupThemeByAccent(accentColor);
    setGroupList((prev) =>
      prev.map((g) =>
        g.key === groupKey
          ? {
              ...g,
              accentColor: theme.accentColor,
              barColor: theme.barColor,
              badgeClass: theme.badgeClass,
            }
          : g
      )
    );
  };

  const handleMoveGroupUp = (index: number) => {
    if (index === 0) return;
    const copy = [...groupList];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    copy.forEach((g, idx) => {
      g.order = idx + 1;
    });
    setGroupList(copy);
    setReorderStagesByGroup(true);
  };

  const handleMoveGroupDown = (index: number) => {
    if (index === groupList.length - 1) return;
    const copy = [...groupList];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    copy.forEach((g, idx) => {
      g.order = idx + 1;
    });
    setGroupList(copy);
    setReorderStagesByGroup(true);
  };

  const handleDeleteGroup = (groupKey: string) => {
    const target = groupList.find((g) => g.key === groupKey);
    if (!target) return;
    if (groupList.length <= 1) {
      toast.error("At least one pipeline group is required");
      return;
    }

    const fallbackKey: LogicalStageGroup =
      groupList.find((g) => g.key !== groupKey)?.key || "active_advocacy";

    setGroupList((prev) => prev.filter((g) => g.key !== groupKey));
    setStageAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((idStr) => {
        const numId = Number(idStr);
        if (next[numId] === groupKey) {
          next[numId] = fallbackKey;
        }
      });
      return next;
    });
    toast.success(
      `Removed group "${target.label}". Any stages inside were moved to "${
        groupList.find((g) => g.key === fallbackKey)?.label || "Active Advocacy"
      }".`
    );
  };

  const handleToggleStageInGroup = (
    stageId: number,
    targetGroupKey: LogicalStageGroup
  ) => {
    setStageAssignments((prev) => {
      const current = prev[stageId];
      const nextGroup: LogicalStageGroup =
        current === targetGroupKey ? "ungrouped" : targetGroupKey;
      return { ...prev, [stageId]: nextGroup };
    });
  };

  const handleCreateNewGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      toast.error("Please enter a name for the new pipeline group");
      return;
    }

    const slugKey = `custom_${trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")}_${Date.now().toString().slice(-4)}` as LogicalStageGroup;

    const theme = resolveGroupThemeByAccent(newGroupAccent);
    const newGroup: PipelineGroupDefinition = {
      key: slugKey,
      label: trimmed,
      shortLabel: trimmed,
      badgeClass: theme.badgeClass,
      barColor: theme.barColor,
      accentColor: theme.accentColor,
      order: groupList.length + 1,
      isCustom: true,
    };

    setGroupList((prev) => [...prev, newGroup]);

    if (selectedStageIdsForNewGroup.length > 0) {
      setStageAssignments((prev) => {
        const next = { ...prev };
        selectedStageIdsForNewGroup.forEach((id) => {
          next[id] = slugKey;
        });
        return next;
      });
    }

    if (newGroupStarterStageName.trim()) {
      setPendingNewStages((prev) => [
        ...prev,
        {
          name: newGroupStarterStageName.trim(),
          accentColor: theme.accentColor,
          logicalGroup: slugKey,
        },
      ]);
    } else if (selectedStageIdsForNewGroup.length === 0) {
      // Automatically create a matching starter stage card if the user didn't pick existing stages so the new group bracket immediately renders on the pipeline rail!
      setPendingNewStages((prev) => [
        ...prev,
        {
          name: trimmed,
          accentColor: theme.accentColor,
          logicalGroup: slugKey,
        },
      ]);
    }

    setExpandedGroupKey(slugKey);
    setNewGroupName("");
    setNewGroupStarterStageName("");
    setSelectedStageIdsForNewGroup([]);
    toast.success(`Created new pipeline group "${trimmed}"`);
  };

  const handleResetDefaultGroups = () => {
    setGroupList(LOGICAL_STAGE_GROUPS);
    const resetMap: Record<number, LogicalStageGroup> = {};
    stages.forEach((s) => {
      resetMap[s.id] = resolveLogicalStageGroup(s.name, s.category);
    });
    setStageAssignments(resetMap);
    setPendingNewStages([]);
    toast.success("Reset pipeline groups to Waypoint defaults");
  };

  const handleSaveAll = () => {
    const cleanedGroups = groupList.map((g, idx) => ({
      ...g,
      label: g.label.trim() || `Group ${idx + 1}`,
      shortLabel: g.label.trim() || `Group ${idx + 1}`,
      order: idx + 1,
    }));

    onSaveGroupModifications({
      groups: cleanedGroups,
      stageGroupAssignments: stageAssignments,
      newStagesToCreate: pendingNewStages,
      reorderStagesByGroupOrder: reorderStagesByGroup,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#05142B]/98 border-[#C5A059]/60 text-[#FFF4D4] shadow-[0_20px_60px_rgba(0,0,0,0.92),inset_0_1px_1px_rgba(255,255,255,0.08)] rounded-2xl p-0 overflow-hidden">
        {/* Top Admiralty Brass Header */}
        <DialogHeader className="px-6 pt-5 pb-4 bg-gradient-to-r from-[#07162B] via-[#0B2140] to-[#07162B] border-b border-[#3A2C18]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#DFBE77] via-[#C5A059] to-[#8F6B29] text-[#07162B] flex items-center justify-center shadow-[0_4px_14px_rgba(197,160,89,0.4)] border border-[#FFE394]">
                <Layers className="h-5 w-5 stroke-[2.4]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2">
                  Pipeline Group Modifications
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50">
                    PG-004 · Pipeline
                  </span>
                </DialogTitle>
                <p className="text-xs text-[#C6B697] mt-0.5">
                  Create new stage groups, rename group brackets, customize group colors, reorder groups, and assign stages.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDefaultGroups}
              className="h-8 px-2.5 text-[11px] border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer"
              title="Restore default group names and colors"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-[#C5A059]" />
              Reset Defaults
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* SECTION 1: CREATE NEW PIPELINE GROUP */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-[#0A1E3D]/90 to-[#040E1F]/95 border border-[#C5A059]/45 shadow-[0_6px_20px_rgba(0,0,0,0.6)] space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-serif font-bold text-[#FFE394] uppercase tracking-[0.14em] flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-[#F2CD80]" />
                Create New Pipeline Group
              </h4>
              <span className="text-[11px] text-[#A69371]">
                Adds a new spanning bracket header above your pipeline stages
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#FFF4D4] font-semibold">
                  New Group Name *
                </Label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateNewGroup();
                    }
                  }}
                  placeholder="e.g. Due Process & Mediation, Evaluation Waitlist..."
                  className="h-9 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#FFE394] rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#C6B697] font-semibold">
                  Optional First Stage Card in Group
                </Label>
                <Input
                  value={newGroupStarterStageName}
                  onChange={(e) => setNewGroupStarterStageName(e.target.value)}
                  placeholder="Leave blank to use group name or pick stages below..."
                  className="h-9 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#FFE394] rounded-lg"
                />
              </div>
            </div>

            {/* Color Palette Selector for New Group */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-[#C6B697] font-semibold uppercase tracking-wider">
                Group Bracket & Bubble Theme Color
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PIPELINE_GROUP_COLOR_THEMES.map((theme) => {
                  const isSelected =
                    newGroupAccent.toLowerCase() ===
                    theme.accentColor.toLowerCase();
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setNewGroupAccent(theme.accentColor)}
                      className={cn(
                        "px-2.5 py-1 rounded-full border text-[10px] font-serif font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer",
                        theme.badgeClass,
                        isSelected
                          ? "ring-2 ring-[#FFE394] scale-105 shadow-[0_0_12px_rgba(255,227,148,0.45)]"
                          : "opacity-75 hover:opacity-100"
                      )}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: theme.accentColor }}
                      />
                      <span>{theme.name}</span>
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional: Choose Existing Stages to Move into This New Group */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-[#C6B697] font-semibold">
                Assign Existing Stage Cards to This New Group (Optional):
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto p-2 rounded-lg bg-[#020A17]/90 border border-[#3A2C18]/80">
                {activeStages.map((st) => {
                  const isPicked = selectedStageIdsForNewGroup.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        setSelectedStageIdsForNewGroup((prev) =>
                          prev.includes(st.id)
                            ? prev.filter((id) => id !== st.id)
                            : [...prev, st.id]
                        )
                      }
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[11px] font-semibold border inline-flex items-center gap-1 transition-all cursor-pointer",
                        isPicked
                          ? "bg-[#C5A059] text-[#07162B] border-[#FFE394] font-bold"
                          : "bg-[#081830] text-[#CBD5E1] border-[#233554] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
                      )}
                    >
                      {isPicked ? (
                        <Check className="h-3 w-3 stroke-[3]" />
                      ) : (
                        <Plus className="h-3 w-3 opacity-70" />
                      )}
                      <span>{st.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end pt-1">
              <Button
                type="button"
                size="sm"
                onClick={handleCreateNewGroup}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394] shadow-[0_3px_12px_rgba(197,160,89,0.45)] hover:brightness-110 text-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5 stroke-[2.8]" />
                Add New Group
              </Button>
            </div>
          </div>

          {/* SECTION 2: RENAME, RECOLOR, REORDER & ASSIGN STAGES TO EXISTING GROUPS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-xs font-serif font-bold uppercase tracking-[0.14em] text-[#FFE394] flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5 text-[#C5A059]" />
                Existing Pipeline Groups ({groupList.length})
              </Label>

              <label className="inline-flex items-center gap-2 text-xs text-[#C6B697] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reorderStagesByGroup}
                  onChange={(e) => setReorderStagesByGroup(e.target.checked)}
                  className="rounded border-[#C5A059] bg-[#020A17] text-[#C5A059] focus:ring-[#C5A059]"
                />
                <span>Group stage cards together on rail when saving</span>
              </label>
            </div>

            <div className="space-y-2.5">
              {groupList.map((group, idx) => {
                const isExpanded = expandedGroupKey === group.key;
                const stagesInThisGroup = activeStages.filter(
                  (s) => stageAssignments[s.id] === group.key
                );
                const pendingStagesInThisGroup = pendingNewStages.filter(
                  (ps) => ps.logicalGroup === group.key
                );
                const totalStagesCount =
                  stagesInThisGroup.length + pendingStagesInThisGroup.length;

                return (
                  <div
                    key={group.key}
                    className={cn(
                      "rounded-xl border transition-all overflow-hidden",
                      isExpanded
                        ? "bg-[#041124] border-[#C5A059]/70 shadow-[0_6px_18px_rgba(0,0,0,0.65)]"
                        : "bg-[#020A17]/90 border-[#3A2C18] hover:border-[#C5A059]/45"
                    )}
                  >
                    {/* Main Group Row: Color Swatch + Inline Rename Input + Live Bracket Bubble Preview + Order/Expand/Delete Controls */}
                    <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/25 shadow-sm"
                          style={{ backgroundColor: group.accentColor }}
                        />

                        {/* Group Rename Input */}
                        <div className="flex-1 max-w-[260px]">
                          <Input
                            value={group.label}
                            onChange={(e) =>
                              handleRenameGroup(group.key, e.target.value)
                            }
                            aria-label={`Rename group ${group.label}`}
                            placeholder="Group Name..."
                            className="h-8 bg-[#000814] border-[#3A2C18] focus:border-[#FFE394] text-[#FFF4D4] text-xs font-serif font-bold px-2.5 rounded-lg"
                          />
                        </div>

                        {/* Live Bracket Pill Preview */}
                        <span
                          className={cn(
                            "hidden md:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[10px] font-serif font-bold tracking-[0.14em] uppercase whitespace-nowrap",
                            group.badgeClass
                          )}
                          style={{ borderColor: group.accentColor }}
                        >
                          {group.label || "UNTITLED"}
                        </span>

                        <span className="text-[11px] font-semibold text-[#C6B697] whitespace-nowrap">
                          ({totalStagesCount}{" "}
                          {totalStagesCount === 1 ? "stage" : "stages"})
                        </span>
                      </div>

                      {/* Right Controls: Move Up/Down, Customize Color & Stages Toggle, Delete */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={idx === 0}
                          onClick={() => handleMoveGroupUp(idx)}
                          className="h-7 w-7 p-0 text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#0A1E3D] cursor-pointer"
                          title="Move group left / earlier"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={idx === groupList.length - 1}
                          onClick={() => handleMoveGroupDown(idx)}
                          className="h-7 w-7 p-0 text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#0A1E3D] cursor-pointer"
                          title="Move group right / later"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setExpandedGroupKey(isExpanded ? null : group.key)
                          }
                          className={cn(
                            "h-7 px-2.5 text-[11px] font-semibold cursor-pointer border",
                            isExpanded
                              ? "bg-[#153563] text-[#FFE394] border-[#C5A059]"
                              : "bg-[#07162B] text-[#D8C7A5] border-[#3A2C18] hover:text-[#FFF4D4]"
                          )}
                        >
                          <span>Stages & Color</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 ml-1" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 ml-1" />
                          )}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGroup(group.key)}
                          className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 cursor-pointer"
                          title={`Delete group "${group.label}"`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Drawer: Color Swatches + Stage Membership Check-Pills */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-2.5 border-t border-[#1E2E48] bg-[#020A17]/95 space-y-3">
                        {/* Group Color Picker */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold text-[#C6B697] mr-1">
                            Bracket Color:
                          </span>
                          {PIPELINE_GROUP_COLOR_THEMES.map((theme) => {
                            const isCurrentColor =
                              group.accentColor.toLowerCase() ===
                              theme.accentColor.toLowerCase();
                            return (
                              <button
                                key={theme.id}
                                type="button"
                                onClick={() =>
                                  handleChangeGroupColor(
                                    group.key,
                                    theme.accentColor
                                  )
                                }
                                className={cn(
                                  "w-6 h-6 rounded-full border flex items-center justify-center transition-transform hover:scale-110 cursor-pointer",
                                  isCurrentColor
                                    ? "border-white ring-2 ring-[#FFE394] scale-110"
                                    : "border-white/25 opacity-80 hover:opacity-100"
                                )}
                                style={{ backgroundColor: theme.accentColor }}
                                title={theme.name}
                              >
                                {isCurrentColor && (
                                  <Check className="h-3 w-3 text-[#07162B] stroke-[3]" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Stage Membership Selector */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#C6B697]">
                              Click any stage card to include or remove it from{" "}
                              <strong className="text-[#FFE394]">
                                {group.label}
                              </strong>
                              :
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {activeStages.map((stage) => {
                              const assignedKey = stageAssignments[stage.id];
                              const isInThisGroup = assignedKey === group.key;
                              const assignedGroupObj = groupList.find(
                                (g) => g.key === assignedKey
                              );

                              return (
                                <button
                                  key={stage.id}
                                  type="button"
                                  onClick={() =>
                                    handleToggleStageInGroup(
                                      stage.id,
                                      group.key
                                    )
                                  }
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold border inline-flex items-center gap-1.5 transition-all cursor-pointer",
                                    isInThisGroup
                                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394] font-bold shadow-sm"
                                      : "bg-[#07162B] text-[#CBD5E1] border-[#233554] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
                                  )}
                                  title={
                                    isInThisGroup
                                      ? `Click to remove "${stage.name}" from ${group.label}`
                                      : `Currently in ${
                                          assignedGroupObj?.label || "Ungrouped"
                                        } — click to move to ${group.label}`
                                  }
                                >
                                  {isInThisGroup ? (
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  ) : (
                                    <Plus className="h-3 w-3 opacity-70" />
                                  )}
                                  <span>{stage.name}</span>
                                  {!isInThisGroup && assignedGroupObj && (
                                    <span className="text-[9px] opacity-65 font-normal">
                                      ({assignedGroupObj.shortLabel})
                                    </span>
                                  )}
                                </button>
                              );
                            })}

                            {pendingStagesInThisGroup.map((ps, pIdx) => (
                              <span
                                key={`pending-${pIdx}`}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-emerald-500/20 text-emerald-200 border-emerald-400/60 inline-flex items-center gap-1"
                              >
                                <Sparkles className="h-3 w-3 text-emerald-300" />
                                {ps.name} (New)
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3.5 bg-[#030C1A] border-t border-[#3A2C18] flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSaveAll}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394] shadow-[0_4px_14px_rgba(197,160,89,0.5)] hover:brightness-110 text-xs cursor-pointer px-5"
          >
            <Check className="h-4 w-4 mr-1.5 stroke-[2.8]" />
            Save Group Modifications
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

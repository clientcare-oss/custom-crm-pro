import React, { useState, useMemo } from "react";
import {
  Map as MapIcon,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  PlayCircle,
  Layers,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  User,
  Download,
  HeartHandshake,
  Printer,
  Mail,
  Compass,
  ExternalLink,
  AlertTriangle,
  Archive,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Ban,
  Clock,
  RotateCcw,
  Sparkles,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  BlueprintItemDestination,
  BlueprintParentReviewStatus,
  IepIntelFinding,
  MeetingTarget,
  ParentScriptStyleType,
} from "../types";
import {
  combinePlanItemsPreservingSources,
  detectWhatToSayToParentStyle,
  generateWhatToSayToParentScript,
  getEffectiveParentReviewStatus,
  getEffectiveTargetDestination,
  getEffectiveWhatToSayToParentScript,
  isTargetIncludedInFinalMeetingPlan,
  regenerateWhatToSayToParentAcrossTargets,
  regenerateWhatToSayToParentForTarget,
  removeTargetFromActivePlan,
  restoreTargetToActivePlan,
  setTargetDestination,
  setTargetParentReviewStatus,
  toggleTargetIncludedInFinalMeetingPlan,
  updateWhatToSayToParentManualEdit,
  upsertConnectedTargetFromFinding,
} from "../intel-unit/connectedFindingWorkflow";
import { ReorganizeMeetingModal } from "./ReorganizeMeetingModal";
import { CombineBlueprintItemsModal } from "./CombineBlueprintItemsModal";
import { DeleteTargetModal } from "../DeleteTargetModal";
import { ParentFriendlyPreviewModal } from "./ParentFriendlyPreviewModal";
import { EmailBlueprintModal } from "./EmailBlueprintModal";
import { CozyPullChainLamp } from "../CozyPullChainLamp";
import { openPrintDialog } from "../print/PrintableMeetingDocument";
import { toast } from "sonner";

export type BlueprintFilterTab =
  | "all_active"
  | "final_meeting_plan"
  | "keep_in_blueprint"
  | "parent_doesnt_want"
  | "set_aside"
  | "removed_history";

export type BlueprintSortOrder = "meeting_order" | "parent_priority";

interface BlueprintViewProps {
  studentName: string;
  meetingType?: string;
  meetingDate?: string;
  clientEmail?: string;
  targets: MeetingTarget[];
  findings?: IepIntelFinding[];
  detectedOrder: string[];
  onUpdateTargets: (targets: MeetingTarget[]) => void;
  onUpdateFindings?: (findings: IepIntelFinding[]) => void;
  onUpdateDetectedOrder: (order: string[]) => void;
  onBuildBlueprint?: () => Promise<void>;
  onPreviewMeetingMode: () => void;
  onMarkReady: () => void;
  onOpenImportModal?: () => void;
  onOpenSourceEvidence?: (target: MeetingTarget) => void;
  onWithdrawTargetPreserveHistory?: (targetId: string) => void;
  onDeleteConnectedFindingEverywhere?: (target: MeetingTarget) => void;
  isLoading?: boolean;
}

const PARENT_REVIEW_STATUS_META: Array<{
  value: BlueprintParentReviewStatus;
  label: string;
  shortDesc: string;
}> = [
  {
    value: "review_with_parent",
    label: "Review with Parent",
    shortDesc: "Needs discussion with parent",
  },
  {
    value: "parent_approved",
    label: "Parent Approved",
    shortDesc: "Parent supports raising this request",
  },
  {
    value: "ready_for_meeting",
    label: "Ready for Meeting",
    shortDesc: "Reviewed and prepared for meeting",
  },
];

const DESTINATION_META: Array<{
  value: BlueprintItemDestination;
  label: string;
  description: string;
}> = [
  {
    value: "final_meeting_plan",
    label: "Final Meeting Plan",
    description:
      "Include the item in the finalized agenda and active live meeting requests.",
  },
  {
    value: "keep_in_blueprint",
    label: "Keep in Blueprint",
    description:
      "Retain it for planning without including it in the final meeting plan.",
  },
  {
    value: "parent_doesnt_want",
    label: "Parent Doesn’t Want",
    description:
      "Place it in the existing parent-doesn’t-want area, with an optional explanation of the parent’s preference.",
  },
  {
    value: "set_aside",
    label: "Set Aside",
    description:
      "Preserve it for possible future discussion without including it as an active meeting request.",
  },
];

const PARENT_SCRIPT_STYLE_META: Array<{
  value: ParentScriptStyleType;
  label: string;
}> = [
  { value: "auto", label: "Auto-Tailored" },
  { value: "accommodation", label: "Possible accommodation" },
  { value: "missing_goal", label: "Missing goal" },
  { value: "clarification", label: "Clarification needed" },
];

export function BlueprintView({
  studentName,
  meetingType = "Annual IEP Meeting",
  meetingDate = "Upcoming",
  clientEmail = "",
  targets,
  findings = [],
  detectedOrder,
  onUpdateTargets,
  onUpdateFindings,
  onUpdateDetectedOrder,
  onPreviewMeetingMode,
  onOpenImportModal,
  onOpenSourceEvidence,
  onWithdrawTargetPreserveHistory,
  onDeleteConnectedFindingEverywhere,
}: BlueprintViewProps) {
  const [activeFilterTab, setActiveFilterTab] =
    useState<BlueprintFilterTab>("all_active");
  const [sortOrder, setSortOrder] =
    useState<BlueprintSortOrder>("meeting_order");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedTechnicalIds, setExpandedTechnicalIds] = useState<
    Record<string, boolean>
  >({});
  const [scriptSuggestionPreviews, setScriptSuggestionPreviews] = useState<
    Record<string, { script: string; style?: ParentScriptStyleType }>
  >({});

  const [showReorganizeModal, setShowReorganizeModal] = useState(false);
  const [showParentPreviewModal, setShowParentPreviewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<MeetingTarget | null>(
    null
  );
  const [isNewTargetModal, setIsNewTargetModal] = useState(false);
  const [targetToDelete, setTargetToDelete] = useState<MeetingTarget | null>(
    null
  );
  const [combineTarget, setCombineTarget] = useState<MeetingTarget | null>(
    null
  );
  const [expandedSection, setExpandedSection] = useState<
    Record<string, boolean>
  >({});

  // Partition targets by destination & removal status
  const activePlanTargets = useMemo(
    () =>
      targets.filter((t) => {
        if (t.archivedOrWithdrawn || t.removedFromPlan) return false;
        const dest = getEffectiveTargetDestination(t);
        return dest === "keep_in_blueprint" || dest === "final_meeting_plan";
      }),
    [targets]
  );

  const finalMeetingPlanTargets = useMemo(
    () => targets.filter((t) => isTargetIncludedInFinalMeetingPlan(t)),
    [targets]
  );

  const keepInBlueprintTargets = useMemo(
    () =>
      targets.filter(
        (t) =>
          !t.archivedOrWithdrawn &&
          !t.removedFromPlan &&
          getEffectiveTargetDestination(t) === "keep_in_blueprint"
      ),
    [targets]
  );

  const parentDoesntWantTargets = useMemo(
    () =>
      targets.filter(
        (t) =>
          !t.archivedOrWithdrawn &&
          !t.removedFromPlan &&
          getEffectiveTargetDestination(t) === "parent_doesnt_want"
      ),
    [targets]
  );

  const setAsideTargets = useMemo(
    () =>
      targets.filter(
        (t) =>
          !t.archivedOrWithdrawn &&
          !t.removedFromPlan &&
          getEffectiveTargetDestination(t) === "set_aside"
      ),
    [targets]
  );

  const removedOrArchivedTargets = useMemo(
    () =>
      targets.filter((t) =>
        Boolean(t.archivedOrWithdrawn || t.removedFromPlan)
      ),
    [targets]
  );

  // Unlinked confirmed findings in Step 1 that can be pulled into Blueprint
  const unlinkedStep1Findings = useMemo(() => {
    const linkedIds = new Set<string>();
    targets.forEach((t) => {
      if (t.sourceFindingId) linkedIds.add(t.sourceFindingId);
      (t.combinedSourceFindingIds || []).forEach((id) => linkedIds.add(id));
    });
    return findings.filter(
      (f) =>
        !linkedIds.has(f.id) &&
        f.status !== "dismiss" &&
        f.reviewDecision !== "dismissed" &&
        (f.reviewDecision === "saved" ||
          f.advocateConfirmed ||
          f.status === "keep" ||
          f.status === "important")
    );
  }, [findings, targets]);

  const sortTargetsList = (list: MeetingTarget[]): MeetingTarget[] => {
    const copy = [...list];
    if (sortOrder === "parent_priority") {
      const rank = (p?: "high" | "medium" | "low") =>
        p === "high" ? 1 : p === "low" ? 3 : 2;
      return copy.sort((a, b) => {
        const diff = rank(a.priority) - rank(b.priority);
        if (diff !== 0) return diff;
        return (a.targetOrder || 0) - (b.targetOrder || 0);
      });
    }
    return copy.sort((a, b) => (a.targetOrder || 0) - (b.targetOrder || 0));
  };

  const visibleTargetsForCurrentTab = useMemo(() => {
    switch (activeFilterTab) {
      case "final_meeting_plan":
        return sortTargetsList(finalMeetingPlanTargets);
      case "keep_in_blueprint":
        return sortTargetsList(keepInBlueprintTargets);
      case "parent_doesnt_want":
        return sortTargetsList(parentDoesntWantTargets);
      case "set_aside":
        return sortTargetsList(setAsideTargets);
      case "removed_history":
        return removedOrArchivedTargets;
      default:
        return sortTargetsList(activePlanTargets);
    }
  }, [
    activeFilterTab,
    finalMeetingPlanTargets,
    keepInBlueprintTargets,
    parentDoesntWantTargets,
    setAsideTargets,
    removedOrArchivedTargets,
    activePlanTargets,
    sortOrder,
  ]);

  // Group visible targets by IEP section when in meeting_order mode on all_active
  const sectionMap = useMemo(() => {
    const map = new Map<string, MeetingTarget[]>();
    detectedOrder.forEach((sec) => map.set(sec, []));
    visibleTargetsForCurrentTab.forEach((t) => {
      const sec = t.iepSection || "General";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(t);
    });
    return map;
  }, [detectedOrder, visibleTargetsForCurrentTab]);

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => ({
      ...prev,
      [section]: prev[section] === undefined ? false : !prev[section],
    }));
  };

  const toggleTechnicalAnalysis = (id: string) => {
    setExpandedTechnicalIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleInlineFieldUpdate = (
    targetId: string,
    updates: Partial<MeetingTarget>
  ) => {
    onUpdateTargets(
      targets.map((t) => {
        if (t.id !== targetId) return t;
        const merged: MeetingTarget = { ...t, ...updates };
        // Preserve manual edits to "What to Say to the Parent" — only auto-refresh if not manually edited
        if (
          !merged.whatToSayToParentEdited &&
          !("whatToSayToParent" in updates)
        ) {
          merged.whatToSayToParent = generateWhatToSayToParentScript(merged, {
            studentName,
            style: merged.whatToSayToParentStyle || "auto",
          });
        }
        return merged;
      })
    );
  };

  const handleEditWhatToSayToParent = (targetId: string, value: string) => {
    onUpdateTargets(
      targets.map((t) =>
        t.id === targetId ? updateWhatToSayToParentManualEdit(t, value) : t
      )
    );
  };

  const handleRegenerateItemScript = (
    target: MeetingTarget,
    style?: ParentScriptStyleType
  ) => {
    const res = regenerateWhatToSayToParentForTarget(target, {
      studentName,
      style: style ?? target.whatToSayToParentStyle ?? "auto",
      forceOverwriteEdited: false,
    });

    if (res.wasSkippedBecauseEdited) {
      setScriptSuggestionPreviews((prev) => ({
        ...prev,
        [target.id]: {
          script: res.suggestedScript,
          style: style ?? target.whatToSayToParentStyle ?? "auto",
        },
      }));
      toast.info(
        "Your edited script was preserved. Review the new suggestion below if you'd like to use it."
      );
      return;
    }

    onUpdateTargets(
      targets.map((t) => (t.id === target.id ? res.updatedTarget : t))
    );
    toast.success("Updated suggested parent script");
  };

  const handleApplyPreviewedScript = (target: MeetingTarget) => {
    const preview = scriptSuggestionPreviews[target.id];
    if (!preview) return;
    const res = regenerateWhatToSayToParentForTarget(target, {
      studentName,
      style: preview.style ?? "auto",
      forceOverwriteEdited: true,
    });
    onUpdateTargets(
      targets.map((t) => (t.id === target.id ? res.updatedTarget : t))
    );
    setScriptSuggestionPreviews((prev) => {
      const next = { ...prev };
      delete next[target.id];
      return next;
    });
    toast.success("Applied suggested script");
  };

  const handleDismissPreviewedScript = (targetId: string) => {
    setScriptSuggestionPreviews((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
  };

  const handleRegenerateAllUneditedScripts = () => {
    const res = regenerateWhatToSayToParentAcrossTargets(targets, {
      studentName,
    });
    onUpdateTargets(res.updatedTargets);
    toast.success(
      res.preservedEditedCount > 0
        ? `Refreshed ${res.regeneratedCount} suggested script${
            res.regeneratedCount === 1 ? "" : "s"
          } · Preserved ${res.preservedEditedCount} edited script${
            res.preservedEditedCount === 1 ? "" : "s"
          }`
        : `Refreshed ${res.regeneratedCount} suggested parent script${
            res.regeneratedCount === 1 ? "" : "s"
          }`
    );
  };

  const handleChangeParentReviewStatus = (
    target: MeetingTarget,
    nextStatus: BlueprintParentReviewStatus
  ) => {
    const updated = setTargetParentReviewStatus(target, nextStatus);
    onUpdateTargets(targets.map((t) => (t.id === target.id ? updated : t)));
    const meta = PARENT_REVIEW_STATUS_META.find((m) => m.value === nextStatus);
    toast.success(`Parent-review status set to "${meta?.label}"`);
  };

  const handleChangeDestination = (
    target: MeetingTarget,
    nextDest: BlueprintItemDestination
  ) => {
    const previousTargets = [...targets];
    const updated = setTargetDestination(target, nextDest);
    onUpdateTargets(targets.map((t) => (t.id === target.id ? updated : t)));
    const meta = DESTINATION_META.find((m) => m.value === nextDest);
    toast.success(`Destination updated: ${meta?.label}`, {
      action: {
        label: "Undo",
        onClick: () => {
          onUpdateTargets(previousTargets);
          toast.success("Restored previous destination");
        },
      },
    });
  };

  const handleToggleFinalPlanInclusion = (target: MeetingTarget) => {
    const previousTargets = [...targets];
    const updated = toggleTargetIncludedInFinalMeetingPlan(target);
    const nowIncluded = isTargetIncludedInFinalMeetingPlan(updated);
    onUpdateTargets(targets.map((t) => (t.id === target.id ? updated : t)));
    toast.success(
      nowIncluded
        ? `Included "${target.targetName}" in Final Meeting Plan`
        : `Moved "${target.targetName}" back to Keep in Blueprint (excluded from Final Meeting Plan)`,
      {
        action: {
          label: "Undo",
          onClick: () => {
            onUpdateTargets(previousTargets);
          },
        },
      }
    );
  };

  const handleRemoveFromPlan = (target: MeetingTarget) => {
    const previousTargets = [...targets];
    const updated = removeTargetFromActivePlan(target);
    onUpdateTargets(targets.map((t) => (t.id === target.id ? updated : t)));
    toast.success(
      `Removed "${target.targetName}" from active plan · Finding, evidence, and history preserved`,
      {
        action: {
          label: "Undo",
          onClick: () => {
            onUpdateTargets(previousTargets);
            toast.success("Restored to active plan");
          },
        },
      }
    );
  };

  const handleRestoreItem = (
    target: MeetingTarget,
    destination: BlueprintItemDestination = "keep_in_blueprint"
  ) => {
    const updated = restoreTargetToActivePlan(target, destination);
    onUpdateTargets(targets.map((t) => (t.id === target.id ? updated : t)));
    toast.success(
      destination === "final_meeting_plan"
        ? `Restored "${target.targetName}" to Final Meeting Plan`
        : `Restored "${target.targetName}" to Blueprint`
    );
  };

  const handleMoveItemOrder = (targetId: string, direction: "up" | "down") => {
    const ordered = [...visibleTargetsForCurrentTab];
    const idx = ordered.findIndex((t) => t.id === targetId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ordered.length) return;

    const currentItem = ordered[idx];
    const neighborItem = ordered[swapIdx];

    const reorderedIds = ordered.map((t) => t.id);
    reorderedIds[idx] = neighborItem.id;
    reorderedIds[swapIdx] = currentItem.id;

    const orderRankMap = new Map<string, number>();
    reorderedIds.forEach((id, i) => orderRankMap.set(id, i + 1));

    const nextTargets = targets.map((t) =>
      orderRankMap.has(t.id)
        ? {
            ...t,
            targetOrder: orderRankMap.get(t.id)!,
            // If moving within the same section or across sections in Final Plan, keep section aligned when swapping within same section
            iepSection:
              activeFilterTab === "all_active" &&
              sortOrder === "meeting_order"
                ? t.iepSection
                : t.iepSection,
          }
        : t
    );

    onUpdateTargets(nextTargets);
  };

  const handleConfirmDelete = (id: string) => {
    const previousTargets = [...targets];
    const removed = targets.find((t) => t.id === id);
    onUpdateTargets(targets.filter((t) => t.id !== id));
    toast.success(
      removed?.sourceFindingId
        ? "Removed from Blueprint · Saved finding retained in Records Review"
        : "Target removed from Blueprint",
      {
        action: {
          label: "Undo",
          onClick: () => {
            onUpdateTargets(previousTargets);
            toast.success("Restored to Blueprint");
          },
        },
      }
    );
  };

  const handleDuplicateTarget = (target: MeetingTarget) => {
    const copy: MeetingTarget = {
      ...target,
      id: `tgt-${Date.now()}`,
      targetName: `${target.targetName} (Copy)`,
      targetOrder: targets.length + 1,
      blueprintDestination: "keep_in_blueprint",
      parentReviewStatus: "review_with_parent",
      isCustom: true,
    };
    onUpdateTargets([...targets, copy]);
    setSelectedItemId(copy.id);
    toast.success("Duplicated plan item in Blueprint");
  };

  const handleSaveTargetEdit = () => {
    if (!editingTarget) return;
    if (isNewTargetModal) {
      onUpdateTargets([...targets, editingTarget]);
      setSelectedItemId(editingTarget.id);
      toast.success("Added plan item to Blueprint");
    } else {
      onUpdateTargets(
        targets.map((t) => (t.id === editingTarget.id ? editingTarget : t))
      );
      toast.success("Saved plan item changes");
    }
    setEditingTarget(null);
    setIsNewTargetModal(false);
  };

  const handleAddNewTarget = (defaultSection?: string) => {
    const baseNewTarget: MeetingTarget = {
      id: `manual-tgt-${Date.now()}`,
      targetName: "New Advocacy Plan Item",
      iepSection:
        defaultSection || detectedOrder[0] || "Accommodations / Supports",
      sectionOrder: 1,
      targetOrder: targets.length + 1,
      quickAdvocateSayThis:
        "We would like to discuss adding a specific, measurable support in the IEP.",
      fullAdvocateScript: "",
      putItHereLocation: `IEP Section: ${
        defaultSection || detectedOrder[0] || "Accommodations / Supports"
      }`,
      possibleIepWording: "",
      whyWeWantIt:
        "We need a clear way to support and track your child's progress in this area.",
      supportingEvidence: "",
      sources: ["Advocate & Parent Plan Preparation"],
      ifTeamDisagrees:
        "Request Prior Written Notice (PWN) documenting the data relied upon.",
      parentWhatWeFound:
        "Describe what the records show or the question that needs clarification.",
      parentWhyWeWantIt:
        "We need a clear way to support and track your child's progress in this area.",
      parentWhatWeWant:
        "We would like to discuss adding a specific, measurable support in the IEP.",
      parentInput:
        "Does this match what you are seeing? Is this a priority for you?",
      parentSupportingEvidence: "",
      whatToSayToParentEdited: false,
      parentReviewStatus: "review_with_parent",
      blueprintDestination: "keep_in_blueprint",
      priority: "medium",
      meetingStatus: "NOT_DISCUSSED",
      requestRaised: false,
      pwnNeeded: false,
      addedToIep: false,
      followUpNeeded: false,
      isCustom: true,
    };
    const newTarget: MeetingTarget = {
      ...baseNewTarget,
      whatToSayToParent: generateWhatToSayToParentScript(baseNewTarget, {
        studentName,
      }),
    };
    setEditingTarget(newTarget);
    setIsNewTargetModal(true);
  };

  const handlePullUnlinkedFindingsIntoBlueprint = () => {
    if (unlinkedStep1Findings.length === 0) return;
    let workingTargets = [...targets];
    unlinkedStep1Findings.forEach((f) => {
      const res = upsertConnectedTargetFromFinding({
        finding: f,
        targets: workingTargets,
      });
      workingTargets = res.updatedTargets;
    });
    onUpdateTargets(workingTargets);
    toast.success(
      `Brought ${unlinkedStep1Findings.length} saved finding${
        unlinkedStep1Findings.length === 1 ? "" : "s"
      } from Records Review into Blueprint`
    );
  };

  const handleConfirmCombine = (params: {
    primaryTarget: MeetingTarget;
    selectedTargets: MeetingTarget[];
    selectedFindings: IepIntelFinding[];
  }) => {
    const res = combinePlanItemsPreservingSources({
      primaryTarget: params.primaryTarget,
      secondaryTargets: params.selectedTargets,
      additionalFindings: params.selectedFindings,
      allTargets: targets,
      allFindings: findings,
    });
    onUpdateTargets(res.updatedTargets);
    if (onUpdateFindings && params.selectedFindings.length > 0) {
      onUpdateFindings(res.updatedFindings);
    }
    setSelectedItemId(res.combinedTarget.id);
    toast.success(
      `Combined into "${res.combinedTarget.targetName}" · All ${
        res.combinedTarget.combinedSourceItems?.length ||
        res.combinedTarget.sources.length
      } source citations retained`
    );
  };

  const handleReorganizeSave = (
    reorderedSections: string[],
    reorderedTargets: MeetingTarget[]
  ) => {
    onUpdateDetectedOrder(reorderedSections);
    onUpdateTargets(reorderedTargets);
  };

  const renderPlanItemCard = (target: MeetingTarget, indexInList: number, totalInList: number) => {
    const isSelected = selectedItemId === target.id;
    const isTechnicalOpen = Boolean(expandedTechnicalIds[target.id]);
    const parentStatus = getEffectiveParentReviewStatus(target);
    const destination = getEffectiveTargetDestination(target);
    const isIncludedInFinalPlan = isTargetIncludedInFinalMeetingPlan(target);

    const whatWeFoundValue =
      target.parentWhatWeFound ??
      target.fullAdvocateScript ??
      target.supportingEvidence ??
      "";
    const whyItMattersValue =
      target.parentWhyWeWantIt || target.whyWeWantIt || "";
    const whatWeWantValue =
      target.parentWhatWeWant || target.quickAdvocateSayThis || "";
    const yourInputValue = target.parentInput ?? "";
    const whatToSayToParentValue = getEffectiveWhatToSayToParentScript(
      target,
      studentName
    );
    const detectedScriptStyle = detectWhatToSayToParentStyle(target);
    const activeScriptStyleLabel =
      PARENT_SCRIPT_STYLE_META.find((m) => m.value === detectedScriptStyle)
        ?.label || "Possible accommodation";
    const pendingScriptPreview = scriptSuggestionPreviews[target.id];

    const hasSourceEvidence = Boolean(
      onOpenSourceEvidence &&
        (target.sourceRef ||
          target.evalSourceRef ||
          target.sourceFindingId ||
          (target.combinedSourceItems &&
            target.combinedSourceItems.length > 0) ||
          (target.sources && target.sources.length > 0))
    );

    const destinationBadgeStyle =
      destination === "final_meeting_plan"
        ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/50"
        : destination === "parent_doesnt_want"
        ? "bg-rose-950/90 text-rose-200 border-rose-500/50"
        : destination === "set_aside"
        ? "bg-slate-900 text-slate-300 border-slate-600/50"
        : "bg-[#0D2249] text-[#FFE394] border-[#385B9E]";

    const destinationLabel =
      DESTINATION_META.find((d) => d.value === destination)?.label ||
      "Keep in Blueprint";

    const reviewStatusBadgeStyle =
      parentStatus === "ready_for_meeting"
        ? "bg-emerald-950/80 text-emerald-200 border-emerald-400/50"
        : parentStatus === "parent_approved"
        ? "bg-[#142F63] text-[#FFE394] border-[#DFBE77]/60"
        : "bg-[#0B1C3D] text-[#B8D0F4] border-[#2C4A82]";

    const reviewStatusLabel =
      PARENT_REVIEW_STATUS_META.find((s) => s.value === parentStatus)?.label ||
      "Review with Parent";

    return (
      <div
        key={target.id}
        data-testid={`blueprint-item-${target.id}`}
        className={cn(
          "rounded-2xl border transition-all overflow-hidden",
          isSelected
            ? "border-[#DFBE77]/75 bg-gradient-to-b from-[#0A1938] via-[#07132C] to-[#040C1E] shadow-[0_12px_32px_rgba(0,0,0,0.75),0_0_24px_rgba(75,112,184,0.16)]"
            : "border-[#223868] bg-[#051026]/95 hover:border-[#3D5FA6] shadow-[0_6px_20px_rgba(0,0,0,0.55)]"
        )}
      >
        {/* ── ITEM SUMMARY HEADER ROW ── */}
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            {/* Left: Order Controls + Title + Status & Destination Badges */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Reorder Up/Down buttons */}
                <div className="inline-flex items-center rounded-lg bg-[#030A1A] border border-[#1E3460] p-0.5 shrink-0">
                  <button
                    type="button"
                    data-testid={`blueprint-move-up-${target.id}`}
                    disabled={indexInList === 0}
                    onClick={() => handleMoveItemOrder(target.id, "up")}
                    className="p-1 text-[#9BB7E0] hover:text-[#FFE394] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="Move item earlier in order"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <span className="px-1.5 text-[10.5px] font-mono font-bold text-[#FFE394]">
                    #{indexInList + 1}
                  </span>
                  <button
                    type="button"
                    data-testid={`blueprint-move-down-${target.id}`}
                    disabled={indexInList >= totalInList - 1}
                    onClick={() => handleMoveItemOrder(target.id, "down")}
                    className="p-1 text-[#9BB7E0] hover:text-[#FFE394] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="Move item later in order"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Clickable Title Pill to Select / Expand */}
                <button
                  type="button"
                  data-testid={`blueprint-select-item-${target.id}`}
                  onClick={() =>
                    setSelectedItemId(isSelected ? null : target.id)
                  }
                  className="inline-flex items-center gap-1.5 bg-[#091D42] hover:bg-[#102A5C] text-[#FFF8EB] border border-[#2F4E8A] hover:border-[#DFBE77]/70 text-xs sm:text-sm font-bold px-3 py-1 rounded-full cursor-pointer transition-colors shadow-sm text-left"
                >
                  <span>🎯 {target.targetName}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-[#DFBE77] transition-transform",
                      isSelected && "rotate-180"
                    )}
                  />
                </button>

                {/* IEP Section Badge */}
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#071633] border border-[#1E3563] text-[#9BB7E0] font-mono">
                  {target.iepSection}
                </span>

                {/* Priority Selector Pill */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      data-testid={`blueprint-priority-btn-${target.id}`}
                      className={cn(
                        "text-[10.5px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer inline-flex items-center gap-1",
                        target.priority === "high"
                          ? "bg-amber-950/70 text-[#FFE394] border-[#DFBE77]/50"
                          : target.priority === "low"
                          ? "bg-[#061229] text-[#8CA6CC] border-[#1D325A]"
                          : "bg-[#0B1E42] text-[#C8DAF4] border-[#29467A]"
                      )}
                      title="Change parent priority"
                    >
                      <span>
                        Priority:{" "}
                        {(target.priority || "medium").charAt(0).toUpperCase() +
                          (target.priority || "medium").slice(1)}
                      </span>
                      <ChevronDown className="h-2.5 w-2.5 opacity-75" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#06142E] border border-[#2C4A82] text-white text-xs">
                    <DropdownMenuItem
                      onClick={() =>
                        handleInlineFieldUpdate(target.id, { priority: "high" })
                      }
                      className="cursor-pointer"
                    >
                      High Priority
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleInlineFieldUpdate(target.id, {
                          priority: "medium",
                        })
                      }
                      className="cursor-pointer"
                    >
                      Medium Priority
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleInlineFieldUpdate(target.id, { priority: "low" })
                      }
                      className="cursor-pointer"
                    >
                      Low Priority
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Parent-Review Status Badge */}
                <Badge
                  data-testid={`blueprint-review-status-badge-${target.id}`}
                  className={cn(
                    "text-[10.5px] px-2 py-0.5 border font-semibold",
                    reviewStatusBadgeStyle
                  )}
                >
                  {reviewStatusLabel}
                </Badge>

                {/* Current Destination Badge */}
                <Badge
                  data-testid={`blueprint-destination-badge-${target.id}`}
                  className={cn(
                    "text-[10.5px] px-2 py-0.5 border font-semibold",
                    destinationBadgeStyle
                  )}
                >
                  Destination: {destinationLabel}
                </Badge>

                {/* Preserved Live Meeting Outcome Badge (if any recorded history exists) */}
                {target.meetingStatus &&
                  target.meetingStatus !== "NOT_DISCUSSED" && (
                    <Badge className="bg-emerald-950/80 text-emerald-200 border border-emerald-500/40 text-[10.5px]">
                      Meeting Outcome: {target.meetingStatus}
                    </Badge>
                  )}
              </div>

              {/* Concise Summary of Proposed Request */}
              <div className="pt-1">
                <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[#8CA6CC]">
                  What we want to ask for
                </p>
                <p className="text-sm font-semibold text-[#FFF8EB] mt-0.5 leading-snug">
                  &ldquo;{whatWeWantValue}&rdquo;
                </p>
              </div>
            </div>

            {/* Right: Direct "Include in Final Meeting Plan" Control + View Source + Contextual Menu */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Direct "Include in Final Meeting Plan" toggle synchronized with Destination */}
              <button
                type="button"
                data-testid={`include-in-final-plan-btn-${target.id}`}
                onClick={() => handleToggleFinalPlanInclusion(target)}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm",
                  isIncludedInFinalPlan
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]"
                    : "bg-[#091A3A] hover:bg-[#102854] text-[#D8E6FA] hover:text-white border-[#2E4D88]"
                )}
                title="Directly include or exclude this item from the Final Meeting Plan"
              >
                {isIncludedInFinalPlan ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#07162B]" />
                    <span>Included in Final Plan</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 text-[#FFE394]" />
                    <span>Include in Final Meeting Plan</span>
                  </>
                )}
              </button>

              {/* View Source button */}
              {hasSourceEvidence && (
                <button
                  type="button"
                  data-testid={`blueprint-open-evidence-${target.id}`}
                  onClick={() => onOpenSourceEvidence?.(target)}
                  title="Open original source document and highlighted passage in Records Review"
                  className="h-8 px-2.5 rounded-xl text-xs text-[#FFE394] hover:text-white bg-[#081938] hover:bg-[#0F2752] border border-[#2D4B82] hover:border-[#DFBE77]/60 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>View Source</span>
                </button>
              )}

              {/* Expand / Edit Toggle Button */}
              <button
                type="button"
                data-testid={`blueprint-expand-btn-${target.id}`}
                onClick={() =>
                  setSelectedItemId(isSelected ? null : target.id)
                }
                className={cn(
                  "h-8 px-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1",
                  isSelected
                    ? "bg-[#132C5C] text-[#FFE394] border-[#DFBE77]/60"
                    : "bg-[#081938] text-[#C8DAF4] border-[#264073] hover:text-white"
                )}
              >
                <Pencil className="h-3.5 w-3.5 text-[#DFBE77]" />
                <span>{isSelected ? "Done Reviewing" : "Review & Edit"}</span>
              </button>

              {/* Secondary Actions Contextual Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    data-testid={`blueprint-item-menu-${target.id}`}
                    className="h-8 w-8 rounded-xl bg-[#081938] hover:bg-[#102752] border border-[#264073] text-[#C8DAF4] hover:text-white inline-flex items-center justify-center cursor-pointer"
                    title="More item actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 bg-[#05132C] border border-[#2D4B82] text-[#FFF4D4] text-xs p-1.5 shadow-2xl"
                >
                  <DropdownMenuItem
                    data-testid={`menu-combine-item-${target.id}`}
                    onClick={() => setCombineTarget(target)}
                    className="cursor-pointer gap-2 py-2"
                  >
                    <Layers className="h-3.5 w-3.5 text-[#DFBE77]" />
                    <span>Combine with Related Item / Finding…</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingTarget(target);
                      setIsNewTargetModal(false);
                    }}
                    className="cursor-pointer gap-2 py-2"
                  >
                    <Pencil className="h-3.5 w-3.5 text-[#DFBE77]" />
                    <span>Open Full Strategy Editor Modal…</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDuplicateTarget(target)}
                    className="cursor-pointer gap-2 py-2"
                  >
                    <Copy className="h-3.5 w-3.5 text-[#DFBE77]" />
                    <span>Duplicate Plan Item</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#1E3460]" />
                  <DropdownMenuItem
                    data-testid={`menu-remove-from-plan-${target.id}`}
                    onClick={() => handleRemoveFromPlan(target)}
                    className="cursor-pointer gap-2 py-2 text-amber-200 focus:text-amber-100"
                  >
                    <Archive className="h-3.5 w-3.5 text-amber-400" />
                    <span>Remove from Plan (Keep Finding & Evidence)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-testid={`menu-delete-finding-${target.id}`}
                    onClick={() => setTargetToDelete(target)}
                    className="cursor-pointer gap-2 py-2 text-rose-300 focus:text-rose-200"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    <span>Delete Finding Everywhere…</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {target.sourceMaterialFlaggedForReview && (
            <div className="rounded-lg bg-amber-950/30 border border-amber-500/40 px-3 py-2 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-200 min-w-0">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] leading-snug">
                  {target.sourceMaterialFlagReason ||
                    "Source documents changed since this item was prepared — verify original evidence."}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleInlineFieldUpdate(target.id, {
                    sourceMaterialFlaggedForReview: false,
                    sourceMaterialFlagReason: undefined,
                  })
                }
                className="text-[10.5px] font-semibold text-amber-300 hover:text-white underline shrink-0 cursor-pointer"
              >
                Mark Verified
              </button>
            </div>
          )}

          {/* ── COMPACT "WHAT TO SAY TO THE PARENT" PREVIEW WHEN COLLAPSED ── */}
          {!isSelected && (
            <div
              data-testid={`what-to-say-collapsed-preview-${target.id}`}
              className="rounded-xl bg-[#071836]/90 border border-[#DFBE77]/45 px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#FFE394]">
                    🗣️ What to Say to the Parent
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#102754] border border-[#2C4A82] text-[#B8D0F4]">
                    {activeScriptStyleLabel}
                  </span>
                  {target.whatToSayToParentEdited && (
                    <span className="text-[10px] text-emerald-300 font-semibold">
                      · Edited
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#FFF8EB] leading-relaxed">
                  &ldquo;{whatToSayToParentValue}&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemId(target.id)}
                className="text-[11px] font-semibold text-[#FFE394] hover:text-white shrink-0 underline cursor-pointer"
              >
                Edit Script
              </button>
            </div>
          )}

          {/* ── PRESERVED 2-COLUMN RATIONALE & SUPPORTING EVIDENCE GRID (USER REQUESTED) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#1F3562]/80 text-xs">
            <div className="rounded-xl bg-[#020918] p-3 border border-[#243B6B]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFE394] mb-1">
                💡 WHY WE WANT IT
              </p>
              <p className="text-[#D4E2F7] text-xs leading-relaxed">
                {whyItMattersValue || "No rationale specified."}
              </p>
            </div>

            <div className="rounded-xl bg-[#020918] p-3 border border-[#243B6B]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFE394]">
                  📊 SUPPORTING EVIDENCE
                </p>
                {hasSourceEvidence && (
                  <button
                    type="button"
                    onClick={() => onOpenSourceEvidence?.(target)}
                    className="text-[11px] text-[#DFBE77] hover:text-[#FFF4D4] inline-flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <span>View Source</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-[#D4E2F7] text-xs leading-relaxed">
                {target.supportingEvidence ||
                  whatWeFoundValue ||
                  "No evidence attached."}
              </p>
              {target.combinedSourceItems &&
                target.combinedSourceItems.length > 1 && (
                  <div className="mt-2 pt-1.5 border-t border-[#1A2D54] flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-[#FFE394]">
                      Combined Sources ({target.combinedSourceItems.length}):
                    </span>
                    {target.combinedSourceItems.map((srcItem, idx) => (
                      <button
                        key={`${srcItem.findingId}-${idx}`}
                        type="button"
                        onClick={() =>
                          onOpenSourceEvidence?.({
                            ...target,
                            sourceRef: srcItem.sourceRef || target.sourceRef,
                            evalSourceRef:
                              srcItem.evalSourceRef || target.evalSourceRef,
                          })
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-[#0A1D42] border border-[#2E4D88] text-[#B8D0F4] hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="h-2.5 w-2.5 text-[#DFBE77]" />
                        <span>
                          {srcItem.sourceRef?.fileName ||
                            srcItem.evalSourceRef?.fileName ||
                            srcItem.sources?.[0] ||
                            `Source #${idx + 1}`}
                          {srcItem.sourceRef?.pdfPageNumber
                            ? ` p.${srcItem.sourceRef.pdfPageNumber}`
                            : srcItem.evalSourceRef?.pdfPageNumber
                            ? ` p.${srcItem.evalSourceRef.pdfPageNumber}`
                            : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* ── EXPANDED PARENT-FRIENDLY REVIEW & ROUTING WORKSPACE ── */}
        {isSelected && (
          <div
            data-testid={`blueprint-expanded-detail-${target.id}`}
            className="px-4 sm:px-5 pb-5 pt-3 border-t border-[#233B6E] bg-[#040D21]/95 space-y-4"
          >
            {/* Title & Section Quick Edit Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8">
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#9BB7E0] block mb-1">
                  Plan Item Title
                </label>
                <Input
                  data-testid={`edit-target-title-${target.id}`}
                  value={target.targetName}
                  onChange={(e) =>
                    handleInlineFieldUpdate(target.id, {
                      targetName: e.target.value,
                    })
                  }
                  className="h-8 text-xs bg-[#071530] border-[#29467E] text-white font-semibold"
                />
              </div>
              <div className="md:col-span-4">
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#9BB7E0] block mb-1">
                  IEP Section
                </label>
                <Input
                  value={target.iepSection}
                  onChange={(e) =>
                    handleInlineFieldUpdate(target.id, {
                      iepSection: e.target.value,
                    })
                  }
                  className="h-8 text-xs bg-[#071530] border-[#29467E] text-white"
                />
              </div>
            </div>

            {/* ── PROMINENT "WHAT TO SAY TO THE PARENT" READ-ALOUD SCRIPT SECTION ── */}
            <div
              data-testid={`what-to-say-to-parent-section-${target.id}`}
              className="rounded-xl bg-gradient-to-r from-[#0B214A] via-[#091B3E] to-[#071530] border border-[#DFBE77]/65 p-4 space-y-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#FFE394] flex items-center gap-1.5">
                      <span>🗣️ What to Say to the Parent</span>
                    </span>
                    <Badge className="bg-[#132E63] text-[#FFE394] border border-[#DFBE77]/50 text-[10px] font-semibold">
                      {activeScriptStyleLabel}
                    </Badge>
                    {target.whatToSayToParentEdited ? (
                      <Badge
                        data-testid={`script-edited-badge-${target.id}`}
                        className="bg-emerald-950/90 text-emerald-200 border border-emerald-400/50 text-[10px] font-semibold"
                      >
                        Edited · Protected from Overwrite
                      </Badge>
                    ) : (
                      <Badge className="bg-[#081836] text-[#B8D0F4] border border-[#2C4A82] text-[10px]">
                        Suggested Read-Aloud Script
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-[#B8D0F4]">
                    Short, natural script to read aloud when reviewing this item
                    with the parent—explains the finding, introduces the
                    proposed request, and invites parent input. Kept separate
                    from the formal meeting request, technical analysis, and
                    recorded parent feedback.
                  </p>
                </div>

                {/* Framing Style Switcher + Refresh / Copy Actions */}
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  {PARENT_SCRIPT_STYLE_META.map((styleOpt) => {
                    const currentSetting =
                      target.whatToSayToParentStyle || "auto";
                    const isActive =
                      currentSetting === styleOpt.value ||
                      (currentSetting === "auto" &&
                        styleOpt.value === detectedScriptStyle);
                    return (
                      <button
                        key={styleOpt.value}
                        type="button"
                        data-testid={`script-style-${styleOpt.value}-${target.id}`}
                        onClick={() =>
                          handleRegenerateItemScript(target, styleOpt.value)
                        }
                        className={cn(
                          "h-7 px-2.5 rounded-lg text-[10.5px] font-semibold border transition-colors cursor-pointer",
                          isActive
                            ? "bg-[#1A3B7A] text-[#FFE394] border-[#DFBE77]/70"
                            : "bg-[#051126] text-[#9BB7E0] border-[#223B6D] hover:text-white"
                        )}
                        title={`Generate suggestion using "${styleOpt.label}" framing`}
                      >
                        {styleOpt.label}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    data-testid={`regenerate-script-btn-${target.id}`}
                    onClick={() => handleRegenerateItemScript(target)}
                    className="h-7 px-2.5 rounded-lg text-[10.5px] font-semibold bg-[#081A3B] hover:bg-[#102857] text-[#FFE394] border border-[#2E4E8A] inline-flex items-center gap-1 cursor-pointer"
                    title="Generate a fresh suggested script (will not overwrite your edits automatically)"
                  >
                    <Sparkles className="h-3 w-3 text-[#FFE394]" />
                    <span>
                      {target.whatToSayToParentEdited
                        ? "Preview Suggestion"
                        : "Refresh Suggestion"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(whatToSayToParentValue);
                      toast.success("Copied parent script to clipboard");
                    }}
                    className="h-7 px-2 rounded-lg text-[10.5px] bg-[#051126] hover:bg-[#0D2147] text-[#C8DAF4] border border-[#223B6D] inline-flex items-center gap-1 cursor-pointer"
                    title="Copy read-aloud script"
                  >
                    <Copy className="h-3 w-3 text-[#DFBE77]" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <Textarea
                data-testid={`edit-what-to-say-to-parent-${target.id}`}
                value={whatToSayToParentValue}
                onChange={(e) =>
                  handleEditWhatToSayToParent(target.id, e.target.value)
                }
                rows={3}
                placeholder="Write a brief, natural script an employee can read aloud when reviewing this item with the parent..."
                className="text-xs sm:text-sm bg-[#030A1A] border-[#355696] focus:border-[#DFBE77] text-[#FFF8EB] font-medium leading-relaxed"
              />

              {/* Non-destructive preview when user has customized the script and requests a new suggestion */}
              {pendingScriptPreview && (
                <div
                  data-testid={`script-suggestion-preview-${target.id}`}
                  className="rounded-lg bg-[#05132B] border border-[#DFBE77]/60 p-3 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-[#FFE394]">
                      New Suggested Script Preview (Your edited script above was
                      preserved):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`apply-suggested-script-${target.id}`}
                        onClick={() => handleApplyPreviewedScript(target)}
                        className="px-2.5 py-1 rounded bg-[#DFBE77] text-[#07162B] font-bold text-[11px] cursor-pointer"
                      >
                        Use Suggested Script
                      </button>
                      <button
                        type="button"
                        data-testid={`keep-edited-script-${target.id}`}
                        onClick={() => handleDismissPreviewedScript(target.id)}
                        className="px-2.5 py-1 rounded bg-[#0A1D40] border border-[#2E4D88] text-[#C8DAF4] hover:text-white text-[11px] cursor-pointer"
                      >
                        Keep My Edited Script
                      </button>
                    </div>
                  </div>
                  <p className="text-[#D8E6FA] italic leading-relaxed">
                    &ldquo;{pendingScriptPreview.script}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* ── FOUR EDITABLE PARENT-FRIENDLY SECTIONS ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1. What we found */}
              <div className="rounded-xl bg-[#071530]/90 border border-[#264175] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#FFE394]">
                    1. What we found
                  </label>
                  <span className="text-[10px] text-[#8CA6CC]">
                    Plain-language finding or gap
                  </span>
                </div>
                <Textarea
                  data-testid={`edit-what-we-found-${target.id}`}
                  value={whatWeFoundValue}
                  onChange={(e) =>
                    handleInlineFieldUpdate(target.id, {
                      parentWhatWeFound: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="e.g., The IEP describes reading difficulties, but it does not include a reading goal."
                  className="text-xs bg-[#030B1B] border-[#233B6B] text-white leading-relaxed"
                />
              </div>

              {/* 2. Why it matters */}
              <div className="rounded-xl bg-[#071530]/90 border border-[#264175] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#FFE394]">
                    2. Why it matters
                  </label>
                  <span className="text-[10px] text-[#8CA6CC]">
                    Practical impact on your child
                  </span>
                </div>
                <Textarea
                  data-testid={`edit-why-it-matters-${target.id}`}
                  value={whyItMattersValue}
                  onChange={(e) =>
                    handleInlineFieldUpdate(target.id, {
                      parentWhyWeWantIt: e.target.value,
                      whyWeWantIt: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="e.g., We need a clear way to track whether your child's reading is improving."
                  className="text-xs bg-[#030B1B] border-[#233B6B] text-white leading-relaxed"
                />
              </div>

              {/* 3. What we want to ask for */}
              <div className="rounded-xl bg-[#071530]/90 border border-[#264175] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#FFE394]">
                    3. What we want to ask for
                  </label>
                  <span className="text-[10px] text-[#8CA6CC]">
                    Specific proposed request for the team
                  </span>
                </div>
                <Textarea
                  data-testid={`edit-what-we-want-${target.id}`}
                  value={whatWeWantValue}
                  onChange={(e) =>
                    handleInlineFieldUpdate(target.id, {
                      parentWhatWeWant: e.target.value,
                      quickAdvocateSayThis: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="e.g., A measurable reading goal based on your child's current reading skills."
                  className="text-xs bg-[#030B1B] border-[#233B6B] text-white leading-relaxed"
                />
              </div>

              {/* 4. Your input */}
              <div className="rounded-xl bg-[#071530]/90 border border-[#DFBE77]/45 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#FFE394]">
                    4. Your input (Parent Perspective & Questions)
                  </label>
                  <span className="text-[10px] text-[#B8D0F4]">
                    Parent observations & priorities
                  </span>
                </div>
                <Textarea
                  data-testid={`edit-parent-input-${target.id}`}
                  value={yourInputValue}
                  onChange={(e) =>
                    handleInlineFieldUpdate(target.id, {
                      parentInput: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Does this match what you are seeing? Is this a priority for you?"
                  className="text-xs bg-[#030B1B] border-[#2D4A82] text-white leading-relaxed"
                />
              </div>
            </div>

            {/* ── DELIBERATE PARENT-REVIEW STATUS & DESTINATION CONTROLS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {/* Parent-Review Status Selector */}
              <div className="rounded-xl bg-[#06132B] border border-[#233C6E] p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFE394]">
                    Parent-Review Status
                  </span>
                  <span className="text-[10px] text-[#8CA6CC]">
                    Deliberate manual status (does not auto-advance)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PARENT_REVIEW_STATUS_META.map((st) => {
                    const active = parentStatus === st.value;
                    return (
                      <button
                        key={st.value}
                        type="button"
                        data-testid={`parent-review-status-${st.value}-${target.id}`}
                        onClick={() =>
                          handleChangeParentReviewStatus(target, st.value)
                        }
                        className={cn(
                          "px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer",
                          active
                            ? "bg-gradient-to-b from-[#17366E] to-[#0F2650] border-[#DFBE77] text-white shadow-sm"
                            : "bg-[#030B1B] border-[#1D325C] text-[#9BB7E0] hover:border-[#37599B] hover:text-white"
                        )}
                      >
                        <div className="text-xs font-bold flex items-center justify-between gap-1">
                          <span>{st.label}</span>
                          {active && (
                            <Check className="h-3.5 w-3.5 text-[#FFE394] shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-[#8CA6CC] mt-0.5 leading-tight">
                          {st.shortDesc}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10.5px] text-[#8CA6CC]">
                  &ldquo;Parent Approved&rdquo; means the parent supports
                  raising the request. It does not mean the school has agreed or
                  automatically place it in the final plan.
                </p>
              </div>

              {/* Item Destination Selector */}
              <div className="rounded-xl bg-[#06132B] border border-[#233C6E] p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFE394]">
                    Destination
                  </span>
                  <span className="text-[10px] text-[#8CA6CC]">
                    Where should this item appear?
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DESTINATION_META.map((dest) => {
                    const active = destination === dest.value;
                    return (
                      <button
                        key={dest.value}
                        type="button"
                        data-testid={`destination-${dest.value}-${target.id}`}
                        onClick={() =>
                          handleChangeDestination(target, dest.value)
                        }
                        className={cn(
                          "px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer",
                          active
                            ? dest.value === "parent_doesnt_want"
                              ? "bg-[#2B0A12] border-rose-400 text-rose-100"
                              : dest.value === "final_meeting_plan"
                              ? "bg-emerald-950/80 border-emerald-400 text-emerald-100"
                              : "bg-gradient-to-b from-[#17366E] to-[#0F2650] border-[#DFBE77] text-white"
                            : "bg-[#030B1B] border-[#1D325C] text-[#9BB7E0] hover:border-[#37599B] hover:text-white"
                        )}
                      >
                        <div className="text-xs font-bold flex items-center justify-between gap-1">
                          <span>{dest.label}</span>
                          {active && (
                            <Check className="h-3.5 w-3.5 text-[#FFE394] shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] opacity-80 mt-0.5 leading-tight line-clamp-2">
                          {dest.description}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Optional explanation when placed in Parent Doesn't Want */}
                {destination === "parent_doesnt_want" && (
                  <div className="pt-1.5">
                    <label className="text-[10.5px] font-semibold text-rose-200 block mb-1">
                      Parent&apos;s Preference Explanation (Synced with Parent
                      Doesn&apos;t Want area below):
                    </label>
                    <Input
                      data-testid={`pdw-reason-input-${target.id}`}
                      value={target.parentDoesntWantReason || ""}
                      onChange={(e) =>
                        handleInlineFieldUpdate(target.id, {
                          parentDoesntWantReason: e.target.value,
                        })
                      }
                      placeholder="Optional explanation of why the parent does not want to pursue this..."
                      className="h-8 text-xs bg-[#170509] border-rose-500/50 text-rose-100"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── EXPANDABLE TECHNICAL ANALYSIS, STRATEGY & SOURCE EVIDENCE ── */}
            <div className="rounded-xl bg-[#030A1A] border border-[#1E3460] overflow-hidden">
              <button
                type="button"
                data-testid={`toggle-technical-analysis-${target.id}`}
                onClick={() => toggleTechnicalAnalysis(target.id)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-[#B8D0F4] hover:text-white cursor-pointer"
              >
                <span className="font-semibold flex items-center gap-2">
                  {isTechnicalOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-[#DFBE77]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-[#DFBE77]" />
                  )}
                  <span>
                    Original Analysis, Advocate Strategy &amp; Source Citations
                  </span>
                </span>
                <span className="text-[11px] text-[#8CA6CC]">
                  {isTechnicalOpen ? "Hide details" : "Expand details"}
                </span>
              </button>

              {isTechnicalOpen && (
                <div className="p-3.5 border-t border-[#1E3460] space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10.5px] font-bold uppercase text-[#9BB7E0] block mb-1">
                        Original Finding / Technical Analysis
                      </label>
                      <Textarea
                        value={target.fullAdvocateScript || ""}
                        onChange={(e) =>
                          handleInlineFieldUpdate(target.id, {
                            fullAdvocateScript: e.target.value,
                          })
                        }
                        rows={2}
                        className="text-xs bg-[#06132B] border-[#243E70] text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold uppercase text-[#9BB7E0] block mb-1">
                        Supporting Evidence Excerpt
                      </label>
                      <Textarea
                        value={target.supportingEvidence || ""}
                        onChange={(e) =>
                          handleInlineFieldUpdate(target.id, {
                            supportingEvidence: e.target.value,
                            parentSupportingEvidence: e.target.value,
                          })
                        }
                        rows={2}
                        className="text-xs bg-[#06132B] border-[#243E70] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10.5px] font-bold uppercase text-[#9BB7E0] block mb-1">
                        Put It Here (Exact IEP Location)
                      </label>
                      <Input
                        value={target.putItHereLocation || ""}
                        onChange={(e) =>
                          handleInlineFieldUpdate(target.id, {
                            putItHereLocation: e.target.value,
                          })
                        }
                        className="h-8 text-xs bg-[#06132B] border-[#243E70] text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold uppercase text-[#9BB7E0] block mb-1">
                        Proposed IEP Wording
                      </label>
                      <Input
                        value={target.possibleIepWording || ""}
                        onChange={(e) =>
                          handleInlineFieldUpdate(target.id, {
                            possibleIepWording: e.target.value,
                          })
                        }
                        className="h-8 text-xs bg-[#06132B] border-[#243E70] text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold uppercase text-[#9BB7E0] block mb-1">
                        If Team Disagrees (PWN Strategy)
                      </label>
                      <Input
                        value={target.ifTeamDisagrees || ""}
                        onChange={(e) =>
                          handleInlineFieldUpdate(target.id, {
                            ifTeamDisagrees: e.target.value,
                          })
                        }
                        className="h-8 text-xs bg-[#06132B] border-[#243E70] text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold uppercase text-[#FFE394] block mb-1">
                      Advocate Notes (Optional)
                    </label>
                    <Textarea
                      data-testid={`edit-advocate-notes-${target.id}`}
                      value={target.notes || ""}
                      onChange={(e) =>
                        handleInlineFieldUpdate(target.id, {
                          notes: e.target.value,
                        })
                      }
                      rows={2}
                      placeholder="Optional internal notes or meeting strategy..."
                      className="text-xs bg-[#06132B] border-[#243E70] text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const approvedOrReadyCount = useMemo(
    () =>
      activePlanTargets.filter((t) => {
        const st = getEffectiveParentReviewStatus(t);
        return st === "parent_approved" || st === "ready_for_meeting";
      }).length,
    [activePlanTargets]
  );

  return (
    <div
      data-testid="blueprint-view-root"
      className="space-y-5 bg-[radial-gradient(ellipse_at_50%_0%,#1B3B75_0%,#102652_55%,#0B1B3D_100%)] rounded-2xl p-4 sm:p-6 border border-[#345494]/80 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-x-hidden"
    >
      {/* ── TOP HEADER: STEP 2 · BLUEPRINT + TITLE + SUBTITLE (MATCHING STEP 1 LAUNCH BAR) ── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <span className="text-[#FFE394] text-xs leading-none drop-shadow-[0_0_6px_rgba(255,227,148,0.6)]">
            ✦
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFE394]">
            STEP 2 · BLUEPRINT
          </span>
          <span className="h-px w-20 bg-gradient-to-r from-[#FFE394]/80 to-transparent" />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-2xl sm:text-[28px] font-normal text-white tracking-tight leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            Blueprint{" "}
            <span className="text-base sm:text-lg font-sans font-medium text-[#FFE394] ml-1.5">
              · Our plan for your child’s next IEP meeting.
            </span>
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#B8D0F4]">
          Here is what we found, why it matters, and what we want to ask the
          school team for.
        </p>
      </div>

      {/* ── MAIN FRAMED BLUEPRINT CONSOLE CARD (WITH TOP & BOTTOM BRASS CLASPS & LUMINOUS GRADIENT) ── */}
      <div className="relative rounded-2xl border border-[#4B70B8]/80 bg-gradient-to-br from-[#163166] via-[#102550] to-[#0B1B3D] shadow-[0_0_38px_rgba(92,135,235,0.28),0_16px_36px_rgba(2,8,24,0.65),inset_0_1px_1px_rgba(255,255,255,0.16)] overflow-hidden">
        {/* Ambient sapphire glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-40 rounded-full bg-[#4A78E0]/15 blur-3xl"
        />
        {/* Cozy Brass Lamp with Interactive Pull Chain */}
        <CozyPullChainLamp />
        {/* Bottom Centered Brass Accent Clasp */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-1.5 w-16 rounded-t-md bg-gradient-to-r from-[#9E7B36] via-[#FFE8A3] to-[#9E7B36] shadow-[0_-2px_12px_rgba(255,227,148,0.65)] z-10"
        />

        {/* Two-Column Body: Left = Final Meeting Plan Readiness, Right = Plan Views & Organization */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT COLUMN: FINAL MEETING PLAN SUMMARY */}
          <div className="lg:col-span-7 p-5 sm:p-6 lg:border-r lg:border-[#2E4C86]/80 flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-2.5">
              <MapIcon className="h-5 w-5 text-[#FFE394] shrink-0" />
              <span className="text-sm sm:text-[15px] font-bold uppercase tracking-wider text-white">
                ADVOCACY PLAN SUMMARY
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-[#F0D590] via-[#D4AF63] to-[#B38D42] text-[#09152B] text-[11px] font-bold shadow-sm">
                {finalMeetingPlanTargets.length} in Final Plan
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-[#FFE394]/60 to-transparent ml-2" />
            </div>

            {/* Dashed / Framed Inner Plan Box */}
            <div className="rounded-xl border border-dashed border-[#496EB5]/85 bg-gradient-to-b from-[#132C5C]/90 via-[#0F234B]/90 to-[#0B1A3B]/95 px-5 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base sm:text-lg font-bold text-white">
                    {activePlanTargets.length} Active Plan{" "}
                    {activePlanTargets.length === 1 ? "Item" : "Items"}
                  </span>
                  <Badge className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[11px]">
                    {approvedOrReadyCount} Parent Approved / Ready
                  </Badge>
                </div>
                <p className="text-xs text-[#B8D0F4] leading-relaxed max-w-md">
                  Review each item with the parent using the read-aloud script,
                  record their input, and choose which requests move into the{" "}
                  <strong className="text-white">Final Meeting Plan</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {unlinkedStep1Findings.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    data-testid="pull-step1-findings-btn"
                    onClick={handlePullUnlinkedFindingsIntoBlueprint}
                    className="h-9 text-xs font-bold bg-[#142F63] hover:bg-[#1C3F82] text-[#FFE394] border border-[#DFBE77]/60 cursor-pointer gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#FFE394]" />
                    <span>
                      Bring {unlinkedStep1Findings.length}{" "}
                      {unlinkedStep1Findings.length === 1
                        ? "Finding"
                        : "Findings"}
                    </span>
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  data-testid="blueprint-add-plan-item-btn"
                  onClick={() => handleAddNewTarget()}
                  className="h-9 px-4 rounded-xl text-xs font-bold bg-gradient-to-b from-[#F5DC9B] via-[#DFBE77] to-[#B58F44] text-[#08152C] border border-[#FFF1C2]/80 shadow-[0_4px_14px_rgba(0,0,0,0.45)] hover:brightness-105 cursor-pointer gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5 text-[#08152C]" />
                  <span>+ Add Plan Item</span>
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ORDER & TOOLS */}
          <div className="lg:col-span-5 p-5 sm:p-6 border-t lg:border-t-0 border-[#2E4C86]/80 flex flex-col justify-between space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#FFE394] shrink-0" />
                <span className="text-sm sm:text-[15px] font-bold text-white">
                  Organize &amp; Share Plan
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-[#1A356B] border border-[#4567AD] text-[#C8DCF8] text-[11px] font-semibold">
                Controls
              </span>
            </div>

            {/* Row 1: Order Selector */}
            <div className="rounded-xl border border-[#3B5CA0]/85 bg-gradient-to-r from-[#132B59]/90 to-[#0E2147]/90 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white">Item Order</div>
                <div className="text-[11px] text-[#A9C3E8]">
                  {sortOrder === "meeting_order"
                    ? "Grouped by IEP section order"
                    : "Sorted by parent priority"}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  data-testid="sort-by-meeting-order-btn"
                  onClick={() => setSortOrder("meeting_order")}
                  className={cn(
                    "h-7 px-2.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors",
                    sortOrder === "meeting_order"
                      ? "bg-[#1A3B7A] text-[#FFE394] border-[#DFBE77]/70"
                      : "bg-[#071530] text-[#9BB7E0] border-[#213866] hover:text-white"
                  )}
                >
                  Meeting Order
                </button>
                <button
                  type="button"
                  data-testid="sort-by-parent-priority-btn"
                  onClick={() => setSortOrder("parent_priority")}
                  className={cn(
                    "h-7 px-2.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors",
                    sortOrder === "parent_priority"
                      ? "bg-[#1A3B7A] text-[#FFE394] border-[#DFBE77]/70"
                      : "bg-[#071530] text-[#9BB7E0] border-[#213866] hover:text-white"
                  )}
                >
                  Parent Priority
                </button>
              </div>
            </div>

            {/* Row 2: Preview, Print, Email & Tools */}
            <div className="rounded-xl border border-[#3B5CA0]/85 bg-gradient-to-r from-[#132B59]/90 to-[#0E2147]/90 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white">
                  Parent Preview &amp; Tools
                </div>
                <div className="text-[11px] text-[#A9C3E8]">
                  Preview, print, email, or reorganize
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowParentPreviewModal(true)}
                  disabled={targets.length === 0}
                  className="h-8 text-xs font-semibold border-[#3E63A8] bg-[#0B1C3D] text-[#FFE394] hover:bg-[#132B59] hover:text-white cursor-pointer gap-1.5"
                >
                  <HeartHandshake className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Preview</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold border-[#365799] bg-[#0B1C3D] text-[#D8E6FA] hover:bg-[#132B59] hover:text-white cursor-pointer gap-1.5"
                    >
                      <span>Share &amp; Tools</span>
                      <ChevronDown className="h-3.5 w-3.5 text-[#FFE394]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-[#06142E] border border-[#2E4D88] text-white text-xs p-1.5 shadow-2xl"
                  >
                    <DropdownMenuItem
                      onClick={() => setShowParentPreviewModal(true)}
                      disabled={targets.length === 0}
                      className="cursor-pointer gap-2 py-2"
                    >
                      <HeartHandshake className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Parent-Friendly Preview</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowEmailModal(true)}
                      disabled={targets.length === 0}
                      className="cursor-pointer gap-2 py-2"
                    >
                      <Mail className="h-3.5 w-3.5 text-teal-400" />
                      <span>Email Blueprint to Parent</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        openPrintDialog(
                          "PARENT_BLUEPRINT",
                          studentName,
                          meetingType,
                          meetingDate,
                          finalMeetingPlanTargets.length > 0
                            ? finalMeetingPlanTargets
                            : activePlanTargets
                        )
                      }
                      disabled={targets.length === 0}
                      className="cursor-pointer gap-2 py-2"
                    >
                      <Printer className="h-3.5 w-3.5 text-[#FFE394]" />
                      <span>Print Final Meeting Plan</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#1E3460]" />
                    <DropdownMenuItem
                      data-testid="refresh-all-unedited-scripts-btn"
                      onClick={handleRegenerateAllUneditedScripts}
                      disabled={targets.length === 0}
                      className="cursor-pointer gap-2 py-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#FFE394]" />
                      <span>Refresh Unedited Parent Scripts</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowReorganizeModal(true)}
                      className="cursor-pointer gap-2 py-2"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5 text-[#FFE394]" />
                      <span>Reorganize Sections &amp; Order</span>
                    </DropdownMenuItem>
                    {onOpenImportModal && (
                      <DropdownMenuItem
                        onClick={onOpenImportModal}
                        className="cursor-pointer gap-2 py-2"
                      >
                        <Download className="h-3.5 w-3.5 text-[#FFE394]" />
                        <span>Import Plan Items</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER BAR OF THE FRAMED CARD: VIEW FILTER PILLS + LAUNCH MEETING SPACE CTA */}
        <div className="relative z-10 border-t border-[#2E4C86]/80 bg-[#0A1836]/85 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Blueprint Plan Views"
            className="flex items-center gap-1.5 flex-wrap"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeFilterTab === "all_active"}
              data-testid="blueprint-tab-all-active"
              onClick={() => setActiveFilterTab("all_active")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5",
                activeFilterTab === "all_active"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394] font-bold"
                  : "bg-[#081836] border-[#264175] text-[#C8DAF4] hover:text-white"
              )}
            >
              <span>All Plan Items</span>
              <span className="px-1.5 py-0.2 rounded bg-black/20 font-mono text-[10.5px]">
                {activePlanTargets.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilterTab === "final_meeting_plan"}
              data-testid="blueprint-tab-final-meeting-plan"
              onClick={() => setActiveFilterTab("final_meeting_plan")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5",
                activeFilterTab === "final_meeting_plan"
                  ? "bg-emerald-500 text-[#041810] border-emerald-200 font-bold shadow-sm"
                  : "bg-[#07211A] border-emerald-500/40 text-emerald-200 hover:bg-emerald-950"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Final Meeting Plan</span>
              <span className="px-1.5 py-0.2 rounded bg-black/25 font-mono text-[10.5px]">
                {finalMeetingPlanTargets.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilterTab === "keep_in_blueprint"}
              data-testid="blueprint-tab-keep-in-blueprint"
              onClick={() => setActiveFilterTab("keep_in_blueprint")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5",
                activeFilterTab === "keep_in_blueprint"
                  ? "bg-[#183873] text-[#FFE394] border-[#DFBE77] font-bold"
                  : "bg-[#081836] border-[#264175] text-[#C8DAF4] hover:text-white"
              )}
            >
              <span>Keep in Blueprint</span>
              <span className="px-1.5 py-0.2 rounded bg-black/25 font-mono text-[10.5px]">
                {keepInBlueprintTargets.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilterTab === "parent_doesnt_want"}
              data-testid="blueprint-tab-parent-doesnt-want"
              onClick={() => setActiveFilterTab("parent_doesnt_want")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5",
                activeFilterTab === "parent_doesnt_want"
                  ? "bg-rose-800 text-white border-rose-300 font-bold"
                  : "bg-[#21080E] border-rose-500/40 text-rose-200 hover:bg-rose-950/70"
              )}
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Parent Doesn’t Want</span>
              <span className="px-1.5 py-0.2 rounded bg-black/25 font-mono text-[10.5px]">
                {parentDoesntWantTargets.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilterTab === "set_aside"}
              data-testid="blueprint-tab-set-aside"
              onClick={() => setActiveFilterTab("set_aside")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5",
                activeFilterTab === "set_aside"
                  ? "bg-slate-700 text-white border-slate-300 font-bold"
                  : "bg-[#081836] border-[#264175] text-[#9BB7E0] hover:text-white"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Set Aside</span>
              <span className="px-1.5 py-0.2 rounded bg-black/25 font-mono text-[10.5px]">
                {setAsideTargets.length}
              </span>
            </button>

            {removedOrArchivedTargets.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeFilterTab === "removed_history"}
                data-testid="blueprint-tab-removed-history"
                onClick={() => setActiveFilterTab("removed_history")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5",
                  activeFilterTab === "removed_history"
                    ? "bg-[#1C2F57] text-[#FFE394] border-[#DFBE77] font-bold"
                    : "bg-[#081836] border-[#264175] text-[#9BB7E0] hover:text-white"
                )}
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Removed / History ({removedOrArchivedTargets.length})</span>
              </button>
            )}
          </div>

          <Button
            size="sm"
            data-testid="enter-meeting-mode-btn"
            onClick={onPreviewMeetingMode}
            disabled={targets.length === 0}
            className="h-9 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/60 shadow-[0_4px_14px_rgba(0,0,0,0.6)] hover:brightness-105 px-4 cursor-pointer inline-flex items-center gap-1.5 shrink-0"
          >
            <PlayCircle className="h-4 w-4" />
            <span>
              Open Meeting Space ({finalMeetingPlanTargets.length} in Final Plan)
            </span>
          </Button>
        </div>
      </div>

      {/* ── FOCUSED FINAL MEETING PLAN BANNER (WHEN VIEWING FINAL MEETING PLAN) ── */}
      {activeFilterTab === "final_meeting_plan" && (
        <div
          data-testid="final-meeting-plan-banner"
          className="rounded-xl bg-gradient-to-r from-[#06241B] via-[#092E23] to-[#062019] border border-emerald-500/45 p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Final Meeting Plan · {finalMeetingPlanTargets.length} Selected{" "}
                {finalMeetingPlanTargets.length === 1 ? "Request" : "Requests"}
              </span>
            </div>
            <p className="text-xs text-emerald-100/85">
              Only these explicitly selected items appear as active requests in
              the finalized meeting agenda and Live Meeting Space. Use the arrows
              on any item to adjust meeting order.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                openPrintDialog(
                  "PARENT_BLUEPRINT",
                  studentName,
                  meetingType,
                  meetingDate,
                  finalMeetingPlanTargets
                )
              }
              disabled={finalMeetingPlanTargets.length === 0}
              className="h-8 text-xs border-emerald-400/50 bg-[#041812] text-emerald-200 hover:bg-emerald-950 cursor-pointer gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Final Plan</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onPreviewMeetingMode}
              disabled={finalMeetingPlanTargets.length === 0}
              className="h-8 text-xs font-bold bg-emerald-400 text-[#041810] hover:bg-emerald-300 cursor-pointer gap-1.5"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              <span>Launch Live Meeting with Final Plan</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── PARENT DOESN'T WANT TAB NOTICE (CONNECTED TO EXISTING AREA BELOW) ── */}
      {activeFilterTab === "parent_doesnt_want" && (
        <div className="rounded-xl bg-[#20070D] border border-rose-500/40 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-100">
          <div className="space-y-0.5">
            <div className="font-bold text-rose-200 flex items-center gap-1.5">
              <Ban className="h-4 w-4 text-rose-400" />
              <span>
                Connected to &ldquo;What the Parent Doesn&apos;t Want&rdquo;
              </span>
            </div>
            <p className="text-rose-200/80">
              Items routed here are excluded from active meeting requests and
              appear directly in the existing Parent Doesn&apos;t Want area
              below with your preference notes and preserved evidence.
            </p>
          </div>
          <a
            href="#parent-doesnt-want-box"
            className="h-8 px-3 rounded-lg bg-[#330C15] border border-rose-400/50 text-rose-100 hover:text-white inline-flex items-center gap-1.5 font-semibold"
          >
            <span>Jump to Parent Doesn&apos;t Want Box</span>
          </a>
        </div>
      )}

      {/* ── REMOVED / ARCHIVED ITEMS RESTORATION VIEW ── */}
      {activeFilterTab === "removed_history" ? (
        <div className="space-y-3">
          {removedOrArchivedTargets.length === 0 ? (
            <div className="rounded-xl bg-[#051026] border border-[#1E3460] p-8 text-center text-xs text-[#8CA6CC]">
              No removed or withdrawn items.
            </div>
          ) : (
            removedOrArchivedTargets.map((item) => (
              <div
                key={item.id}
                data-testid={`removed-plan-item-${item.id}`}
                className="rounded-xl bg-[#06132B] border border-[#243E70] p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">
                      {item.targetName}
                    </span>
                    <Badge className="bg-[#0B2046] text-[#FFE394] border border-[#2E4B82] text-[10px]">
                      {item.iepSection}
                    </Badge>
                    <Badge className="bg-amber-950/80 text-amber-200 border border-amber-500/40 text-[10px]">
                      {item.archivedOrWithdrawn
                        ? "Withdrawn (Meeting History Preserved)"
                        : "Removed from Active Plan"}
                    </Badge>
                  </div>
                  <p className="text-[#B8D0F4]">
                    {item.parentWhatWeWant || item.quickAdvocateSayThis}
                  </p>
                  {(item.archivedMeetingOutcome ||
                    (item.meetingStatus &&
                      item.meetingStatus !== "NOT_DISCUSSED")) && (
                    <p className="text-[11px] text-emerald-300">
                      Preserved outcome:{" "}
                      {item.archivedMeetingOutcome || item.meetingStatus}
                      {item.notes ? ` · Notes: ${item.notes}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    data-testid={`restore-to-blueprint-${item.id}`}
                    onClick={() =>
                      handleRestoreItem(item, "keep_in_blueprint")
                    }
                    className="h-8 text-xs bg-[#122A58] hover:bg-[#193873] text-[#FFE394] border border-[#3E63A8] cursor-pointer gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore to Blueprint</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    data-testid={`restore-to-final-plan-${item.id}`}
                    onClick={() =>
                      handleRestoreItem(item, "final_meeting_plan")
                    }
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    Restore to Final Plan
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeFilterTab === "all_active" && sortOrder === "meeting_order" ? (
        /* ── GROUPED BY IEP SECTION VIEW (DEFAULT MEETING ORDER) ── */
        <div className="space-y-4">
          {Array.from(sectionMap.entries()).map(([section, sectionTargets]) => {
            if (sectionTargets.length === 0 && !detectedOrder.includes(section))
              return null;
            const isCollapsed = expandedSection[section] === false;

            return (
              <div
                key={section}
                className="rounded-2xl bg-[#040E24]/90 border border-[#223868] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
              >
                <div
                  onClick={() => toggleSection(section)}
                  className="px-5 py-3 bg-[#071633] border-b border-[#223868] flex items-center justify-between cursor-pointer hover:bg-[#0B2046] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#FFE394]">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                    <h3 className="text-xs sm:text-sm font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="text-[#FFE394]">{section}</span>
                      <span className="text-[11px] font-mono text-[#9BB7E0] font-normal">
                        ({sectionTargets.length}{" "}
                        {sectionTargets.length === 1 ? "item" : "items"})
                      </span>
                    </h3>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddNewTarget(section);
                    }}
                    className="text-xs text-[#D8E6FA] hover:text-white hover:bg-[#122A58] h-7 px-2.5 inline-flex items-center gap-1 cursor-pointer border border-transparent hover:border-[#365799]"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#FFE394]" />
                    <span>Add Item</span>
                  </Button>
                </div>

                {!isCollapsed && (
                  <div className="p-4 space-y-3.5">
                    {sectionTargets.length === 0 ? (
                      <p className="text-xs text-[#8CA6CC] italic py-2 text-center">
                        No plan items in this section yet. Click &ldquo;+ Add
                        Item&rdquo; or send findings from Step 1.
                      </p>
                    ) : (
                      sectionTargets.map((target) => {
                        const globalIdx =
                          visibleTargetsForCurrentTab.findIndex(
                            (x) => x.id === target.id
                          );
                        return renderPlanItemCard(
                          target,
                          globalIdx,
                          visibleTargetsForCurrentTab.length
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── FLAT ORDERED VIEW (FINAL MEETING PLAN / PRIORITY ORDER / FILTERED DESTINATIONS) ── */
        <div className="space-y-3.5">
          {visibleTargetsForCurrentTab.length === 0 ? (
            <div className="rounded-2xl bg-[#051026] border border-[#223868] p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-white">
                {activeFilterTab === "final_meeting_plan"
                  ? "No items have been selected for the Final Meeting Plan yet."
                  : "No items in this view right now."}
              </p>
              <p className="text-xs text-[#9BB7E0] max-w-md mx-auto">
                {activeFilterTab === "final_meeting_plan"
                  ? 'Switch to "All Plan Items" and click "Include in Final Meeting Plan" on the requests you and the parent want to bring into the meeting.'
                  : 'You can change any item\'s destination using its Destination selector or "+ Add Plan Item".'}
              </p>
              {activeFilterTab !== "all_active" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveFilterTab("all_active")}
                  className="mt-2 h-8 text-xs bg-[#142F63] text-[#FFE394] border border-[#DFBE77]/50 cursor-pointer"
                >
                  View All Plan Items ({activePlanTargets.length})
                </Button>
              )}
            </div>
          ) : (
            visibleTargetsForCurrentTab.map((target, idx) =>
              renderPlanItemCard(
                target,
                idx,
                visibleTargetsForCurrentTab.length
              )
            )
          )}
        </div>
      )}

      {/* 🧭 MEETING REMINDER (Compact Box at Bottom of Blueprint) */}
      <div className="rounded-xl bg-[#040D21] border border-[#223868] p-3 flex items-start gap-2.5">
        <span className="p-1 rounded-md bg-[#091D42] border border-[#2E4D88] text-[#FFE394] shrink-0 mt-0.5">
          <Compass className="h-3.5 w-3.5" />
        </span>
        <div className="space-y-0.5 text-xs flex-1 min-w-0">
          <span className="font-serif font-bold text-[#FFE394] uppercase tracking-wider text-[11px] block">
            Advocacy Plan Guidance
          </span>
          <p className="text-[#9BB7E0] leading-relaxed text-[11.5px]">
            Every meeting is different. Reviewing this Blueprint with the parent
            helps prioritize which requests belong in the{" "}
            <strong className="text-white">Final Meeting Plan</strong> now and
            which items should remain in planning, be set aside for a future
            discussion, or be recorded in{" "}
            <strong className="text-white">Parent Doesn&apos;t Want</strong>.
          </p>
        </div>
      </div>

      {/* Target Editor Dialog (Create or Full Edit) */}
      {editingTarget && (
        <Dialog
          open={Boolean(editingTarget)}
          onOpenChange={(open) => !open && setEditingTarget(null)}
        >
          <DialogContent className="max-w-3xl bg-[#05142B] border border-[#2C4880] text-[#FFF4D4] shadow-[0_16px_36px_rgba(0,0,0,0.9)] p-0 overflow-hidden">
            <div className="p-5 border-b border-[#223868] bg-[#020A17]">
              <DialogTitle className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <span className="text-[#FFE394]">🎯</span>
                <span>
                  {isNewTargetModal
                    ? "Add Plan Item to Blueprint"
                    : `Edit Plan Item: ${editingTarget.targetName}`}
                </span>
              </DialogTitle>
              <p className="text-xs text-[#9BB7E0] mt-1">
                Structure the parent-friendly explanation alongside your
                advocate strategy.
              </p>
            </div>

            <div className="p-5 max-h-[68vh] overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#FFE394] uppercase block mb-1">
                    Plan Item Title *
                  </label>
                  <Input
                    value={editingTarget.targetName}
                    onChange={(e) =>
                      setEditingTarget({
                        ...editingTarget,
                        targetName: e.target.value,
                      })
                    }
                    className="h-8 text-xs bg-[#051426] border-[#264378] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#FFE394] uppercase block mb-1">
                    IEP Section
                  </label>
                  <Input
                    value={editingTarget.iepSection}
                    onChange={(e) =>
                      setEditingTarget({
                        ...editingTarget,
                        iepSection: e.target.value,
                      })
                    }
                    className="h-8 text-xs bg-[#051426] border-[#264378] text-white"
                  />
                </div>
              </div>

              {/* Prominent "What to Say to the Parent" Read-Aloud Script inside Modal */}
              <div className="rounded-xl bg-[#091F46] border border-[#DFBE77]/65 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#FFE394]">
                    🗣️ What to Say to the Parent (Read-Aloud Script)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const suggested = generateWhatToSayToParentScript(
                        editingTarget,
                        { studentName }
                      );
                      setEditingTarget({
                        ...editingTarget,
                        whatToSayToParent: suggested,
                        whatToSayToParentEdited: false,
                      });
                    }}
                    className="text-[10.5px] font-semibold text-[#FFE394] hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Generate Suggested Script</span>
                  </button>
                </div>
                <p className="text-[10.5px] text-[#B8D0F4]">
                  Short, natural script an employee can read aloud when
                  reviewing this item with the parent—kept separate from the
                  formal meeting request, technical analysis, and parent
                  feedback.
                </p>
                <Textarea
                  value={getEffectiveWhatToSayToParentScript(
                    editingTarget,
                    studentName
                  )}
                  onChange={(e) =>
                    setEditingTarget(
                      updateWhatToSayToParentManualEdit(
                        editingTarget,
                        e.target.value
                      )
                    )
                  }
                  rows={3}
                  className="text-xs bg-[#030B1A] border-[#355696] text-[#FFF8EB]"
                />
              </div>

              {/* Four Parent-Friendly Sections inside Modal */}
              <div className="rounded-xl bg-[#071836] border border-[#2C4C87] p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-[#FFE394] font-bold text-xs uppercase">
                  <User className="h-4 w-4" />
                  <span>
                    Parent-Friendly Advocacy Plan (Reviewed with Parent)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10.5px] font-semibold text-blue-200 block mb-1">
                      1. What we found
                    </label>
                    <Textarea
                      value={editingTarget.parentWhatWeFound || ""}
                      onChange={(e) =>
                        setEditingTarget({
                          ...editingTarget,
                          parentWhatWeFound: e.target.value,
                        })
                      }
                      rows={2}
                      className="text-xs bg-[#040E22] border-[#264378] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-blue-200 block mb-1">
                      2. Why it matters
                    </label>
                    <Textarea
                      value={editingTarget.parentWhyWeWantIt}
                      onChange={(e) =>
                        setEditingTarget({
                          ...editingTarget,
                          parentWhyWeWantIt: e.target.value,
                          whyWeWantIt: e.target.value,
                        })
                      }
                      rows={2}
                      className="text-xs bg-[#040E22] border-[#264378] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-blue-200 block mb-1">
                      3. What we want to ask for
                    </label>
                    <Textarea
                      value={editingTarget.parentWhatWeWant}
                      onChange={(e) =>
                        setEditingTarget({
                          ...editingTarget,
                          parentWhatWeWant: e.target.value,
                          quickAdvocateSayThis: e.target.value,
                        })
                      }
                      rows={2}
                      className="text-xs bg-[#040E22] border-[#264378] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-blue-200 block mb-1">
                      4. Your input (Parent perspective)
                    </label>
                    <Textarea
                      value={editingTarget.parentInput || ""}
                      onChange={(e) =>
                        setEditingTarget({
                          ...editingTarget,
                          parentInput: e.target.value,
                        })
                      }
                      rows={2}
                      className="text-xs bg-[#040E22] border-[#264378] text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">
                    Put It Here / Exact IEP Location
                  </label>
                  <Input
                    value={editingTarget.putItHereLocation}
                    onChange={(e) =>
                      setEditingTarget({
                        ...editingTarget,
                        putItHereLocation: e.target.value,
                      })
                    }
                    className="h-8 text-xs bg-[#051426] border-[#264378] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">
                    Supporting Evidence
                  </label>
                  <Input
                    value={editingTarget.supportingEvidence}
                    onChange={(e) =>
                      setEditingTarget({
                        ...editingTarget,
                        supportingEvidence: e.target.value,
                        parentSupportingEvidence: e.target.value,
                      })
                    }
                    className="h-8 text-xs bg-[#051426] border-[#264378] text-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-[#223868] bg-[#020A17] flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingTarget(null)}
                className="text-xs text-[#9BB7E0] hover:text-white cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                data-testid="save-plan-item-modal-btn"
                onClick={handleSaveTargetEdit}
                className="text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 cursor-pointer"
              >
                Save Plan Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Combine Items Modal */}
      <CombineBlueprintItemsModal
        isOpen={Boolean(combineTarget)}
        onClose={() => setCombineTarget(null)}
        primaryTarget={combineTarget}
        availableTargets={targets}
        availableFindings={findings}
        onConfirmCombine={handleConfirmCombine}
      />

      {/* Reorganize Meeting Modal */}
      <ReorganizeMeetingModal
        open={showReorganizeModal}
        onOpenChange={setShowReorganizeModal}
        detectedOrder={detectedOrder}
        targets={targets}
        onSaveOrder={handleReorganizeSave}
      />

      {/* Delete Target Confirmation Modal */}
      <DeleteTargetModal
        isOpen={!!targetToDelete}
        onClose={() => setTargetToDelete(null)}
        target={targetToDelete}
        onConfirmDelete={handleConfirmDelete}
        onWithdrawPreserveHistory={onWithdrawTargetPreserveHistory}
        onDeleteConnectedFindingEverywhere={onDeleteConnectedFindingEverywhere}
      />

      {/* Parent-Friendly Preview Modal */}
      <ParentFriendlyPreviewModal
        isOpen={showParentPreviewModal}
        onClose={() => setShowParentPreviewModal(false)}
        studentName={studentName}
        meetingType={meetingType}
        meetingDate={meetingDate}
        targets={
          finalMeetingPlanTargets.length > 0
            ? finalMeetingPlanTargets
            : activePlanTargets
        }
        clientEmail={clientEmail}
      />

      {/* Email Blueprint to Parent Modal */}
      <EmailBlueprintModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        studentName={studentName}
        meetingType={meetingType}
        meetingDate={meetingDate}
        targets={
          finalMeetingPlanTargets.length > 0
            ? finalMeetingPlanTargets
            : activePlanTargets
        }
        clientEmail={clientEmail}
      />
    </div>
  );
}

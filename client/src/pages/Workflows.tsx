import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import PageIdBadge from "@/components/PageIdBadge";
import ScopedErrorBoundary from "@/components/ScopedErrorBoundary";
import {
  getStoredEmployees,
  checkEmployeeModuleAccess,
  hydrateEmployeesFromBackend,
  type BackendStaffAccessProfile,
} from "@/components/team/teamStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import VoiceInput from "@/components/VoiceInput";
import VoiceTextarea from "@/components/VoiceTextarea";
import {
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  Lock,
  Route,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PROJECT_TYPES,
  buildWorkflowDocumentFromPipelineStages,
  parseWorkflowCanvasData,
  resolveWorkspaceHref,
  serializeWorkflowDocument,
  syncStagesFromTraditional,
  syncTraditionalFromStages,
  type MonorailCosmeticPiece,
  type MonorailVisualPrefs,
  type TraditionalFlowEdge,
  type TraditionalFlowNode,
  type WorkflowApprovalGate,
  type WorkflowDocumentV2,
  type WorkflowExperienceMode,
  type WorkflowStageDefinition,
  type WorkflowViewMode,
} from "@shared/workflowModel";
import {
  WorkflowExperienceModeToggle,
  WorkflowViewModeSlider,
} from "@/components/workflows/ViewModeSlider";
import {
  MonorailCanvas,
  type ConnectedCaseSummary,
} from "@/components/workflows/MonorailCanvas";
import { TraditionalFlowCanvas } from "@/components/workflows/TraditionalFlowCanvas";
import {
  StationGuideAndInspectDrawer,
  type ActiveDrawerState,
} from "@/components/workflows/StationGuideAndInspectDrawer";
import { WorkflowRouteEditorDrawer } from "@/components/workflows/WorkflowRouteEditorDrawer";

const WORKFLOW_COLORS = [
  "#C9A55A",
  "#3b82f6",
  "#6366f1",
  "#10b981",
  "#8b5cf6",
  "#14b8a6",
  "#ec4899",
  "#ef4444",
  "#64748b",
];

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

const EMPTY_DOC: WorkflowDocumentV2 = {
  schemaVersion: 2,
  definitionVersion: 1,
  nodes: [],
  edges: [],
  stages: [],
  transitions: [],
  approvalGates: [],
  monorailLayout: {},
  meta: { projectTypes: DEFAULT_PROJECT_TYPES },
};

export default function Workflows() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const rawInitialId = searchParams.get("id")
    ? parseInt(searchParams.get("id")!, 10)
    : null;
  const initialWorkflowId =
    rawInitialId !== null && Number.isFinite(rawInitialId) ? rawInitialId : null;
  const urlViewOverride = searchParams.get("view") as WorkflowViewMode | null;

  // Authoritative permissions (mirrors DashboardLayout pattern)
  const { data: myStaffAccess } = trpc.team.getMyStaffAccess.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
  });

  const currentEmployee = useMemo(() => {
    const employees = getStoredEmployees();
    if (myStaffAccess && (myStaffAccess.isStaff || myStaffAccess.employeeId)) {
      const hydrated = hydrateEmployeesFromBackend(
        [myStaffAccess as BackendStaffAccessProfile],
        employees
      );
      if (hydrated.length > 0) return hydrated[0];
    }
    return (
      employees.find(
        (e) =>
          (user?.email && e.email.toLowerCase() === user.email.toLowerCase()) ||
          (user?.name && e.name.toLowerCase() === user.name.toLowerCase())
      ) || null
    );
  }, [myStaffAccess, user?.email, user?.name]);

  const isDirectAdmin =
    Boolean(myStaffAccess?.hasAdminAccess) ||
    user?.role === "admin" ||
    Boolean(user?.email?.toLowerCase().includes("byron@waypointadvocates.com"));
  const accessLevel = isDirectAdmin
    ? "edit"
    : currentEmployee
    ? checkEmployeeModuleAccess(currentEmployee, "workflows")
    : "none";
  const hasAccess = isDirectAdmin || accessLevel !== "none";
  const canEdit = isDirectAdmin || accessLevel === "edit";

  // ── Per-User View Preference (Traditional | Monorail) — defaults to Traditional ──
  const viewPrefStorageKey = `waypoint_workflow_designer_view_${user?.id || "default"}`;
  const [viewMode, setViewMode] = useState<WorkflowViewMode>(() => {
    if (urlViewOverride === "monorail" || urlViewOverride === "traditional") {
      return urlViewOverride;
    }
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(
        `waypoint_workflow_designer_view_${user?.id || "default"}`
      );
      if (stored === "monorail" || stored === "traditional") return stored;
    }
    return "traditional";
  });

  // Re-read per-user preference once user.id resolves if no URL override
  useEffect(() => {
    if (urlViewOverride === "monorail" || urlViewOverride === "traditional") return;
    if (typeof window === "undefined" || !user?.id) return;
    const stored = window.localStorage.getItem(viewPrefStorageKey);
    if (stored === "monorail" || stored === "traditional") {
      setViewMode(stored);
    }
  }, [viewPrefStorageKey, urlViewOverride, user?.id]);

  const handleViewModeChange = (next: WorkflowViewMode) => {
    // Never triggers automations or resets unsaved state — strictly switches presentation!
    setViewMode(next);
    try {
      window.localStorage.setItem(viewPrefStorageKey, next);
    } catch {}
  };

  // ── Shared Contextual Filters & Workspace State (Preserved across view switches!) ──
  const [selectedId, setSelectedId] = useState<number | null>(initialWorkflowId);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("all");
  const [experienceMode, setExperienceMode] = useState<WorkflowExperienceMode>(() =>
    canEdit ? "designer" : "employee_preview"
  );
  const [editRoutesMode, setEditRoutesMode] = useState<boolean>(false);

  // Selected real cases in Employee Preview (1 selected case by default; up to 3 explicitly chosen)
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([]);

  // Active right-side drawers (Guide Me / Approval Gate / Automation / Case Train / Route Editor)
  const [inspectDrawer, setInspectDrawer] = useState<ActiveDrawerState>({ kind: "none" });
  const [routeEditor, setRouteEditor] = useState<{
    open: boolean;
    stageId: string | null;
    tab: "stage" | "steps" | "gates" | "automations";
  }>({ open: false, stageId: null, tab: "stage" });

  // Queries
  const {
    data: workflows = [],
    isLoading: isLoadingList,
    error: listError,
    refetch: refetchList,
  } = trpc.workflows.list.useQuery(undefined, { enabled: hasAccess });

  const {
    data: selectedWorkflow,
    isLoading: isLoadingDetail,
    error: detailError,
  } = trpc.workflows.get.useQuery(
    { id: selectedId! },
    { enabled: hasAccess && selectedId !== null }
  );

  const { data: contextData, refetch: refetchContext } =
    trpc.workflows.getContextData.useQuery(undefined, {
      enabled: hasAccess,
      refetchOnWindowFocus: false,
      staleTime: 60000,
    });

  // Select first workflow automatically when loaded
  useEffect(() => {
    if (selectedId === null && workflows.length > 0 && !initialWorkflowId) {
      setSelectedId(workflows[0].id);
    }
  }, [selectedId, workflows, initialWorkflowId]);

  // Select first real case automatically when entering Employee View if none chosen yet
  const availableCases: ConnectedCaseSummary[] = contextData?.cases || [];
  useEffect(() => {
    if (
      experienceMode === "employee_preview" &&
      selectedCaseIds.length === 0 &&
      availableCases.length > 0
    ) {
      setSelectedCaseIds([availableCases[0].contactId]);
    }
  }, [experienceMode, selectedCaseIds.length, availableCases]);

  const selectedCases = useMemo(
    () => availableCases.filter((c) => selectedCaseIds.includes(c.contactId)),
    [availableCases, selectedCaseIds]
  );
  const primaryCase = selectedCases[0] || null;

  // Load saved case progress (strictly separate from reusable workflow definition!)
  const { data: caseProgress, refetch: refetchCaseProgress } =
    trpc.workflows.getCaseProgress.useQuery(
      {
        workflowId: selectedId || 0,
        contactId: primaryCase?.contactId || 0,
      },
      {
        enabled:
          hasAccess &&
          experienceMode === "employee_preview" &&
          Boolean(selectedId && primaryCase?.contactId),
      }
    );

  // Load case-level automation run failures only in connected case view
  const { data: caseAutoRuns = [] } = trpc.automations.listRuns.useQuery(
    { contactId: primaryCase?.contactId || undefined, limit: 50 },
    {
      enabled:
        hasAccess &&
        experienceMode === "employee_preview" &&
        Boolean(primaryCase?.contactId),
    }
  );

  const caseAutomationFailures = useMemo(() => {
    const map: Record<number, number> = {};
    for (const run of caseAutoRuns as any[]) {
      if (run.status === "failed" && run.automationId) {
        map[run.automationId] = (map[run.automationId] || 0) + 1;
      }
    }
    return map;
  }, [caseAutoRuns]);

  const completedStepIds = useMemo(() => {
    const set = new Set<string>();
    if (experienceMode === "employee_preview" && caseProgress?.steps) {
      for (const s of caseProgress.steps) {
        if (s.completed) set.add(s.stepId);
      }
    }
    return set;
  }, [experienceMode, caseProgress]);

  const gateStatusMap = useMemo(() => {
    const map: Record<string, "pending" | "approved" | "rejected"> = {};
    if (experienceMode === "employee_preview" && caseProgress?.gates) {
      for (const g of caseProgress.gates) {
        map[g.gateId] = g.status;
      }
    }
    return map;
  }, [experienceMode, caseProgress]);

  const gateRecordMap = useMemo(() => {
    const map: Record<string, any> = {};
    if (experienceMode === "employee_preview" && caseProgress?.gates) {
      for (const g of caseProgress.gates) {
        map[g.gateId] = g;
      }
    }
    return map;
  }, [experienceMode, caseProgress]);

  // ── Shared Unified Workflow Document State (ONE workflow, TWO views) ──
  const [workflowDoc, setWorkflowDoc] = useState<WorkflowDocumentV2>(EMPTY_DOC);
  const [historyPast, setHistoryPast] = useState<WorkflowDocumentV2[]>([]);
  const [historyFuture, setHistoryFuture] = useState<WorkflowDocumentV2[]>([]);
  const lastDragHistoryTsRef = useRef<number>(0);
  const [hydratedWorkflowId, setHydratedWorkflowId] = useState<number | null>(null);
  const [traditionalSyncRev, setTraditionalSyncRev] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;
  const loadedWorkflowKeyRef = useRef<string>("");

  // Hydrate workflow document ONLY when switching workflows (never clobber unsaved edits on view switch!)
  useEffect(() => {
    if (!selectedWorkflow) return;
    const key = `${selectedWorkflow.id}:${selectedWorkflow.updatedAt || ""}`;
    if (loadedWorkflowKeyRef.current === key && saveStatus !== "saved") {
      return;
    }
    const parsed = parseWorkflowCanvasData(selectedWorkflow.canvasData);
    setWorkflowDoc(parsed);
    setHistoryPast([]);
    setHistoryFuture([]);
    setHydratedWorkflowId(selectedWorkflow.id);
    setTraditionalSyncRev((r) => r + 1);
    setSaveStatus("saved");
    loadedWorkflowKeyRef.current = key;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  }, [selectedWorkflow?.id, selectedWorkflow?.canvasData]);

  // Unsaved-changes browser protection (Rule 2 & 21)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved" || saveStatus === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  // Mutations
  const saveCanvasMutation = trpc.workflows.saveCanvas.useMutation({
    onSuccess: () => {
      if (selectedIdRef.current) {
        utils.workflows.get.invalidate({ id: selectedIdRef.current });
      }
      setSaveStatus("saved");
    },
    onError: (err) => {
      setSaveStatus("error");
      toast.error(err.message || "Failed to save workflow changes. Click Save to retry.");
    },
  });

  const scheduleAutosave = useCallback(
    (nextDoc: WorkflowDocumentV2) => {
      if (!canEdit || !selectedIdRef.current) return;
      setSaveStatus("unsaved");
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        if (!selectedIdRef.current) return;
        setSaveStatus("saving");
        saveCanvasMutation.mutate({
          id: selectedIdRef.current,
          canvasData: serializeWorkflowDocument(nextDoc),
        });
      }, 1400);
    },
    [canEdit, saveCanvasMutation]
  );

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const handleManualSave = () => {
    if (!canEdit || !selectedId) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setSaveStatus("saving");
    const bumpedDoc: WorkflowDocumentV2 = {
      ...workflowDoc,
      definitionVersion: (workflowDoc.definitionVersion || 1) + 1,
    };
    setWorkflowDoc(bumpedDoc);
    saveCanvasMutation.mutate({
      id: selectedId,
      canvasData: serializeWorkflowDocument(bumpedDoc),
    });
  };

  // Canonical document mutation helper (syncs Traditional nodes/edges whenever Monorail stages/gates change)
  const commitMonorailDocEdit = useCallback(
    (
      updater: (prev: WorkflowDocumentV2) => WorkflowDocumentV2,
      syncNodes = true,
      coalesceHistory = false
    ) => {
      setWorkflowDoc((prev) => {
        let next = updater(prev);
        if (syncNodes) {
          const synced = syncTraditionalFromStages(
            next.stages,
            next.approvalGates,
            next.nodes,
            next.edges
          );
          next = { ...next, nodes: synced.nodes, edges: synced.edges };
        }
        const now = Date.now();
        if (!coalesceHistory || now - lastDragHistoryTsRef.current > 650) {
          setHistoryPast((h) => [...h.slice(-29), prev]);
          setHistoryFuture([]);
          lastDragHistoryTsRef.current = now;
        }
        scheduleAutosave(next);
        return next;
      });
      if (syncNodes) setTraditionalSyncRev((r) => r + 1);
    },
    [scheduleAutosave]
  );

  const handleUndo = useCallback(() => {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const previous = past[past.length - 1];
      setWorkflowDoc((curr) => {
        setHistoryFuture((f) => [curr, ...f.slice(0, 29)]);
        scheduleAutosave(previous);
        return previous;
      });
      setTraditionalSyncRev((r) => r + 1);
      return past.slice(0, -1);
    });
  }, [scheduleAutosave]);

  const handleRedo = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;
      const nextDoc = future[0];
      setWorkflowDoc((curr) => {
        setHistoryPast((p) => [...p.slice(-29), curr]);
        scheduleAutosave(nextDoc);
        return nextDoc;
      });
      setTraditionalSyncRev((r) => r + 1);
      return future.slice(1);
    });
  }, [scheduleAutosave]);

  // Sync edits made in Traditional back into Monorail stages/gates
  const handleSyncFromTraditional = useCallback(
    (nextNodes: TraditionalFlowNode[], nextEdges: TraditionalFlowEdge[]) => {
      setWorkflowDoc((prev) => {
        const next = syncStagesFromTraditional(prev, nextNodes, nextEdges);
        scheduleAutosave(next);
        return next;
      });
    },
    [scheduleAutosave]
  );

  // CRUD Mutations for Workflow Metadata
  const [wfDialog, setWfDialog] = useState(false);
  const [editingWfId, setEditingWfId] = useState<number | null>(null);
  const [wfForm, setWfForm] = useState({
    title: "",
    description: "",
    category: "",
    color: "#C9A55A",
  });

  const createMutation = trpc.workflows.create.useMutation({
    onSuccess: (data) => {
      utils.workflows.list.invalidate();
      toast.success("Workflow created");
      setWfDialog(false);
      setSelectedId(data.id);
    },
    onError: (err) => toast.error(err.message || "Failed to create workflow"),
  });

  const createFromPipelineMutation = trpc.workflows.createFromPipeline.useMutation({
    onSuccess: (data) => {
      utils.workflows.list.invalidate();
      toast.success("Workflow created from Waypoint's live pipeline stages");
      setSelectedId(data.id);
    },
    onError: (err) => toast.error(err.message || "Failed to create workflow from pipeline"),
  });

  const updateMutation = trpc.workflows.update.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      if (selectedId) utils.workflows.get.invalidate({ id: selectedId });
      toast.success("Workflow updated");
      setWfDialog(false);
    },
    onError: (err) => toast.error(err.message || "Failed to update workflow"),
  });

  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      setSelectedId(null);
      setSelectedStageId(null);
      setInspectDrawer({ kind: "none" });
      setRouteEditor({ open: false, stageId: null, tab: "stage" });
      toast.success("Workflow deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete workflow"),
  });

  // Case Progress & Approval Gate Mutations (Strictly in Employee Preview with a real selected case!)
  const toggleGuideStepMutation = trpc.workflows.toggleCaseGuideStep.useMutation({
    onSuccess: () => {
      refetchCaseProgress();
      toast.success("Guide step progress saved.");
    },
    onError: (err) => toast.error(err.message || "Failed to update step."),
  });

  const submitGateApprovalMutation = trpc.workflows.submitGateApproval.useMutation({
    onSuccess: () => {
      refetchCaseProgress();
      toast.success("Approval gate status updated.");
    },
    onError: (err) => toast.error(err.message || "Approval gate check failed."),
  });

  const advanceCaseStageMutation = trpc.workflows.advanceCaseStage.useMutation({
    onSuccess: (res) => {
      refetchCaseProgress();
      refetchContext();
      toast.success(`Case advanced to ${res.stageResult?.stage || "next stage"}!`);
    },
    onError: (err) => toast.error(err.message || "Transition blocked by approval gate."),
  });

  // Stage Editing Handlers (Designer Mode)
  const handleAddStage = (afterStageId?: string | null) => {
    const newId = `stage-${Date.now()}`;
    commitMonorailDocEdit((prev) => {
      const ordered = [...prev.stages].sort((a, b) => a.order - b.order);
      const insertAfterIdx = afterStageId
        ? ordered.findIndex((s) => s.id === afterStageId)
        : ordered.length - 1;
      const newStage: WorkflowStageDefinition = {
        id: newId,
        name: `New Stage ${ordered.length + 1}`,
        order: ordered.length + 1,
        description: "",
        icon: "layers",
        accentColor: "#C9A55A",
        assignedRole: "Assigned Advocate",
        workspaceLinkType: "student_dossier",
        guideSteps: [],
        automations: [],
        applicablePlans: [],
        applicableProjectTypes: [],
      };
      const nextStages = [...ordered];
      if (insertAfterIdx >= 0 && insertAfterIdx < ordered.length - 1) {
        nextStages.splice(insertAfterIdx + 1, 0, newStage);
      } else {
        nextStages.push(newStage);
      }
      const reindexed = nextStages.map((s, idx) => ({ ...s, order: idx + 1 }));
      return { ...prev, stages: reindexed };
    });
    setSelectedStageId(newId);
    setInspectDrawer({ kind: "none" });
    setRouteEditor({ open: true, stageId: newId, tab: "stage" });
  };

  const handleQuickAddGuideStep = (stageId: string) => {
    commitMonorailDocEdit((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => {
        if (s.id !== stageId) return s;
        const nextOrder = s.guideSteps.length + 1;
        return {
          ...s,
          guideSteps: [
            ...s.guideSteps,
            {
              id: `${stageId}-gs-${Date.now()}`,
              title: `Guide Step ${nextOrder}`,
              shortExplanation: "Define the employee action for this station.",
              detailedInstructions: "Update instructions in the Route Editor.",
              assignedRole: s.assignedRole || "Assigned Advocate",
              required: true,
              workspaceLinkType: s.workspaceLinkType || "student_dossier",
              order: nextOrder,
            },
          ],
        };
      }),
    }));
    setSelectedStageId(stageId);
    setInspectDrawer({ kind: "none" });
    setRouteEditor({ open: true, stageId, tab: "steps" });
  };

  const handleQuickAddAutomation = (stageId: string) => {
    commitMonorailDocEdit((prev) => {
      const existingExpanded = prev.monorailVisualPrefs?.expandedAutomationStageIds || [];
      return {
        ...prev,
        monorailVisualPrefs: {
          ...(prev.monorailVisualPrefs || {}),
          expandedAutomationStageIds: existingExpanded.includes(stageId)
            ? existingExpanded
            : [...existingExpanded, stageId],
        },
        stages: prev.stages.map((s) => {
          if (s.id !== stageId) return s;
          return {
            ...s,
            automations: [
              ...s.automations,
              {
                id: `${stageId}-auto-${Date.now()}`,
                automationId: null,
                title: "Create follow-up task",
                triggerLabel: "Stage entered",
                triggerEvent: "stage_changed",
                conditionSummary: `Stage equals "${s.name}"`,
                actionType: "task",
                actionSummary: "Create internal checklist task for assigned advocate",
                requiresApproval: false,
                enabled: true,
                communicationMode: "internal_only",
              },
            ],
          };
        }),
      };
    });
    setSelectedStageId(stageId);
    setInspectDrawer({ kind: "none" });
    setRouteEditor({ open: true, stageId, tab: "automations" });
  };

  const handleQuickAddApprovalGate = (fromStageId: string, toStageId: string) => {
    const existing = workflowDoc.approvalGates.find(
      (g) => g.fromStageId === fromStageId && g.toStageId === toStageId
    );
    if (existing) {
      toast.info(`Approval gate "${existing.title}" is already on this transition.`);
      setRouteEditor({ open: true, stageId: fromStageId, tab: "gates" });
      return;
    }
    const fromStage = workflowDoc.stages.find((s) => s.id === fromStageId);
    const toStage = workflowDoc.stages.find((s) => s.id === toStageId);
    commitMonorailDocEdit((prev) => ({
      ...prev,
      approvalGates: [
        ...prev.approvalGates,
        {
          id: `gate-${Date.now()}`,
          title: "Advocate approval",
          description: `Lead Special Education Advocate must approve moving from ${fromStage?.name || "this stage"} to ${toStage?.name || "the next stage"}.`,
          fromStageId,
          toStageId,
          requiredRole: "Lead Special Education Advocate",
          requiredStepIds: (fromStage?.guideSteps || [])
            .filter((gs) => gs.required)
            .map((gs) => gs.id),
          enabled: true,
        },
      ],
    }));
    setSelectedStageId(fromStageId);
    setInspectDrawer({ kind: "none" });
    setRouteEditor({ open: true, stageId: fromStageId, tab: "gates" });
  };

  const handleUseStarterWorkflow = (starterDoc: WorkflowDocumentV2) => {
    commitMonorailDocEdit(() => starterDoc, true);
    setSelectedStageId(starterDoc.stages[3]?.id || starterDoc.stages[0]?.id || null);
    toast.success("Starter monorail route applied to this workflow.");
  };

  const handleReorderStage = (stageId: string, direction: "earlier" | "later") => {
    commitMonorailDocEdit((prev) => {
      const ordered = [...prev.stages].sort((a, b) => a.order - b.order);
      const idx = ordered.findIndex((s) => s.id === stageId);
      if (idx < 0) return prev;
      const swapIdx = direction === "earlier" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= ordered.length) return prev;
      const tmp = ordered[idx];
      ordered[idx] = ordered[swapIdx];
      ordered[swapIdx] = tmp;
      const reindexed = ordered.map((s, i) => ({ ...s, order: i + 1 }));
      return { ...prev, stages: reindexed };
    });
  };

  const handleDeleteStage = (stageId: string) => {
    commitMonorailDocEdit((prev) => {
      const remaining = prev.stages
        .filter((s) => s.id !== stageId)
        .sort((a, b) => a.order - b.order)
        .map((s, i) => ({ ...s, order: i + 1 }));
      const remainingGates = prev.approvalGates.filter(
        (g) => g.fromStageId !== stageId && g.toStageId !== stageId
      );
      const nextLayout = { ...prev.monorailLayout };
      delete nextLayout[stageId];
      return {
        ...prev,
        stages: remaining,
        approvalGates: remainingGates,
        monorailLayout: nextLayout,
      };
    });
    if (selectedStageId === stageId) setSelectedStageId(null);
  };

  const handleSyncWithRealPipeline = () => {
    const pipelineStages = contextData?.pipelineStages || [];
    if (pipelineStages.length === 0) {
      toast.error("No configured pipeline stages found.");
      return;
    }
    const hydrated = buildWorkflowDocumentFromPipelineStages(pipelineStages, {
      includeOpportunity: true,
    });
    setWorkflowDoc(hydrated);
    setTraditionalSyncRev((r) => r + 1);
    scheduleAutosave(hydrated);
    toast.success(`Synced ${hydrated.stages.length} real Waypoint pipeline stages into this workflow.`);
  };

  const selectedWfMeta = workflows.find((w) => w.id === selectedId) || null;
  const plans = contextData?.plans || [];
  const templates = contextData?.templates || [];
  const realAutomations = contextData?.automations || [];

  const handleSelectWorkflow = (nextId: number) => {
    if (
      saveStatus === "unsaved" &&
      !window.confirm("You have unsaved workflow changes. Switch workflow anyway?")
    ) {
      return;
    }
    setSelectedId(nextId);
    setSelectedStageId(null);
    setInspectDrawer({ kind: "none" });
    setRouteEditor({ open: false, stageId: null, tab: "stage" });
  };

  // Unauthorized access screen (matches existing security contract)
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#000820] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#06122E] border border-[#C9A55A]/45 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-[#0D1F45] border border-[#C9A55A]/45 flex items-center justify-center mx-auto text-[#E5C784]">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#FFF4D4]">
              Restricted Access · Permission Required
            </h2>
            <p className="text-xs text-[#A5B8D4] leading-relaxed">
              Workflow Designer is restricted to authorized management and staff granted workflow access in Team Management.
            </p>
          </div>
          <Button
            onClick={() => setLocation("/")}
            className="w-full bg-gradient-to-r from-[#DFC07C] to-[#9E7C3A] text-[#061028] font-bold text-xs h-9 rounded-xl cursor-pointer"
          >
            Return to Crew Quarters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScopedErrorBoundary moduleName="Workflow Designer">
      <div
        data-testid="workflow-designer-page"
        className="flex flex-col h-full flex-1 min-h-0 w-full max-w-full overflow-hidden bg-[#000820] text-[#EFF4FF]"
      >
        {/* ── COMPACT HEADER: Title, Selected Workflow, Traditional | Monorail Slider, Save Status ── */}
        <header className="px-4 sm:px-5 py-2.5 border-b border-[#16284F] bg-[#020A21]/95 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
          {/* Left: Title + Subtitle + Page ID */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-lg sm:text-xl font-bold tracking-tight text-[#FFF8E6] leading-none"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Workflow Designer
                </h1>
                <PageIdBadge id="PG-015" name="Workflow Designer" />
                {selectedWfMeta && (
                  <span className="text-xs text-[#A5B8D4] truncate max-w-[200px] hidden xl:inline">
                    · {selectedWfMeta.title}
                  </span>
                )}
              </div>
              <p className="text-[11px] italic text-[#93A8C8] mt-0.5 hidden sm:block">
                {viewMode === "monorail"
                  ? "Every step has a destination."
                  : "Visual workflow canvas synchronized with Monorail."}
              </p>
            </div>
          </div>

          {/* Center: Tactile Two-Position Segmented Slider (Traditional | Monorail) */}
          <WorkflowViewModeSlider value={viewMode} onChange={handleViewModeChange} />

          {/* Right: Save Status + Save / Edit / New Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Save Status Indicator */}
            <div data-testid="workflow-save-status" className="flex items-center">
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1 text-xs text-[#93C5FD] px-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 px-2">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                </span>
              )}
              {(saveStatus === "unsaved" || saveStatus === "error") && (
                <button
                  type="button"
                  onClick={handleManualSave}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#241B0A] border border-[#E5C784]/70 text-[#FFE5A3] hover:bg-[#33250D] text-xs font-semibold cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saveStatus === "error" ? "Retry Save" : "Save"}</span>
                </button>
              )}
            </div>

            {canEdit && viewMode === "monorail" && experienceMode === "designer" && selectedId && (
              <button
                type="button"
                data-testid="workflow-edit-routes-btn"
                onClick={() => setEditRoutesMode((v) => !v)}
                className={cn(
                  "h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer transition-all",
                  editRoutesMode
                    ? "bg-[#152D5E] border-[#E5C784] text-[#FFF4D4] shadow-[0_0_12px_rgba(229,199,132,0.22)]"
                    : "bg-[#06122E] border-[#243B64] text-[#DCE6F5] hover:border-[#C9A55A]/60"
                )}
              >
                <Route className="w-3.5 h-3.5" />
                <span>{editRoutesMode ? "Done editing" : "Edit routes"}</span>
              </button>
            )}

            <WorkflowExperienceModeToggle
              value={experienceMode}
              onChange={(m) => {
                setExperienceMode(m);
                if (m === "employee_preview") {
                  setEditRoutesMode(false);
                  setRouteEditor({ open: false, stageId: null, tab: "stage" });
                }
              }}
              canEdit={canEdit}
            />
          </div>
        </header>

        {/* ── COMPACT CONTEXTUAL CONTROLS ROW (Workflow, Plan, Project Type, Case Selector) ── */}
        <div className="px-4 sm:px-5 py-2 border-b border-[#142547] bg-[#030C24]/90 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex flex-wrap items-center gap-2">
            {/* Workflow Selector */}
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Select workflow"
                data-testid="workflow-selector"
                value={selectedId ?? ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val)) handleSelectWorkflow(val);
                }}
                className="h-7.5 rounded-lg bg-[#071530] border border-[#243B64] hover:border-[#C9A55A]/60 px-2.5 text-xs text-white font-medium max-w-[210px] focus:outline-none focus:border-[#E5C784]"
              >
                {workflows.length === 0 && <option value="">No workflows</option>}
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>

              {canEdit && (
                <>
                  <button
                    type="button"
                    title="Create new workflow"
                    data-testid="workflow-new-btn"
                    onClick={() => {
                      setEditingWfId(null);
                      setWfForm({ title: "", description: "", category: "", color: "#C9A55A" });
                      setWfDialog(true);
                    }}
                    className="h-7.5 px-2 rounded-lg bg-[#071530] hover:bg-[#102552] border border-[#243B64] text-[#E5C784] text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">New</span>
                  </button>
                  {selectedWfMeta && (
                    <>
                      <button
                        type="button"
                        title="Edit workflow metadata"
                        onClick={() => {
                          setEditingWfId(selectedWfMeta.id);
                          setWfForm({
                            title: selectedWfMeta.title,
                            description: selectedWfMeta.description ?? "",
                            category: selectedWfMeta.category ?? "",
                            color: selectedWfMeta.color ?? "#C9A55A",
                          });
                          setWfDialog(true);
                        }}
                        className="h-7.5 w-7.5 rounded-lg bg-[#071530] hover:bg-[#102552] border border-[#243B64] text-[#C8D7EC] inline-flex items-center justify-center cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete workflow"
                        onClick={() => {
                          if (window.confirm(`Delete workflow "${selectedWfMeta.title}"?`)) {
                            deleteMutation.mutate({ id: selectedWfMeta.id });
                          }
                        }}
                        className="h-7.5 w-7.5 rounded-lg bg-[#071530] hover:bg-rose-950/60 border border-[#243B64] text-rose-300 inline-flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <span className="h-4 w-[1px] bg-[#1E335C] hidden sm:block" />

            {/* Plan Scope Filter (Reads real configured plans; preview-only, never alters client subscriptions!) */}
            <select
              aria-label="Filter by plan"
              data-testid="workflow-plan-filter"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-7.5 rounded-lg bg-[#071530] border border-[#243B64] hover:border-[#C9A55A]/60 px-2.5 text-xs text-[#DCE6F5] focus:outline-none focus:border-[#E5C784]"
            >
              <option value="all">All Plans</option>
              {plans.map((p) => (
                <option key={p.key} value={p.key}>
                  Plan: {p.name}
                </option>
              ))}
            </select>

            {/* Project Type Filter */}
            <select
              aria-label="Filter by project type"
              data-testid="workflow-project-filter"
              value={projectTypeFilter}
              onChange={(e) => setProjectTypeFilter(e.target.value)}
              className="h-7.5 rounded-lg bg-[#071530] border border-[#243B64] hover:border-[#C9A55A]/60 px-2.5 text-xs text-[#DCE6F5] focus:outline-none focus:border-[#E5C784]"
            >
              <option value="all">All Project Types</option>
              {DEFAULT_PROJECT_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>

          {/* Right Contextual Slot: Case Picker in Employee View OR Pipeline Sync in Designer Mode */}
          <div className="flex items-center gap-2">
            {experienceMode === "employee_preview" ? (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#93C5FD]" />
                <select
                  aria-label="Select active case for train preview"
                  data-testid="workflow-case-selector"
                  value={primaryCase?.contactId ?? ""}
                  onChange={(e) => {
                    const cid = parseInt(e.target.value, 10);
                    if (!Number.isNaN(cid)) setSelectedCaseIds([cid]);
                    else setSelectedCaseIds([]);
                  }}
                  className="h-7.5 rounded-lg bg-[#081A3D] border border-[#60A5FA]/45 px-2.5 text-xs text-white max-w-[230px]"
                >
                  <option value="">No active case selected</option>
                  {availableCases.map((c) => (
                    <option key={c.contactId} value={c.contactId}>
                      {c.fullName} — {c.pipelineStage}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              canEdit &&
              selectedId && (
                <button
                  type="button"
                  data-testid="workflow-sync-pipeline-btn"
                  onClick={handleSyncWithRealPipeline}
                  title="Populate or sync stations from Waypoint's live Advocacy Pipeline stages"
                  className="h-7.5 px-2.5 rounded-lg bg-[#071530] hover:bg-[#102552] border border-[#243B64] hover:border-[#C9A55A]/60 text-[11.5px] text-[#E5C784] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync Pipeline Stages</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* ── MAIN WORKSPACE (Occupies full remaining height, zero overflow) ── */}
        <div className="relative flex-1 min-h-0 w-full overflow-hidden">
          {listError || detailError ? (
            <div className="w-full h-full flex items-center justify-center p-6">
              <div className="max-w-md w-full rounded-2xl bg-[#06122E] border border-rose-500/45 p-6 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                <h3 className="text-base font-semibold text-white">Unable to load workflow</h3>
                <p className="text-xs text-[#A5B8D4]">
                  {(listError || detailError)?.message || "A network or database error occurred."}
                </p>
                <Button
                  size="sm"
                  onClick={() => refetchList()}
                  className="bg-gradient-to-r from-[#DFC07C] to-[#9E7C3A] text-[#061028] font-bold cursor-pointer"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : isLoadingList || (selectedId !== null && (isLoadingDetail || hydratedWorkflowId !== selectedId)) ? (
            <div className="w-full h-full flex items-center justify-center bg-[#000820]">
              <div className="flex flex-col items-center gap-3 text-[#C8D7EC]">
                <Loader2 className="w-7 h-7 animate-spin text-[#E5C784]" />
                <span className="text-xs">Loading workflow…</span>
              </div>
            </div>
          ) : !selectedId || workflows.length === 0 ? (
            /* Empty state when zero workflows exist (Rule 21) */
            <div className="w-full h-full flex items-center justify-center p-6 bg-[#000820]">
              <div className="max-w-md w-full rounded-2xl bg-[#051029] border border-[#C9A55A]/45 p-7 text-center space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-[#0A1A3D] border border-[#C9A55A]/65 flex items-center justify-center mx-auto text-[#E5C784]">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h2
                    className="text-xl font-bold text-[#FFF4D4]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Create Your First Workflow
                  </h2>
                  <p className="text-xs text-[#A5B8D4] leading-relaxed">
                    Start directly from Waypoint&apos;s real configured Advocacy Pipeline stages, or build a custom workflow from scratch. Both Traditional and Monorail views stay automatically synchronized.
                  </p>
                </div>
                {canEdit && (
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
                    <button
                      type="button"
                      data-testid="workflow-create-from-pipeline-btn"
                      disabled={createFromPipelineMutation.isPending}
                      onClick={() =>
                        createFromPipelineMutation.mutate({
                          title: "Waypoint Advocacy Journey",
                          includeOpportunity: true,
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-gradient-to-b from-[#E5C98B] via-[#C9A55A] to-[#9A7938] text-[#061028] font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {createFromPipelineMutation.isPending
                          ? "Creating…"
                          : "Create from Waypoint Pipeline"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWfId(null);
                        setWfForm({ title: "", description: "", category: "", color: "#C9A55A" });
                        setWfDialog(true);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#081736] hover:bg-[#112652] border border-[#243B64] text-[#DCE6F5] text-xs font-semibold cursor-pointer"
                    >
                      Blank Workflow
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === "traditional" ? (
            <TraditionalFlowCanvas
              workflows={workflows}
              selectedWorkflowId={selectedId}
              selectedWorkflowMeta={selectedWfMeta}
              externalNodes={workflowDoc.nodes}
              externalEdges={workflowDoc.edges}
              syncRevision={traditionalSyncRev}
              selectedStageId={selectedStageId}
              canEdit={canEdit && experienceMode === "designer"}
              onSelectWorkflow={handleSelectWorkflow}
              onCreateWorkflow={() => {
                setEditingWfId(null);
                setWfForm({ title: "", description: "", category: "", color: "#C9A55A" });
                setWfDialog(true);
              }}
              onEditWorkflow={() => {
                if (!selectedWfMeta) return;
                setEditingWfId(selectedWfMeta.id);
                setWfForm({
                  title: selectedWfMeta.title,
                  description: selectedWfMeta.description ?? "",
                  category: selectedWfMeta.category ?? "",
                  color: selectedWfMeta.color ?? "#C9A55A",
                });
                setWfDialog(true);
              }}
              onDeleteWorkflow={() => {
                if (!selectedWfMeta) return;
                if (window.confirm(`Delete workflow "${selectedWfMeta.title}"?`)) {
                  deleteMutation.mutate({ id: selectedWfMeta.id });
                }
              }}
              onOpenBusinessOperations={() => setLocation("/settings?section=operations")}
              onOpenAutomations={() => setLocation("/automations")}
              onSelectNode={(nodeId) => setSelectedStageId(nodeId)}
              onSyncBack={handleSyncFromTraditional}
            />
          ) : (
            <MonorailCanvas
              workflowId={selectedId}
              doc={workflowDoc}
              experienceMode={experienceMode}
              canEdit={canEdit}
              editRoutesMode={editRoutesMode}
              planFilter={planFilter}
              projectTypeFilter={projectTypeFilter}
              selectedStageId={selectedStageId}
              onSelectStage={(sid) => {
                setSelectedStageId(sid);
                if (!sid) {
                  setInspectDrawer({ kind: "none" });
                }
              }}
              onSelectGuideStep={(stageId, step) => {
                setRouteEditor({ open: false, stageId: null, tab: "stage" });
                setInspectDrawer({ kind: "guide_me", stageId, focusedStepId: step.id });
              }}
              onSelectAutomation={(stageId, auto) => {
                setRouteEditor({ open: false, stageId: null, tab: "stage" });
                setInspectDrawer({
                  kind: "automation",
                  stageId,
                  automationLinkId: auto.id,
                });
              }}
              onSelectGate={(gate) => {
                setRouteEditor({ open: false, stageId: null, tab: "stage" });
                setInspectDrawer({ kind: "gate", gateId: gate.id });
              }}
              onOpenGuideMe={(stageId) => {
                setRouteEditor({ open: false, stageId: null, tab: "stage" });
                setInspectDrawer({ kind: "guide_me", stageId });
              }}
              onOpenStageWorkspace={(stage) => {
                const href = resolveWorkspaceHref(stage.workspaceLinkType, {
                  contactId: primaryCase?.contactId,
                  leadId: primaryCase?.leadId,
                });
                if (href) setLocation(href);
                else toast.info("No workspace link configured for this stage yet.");
              }}
              onEditStage={(stage) => {
                setInspectDrawer({ kind: "none" });
                setRouteEditor({ open: true, stageId: stage.id, tab: "stage" });
              }}
              onOpenAutomationsEditor={(stage) => {
                setInspectDrawer({ kind: "none" });
                setRouteEditor({ open: true, stageId: stage.id, tab: "automations" });
              }}
              onAddStageInline={handleAddStage}
              onQuickAddGuideStep={handleQuickAddGuideStep}
              onQuickAddAutomation={handleQuickAddAutomation}
              onQuickAddApprovalGate={handleQuickAddApprovalGate}
              onMoveStationLayout={(stageId, pos, updatedPieces) => {
                // Visual coordinates ONLY — NEVER modifies business sequence or automations!
                commitMonorailDocEdit(
                  (prev) => ({
                    ...prev,
                    monorailLayout: {
                      ...prev.monorailLayout,
                      [stageId]: pos,
                    },
                    ...(updatedPieces ? { monorailRailPieces: updatedPieces } : {}),
                  }),
                  false,
                  true
                );
              }}
              onUpdateRailPieces={(pieces: MonorailCosmeticPiece[]) => {
                // Cosmetic track bends ONLY — strictly separate from workflow logic!
                commitMonorailDocEdit(
                  (prev) => ({
                    ...prev,
                    monorailRailPieces: pieces,
                  }),
                  false,
                  true
                );
              }}
              onUpdateVisualPrefs={(prefs: MonorailVisualPrefs) => {
                commitMonorailDocEdit(
                  (prev) => ({
                    ...prev,
                    monorailVisualPrefs: prefs,
                  }),
                  false
                );
              }}
              onResetLayout={() => {
                commitMonorailDocEdit(
                  (prev) => ({
                    ...prev,
                    monorailLayout: {},
                    monorailRailPieces: [],
                  }),
                  false
                );
                toast.success("Visual layout reset (workflow order unchanged).");
              }}
              onUseStarterWorkflow={handleUseStarterWorkflow}
              canUndo={historyPast.length > 0}
              canRedo={historyFuture.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              selectedCases={selectedCases}
              completedStepIds={completedStepIds}
              gateStatusMap={gateStatusMap}
              caseAutomationFailures={caseAutomationFailures}
              onClickCaseTrain={(caseItem) => {
                setRouteEditor({ open: false, stageId: null, tab: "stage" });
                setInspectDrawer({ kind: "case_train", caseItem });
              }}
            />
          )}

          {/* Focused Guide Me / Approval Gate / Automation / Case Train Drawer */}
          <StationGuideAndInspectDrawer
            drawer={inspectDrawer}
            onClose={() => setInspectDrawer({ kind: "none" })}
            doc={workflowDoc}
            workflowId={selectedId}
            experienceMode={experienceMode}
            canEdit={canEdit}
            primaryCase={primaryCase}
            completedStepIds={completedStepIds}
            gateStatusMap={gateStatusMap}
            gateRecordMap={gateRecordMap}
            realAutomations={realAutomations}
            onNavigate={(path) => setLocation(path)}
            onToggleGuideStep={(stageId, step, nextCompleted) => {
              if (!selectedId || !primaryCase) return;
              toggleGuideStepMutation.mutate({
                workflowId: selectedId,
                contactId: primaryCase.contactId,
                stageId,
                stepId: step.id,
                stepTitle: step.title,
                completed: nextCompleted,
              });
            }}
            onSubmitGateApproval={(gateId, status, note) => {
              if (!selectedId || !primaryCase) return;
              submitGateApprovalMutation.mutate({
                workflowId: selectedId,
                contactId: primaryCase.contactId,
                gateId,
                status,
                note,
              });
            }}
            onAdvanceCaseToNextStage={(fromStageId, targetStageId) => {
              if (!selectedId || !primaryCase) return;
              advanceCaseStageMutation.mutate({
                workflowId: selectedId,
                contactId: primaryCase.contactId,
                fromStageId,
                targetStageId,
              });
            }}
            onOpenStageEditor={(stage, initialTab = "stage") => {
              setInspectDrawer({ kind: "none" });
              setRouteEditor({ open: true, stageId: stage.id, tab: initialTab });
            }}
            isMutating={
              toggleGuideStepMutation.isPending ||
              submitGateApprovalMutation.isPending ||
              advanceCaseStageMutation.isPending
            }
          />

          {/* Designer Route Editor Drawer (Stage / Guide Steps / Approval Gates / Automations) */}
          <WorkflowRouteEditorDrawer
            open={routeEditor.open}
            stageId={routeEditor.stageId}
            initialTab={routeEditor.tab}
            onClose={() => setRouteEditor({ open: false, stageId: null, tab: "stage" })}
            doc={workflowDoc}
            plans={plans}
            templates={templates}
            realAutomations={realAutomations}
            onUpdateStage={(stageId, updater) =>
              commitMonorailDocEdit((prev) => ({
                ...prev,
                stages: prev.stages.map((s) => (s.id === stageId ? updater(s) : s)),
              }))
            }
            onReorderStage={handleReorderStage}
            onDeleteStage={handleDeleteStage}
            onUpsertGate={(gate: WorkflowApprovalGate) =>
              commitMonorailDocEdit((prev) => {
                const exists = prev.approvalGates.some((g) => g.id === gate.id);
                return {
                  ...prev,
                  approvalGates: exists
                    ? prev.approvalGates.map((g) => (g.id === gate.id ? gate : g))
                    : [...prev.approvalGates, gate],
                };
              })
            }
            onDeleteGate={(gateId) =>
              commitMonorailDocEdit((prev) => ({
                ...prev,
                approvalGates: prev.approvalGates.filter((g) => g.id !== gateId),
              }))
            }
            onExpandAutomationBranch={(stageId) =>
              commitMonorailDocEdit((prev) => {
                const existing = prev.monorailVisualPrefs?.expandedAutomationStageIds || [];
                if (existing.includes(stageId)) return prev;
                return {
                  ...prev,
                  monorailVisualPrefs: {
                    ...(prev.monorailVisualPrefs || {}),
                    expandedAutomationStageIds: [...existing, stageId],
                  },
                };
              }, false)
            }
            onNavigate={(path) => setLocation(path)}
            onRefreshContext={() => refetchContext()}
          />
        </div>

        {/* Workflow Create / Edit Metadata Dialog */}
        <Dialog open={wfDialog} onOpenChange={setWfDialog}>
          <DialogContent className="max-w-md bg-[#06122E] border-[#C9A55A]/50 text-white">
            <DialogHeader>
              <DialogTitle className="text-[#FFF4D4]">
                {editingWfId ? "Edit Workflow" : "New Workflow"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1 block text-[#C8D7EC]">Title *</label>
                <VoiceInput
                  value={wfForm.title}
                  onChange={(e) => setWfForm({ ...wfForm, title: e.target.value })}
                  placeholder="e.g. Waypoint Advocacy Journey"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-[#C8D7EC]">Category</label>
                <VoiceInput
                  value={wfForm.category}
                  onChange={(e) => setWfForm({ ...wfForm, category: e.target.value })}
                  placeholder="e.g. Onboarding, IEP, Admin"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-[#C8D7EC]">Description</label>
                <VoiceTextarea
                  value={wfForm.description}
                  onChange={(e) => setWfForm({ ...wfForm, description: e.target.value })}
                  placeholder="Brief overview"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-[#C8D7EC]">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {WORKFLOW_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                        wfForm.color === c ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setWfForm({ ...wfForm, color: c })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWfDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!wfForm.title.trim()) {
                    toast.error("Title is required");
                    return;
                  }
                  if (editingWfId) {
                    updateMutation.mutate({ id: editingWfId, ...wfForm });
                  } else {
                    createMutation.mutate(wfForm);
                  }
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-[#DFC07C] to-[#9E7C3A] text-[#061028] font-bold"
              >
                {editingWfId ? "Save Changes" : "Create Workflow"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScopedErrorBoundary>
  );
}

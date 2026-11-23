import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  List,
  Map as MapIcon,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Sparkles,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  buildSampleStarterWorkflowDocument,
  computeMonorailGeometry,
  getRailPieceGeometry,
  isApplicableToScope,
  type MonorailCosmeticPiece,
  type MonorailVisualPrefs,
  type RailTrayItemKind,
  type WorkflowApprovalGate,
  type WorkflowDocumentV2,
  type WorkflowExperienceMode,
  type WorkflowGuideStep,
  type WorkflowStageAutomationLink,
  type WorkflowStageDefinition,
} from "@shared/workflowModel";
import { MonorailTrain } from "./MonorailTrain";
import {
  MetallicMonorailTrack,
  MonorailApprovalGate,
  MonorailSvgDefs,
  PlacedCosmeticRailPiece,
  TrackJunctionSocket,
  type CanvasSocket,
} from "./MonorailTrackElements";
import {
  AutomationBranch,
  CircularDimensionalStation,
  GuideStepBranch,
} from "./MonorailStation";
import { MonorailRailPartsTray } from "./MonorailRailPartsTray";
import {
  buildCanvasSockets,
  explainInvalidConnection,
  findNearestSocket,
  isCosmeticPieceKind,
  isPieceCompatibleWithSocket,
  translateAttachedRailPieces,
} from "./monorailSnapEngine";

export interface ConnectedCaseSummary {
  contactId: number;
  fullName: string;
  parentName: string;
  caseId: string;
  leadId: number | null;
  pipelineStage: string;
  planTier: string;
  planType: string;
  assignedAdvocateName: string;
  openTaskCount: number;
  primaryTask: string;
  compassNextStep: string | null;
  lastActivitySummary: string;
}

export interface MonorailCanvasProps {
  doc: WorkflowDocumentV2;
  experienceMode: WorkflowExperienceMode;
  canEdit: boolean;
  editRoutesMode: boolean;
  planFilter: string;
  projectTypeFilter: string;
  selectedStageId: string | null;
  onSelectStage: (stageId: string | null) => void;
  onSelectGuideStep: (stageId: string, step: WorkflowGuideStep) => void;
  onSelectAutomation: (stageId: string, auto: WorkflowStageAutomationLink) => void;
  onSelectGate: (gate: WorkflowApprovalGate) => void;
  onOpenGuideMe: (stageId: string) => void;
  onOpenStageWorkspace: (stage: WorkflowStageDefinition) => void;
  onEditStage: (stage: WorkflowStageDefinition) => void;
  onAddStageInline: (afterStageId?: string | null) => void;
  onQuickAddGuideStep: (stageId: string) => void;
  onQuickAddAutomation: (stageId: string) => void;
  onQuickAddApprovalGate: (fromStageId: string, toStageId: string) => void;
  onMoveStationLayout: (
    stageId: string,
    pos: { x: number; y: number },
    updatedPieces?: MonorailCosmeticPiece[]
  ) => void;
  onUpdateRailPieces: (pieces: MonorailCosmeticPiece[]) => void;
  onUpdateVisualPrefs: (prefs: MonorailVisualPrefs) => void;
  onResetLayout: () => void;
  /** Called ONLY when user explicitly chooses "Use this starter" on an empty workflow */
  onUseStarterWorkflow: (starterDoc: WorkflowDocumentV2) => void;
  /** Undo / Redo for Edit Routes */
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Real selected cases in Employee Preview (0, 1, or small explicit set) */
  selectedCases: ConnectedCaseSummary[];
  /** Completed step IDs for the primary selected case */
  completedStepIds: Set<string>;
  /** Gate approval statuses keyed by gateId for the primary selected case */
  gateStatusMap: Record<string, "pending" | "approved" | "rejected">;
  /** Real automation run failure count keyed by automationId for the selected case */
  caseAutomationFailures?: Record<number, number>;
  /** Click handler on a connected case train */
  onClickCaseTrain?: (caseItem: ConnectedCaseSummary) => void;
}

interface DraggingTrayGhost {
  kind: RailTrayItemKind;
  worldX: number;
  worldY: number;
  clientX: number;
  clientY: number;
  movedEnough: boolean;
}

/**
 * Interactive Monorail Workflow Map Canvas
 * ----------------------------------------
 * Renders sleek brushed champagne-gold main rails, circular raised metallic platforms,
 * tiny streamlined 3-car articulated trains riding true SVG curve geometry, expandable
 * cool-blue guide-step branches, expandable violet automation branches, champagne-gold
 * approval gates, and a collapsible Edit Routes premade snap rail-parts tray.
 */
export function MonorailCanvas({
  doc,
  experienceMode,
  canEdit,
  editRoutesMode,
  planFilter,
  projectTypeFilter,
  selectedStageId,
  onSelectStage,
  onSelectGuideStep,
  onSelectAutomation,
  onSelectGate,
  onOpenGuideMe,
  onOpenStageWorkspace,
  onEditStage,
  onAddStageInline,
  onQuickAddGuideStep,
  onQuickAddAutomation,
  onQuickAddApprovalGate,
  onMoveStationLayout,
  onUpdateRailPieces,
  onUpdateVisualPrefs,
  onResetLayout,
  onUseStarterWorkflow,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedCases,
  completedStepIds,
  gateStatusMap,
  caseAutomationFailures = {},
  onClickCaseTrain,
}: MonorailCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mainRailPathRef = useRef<SVGPathElement | null>(null);
  const [railPathNode, setRailPathNode] = useState<SVGPathElement | null>(null);

  // Sample starter preview document used strictly when the active workflow has 0 stages (NEVER auto-saved!)
  const starterSampleDoc = useMemo(() => buildSampleStarterWorkflowDocument(), []);
  const isStarterPreviewMode = doc.stages.length === 0;
  const activeDoc = isStarterPreviewMode ? starterSampleDoc : doc;

  // Local selection inside Starter Sample Preview so users can click stations & inspect sample guide steps safely
  const [sampleSelectedStageId, setSampleSelectedStageId] = useState<string | null>(
    "starter-records-review"
  );
  const effectiveSelectedStageId = isStarterPreviewMode
    ? sampleSelectedStageId
    : selectedStageId;

  // Accessibility: detect prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", listener);
    return () => mq.removeEventListener?.("change", listener);
  }, []);

  // Accessible ordered list fallback toggle
  const [showAccessibleList, setShowAccessibleList] = useState(false);

  // Viewport camera (zoom & pan inside canvas — zero browser horizontal scroll)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Edit Routes: collapsible tray, armed click-to-place piece, dragging tray piece, dragging existing piece/station
  const [trayOpen, setTrayOpen] = useState(true);
  const [armedPiece, setArmedPiece] = useState<RailTrayItemKind | null>(null);
  const [draggingTrayGhost, setDraggingTrayGhost] = useState<DraggingTrayGhost | null>(null);
  const [selectedCosmeticPieceId, setSelectedCosmeticPieceId] = useState<string | null>(null);
  const [draggingCosmeticPieceId, setDraggingCosmeticPieceId] = useState<string | null>(null);
  const cosmeticDragRef = useRef({ clientX: 0, clientY: 0, lastWorldX: 0, lastWorldY: 0 });
  const [snapNotice, setSnapNotice] = useState<{ type: "info" | "error"; text: string } | null>(null);

  // Station drag-to-reposition in Edit Routes mode (visual layout only — never alters business order!)
  const [draggingStageId, setDraggingStageId] = useState<string | null>(null);
  const stationDragRef = useRef({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });

  // Designer Preview Train playback state (100% visual, zero side effects)
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewTrainStationIdx, setPreviewTrainStationIdx] = useState<number>(0);
  const [previewTrainIdleOnSpan, setPreviewTrainIdleOnSpan] = useState<boolean>(true);
  const [dockedTrainStageIdx, setDockedTrainStageIdx] = useState<number | null>(null);

  // Reset edit-only transient state when leaving Edit Routes mode
  useEffect(() => {
    if (!editRoutesMode) {
      setArmedPiece(null);
      setDraggingTrayGhost(null);
      setSelectedCosmeticPieceId(null);
      setDraggingCosmeticPieceId(null);
      setSnapNotice(null);
    }
  }, [editRoutesMode]);

  // Expandable branch tracking:
  // - Guide branches: selected stage expands by default + user-pinned stages
  // - Automation branches: collapsed by default to limit clutter; expanded explicitly per stage or persisted in visualPrefs
  const [localExpandedGuideIds, setLocalExpandedGuideIds] = useState<string[]>([]);
  const [localExpandedAutoIds, setLocalExpandedAutoIds] = useState<string[]>([
    "starter-onboarding",
  ]);

  const expandedGuideSet = useMemo(() => {
    const persisted = activeDoc.monorailVisualPrefs?.expandedGuideStageIds || [];
    const set = new Set<string>([...persisted, ...localExpandedGuideIds]);
    if (effectiveSelectedStageId) set.add(effectiveSelectedStageId);
    return set;
  }, [activeDoc.monorailVisualPrefs, localExpandedGuideIds, effectiveSelectedStageId]);

  const expandedAutoSet = useMemo(() => {
    const persisted = activeDoc.monorailVisualPrefs?.expandedAutomationStageIds || [];
    return new Set<string>([...persisted, ...localExpandedAutoIds]);
  }, [activeDoc.monorailVisualPrefs, localExpandedAutoIds]);

  const toggleGuideBranch = useCallback(
    (stageId: string) => {
      if (isStarterPreviewMode) {
        setLocalExpandedGuideIds((prev) =>
          prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
        );
        return;
      }
      const curr = activeDoc.monorailVisualPrefs?.expandedGuideStageIds || [];
      const next = curr.includes(stageId)
        ? curr.filter((id) => id !== stageId)
        : [...curr, stageId];
      onUpdateVisualPrefs({
        ...(activeDoc.monorailVisualPrefs || {}),
        expandedGuideStageIds: next,
      });
    },
    [activeDoc.monorailVisualPrefs, isStarterPreviewMode, onUpdateVisualPrefs]
  );

  const toggleAutomationBranch = useCallback(
    (stageId: string) => {
      if (isStarterPreviewMode) {
        setLocalExpandedAutoIds((prev) =>
          prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
        );
        return;
      }
      const curr = activeDoc.monorailVisualPrefs?.expandedAutomationStageIds || [];
      const next = curr.includes(stageId)
        ? curr.filter((id) => id !== stageId)
        : [...curr, stageId];
      setLocalExpandedAutoIds(next);
      onUpdateVisualPrefs({
        ...(activeDoc.monorailVisualPrefs || {}),
        expandedAutomationStageIds: next,
      });
    },
    [activeDoc.monorailVisualPrefs, isStarterPreviewMode, onUpdateVisualPrefs]
  );

  // Visible stages filtered cleanly by Plan & Project Type scope
  const visibleStages = useMemo(() => {
    const ordered = [...activeDoc.stages].sort((a, b) => a.order - b.order);
    if (experienceMode === "employee_preview" && !isStarterPreviewMode) {
      const scoped = ordered.filter((s) =>
        isApplicableToScope(s, planFilter, projectTypeFilter)
      );
      return scoped.length > 0 ? scoped : ordered;
    }
    return ordered;
  }, [activeDoc.stages, experienceMode, isStarterPreviewMode, planFilter, projectTypeFilter]);

  const railPieces = useMemo(
    () => (isStarterPreviewMode ? [] : doc.monorailRailPieces || []),
    [doc.monorailRailPieces, isStarterPreviewMode]
  );

  const geometry = useMemo(
    () =>
      computeMonorailGeometry(visibleStages, activeDoc.monorailLayout, {
        railPieces,
      }),
    [visibleStages, activeDoc.monorailLayout, railPieces]
  );

  const setMainPathRef = useCallback((el: SVGPathElement | null) => {
    mainRailPathRef.current = el;
    setRailPathNode(el);
  }, []);

  // Re-sync SVG path element when route changes so trains immediately sit on the track
  useEffect(() => {
    if (mainRailPathRef.current) {
      setRailPathNode(mainRailPathRef.current);
    }
  }, [geometry.mainPathD]);

  // Compute exact station fractions along the true SVG path length so trains stop right at each station!
  const stationFractions = useMemo(() => {
    const count = visibleStages.length;
    if (count <= 1) return count === 1 ? [0.5] : [];
    const pathEl = railPathNode;
    if (!pathEl) {
      return visibleStages.map((_, idx) => idx / (count - 1));
    }
    try {
      const total = pathEl.getTotalLength();
      if (!Number.isFinite(total) || total <= 1) {
        return visibleStages.map((_, idx) => idx / (count - 1));
      }
      // Sample path finely once and find nearest path distance for each station in monotonic order
      const sampleSteps = Math.max(120, count * 42);
      const pts: Array<{ d: number; x: number; y: number }> = [];
      for (let i = 0; i <= sampleSteps; i++) {
        const d = (i / sampleSteps) * total;
        const p = pathEl.getPointAtLength(d);
        pts.push({ d, x: p.x, y: p.y });
      }
      const fracs: number[] = [];
      let minSampleIdx = 0;
      for (let si = 0; si < count; si++) {
        const stPos = geometry.stationMap[visibleStages[si].id];
        if (!stPos) {
          fracs.push(si / (count - 1));
          continue;
        }
        let bestIdx = minSampleIdx;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let k = minSampleIdx; k < pts.length; k++) {
          const dist = Math.hypot(pts[k].x - stPos.x, pts[k].y - stPos.y);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = k;
          }
        }
        minSampleIdx = bestIdx;
        fracs.push(pts[bestIdx].d / total);
      }
      return fracs;
    } catch {
      return visibleStages.map((_, idx) => idx / (count - 1));
    }
  }, [visibleStages, geometry.stationMap, railPathNode]);

  // True Bounding-Box Fit to Screen: guarantees every station, U-turn, open branch, and rail piece is visible!
  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const b = { ...geometry.bounds };
    // Expand bounds slightly for open guide / automation branches
    for (const st of visibleStages) {
      const sp = geometry.stationMap[st.id];
      if (!sp) continue;
      if (expandedGuideSet.has(st.id) && st.guideSteps.length > 0) {
        b.maxY = Math.max(b.maxY, sp.y + 150);
      }
      if (expandedAutoSet.has(st.id) && st.automations.length > 0) {
        b.minY = Math.min(b.minY, sp.y - 120);
        b.maxY = Math.max(b.maxY, sp.y + 135);
      }
    }

    const contentW = Math.max(320, b.maxX - b.minX);
    const contentH = Math.max(240, b.maxY - b.minY);
    const padLeft = editRoutesMode && trayOpen ? 236 : 48;
    const padRight = 92;
    const padTop = isStarterPreviewMode ? 88 : editRoutesMode ? 64 : 40;
    const padBottom = 64;

    const availW = Math.max(240, rect.width - padLeft - padRight);
    const availH = Math.max(200, rect.height - padTop - padBottom);
    const nextZoom = Math.max(0.36, Math.min(1.15, Math.min(availW / contentW, availH / contentH)));

    const centerX = (b.minX + b.maxX) / 2;
    const centerY = (b.minY + b.maxY) / 2;
    const targetScreenCenterX = padLeft + availW / 2;
    const targetScreenCenterY = padTop + availH / 2;

    setZoom(nextZoom);
    setPan({
      x: targetScreenCenterX - centerX * nextZoom,
      y: targetScreenCenterY - centerY * nextZoom,
    });
  }, [
    geometry.bounds,
    geometry.stationMap,
    visibleStages,
    expandedGuideSet,
    expandedAutoSet,
    editRoutesMode,
    trayOpen,
    isStarterPreviewMode,
  ]);

  // Auto-fit on mount, workflow change, or container resize
  useEffect(() => {
    const raf = requestAnimationFrame(() => fitToScreen());
    const el = containerRef.current;
    const ro =
      typeof ResizeObserver !== "undefined" && el
        ? new ResizeObserver(() => fitToScreen())
        : null;
    if (ro && el) ro.observe(el);
    window.addEventListener("resize", fitToScreen);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", fitToScreen);
    };
  }, [fitToScreen]);

  // Keyboard shortcuts: Escape dismisses popover/armed piece; Ctrl+Z / Ctrl+Y undo/redo in Edit Routes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (armedPiece) {
          setArmedPiece(null);
          setSnapNotice(null);
        } else if (effectiveSelectedStageId) {
          if (isStarterPreviewMode) setSampleSelectedStageId(null);
          else onSelectStage(null);
        }
      } else if (editRoutesMode && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) onRedo();
        } else if (canUndo) {
          onUndo();
        }
      } else if (editRoutesMode && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (canRedo) onRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    armedPiece,
    effectiveSelectedStageId,
    isStarterPreviewMode,
    onSelectStage,
    editRoutesMode,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
  ]);

  // Convert screen client coords into SVG world coords
  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan.x, pan.y, zoom]
  );

  // All live connection sockets in Edit Routes mode (hidden outside Edit Routes!)
  const allSockets = useMemo(() => {
    if (!editRoutesMode || isStarterPreviewMode) return [];
    return buildCanvasSockets(visibleStages, geometry, railPieces);
  }, [editRoutesMode, isStarterPreviewMode, visibleStages, geometry, railPieces]);

  // Active placement kind (either dragging from tray OR armed via click-to-place OR moving an existing cosmetic piece)
  const activeSnapKind: RailTrayItemKind | null = useMemo(() => {
    if (draggingTrayGhost) return draggingTrayGhost.kind;
    if (armedPiece) return armedPiece;
    if (draggingCosmeticPieceId) {
      const p = railPieces.find((x) => x.id === draggingCosmeticPieceId);
      return p ? p.kind : null;
    }
    return null;
  }, [draggingTrayGhost, armedPiece, draggingCosmeticPieceId, railPieces]);

  // Find live snap target while dragging a piece
  const activeSnapMatch = useMemo(() => {
    if (!editRoutesMode || !activeSnapKind) return null;
    let worldPt: { x: number; y: number } | null = null;
    if (draggingTrayGhost) {
      worldPt = { x: draggingTrayGhost.worldX, y: draggingTrayGhost.worldY };
    } else if (draggingCosmeticPieceId) {
      const p = railPieces.find((x) => x.id === draggingCosmeticPieceId);
      if (p) worldPt = { x: p.x, y: p.y };
    }
    if (!worldPt) return null;

    const nearest = findNearestSocket(
      worldPt.x,
      worldPt.y,
      allSockets,
      78,
      draggingCosmeticPieceId
    );
    if (!nearest) return null;
    const compatible = isPieceCompatibleWithSocket(
      activeSnapKind,
      nearest.socket,
      draggingCosmeticPieceId
    );
    return { socket: nearest.socket, compatible, dist: nearest.dist };
  }, [
    editRoutesMode,
    activeSnapKind,
    draggingTrayGhost,
    draggingCosmeticPieceId,
    railPieces,
    allSockets,
  ]);

  // Place a tray piece onto a specific socket (shared by BOTH drag-release snap AND click-to-place!)
  const applyPiecePlacementOnSocket = useCallback(
    (kind: RailTrayItemKind, socket: CanvasSocket | null, fallbackWorldPos?: { x: number; y: number }) => {
      if (isStarterPreviewMode) {
        toast.info('Click "Use this starter" first to edit routes on this workflow.');
        return;
      }

      if (socket && !isPieceCompatibleWithSocket(kind, socket)) {
        const msg = explainInvalidConnection(kind, socket);
        setSnapNotice({ type: "error", text: msg });
        toast.error(msg);
        return;
      }

      // Cosmetic track piece placement (straight, quarter_turn, u_turn, branch, merge)
      if (isCosmeticPieceKind(kind)) {
        if (!socket && !fallbackWorldPos) {
          const msg = "Drag onto the canvas or click a glowing gold socket to attach this track piece.";
          setSnapNotice({ type: "info", text: msg });
          return;
        }
        const x = socket ? socket.x : Math.round(fallbackWorldPos!.x);
        const y = socket ? socket.y : Math.round(fallbackWorldPos!.y);
        const rot = socket ? Math.round(socket.angleDeg) : 0;
        const newPiece: MonorailCosmeticPiece = {
          id: `piece-${Date.now()}`,
          kind,
          routeType: socket?.routeType || "main",
          x,
          y,
          rotationDeg: rot,
          attachedTo:
            socket && (socket.targetType === "station" || socket.targetType === "piece")
              ? {
                  targetType: socket.targetType,
                  targetId: socket.targetId,
                  socketName: socket.socketName,
                }
              : null,
        };
        onUpdateRailPieces([...railPieces, newPiece]);
        setSelectedCosmeticPieceId(newPiece.id);
        setSnapNotice({
          type: "info",
          text: socket
            ? `Snapped cosmetic ${kind.replace("_", " ")} onto ${socket.label} (visual layout only).`
            : `Placed cosmetic ${kind.replace("_", " ")} on canvas (drag near a gold socket to snap).`,
        });
        setArmedPiece(null);
        return;
      }

      // Workflow logic pieces (explicit supported behavior synced to Traditional!)
      if (!socket) {
        const msg = explainInvalidConnection(kind, null);
        setSnapNotice({ type: "error", text: msg });
        toast.error(msg);
        return;
      }

      if (kind === "station") {
        const afterStageId =
          socket.targetType === "segment" || socket.targetType === "station"
            ? socket.targetId
            : null;
        onAddStageInline(afterStageId);
        setSnapNotice({
          type: "info",
          text: "Added new synced workflow Station to both Monorail and Traditional.",
        });
      } else if (kind === "guide_step") {
        onQuickAddGuideStep(socket.targetId);
        setSnapNotice({
          type: "info",
          text: "Added new employee Guide Step to station's blue branch.",
        });
      } else if (kind === "automation") {
        onQuickAddAutomation(socket.targetId);
        if (!expandedAutoSet.has(socket.targetId)) {
          toggleAutomationBranch(socket.targetId);
        }
        setSnapNotice({
          type: "info",
          text: "Added new Automation rule to station's violet branch.",
        });
      } else if (kind === "approval_gate") {
        if (!socket.toStageId) {
          const msg = explainInvalidConnection("approval_gate", socket);
          setSnapNotice({ type: "error", text: msg });
          toast.error(msg);
          return;
        }
        onQuickAddApprovalGate(socket.targetId, socket.toStageId);
        setSnapNotice({
          type: "info",
          text: "Snapped Approval Gate onto gold transition (synced with Traditional).",
        });
      }
      setArmedPiece(null);
    },
    [
      isStarterPreviewMode,
      onUpdateRailPieces,
      railPieces,
      onAddStageInline,
      onQuickAddGuideStep,
      onQuickAddAutomation,
      onQuickAddApprovalGate,
      expandedAutoSet,
      toggleAutomationBranch,
    ]
  );

  // Start dragging a piece directly from the Rail-Parts Tray
  const handleStartDragTrayPiece = (kind: RailTrayItemKind, e: React.PointerEvent) => {
    e.stopPropagation();
    const world = clientToWorld(e.clientX, e.clientY);
    setDraggingTrayGhost({
      kind,
      worldX: world.x,
      worldY: world.y,
      clientX: e.clientX,
      clientY: e.clientY,
      movedEnough: false,
    });
  };

  // Compute resting preview train fraction: sit visibly ON the open gold rail span between Station 0 and 1!
  const restingPreviewFraction = useMemo(() => {
    if (stationFractions.length >= 2) {
      if (previewTrainIdleOnSpan && previewTrainStationIdx === 0) {
        return (stationFractions[0] + stationFractions[1]) * 0.5;
      }
      const clampedIdx = Math.min(previewTrainStationIdx, stationFractions.length - 1);
      // Park slightly forward of the station center so the train is unmistakably visible on the rail!
      const nextIdx = Math.min(clampedIdx + 1, stationFractions.length - 1);
      if (clampedIdx < nextIdx) {
        return stationFractions[clampedIdx] + (stationFractions[nextIdx] - stationFractions[clampedIdx]) * 0.42;
      }
      return Math.max(0.06, stationFractions[clampedIdx] - 0.045);
    }
    return 0.5;
  }, [stationFractions, previewTrainIdleOnSpan, previewTrainStationIdx]);

  // Match real selected case(s) to their actual stage on the rail in Employee View
  const caseTrains = useMemo(() => {
    if (
      experienceMode !== "employee_preview" ||
      isStarterPreviewMode ||
      selectedCases.length === 0 ||
      visibleStages.length === 0
    ) {
      return [];
    }
    return selectedCases.map((c, idx) => {
      const targetLower = (c.pipelineStage || "").toLowerCase();
      let matchIdx = visibleStages.findIndex(
        (s) =>
          s.name.toLowerCase() === targetLower ||
          (s.pipelineStageSlug && targetLower.includes(s.pipelineStageSlug.replace(/-/g, " "))) ||
          targetLower.includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes(targetLower)
      );
      if (matchIdx < 0) matchIdx = 0;

      const baseFrac = stationFractions[matchIdx] ?? 0.1;
      const nextFrac = stationFractions[Math.min(matchIdx + 1, stationFractions.length - 1)] ?? 0.9;
      // Offset just ahead of the station rim so the train sits prominently on the rail right beside its station
      const dockedFrac =
        matchIdx < stationFractions.length - 1
          ? baseFrac + Math.min(0.055, (nextFrac - baseFrac) * 0.36)
          : Math.max(0.05, baseFrac - 0.045);
      const multiOffset =
        selectedCases.length > 1 ? (idx - (selectedCases.length - 1) / 2) * 0.025 : 0;
      const initials = c.fullName
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return {
        caseItem: c,
        stageIndex: matchIdx,
        stage: visibleStages[matchIdx],
        fraction: Math.max(0.03, Math.min(0.97, dockedFrac + multiOffset)),
        shortBadge: `${initials} · ${c.fullName.split(" ")[0]}`,
      };
    });
  }, [experienceMode, isStarterPreviewMode, selectedCases, visibleStages, stationFractions]);

  // Pointer pan, station drag, cosmetic piece drag, and tray-piece drag handlers
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-interactive-node='true']")) return;
    setSelectedCosmeticPieceId(null);
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // 1. Dragging a premade piece from the Rail-Parts Tray
    if (draggingTrayGhost) {
      const distMoved = Math.hypot(
        e.clientX - draggingTrayGhost.clientX,
        e.clientY - draggingTrayGhost.clientY
      );
      const world = clientToWorld(e.clientX, e.clientY);
      setDraggingTrayGhost((prev) =>
        prev
          ? {
              ...prev,
              worldX: world.x,
              worldY: world.y,
              movedEnough: prev.movedEnough || distMoved > 8,
            }
          : null
      );
      return;
    }

    // 2. Dragging an existing placed cosmetic rail piece (keeps attached child pieces moving together!)
    if (draggingCosmeticPieceId && canEdit && editRoutesMode) {
      const world = clientToWorld(e.clientX, e.clientY);
      const dx = world.x - cosmeticDragRef.current.lastWorldX;
      const dy = world.y - cosmeticDragRef.current.lastWorldY;
      cosmeticDragRef.current.lastWorldX = world.x;
      cosmeticDragRef.current.lastWorldY = world.y;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
        const updated = translateAttachedRailPieces(
          railPieces.map((p) =>
            p.id === draggingCosmeticPieceId ? { ...p, attachedTo: null } : p
          ),
          "piece",
          draggingCosmeticPieceId,
          dx,
          dy
        );
        onUpdateRailPieces(updated);
      }
      return;
    }

    // 3. Dragging a Station in Edit Routes mode (visual coordinates ONLY + moves attached cosmetic pieces together!)
    if (draggingStageId && canEdit && editRoutesMode && !isStarterPreviewMode) {
      const dxTotal = (e.clientX - stationDragRef.current.clientX) / zoom;
      const dyTotal = (e.clientY - stationDragRef.current.clientY) / zoom;
      const nextX = Math.round(stationDragRef.current.startX + dxTotal);
      const nextY = Math.round(stationDragRef.current.startY + dyTotal);
      const stepDx = nextX - stationDragRef.current.lastX;
      const stepDy = nextY - stationDragRef.current.lastY;
      stationDragRef.current.lastX = nextX;
      stationDragRef.current.lastY = nextY;

      const updatedPieces =
        railPieces.length > 0
          ? translateAttachedRailPieces(railPieces, "station", draggingStageId, stepDx, stepDy)
          : undefined;
      onMoveStationLayout(draggingStageId, { x: nextX, y: nextY }, updatedPieces);
      return;
    }

    // 4. Canvas pan
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
  };

  const handleCanvasPointerUp = () => {
    // Finalize tray piece drag-drop onto canvas/socket
    if (draggingTrayGhost) {
      const ghost = draggingTrayGhost;
      setDraggingTrayGhost(null);
      if (ghost.movedEnough) {
        const nearest = findNearestSocket(ghost.worldX, ghost.worldY, allSockets, 78);
        if (nearest) {
          applyPiecePlacementOnSocket(ghost.kind, nearest.socket, {
            x: ghost.worldX,
            y: ghost.worldY,
          });
        } else if (isCosmeticPieceKind(ghost.kind)) {
          applyPiecePlacementOnSocket(ghost.kind, null, {
            x: ghost.worldX,
            y: ghost.worldY,
          });
        } else {
          const msg = explainInvalidConnection(ghost.kind, null);
          setSnapNotice({ type: "error", text: msg });
          toast.error(msg);
        }
      }
      return;
    }

    // Snap existing cosmetic piece on release if near a compatible socket
    if (draggingCosmeticPieceId) {
      const piece = railPieces.find((p) => p.id === draggingCosmeticPieceId);
      setDraggingCosmeticPieceId(null);
      if (piece) {
        const nearest = findNearestSocket(piece.x, piece.y, allSockets, 62, piece.id);
        if (nearest) {
          if (isPieceCompatibleWithSocket(piece.kind, nearest.socket, piece.id)) {
            const dx = nearest.socket.x - piece.x;
            const dy = nearest.socket.y - piece.y;
            const moved = translateAttachedRailPieces(railPieces, "piece", piece.id, dx, dy).map(
              (p) =>
                p.id === piece.id
                  ? {
                      ...p,
                      x: nearest.socket.x,
                      y: nearest.socket.y,
                      rotationDeg: Math.round(nearest.socket.angleDeg),
                      attachedTo:
                        nearest.socket.targetType === "station" ||
                        nearest.socket.targetType === "piece"
                          ? {
                              targetType: nearest.socket.targetType,
                              targetId: nearest.socket.targetId,
                              socketName: nearest.socket.socketName,
                            }
                          : null,
                    }
                  : p
            );
            onUpdateRailPieces(moved);
            setSnapNotice({
              type: "info",
              text: `Snapped onto ${nearest.socket.label}. Connected pieces stay attached.`,
            });
          } else {
            const msg = explainInvalidConnection(piece.kind, nearest.socket);
            setSnapNotice({ type: "error", text: msg });
            toast.error(msg);
          }
        }
      }
      return;
    }

    setIsPanning(false);
    setDraggingStageId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.09 : 0.92;
    setZoom((z) => Math.max(0.36, Math.min(1.85, Number((z * factor).toFixed(2)))));
  };

  const selectedStage = useMemo(
    () => visibleStages.find((s) => s.id === effectiveSelectedStageId) || null,
    [visibleStages, effectiveSelectedStageId]
  );
  const selectedStationPos = selectedStage ? geometry.stationMap[selectedStage.id] : null;
  const hasCustomLayout =
    Object.keys(doc.monorailLayout || {}).length > 0 || railPieces.length > 0;

  // Contextual station popover screen-space placement + gold leader line endpoint
  const popoverLayout = useMemo(() => {
    if (!selectedStationPos || !containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const sx = selectedStationPos.x * zoom + pan.x;
    const sy = selectedStationPos.y * zoom + pan.y;
    const cardW = 224;
    const cardH = 166;

    // Avoid covering an open blue guide branch (which extends in selectedStationPos.direction)
    const guideExtendsLeft = selectedStationPos.direction === -1;
    const roomOnRight = rect.width - (sx + 38 * zoom) - 10;
    const placeLeft = guideExtendsLeft
      ? roomOnRight < cardW - 24
      : sx + 44 + cardW > rect.width - 12;

    const left = placeLeft
      ? Math.max(12, sx - cardW - 44)
      : Math.min(rect.width - cardW - 10, sx + 44);
    const top = Math.max(
      isStarterPreviewMode ? 82 : 16,
      Math.min(rect.height - cardH - 58, sy - 22)
    );

    // Rim anchor & popover edge anchor for crisp hairline gold pointer matching reference image
    const anchorX = placeLeft ? sx - 32 * zoom : sx + 32 * zoom;
    const anchorY = sy;
    const cardEdgeX = placeLeft ? left + cardW : left;
    const cardEdgeY = top + 24;

    return { left, top, anchorX, anchorY, cardEdgeX, cardEdgeY };
  }, [selectedStationPos, zoom, pan, isStarterPreviewMode]);

  // Accessible Ordered List Fallback View
  if (showAccessibleList) {
    return (
      <div className="relative w-full h-full overflow-y-auto bg-[#000820] p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between border-b border-[#1A2F58] pb-3">
            <div>
              <h3 className="text-base font-serif font-semibold text-[#FFF4D4]">
                Accessible Ordered Workflow List ({visibleStages.length} Stations)
                {isStarterPreviewMode ? " · Sample Starter Preview" : ""}
              </h3>
              <p className="text-xs text-[#9BB0CE]">
                Keyboard-friendly linear view of the exact same workflow stages, guide steps, approval gates, and automations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAccessibleList(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A193B] border border-[#C9A55A]/55 text-xs text-[#F5E3B8] hover:bg-[#122652] cursor-pointer"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Back to Monorail Map</span>
            </button>
          </div>

          <ol className="space-y-3">
            {visibleStages.map((stage, idx) => {
              const stageGates = activeDoc.approvalGates.filter((g) => g.fromStageId === stage.id);
              const doneSteps = stage.guideSteps.filter((gs) => completedStepIds.has(gs.id)).length;
              return (
                <li
                  key={stage.id}
                  className={cn(
                    "rounded-xl p-4 bg-[#06112B] border transition-colors",
                    effectiveSelectedStageId === stage.id
                      ? "border-[#E2C37E]"
                      : "border-[#1C325B] hover:border-[#365894]"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[#E2C37E]">
                          Step {idx + 1} of {visibleStages.length}
                        </span>
                        <h4 className="text-sm font-semibold text-white">{stage.name}</h4>
                        <span className="text-[11px] text-[#9BB0CE]">· {stage.assignedRole}</span>
                      </div>
                      {stage.description && (
                        <p className="text-xs text-[#A5B8D4] mt-1">{stage.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isStarterPreviewMode && (
                        <button
                          type="button"
                          onClick={() => onOpenGuideMe(stage.id)}
                          className="px-3 py-1 rounded-lg bg-gradient-to-b from-[#E5C98B] to-[#B08A42] text-[#061028] font-semibold text-xs cursor-pointer"
                        >
                          Guide Me ({doneSteps}/{stage.guideSteps.length})
                        </button>
                      )}
                      {canEdit && experienceMode === "designer" && !isStarterPreviewMode && (
                        <button
                          type="button"
                          onClick={() => onEditStage(stage)}
                          className="px-2.5 py-1 rounded-lg bg-[#0D1E44] border border-[#2C477A] text-xs text-[#D8E5F8] hover:text-white cursor-pointer"
                        >
                          Edit Stage
                        </button>
                      )}
                    </div>
                  </div>

                  {stage.guideSteps.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#16294F] flex flex-wrap gap-1.5">
                      {stage.guideSteps.map((gs) => (
                        <button
                          key={gs.id}
                          type="button"
                          onClick={() => !isStarterPreviewMode && onSelectGuideStep(stage.id, gs)}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-[#0A1E44] border border-[#3B82F6]/45 text-[#BFDBFE] hover:border-[#60A5FA] cursor-pointer"
                        >
                          {completedStepIds.has(gs.id) ? "✓ " : ""}
                          {gs.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {stageGates.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {stageGates.map((gate) => (
                        <button
                          key={gate.id}
                          type="button"
                          onClick={() => !isStarterPreviewMode && onSelectGate(gate)}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-[#1C170B] border border-[#C9A55A]/60 text-[#F5E3B8] cursor-pointer"
                        >
                          Approval Gate: {gate.title} ({gate.requiredRole})
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="monorail-canvas-container"
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerLeave={handleCanvasPointerUp}
      onWheel={handleWheel}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("[data-interactive-node='true']")) {
          if (isStarterPreviewMode) setSampleSelectedStageId(null);
          else onSelectStage(null);
          setSelectedCosmeticPieceId(null);
        }
      }}
      className={cn(
        "relative w-full h-full overflow-hidden select-none bg-[#000820]",
        draggingTrayGhost ? "cursor-crosshair" : isPanning ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      {/* LAYER 0 (z-0): Calm Architectural Layered Navy Canvas Background (canonical #000820) */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 820"
      >
        <defs>
          <radialGradient id="monorail-ambient-top" cx="50%" cy="6%" r="68%">
            <stop offset="0%" stopColor="#142C5E" stopOpacity="0.52" />
            <stop offset="52%" stopColor="#061230" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#000820" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="monorail-contour-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0E204B" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#020B24" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="monorail-contour-2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#09183B" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#000820" stopOpacity="0.88" />
          </linearGradient>
        </defs>
        <rect width="1440" height="820" fill="#000820" />
        <rect width="1440" height="820" fill="url(#monorail-ambient-top)" />
        {/* Sleek sculptural topographic navy contour planes matching the reference */}
        <path
          d="M 620 -10 C 710 115, 920 128, 1170 126 C 1320 126, 1405 178, 1460 225 L 1460 -10 Z"
          fill="url(#monorail-contour-1)"
          stroke="#213A6E"
          strokeOpacity="0.34"
          strokeWidth="1.1"
        />
        <path
          d="M 880 -10 C 960 65, 1130 74, 1460 95 L 1460 -10 Z"
          fill="#0D1E47"
          fillOpacity="0.4"
          stroke="#27437E"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
        <path
          d="M -20 635 C 240 595, 480 655, 740 725 C 980 790, 1260 765, 1460 700 L 1460 840 L -20 840 Z"
          fill="url(#monorail-contour-2)"
          stroke="#1B3263"
          strokeOpacity="0.28"
          strokeWidth="1"
        />
      </svg>

      {/* LAYER 1 (relative z-10): Interactive Zoomable & Pannable Monorail SVG Stage */}
      <svg
        className="relative z-10 w-full h-full block"
        role="region"
        aria-label="Interactive Monorail Workflow Map"
      >
        <MonorailSvgDefs />

        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{
            transition:
              isPanning || draggingStageId || draggingCosmeticPieceId || reducedMotion
                ? "none"
                : "transform 220ms ease-out",
          }}
        >
          {/* 1. Expandable Violet Automation Branch Routes (collapsed unless explicitly expanded!) */}
          {visibleStages.map((stage) => {
            if (!expandedAutoSet.has(stage.id)) return null;
            const stPos = geometry.stationMap[stage.id];
            if (!stPos) return null;
            return (
              <AutomationBranch
                key={`auto-${stage.id}`}
                stage={stage}
                stPos={stPos}
                canvasWidth={geometry.width}
                experienceMode={experienceMode}
                caseAutomationFailures={caseAutomationFailures}
                onSelectAutomation={(sid, auto) => {
                  if (isStarterPreviewMode) {
                    toast.info(`Sample automation "${auto.title}" — click "Use this starter" to configure live rules.`);
                    return;
                  }
                  onSelectAutomation(sid, auto);
                }}
              />
            );
          })}

          {/* 2. Expandable Cool-Blue Guide Step Branch Routes (selected stage expanded by default + pinned) */}
          {visibleStages.map((stage, idx) => {
            if (!expandedGuideSet.has(stage.id)) return null;
            const stPos = geometry.stationMap[stage.id];
            if (!stPos) return null;
            const nextStage = visibleStages[idx + 1] || null;
            const nextPos = nextStage ? geometry.stationMap[nextStage.id] : null;
            return (
              <GuideStepBranch
                key={`guide-${stage.id}`}
                stage={stage}
                stPos={stPos}
                nextPos={nextPos}
                experienceMode={experienceMode}
                planFilter={planFilter}
                projectTypeFilter={projectTypeFilter}
                completedStepIds={completedStepIds}
                onSelectGuideStep={(sid, step) => {
                  if (isStarterPreviewMode) {
                    toast.info(`Sample guide step "${step.title}" — click "Use this starter" to edit or check off steps.`);
                    return;
                  }
                  onSelectGuideStep(sid, step);
                }}
              />
            );
          })}

          {/* 3. Subtle Low-Profile Stanchion Pins Supporting Elevated Gold Track */}
          {geometry.segmentPaths.map((seg) => (
            <g key={`stanchion-${seg.fromStageId}-${seg.toStageId}`} opacity={0.68}>
              <line
                x1={seg.midPoint.x}
                y1={seg.midPoint.y + 5}
                x2={seg.midPoint.x}
                y2={seg.midPoint.y + 21}
                stroke="#7A5E2C"
                strokeWidth={2.8}
                strokeLinecap="round"
              />
              <ellipse cx={seg.midPoint.x} cy={seg.midPoint.y + 22} rx={5.5} ry={2} fill="#00020B" />
            </g>
          ))}

          {/* 4. Main Connected Champagne-Gold Dimensional Monorail Track */}
          {geometry.mainPathD && (
            <g filter="url(#rail-drop-shadow)">
              <MetallicMonorailTrack
                d={geometry.mainPathD}
                variant="main"
                pathRef={setMainPathRef}
              />
            </g>
          )}

          {/* 5. User-Placed Premade Cosmetic Snap Rail Pieces (Visual Only) */}
          {railPieces.map((piece) => (
            <PlacedCosmeticRailPiece
              key={piece.id}
              piece={piece}
              editRoutesMode={editRoutesMode && canEdit && !isStarterPreviewMode}
              selected={selectedCosmeticPieceId === piece.id}
              onSelect={() => setSelectedCosmeticPieceId(piece.id)}
              onPointerDownMove={(e) => {
                const world = clientToWorld(e.clientX, e.clientY);
                setDraggingCosmeticPieceId(piece.id);
                cosmeticDragRef.current = {
                  clientX: e.clientX,
                  clientY: e.clientY,
                  lastWorldX: world.x,
                  lastWorldY: world.y,
                };
              }}
              onRotate={() => {
                onUpdateRailPieces(
                  railPieces.map((p) =>
                    p.id === piece.id
                      ? { ...p, rotationDeg: (p.rotationDeg + 90) % 360 }
                      : p
                  )
                );
              }}
              onDelete={() => {
                onUpdateRailPieces(railPieces.filter((p) => p.id !== piece.id));
                setSelectedCosmeticPieceId(null);
                setSnapNotice({ type: "info", text: "Removed cosmetic rail piece (workflow logic unchanged)." });
              }}
            />
          ))}

          {/* 6. Subtle Directional Chevrons Between Stations */}
          {geometry.segmentPaths.map((seg) => {
            const hasGateOnSeg = activeDoc.approvalGates.some(
              (g) => g.enabled && g.fromStageId === seg.fromStageId && g.toStageId === seg.toStageId
            );
            if (hasGateOnSeg) return null;
            return (
              <g
                key={`dir-${seg.fromStageId}-${seg.toStageId}`}
                transform={`translate(${seg.midPoint.x}, ${seg.midPoint.y}) rotate(${seg.angleDeg})`}
                pointerEvents="none"
              >
                <path
                  d="M -4 -3.2 L 2.5 0 L -4 3.2"
                  fill="none"
                  stroke="#FFF5D4"
                  strokeWidth={1.65}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.82}
                />
              </g>
            );
          })}

          {/* 7. Circular Dimensional Metallic Workflow Stations */}
          {visibleStages.map((stage, idx) => {
            const pos = geometry.stationMap[stage.id];
            if (!pos) return null;
            const isSelected = effectiveSelectedStageId === stage.id;
            const inScope = isApplicableToScope(stage, planFilter, projectTypeFilter);
            const activeCaseHere = caseTrains.some((ct) => ct.stage.id === stage.id);
            const totalSteps = stage.guideSteps.length;
            const doneSteps = stage.guideSteps.filter((gs) => completedStepIds.has(gs.id)).length;
            const isStageComplete =
              experienceMode === "employee_preview" && totalSteps > 0 && doneSteps === totalSteps;

            return (
              <CircularDimensionalStation
                key={stage.id}
                stage={stage}
                index={idx}
                totalStages={visibleStages.length}
                pos={pos}
                isSelected={isSelected}
                isCurrentCase={activeCaseHere}
                isTrainDocked={dockedTrainStageIdx === idx && previewPlaying}
                isStageComplete={isStageComplete}
                inScope={inScope}
                canDrag={canEdit && editRoutesMode && !isStarterPreviewMode}
                hasGuideSteps={stage.guideSteps.length > 0}
                guideExpanded={expandedGuideSet.has(stage.id)}
                hasAutomations={stage.automations.length > 0}
                automationsExpanded={expandedAutoSet.has(stage.id)}
                onToggleGuideBranch={() => toggleGuideBranch(stage.id)}
                onToggleAutomationBranch={() => toggleAutomationBranch(stage.id)}
                onPointerDownDrag={(e) => {
                  setDraggingStageId(stage.id);
                  stationDragRef.current = {
                    clientX: e.clientX,
                    clientY: e.clientY,
                    startX: pos.x,
                    startY: pos.y,
                    lastX: pos.x,
                    lastY: pos.y,
                  };
                }}
                onSelect={() => {
                  if (isStarterPreviewMode) {
                    setSampleSelectedStageId(isSelected ? null : stage.id);
                  } else {
                    onSelectStage(isSelected ? null : stage.id);
                  }
                }}
                onNavigateArrow={(delta) => {
                  const target = visibleStages[idx + delta];
                  if (!target) return;
                  if (isStarterPreviewMode) setSampleSelectedStageId(target.id);
                  else onSelectStage(target.id);
                }}
              />
            );
          })}

          {/* 8. Dimensional Champagne-Gold Approval Gates Astride Gold Transitions */}
          {activeDoc.approvalGates
            .filter((g) => g.enabled)
            .map((gate) => {
              const seg = geometry.segmentPaths.find(
                (s) => s.fromStageId === gate.fromStageId && s.toStageId === gate.toStageId
              );
              const fromPos = geometry.stationMap[gate.fromStageId];
              const toPos = geometry.stationMap[gate.toStageId];
              if (!fromPos || !toPos) return null;
              const gx = seg ? seg.midPoint.x : (fromPos.x + toPos.x) / 2;
              const gy = seg ? seg.midPoint.y : (fromPos.y + toPos.y) / 2;
              const gateStatus =
                experienceMode === "employee_preview" && !isStarterPreviewMode
                  ? gateStatusMap[gate.id] || "pending"
                  : "pending";
              return (
                <MonorailApprovalGate
                  key={gate.id}
                  gate={gate}
                  x={gx}
                  y={gy}
                  status={gateStatus}
                  onSelect={(g) => {
                    if (isStarterPreviewMode) {
                      toast.info(`Sample approval gate "${g.title}" — click "Use this starter" to activate gate rules.`);
                      return;
                    }
                    onSelectGate(g);
                  }}
                />
              );
            })}

          {/* 9. Tiny Streamlined Articulated Monorail Trains (Rendered cleanly ON TOP of the track!) */}
          {(experienceMode === "designer" || isStarterPreviewMode) && visibleStages.length >= 2 && (
            <MonorailTrain
              trainId="designer-preview"
              pathElement={railPathNode}
              targetFraction={restingPreviewFraction}
              demoPlaying={previewPlaying}
              stationFractions={stationFractions}
              onArriveStation={(idx) => {
                setPreviewTrainStationIdx(idx);
                setDockedTrainStageIdx(idx);
              }}
              label={`Preview Train at ${visibleStages[Math.min(previewTrainStationIdx, visibleStages.length - 1)]?.name || "Start"} (Simulation only — no live case changes)`}
              shortBadge={isStarterPreviewMode ? "Sample Train" : "Preview Train"}
              variant="preview"
              reducedMotion={reducedMotion}
              onClick={() => {
                const st = visibleStages[Math.min(previewTrainStationIdx, visibleStages.length - 1)];
                if (!st) return;
                if (isStarterPreviewMode) setSampleSelectedStageId(st.id);
                else onSelectStage(st.id);
              }}
            />
          )}

          {experienceMode === "employee_preview" &&
            !isStarterPreviewMode &&
            caseTrains.map((ct) => (
              <MonorailTrain
                key={`case-train-${ct.caseItem.contactId}`}
                trainId={`case-${ct.caseItem.contactId}`}
                pathElement={railPathNode}
                targetFraction={ct.fraction}
                label={`${ct.caseItem.fullName} currently at ${ct.stage.name}. Click for progress summary.`}
                shortBadge={ct.shortBadge}
                variant="case"
                reducedMotion={reducedMotion}
                onClick={() => onClickCaseTrain?.(ct.caseItem)}
              />
            ))}

          {/* 10. Edit Routes Connection Sockets & Proposed Snap Preview (STRICTLY hidden outside Edit Routes!) */}
          {editRoutesMode && !isStarterPreviewMode && (
            <g data-testid="monorail-edit-sockets-layer">
              {allSockets.map((sock) => {
                const isTargetMatch = activeSnapMatch?.socket.id === sock.id;
                const isCompatible = activeSnapKind
                  ? isPieceCompatibleWithSocket(activeSnapKind, sock, draggingCosmeticPieceId)
                  : false;
                const state: "idle" | "compatible" | "snapping" | "invalid" = isTargetMatch
                  ? activeSnapMatch.compatible
                    ? "snapping"
                    : "invalid"
                  : activeSnapKind && isCompatible
                  ? "compatible"
                  : "idle";

                return (
                  <TrackJunctionSocket
                    key={sock.id}
                    x={sock.x}
                    y={sock.y}
                    routeType={sock.routeType}
                    state={state}
                    label={sock.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (armedPiece) {
                        applyPiecePlacementOnSocket(armedPiece, sock);
                      }
                    }}
                  />
                );
              })}

              {/* Proposed Connection Line + Live Ghost Preview while Dragging a Tray Piece */}
              {draggingTrayGhost && draggingTrayGhost.movedEnough && (
                <g pointerEvents="none">
                  {activeSnapMatch && (
                    <line
                      x1={draggingTrayGhost.worldX}
                      y1={draggingTrayGhost.worldY}
                      x2={activeSnapMatch.socket.x}
                      y2={activeSnapMatch.socket.y}
                      stroke={activeSnapMatch.compatible ? "#FFE8A6" : "#FB7185"}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  )}
                  {isCosmeticPieceKind(draggingTrayGhost.kind) ? (
                    <g
                      transform={`translate(${
                        activeSnapMatch?.compatible
                          ? activeSnapMatch.socket.x
                          : draggingTrayGhost.worldX
                      }, ${
                        activeSnapMatch?.compatible
                          ? activeSnapMatch.socket.y
                          : draggingTrayGhost.worldY
                      }) rotate(${
                        activeSnapMatch?.compatible ? activeSnapMatch.socket.angleDeg : 0
                      })`}
                      opacity={0.78}
                    >
                      <MetallicMonorailTrack
                        d={
                          getRailPieceGeometry({
                            id: "ghost",
                            kind: draggingTrayGhost.kind,
                            routeType: "main",
                            x: 0,
                            y: 0,
                            rotationDeg: 0,
                          }).localPathD
                        }
                        variant="main"
                        dashed
                      />
                    </g>
                  ) : (
                    <g
                      transform={`translate(${
                        activeSnapMatch?.compatible
                          ? activeSnapMatch.socket.x
                          : draggingTrayGhost.worldX
                      }, ${
                        activeSnapMatch?.compatible
                          ? activeSnapMatch.socket.y
                          : draggingTrayGhost.worldY
                      })`}
                    >
                      <circle
                        r={18}
                        fill={
                          activeSnapMatch && !activeSnapMatch.compatible
                            ? "#881337"
                            : draggingTrayGhost.kind === "guide_step"
                            ? "#1E3A8A"
                            : draggingTrayGhost.kind === "automation"
                            ? "#4C1D95"
                            : "#2A1F0B"
                        }
                        fillOpacity={0.85}
                        stroke={
                          activeSnapMatch && !activeSnapMatch.compatible
                            ? "#FDA4AF"
                            : "#FFF0C6"
                        }
                        strokeWidth={1.8}
                        strokeDasharray="4 3"
                      />
                    </g>
                  )}
                </g>
              )}
            </g>
          )}
        </g>
      </svg>

      {/* Hairline Gold Leader Line connecting Selected Station Rim to Contextual Popover (matching reference!) */}
      {selectedStage && popoverLayout && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 w-full h-full"
        >
          <line
            x1={popoverLayout.anchorX}
            y1={popoverLayout.anchorY}
            x2={popoverLayout.cardEdgeX}
            y2={popoverLayout.cardEdgeY}
            stroke="#E5C784"
            strokeOpacity={0.82}
            strokeWidth={1.2}
          />
          <circle
            cx={popoverLayout.anchorX}
            cy={popoverLayout.anchorY}
            r={3.5}
            fill="#FFF3CF"
            stroke="#A8823A"
            strokeWidth={1}
          />
        </svg>
      )}

      {/* EMPTY WORKFLOW SAMPLE STARTER BANNER (Never blank! Explicitly labeled sample data!) */}
      {isStarterPreviewMode && (
        <div
          data-interactive-node="true"
          data-testid="monorail-starter-preview-banner"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-2.5 px-4 py-2 rounded-xl bg-[#05112D]/94 border border-[#C9A55A]/65 backdrop-blur-md shadow-[0_14px_34px_rgba(0,0,0,0.85)]"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#241B0A] border border-[#E5C784]/60 text-[10px] font-semibold uppercase tracking-wider text-[#FFE8A6]">
              <Sparkles className="w-3 h-3" />
              Sample Preview
            </span>
            <span className="text-xs text-[#DCE6F5]">
              This workflow is empty — exploring sample starter layout (not saved).
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="starter-preview-route-btn"
              onClick={() => {
                setPreviewTrainIdleOnSpan(false);
                setPreviewPlaying((p) => !p);
              }}
              className="h-7 px-2.5 rounded-lg bg-[#0D1E45] hover:bg-[#162F66] border border-[#60A5FA]/50 text-[#CFE5FF] text-[11.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              {previewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{previewPlaying ? "Pause sample route" : "Preview sample route"}</span>
            </button>
            {canEdit && (
              <button
                type="button"
                data-testid="starter-use-this-btn"
                onClick={() => {
                  setPreviewPlaying(false);
                  onUseStarterWorkflow(buildSampleStarterWorkflowDocument());
                }}
                className="h-7 px-3 rounded-lg bg-gradient-to-b from-[#E5C98B] via-[#C9A55A] to-[#9A7938] hover:brightness-110 text-[#061028] text-[11.5px] font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Use this starter</span>
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => onAddStageInline(null)}
                className="h-7 px-2.5 rounded-lg bg-[#071530] hover:bg-[#10244D] border border-[#243B64] text-[#9BB0CE] hover:text-white text-[11px] cursor-pointer"
              >
                + Add 1 blank station
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit Routes Collapsible Rail-Parts Tray + Undo / Redo / Auto-layout Bar */}
      {canEdit && editRoutesMode && !isStarterPreviewMode && (
        <MonorailRailPartsTray
          open={trayOpen}
          onToggleOpen={() => setTrayOpen((v) => !v)}
          armedPiece={armedPiece}
          onArmPiece={(kind) => {
            setArmedPiece(kind);
            if (kind) {
              setSnapNotice({
                type: "info",
                text: `Click any glowing compatible socket to snap "${kind.replace("_", " ")}".`,
              });
            } else {
              setSnapNotice(null);
            }
          }}
          onStartDragPiece={handleStartDragTrayPiece}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          onAutoLayout={() => {
            onResetLayout();
            setSnapNotice({
              type: "info",
              text: "Auto-layout applied (stage sequence and workflow rules unchanged).",
            });
            setTimeout(fitToScreen, 60);
          }}
          snapNotice={snapNotice}
          onDismissNotice={() => setSnapNotice(null)}
        />
      )}

      {/* Contextual Station Summary Popover (Only one open at a time, crisp gold trim matching reference!) */}
      {selectedStage && popoverLayout && (
        <div
          data-interactive-node="true"
          data-testid="monorail-station-popover"
          style={{ left: popoverLayout.left, top: popoverLayout.top }}
          className="absolute z-30 w-[224px] rounded-xl bg-[#07122D]/95 backdrop-blur-md border border-[#C9A55A]/70 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.9),0_0_24px_rgba(201,165,90,0.16)]"
        >
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-[0.09em] text-[#FFF4D4] leading-snug">
                {selectedStage.name}
              </h4>
              <span className="text-[10px] font-mono text-[#9BB0CE] shrink-0">
                Step {visibleStages.findIndex((s) => s.id === selectedStage.id) + 1} of{" "}
                {visibleStages.length}
              </span>
            </div>

            <p className="text-[11px] text-[#B8C7DE]">
              {selectedStage.assignedRole}
              {selectedStage.waitingOnDefault ? ` · Waiting on: ${selectedStage.waitingOnDefault}` : ""}
            </p>

            {/* Expandable Blue Guide & Violet Automation Route Controls */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {selectedStage.guideSteps.length > 0 && (
                <button
                  type="button"
                  data-testid="popover-toggle-guide-branch"
                  onClick={() => toggleGuideBranch(selectedStage.id)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border cursor-pointer transition-colors",
                    expandedGuideSet.has(selectedStage.id)
                      ? "bg-[#0F2A5E] border-[#60A5FA]/70 text-[#DBEAFE]"
                      : "bg-[#081736] border-[#25457D] text-[#93C5FD]"
                  )}
                >
                  Blue steps ({selectedStage.guideSteps.filter((gs) => completedStepIds.has(gs.id)).length}/
                  {selectedStage.guideSteps.length})
                </button>
              )}
              {selectedStage.automations.length > 0 && (
                <button
                  type="button"
                  data-testid="popover-toggle-auto-branch"
                  onClick={() => toggleAutomationBranch(selectedStage.id)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border cursor-pointer transition-colors",
                    expandedAutoSet.has(selectedStage.id)
                      ? "bg-[#2C165A] border-[#A78BFA]/75 text-[#F3E8FF]"
                      : "bg-[#150C33] border-[#4C2F85] text-[#C4B5FD]"
                  )}
                >
                  {expandedAutoSet.has(selectedStage.id) ? "Hide" : "Show"} automations (
                  {selectedStage.automations.length})
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <button
              type="button"
              data-testid="station-popover-guide-me-btn"
              onClick={() => {
                if (isStarterPreviewMode) {
                  toast.info('Sample station preview — click "Use this starter" to open interactive Guide Me.');
                  return;
                }
                onOpenGuideMe(selectedStage.id);
              }}
              className="w-full h-8 rounded-lg bg-gradient-to-b from-[#E5C98B] via-[#C6A258] to-[#987634] hover:brightness-110 text-[#061028] font-bold text-xs shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.55)] cursor-pointer transition-all"
            >
              Guide Me
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                data-testid="station-popover-open-stage-btn"
                onClick={() => {
                  if (isStarterPreviewMode) {
                    toast.info('Click "Use this starter" to link stages to live CRM workspaces.');
                    return;
                  }
                  onOpenStageWorkspace(selectedStage);
                }}
                className="h-7 rounded-lg bg-[#0B1B3F] hover:bg-[#132959] border border-[#2A4578] text-[#DCE6F5] hover:text-white text-[11px] font-medium cursor-pointer transition-colors"
              >
                Open Stage
              </button>
              {canEdit && experienceMode === "designer" && !isStarterPreviewMode ? (
                <button
                  type="button"
                  data-testid="station-popover-edit-stage-btn"
                  onClick={() => onEditStage(selectedStage)}
                  className="h-7 rounded-lg bg-[#0B1B3F] hover:bg-[#132959] border border-[#C9A55A]/55 text-[#F5E3B8] hover:text-white text-[11px] font-medium cursor-pointer transition-colors"
                >
                  Edit Stage
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isStarterPreviewMode) setSampleSelectedStageId(null);
                    else onSelectStage(null);
                  }}
                  className="h-7 rounded-lg bg-[#071330] hover:bg-[#0D1E47] border border-[#1E335C] text-[#9BB0CE] text-[11px] font-medium cursor-pointer transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Designer Mode Preview Train Mini-Bar (Top-Right inside Canvas — Demo / Pause / Stop / Step) */}
      {experienceMode === "designer" && !isStarterPreviewMode && (
        <div
          data-interactive-node="true"
          data-testid="monorail-preview-train-bar"
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#051029]/92 border border-[#243B64] backdrop-blur-sm text-[11px] text-[#C6D5EB] shadow-lg"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#93C5FD] pr-1.5 border-r border-[#1F355D]">
            Preview Train
          </span>
          <button
            type="button"
            data-testid="preview-train-demo-btn"
            onClick={() => {
              setPreviewTrainIdleOnSpan(false);
              setPreviewPlaying((p) => !p);
            }}
            disabled={reducedMotion || visibleStages.length < 2}
            title={
              reducedMotion
                ? "Motion reduced per system accessibility preference"
                : previewPlaying
                ? "Pause preview train"
                : "Glide preview train along connected route (zero live case changes)"
            }
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0D1E44] hover:bg-[#152D61] text-[#F5E3B8] disabled:opacity-40 cursor-pointer"
          >
            {previewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{previewPlaying ? "Pause" : "Demo"}</span>
          </button>
          {(previewPlaying || !previewTrainIdleOnSpan) && (
            <button
              type="button"
              data-testid="preview-train-stop-btn"
              onClick={() => {
                setPreviewPlaying(false);
                setPreviewTrainStationIdx(0);
                setPreviewTrainIdleOnSpan(true);
                setDockedTrainStageIdx(null);
              }}
              title="Stop demo and reset preview train"
              className="p-1 rounded bg-[#0D1E44] hover:bg-[#152D61] text-[#D8E5F8] cursor-pointer"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
            </button>
          )}
          <button
            type="button"
            data-testid="preview-train-step-btn"
            onClick={() => {
              setPreviewPlaying(false);
              setPreviewTrainIdleOnSpan(false);
              setPreviewTrainStationIdx((i) => (i + 1) % visibleStages.length);
            }}
            title="Step preview train to next station"
            className="p-1 rounded bg-[#0D1E44] hover:bg-[#152D61] text-[#D8E5F8] cursor-pointer"
          >
            <SkipForward className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Bottom-Left Compact Map Legend (Gold / Blue / Violet) */}
      <div
        data-interactive-node="true"
        className="absolute bottom-3.5 left-4 z-20 flex flex-wrap items-center gap-4 px-3.5 py-2 rounded-lg bg-[#030C24]/88 border border-[#1B2F58]/80 backdrop-blur-sm text-[11.5px] text-[#DCE6F5]"
      >
        <span className="inline-flex items-center gap-2">
          <span className="w-5 h-[2.5px] rounded-full bg-gradient-to-r from-[#C9A55A] via-[#FFF0C6] to-[#C9A55A] shadow-[0_0_6px_rgba(229,199,132,0.7)]" />
          <span>Main workflow</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-5 h-[2.5px] rounded-full bg-gradient-to-r from-[#3B82F6] via-[#93C5FD] to-[#3B82F6] shadow-[0_0_6px_rgba(96,165,250,0.7)]" />
          <span>Guide steps</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-5 h-[2.5px] rounded-full bg-gradient-to-r from-[#7C3AED] via-[#C4B5FD] to-[#7C3AED] shadow-[0_0_6px_rgba(167,139,250,0.7)]" />
          <span>Automations</span>
        </span>
      </div>

      {/* Bottom-Right Map Viewport Controls (-, +, Fit to screen, Reset layout, List View) */}
      <div
        data-interactive-node="true"
        className="absolute bottom-3.5 right-4 z-20 flex items-center gap-1.5"
      >
        <button
          type="button"
          onClick={() => setShowAccessibleList(true)}
          title="Open accessible ordered workflow list"
          aria-label="Switch to accessible ordered workflow list"
          className="h-8 px-2.5 rounded-lg bg-[#051029]/92 hover:bg-[#0D1E45] border border-[#243B64] text-[#C6D5EB] hover:text-white text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <List className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">List</span>
        </button>

        {canEdit && hasCustomLayout && !isStarterPreviewMode && (
          <button
            type="button"
            data-testid="monorail-reset-layout-btn"
            onClick={() => {
              onResetLayout();
              setTimeout(fitToScreen, 60);
            }}
            title="Reset station positions & cosmetic bends (preserves workflow order)"
            className="h-8 px-2.5 rounded-lg bg-[#051029]/92 hover:bg-[#0D1E45] border border-[#243B64] text-[#F5E3B8] hover:text-white text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset layout</span>
          </button>
        )}

        <div className="inline-flex items-center rounded-lg bg-[#051029]/92 border border-[#243B64] overflow-hidden">
          <button
            type="button"
            aria-label="Zoom out"
            data-testid="monorail-zoom-out-btn"
            onClick={() => setZoom((z) => Math.max(0.36, Number((z - 0.12).toFixed(2))))}
            className="h-8 w-8 flex items-center justify-center text-[#DCE6F5] hover:bg-[#10244D] hover:text-white cursor-pointer border-r border-[#1F355D]"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            data-testid="monorail-zoom-in-btn"
            onClick={() => setZoom((z) => Math.min(1.85, Number((z + 0.12).toFixed(2))))}
            className="h-8 w-8 flex items-center justify-center text-[#DCE6F5] hover:bg-[#10244D] hover:text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          data-testid="monorail-fit-screen-btn"
          onClick={fitToScreen}
          className="h-8 px-3 rounded-lg bg-[#051029]/92 hover:bg-[#0D1E45] border border-[#243B64] text-[#DCE6F5] hover:text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit to screen</span>
        </button>
      </div>
    </div>
  );
}

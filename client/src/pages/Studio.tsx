import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  MousePointer,
  PenTool,
  Highlighter,
  Eraser,
  Type,
  StickyNote,
  Square,
  Circle,
  Diamond,
  ArrowUpRight,
  Sparkles,
  Undo2,
  Redo2,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  RefreshCw,
  Play,
  Share2,
  Copy,
  Archive,
  Trash2,
  Edit3,
  Target,
  Layers,
  Maximize2,
  Minimize2,
  FolderKanban,
  Sun,
  Moon,
  Users,
  Shapes,
  MoreHorizontal,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import {
  STUDIO_COLORS,
  STUDIO_COLOR_LIST,
  STROKE_THICKNESS_OPTIONS,
  broadcastStudioSync,
  type StudioAccessSettings,
  type StudioCanvasObject,
  type StudioColorKey,
  type StudioPage,
  type StudioRole,
  type StudioStroke,
  type StudioSurfaceMode,
  type StudioTaskRecord,
  type StudioToolId,
} from "@/components/studio/studioTypes";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
import { StudioCardsSurface } from "@/components/studio/StudioCardsSurface";
import { StudioTaskDrawer } from "@/components/studio/StudioTaskDrawer";
import { StudioPresentationOverlay } from "@/components/studio/StudioPresentationOverlay";
import {
  StudioBoardNameModal,
  StudioShareAccessModal,
} from "@/components/studio/StudioModals";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface PageHistoryEntry {
  pages: StudioPage[];
  activePageId: string;
}

const AVATAR_COLORS = [
  "#22D3EE",
  "#A78BFA",
  "#F472B6",
  "#FFE394",
  "#34D399",
  "#38BDF8",
];

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function Studio() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const workspaceRootRef = useRef<HTMLDivElement | null>(null);

  // ── Board & Workspace State ───────────────────────────────────────────────
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [showArchivedBoards, setShowArchivedBoards] = useState(false);
  const [boardTitle, setBoardTitle] = useState("IEP Strategy & Live Teaching");
  const [surface, setSurface] = useState<StudioSurfaceMode>("neon");
  const [pages, setPages] = useState<StudioPage[]>([]);
  const [activePageId, setActivePageId] = useState<string>("page-1");
  const [accessSettings, setAccessSettings] = useState<StudioAccessSettings>({
    visibility: "team_edit",
    members: [],
    audienceFilters: {
      showDrawings: true,
      showTypedText: true,
      showShapesAndConnectors: true,
      showOrdinaryNotes: true,
      showTaskTitlesOnly: true,
      allowedPageIds: [],
    },
  });
  const [myRole, setMyRole] = useState<StudioRole>("owner");

  // ── Active Tool, Drawing & Viewport State ─────────────────────────────────
  const [activeTool, setActiveTool] = useState<StudioToolId>("pen");
  const [activeColor, setActiveColor] = useState<StudioColorKey>("cyan");
  const [strokeThickness, setStrokeThickness] = useState<number>(3);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [inspectedTaskId, setInspectedTaskId] = useState<number | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState<number>(1);
  const [fitViewCounter, setFitViewCounter] = useState<number>(0);

  // ── Popovers & Floating Drawers ───────────────────────────────────────────
  const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);
  const [pagesDrawerOpen, setPagesDrawerOpen] = useState(false);
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  const [lastShapeTool, setLastShapeTool] = useState<
    "rect" | "circle" | "diamond" | "connector"
  >("circle");

  // ── Undo / Redo Stacks ────────────────────────────────────────────────────
  const [undoStack, setUndoStack] = useState<PageHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<PageHistoryEntry[]>([]);

  // ── Honest Save-State & Autosave ──────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedBoardIdRef = useRef<string | null>(null);

  // ── Modals & Confirmations ────────────────────────────────────────────────
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [nameModalMode, setNameModalMode] = useState<"create" | "rename" | null>(
    null
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingNoteDropAssign, setPendingNoteDropAssign] = useState<{
    noteId: string;
    noteTitle: string;
    assigneeId: number | null;
    assigneeName: string;
    isMyFocus: boolean;
  } | null>(null);
  const [dragHoverTarget, setDragHoverTarget] = useState<string | null>(null);

  // ── tRPC Queries ──────────────────────────────────────────────────────────
  const boardsQuery = trpc.studio.listBoards.useQuery({
    includeArchived: showArchivedBoards,
  });
  const teamRosterQuery = trpc.studio.getTeamRoster.useQuery();

  const currentBoardId =
    selectedBoardId || boardsQuery.data?.[0]?.id || null;

  const boardDetailQuery = trpc.studio.getBoard.useQuery(
    { id: currentBoardId || "" },
    { enabled: Boolean(currentBoardId) }
  );

  const boardTasksQuery = trpc.studio.getBoardTasks.useQuery(
    { boardId: currentBoardId || "" },
    { enabled: Boolean(currentBoardId) }
  );

  // Hydrate board state when switching boards
  useEffect(() => {
    const data = boardDetailQuery.data;
    if (!data) return;
    if (hydratedBoardIdRef.current === data.id && saveStatus === "unsaved") {
      return;
    }
    hydratedBoardIdRef.current = data.id;
    setSelectedBoardId(data.id);
    setBoardTitle(
      data.title === "IEP Strategy & Live Teaching Board"
        ? "IEP Strategy & Live Teaching"
        : data.title
    );
    setSurface((data.defaultSurface as StudioSurfaceMode) || "neon");
    setPages((data.pages as StudioPage[]) || []);
    setActivePageId(data.activePageId || data.pages?.[0]?.id || "page-1");
    setAccessSettings(data.access as StudioAccessSettings);
    setMyRole((data.myRole as StudioRole) || "owner");
    setUndoStack([]);
    setRedoStack([]);
    setSaveStatus("saved");
    setSaveErrorMessage(null);
  }, [boardDetailQuery.data]);

  // Sync browser fullscreen state (Fullscreen expands this exact same interface)
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const targetEl = workspaceRootRef.current || document.documentElement;
        await targetEl.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveBoardMut = trpc.studio.saveBoard.useMutation({
    onMutate: () => {
      setSaveStatus("saving");
      setSaveErrorMessage(null);
    },
    onSuccess: () => {
      setSaveStatus("saved");
      setSaveErrorMessage(null);
      utils.studio.listBoards.invalidate();
    },
    onError: (err) => {
      setSaveStatus("error");
      setSaveErrorMessage(err.message || "Could not save board changes.");
      toast.error(
        `Save failed: ${err.message}. Your work is preserved locally.`
      );
    },
  });

  const createBoardMut = trpc.studio.createBoard.useMutation({
    onSuccess: (created) => {
      if (created) {
        hydratedBoardIdRef.current = null;
        setSelectedBoardId(created.id);
        toast.success(`Created board "${created.title}"`);
      }
      utils.studio.listBoards.invalidate();
      setNameModalMode(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const renameBoardMut = trpc.studio.renameBoard.useMutation({
    onSuccess: (updated) => {
      if (updated) {
        setBoardTitle(updated.title);
        toast.success(`Renamed board to "${updated.title}"`);
      }
      utils.studio.listBoards.invalidate();
      setNameModalMode(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateBoardMut = trpc.studio.duplicateBoard.useMutation({
    onSuccess: (copy) => {
      if (copy) {
        hydratedBoardIdRef.current = null;
        setSelectedBoardId(copy.id);
        toast.success(`Duplicated board as "${copy.title}"`);
      }
      utils.studio.listBoards.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveBoardMut = trpc.studio.setArchiveStatus.useMutation({
    onSuccess: (_updated, vars) => {
      utils.studio.listBoards.invalidate();
      utils.studio.getBoard.invalidate();
      const archived = vars.status === "archived";
      toast.success(
        archived ? "Board archived" : "Board restored from archive",
        archived
          ? {
              action: {
                label: "Undo",
                onClick: () =>
                  archiveBoardMut.mutate({
                    id: vars.id,
                    status: "active",
                  }),
              },
            }
          : undefined
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteBoardMut = trpc.studio.deleteBoard.useMutation({
    onSuccess: () => {
      setConfirmDeleteOpen(false);
      hydratedBoardIdRef.current = null;
      setSelectedBoardId(null);
      utils.studio.listBoards.invalidate();
      toast.success("Board deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const convertNoteToTaskMut = trpc.studio.convertNoteToTask.useMutation({
    onSuccess: (res, vars) => {
      setPages((prevPages) => {
        const next = prevPages.map((p) => ({
          ...p,
          objects: p.objects.map((o) =>
            o.id === vars.objectId
              ? {
                  ...o,
                  linkedTaskId: res.taskId,
                  isMyFocus: Boolean(vars.isMyFocus),
                  updatedAt: new Date().toISOString(),
                }
              : o
          ),
        }));
        queueAutosave({ pages: next });
        return next;
      });
      utils.studio.getBoardTasks.invalidate();
      setInspectedTaskId(res.taskId);
      setPendingNoteDropAssign(null);
      toast.success(
        res.createdNew
          ? "Converted sticky note to a synchronized CRM Task"
          : "Updated linked CRM Task"
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStudioTaskMut = trpc.studio.updateStudioTask.useMutation({
    onSuccess: (_res, vars) => {
      utils.studio.getBoardTasks.invalidate();
      setPages((prev) =>
        prev.map((p) => ({
          ...p,
          objects: p.objects.map((o) =>
            o.linkedTaskId === vars.taskId
              ? {
                  ...o,
                  ...(vars.title !== undefined ? { title: vars.title } : {}),
                  ...(vars.isMyFocus !== undefined
                    ? { isMyFocus: vars.isMyFocus }
                    : {}),
                }
              : o
          ),
        }))
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const addChecklistMut = trpc.studio.addChecklistItem.useMutation({
    onSuccess: () => utils.studio.getBoardTasks.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const toggleChecklistMut = trpc.studio.toggleChecklistItem.useMutation({
    onSuccess: () => utils.studio.getBoardTasks.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const deleteChecklistMut = trpc.studio.deleteChecklistItem.useMutation({
    onSuccess: () => utils.studio.getBoardTasks.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  // ── Autosave Engine ───────────────────────────────────────────────────────
  const flushSaveNow = useCallback(
    (overrides?: {
      title?: string;
      surface?: StudioSurfaceMode;
      activePageId?: string;
      pages?: StudioPage[];
      accessSettings?: StudioAccessSettings;
    }) => {
      if (!currentBoardId || myRole === "viewer") return;
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      const nextPages = overrides?.pages ?? pages;
      const nextSurface = overrides?.surface ?? surface;
      const nextActivePageId = overrides?.activePageId ?? activePageId;

      broadcastStudioSync({
        boardId: currentBoardId,
        activePageId: nextActivePageId,
        surface: nextSurface === "whiteboard" ? "whiteboard" : "neon",
        pages: nextPages,
      });

      saveBoardMut.mutate({
        id: currentBoardId,
        title: overrides?.title ?? boardTitle,
        defaultSurface: nextSurface,
        activePageId: nextActivePageId,
        pages: nextPages,
        access: overrides?.accessSettings ?? accessSettings,
      });
    },
    [
      currentBoardId,
      myRole,
      pages,
      surface,
      activePageId,
      boardTitle,
      accessSettings,
      saveBoardMut,
    ]
  );

  const queueAutosave = useCallback(
    (overrides?: {
      title?: string;
      surface?: StudioSurfaceMode;
      activePageId?: string;
      pages?: StudioPage[];
      accessSettings?: StudioAccessSettings;
    }) => {
      if (!currentBoardId || myRole === "viewer") return;
      setSaveStatus("unsaved");
      const nextPages = overrides?.pages ?? pages;
      const nextSurface = overrides?.surface ?? surface;
      const nextActivePageId = overrides?.activePageId ?? activePageId;

      broadcastStudioSync({
        boardId: currentBoardId,
        activePageId: nextActivePageId,
        surface: nextSurface === "whiteboard" ? "whiteboard" : "neon",
        pages: nextPages,
      });

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => {
        flushSaveNow(overrides);
      }, 650);
    },
    [currentBoardId, myRole, pages, surface, activePageId, flushSaveNow]
  );

  // ── Page & Canvas Mutation Helpers ────────────────────────────────────────
  const activePageIndex = useMemo(() => {
    const idx = pages.findIndex((p) => p.id === activePageId);
    return idx >= 0 ? idx : 0;
  }, [pages, activePageId]);

  const activePage: StudioPage = useMemo(() => {
    return (
      pages[activePageIndex] || {
        id: "page-1",
        title: "Page 1",
        order: 0,
        audienceVisible: true,
        strokes: [],
        objects: [],
      }
    );
  }, [pages, activePageIndex]);

  const commitPageChange = useCallback(
    (nextPage: StudioPage, recordHistory = true) => {
      if (myRole === "viewer") return;
      setPages((prevPages) => {
        if (recordHistory) {
          setUndoStack((u) => [
            ...u.slice(-29),
            {
              pages: JSON.parse(JSON.stringify(prevPages)),
              activePageId,
            },
          ]);
          setRedoStack([]);
        }
        const updated = prevPages.map((p) =>
          p.id === nextPage.id ? nextPage : p
        );
        queueAutosave({ pages: updated });
        return updated;
      });
    },
    [myRole, activePageId, queueAutosave]
  );

  const handleCommitStrokes = useCallback(
    (nextStrokes: StudioStroke[]) => {
      commitPageChange({ ...activePage, strokes: nextStrokes }, true);
    },
    [activePage, commitPageChange]
  );

  const handleCommitObjects = useCallback(
    (nextObjects: StudioCanvasObject[]) => {
      commitPageChange({ ...activePage, objects: nextObjects }, true);
    },
    [activePage, commitPageChange]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || myRole === "viewer") return;
    const last = undoStack[undoStack.length - 1];
    setRedoStack((r) => [
      ...r,
      { pages: JSON.parse(JSON.stringify(pages)), activePageId },
    ]);
    setUndoStack((u) => u.slice(0, -1));
    setPages(last.pages);
    setActivePageId(last.activePageId);
    queueAutosave({ pages: last.pages, activePageId: last.activePageId });
  }, [undoStack, myRole, pages, activePageId, queueAutosave]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || myRole === "viewer") return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [
      ...u,
      { pages: JSON.parse(JSON.stringify(pages)), activePageId },
    ]);
    setRedoStack((r) => r.slice(0, -1));
    setPages(next.pages);
    setActivePageId(next.activePageId);
    queueAutosave({ pages: next.pages, activePageId: next.activePageId });
  }, [redoStack, myRole, pages, activePageId, queueAutosave]);

  const handleAddPage = useCallback(() => {
    if (myRole === "viewer") return;
    const newIndex = pages.length + 1;
    const newPage: StudioPage = {
      id: `page-${Date.now().toString(36)}`,
      title: `Page ${newIndex}`,
      order: pages.length,
      audienceVisible: true,
      strokes: [],
      objects: [],
    };
    setUndoStack((u) => [
      ...u.slice(-29),
      { pages: JSON.parse(JSON.stringify(pages)), activePageId },
    ]);
    setRedoStack([]);
    const nextPages = [...pages, newPage];
    const nextAccess: StudioAccessSettings = {
      ...accessSettings,
      audienceFilters: {
        ...accessSettings.audienceFilters,
        allowedPageIds: [
          ...accessSettings.audienceFilters.allowedPageIds,
          newPage.id,
        ],
      },
    };
    setPages(nextPages);
    setActivePageId(newPage.id);
    setAccessSettings(nextAccess);
    queueAutosave({
      pages: nextPages,
      activePageId: newPage.id,
      accessSettings: nextAccess,
    });
    toast.success(`Added ${newPage.title}`);
  }, [myRole, pages, activePageId, accessSettings, queueAutosave]);

  const handleStepPage = useCallback(
    (delta: number) => {
      if (pages.length === 0) return;
      const nextIdx = Math.max(
        0,
        Math.min(pages.length - 1, activePageIndex + delta)
      );
      const target = pages[nextIdx];
      if (target && target.id !== activePageId) {
        setActivePageId(target.id);
        queueAutosave({ activePageId: target.id });
      }
    },
    [pages, activePageIndex, activePageId, queueAutosave]
  );

  const handleClearCurrentPage = useCallback(() => {
    if (myRole === "viewer" || !activePage) return;
    const cleared: StudioPage = {
      ...activePage,
      strokes: [],
      objects: [],
    };
    commitPageChange(cleared, true);
    toast.success(`Cleared ${activePage.title}`, {
      action: {
        label: "Undo",
        onClick: handleUndo,
      },
    });
  }, [myRole, activePage, commitPageChange, handleUndo]);

  // ── Task Lookup Map & Counts ──────────────────────────────────────────────
  const tasks: StudioTaskRecord[] = useMemo(
    () => (boardTasksQuery.data as StudioTaskRecord[]) || [],
    [boardTasksQuery.data]
  );

  const taskMap = useMemo(() => {
    const map = new Map<number, StudioTaskRecord>();
    for (const t of tasks) {
      map.set(t.id, t);
    }
    return map;
  }, [tasks]);

  const inspectedTask = useMemo(
    () => (inspectedTaskId ? taskMap.get(inspectedTaskId) || null : null),
    [inspectedTaskId, taskMap]
  );

  const {
    taskLinkedObjects,
    ordinaryNotesCount,
    drawingsAndShapesCount,
  } = useMemo(() => {
    const linked: {
      object: StudioCanvasObject;
      pageTitle: string;
      pageId: string;
    }[] = [];
    let notes = 0;
    let drawings = 0;
    for (const p of pages) {
      drawings += p.strokes.length;
      for (const obj of p.objects) {
        if (obj.type === "note") {
          if (obj.linkedTaskId) {
            linked.push({ object: obj, pageTitle: p.title, pageId: p.id });
          } else {
            notes += 1;
          }
        } else {
          drawings += 1;
        }
      }
    }
    return {
      taskLinkedObjects: linked,
      ordinaryNotesCount: notes,
      drawingsAndShapesCount: drawings,
    };
  }, [pages]);

  const teamRoster = useMemo(
    () => teamRosterQuery.data || [],
    [teamRosterQuery.data]
  );

  const myFocusTasks = useMemo(
    () => tasks.filter((t) => t.isMyFocus),
    [tasks]
  );

  const currentUserNumericId = useMemo(() => {
    const parsed = Number(user?.id);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : teamRoster[0]?.id ?? 1;
  }, [user?.id, teamRoster]);

  // ── Assignment Actions (Moved into Team Popover & Drag-to-Team) ───────────
  const handleConvertNoteToTask = useCallback(
    (
      obj: StudioCanvasObject,
      options?: {
        assigneeId?: number | null;
        assigneeName?: string | null;
        isMyFocus?: boolean;
      }
    ) => {
      if (!currentBoardId || myRole === "viewer") return;
      convertNoteToTaskMut.mutate({
        boardId: currentBoardId,
        pageId: activePage.id,
        objectId: obj.id,
        title: (obj.title || obj.text || "Untitled Studio Task").slice(0, 500),
        description: obj.text || "",
        priority: obj.priority || "medium",
        assigneeId: options?.assigneeId ?? null,
        assigneeName: options?.assigneeName ?? null,
        isMyFocus: options?.isMyFocus ?? false,
      });
    },
    [currentBoardId, myRole, activePage.id, convertNoteToTaskMut]
  );

  const handleAssignTaskToMember = useCallback(
    (
      taskId: number,
      assigneeId: number | null,
      assigneeName?: string | null,
      isMyFocus?: boolean
    ) => {
      if (!currentBoardId || myRole === "viewer") return;
      const member = teamRoster.find((m) => m.id === assigneeId);
      updateStudioTaskMut.mutate(
        {
          boardId: currentBoardId,
          taskId,
          assigneeId,
          assigneeName: assigneeName ?? member?.name ?? null,
          isMyFocus,
        },
        {
          onSuccess: () => {
            if (isMyFocus) {
              toast.success("Assigned to you and added to My Focus");
            } else if (member || assigneeName) {
              toast.success(
                `Assigned task to ${member?.name || assigneeName}`
              );
            } else {
              toast.success("Task unassigned");
            }
          },
        }
      );
    },
    [currentBoardId, myRole, teamRoster, updateStudioTaskMut]
  );

  const handleDropOnAssignmentTarget = (
    e: React.DragEvent,
    target: {
      assigneeId: number | null;
      assigneeName: string;
      isMyFocus: boolean;
    }
  ) => {
    e.preventDefault();
    setDragHoverTarget(null);
    if (myRole === "viewer") return;

    const rawStudioItem = e.dataTransfer.getData("application/x-studio-item");
    const rawTaskId = e.dataTransfer.getData("text/studio-task-id");

    if (rawTaskId) {
      const taskId = Number(rawTaskId);
      if (Number.isFinite(taskId)) {
        handleAssignTaskToMember(
          taskId,
          target.assigneeId,
          target.assigneeName,
          target.isMyFocus ? true : undefined
        );
      }
      return;
    }

    if (rawStudioItem) {
      try {
        const parsed = JSON.parse(rawStudioItem) as {
          objectId: string;
          type: string;
          linkedTaskId: number | null;
          title: string;
        };
        if (parsed.linkedTaskId) {
          handleAssignTaskToMember(
            parsed.linkedTaskId,
            target.assigneeId,
            target.assigneeName,
            target.isMyFocus ? true : undefined
          );
        } else {
          setPendingNoteDropAssign({
            noteId: parsed.objectId,
            noteTitle: parsed.title || "Sticky Note",
            assigneeId: target.assigneeId,
            assigneeName: target.assigneeName,
            isMyFocus: target.isMyFocus,
          });
        }
      } catch {
        // Ignore malformed drag payload
      }
    }
  };

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditingText =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (!isEditingText) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (!isEditingText) {
          e.preventDefault();
          handleRedo();
        }
        return;
      }

      if (isEditingText) return;

      if (e.key === "Escape") {
        if (isPresenting) {
          setIsPresenting(false);
        } else {
          setSelectedObjectId(null);
          setShapesMenuOpen(false);
          setTeamPopoverOpen(false);
          setPagesDrawerOpen(false);
          setActiveTool("select");
        }
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedObjectId &&
        myRole !== "viewer"
      ) {
        e.preventDefault();
        const nextObjects = activePage.objects.filter(
          (o) => o.id !== selectedObjectId
        );
        commitPageChange({ ...activePage, objects: nextObjects }, true);
        setSelectedObjectId(null);
      } else if (e.key.toLowerCase() === "v") {
        setActiveTool("select");
      } else if (e.key.toLowerCase() === "p") {
        setActiveTool("pen");
      } else if (e.key.toLowerCase() === "h") {
        setActiveTool("highlighter");
      } else if (e.key.toLowerCase() === "e") {
        setActiveTool("eraser");
      } else if (e.key.toLowerCase() === "t") {
        setActiveTool("text");
      } else if (e.key.toLowerCase() === "n") {
        setActiveTool("note");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleUndo,
    handleRedo,
    isPresenting,
    selectedObjectId,
    myRole,
    activePage,
    commitPageChange,
  ]);

  const handleOpenAudienceWindow = () => {
    if (!currentBoardId) return;
    flushSaveNow();
    window.open(
      `/studio/audience/${currentBoardId}`,
      "waypoint_studio_audience",
      "width=1280,height=800,menubar=no,toolbar=no,location=no,status=no"
    );
  };

  const isShapeToolActive =
    activeTool === "rect" ||
    activeTool === "circle" ||
    activeTool === "diamond" ||
    activeTool === "connector";

  const activeColorPalette =
    STUDIO_COLORS[activeColor] || STUDIO_COLORS.cyan;

  const totalPagesCount = Math.max(1, pages.length);

  return (
    <ScopedErrorBoundary moduleName="The Studio (PG-049)">
      <div
        ref={workspaceRootRef}
        data-testid="studio-workspace-root"
        className="h-[calc(100dvh-3.5rem)] md:h-dvh flex-1 w-full bg-[#030617] text-white flex flex-col overflow-hidden select-none"
      >
        {/* ── 1. SINGLE COMPACT HEADER BAR (Matches Reference Layout at 100% Zoom) ── */}
        <header className="h-12 px-3 sm:px-4 bg-[#070B20]/95 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 z-30">
          {/* Left: ✨ THE STUDIO | Board Switcher Pill | ✓ Saved */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Sparkles className="w-4 h-4 text-[#A78BFA] drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
              <span className="text-xs font-extrabold tracking-[0.14em] uppercase text-white">
                THE STUDIO
              </span>
            </div>

            <div className="h-5 w-px bg-white/12 shrink-0" />

            {/* Board Switching Dropdown Pill */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="studio-board-switcher-btn"
                  className="h-8 px-3 rounded-lg bg-[#0D1330] hover:bg-[#141C42] border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-2 max-w-[240px] sm:max-w-[300px] transition-colors cursor-pointer"
                >
                  <span className="truncate">{boardTitle}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-72 bg-[#080D26] border border-white/15 text-slate-100 text-xs z-50"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Studio Boards</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowArchivedBoards((v) => !v);
                    }}
                    className="text-cyan-300 hover:underline cursor-pointer"
                  >
                    {showArchivedBoards ? "Hide Archived" : "Show Archived"}
                  </button>
                </div>
                {(boardsQuery.data || []).map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    data-testid={`switch-board-item-${b.id}`}
                    onClick={() => {
                      flushSaveNow();
                      hydratedBoardIdRef.current = null;
                      setSelectedBoardId(b.id);
                    }}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate flex items-center gap-1.5">
                        <span>{b.title}</span>
                        {b.status === "archived" && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {b.defaultSurface.toUpperCase()} · {b.myRole}
                      </div>
                    </div>
                    {b.id === currentBoardId && (
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  data-testid="board-menu-new-btn"
                  onClick={() => setNameModalMode("create")}
                  className="text-cyan-300 font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  <span>New Board…</span>
                </DropdownMenuItem>
                {myRole !== "viewer" && (
                  <DropdownMenuItem
                    data-testid="board-menu-rename-btn"
                    onClick={() => setNameModalMode("rename")}
                    className="cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Rename Board…</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  data-testid="board-menu-duplicate-btn"
                  onClick={() =>
                    currentBoardId &&
                    duplicateBoardMut.mutate({ id: currentBoardId })
                  }
                  className="cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  <span>Duplicate Board</span>
                </DropdownMenuItem>
                {myRole === "owner" && currentBoardId && (
                  <>
                    <DropdownMenuItem
                      data-testid="board-menu-archive-btn"
                      onClick={() =>
                        archiveBoardMut.mutate({
                          id: currentBoardId,
                          status:
                            boardDetailQuery.data?.status === "archived"
                              ? "active"
                              : "archived",
                        })
                      }
                      className="cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5 mr-1.5" />
                      <span>
                        {boardDetailQuery.data?.status === "archived"
                          ? "Restore Board"
                          : "Archive Board"}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      data-testid="board-menu-delete-btn"
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      <span>Delete Board…</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Honest Save-State Indicator */}
            <div
              data-testid="studio-save-status-badge"
              className="flex items-center gap-1 text-xs text-slate-300 shrink-0"
            >
              {saveStatus === "saved" && (
                <>
                  <Check className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300">Saved</span>
                </>
              )}
              {saveStatus === "saving" && (
                <>
                  <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                  <span className="text-cyan-300">Saving…</span>
                </>
              )}
              {saveStatus === "unsaved" && (
                <button
                  type="button"
                  onClick={() => flushSaveNow()}
                  className="flex items-center gap-1 text-[#FFE394] hover:underline cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFE394]" />
                  <span>Unsaved</span>
                </button>
              )}
              {saveStatus === "error" && (
                <button
                  type="button"
                  data-testid="studio-retry-save-btn"
                  onClick={() => flushSaveNow()}
                  title={saveErrorMessage || "Save failed — click to retry"}
                  className="flex items-center gap-1 text-rose-300 font-semibold hover:text-white cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Save failed · Retry</span>
                </button>
              )}
            </div>
          </div>

          {/* Center: Surface Selector (Whiteboard | Neon | Cards) */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:block h-5 w-px bg-white/12" />
            <div
              data-testid="studio-surface-selector"
              className="flex items-center p-0.5 rounded-xl bg-[#0D1330] border border-white/12 shrink-0"
            >
              {(
                [
                  { id: "whiteboard", label: "Whiteboard", icon: Sun },
                  { id: "neon", label: "Neon", icon: Moon },
                  { id: "cards", label: "Cards", icon: FolderKanban },
                ] as const
              ).map((s) => {
                const Icon = s.icon;
                const isSelected = surface === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    data-testid={`studio-surface-tab-${s.id}`}
                    onClick={() => {
                      setSurface(s.id);
                      queueAutosave({ surface: s.id });
                    }}
                    className={`h-7 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? s.id === "neon"
                          ? "bg-gradient-to-b from-[#6C47E5] to-[#502CC4] border border-[#967BFF]/60 text-white font-semibold shadow-[0_0_14px_rgba(124,92,252,0.5)]"
                          : s.id === "whiteboard"
                          ? "bg-white text-slate-950 font-bold shadow"
                          : "bg-gradient-to-b from-[#6C47E5] to-[#502CC4] border border-[#967BFF]/60 text-white font-semibold"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="hidden lg:block h-5 w-px bg-white/12" />
          </div>

          {/* Right: Team (with Assignment Dropdown & Drop Target) | Share | Fullscreen | Present */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 👥 Team Button & Assignment Popover (Replaces second assignment sub-bar) */}
            <div className="relative">
              <button
                type="button"
                data-testid="studio-team-assignment-btn"
                onClick={() => setTeamPopoverOpen((v) => !v)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragHoverTarget("team-btn");
                  if (!teamPopoverOpen) setTeamPopoverOpen(true);
                }}
                onDragLeave={() => setDragHoverTarget(null)}
                className={`h-8 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  teamPopoverOpen || dragHoverTarget === "team-btn"
                    ? "bg-[#1A2352] border-[#8B6DFF] text-white shadow-[0_0_14px_rgba(139,109,255,0.4)]"
                    : "bg-[#0D1330] hover:bg-[#141C42] border-white/15 text-slate-200 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-slate-300" />
                <span>Team</span>
                {myFocusTasks.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#6C47E5]/40 border border-[#967BFF]/50 text-[10px] font-mono text-white">
                    {myFocusTasks.length}
                  </span>
                )}
              </button>

              {teamPopoverOpen && (
                <div
                  data-testid="studio-team-assignment-popover"
                  className="absolute right-0 top-10 z-50 w-80 p-3.5 rounded-2xl bg-[#090E28]/98 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div>
                      <div className="text-xs font-bold text-white">
                        Team & Task Assignment
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Select a note/task on the board or drag it onto a teammate below
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTeamPopoverOpen(false)}
                      className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  {/* My Focus Target */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      data-testid="assign-target-my-focus"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragHoverTarget("my-focus");
                      }}
                      onDragLeave={() => setDragHoverTarget(null)}
                      onDrop={(e) =>
                        handleDropOnAssignmentTarget(e, {
                          assigneeId: currentUserNumericId,
                          assigneeName: user?.name || "My Focus",
                          isMyFocus: true,
                        })
                      }
                      onClick={() => {
                        const selObj = activePage.objects.find(
                          (o) => o.id === selectedObjectId
                        );
                        if (selObj) {
                          if (selObj.linkedTaskId) {
                            handleAssignTaskToMember(
                              selObj.linkedTaskId,
                              currentUserNumericId,
                              user?.name || "My Focus",
                              true
                            );
                          } else if (selObj.type === "note") {
                            setPendingNoteDropAssign({
                              noteId: selObj.id,
                              noteTitle:
                                selObj.title || selObj.text || "Sticky Note",
                              assigneeId: currentUserNumericId,
                              assigneeName: user?.name || "My Focus",
                              isMyFocus: true,
                            });
                          }
                        } else {
                          toast.info(
                            "Select a sticky note or task on the board first to assign it to My Focus."
                          );
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                        dragHoverTarget === "my-focus"
                          ? "bg-[#FFE394]/25 border-[#FFE394] text-white"
                          : "bg-[#16130B] border-[#C5A059]/50 text-[#FFE394] hover:border-[#FFE394]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-[#FFE394]" />
                        <span>Assign to My Focus</span>
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-[#FFE394]/20 text-[#FFE394] text-[10px] font-mono">
                        {myFocusTasks.length} pinned
                      </span>
                    </button>

                    {myFocusTasks.length > 0 && (
                      <div className="space-y-1 max-h-28 overflow-y-auto pl-1">
                        {myFocusTasks.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setInspectedTaskId(t.id);
                              setTeamPopoverOpen(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#05091C] hover:bg-[#0D1638] border border-white/10 text-left flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="text-[11px] text-white truncate">
                              {t.title}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-300 shrink-0">
                              #{t.id}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Team Roster Members */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Team Members
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                      {teamRoster.map((member, mIdx) => {
                        const targetKey = `member-${member.id}`;
                        const isHover = dragHoverTarget === targetKey;
                        const badgeColor =
                          AVATAR_COLORS[mIdx % AVATAR_COLORS.length];
                        return (
                          <button
                            key={member.id}
                            type="button"
                            data-testid={`assign-target-member-${member.id}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragHoverTarget(targetKey);
                            }}
                            onDragLeave={() => setDragHoverTarget(null)}
                            onDrop={(e) =>
                              handleDropOnAssignmentTarget(e, {
                                assigneeId: member.id,
                                assigneeName: member.name,
                                isMyFocus: false,
                              })
                            }
                            onClick={() => {
                              const selObj = activePage.objects.find(
                                (o) => o.id === selectedObjectId
                              );
                              if (!selObj) {
                                toast.info(
                                  `Select a sticky note or task on the board first to assign it to ${member.name}.`
                                );
                                return;
                              }
                              if (selObj.linkedTaskId) {
                                handleAssignTaskToMember(
                                  selObj.linkedTaskId,
                                  member.id,
                                  member.name,
                                  false
                                );
                              } else if (selObj.type === "note") {
                                setPendingNoteDropAssign({
                                  noteId: selObj.id,
                                  noteTitle:
                                    selObj.title ||
                                    selObj.text ||
                                    "Sticky Note",
                                  assigneeId: member.id,
                                  assigneeName: member.name,
                                  isMyFocus: false,
                                });
                              }
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                              isHover
                                ? "bg-cyan-500/25 border-cyan-300 text-white"
                                : "bg-[#0D1330] border-white/10 text-slate-200 hover:border-cyan-400/50 hover:text-white"
                            }`}
                          >
                            <span className="inline-flex items-center gap-2 min-w-0">
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0"
                                style={{ backgroundColor: badgeColor }}
                              >
                                {member.initials}
                              </span>
                              <span className="truncate">{member.name}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              Assign
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 🔗 Share Button */}
            <button
              type="button"
              data-testid="studio-share-access-btn"
              onClick={() => setShareModalOpen(true)}
              className="h-8 px-3 rounded-lg bg-[#0D1330] hover:bg-[#141C42] border border-white/15 text-xs font-medium text-slate-200 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-300" />
              <span>Share</span>
            </button>

            {/* ⤢ Fullscreen Icon Button (Expands this same interface) */}
            <button
              type="button"
              data-testid="studio-workspace-fullscreen-btn"
              onClick={toggleBrowserFullscreen}
              title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
              aria-label={isFullscreen ? "Exit Full Screen" : "Full Screen"}
              className="w-8 h-8 rounded-lg bg-[#0D1330] hover:bg-[#141C42] border border-white/15 text-slate-200 hover:text-white inline-flex items-center justify-center cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* ▶ Present Gold Button */}
            <button
              type="button"
              data-testid="studio-present-btn"
              onClick={() => {
                if (surface === "cards") {
                  setSurface("neon");
                }
                flushSaveNow();
                setIsPresenting(true);
              }}
              className="h-8 px-3.5 rounded-lg bg-gradient-to-b from-[#E5C168] via-[#CFA84E] to-[#B08832] text-[#090D1E] text-xs font-bold border border-[#FFE394]/60 shadow-[0_2px_10px_rgba(0,0,0,0.65)] hover:brightness-110 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Present</span>
            </button>
          </div>
        </header>

        {/* Save Error Banner (only if a save error occurs) */}
        {saveStatus === "error" && (
          <div
            data-testid="studio-save-error-banner"
            className="px-4 py-1.5 bg-rose-950/90 border-b border-rose-500/50 flex items-center justify-between text-xs text-rose-100 shrink-0 z-30"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Unable to save latest changes to server ({saveErrorMessage}). Your
                canvas work is still intact in this tab.
              </span>
            </div>
            <button
              type="button"
              onClick={() => flushSaveNow()}
              className="px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
            >
              Retry Save Now
            </button>
          </div>
        )}

        {/* Destructive Delete Board Confirmation Bar */}
        {confirmDeleteOpen && currentBoardId && (
          <div
            data-testid="studio-confirm-delete-board-bar"
            className="px-4 py-2 bg-[#160B24] border-b border-rose-500/50 flex items-center justify-between text-xs shrink-0 z-30"
          >
            <span className="text-slate-200">
              Permanently delete board{" "}
              <strong className="text-white">“{boardTitle}”</strong>? Linked CRM
              tasks in Tasks (`PG-009`) will remain intact.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="confirm-delete-board-yes"
                onClick={() => deleteBoardMut.mutate({ id: currentBoardId })}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                Delete Board
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-3 py-1 rounded-lg bg-[#040D28] border border-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Inline "Create and assign task" confirmation bar when an ordinary note is assigned */}
        {pendingNoteDropAssign && (
          <div
            data-testid="inline-create-assign-task-prompt"
            className="px-4 py-2 bg-[#0B1739] border-b border-cyan-400/50 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-30"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>
                Convert ordinary note{" "}
                <strong className="text-white">
                  “{pendingNoteDropAssign.noteTitle}”
                </strong>{" "}
                into a CRM Task and assign to{" "}
                <strong className="text-[#FFE394]">
                  {pendingNoteDropAssign.isMyFocus
                    ? "My Focus"
                    : pendingNoteDropAssign.assigneeName}
                </strong>
                ?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="confirm-create-and-assign-task-btn"
                onClick={() => {
                  const noteObj = activePage.objects.find(
                    (o) => o.id === pendingNoteDropAssign.noteId
                  );
                  if (noteObj) {
                    handleConvertNoteToTask(noteObj, {
                      assigneeId: pendingNoteDropAssign.assigneeId,
                      assigneeName: pendingNoteDropAssign.assigneeName,
                      isMyFocus: pendingNoteDropAssign.isMyFocus,
                    });
                  } else {
                    setPendingNoteDropAssign(null);
                  }
                }}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] font-bold cursor-pointer"
              >
                Create and assign task
              </button>
              <button
                type="button"
                onClick={() => setPendingNoteDropAssign(null)}
                className="px-2.5 py-1 rounded-lg bg-[#030B22] border border-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── 2. OPEN CANVAS WORKSPACE + FLOATING RIGHT PAGES TAB + FLOATING BOTTOM TOOLBAR ── */}
        <div className="relative flex-1 flex min-h-0 overflow-hidden">
          <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {surface === "cards" ? (
              <StudioCardsSurface
                taskLinkedObjects={taskLinkedObjects}
                ordinaryNotesCount={ordinaryNotesCount}
                drawingsAndShapesCount={drawingsAndShapesCount}
                tasksById={taskMap}
                teamRoster={teamRoster}
                selectedTaskId={inspectedTaskId}
                canEdit={myRole !== "viewer"}
                onSelectTask={(taskId) => setInspectedTaskId(taskId)}
                onChangeTaskStatus={(taskId, newStatus) =>
                  currentBoardId &&
                  updateStudioTaskMut.mutate({
                    boardId: currentBoardId,
                    taskId,
                    status: newStatus,
                  })
                }
                onAssignTask={(taskId, assigneeId, assigneeName, isMyFocus) =>
                  handleAssignTaskToMember(
                    taskId,
                    assigneeId,
                    assigneeName,
                    isMyFocus
                  )
                }
                onStartTaskDrag={() => {}}
                onEndTaskDrag={() => {}}
                onSwitchToNeonCanvas={() => {
                  setSurface("neon");
                  queueAutosave({ surface: "neon" });
                }}
                onCreateNewTaskNote={(initialStatus) => {
                  if (!currentBoardId || myRole === "viewer") return;
                  const noteId = `note-${Date.now().toString(36)}`;
                  const newNote: StudioCanvasObject = {
                    id: noteId,
                    type: "note",
                    x: 160 + activePage.objects.length * 24,
                    y: 160 + activePage.objects.length * 24,
                    width: 240,
                    height: 170,
                    title: "New Studio Task",
                    text: "",
                    colorKey: "cyan",
                    linkedTaskId: null,
                    isMyFocus: false,
                    priority: "medium",
                    audienceVisible: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  const nextPage: StudioPage = {
                    ...activePage,
                    objects: [...activePage.objects, newNote],
                  };
                  commitPageChange(nextPage, true);
                  convertNoteToTaskMut.mutate(
                    {
                      boardId: currentBoardId,
                      pageId: activePage.id,
                      objectId: noteId,
                      title: "New Studio Task",
                      description: "",
                      priority: "medium",
                    },
                    {
                      onSuccess: (res) => {
                        if (initialStatus !== "not_started") {
                          updateStudioTaskMut.mutate({
                            boardId: currentBoardId,
                            taskId: res.taskId,
                            status: initialStatus,
                          });
                        }
                      },
                    }
                  );
                }}
              />
            ) : (
              <>
                <StudioCanvas
                  surface={surface}
                  activeTool={activeTool}
                  activeColor={activeColor}
                  strokeThickness={strokeThickness}
                  strokes={activePage.strokes}
                  objects={activePage.objects}
                  tasksById={taskMap}
                  teamRoster={teamRoster}
                  selectedObjectId={selectedObjectId}
                  canEdit={myRole !== "viewer"}
                  isPresentationMode={false}
                  hidePrivateTaskMeta={false}
                  hideInternalZoomBar={true}
                  controlledZoom={canvasZoom}
                  onControlledZoomChange={setCanvasZoom}
                  fitViewCounter={fitViewCounter}
                  onSelectObject={(id) => {
                    setSelectedObjectId(id);
                    if (id) {
                      const obj = activePage.objects.find((o) => o.id === id);
                      if (obj?.linkedTaskId) {
                        setInspectedTaskId(obj.linkedTaskId);
                      }
                    }
                  }}
                  onToolChange={(tool) => setActiveTool(tool)}
                  onCommitStrokes={handleCommitStrokes}
                  onCommitObjects={handleCommitObjects}
                  onConvertNoteToTask={(obj) => handleConvertNoteToTask(obj)}
                  onOpenTaskDrawer={(taskId) => setInspectedTaskId(taskId)}
                  onAssignTaskOrNote={(
                    obj,
                    assigneeId,
                    assigneeName,
                    isMyFocus
                  ) => {
                    if (obj.linkedTaskId) {
                      handleAssignTaskToMember(
                        obj.linkedTaskId,
                        assigneeId,
                        assigneeName,
                        isMyFocus
                      );
                    } else {
                      handleConvertNoteToTask(obj, {
                        assigneeId,
                        assigneeName,
                        isMyFocus,
                      });
                    }
                  }}
                  onAddTeachingPage={handleAddPage}
                />

                {/* ── RIGHT-EDGE FLOATING VERTICAL "Pages" PILL & POPOVER ── */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex items-center">
                  {pagesDrawerOpen && (
                    <div
                      data-testid="studio-pages-floating-drawer"
                      className="mr-2 w-60 p-3 rounded-2xl bg-[#090E26]/95 backdrop-blur-xl border border-white/15 shadow-[0_16px_48px_rgba(0,0,0,0.88)] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white pb-1.5 border-b border-white/10">
                        <span>Board Pages ({pages.length})</span>
                        {myRole !== "viewer" && (
                          <button
                            type="button"
                            onClick={handleAddPage}
                            className="text-cyan-300 hover:text-white inline-flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {pages.map((p, idx) => {
                          const isCurrent = p.id === activePage.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              data-testid={`workspace-page-tab-${idx + 1}`}
                              onClick={() => {
                                setActivePageId(p.id);
                                queueAutosave({ activePageId: p.id });
                              }}
                              className={`w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                isCurrent
                                  ? "bg-[#5B35D5]/35 border border-[#8B6DFF] text-white font-semibold"
                                  : "bg-[#0D1330]/80 border border-white/10 text-slate-300 hover:text-white"
                              }`}
                            >
                              <span className="truncate">
                                {idx + 1}. {p.title}
                              </span>
                              {isCurrent && (
                                <Check className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    data-testid="studio-vertical-pages-btn"
                    onClick={() => setPagesDrawerOpen((v) => !v)}
                    className="py-3 px-2 rounded-xl bg-[#0B102B]/92 hover:bg-[#141C42] border border-white/15 text-slate-200 hover:text-white shadow-[0_8px_24px_rgba(0,0,0,0.75)] flex flex-col items-center gap-2 cursor-pointer"
                    title="Toggle Pages Drawer"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-300" />
                    <span
                      style={{ writingMode: "vertical-rl" }}
                      className="text-[11px] font-medium tracking-wider"
                    >
                      Pages
                    </span>
                    <ChevronLeft
                      className={`w-3 h-3 text-slate-400 transition-transform ${
                        pagesDrawerOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* ── BOTTOM-LEFT FLOATING PAGE STEPPER (< 1 / 4 > + Page) & CHANGES SAVED ── */}
                <div className="absolute left-4 bottom-3 z-30 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 px-2 rounded-lg bg-[#0B102B]/92 border border-white/15 shadow-lg inline-flex items-center gap-2 text-xs text-slate-200">
                      <button
                        type="button"
                        disabled={activePageIndex <= 0}
                        onClick={() => handleStepPage(-1)}
                        aria-label="Previous Page"
                        className="p-0.5 text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-medium text-white min-w-[34px] text-center">
                        {activePageIndex + 1} / {totalPagesCount}
                      </span>
                      <button
                        type="button"
                        disabled={activePageIndex >= totalPagesCount - 1}
                        onClick={() => handleStepPage(1)}
                        aria-label="Next Page"
                        className="p-0.5 text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {myRole !== "viewer" && (
                      <button
                        type="button"
                        data-testid="workspace-add-page-btn"
                        onClick={handleAddPage}
                        className="h-8 px-3 rounded-lg bg-[#0B102B]/92 hover:bg-[#141C42] border border-white/15 shadow-lg text-xs font-medium text-slate-200 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Page</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] italic text-slate-400/90 pl-0.5">
                    <Check className="w-3 h-3 text-slate-400 not-italic" />
                    <span>
                      {saveStatus === "saving"
                        ? "Saving changes…"
                        : saveStatus === "unsaved"
                        ? "Unsaved changes"
                        : "Changes saved"}
                    </span>
                  </div>
                </div>

                {/* ── CENTER FLOATING BOTTOM TOOLBAR WITH LABELED TOOLS & COLOR CONTROLS ── */}
                {myRole !== "viewer" && (
                  <div
                    data-testid="studio-canvas-tool-rail"
                    className="absolute left-1/2 -translate-x-1/2 bottom-3.5 z-30 flex flex-col items-start"
                  >
                    {/* Floating Pen / Highlighter Stroke Preview Pill (Shown Above Pen/Highlighter) */}
                    {(activeTool === "pen" || activeTool === "highlighter") && (
                      <div className="relative mb-2.5 ml-9 px-3.5 py-1.5 rounded-xl bg-[#0A0F28]/96 backdrop-blur-xl border border-[#7C5CFC]/45 shadow-[0_8px_28px_rgba(0,0,0,0.85)] flex items-center gap-3 text-xs text-white">
                        <span className="font-semibold">
                          {activeTool === "highlighter" ? "Highlighter" : "Pen"}
                        </span>
                        {/* Live Wavy Neon Stroke SVG Preview */}
                        <svg
                          width="54"
                          height="16"
                          viewBox="0 0 54 16"
                          className="overflow-visible"
                        >
                          <path
                            d="M 2 10 Q 15 2, 27 8 T 52 7"
                            fill="none"
                            stroke={
                              surface === "neon"
                                ? activeColorPalette.neonInk
                                : activeColorPalette.whiteboardInk
                            }
                            strokeWidth={Math.min(8, strokeThickness)}
                            strokeLinecap="round"
                            style={{
                              filter: `drop-shadow(0 0 6px ${activeColorPalette.neonGlow})`,
                            }}
                          />
                        </svg>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-200 hover:text-white cursor-pointer"
                            >
                              <span>{strokeThickness} px</span>
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="center"
                            side="top"
                            className="bg-[#090E26] border border-white/15 text-slate-100 text-xs min-w-[100px]"
                          >
                            {STROKE_THICKNESS_OPTIONS.map((opt) => (
                              <DropdownMenuItem
                                key={opt.value}
                                onClick={() => setStrokeThickness(opt.value)}
                                className="flex items-center justify-between gap-2 cursor-pointer"
                              >
                                <span>{opt.label}</span>
                                {strokeThickness === opt.value && (
                                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Downward Pointer Triangle */}
                        <div className="absolute -bottom-1.5 left-9 w-3 h-3 rotate-45 bg-[#0A0F28] border-r border-b border-[#7C5CFC]/45" />
                      </div>
                    )}

                    {/* Floating Shapes Picker Popover (When Shapes button is clicked) */}
                    {shapesMenuOpen && (
                      <div className="mb-2 self-center px-3 py-2 rounded-xl bg-[#0A0F28]/96 backdrop-blur-xl border border-[#7C5CFC]/45 shadow-2xl flex items-center gap-1.5">
                        {(
                          [
                            { id: "circle", label: "Oval", icon: Circle },
                            { id: "rect", label: "Box", icon: Square },
                            { id: "diamond", label: "Diamond", icon: Diamond },
                            {
                              id: "connector",
                              label: "Arrow",
                              icon: ArrowUpRight,
                            },
                          ] as const
                        ).map((shp) => {
                          const SIcon = shp.icon;
                          const isCurrentShape = activeTool === shp.id;
                          return (
                            <button
                              key={shp.id}
                              type="button"
                              data-testid={`studio-tool-${shp.id}`}
                              onClick={() => {
                                setLastShapeTool(shp.id);
                                setActiveTool(shp.id);
                                setShapesMenuOpen(false);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                                isCurrentShape
                                  ? "bg-[#6C47E5] text-white font-semibold"
                                  : "text-slate-300 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              <SIcon className="w-3.5 h-3.5" />
                              <span>{shp.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Main Floating Bottom Toolbar Dock */}
                    <div className="px-3 py-1.5 rounded-2xl bg-[#090D24]/95 backdrop-blur-xl border border-[#7C5CFC]/50 shadow-[0_14px_44px_rgba(0,0,0,0.88),0_0_24px_rgba(124,92,252,0.24)] flex items-center gap-1 sm:gap-1.5">
                      {/* 8 Labeled Tools */}
                      {(
                        [
                          {
                            id: "select",
                            label: "Select",
                            icon: MousePointer,
                          },
                          { id: "pen", label: "Pen", icon: PenTool },
                          {
                            id: "highlighter",
                            label: "Highlighter",
                            icon: Highlighter,
                          },
                          { id: "eraser", label: "Eraser", icon: Eraser },
                          { id: "text", label: "Text", icon: Type },
                          { id: "note", label: "Note", icon: StickyNote },
                        ] as const
                      ).map((tool) => {
                        const Icon = tool.icon;
                        const isActive = activeTool === tool.id;
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            data-testid={`studio-tool-${tool.id}`}
                            onClick={() => {
                              setShapesMenuOpen(false);
                              setActiveTool(tool.id);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 min-w-[46px] transition-all cursor-pointer ${
                              isActive
                                ? "bg-gradient-to-b from-[#7C5CFC] to-[#5632CC] text-white font-semibold shadow-[0_0_16px_rgba(124,92,252,0.65)]"
                                : "text-slate-300 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-[10px] leading-none">
                              {tool.label}
                            </span>
                          </button>
                        );
                      })}

                      {/* Labeled Shapes Tool Button */}
                      <button
                        type="button"
                        data-testid="studio-tool-shapes"
                        onClick={() => {
                          if (!isShapeToolActive) {
                            setActiveTool(lastShapeTool);
                          }
                          setShapesMenuOpen((v) => !v);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 min-w-[46px] transition-all cursor-pointer ${
                          isShapeToolActive
                            ? "bg-gradient-to-b from-[#7C5CFC] to-[#5632CC] text-white font-semibold shadow-[0_0_16px_rgba(124,92,252,0.65)]"
                            : "text-slate-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Shapes className="w-4 h-4" />
                        <span className="text-[10px] leading-none">Shapes</span>
                      </button>

                      {/* Labeled Pointer Tool Button */}
                      <button
                        type="button"
                        data-testid="studio-tool-pointer"
                        onClick={() => {
                          setShapesMenuOpen(false);
                          setActiveTool("pointer");
                        }}
                        className={`px-2.5 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 min-w-[46px] transition-all cursor-pointer ${
                          activeTool === "pointer"
                            ? "bg-gradient-to-b from-[#7C5CFC] to-[#5632CC] text-white font-semibold shadow-[0_0_16px_rgba(124,92,252,0.65)]"
                            : "text-slate-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-[10px] leading-none">
                          Pointer
                        </span>
                      </button>

                      <div className="h-7 w-px bg-white/12 mx-1" />

                      {/* 6 Color Swatch Circles */}
                      <div className="flex items-center gap-2 px-1">
                        {STUDIO_COLOR_LIST.map((c) => {
                          const isSelected = activeColor === c.key;
                          return (
                            <button
                              key={c.key}
                              type="button"
                              data-testid={`studio-color-${c.key}`}
                              onClick={() => setActiveColor(c.key)}
                              title={c.label}
                              aria-label={`Color ${c.label}`}
                              className={`w-5 h-5 rounded-full transition-all cursor-pointer ${
                                isSelected
                                  ? "scale-110 ring-2 ring-cyan-300 ring-offset-2 ring-offset-[#090D24]"
                                  : "opacity-85 hover:opacity-100 hover:scale-105"
                              }`}
                              style={{
                                backgroundColor: c.swatchHex,
                                boxShadow: isSelected
                                  ? `0 0 12px ${c.neonGlow}`
                                  : undefined,
                              }}
                            />
                          );
                        })}
                      </div>

                      <div className="h-7 w-px bg-white/12 mx-1" />

                      {/* Stroke Thickness Selector Dropdown (≡ 3 px ⌄) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            data-testid="studio-thickness-btn"
                            className="h-8 px-2.5 rounded-xl hover:bg-white/5 text-xs font-medium text-slate-200 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                            title={`Stroke thickness: ${strokeThickness} px`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                            <span>{strokeThickness} px</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="center"
                          side="top"
                          className="bg-[#090E26] border border-white/15 text-slate-100 text-xs min-w-[100px]"
                        >
                          {STROKE_THICKNESS_OPTIONS.map((opt) => (
                            <DropdownMenuItem
                              key={opt.value}
                              onClick={() => setStrokeThickness(opt.value)}
                              className="flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <span>{opt.label}</span>
                              {strokeThickness === opt.value && (
                                <Check className="w-3.5 h-3.5 text-cyan-400" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="h-7 w-px bg-white/12 mx-1" />

                      {/* Labeled Undo & Redo Buttons */}
                      <button
                        type="button"
                        data-testid="studio-undo-btn"
                        disabled={undoStack.length === 0}
                        onClick={handleUndo}
                        title="Undo (Ctrl+Z)"
                        className="px-2 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-35 flex flex-col items-center justify-center gap-1 cursor-pointer"
                      >
                        <Undo2 className="w-4 h-4" />
                        <span className="text-[10px] leading-none">Undo</span>
                      </button>
                      <button
                        type="button"
                        data-testid="studio-redo-btn"
                        disabled={redoStack.length === 0}
                        onClick={handleRedo}
                        title="Redo (Ctrl+Y)"
                        className="px-2 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-35 flex flex-col items-center justify-center gap-1 cursor-pointer"
                      >
                        <Redo2 className="w-4 h-4" />
                        <span className="text-[10px] leading-none">Redo</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── BOTTOM-RIGHT FLOATING VIEWPORT CONTROLS (100% ⌄ | Fit | ••• More) ── */}
                <div className="absolute right-4 bottom-3.5 z-30 flex items-center gap-2">
                  {/* Zoom Percentage Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        data-testid="studio-zoom-dropdown-btn"
                        className="h-8 px-2.5 rounded-lg bg-[#0B102B]/92 hover:bg-[#141C42] border border-white/15 shadow-lg text-xs font-medium text-slate-200 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{Math.round(canvasZoom * 100)}%</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      side="top"
                      className="bg-[#090E26] border border-white/15 text-slate-100 text-xs min-w-[100px]"
                    >
                      {ZOOM_PRESETS.map((z) => (
                        <DropdownMenuItem
                          key={z}
                          onClick={() => setCanvasZoom(z)}
                          className="flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span>{Math.round(z * 100)}%</span>
                          {Math.round(canvasZoom * 100) ===
                            Math.round(z * 100) && (
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Fit Button */}
                  <button
                    type="button"
                    data-testid="studio-fit-to-board-btn"
                    onClick={() => setFitViewCounter((c) => c + 1)}
                    className="h-8 px-2.5 rounded-lg bg-[#0B102B]/92 hover:bg-[#141C42] border border-white/15 shadow-lg text-xs font-medium text-slate-200 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                    title="Fit board to 100%"
                  >
                    <Maximize2 className="w-3 h-3 text-slate-300" />
                    <span>Fit</span>
                  </button>

                  {/* ••• More Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        data-testid="studio-more-menu-btn"
                        className="h-8 px-2.5 rounded-lg bg-[#0B102B]/92 hover:bg-[#141C42] border border-white/15 shadow-lg text-xs font-medium text-slate-200 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5 text-slate-300" />
                        <span>More</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      side="top"
                      className="w-52 bg-[#090E26] border border-white/15 text-slate-100 text-xs"
                    >
                      <DropdownMenuItem
                        onClick={() => setNameModalMode("create")}
                        className="cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-2 text-cyan-300" />
                        <span>New Board…</span>
                      </DropdownMenuItem>
                      {myRole !== "viewer" && (
                        <DropdownMenuItem
                          onClick={() => setNameModalMode("rename")}
                          className="cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-2" />
                          <span>Rename Board…</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() =>
                          currentBoardId &&
                          duplicateBoardMut.mutate({ id: currentBoardId })
                        }
                        className="cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        <span>Duplicate Board</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleOpenAudienceWindow}
                        className="cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-2 text-cyan-300" />
                        <span>Open Audience Window</span>
                      </DropdownMenuItem>
                      {myRole !== "viewer" && (
                        <>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={handleClearCurrentPage}
                            className="text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            <span>Clear Current Page</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>

          {/* Right Collapsible Task Inspector Drawer (Opens when a task badge is clicked) */}
          <StudioTaskDrawer
            task={inspectedTask}
            isOpen={Boolean(inspectedTask) && !isPresenting}
            boardTitle={boardTitle}
            pageTitle={activePage.title}
            teamRoster={teamRoster}
            canEdit={myRole !== "viewer"}
            onClose={() => setInspectedTaskId(null)}
            onUpdateTask={(payload) =>
              currentBoardId &&
              updateStudioTaskMut.mutate({
                boardId: currentBoardId,
                ...payload,
              })
            }
            onAddChecklistItem={(taskId, title) =>
              addChecklistMut.mutate({ taskId, title })
            }
            onToggleChecklistItem={(taskId, subtaskId, isComplete) =>
              toggleChecklistMut.mutate({ taskId, subtaskId, isComplete })
            }
            onDeleteChecklistItem={(taskId, subtaskId) =>
              deleteChecklistMut.mutate({ taskId, subtaskId })
            }
            onOpenFullTaskPage={(taskId) =>
              setLocation(`/tasks?taskId=${taskId}`)
            }
          />
        </div>

        {/* ── 3. FULL-SCREEN TEACHING / PRESENTATION MODE OVERLAY ── */}
        {isPresenting && (
          <StudioPresentationOverlay
            boardTitle={boardTitle}
            surface={surface === "whiteboard" ? "whiteboard" : "neon"}
            pages={pages}
            activePageIndex={activePageIndex}
            activeTool={activeTool}
            activeColor={activeColor}
            strokeThickness={strokeThickness}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onToolChange={(t) => setActiveTool(t)}
            onColorChange={(c) => setActiveColor(c)}
            onThicknessChange={(th) => setStrokeThickness(th)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onSelectPageIndex={(idx) => {
              const target = pages[idx];
              if (target) {
                setActivePageId(target.id);
                queueAutosave({ activePageId: target.id });
              }
            }}
            onAddPage={handleAddPage}
            onClearCurrentPage={handleClearCurrentPage}
            onSurfaceToggle={(s) => {
              setSurface(s);
              queueAutosave({ surface: s });
            }}
            onOpenAudienceWindow={handleOpenAudienceWindow}
            onOpenAudienceFilterModal={() => setShareModalOpen(true)}
            onExitPresentation={() => {
              flushSaveNow();
              setIsPresenting(false);
            }}
          >
            <StudioCanvas
              surface={surface === "whiteboard" ? "whiteboard" : "neon"}
              activeTool={activeTool}
              activeColor={activeColor}
              strokeThickness={strokeThickness}
              strokes={activePage.strokes}
              objects={activePage.objects}
              tasksById={taskMap}
              teamRoster={teamRoster}
              selectedObjectId={selectedObjectId}
              canEdit={myRole !== "viewer"}
              isPresentationMode={true}
              hidePrivateTaskMeta={true}
              hideInternalZoomBar={true}
              onSelectObject={(id) => setSelectedObjectId(id)}
              onToolChange={(t) => setActiveTool(t)}
              onCommitStrokes={handleCommitStrokes}
              onCommitObjects={handleCommitObjects}
              onConvertNoteToTask={() => {}}
              onOpenTaskDrawer={() => {}}
              onAssignTaskOrNote={() => {}}
              onAddTeachingPage={handleAddPage}
              onPointerMoveBroadcast={(pos) => {
                if (currentBoardId) {
                  broadcastStudioSync({
                    boardId: currentBoardId,
                    activePageId: activePage.id,
                    surface: surface === "whiteboard" ? "whiteboard" : "neon",
                    pages,
                    pointerPos: pos,
                  });
                }
              }}
            />
          </StudioPresentationOverlay>
        )}

        {/* ── 4. SHARE / ACCESS & BOARD NAME MODALS ── */}
        <StudioShareAccessModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          boardId={currentBoardId || "brd-default-studio"}
          boardTitle={boardTitle}
          myRole={myRole}
          pages={pages}
          access={accessSettings}
          teamRoster={teamRoster}
          onSaveAccess={(nextAccess) => {
            setAccessSettings(nextAccess);
            flushSaveNow({ accessSettings: nextAccess });
          }}
          onLaunchPresentation={() => {
            if (surface === "cards") setSurface("neon");
            flushSaveNow();
            setIsPresenting(true);
          }}
          onOpenAudienceWindow={handleOpenAudienceWindow}
        />

        <StudioBoardNameModal
          mode={nameModalMode}
          initialTitle={nameModalMode === "rename" ? boardTitle : ""}
          onClose={() => setNameModalMode(null)}
          onSubmit={(title, defaultSurface) => {
            if (nameModalMode === "create") {
              createBoardMut.mutate({
                title,
                defaultSurface: defaultSurface || "neon",
              });
            } else if (nameModalMode === "rename" && currentBoardId) {
              renameBoardMut.mutate({ id: currentBoardId, title });
            }
          }}
        />
      </div>
    </ScopedErrorBoundary>
  );
}

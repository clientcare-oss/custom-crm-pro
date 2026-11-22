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

export default function Studio() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // ── Board & Workspace State ───────────────────────────────────────────────
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [showArchivedBoards, setShowArchivedBoards] = useState(false);
  const [boardTitle, setBoardTitle] = useState("IEP Strategy & Live Teaching Studio");
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

  // ── Active Tool & Drawing State ───────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<StudioToolId>("select");
  const [activeColor, setActiveColor] = useState<StudioColorKey>("cyan");
  const [strokeThickness, setStrokeThickness] = useState<number>(4);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [inspectedTaskId, setInspectedTaskId] = useState<number | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const [nameModalMode, setNameModalMode] = useState<"create" | "rename" | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingNoteDropAssign, setPendingNoteDropAssign] = useState<{
    noteId: string;
    noteTitle: string;
    assigneeId: number | null;
    assigneeName: string;
    isMyFocus: boolean;
  } | null>(null);
  const [dragHoverTarget, setDragHoverTarget] = useState<string | null>(null);
  const [showMyFocusPopover, setShowMyFocusPopover] = useState(false);

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
    setBoardTitle(data.title);
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

  // Sync browser fullscreen state
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.info("Fullscreen mode toggled.");
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
      toast.error(`Save failed: ${err.message}. Your work is preserved locally.`);
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
      // Attach linkedTaskId to the sticky note on the canvas without duplicating
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
      // Sync sticky note title/focus on canvas if linked
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

  // Collect task-linked objects and count non-task items for Cards view banner explanation
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

  // ── Assignment Actions (Drag-and-Drop + Click-to-Assign) ──────────────────
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

  // Handle dropping a canvas note or task card onto a Teammate avatar or My Focus
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
          // Ordinary note dropped onto Teammate or My Focus -> Offer inline "Create and assign task" confirmation
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

  return (
    <ScopedErrorBoundary moduleName="The Studio (PG-049)">
      <div
        data-testid="studio-workspace-root"
        className="h-[calc(100vh-3.5rem)] w-full bg-[#000820] text-white flex flex-col overflow-hidden select-none"
      >
        {/* ── 1. TOP WORKSPACE BAR ── */}
        <header className="h-13 px-3 sm:px-4 bg-[#020A24]/95 border-b border-[#182954] flex items-center justify-between gap-2 shrink-0 z-20">
          {/* Left: Studio Badge + Board Switcher Dropdown + Honest Save Status + New Board */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#07143A] border border-cyan-400/30">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-cyan-200">
                THE STUDIO
              </span>
              <span className="text-[10px] font-mono text-[#FFE394] ml-0.5">
                PG-049
              </span>
            </div>

            {/* Board Switching Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="studio-board-switcher-btn"
                  className="h-8.5 px-3 rounded-xl bg-[#051235] hover:bg-[#091D52] border border-[#243B74] text-xs sm:text-sm font-serif font-bold text-white inline-flex items-center gap-2 max-w-[220px] sm:max-w-[280px] cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <span className="truncate">{boardTitle}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-72 bg-[#040D28] border border-[#243B74] text-slate-100 text-xs"
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

                <DropdownMenuSeparator className="bg-[#182954]" />
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
                    <DropdownMenuSeparator className="bg-[#182954]" />
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

            {/* Quick + New Board Button */}
            <button
              type="button"
              data-testid="studio-new-board-top-btn"
              onClick={() => setNameModalMode("create")}
              title="Create a new Studio board"
              className="h-8 px-2.5 rounded-xl bg-[#051235] hover:bg-[#091D52] border border-[#243B74] text-xs font-semibold text-cyan-200 hover:text-white inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">New Board</span>
            </button>

            {/* Honest Save-State Indicator */}
            <div
              data-testid="studio-save-status-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#040D28] border border-[#182954] text-[11px]"
            >
              {saveStatus === "saved" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300 font-medium">Saved</span>
                </>
              )}
              {saveStatus === "saving" && (
                <>
                  <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                  <span className="text-cyan-300 font-medium">Saving…</span>
                </>
              )}
              {saveStatus === "unsaved" && (
                <button
                  type="button"
                  onClick={() => flushSaveNow()}
                  className="flex items-center gap-1.5 text-[#FFE394] hover:underline cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-[#FFE394]" />
                  <span>Unsaved changes</span>
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

          {/* Center: Surface Selector (Whiteboard | Neon [default] | Cards) */}
          <div
            data-testid="studio-surface-selector"
            className="flex items-center p-1 rounded-xl bg-[#040D26] border border-[#1E3264] shrink-0"
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
                  className={`h-7 px-2.5 sm:px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? s.id === "neon"
                        ? "bg-gradient-to-r from-cyan-500/25 to-violet-500/25 border border-cyan-400/60 text-white shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                        : s.id === "whiteboard"
                        ? "bg-white text-slate-950 font-bold shadow"
                        : "bg-[#0C2154] border border-[#FFE394]/60 text-[#FFE394]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{s.label}</span>
                  {s.id === "cards" && tasks.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                      {tasks.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Go Full Screen | Share/Access | Present */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="studio-workspace-fullscreen-btn"
              onClick={toggleBrowserFullscreen}
              title={isFullscreen ? "Exit Full Screen" : "Go Full Screen"}
              className="h-8 px-2.5 rounded-xl bg-[#051235] hover:bg-[#091D52] border border-[#243B74] text-xs font-medium text-slate-200 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="hidden xl:inline">Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="hidden xl:inline">Go Full Screen</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="studio-share-access-btn"
              onClick={() => setShareModalOpen(true)}
              className="h-8 px-3 rounded-xl bg-[#051235] hover:bg-[#091D52] border border-[#243B74] text-xs font-semibold text-slate-200 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Share</span>
            </button>

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
              className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] text-xs font-extrabold border border-[#FFE394]/60 shadow-[0_3px_12px_rgba(0,0,0,0.7)] hover:brightness-110 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Present</span>
            </button>
          </div>
        </header>

        {/* Save Error Banner (if a save failed, visibly alert without discarding local edits) */}
        {saveStatus === "error" && (
          <div
            data-testid="studio-save-error-banner"
            className="px-4 py-1.5 bg-rose-950/90 border-b border-rose-500/50 flex items-center justify-between text-xs text-rose-100 shrink-0"
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
            className="px-4 py-2 bg-[#160B24] border-b border-rose-500/50 flex items-center justify-between text-xs shrink-0"
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
                onClick={() =>
                  deleteBoardMut.mutate({ id: currentBoardId })
                }
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                Delete Board
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-3 py-1 rounded-lg bg-[#040D28] border border-[#1E3264] text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── 2. SUB-BAR: COMPACT TEAM ASSIGNMENT BAR & PAGE SWITCHER (Editing Mode) ── */}
        <div className="min-h-11 px-3 sm:px-4 py-1.5 bg-[#02081D] border-b border-[#14234A] flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
          {/* Left: Compact Assignment Area (Teammate Avatars + My Focus Drop Target) */}
          <div
            data-testid="studio-assignment-area"
            className="flex items-center gap-1.5 overflow-x-auto max-w-full"
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1 shrink-0">
              Assign (Drag or Click):
            </span>

            {/* "My Focus" Drop Target */}
            <div className="relative">
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
                        noteTitle: selObj.title || selObj.text || "Sticky Note",
                        assigneeId: currentUserNumericId,
                        assigneeName: user?.name || "My Focus",
                        isMyFocus: true,
                      });
                    }
                  } else {
                    setShowMyFocusPopover((v) => !v);
                  }
                }}
                className={`h-7.5 px-2.5 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  dragHoverTarget === "my-focus"
                    ? "bg-[#FFE394]/30 border-[#FFE394] text-white scale-105 shadow-[0_0_16px_rgba(255,227,148,0.45)]"
                    : "bg-[#1A160B] border-[#C5A059]/60 text-[#FFE394] hover:border-[#FFE394]"
                }`}
              >
                <Target className="w-3.5 h-3.5 text-[#FFE394]" />
                <span>My Focus</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#FFE394]/20 text-[#FFE394] text-[10px] font-mono">
                  {myFocusTasks.length}
                </span>
              </button>

              {/* Personal My Focus List Popover */}
              {showMyFocusPopover && (
                <div
                  data-testid="my-focus-popover"
                  className="absolute left-0 top-9 z-40 w-72 p-3 rounded-2xl bg-[#040D28] border border-[#C5A059]/60 shadow-2xl space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#FFE394] pb-1.5 border-b border-[#182954]">
                    <span>My Focus Personal List ({myFocusTasks.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowMyFocusPopover(false)}
                      className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  {myFocusTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Drag any task or sticky note onto My Focus to pin it here.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {myFocusTasks.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setInspectedTaskId(t.id);
                            setShowMyFocusPopover(false);
                          }}
                          className="w-full p-2 rounded-lg bg-[#02081A] hover:bg-[#07163B] border border-[#182954] text-left flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="text-xs text-white truncate">
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
              )}
            </div>

            {/* Teammate Avatars with Names */}
            {teamRoster.map((member, mIdx) => {
              const targetKey = `member-${member.id}`;
              const isHover = dragHoverTarget === targetKey;
              const badgeColor = AVATAR_COLORS[mIdx % AVATAR_COLORS.length];
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
                        `Select or drag a note/task onto ${member.name} to assign it.`
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
                        noteTitle: selObj.title || selObj.text || "Sticky Note",
                        assigneeId: member.id,
                        assigneeName: member.name,
                        isMyFocus: false,
                      });
                    }
                  }}
                  className={`h-7.5 pl-1.5 pr-2.5 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isHover
                      ? "bg-cyan-500/30 border-cyan-300 text-white scale-105 shadow-[0_0_14px_rgba(34,211,238,0.45)]"
                      : "bg-[#04102E] border-[#1E3264] text-slate-200 hover:border-cyan-400/50 hover:text-white"
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0"
                    style={{ backgroundColor: badgeColor }}
                  >
                    {member.initials}
                  </span>
                  <span className="truncate max-w-[110px]">{member.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Multi-Page Teaching Tabs (Page 1, Page 2, + Add Page) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
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
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 font-bold"
                      : "bg-[#040D26] border border-[#182954] text-slate-400 hover:text-white"
                  }`}
                >
                  {p.title}
                </button>
              );
            })}
            {myRole !== "viewer" && (
              <button
                type="button"
                data-testid="workspace-add-page-btn"
                onClick={handleAddPage}
                className="h-7 px-2.5 rounded-lg bg-[#051235] hover:bg-[#0A1F56] border border-[#243B74] text-xs font-semibold text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Page</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline "Create and assign task" confirmation bar when an ordinary note is dropped onto a Teammate or My Focus */}
        {pendingNoteDropAssign && (
          <div
            data-testid="inline-create-assign-task-prompt"
            className="px-4 py-2 bg-[#071A3E] border-b border-cyan-400/50 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-20"
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
                className="px-2.5 py-1 rounded-lg bg-[#030B22] border border-[#1E3264] text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── 3. MAIN WORKSPACE AREA (Left Tool Rail + Dominating Canvas / Cards + Collapsible Right Task Drawer) ── */}
        <div className="relative flex-1 flex min-h-0 overflow-hidden">
          {/* Left Vertical Canvas Tool Rail (Shown on Neon & Whiteboard surfaces) */}
          {surface !== "cards" && myRole !== "viewer" && (
            <aside
              data-testid="studio-canvas-tool-rail"
              className="w-14 bg-[#020922] border-r border-[#182954] py-2.5 px-1.5 flex flex-col items-center justify-between gap-2 z-20 overflow-y-auto shrink-0"
            >
              {/* Primary Tools */}
              <div className="flex flex-col items-center gap-1 w-full">
                {(
                  [
                    { id: "select", label: "Select & Move (V)", icon: MousePointer },
                    { id: "pen", label: "Pen (P)", icon: PenTool },
                    { id: "highlighter", label: "Highlighter (H)", icon: Highlighter },
                    { id: "eraser", label: "Eraser (E)", icon: Eraser },
                    { id: "text", label: "Typed Text (T)", icon: Type },
                    { id: "note", label: "Sticky Note (N)", icon: StickyNote },
                    { id: "rect", label: "Rectangle Shape", icon: Square },
                    { id: "circle", label: "Circle Shape", icon: Circle },
                    { id: "diamond", label: "Diamond Shape", icon: Diamond },
                    { id: "connector", label: "Connector / Arrow", icon: ArrowUpRight },
                    { id: "pointer", label: "Laser Pointer", icon: Sparkles },
                  ] as const
                ).map((tool) => {
                  const Icon = tool.icon;
                  const isActive = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      data-testid={`studio-tool-${tool.id}`}
                      onClick={() => setActiveTool(tool.id)}
                      title={tool.label}
                      aria-label={tool.label}
                      className={`w-10 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-b from-cyan-400/25 to-violet-500/25 border border-cyan-300 text-white shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>

              {/* 6 Color Swatches & Stroke Thickness & Undo/Redo */}
              <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-[#182954] w-full">
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
                          ? "scale-125 ring-2 ring-white"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: c.swatchHex,
                        boxShadow: isSelected
                          ? `0 0 10px ${c.neonGlow}`
                          : undefined,
                      }}
                    />
                  );
                })}

                {/* Thickness cycle button */}
                <button
                  type="button"
                  data-testid="studio-thickness-btn"
                  onClick={() => {
                    const idx = STROKE_THICKNESS_OPTIONS.findIndex(
                      (o) => o.value === strokeThickness
                    );
                    const next =
                      STROKE_THICKNESS_OPTIONS[
                        (idx + 1) % STROKE_THICKNESS_OPTIONS.length
                      ];
                    setStrokeThickness(next.value);
                  }}
                  title={`Stroke thickness: ${strokeThickness}px`}
                  className="mt-1 w-10 h-6 rounded-lg bg-[#051235] border border-[#243B74] text-[10px] font-mono text-cyan-200 hover:border-cyan-400 cursor-pointer"
                >
                  {strokeThickness}px
                </button>

                {/* Undo / Redo */}
                <div className="flex flex-col items-center gap-1 mt-1">
                  <button
                    type="button"
                    data-testid="studio-undo-btn"
                    disabled={undoStack.length === 0}
                    onClick={handleUndo}
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo"
                    className="w-9 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    data-testid="studio-redo-btn"
                    disabled={redoStack.length === 0}
                    onClick={handleRedo}
                    title="Redo (Ctrl+Y)"
                    aria-label="Redo"
                    className="w-9 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* Center Dominating Surface: Neon / Whiteboard Canvas OR Cards View */}
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
                onAssignTaskOrNote={(obj, assigneeId, assigneeName, isMyFocus) => {
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
            )}
          </div>

          {/* Right Collapsible Task Inspector Drawer (Opens only when a task is selected) */}
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

        {/* ── 4. FULL-SCREEN TEACHING / PRESENTATION MODE OVERLAY ── */}
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

        {/* ── 5. SHARE / ACCESS & BOARD NAME MODALS ── */}
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

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  CheckSquare,
  Plus,
  Trash2,
  Copy,
  UserPlus,
  GripHorizontal,
  PenTool,
  StickyNote,
  FilePlus2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Target,
  Sparkles,
} from "lucide-react";
import {
  STUDIO_COLORS,
  STUDIO_COLOR_LIST,
  type StudioColorKey,
  type StudioToolId,
  type StudioStroke,
  type StudioStrokePoint,
  type StudioCanvasObject,
  type StudioTaskRecord,
} from "./studioTypes";

interface LaserTrailPoint {
  x: number;
  y: number;
  ts: number;
}

interface StudioCanvasProps {
  surface: "neon" | "whiteboard";
  activeTool: StudioToolId;
  activeColor: StudioColorKey;
  strokeThickness: number;
  strokes: StudioStroke[];
  objects: StudioCanvasObject[];
  tasksById: Map<number, StudioTaskRecord>;
  teamRoster: { id: number; name: string; role: string; initials: string }[];
  selectedObjectId: string | null;
  canEdit: boolean;
  isPresentationMode?: boolean;
  hidePrivateTaskMeta?: boolean;
  remotePointerPos?: { x: number; y: number } | null;
  onSelectObject: (id: string | null) => void;
  onToolChange: (tool: StudioToolId) => void;
  onCommitStrokes: (nextStrokes: StudioStroke[]) => void;
  onCommitObjects: (nextObjects: StudioCanvasObject[]) => void;
  onConvertNoteToTask: (obj: StudioCanvasObject) => void;
  onOpenTaskDrawer: (taskId: number, objectId: string) => void;
  onAssignTaskOrNote: (
    obj: StudioCanvasObject,
    assigneeId: number | null,
    assigneeName: string | null,
    isMyFocus?: boolean
  ) => void;
  onStartDragItem?: (payload: {
    type: "task" | "note";
    objectId: string;
    taskId?: number | null;
    title: string;
  }) => void;
  onEndDragItem?: () => void;
  onAddTeachingPage?: () => void;
  onPointerMoveBroadcast?: (pos: { x: number; y: number } | null) => void;
}

export function StudioCanvas({
  surface,
  activeTool,
  activeColor,
  strokeThickness,
  strokes,
  objects,
  tasksById,
  teamRoster,
  selectedObjectId,
  canEdit,
  isPresentationMode = false,
  hidePrivateTaskMeta = false,
  remotePointerPos = null,
  onSelectObject,
  onToolChange,
  onCommitStrokes,
  onCommitObjects,
  onConvertNoteToTask,
  onOpenTaskDrawer,
  onAssignTaskOrNote,
  onStartDragItem,
  onEndDragItem,
  onAddTeachingPage,
  onPointerMoveBroadcast,
}: StudioCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport Zoom & Pan state (bounded within container — never causes horizontal page scrolling)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Freehand Drawing State
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<StudioStrokePoint[]>([]);
  const [liveStroke, setLiveStroke] = useState<StudioStroke | null>(null);

  // Temporary Laser Pointer Trail State
  const laserPointsRef = useRef<LaserTrailPoint[]>([]);
  const [laserTick, setLaserTick] = useState(0);

  // Connector / Shape creation drag state
  const [draftObject, setDraftObject] = useState<StudioCanvasObject | null>(null);

  // Object Dragging / Resizing State
  const dragObjStateRef = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origEndX?: number;
    origEndY?: number;
  } | null>(null);

  // Convert screen coordinates to board canvas coordinates
  const toBoardCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;
      return { x: Math.round(x), y: Math.round(y) };
    },
    [pan.x, pan.y, zoom]
  );

  // Laser trail fade animation loop
  useEffect(() => {
    if (laserPointsRef.current.length === 0) return;
    const timer = requestAnimationFrame(() => {
      const now = Date.now();
      laserPointsRef.current = laserPointsRef.current.filter((p) => now - p.ts < 850);
      setLaserTick((t) => t + 1);
    });
    return () => cancelAnimationFrame(timer);
  }, [laserTick]);

  // Render smooth freehand strokes & temporary laser pointer on high-DPI HTML5 canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Apply zoom & pan transform
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const allStrokes = liveStroke ? [...strokes, liveStroke] : strokes;

    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      const palette = STUDIO_COLORS[stroke.colorKey] || STUDIO_COLORS.cyan;
      const inkColor = surface === "neon" ? palette.neonInk : palette.whiteboardInk;
      const glowColor = surface === "neon" ? palette.neonGlow : palette.whiteboardGlow;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "highlighter") {
        ctx.globalAlpha = surface === "neon" ? 0.36 : 0.32;
        ctx.lineWidth = stroke.thickness * 2.8;
        ctx.strokeStyle = inkColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = surface === "neon" ? 14 : 0;
      } else {
        ctx.globalAlpha = 1;
        ctx.lineWidth = stroke.thickness;
        ctx.strokeStyle = inkColor;
        // Controlled readable neon glow on Neon surface
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = surface === "neon" ? Math.min(12, stroke.thickness * 1.8 + 4) : 0;
      }

      ctx.beginPath();
      const pts = stroke.points;
      ctx.moveTo(pts[0].x, pts[0].y);

      if (pts.length === 1) {
        ctx.lineTo(pts[0].x + 0.5, pts[0].y + 0.5);
      } else {
        for (let i = 1; i < pts.length - 1; i++) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Render Temporary Laser Pointer Trail (Never leaves permanent marks)
    const now = Date.now();
    const activeLaser = laserPointsRef.current.filter((p) => now - p.ts < 850);
    if (activeLaser.length > 1) {
      for (let i = 1; i < activeLaser.length; i++) {
        const p0 = activeLaser[i - 1];
        const p1 = activeLaser[i];
        const age = Math.max(0, 1 - (now - p1.ts) / 850);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = `rgba(34, 211, 238, ${age * 0.9})`;
        ctx.lineWidth = 4 * age + 1.5;
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(34, 211, 238, 0.95)";
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      }
      const head = activeLaser[activeLaser.length - 1];
      ctx.save();
      ctx.beginPath();
      ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#F8FAFC";
      ctx.shadowColor = "#22D3EE";
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.restore();
    }

    // Remote audience laser pointer dot
    if (remotePointerPos) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(remotePointerPos.x, remotePointerPos.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#22D3EE";
      ctx.shadowColor = "#22D3EE";
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }, [strokes, liveStroke, surface, zoom, pan, laserTick, remotePointerPos]);

  // Erase strokes near (x, y)
  const eraseAtPoint = useCallback(
    (x: number, y: number) => {
      const radius = 22;
      const remainingStrokes = strokes.filter((st) =>
        !st.points.some((pt) => Math.hypot(pt.x - x, pt.y - y) <= radius)
      );
      if (remainingStrokes.length !== strokes.length) {
        onCommitStrokes(remainingStrokes);
      }
    },
    [strokes, onCommitStrokes]
  );

  // Canvas Pointer Down handler
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      return;
    }

    const pt = toBoardCoords(e.clientX, e.clientY);

    if (activeTool === "pointer") {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      laserPointsRef.current.push({ x: pt.x, y: pt.y, ts: Date.now() });
      setLaserTick((t) => t + 1);
      onPointerMoveBroadcast?.(pt);
      return;
    }

    if (!canEdit) return;

    if (activeTool === "pen" || activeTool === "highlighter") {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      onSelectObject(null);
      const startPt: StudioStrokePoint = {
        x: pt.x,
        y: pt.y,
        pressure: e.pressure || 0.5,
      };
      currentPointsRef.current = [startPt];
      setLiveStroke({
        id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tool: activeTool,
        colorKey: activeColor,
        thickness: strokeThickness,
        points: [startPt],
        createdAt: new Date().toISOString(),
      });
      return;
    }

    if (activeTool === "eraser") {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      eraseAtPoint(pt.x, pt.y);
      return;
    }

    if (activeTool === "note") {
      const now = new Date().toISOString();
      const newNote: StudioCanvasObject = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "note",
        x: Math.max(24, pt.x - 115),
        y: Math.max(24, pt.y - 75),
        width: 235,
        height: 155,
        title: "New Studio Note",
        text: "Click to write ideas, or click 'Make task' to link with CRM Tasks.",
        colorKey: activeColor,
        audienceVisible: true,
        createdAt: now,
        updatedAt: now,
      };
      onCommitObjects([...objects, newNote]);
      onSelectObject(newNote.id);
      onToolChange("select");
      return;
    }

    if (activeTool === "text") {
      const now = new Date().toISOString();
      const newText: StudioCanvasObject = {
        id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "text",
        x: Math.max(24, pt.x - 40),
        y: Math.max(24, pt.y - 18),
        width: 320,
        height: 48,
        text: "Typed Heading or Teaching Point",
        colorKey: activeColor,
        fontSize: 22,
        audienceVisible: true,
        createdAt: now,
        updatedAt: now,
      };
      onCommitObjects([...objects, newText]);
      onSelectObject(newText.id);
      onToolChange("select");
      return;
    }

    if (
      activeTool === "rect" ||
      activeTool === "circle" ||
      activeTool === "diamond"
    ) {
      const now = new Date().toISOString();
      const newShape: StudioCanvasObject = {
        id: `shp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: activeTool,
        x: Math.max(24, pt.x - 100),
        y: Math.max(24, pt.y - 60),
        width: 210,
        height: 120,
        title:
          activeTool === "diamond"
            ? "Decision Point"
            : activeTool === "circle"
            ? "Core Concept"
            : "Process Block",
        text: "",
        colorKey: activeColor,
        strokeWidth: 2,
        audienceVisible: true,
        createdAt: now,
        updatedAt: now,
      };
      onCommitObjects([...objects, newShape]);
      onSelectObject(newShape.id);
      onToolChange("select");
      return;
    }

    if (activeTool === "connector") {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const now = new Date().toISOString();
      setDraftObject({
        id: `con-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "connector",
        x: pt.x,
        y: pt.y,
        width: 120,
        height: 0,
        endX: pt.x + 120,
        endY: pt.y,
        colorKey: activeColor,
        strokeWidth: 3,
        audienceVisible: true,
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    if (activeTool === "select") {
      onSelectObject(null);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning && panStartRef.current) {
      setPan({
        x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
        y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
      });
      return;
    }

    const pt = toBoardCoords(e.clientX, e.clientY);

    if (activeTool === "pointer" && isDrawingRef.current) {
      laserPointsRef.current.push({ x: pt.x, y: pt.y, ts: Date.now() });
      setLaserTick((t) => t + 1);
      onPointerMoveBroadcast?.(pt);
      return;
    }

    if (!canEdit) return;

    if (
      (activeTool === "pen" || activeTool === "highlighter") &&
      isDrawingRef.current &&
      liveStroke
    ) {
      const nextPt: StudioStrokePoint = {
        x: pt.x,
        y: pt.y,
        pressure: e.pressure || 0.5,
      };
      currentPointsRef.current.push(nextPt);
      setLiveStroke({
        ...liveStroke,
        points: [...currentPointsRef.current],
      });
      return;
    }

    if (activeTool === "eraser" && isDrawingRef.current) {
      eraseAtPoint(pt.x, pt.y);
      return;
    }

    if (draftObject && draftObject.type === "connector") {
      setDraftObject({
        ...draftObject,
        endX: pt.x,
        endY: pt.y,
      });
      return;
    }

    if (dragObjStateRef.current) {
      const st = dragObjStateRef.current;
      const dx = (e.clientX - st.startX) / zoom;
      const dy = (e.clientY - st.startY) / zoom;

      const updated = objects.map((obj) => {
        if (obj.id !== st.id) return obj;
        if (st.mode === "move") {
          if (obj.type === "connector") {
            return {
              ...obj,
              x: Math.round(st.origX + dx),
              y: Math.round(st.origY + dy),
              endX: Math.round((st.origEndX ?? st.origX + 120) + dx),
              endY: Math.round((st.origEndY ?? st.origY) + dy),
            };
          }
          return {
            ...obj,
            x: Math.max(8, Math.round(st.origX + dx)),
            y: Math.max(8, Math.round(st.origY + dy)),
          };
        } else {
          return {
            ...obj,
            width: Math.max(120, Math.round(st.origW + dx)),
            height: Math.max(44, Math.round(st.origH + dy)),
          };
        }
      });
      onCommitObjects(updated);
    }
  };

  const handleCanvasPointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }

    if (activeTool === "pointer" && isDrawingRef.current) {
      isDrawingRef.current = false;
      onPointerMoveBroadcast?.(null);
      return;
    }

    if (
      (activeTool === "pen" || activeTool === "highlighter") &&
      isDrawingRef.current &&
      liveStroke
    ) {
      isDrawingRef.current = false;
      onCommitStrokes([...strokes, liveStroke]);
      setLiveStroke(null);
      currentPointsRef.current = [];
      return;
    }

    if (activeTool === "eraser" && isDrawingRef.current) {
      isDrawingRef.current = false;
      return;
    }

    if (draftObject) {
      onCommitObjects([...objects, draftObject]);
      onSelectObject(draftObject.id);
      setDraftObject(null);
      onToolChange("select");
      return;
    }

    if (dragObjStateRef.current) {
      dragObjStateRef.current = null;
    }
  };

  const handleFitToBoard = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleUpdateSingleObject = (
    id: string,
    patch: Partial<StudioCanvasObject>
  ) => {
    if (!canEdit) return;
    onCommitObjects(
      objects.map((o) =>
        o.id === id
          ? { ...o, ...patch, updatedAt: new Date().toISOString() }
          : o
      )
    );
  };

  const handleDeleteObject = (id: string) => {
    if (!canEdit) return;
    onCommitObjects(objects.filter((o) => o.id !== id));
    if (selectedObjectId === id) onSelectObject(null);
  };

  const handleDuplicateObject = (obj: StudioCanvasObject) => {
    if (!canEdit) return;
    const now = new Date().toISOString();
    const copy: StudioCanvasObject = {
      ...obj,
      id: `${obj.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: obj.x + 28,
      y: obj.y + 28,
      // Do NOT duplicate linkedTaskId when duplicating a note on the canvas!
      linkedTaskId: null,
      createdAt: now,
      updatedAt: now,
    };
    onCommitObjects([...objects, copy]);
    onSelectObject(copy.id);
  };

  const isDrawingMode =
    activeTool === "pen" ||
    activeTool === "highlighter" ||
    activeTool === "eraser" ||
    activeTool === "pointer";

  const isBoardEmpty = strokes.length === 0 && objects.length === 0;
  const allConnectors = [
    ...objects.filter((o) => o.type === "connector"),
    ...(draftObject && draftObject.type === "connector" ? [draftObject] : []),
  ];

  return (
    <div
      ref={containerRef}
      data-testid={`studio-canvas-${surface}`}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      style={{
        touchAction: "none",
        backgroundColor: surface === "neon" ? "#01081F" : "#F8FAFC",
        backgroundImage:
          surface === "neon"
            ? "radial-gradient(ellipse at 50% 35%, rgba(30, 58, 138, 0.24) 0%, rgba(1, 8, 31, 0.96) 70%), radial-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px)"
            : "radial-gradient(rgba(100, 116, 139, 0.22) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 28px 28px",
      }}
      className={`relative flex-1 w-full h-full overflow-hidden select-none ${
        activeTool === "pen" || activeTool === "highlighter"
          ? "cursor-crosshair"
          : activeTool === "eraser"
          ? "cursor-cell"
          : activeTool === "pointer"
          ? "cursor-crosshair"
          : "cursor-default"
      }`}
    >
      {/* Subtle Top & Corner Ambient Illumination on Neon Surface */}
      {surface === "neon" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 15%, rgba(34, 211, 238, 0.07) 0%, transparent 45%), radial-gradient(circle at 82% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 45%)",
          }}
        />
      )}

      {/* 1. Freehand HTML5 Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* 2. Transformed Vector & Object Layer */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
        className={`absolute inset-0 w-full h-full ${
          isDrawingMode ? "pointer-events-none" : "pointer-events-auto"
        }`}
      >
        {/* 2A. SVG Connectors / Arrows Layer */}
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-15">
          <defs>
            {STUDIO_COLOR_LIST.map((c) => {
              const fill =
                surface === "neon" ? c.neonInk : c.whiteboardInk;
              return (
                <marker
                  key={c.key}
                  id={`studio-arrow-${surface}-${c.key}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={fill} />
                </marker>
              );
            })}
          </defs>

          {allConnectors.map((conn) => {
            const palette =
              STUDIO_COLORS[conn.colorKey] || STUDIO_COLORS.gold;
            const strokeColor =
              surface === "neon" ? palette.neonInk : palette.whiteboardInk;
            const isSel = selectedObjectId === conn.id;
            const x2 = conn.endX ?? conn.x + 120;
            const y2 = conn.endY ?? conn.y;

            return (
              <g
                key={conn.id}
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === "eraser") {
                    handleDeleteObject(conn.id);
                    return;
                  }
                  onSelectObject(conn.id);
                }}
              >
                <line
                  x1={conn.x}
                  y1={conn.y}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={16}
                />
                <line
                  x1={conn.x}
                  y1={conn.y}
                  x2={x2}
                  y2={y2}
                  stroke={strokeColor}
                  strokeWidth={conn.strokeWidth || 3}
                  markerEnd={`url(#studio-arrow-${surface}-${conn.colorKey})`}
                  style={{
                    filter:
                      surface === "neon"
                        ? `drop-shadow(0 0 6px ${palette.neonGlow})`
                        : undefined,
                  }}
                />
                {isSel && canEdit && (
                  <>
                    <circle
                      cx={conn.x}
                      cy={conn.y}
                      r={5}
                      fill="#FFE394"
                      stroke="#000820"
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={x2}
                      cy={y2}
                      r={5}
                      fill="#FFE394"
                      stroke="#000820"
                      strokeWidth={1.5}
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* 2B. DOM Canvas Objects: Sticky Notes, Typed Text, and Shapes */}
        {objects
          .filter((o) => o.type !== "connector")
          .map((obj) => {
            const palette = STUDIO_COLORS[obj.colorKey] || STUDIO_COLORS.cyan;
            const isSelected = selectedObjectId === obj.id;
            const linkedTask = obj.linkedTaskId
              ? tasksById.get(obj.linkedTaskId)
              : null;

            return (
              <div
                key={obj.id}
                data-testid={`studio-object-${obj.id}`}
                style={{
                  left: obj.x,
                  top: obj.y,
                  width: obj.width,
                  minHeight: obj.height,
                }}
                onPointerDown={(e) => {
                  if ((activeTool as StudioToolId) === "eraser" && canEdit) {
                    e.stopPropagation();
                    handleDeleteObject(obj.id);
                    return;
                  }
                  if (isDrawingMode) return;
                  e.stopPropagation();
                  onSelectObject(obj.id);
                  if (obj.linkedTaskId && !hidePrivateTaskMeta) {
                    onOpenTaskDrawer(obj.linkedTaskId, obj.id);
                  }
                  if (!canEdit) return;
                  const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
                  if (
                    targetTag === "input" ||
                    targetTag === "textarea" ||
                    targetTag === "select" ||
                    targetTag === "button"
                  ) {
                    return;
                  }
                  dragObjStateRef.current = {
                    id: obj.id,
                    mode: "move",
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: obj.x,
                    origY: obj.y,
                    origW: obj.width,
                    origH: obj.height,
                  };
                }}
                className={`absolute z-20 transition-shadow ${
                  isSelected
                    ? "ring-2 ring-[#FFE394] shadow-[0_0_24px_rgba(255,227,148,0.35)]"
                    : ""
                }`}
              >
                {/* Contextual Action Bar above selected object in Editing Mode */}
                {isSelected && canEdit && !isPresentationMode && (
                  <div
                    data-testid={`studio-object-toolbar-${obj.id}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -top-11 left-0 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#040D26]/98 border border-[#263F7A] shadow-2xl whitespace-nowrap"
                  >
                    {/* Color Swatches */}
                    <div className="flex items-center gap-1 pr-1.5 border-r border-[#1E3264]">
                      {STUDIO_COLOR_LIST.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() =>
                            handleUpdateSingleObject(obj.id, { colorKey: c.key })
                          }
                          title={`Color: ${c.label}`}
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            obj.colorKey === c.key
                              ? "scale-125 border-white ring-1 ring-[#FFE394]"
                              : "border-white/30 hover:scale-110"
                          }`}
                          style={{ backgroundColor: c.swatchHex }}
                        />
                      ))}
                    </div>

                    {/* Note-Specific Task Conversion & Assignment Actions */}
                    {obj.type === "note" && (
                      <>
                        {!obj.linkedTaskId ? (
                          <button
                            type="button"
                            data-testid={`make-task-btn-${obj.id}`}
                            onClick={() => onConvertNoteToTask(obj)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-[11px] hover:brightness-110 transition-all cursor-pointer"
                          >
                            <CheckSquare className="w-3 h-3" />
                            <span>Make task</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-testid={`open-task-drawer-btn-${obj.id}`}
                            onClick={() =>
                              onOpenTaskDrawer(obj.linkedTaskId!, obj.id)
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 font-semibold text-[11px] hover:bg-cyan-500/30 cursor-pointer"
                          >
                            <CheckSquare className="w-3 h-3" />
                            <span>Task #{obj.linkedTaskId} Details</span>
                          </button>
                        )}

                        {/* Click-to-Assign Selector */}
                        <select
                          aria-label="Assign note or task"
                          value={linkedTask?.assigneeId ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__focus__") {
                              onAssignTaskOrNote(obj, null, null, true);
                              return;
                            }
                            const uid = val ? Number(val) : null;
                            const member = teamRoster.find((m) => m.id === uid);
                            onAssignTaskOrNote(
                              obj,
                              uid,
                              member ? member.name : null,
                              false
                            );
                          }}
                          className="h-6 rounded-lg bg-[#02081A] border border-[#1E3264] px-1.5 text-[10px] text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          <option value="">Assign to…</option>
                          <option value="__focus__">★ My Focus</option>
                          {teamRoster.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    {/* Duplicate & Delete */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateObject(obj)}
                      title="Duplicate"
                      className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-testid={`delete-object-btn-${obj.id}`}
                      onClick={() => handleDeleteObject(obj.id)}
                      title="Delete"
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* RENDER 1: STICKY NOTE */}
                {obj.type === "note" && (
                  <div
                    style={{
                      backgroundColor:
                        surface === "neon"
                          ? palette.neonNoteBg
                          : palette.whiteboardNoteBg,
                      borderColor:
                        surface === "neon"
                          ? palette.neonNoteBorder
                          : palette.whiteboardNoteBorder,
                      color:
                        surface === "neon"
                          ? palette.neonText
                          : palette.whiteboardText,
                      boxShadow:
                        surface === "neon"
                          ? `0 12px 28px rgba(0,0,0,0.65), 0 0 18px ${palette.neonGlow.replace(
                              "0.65",
                              "0.16"
                            )}`
                          : "0 8px 20px rgba(15, 23, 42, 0.12)",
                    }}
                    className="w-full h-full min-h-[140px] rounded-2xl border-[1.5px] p-3 flex flex-col justify-between gap-2 backdrop-blur-md"
                  >
                    {/* Note Top Bar: Drag Handle + Task Badge (Hidden in Audience Mode) */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div
                        draggable={canEdit && !isPresentationMode}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          const payload = {
                            type: (obj.linkedTaskId ? "task" : "note") as
                              | "task"
                              | "note",
                            objectId: obj.id,
                            taskId: obj.linkedTaskId,
                            title: obj.title || obj.text || "Studio Note",
                          };
                          e.dataTransfer.setData(
                            "application/x-waypoint-studio",
                            JSON.stringify(payload)
                          );
                          onStartDragItem?.(payload);
                        }}
                        onDragEnd={() => onEndDragItem?.()}
                        title="Drag onto a teammate or My Focus above to assign"
                        className="inline-flex items-center gap-1 text-[10px] font-mono opacity-75 hover:opacity-100 cursor-grab active:cursor-grabbing"
                      >
                        <GripHorizontal className="w-3.5 h-3.5" />
                        <span>{obj.linkedTaskId ? "Drag Task" : "Note"}</span>
                      </div>

                      {/* Task Badge & Private Metadata (Hidden in Presentation / Audience View) */}
                      {obj.linkedTaskId && !hidePrivateTaskMeta && (
                        <button
                          type="button"
                          data-testid={`note-task-badge-${obj.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTaskDrawer(obj.linkedTaskId!, obj.id);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-300/60 text-cyan-200 text-[10px] font-mono font-bold hover:bg-cyan-500/35 cursor-pointer"
                        >
                          <CheckSquare className="w-2.5 h-2.5" />
                          <span>Task</span>
                          {linkedTask?.status === "complete" && (
                            <span className="text-emerald-300">✓</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Note Editable Title & Body */}
                    <div className="flex-1 flex flex-col gap-1">
                      {canEdit && !isPresentationMode ? (
                        <>
                          <input
                            type="text"
                            data-testid={`note-title-input-${obj.id}`}
                            value={obj.title || ""}
                            onChange={(e) =>
                              handleUpdateSingleObject(obj.id, {
                                title: e.target.value,
                              })
                            }
                            placeholder="Note heading..."
                            className="w-full bg-transparent font-serif font-bold text-sm focus:outline-none border-b border-transparent focus:border-current/30 pb-0.5"
                            style={{
                              fontFamily: "'Playfair Display', Georgia, serif",
                            }}
                          />
                          {(!obj.linkedTaskId || !hidePrivateTaskMeta) && (
                            <textarea
                              data-testid={`note-body-input-${obj.id}`}
                              value={obj.text || ""}
                              onChange={(e) =>
                                handleUpdateSingleObject(obj.id, {
                                  text: e.target.value,
                                })
                              }
                              placeholder="Write note or action item..."
                              rows={3}
                              className="w-full flex-1 bg-transparent text-xs leading-relaxed resize-none focus:outline-none opacity-90"
                            />
                          )}
                        </>
                      ) : (
                        <>
                          <div
                            className="font-serif font-bold text-sm leading-snug"
                            style={{
                              fontFamily: "'Playfair Display', Georgia, serif",
                            }}
                          >
                            {obj.title}
                          </div>
                          {(!obj.linkedTaskId || !hidePrivateTaskMeta) && obj.text && (
                            <div className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
                              {obj.text}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer: Assignee / Status Pill (Excluded from Audience / Presentation View) */}
                    {obj.linkedTaskId && !hidePrivateTaskMeta && (
                      <div className="pt-1.5 border-t border-current/15 flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-medium truncate">
                          {linkedTask?.assigneeName
                            ? `Assigned: ${linkedTask.assigneeName}`
                            : "Unassigned"}
                        </span>
                        <span className="font-mono uppercase px-1.5 py-0.2 rounded bg-black/25">
                          {linkedTask?.status === "complete"
                            ? "Complete"
                            : linkedTask?.status === "in_progress"
                            ? "In Progress"
                            : "Open"}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* RENDER 2: TYPED TEXT */}
                {obj.type === "text" && (
                  <div className="w-full h-full flex items-center">
                    {canEdit && !isPresentationMode ? (
                      <input
                        type="text"
                        data-testid={`canvas-text-input-${obj.id}`}
                        value={obj.text || ""}
                        onChange={(e) =>
                          handleUpdateSingleObject(obj.id, {
                            text: e.target.value,
                          })
                        }
                        style={{
                          color:
                            surface === "neon"
                              ? palette.neonInk
                              : palette.whiteboardInk,
                          fontSize: `${obj.fontSize || 22}px`,
                          textShadow:
                            surface === "neon"
                              ? `0 0 12px ${palette.neonGlow}`
                              : "none",
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                        className="w-full bg-transparent font-serif font-bold focus:outline-none px-1.5 py-0.5"
                      />
                    ) : (
                      <div
                        style={{
                          color:
                            surface === "neon"
                              ? palette.neonInk
                              : palette.whiteboardInk,
                          fontSize: `${obj.fontSize || 22}px`,
                          textShadow:
                            surface === "neon"
                              ? `0 0 12px ${palette.neonGlow}`
                              : "none",
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                        className="font-serif font-bold px-1.5 py-0.5"
                      >
                        {obj.text}
                      </div>
                    )}
                  </div>
                )}

                {/* RENDER 3: SHAPES (RECTANGLE / CIRCLE / DIAMOND) */}
                {(obj.type === "rect" ||
                  obj.type === "circle" ||
                  obj.type === "diamond") && (
                  <div
                    style={{
                      borderColor:
                        surface === "neon"
                          ? palette.neonInk
                          : palette.whiteboardInk,
                      backgroundColor:
                        surface === "neon"
                          ? "rgba(6, 18, 50, 0.72)"
                          : "rgba(255, 255, 255, 0.88)",
                      color:
                        surface === "neon"
                          ? palette.neonText
                          : palette.whiteboardText,
                      boxShadow:
                        surface === "neon"
                          ? `0 0 16px ${palette.neonGlow.replace("0.65", "0.28")}`
                          : "0 4px 12px rgba(15,23,42,0.08)",
                      borderRadius:
                        obj.type === "circle" ? "9999px" : "16px",
                    }}
                    className="w-full h-full min-h-[100px] border-2 p-3 flex flex-col items-center justify-center text-center"
                  >
                    {canEdit && !isPresentationMode ? (
                      <input
                        type="text"
                        value={obj.title || ""}
                        onChange={(e) =>
                          handleUpdateSingleObject(obj.id, {
                            title: e.target.value,
                          })
                        }
                        placeholder="Shape label..."
                        className="w-full bg-transparent text-center font-serif font-bold text-xs sm:text-sm focus:outline-none"
                      />
                    ) : (
                      <span className="font-serif font-bold text-xs sm:text-sm">
                        {obj.title}
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom-Right Resize Handle */}
                {isSelected && canEdit && !isPresentationMode && (
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      dragObjStateRef.current = {
                        id: obj.id,
                        mode: "resize",
                        startX: e.clientX,
                        startY: e.clientY,
                        origX: obj.x,
                        origY: obj.y,
                        origW: obj.width,
                        origH: obj.height,
                      };
                    }}
                    title="Drag to resize"
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#FFE394] border-2 border-[#000820] cursor-nwse-resize z-30"
                  />
                )}
              </div>
            );
          })}
      </div>

      {/* 3. Polished Empty State Overlay when Page is Empty */}
      {isBoardEmpty && canEdit && (
        <div
          data-testid="studio-empty-state"
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none p-4"
        >
          <div className="pointer-events-auto max-w-xl w-full rounded-2xl border border-[#1E3264] bg-[#030B24]/92 backdrop-blur-md p-6 text-center space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#DFBE77]">
                The Studio · Collaborative Canvas
              </span>
              <h3
                className="text-xl font-serif font-bold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Ready for ideas, tasks, and live teaching
              </h3>
              <p className="text-xs text-slate-300">
                Choose how you would like to begin on this page:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                data-testid="empty-start-writing-btn"
                onClick={() => onToolChange("pen")}
                className="p-3.5 rounded-xl border border-cyan-400/40 bg-[#061438] hover:bg-[#0A1F52] hover:border-cyan-300 text-left space-y-1.5 transition-all cursor-pointer group"
              >
                <PenTool className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Start writing</div>
                <div className="text-[10px] text-slate-300">
                  Draw with smooth neon or marker ink
                </div>
              </button>

              <button
                type="button"
                data-testid="empty-add-note-btn"
                onClick={() => {
                  const now = new Date().toISOString();
                  const note: StudioCanvasObject = {
                    id: `note-${Date.now()}`,
                    type: "note",
                    x: 180,
                    y: 140,
                    width: 240,
                    height: 155,
                    title: "Key IEP Action Item",
                    text: "Select this note and click 'Make task' to sync with CRM Tasks.",
                    colorKey: "cyan",
                    audienceVisible: true,
                    createdAt: now,
                    updatedAt: now,
                  };
                  onCommitObjects([note]);
                  onSelectObject(note.id);
                }}
                className="p-3.5 rounded-xl border border-violet-400/40 bg-[#061438] hover:bg-[#0A1F52] hover:border-violet-300 text-left space-y-1.5 transition-all cursor-pointer group"
              >
                <StickyNote className="w-4 h-4 text-violet-300 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Add a note</div>
                <div className="text-[10px] text-slate-300">
                  Capture thoughts or convert to a task
                </div>
              </button>

              <button
                type="button"
                data-testid="empty-add-teaching-page-btn"
                onClick={() => onAddTeachingPage?.()}
                className="p-3.5 rounded-xl border border-[#C5A059]/50 bg-[#061438] hover:bg-[#0A1F52] hover:border-[#FFE394] text-left space-y-1.5 transition-all cursor-pointer group"
              >
                <FilePlus2 className="w-4 h-4 text-[#FFE394] group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">
                  Add your first teaching page
                </div>
                <div className="text-[10px] text-slate-300">
                  Build multi-page lesson slides
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Viewport Zoom & Fit-to-Board Controls (Bottom-Right Corner) */}
      {!isPresentationMode && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-3 right-3 z-30 flex items-center gap-1 rounded-xl border border-[#1E3264] bg-[#030B22]/95 px-2 py-1 shadow-xl text-xs text-slate-200"
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
            title="Zoom Out"
            aria-label="Zoom Out"
            className="p-1 rounded hover:bg-white/10 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-1.5 min-w-[44px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2, Number((z + 0.1).toFixed(2))))}
            title="Zoom In"
            aria-label="Zoom In"
            className="p-1 rounded hover:bg-white/10 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="h-3.5 w-[1px] bg-[#1E3264] mx-0.5" />
          <button
            type="button"
            data-testid="studio-fit-to-board-btn"
            onClick={handleFitToBoard}
            title="Fit to Board & Reset View"
            className="px-2 py-0.5 rounded hover:bg-white/10 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
          >
            <Maximize2 className="w-3 h-3 text-cyan-400" />
            <span>Fit to Board</span>
          </button>
          {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
            <button
              type="button"
              data-testid="studio-reset-view-btn"
              onClick={handleFitToBoard}
              title="Reset View"
              className="px-1.5 py-0.5 rounded hover:bg-white/10 text-[11px] text-[#FFE394] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset View</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Check,
  Type,
  Calendar,
  Pen,
  X,
  CheckSquare,
  ArrowLeft,
  Sparkles,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Minus,
  Plus,
  Trash2,
  Maximize2,
} from "lucide-react";
import { DocumentAnnotation, WaypointScanPageDraft } from "@/lib/waypointScanStorage";

export type AnnotationTool = "none" | "check" | "text" | "date" | "initials" | "signature";

interface WaypointScanStage3FillSignProps {
  currentPage: WaypointScanPageDraft;
  annotations: DocumentAnnotation[];
  activeTool: AnnotationTool;
  onSelectTool: (tool: AnnotationTool) => void;
  onDocumentClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onRemoveAnnotation: (id: string) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<DocumentAnnotation>) => void;
  onBackToReview: () => void;
  onFinishDocument: () => void;
  onRotate?: () => void;
  isProcessingPdf: boolean;
  pageNumber: number;
  totalPages: number;
}

export function WaypointScanStage3FillSign({
  currentPage,
  annotations,
  activeTool,
  onSelectTool,
  onDocumentClick,
  selectedAnnotationId,
  onSelectAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
  onBackToReview,
  onFinishDocument,
  onRotate,
  isProcessingPdf,
  pageNumber,
  totalPages,
}: WaypointScanStage3FillSignProps) {
  // Zoom & Viewport State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<"page" | "width">("page");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const docContainerRef = useRef<HTMLDivElement | null>(null);

  // Dragging state for moving annotations
  const [draggingAnnotId, setDraggingAnnotId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  // Resizing state for interactive corner dragging
  const [resizingAnnotId, setResizingAnnotId] = useState<string | null>(null);
  const resizeStartRef = useRef<{
    startX: number;
    initialWidth: number;
    initialFontSize: number;
  }>({
    startX: 0,
    initialWidth: 24,
    initialFontSize: 20,
  });

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(3.0, +(z + 0.25).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1.0);
    setFitMode("page");
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleToggleFitMode = useCallback(() => {
    setFitMode((prev) => (prev === "page" ? "width" : "page"));
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleScrollUp = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: -240, behavior: "smooth" });
    }
  }, []);

  const handleScrollDown = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: 240, behavior: "smooth" });
    }
  }, []);

  // --- Sizing Guardrails & Actions ---
  const isAtMinSize = (annot: DocumentAnnotation): boolean => {
    if (annot.type === "signature") return (annot.width || 24) <= 14;
    if (annot.type === "check") return (annot.fontSize || 20) <= 14;
    return (annot.fontSize || 12) <= 10;
  };

  const isAtMaxSize = (annot: DocumentAnnotation): boolean => {
    if (annot.type === "signature") return (annot.width || 24) >= 55;
    if (annot.type === "check") return (annot.fontSize || 20) >= 40;
    return (annot.fontSize || 12) >= 28;
  };

  const getAnnotationSizeLabel = (annot: DocumentAnnotation): string => {
    if (annot.type === "signature") return `${annot.width || 24}%`;
    if (annot.type === "check") return `${annot.fontSize || 20}pt`;
    return `${annot.fontSize || 12}pt`;
  };

  const handleShrinkAnnotation = useCallback(
    (annot: DocumentAnnotation) => {
      if (!onUpdateAnnotation) return;
      if (annot.type === "signature") {
        const next = Math.max(14, (annot.width || 24) - 2);
        onUpdateAnnotation(annot.id, { width: next });
      } else if (annot.type === "check") {
        const next = Math.max(14, (annot.fontSize || 20) - 2);
        onUpdateAnnotation(annot.id, { fontSize: next });
      } else {
        const next = Math.max(10, (annot.fontSize || 12) - 1);
        onUpdateAnnotation(annot.id, { fontSize: next });
      }
    },
    [onUpdateAnnotation]
  );

  const handleEnlargeAnnotation = useCallback(
    (annot: DocumentAnnotation) => {
      if (!onUpdateAnnotation) return;
      if (annot.type === "signature") {
        const next = Math.min(55, (annot.width || 24) + 2);
        onUpdateAnnotation(annot.id, { width: next });
      } else if (annot.type === "check") {
        const next = Math.min(40, (annot.fontSize || 20) + 2);
        onUpdateAnnotation(annot.id, { fontSize: next });
      } else {
        const next = Math.min(28, (annot.fontSize || 12) + 1);
        onUpdateAnnotation(annot.id, { fontSize: next });
      }
    },
    [onUpdateAnnotation]
  );

  // Pointer drag handling for moving annotations on the document
  const handlePointerDownAnnotation = (e: React.PointerEvent, annot: DocumentAnnotation) => {
    e.stopPropagation();
    onSelectAnnotation(annot.id);

    if (!docContainerRef.current) return;
    const rect = docContainerRef.current.getBoundingClientRect();
    const currentPxX = (annot.x / 100) * rect.width;
    const currentPxY = (annot.y / 100) * rect.height;
    const pointerPxX = e.clientX - rect.left;
    const pointerPxY = e.clientY - rect.top;

    dragOffsetRef.current = {
      offsetX: pointerPxX - currentPxX,
      offsetY: pointerPxY - currentPxY,
    };
    setDraggingAnnotId(annot.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveAnnotation = (e: React.PointerEvent) => {
    if (!draggingAnnotId || !docContainerRef.current || !onUpdateAnnotation) return;
    const rect = docContainerRef.current.getBoundingClientRect();
    const pointerPxX = e.clientX - rect.left - dragOffsetRef.current.offsetX;
    const pointerPxY = e.clientY - rect.top - dragOffsetRef.current.offsetY;

    const newX = Math.max(0.5, Math.min(99.5, Number(((pointerPxX / rect.width) * 100).toFixed(2))));
    const newY = Math.max(0.5, Math.min(99.5, Number(((pointerPxY / rect.height) * 100).toFixed(2))));

    onUpdateAnnotation(draggingAnnotId, { x: newX, y: newY });
  };

  const handlePointerUpAnnotation = (e: React.PointerEvent) => {
    if (draggingAnnotId) {
      setDraggingAnnotId(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Corner drag-to-resize handling
  const handlePointerDownResize = (e: React.PointerEvent, annot: DocumentAnnotation) => {
    e.stopPropagation();
    setResizingAnnotId(annot.id);
    resizeStartRef.current = {
      startX: e.clientX,
      initialWidth: annot.width || 24,
      initialFontSize: annot.fontSize || (annot.type === "check" ? 20 : 12),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!resizingAnnotId || !onUpdateAnnotation) return;
    const deltaX = e.clientX - resizeStartRef.current.startX;
    const currentAnnot = annotations.find((a) => a.id === resizingAnnotId);
    if (!currentAnnot) return;

    if (currentAnnot.type === "signature") {
      const deltaPct = deltaX / 9;
      const newWidth = Math.max(14, Math.min(55, Math.round(resizeStartRef.current.initialWidth + deltaPct)));
      onUpdateAnnotation(resizingAnnotId, { width: newWidth });
    } else if (currentAnnot.type === "check") {
      const deltaSize = Math.round(deltaX / 5);
      const newSize = Math.max(14, Math.min(40, resizeStartRef.current.initialFontSize + deltaSize));
      onUpdateAnnotation(resizingAnnotId, { fontSize: newSize });
    } else {
      const deltaSize = Math.round(deltaX / 8);
      const newSize = Math.max(10, Math.min(28, resizeStartRef.current.initialFontSize + deltaSize));
      onUpdateAnnotation(resizingAnnotId, { fontSize: newSize });
    }
  };

  const handlePointerUpResize = (e: React.PointerEvent) => {
    if (resizingAnnotId) {
      setResizingAnnotId(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Keyboard controls: Arrow keys nudge position, [-]/[+] resize item, Delete removes
  useEffect(() => {
    if (!selectedAnnotationId || !onUpdateAnnotation) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const currentAnnot = annotations.find((a) => a.id === selectedAnnotationId);
      if (!currentAnnot) return;

      const step = e.shiftKey ? 0.2 : 0.6;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onUpdateAnnotation(selectedAnnotationId, { y: Math.max(0.5, +(currentAnnot.y - step).toFixed(2)) });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onUpdateAnnotation(selectedAnnotationId, { y: Math.min(99.5, +(currentAnnot.y + step).toFixed(2)) });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onUpdateAnnotation(selectedAnnotationId, { x: Math.max(0.5, +(currentAnnot.x - step).toFixed(2)) });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onUpdateAnnotation(selectedAnnotationId, { x: Math.min(99.5, +(currentAnnot.x + step).toFixed(2)) });
      } else if (e.key === "[" || e.key === "-") {
        e.preventDefault();
        handleShrinkAnnotation(currentAnnot);
      } else if (e.key === "]" || e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleEnlargeAnnotation(currentAnnot);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onRemoveAnnotation(selectedAnnotationId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedAnnotationId,
    annotations,
    onUpdateAnnotation,
    onRemoveAnnotation,
    handleShrinkAnnotation,
    handleEnlargeAnnotation,
  ]);

  const isZoomed = zoomLevel !== 1.0;
  const baseHeightVh = 54;

  const imgStyle: React.CSSProperties =
    fitMode === "width"
      ? {
          width: `${Math.round(zoomLevel * 100)}%`,
          height: "auto",
          display: "block",
          maxWidth: "none",
        }
      : {
          height: `${baseHeightVh * zoomLevel}vh`,
          width: "auto",
          display: "block",
          maxHeight: "none",
          maxWidth: zoomLevel === 1.0 ? "100%" : "none",
        };

  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-0 py-2 px-3 sm:px-6 w-full max-w-5xl mx-auto gap-2">
      {/* Top Bar: Back & Page indicator + Zoom Controls */}
      <div className="w-full flex items-center justify-between px-2 gap-2 flex-wrap sm:flex-nowrap shrink-0">
        <button
          type="button"
          onClick={onBackToReview}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#091D3C]/80 hover:bg-[#0E2954] text-blue-200 hover:text-white border border-blue-900/40 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Review</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 font-bold px-3 py-1 rounded-xl bg-amber-400/10 border border-amber-400/25">
            Page {pageNumber} of {totalPages}
          </span>

          {/* Compact Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5 shadow-sm">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-1 rounded hover:bg-white/10 text-blue-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-amber-400 hover:bg-white/10 rounded transition-colors cursor-pointer min-w-[38px] text-center"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3.0}
              className="p-1 rounded hover:bg-white/10 text-blue-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {onRotate && (
            <button
              type="button"
              onClick={onRotate}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#091D3C]/80 hover:bg-[#0E2954] text-blue-200 hover:text-white border border-blue-900/40 text-xs font-semibold transition-colors cursor-pointer"
              title="Rotate 90°"
            >
              <RotateCw className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Rotate</span>
            </button>
          )}
        </div>

        {/* Finish CTA button in top header for quick desktop access */}
        <Button
          type="button"
          onClick={onFinishDocument}
          disabled={isProcessingPdf}
          className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs h-9 px-4 rounded-xl shadow-[0_0_15px_rgba(245,181,68,0.3)] cursor-pointer"
        >
          {isProcessingPdf ? "Flattening..." : "Finish PDF →"}
        </Button>
      </div>

      {/* Interactive Document Workspace (Scrollable & Zoomable) */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden p-1 select-none">
        <div
          ref={scrollContainerRef}
          className="relative w-full h-full overflow-y-auto overflow-x-auto py-3 px-2 sm:px-6 flex flex-col items-center justify-start scroll-smooth rounded-2xl bg-black/20 border border-blue-950/60 shadow-inner"
        >
          {/* Document Sheet: Exactly wraps image dimensions with ZERO letterboxing margin */}
          <div
            ref={docContainerRef}
            onClick={onDocumentClick}
            className={`relative inline-block w-fit h-fit bg-white rounded-none shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-slate-300 transition-all shrink-0 ${
              isZoomed || fitMode === "width" ? "my-2" : "my-auto"
            } ${
              activeTool !== "none" ? "cursor-crosshair ring-2 ring-amber-400/80" : "cursor-default"
            }`}
          >
            <img
              src={currentPage.dataUrl}
              alt="Document for signing"
              style={imgStyle}
              className="block pointer-events-none select-none rounded-none"
              draggable={false}
            />

            {/* Render Placed Annotations */}
            {annotations.map((annot) => (
              <div
                key={annot.id}
                onPointerDown={(e) => handlePointerDownAnnotation(e, annot)}
                onPointerMove={handlePointerMoveAnnotation}
                onPointerUp={handlePointerUpAnnotation}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnnotation(annot.id);
                }}
                style={{
                  left: `${annot.x}%`,
                  top: `${annot.y}%`,
                  width: annot.type === "signature" ? `${annot.width || 24}%` : undefined,
                }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move transition-shadow select-none ${
                  selectedAnnotationId === annot.id
                    ? "ring-2 ring-amber-400 bg-amber-400/15 p-0.5 rounded-lg shadow-lg z-20"
                    : "hover:ring-1 hover:ring-blue-400 z-10"
                }`}
                title="Drag to reposition, or use Arrow keys to nudge"
              >
                {/* Floating Size & Action Toolbar on Selected Item */}
                {selectedAnnotationId === annot.id && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-1.5 py-0.5 rounded-xl bg-[#081B36]/95 border border-amber-400/60 shadow-[0_8px_20px_rgba(0,0,0,0.8)] backdrop-blur-md whitespace-nowrap animate-in zoom-in-95 duration-150"
                  >
                    {/* Shrink Size */}
                    <button
                      type="button"
                      onClick={() => handleShrinkAnnotation(annot)}
                      disabled={isAtMinSize(annot)}
                      className="p-1 rounded-md bg-white/5 hover:bg-amber-400/20 text-blue-200 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-colors cursor-pointer"
                      title="Shrink item size (- / [)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    {/* Current Size Display */}
                    <span className="text-[10px] font-mono font-bold text-amber-400 px-1 min-w-[32px] text-center select-none">
                      {getAnnotationSizeLabel(annot)}
                    </span>

                    {/* Enlarge Size */}
                    <button
                      type="button"
                      onClick={() => handleEnlargeAnnotation(annot)}
                      disabled={isAtMaxSize(annot)}
                      className="p-1 rounded-md bg-white/5 hover:bg-amber-400/20 text-blue-200 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-colors cursor-pointer"
                      title="Enlarge item size (+ / ])"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    <div className="w-px h-3 bg-blue-800/60 mx-0.5" />

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => onRemoveAnnotation(annot.id)}
                      className="p-1 rounded-md bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/50 transition-colors cursor-pointer"
                      title="Delete item (Delete / Backspace)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Checkmark icon with live dynamic size */}
                {annot.type === "check" && (
                  <span
                    style={{
                      fontSize: `${annot.fontSize || 20}px`,
                      lineHeight: "1",
                    }}
                    className="font-black text-blue-950 select-none block px-1"
                  >
                    ✓
                  </span>
                )}

                {/* Text, Date, or Initials with live dynamic font size */}
                {(annot.type === "text" || annot.type === "date" || annot.type === "initials") && (
                  <span
                    style={{
                      fontSize: `${annot.fontSize || (annot.type === "initials" ? 13 : 11)}px`,
                      lineHeight: "1.2",
                    }}
                    className={`font-semibold text-blue-950 select-none whitespace-nowrap block ${
                      annot.type === "initials"
                        ? "font-black px-1.5 py-0.5 border-b-2 border-blue-950 bg-white/80 rounded"
                        : "px-1.5 py-0.5 bg-white/80 rounded border border-blue-950/20"
                    }`}
                  >
                    {annot.content}
                  </span>
                )}

                {/* Signature rendered in soft blue highlight box matching PDF percentage width */}
                {annot.type === "signature" && annot.content && (
                  <div className="w-full p-1 rounded-lg border border-blue-400/80 bg-blue-50/90 flex items-center justify-center shadow-sm">
                    <img
                      src={annot.content}
                      alt="Signature"
                      className="w-full h-auto object-contain pointer-events-none select-none"
                    />
                  </div>
                )}

                {/* Interactive Corner Resize Handle */}
                {selectedAnnotationId === annot.id && (
                  <div
                    onPointerDown={(e) => handlePointerDownResize(e, annot)}
                    onPointerMove={handlePointerMoveResize}
                    onPointerUp={handlePointerUpResize}
                    className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-amber-400 text-slate-950 border-2 border-[#081B36] flex items-center justify-center shadow-md cursor-nwse-resize z-30 hover:scale-125 transition-transform"
                    title="Drag to resize (enlarge / shrink)"
                  >
                    <Maximize2 className="w-2.5 h-2.5 stroke-[3] rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Floating Navigation & Zoom HUD Dock */}
        <div className="absolute bottom-12 right-4 z-30 flex items-center gap-1 p-1 rounded-2xl bg-[#081B36]/90 border border-blue-800/60 shadow-[0_10px_25px_rgba(0,0,0,0.7)] backdrop-blur-md transition-all">
          <button
            type="button"
            onClick={handleScrollUp}
            className="p-1 rounded-xl bg-white/5 hover:bg-amber-400/20 text-blue-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer group"
            title="Scroll Up"
          >
            <ChevronUp className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5" />
          </button>
          <button
            type="button"
            onClick={handleScrollDown}
            className="p-1 rounded-xl bg-white/5 hover:bg-amber-400/20 text-blue-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer group"
            title="Scroll Down"
          >
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
          </button>
          <div className="w-px h-3.5 bg-blue-800/60 mx-0.5" />
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-1.5 py-0.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/50 text-[10px] font-mono font-bold text-amber-400 transition-all cursor-pointer min-w-[38px] text-center"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3.0}
            className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-blue-800/60 mx-0.5" />
          <button
            type="button"
            onClick={handleToggleFitMode}
            className={`p-1 rounded-xl border transition-all cursor-pointer ${
              fitMode === "width"
                ? "bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-sm"
                : "bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white border-white/10"
            }`}
            title={fitMode === "width" ? "Switch to Fit Page" : "Switch to Fit Width (Reading Mode)"}
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Tool Hint Pill */}
        <div className="mt-1">
          <span className="px-4 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-300 text-xs font-semibold border border-amber-400/20 shadow-md inline-block">
            {selectedAnnotationId
              ? "✨ Item selected: Use - / + buttons or drag corner to resize • Drag or use Arrow keys to position"
              : activeTool !== "none"
              ? `🎯 Tap anywhere on document to place ${activeTool}`
              : "Select a tool below to sign, date, or add text"}
          </span>
        </div>
      </div>

      {/* 5-Tool Toolbar Dock matching the reference specs */}
      <div className="w-full max-w-xl bg-[#091D3C]/90 border border-blue-800/50 rounded-2xl p-2 flex items-center justify-between gap-1 sm:gap-2 shadow-[0_15px_30px_rgba(0,0,0,0.6)] backdrop-blur-md shrink-0">
        {/* Tool 1: Check */}
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "check" ? "none" : "check")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === "check"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
              : "text-blue-200/80 hover:text-white hover:bg-white/5"
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-1">Check</span>
        </button>

        {/* Tool 2: Text */}
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "text" ? "none" : "text")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === "text"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
              : "text-blue-200/80 hover:text-white hover:bg-white/5"
          }`}
        >
          <Type className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-1">Text</span>
        </button>

        {/* Tool 3: Date */}
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "date" ? "none" : "date")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === "date"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
              : "text-blue-200/80 hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-1">Date</span>
        </button>

        {/* Tool 4: Initials (AA) */}
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "initials" ? "none" : "initials")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === "initials"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
              : "text-blue-200/80 hover:text-white hover:bg-white/5"
          }`}
        >
          <span className="text-[13px] font-black tracking-tighter leading-none h-5 flex items-center">
            AA
          </span>
          <span className="text-[11px] font-bold mt-1">Initials</span>
        </button>

        {/* Tool 5: Signature */}
        <button
          type="button"
          onClick={() => onSelectTool("signature")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === "signature"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
              : "text-blue-200/80 hover:text-white hover:bg-white/5"
          }`}
        >
          <Pen className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-1">Signature</span>
        </button>
      </div>
    </div>
  );
}

export default WaypointScanStage3FillSign;

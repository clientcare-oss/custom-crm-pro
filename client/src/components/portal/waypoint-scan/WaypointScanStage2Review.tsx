import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  RotateCw,
  Crop,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  RefreshCcw,
  Check,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RotateCcw,
} from "lucide-react";
import { WaypointScanPageDraft } from "@/lib/waypointScanStorage";

interface WaypointScanStage2ReviewProps {
  pages: WaypointScanPageDraft[];
  activePageIndex: number;
  onSelectPageIndex: (idx: number) => void;
  onRetake: () => void;
  onUsePage: () => void;
  onRotate: (direction?: "cw" | "ccw") => void;
  onAutoOrient?: () => void;
  onToggleOriginal?: () => void;
  isShowingOriginal?: boolean;
  onAdjustEdges?: () => void;
  onScanAnotherPage: () => void;
  onDeletePage: (idx: number) => void;
  onMovePageLeft: (idx: number) => void;
  onMovePageRight: (idx: number) => void;
  blurWarning: string | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function WaypointScanStage2Review({
  pages,
  activePageIndex,
  onSelectPageIndex,
  onRetake,
  onUsePage,
  onRotate,
  onAdjustEdges,
  onScanAnotherPage,
  onDeletePage,
  onMovePageLeft,
  onMovePageRight,
  blurWarning,
  isFullscreen = false,
  onToggleFullscreen,
}: WaypointScanStage2ReviewProps) {
  const currentPage = pages[activePageIndex];

  // Zoom & Viewport State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<"page" | "width">("page");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset scroll to top when active page changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [activePageIndex]);

  // Zoom actions
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

  // Scroll actions
  const handleScrollUp = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: -260, behavior: "smooth" });
    }
  }, []);

  const handleScrollDown = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: 260, behavior: "smooth" });
    }
  }, []);

  // Non-passive wheel handler for Ctrl/Meta + Wheel zoom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onWheelHandler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setZoomLevel((z) => Math.min(3.0, +(z + 0.2).toFixed(2)));
        } else if (e.deltaY > 0) {
          setZoomLevel((z) => Math.max(0.5, +(z - 0.2).toFixed(2)));
        }
      }
    };

    container.addEventListener("wheel", onWheelHandler, { passive: false });
    return () => container.removeEventListener("wheel", onWheelHandler);
  }, []);

  if (!currentPage) return null;

  // Calculate dynamic dimensions for document sheet preview
  const baseHeightVh = isFullscreen ? 84 : 70;
  const isZoomed = zoomLevel !== 1.0;

  const sheetStyle: React.CSSProperties =
    fitMode === "width"
      ? {
          width: isZoomed ? `${Math.round(zoomLevel * 100)}%` : "100%",
          maxWidth: isZoomed ? "none" : "100%",
          height: "auto",
        }
      : {
          height: isZoomed ? `${baseHeightVh * zoomLevel}vh` : `${baseHeightVh}vh`,
          maxHeight: isZoomed ? "none" : `${baseHeightVh}vh`,
          maxWidth: isZoomed ? "none" : "100%",
          width: "auto",
        };

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-between min-h-0 w-full mx-auto gap-2 transition-all ${
        isFullscreen ? "max-w-none h-full" : "max-w-5xl"
      }`}
    >
      {/* Top Controls Toolbar */}
      <div className="w-full shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#081B36]/90 border border-blue-900/50 backdrop-blur-md shadow-md z-20 flex-wrap sm:flex-nowrap">
        {/* Left: Page Navigator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {pages.length > 1 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onMovePageLeft(activePageIndex)}
                disabled={activePageIndex === 0}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-200 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
                title="Previous page"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs">
                Page {activePageIndex + 1} of {pages.length}
              </span>
              <button
                type="button"
                onClick={() => onMovePageRight(activePageIndex)}
                disabled={activePageIndex === pages.length - 1}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-200 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
                title="Next page"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeletePage(activePageIndex)}
                className="p-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 ml-1"
                title="Delete page"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shadow-sm">
              Page 1
            </span>
          )}

          {/* Add Another Page */}
          <button
            type="button"
            onClick={onScanAnotherPage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-amber-400/20 text-blue-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer"
            title="Scan or upload another page"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add</span>
          </button>
        </div>

        {/* Center / Right: Essential Actions + Zoom Controls */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Zoom Controls Segment */}
          <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5 shadow-sm">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-1 rounded-md hover:bg-white/10 text-blue-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-0.5 text-[11px] font-mono font-bold text-amber-400 hover:bg-white/10 rounded-md transition-colors cursor-pointer min-w-[42px] text-center"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3.0}
              className="p-1 rounded-md hover:bg-white/10 text-blue-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rotate 90° */}
          <button
            type="button"
            onClick={() => onRotate("cw")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Rotate</span>
          </button>

          {/* Adjust Edges */}
          {onAdjustEdges && (
            <button
              type="button"
              onClick={onAdjustEdges}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
              title="Adjust document corners"
            >
              <Crop className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Adjust Edges</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-sm ${
                isFullscreen
                  ? "bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300 ring-2 ring-amber-400/40"
                  : "bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white border-white/10"
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                  <span className="hidden sm:inline">Exit</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Document Sheet Display Area (Scrollable & Zoomable Viewport) */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden py-1">
        <div
          ref={scrollContainerRef}
          className="relative w-full h-full overflow-y-auto overflow-x-auto py-4 px-2 sm:px-6 flex flex-col items-center justify-start scroll-smooth rounded-2xl bg-black/20 border border-blue-950/60 shadow-inner"
        >
          <div
            className={`relative bg-white rounded-none shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-slate-300 transition-all duration-150 ease-out flex items-center justify-center shrink-0 ${
              isZoomed || fitMode === "width" ? "my-2" : "my-auto"
            }`}
            style={sheetStyle}
          >
            <img
              src={currentPage.dataUrl}
              alt={`Page ${activePageIndex + 1}`}
              className="w-full h-full object-contain pointer-events-none select-none rounded-none block"
            />

            {/* Low Sharpness / Blur Warning Pill */}
            {blurWarning && (
              <div className="absolute top-3 inset-x-3 p-2.5 rounded-xl bg-amber-500/95 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-md z-20">
                <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span>{blurWarning}</span>
              </div>
            )}
          </div>
        </div>

        {/* Floating Document Navigation & Zoom HUD Dock */}
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 p-1.5 rounded-2xl bg-[#081B36]/90 border border-blue-800/60 shadow-[0_12px_30px_rgba(0,0,0,0.7)] backdrop-blur-md transition-all">
          {/* Scroll Up */}
          <button
            type="button"
            onClick={handleScrollUp}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-amber-400/20 text-blue-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer group"
            title="Scroll Up"
          >
            <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
          </button>

          {/* Scroll Down */}
          <button
            type="button"
            onClick={handleScrollDown}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-amber-400/20 text-blue-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer group"
            title="Scroll Down"
          >
            <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
          </button>

          <div className="w-px h-4 bg-blue-800/60 mx-0.5" />

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Reset Zoom / Current Zoom Indicator */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-1 rounded-xl bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/50 text-[11px] font-mono font-bold text-amber-400 transition-all cursor-pointer min-w-[46px] text-center"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3.0}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-blue-800/60 mx-0.5" />

          {/* Fit Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleFitMode}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              fitMode === "width"
                ? "bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-sm"
                : "bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white border-white/10"
            }`}
            title={fitMode === "width" ? "Switch to Fit Page" : "Switch to Fit Width (Reading Mode)"}
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Primary Actions */}
      <div className="w-full flex items-center justify-between gap-3 pt-2 border-t border-blue-900/40 px-2 max-w-lg">
        <Button
          type="button"
          variant="outline"
          onClick={onRetake}
          className="flex-1 bg-[#091D3C]/90 hover:bg-[#0E2954] border-blue-800/50 text-blue-200 text-xs font-bold h-11 rounded-2xl gap-2 cursor-pointer shadow-md"
        >
          <RefreshCcw className="w-4 h-4" />
          Retake Page
        </Button>

        <div className="text-xs text-blue-300/80 font-bold px-2 select-none">
          {activePageIndex + 1} of {pages.length}
        </div>

        <Button
          type="button"
          onClick={onUsePage}
          className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs h-11 rounded-2xl gap-2 shadow-[0_0_20px_rgba(245,181,68,0.35)] cursor-pointer transition-transform active:scale-[0.98]"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          Use Page
        </Button>
      </div>
    </div>
  );
}

export default WaypointScanStage2Review;

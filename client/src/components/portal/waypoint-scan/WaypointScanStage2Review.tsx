/**
 * Stage 2: Review (Cleaned Document, Rotate, Retake, Use Page)
 * Styled with the Blue Wavy Theme across the natural workspace.
 * Features 1-click rotation, auto-orientation upright, and original/enhanced toggling.
 */

import React from "react";
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

  if (!currentPage) return null;

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-between min-h-0 w-full mx-auto gap-2 transition-all ${
        isFullscreen ? "max-w-none h-full" : "max-w-5xl"
      }`}
    >
      {/* Top Controls Toolbar: Minimal, Clean, NO Horizontal Scroll */}
      <div className="w-full shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#081B36]/90 border border-blue-900/50 backdrop-blur-md shadow-md z-20">
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

        {/* Right: Only 3 Essential Actions (Rotate, Adjust Edges, Fullscreen) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Rotate 90° */}
          <button
            type="button"
            onClick={() => onRotate("cw")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Rotate</span>
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
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Document Sheet Display Area (Full Page Display, never cut off) */}
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden py-1">
        <div className="relative max-h-full max-w-full bg-white rounded-none overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-slate-300 flex items-center justify-center">
          <img
            src={currentPage.dataUrl}
            alt={`Page ${activePageIndex + 1}`}
            className={`w-auto h-auto max-w-full object-contain pointer-events-none select-none rounded-none block ${
              isFullscreen
                ? "max-h-[85vh] sm:max-h-[88vh]"
                : "max-h-[66vh] sm:max-h-[72vh] md:max-h-[76vh]"
            }`}
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

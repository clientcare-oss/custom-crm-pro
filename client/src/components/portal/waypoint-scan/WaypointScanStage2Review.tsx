/**
 * Stage 2: Review (Cleaned Document, Rotate, Retake, Use Page)
 * Styled with the Blue Wavy Theme across the natural workspace.
 * Features 1-click rotation, auto-orientation upright, and original/enhanced toggling.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import {
  RotateCw,
  RotateCcw,
  Crop,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  RefreshCcw,
  Check,
  Compass,
  SlidersHorizontal,
  Sparkles,
  Eye,
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
}

export function WaypointScanStage2Review({
  pages,
  activePageIndex,
  onSelectPageIndex,
  onRetake,
  onUsePage,
  onRotate,
  onAutoOrient,
  onToggleOriginal,
  isShowingOriginal = false,
  onAdjustEdges,
  onScanAnotherPage,
  onDeletePage,
  onMovePageLeft,
  onMovePageRight,
  blurWarning,
}: WaypointScanStage2ReviewProps) {
  const currentPage = pages[activePageIndex];

  if (!currentPage) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-0 py-3 px-3 sm:px-6 w-full max-w-4xl mx-auto gap-3">
      {/* Top Controls Toolbar: Clean, Unified, All Above Preview */}
      <div className="w-full shrink-0 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-2xl bg-[#081B36]/90 border border-blue-900/50 backdrop-blur-md shadow-lg z-20 overflow-x-auto">
        {/* Left: Multipage Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          {pages.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPageIndex(idx)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                idx === activePageIndex
                  ? "bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,181,68,0.4)]"
                  : "bg-white/5 text-blue-200/70 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              Page {idx + 1}
            </button>
          ))}

          {/* Add Another Page */}
          <button
            type="button"
            onClick={onScanAnotherPage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/5 hover:bg-amber-400/20 text-blue-200 hover:text-amber-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer shrink-0"
            title="Scan or upload another page"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Page</span>
          </button>
        </div>

        {/* Right: Document Tools (Rotate, Upright, Enhanced, Adjust Edges) */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Rotate Left 90 */}
          <button
            type="button"
            onClick={() => onRotate("ccw")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer shrink-0"
            title="Rotate Left 90°"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Rotate Left</span>
          </button>

          {/* Rotate Right 90 */}
          <button
            type="button"
            onClick={() => onRotate("cw")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer shrink-0"
            title="Rotate Right 90°"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Rotate Right</span>
          </button>

          {/* Auto-Orient Upright */}
          {onAutoOrient && (
            <button
              type="button"
              onClick={onAutoOrient}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 hover:text-amber-200 border border-amber-400/30 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Auto-orient document upright"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Upright</span>
            </button>
          )}

          {/* Toggle Original vs Enhanced */}
          {currentPage.originalDataUrl && onToggleOriginal && (
            <button
              type="button"
              onClick={onToggleOriginal}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                isShowingOriginal
                  ? "bg-blue-600/30 border-blue-400 text-blue-200"
                  : "bg-white/5 border-white/10 text-blue-300 hover:bg-white/10"
              }`}
              title="Toggle between cleaned scan and original capture"
            >
              {isShowingOriginal ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-blue-300" />
                  <span className="hidden sm:inline">Original</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Enhanced</span>
                </>
              )}
            </button>
          )}

          {/* Adjust Edges */}
          {onAdjustEdges && (
            <button
              type="button"
              onClick={onAdjustEdges}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Adjust document corners"
            >
              <Crop className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Adjust Edges</span>
            </button>
          )}

          {/* Page Reorder / Delete if multi-page */}
          {pages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onMovePageLeft(activePageIndex)}
                disabled={activePageIndex === 0}
                className="p-1 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-colors cursor-pointer shrink-0"
                title="Move page left"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMovePageRight(activePageIndex)}
                disabled={activePageIndex === pages.length - 1}
                className="p-1 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-blue-200 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 transition-colors cursor-pointer shrink-0"
                title="Move page right"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeletePage(activePageIndex)}
                className="p-1 px-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 transition-colors cursor-pointer shrink-0"
                title="Delete this page"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Document Sheet Display Area (Strictly below toolbar, zero overlap) */}
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden p-1">
        <div className="relative max-h-full max-w-full bg-white rounded-none overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-slate-300 flex items-center justify-center">
          <img
            src={isShowingOriginal && currentPage.originalDataUrl ? currentPage.originalDataUrl : currentPage.dataUrl}
            alt={`Page ${activePageIndex + 1}`}
            className="max-h-[52vh] max-w-full w-auto h-auto block object-contain pointer-events-none select-none rounded-none"
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

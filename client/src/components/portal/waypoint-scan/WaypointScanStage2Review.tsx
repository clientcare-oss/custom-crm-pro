/**
 * Stage 2: Review (Cleaned Document, Retake, Use Page)
 * Styled with the Blue Wavy Theme & Phone Viewport matching the visual spec.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { WaypointWaveIcon } from "../WaypointWavyBackdrop";
import { RotateCw, Crop, Plus, Trash2, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { WaypointScanPageDraft } from "@/lib/waypointScanStorage";

interface WaypointScanStage2ReviewProps {
  pages: WaypointScanPageDraft[];
  activePageIndex: number;
  onSelectPageIndex: (idx: number) => void;
  onRetake: () => void;
  onUsePage: () => void;
  onRotate: () => void;
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
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-2">
      {/* Mobile Device Frame Container */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#040C1A] rounded-[2.5rem] border-4 border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col aspect-[9/16] max-h-[66vh]">
        
        {/* Status Bar */}
        <div className="px-6 pt-3 pb-2 flex items-center justify-between text-white/70 text-[11px] font-semibold select-none z-20">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2.5 border border-white/60 rounded-sm inline-block" />
          </div>
        </div>

        {/* In-Phone Header Bar */}
        <div className="px-5 py-2 flex items-center justify-between border-b border-white/10 z-20 bg-slate-950/40 backdrop-blur-md">
          <button
            type="button"
            onClick={onRetake}
            className="text-white hover:text-amber-400 p-1 cursor-pointer"
          >
            ‹
          </button>

          <div className="flex items-center gap-1.5">
            <WaypointWaveIcon className="w-5 h-3 text-amber-400" />
            <span className="font-serif text-white text-xs font-bold tracking-wide">
              Waypoint <span className="text-amber-400 italic">Scan</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRotate}
              className="text-white/80 hover:text-amber-400 p-1 cursor-pointer"
              title="Rotate"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            {onAdjustEdges && (
              <button
                type="button"
                onClick={onAdjustEdges}
                className="text-white/80 hover:text-amber-400 p-1 cursor-pointer"
                title="Adjust Edges"
              >
                <Crop className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Document Preview Canvas */}
        <div className="relative flex-1 bg-[#06152B] flex flex-col items-center justify-center p-4 overflow-hidden">
          
          {/* Blur Warning Alert */}
          {blurWarning && (
            <div className="absolute top-2 inset-x-4 p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] flex items-center justify-between gap-2 z-30 backdrop-blur-md">
              <span className="truncate">{blurWarning}</span>
              <button
                type="button"
                onClick={onRetake}
                className="underline font-bold shrink-0 text-amber-200"
              >
                Retake
              </button>
            </div>
          )}

          {/* Clean White Document Sheet */}
          <div className="relative max-h-[44vh] aspect-[3/4] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300 flex items-center justify-center">
            <img
              src={currentPage.dataUrl}
              alt="Scanned Document"
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>

          {/* Page Counter: 1 of 1 */}
          <p className="text-xs text-blue-200/70 font-semibold mt-2 select-none">
            {activePageIndex + 1} of {pages.length}
          </p>
        </div>

        {/* Multipage Strip (if > 1 pages) */}
        {pages.length > 1 && (
          <div className="px-4 py-1.5 bg-[#030A16] flex items-center gap-2 overflow-x-auto border-t border-white/5">
            {pages.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => onSelectPageIndex(idx)}
                className={`relative w-10 h-14 rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 transition-all ${
                  activePageIndex === idx
                    ? "border-amber-400 scale-105"
                    : "border-white/20 opacity-60 hover:opacity-100"
                }`}
              >
                <img src={p.dataUrl} alt={`p${idx + 1}`} className="w-full h-full object-cover bg-white" />
                <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-amber-300 bg-slate-950/80 px-1 rounded">
                  {idx + 1}
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={onScanAnotherPage}
              className="w-10 h-14 rounded-lg border border-dashed border-amber-400/40 flex items-center justify-center text-amber-400 text-xs shrink-0 hover:bg-amber-400/10"
            >
              +
            </button>
          </div>
        )}

        {/* Bottom Actions matching Phone 2: Retake | Use Page */}
        <div className="p-4 bg-[#040C1A] border-t border-white/10 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onRetake}
            className="flex-1 border border-white/40 bg-white/5 hover:bg-white/10 text-white font-bold text-xs h-11 rounded-2xl cursor-pointer"
          >
            Retake
          </Button>

          <Button
            type="button"
            onClick={onUsePage}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-11 rounded-2xl shadow-lg hover:shadow-amber-400/20 cursor-pointer"
          >
            Use Page
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WaypointScanStage2Review;

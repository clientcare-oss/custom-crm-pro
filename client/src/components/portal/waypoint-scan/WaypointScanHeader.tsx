/**
 * Waypoint Scan Header with Blue Wavy Theme & Step Breadcrumbs
 */

import React from "react";
import { WaypointWaveIcon } from "../WaypointWavyBackdrop";
import PageIdBadge from "@/components/PageIdBadge";
import { X, Maximize2, Minimize2 } from "lucide-react";

interface WaypointScanHeaderProps {
  stage: "get" | "review" | "fill-sign" | "finish";
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function WaypointScanHeader({
  stage,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
}: WaypointScanHeaderProps) {
  return (
    <div className="shrink-0 pb-2.5 pt-0 -mt-0.5 border-b border-blue-900/40 relative">
      {/* Top Right Floating Action Controls: Fullscreen / Exit Fullscreen + Close (X) */}
      <div className="absolute top-0 right-0 z-30 flex items-center gap-1.5 sm:gap-2">
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
              isFullscreen
                ? "bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,181,68,0.35)] ring-2 ring-amber-400/40"
                : "bg-[#091D3C]/90 hover:bg-[#0E2954] text-blue-200 hover:text-white border-blue-800/60 hover:border-amber-400/50"
            }`}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400 stroke-[2]" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#091D3C]/90 hover:bg-red-950/80 text-blue-200 hover:text-red-200 border border-blue-800/60 hover:border-red-500/50 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Close Scanner"
            aria-label="Close Scanner"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Centered Brand Title Lockup: Waypoint Scan + Swish + Subtitle */}
      <div className="flex flex-col items-center justify-center text-center px-12 sm:px-32">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl sm:text-3xl font-serif text-white font-normal tracking-wide">
            Waypoint
          </span>
          <span className="text-2xl sm:text-3xl font-serif text-amber-400 font-bold tracking-wide italic">
            Scan
          </span>
          <PageIdBadge id="PG-023-SCAN" name="Waypoint Scan" />
        </div>

        {/* Golden Wave Ribbon Swish */}
        <WaypointWaveIcon className="w-11 h-3 text-amber-400/90 -mt-0.5 mb-1" />

        {/* Subtitle: Scan it. Fill it out. Sign it. Send it. */}
        <p className="text-xs sm:text-[13px] text-blue-200/90 font-medium tracking-wide">
          Scan it. Fill it out. Sign it. Send it.
        </p>

        {/* Step Indicator Bar with Numbered Badges */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 mt-2 flex-wrap">
          {/* Step 1 */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
              stage === "get"
                ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_15px_rgba(245,181,68,0.4)] scale-105"
                : "bg-white/5 text-blue-200/60"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/20 flex items-center justify-center text-[10px] font-black">
              1
            </span>
            <span>Scan Document</span>
          </div>
          <span className="text-blue-400/40 font-bold">→</span>

          {/* Step 2 */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
              stage === "review"
                ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_15px_rgba(245,181,68,0.4)] scale-105"
                : "bg-white/5 text-blue-200/60"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/20 flex items-center justify-center text-[10px] font-black">
              2
            </span>
            <span>Review</span>
          </div>
          <span className="text-blue-400/40 font-bold">→</span>

          {/* Step 3 */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
              stage === "fill-sign"
                ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_15px_rgba(245,181,68,0.4)] scale-105"
                : "bg-white/5 text-blue-200/60"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/20 flex items-center justify-center text-[10px] font-black">
              3
            </span>
            <span>Fill and Sign</span>
          </div>
          <span className="text-blue-400/40 font-bold">→</span>

          {/* Step 4 */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
              stage === "finish"
                ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_15px_rgba(245,181,68,0.4)] scale-105"
                : "bg-white/5 text-blue-200/60"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-950/20 flex items-center justify-center text-[10px] font-black">
              4
            </span>
            <span>Finish PDF</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaypointScanHeader;

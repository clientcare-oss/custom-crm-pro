/**
 * Waypoint Scan Header with Blue Wavy Theme & Step Breadcrumbs
 */

import React from "react";
import { WaypointWaveIcon } from "../WaypointWavyBackdrop";
import PageIdBadge from "@/components/PageIdBadge";
import { ChevronRight, X } from "lucide-react";

interface WaypointScanHeaderProps {
  stage: "get" | "review" | "fill-sign" | "finish";
  onClose: () => void;
}

export function WaypointScanHeader({ stage, onClose }: WaypointScanHeaderProps) {
  return (
    <div className="shrink-0 pb-3 pt-1 border-b border-blue-900/40 relative">
      {/* Top micro-copy headers */}
      <div className="hidden sm:flex items-center justify-between text-[9px] tracking-widest text-blue-300/40 uppercase font-bold select-none px-2 mb-1">
        <span>PEOPLE • DOCUMENTS • BRIGHTER TOMORROWS</span>
        <span>LIFE'S IMPORTANT PAPERWORK ON A CLEARER COURSE.</span>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer z-20"
        title="Close"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Brand Title: Waypoint Scan */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl sm:text-3xl font-serif text-white font-normal tracking-wide">
            Waypoint
          </span>
          <span className="text-2xl sm:text-3xl font-serif text-amber-400 font-bold tracking-wide italic">
            Scan
          </span>
          <PageIdBadge id="PG-023-SCAN" name="Waypoint Scan" />
        </div>

        {/* Golden Wave Ribbon */}
        <WaypointWaveIcon className="w-12 h-3.5 text-amber-400/90 -mt-0.5 mb-1" />

        {/* Subtitle */}
        <p className="text-xs text-blue-200/80 font-medium">
          Scan it. Fill it out. Sign it. Send it.
        </p>

        {/* Step Indicator Bar with Numbered Badges */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 mt-3 flex-wrap">
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

import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import PageIdBadge from "@/components/PageIdBadge";

interface ActiveStudentsDrawerBarProps {
  count: number;
  viewMode: "cards" | "list";
  onViewModeChange: (mode: "cards" | "list") => void;
  shelfPage?: number;
  totalShelfPages?: number;
  onShelfPageChange?: (page: number) => void;
  className?: string;
}

export function ActiveStudentsDrawerBar({
  count,
  viewMode,
  onViewModeChange,
  shelfPage = 0,
  totalShelfPages = 1,
  onShelfPageChange,
  className,
}: ActiveStudentsDrawerBarProps) {
  return (
    <div
      className={cn(
        "w-full relative h-[56px] min-h-[56px] flex items-center justify-between border-t border-[#8A6731]/45 border-b border-[#010612] shadow-[0_8px_24px_rgba(0,0,0,0.95)] overflow-hidden select-none bg-[#051327]",
        className
      )}
      style={{
        backgroundImage: "url('/decor/rail-wood-grain.png')",
        backgroundRepeat: "repeat-x",
        backgroundSize: "auto 56px",
      }}
    >
      {/* ─── Left End: Antique Brass Corner Bracket & Bail Pull + Engraved Nameplate ─── */}
      <div className="flex items-center h-full shrink-0">
        {/* Left Corner Bracket & Vertical Bail Pull Handle */}
        <img
          src="/decor/rail-left-hardware.png"
          alt=""
          className="h-[56px] w-[24px] shrink-0 pointer-events-none select-none object-cover"
        />

        {/* Engraved Antique Brass Nameplate */}
        <div className="relative h-[56px] w-[271px] shrink-0">
          <img
            src="/decor/rail-nameplate.png"
            alt="Active Students"
            className="h-[56px] w-[271px] pointer-events-none select-none"
          />

          {/* Dynamic Count Pill Overlay (Preserves authentic bezel while allowing live count updates) */}
          <div className="absolute left-[214px] top-[17px] w-[39px] h-[22px] rounded-full bg-[#081528] border border-[#8C6225]/40 flex items-center justify-center text-[#E5B866] font-mono font-bold text-xs shadow-inner pointer-events-none">
            {count}
          </div>
        </div>
      </div>

      {/* ─── Center: Dark Midnight Brushed Wood Plank Span + Page ID Plaque ─── */}
      <div className="flex-1 h-full min-w-4 flex items-center justify-center">
        <PageIdBadge id="PG-004" name="Students Case Registry" />
      </div>

      {/* ─── Right End: View Switcher Capsule + Optional Shelf Pager + Right Hardware ─── */}
      <div className="flex items-center gap-2 sm:gap-3 h-full shrink-0 pr-0">
        {/* Shelf Pager (Cards Mode Only when multiple shelves exist) */}
        {totalShelfPages > 1 && viewMode === "cards" && onShelfPageChange && (
          <div className="flex items-center gap-1.5 text-xs text-[#D8B478] bg-[#030914]/85 px-2.5 py-1 rounded-lg border border-[#8A6731]/40 shadow-inner mr-1">
            <button
              type="button"
              disabled={shelfPage === 0}
              onClick={() => onShelfPageChange(Math.max(0, shelfPage - 1))}
              className="px-1 text-[#D8B478] hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
              title="Previous shelf"
            >
              ‹
            </button>
            <span className="font-serif">
              Shelf {shelfPage + 1} of {totalShelfPages}
            </span>
            <button
              type="button"
              disabled={shelfPage >= totalShelfPages - 1}
              onClick={() => onShelfPageChange(Math.min(totalShelfPages - 1, shelfPage + 1))}
              className="px-1 text-[#D8B478] hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
              title="Next shelf"
            >
              ›
            </button>
          </div>
        )}

        {/* View Switcher Capsule Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl border border-[#23436B]/80 bg-[#061427]/90 shadow-[0_2px_10px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.08)]">
          <span className="font-serif text-[12px] sm:text-[13px] text-[#E2EDF8] tracking-wide select-none">
            View: {viewMode === "cards" ? "Cards" : "List"}
          </span>

          <div className="flex items-center gap-1">
            {/* Cards View Toggle Button */}
            <button
              type="button"
              onClick={() => onViewModeChange("cards")}
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer select-none",
                viewMode === "cards"
                  ? "bg-gradient-to-b from-[#F3CD80] via-[#DDAA55] to-[#B37F2C] text-[#1A1208] shadow-[0_2px_6px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.75)]"
                  : "text-[#748CA8] hover:text-[#CCDCEE] hover:bg-[#12233B]/50"
              )}
              title="Cards view"
            >
              <LayoutGrid
                className={cn(
                  "w-4 h-4",
                  viewMode === "cards"
                    ? "fill-[#1A1208] stroke-[#1A1208] stroke-[1]"
                    : "stroke-[2]"
                )}
              />
            </button>

            {/* List View Toggle Button */}
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer select-none",
                viewMode === "list"
                  ? "bg-gradient-to-b from-[#F3CD80] via-[#DDAA55] to-[#B37F2C] text-[#1A1208] shadow-[0_2px_6px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.75)]"
                  : "text-[#748CA8] hover:text-[#CCDCEE] hover:bg-[#12233B]/50"
              )}
              title="List view"
            >
              <List className="w-4 h-4 stroke-[2.4]" />
            </button>
          </div>
        </div>

        {/* Right Vertical Bail Pull Handle & Corner Bracket */}
        <img
          src="/decor/rail-right-hardware.png"
          alt=""
          className="h-[56px] w-[26px] shrink-0 pointer-events-none select-none object-cover"
        />
      </div>
    </div>
  );
}

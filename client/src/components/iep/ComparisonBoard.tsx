import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import { ComparisonItem, getStatusTheme } from "./types";
import { ComparisonCircuitGutter } from "./ComparisonCircuitGutter";

interface ComparisonBoardProps {
  items: ComparisonItem[];
  selectedItem: ComparisonItem | null;
  onSelectItem: (item: ComparisonItem | null) => void;
  onToggleStar: (id: string) => void;
  onToggleReviewed: (id: string) => void;
  advocateMode: boolean;
  newIepDate: string;
  oldIepDate: string;
  onBackToMainView?: () => void;
}

export function ComparisonBoard({
  items,
  selectedItem,
  onSelectItem,
  onToggleStar,
  onToggleReviewed,
  newIepDate,
  oldIepDate,
  onBackToMainView,
}: ComparisonBoardProps) {
  // Synchronized hover state: item id currently hovered
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  return (
    <div className="space-y-6 text-left">
      {/* Sticky Column Headers with Center Engine Label (OLD ALWAYS LEFT, NEW ALWAYS RIGHT) */}
      <div className="sticky top-20 z-20 bg-[#061120]/95 backdrop-blur-md py-3 px-4 rounded-2xl border border-white/10 shadow-xl shadow-black/40">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] items-center gap-2">
          {/* Left Column Header (OLD / PREVIOUS IEP — ALWAYS ON LEFT) */}
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <div>
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                Previous / Baseline Document
              </span>
              <h3 className="font-serif font-black text-sm text-white flex items-center gap-2">
                PREVIOUS IEP ·{" "}
                <span className="font-sans font-medium text-xs text-amber-200">
                  {oldIepDate}
                </span>
              </h3>
            </div>
          </div>

          {/* Center Comparison Engine Header */}
          <div className="flex flex-col items-center justify-center text-center gap-1.5">
            <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10">
              Circuits Engine
            </span>
            {onBackToMainView && (
              <button
                type="button"
                onClick={onBackToMainView}
                className="text-[10.5px] font-semibold text-[#FFE394] hover:text-white underline underline-offset-2 cursor-pointer"
              >
                ← Back to Main View
              </button>
            )}
          </div>

          {/* Right Column Header (NEW / PROPOSED IEP — ALWAYS ON RIGHT) */}
          <div className="flex items-center justify-start md:justify-end gap-2.5 text-left md:text-right">
            <div>
              <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                Proposed Document
              </span>
              <h3 className="font-serif font-black text-sm text-white flex items-center justify-start md:justify-end gap-2">
                PROPOSED IEP ·{" "}
                <span className="font-sans font-medium text-xs text-indigo-200">
                  {newIepDate}
                </span>
              </h3>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          </div>
        </div>
      </div>

      {/* Comparison Rows */}
      {items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl p-8 bg-[#07162B]/30">
          <Info className="h-8 w-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">
            No matching comparison items found.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Try resetting the filter chips above.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item, idx) => {
            const isHovered = hoveredItemId === item.id;
            const isSelected = selectedItem?.id === item.id;
            const theme = getStatusTheme(item.status);
            const active = isHovered || isSelected;

            return (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] items-stretch gap-4 md:gap-0 relative group"
              >
                {/* ── LEFT CARD: OLD / PREVIOUS BASELINE IEP (ALWAYS ON LEFT) ── */}
                <div
                  className={`rounded-2xl p-5 transition-all duration-250 cursor-pointer relative flex flex-col justify-between text-left ${
                    item.status === "added"
                      ? "bg-[#060e1a]/70 border border-dashed border-emerald-500/25 opacity-70 hover:opacity-100"
                      : "bg-[#07162B]/85 border"
                  } ${
                    active
                      ? `${theme.activeBorderColor} shadow-2xl`
                      : `${theme.borderColor} hover:${theme.activeBorderColor}`
                  }`}
                  style={{
                    boxShadow: active
                      ? `0 0 24px -2px ${theme.glowColor}, inset 0 0 14px ${theme.glowRgba}`
                      : `0 0 12px -4px ${theme.glowRgba}`,
                  }}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  onClick={() => onSelectItem(isSelected ? null : item)}
                >
                  {/* Top metadata row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/10">
                      {String(idx + 1).padStart(2, "0")} · Previous ·{" "}
                      {item.categoryLabel}
                    </span>

                    <span className="text-[9px] font-semibold text-amber-300/90">
                      {item.status === "added"
                        ? "Not in Previous"
                        : oldIepDate}
                    </span>
                  </div>

                  {/* Title & Prior Baseline Snippet */}
                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-serif font-black text-slate-200 group-hover:text-amber-200 transition-colors">
                      {item.title}
                    </h4>

                    {item.status === "added" ? (
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 italic">
                        + Not previously included in baseline IEP. (New
                        Addition)
                      </div>
                    ) : (
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 text-xs text-slate-300 leading-relaxed font-sans line-clamp-3">
                        {item.previousValue}
                      </div>
                    )}
                  </div>

                  {/* Card bottom footer */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-mono">
                      {item.previousLocation || "Previous Page"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(item.id);
                        }}
                        className={`p-1 rounded hover:bg-white/10 transition-colors cursor-pointer ${
                          item.isStarred
                            ? "text-amber-400"
                            : "text-slate-500 hover:text-white"
                        }`}
                        title="Flag for discussion"
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            item.isStarred ? "fill-amber-400" : ""
                          }`}
                        />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleReviewed(item.id);
                        }}
                        className={`p-1 rounded hover:bg-white/10 transition-colors cursor-pointer ${
                          item.isReviewed
                            ? "text-emerald-400"
                            : "text-slate-500 hover:text-white"
                        }`}
                        title="Mark as reviewed"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Connection Node on Right Edge of Left Card */}
                  <div
                    className={`hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-slate-950 z-30 transition-all duration-200 ${
                      active
                        ? `${theme.activeBorderColor} shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-125`
                        : `${theme.borderColor} group-hover:${theme.activeBorderColor}`
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full m-auto mt-[3px] transition-colors ${
                        active ? "bg-white" : theme.dotBg
                      }`}
                    />
                  </div>
                </div>

                {/* ── CENTER GUTTER: CIRCUIT ENGINE CONNECTING LINES ── */}
                <div className="hidden md:flex items-center justify-center px-1">
                  <ComparisonCircuitGutter
                    item={item}
                    isHovered={isHovered}
                    isSelected={isSelected}
                    onHover={(hover) =>
                      setHoveredItemId(hover ? item.id : null)
                    }
                    onClick={() => onSelectItem(isSelected ? null : item)}
                  />
                </div>

                {/* ── RIGHT CARD: NEW / PROPOSED IEP (ALWAYS ON RIGHT) ── */}
                <div
                  className={`rounded-2xl p-5 transition-all duration-250 cursor-pointer relative flex flex-col justify-between text-left ${
                    item.status === "removed"
                      ? "bg-[#060e1a]/70 border border-dashed border-rose-500/25 opacity-70 hover:opacity-100"
                      : "bg-[#07162B]/85 border"
                  } ${
                    active
                      ? `${theme.activeBorderColor} shadow-2xl`
                      : `${theme.borderColor} hover:${theme.activeBorderColor}`
                  }`}
                  style={{
                    boxShadow: active
                      ? `0 0 24px -2px ${theme.glowColor}, inset 0 0 14px ${theme.glowRgba}`
                      : `0 0 12px -4px ${theme.glowRgba}`,
                  }}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  onClick={() => onSelectItem(isSelected ? null : item)}
                >
                  {/* Connection Node on Left Edge of Right Card */}
                  <div
                    className={`hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-slate-950 z-30 transition-all duration-200 ${
                      active
                        ? `${theme.activeBorderColor} shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-125`
                        : `${theme.borderColor} group-hover:${theme.activeBorderColor}`
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full m-auto mt-[3px] transition-colors ${
                        active ? "bg-white" : theme.dotBg
                      }`}
                    />
                  </div>

                  {/* Top metadata row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-indigo-500/20">
                        Proposed · {newIepDate}
                      </span>
                      {item.numericDiff && (
                        <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {item.numericDiff}
                        </span>
                      )}
                    </div>

                    <Badge
                      className={`text-[8px] uppercase tracking-wider font-bold ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                    >
                      {item.status}
                    </Badge>
                  </div>

                  {/* Title & Core Diff */}
                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-serif font-black text-white group-hover:text-indigo-200 transition-colors">
                      {item.title}
                    </h4>

                    {item.status === "removed" ? (
                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300 italic">
                        ✕ Section or support omitted in proposed IEP version.
                      </div>
                    ) : (
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 text-xs text-slate-200 leading-relaxed font-sans line-clamp-3">
                        {item.newValue}
                      </div>
                    )}
                  </div>

                  {/* Card bottom footer */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-slate-500">
                      {item.newLocation || "Proposed Page"}
                    </span>

                    <div className="flex items-center gap-2">
                      {item.userNote && (
                        <span
                          className="flex items-center gap-1 text-indigo-400 font-semibold"
                          title="Has custom notes"
                        >
                          <MessageSquare className="h-3 w-3" /> Note
                        </span>
                      )}
                      {item.isStarred && (
                        <span
                          className="flex items-center gap-1 text-amber-400 font-semibold"
                          title="In meeting prep brief"
                        >
                          <Star className="h-3 w-3 fill-amber-400" /> Prep
                        </span>
                      )}
                      <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-semibold">
                        Inspect <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

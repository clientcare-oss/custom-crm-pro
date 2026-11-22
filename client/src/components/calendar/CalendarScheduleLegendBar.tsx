import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarScheduleLegendBarProps {
  onSelectPattern?: (patternKey: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

export const LEGEND_ITEMS = [
  {
    key: "confirmed",
    label: "Confirmed Meeting",
    swatchClass: "bg-emerald-500 border border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
    textClass: "text-emerald-300",
  },
  {
    key: "tentative_hold",
    label: "Tentative Hold (Group)",
    swatchClass: "bg-[#0284c7] border border-cyan-300 shadow-[0_0_8px_rgba(2,132,199,0.4)]",
    textClass: "text-cyan-300",
  },
  {
    key: "parent_call",
    label: "Parent Call / Discovery",
    swatchClass: "bg-[#d97706] border border-amber-300 shadow-[0_0_8px_rgba(217,119,6,0.4)]",
    textClass: "text-amber-300",
  },
  {
    key: "internal_work",
    label: "Internal Work",
    swatchClass: "bg-[#9333ea] border border-purple-300 shadow-[0_0_8px_rgba(147,51,234,0.4)]",
    textClass: "text-purple-300",
  },
  {
    key: "blackout",
    label: "Blackout",
    swatchClass: "bg-[#e11d48] border border-rose-300 shadow-[0_0_8px_rgba(225,29,72,0.4)]",
    textClass: "text-rose-300",
  },
  {
    key: "pto",
    label: "PTO / Vacation",
    style: {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(6, 182, 212, 0.8) 0px, rgba(6, 182, 212, 0.8) 4px, rgba(14, 116, 144, 0.9) 4px, rgba(14, 116, 144, 0.9) 8px)",
    },
    swatchClass: "border border-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.3)]",
    textClass: "text-cyan-200",
  },
  {
    key: "personal",
    label: "Personal Day",
    style: {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(99, 102, 241, 0.8) 0px, rgba(99, 102, 241, 0.8) 4px, rgba(67, 56, 202, 0.9) 4px, rgba(67, 56, 202, 0.9) 8px)",
    },
    swatchClass: "border border-indigo-400/80 shadow-[0_0_8px_rgba(99,102,241,0.3)]",
    textClass: "text-indigo-200",
  },
  {
    key: "holiday",
    label: "Holiday",
    style: {
      backgroundImage:
        "repeating-linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0px, rgba(59, 130, 246, 0.8) 3px, rgba(30, 58, 138, 0.9) 3px, rgba(30, 58, 138, 0.9) 6px)",
    },
    swatchClass: "border border-blue-400/80 shadow-[0_0_8px_rgba(59,130,246,0.3)]",
    textClass: "text-blue-200",
  },
  {
    key: "office_closed",
    label: "Office Closed",
    style: {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(100, 116, 139, 0.7) 0px, rgba(100, 116, 139, 0.7) 4px, rgba(51, 65, 85, 0.9) 4px, rgba(51, 65, 85, 0.9) 8px)",
    },
    swatchClass: "border border-slate-400/80 shadow-[0_0_8px_rgba(100,116,139,0.3)]",
    textClass: "text-slate-300",
  },
];

export default function CalendarScheduleLegendBar({
  onSelectPattern,
  isOpen,
  onToggle,
  className,
}: CalendarScheduleLegendBarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const expanded = isOpen !== undefined ? isOpen : internalOpen;
  const handleToggle = onToggle || (() => setInternalOpen((prev) => !prev));

  if (!expanded) {
    return null;
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-xl border border-[#C5A059]/35 bg-[#071A36]/92 px-3.5 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.08)] scrollbar-thin scrollbar-thumb-[#3A2C18] scrollbar-track-transparent",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 min-w-max">
        <div className="flex items-center gap-4">
          {/* Legend Title */}
          <div className="flex items-center gap-2 pr-2 border-r border-[#C5A059]/30 shrink-0">
            <span className="text-xs font-serif font-bold text-[#FFE394] tracking-wide">
              Schedule Key
            </span>
          </div>

          {/* Legend Swatches */}
          <div className="flex items-center gap-3.5 flex-wrap">
            {LEGEND_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectPattern?.(item.key)}
                className="inline-flex items-center gap-1.5 text-xs text-[#C6B697] hover:text-[#FFF4D4] transition-colors cursor-pointer group"
              >
                <span
                  style={item.style}
                  className={cn(
                    "h-2.5 w-3.5 rounded-[2px] shrink-0 group-hover:scale-110 transition-transform",
                    item.swatchClass
                  )}
                />
                <span className="text-[11px] font-medium tracking-tight">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-1 rounded-md border border-[#C5A059]/35 bg-[#041022]/90 px-2 py-0.5 text-[10px] font-semibold text-[#EAD8B1] hover:text-[#FFF4D4] hover:border-[#FFE394]/70 transition-all cursor-pointer shrink-0"
        >
          <span>Collapse</span>
          <ChevronUp className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

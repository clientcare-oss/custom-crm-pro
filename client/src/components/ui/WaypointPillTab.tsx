import React from "react";
import { cn } from "@/lib/utils";

export interface WaypointPillTabProps {
  label: string;
  count?: number | string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}

export function WaypointPillTab({
  label,
  count,
  active = false,
  onClick,
  className,
  title,
}: WaypointPillTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      className={cn(
        "flex items-center gap-2.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-serif transition-all cursor-pointer whitespace-nowrap tracking-wide select-none group",
        active
          ? "border border-[#E5C175] bg-gradient-to-b from-[#142B49] via-[#0E2038] to-[#081527] text-[#FFF4DD] font-bold shadow-[0_0_14px_rgba(229,193,117,0.35),inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_6px_rgba(0,0,0,0.7)]"
          : "border border-[#23354E] hover:border-[#D4B886]/70 bg-[#061220]/90 hover:bg-[#0B1E34] text-[#D8CABA] hover:text-[#FFF4DD] font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.04),0_2px_4px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "px-2.5 py-0.5 rounded-full text-[11px] font-serif font-bold tracking-tight transition-all",
            active
              ? "bg-[#040E1E] border border-[#E5C175] text-[#FCE09E] shadow-[0_0_8px_rgba(229,193,117,0.35)]"
              : "bg-[#020813] border border-[#1A2A40] text-[#A69784] group-hover:text-[#D8CABA] group-hover:border-[#384C69]"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default WaypointPillTab;

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
          ? "border border-[#FFE299] bg-gradient-to-b from-[#1B3A63] via-[#112744] to-[#09182D] text-[#FFF8E7] font-bold shadow-[0_0_18px_rgba(229,193,117,0.45),inset_0_1px_1.5px_rgba(255,248,220,0.35),inset_0_-2px_4px_rgba(0,0,0,0.6),0_4px_10px_rgba(0,0,0,0.85)]"
          : "border border-[#B88943]/70 hover:border-[#E5C175] bg-gradient-to-b from-[#142B49] via-[#0E2038] to-[#081527] hover:from-[#193458] hover:via-[#112642] hover:to-[#0A192F] text-[#F2E6D0] hover:text-[#FFF8E7] font-semibold shadow-[0_0_10px_rgba(184,137,67,0.18),inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-2px_4px_rgba(0,0,0,0.55),0_3px_8px_rgba(0,0,0,0.75)]",
        className
      )}
    >
      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "px-2.5 py-0.5 rounded-full text-[11px] font-serif font-bold tracking-tight transition-all",
            active
              ? "bg-[#040E1E] border border-[#FFE299] text-[#FFE5A3] shadow-[0_0_10px_rgba(229,193,117,0.45),inset_0_1px_2px_rgba(0,0,0,0.85)]"
              : "bg-[#040E1E] border border-[#B88943]/75 text-[#E8C77B] group-hover:text-[#FFE5A3] group-hover:border-[#E5C175] shadow-[0_0_6px_rgba(184,137,67,0.2),inset_0_1px_2px_rgba(0,0,0,0.85)]"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default WaypointPillTab;

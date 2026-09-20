import React from "react";
import { cn } from "@/lib/utils";
import { Users, Clock } from "lucide-react";

export interface TimeZoneClockItem {
  id: string;
  name: string;
  timeZone: string;
  timeString: string;
  timeOnly: string;
  hour: number;
  minute: number;
  period: "AM" | "PM";
  status: "green" | "yellow" | "red";
  statusLabel: string;
  activeClientCount: number;
}

interface TimeZoneClocksProps {
  clocks: TimeZoneClockItem[];
  selectedZone: string | null;
  onSelectZone: (zoneId: string | null) => void;
}

export function TimeZoneClocks({ clocks, selectedZone, onSelectZone }: TimeZoneClocksProps) {
  return (
    <div className="w-full">
      {/* Responsive grid displaying all clocks without horizontal scrolling */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3 w-full">
        {clocks.map((clock) => {
          const isSelected = selectedZone === clock.timeZone;

          const statusColor =
            clock.status === "green"
              ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
              : clock.status === "yellow"
              ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
              : "text-rose-400 border-rose-500/40 bg-rose-500/10";

          const dotColor =
            clock.status === "green"
              ? "bg-emerald-400 ring-emerald-400/30"
              : clock.status === "yellow"
              ? "bg-amber-400 ring-amber-400/30"
              : "bg-rose-400 ring-rose-400/30";

          return (
            <button
              key={clock.id}
              type="button"
              onClick={() => onSelectZone(isSelected ? null : clock.timeZone)}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl p-2.5 sm:p-3 transition-all text-left min-w-0 w-full overflow-hidden",
                "bg-[#07162B]/85 hover:bg-[#0b213f] border backdrop-blur-md",
                isSelected
                  ? "border-sky-400/90 shadow-[0_0_20px_rgba(56,189,248,0.25)] ring-1 ring-sky-400/50 bg-[#0a2347]"
                  : "border-slate-800/80 hover:border-slate-700/90"
              )}
            >
              {/* Header Label & Client Count */}
              <div className="flex items-center justify-between gap-1 mb-1 min-w-0 w-full">
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-sky-400 uppercase truncate">
                  {clock.name}
                </span>
                {clock.activeClientCount > 0 && (
                  <span
                    className="text-[9px] sm:text-[10px] font-semibold text-slate-300 flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded-full shrink-0"
                    title={`${clock.activeClientCount} active client${clock.activeClientCount > 1 ? "s" : ""} in this time zone`}
                  >
                    <Users className="w-2.5 h-2.5 text-sky-400" />
                    {clock.activeClientCount}
                  </span>
                )}
              </div>

              {/* Live Time */}
              <div className="flex items-baseline gap-1 my-1 min-w-0">
                <span className="text-xl sm:text-2xl xl:text-3xl font-extrabold tracking-tight text-white font-mono leading-none">
                  {clock.timeOnly}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-300">
                  {clock.period}
                </span>
              </div>

              {/* Calling Status Pill */}
              <div
                className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-800/60 min-w-0 w-full"
                title={clock.statusLabel}
              >
                <span className={cn("w-2 h-2 rounded-full ring-2 shrink-0 animate-pulse", dotColor)} />
                <span className="text-[10px] sm:text-xs font-medium text-slate-200 truncate">
                  {clock.statusLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

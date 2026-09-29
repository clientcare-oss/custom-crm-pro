import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTimeInZone,
  getCallingStatus,
  detectTimeZoneFromLocation,
} from "@shared/timezones";

interface ClientCallingSafetyBadgeProps {
  timeZone?: string | null;
  city?: string | null;
  state?: string | null;
  preferredStart?: string | null;
  preferredEnd?: string | null;
  compact?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function ClientCallingSafetyBadge({
  timeZone,
  city,
  state,
  preferredStart,
  preferredEnd,
  compact = false,
  showIcon = true,
  className = "",
}: ClientCallingSafetyBadgeProps) {
  const targetZone =
    timeZone ||
    (state ? detectTimeZoneFromLocation(city || undefined, state).timeZone : "America/New_York");

  const timeInfo = getTimeInZone(targetZone);
  const status = getCallingStatus(targetZone, {
    preferredStart,
    preferredEnd,
  });

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 flex-wrap text-xs",
        compact ? "text-[11px]" : "text-xs",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {showIcon && <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
        <span className="font-medium">Client local time:</span>
        <span className="font-mono font-bold text-foreground">{timeInfo.timeString}</span>
        <span className="text-[10px] text-muted-foreground">({status.tzAbbr})</span>
      </div>

      <div className="flex items-center">
        {status.status === "green" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ✓ Appropriate calling time
          </span>
        ) : status.status === "yellow" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            ⚠ Use discretion ({status.recommendation})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            ⚠ {status.label === "Too early" ? "Too early to call" : "Too late to call"}
          </span>
        )}
      </div>
    </div>
  );
}

export default ClientCallingSafetyBadge;

import React from "react";
import { CalendarClock, Calendar } from "lucide-react";
import { DiscoveryCallCard } from "./DiscoveryCallCard";
import type { DiscoveryCallItem } from "./types";

interface DiscoveryCallsSectionProps {
  todaysCalls: DiscoveryCallItem[];
  upcomingCalls: DiscoveryCallItem[];
  onOpenRecord: (call: DiscoveryCallItem) => void;
  onStartCall: (leadId: number) => void;
}

export function DiscoveryCallsSection({
  todaysCalls,
  upcomingCalls,
  onOpenRecord,
  onStartCall,
}: DiscoveryCallsSectionProps) {
  return (
    <div className="space-y-6">
      {/* ── Section 1: Today's Discovery Calls ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-serif font-bold tracking-tight text-[#FFF4D4] flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C5A059] flex items-center justify-center shadow-xs">
              <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <span>Today’s Discovery Calls</span>
            {todaysCalls.length > 0 && (
              <span className="rounded-full bg-[#020A17] text-[#FFE394] border border-[#3A2C18] px-2.5 py-0.5 text-xs font-bold shadow-xs">
                {todaysCalls.length}
              </span>
            )}
          </h2>
        </div>

        {todaysCalls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {todaysCalls.map((call) => (
              <DiscoveryCallCard
                key={call.id}
                call={call}
                isToday={true}
                onOpenRecord={onOpenRecord}
                onStartCall={onStartCall}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#3A2C18] bg-[#020A17]/40 p-5 text-center">
            <p className="text-sm text-[#A69371]">
              No discovery calls scheduled today.
            </p>
          </div>
        )}
      </div>

      {/* ── Section 2: Upcoming Discovery Calls ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-serif font-bold tracking-tight text-[#FFF4D4] flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#DFBE77] flex items-center justify-center shadow-xs">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <span>Upcoming Discovery Calls</span>
            {upcomingCalls.length > 0 && (
              <span className="rounded-full bg-[#020A17] text-[#C6B697] border border-[#3A2C18] px-2.5 py-0.5 text-xs font-bold shadow-xs">
                {upcomingCalls.length}
              </span>
            )}
          </h2>
        </div>

        {upcomingCalls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {upcomingCalls.map((call) => (
              <DiscoveryCallCard
                key={call.id}
                call={call}
                isToday={false}
                onOpenRecord={onOpenRecord}
                onStartCall={onStartCall}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#3A2C18] bg-[#020A17]/40 p-5 text-center">
            <p className="text-sm text-[#A69371]">
              No upcoming discovery calls scheduled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import React from "react";
import {
  Phone,
  PhoneMissed,
  Voicemail,
  CalendarCheck,
  ArrowDown,
  AlertCircle,
} from "lucide-react";

interface CallCenterStatsProps {
  callsTodayCount?: number;
  callsLabel?: string;
  missedCallsCount?: number;
  callbacksCount?: number;
  voicemailCount?: number;
  scheduledCallsCount?: number;
  leadsCount?: number;
  needsAttentionCount?: number;
  contactsCount?: number;
  activeFilter?: string;
  onSelectStat?: (filterKey: string) => void;
  onViewLeads?: () => void;
  onScrollToNeedsAttention?: () => void;
  onScrollToContactList?: () => void;
}

export function CallCenterStats({
  callsTodayCount = 0,
  callsLabel = "Calls Today",
  missedCallsCount = 0,
  voicemailCount = 0,
  scheduledCallsCount = 0,
  leadsCount = 0,
  needsAttentionCount = 0,
  activeFilter,
  onSelectStat,
}: CallCenterStatsProps) {
  const stats = [
    {
      key: "calls",
      label: callsLabel,
      count: callsTodayCount,
      icon: Phone,
      pulse: false,
    },
    {
      key: "missed",
      label: "Missed Calls",
      count: missedCallsCount,
      icon: PhoneMissed,
      pulse: missedCallsCount > 0,
      pulseColor: "bg-rose-400",
    },
    {
      key: "voicemails",
      label: "Voicemail",
      count: voicemailCount,
      icon: Voicemail,
      pulse: voicemailCount > 0,
      pulseColor: "bg-[#FFE394]",
    },
    {
      key: "scheduled",
      label: "Scheduled Calls",
      count: scheduledCallsCount,
      icon: CalendarCheck,
      pulse: false,
    },
    {
      key: "needs-attention",
      label: "Needs Attention",
      count: needsAttentionCount ?? leadsCount ?? 0,
      icon: AlertCircle,
      isAnchorLink: true,
      pulse: (needsAttentionCount ?? leadsCount ?? 0) > 0,
      pulseColor: "bg-rose-400",
    },
  ];

  return (
    <div className="flex justify-center items-center w-full px-2 sm:px-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full max-w-[920px]">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isActive = activeFilter === stat.key;
          return (
            <button
              type="button"
              key={stat.key}
              onClick={() => {
                onSelectStat?.(isActive ? "all" : stat.key);
              }}
              className={`adm-metric-card adm-cc-kpi group cursor-pointer overflow-hidden rounded-[18px] px-3.5 py-2.5 flex flex-col justify-between text-left select-none active:scale-[0.98] ${
                isActive ? "adm-cc-kpi-active" : ""
              }`}
              title={`Click to view ${stat.label} (${stat.count})`}
            >
              <div aria-hidden="true" className="adm-rim-glint-top" />
              <div aria-hidden="true" className="adm-rim-glint-bottom" />

              {/* Top Row: Sculpted Recessed Brass Icon Tile + Optional Live Dot / Anchor Hint */}
              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="adm-icon-tile h-8 w-8 rounded-[10px] flex items-center justify-center text-[#ECC97B] shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
                </div>
                <div className="flex items-center gap-1.5">
                  {stat.pulse && (
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          stat.pulseColor || "bg-[#DFBE77]"
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          stat.pulseColor || "bg-[#FFE394]"
                        }`}
                      />
                    </span>
                  )}
                  {stat.isAnchorLink && (
                    <ArrowDown className="h-3.5 w-3.5 text-[#ECC97B]/85 group-hover:text-[#FAF6EC] transition-all shrink-0 animate-bounce" />
                  )}
                </div>
              </div>

              {/* Center: Crisp Playfair Display Warm Ivory Numeral */}
              <div className="relative z-10 flex-1 flex items-center justify-center my-0.5">
                <span className="font-serif text-[30px] sm:text-[34px] font-extrabold text-[#FAF6EC] leading-none tracking-tight tabular-nums drop-shadow-[0_4px_10px_rgba(0,0,0,0.82)]">
                  {stat.count}
                </span>
              </div>

              {/* Bottom: Clean Parchment-Blue Label */}
              <div className="relative z-10 w-full text-center text-[11.5px] sm:text-[12.5px] font-normal text-[#D4DFEE] group-hover:text-[#FFF5DC] transition-colors tracking-[0.015em] whitespace-nowrap truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {stat.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CallCenterStats;

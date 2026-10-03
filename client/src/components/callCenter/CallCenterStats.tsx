import React from "react";
import {
  PhoneMissed,
  Voicemail,
  CalendarCheck,
  BookUser,
  ArrowDown,
  AlertCircle,
} from "lucide-react";

interface CallCenterStatsProps {
  callsTodayCount?: number;
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
  missedCallsCount = 2,
  voicemailCount = 1,
  scheduledCallsCount = 4,
  leadsCount = 3,
  needsAttentionCount = 3,
  contactsCount = 15,
  activeFilter,
  onSelectStat,
  onScrollToNeedsAttention,
  onScrollToContactList,
}: CallCenterStatsProps) {
  const stats = [
    {
      key: "missed",
      label: "Missed Calls",
      count: missedCallsCount,
      icon: PhoneMissed,
      iconColor: "text-rose-400",
    },
    {
      key: "voicemails",
      label: "Voicemail",
      count: voicemailCount,
      icon: Voicemail,
      iconColor: "text-[#FFE394]",
    },
    {
      key: "scheduled",
      label: "Scheduled Calls",
      count: scheduledCallsCount,
      icon: CalendarCheck,
      iconColor: "text-[#C5A059]",
    },
    {
      key: "needs-attention",
      label: "Needs Attention",
      count: needsAttentionCount ?? leadsCount ?? 3,
      icon: AlertCircle,
      iconColor: "text-rose-400",
      isAnchorLink: true,
      action: onScrollToNeedsAttention,
    },
    {
      key: "contacts",
      label: "Contacts",
      count: contactsCount,
      icon: BookUser,
      iconColor: "text-[#DFBE77]",
      isAnchorLink: true,
      action: onScrollToContactList,
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 w-full overflow-x-auto no-scrollbar">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeFilter === stat.key;
        return (
          <div
            key={stat.key}
            onClick={() => {
              if (stat.action) {
                stat.action();
              } else {
                onSelectStat?.(stat.key);
              }
            }}
            className={`flex items-center justify-between gap-1 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border transition-all cursor-pointer group min-h-[46px] whitespace-nowrap shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.6)] ${
              isActive
                ? "bg-[#07162B] border-[#C5A059] shadow-[0_0_15px_rgba(197,160,89,0.25)]"
                : "bg-[#05142B]/90 border-[#3A2C18] hover:border-[#C5A059]/60 hover:bg-[#07162B]"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-lg border border-[#3A2C18] bg-[#020A17] flex items-center justify-center shrink-0 ${stat.iconColor}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-serif font-bold text-[#FFF4D4] leading-none">
                  {stat.count}
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-[#C6B697] whitespace-nowrap leading-tight mt-0.5">
                  {stat.label}
                </div>
              </div>
            </div>
            {stat.isAnchorLink && (
              <ArrowDown
                className="h-3 w-3 text-[#A69371] group-hover:text-[#FFE394] transition-all shrink-0 animate-bounce ml-0.5"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CallCenterStats;

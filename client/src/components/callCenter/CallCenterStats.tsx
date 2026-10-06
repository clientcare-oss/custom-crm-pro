import React from "react";
import {
  Phone,
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
  callsTodayCount = 6,
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
      key: "calls",
      label: "Calls Today",
      count: callsTodayCount,
      icon: Phone,
      iconColor: "text-[#FFE394]",
    },
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
    <div className="max-w-5xl mx-auto w-full px-2 sm:px-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 w-full">
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
              className={`flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer group min-h-[72px] sm:min-h-[78px] shrink-0 shadow-[0_6px_18px_rgba(0,0,0,0.7),inset_0_1px_1.5px_rgba(255,227,148,0.22)] ${
                isActive
                  ? "bg-[#07162B] border-[#C5A059] shadow-[0_0_18px_rgba(197,160,89,0.35),inset_0_1px_2px_rgba(255,227,148,0.4)]"
                  : "bg-[#05142B]/92 border-[#3A2C18] hover:border-[#C5A059]/70 hover:bg-[#07162B]"
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div className={`w-6 h-6 rounded-lg border border-[#3A2C18] bg-[#020A17] flex items-center justify-center shrink-0 ${stat.iconColor}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {stat.isAnchorLink && (
                  <ArrowDown
                    className="h-3 w-3 text-[#A69371] group-hover:text-[#FFE394] transition-all shrink-0 animate-bounce"
                  />
                )}
              </div>
              <div className="mt-2 min-w-0">
                <div className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] leading-none">
                  {stat.count}
                </div>
                <div className="text-[10.5px] sm:text-[11px] font-medium text-[#C6B697] truncate mt-1 leading-tight">
                  {stat.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CallCenterStats;

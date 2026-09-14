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
  callbacksCount = 2,
  voicemailCount = 1,
  scheduledCallsCount = 4,
  leadsCount = 3,
  needsAttentionCount = 3,
  contactsCount = 15,
  activeFilter,
  onSelectStat,
  onViewLeads,
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
      iconBg: "bg-rose-500/10 border-rose-500/20",
    },
    {
      key: "voicemails",
      label: "Voicemail",
      count: voicemailCount,
      icon: Voicemail,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      key: "scheduled",
      label: "Scheduled Calls",
      count: scheduledCallsCount,
      icon: CalendarCheck,
      iconColor: "text-indigo-400",
      iconBg: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      key: "needs-attention",
      label: "Needs Attention",
      count: needsAttentionCount ?? leadsCount ?? 3,
      icon: AlertCircle,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/10 border-rose-500/20",
      isAnchorLink: true,
      action: onScrollToNeedsAttention,
    },
    {
      key: "contacts",
      label: "Contacts",
      count: contactsCount,
      icon: BookUser,
      iconColor: "text-amber-300",
      iconBg: "bg-amber-400/10 border-amber-400/20",
      isAnchorLink: true,
      action: onScrollToContactList,
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full overflow-x-auto scrollbar-none">
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
            className={`flex items-center justify-between gap-1 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl bg-[#000821] border transition-all cursor-pointer group min-h-[42px] whitespace-nowrap shrink-0 ${
              isActive
                ? "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-[#001035]"
                : stat.key === "needs-attention"
                ? "border-rose-500/30 hover:border-rose-400/60 hover:bg-rose-500/10"
                : stat.key === "contacts"
                ? "border-amber-400/30 hover:border-amber-400/60 hover:bg-amber-400/10"
                : "border-sky-500/20 hover:border-sky-400/40 hover:bg-sky-500/10"
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div
                className={`w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg border flex items-center justify-center shrink-0 ${stat.iconBg} ${stat.iconColor}`}
              >
                <Icon className="h-3 w-3 sm:h-3.5 sm:h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-black text-white leading-none font-sans">
                  {stat.count}
                </div>
                <div className="text-[10px] sm:text-[10.5px] font-semibold text-slate-300 whitespace-nowrap leading-tight mt-0.5">
                  {stat.label}
                </div>
              </div>
            </div>
            {stat.isAnchorLink && (
              <ArrowDown
                className={`h-3 w-3 ${
                  stat.key === "needs-attention"
                    ? "text-rose-400/70 group-hover:text-rose-300"
                    : "text-amber-400/70 group-hover:text-amber-300"
                } transition-all shrink-0 animate-bounce ml-0.5`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CallCenterStats;

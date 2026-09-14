import React from "react";
import { Phone, PhoneMissed, Calendar, Voicemail, CalendarCheck, Users, ArrowUpRight, BookUser, ArrowDown } from "lucide-react";

interface CallCenterStatsProps {
  callsTodayCount?: number;
  missedCallsCount?: number;
  callbacksCount?: number;
  voicemailCount?: number;
  scheduledCallsCount?: number;
  leadsCount?: number;
  contactsCount?: number;
  activeFilter?: string;
  onSelectStat?: (filterKey: string) => void;
  onViewLeads?: () => void;
  onScrollToContactList?: () => void;
}

export function CallCenterStats({
  callsTodayCount = 6,
  missedCallsCount = 2,
  callbacksCount = 2,
  voicemailCount = 1,
  scheduledCallsCount = 4,
  leadsCount = 3,
  contactsCount = 15,
  activeFilter,
  onSelectStat,
  onViewLeads,
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
      key: "callbacks",
      label: "Callbacks",
      count: callbacksCount,
      icon: Calendar,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/10 border-cyan-500/20",
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
      key: "leads",
      label: "Leads to Follow Up",
      count: leadsCount,
      icon: Users,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      isActionableLink: true,
      action: onViewLeads,
    },
    {
      key: "contacts",
      label: "See Contact List",
      count: contactsCount,
      icon: BookUser,
      iconColor: "text-amber-300",
      iconBg: "bg-amber-400/10 border-amber-400/20",
      isAnchorLink: true,
      action: onScrollToContactList,
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-1.5 sm:gap-2 w-full overflow-x-auto scrollbar-none">
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
                : stat.key === "leads"
                ? "border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/10"
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
            {stat.isActionableLink && (
              <ArrowUpRight className="h-3 w-3 text-emerald-400/70 group-hover:text-emerald-300 transition-all shrink-0 ml-0.5" />
            )}
            {stat.isAnchorLink && (
              <ArrowDown className="h-3 w-3 text-amber-400/70 group-hover:text-amber-300 transition-all shrink-0 animate-bounce ml-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CallCenterStats;

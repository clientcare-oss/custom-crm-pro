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
      key: "calls",
      label: "Calls Today",
      count: callsTodayCount,
      icon: Phone,
      iconColor: "text-sky-400",
      iconBg: "bg-sky-500/10 border-sky-500/20",
    },
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2.5 pt-2">
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
            className={`flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#061830] border transition-all cursor-pointer group ${
              isActive
                ? "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                : stat.key === "leads"
                ? "border-emerald-500/30 hover:border-emerald-400/60 hover:bg-[#07243c]"
                : stat.key === "contacts"
                ? "border-amber-400/30 hover:border-amber-400/60 hover:bg-[#1a2215]"
                : "border-sky-500/20 hover:border-sky-400/40 hover:bg-[#082040]"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${stat.iconBg} ${stat.iconColor}`}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black text-white leading-tight font-sans">
                  {stat.count}
                </div>
                <div className="text-[11px] font-semibold text-slate-300 truncate leading-tight">
                  {stat.label}
                </div>
              </div>
            </div>
            {stat.isActionableLink && (
              <ArrowUpRight className="h-4 w-4 text-emerald-400/60 group-hover:text-emerald-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
            )}
            {stat.isAnchorLink && (
              <ArrowDown className="h-4 w-4 text-amber-400/60 group-hover:text-amber-300 group-hover:translate-y-0.5 transition-all flex-shrink-0 animate-bounce" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CallCenterStats;

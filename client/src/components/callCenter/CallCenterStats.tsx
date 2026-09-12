import React from "react";
import { Phone, PhoneMissed, Calendar, Voicemail, CalendarCheck } from "lucide-react";

interface CallCenterStatsProps {
  callsTodayCount?: number;
  missedCallsCount?: number;
  callbacksCount?: number;
  voicemailCount?: number;
  scheduledCallsCount?: number;
  activeFilter?: string;
  onSelectStat?: (filterKey: string) => void;
}

export function CallCenterStats({
  callsTodayCount = 6,
  missedCallsCount = 2,
  callbacksCount = 2,
  voicemailCount = 1,
  scheduledCallsCount = 4,
  activeFilter,
  onSelectStat,
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
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeFilter === stat.key;
        return (
          <div
            key={stat.key}
            onClick={() => onSelectStat?.(stat.key)}
            className={`flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#061830] border transition-all cursor-pointer ${
              isActive
                ? "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                : "border-sky-500/20 hover:border-sky-400/40 hover:bg-[#082040]"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${stat.iconBg} ${stat.iconColor}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-black text-white leading-tight font-sans">
                {stat.count}
              </div>
              <div className="text-xs font-medium text-slate-300 truncate">
                {stat.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CallCenterStats;

import React from "react";
import { Calendar, Voicemail, Users, ArrowRight } from "lucide-react";

interface WorkQueueSummaryProps {
  callbacksCount?: number;
  voicemailsCount?: number;
  leadsCount?: number;
  onViewCallbacks?: () => void;
  onViewVoicemails?: () => void;
  onViewLeads?: () => void;
}

export function WorkQueueSummary({
  callbacksCount = 2,
  voicemailsCount = 1,
  leadsCount = 3,
  onViewCallbacks,
  onViewVoicemails,
  onViewLeads,
}: WorkQueueSummaryProps) {
  const queues = [
    {
      id: "callbacks",
      title: "Callbacks Waiting",
      count: callbacksCount,
      subtitle: "Clients to call back",
      icon: Calendar,
      iconColor: "text-sky-400",
      iconBg: "bg-sky-500/10 border-sky-500/20",
      action: onViewCallbacks,
    },
    {
      id: "voicemails",
      title: "Voicemails",
      count: voicemailsCount,
      subtitle: "Unread voicemails",
      icon: Voicemail,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      action: onViewVoicemails,
    },
    {
      id: "leads",
      title: "Leads to Follow Up",
      count: leadsCount,
      subtitle: "New or ongoing leads",
      icon: Users,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      action: onViewLeads,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {queues.map((q) => {
        const Icon = q.icon;
        return (
          <div
            key={q.id}
            onClick={q.action}
            className="p-4 rounded-2xl bg-[#061830] border border-sky-500/20 hover:border-sky-400/40 hover:bg-[#082040] transition-all flex flex-col justify-between group cursor-pointer shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${q.iconBg} ${q.iconColor}`}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-white font-sans">
                  {q.count}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm font-bold text-white tracking-tight">
                {q.title}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {q.subtitle}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-sky-400 group-hover:text-amber-300 transition-colors">
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default WorkQueueSummary;

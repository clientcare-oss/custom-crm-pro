import React from "react";
import {
  Calendar,
  FileSearch,
  Mail,
  PhoneCall,
  ShieldAlert,
  AlertCircle,
  FileCheck,
  FilePlus,
  FileText,
  Clock,
  ChevronRight,
} from "lucide-react";

interface ServicesDeliveredSectionProps {
  data: {
    meetingsCompleted: { count: number; hours: number; drilldownKey: string };
    recordsReviewsCompleted: { count: number; hours: number; drilldownKey: string };
    emailWritingRequests: { count: number; drilldownKey: string };
    emailsDrafted: { count: number; hours: number; drilldownKey: string };
    callsAndMessagesLogged: { count: number; hours: number; drilldownKey: string };
    complaintsStarted: { count: number; drilldownKey: string };
    complaintsFiled: { count: number; hours: number; drilldownKey: string };
    escalationsHandled: { count: number; drilldownKey: string };
    urgentIssuesResolved: { count: number; drilldownKey: string };
    evaluationsRequested: { count: number; drilldownKey: string };
    iepsReviewed: { count: number; drilldownKey: string };
    plans504Reviewed: { count: number; drilldownKey: string };
    documentsRequested: { count: number; drilldownKey: string };
    documentsStillMissing: { count: number; drilldownKey: string };
    missingRemindersSent: { count: number; drilldownKey: string };
  };
  onMetricClick: (key: string, title: string) => void;
}

export default function ServicesDeliveredSection({
  data,
  onMetricClick,
}: ServicesDeliveredSectionProps) {
  const items = [
    {
      key: data.meetingsCompleted.drilldownKey,
      title: "Meetings Completed",
      value: `${data.meetingsCompleted.count}`,
      subtitle: `${data.meetingsCompleted.hours} advocacy hours in session`,
      icon: Calendar,
      color: "#0062E3",
    },
    {
      key: data.recordsReviewsCompleted.drilldownKey,
      title: "Records Reviews",
      value: `${data.recordsReviewsCompleted.count}`,
      subtitle: `${data.recordsReviewsCompleted.hours} hours analyzing files`,
      icon: FileSearch,
      color: "#0D9488",
    },
    {
      key: data.iepsReviewed.drilldownKey,
      title: "IEPs Reviewed",
      value: `${data.iepsReviewed.count}`,
      subtitle: "Official school IEP audits",
      icon: FileCheck,
      color: "#8B5CF6",
    },
    {
      key: data.plans504Reviewed.drilldownKey,
      title: "504 Plans Reviewed",
      value: `${data.plans504Reviewed.count}`,
      subtitle: "Accommodation plan reviews",
      icon: FileText,
      color: "#38BDF8",
    },
    {
      key: data.emailsDrafted.drilldownKey,
      title: "Emails Drafted",
      value: `${data.emailsDrafted.count}`,
      subtitle: `${data.emailWritingRequests.count} total requests received`,
      icon: Mail,
      color: "#0084FF",
    },
    {
      key: data.callsAndMessagesLogged.drilldownKey,
      title: "Calls & SMS Logged",
      value: `${data.callsAndMessagesLogged.count}`,
      subtitle: `${data.callsAndMessagesLogged.hours} hours communicating`,
      icon: PhoneCall,
      color: "#14B8A6",
    },
    {
      key: data.complaintsFiled.drilldownKey,
      title: "State Complaints Filed",
      value: `${data.complaintsFiled.count}`,
      subtitle: `${data.complaintsStarted.count} formal actions initiated`,
      icon: ShieldAlert,
      color: "#F59E0B",
    },
    {
      key: data.escalationsHandled.drilldownKey,
      title: "Escalations & Urgent",
      value: `${data.escalationsHandled.count}`,
      subtitle: `${data.urgentIssuesResolved.count} urgent issues resolved`,
      icon: AlertCircle,
      color: "#F43F5E",
    },
    {
      key: data.evaluationsRequested.drilldownKey,
      title: "Evaluations Requested",
      value: `${data.evaluationsRequested.count}`,
      subtitle: "IEE & school psych requests",
      icon: FilePlus,
      color: "#A78BFA",
    },
    {
      key: data.documentsStillMissing.drilldownKey,
      title: "Missing Records",
      value: `${data.documentsStillMissing.count}`,
      subtitle: `${data.missingRemindersSent.count} follow-up reminders sent`,
      icon: AlertCircle,
      color: "#FB7185",
      isAlert: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="border-b border-[#3A2C18] pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2">
            <span>Services Delivered</span>
          </h2>
          <p className="text-xs text-[#C6B697] mt-0.5">
            Advocacy volume metrics. Click any item to inspect the underlying cases and activities.
          </p>
        </div>
        <span className="text-[11px] text-[#A69371] font-medium">Click to Inspect</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((it) => {
          const Icon = it.icon;

          return (
            <div
              key={it.title}
              onClick={() => onMetricClick(it.key, it.title)}
              className={`group relative bg-[#05142B]/90 hover:bg-[#071B38] border rounded-xl p-3.5 transition-all duration-200 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between cursor-pointer select-none ${
                it.isAlert
                  ? "border-rose-500/40 hover:border-rose-400/70"
                  : "border-[#3A2C18] hover:border-[#C5A059]/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: `${it.color}20`, border: `1px solid ${it.color}40` }}
                >
                  <Icon className="w-4 h-4" style={{ color: it.color }} />
                </div>

                <div className="w-6 h-6 rounded-lg bg-[#020A17] border border-[#3A2C18]/60 group-hover:border-[#C5A059]/40 text-[#C6B697] group-hover:text-[#FFE394] flex items-center justify-center transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              <div className="pt-3">
                <div className="text-2xl font-black font-serif text-[#FFF4D4] tracking-tight group-hover:text-[#FFE394] transition-colors">
                  {it.value}
                </div>
                <h4 className="text-xs font-bold text-[#E8DCC4] line-clamp-1 mt-0.5">
                  {it.title}
                </h4>
                <p className="text-[10px] text-[#C6B697] truncate mt-0.5">
                  {it.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

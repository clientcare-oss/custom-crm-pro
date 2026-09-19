import React from "react";
import { FileText, ArrowRight, Users, Calendar, Check } from "lucide-react";

interface ActiveSnapshotCardProps {
  compass?: any;
  nextAppointment?: any;
}

export function ActiveSnapshotCard({
  compass,
  nextAppointment,
}: ActiveSnapshotCardProps) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] border border-[#0D4B84] p-5 sm:p-6 shadow-2xl space-y-4">
      <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-slate-200">
        ACTIVE CASE SNAPSHOT
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* 3 Metric Columns */}
        <div className="xl:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Current Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-[#38BDF8]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                CURRENT STATUS
              </span>
              <span className="text-xs sm:text-sm font-bold text-white leading-snug block truncate" title={compass?.currentStatus || "New IEP draft received"}>
                {compass?.currentStatus || "New IEP draft received"}
              </span>
            </div>
          </div>

          {/* Next Step */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
              <ArrowRight className="h-5 w-5 text-[#38BDF8]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                NEXT STEP
              </span>
              <span className="text-xs sm:text-sm font-bold text-white leading-snug block truncate" title={compass?.nextStep || "Compare draft to parent concerns"}>
                {compass?.nextStep || "Compare draft to parent concerns"}
              </span>
            </div>
          </div>

          {/* Who Has The Ball */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                WHO HAS THE BALL
              </span>
              <span className="text-xs sm:text-sm font-bold text-white leading-snug block truncate" title={compass?.whoHasBall || "Waypoint"}>
                {compass?.whoHasBall || "Waypoint"}
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Meeting Card */}
        <div className="xl:col-span-3 xl:border-l xl:border-[#0E356A]/80 xl:pl-6 flex items-center gap-3.5 bg-[#0A1D38]/50 p-3.5 rounded-2xl border border-[#0E356A]/60">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5 text-purple-300" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              UPCOMING MEETING
            </span>
            <span className="text-xs sm:text-sm font-bold text-white block truncate">
              {nextAppointment?.date ? `${nextAppointment.date} • ${nextAppointment.time || "10:00 AM"}` : "September 24 • 10:00 AM"}
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-teal-500/50 bg-teal-500/15 text-teal-300 text-[10px] font-bold">
              <Check className="h-3 w-3 text-teal-400" />
              <span>CONFIRMED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

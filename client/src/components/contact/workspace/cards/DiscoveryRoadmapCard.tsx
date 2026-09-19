import React from "react";
import { Calendar } from "lucide-react";

export function DiscoveryRoadmapCard() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] border border-[#0D4B84] p-5 sm:p-6 shadow-2xl space-y-4">
      <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-slate-200">
        DISCOVERY CALL ROADMAP
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* 3 Steps */}
        <div className="xl:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#07162B] border-2 border-[#00E5FF] text-[#00E5FF] flex items-center justify-center shrink-0">
              <span className="font-bold text-sm">1</span>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-white leading-tight min-w-0 flex-1">
              Review the family's concerns
            </span>
          </div>

          <div className="flex items-center gap-3 opacity-60 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#07162B] border border-slate-700 text-slate-400 flex items-center justify-center shrink-0">
              <span className="font-bold text-sm">2</span>
            </div>
            <span className="text-xs sm:text-sm text-slate-400 leading-tight min-w-0 flex-1">
              Recommend the right plan
            </span>
          </div>

          <div className="flex items-center gap-3 opacity-60 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#07162B] border border-slate-700 text-slate-400 flex items-center justify-center shrink-0">
              <span className="font-bold text-sm">3</span>
            </div>
            <span className="text-xs sm:text-sm text-slate-400 leading-tight min-w-0 flex-1">
              Start onboarding
            </span>
          </div>
        </div>

        {/* Scheduled Call Badge */}
        <div className="xl:col-span-3 xl:border-l xl:border-[#0E356A]/80 xl:pl-6 flex items-center gap-3.5 bg-[#0A1D38]/50 p-3.5 rounded-2xl border border-[#0E356A]/60">
          <Calendar className="h-8 w-8 text-sky-400 shrink-0" />
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              SCHEDULED CALL
            </span>
            <span className="text-xs font-bold text-white block truncate">Thursday, Sep 24</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-sky-500/50 bg-sky-500/15 text-sky-300 text-[10px] font-bold">
              <span>10:00 AM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

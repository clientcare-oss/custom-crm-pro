import React from "react";
import { FileText, CreditCard, ShieldCheck } from "lucide-react";

export function OffboardingRoadmapCard() {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-[#071A38] via-[#092248] to-[#071A38] border border-[#0E356A] p-5 sm:p-6 shadow-xl space-y-4">
      <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-slate-200">
        OFFBOARDING ROADMAP
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* 4 Steps */}
        <div className="xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Step 1 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#07162B] border-2 border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.4)] text-[#00E5FF] flex items-center justify-center relative shrink-0">
              <FileText className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00E5FF] text-[#07162B] text-[10px] font-bold flex items-center justify-center">
                1
              </span>
            </div>
            <span className="text-xs font-semibold text-white leading-tight min-w-0 flex-1">
              Select closeout reason
            </span>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-2.5 opacity-60 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#07162B] border border-slate-700 text-slate-400 flex items-center justify-center relative shrink-0">
              <FileText className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                2
              </span>
            </div>
            <span className="text-xs text-slate-400 leading-tight min-w-0 flex-1">
              Complete final Case Compass
            </span>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-2.5 opacity-60 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#07162B] border border-slate-700 text-slate-400 flex items-center justify-center relative shrink-0">
              <FileText className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </div>
            <span className="text-xs text-slate-400 leading-tight min-w-0 flex-1">
              Send closing message
            </span>
          </div>

          {/* Step 4 */}
          <div className="flex items-center gap-2.5 opacity-60 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#07162B] border border-slate-700 text-slate-400 flex items-center justify-center relative shrink-0">
              <CreditCard className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                4
              </span>
            </div>
            <span className="text-xs text-slate-400 leading-tight min-w-0 flex-1">
              End billing and archive
            </span>
          </div>
        </div>

        {/* Not Closed Yet Badge */}
        <div className="xl:col-span-3 xl:border-l xl:border-[#0E356A]/80 xl:pl-6 flex items-center gap-3.5 bg-[#0A1D38]/50 p-3.5 rounded-2xl border border-[#0E356A]/60">
          <ShieldCheck className="h-8 w-8 text-purple-400 shrink-0" />
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200 block">
              NOT CLOSED YET
            </span>
            <span className="text-[11px] text-slate-400 block">Portal and services remain active</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-purple-500/50 bg-purple-500/20 text-purple-300 text-[10px] font-bold">
              <span>PENDING CLOSEOUT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

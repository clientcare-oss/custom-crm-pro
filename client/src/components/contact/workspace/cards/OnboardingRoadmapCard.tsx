import React from "react";
import { Check, ArrowRight, CheckSquare } from "lucide-react";

interface OnboardingRoadmapCardProps {
  contact: any;
}

export function OnboardingRoadmapCard({ contact }: OnboardingRoadmapCardProps) {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-[#071A38] via-[#092248] to-[#071A38] border border-[#0E356A] p-5 sm:p-6 shadow-xl space-y-4">
      <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-slate-200">
        ONBOARDING ROADMAP
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* 6 Steps */}
        <div className="xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 min-w-0">
            <Check className="h-4 w-4 shrink-0" />
            <span className="line-through text-slate-400 truncate">1. Confirm selected plan</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 min-w-0">
            <Check className="h-4 w-4 shrink-0" />
            <span className="line-through text-slate-400 truncate">2. Send agreement</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 min-w-0">
            <Check className="h-4 w-4 shrink-0" />
            <span className="line-through text-slate-400 truncate">3. Complete payment auth</span>
          </div>
          <div className="flex items-center gap-2 text-[#00E5FF] font-bold min-w-0">
            <ArrowRight className="h-4 w-4 shrink-0" />
            <span className="truncate">4. Parent onboarding tasks</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 opacity-60 min-w-0">
            <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
            <span className="truncate">5. Educational records</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 opacity-60 min-w-0">
            <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
            <span className="truncate">6. Notify school & activate</span>
          </div>
        </div>

        {/* Onboarding Progress Badge */}
        <div className="xl:col-span-3 xl:border-l xl:border-[#0E356A]/80 xl:pl-6 flex items-center gap-3.5 bg-[#0A1D38]/50 p-3.5 rounded-2xl border border-[#0E356A]/60">
          <CheckSquare className="h-8 w-8 text-sky-400 shrink-0" />
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              ONBOARDING PROGRESS
            </span>
            <span className="text-xs sm:text-sm font-bold text-white block truncate">
              {contact?.journeyProgress || 3} of {contact?.journeyTotalSteps || 6} steps complete
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-sky-500/50 bg-sky-500/15 text-sky-300 text-[10px] font-bold">
              <span>IN PROGRESS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

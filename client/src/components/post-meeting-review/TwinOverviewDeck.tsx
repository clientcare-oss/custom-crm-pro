import React from "react";
import { FileText, Target, ChevronRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TwinOverviewDeckProps {
  onViewAllChanges?: () => void;
  onFilterStatus?: (status: "reflected" | "need_review" | "not_located") => void;
}

export function TwinOverviewDeck({
  onViewAllChanges,
  onFilterStatus,
}: TwinOverviewDeckProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Card 1: Changes Since Previous IEP */}
      <div className="rounded-2xl bg-[#03152C]/90 border border-[#0D3866] p-4 sm:p-5 shadow-lg space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#0B3B73] to-[#052044] border border-[#1C60A6] text-teal-300 shadow-sm shrink-0">
              <FileText className="h-5 w-5 text-teal-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Changes Since Previous IEP
              </h3>
              <p className="text-xs text-blue-200/70">
                How the new IEP compares to the previous IEP.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onViewAllChanges}
            className="text-xs font-semibold text-blue-400 hover:text-blue-200 cursor-pointer inline-flex items-center gap-1 transition-colors group shrink-0"
          >
            <span>View All Changes</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* 8 Metric Blocks in 4x2 Grid */}
        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {/* Goals: +2 (green) */}
          <div className="rounded-xl bg-[#05203D] border border-emerald-500/30 p-2 sm:p-2.5 text-center transition-all hover:border-emerald-500/60">
            <span className="text-[11px] text-blue-200/80 block font-medium">Goals</span>
            <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono block mt-0.5">
              +2
            </span>
          </div>

          {/* Services: -1 (red) */}
          <div className="rounded-xl bg-[#200B17] border border-rose-500/40 p-2 sm:p-2.5 text-center transition-all hover:border-rose-500/70">
            <span className="text-[11px] text-rose-200/80 block font-medium">Services</span>
            <span className="text-base sm:text-lg font-bold text-rose-400 font-mono block mt-0.5">
              -1
            </span>
          </div>

          {/* Accommodations: +3 (green) */}
          <div className="rounded-xl bg-[#05203D] border border-emerald-500/30 p-2 sm:p-2.5 text-center transition-all hover:border-emerald-500/60">
            <span className="text-[11px] text-blue-200/80 block font-medium truncate">
              Accommodations
            </span>
            <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono block mt-0.5">
              +3
            </span>
          </div>

          {/* Placement: — (neutral) */}
          <div className="rounded-xl bg-[#061B35] border border-[#133F6E] p-2 sm:p-2.5 text-center transition-all hover:border-[#1C5B9E]">
            <span className="text-[11px] text-blue-300/70 block font-medium">Placement</span>
            <span className="text-base sm:text-lg font-bold text-slate-400 font-mono block mt-0.5">
              —
            </span>
          </div>

          {/* Behavior: +1 (green) */}
          <div className="rounded-xl bg-[#05203D] border border-emerald-500/30 p-2 sm:p-2.5 text-center transition-all hover:border-emerald-500/60">
            <span className="text-[11px] text-blue-200/80 block font-medium">Behavior</span>
            <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono block mt-0.5">
              +1
            </span>
          </div>

          {/* Related Services: — (neutral) */}
          <div className="rounded-xl bg-[#061B35] border border-[#133F6E] p-2 sm:p-2.5 text-center transition-all hover:border-[#1C5B9E]">
            <span className="text-[11px] text-blue-300/70 block font-medium truncate">
              Related Services
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-400 font-mono block mt-0.5">
              —
            </span>
          </div>

          {/* Transportation: — (neutral) */}
          <div className="rounded-xl bg-[#061B35] border border-[#133F6E] p-2 sm:p-2.5 text-center transition-all hover:border-[#1C5B9E]">
            <span className="text-[11px] text-blue-300/70 block font-medium truncate">
              Transportation
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-400 font-mono block mt-0.5">
              —
            </span>
          </div>

          {/* Other: 4 (amber) */}
          <div className="rounded-xl bg-[#241705] border border-amber-500/40 p-2 sm:p-2.5 text-center transition-all hover:border-amber-500/70">
            <span className="text-[11px] text-amber-200/80 block font-medium">Other</span>
            <span className="text-base sm:text-lg font-bold text-[#F5B544] font-mono block mt-0.5">
              4
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Meeting Follow-Through */}
      <div className="rounded-2xl bg-[#03152C]/90 border border-[#0D3866] p-4 sm:p-5 shadow-lg space-y-4">
        {/* Top Header */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#0B3B73] to-[#052044] border border-[#1C60A6] text-blue-300 shadow-sm shrink-0">
            <Target className="h-5 w-5 text-blue-300" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Meeting Follow-Through
            </h3>
            <p className="text-xs text-blue-200/70">
              <span className="font-semibold text-white">12 Agreed Decisions</span> · How the meeting decisions appear in the updated IEP.
            </p>
          </div>
        </div>

        {/* 3 Large Highlighted Outcome Tiles */}
        <div className="grid grid-cols-3 gap-3 pt-0.5">
          {/* Reflected correctly (Green) */}
          <button
            type="button"
            onClick={() => onFilterStatus?.("reflected")}
            className="rounded-xl bg-[#062920] border border-emerald-500/50 p-3 sm:p-4 text-center cursor-pointer transition-all hover:bg-[#073328] hover:border-emerald-400 group"
          >
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono block leading-none">
              9
            </span>
            <span className="text-xs font-semibold text-emerald-200/90 block mt-2 leading-tight">
              Reflected correctly
            </span>
          </button>

          {/* Need review (Amber) */}
          <button
            type="button"
            onClick={() => onFilterStatus?.("need_review")}
            className="rounded-xl bg-[#261A07] border border-amber-500/50 p-3 sm:p-4 text-center cursor-pointer transition-all hover:bg-[#332208] hover:border-amber-400 group"
          >
            <span className="text-2xl sm:text-3xl font-extrabold text-[#F5B544] font-mono block leading-none">
              2
            </span>
            <span className="text-xs font-semibold text-amber-200/90 block mt-2 leading-tight">
              Need review
            </span>
          </button>

          {/* Not located (Red/Wine) */}
          <button
            type="button"
            onClick={() => onFilterStatus?.("not_located")}
            className="rounded-xl bg-[#2B0C16] border border-rose-500/50 p-3 sm:p-4 text-center cursor-pointer transition-all hover:bg-[#38101D] hover:border-rose-400 group"
          >
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono block leading-none">
              1
            </span>
            <span className="text-xs font-semibold text-rose-200/90 block mt-2 leading-tight">
              Not located
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

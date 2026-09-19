import React from "react";
import { FileText, Calendar, Clock, ShieldCheck, Check } from "lucide-react";

interface ServicesPausedCardProps {
  contact: any;
}

export function ServicesPausedCard({ contact }: ServicesPausedCardProps) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] border border-[#0D4B84] p-5 sm:p-6 shadow-2xl space-y-4">
      <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-slate-200">
        PAUSE DETAILS
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* 4 Metric Columns */}
        <div className="xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Reason */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-[#38BDF8]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Reason
              </span>
              <span className="text-xs sm:text-sm font-bold text-white leading-tight block truncate" title={contact?.pauseReason || "Residential placement"}>
                {contact?.pauseReason || "Residential placement"}
              </span>
            </div>
          </div>

          {/* Pause Began */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Pause Began
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white leading-tight block truncate">
                {contact?.pauseStartDate || "September 19, 2026"}
              </span>
            </div>
          </div>

          {/* Expected Review */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-[#38BDF8]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Expected Review
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white leading-tight block truncate">
                {contact?.pauseReviewDate || "January 15, 2027"}
              </span>
            </div>
          </div>

          {/* Contract Treatment */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Contract Treatment
              </span>
              <span className="text-xs sm:text-sm font-bold text-purple-300 leading-tight block truncate" title={contact?.contractTreatment || "Paid-in-full time preserved"}>
                {contact?.contractTreatment || "Paid-in-full time preserved"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Account Protected Badge */}
        <div className="xl:col-span-3 xl:border-l xl:border-[#0E356A]/80 xl:pl-6 flex items-center gap-3.5 bg-[#0A1D38]/50 p-3.5 rounded-2xl border border-[#0E356A]/60">
          <ShieldCheck className="h-8 w-8 text-emerald-400 shrink-0" />
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200 block">
              ACCOUNT PROTECTED
            </span>
            <span className="text-[11px] text-slate-400 block">No billing changes</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-teal-500/50 bg-teal-500/15 text-teal-300 text-[10px] font-bold">
              <Check className="h-3 w-3 text-teal-400" />
              <span>PORTAL ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reassurance Footer */}
      <div className="pt-3 border-t border-[#0E356A]/60 text-center text-xs text-slate-400">
        Client remains active &nbsp;|&nbsp; Case not closed &nbsp;|&nbsp; Documents not archived &nbsp;|&nbsp; Portal access remains active
      </div>
    </div>
  );
}

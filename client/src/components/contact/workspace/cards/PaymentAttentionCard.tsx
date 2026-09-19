import React from "react";
import { FileText, Calendar, CreditCard, ShieldCheck, Check } from "lucide-react";

interface PaymentAttentionCardProps {
  contact: any;
}

export function PaymentAttentionCard({ contact }: PaymentAttentionCardProps) {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-[#071A38] via-[#092248] to-[#071A38] border border-[#0E356A] p-5 sm:p-6 shadow-xl space-y-4">
      <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-slate-200">
        PAYMENT STATUS
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* 4 Metric Columns */}
        <div className="xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Amount Due */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-[#38BDF8]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Amount Due
              </span>
              <span className="text-base sm:text-lg font-bold text-white block">
                {contact?.amountDue || "$55.00"}
              </span>
            </div>
          </div>

          {/* Failed Attempts — Clean 3-gauge signal bars */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-[#38BDF8]" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="14" width="4" height="7" rx="1.5" />
                <rect x="10" y="8" width="4" height="13" rx="1.5" />
                <rect x="17" y="3" width="4" height="18" rx="1.5" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Failed Attempts
              </span>
              <span className="text-base sm:text-lg font-bold text-white block">
                {contact?.failedAttemptCount ?? 1}
              </span>
            </div>
          </div>

          {/* Next Retry */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-[#38BDF8]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Next Retry
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white leading-tight block truncate" title={contact?.nextRetryDate || "September 22, 2026"}>
                {contact?.nextRetryDate || "September 22, 2026"}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-[#38BDF8]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Payment Method
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white leading-tight block truncate" title={contact?.paymentMethodSummary || "Visa ending in 4242"}>
                {contact?.paymentMethodSummary || "Visa ending in 4242"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Protected Badge */}
        <div className="xl:col-span-3 xl:border-l xl:border-[#0E356A]/80 xl:pl-6 flex items-center gap-3.5 bg-[#0A1D38]/50 p-3.5 rounded-2xl border border-[#0E356A]/60">
          <ShieldCheck className="h-8 w-8 text-emerald-400 shrink-0" />
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200 block">
              SERVICES STILL ACTIVE
            </span>
            <span className="text-[11px] text-slate-400 block">Grace period in effect</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-teal-500/50 bg-teal-500/15 text-teal-300 text-[10px] font-bold">
              <Check className="h-3 w-3 text-teal-400" />
              <span>PORTAL ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reassurance Footer */}
      <div className="pt-3 border-t border-[#0E356A]/60 text-center text-xs text-slate-400">
        No automatic offboarding &nbsp;|&nbsp; Family follow-up task created &nbsp;|&nbsp; Services remain active during grace period
      </div>
    </div>
  );
}

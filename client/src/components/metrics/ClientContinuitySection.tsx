import React from "react";
import {
  CalendarCheck,
  RefreshCw,
  TrendingUp,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownRight,
  UserMinus,
  CheckCircle2,
} from "lucide-react";

interface ClientContinuitySectionProps {
  data: {
    renewalsDueNext30Days: number;
    renewalOffersSent: number;
    renewalsCompleted: number;
    renewalRate: number;
    nonRenewalsCount: number;
    cancellationRate: number;
    averageClientLifetimeMonths: number;
    upgradesCount: number;
    downgradesCount: number;
    pausedMembershipsCount: number;
    paymentRelatedClosures: number;
    cancellationReasons: Array<{ reason: string; count: number; pct: number }>;
  };
}

export default function ClientContinuitySection({ data }: ClientContinuitySectionProps) {
  return (
    <div className="space-y-6">
      {/* ── Section Title ── */}
      <div className="border-b border-[#3A2C18] pb-3">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2">
          <span>Client Continuity</span>
        </h2>
        <p className="text-xs text-[#C6B697] mt-0.5">
          Annual membership renewals, client retention curves, and structured offboarding reasons.
        </p>
      </div>

      {/* ── Renewal Dynamics Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Renewal Rate</span>
          <div className="text-2xl font-black text-emerald-400 font-serif">
            {data.renewalRate}%
          </div>
          <span className="text-[10px] text-[#A69371] block">
            {data.renewalsCompleted} of {data.renewalOffersSent} renewed
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Avg Client Lifetime</span>
          <div className="text-2xl font-black text-[#FFF4D4] font-serif">
            {data.averageClientLifetimeMonths} mos
          </div>
          <span className="text-[10px] text-[#A69371] block">Across all paid tiers</span>
        </div>

        <div className="p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Cancellation Rate</span>
          <div className="text-2xl font-black text-rose-300 font-serif">
            {data.cancellationRate}%
          </div>
          <span className="text-[10px] text-[#A69371] block">Industry leading low churn</span>
        </div>

        <div className="p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Paused Memberships</span>
          <div className="text-2xl font-black text-[#FFE394] font-serif">
            {data.pausedMembershipsCount} cases
          </div>
          <span className="text-[10px] text-[#A69371] block">Summer / evaluation pauses</span>
        </div>
      </div>

      {/* ── Cancellation & Non-Renewal Reasons Breakdown ── */}
      <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-serif font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <UserMinus className="w-3.5 h-3.5" />
            <span>Structured Cancellation & Non-Renewal Reasons</span>
          </h3>
          <span className="text-[10px] text-[#A69371] font-medium">Full Audit Trail</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.cancellationReasons.map((r) => (
            <div
              key={r.reason}
              className="p-3.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 flex items-center justify-between gap-2"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold text-[#E8DCC4] block truncate">{r.reason}</span>
                <span className="text-[10px] text-[#A69371] font-mono">{r.pct}% of departures</span>
              </div>
              <span className="font-bold font-mono text-xs text-[#FFE394] bg-[#020A17] px-2 py-0.5 rounded-md border border-[#3A2C18] shrink-0">
                {r.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

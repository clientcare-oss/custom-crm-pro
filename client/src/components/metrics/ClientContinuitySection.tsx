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
      <div className="border-b border-sky-500/20 pb-3">
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <span>Client Continuity</span>
        </h2>
        <p className="text-xs text-blue-200/70 mt-0.5">
          Annual membership renewals, client retention curves, and structured offboarding reasons.
        </p>
      </div>

      {/* ── Renewal Dynamics Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#07162B] border border-sky-500/25 space-y-1">
          <span className="text-[10px] font-bold text-sky-300 uppercase block">Renewal Rate</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {data.renewalRate}%
          </div>
          <span className="text-[10px] text-blue-200/60 block">
            {data.renewalsCompleted} of {data.renewalOffersSent} renewed
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#07162B] border border-sky-500/25 space-y-1">
          <span className="text-[10px] font-bold text-sky-300 uppercase block">Avg Client Lifetime</span>
          <div className="text-2xl font-black text-white font-mono">
            {data.averageClientLifetimeMonths} mos
          </div>
          <span className="text-[10px] text-blue-200/60 block">Across all paid tiers</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#07162B] border border-sky-500/25 space-y-1">
          <span className="text-[10px] font-bold text-sky-300 uppercase block">Cancellation Rate</span>
          <div className="text-2xl font-black text-rose-300 font-mono">
            {data.cancellationRate}%
          </div>
          <span className="text-[10px] text-blue-200/60 block">Industry leading low churn</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#07162B] border border-sky-500/25 space-y-1">
          <span className="text-[10px] font-bold text-sky-300 uppercase block">Paused Memberships</span>
          <div className="text-2xl font-black text-amber-300 font-mono">
            {data.pausedMembershipsCount} cases
          </div>
          <span className="text-[10px] text-blue-200/60 block">Summer / evaluation pauses</span>
        </div>
      </div>

      {/* ── Cancellation & Non-Renewal Reasons Breakdown ── */}
      <div className="bg-[#07162B] border border-sky-500/25 rounded-2xl p-5 shadow-md space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <UserMinus className="w-3.5 h-3.5" />
            <span>Structured Cancellation & Non-Renewal Reasons</span>
          </h3>
          <span className="text-[10px] text-blue-200/50 font-medium">Full Audit Trail</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.cancellationReasons.map((r) => (
            <div
              key={r.reason}
              className="p-3.5 rounded-xl bg-[#001026]/80 border border-sky-500/15 flex items-center justify-between gap-2"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-semibold text-white block truncate">{r.reason}</span>
                <span className="text-[10px] text-blue-200/50 font-mono">{r.pct}% of departures</span>
              </div>
              <span className="font-bold font-mono text-xs text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-lg border border-sky-400/20 shrink-0">
                {r.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

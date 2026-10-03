import React from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Building,
} from "lucide-react";

interface PlansRevenueSectionProps {
  data: {
    planBreakdown: {
      plan55: { clients: number; mrr: number; totalRevenue: number; avgMonths: number };
      plan105: { clients: number; mrr: number; totalRevenue: number; avgMonths: number };
      scholarship: { clients: number; mrr: number; totalRevenue: number; avgMonths: number };
      payPerUse: { clients: number; mrr: number; totalRevenue: number; avgMonths: number };
    };
    billingCadence: {
      monthlyClients: number;
      paidInFullClients: number;
      monthlyRevenue: number;
      paidInFullRevenue: number;
    };
    newRecurringRevenue: number;
    totalCollectedRevenue: number;
    averageRevenuePerFamily: number;
    clientLifetimeRevenue: number;
    upgradesCount: number;
    downgradesCount: number;
    paymentFailures: number;
    recoveredPayments: number;
    pausedMemberships: number;
    cancellationsCount: number;
    revenueByState: Array<{ state: string; code: string; revenue: number; percentage: number }>;
    planComparisonTable: Array<{
      metric: string;
      p55: string;
      p105: string;
      scholarship: string;
      payPerUse: string;
    }>;
  };
}

export default function PlansRevenueSection({ data }: PlansRevenueSectionProps) {
  const planCards = [
    {
      name: "$55 Membership",
      tier: "$55",
      clients: data.planBreakdown.plan55.clients,
      mrr: data.planBreakdown.plan55.mrr,
      revenue: data.planBreakdown.plan55.totalRevenue,
      avgMonths: data.planBreakdown.plan55.avgMonths,
      color: "#0062E3", // Electric blue
      badge: "Core Plan",
    },
    {
      name: "$105 Comprehensive",
      tier: "$105",
      clients: data.planBreakdown.plan105.clients,
      mrr: data.planBreakdown.plan105.mrr,
      revenue: data.planBreakdown.plan105.totalRevenue,
      avgMonths: data.planBreakdown.plan105.avgMonths,
      color: "#8B5CF6", // Violet
      badge: "Full Representation",
    },
    {
      name: "Scholarship / Pro Bono",
      tier: "Free",
      clients: data.planBreakdown.scholarship.clients,
      mrr: 0,
      revenue: 0,
      avgMonths: data.planBreakdown.scholarship.avgMonths,
      color: "#0D9488", // Teal
      badge: "Giving & Impact Sponsored",
    },
    {
      name: "Pay-Per-Use / Ala Carte",
      tier: "Hourly",
      clients: data.planBreakdown.payPerUse.clients,
      mrr: 0,
      revenue: data.planBreakdown.payPerUse.totalRevenue,
      avgMonths: data.planBreakdown.payPerUse.avgMonths,
      color: "#F59E0B", // Gold
      badge: "Single Meeting / Audit",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Section Title ── */}
      <div className="border-b border-[#3A2C18] pb-3">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2">
          <span>Plans & Revenue</span>
        </h2>
        <p className="text-xs text-[#C6B697] mt-0.5">
          Active membership distribution, cash collections, recurring MRR, and plan profitability.
        </p>
      </div>

      {/* ── Tier Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {planCards.map((plan) => (
          <div
            key={plan.name}
            className="bg-[#05142B]/90 border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${plan.color}25`, color: plan.color, border: `1px solid ${plan.color}50` }}
              >
                {plan.badge}
              </span>
              <span className="text-xs font-mono font-bold text-[#C6B697]">{plan.tier}</span>
            </div>

            <div>
              <div className="text-2xl font-black font-serif text-[#FFF4D4]">{plan.clients}</div>
              <h4 className="text-xs font-bold text-[#E8DCC4]">{plan.name}</h4>
            </div>

            <div className="border-t border-[#3A2C18]/60 pt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between text-[#C6B697]">
                <span>Total Collections:</span>
                <strong className="text-[#FFF4D4] font-mono">${plan.revenue.toLocaleString()}</strong>
              </div>
              {plan.mrr > 0 && (
                <div className="flex items-center justify-between text-[#C6B697]">
                  <span>Current MRR:</span>
                  <strong className="text-emerald-400 font-mono">${plan.mrr}/mo</strong>
                </div>
              )}
              <div className="flex items-center justify-between text-[#C6B697]">
                <span>Avg Retention:</span>
                <strong className="text-[#FFE394] font-mono">{plan.avgMonths} mos</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Key Financial Dynamics & Payment Health ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-0.5">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">New MRR</span>
          <div className="text-lg font-black text-emerald-400 font-mono">+${data.newRecurringRevenue}</div>
          <span className="text-[10px] text-[#A69371]">This period</span>
        </div>

        <div className="p-3 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-0.5">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">ARPU</span>
          <div className="text-lg font-black font-serif text-[#FFF4D4]">${data.averageRevenuePerFamily}</div>
          <span className="text-[10px] text-[#A69371]">Avg / Family</span>
        </div>

        <div className="p-3 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-0.5">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Client LTV</span>
          <div className="text-lg font-black font-serif text-[#FFE394]">${data.clientLifetimeRevenue}</div>
          <span className="text-[10px] text-[#A69371]">Lifetime Value</span>
        </div>

        <div className="p-3 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-0.5">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Upgrades</span>
          <div className="text-lg font-black font-serif text-[#DFBE77]">+{data.upgradesCount}</div>
          <span className="text-[10px] text-[#A69371]">Plan upgrades</span>
        </div>

        <div className="p-3 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-0.5">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Recovered</span>
          <div className="text-lg font-black text-emerald-400 font-mono">
            {data.recoveredPayments}/{data.paymentFailures}
          </div>
          <span className="text-[10px] text-[#A69371]">Failed resolved</span>
        </div>

        <div className="p-3 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-0.5">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Cancellations</span>
          <div className="text-lg font-black text-rose-400 font-mono">{data.cancellationsCount}</div>
          <span className="text-[10px] text-[#A69371]">Cases completed</span>
        </div>
      </div>

      {/* ── Plan Comparison Table (Mandatory 6x4 Matrix) ── */}
      <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-serif font-bold text-[#FFF4D4] tracking-wide">
              Plan Profitability & Service Matrix
            </h3>
            <p className="text-xs text-[#C6B697] mt-0.5">
              Comparative analysis of service hours, meeting loads, delivery cost, and margins across all tiers.
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-[#020A17] px-2.5 py-1 rounded-lg border border-emerald-500/30 font-semibold self-start">
            54.3% Highest Margin on $105 Tier
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#3A2C18] text-[11px] font-serif font-bold text-[#FFE394] uppercase tracking-wider">
                <th className="py-2.5 px-3">Metric</th>
                <th className="py-2.5 px-3 text-right">$55 Core</th>
                <th className="py-2.5 px-3 text-right">$105 Comprehensive</th>
                <th className="py-2.5 px-3 text-right">Scholarship</th>
                <th className="py-2.5 px-3 text-right">Pay-Per-Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A2C18]/40 text-xs">
              {data.planComparisonTable.map((row) => (
                <tr
                  key={row.metric}
                  className="hover:bg-[#081B38]/50 transition-colors font-medium"
                >
                  <td className="py-3 px-3 text-[#E8DCC4] font-semibold">{row.metric}</td>
                  <td className="py-3 px-3 text-right font-mono text-[#FFF4D4]">{row.p55}</td>
                  <td className="py-3 px-3 text-right font-mono text-[#FFE394] font-bold">{row.p105}</td>
                  <td className="py-3 px-3 text-right font-mono text-[#C6B697]">{row.scholarship}</td>
                  <td className="py-3 px-3 text-right font-mono text-[#DFBE77]">{row.payPerUse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import {
  Landmark,
  Calculator,
  CalendarClock,
  Coins,
  ShieldCheck,
  TrendingUp,
  Receipt,
  PieChart,
  ArrowUpRight,
  Info,
  Calendar,
  Layers,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaxEstimatesSectionProps {
  clients55Count: number;
  clients105Count: number;
  payPerUseMonthly?: number;
  annualPaidInFullRevenue?: number;
  className?: string;
}

export default function TaxEstimatesSection({
  clients55Count,
  clients105Count,
  payPerUseMonthly = 650, // default realistic ala-carte / audit monthly collections
  annualPaidInFullRevenue = 0,
  className,
}: TaxEstimatesSectionProps) {
  // Tax bracket presets
  const [effectiveTaxRate, setEffectiveTaxRate] = useState<number>(25); // 25% default
  const [deductionOffsetRate, setDeductionOffsetRate] = useState<number>(15); // 15% estimated business write-offs (mileage, software, insurance)
  const [isDeductionEnabled, setIsDeductionEnabled] = useState<boolean>(true);

  // Revenue calculations
  const monthly55 = clients55Count * 55;
  const yearly55 = monthly55 * 12;

  const monthly105 = clients105Count * 105;
  const yearly105 = monthly105 * 12;

  const monthlyPayPerUse = payPerUseMonthly;
  const yearlyPayPerUse = monthlyPayPerUse * 12;

  // Monthly and Yearly Totals across all plans
  const totalMonthlyGross = monthly55 + monthly105 + monthlyPayPerUse;
  const totalYearlyGross = yearly55 + yearly105 + yearlyPayPerUse + annualPaidInFullRevenue;

  // Deductions effect
  const taxableFactor = isDeductionEnabled ? 1 - deductionOffsetRate / 100 : 1;
  const taxRateFactor = effectiveTaxRate / 100;

  // Plan-specific tax estimates
  const plansData = useMemo(() => {
    const calcPlan = (
      name: string,
      tier: string,
      clientCount: number,
      monthlyGross: number,
      yearlyGross: number,
      color: string,
      badge: string
    ) => {
      const taxableMonthly = monthlyGross * taxableFactor;
      const monthlyTax = taxableMonthly * taxRateFactor;
      const yearlyTax = monthlyTax * 12;
      const monthlyNet = monthlyGross - monthlyTax;
      const yearlyNet = yearlyGross - yearlyTax;

      return {
        name,
        tier,
        clientCount,
        monthlyGross,
        yearlyGross,
        monthlyTax,
        yearlyTax,
        monthlyNet,
        yearlyNet,
        color,
        badge,
      };
    };

    return [
      calcPlan(
        "$55 Membership",
        "$55 Core",
        clients55Count,
        monthly55,
        yearly55,
        "#0062E3",
        "Core Plan"
      ),
      calcPlan(
        "$105 Comprehensive",
        "$105 Full",
        clients105Count,
        monthly105,
        yearly105,
        "#8B5CF6",
        "Full Advocacy"
      ),
      calcPlan(
        "Pay-Per-Use / Ala Carte",
        "Hourly / Audit",
        Math.max(1, Math.round(monthlyPayPerUse / 225)),
        monthlyPayPerUse,
        yearlyPayPerUse,
        "#F59E0B",
        "Audits & Meetings"
      ),
    ];
  }, [
    clients55Count,
    clients105Count,
    monthly55,
    yearly55,
    monthly105,
    yearly105,
    monthlyPayPerUse,
    yearlyPayPerUse,
    taxableFactor,
    taxRateFactor,
  ]);

  // Overall totals
  const totalMonthlyTax = plansData.reduce((acc, p) => acc + p.monthlyTax, 0);
  const totalYearlyTax = totalMonthlyTax * 12;
  const totalQuarterlyTax = totalYearlyTax / 4;
  const totalMonthlyNet = totalMonthlyGross - totalMonthlyTax;
  const totalYearlyNet = totalYearlyGross - totalYearlyTax;

  // Quarterly Deadlines
  const quarterlySchedule = [
    {
      quarter: "Q1 Estimated Payment",
      period: "Jan 1 – Mar 31",
      dueDate: "April 15",
      amount: totalQuarterlyTax,
      form: "IRS 1040-ES & GA 500ES",
    },
    {
      quarter: "Q2 Estimated Payment",
      period: "Apr 1 – May 31",
      dueDate: "June 15",
      amount: totalQuarterlyTax,
      form: "IRS 1040-ES & GA 500ES",
    },
    {
      quarter: "Q3 Estimated Payment",
      period: "Jun 1 – Aug 31",
      dueDate: "September 15",
      amount: totalQuarterlyTax,
      form: "IRS 1040-ES & GA 500ES",
    },
    {
      quarter: "Q4 Estimated Payment",
      period: "Sep 1 – Dec 31",
      dueDate: "January 15",
      amount: totalQuarterlyTax,
      form: "IRS 1040-ES & GA 500ES",
    },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* ── Section Title & Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3A2C18] pb-4">
        <div>
          <h2
            className="text-lg sm:text-xl font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2.5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <Landmark className="w-5 h-5 text-[#DFBE77]" />
            <span>Tax Liability & Escrow Estimates</span>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#DFBE77] bg-[#DFBE77]/10 border border-[#DFBE77]/30 px-2 py-0.5 rounded">
              PG-042-TAX
            </span>
          </h2>
          <p className="text-xs text-[#C6B697] mt-1">
            Monthly and annual tax reserve projections modeled across membership tiers and total practice collections.
          </p>
        </div>

        {/* Interactive Tax Rate Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#C6B697] font-medium mr-1 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-[#DFBE77]" />
            Combined Rate:
          </span>
          {[20, 25, 30, 35].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setEffectiveTaxRate(rate)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer",
                effectiveTaxRate === rate
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/60 shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                  : "bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]"
              )}
            >
              {rate}%
            </button>
          ))}

          {/* Deductions Toggle */}
          <button
            type="button"
            onClick={() => setIsDeductionEnabled(!isDeductionEnabled)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ml-1",
              isDeductionEnabled
                ? "bg-[#0A2540] border border-cyan-500/40 text-cyan-300"
                : "bg-[#020A17] border border-[#3A2C18] text-[#8A9EB5]"
            )}
            title="Applies an estimated 15% practice operational deduction (mileage, tools, dues, insurance)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>-15% Deductions</span>
          </button>
        </div>
      </div>

      {/* ── Top Key Metric Cards (Grand Totals) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Monthly Tax Reserve */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#C6B697]">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Monthly Tax Reserve</span>
            <Coins className="w-4 h-4 text-[#DFBE77]" />
          </div>
          <div
            className="text-2xl sm:text-3xl font-bold font-mono text-[#FFE394] tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            ${Math.round(totalMonthlyTax).toLocaleString()}
            <span className="text-xs font-sans font-normal text-[#C6B697]"> / mo</span>
          </div>
          <p className="text-[11px] text-[#A69371] leading-tight">
            Recommended monthly tax escrow transfer based on current {effectiveTaxRate}% effective rate.
          </p>
        </div>

        {/* Quarterly Estimated Payment */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#C6B697]">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Quarterly Payment</span>
            <CalendarClock className="w-4 h-4 text-[#DFBE77]" />
          </div>
          <div
            className="text-2xl sm:text-3xl font-bold font-mono text-[#FFF4D4] tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            ${Math.round(totalQuarterlyTax).toLocaleString()}
            <span className="text-xs font-sans font-normal text-[#C6B697]"> / qtr</span>
          </div>
          <p className="text-[11px] text-[#A69371] leading-tight">
            Amount to remit each quarter to IRS (Form 1040-ES) & Georgia Dept of Revenue.
          </p>
        </div>

        {/* Annual Total Tax Burden */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#C6B697]">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Yearly Total Tax</span>
            <Landmark className="w-4 h-4 text-[#DFBE77]" />
          </div>
          <div
            className="text-2xl sm:text-3xl font-bold font-mono text-amber-300 tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            ${Math.round(totalYearlyTax).toLocaleString()}
            <span className="text-xs font-sans font-normal text-[#C6B697]"> / yr</span>
          </div>
          <p className="text-[11px] text-[#A69371] leading-tight">
            Full annual projected tax burden across all plans and membership collections.
          </p>
        </div>

        {/* Net Take-Home Revenue */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#C6B697]">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Net Retained Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            ${Math.round(totalYearlyNet).toLocaleString()}
            <span className="text-xs font-sans font-normal text-[#C6B697]"> / yr</span>
          </div>
          <p className="text-[11px] text-[#A69371] leading-tight">
            Estimated clean practice take-home after reserving full tax liability (${Math.round(totalMonthlyNet).toLocaleString()}/mo).
          </p>
        </div>
      </div>

      {/* ── Plan-by-Plan Tax Breakdown Cards & Comparative Visual Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {plansData.map((plan) => (
          <div
            key={plan.name}
            className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${plan.color}25`, color: plan.color, border: `1px solid ${plan.color}50` }}
                >
                  {plan.badge}
                </span>
                <span className="text-xs font-mono font-bold text-[#FFE394]">{plan.tier}</span>
              </div>
              <h3
                className="text-base font-bold text-[#FFF4D4]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {plan.name}
              </h3>
              <p className="text-[11px] text-[#A69371] mt-0.5">
                {plan.clientCount} active case{plan.clientCount !== 1 ? "s" : ""} contributing to revenue
              </p>
            </div>

            {/* Visual Revenue vs Tax Ratio Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#C6B697]">
                <span>Tax vs Retained Ratio</span>
                <span className="font-mono text-[#DFBE77]">
                  {Math.round((plan.monthlyTax / Math.max(1, plan.monthlyGross)) * 100)}% tax
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#020A17] overflow-hidden flex">
                <div
                  className="h-full bg-amber-400/80 transition-all duration-300"
                  style={{ width: `${Math.min(100, (plan.monthlyTax / Math.max(1, plan.monthlyGross)) * 100)}%` }}
                  title="Tax Reserve"
                />
                <div
                  className="h-full bg-emerald-500/80 transition-all duration-300 flex-1"
                  title="Net Retained"
                />
              </div>
            </div>

            {/* Monthly & Yearly Breakdown Table */}
            <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#C6B697]">
                <span>Monthly Gross:</span>
                <strong className="text-white font-mono">${Math.round(plan.monthlyGross).toLocaleString()}</strong>
              </div>
              <div className="flex items-center justify-between text-amber-300">
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  Monthly Tax Est:
                </span>
                <strong className="font-mono font-bold">${Math.round(plan.monthlyTax).toLocaleString()}</strong>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Monthly Net Take-Home:</span>
                <strong className="font-mono">${Math.round(plan.monthlyNet).toLocaleString()}</strong>
              </div>

              <div className="border-t border-[#3A2C18]/60 pt-2 flex items-center justify-between text-amber-400/90 font-semibold">
                <span>Yearly Tax Est:</span>
                <strong className="font-mono text-[#FFE394]">${Math.round(plan.yearlyTax).toLocaleString()}/yr</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Comprehensive Tax Matrix Table (Monthly, Quarterly, Yearly & Net) ── */}
      <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3A2C18] pb-3">
          <div>
            <h3
              className="text-sm sm:text-base font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <Calculator className="w-4 h-4 text-[#DFBE77]" />
              <span>Full Plans Tax Comparison & Reserve Matrix</span>
            </h3>
            <p className="text-xs text-[#C6B697] mt-0.5">
              Side-by-side breakdown of gross billings, estimated tax reserves, quarterly installments, and clean net margins.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#FFE394] bg-[#020A17] px-2.5 py-1 rounded-lg border border-[#3A2C18] font-semibold self-start">
            Model: {effectiveTaxRate}% Tax {isDeductionEnabled ? "(-15% Deductions)" : "(Gross Base)"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#3A2C18] text-[11px] font-serif font-bold text-[#FFE394] uppercase tracking-wider">
                <th className="py-2.5 px-3">Advocacy Tier</th>
                <th className="py-2.5 px-3 text-right">Active Cases</th>
                <th className="py-2.5 px-3 text-right">Monthly Gross</th>
                <th className="py-2.5 px-3 text-right text-amber-300">Monthly Tax</th>
                <th className="py-2.5 px-3 text-right text-amber-400">Quarterly Tax</th>
                <th className="py-2.5 px-3 text-right text-amber-300">Yearly Tax</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Yearly Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A2C18]/40 text-xs">
              {plansData.map((plan) => (
                <tr key={plan.name} className="hover:bg-[#081B38]/50 transition-colors font-medium">
                  <td className="py-3 px-3 text-[#E8DCC4] font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: plan.color }} />
                    {plan.name}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#C6B697]">{plan.clientCount}</td>
                  <td className="py-3 px-3 text-right font-mono text-white">
                    ${Math.round(plan.monthlyGross).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-300">
                    ${Math.round(plan.monthlyTax).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-400">
                    ${Math.round(plan.yearlyTax / 4).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#FFE394]">
                    ${Math.round(plan.yearlyTax).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    ${Math.round(plan.yearlyNet).toLocaleString()}
                  </td>
                </tr>
              ))}

              {/* Grand Total Row */}
              <tr className="bg-[#020A17] font-bold border-t-2 border-[#3A2C18] text-[#FFF4D4]">
                <td className="py-3.5 px-3 font-serif uppercase tracking-wider text-[#DFBE77] text-xs">
                  Grand Total (All Plans)
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-[#FFE394]">
                  {clients55Count + clients105Count + Math.max(1, Math.round(monthlyPayPerUse / 225))}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-white text-sm">
                  ${Math.round(totalMonthlyGross).toLocaleString()}
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-300 text-sm">
                  ${Math.round(totalMonthlyTax).toLocaleString()}
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-400 text-sm">
                  ${Math.round(totalQuarterlyTax).toLocaleString()}
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-black text-[#FFE394] text-sm">
                  ${Math.round(totalYearlyTax).toLocaleString()}
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                  ${Math.round(totalYearlyNet).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quarterly IRS & State Estimated Tax Schedule ── */}
      <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-sm sm:text-base font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <Calendar className="w-4 h-4 text-[#DFBE77]" />
              <span>Quarterly Estimated Tax Schedule (IRS 1040-ES & GA-500ES)</span>
            </h3>
            <p className="text-xs text-[#C6B697] mt-0.5">
              Key filing deadlines to avoid underpayment penalties for Waypoint Advocates.
            </p>
          </div>
          <span className="text-xs font-mono text-[#C6B697] bg-[#020A17] border border-[#3A2C18] px-2.5 py-1 rounded-lg">
            Tax Year 2026
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quarterlySchedule.map((q, idx) => (
            <div
              key={q.quarter}
              className="bg-[#020A17]/85 border border-[#3A2C18]/80 hover:border-[#C5A059]/60 rounded-xl p-3.5 space-y-2 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#DFBE77] font-mono">Q{idx + 1}</span>
                <span className="text-[10px] text-[#A69371] font-mono">{q.period}</span>
              </div>
              <div>
                <div className="text-xs font-semibold text-white">{q.quarter}</div>
                <div className="text-[11px] text-[#C6B697] flex items-center gap-1 mt-0.5">
                  <CalendarClock className="w-3 h-3 text-[#FFE394]" />
                  <span>Due Date: <strong className="text-white">{q.dueDate}</strong></span>
                </div>
              </div>
              <div className="border-t border-[#3A2C18]/60 pt-2 flex items-center justify-between text-xs">
                <span className="text-[#C6B697]">Estimated:</span>
                <span className="font-mono font-bold text-[#FFE394]">
                  ${Math.round(q.amount).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

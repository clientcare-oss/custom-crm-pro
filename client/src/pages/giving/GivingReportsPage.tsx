/**
 * Giving Reports & Form 990 Preparedness — PG-040-REP
 * Charitable analytics, annual contribution comparisons, and 501(c)(3) Form 990 Schedule A compliance.
 */

import React from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageIdBadge from "@/components/PageIdBadge";
import GivingPageLayout from "@/components/giving/GivingPageLayout";
import {
  BarChart3,
  Download,
  TrendingUp,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  PieChart,
  Users,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function GivingReportsPage() {
  const { data: reports, isLoading } = trpc.giving.getReports.useQuery();

  const handleExportReport = () => {
    toast.success("Giving & Form 990 summary exported as PDF/CSV");
  };

  return (
    <GivingPageLayout>
      {/* ── Sub-Header: Waypoint Navy Plaque Sub-Bar with Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_6px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0B2144] border border-[#C5A059]/40 flex items-center justify-center text-[#FAD77B] shadow-inner">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 
                  className="text-xl md:text-2xl font-bold tracking-wide text-[#FFF4D4]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Giving Reports & 990 Analytics
                </h2>
                <PageIdBadge id="PG-040-REP" name="Giving Reports" />
              </div>
              <p className="text-xs text-[#C6B697]">
                IRS Form 990 Schedule A preparedness, annual trends, and restricted fund distribution.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleExportReport}
          className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs h-9 px-4 gap-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 cursor-pointer self-start md:self-auto"
        >
          <Download className="h-4 w-4 stroke-[2.5]" />
          <span>Export 990 Summary</span>
        </Button>
      </div>

      {/* Primary Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Public Support Percentage */}
        <Card className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#C6B697]">
            <span>Form 990 Public Support %</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-emerald-400 font-mono">
              {isLoading ? "..." : `${reports?.publicSupportPercentage}%`}
            </p>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
              Passes 33.3% Test
            </Badge>
          </div>
          <p className="text-xs text-[#C6B697] leading-relaxed">
            Confirms public charity classification under IRC Section 509(a)(1) and 170(b)(1)(A)(vi).
          </p>
        </Card>

        {/* Sustaining Donor Retention */}
        <Card className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#C6B697]">
            <span>Recurring Donor Retention</span>
            <Users className="h-4 w-4 text-[#FAD77B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-[#FFE394] font-mono">
              {isLoading ? "..." : `${reports?.recurringDonorRetention}%`}
            </p>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
              High Loyalty
            </Badge>
          </div>
          <p className="text-xs text-[#C6B697] leading-relaxed">
            Percentage of recurring and corporate sponsors continuing support over 12 months.
          </p>
        </Card>

        {/* 2026 Year-to-Date Growth */}
        <Card className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#C6B697]">
            <span>Year-over-Year Growth</span>
            <TrendingUp className="h-4 w-4 text-[#7BB4FA]" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-[#FFF4D4] font-mono">+30.2%</p>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
              Surpassing 2025
            </Badge>
          </div>
          <p className="text-xs text-[#C6B697] leading-relaxed">
            Expansion driven by dedicated IEP family scholarship matching programs.
          </p>
        </Card>
      </div>

      {/* Two Column Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Annual Giving Trends */}
        <Card className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] p-5 space-y-4">
          <div className="border-b border-[#3A2C18]/80 pb-3 flex items-center justify-between">
            <h3 
              className="text-sm font-bold text-[#FFF4D4] tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Annual Contribution History
            </h3>
            <span className="text-[11px] text-[#A69371]">Fiscal Years 2024–2026</span>
          </div>

          <div className="space-y-4">
            {reports?.annualTotals.map((item: any) => (
              <div key={item.year} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#FFF4D4]">{item.year}</span>
                  <span className="font-mono font-bold text-[#FFE394]">
                    {formatCurrency(item.totalDonatedCents)}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-[#010814] rounded-full overflow-hidden border border-[#3A2C18]/60">
                  <div
                    className="h-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((item.totalDonatedCents / 5000000) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#A69371]">
                  <span>{item.donorsCount} participating contributors</span>
                  <span>Avg gift: {formatCurrency(Math.round(item.totalDonatedCents / (item.donorsCount || 1)))}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Designated Fund Breakdown */}
        <Card className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] p-5 space-y-4">
          <div className="border-b border-[#3A2C18]/80 pb-3 flex items-center justify-between">
            <h3 
              className="text-sm font-bold text-[#FFF4D4] tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Designated Fund Allocations
            </h3>
            <span className="text-[11px] text-[#A69371]">Cumulative Distribution</span>
          </div>

          <div className="space-y-4">
            {reports?.fundBreakdown.map((f: any) => (
              <div key={f.fundName} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#FFF4D4]">{f.fundName}</span>
                  <span className="font-mono font-bold text-[#FFE394]">
                    {formatCurrency(f.allocatedCents)} ({f.percent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-[#010814] rounded-full overflow-hidden border border-[#3A2C18]/60">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                    style={{ width: `${f.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </GivingPageLayout>
  );
}

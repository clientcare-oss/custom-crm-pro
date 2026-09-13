/**
 * Giving & Impact Overview — PG-040
 * Central operational command for 501(c)(3) philanthropy, donations, supporters, and scholarships.
 */

import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageIdBadge from "@/components/PageIdBadge";
import { Manage501c3Modal } from "@/components/giving/Manage501c3Modal";
import {
  HandHeart,
  DollarSign,
  Users,
  GraduationCap,
  Landmark,
  Receipt,
  BarChart3,
  Settings,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  ExternalLink,
} from "lucide-react";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function GivingOverview() {
  const [, setLocation] = useLocation();
  const [modal501c3Open, setModal501c3Open] = useState(false);

  const { data: stats, isLoading } = trpc.giving.getOverviewStats.useQuery();

  return (
    <div className="min-h-screen bg-[#07162B] text-white p-6 md:p-8 space-y-8">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <HandHeart className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Giving & Impact
                </h1>
                <PageIdBadge id="PG-040" name="Giving & Impact Overview" />
              </div>
              <p className="text-xs md:text-sm text-white/60">
                Manage donations, supporters, scholarships, funds, receipts, and charitable reporting.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setModal501c3Open(true)}
            className="border-amber-400/40 text-amber-300 hover:bg-amber-400/10 hover:text-amber-200 text-xs font-semibold h-9 px-3.5 gap-2 shadow-xs cursor-pointer"
          >
            <Settings className="h-4 w-4 text-amber-400" />
            <span>Manage 501(c)(3)</span>
          </Button>

          <Button
            type="button"
            onClick={() => setLocation("/giving/donations")}
            className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs h-9 px-4 gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Record Donation</span>
          </Button>
        </div>
      </div>

      {/* ── Primary KPI Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Donations */}
        <Card className="bg-[#001A41]/80 border-white/10 p-4 space-y-2 relative overflow-hidden group hover:border-amber-400/30 transition-all">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span>Total Lifetime Donations</span>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {isLoading ? "..." : formatCurrency(stats?.totalDonationsCents ?? 0)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            <span>Across all campaigns</span>
          </div>
        </Card>

        {/* Donations This Year */}
        <Card className="bg-[#001A41]/80 border-white/10 p-4 space-y-2 relative overflow-hidden group hover:border-amber-400/30 transition-all">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span>Donations (YTD)</span>
            <Calendar className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {isLoading ? "..." : formatCurrency(stats?.donationsYtdCents ?? 0)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-amber-300/80">
            <span>Current fiscal cycle</span>
          </div>
        </Card>

        {/* Monthly Recurring Giving */}
        <Card className="bg-[#001A41]/80 border-white/10 p-4 space-y-2 relative overflow-hidden group hover:border-amber-400/30 transition-all">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span>Monthly Recurring</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {isLoading ? "..." : formatCurrency(stats?.monthlyRecurringCents ?? 0)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <span>Sustaining monthly gifts</span>
          </div>
        </Card>

        {/* Active Supporters */}
        <Card className="bg-[#001A41]/80 border-white/10 p-4 space-y-2 relative overflow-hidden group hover:border-amber-400/30 transition-all">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span>Active Supporters</span>
            <Users className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {isLoading ? "..." : (stats?.activeSupportersCount ?? 0)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-white/50">
            <span>Donors & sponsors</span>
          </div>
        </Card>

        {/* Scholarship Fund Balance */}
        <Card className="bg-[#001A41]/80 border-white/10 p-4 space-y-2 relative overflow-hidden group hover:border-amber-400/30 transition-all">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span>Scholarship Balance</span>
            <GraduationCap className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight text-amber-300">
            {isLoading ? "..." : formatCurrency(stats?.scholarshipFundBalanceCents ?? 0)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-amber-400">
            <span>Direct family subsidies</span>
          </div>
        </Card>

        {/* Scholarships Awarded */}
        <Card className="bg-[#001A41]/80 border-white/10 p-4 space-y-2 relative overflow-hidden group hover:border-amber-400/30 transition-all">
          <div className="flex items-center justify-between text-white/60 text-xs">
            <span>Active Scholarships</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {isLoading ? "..." : (stats?.activeScholarshipsCount ?? 0)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <span>Families supported</span>
          </div>
        </Card>
      </div>

      {/* ── Subsystem Hub Shortcuts ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link href="/giving/supporters" className="block">
          <div className="rounded-xl border border-white/10 bg-black/25 hover:bg-white/5 p-3.5 transition-all text-center space-y-1.5 group cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-300 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-white group-hover:text-amber-300">Supporters</p>
            <p className="text-[10px] text-white/50">Donors & sponsors</p>
          </div>
        </Link>

        <Link href="/giving/donations" className="block">
          <div className="rounded-xl border border-white/10 bg-black/25 hover:bg-white/5 p-3.5 transition-all text-center space-y-1.5 group cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-300 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-white group-hover:text-amber-300">Donations</p>
            <p className="text-[10px] text-white/50">Contribution ledger</p>
          </div>
        </Link>

        <Link href="/giving/scholarships" className="block">
          <div className="rounded-xl border border-white/10 bg-black/25 hover:bg-white/5 p-3.5 transition-all text-center space-y-1.5 group cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-300 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
              <GraduationCap className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-white group-hover:text-amber-300">Scholarships</p>
            <p className="text-[10px] text-white/50">Student grants</p>
          </div>
        </Link>

        <Link href="/giving/funds" className="block">
          <div className="rounded-xl border border-white/10 bg-black/25 hover:bg-white/5 p-3.5 transition-all text-center space-y-1.5 group cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-purple-500/20 text-purple-300 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
              <Landmark className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-white group-hover:text-amber-300">Funds</p>
            <p className="text-[10px] text-white/50">Restricted campaigns</p>
          </div>
        </Link>

        <Link href="/giving/receipts" className="block">
          <div className="rounded-xl border border-white/10 bg-black/25 hover:bg-white/5 p-3.5 transition-all text-center space-y-1.5 group cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-rose-500/20 text-rose-300 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
              <Receipt className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-white group-hover:text-amber-300">Tax Receipts</p>
            <p className="text-[10px] text-white/50">IRS declarations</p>
          </div>
        </Link>

        <Link href="/giving/reports" className="block">
          <div className="rounded-xl border border-white/10 bg-black/25 hover:bg-white/5 p-3.5 transition-all text-center space-y-1.5 group cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-300 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
              <BarChart3 className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-white group-hover:text-amber-300">Reports</p>
            <p className="text-[10px] text-white/50">Form 990 & stats</p>
          </div>
        </Link>
      </div>

      {/* ── Two Column Activity Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Donations Ledger */}
        <Card className="bg-[#001A41]/80 border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-400" />
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">Recent Donations</h2>
            </div>
            <Link href="/giving/donations" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium">
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {stats?.recentDonations && stats.recentDonations.length > 0 ? (
              stats.recentDonations.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-xs font-semibold text-white truncate">{d.donorName}</p>
                    <p className="text-[11px] text-white/50 truncate">
                      {d.familyName ? `Gift for ${d.familyName}` : "Advocacy Fund"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-amber-300 font-mono">
                      {formatCurrency(d.amount)}
                    </p>
                    <span className="text-[10px] text-white/40">
                      {new Date(d.donatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-white/40 text-xs">
                No recent donations recorded
              </div>
            )}
          </div>
        </Card>

        {/* Right: Recent Scholarship Activity */}
        <Card className="bg-[#001A41]/80 border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">Scholarship Activity</h2>
            </div>
            <Link href="/giving/scholarships" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium">
              <span>Manage awards</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {stats?.recentScholarships && stats.recentScholarships.length > 0 ? (
              stats.recentScholarships.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-white truncate">{s.studentName}</p>
                      <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0">
                        {s.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-white/50 truncate">
                      {s.programTier} · Funded by {s.fundName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-amber-300 font-mono">
                      {formatCurrency(s.monthlyGrantAmount)}
                    </p>
                    <span className="text-[10px] text-white/40">
                      Awarded {s.awardedAt}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-white/40 text-xs">
                No active scholarship grants
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 501(c)(3) Configuration Modal */}
      <Manage501c3Modal open={modal501c3Open} onOpenChange={setModal501c3Open} />
    </div>
  );
}

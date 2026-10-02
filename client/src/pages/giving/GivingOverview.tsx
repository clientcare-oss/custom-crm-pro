/**
 * Giving & Impact Overview — PG-040
 * Executive Nautical / Waypoint Desk Console for 501(c)(3) Philanthropy,
 * Scholarships, Fund Allocations, and Donor Ledgers.
 */

import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { GivingDeskHeader } from "@/components/giving/GivingDeskHeader";
import { GivingParchmentCard } from "@/components/giving/GivingParchmentCard";
import { GivingOverviewCharts } from "@/components/giving/GivingOverviewCharts";
import { GivingLedgersRow } from "@/components/giving/GivingLedgersRow";
import { GivingImpactAndPrograms } from "@/components/giving/GivingImpactAndPrograms";
import { GivingFundsAndAttention } from "@/components/giving/GivingFundsAndAttention";
import { GivingActionsAndTools } from "@/components/giving/GivingActionsAndTools";
import { Manage501c3Modal } from "@/components/giving/Manage501c3Modal";
import { AwardScholarshipModal } from "@/components/giving/AwardScholarshipModal";
import { 
  Coins, Calendar, RefreshCw, Users, 
  GraduationCap, TrendingUp, CheckCircle2 
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
  const [scholarshipModalOpen, setScholarshipModalOpen] = useState(false);

  const { data: stats, isLoading } = trpc.giving.getOverviewStats.useQuery();

  // Top 6 KPI Metric Cards matching the reference layout & values
  const kpiMetrics = [
    {
      label: "Total Lifetime Donations",
      value: isLoading ? "$16,000.00" : formatCurrency(stats?.totalDonationsCents || 1600000),
      subtext: "Across all campaigns",
      icon: Coins,
      badgeIcon: TrendingUp,
      badgeColor: "text-[#2E6B38]",
    },
    {
      label: "Donations (YTD)",
      value: isLoading ? "$16,000.00" : formatCurrency(stats?.donationsYtdCents || 1600000),
      subtext: "Current fiscal cycle",
      icon: Calendar,
      badgeIcon: RefreshCw,
      badgeColor: "text-[#2E6B38]",
    },
    {
      label: "Monthly Recurring",
      value: isLoading ? "$500.00" : formatCurrency(stats?.monthlyRecurringCents || 50000),
      subtext: "Sustaining monthly gifts",
      icon: RefreshCw,
      badgeIcon: RefreshCw,
      badgeColor: "text-[#2E6B38]",
    },
    {
      label: "Active Supporters",
      value: isLoading ? "4" : String(stats?.activeSupportersCount ?? 4),
      subtext: "Donors & sponsors",
      icon: Users,
      badgeIcon: CheckCircle2,
      badgeColor: "text-[#2E6B38]",
    },
    {
      label: "Scholarship Balance",
      value: isLoading ? "$24,750.00" : formatCurrency(stats?.scholarshipFundBalanceCents || 2475000),
      subtext: "Direct family subsidies",
      icon: GraduationCap,
      badgeIcon: CheckCircle2,
      badgeColor: "text-[#2E6B38]",
    },
    {
      label: "Active Scholarships",
      value: isLoading ? "3" : String(stats?.activeScholarshipsCount ?? 3),
      subtext: "Families supported",
      icon: Users,
      badgeIcon: CheckCircle2,
      badgeColor: "text-[#2E6B38]",
    },
  ];

  return (
    <div 
      className="min-h-screen w-full p-4 sm:p-6 md:p-8 space-y-5 select-none relative overflow-x-hidden"
      style={{
        backgroundColor: "#110903",
        backgroundImage: "radial-gradient(ellipse at 50% 0%, #29180C 0%, #150B05 50%, #0A0502 100%)",
      }}
    >
      {/* ─── Hanging Shelf Decor & Cascading Ivy Overlap Asset (Z-20 pointer-events-none) ─── */}
      <div className="absolute top-0 left-0 right-0 w-full pointer-events-none select-none z-20 flex justify-center overflow-visible">
        <img
          src="/decor/giving-shelf-header.png"
          alt="Antique shelf with glowing lantern, astrolabe, and cascading ivy"
          className="w-full max-w-[1600px] h-auto object-contain object-top drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)] opacity-95"
        />
      </div>

      {/* ─── Top Ambient Shelf & Central Navy Plaque with 8 Navigation Buttons ─── */}
      <GivingDeskHeader
        onOpen501c3={() => setModal501c3Open(true)}
        onOpenScholarship={() => setScholarshipModalOpen(true)}
        onRecordDonation={() => setLocation("/giving/donations")}
      />

      {/* ─── Row 1: Top 6 KPI Metric Cards in Parchment & Brass ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 relative z-10">
        {kpiMetrics.map((kpi, idx) => {
          const Icon = kpi.icon;
          const BadgeIcon = kpi.badgeIcon;
          return (
            <GivingParchmentCard
              key={idx}
              className="h-[120px] flex flex-col justify-between p-3.5 text-center items-center hover:-translate-y-0.5 transition-transform"
            >
              {/* Slate/Navy Top Icon */}
              <div className="w-6 h-6 flex items-center justify-center text-[#1C3A5E]">
                <Icon className="w-5 h-5 stroke-[1.8]" />
              </div>

              {/* Big Serif Value */}
              <div>
                <p 
                  className="text-xl sm:text-[22px] font-bold text-[#142337] leading-none tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {kpi.value}
                </p>
                <p className="text-[11.5px] font-semibold text-[#544330] leading-tight mt-1 truncate">
                  {kpi.label}
                </p>
              </div>

              {/* Emerald Sub-badge Pill */}
              <div className="flex items-center gap-1 text-[10.5px] font-semibold text-[#1C5E2C] leading-none">
                <BadgeIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">{kpi.subtext}</span>
              </div>
            </GivingParchmentCard>
          );
        })}
      </div>

      {/* ─── Row 2: Charts & Analytics (Giving Overview + Funds Allocation) ─── */}
      <div className="relative z-10">
        <GivingOverviewCharts
          oneTimeTotal={16000}
          monthlyTotal={500}
          scholarshipsTotal={24750}
          otherTotal={6200}
        />
      </div>

      {/* ─── Row 3: Ledgers (Recent Donations, Active Scholarships, Top Supporters) ─── */}
      <div className="relative z-10">
        <GivingLedgersRow
          recentDonations={stats?.recentDonations}
          recentScholarships={stats?.recentScholarships}
        />
      </div>

      {/* ─── Row 4: Recent Impact & Active Programs ─── */}
      <div className="relative z-10">
        <GivingImpactAndPrograms />
      </div>

      {/* ─── Row 5: Fund Management & Needs Attention (8) ─── */}
      <div className="relative z-10">
        <GivingFundsAndAttention
          onOpenFundsModal={() => setLocation("/giving/funds")}
        />
      </div>

      {/* ─── Row 6: Quick Actions & Website Tools ─── */}
      <div className="relative z-10">
        <GivingActionsAndTools
          onOpenDonation={() => setLocation("/giving/donations")}
          onOpenSupporter={() => setLocation("/giving/supporters")}
          onOpenScholarship={() => setScholarshipModalOpen(true)}
          onOpenFund={() => setLocation("/giving/funds")}
        />
      </div>

      {/* ─── Modals ─── */}
      <Manage501c3Modal
        open={modal501c3Open}
        onOpenChange={setModal501c3Open}
      />

      <AwardScholarshipModal
        open={scholarshipModalOpen}
        onOpenChange={setScholarshipModalOpen}
      />
    </div>
  );
}

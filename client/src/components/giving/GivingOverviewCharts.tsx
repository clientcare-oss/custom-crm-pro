import React, { useState } from "react";
import { GivingParchmentCard } from "./GivingParchmentCard";
import { Coins, RefreshCw, Landmark, Heart, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface GivingOverviewChartsProps {
  oneTimeTotal?: number;
  monthlyTotal?: number;
  scholarshipsTotal?: number;
  otherTotal?: number;
}

export function GivingOverviewCharts({
  oneTimeTotal = 16000,
  monthlyTotal = 500,
  scholarshipsTotal = 24750,
  otherTotal = 6200,
}: GivingOverviewChartsProps) {
  const [selectedYear, setSelectedYear] = useState<string>("This Year (2026)");
  const [selectedFundsYear, setSelectedFundsYear] = useState<string>("This Year (2026)");

  // Monthly values in thousands matching the mockup chart bars
  const monthlyData = [
    { month: "Jan", value: 1.8, height: 18 },
    { month: "Feb", value: 2.4, height: 24 },
    { month: "Mar", value: 4.2, height: 42 },
    { month: "Apr", value: 5.0, height: 50 },
    { month: "May", value: 6.6, height: 66 },
    { month: "Jun", value: 5.2, height: 52 },
    { month: "Jul", value: 6.2, height: 62 },
    { month: "Aug", value: 8.5, height: 85 },
    { month: "Sep", value: 4.8, height: 48 },
    { month: "Oct", value: 3.8, height: 38 },
    { month: "Nov", value: 5.4, height: 54 },
    { month: "Dec", value: 7.2, height: 72 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ─── Giving Overview (Bar Chart + Stats Stack) ~58% width ─── */}
      <GivingParchmentCard className="lg:col-span-7 flex flex-col justify-between p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D8C7A5]/80 pb-3">
          <h2
            className="text-lg font-bold text-[#1B293C] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Giving Overview
          </h2>

          <div className="relative inline-flex items-center">
            <button
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDE2C9] border border-[#C5A059]/70 text-[#544129] text-xs font-semibold shadow-xs hover:bg-[#E4D7BB] transition-colors cursor-pointer"
            >
              <span>{selectedYear}</span>
              <ChevronDown className="w-3 h-3 text-[#7A603E]" />
            </button>
          </div>
        </div>

        {/* Content: Chart + Right Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-4 items-center">
          {/* Bar Chart Area (sm: 8 cols) */}
          <div className="sm:col-span-8 flex flex-col">
            <div className="h-44 sm:h-48 w-full flex items-end justify-between gap-1.5 pt-4 pb-2 px-1 relative border-b border-[#CDBBA0]/80">
              {/* Y-Axis Guide Lines & Labels */}
              <div className="absolute inset-x-0 inset-y-2 flex flex-col justify-between pointer-events-none opacity-40 text-[9px] text-[#69543C] font-mono">
                <div className="w-full border-b border-dashed border-[#B8A484]/50 flex justify-between"><span>$10K</span></div>
                <div className="w-full border-b border-dashed border-[#B8A484]/50 flex justify-between"><span>$8K</span></div>
                <div className="w-full border-b border-dashed border-[#B8A484]/50 flex justify-between"><span>$6K</span></div>
                <div className="w-full border-b border-dashed border-[#B8A484]/50 flex justify-between"><span>$4K</span></div>
                <div className="w-full border-b border-dashed border-[#B8A484]/50 flex justify-between"><span>$2K</span></div>
                <div className="w-full flex justify-between"><span>$0</span></div>
              </div>

              {/* Monthly Vertical Bars */}
              {monthlyData.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center justify-end h-full z-10 group">
                  <div className="text-[9px] text-[#443220] opacity-0 group-hover:opacity-100 transition-opacity font-bold mb-1">
                    ${d.value}K
                  </div>
                  <div
                    style={{ height: `${d.height}%` }}
                    className="w-full max-w-[18px] rounded-t-sm bg-gradient-to-t from-[#264D73] to-[#4076A8] hover:from-[#1D3E61] hover:to-[#558EC4] transition-all shadow-xs"
                  />
                  <span className="text-[10px] text-[#5C4832] font-semibold mt-1.5">
                    {d.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Summary Stack (sm: 4 cols) */}
          <div className="sm:col-span-4 flex flex-col justify-between gap-2.5">
            {/* One-Time Donations */}
            <div className="p-2.5 rounded-lg bg-[#EFE4CC]/80 border border-[#D5C1A0] flex items-center gap-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-[#18395E] text-[#FCD77B] flex items-center justify-center shrink-0 shadow-xs">
                <Coins className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#142337] leading-tight font-serif">${oneTimeTotal.toLocaleString()}</p>
                <p className="text-[10.5px] text-[#5A4733] font-medium leading-tight truncate">One-Time Donations</p>
              </div>
            </div>

            {/* Monthly Recurring */}
            <div className="p-2.5 rounded-lg bg-[#EFE4CC]/80 border border-[#D5C1A0] flex items-center gap-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-[#18395E] text-[#FCD77B] flex items-center justify-center shrink-0 shadow-xs">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#142337] leading-tight font-serif">${monthlyTotal.toLocaleString()}</p>
                <p className="text-[10.5px] text-[#5A4733] font-medium leading-tight truncate">Monthly Recurring</p>
              </div>
            </div>

            {/* Scholarships Awarded */}
            <div className="p-2.5 rounded-lg bg-[#EFE4CC]/80 border border-[#D5C1A0] flex items-center gap-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-[#18395E] text-[#FCD77B] flex items-center justify-center shrink-0 shadow-xs">
                <Landmark className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#142337] leading-tight font-serif">${scholarshipsTotal.toLocaleString()}</p>
                <p className="text-[10.5px] text-[#5A4733] font-medium leading-tight truncate">Scholarships Awarded</p>
              </div>
            </div>

            {/* Other Giving / Programs */}
            <div className="p-2.5 rounded-lg bg-[#EFE4CC]/80 border border-[#D5C1A0] flex items-center gap-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-[#18395E] text-[#FCD77B] flex items-center justify-center shrink-0 shadow-xs">
                <Heart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#142337] leading-tight font-serif">${otherTotal.toLocaleString()}</p>
                <p className="text-[10.5px] text-[#5A4733] font-medium leading-tight truncate">Other Giving / Programs</p>
              </div>
            </div>
          </div>
        </div>
      </GivingParchmentCard>

      {/* ─── Funds Allocation (Donut Chart + Legend) ~42% width ─── */}
      <GivingParchmentCard className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D8C7A5]/80 pb-3">
          <h2
            className="text-lg font-bold text-[#1B293C] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Funds Allocation
          </h2>

          <div className="relative inline-flex items-center">
            <button
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDE2C9] border border-[#C5A059]/70 text-[#544129] text-xs font-semibold shadow-xs hover:bg-[#E4D7BB] transition-colors cursor-pointer"
            >
              <span>{selectedFundsYear}</span>
              <ChevronDown className="w-3 h-3 text-[#7A603E]" />
            </button>
          </div>
        </div>

        {/* Content: Donut Chart & Legend Stack */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pt-4">
          {/* Donut Chart with Total in Center */}
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Scholarships 58% (Circumference ~ 251.2) */}
              <circle
                cx="50" cy="50" r="40" fill="transparent"
                stroke="#2E6FA4" strokeWidth="18"
                strokeDasharray="145.7 251.2" strokeDashoffset="0"
              />
              {/* Family Sponsorships 25% */}
              <circle
                cx="50" cy="50" r="40" fill="transparent"
                stroke="#D99B26" strokeWidth="18"
                strokeDasharray="62.8 251.2" strokeDashoffset="-145.7"
              />
              {/* Program Operations 10% */}
              <circle
                cx="50" cy="50" r="40" fill="transparent"
                stroke="#3E8F58" strokeWidth="18"
                strokeDasharray="25.1 251.2" strokeDashoffset="-208.5"
              />
              {/* Outreach & Resources 7% */}
              <circle
                cx="50" cy="50" r="40" fill="transparent"
                stroke="#7853A2" strokeWidth="18"
                strokeDasharray="17.6 251.2" strokeDashoffset="-233.6"
              />
            </svg>

            {/* Donut Center Core Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] text-[#69553E] font-medium leading-none">Total</span>
              <span className="text-sm sm:text-base font-bold text-[#142337] font-serif leading-tight mt-0.5">$28,450</span>
            </div>
          </div>

          {/* Slices & Legend List */}
          <div className="flex-1 w-full space-y-2.5 text-xs text-[#2A1D11]">
            {/* Scholarships */}
            <div className="flex items-center justify-between border-b border-[#E0D1B4] pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2E6FA4] shrink-0" />
                <span className="font-semibold text-[#182638] truncate">Scholarships</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-medium">
                <span className="text-[#594630]">58%</span>
                <span className="font-bold text-[#182638] font-serif">$16,450</span>
              </div>
            </div>

            {/* Family Sponsorships */}
            <div className="flex items-center justify-between border-b border-[#E0D1B4] pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D99B26] shrink-0" />
                <span className="font-semibold text-[#182638] truncate">Family Sponsorships</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-medium">
                <span className="text-[#594630]">25%</span>
                <span className="font-bold text-[#182638] font-serif">$7,100</span>
              </div>
            </div>

            {/* Program Operations */}
            <div className="flex items-center justify-between border-b border-[#E0D1B4] pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3E8F58] shrink-0" />
                <span className="font-semibold text-[#182638] truncate">Program Operations</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-medium">
                <span className="text-[#594630]">10%</span>
                <span className="font-bold text-[#182638] font-serif">$2,800</span>
              </div>
            </div>

            {/* Outreach & Resources */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7853A2] shrink-0" />
                <span className="font-semibold text-[#182638] truncate">Outreach & Resources</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-medium">
                <span className="text-[#594630]">7%</span>
                <span className="font-bold text-[#182638] font-serif">$2,100</span>
              </div>
            </div>
          </div>
        </div>
      </GivingParchmentCard>
    </div>
  );
}

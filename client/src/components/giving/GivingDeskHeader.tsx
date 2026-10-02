import React from "react";
import { Link, useLocation } from "wouter";
import PageIdBadge from "@/components/PageIdBadge";
import { Button } from "@/components/ui/button";
import { 
  HandHeart, Users, DollarSign, GraduationCap, 
  Landmark, Receipt, BarChart3, Globe, Settings, 
  Plus 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GivingDeskHeaderProps {
  onOpen501c3: () => void;
  onOpenScholarship: () => void;
  onRecordDonation: () => void;
}

export function GivingDeskHeader({
  onOpen501c3,
  onOpenScholarship,
  onRecordDonation,
}: GivingDeskHeaderProps) {
  const [location] = useLocation();

  const navigationTabs = [
    { label: "Overview", path: "/giving", icon: HandHeart },
    { label: "Supporters & Donors", path: "/giving/supporters", icon: Users },
    { label: "Donations", path: "/giving/donations", icon: DollarSign },
    { label: "Scholarships", path: "/giving/scholarships", icon: GraduationCap },
    { label: "Funds", path: "/giving/funds", icon: Landmark },
    { label: "Receipts & Statements", path: "/giving/receipts", icon: Receipt },
    { label: "Reports", path: "/giving/reports", icon: BarChart3 },
    { label: "Website Tools", path: "/giving/website-tools", icon: Globe },
  ];

  return (
    <div className="w-full space-y-4 select-none relative z-10 pt-2 sm:pt-4">
      {/* ─── Upper Ambient Desk Shelf Bar & Central Executive Plaque ─── */}
      <div className="relative w-full rounded-2xl border border-[#523B1E]/60 bg-gradient-to-r from-[#170C05]/90 via-[#231409]/95 to-[#120904]/90 p-3 sm:p-5 shadow-[0_6px_24px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          
          {/* Left spacing area (Reserved for the shelf lantern & books overlay) */}
          <div className="w-24 sm:w-48 lg:w-64 shrink-0 hidden md:block pointer-events-none" />

          {/* Center: Majestic GIVING & IMPACT Navy Leather Plaque with Double Gold Wire */}
          <div className="flex-1 max-w-lg lg:max-w-xl mx-auto text-center px-4 py-3 rounded-xl bg-gradient-to-b from-[#091D3C] via-[#05142B] to-[#020A17] border-2 border-[#C5A059] shadow-[0_4px_16px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.25)] relative">
            {/* 4 Corner Brass Rivets */}
            <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#FFE394] ring-1 ring-black/70 shadow-xs" />
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FFE394] ring-1 ring-black/70 shadow-xs" />
            <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#FFE394] ring-1 ring-black/70 shadow-xs" />
            <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FFE394] ring-1 ring-black/70 shadow-xs" />

            {/* Inner Fine Gold Wire Inlay */}
            <div className="absolute inset-1 rounded-lg border border-[#D4AF37]/40 pointer-events-none" />

            {/* Crest & Title */}
            <div className="flex items-center justify-center gap-2.5">
              <HandHeart className="w-6 h-6 text-[#FAD77B] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
              <h1 
                className="text-xl sm:text-2xl md:text-[26px] font-bold tracking-[0.14em] text-[#FFF4D4] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                GIVING & IMPACT
              </h1>
              <PageIdBadge id="PG-040" name="Giving & Impact Overview" className="ml-1" />
            </div>

            <p 
              className="text-xs sm:text-[13px] text-[#E0CEAA] tracking-wide mt-0.5 italic drop-shadow"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Creating Brighter Tomorrows Together
            </p>
          </div>

          {/* Right: Action Buttons & Spacing */}
          <div className="flex items-center gap-2.5 shrink-0 self-center md:self-auto justify-end w-auto sm:w-auto lg:w-64">
            <Button
              type="button"
              variant="outline"
              onClick={onOpen501c3}
              className="border-[#C5A059]/70 bg-[#160D06]/85 text-[#F5E6CA] hover:bg-[#2A180C] hover:text-white text-xs font-semibold h-8 px-2.5 gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Settings className="h-3.5 w-3.5 text-[#FAD77B]" />
              <span className="hidden sm:inline">Manage 501(c)(3)</span>
            </Button>

            <Button
              type="button"
              onClick={onOpenScholarship}
              className="bg-gradient-to-b from-[#D4AF37] to-[#A37B1D] hover:from-[#E4BF47] hover:to-[#B38B2D] text-[#120B04] font-bold text-xs h-8 px-3 gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Initiate Scholarship</span>
            </Button>

            <Button
              type="button"
              onClick={onRecordDonation}
              className="bg-gradient-to-b from-[#2E8B57] to-[#1E6038] hover:from-[#359B62] hover:to-[#226C3E] text-white font-bold text-xs h-8 px-3 gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record Donation</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Consolidated 8-Destination Navigation Ribbon (Midnight Navy & Satin Brass) ─── */}
      <div className="w-full p-1.5 rounded-xl bg-gradient-to-b from-[#0B1E3B] via-[#061429] to-[#020914] border border-[#C5A059]/60 shadow-[0_6px_20px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-thin">
        {navigationTabs.map((tab) => {
          const isActive = location === tab.path || (tab.path === "/giving" && location === "/giving/overview");
          const Icon = tab.icon;

          return (
            <Link key={tab.path} href={tab.path} className="flex-1 min-w-[105px]">
              <button
                type="button"
                className={cn(
                  "w-full h-[52px] rounded-lg px-2.5 py-1.5 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer select-none",
                  isActive
                    ? "bg-gradient-to-b from-[#C59B3F] via-[#A67C26] to-[#7D5A12] text-[#FFFDF8] border border-[#FDE69E]/85 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_2px_8px_rgba(0,0,0,0.6)]"
                    : "bg-gradient-to-b from-[#0E2447]/80 to-[#051329]/90 hover:from-[#133261]/85 hover:to-[#081C3D]/95 text-[#E6DAC3] border border-[#1E3F6D]/80 hover:border-[#2C5996] shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.4)]"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive ? "text-[#FFF6D6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : "text-[#E5B74E] group-hover:text-amber-200"
                  )}
                />
                <span className={cn(
                  "text-[11px] leading-tight font-medium truncate max-w-full",
                  isActive ? "font-bold text-white tracking-wide" : "text-[#D2C5AB]"
                )}>
                  {tab.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import React from "react";
import { useLocation } from "wouter";
import PageIdBadge from "@/components/PageIdBadge";
import { GivingNavButton } from "./GivingNavButton";
import { 
  HandHeart, Users, GraduationCap, 
  Landmark, Receipt, BarChart3, Globe 
} from "lucide-react";

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
    { 
      label: (
        <>
          <span className="block">Supporters &</span>
          <span className="block">Donors</span>
        </>
      ), 
      path: "/giving/supporters", 
      icon: Users 
    },
    { 
      label: "Donations", 
      path: "/giving/donations", 
      customIcon: (
        <span 
          className="text-[19px] sm:text-[21px] font-bold font-serif leading-none text-[#F4EBD9] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] select-none"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          $
        </span>
      )
    },
    { label: "Scholarships", path: "/giving/scholarships", icon: GraduationCap },
    { label: "Funds", path: "/giving/funds", icon: Landmark },
    { 
      label: (
        <>
          <span className="block">Receipts &</span>
          <span className="block">Statements</span>
        </>
      ), 
      path: "/giving/receipts", 
      icon: Receipt 
    },
    { label: "Reports", path: "/giving/reports", icon: BarChart3 },
    { 
      label: (
        <>
          <span className="block">Website</span>
          <span className="block">Tools</span>
        </>
      ), 
      path: "/giving/website-tools", 
      icon: Globe 
    },
  ];

  return (
    <div className="w-full space-y-3 select-none relative pt-1 sm:pt-2">
      {/* ─── Clean Header Row: Centered Blue GIVING & IMPACT Plaque (Brought to front at z-30) ─── */}
      <div className="relative z-30 w-full flex items-center justify-center min-h-[84px]">
        {/* Center: Blue GIVING & IMPACT Navy Leather Plaque with Double Gold Wire */}
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl text-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#091D3C] via-[#05142B] to-[#020A17] border-2 border-[#C5A059] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.25)] relative z-30">
          {/* 4 Corner Brass Rivets */}
          <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#FFE394] ring-1 ring-black/70 shadow-xs" />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FFE394] ring-1 ring-black/70 shadow-xs" />
          <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#FFE394] ring-1 ring-black/70 shadow-xs" />
          <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FFE394] ring-1 ring-black/70 shadow-xs" />

          {/* Inner Fine Gold Wire Inlay */}
          <div className="absolute inset-1 rounded-lg border border-[#D4AF37]/40 pointer-events-none" />

          {/* Crest & Title */}
          <div className="flex items-center justify-center gap-2 sm:gap-2.5">
            <HandHeart className="w-5 h-5 sm:w-6 sm:h-6 text-[#FAD77B] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
            <h1 
              className="text-lg sm:text-2xl md:text-[25px] font-bold tracking-[0.14em] text-[#FFF4D4] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              GIVING & IMPACT
            </h1>
            <PageIdBadge id="PG-040" name="Giving & Impact Overview" className="ml-1" />
          </div>

          <p 
            className="text-[11px] sm:text-xs text-[#E0CEAA] tracking-wide mt-0.5 italic drop-shadow"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Creating Brighter Tomorrows Together
          </p>
        </div>
      </div>

      {/* ─── Consolidated 8-Destination Physical Navigation Control Plates (Behind header leaves at z-10) ─── */}
      <div className="w-full max-w-[880px] mx-auto grid grid-cols-4 md:grid-cols-8 gap-[2px] sm:gap-[3px] p-[2.5px] rounded-[8px] bg-[#000814]/95 border border-[#3A2C18]/70 shadow-[0_4px_16px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(0,0,0,0.9)] relative z-10">
        {navigationTabs.map((tab) => {
          const isActive = location === tab.path || (tab.path === "/giving" && location === "/giving/overview");

          return (
            <GivingNavButton
              key={tab.path}
              label={tab.label}
              path={tab.path}
              isActive={isActive}
              icon={tab.icon}
              customIcon={tab.customIcon}
            />
          );
        })}
      </div>
    </div>
  );
}

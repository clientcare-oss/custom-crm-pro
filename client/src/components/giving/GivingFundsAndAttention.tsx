import React from "react";
import { Link } from "wouter";
import { GivingParchmentCard } from "./GivingParchmentCard";
import { 
  Landmark, GraduationCap, Users, Settings, 
  AlertCircle, ChevronRight, Mail, AlertTriangle, 
  Clock, FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GivingFundsAndAttentionProps {
  onOpenFundsModal?: () => void;
}

export function GivingFundsAndAttention({ onOpenFundsModal }: GivingFundsAndAttentionProps) {
  const funds = [
    {
      name: "General Fund",
      amount: "$12,450",
      status: "Available",
      type: "Unrestricted",
      icon: Landmark,
    },
    {
      name: "Scholarship Fund",
      amount: "$24,750",
      status: "Balance",
      type: "Restricted",
      icon: GraduationCap,
    },
    {
      name: "Family Support Fund",
      amount: "$7,100",
      status: "Balance",
      type: "Restricted",
      icon: Users,
    },
    {
      name: "Program Operations",
      amount: "$2,800",
      status: "Balance",
      type: "Restricted",
      icon: Settings,
    },
  ];

  const attentionItems = [
    { label: "3 scholarship applications under review", icon: Users, path: "/giving/scholarships" },
    { label: "2 donor thank you emails pending", icon: Mail, path: "/giving/supporters" },
    { label: "1 recurring donation payment failed", icon: AlertTriangle, path: "/giving/donations" },
    { label: "5 families on scholarship waitlist", icon: Clock, path: "/giving/scholarships" },
    { label: "Review IRS letter for 2026", icon: FileText, path: "/giving/reports" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ─── Fund Management (~65% on lg) ─── */}
      <GivingParchmentCard className="lg:col-span-8 flex flex-col justify-between p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#D8C7A5]/80 pb-3">
          <h2
            className="text-base sm:text-lg font-bold text-[#1B293C] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Fund Management
          </h2>

          <Link href="/giving/funds">
            <button
              type="button"
              className="px-3 py-1 rounded-full bg-[#0A1A33] hover:bg-[#0E2548] text-[#F3EAD3] border border-[#234575]/80 text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <span>View All Funds</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </Link>
        </div>

        {/* 4 Fund Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-3.5">
          {funds.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#EFE4CC]/75 border border-[#D5C1A0] flex flex-col items-center text-center shadow-2xs hover:bg-[#EAE0C4] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#18395E] text-[#FCD77B] flex items-center justify-center mb-2 shadow-xs">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-[#182638] leading-tight truncate w-full">{f.name}</h4>
                <p className="text-base sm:text-lg font-bold font-serif text-[#182638] my-1 leading-none">{f.amount}</p>
                <div className="text-[10px] text-[#69543C] leading-tight">
                  <span className="block">{f.status}</span>
                  <span className="text-[#8C6511] font-medium">{f.type}</span>
                </div>
              </div>
            );
          })}
        </div>
      </GivingParchmentCard>

      {/* ─── Needs Attention (8) (~35% on lg) ─── */}
      <GivingParchmentCard className="lg:col-span-4 flex flex-col justify-between p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#D8C7A5]/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#C23934] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              !
            </div>
            <h2
              className="text-base sm:text-lg font-bold text-[#1B293C] tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Needs Attention
            </h2>
          </div>

          <span className="w-5 h-5 rounded-full bg-[#C23934] text-white font-bold text-xs flex items-center justify-center shadow-2xs">
            8
          </span>
        </div>

        {/* 5 Attention Rows */}
        <div className="space-y-2 pt-2 text-xs">
          {attentionItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link key={idx} href={item.path}>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#EFE4CC]/70 border border-transparent hover:border-[#D5C1A0] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <Icon className="w-3.5 h-3.5 text-[#C23934] shrink-0" />
                    <span className="text-[#3A291A] font-medium leading-tight truncate group-hover:text-[#182638]">
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8C6511] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </GivingParchmentCard>
    </div>
  );
}

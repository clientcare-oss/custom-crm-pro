import React from "react";
import { Link, useLocation } from "wouter";
import { GivingParchmentCard } from "./GivingParchmentCard";
import { 
  Heart, Users, GraduationCap, Landmark, Receipt, 
  BarChart3, Link as LinkIcon, FileText, Code2, 
  ExternalLink 
} from "lucide-react";

interface GivingActionsAndToolsProps {
  onOpenDonation?: () => void;
  onOpenSupporter?: () => void;
  onOpenScholarship?: () => void;
  onOpenFund?: () => void;
}

export function GivingActionsAndTools({
  onOpenDonation,
  onOpenSupporter,
  onOpenScholarship,
  onOpenFund,
}: GivingActionsAndToolsProps) {
  const [, setLocation] = useLocation();

  const quickActions = [
    { label: "Add Donation", icon: Heart, onClick: () => onOpenDonation ? onOpenDonation() : setLocation("/giving/donations") },
    { label: "Add Supporter", icon: Users, onClick: () => onOpenSupporter ? onOpenSupporter() : setLocation("/giving/supporters") },
    { label: "New Scholarship", icon: GraduationCap, onClick: () => onOpenScholarship ? onOpenScholarship() : setLocation("/giving/scholarships") },
    { label: "Create Fund", icon: Landmark, onClick: () => onOpenFund ? onOpenFund() : setLocation("/giving/funds") },
    { label: "Generate Receipt", icon: Receipt, onClick: () => setLocation("/giving/receipts") },
    { label: "View Reports", icon: BarChart3, onClick: () => setLocation("/giving/reports") },
  ];

  const websiteTools = [
    { label: "Donation Form (Embed)", icon: LinkIcon, path: "/giving/website-tools" },
    { label: "Scholarship Application (Embed)", icon: FileText, path: "/giving/website-tools" },
    { label: "Widget Code", icon: Code2, path: "/giving/website-tools" },
    { label: "Preview on Website", icon: ExternalLink, path: "/giving/website-tools", external: true },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ─── Quick Actions (~58% on lg) ─── */}
      <GivingParchmentCard className="lg:col-span-7 flex flex-col justify-between p-4 sm:p-5">
        <div className="border-b border-[#D8C7A5]/80 pb-3">
          <h2
            className="text-base sm:text-lg font-bold text-[#1B293C] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Quick Actions
          </h2>
        </div>

        {/* 6 Action Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-3.5">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={action.onClick}
                className="p-3 rounded-xl bg-[#EFE4CC]/80 border border-[#D5C1A0] hover:bg-[#EAE0C4] hover:border-[#C5A059] flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-2xs cursor-pointer select-none group"
              >
                <div className="w-8 h-8 rounded-full bg-[#18395E] text-[#FCD77B] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-[#182638] group-hover:text-[#8C6511] leading-tight">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </GivingParchmentCard>

      {/* ─── Website Tools (~42% on lg) ─── */}
      <GivingParchmentCard className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5">
        <div className="border-b border-[#D8C7A5]/80 pb-3">
          <h2
            className="text-base sm:text-lg font-bold text-[#1B293C] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Website Tools
          </h2>
        </div>

        {/* 4 Tool Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3.5">
          {websiteTools.map((tool, idx) => {
            const Icon = tool.icon;
            return (
              <Link key={idx} href={tool.path}>
                <div className="p-3 rounded-xl bg-[#EFE4CC]/80 border border-[#D5C1A0] hover:bg-[#EAE0C4] hover:border-[#C5A059] flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-2xs cursor-pointer select-none group h-full">
                  <div className="w-8 h-8 rounded-full bg-[#18395E] text-[#FCD77B] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#182638] group-hover:text-[#8C6511] leading-tight">
                    {tool.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </GivingParchmentCard>
    </div>
  );
}

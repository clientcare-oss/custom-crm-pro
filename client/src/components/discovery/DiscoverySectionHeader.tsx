import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DiscoverySectionHeaderProps {
  number: number | string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  subtitle?: string;
}

export default function DiscoverySectionHeader({
  number,
  title,
  isOpen,
  onToggle,
  badge,
  subtitle,
}: DiscoverySectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3.5 py-3.5 px-5 rounded-xl transition-all text-left group cursor-pointer border shadow-[0_8px_22px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] ${
        isOpen
          ? "bg-gradient-to-r from-[#11284B] via-[#0B1C36] to-[#071428] border-[#C5A059]/75"
          : "bg-gradient-to-r from-[#091830]/95 to-[#051022]/95 border-[#243B61] hover:border-[#C5A059]/55"
      }`}
    >
      <span
        className={`flex-shrink-0 w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all border ${
          isOpen
            ? "bg-gradient-to-b from-[#FFE08C] to-[#C8963E] text-[#07162B] border-[#FFF3C4] shadow-[0_0_12px_rgba(255,215,115,0.55)]"
            : "bg-[#1A2421] text-[#FFE394] border-[#C5A059]/55 group-hover:border-[#FFE394]"
        }`}
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {number}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className="font-bold text-[#FFF4D4] group-hover:text-[#FFE394] text-base sm:text-lg tracking-tight transition-colors"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {title}
          </span>
          {badge && (
            <Badge className="bg-[#091D34] text-[#FFE394] text-[10px] font-mono uppercase tracking-wider border border-[#C5A059]/45">
              {badge}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-[#9FB2CD] truncate mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#C6B697] hidden sm:inline">
          {isOpen ? "OPEN" : "EXPAND"}
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-[#FFE394] flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#C5A059] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
        )}
      </div>
    </button>
  );
}

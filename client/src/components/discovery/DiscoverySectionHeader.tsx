import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DiscoverySectionHeaderProps {
  number: number | string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
}

export default function DiscoverySectionHeader({
  number,
  title,
  isOpen,
  onToggle,
  badge,
}: DiscoverySectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 py-3 px-4 rounded-lg bg-[#0d1f33] hover:bg-[#112440] transition-colors text-left group border border-slate-800"
    >
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center border border-amber-500/30">
        {number}
      </span>
      <span className="flex-1 font-semibold text-white text-sm tracking-wide uppercase">
        {title}
      </span>
      {badge && (
        <Badge className="bg-blue-500/20 text-blue-300 text-xs border-0">{badge}</Badge>
      )}
      {isOpen ? (
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      ) : (
        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      )}
    </button>
  );
}

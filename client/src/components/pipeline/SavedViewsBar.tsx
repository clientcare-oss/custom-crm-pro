import React from "react";
import { cn } from "@/lib/utils";
import {
  Users,
  Tag,
  GraduationCap,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Wrench,
  Clock,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import type { SavedViewItem } from "./types";

interface SavedViewsBarProps {
  views: SavedViewItem[];
  activeViewSlug: string;
  onSelectView: (view: SavedViewItem) => void;
  viewCounts?: Record<string, number>;
}

const VIEW_ICONS: Record<string, any> = {
  "all-clients": Users,
  "plan-55": Tag,
  "plan-105": Tag,
  "scholarship": GraduationCap,
  "pay-per-use": Send,
  "renewals": RefreshCw,
  "nonpay": AlertCircle,
  "tools-only": Wrench,
  "on-hold": Clock,
};

export function SavedViewsBar({
  views,
  activeViewSlug,
  onSelectView,
  viewCounts = {},
}: SavedViewsBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
      {views.map((view) => {
        const isActive = activeViewSlug === view.slug;
        const Icon = VIEW_ICONS[view.slug] || SlidersHorizontal;
        const count = viewCounts[view.slug];

        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onSelectView(view)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border shrink-0",
              isActive
                ? "bg-[#0A2349] border-[#F5B544] text-[#F5B544] shadow-[0_0_12px_rgba(245,181,68,0.2)]"
                : "bg-[#071F42]/80 hover:bg-[#0A2954] border-[#0E3A73] text-slate-300 hover:text-white"
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                isActive ? "text-[#F5B544]" : "text-slate-400"
              )}
            />
            <span>{view.name}</span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-tight",
                  isActive
                    ? "bg-[#F5B544] text-[#07162B]"
                    : "bg-[#0D2F5E] text-slate-300"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

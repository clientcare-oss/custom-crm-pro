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
  ChevronDown,
  Pin,
  PinOff,
  User,
  Plus,
  Lock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { FilterPopover } from "./FilterPopover";
import type { SavedViewItem, PipelineFilters } from "./types";

interface SavedViewsBarProps {
  views: SavedViewItem[];
  activeViewSlug: string;
  onSelectView: (view: SavedViewItem) => void;
  onTogglePinView?: (view: SavedViewItem) => void;
  onNewView: () => void;
  viewCounts?: Record<string, number>;
  filters: PipelineFilters;
  onChangeFilters: (filters: PipelineFilters) => void;
  onClearFilters: () => void;
  matchingCount: number;
}

const VIEW_ICONS: Record<string, any> = {
  "my-work": User,
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

// Default visible slugs in the primary bar
const DEFAULT_PRIMARY_SLUGS = ["my-work", "all-clients", "plan-55", "plan-105", "scholarship"];

export function SavedViewsBar({
  views,
  activeViewSlug,
  onSelectView,
  onTogglePinView,
  onNewView,
  viewCounts = {},
  filters,
  onChangeFilters,
  onClearFilters,
  matchingCount,
}: SavedViewsBarProps) {
  // Primary bar items: either in DEFAULT_PRIMARY_SLUGS or explicitly pinned
  const primaryViews = views.filter(
    (v) => DEFAULT_PRIMARY_SLUGS.includes(v.slug) || v.isPinned
  );

  // Overflow items in "More ▼"
  const overflowViews = views.filter(
    (v) => !primaryViews.some((pv) => pv.slug === v.slug)
  );

  const isOverflowActive = overflowViews.some((v) => v.slug === activeViewSlug);
  const activeOverflowView = overflowViews.find((v) => v.slug === activeViewSlug);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap py-1">
      {/* Left: Primary Saved Views + More Dropdown */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {primaryViews.map((view) => {
          const isActive = activeViewSlug === view.slug;
          const Icon = VIEW_ICONS[view.slug] || SlidersHorizontal;
          const count = viewCounts[view.slug];

          return (
            <button
              key={view.id || view.slug}
              type="button"
              onClick={() => onSelectView(view)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border shrink-0",
                isActive
                  ? "bg-[#0A2349] border-[#F5B544] text-[#F5B544] shadow-[0_0_12px_rgba(245,181,68,0.2)]"
                  : "bg-[#071F42]/85 hover:bg-[#0A2954] border-[#0E3A73] text-slate-300 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isActive ? "text-[#F5B544]" : "text-slate-400"
                )}
              />
              <span>{view.name}</span>
              {view.isPrivate && (
                <span title="Private to you">
                  <Lock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                </span>
              )}
              {count !== undefined && (
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

        {/* More Views Dropdown */}
        {overflowViews.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer border shrink-0",
                  isOverflowActive
                    ? "bg-[#0A2349] border-[#F5B544] text-[#F5B544] shadow-[0_0_12px_rgba(245,181,68,0.2)]"
                    : "bg-[#071F42]/85 hover:bg-[#0A2954] border-[#0E3A73] text-slate-300 hover:text-white"
                )}
              >
                <span>{isOverflowActive ? activeOverflowView?.name : "More"}</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-[#07162B] border-[#0E274D] text-slate-200 shadow-2xl rounded-xl w-56 text-xs p-1"
            >
              <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Additional Views
              </DropdownMenuLabel>
              {overflowViews.map((view) => {
                const isSelected = activeViewSlug === view.slug;
                const Icon = VIEW_ICONS[view.slug] || SlidersHorizontal;
                const count = viewCounts[view.slug];

                return (
                  <DropdownMenuItem
                    key={view.id || view.slug}
                    onClick={() => onSelectView(view)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                      isSelected ? "bg-[#0A2349] text-[#F5B544]" : "hover:bg-[#0A2954] text-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-[#F5B544]" : "text-slate-400")} />
                      <span className="truncate">{view.name}</span>
                      {view.isPrivate && (
                        <span title="Private">
                          <Lock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {count !== undefined && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#0D2F5E] text-slate-300">
                          {count}
                        </span>
                      )}
                      {onTogglePinView && !view.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePinView(view);
                          }}
                          className="p-1 hover:text-[#F5B544] text-slate-400 transition-colors"
                          title={view.isPinned ? "Unpin view" : "Pin to bar"}
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Right: Filter Trigger Button + New View */}
      <div className="flex items-center gap-2">
        <FilterPopover
          filters={filters}
          onChangeFilters={onChangeFilters}
          onClearFilters={onClearFilters}
          matchingCount={matchingCount}
        />

        <button
          type="button"
          onClick={onNewView}
          className="h-8 px-2.5 rounded-xl text-xs font-semibold border border-[#0E3A73] bg-[#071F42] hover:bg-[#0A2954] text-slate-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="h-3.5 w-3.5 text-[#F5B544]" />
          <span>New View</span>
        </button>
      </div>
    </div>
  );
}

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
  User,
  Plus,
  Lock,
  Briefcase,
  ArrowUpDown,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FilterPopover } from "./FilterPopover";
import type {
  SavedViewItem,
  PipelineFilters,
  PipelineSortField,
  PipelineSortDirection,
  PipelineStageItem,
} from "./types";

interface SavedViewsBarProps {
  views: SavedViewItem[];
  activeViewSlug: string;
  onSelectView: (view: SavedViewItem) => void;
  onTogglePinView?: (view: SavedViewItem) => void;
  onDeleteView?: (view: SavedViewItem) => void;
  onNewView: () => void;
  viewCounts?: Record<string, number>;
  filters: PipelineFilters;
  onChangeFilters: (filters: PipelineFilters) => void;
  onClearFilters: () => void;
  matchingCount: number;
  sortField: PipelineSortField;
  sortDirection: PipelineSortDirection;
  onChangeSort: (field: PipelineSortField, direction?: PipelineSortDirection) => void;
  stages?: PipelineStageItem[];
}

const VIEW_ICONS: Record<string, any> = {
  "all-clients": Users,
  "my-work": User,
  "leads": Sparkles,
  "active-projects": Briefcase,
  "plan-55": Tag,
  "plan-105": Tag,
  "family-plan": Users,
  "scholarship": GraduationCap,
  "pay-per-use": Send,
  "renewals": RefreshCw,
  "nonpay": AlertCircle,
  "tools-only": Wrench,
  "on-hold": Clock,
};

const DEFAULT_PRIMARY_SLUGS = [
  "all-clients",
  "my-work",
  "leads",
  "active-projects",
  "scholarship",
  "renewals",
];

const SORT_LABELS: Record<PipelineSortField, string> = {
  name: "Student Name",
  family: "Family Name",
  stage: "Pipeline Stage",
  lastActivity: "Last Activity",
  nextDate: "Next Scheduled Date",
};

export function SavedViewsBar({
  views,
  activeViewSlug,
  onSelectView,
  onTogglePinView,
  onDeleteView,
  onNewView,
  viewCounts = {},
  filters,
  onChangeFilters,
  onClearFilters,
  matchingCount,
  sortField,
  sortDirection,
  onChangeSort,
  stages = [],
}: SavedViewsBarProps) {
  const primaryViews = views.filter(
    (v) => DEFAULT_PRIMARY_SLUGS.includes(v.slug) || v.isPinned
  );

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
            <div key={view.id || view.slug} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => onSelectView(view)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border shrink-0",
                  isActive
                    ? "bg-[#05142B] border-[#C5A059] text-[#FFE394] shadow-[0_0_12px_rgba(197,160,89,0.25)]"
                    : "bg-[#020A17]/85 hover:bg-[#05142B] border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4]"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isActive ? "text-[#FFE394]" : "text-[#A69371]"
                  )}
                />
                <span>{view.name}</span>
                {view.isPrivate && (
                  <span title="Personal view (visible only to you)">
                    <Lock className="h-2.5 w-2.5 text-[#C5A059] shrink-0" />
                  </span>
                )}
                {count !== undefined && (
                  <span
                    className={cn(
                      "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-tight",
                      isActive
                        ? "bg-[#FFE394] text-[#07162B]"
                        : "bg-[#020A17] border border-[#3A2C18] text-[#A69371]"
                    )}
                  >
                    {count}
                  </span>
                )}
                {!view.isDefault && onDeleteView && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteView(view);
                    }}
                    title="Delete custom view"
                    className="ml-0.5 p-0.5 rounded hover:bg-rose-950/80 text-[#A69371] hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </span>
                )}
              </button>
            </div>
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
                    ? "bg-[#05142B] border-[#C5A059] text-[#FFE394] shadow-[0_0_12px_rgba(197,160,89,0.25)]"
                    : "bg-[#020A17]/85 hover:bg-[#05142B] border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4]"
                )}
              >
                <span>{isOverflowActive ? activeOverflowView?.name : "More Views"}</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_12px_32px_rgba(0,0,0,0.95)] rounded-xl w-60 text-xs p-1"
            >
              <DropdownMenuLabel className="text-[10px] font-bold text-[#C6B697] uppercase tracking-wider px-2 py-1">
                Plan & Status Views
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
                      isSelected
                        ? "bg-[#020A17] text-[#FFE394] font-semibold"
                        : "hover:bg-[#07162B] text-[#C6B697] hover:text-[#FFF4D4]"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isSelected ? "text-[#FFE394]" : "text-[#A69371]"
                        )}
                      />
                      <span className="truncate">{view.name}</span>
                      {view.isPrivate && (
                        <span title="Private">
                          <Lock className="h-2.5 w-2.5 text-[#C5A059] shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {count !== undefined && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#020A17] border border-[#3A2C18] text-[#A69371]">
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
                          className="p-1 hover:text-[#FFE394] text-[#A69371] transition-colors"
                          title={view.isPinned ? "Unpin view" : "Pin to bar"}
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                      )}
                      {onDeleteView && !view.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteView(view);
                          }}
                          className="p-1 hover:text-rose-400 text-[#A69371] transition-colors"
                          title="Delete custom view"
                        >
                          <Trash2 className="h-3 w-3" />
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

      {/* Right: Sort Menu + Filter Popover + New View */}
      <div className="flex items-center gap-2">
        {/* Sort Dropdown (HoneyBook-style project sort pill) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-8 px-3 rounded-xl text-xs font-semibold border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>
                {SORT_LABELS[sortField]} ({sortDirection === "asc" ? "↑" : "↓"})
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-2xl rounded-xl w-52 text-xs p-1"
          >
            <DropdownMenuLabel className="text-[10px] font-bold text-[#C6B697] uppercase tracking-wider px-2 py-1">
              Sort Pipeline By
            </DropdownMenuLabel>
            {(Object.keys(SORT_LABELS) as PipelineSortField[]).map((field) => {
              const active = sortField === field;
              return (
                <DropdownMenuItem
                  key={field}
                  onClick={() =>
                    onChangeSort(
                      field,
                      active
                        ? sortDirection === "asc"
                          ? "desc"
                          : "asc"
                        : "asc"
                    )
                  }
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer",
                    active
                      ? "bg-[#020A17] text-[#FFE394] font-semibold"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  )}
                >
                  <span>{SORT_LABELS[field]}</span>
                  {active && (
                    <span className="text-[10px] font-bold text-[#C5A059]">
                      {sortDirection === "asc" ? "ASC ↑" : "DESC ↓"}
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator className="bg-[#3A2C18]" />
            <DropdownMenuItem
              onClick={() =>
                onChangeSort(
                  sortField,
                  sortDirection === "asc" ? "desc" : "asc"
                )
              }
              className="px-2.5 py-1.5 text-[#C5A059] cursor-pointer"
            >
              Toggle Direction ({sortDirection === "asc" ? "Descending ↓" : "Ascending ↑"})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <FilterPopover
          filters={filters}
          onChangeFilters={onChangeFilters}
          onClearFilters={onClearFilters}
          matchingCount={matchingCount}
          stages={stages}
        />

        <button
          type="button"
          onClick={onNewView}
          className="h-8 px-3 rounded-xl text-xs font-semibold border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] text-[#D8C7A5] hover:text-[#FFF4D4] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="h-3.5 w-3.5 text-[#FFE394]" />
          <span>New View</span>
        </button>
      </div>
    </div>
  );
}

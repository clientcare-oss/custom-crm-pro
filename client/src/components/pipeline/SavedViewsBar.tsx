import React from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Pin,
  Plus,
  Lock,
  ArrowUpDown,
  Trash2,
  Search,
  X,
  Settings2,
  LayoutGrid,
  List,
  AlertCircle,
  Home,
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
import { ADVOCATE_ROSTER } from "./pipelineDefaults";
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
  attentionCount?: number;
  sortField: PipelineSortField;
  sortDirection: PipelineSortDirection;
  onChangeSort: (field: PipelineSortField, direction?: PipelineSortDirection) => void;
  stages?: PipelineStageItem[];
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedAdvocate?: string;
  onSelectAdvocate: (advocate?: string) => void;
  onCustomizePipeline: () => void;
  viewMode: "board" | "list";
  onViewModeChange: (mode: "board" | "list") => void;
}

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
  nextDate: "Due Date",
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
  attentionCount = 0,
  sortField,
  sortDirection,
  onChangeSort,
  stages = [],
  searchQuery,
  onSearchChange,
  selectedAdvocate,
  onSelectAdvocate,
  onCustomizePipeline,
  viewMode,
  onViewModeChange,
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
    <div className="space-y-2.5">
      {/* ── LEVEL 1: Saved Views (Single Compact Tab Row with Subtle Gold Underline) ── */}
      <div className="flex items-center gap-1 border-b border-[#1E2E48] flex-wrap">
        {primaryViews.map((view) => {
          const isActive = activeViewSlug === view.slug;
          const count = viewCounts[view.slug];

          return (
            <button
              key={view.id || view.slug}
              type="button"
              onClick={() => onSelectView(view)}
              className={cn(
                "relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap -mb-px border-b-2",
                isActive
                  ? "border-[#C5A059] text-[#FFF4D4] font-semibold"
                  : "border-transparent text-[#94A3B8] hover:text-[#E2E8F0] hover:border-[#334155]"
              )}
            >
              {view.slug === "all-clients" && (
                <Home
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isActive ? "text-[#C5A059]" : "text-[#64748B]"
                  )}
                />
              )}
              <span>{view.name}</span>
              {view.isPrivate && (
                <Lock className="h-2.5 w-2.5 text-[#C5A059] shrink-0" />
              )}
              {count !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.2 rounded-full",
                    isActive
                      ? "bg-[#C5A059]/20 text-[#FFE394]"
                      : "text-[#64748B]"
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
                  className="ml-0.5 p-0.5 rounded hover:bg-rose-950/80 text-[#64748B] hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
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
                  "inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer -mb-px border-b-2",
                  isOverflowActive
                    ? "border-[#C5A059] text-[#FFF4D4] font-semibold"
                    : "border-transparent text-[#94A3B8] hover:text-[#E2E8F0]"
                )}
              >
                <span>
                  {isOverflowActive ? activeOverflowView?.name : "More Views"}
                </span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-[#071326] border border-[#1E2E48] text-[#FFF4D4] shadow-2xl rounded-xl w-56 text-xs p-1"
            >
              <DropdownMenuLabel className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider px-2 py-1">
                Additional Views
              </DropdownMenuLabel>
              {overflowViews.map((view) => {
                const isSelected = activeViewSlug === view.slug;
                const count = viewCounts[view.slug];

                return (
                  <DropdownMenuItem
                    key={view.id || view.slug}
                    onClick={() => onSelectView(view)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors",
                      isSelected
                        ? "bg-[#102341] text-[#FFE394] font-semibold"
                        : "hover:bg-[#0D1E38] text-[#CBD5E1] hover:text-[#FFF4D4]"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{view.name}</span>
                      {view.isPrivate && (
                        <Lock className="h-2.5 w-2.5 text-[#C5A059] shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {count !== undefined && (
                        <span className="text-[10px] text-[#94A3B8]">
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
                          className="p-0.5 hover:text-[#FFE394] text-[#64748B]"
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
                          className="p-0.5 hover:text-rose-400 text-[#64748B]"
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

        {/* Compact "+" Button to Create a New View */}
        <button
          type="button"
          onClick={onNewView}
          title="Create new saved view"
          className="inline-flex items-center justify-center w-7 h-7 ml-1 rounded-lg text-[#94A3B8] hover:text-[#FFF4D4] hover:bg-[#0D1E38] transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* ── LEVEL 2: Compact Toolbar (Sort | Filter | Search | Attention | Employee | Customize) ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Left: Sort + Filter + Search + Compact Attention Indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-7 px-2.5 rounded-full text-[11px] font-medium border border-[#233554] bg-[#071326] hover:bg-[#0D1E38] text-[#93C5FD] hover:text-[#FFF4D4] inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <ArrowUpDown className="h-3 w-3 text-[#60A5FA]" />
                <span>
                  {sortDirection === "asc" ? "↑" : "↓"} {SORT_LABELS[sortField]}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-[#071326] border border-[#1E2E48] text-[#FFF4D4] shadow-2xl rounded-xl w-48 text-xs p-1"
            >
              <DropdownMenuLabel className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider px-2 py-1">
                Sort By
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
                        ? "bg-[#102341] text-[#FFE394] font-semibold"
                        : "text-[#CBD5E1] hover:text-[#FFF4D4]"
                    )}
                  >
                    <span>{SORT_LABELS[field]}</span>
                    {active && (
                      <span className="text-[10px] font-bold text-[#C5A059]">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter Popover */}
          <FilterPopover
            filters={filters}
            onChangeFilters={onChangeFilters}
            onClearFilters={onClearFilters}
            matchingCount={matchingCount}
            stages={stages}
          />

          {/* Compact Search Input */}
          <div className="relative w-44 sm:w-52">
            <Search className="h-3 w-3 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search cases..."
              className="w-full h-7 pl-7 pr-6 rounded-full bg-[#071326] border border-[#1E2E48] focus:border-[#C5A059]/70 text-[11px] text-[#FFF4D4] placeholder:text-[#64748B] focus:outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#FFF4D4] cursor-pointer"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Restrained Attention Indicator (Only shown when cases need attention or filter is active) */}
          {(attentionCount > 0 || filters.needsAttentionOnly) && (
            <button
              type="button"
              onClick={() =>
                onChangeFilters({
                  ...filters,
                  needsAttentionOnly: !filters.needsAttentionOnly,
                })
              }
              className={cn(
                "h-7 px-2.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer border",
                filters.needsAttentionOnly
                  ? "bg-rose-950/90 border-rose-500/60 text-rose-200 font-semibold"
                  : "bg-[#071326] hover:bg-rose-950/40 border-[#1E2E48] hover:border-rose-500/40 text-rose-300"
              )}
              title="Click to filter cases requiring attention"
            >
              <AlertCircle className="h-3 w-3 text-rose-400 shrink-0" />
              <span>{attentionCount} Need Attention</span>
            </button>
          )}
        </div>

        {/* Right: Employee Avatar Filter + Customize + View Switcher */}
        <div className="flex items-center gap-2">
          {/* HoneyBook-Style Employee Avatar Filter */}
          <div className="flex items-center -space-x-1">
            <button
              type="button"
              onClick={() => onSelectAdvocate(undefined)}
              className={cn(
                "w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center border transition-all cursor-pointer",
                !selectedAdvocate
                  ? "bg-[#102B4E] text-[#FFE394] border-[#C5A059] z-10"
                  : "bg-[#071326] text-[#94A3B8] border-[#1E2E48] hover:text-[#FFF4D4]"
              )}
              title="All Employees"
            >
              All
            </button>
            {ADVOCATE_ROSTER.slice(0, 4).map((adv) => {
              const isSelected =
                selectedAdvocate?.toLowerCase() === adv.name.toLowerCase();
              return (
                <button
                  key={adv.name}
                  type="button"
                  onClick={() =>
                    onSelectAdvocate(isSelected ? undefined : adv.name)
                  }
                  title={`Filter by ${adv.name}`}
                  className={cn(
                    "w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center border transition-all cursor-pointer",
                    isSelected
                      ? "bg-[#C5A059] text-[#07162B] border-[#FFE394] z-10 scale-105"
                      : "bg-[#0A192F] text-[#94A3B8] border-[#1E2E48] hover:border-[#64748B] hover:text-[#FFF4D4]"
                  )}
                >
                  {adv.initials}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-[#1E2E48]" />

          {/* Customize Button */}
          <button
            type="button"
            onClick={onCustomizePipeline}
            className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-[#CBD5E1] hover:text-[#FFF4D4] hover:bg-[#0D1E38] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Settings2 className="h-3.5 w-3.5 text-[#94A3B8]" />
            <span>Customize</span>
          </button>

          {/* Compact List / Board Icon Toggle */}
          <div className="flex items-center bg-[#071326] border border-[#1E2E48] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                viewMode === "list"
                  ? "bg-[#102B4E] text-[#FFE394]"
                  : "text-[#64748B] hover:text-[#FFF4D4]"
              )}
              title="Stage Case Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("board")}
              className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                viewMode === "board"
                  ? "bg-[#102B4E] text-[#FFE394]"
                  : "text-[#64748B] hover:text-[#FFF4D4]"
              )}
              title="Stage Columns View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

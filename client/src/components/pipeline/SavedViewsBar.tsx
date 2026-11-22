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
  GripVertical,
  Check,
  Archive,
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
  isCustomizingPipeline?: boolean;
  onViewArchive?: () => void;
  viewMode: "board" | "list";
  onViewModeChange: (mode: "board" | "list") => void;
}

const DEFAULT_PRIMARY_SLUGS = [
  "all-clients",
  "my-work",
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
  isCustomizingPipeline = false,
  onViewArchive,
  viewMode,
  onViewModeChange,
}: SavedViewsBarProps) {
  const primaryViews = views.filter(
    (v) =>
      DEFAULT_PRIMARY_SLUGS.includes(v.slug) ||
      (!v.isDefault && v.isPinned)
  );

  const overflowViews = views.filter(
    (v) => !primaryViews.some((pv) => pv.slug === v.slug)
  );

  const isOverflowActive = overflowViews.some((v) => v.slug === activeViewSlug);
  const activeOverflowView = overflowViews.find((v) => v.slug === activeViewSlug);

  return (
    <div className="space-y-2.5">
      {/* ── LEVEL 1: Pipeline | My Caseload | + Add View (Serif Gold Underline Tab Strip Under Title) ── */}
      <div className="flex items-center gap-6 border-b border-[#1E2E48]/90 px-1 flex-wrap">
        {primaryViews.map((view) => {
          const isActive = activeViewSlug === view.slug;
          const count = viewCounts[view.slug];
          const displayLabel =
            view.slug === "all-clients"
              ? "Pipeline"
              : view.slug === "my-work"
                ? "My Caseload"
                : view.name;

          return (
            <button
              key={view.id || view.slug}
              type="button"
              onClick={() => onSelectView(view)}
              className={cn(
                "relative inline-flex items-center gap-1.5 pb-2.5 pt-1 text-sm sm:text-[15px] font-serif tracking-wide transition-colors cursor-pointer whitespace-nowrap",
                isActive
                  ? "text-[#DFB668] font-semibold"
                  : "text-[#7A90AC] hover:text-[#CBD5E1]"
              )}
            >
              <span>{displayLabel}</span>
              {view.isPrivate && (
                <Lock className="h-3 w-3 text-[#C5A059] shrink-0" />
              )}
              {count !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-sans font-semibold px-1.5 py-0.2 rounded-full",
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
              {isActive && (
                <span className="absolute bottom-[-1.5px] left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-[#DFB668] via-[#F2CD80] to-[#C5A059] shadow-[0_0_8px_rgba(242,205,128,0.6)]" />
              )}
            </button>
          );
        })}

        {/* Add View Tab Button (Directly after My Caseload) */}
        <button
          type="button"
          onClick={onNewView}
          title="Add a custom saved view"
          className="relative inline-flex items-center gap-1.5 pb-2.5 pt-1 text-sm sm:text-[15px] font-serif tracking-wide text-[#94ADC9] hover:text-[#FFE394] transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5 text-[#C5A059]" />
          <span>Add View</span>
        </button>

        {/* More Views Dropdown */}
        {overflowViews.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative inline-flex items-center gap-1 pb-2.5 pt-1 text-xs sm:text-sm font-serif tracking-wide transition-colors cursor-pointer whitespace-nowrap",
                  isOverflowActive
                    ? "text-[#DFB668] font-semibold"
                    : "text-[#64748B] hover:text-[#CBD5E1]"
                )}
              >
                <span>
                  {isOverflowActive ? activeOverflowView?.name : "More Views"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-75" />
                {isOverflowActive && (
                  <span className="absolute bottom-[-1.5px] left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-[#DFB668] via-[#F2CD80] to-[#C5A059] shadow-[0_0_8px_rgba(242,205,128,0.6)]" />
                )}
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

              <DropdownMenuSeparator className="bg-[#1E2E48] my-1" />
              <DropdownMenuItem
                onClick={() => {
                  if (onViewArchive) {
                    onViewArchive();
                  } else {
                    window.location.href = "/archive";
                  }
                }}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[#0D1E38] text-[#FFE394] hover:text-[#FFF4D4] font-semibold"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Archive className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                  <span className="truncate">Archive</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ── LEVEL 2: Compact Toolbar (Employee | Customize) ── */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
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

          {/* Customize Order Toggle Button */}
          <button
            type="button"
            onClick={onCustomizePipeline}
            className={cn(
              "h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer border",
              isCustomizingPipeline
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394] shadow-[0_0_12px_rgba(197,160,89,0.5)]"
                : "text-[#CBD5E1] border-transparent hover:text-[#FFF4D4] hover:bg-[#0D1E38]"
            )}
            title={
              isCustomizingPipeline
                ? "Click when finished dragging stages to reorder"
                : "Click to show 6-dot grab handles and drag stages to reorder"
            }
          >
            {isCustomizingPipeline ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#07162B] stroke-[2.5]" />
                <span>Done Reordering</span>
              </>
            ) : (
              <>
                <GripVertical className="h-3.5 w-3.5 text-[#C5A059]" />
                <span>Customize</span>
              </>
            )}
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

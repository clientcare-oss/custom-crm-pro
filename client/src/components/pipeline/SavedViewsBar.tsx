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
      {/* ── LEVEL 1: Pipeline | My Caseload | + Add View | More Views (Glowing Gold Filament Tab Bar) ── */}
      <div className="flex items-center gap-6 border-b border-[#88a8d4]/22 px-0.5 flex-wrap">
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
                "relative inline-flex items-center gap-2 pb-2.5 pt-1 text-[15px] sm:text-[16px] font-serif tracking-wide transition-colors cursor-pointer whitespace-nowrap",
                isActive
                  ? "text-[#F3D58C] font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]"
                  : "text-[#C6D4E8] hover:text-[#FAF6EC]"
              )}
            >
              <span>{displayLabel}</span>
              {view.isPrivate && (
                <Lock className="h-3 w-3 text-[#E5C175] shrink-0" />
              )}
              {count !== undefined && (
                <span
                  className={cn(
                    "text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full leading-none",
                    isActive
                      ? "bg-[#112238]/90 border border-[#d8bc82]/35 text-[#F6E2AE] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                      : "text-[#9AB0CE]"
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
                  className="ml-0.5 p-0.5 rounded hover:bg-rose-950/80 text-[#88A0C0] hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              )}
              {isActive && <span aria-hidden="true" className="adm-pipe-tab-glow" />}
            </button>
          );
        })}

        {/* Add View Tab Button (Directly after My Caseload) */}
        <button
          type="button"
          onClick={onNewView}
          title="Add a custom saved view"
          className="relative inline-flex items-center gap-1.5 pb-2.5 pt-1 text-[15px] sm:text-[16px] font-serif tracking-wide text-[#EEF3FA] hover:text-[#FFE8A8] transition-colors cursor-pointer whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
        >
          <Plus className="h-3.5 w-3.5 text-[#E8C574]" />
          <span>Add View</span>
        </button>

        {/* More Views Dropdown */}
        {overflowViews.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative inline-flex items-center gap-1.5 pb-2.5 pt-1 text-[14.5px] sm:text-[15.5px] font-serif tracking-wide transition-colors cursor-pointer whitespace-nowrap",
                  isOverflowActive
                    ? "text-[#F3D58C] font-semibold"
                    : "text-[#B4C4DC] hover:text-[#FAF6EC]"
                )}
              >
                <span>
                  {isOverflowActive ? activeOverflowView?.name : "More Views"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                {isOverflowActive && <span aria-hidden="true" className="adm-pipe-tab-glow" />}
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
    </div>
  );
}

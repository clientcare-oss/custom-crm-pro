import React from "react";
import { ViewMode, Status } from "./types";
import { Search, ChevronDown, Plus, LayoutGrid, LayoutList, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotesHeaderProps {
  title?: string;
  subtitle?: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  search: string;
  onSearchChange: (search: string) => void;
  category: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
  status: string;
  onStatusChange: (status: string) => void;
  onAddClick: () => void;
  isCompanyScope?: boolean;
}

export default function NotesHeader({
  title = "My Notes",
  subtitle = "Capture it. Organize it. Turn it into action.",
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  status,
  onStatusChange,
  onAddClick,
  isCompanyScope = false,
}: NotesHeaderProps) {
  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-[#171920] via-[#1c1e27] to-[#171920] border border-[#2b2e38] p-3 sm:p-4 shadow-[0_8px_30px_rgba(0,0,0,0.65)] relative z-20">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Glowing Lightbulb Icon + Script/Warm Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 fill-amber-400/20 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif italic text-amber-100/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {title}
              </h1>
              {isCompanyScope && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Company
                </span>
              )}
            </div>
            <p className="text-xs text-amber-200/60 font-sans tracking-wide mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Center / Right: Search, Filters, View Mode, + Add Note */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 justify-start xl:justify-end flex-1">
          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search notes, tags, or keywords..."
              className="w-full bg-[#111319] hover:bg-[#13161f] focus:bg-[#0f1118] text-xs h-9 pl-9 pr-3 rounded-xl border border-[#303440] focus:border-amber-400/80 text-white placeholder:text-slate-500 outline-none transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="appearance-none bg-[#111319] hover:bg-[#13161f] text-xs h-9 pl-3 pr-8 rounded-xl border border-[#303440] text-slate-200 font-medium outline-none cursor-pointer transition-colors"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="appearance-none bg-[#111319] hover:bg-[#13161f] text-xs h-9 pl-3 pr-8 rounded-xl border border-[#303440] text-slate-200 font-medium outline-none cursor-pointer transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* View Mode Toggle: Wall vs List */}
          <div className="flex items-center p-0.5 rounded-xl bg-[#0f1117] border border-[#2b2e38]">
            <button
              onClick={() => onViewModeChange("wall")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "wall"
                  ? "bg-[#f8d777] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Wall / Corkboard view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Wall</span>
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-[#f8d777] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="List view"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Add Note Button */}
          <Button
            size="sm"
            onClick={onAddClick}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] hover:from-[#d97706] hover:to-[#f59e0b] text-slate-950 font-bold text-xs gap-1.5 shadow-[0_4px_14px_rgba(245,158,11,0.3)] transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Note</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

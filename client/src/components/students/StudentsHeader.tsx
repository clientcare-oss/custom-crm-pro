import React, { useState } from "react";
import { Search, SlidersHorizontal, ArrowUpDown, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PlantOnBooks, CompassEmblem, BrassLantern } from "./CabinetOrnaments";

interface StudentsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOrder: "asc" | "desc";
  onSortChange: (order: "asc" | "desc") => void;
  onNewStudentClick: () => void;
  selectedPlanFilter: string;
  onPlanFilterChange: (plan: string) => void;
  selectedGradeFilter: string;
  onGradeFilterChange: (grade: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  className?: string;
}

export function StudentsHeader({
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortChange,
  onNewStudentClick,
  selectedPlanFilter,
  onPlanFilterChange,
  selectedGradeFilter,
  onGradeFilterChange,
  onResetFilters,
  hasActiveFilters,
  className,
}: StudentsHeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div
      className={cn(
        "relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2 px-2 sm:px-4",
        className
      )}
    >
      {/* ─── LEFT: Plant on Books + Compass Emblem + Title ─── */}
      <div className="flex items-center gap-3.5 relative z-10 shrink-0">
        {/* Plant resting on antique books */}
        <div className="hidden sm:block -mb-3 -mt-3">
          <PlantOnBooks className="w-18 h-18 sm:w-22 sm:h-22" />
        </div>

        {/* Waypoint Antique Brass Compass Emblem */}
        <CompassEmblem className="w-10 h-10 sm:w-11 sm:h-11" />

        {/* Title & Subtitle */}
        <div>
          <h1 className="font-serif text-2xl sm:text-[32px] font-bold tracking-tight text-white leading-none">
            Students
          </h1>
          <p className="text-xs sm:text-[13px] text-[#7B91B0] mt-1 font-sans">
            All student cases and workspaces
          </p>
        </div>
      </div>

      {/* ─── CENTER: Long Dark Search Field ─── */}
      <div className="flex-1 max-w-xl mx-0 lg:mx-4 z-10">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-[#D8B478] pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search students, schools, or keywords..."
            className={cn(
              "w-full h-10.5 pl-10 pr-9 rounded-xl text-xs sm:text-sm text-[#F0DFC5] placeholder:text-[#64748B]",
              "bg-[#030914] border border-[#6E5023]/60 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]",
              "focus:border-[#E9BA6B] focus:ring-1 focus:ring-[#E9BA6B]/50 transition-all"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 p-1 rounded hover:bg-[#B88943]/20 text-[#7B8EA7] hover:text-[#F0DFC5] cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── RIGHT: Filters, Sort, New Student, and Brass Lantern ─── */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap z-10">
        {/* Filters Popover */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-10 px-3.5 rounded-xl text-xs font-semibold gap-1.5 transition-all cursor-pointer",
                "bg-[#07162B] border-[#8A6731]/80 text-[#F0DFC5] hover:bg-[#0D2444] hover:text-[#F7D287]",
                hasActiveFilters && "border-[#E9BA6B] text-[#E9BA6B] shadow-[0_0_10px_rgba(233,186,107,0.3)]"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D8B478]" />
              <span>Filters</span>
              <span className="text-[10px] text-[#A87938]">▾</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E9BA6B] ml-0.5" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 bg-[#0A1729] border border-[#B88943]/40 text-[#F0DFC5] shadow-2xl rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#B88943]/20">
              <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#E9BA6B]">Filter Records</span>
              {hasActiveFilters && (
                <button
                  onClick={onResetFilters}
                  className="text-[11px] text-[#E9BA6B] hover:underline cursor-pointer"
                >
                  Reset all
                </button>
              )}
            </div>

            {/* Plan Filter */}
            <div className="space-y-1">
              <label className="text-[11px] text-[#7B8EA7] font-semibold uppercase">Plan Type</label>
              <select
                value={selectedPlanFilter}
                onChange={(e) => onPlanFilterChange(e.target.value)}
                className="w-full text-xs rounded-lg bg-[#050E1C] border border-[#B88943]/30 text-[#F0DFC5] p-2 focus:border-[#E9BA6B] outline-none"
              >
                <option value="ALL">All Plans</option>
                <option value="IEP">IEP</option>
                <option value="504">504 Plan</option>
                <option value="Evaluation">Pending Evaluation</option>
              </select>
            </div>

            {/* Grade Filter */}
            <div className="space-y-1">
              <label className="text-[11px] text-[#7B8EA7] font-semibold uppercase">Grade Level</label>
              <select
                value={selectedGradeFilter}
                onChange={(e) => onGradeFilterChange(e.target.value)}
                className="w-full text-xs rounded-lg bg-[#050E1C] border border-[#B88943]/30 text-[#F0DFC5] p-2 focus:border-[#E9BA6B] outline-none"
              >
                <option value="ALL">All Grades</option>
                <option value="Elementary">Elementary (K-5)</option>
                <option value="Middle">Middle School (6-8)</option>
                <option value="High">High School (9-12)</option>
              </select>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort: Name A–Z Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3.5 rounded-xl text-xs font-semibold gap-1.5 bg-[#07162B] border-[#8A6731]/80 text-[#F0DFC5] hover:bg-[#0D2444] hover:text-[#F7D287] transition-all cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#D8B478]" />
              <span>Sort: Name {sortOrder === "asc" ? "A–Z" : "Z–A"}</span>
              <span className="text-[10px] text-[#A87938]">▾</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#0A1729] border border-[#B88943]/40 text-[#F0DFC5] shadow-2xl rounded-xl">
            <DropdownMenuItem
              onClick={() => onSortChange("asc")}
              className={cn("cursor-pointer text-xs", sortOrder === "asc" && "text-[#E9BA6B] font-bold")}
            >
              Name A–Z
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortChange("desc")}
              className={cn("cursor-pointer text-xs", sortOrder === "desc" && "text-[#E9BA6B] font-bold")}
            >
              Name Z–A
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* New Student: Radiant Polished Gold Button */}
        <Button
          onClick={onNewStudentClick}
          size="sm"
          className={cn(
            "h-10 px-4 rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-[0_4px_14px_rgba(233,186,107,0.4)] transition-all select-none",
            "bg-gradient-to-b from-[#FCE09E] via-[#E8B55F] to-[#B98132] text-[#1A1208]",
            "hover:from-[#FFF1D1] hover:to-[#D29D4D] hover:shadow-[0_6px_20px_rgba(233,186,107,0.6)]",
            "border border-[#FFE8B8] active:scale-95"
          )}
        >
          <Plus className="w-4 h-4 text-[#1A1208] stroke-[2.8]" />
          <span>New Student</span>
        </Button>

        {/* Hanging Brass Nautical Lantern with Trailing Ivy */}
        <div className="hidden lg:block -mt-5 -mb-5 pl-1 shrink-0">
          <BrassLantern className="w-18 h-22 xl:w-22 xl:h-26" />
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { SlidersHorizontal, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface StudentsHeaderProps {
  sortOrder?: "asc" | "desc";
  onSortChange?: (order: "asc" | "desc") => void;
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
  sortOrder = "asc",
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
        "relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 sm:px-2 py-1",
        className
      )}
    >
      {/* ─── 1. LEFT: Students Title ─── */}
      <div className="flex items-center gap-3 relative z-10 shrink-0">
        {/* Title & Subtitle */}
        <div className="select-none pr-1">
          <h1 className="font-serif text-[26px] sm:text-[32px] md:text-[34px] font-bold text-white tracking-wide leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
            Student Workspaces
          </h1>
          <p className="font-serif text-[13px] sm:text-sm text-[#94ADC9] mt-1.5 leading-none tracking-normal drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Select a student to enter their advocacy workspace.
          </p>
        </div>
      </div>

      {/* ─── 2. RIGHT: Filters and + New Student ─── */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap z-10">
        {/* Filters Popover */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-10 sm:h-11 px-3.5 sm:px-4 rounded-lg text-xs sm:text-sm font-medium gap-2 transition-all cursor-pointer select-none",
                "bg-gradient-to-b from-[#14233C]/95 to-[#0A1322]/98 border border-[#283C5C] text-[#C4D7ED]",
                "hover:bg-[#1A2E4E] hover:border-[#3D5B8A] hover:text-white",
                hasActiveFilters && "border-[#E9BA6B] text-[#E9BA6B] shadow-[0_0_10px_rgba(233,186,107,0.35)]"
              )}
            >
              <SlidersHorizontal className="w-4 h-4 text-[#C4D7ED]" />
              <span>Filters</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8EA6C6]" />
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#E9BA6B] ml-0.5" />
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

        {/* New Student: Solid Radiant Brushed Brass Button */}
        <Button
          onClick={onNewStudentClick}
          size="sm"
          className={cn(
            "h-10 sm:h-11 px-4 sm:px-4.5 rounded-lg text-xs sm:text-sm font-serif font-bold tracking-wide gap-2 cursor-pointer select-none",
            "bg-gradient-to-b from-[#F2CD80] via-[#DCA348] to-[#AC7628] text-[#1F1406]",
            "border border-[#FFE8A3]/70 shadow-[0_2px_10px_rgba(217,162,69,0.38),inset_0_1px_1px_rgba(255,255,255,0.7)]",
            "hover:brightness-105 active:scale-[0.98] transition-all"
          )}
        >
          <Plus className="w-4 h-4 stroke-[2.8] text-[#1F1406]" />
          <span>New Student</span>
        </Button>
      </div>
    </div>
  );
}


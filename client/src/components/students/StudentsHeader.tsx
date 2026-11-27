import React, { useState } from "react";
import {
  SlidersHorizontal,
  UserPlus,
  ChevronDown,
  Tag,
  Search,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CompanyTag } from "./StudentTagsManager";
import { BrassAlphabetRail } from "./BrassAlphabetRail";
import "@/styles/studentsHeaderRealistic.css";

interface StudentsHeaderProps {
  sortOrder?: "asc" | "desc";
  onSortChange?: (order: "asc" | "desc") => void;
  sortBy?: "name" | "tags";
  onSortByChange?: (sortBy: "name" | "tags") => void;
  onNewStudentClick: () => void;
  onQuickSample?: () => void;
  isCreatingSample?: boolean;
  selectedPlanFilter: string;
  onPlanFilterChange: (plan: string) => void;
  selectedGradeFilter: string;
  onGradeFilterChange: (grade: string) => void;
  selectedTagFilter?: string;
  onTagFilterChange?: (tag: string) => void;
  companyTags?: CompanyTag[];
  onOpenManageTags?: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  viewMode?: "cards" | "list";
  onViewModeChange?: (mode: "cards" | "list") => void;
  selectedLetter?: string;
  onSelectLetter?: (letter: string) => void;
  letterCounts?: Record<string, number>;
  className?: string;
}

/**
 * 3-Slice Photorealistic Weathered Metal Nameplate Background
 * Keeps all 4 hammered corner rivets perfectly circular at any width.
 */
function ThreeSliceMetalBg({ variant }: { variant: "brass" | "steel" | "pill" }) {
  return (
    <span className="absolute inset-0 flex items-stretch pointer-events-none select-none" aria-hidden="true">
      <img
        src={`/assets/students/hw/${variant}-left.png`}
        alt=""
        className="h-full w-auto shrink-0 block"
        draggable={false}
      />
      <span
        className="flex-1 h-full min-w-0 block"
        style={{
          backgroundImage: `url('/assets/students/hw/${variant}-mid.png')`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      />
      <img
        src={`/assets/students/hw/${variant}-right.png`}
        alt=""
        className="h-full w-auto shrink-0 block"
        draggable={false}
      />
    </span>
  );
}

export function StudentsHeader({
  sortBy = "name",
  onSortByChange,
  onNewStudentClick,
  selectedPlanFilter,
  onPlanFilterChange,
  selectedGradeFilter,
  onGradeFilterChange,
  selectedTagFilter = "ALL",
  onTagFilterChange,
  companyTags = [],
  onOpenManageTags,
  onResetFilters,
  hasActiveFilters,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  selectedLetter,
  onSelectLetter,
  letterCounts,
  className,
}: StudentsHeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className={cn("relative z-10 w-full flex flex-col gap-3", className)}>
      {/* ─── ROW 1: Forged 3D Cast-Brass Masthead (Left) + Photorealistic Metal Plaques (Right) ─── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        {/* Left: Real Forged 3D Antique-Brass Title, Subtitle & Sculpted Compass-Star Spear Divider */}
        <div className="select-none min-w-0 flex-1 -mt-0.5">
          <h1 className="sr-only">Student Workspaces</h1>
          <p className="sr-only">
            Select a student to enter their advocacy workspace
          </p>
          <img
            src="/assets/students/hw/students-masthead-brass.png"
            alt="Student Workspaces — Select a student to enter their advocacy workspace"
            className="wp-stu-masthead-img"
            draggable={false}
          />
        </div>

        {/* Right: Riveted Blackened-Steel "Filters" Plaque + Riveted Antique-Brass "New Student" Plaque */}
        <div className="flex items-center gap-3 shrink-0 md:pt-2.5">
          {/* Filters Popover */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-active={hasActiveFilters ? "true" : "false"}
                className="wp-stu-hw-btn h-[46px] px-5 min-w-[144px] focus:outline-none"
              >
                <ThreeSliceMetalBg variant="steel" />
                <span className="relative z-10 inline-flex items-center gap-2.5 px-1">
                  <SlidersHorizontal
                    className="w-[16px] h-[16px] text-[#E6CB92] shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    strokeWidth={2}
                  />
                  <span className="h-[22px] w-[1px] bg-gradient-to-b from-transparent via-[#B88943]/55 to-transparent" />
                  <span className="font-serif font-semibold text-[15px] tracking-[0.01em] text-[#F2E5C7] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    Filters
                  </span>
                  <ChevronDown
                    className="w-4 h-4 text-[#E2C282] -ml-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    strokeWidth={2.2}
                  />
                  {hasActiveFilters && (
                    <span
                      className="w-2 h-2 rounded-full bg-[#F5CF76] shadow-[0_0_6px_rgba(245,207,118,0.95)]"
                      aria-label="Active filters"
                    />
                  )}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-64 p-4 bg-[#0A1729] border border-[#B88943]/55 text-[#F0DFC5] shadow-2xl rounded-xl space-y-3 z-50"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#B88943]/25">
                <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#E9BA6B]">
                  Filter Records
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="text-[11px] text-[#E9BA6B] hover:underline cursor-pointer"
                  >
                    Reset all
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8DA2BE] font-semibold uppercase">
                  Plan Type
                </label>
                <select
                  value={selectedPlanFilter}
                  onChange={(e) => onPlanFilterChange(e.target.value)}
                  className="w-full text-xs rounded-lg bg-[#050E1C] border border-[#B88943]/35 text-[#F0DFC5] p-2 focus:border-[#E9BA6B] outline-none"
                >
                  <option value="ALL">All Plans</option>
                  <option value="IEP">IEP</option>
                  <option value="504">504 Plan</option>
                  <option value="Evaluation">Pending Evaluation</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8DA2BE] font-semibold uppercase">
                  Grade Level
                </label>
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => onGradeFilterChange(e.target.value)}
                  className="w-full text-xs rounded-lg bg-[#050E1C] border border-[#B88943]/35 text-[#F0DFC5] p-2 focus:border-[#E9BA6B] outline-none"
                >
                  <option value="ALL">All Grades</option>
                  <option value="Elementary">Elementary (K-5)</option>
                  <option value="Middle">Middle School (6-8)</option>
                  <option value="High">High School (9-12)</option>
                </select>
              </div>

              {onTagFilterChange && (
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8DA2BE] font-semibold uppercase">
                    Tag Filter
                  </label>
                  <select
                    value={selectedTagFilter}
                    onChange={(e) => onTagFilterChange(e.target.value)}
                    className="w-full text-xs rounded-lg bg-[#050E1C] border border-[#B88943]/35 text-[#F0DFC5] p-2 focus:border-[#E9BA6B] outline-none"
                  >
                    <option value="ALL">All Tags</option>
                    {companyTags.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {onSortByChange && (
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8DA2BE] font-semibold uppercase">
                    Order By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => onSortByChange(e.target.value as "name" | "tags")}
                    className="w-full text-xs rounded-lg bg-[#050E1C] border border-[#B88943]/35 text-[#F0DFC5] p-2 focus:border-[#E9BA6B] outline-none"
                  >
                    <option value="name">Student Name (A–Z)</option>
                    <option value="tags">Tags (Grouped by Tag)</option>
                  </select>
                </div>
              )}

              {onOpenManageTags && (
                <div className="pt-1 border-t border-[#B88943]/20">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterOpen(false);
                      onOpenManageTags();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-serif font-bold text-[#E9BA6B] bg-[#122642] hover:bg-[#193358] border border-[#B88943]/40 transition-colors cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Manage Company Tags</span>
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Riveted Antique Brushed-Brass "New Student" Plaque */}
          <button
            type="button"
            onClick={onNewStudentClick}
            className="wp-stu-hw-btn h-[46px] px-5 min-w-[162px] focus:outline-none"
          >
            <ThreeSliceMetalBg variant="brass" />
            <span className="relative z-10 inline-flex items-center gap-2 px-1">
              <UserPlus
                className="w-[17px] h-[17px] text-[#1A1004] stroke-[2.3] shrink-0"
              />
              <span className="font-serif font-bold text-[15px] tracking-[0.01em] text-[#170E03] drop-shadow-[0_1px_0_rgba(255,244,214,0.5)]">
                New Student
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* ─── ROW 2: Photorealistic Tubular Bronze Search Pill (Left) + View Capsule (Right) ─── */}
      {(onSearchChange || onViewModeChange) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full">
          {onSearchChange && (
            <div className="wp-stu-hw-pill flex-1 min-w-0 h-[46px]">
              <ThreeSliceMetalBg variant="pill" />
              <div className="relative z-10 flex items-center w-full h-full px-5">
                <Search
                  className="w-[18px] h-[18px] text-[#CFA96A] mr-2.5 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  strokeWidth={2.1}
                />
                <input
                  type="text"
                  value={searchQuery ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search students or tags..."
                  className="w-full h-full bg-transparent border-none outline-none text-[14.5px] font-serif text-[#F2E4C8] placeholder:text-[#C9B99B]/85 pr-7"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    aria-label="Clear search"
                    className="absolute right-4 p-1 rounded-full text-[#C9B99B] hover:text-[#FFF4D6] hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {onViewModeChange && viewMode && (
            <div className="wp-stu-hw-pill shrink-0 h-[46px] self-start sm:self-auto">
              <ThreeSliceMetalBg variant="pill" />
              <div className="relative z-10 flex items-center h-full gap-1.5 pl-4 pr-2.5">
                <span className="font-serif text-[14px] text-[#DFC89D] pr-1 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                  View:
                </span>

                {/* Cards Miniature Riveted Metal Plaque */}
                <button
                  type="button"
                  onClick={() => onViewModeChange("cards")}
                  title="Cards Filing View"
                  className="wp-stu-hw-btn h-[34px] px-4 focus:outline-none"
                >
                  <ThreeSliceMetalBg variant={viewMode === "cards" ? "brass" : "steel"} />
                  <span className="relative z-10 inline-flex items-center gap-1.5 text-[13px] font-serif font-bold">
                    <LayoutGrid
                      className={cn(
                        "w-[14px] h-[14px] shrink-0",
                        viewMode === "cards" ? "text-[#170E03] stroke-[2.3]" : "text-[#E6CA8E] stroke-[2]"
                      )}
                    />
                    <span
                      className={
                        viewMode === "cards"
                          ? "text-[#170E03] drop-shadow-[0_1px_0_rgba(255,244,212,0.5)]"
                          : "text-[#F0E2C4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                      }
                    >
                      Cards
                    </span>
                  </span>
                </button>

                {/* List Miniature Riveted Metal Plaque */}
                <button
                  type="button"
                  onClick={() => onViewModeChange("list")}
                  title="Compact Registry List View"
                  className="wp-stu-hw-btn h-[34px] px-4 focus:outline-none"
                >
                  <ThreeSliceMetalBg variant={viewMode === "list" ? "brass" : "steel"} />
                  <span className="relative z-10 inline-flex items-center gap-1.5 text-[13px] font-serif font-bold">
                    <List
                      className={cn(
                        "w-[15px] h-[15px] shrink-0",
                        viewMode === "list" ? "text-[#170E03] stroke-[2.5]" : "text-[#E6CA8E] stroke-[2.1]"
                      )}
                    />
                    <span
                      className={
                        viewMode === "list"
                          ? "text-[#170E03] drop-shadow-[0_1px_0_rgba(255,244,212,0.5)]"
                          : "text-[#F0E2C4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                      }
                    >
                      List
                    </span>
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ROW 3: Photorealistic Mechanical Brass A–Z Slide-Rule Bar ─── */}
      {onSelectLetter && selectedLetter !== undefined && (
        <div className="w-full pt-0.5">
          <BrassAlphabetRail
            selectedLetter={selectedLetter}
            onSelectLetter={onSelectLetter}
            letterCounts={letterCounts}
          />
        </div>
      )}
    </div>
  );
}

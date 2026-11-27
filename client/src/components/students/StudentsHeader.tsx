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
  // Integrated realistic console controls
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  viewMode?: "cards" | "list";
  onViewModeChange?: (mode: "cards" | "list") => void;
  selectedLetter?: string;
  onSelectLetter?: (letter: string) => void;
  letterCounts?: Record<string, number>;
  className?: string;
}

/** 4 hammered corner rivets for hardware plaques */
function PlaqueRivets({ dark = false }: { dark?: boolean }) {
  const cls = dark ? "wp-stu-rivet wp-stu-rivet-dark" : "wp-stu-rivet";
  return (
    <>
      <span className={`${cls} top-[5px] left-[5px]`} aria-hidden="true" />
      <span className={`${cls} top-[5px] right-[5px]`} aria-hidden="true" />
      <span className={`${cls} bottom-[5px] left-[5px]`} aria-hidden="true" />
      <span className={`${cls} bottom-[5px] right-[5px]`} aria-hidden="true" />
    </>
  );
}

/** Tapered antique brass divider rule with centered 8-point compass star */
function BrassStarDivider() {
  return (
    <div className="flex items-center gap-1.5 mt-2 w-full max-w-[490px]" aria-hidden="true">
      <div
        className="h-[1.5px] flex-1"
        style={{
          background:
            "linear-gradient(90deg, rgba(214,170,88,0) 0%, rgba(214,170,88,0.65) 45%, #F6DC97 100%)",
        }}
      />
      <span className="w-[4px] h-[4px] rounded-full bg-[#E8C171] shadow-[0_0_4px_rgba(246,220,151,0.75)]" />
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[24px] h-[24px] shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
      >
        <defs>
          <linearGradient id="wp-star-gold" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF6D6" />
            <stop offset="45%" stopColor="#E4BA66" />
            <stop offset="100%" stopColor="#8C5F1D" />
          </linearGradient>
        </defs>
        {/* Diagonal secondary points */}
        <path d="M18 18L10 10L16 14.5Z" fill="url(#wp-star-gold)" />
        <path d="M18 18L26 10L21.5 16Z" fill="url(#wp-star-gold)" />
        <path d="M18 18L26 26L20 21.5Z" fill="url(#wp-star-gold)" />
        <path d="M18 18L10 26L14.5 20Z" fill="url(#wp-star-gold)" />
        {/* Cardinal primary points */}
        <path d="M18 2L20.8 15.2L34 18L20.8 20.8L18 34L15.2 20.8L2 18L15.2 15.2L18 2Z" fill="url(#wp-star-gold)" />
        <circle cx="18" cy="18" r="2.2" fill="#FFF8E2" />
      </svg>
      <span className="w-[4px] h-[4px] rounded-full bg-[#E8C171] shadow-[0_0_4px_rgba(246,220,151,0.75)]" />
      <div
        className="h-[1.5px] flex-1"
        style={{
          background:
            "linear-gradient(90deg, #F6DC97 0%, rgba(214,170,88,0.65) 55%, rgba(214,170,88,0) 100%)",
        }}
      />
    </div>
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
      {/* ─── ROW 1: Embossed Gold Masthead (Left) + Riveted Hardware Buttons (Right) ─── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        {/* Left: Embossed Gold Title + Uppercase Subtitle + Brass Compass Star Divider */}
        <div className="select-none min-w-0">
          <h1 className="wp-stu-title text-[28px] sm:text-[34px] lg:text-[40px]">
            Student Workspaces
          </h1>
          <p className="wp-stu-subtitle text-[10px] sm:text-[11px] lg:text-[11.5px] mt-1">
            SELECT A STUDENT TO ENTER THEIR ADVOCACY WORKSPACE
          </p>
          <BrassStarDivider />
        </div>

        {/* Right: Riveted Dark "Filters" Plaque + Riveted Solid Brass "New Student" Plaque */}
        <div className="flex items-center gap-3 shrink-0 md:pt-2">
          {/* Filters Popover */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-active={hasActiveFilters ? "true" : "false"}
                className="wp-stu-dark-plaque h-[44px] px-4 inline-flex items-center gap-2.5 cursor-pointer select-none focus:outline-none"
              >
                <PlaqueRivets dark />
                <SlidersHorizontal className="w-[16px] h-[16px] text-[#E6C98A] shrink-0" strokeWidth={2} />
                <span className="h-[22px] w-[1px] bg-gradient-to-b from-transparent via-[#B88943]/55 to-transparent" />
                <span className="font-serif font-semibold text-[14.5px] tracking-[0.01em] text-[#F4E7C8]">
                  Filters
                </span>
                <ChevronDown className="w-4 h-4 text-[#DFC07F] -ml-0.5" strokeWidth={2.2} />
                {hasActiveFilters && (
                  <span
                    className="w-2 h-2 rounded-full bg-[#F5CF76] shadow-[0_0_6px_rgba(245,207,118,0.9)]"
                    aria-label="Active filters"
                  />
                )}
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

              {/* Plan Filter */}
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

              {/* Grade Filter */}
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

              {/* Tag Filter */}
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

              {/* Order By */}
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

          {/* Riveted Solid Brushed Brass "New Student" Plaque */}
          <button
            type="button"
            onClick={onNewStudentClick}
            className="wp-stu-brass-plaque h-[44px] px-5 inline-flex items-center gap-2 cursor-pointer select-none focus:outline-none"
          >
            <PlaqueRivets />
            <UserPlus className="w-[17px] h-[17px] text-[#1C1104] stroke-[2.3] shrink-0" />
            <span className="font-serif font-bold text-[14.5px] tracking-[0.015em] text-[#170E03]">
              New Student
            </span>
          </button>
        </div>
      </div>

      {/* ─── ROW 2: Tubular Brass Search Pill (Left) + Riveted Cards / List Switcher (Right) ─── */}
      {(onSearchChange || onViewModeChange) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {onSearchChange && (
            <div className="wp-stu-search-bezel flex-1 min-w-0">
              <div className="wp-stu-search-well">
                <Search
                  className="w-[18px] h-[18px] text-[#D8B268] ml-4 mr-2.5 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                  strokeWidth={2.1}
                />
                <input
                  type="text"
                  value={searchQuery ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search students or tags..."
                  className="w-full h-full bg-transparent border-none outline-none text-[14px] font-serif text-[#F3E5C8] placeholder:text-[#C8B796]/80 pr-9"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    aria-label="Clear search"
                    className="absolute right-3 p-1 rounded-full text-[#C8B796] hover:text-[#FFF3D1] hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {onViewModeChange && viewMode && (
            <div className="wp-stu-view-bezel shrink-0 self-start sm:self-auto">
              <div className="wp-stu-view-inner">
                <span className="font-serif text-[13.5px] text-[#E6CE9E] pr-1.5 select-none">
                  View:
                </span>

                {/* Cards View Plaque */}
                <button
                  type="button"
                  onClick={() => onViewModeChange("cards")}
                  title="Cards Filing View"
                  className={cn(
                    "relative h-[32px] px-3.5 rounded-[7px] inline-flex items-center gap-1.5 text-[13px] font-serif font-semibold cursor-pointer select-none transition-all focus:outline-none",
                    viewMode === "cards"
                      ? "wp-stu-brass-plaque !rounded-[7px] !shadow-[0_2px_6px_rgba(0,0,0,0.75)]"
                      : "wp-stu-dark-plaque !rounded-[7px] !shadow-[0_2px_5px_rgba(0,0,0,0.7)]"
                  )}
                >
                  <PlaqueRivets dark={viewMode !== "cards"} />
                  <LayoutGrid
                    className={cn(
                      "w-[14px] h-[14px] shrink-0",
                      viewMode === "cards" ? "text-[#191004] stroke-[2.3]" : "text-[#E6CA8E] stroke-[2]"
                    )}
                  />
                  <span>Cards</span>
                </button>

                {/* List View Plaque */}
                <button
                  type="button"
                  onClick={() => onViewModeChange("list")}
                  title="Compact Registry List View"
                  className={cn(
                    "relative h-[32px] px-3.5 rounded-[7px] inline-flex items-center gap-1.5 text-[13px] font-serif font-semibold cursor-pointer select-none transition-all focus:outline-none",
                    viewMode === "list"
                      ? "wp-stu-brass-plaque !rounded-[7px] !shadow-[0_2px_6px_rgba(0,0,0,0.75)]"
                      : "wp-stu-dark-plaque !rounded-[7px] !shadow-[0_2px_5px_rgba(0,0,0,0.7)]"
                  )}
                >
                  <PlaqueRivets dark={viewMode !== "list"} />
                  <List
                    className={cn(
                      "w-[15px] h-[15px] shrink-0",
                      viewMode === "list" ? "text-[#191004] stroke-[2.5]" : "text-[#E6CA8E] stroke-[2.1]"
                    )}
                  />
                  <span>List</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ROW 3: Mechanical Brass A–Z Slide-Rule Index Bar ─── */}
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

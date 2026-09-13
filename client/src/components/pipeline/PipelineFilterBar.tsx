import React from "react";
import { cn } from "@/lib/utils";
import { Filter, X, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { PipelineFilters } from "./types";

interface PipelineFilterBarProps {
  filters: PipelineFilters;
  onChangeFilters: (filters: PipelineFilters) => void;
  onClearFilters: () => void;
  matchingCount: number;
}

export function PipelineFilterBar({
  filters,
  onChangeFilters,
  onClearFilters,
  matchingCount,
}: PipelineFilterBarProps) {
  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== "" && v !== false
  );

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap py-2 border-y border-[#0D366B]/40">
      {/* Left Filters Group */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-8 h-8 rounded-lg bg-[#071F42] border border-[#0E3A73] flex items-center justify-center text-sky-400 shrink-0">
          <Filter className="h-4 w-4" />
        </div>

        {/* Plan Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer",
                filters.planTier
                  ? "bg-[#0A2954] border-[#F5B544]/60 text-[#F5B544]"
                  : "bg-[#071F42] border-[#0E3A73] text-slate-300 hover:text-white hover:bg-[#0A2954]"
              )}
            >
              <span>{filters.planTier ? `Plan: ${filters.planTier}` : "Plan"}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-[#07162B] border-[#0E274D] text-slate-200 shadow-xl">
            <DropdownMenuItem onClick={() => onChangeFilters({ ...filters, planTier: undefined })}>
              All Plans
            </DropdownMenuItem>
            {["$55", "$105", "Scholarship", "Pay Per Use", "Tools Only"].map((plan) => (
              <DropdownMenuItem
                key={plan}
                onClick={() => onChangeFilters({ ...filters, planTier: plan })}
                className="flex items-center justify-between"
              >
                <span>{plan}</span>
                {filters.planTier === plan && <Check className="h-3.5 w-3.5 text-[#F5B544]" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Advocate Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer",
                filters.advocate
                  ? "bg-[#0A2954] border-[#F5B544]/60 text-[#F5B544]"
                  : "bg-[#071F42] border-[#0E3A73] text-slate-300 hover:text-white hover:bg-[#0A2954]"
              )}
            >
              <span>{filters.advocate ? `Advocate: ${filters.advocate}` : "Advocate"}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-[#07162B] border-[#0E274D] text-slate-200 shadow-xl">
            <DropdownMenuItem onClick={() => onChangeFilters({ ...filters, advocate: undefined })}>
              All Advocates
            </DropdownMenuItem>
            {["Byron Honea", "Erin Smith", "Maya Singh", "Kevin Liu", "Daniel Torres", "Jordan Lee"].map(
              (adv) => (
                <DropdownMenuItem
                  key={adv}
                  onClick={() => onChangeFilters({ ...filters, advocate: adv })}
                  className="flex items-center justify-between"
                >
                  <span>{adv}</span>
                  {filters.advocate === adv && <Check className="h-3.5 w-3.5 text-[#F5B544]" />}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* School District Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer",
                filters.district
                  ? "bg-[#0A2954] border-[#F5B544]/60 text-[#F5B544]"
                  : "bg-[#071F42] border-[#0E3A73] text-slate-300 hover:text-white hover:bg-[#0A2954]"
              )}
            >
              <span>{filters.district ? `District: ${filters.district}` : "School District"}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-[#07162B] border-[#0E274D] text-slate-200 shadow-xl">
            <DropdownMenuItem onClick={() => onChangeFilters({ ...filters, district: undefined })}>
              All Districts
            </DropdownMenuItem>
            {["Fulton County", "Cobb County", "Gwinnett County", "DeKalb County", "Atlanta Public Schools"].map(
              (dist) => (
                <DropdownMenuItem
                  key={dist}
                  onClick={() => onChangeFilters({ ...filters, district: dist })}
                  className="flex items-center justify-between"
                >
                  <span>{dist}</span>
                  {filters.district === dist && <Check className="h-3.5 w-3.5 text-[#F5B544]" />}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Case Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer",
                filters.caseType
                  ? "bg-[#0A2954] border-[#F5B544]/60 text-[#F5B544]"
                  : "bg-[#071F42] border-[#0E3A73] text-slate-300 hover:text-white hover:bg-[#0A2954]"
              )}
            >
              <span>{filters.caseType ? `Type: ${filters.caseType}` : "Case Type"}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-[#07162B] border-[#0E274D] text-slate-200 shadow-xl">
            <DropdownMenuItem onClick={() => onChangeFilters({ ...filters, caseType: undefined })}>
              All Case Types
            </DropdownMenuItem>
            {["IEP", "504", "Evaluation", "State Complaint", "No IEP/504 Yet"].map((type) => (
              <DropdownMenuItem
                key={type}
                onClick={() => onChangeFilters({ ...filters, caseType: type })}
                className="flex items-center justify-between"
              >
                <span>{type}</span>
                {filters.caseType === type && <Check className="h-3.5 w-3.5 text-[#F5B544]" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Meeting Date Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer",
                filters.meetingDate
                  ? "bg-[#0A2954] border-[#F5B544]/60 text-[#F5B544]"
                  : "bg-[#071F42] border-[#0E3A73] text-slate-300 hover:text-white hover:bg-[#0A2954]"
              )}
            >
              <span>{filters.meetingDate ? `Meeting: ${filters.meetingDate}` : "Meeting Date"}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-[#07162B] border-[#0E274D] text-slate-200 shadow-xl">
            <DropdownMenuItem onClick={() => onChangeFilters({ ...filters, meetingDate: undefined })}>
              All Meeting Times
            </DropdownMenuItem>
            {["This Week", "Next 30 Days", "Has Scheduled Meeting", "No Meeting"].map((time) => (
              <DropdownMenuItem
                key={time}
                onClick={() => onChangeFilters({ ...filters, meetingDate: time })}
                className="flex items-center justify-between"
              >
                <span>{time}</span>
                {filters.meetingDate === time && <Check className="h-3.5 w-3.5 text-[#F5B544]" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Needs Attention Filter Toggle */}
        <button
          type="button"
          onClick={() =>
            onChangeFilters({
              ...filters,
              needsAttentionOnly: !filters.needsAttentionOnly,
            })
          }
          className={cn(
            "h-8 px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer",
            filters.needsAttentionOnly
              ? "bg-rose-950/60 border-rose-500/80 text-rose-300"
              : "bg-[#071F42] border-[#0E3A73] text-slate-300 hover:text-white hover:bg-[#0A2954]"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          <span>Needs Attention</span>
        </button>
      </div>

      {/* Right Stats & Clear */}
      <div className="flex items-center gap-3">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs text-[#F5B544] hover:text-[#F5B544]/80 underline cursor-pointer inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            <span>Clear filters</span>
          </button>
        )}
        <span className="text-xs font-semibold text-slate-300 bg-[#071F42] border border-[#0E3A73] px-2.5 py-1 rounded-lg">
          {matchingCount} {matchingCount === 1 ? "client" : "clients"}
        </span>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Filter, RotateCcw } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { PipelineFilters } from "./types";

interface FilterPopoverProps {
  filters: PipelineFilters;
  onChangeFilters: (filters: PipelineFilters) => void;
  onClearFilters: () => void;
  matchingCount: number;
}

export function FilterPopover({
  filters,
  onChangeFilters,
  onClearFilters,
  matchingCount,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<PipelineFilters>(filters);

  // Sync draft with current filters whenever popover opens
  useEffect(() => {
    if (open) {
      setDraftFilters(filters);
    }
  }, [open, filters]);

  // Count active non-empty filters
  const activeFilterCount = Object.entries(filters).filter(([_, v]) => {
    return v !== undefined && v !== "" && v !== false;
  }).length;

  const handleApply = () => {
    onChangeFilters(draftFilters);
    setOpen(false);
  };

  const handleClear = () => {
    setDraftFilters({});
    onClearFilters();
    setOpen(false);
  };

  const planOptions = ["$55", "$105", "Scholarship", "Pay Per Use", "Tools Only"];
  const advocateOptions = ["Byron Honea", "Erin Smith", "Maya Singh", "Kevin Liu", "Daniel Torres", "Jordan Lee"];
  const districtOptions = ["Fulton County", "Cobb County", "Gwinnett County", "DeKalb County", "Atlanta Public Schools"];
  const caseTypeOptions = ["IEP", "504", "Evaluation", "State Complaint", "Records"];
  const accountStatusOptions = ["Active", "Onboarding", "Renewal Needed", "On Hold", "Closed"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-8 px-3 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all duration-150 cursor-pointer shrink-0",
            activeFilterCount > 0
              ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394]/60 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
              : "bg-[#020A17] hover:bg-[#07162B] border-[#3A2C18] hover:border-[#C5A059]/60 text-[#D8C7A5] hover:text-[#FFF4D4] shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
          )}
        >
          <Filter className={cn("h-3.5 w-3.5", activeFilterCount > 0 ? "text-[#07162B]" : "text-[#C5A059]")} />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#07162B] text-[#FFE394] border border-[#FFE394]/40">
              {activeFilterCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-4 bg-[#05142B]/95 border-[#3A2C18] text-[#FFF4D4] shadow-[0_12px_36px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-2xl space-y-4 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#3A2C18]">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#C5A059]" />
            <h4 className="text-sm font-bold font-serif text-[#FFF4D4]">Filter Clients</h4>
          </div>
          <span className="text-xs text-[#C6B697] font-medium">
            {matchingCount} matching
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {/* 1. Plan Tier */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#C6B697] uppercase tracking-wider">
              Plan Tier
            </label>
            <div className="flex flex-wrap gap-1.5">
              {planOptions.map((plan) => {
                const isSelected = draftFilters.planTier === plan;
                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        planTier: isSelected ? undefined : plan,
                      }))
                    }
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                      isSelected
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394]/60 shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                        : "bg-[#020A17]/80 hover:bg-[#07162B] border-[#3A2C18]/80 text-[#D8C7A5] hover:text-[#FFF4D4]"
                    )}
                  >
                    {plan}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Assigned Advocate */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#C6B697] uppercase tracking-wider">
              Assigned Advocate
            </label>
            <select
              value={draftFilters.advocate || ""}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  advocate: e.target.value || undefined,
                }))
              }
              className="w-full h-8 px-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs focus:outline-hidden focus:border-[#C5A059]"
            >
              <option value="">All Advocates</option>
              {advocateOptions.map((adv) => (
                <option key={adv} value={adv}>
                  {adv}
                </option>
              ))}
            </select>
          </div>

          {/* 3. School District */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#C6B697] uppercase tracking-wider">
              School District
            </label>
            <select
              value={draftFilters.district || ""}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  district: e.target.value || undefined,
                }))
              }
              className="w-full h-8 px-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs focus:outline-hidden focus:border-[#C5A059]"
            >
              <option value="">All Districts</option>
              {districtOptions.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Case Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#C6B697] uppercase tracking-wider">
              Case Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {caseTypeOptions.map((type) => {
                const isSelected = draftFilters.caseType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        caseType: isSelected ? undefined : type,
                      }))
                    }
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                      isSelected
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394]/60 shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                        : "bg-[#020A17]/80 hover:bg-[#07162B] border-[#3A2C18]/80 text-[#D8C7A5] hover:text-[#FFF4D4]"
                    )}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Account Status */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#C6B697] uppercase tracking-wider">
              Account Status
            </label>
            <select
              value={draftFilters.accountStatus || ""}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  accountStatus: e.target.value || undefined,
                }))
              }
              className="w-full h-8 px-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs focus:outline-hidden focus:border-[#C5A059]"
            >
              <option value="">All Account Statuses</option>
              {accountStatusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Needs Attention Toggle */}
          <div className="pt-2 border-t border-[#3A2C18]/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#FFF4D4]">Needs Attention Only</span>
              <p className="text-[10px] text-[#A69371]">Filter to flagged / urgent client records</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setDraftFilters((prev) => ({
                  ...prev,
                  needsAttentionOnly: !prev.needsAttentionOnly,
                }))
              }
              className={cn(
                "w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center border border-[#3A2C18]",
                draftFilters.needsAttentionOnly ? "bg-gradient-to-r from-[#DFBE77] to-[#C5A059] justify-end" : "bg-[#020A17] justify-start"
              )}
            >
              <span className="w-4 h-4 rounded-full bg-[#07162B] shadow-xs" />
            </button>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-[#3A2C18] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-[#A69371] hover:text-[#FFF4D4] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 px-3 text-xs border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 px-3.5 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-110 cursor-pointer"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Filter, X, Check, RotateCcw } from "lucide-react";
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
  const billingStatusOptions = ["Current", "Payment Failed", "Past Due", "Complimentary"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-8 px-3 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all duration-150 cursor-pointer shrink-0 shadow-xs",
            activeFilterCount > 0
              ? "bg-[#0A2954] border-[#F5B544] text-[#F5B544] shadow-[0_0_10px_rgba(245,181,68,0.2)]"
              : "bg-[#071F42] hover:bg-[#0A2954] border-[#0E3A73] text-slate-300 hover:text-white"
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#F5B544] text-[#07162B]">
              {activeFilterCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-4 bg-[#07162B] border-[#0E274D] text-slate-200 shadow-2xl rounded-2xl space-y-4 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#0D366B]/60">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#F5B544]" />
            <h4 className="text-sm font-bold text-white">Filter Clients</h4>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {matchingCount} matching
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {/* 1. Plan Tier */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
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
                        ? "bg-[#0A2954] border-[#F5B544] text-[#F5B544]"
                        : "bg-[#061833] border-[#0E3A73] text-slate-300 hover:text-white"
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
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
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
              className="w-full h-8 px-2.5 rounded-lg bg-[#061833] border border-[#0E3A73] text-slate-200 text-xs focus:outline-hidden focus:border-[#F5B544]"
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
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
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
              className="w-full h-8 px-2.5 rounded-lg bg-[#061833] border border-[#0E3A73] text-slate-200 text-xs focus:outline-hidden focus:border-[#F5B544]"
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
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
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
                        ? "bg-[#0A2954] border-[#F5B544] text-[#F5B544]"
                        : "bg-[#061833] border-[#0E3A73] text-slate-300 hover:text-white"
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
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
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
              className="w-full h-8 px-2.5 rounded-lg bg-[#061833] border border-[#0E3A73] text-slate-200 text-xs focus:outline-hidden focus:border-[#F5B544]"
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
          <div className="pt-2 border-t border-[#0D366B]/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white">Needs Attention Only</span>
              <p className="text-[10px] text-slate-400">Filter to flagged / urgent client records</p>
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
                "w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center",
                draftFilters.needsAttentionOnly ? "bg-[#F5B544] justify-end" : "bg-slate-700 justify-start"
              )}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-[#0D366B]/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 px-3 text-xs border-[#0E3A73] bg-[#061833] text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 px-3.5 text-xs font-bold bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 cursor-pointer"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

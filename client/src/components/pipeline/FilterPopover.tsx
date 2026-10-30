import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Filter, RotateCcw } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ADVOCATE_ROSTER, LOGICAL_STAGE_GROUPS } from "./pipelineDefaults";
import type { PipelineFilters, PipelineStageItem, LogicalStageGroup } from "./types";

interface FilterPopoverProps {
  filters: PipelineFilters;
  onChangeFilters: (filters: PipelineFilters) => void;
  onClearFilters: () => void;
  matchingCount: number;
  stages?: PipelineStageItem[];
}

export function FilterPopover({
  filters,
  onChangeFilters,
  onClearFilters,
  matchingCount,
  stages = [],
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<PipelineFilters>(filters);

  useEffect(() => {
    if (open) {
      setDraftFilters(filters);
    }
  }, [open, filters]);

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

  const planOptions = [
    { label: "Navigator ($55)", value: "$55" },
    { label: "Anchor ($105)", value: "$105" },
    { label: "Family Plan", value: "Family" },
    { label: "Scholarship", value: "Scholarship" },
    { label: "Pay Per Use", value: "Pay Per Use" },
    { label: "On Hold", value: "On Hold" },
    { label: "Tools Only", value: "Tools Only" },
  ];

  const districtOptions = [
    "Fulton County",
    "Cobb County",
    "Gwinnett County",
    "DeKalb County",
    "Atlanta Public Schools",
  ];
  const caseTypeOptions = [
    "IEP",
    "504",
    "Evaluation",
    "State Complaint",
    "Records",
    "Monitoring",
  ];
  const accountStatusOptions = [
    "Active",
    "Onboarding",
    "Renewal Needed",
    "On Hold",
    "Closed",
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-7 px-2.5 rounded-full text-[11px] font-medium border flex items-center gap-1 transition-all duration-150 cursor-pointer shrink-0",
            activeFilterCount > 0
              ? "bg-[#C5A059] text-[#07162B] font-bold border-[#FFE394]/60"
              : "bg-transparent hover:bg-[#0D1E38] border-transparent text-[#CBD5E1] hover:text-[#FFF4D4]"
          )}
        >
          <Filter
            className={cn(
              "h-3 w-3",
              activeFilterCount > 0 ? "text-[#07162B]" : "text-[#94A3B8]"
            )}
          />
          <span>{activeFilterCount > 0 ? "Filters" : "+ Add filter"}</span>
          {activeFilterCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#07162B] text-[#FFE394]">
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
            <h4 className="text-sm font-bold font-serif text-[#FFF4D4]">
              Filter Pipeline
            </h4>
          </div>
          <span className="text-xs text-[#C6B697] font-medium">
            {matchingCount} matching
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {/* 1. Logical Stage Group */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#C6B697] uppercase tracking-wider">
              Stage Group
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    logicalGroup: undefined,
                    pipelineGroup: undefined,
                  }))
                }
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer",
                  !draftFilters.logicalGroup && !draftFilters.pipelineGroup
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394]/60"
                    : "bg-[#020A17]/80 hover:bg-[#07162B] border-[#3A2C18]/80 text-[#D8C7A5] hover:text-[#FFF4D4]"
                )}
              >
                All Groups
              </button>
              {LOGICAL_STAGE_GROUPS.map((grp) => {
                const isSelected = draftFilters.logicalGroup === grp.key;
                return (
                  <button
                    key={grp.key}
                    type="button"
                    onClick={() =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        logicalGroup: isSelected
                          ? undefined
                          : (grp.key as LogicalStageGroup),
                      }))
                    }
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer",
                      isSelected
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394]/60"
                        : "bg-[#020A17]/80 hover:bg-[#07162B] border-[#3A2C18]/80 text-[#D8C7A5] hover:text-[#FFF4D4]"
                    )}
                  >
                    {grp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Specific Pipeline Stage */}
          {stages.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#C6B697] uppercase tracking-wider">
                Pipeline Stage
              </label>
              <select
                value={draftFilters.stage || ""}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    stage: e.target.value || undefined,
                  }))
                }
                className="w-full h-8 px-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs focus:outline-hidden focus:border-[#C5A059]"
              >
                <option value="">All Stages</option>
                {stages
                  .filter((s) => !s.isArchived)
                  .map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* 3. Service Plan / Membership */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#C6B697] uppercase tracking-wider">
              Service Plan
            </label>
            <div className="flex flex-wrap gap-1.5">
              {planOptions.map((plan) => {
                const isSelected = draftFilters.planTier === plan.value;
                return (
                  <button
                    key={plan.value}
                    type="button"
                    onClick={() =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        planTier: isSelected ? undefined : plan.value,
                      }))
                    }
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                      isSelected
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394]/60 shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                        : "bg-[#020A17]/80 hover:bg-[#07162B] border-[#3A2C18]/80 text-[#D8C7A5] hover:text-[#FFF4D4]"
                    )}
                  >
                    {plan.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Assigned Advocate */}
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
              {ADVOCATE_ROSTER.map((adv) => (
                <option key={adv.name} value={adv.name}>
                  {adv.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. School District */}
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

          {/* 6. Case Type */}
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

          {/* 7. Account Status */}
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

          {/* 8. Needs Attention Toggle */}
          <div className="pt-2 border-t border-[#3A2C18]/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#FFF4D4]">
                Needs Attention Only
              </span>
              <p className="text-[10px] text-[#A69371]">
                Filter to flagged / urgent client records
              </p>
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
                draftFilters.needsAttentionOnly
                  ? "bg-gradient-to-r from-[#DFBE77] to-[#C5A059] justify-end"
                  : "bg-[#020A17] justify-start"
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

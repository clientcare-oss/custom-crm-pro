import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Filter,
  Download,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Activity,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export interface MetricsFilterState {
  dateRange: "7d" | "30d" | "90d" | "ytd" | "12m" | "all";
  compareWithPrevious: boolean;
  advocateId: number | "all";
  planTier: "$55" | "$105" | "Scholarship" | "Pay Per Use" | "all";
  state: string;
  district: string;
  caseType: string;
}

interface MetricsHeaderProps {
  filters: MetricsFilterState;
  onFilterChange: (newFilters: Partial<MetricsFilterState>) => void;
  onResetFilters: () => void;
  onExportReport: () => void;
  onCustomizeDashboard: () => void;
}

export default function MetricsHeader({
  filters,
  onFilterChange,
  onResetFilters,
  onExportReport,
  onCustomizeDashboard,
}: MetricsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* ── Title & Global Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#05142B] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] shadow-[0_4px_16px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.06)]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#FFF4D4] tracking-wide">
                  Waypoint Metrics
                </h1>
                <span className="text-[10px] font-mono text-[#FFE394] bg-[#020A17] px-2 py-0.5 rounded-full border border-[#3A2C18] font-bold">
                  PG-042
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#C6B697] mt-0.5 font-medium leading-relaxed">
                See where clients come from, how cases move, and where the team’s time is going.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onCustomizeDashboard}
            className="h-9 px-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs font-semibold shadow-xs gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#DFBE77]" />
            <span>Customize</span>
          </Button>

          <Button
            size="sm"
            onClick={onExportReport}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] text-xs font-bold shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* ── Universal Multi-Dimensional Filter Bar ── */}
      <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-3 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#A69371] uppercase tracking-wider pl-1">
              Range:
            </span>
            <Select
              value={filters.dateRange}
              onValueChange={(val: any) => onFilterChange({ dateRange: val })}
            >
              <SelectTrigger className="h-8 w-32 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-xl focus:ring-[#C5A059]">
                <Calendar className="w-3.5 h-3.5 text-[#FFE394] mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
                <SelectItem value="7d" className="text-xs hover:bg-[#071E3D]">Last 7 Days</SelectItem>
                <SelectItem value="30d" className="text-xs hover:bg-[#071E3D]">Last 30 Days</SelectItem>
                <SelectItem value="90d" className="text-xs hover:bg-[#071E3D]">Last 90 Days</SelectItem>
                <SelectItem value="ytd" className="text-xs hover:bg-[#071E3D]">Year to Date</SelectItem>
                <SelectItem value="12m" className="text-xs hover:bg-[#071E3D]">Last 12 Months</SelectItem>
                <SelectItem value="all" className="text-xs hover:bg-[#071E3D]">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Compare Previous Period Toggle */}
          <button
            type="button"
            onClick={() => onFilterChange({ compareWithPrevious: !filters.compareWithPrevious })}
            className={`h-8 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filters.compareWithPrevious
                ? "bg-[#071E3D] text-[#FFE394] border-[#FFE394]/60 shadow-[0_0_12px_rgba(197,160,89,0.25)]"
                : "bg-[#020A17] text-[#A69371] border-[#3A2C18] hover:text-[#FFF4D4]"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filters.compareWithPrevious ? "bg-[#FFE394]" : "bg-[#A69371]"}`} />
            <span>Compare Previous</span>
          </button>

          {/* Advocate Filter */}
          <Select
            value={filters.advocateId === "all" ? "all" : String(filters.advocateId)}
            onValueChange={(val) => onFilterChange({ advocateId: val === "all" ? "all" : Number(val) })}
          >
            <SelectTrigger className="h-8 w-36 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-xl focus:ring-[#C5A059]">
              <SelectValue placeholder="All Advocates" />
            </SelectTrigger>
            <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
              <SelectItem value="all" className="text-xs hover:bg-[#071E3D]">All Advocates</SelectItem>
              <SelectItem value="1" className="text-xs hover:bg-[#071E3D]">Byron Honea</SelectItem>
              <SelectItem value="2" className="text-xs hover:bg-[#071E3D]">Wyatt Smith</SelectItem>
            </SelectContent>
          </Select>

          {/* Plan Tier Filter */}
          <Select
            value={filters.planTier}
            onValueChange={(val: any) => onFilterChange({ planTier: val })}
          >
            <SelectTrigger className="h-8 w-36 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-xl focus:ring-[#C5A059]">
              <SelectValue placeholder="All Plans" />
            </SelectTrigger>
            <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
              <SelectItem value="all" className="text-xs hover:bg-[#071E3D]">All Plans</SelectItem>
              <SelectItem value="$55" className="text-xs hover:bg-[#071E3D]">$55 Plan</SelectItem>
              <SelectItem value="$105" className="text-xs hover:bg-[#071E3D]">$105 Plan</SelectItem>
              <SelectItem value="Scholarship" className="text-xs hover:bg-[#071E3D]">Scholarship</SelectItem>
              <SelectItem value="Pay Per Use" className="text-xs hover:bg-[#071E3D]">Pay-Per-Use</SelectItem>
            </SelectContent>
          </Select>

          {/* State Filter */}
          <Select
            value={filters.state}
            onValueChange={(val) => onFilterChange({ state: val })}
          >
            <SelectTrigger className="h-8 w-28 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-xl focus:ring-[#C5A059]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
              <SelectItem value="all" className="text-xs hover:bg-[#071E3D]">All States</SelectItem>
              <SelectItem value="GA" className="text-xs hover:bg-[#071E3D]">Georgia (GA)</SelectItem>
              <SelectItem value="FL" className="text-xs hover:bg-[#071E3D]">Florida (FL)</SelectItem>
              <SelectItem value="NC" className="text-xs hover:bg-[#071E3D]">North Carolina (NC)</SelectItem>
              <SelectItem value="SC" className="text-xs hover:bg-[#071E3D]">South Carolina (SC)</SelectItem>
              <SelectItem value="TN" className="text-xs hover:bg-[#071E3D]">Tennessee (TN)</SelectItem>
              <SelectItem value="TX" className="text-xs hover:bg-[#071E3D]">Texas (TX)</SelectItem>
            </SelectContent>
          </Select>

          {/* District Filter */}
          <Select
            value={filters.district}
            onValueChange={(val) => onFilterChange({ district: val })}
          >
            <SelectTrigger className="h-8 w-44 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-xl focus:ring-[#C5A059]">
              <SelectValue placeholder="School District" />
            </SelectTrigger>
            <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
              <SelectItem value="all" className="text-xs hover:bg-[#071E3D]">All Districts</SelectItem>
              <SelectItem value="Gwinnett" className="text-xs hover:bg-[#071E3D]">Gwinnett County Public Schools</SelectItem>
              <SelectItem value="Fulton" className="text-xs hover:bg-[#071E3D]">Fulton County Schools</SelectItem>
              <SelectItem value="Cobb" className="text-xs hover:bg-[#071E3D]">Cobb County School District</SelectItem>
              <SelectItem value="Dekalb" className="text-xs hover:bg-[#071E3D]">Dekalb County Schools</SelectItem>
              <SelectItem value="Wake" className="text-xs hover:bg-[#071E3D]">Wake County Public Schools</SelectItem>
            </SelectContent>
          </Select>

          {/* Case Type Filter */}
          <Select
            value={filters.caseType}
            onValueChange={(val) => onFilterChange({ caseType: val })}
          >
            <SelectTrigger className="h-8 w-44 bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] rounded-xl focus:ring-[#C5A059]">
              <SelectValue placeholder="Case Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
              <SelectItem value="all" className="text-xs hover:bg-[#071E3D]">All Case Types</SelectItem>
              <SelectItem value="Annual IEP" className="text-xs hover:bg-[#071E3D]">Annual IEP Review</SelectItem>
              <SelectItem value="Initial Eligibility" className="text-xs hover:bg-[#071E3D]">Initial IEP Eligibility</SelectItem>
              <SelectItem value="504 Plan" className="text-xs hover:bg-[#071E3D]">504 Plan Accommodation</SelectItem>
              <SelectItem value="Service Reduction" className="text-xs hover:bg-[#071E3D]">Speech / OT Reduction Dispute</SelectItem>
              <SelectItem value="BIP" className="text-xs hover:bg-[#071E3D]">BIP / Behavior Escalation</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onResetFilters}
            className="h-8 px-2 text-xs text-[#A69371] hover:text-[#FFF4D4] gap-1 cursor-pointer ml-auto"
            title="Reset all filters to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#DFBE77]" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

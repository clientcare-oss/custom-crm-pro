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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/30 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide font-sans">
                  Waypoint Metrics
                </h1>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-400/30 font-semibold">
                  PG-042
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-200/70 mt-0.5 font-medium leading-relaxed">
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
            className="h-9 px-3.5 rounded-xl bg-[#001433] hover:bg-[#001D4D] border-sky-500/30 text-xs font-semibold text-slate-200 hover:text-white shadow-xs gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span>Customize</span>
          </Button>

          <Button
            size="sm"
            onClick={onExportReport}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#0062E3] to-[#004BB5] hover:from-[#0070F3] hover:to-[#0055CC] text-white text-xs font-bold shadow-md shadow-blue-900/40 border border-sky-400/40 gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* ── Universal Multi-Dimensional Filter Bar ── */}
      <div className="bg-[#001026] border border-sky-500/25 rounded-2xl p-3 shadow-inner space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider pl-1">
              Range:
            </span>
            <Select
              value={filters.dateRange}
              onValueChange={(val: any) => onFilterChange({ dateRange: val })}
            >
              <SelectTrigger className="h-8 w-32 bg-[#000E26] border-sky-500/30 text-xs text-white rounded-xl focus:ring-sky-400">
                <Calendar className="w-3.5 h-3.5 text-sky-400 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#001433] border-sky-500/30 text-white">
                <SelectItem value="7d" className="text-xs hover:bg-sky-500/20">Last 7 Days</SelectItem>
                <SelectItem value="30d" className="text-xs hover:bg-sky-500/20">Last 30 Days</SelectItem>
                <SelectItem value="90d" className="text-xs hover:bg-sky-500/20">Last 90 Days</SelectItem>
                <SelectItem value="ytd" className="text-xs hover:bg-sky-500/20">Year to Date</SelectItem>
                <SelectItem value="12m" className="text-xs hover:bg-sky-500/20">Last 12 Months</SelectItem>
                <SelectItem value="all" className="text-xs hover:bg-sky-500/20">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Compare Previous Period Toggle */}
          <button
            type="button"
            onClick={() => onFilterChange({ compareWithPrevious: !filters.compareWithPrevious })}
            className={`h-8 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filters.compareWithPrevious
                ? "bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-xs"
                : "bg-[#000E26] text-blue-200/60 border-sky-500/25 hover:text-white"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filters.compareWithPrevious ? "bg-sky-400" : "bg-slate-500"}`} />
            <span>Compare Previous</span>
          </button>

          {/* Advocate Filter */}
          <Select
            value={filters.advocateId === "all" ? "all" : String(filters.advocateId)}
            onValueChange={(val) => onFilterChange({ advocateId: val === "all" ? "all" : Number(val) })}
          >
            <SelectTrigger className="h-8 w-36 bg-[#000E26] border-sky-500/30 text-xs text-white rounded-xl focus:ring-sky-400">
              <SelectValue placeholder="All Advocates" />
            </SelectTrigger>
            <SelectContent className="bg-[#001433] border-sky-500/30 text-white">
              <SelectItem value="all" className="text-xs hover:bg-sky-500/20">All Advocates</SelectItem>
              <SelectItem value="1" className="text-xs hover:bg-sky-500/20">Byron Honea</SelectItem>
              <SelectItem value="2" className="text-xs hover:bg-sky-500/20">Wyatt Smith</SelectItem>
            </SelectContent>
          </Select>

          {/* Plan Tier Filter */}
          <Select
            value={filters.planTier}
            onValueChange={(val: any) => onFilterChange({ planTier: val })}
          >
            <SelectTrigger className="h-8 w-36 bg-[#000E26] border-sky-500/30 text-xs text-white rounded-xl focus:ring-sky-400">
              <SelectValue placeholder="All Plans" />
            </SelectTrigger>
            <SelectContent className="bg-[#001433] border-sky-500/30 text-white">
              <SelectItem value="all" className="text-xs hover:bg-sky-500/20">All Plans</SelectItem>
              <SelectItem value="$55" className="text-xs hover:bg-sky-500/20">$55 Plan</SelectItem>
              <SelectItem value="$105" className="text-xs hover:bg-sky-500/20">$105 Plan</SelectItem>
              <SelectItem value="Scholarship" className="text-xs hover:bg-sky-500/20">Scholarship</SelectItem>
              <SelectItem value="Pay Per Use" className="text-xs hover:bg-sky-500/20">Pay-Per-Use</SelectItem>
            </SelectContent>
          </Select>

          {/* State Filter */}
          <Select
            value={filters.state}
            onValueChange={(val) => onFilterChange({ state: val })}
          >
            <SelectTrigger className="h-8 w-28 bg-[#000E26] border-sky-500/30 text-xs text-white rounded-xl focus:ring-sky-400">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent className="bg-[#001433] border-sky-500/30 text-white">
              <SelectItem value="all" className="text-xs hover:bg-sky-500/20">All States</SelectItem>
              <SelectItem value="GA" className="text-xs hover:bg-sky-500/20">Georgia (GA)</SelectItem>
              <SelectItem value="FL" className="text-xs hover:bg-sky-500/20">Florida (FL)</SelectItem>
              <SelectItem value="NC" className="text-xs hover:bg-sky-500/20">North Carolina (NC)</SelectItem>
              <SelectItem value="SC" className="text-xs hover:bg-sky-500/20">South Carolina (SC)</SelectItem>
              <SelectItem value="TN" className="text-xs hover:bg-sky-500/20">Tennessee (TN)</SelectItem>
              <SelectItem value="TX" className="text-xs hover:bg-sky-500/20">Texas (TX)</SelectItem>
            </SelectContent>
          </Select>

          {/* District Filter */}
          <Select
            value={filters.district}
            onValueChange={(val) => onFilterChange({ district: val })}
          >
            <SelectTrigger className="h-8 w-44 bg-[#000E26] border-sky-500/30 text-xs text-white rounded-xl focus:ring-sky-400">
              <SelectValue placeholder="School District" />
            </SelectTrigger>
            <SelectContent className="bg-[#001433] border-sky-500/30 text-white">
              <SelectItem value="all" className="text-xs hover:bg-sky-500/20">All Districts</SelectItem>
              <SelectItem value="Gwinnett" className="text-xs hover:bg-sky-500/20">Gwinnett County Public Schools</SelectItem>
              <SelectItem value="Fulton" className="text-xs hover:bg-sky-500/20">Fulton County Schools</SelectItem>
              <SelectItem value="Cobb" className="text-xs hover:bg-sky-500/20">Cobb County School District</SelectItem>
              <SelectItem value="Dekalb" className="text-xs hover:bg-sky-500/20">Dekalb County Schools</SelectItem>
              <SelectItem value="Wake" className="text-xs hover:bg-sky-500/20">Wake County Public Schools</SelectItem>
            </SelectContent>
          </Select>

          {/* Case Type Filter */}
          <Select
            value={filters.caseType}
            onValueChange={(val) => onFilterChange({ caseType: val })}
          >
            <SelectTrigger className="h-8 w-44 bg-[#000E26] border-sky-500/30 text-xs text-white rounded-xl focus:ring-sky-400">
              <SelectValue placeholder="Case Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#001433] border-sky-500/30 text-white">
              <SelectItem value="all" className="text-xs hover:bg-sky-500/20">All Case Types</SelectItem>
              <SelectItem value="Annual IEP" className="text-xs hover:bg-sky-500/20">Annual IEP Review</SelectItem>
              <SelectItem value="Initial Eligibility" className="text-xs hover:bg-sky-500/20">Initial IEP Eligibility</SelectItem>
              <SelectItem value="504 Plan" className="text-xs hover:bg-sky-500/20">504 Plan Accommodation</SelectItem>
              <SelectItem value="Service Reduction" className="text-xs hover:bg-sky-500/20">Speech / OT Reduction Dispute</SelectItem>
              <SelectItem value="BIP" className="text-xs hover:bg-sky-500/20">BIP / Behavior Escalation</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onResetFilters}
            className="h-8 px-2 text-xs text-slate-400 hover:text-white gap-1 cursor-pointer ml-auto"
            title="Reset all filters to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

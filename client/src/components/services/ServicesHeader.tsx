import React from "react";
import { Plus, Search, Filter, X, Archive, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { InteractivePageIdPill } from "@/components/portal-experience/InteractivePageIdPill";

interface ServicesHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "active" | "inactive" | "archived";
  onStatusFilterChange: (status: "all" | "active" | "inactive" | "archived") => void;
  billingTypeFilter: string;
  onBillingTypeFilterChange: (billingType: string) => void;
  onAddService: () => void;
  onReviewDefaults: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export const ServicesHeader: React.FC<ServicesHeaderProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  billingTypeFilter,
  onBillingTypeFilterChange,
  onAddService,
  onReviewDefaults,
  hasActiveFilters,
  onClearFilters,
}) => {
  return (
    <div className="space-y-2.5">
      {/* Top Title & Primary Actions with clearance for floating Feedback & Issues button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:pr-40">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Advocacy Services Catalog
            </h1>
            <InteractivePageIdPill pageId="PG-035" />
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage the services Waypoint can offer to families.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReviewDefaults}
            className="border border-sky-500/30 bg-[#082043] hover:bg-[#0D3A68] text-blue-100 text-xs gap-1.5 h-8 px-2.5 rounded-lg cursor-pointer shadow-sm"
            title="Review Default Services"
          >
            <RefreshCw className="w-3 h-3 text-sky-400" />
            Review Defaults
          </Button>

          <Button
            type="button"
            onClick={onAddService}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-900/40 gap-1.5 h-8 px-3 text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        {/* Wide Search Field */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-300/60 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search services by title, code, price, or deliverables..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8.5 pr-8 h-8.5 text-xs bg-[#082043] border border-sky-500/25 focus-visible:border-sky-400 focus-visible:ring-1 focus-visible:ring-sky-400 text-white placeholder:text-blue-200/50 rounded-lg shadow-inner"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-white"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => onStatusFilterChange("all")}
            className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              statusFilter === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-[#082043] text-blue-100 hover:text-white border border-sky-500/25 hover:bg-[#0D3A68]"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange("active")}
            className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              statusFilter === "active"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-[#082043] text-blue-100 hover:text-white border border-sky-500/25 hover:bg-[#0D3A68]"
            }`}
          >
            Active
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange("inactive")}
            className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              statusFilter === "inactive"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-[#082043] text-blue-100 hover:text-white border border-sky-500/25 hover:bg-[#0D3A68]"
            }`}
          >
            Inactive
          </button>

          <button
            type="button"
            onClick={() => onStatusFilterChange("archived")}
            className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              statusFilter === "archived"
                ? "bg-amber-700/80 text-white shadow-xs"
                : "bg-[#082043] text-blue-100 hover:text-white border border-sky-500/25 hover:bg-[#0D3A68]"
            }`}
          >
            <Archive className="w-3 h-3" />
            Archived
          </button>

          {/* More Filters Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`px-2.5 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  billingTypeFilter !== "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-[#082043] text-blue-100 hover:text-white border border-sky-500/25 hover:bg-[#0D3A68]"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                More Filters
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#001035] border border-sky-500/30 text-blue-100 min-w-[200px] shadow-2xl">
              <DropdownMenuLabel className="text-xs text-slate-400 uppercase tracking-wider">Billing Type</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onBillingTypeFilterChange("all")}
                className={`cursor-pointer ${billingTypeFilter === "all" ? "bg-blue-600/30 text-blue-300 font-semibold" : ""}`}
              >
                All Billing Types
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onBillingTypeFilterChange("recurring")}
                className={`cursor-pointer ${billingTypeFilter === "recurring" ? "bg-blue-600/30 text-blue-300 font-semibold" : ""}`}
              >
                Recurring Memberships
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onBillingTypeFilterChange("one_time")}
                className={`cursor-pointer ${billingTypeFilter === "one_time" ? "bg-blue-600/30 text-blue-300 font-semibold" : ""}`}
              >
                One-Time Services
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onBillingTypeFilterChange("included")}
                className={`cursor-pointer ${billingTypeFilter === "included" ? "bg-blue-600/30 text-blue-300 font-semibold" : ""}`}
              >
                Plan Inclusions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="px-2.5 h-8 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 border border-rose-900/40 hover:bg-rose-950/50 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

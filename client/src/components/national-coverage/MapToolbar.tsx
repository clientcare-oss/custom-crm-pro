import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Filter,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle,
  MapPin,
  X,
  Clock,
  User,
  Check,
  Sparkles,
  RefreshCw,
  Database,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { MapClientItem } from "./USCoverageMap";
import { LocationRepairQueueModal } from "./LocationRepairQueueModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface FilterState {
  status: string; // "all", "active", "onboarding", "needs_attention", "paused", "inactive"
  meeting: string; // "all", "today", "week"
  advocate: string; // "all", "me", or specific name
  timeZone: string; // "all", "EASTERN", "CENTRAL", "MOUNTAIN", "PACIFIC", "ALASKA", "HAWAII"
  planType: string; // "all", "IEP", "504", "Scholarship", "Pay-per-use"
}

export const INITIAL_FILTERS: FilterState = {
  status: "all",
  meeting: "all",
  advocate: "all",
  timeZone: "all",
  planType: "all",
};

interface MapToolbarProps {
  showAllClients: boolean;
  onToggleShowAll: (show: boolean) => void;
  onSelectClient: (client: MapClientItem) => void;
  onClearMap: () => void;
  summaryText: string;
  missingLocationCount: number;
  missingLocationClients: MapClientItem[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onUpdateLocation?: (clientId: number, city: string, state: string, zipCode?: string) => Promise<void>;
}

export function MapToolbar({
  showAllClients,
  onToggleShowAll,
  onSelectClient,
  onClearMap,
  summaryText,
  missingLocationCount,
  missingLocationClients,
  filters,
  onFilterChange,
  onUpdateLocation,
}: MapToolbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [repairQueueOpen, setRepairQueueOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Seeding & Backfill mutations (PG-041 Step 8 & 9)
  const seedDemoMutation = trpc.nationalCoverage.seedDemoLocations.useMutation({
    onSuccess: (res: any) => {
      toast.success(`Seeded ${res.count} demo clients across 10 sample cities`);
      utils.nationalCoverage.getOverview.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed seeding demo locations"),
  });

  const clearDemoMutation = trpc.nationalCoverage.clearDemoLocations.useMutation({
    onSuccess: () => {
      toast.success("Cleared demo location coordinates");
      utils.nationalCoverage.getOverview.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed clearing demo locations"),
  });

  const backfillMutation = trpc.nationalCoverage.backfillLocations.useMutation({
    onSuccess: (res: any) => {
      toast.success(res.message, { duration: 6000 });
      utils.nationalCoverage.getOverview.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed running backfill"),
  });

  // Synchronize local filter state when external props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Live search query via tRPC
  const { data: searchResults, isLoading: isSearching } =
    trpc.nationalCoverage.searchClients.useQuery(
      { query: searchQuery },
      {
        enabled: searchQuery.trim().length >= 1,
        staleTime: 3000,
      }
    );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.meeting !== "all" ||
    filters.advocate !== "all" ||
    filters.timeZone !== "all" ||
    filters.planType !== "all";

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
    setFilterPopoverOpen(false);
  };

  const handleClearFilters = () => {
    setLocalFilters(INITIAL_FILTERS);
    onFilterChange(INITIAL_FILTERS);
    setFilterPopoverOpen(false);
  };

  return (
    <div className="w-full space-y-2 mb-3">
      {/* Top Bar: Search + Action Buttons + Metrics */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Field with live dropdown */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search clients, students, cities, states, or ZIP codes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length >= 1) setIsDropdownOpen(true);
              }}
              className="pl-10 pr-9 h-10 bg-[#041224] border-slate-700/80 text-white placeholder:text-slate-400 text-xs sm:text-sm rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsDropdownOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {isDropdownOpen && searchQuery.trim().length >= 1 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl bg-[#071d3a] border border-sky-500/40 shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-3 text-xs text-slate-400 text-center">Searching real client records...</div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="divide-y divide-slate-800">
                  {searchResults.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        onSelectClient(client as any);
                        setIsDropdownOpen(false);
                        setSearchQuery(client.studentName || client.name);
                      }}
                      className="w-full text-left p-3 hover:bg-sky-900/40 transition-colors flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                          {client.studentName || client.name}
                        </div>
                        <div className="text-xs text-slate-300 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>{client.locationDisplay}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-sky-300 font-medium">{client.timeZoneName}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                            client.status === "active"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : client.status === "needs_attention"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          )}
                        >
                          {client.status.replace("_", " ")}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          Assigned to {client.assignedAdvocate}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-xs text-slate-400 text-center space-y-1">
                  <div>No client records found matching "{searchQuery}"</div>
                  <div className="text-[11px] text-slate-500">
                    Try searching by student name, city, state, or ZIP code
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Controls: Show All / Hide Markers, Filters, Clear Map */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Show All Clients / Hide Markers Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggleShowAll(!showAllClients)}
            className={cn(
              "h-10 px-3.5 text-xs font-semibold rounded-xl border transition-all gap-1.5",
              showAllClients
                ? "bg-sky-600/30 border-sky-400 text-sky-200 hover:bg-sky-600/40 shadow-sm shadow-sky-500/20"
                : "bg-[#041224] border-slate-700 hover:bg-slate-800 text-slate-200"
            )}
          >
            {showAllClients ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-sky-300" />
                <span>Hide Client Markers</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>Show All Clients</span>
              </>
            )}
          </Button>

          {/* Filters Popover */}
          <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-10 px-3 text-xs font-semibold rounded-xl border gap-1.5",
                  hasActiveFilters
                    ? "bg-indigo-600/30 border-indigo-400 text-indigo-200"
                    : "bg-[#041224] border-slate-700 hover:bg-slate-800 text-slate-200"
                )}
              >
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 p-4 rounded-xl bg-[#06172d] border border-slate-700 text-white shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Filter National Clients
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Client Status
                </label>
                <select
                  value={localFilters.status}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, status: e.target.value })
                  }
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Clients Only</option>
                  <option value="needs_attention">Needs Attention</option>
                  <option value="onboarding">Onboarding / New Leads</option>
                  <option value="paused">Paused</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Advocate Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Assigned Advocate
                </label>
                <select
                  value={localFilters.advocate}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, advocate: e.target.value })
                  }
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="all">All Advocates</option>
                  <option value="me">Assigned to Me</option>
                  <option value="Byron Honea">Byron Honea</option>
                  <option value="Jordan Davis">Jordan Davis</option>
                </select>
              </div>

              {/* Plan Type Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Plan Type
                </label>
                <select
                  value={localFilters.planType}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, planType: e.target.value })
                  }
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="all">All Plans</option>
                  <option value="IEP">IEP Support</option>
                  <option value="504">504 Plan Support</option>
                  <option value="Scholarship">Scholarship</option>
                  <option value="Pay-per-use">Pay-Per-Use</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterPopoverOpen(false)}
                  className="h-8 text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyFilters}
                  className="h-8 text-xs bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg"
                >
                  Apply Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear Map Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              onClearMap();
            }}
            className="h-10 px-2.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl gap-1"
            title="Clear Selection & Return to Base Map"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Map</span>
          </Button>
        </div>
      </div>

      {/* Sub-bar: Summary Text + Missing Location Queue + Dev Location Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="font-semibold text-slate-300">{summaryText}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Developer Location Actions (PG-041 Step 8 & 9) */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => seedDemoMutation.mutate()}
              disabled={seedDemoMutation.isPending}
              title="Seed 10 approved test cities across US, Alaska & Hawaii"
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-sky-400 hover:text-white hover:bg-sky-950/60 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>{seedDemoMutation.isPending ? "Seeding..." : "Seed Demo Locations"}</span>
            </button>
            <button
              type="button"
              onClick={() => clearDemoMutation.mutate()}
              disabled={clearDemoMutation.isPending}
              title="Clear seeded demo coordinates"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
            >
              <X className="w-3 h-3 text-slate-500" />
              <span>Clear Demo</span>
            </button>
            <button
              type="button"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
              title="Audit and geocode all database contacts via ZIP or city/state"
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-indigo-300 hover:text-white hover:bg-indigo-950/60 transition-colors"
            >
              <RefreshCw className={cn("w-3 h-3 text-indigo-400", backfillMutation.isPending && "animate-spin")} />
              <span>{backfillMutation.isPending ? "Backfilling..." : "Run Location Backfill"}</span>
            </button>
          </div>

          {/* Location Repair Queue Action (PG-041 Step 10) */}
          <button
            type="button"
            onClick={() => setRepairQueueOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-semibold transition-all",
              missingLocationCount > 0
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 shadow-sm"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Clients Needing Location ({missingLocationCount})</span>
          </button>
        </div>
      </div>

      {/* Repair Queue Modal */}
      <LocationRepairQueueModal
        isOpen={repairQueueOpen}
        onClose={() => setRepairQueueOpen(false)}
        clients={missingLocationClients}
      />
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe2,
  Calendar,
  Map as MapIcon,
  Search,
  Plus,
  Clock,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  User,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// National Coverage Subcomponents
import { TimeZoneClocks } from "@/components/national-coverage/TimeZoneClocks";
import { USCoverageMap, MapClientItem } from "@/components/national-coverage/USCoverageMap";
import { UpcomingMeetingCard } from "@/components/national-coverage/UpcomingMeetingCard";
import { CallTimeCheckCard } from "@/components/national-coverage/CallTimeCheckCard";
import { BestTimeToCallTable } from "@/components/national-coverage/BestTimeToCallTable";
import { ScheduleMeetingModal } from "@/components/national-coverage/ScheduleMeetingModal";
import { MapToolbar, FilterState, INITIAL_FILTERS } from "@/components/national-coverage/MapToolbar";
import { SelectedClientBar } from "@/components/national-coverage/SelectedClientBar";
import { ClientMarkerCard } from "@/components/national-coverage/ClientMarkerCard";
import CalendarView from "@/components/CalendarView";

export default function NationalCoverage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Page Controls State
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [rangeFilter, setRangeFilter] = useState<"all" | "today" | "week">("all");
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [showAllClients, setShowAllClients] = useState<boolean>(() => {
    return localStorage.getItem("wp_national_coverage_show_all") === "true";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulePrefillClient, setSchedulePrefillClient] = useState<MapClientItem | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "calendar">(() => {
    return (localStorage.getItem("waypoint_national_coverage_view") as "map" | "calendar") || "map";
  });

  const viewerTimeZone = (user as any)?.timeZone || "America/New_York";

  // Toggle Show All Clients and persist preference
  const handleToggleShowAll = (show: boolean) => {
    setShowAllClients(show);
    localStorage.setItem("wp_national_coverage_show_all", String(show));
  };

  // TRPC Query with auto refetch every 60 seconds for live clock sync
  const utils = trpc.useUtils();
  const {
    data: overviewData,
    isLoading,
    refetch,
    isFetching,
  } = trpc.nationalCoverage.getOverview.useQuery(
    {
      filter: rangeFilter,
      statusFilter: filters.status !== "all" ? filters.status : undefined,
      meetingFilter: filters.meeting !== "all" ? (filters.meeting as any) : undefined,
      timeZoneFilter: selectedZoneFilter || (filters.timeZone !== "all" ? filters.timeZone : undefined),
      assignedAdvocate: filters.advocate !== "all" ? filters.advocate : undefined,
      planTypeFilter: filters.planType !== "all" ? filters.planType : undefined,
      viewerTimeZone,
    },
    {
      refetchInterval: 60000, // Sync every minute
    }
  );

  // Update client location mutation
  const updateLocationMutation = trpc.nationalCoverage.updateClientLocation.useMutation({
    onSuccess: () => {
      toast.success("Client location updated successfully!");
      utils.nationalCoverage.getOverview.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update client location");
    },
  });

  const handleUpdateLocation = async (clientId: number, city: string, state: string, zipCode?: string) => {
    await updateLocationMutation.mutateAsync({ clientId, city, state, zipCode });
  };

  // Query appointments for Calendar View
  const { data: appointmentsList = [] } = trpc.appointments.list.useQuery();

  // Save view mode preference
  const handleToggleViewMode = (mode: "map" | "calendar") => {
    setViewMode(mode);
    localStorage.setItem("waypoint_national_coverage_view", mode);
  };

  // When a client is selected from map or table
  const selectedClient = React.useMemo(() => {
    if (!overviewData) return null;
    if (selectedClientId) {
      return (
        overviewData.clients.find((c) => c.id === selectedClientId) ||
        overviewData.allClients.find((c) => c.id === selectedClientId) ||
        null
      );
    }
    return null;
  }, [overviewData, selectedClientId]);

  // Handle Action Handlers
  const handleOpenWorkspace = (clientId: number) => {
    setLocation(`/contacts/${clientId}`);
  };

  const handleOpenCallCenter = (client: MapClientItem) => {
    setLocation(`/call-center?contactId=${client.id}`);
  };

  const handleTriggerSchedule = (client?: MapClientItem) => {
    if (client) {
      setSchedulePrefillClient(client);
    } else {
      setSchedulePrefillClient(null);
    }
    setShowScheduleModal(true);
  };

  const handleClearMap = () => {
    setSelectedClientId(null);
    setSelectedZoneFilter(null);
    setFilters(INITIAL_FILTERS);
    setShowAllClients(false);
    localStorage.setItem("wp_national_coverage_show_all", "false");
  };

  return (
    <ScopedErrorBoundary moduleName="National Coverage & Time Zone Intelligence">
      <div className="min-h-screen bg-[#000821] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* TOP NAVIGATION / HEADER BAR */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          {/* Left: Page Title & Subtitle */}
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Globe2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  National Coverage
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Meetings and client time zones at a glance.
                </p>
              </div>
            </div>
          </div>

          {/* Center / Search bar */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients, cases, or notes..."
              className="pl-9 h-10 text-xs bg-[#07162B]/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500 rounded-xl"
            />
          </div>

          {/* Right: Employee profile & Waypoint slogan */}
          <div className="flex items-center gap-4">
            <div className="hidden xl:flex flex-col items-end">
              <span className="text-xs font-serif italic text-sky-400 font-semibold tracking-wide">
                Students. Families. Brighter Tomorrows.
              </span>
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent mt-0.5" />
            </div>

            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#07162B] border border-slate-800">
              <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {(user as any)?.name ? (user as any).name.slice(0, 2).toUpperCase() : "BH"}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-white leading-none">
                  {(user as any)?.name || "Jordan Davis"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {(user as any)?.role === "admin" ? "Master IEP Coach®" : "Educational Advocate"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE CONTROLS BAR (Filters, View Switch, Schedule Meeting) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#07162B]/80 border border-slate-800/80 p-3 rounded-2xl backdrop-blur-md">
          {/* Time Range Filters */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRangeFilter("today")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                rangeFilter === "today"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setRangeFilter("week")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                rangeFilter === "week"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setRangeFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                rangeFilter === "all"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              All Active Clients
            </button>

            {selectedZoneFilter && (
              <button
                type="button"
                onClick={() => setSelectedZoneFilter(null)}
                className="ml-2 px-2.5 py-1 rounded-lg text-xs bg-sky-950 border border-sky-500/40 text-sky-300 hover:bg-sky-900"
              >
                Filtered: {selectedZoneFilter.split("/").pop()} ✕
              </button>
            )}
          </div>

          {/* Right Action Controls: View Switch & Schedule Button */}
          <div className="flex items-center gap-2">
            {/* Map vs Calendar View Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800">
              <button
                type="button"
                onClick={() => handleToggleViewMode("map")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "map"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                Map View
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode("calendar")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "calendar"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Calendar View
              </button>
            </div>

            {/* Schedule Meeting Primary Action */}
            <Button
              type="button"
              onClick={() => handleTriggerSchedule()}
              className="h-9 px-3.5 text-xs font-bold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 gap-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Schedule Meeting
            </Button>
          </div>
        </div>

        {/* 1. SIX LIVE TIME-ZONE CLOCKS */}
        {isLoading && !overviewData ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3 w-full">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[#07162B] border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <TimeZoneClocks
            clocks={overviewData?.clocks || []}
            selectedZone={selectedZoneFilter}
            onSelectZone={setSelectedZoneFilter}
          />
        )}

        {/* 2. MAIN WORKSPACE (Full Width Map or Calendar Across Entire Page) */}
        <div className="w-full">
          {viewMode === "map" ? (
            <div className="w-full space-y-3">
              {/* Map Toolbar (Search, Show All Clients, Filters, Clear Map, Summary) */}
              <MapToolbar
                showAllClients={showAllClients}
                onToggleShowAll={handleToggleShowAll}
                onSelectClient={(c) => setSelectedClientId(c.id)}
                onClearMap={handleClearMap}
                summaryText={overviewData?.summaryText || "Live National Client Coverage"}
                missingLocationCount={overviewData?.missingLocationCount || 0}
                missingLocationClients={(overviewData?.missingLocationClients as any) || []}
                filters={filters}
                onFilterChange={setFilters}
                onUpdateLocation={handleUpdateLocation}
              />

              {/* Slim Selected Client Bar */}
              {selectedClient && (
                <SelectedClientBar
                  client={selectedClient}
                  onClear={() => setSelectedClientId(null)}
                  onOpenWorkspace={handleOpenWorkspace}
                />
              )}

              {/* Approved Base Map + Real CRM Location Overlay */}
              <USCoverageMap
                clients={overviewData?.clients || []}
                selectedClientId={selectedClientId}
                onSelectClient={(c) => setSelectedClientId(c.id)}
                showAllClients={showAllClients}
              />

              {/* Client Marker Preview Card */}
              {selectedClient && (
                <ClientMarkerCard
                  client={selectedClient}
                  onClose={() => setSelectedClientId(null)}
                  onOpenWorkspace={handleOpenWorkspace}
                  onOpenCallCenter={handleOpenCallCenter}
                  onScheduleCall={handleTriggerSchedule}
                  onViewCalendar={() => setViewMode("calendar")}
                />
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#07162B]/85 border border-slate-800/80 p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sky-400" />
                  <h3 className="text-base font-bold text-white">
                    Time-Zone Aware Advocacy Calendar
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Displaying in your time zone: <strong className="text-sky-300 font-mono">{viewerTimeZone}</strong>
                </span>
              </div>
              <CalendarView
                appointments={appointmentsList}
                onEventClick={(apt) => {
                  const cId = (apt as any).clientId;
                  if (cId) setSelectedClientId(cId);
                }}
              />
            </div>
          )}
        </div>

        {/* 3. BUMPED DOWN CARDS: UPCOMING MEETING & CALL-TIME CHECK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <UpcomingMeetingCard
            meeting={overviewData?.upcomingMeeting || null}
            onOpenCase={handleOpenWorkspace}
            onAddLink={() => toast.info("Enter meeting link in Case Workspace")}
          />

          <CallTimeCheckCard
            checkData={
              selectedClient
                ? {
                    clientId: selectedClient.id,
                    clientName: selectedClient.name,
                    city: selectedClient.city,
                    state: selectedClient.state,
                    localTime: selectedClient.localTime,
                    timeZoneName: selectedClient.timeZoneName,
                    diffHours: selectedClient.diffHours,
                    diffText: selectedClient.diffText,
                    status: selectedClient.callingStatus,
                    guidanceText: selectedClient.callingStatusLabel,
                    preferredHoursText: "Client preferred hours: 9:00 AM – 5:00 PM local time",
                    canCallAnyway: true,
                  }
                : overviewData?.callTimeCheck || null
            }
            onScheduleCall={(clientId) => {
              const target = overviewData?.clients.find((c) => c.id === clientId);
              handleTriggerSchedule(target);
            }}
            onCallConfirmed={(clientId) => {
              const target = overviewData?.clients.find((c) => c.id === clientId);
              if (target) handleOpenCallCenter(target);
            }}
          />
        </div>

        {/* 3. BEST TIME TO CALL TABLE (Full Width Below) */}
        <BestTimeToCallTable
          clients={overviewData?.clients || []}
          onCallClient={handleOpenCallCenter}
          onScheduleCall={handleTriggerSchedule}
          onOpenWorkspace={handleOpenWorkspace}
        />

        {/* Schedule Meeting Modal */}
        <ScheduleMeetingModal
          open={showScheduleModal}
          onOpenChange={setShowScheduleModal}
          prefillClient={schedulePrefillClient}
          viewerTimeZone={viewerTimeZone}
        />
      </div>
    </ScopedErrorBoundary>
  );
}

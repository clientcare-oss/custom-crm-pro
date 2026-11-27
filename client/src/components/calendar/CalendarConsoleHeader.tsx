import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Clock,
  Phone,
  CheckSquare,
  Sparkles,
  Shield,
  Building2,
  Globe,
  Briefcase,
  Layers,
  Target,
  Settings,
  Users,
  Hourglass,
  ArrowRight,
  Check,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarViewMode, CalendarScope, CalendarLayerFilters } from "@/components/CalendarView";
import { cn } from "@/lib/utils";

export interface CalendarConsoleHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  activeNavTab?: string;
  onNavTabChange: (tab: any) => void;
  stats: {
    appointmentsCount: number;
    weekAppointmentsCount?: number;
    holdsCount: number;
    callbacksCount: number;
    tasksCount: number;
    pendingRequestsCount?: number;
  };
  viewMode?: CalendarViewMode | "agenda";
  onViewModeChange?: (mode: CalendarViewMode | "agenda") => void;
  scope?: CalendarScope;
  onScopeChange?: (scope: CalendarScope) => void;
  selectedAdvocateFilter?: string;
  onAdvocateFilterChange?: (advocate: string) => void;
  advocateList?: { id: string; name: string }[];
  layerFilters?: CalendarLayerFilters;
  onLayerFiltersChange?: (filters: CalendarLayerFilters) => void;
  showWeekends?: boolean;
  onToggleShowWeekends?: (show: boolean) => void;
  showCanceled?: boolean;
  onToggleShowCanceled?: (show: boolean) => void;
  isLegendOpen?: boolean;
  onToggleLegend?: () => void;
  onScheduleClick: () => void;
  onProposeHoldsClick: () => void;
  onOpenClosuresClick?: () => void;
  onOpenAvailabilityClick?: () => void;
  onQuickAction?: (action: "NEW_MEETING" | "PROPOSE_3_OPTIONS" | "PARENT_CALL" | "BLOCK_TIME") => void;
}

export default function CalendarConsoleHeader({
  currentDate,
  onDateChange,
  activeNavTab = "calendar",
  onNavTabChange,
  stats,
  viewMode = "month",
  onViewModeChange,
  scope = "all",
  onScopeChange,
  selectedAdvocateFilter = "ALL",
  onAdvocateFilterChange,
  advocateList = [],
  layerFilters,
  onLayerFiltersChange,
  showWeekends = true,
  onToggleShowWeekends,
  showCanceled = false,
  onToggleShowCanceled,
  isLegendOpen = false,
  onToggleLegend,
  onScheduleClick,
  onProposeHoldsClick,
  onOpenClosuresClick,
  onOpenAvailabilityClick,
  onQuickAction,
}: CalendarConsoleHeaderProps) {
  // Mini calendar month state
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(() => new Date(currentDate));
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isMiniCalOpen, setIsMiniCalOpen] = useState(false);

  // Synchronize mini calendar with currentDate if month differs
  React.useEffect(() => {
    if (
      currentDate.getFullYear() !== miniCalMonth.getFullYear() ||
      currentDate.getMonth() !== miniCalMonth.getMonth()
    ) {
      setMiniCalMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    }
  }, [currentDate]);

  // Mini calendar month & year label
  const miniMonthYearLabel = miniCalMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handlePrevMiniMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMiniCalMonth(new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() - 1, 1));
  };

  const handleNextMiniMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMiniCalMonth(new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() + 1, 1));
  };

  // Generate mini calendar days (7 columns, 5-6 rows)
  const miniCalDays = useMemo(() => {
    const year = miniCalMonth.getFullYear();
    const month = miniCalMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const currentDayNum = today.getDate();

    const isSelectedMonth = currentDate.getFullYear() === year && currentDate.getMonth() === month;
    const selectedDayNum = currentDate.getDate();

    const days: { day: number | null; isCurrent: boolean; isSelected: boolean }[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, isCurrent: false, isSelected: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push({
        day: d,
        isCurrent: isCurrentMonth && d === currentDayNum,
        isSelected: isSelectedMonth && d === selectedDayNum,
      });
    }
    return days;
  }, [miniCalMonth, currentDate]);

  // Date step navigation based on current viewMode
  const handlePrevStep = () => {
    const next = new Date(currentDate);
    if (viewMode === "day") {
      next.setDate(next.getDate() - 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() - 7);
    } else if (viewMode === "month") {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 1);
    }
    onDateChange(next);
  };

  const handleNextStep = () => {
    const next = new Date(currentDate);
    if (viewMode === "day") {
      next.setDate(next.getDate() + 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === "month") {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 1);
    }
    onDateChange(next);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Formatted date range label for the bottom navigator (e.g. "Oct 4 – Oct 10, 2026")
  const formattedRangeLabel = useMemo(() => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    // Week or Agenda view
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const start = new Date(curr);
    start.setDate(curr.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
  }, [currentDate, viewMode]);

  const normalizedAdvocateValue =
    !selectedAdvocateFilter || selectedAdvocateFilter.toLowerCase() === "all"
      ? "all"
      : selectedAdvocateFilter;

  return (
    <header className="relative w-full select-none">
      {/* ── OVERLAPPING SHELF & HANGING VINES CANOPY (Brought to front z-30 so hanging leaves physically drape over the brass mantel & controls below) ── */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none select-none">
        <img
          src="/images/calendar-header-shelf-overlay.png?v=1"
          alt="PG-007 Appointments & Calendar Shelf Canopy"
          width={1024}
          height={245}
          className="w-full h-auto block select-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.72)]"
        />
      </div>

      {/* ── 1. TOP SHELF TITLE PLAQUE ZONE (Matches exact 149/1024 shelf rail height) + 3D BRUSHED-BRASS MANTEL SILL BELOW ── */}
      <div className="relative w-full">
        <div
          className="relative w-full z-40 pointer-events-none min-h-[86px] sm:min-h-[104px]"
          style={{ aspectRatio: "1024 / 149" }}
        >
          {/* Centered Title inside the carved gold-leaf wooden plaque */}
          <div
            className="absolute flex flex-col items-center justify-center text-center px-4"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "33.6%",
              minWidth: "260px",
              maxWidth: "420px",
            }}
          >
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight text-[#FAF6EC] drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)] leading-tight select-none">
              Calendar
            </h1>
            <p className="hidden sm:block text-[11px] sm:text-xs font-serif italic text-[#E9CFA0]/95 tracking-wide mt-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] select-none truncate max-w-full">
              Schedule smarter. Protect your time.
            </p>
          </div>
        </div>
        {/* 3D Brushed-Brass Mantel sits cleanly beneath the z-30 hanging vines so leaves drape right over the brass edge */}
        <div aria-hidden="true" className="adm-brass-mantel relative z-20" />
      </div>

      {/* ── 2. UNIFIED ADMIRALTY REALISTIC CONTROLS DECK (Sits cleanly on Admiralty Bridge Canvas below Brass Mantel, framed by z-30 hanging vines) ── */}
      <div className="relative z-10 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3.5 pb-1.5">
        <div className="flex flex-col gap-3">
          {/* ── TIER 1: Navigation Pill Strip & Primary Schedule Trigger ── */}
          <div className="flex items-center justify-between gap-2.5 flex-wrap shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto max-w-full scrollbar-none py-0.5">
              {/* Primary View: Calendar */}
              <button
                type="button"
                onClick={() => {
                  onNavTabChange("calendar");
                  onScopeChange?.("all");
                  onAdvocateFilterChange?.("all");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]",
                  activeNavTab === "calendar" && scope === "all"
                    ? "adm-cal-pill-active"
                    : "adm-cal-pill text-[#E2D5BC] hover:text-[#FAF6EC]"
                )}
              >
                <CalendarIcon className={cn("h-3.5 w-3.5", activeNavTab === "calendar" && scope === "all" ? "text-[#071528]" : "text-[#ECC97B]")} />
                <span>Calendar</span>
              </button>

              {/* Session Types (Scheduler Tool) */}
              <button
                type="button"
                onClick={() => {
                  onNavTabChange(activeNavTab === "session-types" ? "calendar" : "session-types");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]",
                  activeNavTab === "session-types"
                    ? "adm-cal-pill-active"
                    : "adm-cal-pill text-[#E2D5BC] hover:text-[#FAF6EC]"
                )}
                title="Configure Session Types & Durations (1:1 Advocate 1 hr, IEP 3 hrs, etc.)"
              >
                <Clock className={cn("h-3.5 w-3.5", activeNavTab === "session-types" ? "text-[#071528]" : "text-[#ECC97B]")} />
                <span>Session Types</span>
              </button>

              {/* Active Sub-Console Pill (if on dispatch) */}
              {activeNavTab === "dispatch" && (
                <button
                  type="button"
                  onClick={() => onNavTabChange("calendar")}
                  className="adm-cal-pill-active flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap"
                  title="Click to return to Calendar"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#071528]" />
                  <span>Schedule Dispatch</span>
                  <span className="ml-1 text-[10px] opacity-75">✕</span>
                </button>
              )}

              {/* Filter & Views Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]",
                      scope === "my" || activeNavTab === "requests" || activeNavTab === "availability" || activeNavTab === "closures"
                        ? "adm-cal-pill-active"
                        : "adm-cal-pill text-[#E2D5BC] hover:text-[#FAF6EC]"
                    )}
                  >
                    <Filter
                      className={cn(
                        "h-3.5 w-3.5",
                        scope === "my" || activeNavTab === "requests" || activeNavTab === "availability" || activeNavTab === "closures"
                          ? "text-[#071528]"
                          : "text-[#ECC97B]"
                      )}
                    />
                    <span>Filter & Views</span>
                    {scope === "my" && (
                      <span className="rounded-md bg-[#071528]/92 px-1.5 py-0.5 text-[9px] font-mono text-[#E9CFA0] font-semibold border border-[#947a5c]/60">
                        My Schedule
                      </span>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="adm-cal-dropdown w-64 text-[#FAF6EC] rounded-xl p-2 space-y-1"
                >
                  <div className="text-[10px] font-mono text-[#E9CFA0] uppercase tracking-wider px-2 py-1 font-bold border-b border-white/10">
                    Schedule Scope Filter
                  </div>
                  <DropdownMenuItem
                    onClick={() => {
                      onNavTabChange("calendar");
                      onScopeChange?.("all");
                      onAdvocateFilterChange?.("all");
                    }}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center justify-between p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-[#ECC97B]" />
                      <span>Team Schedule (All Staff)</span>
                    </div>
                    {scope === "all" && activeNavTab === "calendar" && (
                      <Check className="h-3.5 w-3.5 text-[#ECC97B]" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      onNavTabChange("calendar");
                      onScopeChange?.("my");
                    }}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center justify-between p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5 text-[#ECC97B]" />
                      <span>My Schedule (Byron)</span>
                    </div>
                    {scope === "my" && activeNavTab === "calendar" && (
                      <Check className="h-3.5 w-3.5 text-[#ECC97B]" />
                    )}
                  </DropdownMenuItem>

                  <div className="text-[10px] font-mono text-[#E9CFA0] uppercase tracking-wider px-2 pt-2 pb-1 font-bold border-t border-b border-white/10 mt-1">
                    Desks & Consoles
                  </div>
                  <DropdownMenuItem
                    onClick={() => onNavTabChange("dispatch")}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center justify-between p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#ECC97B]" />
                      <span>Schedule Dispatch Desk</span>
                    </div>
                    {activeNavTab === "dispatch" && (
                      <Check className="h-3.5 w-3.5 text-[#ECC97B]" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onNavTabChange("session-types")}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center justify-between p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-[#ECC97B]" />
                      <span>Session Types (PG-008)</span>
                    </div>
                    {activeNavTab === "session-types" && (
                      <Check className="h-3.5 w-3.5 text-[#ECC97B]" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      onNavTabChange("requests");
                      const el = document.getElementById("bottom-console-anchor");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center justify-between p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-[#ECC97B]" />
                      <span>Scheduling Requests</span>
                    </div>
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-mono font-extrabold text-white shadow-sm">
                      {stats.pendingRequestsCount || 3}
                    </span>
                  </DropdownMenuItem>

                  <div className="text-[10px] font-mono text-[#E9CFA0] uppercase tracking-wider px-2 pt-2 pb-1 font-bold border-t border-b border-white/10 mt-1">
                    Operations & Working Hours
                  </div>
                  <DropdownMenuItem
                    onClick={() => {
                      onNavTabChange("availability");
                      onOpenAvailabilityClick?.();
                    }}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg"
                  >
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Availability & Time Blocks</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      onNavTabChange("closures");
                      onOpenClosuresClick?.();
                    }}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg"
                  >
                    <Building2 className="h-3.5 w-3.5 text-orange-400" />
                    <span>Holidays & Office Closures</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right: + Schedule Dropdown Button */}
            <div className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="adm-cal-pill-active inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold active:scale-95 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Schedule</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="adm-cal-dropdown w-56 text-[#FAF6EC] rounded-xl p-1"
                >
                  <DropdownMenuItem
                    onClick={() => (onQuickAction ? onQuickAction("NEW_MEETING") : onScheduleClick())}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-[#ECC97B]" />
                    <span>New Appointment</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => (onQuickAction ? onQuickAction("PROPOSE_3_OPTIONS") : onProposeHoldsClick())}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg"
                  >
                    <Target className="h-3.5 w-3.5 text-amber-400" />
                    <span>Propose 3 Options (Holds)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => (onQuickAction ? onQuickAction("PARENT_CALL") : onScheduleClick())}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Parent Call</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onOpenAvailabilityClick?.()}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg"
                  >
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Block Time / Availability</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onOpenClosuresClick?.()}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg border-t border-white/10 mt-1 pt-2"
                  >
                    <Building2 className="h-3.5 w-3.5 text-orange-400" />
                    <span>Office Holiday / Closure</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ── TIER 2: 5 Sculpted Realistic Admiralty KPI Plaques (Oil-Rubbed Antique Brass + Pebbled Navy Calfskin) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Card 1: Today */}
            <button
              type="button"
              onClick={handleToday}
              className="adm-metric-card adm-cal-kpi group cursor-pointer overflow-hidden rounded-[18px] px-4 py-3 flex flex-col justify-between text-left select-none active:scale-[0.98]"
            >
              <div aria-hidden="true" className="adm-rim-glint-top" />
              <div aria-hidden="true" className="adm-rim-glint-bottom" />
              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="adm-icon-tile h-8 w-8 rounded-[10px] flex items-center justify-center text-[#ECC97B] shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarIcon className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
                </div>
              </div>
              <div className="relative z-10 flex-1 flex items-center justify-center my-0.5">
                <div className="font-serif text-[32px] sm:text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-[#FAF6EC] drop-shadow-[0_4px_10px_rgba(0,0,0,0.82)]">
                  {stats.appointmentsCount || 5}
                </div>
              </div>
              <div className="relative z-10 w-full text-center text-[12px] sm:text-[13px] font-normal text-[#D4DFEE] group-hover:text-[#FFF5DC] transition-colors tracking-[0.015em] whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                Today
              </div>
            </button>

            {/* Card 2: This Week */}
            <button
              type="button"
              onClick={() => onViewModeChange?.("week")}
              className="adm-metric-card adm-cal-kpi group cursor-pointer overflow-hidden rounded-[18px] px-4 py-3 flex flex-col justify-between text-left select-none active:scale-[0.98]"
            >
              <div aria-hidden="true" className="adm-rim-glint-top" />
              <div aria-hidden="true" className="adm-rim-glint-bottom" />
              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="adm-icon-tile h-8 w-8 rounded-[10px] flex items-center justify-center text-[#ECC97B] shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
                </div>
              </div>
              <div className="relative z-10 flex-1 flex items-center justify-center my-0.5">
                <div className="font-serif text-[32px] sm:text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-[#FAF6EC] drop-shadow-[0_4px_10px_rgba(0,0,0,0.82)]">
                  {stats.weekAppointmentsCount || 10}
                </div>
              </div>
              <div className="relative z-10 w-full text-center text-[12px] sm:text-[13px] font-normal text-[#D4DFEE] group-hover:text-[#FFF5DC] transition-colors tracking-[0.015em] whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                This Week
              </div>
            </button>

            {/* Card 3: Tentative Holds */}
            <button
              type="button"
              onClick={onProposeHoldsClick}
              className="adm-metric-card adm-cal-kpi group cursor-pointer overflow-hidden rounded-[18px] px-4 py-3 flex flex-col justify-between text-left select-none active:scale-[0.98]"
            >
              <div aria-hidden="true" className="adm-rim-glint-top" />
              <div aria-hidden="true" className="adm-rim-glint-bottom" />
              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="adm-icon-tile h-8 w-8 rounded-[10px] flex items-center justify-center text-[#ECC97B] shrink-0 group-hover:scale-105 transition-transform">
                  <Hourglass className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
                </div>
                {(stats.holdsCount || 3) > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DFBE77] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFE394]" />
                  </span>
                )}
              </div>
              <div className="relative z-10 flex-1 flex items-center justify-center my-0.5">
                <div className="font-serif text-[32px] sm:text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-[#FAF6EC] drop-shadow-[0_4px_10px_rgba(0,0,0,0.82)]">
                  {stats.holdsCount || 3}
                </div>
              </div>
              <div className="relative z-10 w-full text-center text-[12px] sm:text-[13px] font-normal text-[#D4DFEE] group-hover:text-[#FFF5DC] transition-colors tracking-[0.015em] whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                Tentative Holds
              </div>
            </button>

            {/* Card 4: Callbacks */}
            <button
              type="button"
              onClick={() => (onQuickAction ? onQuickAction("PARENT_CALL") : onScheduleClick())}
              className="adm-metric-card adm-cal-kpi group cursor-pointer overflow-hidden rounded-[18px] px-4 py-3 flex flex-col justify-between text-left select-none active:scale-[0.98]"
            >
              <div aria-hidden="true" className="adm-rim-glint-top" />
              <div aria-hidden="true" className="adm-rim-glint-bottom" />
              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="adm-icon-tile h-8 w-8 rounded-[10px] flex items-center justify-center text-[#ECC97B] shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
                </div>
              </div>
              <div className="relative z-10 flex-1 flex items-center justify-center my-0.5">
                <div className="font-serif text-[32px] sm:text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-[#FAF6EC] drop-shadow-[0_4px_10px_rgba(0,0,0,0.82)]">
                  {stats.callbacksCount || 2}
                </div>
              </div>
              <div className="relative z-10 w-full text-center text-[12px] sm:text-[13px] font-normal text-[#D4DFEE] group-hover:text-[#FFF5DC] transition-colors tracking-[0.015em] whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                Callbacks
              </div>
            </button>

            {/* Card 5: Tasks Due */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("bottom-console-anchor");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="adm-metric-card adm-cal-kpi group cursor-pointer overflow-hidden rounded-[18px] px-4 py-3 flex flex-col justify-between text-left select-none active:scale-[0.98]"
            >
              <div aria-hidden="true" className="adm-rim-glint-top" />
              <div aria-hidden="true" className="adm-rim-glint-bottom" />
              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="adm-icon-tile h-8 w-8 rounded-[10px] flex items-center justify-center text-[#ECC97B] shrink-0 group-hover:scale-105 transition-transform">
                  <CheckSquare className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
                </div>
              </div>
              <div className="relative z-10 flex-1 flex items-center justify-center my-0.5">
                <div className="font-serif text-[32px] sm:text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-[#FAF6EC] drop-shadow-[0_4px_10px_rgba(0,0,0,0.82)]">
                  {stats.tasksCount || 4}
                </div>
              </div>
              <div className="relative z-10 w-full text-center text-[12px] sm:text-[13px] font-normal text-[#D4DFEE] group-hover:text-[#FFF5DC] transition-colors tracking-[0.015em] whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                Tasks Due
              </div>
            </button>
          </div>

          {/* ── TIER 3: Sculpted Leather & Antique Brass Command Bar ── */}
          <div className="adm-cal-toolbar rounded-[16px] px-3.5 py-2 overflow-hidden flex items-center justify-between gap-2.5 flex-wrap shrink-0">
            <div aria-hidden="true" className="adm-rim-glint-top" />
            <div aria-hidden="true" className="adm-rim-glint-bottom" />
            {/* Left Group: Today Jump + Stepper Chevrons + Date Range + Collapsible Mini Calendar Trigger */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="adm-cal-pill px-3 py-1 rounded-lg text-xs font-semibold text-[#E8DEC8] hover:text-[#FAF6EC] cursor-pointer active:scale-95"
              >
                Today
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="adm-cal-pill h-7 w-7 rounded-lg text-[#ECC97B] hover:text-[#FAF6EC] flex items-center justify-center cursor-pointer active:scale-95"
                  title="Previous"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="adm-cal-pill h-7 w-7 rounded-lg text-[#ECC97B] hover:text-[#FAF6EC] flex items-center justify-center cursor-pointer active:scale-95"
                  title="Next"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="font-serif text-sm sm:text-base font-bold text-[#FAF6EC] px-1.5 whitespace-nowrap drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                {formattedRangeLabel}
              </div>

              {/* Collapsible Mini-Calendar Popover Dropdown */}
              <DropdownMenu open={isMiniCalOpen} onOpenChange={setIsMiniCalOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      isMiniCalOpen
                        ? "adm-cal-pill-active font-bold"
                        : "adm-cal-pill text-[#E8DEC8] hover:text-[#FAF6EC]"
                    )}
                    title="Toggle Mini Month Calendar"
                  >
                    <CalendarIcon className={cn("h-3.5 w-3.5", isMiniCalOpen ? "text-[#071528]" : "text-[#ECC97B]")} />
                    <span className="hidden sm:inline">Mini Cal</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", isMiniCalOpen && "rotate-180")} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="adm-cal-dropdown w-[264px] text-[#FAF6EC] rounded-xl p-2.5 z-50"
                >
                  {/* Calendar Widget Month Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#8a7052]/35">
                    <button
                      type="button"
                      onClick={handlePrevMiniMonth}
                      className="adm-cal-pill h-6 w-6 rounded-md text-[#ECC97B] hover:text-[#FAF6EC] flex items-center justify-center cursor-pointer active:scale-95"
                      title="Previous Month"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <div className="font-serif text-xs font-bold text-[#FAF6EC] tracking-wider drop-shadow-sm">
                      {miniMonthYearLabel}
                    </div>
                    <button
                      type="button"
                      onClick={handleNextMiniMonth}
                      className="adm-cal-pill h-6 w-6 rounded-md text-[#ECC97B] hover:text-[#FAF6EC] flex items-center justify-center cursor-pointer active:scale-95"
                      title="Next Month"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-mono font-semibold text-[#C6B697] py-1.5">
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-0.5 text-center">
                    {miniCalDays.map((item, idx) => {
                      if (item.day === null) {
                        return <div key={`empty-${idx}`} className="h-6 w-6 mx-auto" />;
                      }

                      return (
                        <button
                          key={`day-${item.day}`}
                          type="button"
                          onClick={() => {
                            const next = new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth(), item.day!);
                            onDateChange(next);
                            setIsMiniCalOpen(false);
                          }}
                          className={cn(
                            "h-6 w-6 rounded text-[11px] font-mono font-medium flex items-center justify-center transition-all cursor-pointer mx-auto",
                            item.isSelected
                              ? "adm-cal-pill-active font-bold scale-105"
                              : item.isCurrent
                              ? "border border-[#ECC97B] text-[#ECC97B] font-bold hover:bg-[#ECC97B]/15"
                              : "text-[#E8DEC8]/90 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {item.day}
                        </button>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right Group: View Mode Segmented Switch + Advocate Dropdown + Collapsible Key Toggle + Layer Settings */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Buttons */}
              <div className="adm-cal-segment-track flex items-center p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => onViewModeChange?.("day")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    viewMode === "day"
                      ? "adm-cal-pill-active font-bold"
                      : "text-[#CFDCEF] hover:text-[#FAF6EC] hover:bg-white/[0.05]"
                  )}
                >
                  Day
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange?.("week")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    viewMode === "week"
                      ? "adm-cal-pill-active font-bold"
                      : "text-[#CFDCEF] hover:text-[#FAF6EC] hover:bg-white/[0.05]"
                  )}
                >
                  Week
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange?.("month")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    viewMode === "month"
                      ? "adm-cal-pill-active font-bold"
                      : "text-[#CFDCEF] hover:text-[#FAF6EC] hover:bg-white/[0.05]"
                  )}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange?.("agenda")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    viewMode === "agenda"
                      ? "adm-cal-pill-active font-bold"
                      : "text-[#CFDCEF] hover:text-[#FAF6EC] hover:bg-white/[0.05]"
                  )}
                >
                  Agenda
                </button>
              </div>

              {/* Advocate Selector Dropdown (Explicit label rendering so it never appears blank) */}
              <Select
                value={normalizedAdvocateValue}
                onValueChange={(val) => onAdvocateFilterChange?.(val)}
              >
                <SelectTrigger className="adm-cal-pill h-7 text-xs text-[#FAF6EC] rounded-lg px-2.5 min-w-[138px] font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    <Users className="h-3 w-3 text-[#ECC97B] shrink-0" />
                    <span className="truncate">
                      {normalizedAdvocateValue === "all" ? "All Advocates" : normalizedAdvocateValue}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="adm-cal-dropdown text-[#FAF6EC] rounded-xl">
                  <SelectItem value="all">All Advocates</SelectItem>
                  {advocateList.map((adv) => (
                    <SelectItem key={adv.id} value={adv.name}>
                      {adv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Collapsible Schedule Key / Legend Toggle Button */}
              {onToggleLegend && (
                <button
                  type="button"
                  onClick={onToggleLegend}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    isLegendOpen
                      ? "adm-cal-pill-active font-bold"
                      : "adm-cal-pill text-[#E8DEC8] hover:text-[#FAF6EC]"
                  )}
                  title={isLegendOpen ? "Collapse Schedule Key" : "Expand Schedule Key"}
                >
                  <span className="flex items-center gap-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                  <span>Key</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", isLegendOpen && "rotate-180")} />
                </button>
              )}

              {/* Layer Settings Gear Modal / Dropdown */}
              <DropdownMenu open={isLayerMenuOpen} onOpenChange={setIsLayerMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="adm-cal-pill h-7 w-7 rounded-lg text-[#ECC97B] hover:text-[#FAF6EC] flex items-center justify-center cursor-pointer active:scale-95"
                    title="Calendar Layer Filters"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="adm-cal-dropdown w-56 text-[#FAF6EC] rounded-xl p-2 space-y-1"
                >
                  <div className="text-[10px] font-mono text-[#E9CFA0] uppercase tracking-wider px-2 py-1 font-bold border-b border-white/10">
                    Layer Display Filters
                  </div>
                  {layerFilters && onLayerFiltersChange && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          onLayerFiltersChange({
                            ...layerFilters,
                            showAppointments: !layerFilters.showAppointments,
                          })
                        }
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left"
                      >
                        <span>Appointments</span>
                        {layerFilters.showAppointments && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onLayerFiltersChange({
                            ...layerFilters,
                            showProposedHolds: !layerFilters.showProposedHolds,
                          })
                        }
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left"
                      >
                        <span>Tentative Holds</span>
                        {layerFilters.showProposedHolds && <Check className="h-3.5 w-3.5 text-amber-400" />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onLayerFiltersChange({
                            ...layerFilters,
                            showClosures: !layerFilters.showClosures,
                          })
                        }
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left"
                      >
                        <span>Office Closures</span>
                        {layerFilters.showClosures && <Check className="h-3.5 w-3.5 text-rose-400" />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onLayerFiltersChange({
                            ...layerFilters,
                            showPto: !layerFilters.showPto,
                          })
                        }
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left"
                      >
                        <span>Staff PTO</span>
                        {layerFilters.showPto && <Check className="h-3.5 w-3.5 text-blue-400" />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onLayerFiltersChange({
                            ...layerFilters,
                            showInternalEvents: !layerFilters.showInternalEvents,
                          })
                        }
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left"
                      >
                        <span>Internal Work</span>
                        {layerFilters.showInternalEvents && <Check className="h-3.5 w-3.5 text-purple-400" />}
                      </button>
                      <div className="border-t border-white/10 my-1" />
                      {onToggleShowWeekends && (
                        <button
                          type="button"
                          onClick={() => onToggleShowWeekends(!showWeekends)}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left"
                        >
                          <span>Show Weekends</span>
                          {showWeekends && <Check className="h-3.5 w-3.5 text-[#ECC97B]" />}
                        </button>
                      )}
                      {onToggleShowCanceled && (
                        <button
                          type="button"
                          onClick={() => onToggleShowCanceled(!showCanceled)}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left"
                        >
                          <span>Show Canceled</span>
                          {showCanceled && <Check className="h-3.5 w-3.5 text-[#ECC97B]" />}
                        </button>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

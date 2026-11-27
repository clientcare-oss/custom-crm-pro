import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Clock,
  Phone,
  Sparkles,
  Building2,
  Briefcase,
  Layers,
  Target,
  Settings,
  Users,
  Hourglass,
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
} from "@/components/ui/select";
import { CalendarViewMode, CalendarScope, CalendarLayerFilters } from "@/components/CalendarView";
import {
  CALENDAR_ORB_CATEGORIES,
  CalendarOrbCategoryKey,
} from "@/components/calendar/calendarCategoryHelpers";
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
  activeCategoryFilter?: CalendarOrbCategoryKey | null;
  onCategoryFilterChange?: (category: CalendarOrbCategoryKey | null) => void;
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
  scope = "my",
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
  activeCategoryFilter = null,
  onCategoryFilterChange,
  onScheduleClick,
  onProposeHoldsClick,
  onOpenClosuresClick,
  onOpenAvailabilityClick,
  onQuickAction,
}: CalendarConsoleHeaderProps) {
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(() => new Date(currentDate));
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isMiniCalOpen, setIsMiniCalOpen] = useState(false);

  React.useEffect(() => {
    if (
      currentDate.getFullYear() !== miniCalMonth.getFullYear() ||
      currentDate.getMonth() !== miniCalMonth.getMonth()
    ) {
      setMiniCalMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    }
  }, [currentDate]);

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

  const handlePrevStep = () => {
    const next = new Date(currentDate);
    if (viewMode === "day" || viewMode === "agenda") {
      next.setDate(next.getDate() - 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    onDateChange(next);
  };

  const handleNextStep = () => {
    const next = new Date(currentDate);
    if (viewMode === "day" || viewMode === "agenda") {
      next.setDate(next.getDate() + 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    onDateChange(next);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const formattedRangeLabel = useMemo(() => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (viewMode === "month" || viewMode === "agenda") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
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

  const isCalendarTabActive = activeNavTab === "calendar";
  const scopeBadgeLabel = scope === "my" ? "My Schedule" : "Team Schedule";

  return (
    <header className="relative w-full select-none">
      {/* Accessible Page Title (forged 3D brass typography is baked cleanly into the photorealistic top plaque) */}
      <h1 className="sr-only">Calendar — Schedule smarter. Protect your time.</h1>

      {/* ── OVERLAPPING SHELF & HANGING SUNLIT IVY CANOPY (z-30 vines drape organically over outer Rows 1–2) ── */}
      <div className="wp-cal-canopy-overlay">
        <img
          src="/assets/calendar/calendar-shelf-canopy.png?v=4"
          alt="Waypoint Calendar Study Mantel Shelf with Himalayan Salt Lamp, Vintage Books, Ornate Brass Calendar Plaque, Antique Compass, and Hanging Ivy"
          width={1376}
          height={375}
          className="wp-cal-canopy-img"
        />
      </div>

      {/* ── 1. TOP MANTEL SHELF SPACER (Locks strictly to 1376/177 shelf line ratio) ── */}
      <div className="relative w-full">
        <div className="wp-cal-shelf-spacer" aria-hidden="true" />
        <div className="wp-cal-shelf-cast-shadow" aria-hidden="true" />
      </div>

      {/* ── 2. PHOTOREALISTIC ADMIRALTY CONTROLS DECK (Framed gracefully between left & right z-30 trailing ivy vines) ── */}
      <div className="relative z-20 max-w-[1460px] w-full mx-auto px-6 sm:px-10 lg:px-14 pt-1 pb-1.5">
        <div className="flex flex-col gap-2.5">
          {/* ── ROW 1: Primary Navigation Strip & + Schedule Trigger ── */}
          <div className="flex items-center justify-between gap-2.5 flex-wrap shrink-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Calendar Pill */}
              <button
                type="button"
                onClick={() => onNavTabChange("calendar")}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 h-10 text-[13.5px] font-serif font-bold cursor-pointer whitespace-nowrap",
                  isCalendarTabActive ? "wp-cal-pill-brass" : "wp-cal-pill-navy"
                )}
              >
                <CalendarIcon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isCalendarTabActive ? "text-[#160f05]" : "text-[#ECC97B]"
                  )}
                />
                <span>Calendar</span>
              </button>

              {/* Session Types Pill */}
              <button
                type="button"
                onClick={() =>
                  onNavTabChange(activeNavTab === "session-types" ? "calendar" : "session-types")
                }
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 h-10 text-[13.5px] font-serif font-bold cursor-pointer whitespace-nowrap",
                  activeNavTab === "session-types" ? "wp-cal-pill-brass" : "wp-cal-pill-navy"
                )}
                title="Configure Session Types & Durations (1:1 Advocate 1 hr, IEP 3 hrs, etc.)"
              >
                <Layers
                  className={cn(
                    "h-4 w-4 shrink-0",
                    activeNavTab === "session-types" ? "text-[#160f05]" : "text-[#ECC97B]"
                  )}
                />
                <span>Session Types</span>
              </button>

              {/* Active Dispatch Sub-Console Indicator */}
              {activeNavTab === "dispatch" && (
                <button
                  type="button"
                  onClick={() => onNavTabChange("calendar")}
                  className="wp-cal-pill-brass flex items-center gap-1.5 rounded-full px-4 h-10 text-xs font-serif font-bold cursor-pointer whitespace-nowrap"
                  title="Click to return to Calendar"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#160f05]" />
                  <span>Schedule Dispatch</span>
                  <span className="ml-1 text-[10px] opacity-75">✕</span>
                </button>
              )}

              {/* Unified Filter & Views + Nested Brushed-Brass [My Schedule ⌄] Capsule */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="wp-cal-pill-navy inline-flex items-center gap-2.5 rounded-full pl-4 pr-1.5 h-10 text-[13.5px] font-serif font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <Filter className="h-4 w-4 text-[#ECC97B] shrink-0" />
                    <span className="tracking-[0.01em]">Filter &amp; Views</span>
                    <span className="wp-cal-nested-brass inline-flex items-center gap-1.5 rounded-full px-3.5 h-[30px] text-[12.5px] font-serif font-bold">
                      <span>{scopeBadgeLabel}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-[#160f05] stroke-[2.5]" />
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="adm-cal-dropdown w-64 text-[#FAF6EC] rounded-xl p-2 space-y-1 z-50"
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
                    Desks &amp; Consoles
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
                    Operations &amp; Working Hours
                  </div>
                  <DropdownMenuItem
                    onClick={() => {
                      onNavTabChange("availability");
                      onOpenAvailabilityClick?.();
                    }}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg"
                  >
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Availability &amp; Time Blocks</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      onNavTabChange("closures");
                      onOpenClosuresClick?.();
                    }}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg"
                  >
                    <Building2 className="h-3.5 w-3.5 text-orange-400" />
                    <span>Holidays &amp; Office Closures</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Far Right: Radiant Brushed-Brass + Schedule ⌄ Button */}
            <div className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="wp-cal-pill-brass inline-flex items-center gap-2 rounded-full px-5 h-10 text-[14px] font-serif font-bold cursor-pointer"
                  >
                    <Plus className="h-4 w-4 stroke-[2.8]" />
                    <span>Schedule</span>
                    <ChevronDown className="h-4 w-4 opacity-90 stroke-[2.4]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="adm-cal-dropdown w-56 text-[#FAF6EC] rounded-xl p-1 z-50"
                >
                  <DropdownMenuItem
                    onClick={() => (onQuickAction ? onQuickAction("NEW_MEETING") : onScheduleClick())}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-[#ECC97B]" />
                    <span>New Appointment</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onQuickAction ? onQuickAction("PROPOSE_3_OPTIONS") : onProposeHoldsClick()
                    }
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

          {/* ── ROW 2: Three Wide Sculpted KPI Capsules (Today | This Week | Tentative Holds) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 px-1 sm:px-4">
            {/* Capsule 1: Today */}
            <button
              type="button"
              onClick={handleToday}
              className="wp-cal-kpi-capsule group cursor-pointer px-5 py-3 flex items-center justify-center relative overflow-hidden active:scale-[0.985]"
            >
              <div className="wp-cal-kpi-ring absolute left-5 h-11 w-11 rounded-full flex items-center justify-center text-[#ECC97B] group-hover:scale-105 transition-transform z-10">
                <CalendarIcon className="h-5 w-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
              </div>
              <div className="relative z-10 flex flex-col items-center justify-center text-center pl-8">
                <div className="font-serif text-[32px] font-bold leading-none tracking-tight tabular-nums text-[#FAF4E4] drop-shadow-[0_3px_8px_rgba(0,0,0,0.88)]">
                  {stats.appointmentsCount}
                </div>
                <div className="font-serif text-[13.5px] text-[#DED2BA] group-hover:text-[#FFF7E2] transition-colors mt-1 leading-none">
                  Today
                </div>
              </div>
            </button>

            {/* Capsule 2: This Week */}
            <button
              type="button"
              onClick={() => onViewModeChange?.("week")}
              className="wp-cal-kpi-capsule group cursor-pointer px-5 py-3 flex items-center justify-center relative overflow-hidden active:scale-[0.985]"
            >
              <div className="wp-cal-kpi-ring absolute left-5 h-11 w-11 rounded-full flex items-center justify-center text-[#ECC97B] group-hover:scale-105 transition-transform z-10">
                <Layers className="h-5 w-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
              </div>
              <div className="relative z-10 flex flex-col items-center justify-center text-center pl-8">
                <div className="font-serif text-[32px] font-bold leading-none tracking-tight tabular-nums text-[#FAF4E4] drop-shadow-[0_3px_8px_rgba(0,0,0,0.88)]">
                  {stats.weekAppointmentsCount ?? stats.appointmentsCount}
                </div>
                <div className="font-serif text-[13.5px] text-[#DED2BA] group-hover:text-[#FFF7E2] transition-colors mt-1 leading-none">
                  This Week
                </div>
              </div>
            </button>

            {/* Capsule 3: Tentative Holds (with glowing amber beacon) */}
            <button
              type="button"
              onClick={onProposeHoldsClick}
              className="wp-cal-kpi-capsule group cursor-pointer px-5 py-3 flex items-center justify-center relative overflow-hidden active:scale-[0.985]"
            >
              <div className="wp-cal-kpi-ring absolute left-5 h-11 w-11 rounded-full flex items-center justify-center text-[#ECC97B] group-hover:scale-105 transition-transform z-10">
                <Hourglass className="h-5 w-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
              </div>
              {stats.holdsCount > 0 && (
                <span
                  aria-label={`${stats.holdsCount} active tentative holds`}
                  className="wp-cal-amber-beacon absolute right-4 top-3.5 h-2.5 w-2.5 rounded-full z-10"
                />
              )}
              <div className="relative z-10 flex flex-col items-center justify-center text-center pl-8">
                <div className="font-serif text-[32px] font-bold leading-none tracking-tight tabular-nums text-[#FAF4E4] drop-shadow-[0_3px_8px_rgba(0,0,0,0.88)]">
                  {stats.holdsCount}
                </div>
                <div className="font-serif text-[13.5px] text-[#DED2BA] group-hover:text-[#FFF7E2] transition-colors mt-1 leading-none">
                  Tentative Holds
                </div>
              </div>
            </button>
          </div>

          {/* ── ROW 3: Carved Mahogany Wood Date Rail with Hanging Riveted Parchment Month Plaque ── */}
          <div className="wp-cal-wood-rail px-3.5 py-2 flex items-center justify-between gap-3 flex-wrap mt-1">
            {/* Left: Today + Twin < > Steppers */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToday}
                className="wp-cal-pill-navy h-8 px-4 rounded-full text-[13px] font-serif font-semibold cursor-pointer active:scale-95"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handlePrevStep}
                className="wp-cal-pill-navy h-8 w-8 rounded-[10px] text-[#ECC97B] hover:text-[#FFF5D6] flex items-center justify-center cursor-pointer active:scale-95"
                title="Previous"
                aria-label="Previous period"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="wp-cal-pill-navy h-8 w-8 rounded-[10px] text-[#ECC97B] hover:text-[#FFF5D6] flex items-center justify-center cursor-pointer active:scale-95"
                title="Next"
                aria-label="Next period"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Center: Photorealistic 3-Slice Hanging Aged-Parchment Month Plaque (Opens Mini Calendar on Click!) */}
            <div className="flex-1 flex items-center justify-center min-w-[230px]">
              <DropdownMenu open={isMiniCalOpen} onOpenChange={setIsMiniCalOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="wp-cal-month-plaque"
                    title="Click to open Quick Date Jumper"
                  >
                    <span className="wp-cal-month-plaque-layers" aria-hidden="true">
                      <span className="wp-cal-month-plaque-left" />
                      <span className="wp-cal-month-plaque-mid" />
                      <span className="wp-cal-month-plaque-right" />
                    </span>
                    <span className="wp-cal-month-plaque-label">{formattedRangeLabel}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="adm-cal-dropdown w-[264px] text-[#FAF6EC] rounded-xl p-2.5 z-50"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#8a7052]/35">
                    <button
                      type="button"
                      onClick={handlePrevMiniMonth}
                      className="adm-cal-pill h-6 w-6 rounded-md text-[#ECC97B] hover:text-[#FAF6EC] flex items-center justify-center cursor-pointer active:scale-95"
                      title="Previous Month"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <div className="font-serif text-xs font-bold text-[#FAF6EC] tracking-wider">
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
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-mono font-semibold text-[#C6B697] py-1.5">
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 text-center">
                    {miniCalDays.map((item, idx) =>
                      item.day === null ? (
                        <div key={`empty-${idx}`} className="h-6 w-6 mx-auto" />
                      ) : (
                        <button
                          key={`day-${item.day}`}
                          type="button"
                          onClick={() => {
                            const next = new Date(
                              miniCalMonth.getFullYear(),
                              miniCalMonth.getMonth(),
                              item.day!
                            );
                            onDateChange(next);
                            setIsMiniCalOpen(false);
                          }}
                          className={cn(
                            "h-6 w-6 rounded text-[11px] font-mono font-medium flex items-center justify-center transition-all cursor-pointer mx-auto",
                            item.isSelected
                              ? "wp-cal-pill-brass font-bold scale-105"
                              : item.isCurrent
                              ? "border border-[#ECC97B] text-[#ECC97B] font-bold hover:bg-[#ECC97B]/15"
                              : "text-[#E8DEC8]/90 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {item.day}
                        </button>
                      )
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right: Unified Day | Week | Month | Agenda Switcher */}
            <div className="wp-cal-view-track inline-flex items-center p-[2px] shrink-0">
              {(["day", "week", "month", "agenda"] as const).map((mode, idx) => {
                const isActive = viewMode === mode;
                const label = mode.charAt(0).toUpperCase() + mode.slice(1);
                return (
                  <React.Fragment key={mode}>
                    {idx > 0 && !isActive && viewMode !== (["day", "week", "month", "agenda"] as const)[idx - 1] && (
                      <span aria-hidden="true" className="w-[1px] h-4 bg-[#b48a48]/35" />
                    )}
                    <button
                      type="button"
                      onClick={() => onViewModeChange?.(mode)}
                      className={cn(
                        "h-[30px] px-3.5 text-[13px] font-serif rounded-[10px] transition-all cursor-pointer whitespace-nowrap",
                        isActive
                          ? "wp-cal-pill-brass font-bold"
                          : "font-medium text-[#E8DFC8] hover:text-[#FFF8E6] hover:bg-white/[0.06]"
                      )}
                    >
                      {label}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ── ROW 4: Advocate Selector + Glossy 3D Spherical Orb Legend Bar + Layer Settings Gear ── */}
          <div className="flex items-center justify-between gap-2.5 flex-wrap lg:flex-nowrap">
            {/* Left: All Advocates Selector */}
            <Select
              value={normalizedAdvocateValue}
              onValueChange={(val) => onAdvocateFilterChange?.(val)}
            >
              <SelectTrigger className="wp-cal-pill-navy h-9 text-[13px] font-serif font-semibold text-[#FAF3E2] rounded-full px-4 min-w-[168px] w-auto shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <Users className="h-3.5 w-3.5 text-[#ECC97B] shrink-0" />
                  <span className="truncate">
                    {normalizedAdvocateValue === "all" ? "All Advocates" : normalizedAdvocateValue}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="adm-cal-dropdown text-[#FAF6EC] rounded-xl z-50">
                <SelectItem value="all">All Advocates</SelectItem>
                {advocateList.map((adv) => (
                  <SelectItem key={adv.id} value={adv.name}>
                    {adv.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Center: Glossy 3D Glass/Enamel Orb Legend Pill Bar (Click any orb to filter calendar live!) */}
            <div className="wp-cal-pill-navy flex-1 min-w-0 rounded-full px-4 h-9 flex items-center justify-around gap-2 overflow-x-auto scrollbar-none">
              {CALENDAR_ORB_CATEGORIES.map((cat) => {
                const isSelected = activeCategoryFilter === cat.key;
                const isDimmed = Boolean(activeCategoryFilter && !isSelected);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() =>
                      onCategoryFilterChange?.(isSelected ? null : cat.key)
                    }
                    className={cn(
                      "inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-[12.5px] font-serif whitespace-nowrap transition-all cursor-pointer shrink-0",
                      isSelected
                        ? "bg-[#DFBE77]/20 text-[#FFF8E4] ring-1 ring-[#ECC97B]/80 font-bold"
                        : isDimmed
                        ? "text-[#C6B89D]/55 hover:text-[#FAF3E2]"
                        : "text-[#EFE6D2] hover:text-[#FFFFFF]"
                    )}
                    title={
                      isSelected
                        ? `Showing ${cat.label} — click to show all`
                        : `Filter calendar by ${cat.label}`
                    }
                  >
                    <span className={cn("wp-cal-orb", cat.orbClass)} aria-hidden="true" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Layer & Calendar Settings Gear Button */}
            <DropdownMenu open={isLayerMenuOpen} onOpenChange={setIsLayerMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="wp-cal-pill-navy h-9 w-10 rounded-full text-[#ECC97B] hover:text-[#FFF6DC] flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                  title="Calendar Layer Filters & Display Settings"
                  aria-label="Calendar Layer Filters"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="adm-cal-dropdown w-56 text-[#FAF6EC] rounded-xl p-2 space-y-1 z-50"
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
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left cursor-pointer"
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
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left cursor-pointer"
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
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left cursor-pointer"
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
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left cursor-pointer"
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
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <span>Internal Work</span>
                      {layerFilters.showInternalEvents && <Check className="h-3.5 w-3.5 text-purple-400" />}
                    </button>
                    <div className="border-t border-white/10 my-1" />
                    {onToggleShowWeekends && (
                      <button
                        type="button"
                        onClick={() => onToggleShowWeekends(!showWeekends)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <span>Show Weekends</span>
                        {showWeekends && <Check className="h-3.5 w-3.5 text-[#ECC97B]" />}
                      </button>
                    )}
                    {onToggleShowCanceled && (
                      <button
                        type="button"
                        onClick={() => onToggleShowCanceled(!showCanceled)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <span>Show Canceled</span>
                        {showCanceled && <Check className="h-3.5 w-3.5 text-[#ECC97B]" />}
                      </button>
                    )}
                    {onToggleLegend && (
                      <button
                        type="button"
                        onClick={onToggleLegend}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <span>Extended Pattern Key</span>
                        {isLegendOpen && <Check className="h-3.5 w-3.5 text-[#ECC97B]" />}
                      </button>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

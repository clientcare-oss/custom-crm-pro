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
  viewMode = "week",
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
    <header
      className="relative w-full border-b-2 border-[#5B4323] shadow-[0_14px_34px_rgba(0,0,0,0.85)] overflow-hidden bg-[#041022] select-none"
      style={{
        backgroundImage: "url('/images/calendar-body-wood.png')",
        backgroundRepeat: "repeat-y",
        backgroundSize: "100% auto",
        backgroundPosition: "top center",
      }}
    >
      {/* ── Top Shelf Canopy Artwork (Natural 16:9 width-locked at top; excess bottom planks clipped automatically by header height) ── */}
      <img
        src="/images/calendar-header-shelf.png"
        alt="PG-007 Appointments & Calendar Shelf Canopy"
        width={1024}
        height={576}
        className="w-full h-auto absolute top-0 left-0 right-0 object-cover object-top block select-none pointer-events-none"
      />

      {/* ── 1. TOP SHELF CANOPY ZONE (Matches exact 27.2% shelf rail height of the 16:9 image) ── */}
      <div
        className="relative w-full z-20 pointer-events-auto min-h-[100px] sm:min-h-[118px]"
        style={{ aspectRatio: "16 / 2.45" }}
      >
        {/* Centered Title inside the carved gold-leaf wooden plaque */}
        <div
          className="absolute flex flex-col items-center justify-center text-center px-4"
          style={{
            top: "49%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "33.6%",
            minWidth: "260px",
            maxWidth: "420px",
          }}
        >
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight text-[#FFF4D4] drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)] leading-tight select-none">
            Calendar
          </h1>
          <p className="hidden sm:block text-[11px] sm:text-xs font-serif italic text-[#FFE394]/90 tracking-wide mt-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] select-none truncate max-w-full">
            Schedule smarter. Protect your time.
          </p>
        </div>
      </div>

      {/* ── 2. UNIFIED CONTROLS DECK (Compact full-width 3-tier deck with collapsible Mini Calendar & Schedule Key) ── */}
      <div className="relative z-10 max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-7 pt-1 pb-3">
        <div className="flex flex-col gap-2">
          {/* ── TIER 1: Navigation Pill Strip & Primary Schedule Trigger ── */}
          <div className="flex items-center justify-between gap-2.5 flex-wrap shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto max-w-full scrollbar-none">
              {/* Primary View: Calendar */}
              <button
                type="button"
                onClick={() => {
                  onNavTabChange("calendar");
                  onScopeChange?.("all");
                  onAdvocateFilterChange?.("all");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                  activeNavTab === "calendar" && scope === "all"
                    ? "border border-[#FFE394]/80 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                    : "border border-[#C5A059]/35 bg-[#071A36]/92 text-[#EAD8B1] hover:bg-[#0C254A] hover:text-[#FFF4D4] hover:border-[#C5A059]/70 shadow-sm backdrop-blur-sm"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>Calendar</span>
              </button>

              {/* Session Types (Scheduler Tool) */}
              <button
                type="button"
                onClick={() => {
                  onNavTabChange(activeNavTab === "session-types" ? "calendar" : "session-types");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                  activeNavTab === "session-types"
                    ? "border border-[#FFE394]/80 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                    : "border border-[#C5A059]/35 bg-[#071A36]/92 text-[#EAD8B1] hover:bg-[#0C254A] hover:text-[#FFF4D4] hover:border-[#C5A059]/70 shadow-sm backdrop-blur-sm"
                )}
                title="Configure Session Types & Durations (1:1 Advocate 1 hr, IEP 3 hrs, etc.)"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Session Types</span>
              </button>

              {/* Active Sub-Console Pill (if on dispatch) */}
              {activeNavTab === "dispatch" && (
                <button
                  type="button"
                  onClick={() => onNavTabChange("calendar")}
                  className="flex items-center gap-1.5 rounded-xl border border-[#FFE394]/80 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] px-3.5 py-1.5 text-xs font-serif font-bold text-[#07162B] shadow-md transition-all cursor-pointer whitespace-nowrap"
                  title="Click to return to Calendar"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#07162B]" />
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
                      "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm backdrop-blur-sm",
                      scope === "my" || activeNavTab === "requests" || activeNavTab === "availability" || activeNavTab === "closures"
                        ? "border border-[#FFE394]/80 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                        : "border border-[#C5A059]/35 bg-[#071A36]/92 text-[#EAD8B1] hover:bg-[#0C254A] hover:text-[#FFF4D4] hover:border-[#C5A059]/70"
                    )}
                  >
                    <Filter className="h-3.5 w-3.5 text-[#C5A059]" />
                    <span>Filter & Views</span>
                    {scope === "my" && (
                      <span className="rounded bg-[#07162B]/90 px-1.5 py-0.5 text-[9px] font-mono text-[#FFE394] font-semibold border border-[#C5A059]/40">
                        My Schedule
                      </span>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-64 bg-[#071A36] border border-[#C5A059]/45 text-[#FFF4D4] shadow-2xl rounded-xl p-2 space-y-1"
                >
                  <div className="text-[10px] font-mono text-[#FFE394] uppercase tracking-wider px-2 py-1 font-bold border-b border-white/10">
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
                      <Users className="h-3.5 w-3.5 text-[#C5A059]" />
                      <span>Team Schedule (All Staff)</span>
                    </div>
                    {scope === "all" && activeNavTab === "calendar" && (
                      <Check className="h-3.5 w-3.5 text-[#FFE394]" />
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
                      <CalendarIcon className="h-3.5 w-3.5 text-[#C5A059]" />
                      <span>My Schedule (Byron)</span>
                    </div>
                    {scope === "my" && activeNavTab === "calendar" && (
                      <Check className="h-3.5 w-3.5 text-[#FFE394]" />
                    )}
                  </DropdownMenuItem>

                  <div className="text-[10px] font-mono text-[#FFE394] uppercase tracking-wider px-2 pt-2 pb-1 font-bold border-t border-b border-white/10 mt-1">
                    Desks & Consoles
                  </div>
                  <DropdownMenuItem
                    onClick={() => onNavTabChange("dispatch")}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center justify-between p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#DFBE77]" />
                      <span>Schedule Dispatch Desk</span>
                    </div>
                    {activeNavTab === "dispatch" && (
                      <Check className="h-3.5 w-3.5 text-[#FFE394]" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onNavTabChange("session-types")}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center justify-between p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-[#C5A059]" />
                      <span>Session Types (PG-008)</span>
                    </div>
                    {activeNavTab === "session-types" && (
                      <Check className="h-3.5 w-3.5 text-[#FFE394]" />
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
                      <Briefcase className="h-3.5 w-3.5 text-[#C5A059]" />
                      <span>Scheduling Requests</span>
                    </div>
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-mono font-extrabold text-white shadow-sm">
                      {stats.pendingRequestsCount || 3}
                    </span>
                  </DropdownMenuItem>

                  <div className="text-[10px] font-mono text-[#FFE394] uppercase tracking-wider px-2 pt-2 pb-1 font-bold border-t border-b border-white/10 mt-1">
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
                    className="inline-flex items-center gap-2 rounded-xl border border-[#FFE394]/80 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] px-4 py-1.5 text-xs font-bold text-[#07162B] shadow-[0_4px_16px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.5)] transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Schedule</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-[#071A36] border border-[#C5A059]/50 text-[#FFF4D4] shadow-2xl rounded-xl p-1"
                >
                  <DropdownMenuItem
                    onClick={() => (onQuickAction ? onQuickAction("NEW_MEETING") : onScheduleClick())}
                    className="cursor-pointer text-xs font-medium focus:bg-white/10 flex items-center gap-2 p-2 rounded-lg"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-amber-400" />
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

          {/* ── TIER 2: 5 Admiralty KPI Cards (Full Width, Clean: Icon + Number + Title only) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* Card 1: Today */}
            <button
              type="button"
              onClick={handleToday}
              className="rounded-xl border border-[#C5A059]/35 bg-[#071A36]/92 backdrop-blur-md px-3 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:border-[#FFE394]/75 hover:bg-[#0B2347] transition-all flex flex-col justify-center text-left cursor-pointer group select-none active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E40AF] to-[#2563EB] text-white shadow-md border border-blue-400/40 group-hover:scale-105 transition-transform">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div className="font-serif text-xl sm:text-2xl font-bold leading-none text-[#FFF4D4]">
                  {stats.appointmentsCount || 5}
                </div>
              </div>
              <div className="text-[11px] sm:text-xs text-[#C6B697] font-medium tracking-wide mt-1.5 truncate group-hover:text-[#FFF4D4] transition-colors">
                Today
              </div>
            </button>

            {/* Card 2: This Week */}
            <button
              type="button"
              onClick={() => onViewModeChange?.("week")}
              className="rounded-xl border border-[#C5A059]/35 bg-[#071A36]/92 backdrop-blur-md px-3 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:border-[#FFE394]/75 hover:bg-[#0B2347] transition-all flex flex-col justify-center text-left cursor-pointer group select-none active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#B45309] to-[#D97706] text-white shadow-md border border-amber-400/40 group-hover:scale-105 transition-transform">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div className="font-serif text-xl sm:text-2xl font-bold leading-none text-[#FFF4D4]">
                  {stats.weekAppointmentsCount || 10}
                </div>
              </div>
              <div className="text-[11px] sm:text-xs text-[#C6B697] font-medium tracking-wide mt-1.5 truncate group-hover:text-[#FFF4D4] transition-colors">
                This Week
              </div>
            </button>

            {/* Card 3: Tentative Holds */}
            <button
              type="button"
              onClick={onProposeHoldsClick}
              className="rounded-xl border border-[#C5A059]/35 bg-[#071A36]/92 backdrop-blur-md px-3 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:border-[#FFE394]/75 hover:bg-[#0B2347] transition-all flex flex-col justify-center text-left cursor-pointer group select-none active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#78350F] to-[#92400E] text-[#FFE394] shadow-md border border-[#C5A059]/45 group-hover:scale-105 transition-transform">
                  <Hourglass className="h-4 w-4" />
                </div>
                <div className="font-serif text-xl sm:text-2xl font-bold leading-none text-amber-300">
                  {stats.holdsCount || 3}
                </div>
              </div>
              <div className="text-[11px] sm:text-xs text-[#C6B697] font-medium tracking-wide mt-1.5 truncate group-hover:text-[#FFE394] transition-colors">
                Tentative Holds
              </div>
            </button>

            {/* Card 4: Callbacks */}
            <button
              type="button"
              onClick={() => (onQuickAction ? onQuickAction("PARENT_CALL") : onScheduleClick())}
              className="rounded-xl border border-[#C5A059]/35 bg-[#071A36]/92 backdrop-blur-md px-3 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:border-[#FFE394]/75 hover:bg-[#0B2347] transition-all flex flex-col justify-center text-left cursor-pointer group select-none active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#065F46] to-[#059669] text-[#6EE7B7] shadow-md border border-emerald-400/40 group-hover:scale-105 transition-transform">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="font-serif text-xl sm:text-2xl font-bold leading-none text-emerald-300">
                  {stats.callbacksCount || 2}
                </div>
              </div>
              <div className="text-[11px] sm:text-xs text-[#C6B697] font-medium tracking-wide mt-1.5 truncate group-hover:text-emerald-200 transition-colors">
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
              className="rounded-xl border border-[#C5A059]/35 bg-[#071A36]/92 backdrop-blur-md px-3 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:border-[#FFE394]/75 hover:bg-[#0B2347] transition-all flex flex-col justify-center text-left cursor-pointer group select-none active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#4C1D95] to-[#6D28D9] text-[#C4B5FD] shadow-md border border-purple-400/40 group-hover:scale-105 transition-transform">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <div className="font-serif text-xl sm:text-2xl font-bold leading-none text-purple-300">
                  {stats.tasksCount || 4}
                </div>
              </div>
              <div className="text-[11px] sm:text-xs text-[#C6B697] font-medium tracking-wide mt-1.5 truncate group-hover:text-purple-200 transition-colors">
                Tasks Due
              </div>
            </button>
          </div>

          {/* ── TIER 3: Single-Line Unified Date, View Mode, Collapsible Key & Mini-Calendar Command Bar ── */}
          <div className="rounded-xl border border-[#C5A059]/35 bg-[#071A36]/92 backdrop-blur-md px-3 py-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-between gap-2.5 flex-wrap shrink-0">
            {/* Left Group: Today Jump + Stepper Chevrons + Date Range + Collapsible Mini Calendar Trigger */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded-lg border border-[#C5A059]/40 bg-[#041022]/90 text-xs font-semibold text-[#EAD8B1] hover:text-[#FFF4D4] hover:border-[#FFE394]/70 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Today
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="h-7 w-7 rounded-lg border border-[#C5A059]/40 bg-[#041022]/90 text-[#EAD8B1] hover:text-[#FFF4D4] hover:border-[#FFE394]/70 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Previous"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="h-7 w-7 rounded-lg border border-[#C5A059]/40 bg-[#041022]/90 text-[#EAD8B1] hover:text-[#FFF4D4] hover:border-[#FFE394]/70 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Next"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="font-serif text-sm sm:text-base font-bold text-[#FFF4D4] px-1 whitespace-nowrap drop-shadow-sm">
                {formattedRangeLabel}
              </div>

              {/* Collapsible Mini-Calendar Popover Dropdown (Takes 0 vertical header room when collapsed) */}
              <DropdownMenu open={isMiniCalOpen} onOpenChange={setIsMiniCalOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-sm",
                      isMiniCalOpen
                        ? "border-[#FFE394]/80 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold"
                        : "border-[#C5A059]/40 bg-[#041022]/90 text-[#EAD8B1] hover:text-[#FFF4D4] hover:border-[#FFE394]/70"
                    )}
                    title="Toggle Mini Month Calendar"
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Mini Cal</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", isMiniCalOpen && "rotate-180")} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[260px] bg-[#071A36] border border-[#C5A059]/60 text-[#FFF4D4] shadow-2xl rounded-xl p-2.5 z-50"
                >
                  {/* Calendar Widget Month Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#C5A059]/25">
                    <button
                      type="button"
                      onClick={handlePrevMiniMonth}
                      className="h-6 w-6 rounded-md border border-[#C5A059]/35 bg-[#041022]/90 text-[#EAD8B1] hover:text-[#FFF4D4] hover:border-[#FFE394]/70 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Previous Month"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <div className="font-serif text-xs font-bold text-[#FFF4D4] tracking-wider drop-shadow-sm">
                      {miniMonthYearLabel}
                    </div>
                    <button
                      type="button"
                      onClick={handleNextMiniMonth}
                      className="h-6 w-6 rounded-md border border-[#C5A059]/35 bg-[#041022]/90 text-[#EAD8B1] hover:text-[#FFF4D4] hover:border-[#FFE394]/70 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Next Month"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-mono font-semibold text-[#C6B697] py-1">
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
                              ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md scale-105"
                              : item.isCurrent
                              ? "border border-[#FFE394] text-[#FFE394] font-bold hover:bg-[#FFE394]/15"
                              : "text-[#FFF4D4]/85 hover:bg-white/10 hover:text-white"
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
              <div className="flex items-center p-0.5 rounded-lg bg-[#041022]/95 border border-[#C5A059]/35">
                <button
                  type="button"
                  onClick={() => onViewModeChange?.("day")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    viewMode === "day"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-sm"
                      : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/5"
                  )}
                >
                  Day
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange?.("week")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    viewMode === "week"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-sm"
                      : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/5"
                  )}
                >
                  Week
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange?.("month")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    viewMode === "month"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-sm"
                      : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/5"
                  )}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange?.("agenda")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    viewMode === "agenda"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-sm"
                      : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/5"
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
                <SelectTrigger className="h-7 text-xs bg-[#041022]/90 border-[#C5A059]/40 text-[#FFF4D4] hover:border-[#FFE394]/70 rounded-lg px-2.5 min-w-[135px] font-medium shadow-sm">
                  <div className="flex items-center gap-1.5 truncate">
                    <Users className="h-3 w-3 text-[#DFBE77] shrink-0" />
                    <span className="truncate">
                      {normalizedAdvocateValue === "all" ? "All Advocates" : normalizedAdvocateValue}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#071A36] border-[#C5A059]/60 text-[#FFF4D4]">
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
                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-sm",
                    isLegendOpen
                      ? "border-[#FFE394]/80 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold"
                      : "border-[#C5A059]/40 bg-[#041022]/90 text-[#EAD8B1] hover:text-[#FFF4D4] hover:border-[#FFE394]/70"
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
                    className="h-7 w-7 rounded-lg border border-[#C5A059]/40 bg-[#041022]/90 text-[#EAD8B1] hover:text-[#FFF4D4] hover:border-[#FFE394]/70 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Calendar Layer Filters"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-[#071A36] border border-[#C5A059]/60 text-[#FFF4D4] shadow-2xl rounded-xl p-2 space-y-1"
                >
                  <div className="text-[10px] font-mono text-[#FFE394] uppercase tracking-wider px-2 py-1 font-bold border-b border-white/10">
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
                          {showWeekends && <Check className="h-3.5 w-3.5 text-[#C5A059]" />}
                        </button>
                      )}
                      {onToggleShowCanceled && (
                        <button
                          type="button"
                          onClick={() => onToggleShowCanceled(!showCanceled)}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-white/10 transition-colors text-left"
                        >
                          <span>Show Canceled</span>
                          {showCanceled && <Check className="h-3.5 w-3.5 text-[#C5A059]" />}
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

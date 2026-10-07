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
  Compass,
  Settings,
  Users,
  Hourglass,
  ArrowRight,
  Check,
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
  onScheduleClick,
  onProposeHoldsClick,
  onOpenClosuresClick,
  onOpenAvailabilityClick,
  onQuickAction,
}: CalendarConsoleHeaderProps) {
  // Mini calendar month state
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(() => new Date(currentDate));
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

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

  return (
    <header className="relative w-full border-b-2 border-[#5B4323] shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden bg-[#030914] select-none">
      {/* ── Full Picture Background Canopy (100% visible, natural aspect ratio, 0px cut off, not behind sidebar or rightbar) ── */}
      <img
        src="/images/calendar-header-shelf.png"
        alt="PG-007 Appointments & Calendar Shelf Canopy"
        className="w-full h-auto block select-none pointer-events-none"
      />

      {/* ── Interactive UI Overlay (Aligned with precision over the full picture) ── */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between px-3 sm:px-5 lg:px-7 py-2 sm:py-3 pointer-events-none">
        {/* ── 1. UPPER SHELF (Top ~25%): Centered Carved Plaque in brass frame + Right Parchment Note ── */}
        <div className="relative flex items-center justify-between pointer-events-auto" style={{ height: "25%" }}>
          {/* Left Decorative Waypoint Compass Badge */}
          <div className="hidden lg:flex items-center gap-3 w-56 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-[#8C6D37]/70 bg-[#020A17]/85 backdrop-blur-sm shadow-[0_4px_14px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.12)]">
              <Compass className="h-5 w-5 text-[#E5B558] animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#FFE394] font-bold drop-shadow">
                Waypoint
              </span>
              <span className="text-[9px] font-mono text-[#C6B697]/80 uppercase tracking-widest">
                Advocates CRM
              </span>
            </div>
          </div>

          {/* Central Carved Gold-Leaf Plaque (Positions directly inside the framed wooden sign in artwork) */}
          <div className="flex-1 max-w-xl mx-auto text-center px-4 py-1 rounded-xl">
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight text-[#FFF4D4] drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)]">
              Calendar
            </h1>
            <p className="text-[11px] sm:text-xs font-serif italic text-[#FFE394]/95 tracking-wide mt-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
              Schedule smarter. Keep cases moving. Protect your time.
            </p>
          </div>

          {/* Right Hanging Parchment Note (Matches reference mockup) */}
          <div className="hidden lg:flex items-center justify-end w-56 shrink-0">
            <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-b from-[#F7EED4] via-[#F2E5C4] to-[#E5D4AF] border border-[#8C6D37]/80 shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.7)] text-center max-w-[190px] transform rotate-[1deg] hover:rotate-0 transition-transform">
              <p className="font-serif italic text-xs font-bold text-[#2C1D10] leading-snug drop-shadow-sm select-none">
                “Right Meetings<br />
                Right People<br />
                Brighter Futures”
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. NAVIGATION TAB STRIP (Middle ~9%): Directly below wooden shelf rail ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap pointer-events-auto" style={{ height: "9%" }}>
          {/* Navigation Pill Group */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {/* Tab 1: Calendar (Active by default) */}
            <button
              type="button"
              onClick={() => onNavTabChange("calendar")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                activeNavTab === "calendar"
                  ? "border border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                  : "border border-[#193B66]/70 bg-[#061730]/75 text-[#D8C7A5] hover:bg-[#0A2244] hover:text-[#FFF4D4] shadow-sm backdrop-blur-sm"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </button>

            {/* Tab 1b: Schedule Dispatch (PG-007 Dispatch Desk) */}
            <button
              type="button"
              onClick={() => onNavTabChange("dispatch")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                activeNavTab === "dispatch"
                  ? "border border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                  : "border border-[#193B66]/70 bg-[#061730]/75 text-[#D8C7A5] hover:bg-[#0A2244] hover:text-[#FFF4D4] shadow-sm backdrop-blur-sm"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#DFBE77]" />
              <span>Schedule Dispatch</span>
            </button>

            {/* Tab 2: Session Types (PG-008) */}
            <button
              type="button"
              onClick={() => onNavTabChange("session-types")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                activeNavTab === "session-types"
                  ? "border border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                  : "border border-[#193B66]/70 bg-[#061730]/75 text-[#D8C7A5] hover:bg-[#0A2244] hover:text-[#FFF4D4] shadow-sm backdrop-blur-sm"
              )}
            >
              <Clock className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>Session Types</span>
            </button>

            {/* Tab 3: My Schedule */}
            <button
              type="button"
              onClick={() => {
                onNavTabChange("calendar");
                onScopeChange?.("my");
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                scope === "my" && activeNavTab === "calendar"
                  ? "border border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                  : "border border-[#193B66]/70 bg-[#061730]/75 text-[#D8C7A5] hover:bg-[#0A2244] hover:text-[#FFF4D4] shadow-sm backdrop-blur-sm"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>My Schedule</span>
            </button>

            {/* Tab 4: Team Schedule */}
            <button
              type="button"
              onClick={() => {
                onNavTabChange("calendar");
                onScopeChange?.("all");
                onAdvocateFilterChange?.("ALL");
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                scope === "all" && activeNavTab === "calendar" && selectedAdvocateFilter === "ALL"
                  ? "border border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                  : "border border-[#193B66]/70 bg-[#061730]/75 text-[#D8C7A5] hover:bg-[#0A2244] hover:text-[#FFF4D4] shadow-sm backdrop-blur-sm"
              )}
            >
              <Users className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>Team Schedule</span>
            </button>

            {/* Tab 5: Scheduling Requests */}
            <button
              type="button"
              onClick={() => {
                onNavTabChange("requests");
                const el = document.getElementById("bottom-console-anchor");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                activeNavTab === "requests"
                  ? "border border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                  : "border border-[#193B66]/70 bg-[#061730]/75 text-[#D8C7A5] hover:bg-[#0A2244] hover:text-[#FFF4D4] shadow-sm backdrop-blur-sm"
              )}
            >
              <Briefcase className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>Scheduling Requests</span>
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-mono font-extrabold text-white shadow-sm">
                {stats.pendingRequestsCount || 3}
              </span>
            </button>

            {/* Tab 6: Availability & Time Blocks */}
            <button
              type="button"
              onClick={() => {
                onNavTabChange("availability");
                onOpenAvailabilityClick?.();
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                activeNavTab === "availability"
                  ? "border border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                  : "border border-[#193B66]/70 bg-[#061730]/75 text-[#D8C7A5] hover:bg-[#0A2244] hover:text-[#FFF4D4] shadow-sm backdrop-blur-sm"
              )}
            >
              <Clock className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>Availability & Time Blocks</span>
            </button>

            {/* Tab 7: Holidays & Closures */}
            <button
              type="button"
              onClick={() => {
                onNavTabChange("closures");
                onOpenClosuresClick?.();
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                activeNavTab === "closures"
                  ? "border border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
                  : "border border-[#193B66]/70 bg-[#061730]/75 text-[#D8C7A5] hover:bg-[#0A2244] hover:text-[#FFF4D4] shadow-sm backdrop-blur-sm"
              )}
            >
              <Building2 className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>Holidays & Closures</span>
            </button>
          </div>

          {/* Right: + Schedule Dropdown Button */}
          <div className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#FFE394]/80 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] px-4 py-2 text-xs font-bold text-[#07162B] shadow-[0_4px_16px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.5)] transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Schedule</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#07162B] border border-[#8C6D37]/70 text-[#FFF4D4] shadow-2xl rounded-xl p-1"
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

        {/* ── 3. LOWER SHIPLAP DECK (Bottom ~64%): 5 KPI Cards (Left) + Integrated Month Calendar Widget (Right) ── */}
        <div className="flex flex-col lg:flex-row items-stretch gap-2.5 pointer-events-auto" style={{ height: "64%" }}>
          {/* ── Left Column: KPI Cards + Bottom Range / View Control Bar ── */}
          <div className="flex-1 flex flex-col justify-between gap-2 min-w-0">
            {/* Row of 5 KPI Cards (Glassmorphic so blue shiplap wood planks show through) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {/* Card 1: Today */}
              <div className="rounded-2xl border border-[#193B66]/80 bg-[#061730]/60 backdrop-blur-md p-3 shadow-[0_8px_20px_rgba(0,0,0,0.65)] hover:border-[#C5A059]/60 hover:bg-[#061730]/75 transition-all flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-2xl lg:text-3xl font-bold leading-none text-white">
                    {stats.appointmentsCount || 5}
                  </div>
                  <div className="text-xs text-[#C6B697] font-medium mt-0.5">
                    Today
                  </div>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="text-[11px] font-medium text-[#FFE394] hover:text-white underline transition-colors mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View now</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Card 2: This Week */}
              <div className="rounded-2xl border border-[#193B66]/80 bg-[#061730]/60 backdrop-blur-md p-3 shadow-[0_8px_20px_rgba(0,0,0,0.65)] hover:border-[#C5A059]/60 hover:bg-[#061730]/75 transition-all flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-2xl lg:text-3xl font-bold leading-none text-white">
                    {stats.weekAppointmentsCount || 10}
                  </div>
                  <div className="text-xs text-[#C6B697] font-medium mt-0.5">
                    This Week
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewModeChange?.("week")}
                    className="text-[11px] font-medium text-[#FFE394] hover:text-white underline transition-colors mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View week</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Tentative Holds */}
              <div className="rounded-2xl border border-[#193B66]/80 bg-[#061730]/60 backdrop-blur-md p-3 shadow-[0_8px_20px_rgba(0,0,0,0.65)] hover:border-[#C5A059]/60 hover:bg-[#061730]/75 transition-all flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600/30 to-amber-900/50 border border-amber-500/50 text-amber-300 shadow-md">
                  <Hourglass className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-2xl lg:text-3xl font-bold leading-none text-amber-300">
                    {stats.holdsCount || 3}
                  </div>
                  <div className="text-xs text-[#C6B697] font-medium mt-0.5">
                    Tentative Holds
                  </div>
                  <button
                    type="button"
                    onClick={onProposeHoldsClick}
                    className="text-[11px] font-medium text-[#FFE394] hover:text-white underline transition-colors mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Review</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Card 4: Callbacks */}
              <div className="rounded-2xl border border-[#193B66]/80 bg-[#061730]/60 backdrop-blur-md p-3 shadow-[0_8px_20px_rgba(0,0,0,0.65)] hover:border-[#C5A059]/60 hover:bg-[#061730]/75 transition-all flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600/30 to-emerald-900/50 border border-emerald-500/50 text-emerald-300 shadow-md">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-2xl lg:text-3xl font-bold leading-none text-emerald-300">
                    {stats.callbacksCount || 2}
                  </div>
                  <div className="text-xs text-[#C6B697] font-medium mt-0.5">
                    Callbacks
                  </div>
                  <button
                    type="button"
                    onClick={() => (onQuickAction ? onQuickAction("PARENT_CALL") : onScheduleClick())}
                    className="text-[11px] font-medium text-[#FFE394] hover:text-white underline transition-colors mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* Card 5: Tasks Due */}
              <div className="rounded-2xl border border-[#193B66]/80 bg-[#061730]/60 backdrop-blur-md p-3 shadow-[0_8px_20px_rgba(0,0,0,0.65)] hover:border-[#C5A059]/60 hover:bg-[#061730]/75 transition-all flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/40 border border-amber-400/50 text-amber-300 shadow-md">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-2xl lg:text-3xl font-bold leading-none text-purple-300">
                    {stats.tasksCount || 4}
                  </div>
                  <div className="text-xs text-[#C6B697] font-medium mt-0.5">
                    Tasks Due
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("bottom-console-anchor");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-[11px] font-medium text-[#FFE394] hover:text-white underline transition-colors mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row under KPI cards: Date Range + View Mode Pills + Advocate Selector */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              {/* Left Group: Today + Chevrons + Date Range */}
              <div className="rounded-xl border border-[#193B66]/80 bg-[#061730]/65 backdrop-blur-md p-1.5 flex items-center gap-2 shadow-lg">
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1 rounded-lg border border-[#1C3A60] bg-[#0A2244]/80 text-xs font-semibold text-[#D8C7A5] hover:text-white hover:border-[#C5A059] transition-all cursor-pointer"
                >
                  Today
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="h-7 w-7 rounded-lg border border-[#1C3A60] bg-[#0A2244]/80 text-[#D8C7A5] hover:text-white hover:border-[#C5A059] flex items-center justify-center transition-all cursor-pointer"
                    title="Previous"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="h-7 w-7 rounded-lg border border-[#1C3A60] bg-[#0A2244]/80 text-[#D8C7A5] hover:text-white hover:border-[#C5A059] flex items-center justify-center transition-all cursor-pointer"
                    title="Next"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="font-serif text-sm lg:text-base font-bold text-[#FFF4D4] px-2 whitespace-nowrap">
                  {formattedRangeLabel}
                </div>
              </div>

              {/* Right Group: Day / Week / Month / Agenda + Advocate Dropdown + Settings Gear */}
              <div className="rounded-xl border border-[#193B66]/80 bg-[#061730]/65 backdrop-blur-md p-1.5 flex items-center gap-2 shadow-lg flex-wrap">
                {/* View Mode Buttons */}
                <div className="flex items-center gap-0.5 bg-[#030E1F]/80 p-0.5 rounded-lg border border-[#1C3A60]/60">
                  <button
                    type="button"
                    onClick={() => onViewModeChange?.("day")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                      viewMode === "day"
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-sm font-bold"
                        : "text-[#C6B697] hover:text-white hover:bg-white/5"
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
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-sm font-bold"
                        : "text-[#C6B697] hover:text-white hover:bg-white/5"
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
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-sm font-bold"
                        : "text-[#C6B697] hover:text-white hover:bg-white/5"
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
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-sm font-bold"
                        : "text-[#C6B697] hover:text-white hover:bg-white/5"
                    )}
                  >
                    Agenda
                  </button>
                </div>

                {/* Advocate Selector Dropdown */}
                {advocateList.length > 0 && (
                  <Select
                    value={selectedAdvocateFilter}
                    onValueChange={(val) => onAdvocateFilterChange?.(val)}
                  >
                    <SelectTrigger className="h-7 text-xs bg-[#0A2244]/90 border-[#1C3A60] text-[#FFF4D4] rounded-lg px-2.5 min-w-[130px] font-medium">
                      <SelectValue placeholder="All Advocates" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#07162B] border-[#8C6D37]/70 text-[#FFF4D4]">
                      <SelectItem value="ALL">All Advocates</SelectItem>
                      {advocateList.map((adv) => (
                        <SelectItem key={adv.id} value={adv.name}>
                          {adv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Layer Settings Gear Modal / Dropdown */}
                <DropdownMenu open={isLayerMenuOpen} onOpenChange={setIsLayerMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-7 w-7 rounded-lg border border-[#1C3A60] bg-[#0A2244]/90 text-[#D8C7A5] hover:text-amber-300 hover:border-[#C5A059] flex items-center justify-center transition-all cursor-pointer"
                      title="Calendar Layer Filters"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-[#07162B] border border-[#8C6D37]/70 text-[#FFF4D4] shadow-2xl rounded-xl p-2 space-y-1"
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

          {/* ── Right Column: Integrated Month Calendar Widget (Matches mockup right widget) ── */}
          <div className="w-[230px] sm:w-[250px] lg:w-[265px] shrink-0 rounded-2xl border border-[#193B66]/80 bg-[#061730]/65 backdrop-blur-md p-2 sm:p-2.5 shadow-xl flex flex-col justify-between">
            {/* Calendar Widget Month Header */}
            <div className="flex items-center justify-between mb-1">
              <button
                type="button"
                onClick={handlePrevMiniMonth}
                className="h-5 w-5 rounded border border-[#1C3A60] bg-[#0A2244]/80 text-[#D8C7A5] hover:text-white hover:border-[#C5A059] flex items-center justify-center transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <div className="font-serif text-xs font-bold text-[#FFF4D4] tracking-wide">
                {miniMonthYearLabel}
              </div>
              <button
                type="button"
                onClick={handleNextMiniMonth}
                className="h-5 w-5 rounded border border-[#1C3A60] bg-[#0A2244]/80 text-[#D8C7A5] hover:text-white hover:border-[#C5A059] flex items-center justify-center transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-mono text-[#A69371] mb-0.5">
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
                  return <div key={`empty-${idx}`} className="h-5 w-5 sm:h-6 sm:w-6" />;
                }

                return (
                  <button
                    key={`day-${item.day}`}
                    type="button"
                    onClick={() => {
                      const next = new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth(), item.day!);
                      onDateChange(next);
                    }}
                    className={cn(
                      "h-5 w-5 sm:h-6 sm:w-6 rounded-md text-[10px] sm:text-[11px] font-mono font-medium flex items-center justify-center transition-all cursor-pointer mx-auto",
                      item.isSelected
                        ? "bg-[#FFE394] text-[#07162B] font-bold shadow-md scale-105"
                        : item.isCurrent
                        ? "border border-amber-400 text-amber-300 font-bold hover:bg-amber-400/20"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {item.day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

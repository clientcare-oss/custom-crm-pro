import React, { useState } from "react";
import {
  Plus,
  Target,
  Phone,
  Ban,
  RotateCcw,
  Info,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
} from "lucide-react";
import { CalendarViewMode, CalendarScope, CalendarLayerFilters } from "@/components/CalendarView";

export interface CalendarControlCommandBarProps {
  viewMode: CalendarViewMode | "agenda";
  onViewModeChange: (mode: CalendarViewMode | "agenda") => void;
  scope: CalendarScope;
  onScopeChange: (scope: CalendarScope) => void;
  selectedAdvocateFilter: string;
  onAdvocateFilterChange: (advocate: string) => void;
  advocateList: { id: string; name: string }[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  layerFilters: CalendarLayerFilters;
  onLayerFiltersChange: (filters: CalendarLayerFilters) => void;
  showWeekends: boolean;
  onToggleShowWeekends: (show: boolean) => void;
  showCanceled: boolean;
  onToggleShowCanceled: (show: boolean) => void;
  onQuickAction: (action: "NEW_MEETING" | "PROPOSE_3_OPTIONS" | "PARENT_CALL" | "BLOCK_TIME") => void;
}

export default function CalendarControlCommandBar({
  viewMode,
  onViewModeChange,
  scope,
  onScopeChange,
  selectedAdvocateFilter,
  onAdvocateFilterChange,
  advocateList,
  currentDate,
  onDateChange,
  layerFilters,
  onLayerFiltersChange,
  showWeekends,
  onToggleShowWeekends,
  showCanceled,
  onToggleShowCanceled,
  onQuickAction,
}: CalendarControlCommandBarProps) {
  // Mini calendar month navigator
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(() => new Date(currentDate));

  const monthYearLabel = miniCalMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handlePrevMiniMonth = () => {
    const next = new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() - 1, 1);
    setMiniCalMonth(next);
  };

  const handleNextMiniMonth = () => {
    const next = new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() + 1, 1);
    setMiniCalMonth(next);
  };

  const handleResetLayers = () => {
    onLayerFiltersChange({
      showAppointments: true,
      showProposedHolds: true,
      showClosures: true,
      showHolidays: true,
      showPto: true,
      showBlackouts: true,
      showInternalEvents: true,
      showProtectedWork: true,
    });
  };

  // Generate mini calendar days
  const miniCalDays = React.useMemo(() => {
    const year = miniCalMonth.getFullYear();
    const month = miniCalMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const currentDay = today.getDate();

    const selectedDay =
      currentDate.getFullYear() === year && currentDate.getMonth() === month
        ? currentDate.getDate()
        : null;

    const cells: React.ReactNode[] = [];

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-5 w-5" />);
    }

    // Days of month
    for (let d = 1; d <= totalDays; d++) {
      const isSelected = d === selectedDay;
      const isToday = isCurrentMonth && d === currentDay;

      cells.push(
        <button
          key={`day-${d}`}
          type="button"
          onClick={() => {
            const newDate = new Date(year, month, d);
            onDateChange(newDate);
          }}
          className={`flex h-5 w-5 items-center justify-center rounded-[5px] text-[10px] font-mono font-medium transition-all cursor-pointer ${
            isSelected
              ? "bg-[#DFBE77] text-[#07162B] font-bold shadow-sm"
              : isToday
              ? "border border-[#C5A059] text-[#FFE394] font-bold"
              : "text-[#C6B697] hover:bg-[#102B4E]/60 hover:text-[#FFF4D4]"
          }`}
        >
          {d}
        </button>
      );
    }

    return cells;
  }, [miniCalMonth, currentDate, onDateChange]);

  const layerItems = [
    {
      key: "showAppointments",
      label: "Confirmed Appointments",
      colorClass: "bg-emerald-500",
      active: layerFilters.showAppointments,
      info: "Confirmed client and student meetings with set dates & times",
    },
    {
      key: "showProposedHolds",
      label: "Tentative Holds (3-option groups)",
      colorClass: "bg-sky-500",
      active: layerFilters.showProposedHolds,
      info: "Multi-option candidate dates protected from overlapping booking",
    },
    {
      key: "showInternalEvents",
      label: "Parent Calls / Discovery",
      colorClass: "bg-amber-400",
      active: layerFilters.showInternalEvents,
      info: "Discovery evaluations, client check-ins, and consultation calls",
    },
    {
      key: "showProtectedWork",
      label: "Advocate Internal Work",
      colorClass: "bg-purple-400",
      active: layerFilters.showProtectedWork,
      info: "Protected casework, document review, and complaint drafting",
    },
    {
      key: "showBlackouts",
      label: "Blackouts (Do Not Schedule)",
      colorClass: "bg-rose-600",
      active: layerFilters.showBlackouts,
      info: "Strict scheduling freezes where no meetings can be booked",
    },
    {
      key: "showPto",
      label: "PTO / Vacation",
      colorClass: "bg-teal-400",
      active: layerFilters.showPto,
      info: "Staff vacation and planned time off",
    },
    {
      key: "showPto",
      label: "Personal Day",
      colorClass: "bg-indigo-400",
      active: layerFilters.showPto,
      info: "Personal absence and quiet protected days",
    },
    {
      key: "showHolidays",
      label: "Holidays",
      colorClass: "bg-[#DFBE77]",
      active: layerFilters.showHolidays,
      info: "Observed state, federal, or organization holidays",
    },
    {
      key: "showClosures",
      label: "Office Closed",
      colorClass: "bg-rose-500",
      active: layerFilters.showClosures,
      info: "Emergency, weather, or company-wide office closures",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 select-none">
      {/* ── MODULE 1: QUICK ACTIONS ── */}
      <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] flex flex-col justify-between">
        <div>
          <div className="font-serif text-xs font-bold uppercase tracking-wider text-[#FFE394] mb-3">
            Quick Actions
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onQuickAction("NEW_MEETING")}
              className="w-full flex items-center gap-2.5 rounded-[5px] border border-[#3A2C18] bg-[#020A17] hover:border-[#C5A059] hover:bg-[#07162B] p-2 text-left text-xs transition-all cursor-pointer group"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-sky-950/80 border border-sky-600/60 text-sky-300 group-hover:scale-105 transition-transform">
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
              </div>
              <div className="min-w-0">
                <div className="font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] truncate">
                  New Meeting
                </div>
                <div className="text-[10px] text-[#A69371] font-mono truncate">
                  IEP / 504 / Other
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onQuickAction("PROPOSE_3_OPTIONS")}
              className="w-full flex items-center gap-2.5 rounded-[5px] border border-[#3A2C18] bg-[#020A17] hover:border-[#C5A059] hover:bg-[#07162B] p-2 text-left text-xs transition-all cursor-pointer group"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-blue-950/80 border border-blue-500/60 text-blue-300 group-hover:scale-105 transition-transform">
                <Target className="h-3.5 w-3.5 text-blue-300" />
              </div>
              <div className="min-w-0">
                <div className="font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] truncate">
                  Propose 3 Options
                </div>
                <div className="text-[10px] text-[#A69371] font-mono truncate">
                  Tentative Hold
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onQuickAction("PARENT_CALL")}
              className="w-full flex items-center gap-2.5 rounded-[5px] border border-[#3A2C18] bg-[#020A17] hover:border-[#C5A059] hover:bg-[#07162B] p-2 text-left text-xs transition-all cursor-pointer group"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-amber-950/80 border border-amber-500/60 text-amber-300 group-hover:scale-105 transition-transform">
                <Phone className="h-3.5 w-3.5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] truncate">
                  Parent Call
                </div>
                <div className="text-[10px] text-[#A69371] font-mono truncate">
                  Discovery / Check-in
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onQuickAction("BLOCK_TIME")}
              className="w-full flex items-center gap-2.5 rounded-[5px] border border-[#3A2C18] bg-[#020A17] hover:border-[#C5A059] hover:bg-[#07162B] p-2 text-left text-xs transition-all cursor-pointer group"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-rose-950/80 border border-rose-600/60 text-rose-300 group-hover:scale-105 transition-transform">
                <Ban className="h-3.5 w-3.5 text-rose-400" />
              </div>
              <div className="min-w-0">
                <div className="font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] truncate">
                  Block Time
                </div>
                <div className="text-[10px] text-[#A69371] font-mono truncate">
                  PTO / Personal
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODULE 2: CALENDAR LAYER FILTERS ── */}
      <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="font-serif text-xs font-bold uppercase tracking-wider text-[#FFE394]">
              Calendar Layer Filters
            </div>
            <button
              type="button"
              onClick={handleResetLayers}
              className="flex items-center gap-1 text-[10px] font-mono text-[#C5A059] hover:text-[#FFF4D4] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Reset</span>
            </button>
          </div>
          <div className="text-[10px] text-[#A69371] font-mono mb-2">
            Show or hide scheduling layers
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-none overscroll-contain">
            {layerItems.map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                onClick={() => {
                  const current = layerFilters[item.key as keyof CalendarLayerFilters];
                  onLayerFiltersChange({
                    ...layerFilters,
                    [item.key]: !current,
                  });
                }}
                className={`flex items-center justify-between p-1.5 rounded-[5px] border text-xs cursor-pointer transition-all ${
                  item.active
                    ? "border-[#3A2C18]/60 bg-[#020A17]/70 text-[#FFF4D4] hover:border-[#C5A059]/60"
                    : "border-transparent bg-transparent text-[#A69371]/50 hover:bg-[#020A17]/40"
                }`}
                title={item.info}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.colorClass} shadow-sm`} />
                  <span className="text-[11px] font-medium truncate">{item.label}</span>
                </div>
                <Info className="h-3 w-3 text-[#A69371]/60 hover:text-[#FFE394] shrink-0 ml-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MODULE 3: VIEW OPTIONS ── */}
      <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] flex flex-col justify-between">
        <div>
          <div className="font-serif text-xs font-bold uppercase tracking-wider text-[#FFE394] mb-2.5">
            View Options
          </div>

          {/* Day / Week / Month / Agenda Segmented Controls */}
          <div className="grid grid-cols-4 gap-1 p-0.5 rounded-[5px] bg-[#020A17] border border-[#3A2C18] mb-3">
            {(["day", "week", "month", "agenda"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={`py-1 rounded-[5px] text-[11px] font-bold capitalize transition-all cursor-pointer ${
                  viewMode === mode
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-sm"
                    : "text-[#C6B697] hover:text-[#FFF4D4]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Team Member Dropdown */}
          <div className="mb-2.5">
            <label className="block text-[10px] font-mono text-[#A69371] uppercase tracking-wider mb-1">
              Team Member
            </label>
            <select
              value={selectedAdvocateFilter}
              onChange={(e) => onAdvocateFilterChange(e.target.value)}
              className="w-full h-8 px-2.5 rounded-[5px] bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs font-medium focus:outline-none focus:border-[#C5A059] cursor-pointer"
            >
              <option value="all">All Advocates</option>
              {advocateList.map((adv) => (
                <option key={adv.id} value={adv.name}>
                  {adv.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector Row */}
          <div className="mb-3">
            <label className="block text-[10px] font-mono text-[#A69371] uppercase tracking-wider mb-1">
              Date
            </label>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center justify-between h-8 px-2.5 rounded-[5px] bg-[#020A17] border border-[#3A2C18] text-[#FFE394] text-xs font-mono">
                <ChevronLeft
                  className="h-3.5 w-3.5 cursor-pointer text-[#A69371] hover:text-[#FFF4D4]"
                  onClick={() => {
                    const next = new Date(currentDate);
                    next.setMonth(next.getMonth() - 1);
                    onDateChange(next);
                  }}
                />
                <span>
                  {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <ChevronRight
                  className="h-3.5 w-3.5 cursor-pointer text-[#A69371] hover:text-[#FFF4D4]"
                  onClick={() => {
                    const next = new Date(currentDate);
                    next.setMonth(next.getMonth() + 1);
                    onDateChange(next);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => onDateChange(new Date())}
                className="h-8 px-2.5 rounded-[5px] border border-[#3A2C18] bg-[#020A17] hover:border-[#C5A059] text-xs font-serif font-bold text-[#FFE394] cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>

          {/* Checkboxes: Show Weekends & Show Canceled */}
          <div className="space-y-1.5 pt-1 border-t border-[#3A2C18]/60">
            <label className="flex items-center gap-2 text-xs text-[#C6B697] hover:text-[#FFF4D4] cursor-pointer">
              <input
                type="checkbox"
                checked={showWeekends}
                onChange={(e) => onToggleShowWeekends(e.target.checked)}
                className="h-3.5 w-3.5 rounded-[3px] border-[#3A2C18] bg-[#020A17] text-[#C5A059] focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px]">Show weekends</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-[#C6B697] hover:text-[#FFF4D4] cursor-pointer">
              <input
                type="checkbox"
                checked={showCanceled}
                onChange={(e) => onToggleShowCanceled(e.target.checked)}
                className="h-3.5 w-3.5 rounded-[3px] border-[#3A2C18] bg-[#020A17] text-[#C5A059] focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px]">Show canceled (strikethrough)</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── MODULE 4: MINI MONTHLY CALENDAR PICKER ── */}
      <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] flex flex-col justify-between">
        <div>
          {/* Header Month & Arrows */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMiniMonth}
              className="flex h-5 w-5 items-center justify-center rounded-[5px] border border-[#3A2C18] bg-[#020A17] text-[#A69371] hover:text-[#FFF4D4] cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <div className="font-serif text-xs font-bold text-[#FFE394]">
              {monthYearLabel}
            </div>
            <button
              type="button"
              onClick={handleNextMiniMonth}
              className="flex h-5 w-5 items-center justify-center rounded-[5px] border border-[#3A2C18] bg-[#020A17] text-[#A69371] hover:text-[#FFF4D4] cursor-pointer"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] text-[#A69371] font-bold mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 place-items-center">
            {miniCalDays}
          </div>
        </div>

        <div className="mt-2 text-center text-[10px] font-mono text-[#A69371]/80">
          Click any date to shift calendar view
        </div>
      </div>
    </div>
  );
}

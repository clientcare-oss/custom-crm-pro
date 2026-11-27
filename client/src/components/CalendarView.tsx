import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  X,
} from "lucide-react";
import TodaysAppointmentsTable, { CalendarAppointment } from "./calendar/TodaysAppointmentsTable";
import CalendarDayTimeline from "./calendar/CalendarDayTimeline";
import CalendarWeekView from "./calendar/CalendarWeekView";
import {
  detectItemPatternKey,
  CALENDAR_PATTERNS,
  formatWaypointCalendarEvent,
  sortAppointmentsChronologically,
} from "./calendar/CalendarPatternStyles";
import {
  CalendarOrbCategoryKey,
  CALENDAR_ORB_CATEGORY_MAP,
  classifyAppointmentOrbCategory,
  classifyBlockOrbCategory,
  formatParchmentPillLabel,
} from "./calendar/calendarCategoryHelpers";
import { resolveDayHolidayOverlay } from "@shared/calendarHolidays";

import type { OperationalBlock } from "../../../drizzle/schema";

export type CalendarViewMode = "day" | "week" | "month" | "agenda";
export type CalendarScope = "my" | "all";

export interface CalendarLayerFilters {
  showAppointments: boolean;
  showProposedHolds: boolean;
  showClosures: boolean;
  showHolidays: boolean;
  showPto: boolean;
  showBlackouts: boolean;
  showInternalEvents: boolean;
  showProtectedWork: boolean;
}

interface CalendarViewProps {
  appointments: CalendarAppointment[];
  operationalBlocks?: OperationalBlock[];
  onDateClick?: (date: Date) => void;
  onSlotClick?: (date: Date, time?: string) => void;
  onEventClick?: (appointment: CalendarAppointment) => void;
  onReassignClick?: (appointment: CalendarAppointment) => void;
  onScheduleClick?: () => void;
  onManageStaffClick?: () => void;
  onOperationalBlockClick?: (block: OperationalBlock) => void;
  viewMode?: CalendarViewMode;
  onViewModeChange?: (mode: CalendarViewMode) => void;
  scope?: CalendarScope;
  onScopeChange?: (scope: CalendarScope) => void;
  selectedAdvocateFilter?: string;
  onAdvocateFilterChange?: (advocate: string) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  loggedInAdvocateName?: string;
  staffList?: { id: string; name: string; status: string }[];
  layerFilters?: CalendarLayerFilters;
  activeCategoryFilter?: CalendarOrbCategoryKey | null;
  hideHeaderAndControls?: boolean;
}

const DEFAULT_STAFF = [
  { id: "byron-honea", name: "Byron Honea", status: "Available" },
  { id: "wyatt-smith", name: "Wyatt Smith", status: "Available" },
  { id: "sarah-jenkins", name: "Sarah Jenkins", status: "Out Today" },
  { id: "abby-miller", name: "Abby Miller", status: "Limited" },
  { id: "marcus-vance", name: "Marcus Vance", status: "Available" },
];

function matchAdvocate(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  if (a === b) return true;
  return a.split(" ")[0] === b.split(" ")[0];
}

function formatDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarView({
  appointments,
  operationalBlocks = [],
  onDateClick,
  onSlotClick,
  onEventClick,
  onReassignClick,
  onScheduleClick,
  onOperationalBlockClick,
  viewMode: controlledViewMode,
  onViewModeChange,
  scope: controlledScope,
  onScopeChange,
  selectedAdvocateFilter: controlledFilter,
  onAdvocateFilterChange,
  currentDate: controlledDate,
  onDateChange,
  loggedInAdvocateName = "Byron Honea",
  staffList = DEFAULT_STAFF,
  layerFilters = {
    showAppointments: true,
    showProposedHolds: true,
    showClosures: true,
    showHolidays: true,
    showPto: true,
    showBlackouts: true,
    showInternalEvents: true,
    showProtectedWork: true,
  },
  activeCategoryFilter = null,
  hideHeaderAndControls = false,
}: CalendarViewProps) {
  const [internalViewMode, setInternalViewMode] = useState<CalendarViewMode>("month");
  const [internalScope, setInternalScope] = useState<CalendarScope>("my");
  const [internalFilter, setInternalFilter] = useState<string>("all");
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  const [tableTab, setTableTab] = useState<"my" | "all">("my");
  const [overflowDrawerDateStr, setOverflowDrawerDateStr] = useState<string | null>(null);
  const [cachedOverflowDateStr, setCachedOverflowDateStr] = useState<string | null>(null);
  const [isOverflowRendered, setIsOverflowRendered] = useState(false);
  const [isOverflowAnimatedOpen, setIsOverflowAnimatedOpen] = useState(false);

  useEffect(() => {
    if (overflowDrawerDateStr) {
      setCachedOverflowDateStr(overflowDrawerDateStr);
      setIsOverflowRendered(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsOverflowAnimatedOpen(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    } else {
      setIsOverflowAnimatedOpen(false);
      const timer = setTimeout(() => {
        setIsOverflowRendered(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [overflowDrawerDateStr]);

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = (mode: CalendarViewMode) => {
    onViewModeChange?.(mode);
    setInternalViewMode(mode);
  };

  const scope = controlledScope ?? internalScope;
  const setScope = (s: CalendarScope) => {
    onScopeChange?.(s);
    setInternalScope(s);
  };

  const filterAdvocate = controlledFilter ?? internalFilter;
  const setFilterAdvocate = (f: string) => {
    onAdvocateFilterChange?.(f);
    setInternalFilter(f);
  };

  const currentDate = controlledDate ?? internalDate;
  const setCurrentDate = (d: Date) => {
    onDateChange?.(d);
    setInternalDate(d);
  };

  const selectedDateStr = useMemo(() => {
    return formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  }, [currentDate]);

  const myMeetingsTodayCount = useMemo(() => {
    return appointments.filter((apt) => {
      const dt = new Date(apt.startTime);
      const d = formatDateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const adv = apt.assignedAdvocateName || "Byron Honea";
      return d === selectedDateStr && apt.status !== "Cancelled" && matchAdvocate(adv, loggedInAdvocateName);
    }).length;
  }, [appointments, selectedDateStr, loggedInAdvocateName]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const isHold = Boolean((apt as any).isHold);
      if (isHold && !layerFilters.showProposedHolds) return false;
      if (!isHold && !layerFilters.showAppointments) return false;

      const advocate = apt.assignedAdvocateName || "Byron Honea";
      if (scope === "my") {
        if (!matchAdvocate(advocate, loggedInAdvocateName)) return false;
      } else if (filterAdvocate && filterAdvocate !== "all") {
        if (!matchAdvocate(advocate, filterAdvocate)) return false;
      }

      if (activeCategoryFilter) {
        const cat = classifyAppointmentOrbCategory(apt as any);
        if (cat !== activeCategoryFilter) return false;
      }

      return true;
    });
  }, [
    appointments,
    scope,
    filterAdvocate,
    loggedInAdvocateName,
    layerFilters.showAppointments,
    layerFilters.showProposedHolds,
    activeCategoryFilter,
  ]);

  const formattedHeaderDate = useMemo(() => {
    return currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [currentDate]);

  const dateInputStr = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(currentDate.getMonth() + 1)}/${pad(currentDate.getDate())}/${currentDate.getFullYear()}`;
  }, [currentDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const prevMonthDaysCount = new Date(year, month, 0).getDate();
  const nowObj = new Date();
  const todayStr = formatDateKey(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate());

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    filteredAppointments.forEach((apt) => {
      const dt = new Date(apt.startTime);
      const date = formatDateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (!map[date]) map[date] = [];
      map[date].push(apt);
    });
    for (const dateKey of Object.keys(map)) {
      map[dateKey] = sortAppointmentsChronologically(map[dateKey]);
    }
    return map;
  }, [filteredAppointments]);

  const operationalBlocksByDate = useMemo(() => {
    const map: Record<string, OperationalBlock[]> = {};
    operationalBlocks.forEach((block) => {
      if (block.isArchived) return;

      if (block.scope !== "ENTIRE_COMPANY") {
        if (scope === "my") {
          if (!block.targetStaffNames || !matchAdvocate(block.targetStaffNames, loggedInAdvocateName)) {
            return;
          }
        } else if (filterAdvocate && filterAdvocate !== "all") {
          if (!block.targetStaffNames || !matchAdvocate(block.targetStaffNames, filterAdvocate)) {
            return;
          }
        }
      }

      const bt = block.blockType.toLowerCase();
      if ((bt.includes("closure") || bt.includes("closed") || block.scope === "ENTIRE_COMPANY") && !layerFilters.showClosures) {
        return;
      }
      if (bt.includes("holiday") && !layerFilters.showHolidays) return;
      if ((bt.includes("pto") || bt.includes("vacation") || bt.includes("personal") || bt.includes("sick")) && !layerFilters.showPto) {
        return;
      }
      if (bt.includes("blackout") && !layerFilters.showBlackouts) return;
      if ((bt.includes("training") || bt.includes("meeting") || bt.includes("internal")) && !layerFilters.showInternalEvents) {
        return;
      }
      if ((bt.includes("protected") || bt.includes("casework") || bt.includes("focus")) && !layerFilters.showProtectedWork) {
        return;
      }

      const dt = new Date(block.startTime);
      const dStr = formatDateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(block);
    });
    return map;
  }, [operationalBlocks, scope, filterAdvocate, loggedInAdvocateName, layerFilters]);

  // Build complete 5-week or 6-week antique parchment calendar cells (including previous & next month edge days)
  const monthGridCells = useMemo(() => {
    const cells: React.ReactNode[] = [];
    const totalOccupied = firstDayOfMonth + daysInMonth;
    const totalCells = totalOccupied <= 35 ? 35 : 42;
    const trailingCount = totalCells - totalOccupied;

    // 1. Previous Month Leading Days (muted sepia numerals on parchment)
    for (let i = 0; i < firstDayOfMonth; i++) {
      const prevDay = prevMonthDaysCount - firstDayOfMonth + 1 + i;
      const cellDate = new Date(year, month - 1, prevDay);
      cells.push(
        <div
          key={`prev-${prevDay}`}
          onClick={() => setCurrentDate(cellDate)}
          className="wp-cal-parchment-cell wp-cal-parchment-cell-outside min-h-[82px] px-2 pt-1.5 pb-1.5 cursor-pointer"
          title={`Go to ${cellDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
        >
          <span className="wp-cal-day-num-outside">{prevDay}</span>
        </div>
      );
    }

    // 2. Active Month Days on Antique Weathered Parchment
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateKey(year, month, day);
      const dayAppointments = appointmentsByDate[dateStr] || [];
      const dayBlocks = operationalBlocksByDate[dateStr] || [];
      const isToday = dateStr === todayStr;

      const allDayNoticeBlock = dayBlocks.find(
        (b) =>
          b.isAllDay &&
          (b.scope === "ENTIRE_COMPANY" ||
            b.blockType.toLowerCase().includes("closed") ||
            b.blockType.toLowerCase().includes("holiday"))
      );
      const regularBlocks = dayBlocks.filter((b) => b !== allDayNoticeBlock);

      // Edge-to-edge Holiday / Office Closed Artwork Overlay (dynamic yearly calculation + closure block matching)
      const holidayOverlay = resolveDayHolidayOverlay(year, dateStr, allDayNoticeBlock);
      const hasScheduledItems = dayAppointments.length > 0 || regularBlocks.length > 0;
      const isDarkHolidayArt = Boolean(holidayOverlay && !hasScheduledItems && holidayOverlay.artwork.tone === "dark");
      const isDarkDateCorner = Boolean(
        holidayOverlay &&
          !hasScheduledItems &&
          (holidayOverlay.artwork.dateNumTone || holidayOverlay.artwork.tone) === "dark"
      );
      const isRightAlignedTitle = holidayOverlay?.artwork.titleAlign === "right";

      const dayNumClass = isToday
        ? "wp-cal-day-num-today"
        : isDarkDateCorner
        ? "wp-cal-day-num-dark"
        : holidayOverlay
        ? "wp-cal-day-num-light"
        : "wp-cal-day-num";

      cells.push(
        <div
          key={`day-${day}`}
          className={`wp-cal-parchment-cell min-h-[88px] px-1.5 pt-1.5 pb-1.5 cursor-pointer flex flex-col ${
            isToday && !holidayOverlay ? "wp-cal-parchment-cell-today" : ""
          }`}
          onClick={() => onDateClick?.(new Date(year, month, day))}
        >
          {/* 100% Edge-to-Edge Borderless Seasonal Illustration (Zero gold trim / zero inner card / auto-softened when booked) */}
          {holidayOverlay && (
            <>
              <img
                src={holidayOverlay.artwork.imagePath}
                alt=""
                aria-hidden="true"
                loading="lazy"
                style={{ objectPosition: holidayOverlay.artwork.objectPosition || "center bottom" }}
                className={`wp-cal-holiday-art ${hasScheduledItems ? "wp-cal-holiday-art-soft" : ""}`}
              />
              {hasScheduledItems ? (
                <div aria-hidden="true" className="wp-cal-holiday-scrim-booked" />
              ) : isDarkHolidayArt ? (
                <div aria-hidden="true" className="wp-cal-holiday-scrim-dark" />
              ) : null}
            </>
          )}

          {/* Upper-Left Date Number Row (+ compact live holiday label when appointments occupy the cell) */}
          <div className="relative z-10 flex items-center justify-between gap-1 mb-1 px-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`${dayNumClass} shrink-0`}>{day}</span>
              {holidayOverlay && hasScheduledItems && (
                <span
                  className="wp-cal-holiday-inline-label truncate"
                  title={holidayOverlay.displayLabel}
                >
                  {holidayOverlay.displayLabel}
                </span>
              )}
            </div>
            {dayAppointments.some((a) => a.status === "Needs Coverage") && (
              <span
                className="w-2 h-2 rounded-full bg-rose-600 shadow-[0_0_6px_rgba(225,29,72,0.8)] animate-pulse shrink-0"
                title="Needs Coverage"
              />
            )}
          </div>

          {/* Live Holiday / Office Closed Title overlaid cleanly over empty seasonal illustration */}
          {holidayOverlay && !hasScheduledItems && (
            allDayNoticeBlock ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOperationalBlockClick?.(allDayNoticeBlock);
                }}
                className={`relative z-10 flex items-start pt-0.5 cursor-pointer group ${
                  isRightAlignedTitle ? "justify-end text-right pr-2 pl-10" : "justify-center text-center px-1"
                }`}
                title={`${holidayOverlay.displayLabel} — Click for details`}
              >
                <span
                  className={
                    isDarkHolidayArt
                      ? "wp-cal-holiday-title-dark group-hover:brightness-110 transition-all"
                      : "wp-cal-holiday-title-light group-hover:brightness-90 transition-all"
                  }
                >
                  {holidayOverlay.displayLabel}
                </span>
              </button>
            ) : (
              <div
                className={`relative z-10 flex items-start pt-0.5 pointer-events-none ${
                  isRightAlignedTitle ? "justify-end text-right pr-2 pl-10" : "justify-center text-center px-1"
                }`}
              >
                <span
                  className={
                    isDarkHolidayArt ? "wp-cal-holiday-title-dark" : "wp-cal-holiday-title-light"
                  }
                >
                  {holidayOverlay.displayLabel}
                </span>
              </div>
            )
          )}

          {/* Glossy 3D Beveled Enamel Event Pills on Top of Artwork (z-20, 100% clickable & crisp) */}
          <div className="relative z-20 space-y-[4px] overflow-hidden">
            {regularBlocks.slice(0, 2).map((block) => {
              const catKey = classifyBlockOrbCategory(block);
              const catDef = CALENDAR_ORB_CATEGORY_MAP[catKey];
              return (
                <button
                  key={`month-block-${block.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOperationalBlockClick?.(block);
                  }}
                  className={`wp-cal-evt-pill ${catDef.pillClass} text-left`}
                  title={block.title}
                >
                  {catDef.showAlertIcon && (
                    <AlertCircle className="h-3 w-3 shrink-0 fill-white text-[#9E1D24]" />
                  )}
                  <span className="truncate">{block.title}</span>
                </button>
              );
            })}

            {dayAppointments.slice(0, 3).map((apt) => {
              const catKey = classifyAppointmentOrbCategory(apt as any);
              const catDef = CALENDAR_ORB_CATEGORY_MAP[catKey];
              const fmtEvt = formatWaypointCalendarEvent(apt, loggedInAdvocateName);
              const pillText = formatParchmentPillLabel(apt as any, loggedInAdvocateName);
              const advocateFirst = (apt.assignedAdvocateName || "Byron Honea").split(" ")[0];

              return (
                <button
                  key={apt.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(apt);
                  }}
                  className={`wp-cal-evt-pill ${catDef.pillClass} text-left`}
                  title={`${fmtEvt.startTimeLabel} ${fmtEvt.studentLabel || "Student"} — ${fmtEvt.sessionTypeFull} (${advocateFirst})`}
                >
                  {catDef.showAlertIcon && (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 fill-white text-[#9E1D24]" />
                  )}
                  <span className="truncate">{pillText}</span>
                </button>
              );
            })}

            {dayAppointments.length > 3 && (
              <div className="flex items-center gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOverflowDrawerDateStr(dateStr);
                  }}
                  className="flex-1 flex items-center justify-between text-[10px] font-serif font-bold px-2 py-[2px] rounded-[5px] bg-[#2a1c0f]/85 border border-[#6e4d26]/80 text-[#FAF0D7] hover:bg-[#1b1108] transition-all cursor-pointer shadow-sm"
                >
                  <span>+{dayAppointments.length - 3} more</span>
                  <ChevronRight className="w-2.5 h-2.5 text-[#ECC97B]" />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 3. Next Month Trailing Days (muted sepia numerals on parchment, matching reference bottom row 1..5)
    for (let t = 1; t <= trailingCount; t++) {
      const cellDate = new Date(year, month + 1, t);
      cells.push(
        <div
          key={`next-${t}`}
          onClick={() => setCurrentDate(cellDate)}
          className="wp-cal-parchment-cell wp-cal-parchment-cell-outside min-h-[82px] px-2 pt-1.5 pb-1.5 cursor-pointer"
          title={`Go to ${cellDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
        >
          <span className="wp-cal-day-num-outside">{t}</span>
        </div>
      );
    }

    return cells;
  }, [
    year,
    month,
    firstDayOfMonth,
    daysInMonth,
    prevMonthDaysCount,
    appointmentsByDate,
    operationalBlocksByDate,
    todayStr,
    loggedInAdvocateName,
    onDateClick,
    onEventClick,
    onOperationalBlockClick,
  ]);

  // Agenda View grouped appointments for the active month
  const agendaGroups = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    const entries = Object.entries(appointmentsByDate)
      .filter(([dateKey]) => dateKey.startsWith(monthPrefix))
      .sort(([a], [b]) => a.localeCompare(b));
    return entries;
  }, [appointmentsByDate, year, month]);

  return (
    <div className="space-y-4">
      {/* ── OPTIONAL STANDALONE HEADER (Hidden when mounted under CalendarConsoleHeader) ── */}
      {!hideHeaderAndControls && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div
              onClick={() => {
                setViewMode("day");
                setScope("my");
                setTableTab("my");
                setCurrentDate(new Date());
              }}
              className="flex items-center gap-3.5 px-4 py-3 rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] cursor-pointer hover:border-[#C5A059]/80 transition-all shrink-0 group"
            >
              <div className="p-2 rounded-[5px] bg-[#020A17] text-[#FFE394] border border-[#3A2C18] group-hover:scale-105 transition-transform">
                <CalendarIcon className="w-5 h-5 text-[#C5A059]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#C6B697]">Meetings Today</div>
                <div className="text-2xl font-serif font-bold text-[#FFF4D4] leading-none my-0.5">
                  {myMeetingsTodayCount || 2}
                </div>
                <div className="text-[11px] text-[#C5A059] font-medium hover:underline flex items-center gap-0.5">
                  <span>View your appointments</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            <div className="flex-1 md:px-4">
              <h1 className="text-2xl font-serif font-bold text-[#FFF4D4] tracking-tight leading-tight">
                {formattedHeaderDate}
              </h1>
              <p className="text-xs text-[#C6B697] mt-0.5">
                Your schedule and all staff appointments for today.
              </p>
            </div>

            <div>
              <Button
                onClick={() => onScheduleClick?.()}
                className="wp-cal-pill-brass font-bold text-sm h-10 px-4 rounded-full flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Schedule Appointment</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center p-0.5 rounded-[5px] bg-[#020A17] border border-[#3A2C18]">
                {(["day", "week", "month"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setViewMode(m)}
                    className={`px-4 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                      viewMode === m ? "wp-cal-pill-brass" : "text-[#C6B697] hover:text-[#FFF4D4]"
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A69371] font-medium">Advocate</span>
                <select
                  value={filterAdvocate}
                  onChange={(e) => setFilterAdvocate(e.target.value)}
                  className="h-8 px-3 rounded-[5px] bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs font-medium focus:outline-none focus:border-[#C5A059] cursor-pointer"
                >
                  <option value="all">All Advocates</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A69371] font-medium">Date</span>
              <div className="flex items-center gap-2 h-8 px-3 rounded-[5px] bg-[#020A17] border border-[#3A2C18] text-[#FFE394] text-xs font-mono">
                <span>{dateInputStr}</span>
                <CalendarIcon className="w-3.5 h-3.5 text-[#C5A059]" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── DAY VIEW ── */}
      {viewMode === "day" && (
        <div className="space-y-4">
          <TodaysAppointmentsTable
            appointments={appointments}
            selectedDate={currentDate}
            loggedInAdvocateName={loggedInAdvocateName}
            onEventClick={(apt) => onEventClick?.(apt)}
            onReassignClick={(apt) => onReassignClick?.(apt)}
            activeTab={tableTab}
            onTabChange={setTableTab}
          />
          <CalendarDayTimeline
            appointments={filteredAppointments}
            operationalBlocks={operationalBlocks}
            selectedDate={currentDate}
            onEventClick={(apt) => onEventClick?.(apt)}
            onReassignClick={(apt) => onReassignClick?.(apt)}
            onSlotClick={(date, time) =>
              onSlotClick ? onSlotClick(date, time) : onDateClick ? onDateClick(date) : undefined
            }
            onOperationalBlockClick={onOperationalBlockClick}
            scope={scope}
            loggedInAdvocateName={loggedInAdvocateName}
            selectedAdvocateFilter={filterAdvocate}
            layerFilters={layerFilters}
          />
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {viewMode === "week" && (
        <CalendarWeekView
          appointments={filteredAppointments}
          operationalBlocks={operationalBlocks}
          currentDate={currentDate}
          onEventClick={(apt) => onEventClick?.(apt)}
          onReassignClick={(apt) => onReassignClick?.(apt)}
          onDayClick={(date) => {
            setCurrentDate(date);
            setViewMode("day");
          }}
          onSlotClick={onSlotClick}
          onDateChange={setCurrentDate}
          onOperationalBlockClick={onOperationalBlockClick}
          scope={scope}
          loggedInAdvocateName={loggedInAdvocateName}
          selectedAdvocateFilter={filterAdvocate}
          layerFilters={layerFilters}
        />
      )}

      {/* ── AGENDA VIEW (Antique Brass-Framed Parchment Chronological Schedule) ── */}
      {viewMode === "agenda" && (
        <div>
          <div className="wp-cal-brass-frame">
            <div className="wp-cal-brass-inner">
              <div className="wp-cal-parchment-dow px-5 py-3 flex items-center justify-between">
                <span>
                  Monthly Agenda —{" "}
                  {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <span className="text-[11px] font-mono tracking-normal text-[#DFBE77] normal-case">
                  {agendaGroups.reduce((sum, [, list]) => sum + list.length, 0)} scheduled
                </span>
              </div>
              <div className="wp-cal-parchment-body divide-y divide-[#5c3e22]/40 min-h-[420px]">
                {agendaGroups.length === 0 ? (
                  <div className="py-16 text-center font-serif italic text-[#4a321a] text-base">
                    No appointments scheduled for this month.
                  </div>
                ) : (
                  agendaGroups.map(([dateKey, apts]) => {
                    const [yy, mm, dd] = dateKey.split("-").map(Number);
                    const dateObj = new Date(yy, (mm || 1) - 1, dd || 1);
                    return (
                      <div key={dateKey} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="sm:w-44 shrink-0">
                          <div className="font-serif font-bold text-[#1F140A] text-base">
                            {dateObj.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-[11px] font-mono text-[#6B4A28]">
                            {apts.length} {apts.length === 1 ? "session" : "sessions"}
                          </div>
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {apts.map((apt) => {
                            const catKey = classifyAppointmentOrbCategory(apt as any);
                            const catDef = CALENDAR_ORB_CATEGORY_MAP[catKey];
                            const fmtEvt = formatWaypointCalendarEvent(apt, loggedInAdvocateName);
                            return (
                              <button
                                key={apt.id}
                                type="button"
                                onClick={() => onEventClick?.(apt)}
                                className={`wp-cal-evt-pill ${catDef.pillClass} py-2 px-3 justify-between text-left`}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  {catDef.showAlertIcon && (
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 fill-white text-[#9E1D24]" />
                                  )}
                                  <span className="truncate">
                                    {formatParchmentPillLabel(apt as any, loggedInAdvocateName)}
                                  </span>
                                </span>
                                <span className="text-[10px] opacity-90 shrink-0 ml-2">
                                  {fmtEvt.advocateFirstName}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <div className="wp-cal-desk-sill mx-2" aria-hidden="true" />
        </div>
      )}

      {/* ── MONTH VIEW: PHOTOREALISTIC ANTIQUE BRASS-FRAMED WEATHERED PARCHMENT GRID ── */}
      {viewMode === "month" && (
        <div>
          <div className="wp-cal-brass-frame">
            <div className="wp-cal-brass-inner">
              {/* Optional inner month stepper ONLY if rendered standalone without CalendarConsoleHeader */}
              {!hideHeaderAndControls && (
                <div className="adm-cal-subbar flex items-center justify-between px-4 py-2.5 border-b border-[#593e1d]">
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    className="wp-cal-pill-navy inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-serif font-bold cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4 text-[#ECC97B]" />
                    <span>Prev</span>
                  </button>
                  <h2 className="font-serif text-lg font-bold text-[#FAF6EC]">
                    {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    className="wp-cal-pill-navy inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-serif font-bold cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4 text-[#ECC97B]" />
                  </button>
                </div>
              )}

              {/* Deep Obsidian-Navy Serif Weekday Header Strip (SUN – SAT) */}
              <div className="grid grid-cols-7">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                  <div key={d} className="wp-cal-parchment-dow text-center py-2.5 select-none">
                    {d}
                  </div>
                ))}
              </div>

              {/* Continuous Weathered Antique Parchment 7-Column Grid */}
              <div className="wp-cal-parchment-body grid grid-cols-7">{monthGridCells}</div>
            </div>
          </div>
          {/* Warm Polished Mahogany Desk Surface Reflection Beneath Frame */}
          <div className="wp-cal-desk-sill mx-2" aria-hidden="true" />
        </div>
      )}

      {/* ── Right Slide-Out Drawer for Day Overflow (>3 Appointments) ── */}
      {isOverflowRendered && (overflowDrawerDateStr || cachedOverflowDateStr) && (() => {
        const activeDateStr = overflowDrawerDateStr || cachedOverflowDateStr!;
        const drawerApts = (appointmentsByDate[activeDateStr] || [])
          .slice()
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        const [yNum, mNum, dNum] = activeDateStr.split("-").map(Number);
        const drawerDateObj = new Date(yNum, (mNum || 1) - 1, dNum || 1);
        const drawerDateLabel = drawerDateObj.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        return (
          <>
            <div
              className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px] transition-opacity duration-300 motion-reduce:transition-none ${
                isOverflowAnimatedOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              onClick={() => setOverflowDrawerDateStr(null)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Appointments for ${drawerDateLabel}`}
              className={`fixed top-0 right-0 bottom-0 z-50 h-full w-full sm:w-[400px] max-w-full flex flex-col bg-gradient-to-b from-[#0f2139] via-[#091628] to-[#050d1a] border-l-2 border-[#8a7052]/75 shadow-[-18px_0_48px_rgba(0,0,0,0.9)] transform transition-transform duration-300 ease-out motion-reduce:transition-none ${
                isOverflowAnimatedOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-[#8a7052] via-[#e2ccac] to-[#6c563c]" />
              <div className="shrink-0 p-4 border-b border-[#8a7052]/40 bg-[#081527]/90 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-[#ECC97B] font-bold">
                    {drawerApts.length} Appointments Scheduled
                  </div>
                  <h2 className="text-lg font-serif font-bold text-[#FAF6EC] leading-tight mt-0.5">
                    {drawerDateLabel}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOverflowDrawerDateStr(null)}
                  className="adm-cal-pill p-1.5 rounded-lg text-[#D4DFEE] hover:text-[#FAF6EC] cursor-pointer"
                  aria-label="Close day appointments drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {drawerApts.map((apt) => {
                  const isNeedsCoverage = apt.status === "Needs Coverage";
                  const advocateName = (apt.assignedAdvocateName || "Byron Honea").split(" ")[0];
                  const patternKey = detectItemPatternKey(apt as any);
                  const patternDef = CALENDAR_PATTERNS[patternKey];
                  const fmtEvt = formatWaypointCalendarEvent(apt, loggedInAdvocateName);

                  return (
                    <div
                      key={apt.id}
                      onClick={() => {
                        setOverflowDrawerDateStr(null);
                        onEventClick?.(apt);
                      }}
                      style={{ background: patternDef.inlineBackground }}
                      className={`p-2.5 rounded-lg cursor-pointer hover:brightness-110 transition-all border !border-l-[6px] ${
                        isNeedsCoverage
                          ? "border-rose-600/80 shadow-sm shadow-rose-950"
                          : patternDef.borderClass
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-serif text-sm font-bold truncate leading-tight ${
                            patternKey === "confirmed" ? "text-white" : "text-[#FAF6EC]"
                          }`}
                        >
                          <span className="font-mono text-[#FFE394] mr-1.5">
                            {fmtEvt.startTimeLabel}
                          </span>
                          {fmtEvt.studentLabel || "Student"}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/30 text-[#FFE394] shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-[#ECC97B]" />
                          {fmtEvt.timeRangeLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs mt-1">
                        <span
                          className={`truncate font-medium ${
                            patternKey === "confirmed" ? "text-emerald-100" : "text-[#D4DFEE]"
                          }`}
                        >
                          {fmtEvt.sessionTypeFull}
                        </span>
                        <span
                          className={`font-semibold shrink-0 ${
                            patternKey === "confirmed" ? "text-emerald-300" : "text-[#ECC97B]"
                          }`}
                        >
                          {advocateName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="shrink-0 p-3.5 border-t border-[#8a7052]/40 bg-[#071324] flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setOverflowDrawerDateStr(null);
                    setCurrentDate(drawerDateObj);
                    setViewMode("day");
                  }}
                  className="wp-cal-pill-brass flex-1 font-bold text-xs h-9 rounded-full cursor-pointer"
                >
                  Open Full Day Timeline →
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setOverflowDrawerDateStr(null);
                    onDateClick?.(drawerDateObj);
                  }}
                  className="wp-cal-pill-navy text-[#E8DEC8] hover:text-[#FAF6EC] text-xs h-9 px-3 rounded-full cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-[#ECC97B]" />
                  Schedule
                </Button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

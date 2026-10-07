import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Plus,
} from "lucide-react";
import { formatDualTimes } from "@shared/timezones";
import TodaysAppointmentsTable, { CalendarAppointment } from "./calendar/TodaysAppointmentsTable";
import CalendarDayTimeline from "./calendar/CalendarDayTimeline";
import CalendarWeekView from "./calendar/CalendarWeekView";
import { detectItemPatternKey, CALENDAR_PATTERNS } from "./calendar/CalendarPatternStyles";

import type { OperationalBlock } from "../../../drizzle/schema";

export type CalendarViewMode = "day" | "week" | "month";
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
  // Controlled or uncontrolled view mode
  viewMode?: CalendarViewMode;
  onViewModeChange?: (mode: CalendarViewMode) => void;
  // Controlled or uncontrolled scope
  scope?: CalendarScope;
  onScopeChange?: (scope: CalendarScope) => void;
  // Selected Advocate filter (for All Staff mode)
  selectedAdvocateFilter?: string;
  onAdvocateFilterChange?: (advocate: string) => void;
  // Controlled or uncontrolled current date
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  // Logged-in advocate identity
  loggedInAdvocateName?: string;
  // Staff list for filter
  staffList?: { id: string; name: string; status: string }[];
  // Layer filters
  layerFilters?: CalendarLayerFilters;
  // Hide built-in header & controls when using CalendarConsoleHeader & CalendarControlCommandBar
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

export default function CalendarView({
  appointments,
  operationalBlocks = [],
  onDateClick,
  onSlotClick,
  onEventClick,
  onReassignClick,
  onScheduleClick,
  onManageStaffClick,
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
  hideHeaderAndControls = false,
}: CalendarViewProps) {
  // Local state fallbacks if not controlled from parent
  const [internalViewMode, setInternalViewMode] = useState<CalendarViewMode>("month");
  const [internalScope, setInternalScope] = useState<CalendarScope>("my");
  const [internalFilter, setInternalFilter] = useState<string>("all");
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  const [tableTab, setTableTab] = useState<"my" | "all">("my");

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
    return new Date(currentDate).toISOString().split("T")[0];
  }, [currentDate]);

  // Today's appointments for the logged-in advocate (for Meetings Today badge)
  const myMeetingsTodayCount = useMemo(() => {
    return appointments.filter((apt) => {
      const d = new Date(apt.startTime).toISOString().split("T")[0];
      const isToday = d === selectedDateStr;
      const adv = apt.assignedAdvocateName || "Byron Honea";
      return isToday && apt.status !== "Cancelled" && matchAdvocate(adv, loggedInAdvocateName);
    }).length;
  }, [appointments, selectedDateStr, loggedInAdvocateName]);

  // Filter appointments according to Scope (My Calendar vs All Staff) and optional advocate filter
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const advocate = apt.assignedAdvocateName || "Byron Honea";

      if (scope === "my") {
        return matchAdvocate(advocate, loggedInAdvocateName);
      } else {
        // All Staff mode
        if (filterAdvocate && filterAdvocate !== "all") {
          return matchAdvocate(advocate, filterAdvocate);
        }
        return true;
      }
    });
  }, [appointments, scope, filterAdvocate, loggedInAdvocateName]);

  // Date label formatting
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

  // Month grid calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const todayStr = new Date().toISOString().split("T")[0];

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    filteredAppointments.forEach((apt) => {
      const date = new Date(apt.startTime).toISOString().split("T")[0];
      if (!map[date]) map[date] = [];
      map[date].push(apt);
    });
    return map;
  }, [filteredAppointments]);

  // Operational blocks mapped by date
  const operationalBlocksByDate = useMemo(() => {
    const map: Record<string, OperationalBlock[]> = {};
    operationalBlocks.forEach((block) => {
      if (block.isArchived) return false;

      // Scope match
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

      // Visual layer filters
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

      const dStr = new Date(block.startTime).toISOString().split("T")[0];
      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(block);
    });
    return map;
  }, [operationalBlocks, scope, filterAdvocate, loggedInAdvocateName, layerFilters]);

  const monthGridDays: React.ReactNode[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    monthGridDays.push(
      <div key={`empty-${i}`} className="min-h-[7rem] border border-[#3A2C18]/40 bg-[#020A17]/40" />
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayAppointments = appointmentsByDate[dateStr] || [];
    const dayBlocks = operationalBlocksByDate[dateStr] || [];
    const isToday = dateStr === todayStr;

    // Check for all-day closure on this day
    const allDayClosure = dayBlocks.find(
      (b) =>
        b.isAllDay &&
        (b.scope === "ENTIRE_COMPANY" ||
          b.blockType.toLowerCase().includes("closed") ||
          b.blockType.toLowerCase().includes("holiday"))
    );

    let cellBackground = isToday
      ? "bg-[#071F3D]/50 border-[#C5A059]/70"
      : "hover:bg-[#07162B]/50 bg-[#020A17]/80";
    let cellStyle: React.CSSProperties = {};

    if (allDayClosure) {
      const pKey = detectItemPatternKey({
        blockType: allDayClosure.blockType,
        title: allDayClosure.title,
        isClosure: true,
      });
      cellStyle = {
        background: CALENDAR_PATTERNS[pKey].fabricBackground,
      };
    }

    monthGridDays.push(
      <div
        key={day}
        style={cellStyle}
        className={`min-h-[7rem] border border-[#3A2C18]/60 p-1.5 transition-colors cursor-pointer ${cellBackground}`}
        onClick={() => {
          const clickedDate = new Date(year, month, day);
          onDateClick?.(clickedDate);
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-xs font-mono font-bold ${
              isToday ? "text-[#FFE394] bg-[#020A17] px-1 rounded-[5px] border border-[#C5A059]/50" : "text-[#A69371]"
            }`}
          >
            {day}
          </span>
          {allDayClosure ? (
            <span
              className="text-[9px] font-mono px-1 rounded-[5px] bg-rose-950 text-rose-300 border border-rose-600/60 font-bold"
              title="Office Closed"
            >
              CLOSED
            </span>
          ) : dayAppointments.some((a) => a.status === "Needs Coverage") ? (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Needs Coverage" />
          ) : null}
        </div>

        <div className="space-y-1 overflow-hidden">
          {/* Operational Blocks in Month Cell */}
          {dayBlocks.slice(0, 2).map((block) => {
            const pKey = detectItemPatternKey({
              blockType: block.blockType,
              title: block.title,
              isClosure: block.scope === "ENTIRE_COMPANY" || block.blockType.toLowerCase().includes("closed"),
            });
            const pDef = CALENDAR_PATTERNS[pKey];

            return (
              <div
                key={`month-block-${block.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOperationalBlockClick?.(block);
                }}
                style={{ background: pDef.inlineBackground }}
                className={`text-[9px] px-1.5 py-0.5 rounded-[5px] cursor-pointer hover:opacity-90 transition-all border ${pDef.borderClass}`}
              >
                <div className="font-serif font-bold truncate leading-tight text-[#FFE394]">
                  {pDef.patternSymbol} {block.title}
                </div>
              </div>
            );
          })}

          {/* Client Appointments in Month Cell */}
          {dayAppointments.slice(0, 2).map((apt) => {
            const isNeedsCoverage = apt.status === "Needs Coverage";
            const advocateName = (apt.assignedAdvocateName || "Byron Honea").split(" ")[0];
            const patternKey = detectItemPatternKey(apt as any);
            const patternDef = CALENDAR_PATTERNS[patternKey];

            return (
              <div
                key={apt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(apt);
                }}
                style={{ background: patternDef.inlineBackground }}
                className={`text-[10px] px-1.5 py-1 rounded-[5px] cursor-pointer hover:opacity-90 transition-all border ${
                  isNeedsCoverage
                    ? "border-rose-600/80 shadow-sm shadow-rose-950"
                    : patternDef.borderClass
                }`}
              >
                <div className={`font-serif font-bold truncate leading-tight ${patternKey === "confirmed" ? "text-white" : "text-[#FFF4D4]"}`}>{apt.title}</div>
                <div className="flex items-center justify-between text-[9px] mt-0.5">
                  <span className={`truncate max-w-[85px] ${patternKey === "confirmed" ? "text-emerald-100" : "text-[#C6B697]"}`}>
                    {apt.studentName || apt.parentName || "Student"}
                  </span>
                  <span className={`font-semibold ${patternKey === "confirmed" ? "text-emerald-300" : "text-[#FFE394]"}`}>{advocateName}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── TOP SECTION (Meetings Today Card + Header + Schedule Button) ── */}
      {!hideHeaderAndControls && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Meetings Today Badge matching reference */}
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

            {/* Center: Title & Subtitle */}
            <div className="flex-1 md:px-4">
              <h1 className="text-2xl font-serif font-bold text-[#FFF4D4] tracking-tight leading-tight">
                {formattedHeaderDate}
              </h1>
              <p className="text-xs text-[#C6B697] mt-0.5">
                Your schedule and all staff appointments for today.
              </p>
            </div>

            {/* Right: + Schedule Appointment Button */}
            <div>
              <Button
                onClick={() => onScheduleClick?.()}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#FFE394] hover:to-[#DFBE77] text-[#07162B] font-bold text-sm h-10 px-4 rounded-[5px] shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#07162B] stroke-[3]" />
                <span>Schedule Appointment</span>
              </Button>
            </div>
          </div>

          {/* ── CONTROLS ROW (Day|Week|Month + My Calendar|All Staff + Advocate + Date) ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="flex flex-wrap items-center gap-3">
              {/* Day | Week | Month */}
              <div className="flex items-center p-0.5 rounded-[5px] bg-[#020A17] border border-[#3A2C18]">
                <button
                  type="button"
                  onClick={() => setViewMode("day")}
                  className={`px-4 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "day"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  }`}
                >
                  Day
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("week")}
                  className={`px-4 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "week"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  }`}
                >
                  Week
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("month")}
                  className={`px-4 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "month"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  }`}
                >
                  Month
                </button>
              </div>

              {/* My Calendar | All Staff */}
              <div className="flex items-center p-0.5 rounded-[5px] bg-[#020A17] border border-[#3A2C18]">
                <button
                  type="button"
                  onClick={() => {
                    setScope("my");
                    setTableTab("my");
                  }}
                  className={`px-4 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                    scope === "my"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  }`}
                >
                  My Calendar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScope("all");
                    setTableTab("all");
                  }}
                  className={`px-4 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                    scope === "all"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  }`}
                >
                  All Staff
                </button>
              </div>

              {/* Advocate Filter Dropdown */}
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

            {/* Right: Date selector matching reference */}
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

      {/* ── VIEWS CONTENT ── */}
      {viewMode === "day" && (
        <div className="space-y-4">
          {/* Today's Appointments Table directly above timeline */}
          <TodaysAppointmentsTable
            appointments={appointments}
            selectedDate={currentDate}
            loggedInAdvocateName={loggedInAdvocateName}
            onEventClick={(apt) => onEventClick?.(apt)}
            onReassignClick={(apt) => onReassignClick?.(apt)}
            activeTab={tableTab}
            onTabChange={setTableTab}
          />

          {/* Detailed Timeline */}
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

      {viewMode === "month" && (
        <Card className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden">
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-0">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-serif font-bold text-[#FFE394] py-2 border-b border-[#3A2C18]/60 uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
              {monthGridDays}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

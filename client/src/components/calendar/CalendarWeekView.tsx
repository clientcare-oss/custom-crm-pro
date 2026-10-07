import { useMemo } from "react";
import { formatDualTimes } from "@shared/timezones";
import { Badge } from "@/components/ui/badge";
import { Clock, User, AlertCircle, ArrowRightLeft, Building2 } from "lucide-react";
import { CalendarAppointment } from "./TodaysAppointmentsTable";
import {
  detectItemPatternKey,
  CALENDAR_PATTERNS,
  PATTERN_PRECEDENCE_ORDER,
  CalendarPatternKey,
} from "./CalendarPatternStyles";
import type { OperationalBlock } from "../../../../drizzle/schema";

interface CalendarWeekViewProps {
  appointments: CalendarAppointment[];
  operationalBlocks?: OperationalBlock[];
  currentDate: Date;
  onEventClick: (apt: CalendarAppointment) => void;
  onReassignClick: (apt: CalendarAppointment) => void;
  onDayClick: (date: Date) => void;
  onOperationalBlockClick?: (block: OperationalBlock) => void;
  scope?: "my" | "all";
  loggedInAdvocateName?: string;
  selectedAdvocateFilter?: string;
  layerFilters?: {
    showAppointments?: boolean;
    showProposedHolds?: boolean;
    showClosures?: boolean;
    showHolidays?: boolean;
    showPto?: boolean;
    showBlackouts?: boolean;
    showInternalEvents?: boolean;
    showProtectedWork?: boolean;
  };
}

function matchAdvocate(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  if (a === b) return true;
  return a.split(" ")[0] === b.split(" ")[0];
}

export default function CalendarWeekView({
  appointments,
  operationalBlocks = [],
  currentDate,
  onEventClick,
  onReassignClick,
  onDayClick,
  onOperationalBlockClick,
  scope = "my",
  loggedInAdvocateName = "Byron Honea",
  selectedAdvocateFilter = "all",
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
}: CalendarWeekViewProps) {
  // Calculate start of week (Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const firstDay = new Date(curr);
    firstDay.setDate(curr.getDate() - curr.getDay());
    firstDay.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDay);
      d.setDate(firstDay.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filter appointments by layer toggles
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (apt.isHold && !layerFilters.showProposedHolds) return false;
      if (!apt.isHold && !layerFilters.showAppointments) return false;
      return true;
    });
  }, [appointments, layerFilters]);

  // Map appointments by date string
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    filteredAppointments.forEach((apt) => {
      const dateStr = new Date(apt.startTime).toISOString().split("T")[0];
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(apt);
    });
    return map;
  }, [filteredAppointments]);

  // Filter operational blocks by scope and layer toggles
  const filteredBlocks = useMemo(() => {
    return operationalBlocks.filter((block) => {
      if (block.isArchived) return false;

      // Scope match
      if (block.scope !== "ENTIRE_COMPANY") {
        if (scope === "my") {
          if (!block.targetStaffNames || !matchAdvocate(block.targetStaffNames, loggedInAdvocateName)) {
            return false;
          }
        } else if (selectedAdvocateFilter && selectedAdvocateFilter !== "all") {
          if (!block.targetStaffNames || !matchAdvocate(block.targetStaffNames, selectedAdvocateFilter)) {
            return false;
          }
        }
      }

      // Visual layer filters
      const bt = block.blockType.toLowerCase();
      if ((bt.includes("closure") || bt.includes("closed") || block.scope === "ENTIRE_COMPANY") && !layerFilters.showClosures) {
        return false;
      }
      if (bt.includes("holiday") && !layerFilters.showHolidays) return false;
      if ((bt.includes("pto") || bt.includes("vacation") || bt.includes("personal") || bt.includes("sick")) && !layerFilters.showPto) {
        return false;
      }
      if (bt.includes("blackout") && !layerFilters.showBlackouts) return false;
      if ((bt.includes("training") || bt.includes("meeting") || bt.includes("internal")) && !layerFilters.showInternalEvents) {
        return false;
      }
      if ((bt.includes("protected") || bt.includes("casework") || bt.includes("focus")) && !layerFilters.showProtectedWork) {
        return false;
      }

      return true;
    });
  }, [operationalBlocks, scope, loggedInAdvocateName, selectedAdvocateFilter, layerFilters]);

  // Map operational blocks by date string
  const operationalBlocksByDate = useMemo(() => {
    const map: Record<string, OperationalBlock[]> = {};
    weekDays.forEach((dayDate) => {
      const dateStr = dayDate.toISOString().split("T")[0];
      const dayStart = new Date(`${dateStr}T00:00:00`);
      const dayEnd = new Date(`${dateStr}T23:59:59`);

      map[dateStr] = filteredBlocks.filter((b) => {
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        return bStart <= dayEnd && bEnd >= dayStart;
      });
    });
    return map;
  }, [weekDays, filteredBlocks]);

  return (
    <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[#3A2C18]/60">
        {weekDays.map((dayDate) => {
          const dateStr = dayDate.toISOString().split("T")[0];
          const isToday = dateStr === todayStr;
          const dayApts = appointmentsByDate[dateStr] || [];
          const dayBlocks = operationalBlocksByDate[dateStr] || [];
          const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });

          // Detect all-day company closure or major holiday
          const allDayClosure = dayBlocks.find(
            (b) =>
              b.isAllDay &&
              (b.scope === "ENTIRE_COMPANY" ||
                b.blockType.toLowerCase().includes("closed") ||
                b.blockType.toLowerCase().includes("holiday"))
          );

          // If there's an all-day closure, shade the whole day's column background with the crosshatch pattern!
          let columnBackground = isToday ? "bg-[#071F3D]/50 border-t-2 border-t-[#C5A059]" : "hover:bg-[#07162B]/50";
          let columnStyle: React.CSSProperties = {};

          if (allDayClosure) {
            const pKey = detectItemPatternKey({
              blockType: allDayClosure.blockType,
              title: allDayClosure.title,
              isClosure: true,
            });
            columnStyle = {
              background: CALENDAR_PATTERNS[pKey].fabricBackground,
            };
          }

          return (
            <div
              key={dateStr}
              style={columnStyle}
              className={`min-h-[340px] flex flex-col p-2.5 transition-colors ${columnBackground}`}
            >
              {/* Day Header */}
              <div
                onClick={() => onDayClick(dayDate)}
                className={`cursor-pointer pb-2 mb-2 border-b border-[#3A2C18]/60 flex items-center justify-between group ${
                  isToday ? "border-[#C5A059]/80" : ""
                }`}
              >
                <div>
                  <span className="text-[11px] font-bold text-[#A69371] uppercase tracking-wider block font-mono">
                    {dayName}
                  </span>
                  <span
                    className={`text-sm font-serif font-bold ${
                      isToday ? "text-[#FFE394]" : "text-[#FFF4D4] group-hover:text-[#FFE394]"
                    }`}
                  >
                    {dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                {isToday && (
                  <Badge variant="outline" className="bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]/40 text-[10px] px-1.5 py-0 font-mono font-semibold">
                    Today
                  </Badge>
                )}
              </div>

              {/* All-Day Closure Tag if active */}
              {allDayClosure && (
                <div
                  onClick={() => onOperationalBlockClick?.(allDayClosure)}
                  className="mb-2 p-1.5 rounded-lg border border-rose-600/70 bg-rose-950/80 text-rose-200 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:brightness-110 shadow-sm"
                >
                  <Building2 className="w-3 h-3 text-rose-400 shrink-0" />
                  <span className="truncate">{allDayClosure.title} (CLOSED)</span>
                </div>
              )}

              {/* Day Events & Operational Blocks List */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {/* 1. Render Operational Blocks */}
                {dayBlocks
                  .filter((b) => !b.isAllDay || b.id !== allDayClosure?.id)
                  .map((block) => {
                    const patternKey = detectItemPatternKey({
                      blockType: block.blockType,
                      title: block.title,
                      isClosure: block.scope === "ENTIRE_COMPANY" || block.blockType.toLowerCase().includes("closed"),
                    });
                    const patternDef = CALENDAR_PATTERNS[patternKey];
                    const startStr = block.isAllDay
                      ? "Full Day"
                      : new Date(block.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

                    return (
                      <div
                        key={`op-block-${block.id}`}
                        onClick={() => onOperationalBlockClick?.(block)}
                        style={{ background: patternDef.inlineBackground }}
                        className={`rounded-xl border p-2 text-xs cursor-pointer transition-all hover:scale-[1.01] shadow-sm ${patternDef.borderClass}`}
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono text-[#FFE394] mb-0.5">
                          <span className="font-bold uppercase tracking-wider">{patternDef.patternSymbol} {patternDef.shortLabel}</span>
                          <span>{startStr}</span>
                        </div>
                        <div className="font-serif font-bold text-[#FFF4D4] truncate leading-tight">
                          {block.title}
                        </div>
                        <div className="text-[10px] text-[#C6B697] truncate mt-0.5">
                          {block.scope === "ENTIRE_COMPANY" ? "Entire Company" : block.targetStaffNames || "Staff"}
                        </div>
                      </div>
                    );
                  })}

                {/* 2. Render Client Appointments */}
                {dayApts.map((apt) => {
                  const dual = formatDualTimes(
                    apt.startTime,
                    apt.endTime,
                    apt.clientTimeZone,
                    apt.originalTimeZone || "America/New_York"
                  );
                  const advocateName = apt.assignedAdvocateName || "Byron Honea";
                  const isNeedsCoverage = apt.status === "Needs Coverage";
                  const isHold = apt.isHold;
                  const isParentSelected = apt.parentPreferred || apt.status === "PARENT_SELECTED";
                  const patternKey = detectItemPatternKey(apt as any);
                  const patternDef = CALENDAR_PATTERNS[patternKey];

                  let weekCardBg = patternDef.inlineBackground;
                  let weekCardBorder = patternDef.borderClass;

                  if (isHold && isParentSelected) {
                    weekCardBorder = "border-dashed border-purple-500/70 border-l-4 border-l-purple-400";
                    weekCardBg =
                      "repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.2) 0px, rgba(168, 85, 247, 0.2) 8px, rgba(16, 43, 78, 0.5) 8px, rgba(16, 43, 78, 0.5) 16px)";
                  } else if (isNeedsCoverage) {
                    weekCardBorder = "border-rose-600/80 border-l-4 border-l-rose-500";
                    weekCardBg =
                      "repeating-linear-gradient(45deg, rgba(225, 29, 72, 0.25) 0px, rgba(225, 29, 72, 0.25) 6px, rgba(20, 5, 10, 0.8) 6px, rgba(20, 5, 10, 0.8) 12px)";
                  }

                  return (
                    <div
                      key={apt.id}
                      onClick={() => onEventClick(apt)}
                      style={{ background: weekCardBg }}
                      className={`rounded-xl border p-2 text-xs cursor-pointer transition-all hover:scale-[1.01] shadow-md relative z-10 ${weekCardBorder}`}
                    >
                      {/* Time Badges */}
                      <div className="flex items-center gap-1 font-mono text-[9px] mb-1 flex-wrap">
                        <span className="text-emerald-950 font-extrabold bg-emerald-400 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                          🟢 {dual.waypointTime.startTime} ET
                        </span>
                        {dual.clientTime.isDifferent && (
                          <span className="text-rose-300 font-bold bg-rose-950/80 px-1 py-0.5 rounded border border-rose-800/50">
                            🔴 {dual.clientTime.startTime} {dual.clientTime.tzAbbr}
                          </span>
                        )}
                      </div>

                      {/* Title & Student */}
                      <div className="font-serif font-bold text-white truncate leading-tight">
                        {apt.title}
                      </div>
                      <div className="text-[11px] text-emerald-200/90 truncate font-medium">
                        {apt.studentName || apt.parentName || "Student"}
                      </div>
                      {isHold && (
                        <div className="mt-0.5 text-[9px] font-mono text-amber-300 font-bold truncate">
                          {apt.siblingLabel || "1 OF 3 POSSIBLE DATES"}
                        </div>
                      )}

                      {/* Status / Coverage Badge */}
                      <div className="mt-1.5 flex items-center justify-between gap-1 flex-wrap">
                        {isNeedsCoverage ? (
                          <Badge
                            variant="outline"
                            className="bg-rose-950 text-rose-300 border-rose-500 text-[9px] px-1 py-0 font-bold flex items-center gap-1 font-mono"
                          >
                            <AlertCircle className="w-2.5 h-2.5" /> Needs Coverage
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 border border-emerald-200 uppercase shadow-[0_0_8px_rgba(52,211,153,0.5)] tracking-wider">
                              CONFIRMED
                            </span>
                            <span className="truncate max-w-[70px] text-emerald-200 font-medium">{advocateName}</span>
                          </div>
                        )}

                        {isNeedsCoverage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReassignClick(apt);
                            }}
                            className="text-[10px] text-rose-300 hover:text-white underline font-semibold flex items-center gap-0.5 cursor-pointer font-mono"
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" /> Reassign
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {dayApts.length === 0 && dayBlocks.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[#A69371]/60 text-[11px] italic py-8">
                    No meetings
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

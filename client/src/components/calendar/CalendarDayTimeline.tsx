import { useMemo } from "react";
import { MoreHorizontal, Building2, User, ShieldAlert, AlertTriangle, Calendar, Info, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CalendarAppointment } from "./TodaysAppointmentsTable";
import {
  detectItemPatternKey,
  CALENDAR_PATTERNS,
  PATTERN_PRECEDENCE_ORDER,
  CalendarPatternKey,
} from "./CalendarPatternStyles";
import type { OperationalBlock } from "../../../../drizzle/schema";

interface CalendarDayTimelineProps {
  appointments: CalendarAppointment[];
  operationalBlocks?: OperationalBlock[];
  selectedDate: Date;
  onEventClick: (apt: CalendarAppointment) => void;
  onReassignClick: (apt: CalendarAppointment) => void;
  onSlotClick?: (date: Date, time: string) => void;
  onOperationalBlockClick?: (block: OperationalBlock) => void;
  scope?: "my" | "all";
  loggedInAdvocateName?: string;
  selectedAdvocateFilter?: string;
  // Visual layer filter toggles
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

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function formatHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${ampm}`;
}

function matchAdvocate(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  if (a === b) return true;
  return a.split(" ")[0] === b.split(" ")[0];
}

export default function CalendarDayTimeline({
  appointments,
  operationalBlocks = [],
  selectedDate,
  onEventClick,
  onReassignClick,
  onSlotClick,
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
}: CalendarDayTimelineProps) {
  const selectedDateStr = useMemo(() => {
    return new Date(selectedDate).toISOString().split("T")[0];
  }, [selectedDate]);

  // Appointments for selected day (excluding cancelled) filtered by layer toggles
  const dayAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const d = new Date(apt.startTime).toISOString().split("T")[0];
      if (d !== selectedDateStr || apt.status === "Cancelled") return false;

      // Filter layer toggles
      if (apt.isHold && !layerFilters.showProposedHolds) return false;
      if (!apt.isHold && !layerFilters.showAppointments) return false;

      return true;
    });
  }, [appointments, selectedDateStr, layerFilters]);

  // Relevant operational blocks for this day, matching scope and staff filter
  const dayOperationalBlocks = useMemo(() => {
    const dayStart = new Date(`${selectedDateStr}T00:00:00`);
    const dayEnd = new Date(`${selectedDateStr}T23:59:59`);

    return operationalBlocks.filter((block) => {
      if (block.isArchived) return false;

      // Check date overlap
      const blockStart = new Date(block.startTime);
      const blockEnd = new Date(block.endTime);
      const overlaps = blockStart <= dayEnd && blockEnd >= dayStart;
      if (!overlaps) return false;

      // Scope match
      if (block.scope !== "ENTIRE_COMPANY") {
        if (scope === "my") {
          // Check if block applies to loggedInAdvocate
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
  }, [operationalBlocks, selectedDateStr, scope, loggedInAdvocateName, selectedAdvocateFilter, layerFilters]);

  // Check for all-day company closure or major holiday on this date
  const allDayClosure = useMemo(() => {
    return dayOperationalBlocks.find(
      (b) =>
        b.isAllDay &&
        (b.scope === "ENTIRE_COMPANY" ||
          b.blockType.toLowerCase().includes("closed") ||
          b.blockType.toLowerCase().includes("holiday"))
    );
  }, [dayOperationalBlocks]);

  // Map appointments to the nearest hour slot
  const appointmentsByHour = useMemo(() => {
    const map: Record<number, CalendarAppointment[]> = {};
    for (const h of HOURS) {
      map[h] = [];
    }

    dayAppointments.forEach((apt) => {
      const startH = new Date(apt.startTime).getHours();
      const slot = Math.min(Math.max(startH, 8), 17);
      if (!map[slot]) map[slot] = [];
      map[slot].push(apt);
    });

    return map;
  }, [dayAppointments]);

  // Map operational blocks to the hour slots they cover
  const operationalBlocksByHour = useMemo(() => {
    const map: Record<number, OperationalBlock[]> = {};
    for (const h of HOURS) {
      map[h] = [];
    }

    dayOperationalBlocks.forEach((block) => {
      if (block.isAllDay) {
        for (const h of HOURS) {
          map[h].push(block);
        }
        return;
      }

      const startH = new Date(block.startTime).getHours();
      const endH = new Date(block.endTime).getHours();
      const startMin = new Date(block.startTime).getMinutes();
      const effectiveEndH = endH === startH || (endH === startH + 1 && new Date(block.endTime).getMinutes() === 0) ? startH : endH;

      for (const h of HOURS) {
        if (h >= startH && h <= Math.max(startH, effectiveEndH)) {
          map[h].push(block);
        }
      }
    });

    return map;
  }, [dayOperationalBlocks]);

  return (
    <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] p-4 sm:p-5 relative overflow-hidden">
      {/* ── ALL-DAY CLOSURE / HOLIDAY FULL-WIDTH BANNER ── */}
      {allDayClosure && (
        <div
          onClick={() => onOperationalBlockClick?.(allDayClosure)}
          style={{
            background:
              CALENDAR_PATTERNS[
                detectItemPatternKey({
                  blockType: allDayClosure.blockType,
                  title: allDayClosure.title,
                  isClosure: true,
                })
              ].inlineBackground,
          }}
          className="mb-5 rounded-xl border border-rose-600/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg cursor-pointer hover:brightness-110 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/60 text-rose-300 shrink-0">
              <Building2 className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500">
                  OFFICE CLOSED · ENTIRE COMPANY
                </span>
                <span className="text-[11px] font-mono text-[#FFE394] font-semibold">
                  {allDayClosure.schedulingEffect === "HARD_BLOCK" ? "🛡️ Strict Block" : "ℹ️ Informational"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#FFF4D4] mt-1">
                {allDayClosure.title}
              </h3>
              <p className="text-xs text-[#C6B697]">
                Waypoint is officially closed for client scheduling today. No appointments may normally be booked.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 text-xs font-mono text-[#FFE394] bg-[#020A17]/80 px-3 py-1.5 rounded-lg border border-[#3A2C18]">
            <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>ALL DAY</span>
          </div>
        </div>
      )}

      {/* ── TIMELINE HOUR SLOTS WITH AVAILABILITY FABRIC ── */}
      <div className="space-y-4">
        {HOURS.map((hour) => {
          const hourLabel = formatHour(hour);
          const hourApts = appointmentsByHour[hour] || [];
          const hourBlocks = operationalBlocksByHour[hour] || [];

          // Precedence resolver to choose dominant pattern for the availability fabric shading
          let dominantPatternKey: CalendarPatternKey = "block_time";
          let dominantBlock: OperationalBlock | null = null;

          if (hourBlocks.length > 0) {
            // Pick highest precedence pattern
            let bestIndex = 999;
            for (const b of hourBlocks) {
              const pKey = detectItemPatternKey({
                blockType: b.blockType,
                title: b.title,
                isClosure: b.scope === "ENTIRE_COMPANY" || b.blockType.toLowerCase().includes("closed"),
              });
              const idx = PATTERN_PRECEDENCE_ORDER.indexOf(pKey);
              if (idx !== -1 && idx < bestIndex) {
                bestIndex = idx;
                dominantPatternKey = pKey;
                dominantBlock = b;
              }
            }
          }

          const hasOperationalBlock = hourBlocks.length > 0;
          const dominantDef = CALENDAR_PATTERNS[dominantPatternKey];

          // Availability Fabric slot background: if blocked, woven/etched pattern texture covers the time slot
          const slotBackground = hasOperationalBlock
            ? dominantDef.fabricBackground
            : undefined;

          const isHardBlock = dominantBlock?.schedulingEffect === "HARD_BLOCK";

          return (
            <div key={hour} className="flex items-start gap-4">
              {/* Hour Label */}
              <div className="w-16 sm:w-20 shrink-0 text-right pt-2">
                <span className="text-xs font-semibold text-[#A69371] font-mono">
                  {hourLabel}
                </span>
                {hasOperationalBlock && (
                  <div className="text-[9px] font-mono text-[#C5A059]/80 truncate">
                    {dominantDef.patternSymbol}
                  </div>
                )}
              </div>

              {/* Main Content Area (Fabric Surface) */}
              <div
                onClick={() => {
                  if (hourApts.length === 0 && !isHardBlock) {
                    onSlotClick?.(selectedDate, `${String(hour).padStart(2, "0")}:00`);
                  }
                }}
                style={{
                  background: slotBackground,
                }}
                className={`flex-1 min-h-[50px] border-t border-[#3A2C18]/60 pt-2 space-y-2 rounded-lg transition-all p-2 ${
                  hasOperationalBlock
                    ? "border-l-2 border-l-[#C5A059]/50 shadow-inner"
                    : hourApts.length === 0
                    ? "hover:bg-[#102B4E]/20 cursor-pointer"
                    : ""
                }`}
              >
                {/* 1. OPERATIONAL AVAILABILITY BLOCKS (Rendered first as the base fabric banners) */}
                {hourBlocks.map((block) => {
                  const bPatternKey = detectItemPatternKey({
                    blockType: block.blockType,
                    title: block.title,
                    isClosure: block.scope === "ENTIRE_COMPANY" || block.blockType.toLowerCase().includes("closed"),
                  });
                  const bDef = CALENDAR_PATTERNS[bPatternKey];

                  const startStr = block.isAllDay
                    ? "All Day"
                    : new Date(block.startTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      });
                  const endStr = block.isAllDay
                    ? ""
                    : new Date(block.endTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      });

                  return (
                    <div
                      key={`block-${block.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOperationalBlockClick?.(block);
                      }}
                      style={{ background: bDef.inlineBackground }}
                      className={`rounded-xl border p-3 flex items-center justify-between gap-3 cursor-pointer transition-all hover:brightness-110 shadow-sm ${bDef.borderClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18] text-[#FFE394] shrink-0">
                          {block.scope === "ENTIRE_COMPANY" ? (
                            <Building2 className="w-4 h-4 text-rose-400" />
                          ) : (
                            <User className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-serif font-bold text-[#FFF4D4] text-xs sm:text-sm">
                              {block.title}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/50 text-[#FFE394] border border-[#3A2C18] uppercase">
                              {bDef.label}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-mono px-1.5 py-0 ${
                                block.schedulingEffect === "HARD_BLOCK"
                                  ? "bg-rose-950/80 text-rose-300 border-rose-500/60"
                                  : block.schedulingEffect === "SOFT_BLOCK"
                                  ? "bg-amber-950/80 text-amber-300 border-amber-500/60"
                                  : "bg-blue-950/80 text-blue-300 border-blue-500/60"
                              }`}
                            >
                              {block.schedulingEffect === "HARD_BLOCK"
                                ? "HARD BLOCK"
                                : block.schedulingEffect === "SOFT_BLOCK"
                                ? "SOFT PROTECTION"
                                : "INFORMATIONAL"}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-[#C6B697] mt-0.5 flex items-center gap-2">
                            <span>
                              {block.scope === "ENTIRE_COMPANY"
                                ? "Entire Waypoint Team"
                                : block.targetStaffNames || "Assigned Advocate"}
                            </span>
                            {block.reason && (
                              <>
                                <span className="text-[#3A2C18]">|</span>
                                <span className="italic text-[#A69371] truncate max-w-xs">{block.reason}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-medium text-[#FFE394]">
                          {startStr} {endStr ? `– ${endStr}` : ""}
                        </span>
                        <div className="text-[10px] text-[#A69371] hover:underline cursor-pointer">
                          View details →
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 2. CONFIRMED CLIENT APPOINTMENTS & CANDIDATE HOLDS (Sit ABOVE the fabric) */}
                {hourApts.map((apt) => {
                  const isNeedsCoverage = apt.status === "Needs Coverage";
                  const startStr = new Date(apt.startTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const endStr = new Date(apt.endTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const studentName = apt.studentName || apt.parentName || "Student";
                  const advocateName = (apt.assignedAdvocateName || "Byron Honea").split(" ")[0];

                  const isHold = apt.isHold;
                  const isParentSelected = apt.parentPreferred || apt.status === "PARENT_SELECTED";
                  const patternKey = detectItemPatternKey(apt);
                  const patternDef = CALENDAR_PATTERNS[patternKey];

                  let cardBorderClass = patternDef.borderClass;
                  let cardBackground = patternDef.inlineBackground;

                  if (isHold && isParentSelected) {
                    cardBorderClass = "border-dashed border-purple-500/70 border-l-4 border-l-purple-400";
                    cardBackground =
                      "repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.2) 0px, rgba(168, 85, 247, 0.2) 8px, rgba(16, 43, 78, 0.5) 8px, rgba(16, 43, 78, 0.5) 16px)";
                  } else if (isNeedsCoverage) {
                    cardBorderClass = "border-rose-800/80 border-l-4 border-l-rose-500";
                    cardBackground =
                      "repeating-linear-gradient(45deg, rgba(225, 29, 72, 0.25) 0px, rgba(225, 29, 72, 0.25) 6px, rgba(20, 5, 10, 0.8) 6px, rgba(20, 5, 10, 0.8) 12px)";
                  }

                  return (
                    <div
                      key={apt.id}
                      onClick={() => onEventClick(apt)}
                      style={{ background: cardBackground }}
                      className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all hover:brightness-110 shadow-md relative z-10 ${cardBorderClass}`}
                    >
                      {/* Left: Title & Subtitle */}
                      <div>
                        <div className="font-serif font-bold text-[#FFF4D4] text-sm tracking-tight leading-tight flex items-center gap-2">
                          <span>{apt.title}</span>
                          {isHold && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                              {isParentSelected ? "PARENT SELECTED" : "TENTATIVE"}
                            </span>
                          )}
                        </div>

                        {isHold ? (
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#102B4E]/80 text-[#FFE394] border border-[#3A2C18]">
                              {apt.siblingLabel || "1 OF 3 POSSIBLE DATES"}
                            </span>
                            <span className="text-xs text-[#C6B697]">
                              {studentName} · Waiting on: <strong className="text-[#FFE394]">{apt.waitingOn || "School"}</strong>
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-[#C6B697] mt-0.5">
                            <span className="text-[#FFF4D4] font-medium">{studentName}</span>
                            <span className="mx-2 text-[#3A2C18]">|</span>
                            <span className="text-[#FFE394] font-medium">{advocateName}</span>
                            {isNeedsCoverage && (
                              <span className="ml-2 text-rose-400 font-semibold font-mono">
                                (Needs Coverage)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Time Range & Action Button */}
                      <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-[#FFE394] font-mono font-medium">
                          {startStr} – {endStr}
                        </span>

                        <button
                          type="button"
                          onClick={() => onEventClick(apt)}
                          className="h-7 w-8 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] text-[#D8C7A5] hover:text-[#FFF4D4] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4 text-[#A69371]" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* If open slot, render a subtle prompt if no blocks & no apts */}
                {hourApts.length === 0 && !hasOperationalBlock && (
                  <div className="py-2 text-center text-[#A69371]/50 text-xs font-mono hover:text-[#FFE394]/70 transition-colors">
                    + Available for client scheduling
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

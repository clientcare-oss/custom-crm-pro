import { useMemo } from "react";
import { MoreHorizontal } from "lucide-react";
import { CalendarAppointment } from "./TodaysAppointmentsTable";
import { detectItemPatternKey, CALENDAR_PATTERNS } from "./CalendarPatternStyles";

interface CalendarDayTimelineProps {
  appointments: CalendarAppointment[];
  selectedDate: Date;
  onEventClick: (apt: CalendarAppointment) => void;
  onReassignClick: (apt: CalendarAppointment) => void;
  onSlotClick?: (date: Date, time: string) => void;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function formatHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${ampm}`;
}

export default function CalendarDayTimeline({
  appointments,
  selectedDate,
  onEventClick,
  onReassignClick,
  onSlotClick,
}: CalendarDayTimelineProps) {
  const selectedDateStr = useMemo(() => {
    return new Date(selectedDate).toISOString().split("T")[0];
  }, [selectedDate]);

  // Appointments for selected day (excluding cancelled)
  const dayAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const d = new Date(apt.startTime).toISOString().split("T")[0];
      return d === selectedDateStr && apt.status !== "Cancelled";
    });
  }, [appointments, selectedDateStr]);

  // Map appointments to the nearest hour slot
  const appointmentsByHour = useMemo(() => {
    const map: Record<number, CalendarAppointment[]> = {};
    for (const h of HOURS) {
      map[h] = [];
    }

    dayAppointments.forEach((apt) => {
      const startH = new Date(apt.startTime).getHours();
      // Clamp to 8..17
      const slot = Math.min(Math.max(startH, 8), 17);
      if (!map[slot]) map[slot] = [];
      map[slot].push(apt);
    });

    return map;
  }, [dayAppointments]);

  return (
    <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] p-4 sm:p-5">
      <div className="space-y-4">
        {HOURS.map((hour) => {
          const hourLabel = formatHour(hour);
          const hourApts = appointmentsByHour[hour] || [];

          return (
            <div key={hour} className="flex items-start gap-4">
              {/* Hour Label */}
              <div className="w-16 sm:w-20 shrink-0 text-right pt-2">
                <span className="text-xs font-semibold text-[#A69371] font-mono">
                  {hourLabel}
                </span>
              </div>

              {/* Main Content Area */}
              <div
                onClick={() => {
                  if (hourApts.length === 0) {
                    onSlotClick?.(selectedDate, `${String(hour).padStart(2, "0")}:00`);
                  }
                }}
                className={`flex-1 min-h-[46px] border-t border-[#3A2C18]/60 pt-2 space-y-2 rounded-lg transition-colors ${
                  hourApts.length === 0 ? "hover:bg-[#102B4E]/20 cursor-pointer" : ""
                }`}
              >
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

                  // Detect pattern specification
                  const isHold = apt.isHold;
                  const isParentSelected = apt.parentPreferred || apt.status === "PARENT_SELECTED";
                  const patternKey = detectItemPatternKey(apt);
                  const patternDef = CALENDAR_PATTERNS[patternKey];

                  // Card styling depending on type & coverage in Admiralty Theme
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
                      className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all hover:brightness-110 shadow-sm ${cardBorderClass}`}
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { formatDualTimes } from "@shared/timezones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, AlertCircle, ArrowRightLeft } from "lucide-react";
import { CalendarAppointment } from "./TodaysAppointmentsTable";

interface CalendarWeekViewProps {
  appointments: CalendarAppointment[];
  currentDate: Date;
  onEventClick: (apt: CalendarAppointment) => void;
  onReassignClick: (apt: CalendarAppointment) => void;
  onDayClick: (date: Date) => void;
}

export default function CalendarWeekView({
  appointments,
  currentDate,
  onEventClick,
  onReassignClick,
  onDayClick,
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

  // Map appointments by date string
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    appointments.forEach((apt) => {
      const dateStr = new Date(apt.startTime).toISOString().split("T")[0];
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(apt);
    });
    return map;
  }, [appointments]);

  return (
    <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[#3A2C18]/60">
        {weekDays.map((dayDate) => {
          const dateStr = dayDate.toISOString().split("T")[0];
          const isToday = dateStr === todayStr;
          const dayApts = appointmentsByDate[dateStr] || [];
          const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });

          return (
            <div
              key={dateStr}
              className={`min-h-[300px] flex flex-col p-2.5 transition-colors ${
                isToday ? "bg-[#071F3D]/50 border-t-2 border-t-[#C5A059]" : "hover:bg-[#07162B]/50"
              }`}
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

              {/* Day Appointments List */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {dayApts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[#A69371]/60 text-[11px] italic py-8">
                    No meetings
                  </div>
                ) : (
                  dayApts.map((apt) => {
                    const dual = formatDualTimes(
                      apt.startTime,
                      apt.endTime,
                      apt.clientTimeZone,
                      apt.originalTimeZone || "America/New_York"
                    );
                    const advocateName = apt.assignedAdvocateName || "Byron Honea";
                    const isNeedsCoverage = apt.status === "Needs Coverage";

                    return (
                      <div
                        key={apt.id}
                        onClick={() => onEventClick(apt)}
                        className={`rounded-xl border p-2 text-xs cursor-pointer transition-all hover:scale-[1.01] shadow-sm ${
                          isNeedsCoverage
                            ? "bg-rose-950/50 border-rose-600/80 text-rose-200 shadow-md shadow-rose-950/40"
                            : "bg-[#020A17]/90 border-[#3A2C18] text-[#FFF4D4] hover:border-[#C5A059]/70"
                        }`}
                      >
                        {/* Time Badges */}
                        <div className="flex items-center gap-1 font-mono text-[9px] mb-1 flex-wrap">
                          <span className="text-emerald-300 font-bold bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-800/50">
                            🟢 {dual.waypointTime.startTime} ET
                          </span>
                          {dual.clientTime.isDifferent && (
                            <span className="text-rose-300 font-bold bg-rose-950/80 px-1 py-0.5 rounded border border-rose-800/50">
                              🔴 {dual.clientTime.startTime} {dual.clientTime.tzAbbr}
                            </span>
                          )}
                        </div>

                        {/* Title & Student */}
                        <div className="font-serif font-bold text-[#FFF4D4] truncate leading-tight">
                          {apt.title}
                        </div>
                        <div className="text-[11px] text-[#FFE394]/90 truncate">
                          {apt.studentName || apt.parentName || "Student"}
                        </div>

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
                            <div className="flex items-center gap-1 text-[10px] text-[#A69371]">
                              <User className="w-3 h-3 text-[#C5A059] shrink-0" />
                              <span className="truncate max-w-[80px] text-[#C6B697]">{advocateName}</span>
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
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

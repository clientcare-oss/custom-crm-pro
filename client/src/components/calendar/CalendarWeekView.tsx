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
    <div className="rounded-xl border border-blue-900/60 bg-[#000820] shadow-xl overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-blue-950/70">
        {weekDays.map((dayDate) => {
          const dateStr = dayDate.toISOString().split("T")[0];
          const isToday = dateStr === todayStr;
          const dayApts = appointmentsByDate[dateStr] || [];
          const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = dayDate.getDate();

          return (
            <div
              key={dateStr}
              className={`min-h-[300px] flex flex-col p-2.5 transition-colors ${
                isToday ? "bg-cyan-950/15" : "hover:bg-blue-950/20"
              }`}
            >
              {/* Day Header */}
              <div
                onClick={() => onDayClick(dayDate)}
                className={`cursor-pointer pb-2 mb-2 border-b border-blue-900/40 flex items-center justify-between group ${
                  isToday ? "border-cyan-400/80" : ""
                }`}
              >
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {dayName}
                  </span>
                  <span
                    className={`text-sm font-black font-mono ${
                      isToday ? "text-cyan-400" : "text-white group-hover:text-cyan-300"
                    }`}
                  >
                    {dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                {isToday && (
                  <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-400/50 text-[10px] px-1.5 py-0">
                    Today
                  </Badge>
                )}
              </div>

              {/* Day Appointments List */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {dayApts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600 text-[11px] italic py-8">
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
                        className={`rounded-lg border p-2 text-xs cursor-pointer transition-all hover:scale-[1.01] ${
                          isNeedsCoverage
                            ? "bg-rose-950/50 border-rose-600 text-rose-200 shadow-md shadow-rose-950/40"
                            : "bg-[#001033] border-blue-900/60 text-slate-200 hover:border-cyan-500/50"
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
                        <div className="font-bold text-white truncate leading-tight">
                          {apt.title}
                        </div>
                        <div className="text-[11px] text-cyan-300/90 truncate">
                          {apt.studentName || apt.parentName || "Student"}
                        </div>

                        {/* Status / Coverage Badge */}
                        <div className="mt-1.5 flex items-center justify-between gap-1 flex-wrap">
                          {isNeedsCoverage ? (
                            <Badge
                              variant="outline"
                              className="bg-rose-950 text-rose-300 border-rose-500 text-[9px] px-1 py-0 font-bold flex items-center gap-1"
                            >
                              <AlertCircle className="w-2.5 h-2.5" /> Needs Coverage
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <User className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="truncate max-w-[80px]">{advocateName}</span>
                            </div>
                          )}

                          {isNeedsCoverage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReassignClick(apt);
                              }}
                              className="text-[10px] text-rose-300 hover:text-white underline font-semibold flex items-center gap-0.5"
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

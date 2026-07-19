import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays, Clock } from "lucide-react";
import { toast } from "sonner";

interface InlineSchedulerProps {
  sessionTypeId: number | null;
  sessionTypeName?: string;
  sessionDuration?: number; // minutes
  parentName: string;
  parentEmail: string;
  studentName?: string; // student name for appointment title
  clientId?: number | null; // student contact ID to link appointment to
  onBooked: (date: string, time: string) => void;
  isPreview?: boolean;
}

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ");
  } catch {
    return "Eastern Time";
  }
}

// Preview placeholder slots
const PREVIEW_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

export default function InlineScheduler({
  sessionTypeId,
  sessionTypeName,
  sessionDuration = 60,
  parentName,
  parentEmail,
  studentName,
  clientId,
  onBooked,
  isPreview = false,
}: InlineSchedulerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const userTz = getUserTimezone();

  // Fetch session type to know which days of the week have hours
  const { data: sessionTypeData } = trpc.sessionTypes.getById.useQuery(
    { id: sessionTypeId! },
    { enabled: !!sessionTypeId && !isPreview }
  );

  // Compute effective duration in minutes from sessionTypeData (overrides prop when available)
  const effectiveDurationMin = useMemo(() => {
    if (sessionTypeData) {
      const dur = Number(sessionTypeData.duration);
      const unit = String(sessionTypeData.durationUnit).trim();
      console.log('[InlineScheduler] duration:', dur, 'unit:', unit, 'raw:', sessionTypeData.duration, sessionTypeData.durationUnit);
      return unit === 'hours' ? dur * 60 : dur;
    }
    return Number(sessionDuration);
  }, [sessionTypeData, sessionDuration]);

  // Parse weekly hours to determine which day-of-week indices have availability
  const availableDayIndices = useMemo<Set<number>>(() => {
    if (isPreview) {
      // In preview, all weekdays are available
      return new Set([1, 2, 3, 4, 5]);
    }
    if (!sessionTypeData?.weeklyHours) return new Set();
    try {
      const wh: Record<string, { start: string; end: string }[]> = JSON.parse(sessionTypeData.weeklyHours);
      const available = new Set<number>();
      DAY_KEYS.forEach((key, idx) => {
        if (wh[key] && wh[key].length > 0) available.add(idx);
      });
      return available;
    } catch {
      return new Set();
    }
  }, [sessionTypeData, isPreview]);

  const bookAppointment = trpc.appointments.book.useMutation({
    onSuccess: () => {
      if (selectedDate && selectedTime) {
        onBooked(selectedDate, selectedTime);
      }
    },
    onError: () => {
      toast.error("Failed to book appointment. Please try again.");
      setIsBooking(false);
    },
  });

  // Fetch available slots for the selected date
  const { data: slots, isLoading: slotsLoading } = trpc.appointments.getAvailableSlots.useQuery(
    { sessionTypeId: sessionTypeId!, date: selectedDate! },
    { enabled: !!selectedDate && !!sessionTypeId && !isPreview }
  );

  const displaySlots: string[] = isPreview ? PREVIEW_SLOTS : (slots ?? []);

  // Split into AM and PM groups
  const amSlots = displaySlots.filter(t => parseInt(t.split(":")[0]) < 12);
  const pmSlots = displaySlots.filter(t => parseInt(t.split(":")[0]) >= 12);

  // Build calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewYear, viewMonth]);

  const isPastDate = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const isDayUnavailable = (day: number) => {
    if (isPreview) return false;
    const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
    return !availableDayIndices.has(dayOfWeek);
  };

  const handleDateClick = (day: number) => {
    if (isPastDate(day) && !isPreview) return;
    if (isDayUnavailable(day)) return;
    setSelectedDate(toDateString(viewYear, viewMonth, day));
    setSelectedTime(null);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || isPreview) return;
    setIsBooking(true);
    const startTime = new Date(`${selectedDate}T${selectedTime}`);
    console.log('[InlineScheduler] handleBook effectiveDurationMin:', effectiveDurationMin, 'sessionTypeData:', sessionTypeData);
    const endTime = new Date(startTime.getTime() + effectiveDurationMin * 60 * 1000);
    bookAppointment.mutate({
      title: `${sessionTypeName || "Discovery Call"} — ${studentName || parentName}`,
      startTime,
      endTime,
      sessionTypeId: sessionTypeId ?? undefined,
      clientId: clientId ?? undefined,
      meetingType: sessionTypeName || undefined,
      parentName: parentName || undefined,
      studentName: studentName || undefined,
      description: `Session: ${sessionTypeName || "Discovery Call"}\nParent: ${parentName}\nStudent: ${studentName || "N/A"}\nEmail: ${parentEmail}`,
    });
  };

  const todayStr = toDateString(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="rounded-2xl overflow-hidden border border-blue-500/30 bg-slate-900/80 shadow-xl shadow-blue-900/20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/60 bg-slate-800/60">
        <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold tracking-wide uppercase">
          <CalendarDays className="w-4 h-4 text-blue-400" />
          {sessionTypeName || "DISCOVERY CALL"}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          {effectiveDurationMin >= 60 && effectiveDurationMin % 60 === 0
            ? `${effectiveDurationMin / 60} hour${effectiveDurationMin / 60 !== 1 ? 's' : ''}`
            : `${effectiveDurationMin} min`}
        </div>
      </div>

      {/* Body: two-column */}
      <div className="flex flex-col md:flex-row">
        {/* LEFT: Calendar */}
        <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-slate-700/60">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white font-semibold text-sm">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES_SHORT.map((d, i) => {
              const hasHours = isPreview || availableDayIndices.has(i);
              return (
                <div
                  key={d}
                  className={`text-center text-xs font-medium py-1 ${hasHours ? "text-slate-400" : "text-slate-700"}`}
                >
                  {d}
                </div>
              );
            })}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const dateStr = toDateString(viewYear, viewMonth, day);
              const isSelected = dateStr === selectedDate;
              const isPast = isPastDate(day) && !isPreview;
              const isUnavailable = isDayUnavailable(day);
              const isToday = dateStr === todayStr;
              const isDisabled = isPast || isUnavailable;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={isDisabled}
                  title={isUnavailable ? "No availability on this day" : undefined}
                  className={`
                    mx-auto w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all
                    ${isSelected
                      ? "bg-blue-500 text-white shadow-md shadow-blue-500/40"
                      : isDisabled
                        ? isUnavailable
                          ? "text-slate-700 cursor-not-allowed"
                          : "text-slate-600 cursor-not-allowed"
                        : isToday
                          ? "ring-2 ring-blue-500/50 text-blue-300 hover:bg-blue-500/20 cursor-pointer"
                          : "text-slate-300 hover:bg-slate-700/60 cursor-pointer"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          {!isPreview && availableDayIndices.size > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-700 inline-block" />
              <span>No availability</span>
            </div>
          )}
        </div>

        {/* RIGHT: Time slots */}
        <div className="flex-1 p-5 min-w-0">
          {/* Timezone */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400">{userTz}</span>
            {selectedDate && (
              <span className="text-xs text-blue-400 font-medium">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
              <CalendarDays className="w-8 h-8 text-slate-600" />
              <span>Select a date to see available times</span>
            </div>
          ) : slotsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : displaySlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
              <Clock className="w-8 h-8 text-slate-600" />
              <span>No available times on this day.</span>
              <span className="text-xs">Please select a different date.</span>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-64 pr-1">
              {amSlots.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">AM</p>
                  <div className="grid grid-cols-3 gap-2">
                    {amSlots.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={`
                          py-2 px-1 rounded-xl text-xs font-semibold border transition-all
                          ${selectedTime === t
                            ? "bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/30"
                            : "bg-slate-800/60 text-blue-300 border-slate-700/60 hover:border-blue-500/50 hover:bg-blue-500/10"
                          }
                        `}
                      >
                        {formatTime12(t).replace(" AM", "").replace(" PM", "")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pmSlots.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">PM</p>
                  <div className="grid grid-cols-3 gap-2">
                    {pmSlots.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={`
                          py-2 px-1 rounded-xl text-xs font-semibold border transition-all
                          ${selectedTime === t
                            ? "bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/30"
                            : "bg-slate-800/60 text-blue-300 border-slate-700/60 hover:border-blue-500/50 hover:bg-blue-500/10"
                          }
                        `}
                      >
                        {formatTime12(t).replace(" AM", "").replace(" PM", "")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirm button */}
          {selectedTime && (
            <button
              type="button"
              disabled={isBooking || isPreview}
              onClick={handleBook}
              className="mt-4 w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {isBooking ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Booking...</>
              ) : (
                <>Confirm {formatTime12(selectedTime)}{isPreview ? " (preview)" : ""}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

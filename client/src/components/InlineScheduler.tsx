import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InlineSchedulerProps {
  sessionTypeId: number;
  sessionTypeName?: string;
  parentName: string;
  parentEmail: string;
  onBooked: (date: string, time: string) => void;
  isPreview?: boolean;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function InlineScheduler({
  sessionTypeId,
  sessionTypeName,
  parentName,
  parentEmail,
  onBooked,
  isPreview = false,
}: InlineSchedulerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

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
    { sessionTypeId, date: selectedDate! },
    { enabled: !!selectedDate && !isPreview }
  );

  // Build calendar days for current view month
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

  const handleDateClick = (day: number) => {
    if (isPastDate(day) && !isPreview) return;
    const dateStr = toDateString(viewYear, viewMonth, day);
    setSelectedDate(dateStr);
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
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hr default
    bookAppointment.mutate({
      title: `${sessionTypeName || "Consultation"} - ${parentName}`,
      startTime,
      endTime,
      description: `Session Type: ${sessionTypeName || "Consultation"}\nClient: ${parentName}\nEmail: ${parentEmail}`,
    });
  };

  const selectedDateObj = selectedDate ? new Date(selectedDate + "T00:00:00") : null;

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = toDateString(viewYear, viewMonth, day);
          const isSelected = dateStr === selectedDate;
          const isPast = isPastDate(day) && !isPreview;
          const isToday = dateStr === toDateString(today.getFullYear(), today.getMonth(), today.getDate());
          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={isPast}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-all
                ${isSelected ? "bg-primary text-primary-foreground shadow-sm" : ""}
                ${!isSelected && isToday ? "ring-2 ring-primary/40 bg-primary/5" : ""}
                ${!isSelected && !isPast ? "hover:bg-muted cursor-pointer" : ""}
                ${isPast ? "text-muted-foreground/40 cursor-not-allowed" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            <span>
              {selectedDateObj
                ? `${DAY_NAMES[selectedDateObj.getDay()]}, ${MONTH_NAMES[selectedDateObj.getMonth()]} ${selectedDateObj.getDate()}`
                : "Select a time"}
            </span>
          </div>

          {isPreview ? (
            <div className="grid grid-cols-3 gap-2">
              {["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTime(t)}
                  className={`
                    py-2 px-3 rounded-md text-sm font-medium border transition-all
                    ${selectedTime === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                    }
                  `}
                >
                  {formatTime(t)}
                </button>
              ))}
            </div>
          ) : slotsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !slots || slots.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No available times on this day.</p>
                <p className="text-xs text-muted-foreground mt-1">Please select a different date.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTime(t)}
                  className={`
                    py-2 px-3 rounded-md text-sm font-medium border transition-all
                    ${selectedTime === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                    }
                  `}
                >
                  {formatTime(t)}
                </button>
              ))}
            </div>
          )}

          {/* Confirm booking button */}
          {selectedTime && (
            <Button
              type="button"
              className="w-full mt-2"
              disabled={isBooking || isPreview}
              onClick={handleBook}
            >
              {isBooking ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Booking...</>
              ) : isPreview ? (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirm {formatTime(selectedTime)} (preview)</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirm {formatTime(selectedTime)}</>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Session type badge */}
      {sessionTypeName && (
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {sessionTypeName}
          </Badge>
        </div>
      )}
    </div>
  );
}

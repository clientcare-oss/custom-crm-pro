import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Appointment {
  id: number;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  status: string;
  description?: string | null;
  videoLink?: string | null;
  meetingType?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  studentName?: string | null;
  location?: string | null;
}

interface CalendarViewProps {
  appointments: Appointment[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (appointment: Appointment) => void;
}

export default function CalendarView({ appointments, onDateClick, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      const date = new Date(apt.startTime).toISOString().split("T")[0];
      if (!map[date]) map[date] = [];
      map[date].push(apt);
    });
    return map;
  }, [appointments]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date().toISOString().split("T")[0];

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 border border-border/30" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayAppointments = appointmentsByDate[dateStr] || [];
    const isToday = dateStr === today;

    days.push(
      <div
        key={day}
        className={`h-24 border border-border/30 p-1 transition-colors ${isToday ? "bg-primary/5 border-primary/30" : "hover:bg-accent/20"}`}
        onClick={() => onDateClick?.(new Date(year, month, day))}
      >
        <span className={`text-xs font-medium ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
          {day}
        </span>
        <div className="mt-1 space-y-0.5 overflow-hidden">
          {dayAppointments.slice(0, 2).map((apt) => {
            const subtitle = [apt.meetingType, apt.studentName || apt.parentName].filter(Boolean).join(" · ");
            return (
              <div
                key={apt.id}
                onClick={(e) => { e.stopPropagation(); onEventClick?.(apt); }}
                className={`text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity overflow-hidden ${
                  apt.status === "Confirmed" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                  apt.status === "Cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" :
                  apt.status === "Completed" ? "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300" :
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                }`}
              >
                <span className="block truncate font-medium">{apt.title}</span>
                {subtitle && (
                  <span className="block truncate opacity-75">{subtitle}</span>
                )}
              </div>
            );
          })}
          {dayAppointments.length > 2 && (
            <div className="text-[10px] text-muted-foreground px-1">+{dayAppointments.length - 2} more</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg">{monthName}</CardTitle>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-0">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 border-b">
              {d}
            </div>
          ))}
          {days}
        </div>
      </CardContent>
    </Card>
  );
}

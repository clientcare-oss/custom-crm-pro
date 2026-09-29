import { useState } from "react";
import {
  Clock,
  Calendar,
  AlertTriangle,
  Plus,
  Save,
  CheckCircle2,
  CalendarDays,
  UserX,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DaySchedule, EmployeeRecord } from "../teamTypes";
import { toast } from "sonner";

interface EmployeeScheduleAdminTabProps {
  employee: EmployeeRecord;
  onSave: (updated: EmployeeRecord) => void;
}

const TIME_OPTIONS = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM",
];

export default function EmployeeScheduleAdminTab({
  employee,
  onSave,
}: EmployeeScheduleAdminTabProps) {
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(
    employee.weeklySchedule && employee.weeklySchedule.length === 7
      ? employee.weeklySchedule
      : [
          { day: "Monday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
          { day: "Tuesday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
          { day: "Wednesday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
          { day: "Thursday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
          { day: "Friday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
          { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
          { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
        ]
  );
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockTitle, setBlockTitle] = useState("Administrative Block");
  const [blockDate, setBlockDate] = useState("");
  const [blockTimeRange, setBlockTimeRange] = useState("All Day");

  const handleToggleDay = (idx: number) => {
    setWeeklySchedule((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const next = !item.isAvailable;
        return {
          ...item,
          isAvailable: next,
          start: next ? "9:00 AM" : "Unavailable",
          end: next ? "4:00 PM" : "Unavailable",
        };
      })
    );
  };

  const handleTimeChange = (idx: number, field: "start" | "end", val: string) => {
    setWeeklySchedule((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveWeeklyHours = () => {
    // Generate human readable summary
    const availableDays = weeklySchedule.filter((d) => d.isAvailable);
    let summary = "Custom Schedule";
    if (availableDays.length === 0) {
      summary = "No regular hours (Unavailable)";
    } else if (availableDays.length === 4 && availableDays[0].day === "Monday" && availableDays[3].day === "Thursday") {
      summary = `Mon–Thu ${availableDays[0].start} – ${availableDays[0].end}`;
    } else if (availableDays.length === 5 && availableDays[0].day === "Monday" && availableDays[4].day === "Friday") {
      summary = `Mon–Fri ${availableDays[0].start} – ${availableDays[0].end}`;
    } else {
      summary = `${availableDays.map((d) => d.day.slice(0, 3)).join(", ")} (${availableDays[0]?.start || "9:00 AM"} – ${availableDays[0]?.end || "4:00 PM"})`;
    }

    const updated: EmployeeRecord = {
      ...employee,
      weeklySchedule,
      normalScheduleSummary: summary,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Schedule Adjusted",
          details: `Weekly operating schedule updated to: ${summary}. Synced to My Availability.`,
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    setIsEditingHours(false);
    toast.success("Schedule saved and synchronized with Crew Quarters!");
  };

  const handleMarkOutToday = () => {
    const isOut = employee.availabilityStatus === "Out Today";
    const nextStatus = isOut ? "Available" : "Out Today";

    const updated: EmployeeRecord = {
      ...employee,
      availabilityStatus: nextStatus,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: isOut ? "Restored from Out Today" : "Marked Out Today",
          details: isOut
            ? "Cleared Out Today status. Employee is now available."
            : "Marked Out Today. Calendar slots temporarily disabled for the remainder of today.",
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    toast.success(isOut ? "Employee marked available" : "Employee marked Out Today");
  };

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-white text-sm">
              Work Schedule &amp; Calendar Availability
            </h3>
          </div>
          <p className="text-[11px] text-blue-200/70">
            Directly connected to <strong>My Availability</strong>. Changes made here immediately reflect on the public scheduler and calendar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkOutToday}
            className={`h-8 px-3 text-xs rounded-xl border ${
              employee.availabilityStatus === "Out Today"
                ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                : "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            }`}
          >
            <UserX className="w-3.5 h-3.5 mr-1" />
            <span>{employee.availabilityStatus === "Out Today" ? "Clear Out Today" : "Mark Out Today"}</span>
          </Button>

          {!isEditingHours ? (
            <Button
              size="sm"
              onClick={() => setIsEditingHours(true)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-3 cursor-pointer"
            >
              Edit Weekly Hours
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSaveWeeklyHours}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl h-8 px-3 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>Save Hours</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Regular Weekly Hours ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
          <div>
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-sky-400" />
              <span>Regular Weekly Operating Hours</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Baseline weekly schedule defining availability for client bookings, meetings, and team shifts.
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-sky-300 bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-800/40">
            {employee.normalScheduleSummary}
          </span>
        </div>

        <div className="space-y-2">
          {weeklySchedule.map((day, idx) => (
            <div
              key={day.day}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                day.isAvailable
                  ? "bg-[#000d2b] border-blue-900/60"
                  : "bg-[#000514]/60 border-blue-950/60 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 w-36">
                <button
                  type="button"
                  disabled={!isEditingHours}
                  onClick={() => handleToggleDay(idx)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    day.isAvailable
                      ? "bg-emerald-500 border-emerald-400 text-slate-950"
                      : "border-slate-600 bg-transparent"
                  } ${isEditingHours ? "cursor-pointer" : "cursor-default"}`}
                >
                  {day.isAvailable && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                </button>
                <span className="font-bold text-white">{day.day}</span>
              </div>

              <div className="flex items-center gap-2 flex-1 justify-end">
                {day.isAvailable ? (
                  isEditingHours ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={day.start}
                        onValueChange={(val) => handleTimeChange(idx, "start", val)}
                      >
                        <SelectTrigger className="w-[105px] h-8 text-xs bg-[#000820] border-blue-800 text-white rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-slate-400 text-xs">to</span>
                      <Select
                        value={day.end}
                        onValueChange={(val) => handleTimeChange(idx, "end", val)}
                      >
                        <SelectTrigger className="w-[105px] h-8 text-xs bg-[#000820] border-blue-800 text-white rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-emerald-300 font-mono font-medium">
                      {day.start} – {day.end}
                    </span>
                  )
                ) : (
                  <span className="text-slate-500 font-medium">Unavailable</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Upcoming Time Off & Unavailability Blocks ── */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
          <div>
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Upcoming Unavailability &amp; Approved PTO</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Temporary scheduling blocks, approved vacation days, and medical appointments.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setBlockModalOpen(true)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-3 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Add Schedule Block</span>
          </Button>
        </div>

        <div className="space-y-2">
          {employee.nextTimeOff ? (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-xs">Approved Leave</span>
                <p className="text-[11px] text-amber-300/90 font-mono mt-0.5">{employee.nextTimeOff}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                Approved PTO
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-blue-900/30 bg-[#000d2b]/30 text-center">
              <p className="text-xs text-slate-400">No upcoming unavailability blocks on file</p>
            </div>
          )}
        </div>
      </div>

      {/* Temporary Block Modal */}
      <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#000821] border border-blue-800 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>Add Temporary Unavailability Block</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const updated: EmployeeRecord = {
                ...employee,
                nextTimeOff: `${blockDate} (${blockTitle})`,
                activity: [
                  {
                    id: `act-${Date.now()}`,
                    timestamp: new Date().toLocaleString(),
                    actor: "Byron Honea",
                    action: "Unavailability Block Added",
                    details: `Added ${blockTitle} on ${blockDate} (${blockTimeRange}).`,
                  },
                  ...employee.activity,
                ],
              };
              onSave(updated);
              setBlockModalOpen(false);
              toast.success("Schedule block added and synced with Calendar!");
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1">
              <Label className="text-xs text-white">Block Reason / Title</Label>
              <Input
                value={blockTitle}
                onChange={(e) => setBlockTitle(e.target.value)}
                placeholder="Doctor Appointment, IEP prep, Out of Office"
                className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white">Date</Label>
              <Input
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                placeholder="e.g. Nov 14, 2026"
                className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white">Time Range</Label>
              <Input
                value={blockTimeRange}
                onChange={(e) => setBlockTimeRange(e.target.value)}
                placeholder="All Day or 1:00 PM – 4:00 PM"
                className="bg-[#000d2b] border-blue-900/60 text-white text-xs h-9 rounded-xl"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setBlockModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl"
              >
                Save Schedule Block
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

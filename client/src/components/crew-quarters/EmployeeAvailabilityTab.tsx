import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PageIdBadge from "@/components/PageIdBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CalendarCheck,
  Clock,
  Plus,
  Pencil,
  Plane,
  Ban,
  GraduationCap,
  Users,
  Settings,
  MoreHorizontal,
  Info,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface DaySchedule {
  day: string;
  isAvailable: boolean;
  start: string;
  end: string;
}

interface UnavailabilityBlock {
  id: string;
  month: string;
  dayNumber: string;
  title: string;
  timeRange: string;
  status: "Approved" | "Pending";
  category: "pto" | "personal" | "training" | "medical";
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: "Monday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
  { day: "Tuesday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
  { day: "Wednesday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
  { day: "Thursday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
  { day: "Friday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
  { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
  { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
];

const INITIAL_BLOCKS: UnavailabilityBlock[] = [
  {
    id: "blk-1",
    month: "OCT",
    dayNumber: "12",
    title: "PTO",
    timeRange: "All Day",
    status: "Approved",
    category: "pto",
  },
  {
    id: "blk-2",
    month: "OCT",
    dayNumber: "18",
    title: "Personal Block",
    timeRange: "1:00 PM – 3:00 PM",
    status: "Approved",
    category: "personal",
  },
  {
    id: "blk-3",
    month: "OCT",
    dayNumber: "22",
    title: "Training",
    timeRange: "9:00 AM – 11:00 AM",
    status: "Approved",
    category: "training",
  },
  {
    id: "blk-4",
    month: "NOV",
    dayNumber: "7",
    title: "PTO",
    timeRange: "All Day",
    status: "Pending",
    category: "pto",
  },
  {
    id: "blk-5",
    month: "NOV",
    dayNumber: "21",
    title: "Doctor Appointment",
    timeRange: "9:00 AM – 12:00 PM",
    status: "Pending",
    category: "medical",
  },
];

const TIME_OPTIONS = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM",
];

export default function EmployeeAvailabilityTab({
  onViewTeamSchedule,
}: {
  onViewTeamSchedule?: () => void;
}) {
  const [, setLocation] = useLocation();
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [blocks, setBlocks] = useState<UnavailabilityBlock[]>(INITIAL_BLOCKS);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [newBlock, setNewBlock] = useState({
    title: "Personal Block",
    category: "personal" as UnavailabilityBlock["category"],
    month: "NOV",
    dayNumber: "25",
    timeRange: "1:00 PM – 3:00 PM",
    status: "Pending" as UnavailabilityBlock["status"],
  });

  const handleToggleAvailable = (index: number) => {
    setSchedule((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const nextAvail = !item.isAvailable;
        return {
          ...item,
          isAvailable: nextAvail,
          start: nextAvail ? "9:00 AM" : "Unavailable",
          end: nextAvail ? "4:00 PM" : "Unavailable",
        };
      })
    );
  };

  const handleTimeChange = (index: number, field: "start" | "end", val: string) => {
    setSchedule((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveHours = () => {
    setIsEditingHours(false);
    toast.success("Regular weekly hours saved successfully");
  };

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const created: UnavailabilityBlock = {
      id: `blk-${Date.now()}`,
      title: newBlock.title,
      category: newBlock.category,
      month: newBlock.month,
      dayNumber: newBlock.dayNumber,
      timeRange: newBlock.timeRange,
      status: "Pending",
    };
    setBlocks([...blocks, created]);
    setShowAddBlockModal(false);
    toast.success("Unavailability block submitted for approval");
  };

  const getCategoryIcon = (category: UnavailabilityBlock["category"]) => {
    switch (category) {
      case "pto":
        return (
          <div className="w-10 h-10 rounded-xl bg-[#3d0f1f] text-rose-400 border border-rose-900/60 flex items-center justify-center shrink-0">
            <Plane className="w-5 h-5 fill-rose-400/20" />
          </div>
        );
      case "personal":
        return (
          <div className="w-10 h-10 rounded-xl bg-[#3d0f1f] text-rose-400 border border-rose-900/60 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" />
          </div>
        );
      case "training":
        return (
          <div className="w-10 h-10 rounded-xl bg-[#28124d] text-purple-400 border border-purple-900/60 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        );
      case "medical":
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-[#09224d] text-sky-400 border border-blue-900/60 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* ── TOP SECTION (My Availability Title + Approved Time Off Notice) ── */}
      <div className="rounded-2xl border border-[#0d306b]/70 bg-gradient-to-r from-[#000a26] via-[#000d2f] to-[#000b29] p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-[#001742] text-sky-400 border border-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.2)] shrink-0">
            <CalendarCheck className="w-7 h-7 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">
                My Availability
              </h1>
              <PageIdBadge id="PG-038-AVL" name="My Availability" inline />
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Set your regular working hours and any upcoming unavailability. This helps with scheduling and coverage.
            </p>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-sky-900/60 bg-[#001238]/80 text-xs text-sky-200/90 max-w-md shadow-sm shrink-0">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-[11px] leading-relaxed">
            Approved time off requests will automatically appear here. You don't need to add them twice.
          </span>
        </div>
      </div>

      {/* ── TWO-COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── LEFT COLUMN: REGULAR WEEKLY HOURS ── */}
        <div className="rounded-2xl border border-[#0d306b]/70 bg-[#000d2b] p-5 shadow-2xl flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-lg bg-sky-500/10 text-sky-400 mt-0.5">
                  <Clock className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Regular Weekly Hours
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Set the times you are normally available to work.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isEditingHours) handleSaveHours();
                  else setIsEditingHours(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-800/80 bg-[#001438] hover:bg-blue-900/50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Pencil className="w-3 h-3 text-sky-400" />
                <span>{isEditingHours ? "Save Hours" : "Edit Hours"}</span>
              </button>
            </div>

            {/* Day Rows */}
            <div className="space-y-2.5 pt-3">
              {schedule.map((item, idx) => (
                <div
                  key={item.day}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-blue-950/30 transition-colors text-xs"
                >
                  {/* Day Label */}
                  <span className="w-24 font-medium text-slate-200 text-xs">
                    {item.day}
                  </span>

                  {/* Start Time Select */}
                  <div className="flex items-center gap-2">
                    {item.isAvailable && isEditingHours ? (
                      <select
                        value={item.start}
                        onChange={(e) => handleTimeChange(idx, "start", e.target.value)}
                        className="h-8 px-2.5 rounded-lg bg-[#001438] border border-blue-900 text-white font-mono text-xs focus:outline-none focus:border-sky-400 cursor-pointer"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        className={`h-8 px-3 rounded-lg border text-xs flex items-center justify-center font-mono ${
                          item.isAvailable
                            ? "bg-[#001438] border-blue-900 text-white font-medium"
                            : "bg-[#00102b]/60 border-blue-950 text-slate-500"
                        }`}
                      >
                        {item.start}
                      </div>
                    )}

                    <span className="text-slate-500 font-bold">–</span>

                    {/* End Time Select */}
                    {item.isAvailable && isEditingHours ? (
                      <select
                        value={item.end}
                        onChange={(e) => handleTimeChange(idx, "end", e.target.value)}
                        className="h-8 px-2.5 rounded-lg bg-[#001438] border border-blue-900 text-white font-mono text-xs focus:outline-none focus:border-sky-400 cursor-pointer"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        className={`h-8 px-3 rounded-lg border text-xs flex items-center justify-center font-mono ${
                          item.isAvailable
                            ? "bg-[#001438] border-blue-900 text-white font-medium"
                            : "bg-[#00102b]/60 border-blue-950 text-slate-500"
                        }`}
                      >
                        {item.end}
                      </div>
                    )}
                  </div>

                  {/* Available / Unavailable Checkbox Pill */}
                  <div
                    onClick={() => handleToggleAvailable(idx)}
                    className="flex items-center gap-2 cursor-pointer select-none w-28 justify-end"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        item.isAvailable
                          ? "bg-sky-500 border-sky-400 text-slate-950"
                          : "bg-transparent border-slate-600"
                      }`}
                    >
                      {item.isAvailable && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`font-semibold text-xs ${
                        item.isAvailable ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: UPCOMING UNAVAILABILITY ── */}
        <div className="rounded-2xl border border-[#0d306b]/70 bg-[#000d2b] p-5 shadow-2xl flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-lg bg-sky-500/10 text-sky-400 mt-0.5">
                  <Calendar className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Upcoming Unavailability
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Time off, blocked times, and schedule changes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddBlockModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5b82e] hover:bg-[#eab308] text-slate-950 text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Block</span>
              </button>
            </div>

            {/* List of Blocks */}
            <div className="space-y-2.5 pt-3">
              {blocks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-blue-950/40 transition-colors"
                >
                  {/* Date Column */}
                  <div className="w-12 text-center shrink-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      {b.month}
                    </div>
                    <div className="text-xl font-black text-white font-mono leading-none">
                      {b.dayNumber}
                    </div>
                  </div>

                  {/* Icon */}
                  {getCategoryIcon(b.category)}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-xs truncate">
                      {b.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {b.timeRange}
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="shrink-0">
                    <span
                      className={`text-xs font-bold ${
                        b.status === "Approved" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  {/* Action Dots */}
                  <button
                    type="button"
                    onClick={() => toast.info(`Options for ${b.title}`)}
                    className="h-7 w-7 rounded-md border border-blue-900/60 bg-[#001438] hover:bg-blue-900/50 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Link */}
          <div className="pt-2 border-t border-blue-900/40 text-center">
            <button
              type="button"
              onClick={() => toast.info("Displaying full unavailability calendar")}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View All Upcoming</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM CARD: WHY THIS MATTERS ── */}
      <div className="rounded-2xl border border-[#0d306b]/70 bg-[#000d2b] p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Icon & Description */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#031d4d] border border-blue-800 text-sky-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Why This Matters
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed max-w-2xl">
              Your availability is used to help with scheduling based on your role. For example, advocates can be assigned meetings, call center staff can be scheduled for phone coverage, and other team members can be scheduled for their tasks.
            </p>
          </div>
        </div>

        {/* Right Buttons: Settings & View Team Schedule */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={() => toast.info("Opening availability preferences")}
            className="h-9 w-9 rounded-xl border border-blue-800/80 bg-[#001438] hover:bg-blue-900/50 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Availability Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (onViewTeamSchedule) onViewTeamSchedule();
              else setLocation("/calendar");
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-800/80 bg-[#001438] hover:bg-blue-900/50 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>View Team Schedule</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* ── ADD BLOCK MODAL ── */}
      {showAddBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#000d2b] border border-blue-900/80 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Add Unavailability Block</span>
            </h3>

            <form onSubmit={handleAddBlock} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Block Reason / Title
                </label>
                <input
                  type="text"
                  value={newBlock.title}
                  onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
                  placeholder="e.g. Personal Block, Doctor Appointment, Court Hearing"
                  className="w-full h-8 px-3 rounded-lg bg-[#001438] border border-blue-900 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Month
                  </label>
                  <select
                    value={newBlock.month}
                    onChange={(e) => setNewBlock({ ...newBlock, month: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg bg-[#001438] border border-blue-900 text-xs text-white font-mono"
                  >
                    {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Day of Month
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={newBlock.dayNumber}
                    onChange={(e) => setNewBlock({ ...newBlock, dayNumber: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-[#001438] border border-blue-900 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Time Range / Duration
                </label>
                <input
                  type="text"
                  value={newBlock.timeRange}
                  onChange={(e) => setNewBlock({ ...newBlock, timeRange: e.target.value })}
                  placeholder="e.g. All Day or 1:00 PM – 3:00 PM"
                  className="w-full h-8 px-3 rounded-lg bg-[#001438] border border-blue-900 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Category
                </label>
                <select
                  value={newBlock.category}
                  onChange={(e) => setNewBlock({ ...newBlock, category: e.target.value as any })}
                  className="w-full h-8 px-2 rounded-lg bg-[#001438] border border-blue-900 text-xs text-white"
                >
                  <option value="personal">Personal Block</option>
                  <option value="pto">PTO / Vacation</option>
                  <option value="training">Training / Conference</option>
                  <option value="medical">Doctor / Medical</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-950">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddBlockModal(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#f5b82e] hover:bg-[#eab308] text-slate-950 font-bold text-xs"
                >
                  Add Block
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

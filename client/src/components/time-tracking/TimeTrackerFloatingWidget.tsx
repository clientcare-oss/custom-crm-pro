import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Play,
  Square,
  Plus,
  Loader2,
  ChevronUp,
  X,
  Sparkles,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export const WORK_TYPES = [
  "Meeting preparation",
  "IEP/504 meeting",
  "Records review",
  "Calls",
  "SMS/messages",
  "Email review",
  "Email drafting",
  "Complaint work",
  "Research",
  "Case strategy",
  "Follow-up",
  "Administrative work",
];

interface TimeTrackerFloatingWidgetProps {
  preselectedStudentId?: number;
}

export default function TimeTrackerFloatingWidget({
  preselectedStudentId,
}: TimeTrackerFloatingWidgetProps) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"timer" | "manual">("timer");

  // Timer & Form states
  const [selectedWorkType, setSelectedWorkType] = useState<string>(WORK_TYPES[0]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preselectedStudentId ? String(preselectedStudentId) : ""
  );
  const [manualDuration, setManualDuration] = useState<string>("30");
  const [manualDate, setManualDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const utils = trpc.useUtils();

  // Queries
  const { data: activeTimer } = trpc.timeTracking.getActiveTimer.useQuery(undefined, {
    enabled: !!user && user.role !== "client",
    refetchInterval: 5000,
  });

  const { data: contactsList = [] } = trpc.contacts.list.useQuery(undefined, {
    enabled: modalOpen,
  });

  const students = (contactsList as any[]).filter(
    (c) => c.jobTitle === "Student" || !c.parentContactId
  );

  // Mutations
  const startTimerMutation = trpc.timeTracking.startTimer.useMutation({
    onSuccess: () => {
      toast.success("Advocate timer started!");
      utils.timeTracking.getActiveTimer.invalidate();
      utils.metrics.getTimeWorkload.invalidate();
      setModalOpen(false);
      setNotes("");
    },
    onError: (err) => toast.error(err.message || "Failed to start timer"),
  });

  const stopTimerMutation = trpc.timeTracking.stopTimer.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Timer stopped! Logged ${data?.durationMinutes || 0} minutes.`
      );
      utils.timeTracking.getActiveTimer.invalidate();
      utils.timeTracking.getTimeEntries.invalidate();
      utils.metrics.getTimeWorkload.invalidate();
      utils.metrics.getSnapshot.invalidate();
      setElapsedSeconds(0);
      setNotes("");
    },
    onError: (err) => toast.error(err.message || "Failed to stop timer"),
  });

  const logManualMutation = trpc.timeTracking.logManualTime.useMutation({
    onSuccess: () => {
      toast.success("Time entry logged successfully!");
      utils.timeTracking.getTimeEntries.invalidate();
      utils.metrics.getTimeWorkload.invalidate();
      utils.metrics.getSnapshot.invalidate();
      setModalOpen(false);
      setNotes("");
      setManualDuration("30");
    },
    onError: (err) => toast.error(err.message || "Failed to log time"),
  });

  // Calculate live elapsed seconds when activeTimer is running
  useEffect(() => {
    if (!activeTimer || !activeTimer.timerStartedAt) {
      setElapsedSeconds(0);
      return;
    }
    const startMs = new Date(activeTimer.timerStartedAt).getTime();
    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  if (!user || user.role === "client") return null;

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m ${secs < 10 ? "0" : ""}${secs}s`;
    }
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();
    startTimerMutation.mutate({
      workType: selectedWorkType,
      studentContactId: selectedStudentId ? Number(selectedStudentId) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleLogManual = (e: React.FormEvent) => {
    e.preventDefault();
    const dur = parseInt(manualDuration, 10);
    if (isNaN(dur) || dur <= 0) {
      toast.error("Please enter a valid duration in minutes.");
      return;
    }
    logManualMutation.mutate({
      workType: selectedWorkType,
      studentContactId: selectedStudentId ? Number(selectedStudentId) : undefined,
      durationMinutes: dur,
      entryDate: manualDate,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <>
      {/* Floating Tactical Orb (matching the petite frosted glass utility style) */}
      <aside
        aria-label="Advocate Time Tracker"
        className="fixed bottom-2.5 right-10.5 sm:right-11 z-40 flex items-center select-none"
      >
        {activeTimer ? (
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-950/80 backdrop-blur-xl shadow-[0_6px_24px_rgba(0,0,0,0.5),0_0_12px_rgba(16,185,129,0.25)] pl-2.5 pr-1 py-0.5 select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 text-left min-w-0 cursor-pointer"
            >
              <span className="text-[10.5px] font-mono font-bold text-emerald-300 whitespace-nowrap">
                {formatElapsed(elapsedSeconds)}
              </span>
              <span className="text-[10px] text-white/70 truncate max-w-[100px] sm:max-w-[130px]" title={activeTimer.studentName || activeTimer.workType}>
                {activeTimer.studentName || activeTimer.workType}
              </span>
            </button>
            <button
              type="button"
              onClick={() => stopTimerMutation.mutate({})}
              disabled={stopTimerMutation.isPending}
              title="Stop timer"
              className="h-5 px-2 text-[10px] font-bold bg-rose-500/30 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-400/40 rounded-full transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            >
              {stopTimerMutation.isPending ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <Square className="w-2.5 h-2.5 fill-current" />
              )}
              <span>Stop</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            title="Track Time (Click to open advocate timer)"
            className="group relative flex h-6 w-6 sm:h-6.5 sm:w-6.5 items-center justify-center rounded-full cursor-pointer select-none transition-all duration-300 backdrop-blur-md opacity-35 hover:opacity-100 bg-white/[0.05] hover:bg-white/[0.16] border border-white/20 hover:border-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
            aria-label="Track Time"
          >
            {/* Top subtle glass specular reflection crescent */}
            <span className="absolute top-0.5 inset-x-1 h-1.5 rounded-t-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />

            {/* Crisp luminous white Clock icon */}
            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/70 group-hover:text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.8)] relative z-10 transition-transform duration-200 group-hover:scale-110" />

            {/* Soft bottom ambient glow */}
            <span className="absolute -bottom-0.5 inset-x-1 h-1 bg-white/15 rounded-full blur-[1px] pointer-events-none" />
          </button>
        )}
      </aside>

      {/* Modal Dialog for Starting or Logging Time */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#001433] border border-sky-500/30 text-white rounded-3xl max-w-md shadow-[0_25px_60px_rgba(0,10,35,0.9)] p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <span>Advocate Time Tracker</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/70">
              Record billable or operational time across the 12 Waypoint work types.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Selector: Live Timer vs Manual Log */}
          <div className="flex items-center gap-1.5 p-1 bg-[#000E26] rounded-xl border border-sky-500/20 my-2">
            <button
              type="button"
              onClick={() => setTab("timer")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === "timer"
                  ? "bg-gradient-to-r from-[#0062E3] to-[#004BB5] text-white shadow-xs"
                  : "text-blue-200/70 hover:text-white"
              }`}
            >
              Start Live Timer
            </button>
            <button
              type="button"
              onClick={() => setTab("manual")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === "manual"
                  ? "bg-gradient-to-r from-[#0062E3] to-[#004BB5] text-white shadow-xs"
                  : "text-blue-200/70 hover:text-white"
              }`}
            >
              Log Past Time
            </button>
          </div>

          {tab === "timer" ? (
            <form onSubmit={handleStartTimer} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-sky-300">Work Type</Label>
                <Select value={selectedWorkType} onValueChange={setSelectedWorkType}>
                  <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                    <SelectValue placeholder="Select work type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001433] border-sky-500/30 text-white max-h-60">
                    {WORK_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs hover:bg-sky-500/20">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-sky-300">Student / Case</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                    <SelectValue placeholder="Optional: Select student case" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001433] border-sky-500/30 text-white max-h-56">
                    <SelectItem value="none" className="text-xs text-blue-300/60">
                      (General / No specific student)
                    </SelectItem>
                    {students.map((st: any) => (
                      <SelectItem key={st.id} value={String(st.id)} className="text-xs hover:bg-sky-500/20">
                        {st.firstName} {st.lastName} ({st.state || "GA"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-sky-300">Private Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Prepared discrepancy list for speech services PWN"
                  rows={2}
                  className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400 placeholder:text-blue-200/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={startTimerMutation.isPending}
                  className="h-8 px-4 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl shadow-md gap-1.5"
                >
                  {startTimerMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Start Live Timer</span>
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogManual} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-sky-300">Work Type</Label>
                <Select value={selectedWorkType} onValueChange={setSelectedWorkType}>
                  <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                    <SelectValue placeholder="Select work type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001433] border-sky-500/30 text-white max-h-60">
                    {WORK_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs hover:bg-sky-500/20">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-sky-300">Duration (Minutes)</Label>
                  <Input
                    type="number"
                    value={manualDuration}
                    onChange={(e) => setManualDuration(e.target.value)}
                    min={1}
                    className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-sky-300">Date</Label>
                  <Input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-sky-300">Student / Case</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                    <SelectValue placeholder="Optional: Select student case" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001433] border-sky-500/30 text-white max-h-56">
                    <SelectItem value="none" className="text-xs text-blue-300/60">
                      (General / No specific student)
                    </SelectItem>
                    {students.map((st: any) => (
                      <SelectItem key={st.id} value={String(st.id)} className="text-xs hover:bg-sky-500/20">
                        {st.firstName} {st.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-sky-300">Notes / Details</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Conducted 45min IEP prep call with mother"
                  rows={2}
                  className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400 placeholder:text-blue-200/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={logManualMutation.isPending}
                  className="h-8 px-4 text-xs font-bold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl shadow-md gap-1.5"
                >
                  {logManualMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Save Time Entry</span>
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

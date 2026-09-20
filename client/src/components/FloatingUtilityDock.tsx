import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { resolvePageId, PAGE_IDS } from "@/lib/pageIdRegistry";
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
  Hash,
  Play,
  Square,
  Plus,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { WORK_TYPES } from "@/components/time-tracking/TimeTrackerFloatingWidget";
import { cn } from "@/lib/utils";

export default function FloatingUtilityDock() {
  const { user } = useAuth();
  const [location] = useLocation();

  // ── Page ID State ──
  const [pageOpen, setPageOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activePage, setActivePage] = useState(() =>
    resolvePageId(location, typeof window !== "undefined" ? window.location.search : "")
  );

  useEffect(() => {
    setActivePage(
      resolvePageId(location, typeof window !== "undefined" ? window.location.search : "")
    );
    setPageOpen(false);
    setCopied(false);
  }, [location]);

  useEffect(() => {
    const handlePageIdChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.id) {
        setActivePage({
          id: customEvent.detail.id,
          name: customEvent.detail.name || "Waypoint View",
        });
      }
    };

    window.addEventListener("waypoint:page-id-change", handlePageIdChange);
    return () => window.removeEventListener("waypoint:page-id-change", handlePageIdChange);
  }, []);

  const handleCopyPageId = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const text = `${activePage.id} · ${activePage.name}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = setTimeout(() => setPageOpen(false), 4000);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Time Tracker State ──
  const isAdvocate = Boolean(user && user.role !== "client");
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"timer" | "manual">("timer");
  const [selectedWorkType, setSelectedWorkType] = useState<string>(WORK_TYPES[0]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [manualDuration, setManualDuration] = useState<string>("30");
  const [manualDate, setManualDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const utils = trpc.useUtils();

  const { data: activeTimer } = trpc.timeTracking.getActiveTimer.useQuery(undefined, {
    enabled: isAdvocate,
    refetchInterval: 5000,
  });

  const { data: contactsList = [] } = trpc.contacts.list.useQuery(undefined, {
    enabled: modalOpen,
  });

  const students = (contactsList as any[]).filter(
    (c) => c.jobTitle === "Student" || !c.parentContactId
  );

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
      toast.success(`Timer stopped! Logged ${data?.durationMinutes || 0} minutes.`);
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
      {/* ── Floating Frosted Glass Micro-Dock Capsule (Bottom Right) ── */}
      <aside
        aria-label="Waypoint Utilities Dock"
        className="fixed bottom-3 right-3 z-50 flex items-center select-none"
      >
        <div
          className={cn(
            "group/dock relative flex items-center gap-1.5 p-1 rounded-full",
            "bg-slate-950/45 hover:bg-slate-950/75 backdrop-blur-2xl",
            "border border-white/20 hover:border-white/35",
            "shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_1.5px_rgba(255,255,255,0.25)]",
            "opacity-40 hover:opacity-100 transition-all duration-300"
          )}
        >
          {/* Subtle Top Specular Sheen across the dock */}
          <span className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* ── Slot 1: Time Tracker (Staff / Advocate Only) ── */}
          {isAdvocate && (
            <>
              {activeTimer ? (
                /* Live Active Timer Capsule inside dock */
                <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-900/80 backdrop-blur-xl shadow-[0_2px_12px_rgba(16,185,129,0.3)] pl-2 pr-1 py-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-1.5 text-left min-w-0 cursor-pointer"
                    title="Active Timer: Click to view details"
                  >
                    <span className="text-[10px] font-mono font-bold text-emerald-300 whitespace-nowrap">
                      {formatElapsed(elapsedSeconds)}
                    </span>
                    <span
                      className="text-[9.5px] text-white/80 truncate max-w-[90px] sm:max-w-[120px]"
                      title={activeTimer.studentName || activeTimer.workType}
                    >
                      {activeTimer.studentName || activeTimer.workType}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => stopTimerMutation.mutate({})}
                    disabled={stopTimerMutation.isPending}
                    title="Stop and log timer"
                    className="h-5 px-1.5 text-[9.5px] font-bold bg-rose-500/30 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-400/40 rounded-full transition-all flex items-center gap-1 cursor-pointer shadow-xs"
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
                /* Idle Time Tracker Glass Orb */
                <div className="relative flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    title="Track Time (Click to open advocate timer)"
                    className={cn(
                      "group/clock relative flex h-6.5 w-6.5 items-center justify-center rounded-full",
                      "cursor-pointer select-none transition-all duration-300",
                      "bg-white/[0.08] hover:bg-white/[0.22]",
                      "border border-white/25 hover:border-white/50",
                      "shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.65),inset_0_-1px_2px_rgba(0,0,0,0.3)]",
                      "hover:scale-105 active:scale-95"
                    )}
                    aria-label="Track Time"
                  >
                    {/* Top 3D glass specular crescent reflection */}
                    <span className="absolute top-[2px] inset-x-1.5 h-2 rounded-t-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none opacity-85" />

                    {/* Crisp luminous white Clock icon */}
                    <Clock className="h-3 w-3 text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] relative z-10 transition-transform duration-200 group-hover/clock:scale-110" />

                    {/* Soft internal amber/cyan refraction glint */}
                    <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400/10 via-transparent to-white/10 pointer-events-none" />
                  </button>

                  {/* Ground Caustic Reflection Pool directly below orb */}
                  <span className="absolute -bottom-1.5 inset-x-1 h-1.5 bg-white/35 rounded-full blur-[2px] pointer-events-none opacity-60 group-hover/dock:opacity-100 transition-opacity" />
                </div>
              )}

              {/* Delicate Vertical Hairline Glass Divider */}
              <div className="h-3.5 w-px bg-gradient-to-b from-white/10 via-white/30 to-white/10 rounded-full shrink-0 mx-0.5" />
            </>
          )}

          {/* ── Slot 2: Page ID Inspector (All Users / Everywhere) ── */}
          <div className="flex items-center flex-row-reverse">
            {/* Page ID Glass Orb */}
            <div className="relative flex flex-col items-center">
              <button
                type="button"
                onClick={() => setPageOpen((prev) => !prev)}
                title={
                  pageOpen
                    ? "Hide Page ID"
                    : `Page ID: ${activePage.id} · ${activePage.name} (Click to toggle)`
                }
                className={cn(
                  "group/hash relative flex h-6.5 w-6.5 items-center justify-center rounded-full",
                  "cursor-pointer select-none transition-all duration-300",
                  pageOpen
                    ? "bg-white/[0.25] border border-white/60 shadow-[0_0_12px_rgba(255,255,255,0.4),0_4px_12px_rgba(0,0,0,0.5),inset_0_1.5px_2px_rgba(255,255,255,0.8)] scale-105"
                    : "bg-white/[0.08] hover:bg-white/[0.22] border border-white/25 hover:border-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.65),inset_0_-1px_2px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95"
                )}
                aria-label="Toggle Page ID"
              >
                {/* Top 3D glass specular crescent reflection */}
                <span className="absolute top-[2px] inset-x-1.5 h-2 rounded-t-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none opacity-85" />

                {/* Crisp luminous white # icon */}
                <Hash className="h-3 w-3 text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] relative z-10 transition-transform duration-200 group-hover/hash:scale-110" />

                {/* Soft internal refraction glint */}
                <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 via-transparent to-white/15 pointer-events-none" />
              </button>

              {/* Ground Caustic Reflection Pool directly below orb */}
              <span className="absolute -bottom-1.5 inset-x-1 h-1.5 bg-white/35 rounded-full blur-[2px] pointer-events-none opacity-60 group-hover/dock:opacity-100 transition-opacity" />
            </div>

            {/* Expanded Page ID Frosted Pill (slides smoothly to the left) */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-white/20",
                "bg-slate-950/80 backdrop-blur-xl",
                "shadow-[0_6px_24px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.25)]",
                "overflow-hidden transition-all duration-300 ease-in-out select-none",
                pageOpen
                  ? "max-w-[340px] opacity-100 pl-2.5 pr-1 py-0.5 mr-1.5"
                  : "max-w-0 opacity-0 p-0 border-0 mr-0 pointer-events-none"
              )}
            >
              {/* Page ID Code badge */}
              <span className="text-[10px] font-mono font-bold text-white whitespace-nowrap tracking-wide bg-white/10 px-1.5 py-0.5 rounded-full border border-white/20 shadow-inner">
                {activePage.id}
              </span>

              {/* Page Name */}
              <span
                className="text-[10.5px] font-medium text-slate-100 whitespace-nowrap truncate max-w-[140px] sm:max-w-[170px]"
                title={activePage.name}
              >
                {activePage.name}
              </span>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopyPageId}
                title={copied ? "Copied!" : `Copy "${activePage.id} · ${activePage.name}"`}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  "transition-all duration-200 ml-0.5 cursor-pointer",
                  copied
                    ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                    : "bg-white/10 text-white/70 hover:text-white hover:bg-white/25 border border-white/20 shadow-xs"
                )}
              >
                {copied ? <Check className="h-2.5 w-2.5 text-emerald-300" /> : <Copy className="h-2.5 w-2.5" />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Modal Dialog for Starting or Logging Time ── */}
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

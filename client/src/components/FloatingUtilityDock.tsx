import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useFirstMate } from "@/contexts/FirstMateContext";
import { resolvePageId, PAGE_IDS } from "@/lib/pageIdRegistry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadarReticleIcon } from "@/components/firstMate/RadarReticleIcon";
import { Streamdown } from "streamdown";
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
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Pause,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { WORK_TYPES } from "@/components/time-tracking/TimeTrackerFloatingWidget";
import { cn } from "@/lib/utils";

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const QUICK_PROMPTS = [
  "What meetings do I have today?",
  "What tasks are overdue?",
  "What should I work on first?",
  "Summarize my open tasks",
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function FloatingUtilityDock() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // ── First Mate State ──
  const { session, openPopoutWindow, isPopout, stopListening } = useFirstMate();
  const [firstMateMenuOpen, setFirstMateMenuOpen] = useState(false);

  const hasActiveAlert = (session.alerts || []).some((a) => !a.dismissed);
  const isLive = session.status === "ACTIVE";
  const isPaused = session.status === "PAUSED";

  let stateKey: "ALERT" | "LIVE" | "PAUSED" | "READY" = "READY";
  if (hasActiveAlert && (isLive || isPaused)) {
    stateKey = "ALERT";
  } else if (isLive) {
    stateKey = "LIVE";
  } else if (isPaused) {
    stateKey = "PAUSED";
  }

  const handleFirstMateClick = () => {
    if (session.status === "ACTIVE" || session.status === "PAUSED") {
      setFirstMateMenuOpen((prev) => !prev);
    } else {
      setLocation("/first-mate");
    }
  };

  // ── AI Assistant State ──
  const [aiOpen, setAiOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.ai.chat.useMutation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (aiOpen && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm your Waypoint AI assistant. I have access to your live CRM data — tasks, appointments, and students. Ask me anything like:\n\n- \"What meetings do I have today?\"\n- \"Who has overdue tasks?\"\n- \"What should I prioritize?\"",
        },
      ]);
    }
  }, [aiOpen]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;
    setInput("");
    const newMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setIsLoading(true);
    try {
      const result = await chatMutation.mutateAsync({
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I ran into an error. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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

  // Calculate live elapsed seconds when active timer is running
  useEffect(() => {
    if (!activeTimer?.startedAt) {
      setElapsedSeconds(0);
      return;
    }
    const update = () => {
      const start = new Date(activeTimer.startedAt).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeTimer?.startedAt]);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
    }
    return `${mins}:${s.toString().padStart(2, "0")}`;
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
      {/* ── UNIFIED HORIZONTAL FLOATING DOCK (Bottom Right) ── */}
      {/* Radar | AI | Timer | Page ID — all in a single horizontal capsule */}
      <aside
        aria-label="Waypoint Utilities Dock"
        className="fixed bottom-3 right-3 z-50 flex items-center select-none"
      >
        <div
          className={cn(
            "group/dock relative flex items-center gap-1.5 p-1 rounded-full",
            "bg-slate-950/50 hover:bg-slate-950/80 backdrop-blur-2xl",
            "border border-white/20 hover:border-white/35",
            "shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_1.5px_rgba(255,255,255,0.25)]",
            "opacity-50 hover:opacity-100 transition-all duration-300"
          )}
        >
          {/* Subtle Top Specular Sheen across the dock */}
          <span className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* ── Slot 1: First Mate Radar Glass Orb ── */}
          {!isPopout && (
            <div className="relative flex flex-col items-center">
              <button
                type="button"
                onClick={handleFirstMateClick}
                title={
                  stateKey === "ALERT"
                    ? "First Mate: Critical Alert Detected"
                    : stateKey === "LIVE"
                    ? `First Mate Live (${formatTime(session.durationSeconds)})`
                    : stateKey === "PAUSED"
                    ? "First Mate: Paused"
                    : "First Mate Copilot (Click to open)"
                }
                className={cn(
                  "group/firstmate relative flex h-6.5 w-6.5 items-center justify-center rounded-full overflow-hidden",
                  "cursor-pointer select-none transition-all duration-300",
                  stateKey === "ALERT"
                    ? "bg-rose-950/40 border border-rose-400/70 shadow-[0_0_12px_rgba(244,63,94,0.5)] scale-105"
                    : stateKey === "LIVE"
                    ? "bg-cyan-950/40 border border-cyan-400/70 shadow-[0_0_12px_rgba(34,211,238,0.5)] scale-105"
                    : stateKey === "PAUSED"
                    ? "bg-amber-950/40 border border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                    : "bg-white/[0.08] hover:bg-white/[0.22] border border-white/25 hover:border-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.65),inset_0_-1px_2px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95"
                )}
                aria-label="First Mate Copilot"
              >
                {/* Top 3D glass specular crescent reflection */}
                <span className="absolute top-[1px] inset-x-1 h-2 rounded-t-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none opacity-85 z-20" />

                {/* Crisp luminous Radar Reticle icon */}
                <RadarReticleIcon
                  className={cn(
                    "w-full h-full p-0 text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.9)] relative z-10 transition-transform duration-200 group-hover/firstmate:scale-105",
                    isLive && "animate-pulse"
                  )}
                  pulse={stateKey === "LIVE"}
                />

                {/* LIVE wave ripple */}
                {stateKey === "LIVE" && (
                  <span className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-35 pointer-events-none" />
                )}

                {/* Soft internal cyan refraction glint */}
                <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400/10 via-transparent to-white/10 pointer-events-none" />
              </button>

              {/* Status Dot */}
              {stateKey === "ALERT" && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-1 ring-white/60 shadow-[0_0_6px_rgba(244,63,94,0.9)] animate-bounce z-30 pointer-events-none" />
              )}
              {stateKey === "PAUSED" && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-1 ring-white/60 shadow-[0_0_6px_rgba(251,191,36,0.9)] flex items-center justify-center z-30 pointer-events-none">
                  <Pause className="w-1.5 h-1.5 text-black fill-black" />
                </span>
              )}
              {stateKey === "LIVE" && !hasActiveAlert && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-1 ring-white/60 shadow-[0_0_6px_rgba(52,211,153,0.9)] z-30 pointer-events-none" />
              )}

              {/* Ground Caustic Reflection Pool */}
              <span className="absolute -bottom-1.5 inset-x-1 h-1.5 bg-cyan-400/25 rounded-full blur-[2px] pointer-events-none opacity-60 group-hover/dock:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Delicate Vertical Hairline Glass Divider */}
          <div className="h-3.5 w-px bg-gradient-to-b from-white/10 via-white/30 to-white/10 rounded-full shrink-0 mx-0.5" />

          {/* ── Slot 2: Waypoint AI Sparkles Glass Orb ── */}
          <div className="relative flex flex-col items-center">
            <button
              type="button"
              onClick={() => setAiOpen((prev) => !prev)}
              title={aiOpen ? "Close AI Assistant" : "Waypoint AI Assistant (Click to chat)"}
              className={cn(
                "group/ai relative flex h-6.5 w-6.5 items-center justify-center rounded-full",
                "cursor-pointer select-none transition-all duration-300",
                aiOpen
                  ? "bg-amber-500/25 border border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.45),0_4px_12px_rgba(0,0,0,0.5),inset_0_1.5px_2px_rgba(255,255,255,0.8)] scale-105"
                  : "bg-white/[0.08] hover:bg-white/[0.22] border border-white/25 hover:border-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.65),inset_0_-1px_2px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95"
              )}
              aria-label="Open Waypoint AI Assistant"
            >
              {/* Top 3D glass specular crescent reflection */}
              <span className="absolute top-[2px] inset-x-1.5 h-2 rounded-t-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none opacity-85" />

              {/* Crisp luminous Sparkles / X icon */}
              {aiOpen ? (
                <X className="h-3 w-3 text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] relative z-10 transition-transform duration-200 group-hover/ai:scale-110" />
              ) : (
                <Sparkles className="h-3 w-3 text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.9)] relative z-10 transition-transform duration-200 group-hover/ai:scale-110" />
              )}

              {/* Soft internal amber refraction glint */}
              <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400/10 via-transparent to-white/10 pointer-events-none" />
            </button>

            {/* Ground Caustic Reflection Pool */}
            <span className="absolute -bottom-1.5 inset-x-1 h-1.5 bg-amber-400/25 rounded-full blur-[2px] pointer-events-none opacity-60 group-hover/dock:opacity-100 transition-opacity" />
          </div>

          {/* Delicate Vertical Hairline Glass Divider */}
          <div className="h-3.5 w-px bg-gradient-to-b from-white/10 via-white/30 to-white/10 rounded-full shrink-0 mx-0.5" />

          {/* ── Slot 3: Time Tracker (Staff / Advocate Only) ── */}
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

          {/* ── Slot 4: Page ID Inspector (All Users / Everywhere) ── */}
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

      {/* ── First Mate Session Context Menu (opens above dock) ── */}
      {firstMateMenuOpen && (
        <div className="fixed bottom-14 right-3 z-50 bg-[#061222]/95 border border-cyan-500/30 rounded-2xl p-3 shadow-2xl shadow-cyan-950/80 text-xs w-68 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    isLive ? "bg-emerald-400" : "bg-amber-400"
                  } opacity-75`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isLive ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span className="font-bold text-white uppercase tracking-wider text-[10px]">
                {isLive ? "First Mate Live" : "First Mate Paused"}
              </span>
            </div>
            <span className="font-mono text-cyan-300 text-[10px] font-bold">
              {formatTime(session.durationSeconds)}
            </span>
          </div>

          <div className="text-[11px] text-slate-300 mb-2 truncate">
            <span className="text-slate-400">Target: </span>
            <span className="font-semibold text-white">
              {session.attachedName || "Avery Jenkins"}
            </span>
          </div>

          {session.liveAssist?.currentIssue && (
            <div className="p-1.5 bg-cyan-950/40 border border-cyan-500/20 rounded-lg text-[10px] text-cyan-200 mb-2">
              <span className="font-bold text-cyan-400 uppercase tracking-wider">Issue: </span>
              {session.liveAssist.currentIssue}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {(isLive || isPaused) && (
              <button
                type="button"
                onClick={async () => {
                  setFirstMateMenuOpen(false);
                  await stopListening();
                  toast.success("Recording stopped immediately for compliance.");
                }}
                className="w-full h-8 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[11px] flex items-center justify-between transition-colors cursor-pointer border border-rose-400/40 shadow-sm"
                title="Stop recording immediately for compliance"
              >
                <span className="flex items-center gap-1.5">
                  <Square className="w-3 h-3 fill-white" />
                  Stop Listening
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setFirstMateMenuOpen(false);
                openPopoutWindow();
              }}
              className="w-full h-8 px-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Pop Out Floating Window</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
            </button>

            <button
              type="button"
              onClick={() => {
                setFirstMateMenuOpen(false);
                setLocation("/first-mate");
              }}
              className="w-full h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Open Full First Mate Page</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* ── Waypoint AI Chat Panel (opens above dock) ── */}
      {aiOpen && (
        <div
          className="fixed bottom-14 right-3 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-[#071322]/95 border border-sky-500/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white">Waypoint AI</p>
              <p className="text-xs text-blue-200/70">Your IEP CRM copilot</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/70 hover:text-white cursor-pointer"
              onClick={() => {
                setMessages([]);
                setAiOpen(false);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-sky-300" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-xs",
                    msg.role === "user"
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-br-sm shadow-sm"
                      : "bg-white/[0.06] border border-white/10 text-slate-100 rounded-bl-sm"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center shrink-0 mt-0.5 text-white font-bold text-[10px]">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-sky-300" />
                </div>
                <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 bg-sky-300/70 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-sky-300/70 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-sky-300/70 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/20 transition-colors text-sky-200 cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-1 border-t border-white/10 bg-white/[0.02]">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your cases, IEP meetings, or tasks..."
                className="resize-none min-h-[40px] max-h-[120px] text-xs rounded-xl bg-[#000E26] border-sky-500/30 text-white placeholder:text-blue-200/40"
                rows={1}
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white cursor-pointer shadow-md"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-blue-200/50 mt-1.5 text-center">
              AI has real-time access to your tasks, calendar, and student records
            </p>
          </div>
        </div>
      )}

      {/* ── Time Tracking Dialog Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-[#000814]/95 border border-sky-500/30 text-white backdrop-blur-2xl shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Advocate Time Tracking
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/60">
              Track live meeting hours or log past billable advocacy work.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Switcher */}
          <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl mt-1">
            <button
              type="button"
              onClick={() => setTab("timer")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
                tab === "timer"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Play className="w-3 h-3" />
              Live Stopwatch
            </button>
            <button
              type="button"
              onClick={() => setTab("manual")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
                tab === "manual"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Plus className="w-3 h-3" />
              Manual Log
            </button>
          </div>

          {tab === "timer" ? (
            /* Live Stopwatch Tab */
            <div className="space-y-4 pt-2">
              {activeTimer ? (
                /* Timer is active */
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Timer in Progress
                  </span>
                  <div className="font-mono text-3xl font-extrabold text-emerald-300">
                    {formatElapsed(elapsedSeconds)}
                  </div>
                  <div className="text-xs text-slate-300 space-y-0.5">
                    <p className="font-semibold text-white">{activeTimer.workType}</p>
                    {activeTimer.studentName && (
                      <p className="text-blue-200/70">Student: {activeTimer.studentName}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => stopTimerMutation.mutate({})}
                    disabled={stopTimerMutation.isPending}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold h-9 rounded-xl shadow-md gap-1.5"
                  >
                    {stopTimerMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Square className="w-3.5 h-3.5 fill-current" />
                    )}
                    Stop & Save Time Entry
                  </Button>
                </div>
              ) : (
                /* Start a new live timer */
                <form onSubmit={handleStartTimer} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-sky-300">Activity Type</Label>
                    <Select value={selectedWorkType} onValueChange={setSelectedWorkType}>
                      <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                        <SelectValue placeholder="Select activity" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#001433] border-sky-500/30 text-white max-h-56">
                        {WORK_TYPES.map((wt) => (
                          <SelectItem key={wt} value={wt} className="text-xs hover:bg-sky-500/20">
                            {wt}
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
                            {st.firstName} {st.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-sky-300">Notes / Objective</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Preparing for annual review IEP meeting"
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
                      <span>Start Stopwatch</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Manual Entry Tab */
            <form onSubmit={handleLogManual} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-sky-300">Activity Type</Label>
                <Select value={selectedWorkType} onValueChange={setSelectedWorkType}>
                  <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001433] border-sky-500/30 text-white max-h-56">
                    {WORK_TYPES.map((wt) => (
                      <SelectItem key={wt} value={wt} className="text-xs hover:bg-sky-500/20">
                        {wt}
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

import React, { useState, useRef, useEffect } from "react";
import { useFirstMate } from "@/contexts/FirstMateContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Square,
  Play,
  Pause,
  RotateCcw,
  Copy,
  ExternalLink,
  Search,
  Sparkles,
  Send,
  FileText,
  Flag,
  Bookmark,
  MoreHorizontal,
  ChevronDown,
  Maximize2,
  Users,
  AlertTriangle,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  BookOpen,
  Lock,
  CheckCircle2,
  X,
  Radio,
  Plus,
  Trash2,
  Edit2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type {
  SpeakerRole,
  FirstMateSessionType,
  TrackedItem,
} from "../../../shared/firstMate";

// Radar / Reticle SVG Brand Logo matching the screenshot
function FirstMateReticleLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="reticleGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#0891b2" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#reticleGlow)" stroke="#06b6d4" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="34" stroke="#0891b2" strokeWidth="1.75" strokeDasharray="3 3" opacity="0.8" />
      <circle cx="50" cy="50" r="22" stroke="#22d3ee" strokeWidth="1.5" opacity="0.9" />
      <circle cx="50" cy="50" r="7" stroke="#38bdf8" strokeWidth="2" fill="#06b6d4" fillOpacity="0.4" />
      <circle cx="50" cy="50" r="2.5" fill="#ffffff" />
      {/* Reticle Crosshairs */}
      <line x1="50" y1="4" x2="50" y2="28" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="72" x2="50" y2="96" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="50" x2="28" y2="50" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      <line x1="72" y1="50" x2="96" y2="50" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Format seconds into HH:MM:SS or MM:SS
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

// Speaker role colors and initial badges
const SPEAKER_CONFIG: Record<
  string,
  { label: string; initial: string; bg: string; text: string; border: string }
> = {
  Parent: { label: "Parent", initial: "P", bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/40" },
  School: { label: "School", initial: "S", bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/40" },
  Advocate: { label: "Advocate (You)", initial: "A", bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40" },
  Student: { label: "Student", initial: "ST", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40" },
  Teacher: { label: "Teacher", initial: "T", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40" },
  Administrator: { label: "Administrator", initial: "AD", bg: "bg-blue-600/20", text: "text-blue-300", border: "border-blue-500/40" },
  "Special Education Teacher": { label: "SpEd Teacher", initial: "SE", bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/40" },
  SLP: { label: "SLP (Speech)", initial: "SL", bg: "bg-teal-500/20", text: "text-teal-400", border: "border-teal-500/40" },
  OT: { label: "OT (Occupational)", initial: "OT", bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40" },
  PT: { label: "PT (Physical)", initial: "PT", bg: "bg-lime-500/20", text: "text-lime-400", border: "border-lime-500/40" },
  BCBA: { label: "BCBA (Behavior)", initial: "BC", bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/40" },
  Other: { label: "Other", initial: "O", bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/40" },
};

const SESSION_TYPE_OPTIONS: Array<{ value: FirstMateSessionType; label: string }> = [
  { value: "IEP_MEETING", label: "IEP Meeting" },
  { value: "SECTION_504_MEETING", label: "Section 504 Meeting" },
  { value: "DISCOVERY_CALL", label: "Discovery / Lead Call" },
  { value: "PARENT_STRATEGY_CALL", label: "Parent Strategy Call" },
  { value: "SCHOOL_CALL", label: "School Coordination Call" },
  { value: "CLIENT_CALL", label: "Client Consultation Call" },
  { value: "GENERAL_CALL", label: "General Advocacy Call" },
  { value: "INTERNAL_CALL", label: "Internal Team Review" },
  { value: "SIMULATOR", label: "Advocacy Simulator" },
];

export default function FirstMate() {
  const {
    session,
    isAnalyzing,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    resetSession,
    setSessionType,
    setMode,
    attachRecord,
    addTranscriptTurn,
    updateTrackedItem,
    dismissAlert,
    addNote,
    saveMoment,
    askQuestion,
    generateSummary,
    clearTranscript,
  } = useFirstMate();

  // Active top tab
  const [activeTab, setActiveTab] = useState<"assist" | "simulator" | "history" | "summaries" | "settings">("assist");

  // Simulator input state
  const [simulatorSpeaker, setSimulatorSpeaker] = useState<SpeakerRole>("Parent");
  const [simulatorText, setSimulatorText] = useState("");
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  // Ask First Mate state
  const [askQuery, setAskQuery] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  // Modals
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [draftSummary, setDraftSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isExpandTranscriptOpen, setIsExpandTranscriptOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [isMomentDialogOpen, setIsMomentDialogOpen] = useState(false);
  const [momentInput, setMomentInput] = useState("");
  const [showWorkingMemory, setShowWorkingMemory] = useState(false);

  // Fetch CRM attachable records
  const { data: attachableData } = trpc.firstMate.getAttachableRecords.useQuery();
  const attachableRecords = attachableData?.records || [];

  // Auto-scroll transcript on new turns
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.transcript]);

  // Handle submit manual turn
  const handleAddTurn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = simulatorText.trim();
    if (!text) return;

    setSimulatorText("");
    await addTranscriptTurn(simulatorSpeaker, text);
  };

  // Handle Ask First Mate
  const handleAskSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = customQuery || askQuery;
    if (!q.trim()) return;

    setIsAsking(true);
    const answer = await askQuestion(q);
    setAskAnswer(answer);
    setIsAsking(false);
    if (!customQuery) {
      setAskQuery("");
    }
  };

  // Handle End Session & open summary review
  const handleStopListening = async () => {
    endSession();
    setIsGeneratingSummary(true);
    setIsSummaryModalOpen(true);
    try {
      const summary = await generateSummary();
      setDraftSummary(summary);
    } catch {
      setDraftSummary("Failed to generate draft summary. You may compose meeting notes manually.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  return (
    <div className="min-h-screen bg-[#06111f] text-slate-100 flex flex-col font-sans -m-4 p-5 pb-12 antialiased select-none selection:bg-cyan-500/30 selection:text-white">
      {/* ── TOP NAV HEADER ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <FirstMateReticleLogo className="w-11 h-11 shrink-0 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                First Mate
              </h1>
              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] tracking-wider font-mono font-bold px-1.5 py-0.5 uppercase">
                BETA
              </Badge>
              <Badge variant="outline" className="bg-white/5 text-slate-400 border-white/10 text-[10px] font-mono">
                PG-037
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Live guidance for every conversation.</p>
          </div>
        </div>

        {/* Brand Motto on Right */}
        <div className="hidden lg:flex flex-col text-right">
          <span className="text-[11px] font-semibold tracking-[0.25em] text-cyan-400/90 uppercase">
            Listen. Understand. Guide.
          </span>
          <span className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase mt-0.5">
            Together we create brighter futures.
          </span>
        </div>
      </header>

      {/* ── SUB-NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 pt-3 pb-3 border-b border-white/5 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab("assist")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
            activeTab === "assist"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          Live Assist
        </button>
        <button
          onClick={() => setActiveTab("simulator")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "simulator"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
          Simulator
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          Session History
        </button>
        <button
          onClick={() => setActiveTab("summaries")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
            activeTab === "summaries"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          Meeting Summaries
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
            activeTab === "settings"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          Settings
        </button>
      </div>

      {/* ── SESSION CONTROL BAR ── */}
      <div className="mt-3 bg-[#08182b] border border-white/10 rounded-xl p-3 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          {/* 1. Session Type */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Session Type
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full h-10 px-3 rounded-lg bg-[#0d2138] border border-white/10 flex items-center justify-between text-xs text-white hover:border-cyan-500/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 truncate">
                    <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-semibold truncate">
                      {SESSION_TYPE_OPTIONS.find((o) => o.value === session.sessionType)?.label || "IEP Meeting"}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-[#0a1c30] border-white/15 text-white">
                <DropdownMenuLabel className="text-slate-400 text-xs">Select Conversation Context</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {SESSION_TYPE_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSessionType(opt.value)}
                    className="text-xs cursor-pointer hover:bg-cyan-500/20 hover:text-cyan-300"
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 2. Attach To */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Attach To
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full h-10 px-3 rounded-lg bg-[#0d2138] border border-white/10 flex items-center justify-between text-xs text-white hover:border-cyan-500/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-cyan-600/30 border border-cyan-400/40 text-cyan-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {session.attachedName
                        ? session.attachedName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        : "AJ"}
                    </div>
                    <div className="truncate text-left">
                      <p className="font-semibold text-xs leading-none truncate">
                        {session.attachedName || "Avery Jenkins"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {session.attachedSubtitle || "Client • 9th Grade"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 bg-[#0a1c30] border-white/15 text-white max-h-72 overflow-y-auto">
                <DropdownMenuLabel className="text-slate-400 text-xs">CRM Contacts & Leads</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {attachableRecords.length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs text-slate-500">
                    No records found
                  </DropdownMenuItem>
                ) : (
                  attachableRecords.map((r) => (
                    <DropdownMenuItem
                      key={`${r.type}-${r.id}`}
                      onClick={() =>
                        attachRecord({
                          id: r.id,
                          type: r.type,
                          name: r.name,
                          subtitle: r.subtitle,
                        })
                      }
                      className="text-xs cursor-pointer hover:bg-cyan-500/20 hover:text-cyan-300 flex flex-col items-start py-2"
                    >
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-[10px] text-slate-400">{r.subtitle}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 3. Mode Segmented Pill */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Mode
            </label>
            <div className="h-10 bg-[#0d2138] border border-white/10 rounded-lg p-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => toast.info("Live audio microphone stream will be enabled in Build 2.")}
                className="flex-1 h-full rounded text-[11px] font-bold transition-all text-slate-500 hover:text-slate-300 cursor-pointer"
                title="Coming in Build 2"
              >
                Live Call
              </button>
              <button
                type="button"
                onClick={() => setMode("TEST")}
                className={`flex-1 h-full rounded text-[11px] font-bold transition-all cursor-pointer ${
                  session.mode === "TEST"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Test Mode
              </button>
              <button
                type="button"
                onClick={() => setMode("SIMULATOR")}
                className={`flex-1 h-full rounded text-[11px] font-bold transition-all cursor-pointer ${
                  session.mode === "SIMULATOR"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Simulator
              </button>
            </div>
          </div>

          {/* 4. Action & Timer */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Duration
              </span>
              <span className="text-lg font-mono font-bold text-white tracking-wider">
                {formatDuration(session.durationSeconds)}
              </span>
            </div>

            {session.status === "ACTIVE" ? (
              <Button
                onClick={handleStopListening}
                className="h-10 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-rose-900/30 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                Stop Listening
              </Button>
            ) : (
              <Button
                onClick={startSession}
                className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Listening
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN DUAL-PANEL WORKSPACE ── */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* ── LEFT COLUMN: LIVE TRANSCRIPT & SIMULATOR STREAM (7 Cols) ── */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col gap-3">
          <div className="bg-[#08182b] border border-white/10 rounded-xl p-4 flex-1 flex flex-col shadow-xl">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-white tracking-wide">Live Transcript</h2>
                {session.status === "ACTIVE" ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Listening...
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">
                    ({session.status.toLowerCase()})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearTranscript}
                  title="Clear transcript"
                  className="text-xs text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsExpandTranscriptOpen(true)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 hover:bg-white/5 px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  Expand <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Transcript Messages Feed */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 max-h-[520px] pr-1.5">
              {session.transcript.length === 0 ? (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <Radio className="w-8 h-8 mx-auto text-slate-600 animate-bounce" />
                  <p className="text-sm font-semibold">Transcript is empty</p>
                  <p className="text-xs text-slate-600">
                    Use the Simulator controls below to inject speaker turns into the live conversation.
                  </p>
                </div>
              ) : (
                session.transcript.map((t) => {
                  const cfg = SPEAKER_CONFIG[t.speakerRole] || SPEAKER_CONFIG.Other;
                  const timeString = new Date(t.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div key={t.id} className="flex items-start gap-3 group">
                      <div
                        className={`w-8 h-8 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}
                      >
                        {cfg.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`font-bold ${cfg.text}`}>{cfg.label}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{timeString}</span>
                        </div>
                        <div className="bg-[#0e2238] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 leading-relaxed shadow-sm">
                          {t.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={transcriptBottomRef} />
            </div>

            {/* Audio Wave & Status Indicator */}
            <div className="pt-2.5 pb-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-0.5 h-3">
                  <span className="w-0.5 h-2.5 bg-cyan-400 animate-pulse" />
                  <span className="w-0.5 h-3.5 bg-cyan-400 animate-pulse delay-75" />
                  <span className="w-0.5 h-2 bg-cyan-400 animate-pulse delay-150" />
                  <span className="w-0.5 h-3 bg-cyan-400 animate-pulse delay-100" />
                </div>
                <span className="text-slate-400">
                  {isAnalyzing ? "First Mate analyzing turn..." : "Transcribing in real time..."}
                </span>
              </div>

              <span className="text-[10px] text-slate-500 font-mono">
                {session.transcript.length} turns recorded
              </span>
            </div>

            {/* ── EMBEDDED SIMULATOR MANUAL INPUT CONTROLS ── */}
            <div className="mt-2 pt-3 border-t border-cyan-500/20 bg-[#071524] rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-cyan-400" />
                  Manual Simulator Turn Input
                </span>
                <span className="text-[9px] text-slate-400">Press Enter to Add</span>
              </div>

              <form onSubmit={handleAddTurn} className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={simulatorSpeaker}
                    onChange={(e) => setSimulatorSpeaker(e.target.value as SpeakerRole)}
                    className="w-36 h-9 rounded-lg bg-[#0d2138] border border-white/10 text-xs text-white px-2 focus:outline-none focus:border-cyan-400 font-semibold cursor-pointer"
                  >
                    <option value="Parent">Parent</option>
                    <option value="School">School</option>
                    <option value="Advocate">Advocate (You)</option>
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Special Education Teacher">SpEd Teacher</option>
                    <option value="SLP">SLP (Speech)</option>
                    <option value="OT">OT (Occupational)</option>
                    <option value="PT">PT (Physical)</option>
                    <option value="BCBA">BCBA</option>
                    <option value="Other">Other</option>
                  </select>

                  <Input
                    value={simulatorText}
                    onChange={(e) => setSimulatorText(e.target.value)}
                    placeholder={`Type what ${simulatorSpeaker} says...`}
                    className="flex-1 h-9 bg-[#0d2138] border-white/10 text-xs text-white placeholder:text-slate-500 focus-visible:ring-cyan-400"
                  />

                  <Button
                    type="submit"
                    disabled={!simulatorText.trim() || isAnalyzing}
                    className="h-9 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {isAnalyzing ? (
                      <span className="text-xs">Thinking...</span>
                    ) : (
                      <>
                        Add <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Quick Simulation Preset Chips for Instant 1-Click Verification */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[10px]">
                  <span className="text-slate-500 font-bold shrink-0">Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatorSpeaker("School");
                      setSimulatorText("We don't believe an evaluation is necessary because his grades are passing.");
                    }}
                    className="px-2 py-1 rounded bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 whitespace-nowrap cursor-pointer"
                  >
                    Evaluation Refusal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatorSpeaker("School");
                      setSimulatorText("We want to reduce speech therapy to 30 minutes every other week.");
                    }}
                    className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 whitespace-nowrap cursor-pointer"
                  >
                    Speech Reduction
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatorSpeaker("Parent");
                      setSimulatorText("I want a comprehensive psychoeducational evaluation in all areas of suspected need.");
                    }}
                    className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 whitespace-nowrap cursor-pointer"
                  >
                    Parent Request
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatorSpeaker("School");
                      setSimulatorText("We can agree to add transition warnings and visual schedules to his accommodations.");
                    }}
                    className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30 whitespace-nowrap cursor-pointer"
                  >
                    Commitment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: 5 THEMED LIVE ASSIST GUIDANCE CARDS (6 Cols) ── */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-3 flex flex-col justify-between">
          {/* CARD 1: CURRENT ISSUE (RED/CORAL) */}
          <div className="rounded-xl border border-rose-500/40 bg-gradient-to-b from-[#240c14] to-[#17080e] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Current Issue</span>
              </div>
              <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5">
                {session.liveAssist?.currentIssuePriority || "High Priority"}
              </Badge>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {session.liveAssist?.currentIssue || "Evaluation Refusal"}
            </h3>
            <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
              {session.liveAssist?.currentIssueDescription ||
                "School is declining to conduct an evaluation despite parent concerns."}
            </p>
          </div>

          {/* CARD 2: SAY THIS (TEAL/EMERALD) */}
          <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-b from-[#082220] to-[#051716] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Say This</span>
              </div>
              <button
                onClick={() => copyToClipboard(session.liveAssist?.sayThis || "", "Suggested phrasing")}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 transition-all cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <p className="text-sm font-semibold text-emerald-100 leading-relaxed italic">
              "{session.liveAssist?.sayThis || "What data is the team relying on to determine that an evaluation is not necessary?"}"
            </p>
          </div>

          {/* CARD 3: ASK NEXT (BLUE) */}
          <div className="rounded-xl border border-sky-500/40 bg-gradient-to-b from-[#081c30] to-[#051322] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Ask Next</span>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    (session.liveAssist?.askNext || []).join("\n"),
                    "Follow-up questions"
                  )
                }
                className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 hover:bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30 transition-all cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <ul className="space-y-1.5 text-xs text-sky-100 leading-relaxed">
              {(session.liveAssist?.askNext && session.liveAssist.askNext.length > 0
                ? session.liveAssist.askNext
                : [
                    "When did you last review his progress data?",
                    "What specific measures show no educational impact?",
                    "Have you considered a full and individual evaluation in all areas of suspected need?",
                  ]
              ).map((q, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-sky-400 font-bold">•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CARD 4: WHY IT MATTERS (PURPLE) */}
          <div className="rounded-xl border border-purple-500/40 bg-gradient-to-b from-[#180e2e] to-[#0f091f] p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <Lightbulb className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Why It Matters</span>
            </div>
            <p className="text-xs text-purple-200/90 leading-relaxed">
              {session.liveAssist?.whyItMatters ||
                "Parents have the right to request an evaluation at any time. The school must consider the request and cannot deny it without a proper review of all available data."}
            </p>
          </div>

          {/* CARD 5: RELATED SOURCES (AMBER/GOLD) */}
          <div className="rounded-xl border border-amber-500/40 bg-gradient-to-b from-[#241a08] to-[#171005] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Related Sources</span>
              </div>
              <button
                onClick={() => setShowWorkingMemory(!showWorkingMemory)}
                className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
              >
                {showWorkingMemory ? "Hide Memory" : "Working Memory"}
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              {(session.liveAssist?.sources && session.liveAssist.sources.length > 0
                ? session.liveAssist.sources
                : [
                    { title: "IDEA § 300.301 – Initial Evaluations", url: "https://sites.ed.gov/idea/regs/b/d/300.301", isVerified: true },
                    { title: "Parental Rights – Requesting an Evaluation", url: "https://www.parentcenterhub.org/evaluation/", isVerified: true },
                  ]
              ).map((src, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    {src.url ? (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-300 hover:text-amber-200 underline flex items-center gap-1 font-medium"
                      >
                        {src.title} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-amber-200 font-medium">{src.title}</span>
                    )}
                  </div>
                  {src.isVerified ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] px-1">Verified</Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-300 border-none text-[9px] px-1">Source Needed</Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Working Memory Inspector Drawer (Optional toggle) */}
            {showWorkingMemory && (
              <div className="mt-3 pt-2.5 border-t border-amber-500/20 text-[11px] text-amber-200/90 space-y-1 bg-black/30 p-2.5 rounded-lg">
                <p className="font-bold text-amber-400 text-xs">Working Memory State:</p>
                <p><span className="text-slate-400">Student:</span> {session.sessionState.studentName || "Avery Jenkins"}</p>
                <p><span className="text-slate-400">Current Topic:</span> {session.sessionState.currentTopic || "Evaluation"}</p>
                <p><span className="text-slate-400">Dispute:</span> {session.sessionState.currentDispute || "Evaluation Refusal"}</p>
                <p><span className="text-slate-400">Suspected Needs:</span> {(session.sessionState.suspectedDisabilities || []).join(", ") || "Reading, Anxiety"}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div className="mt-4 bg-[#08182b] border border-white/10 rounded-xl p-3 shadow-xl space-y-3">
        {/* Ask First Mate Input & Fast Action Buttons */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Ask First Mate input */}
          <form onSubmit={handleAskSubmit} className="relative flex-1 w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <Input
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              placeholder="Ask First Mate anything..."
              className="h-10 pl-9 pr-10 bg-[#0d2138] border-white/10 text-xs text-white placeholder:text-slate-500 focus-visible:ring-cyan-400 rounded-lg"
            />
            <button
              type="submit"
              disabled={isAsking || !askQuery.trim()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors p-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setIsNoteDialogOpen(true)}
              variant="outline"
              className="h-10 px-3 bg-[#0d2138] hover:bg-white/10 border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Add Note
            </Button>
            <Button
              onClick={() => {
                const turn = session.transcript[session.transcript.length - 1];
                if (turn) {
                  updateTrackedItem(turn.id, "confirmed", "Advocate flagged during meeting");
                  toast.success("Flagged current topic for post-meeting action");
                } else {
                  toast.info("No active turns to flag");
                }
              }}
              variant="outline"
              className="h-10 px-3 bg-[#0d2138] hover:bg-white/10 border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5 text-rose-400" />
              Flag Issue
            </Button>
            <Button
              onClick={() => setIsMomentDialogOpen(true)}
              variant="outline"
              className="h-10 px-3 bg-[#0d2138] hover:bg-white/10 border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-purple-400" />
              Save Moment
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 px-3 bg-[#0d2138] hover:bg-white/10 border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" /> More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0a1c30] border-white/15 text-white text-xs">
                <DropdownMenuItem onClick={() => handleAskSubmit(undefined, "What has the school refused?")}>
                  List School Refusals
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAskSubmit(undefined, "What has the parent requested?")}>
                  List Parent Requests
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAskSubmit(undefined, "What should I ask next?")}>
                  Suggest Next Questions
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => resetSession()} className="text-rose-400">
                  Reset First Mate Session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Ask First Mate Live Response Card (if queried) */}
        {askAnswer && (
          <div className="bg-[#0b2440] border border-cyan-500/30 rounded-lg p-3 text-xs flex items-start justify-between gap-3 animate-in fade-in">
            <div className="space-y-1">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> First Mate Copilot:
              </span>
              <p className="text-slate-200 leading-relaxed">{askAnswer}</p>
            </div>
            <button
              onClick={() => setAskAnswer(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Status Line Footer matching mockup */}
        <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              First Mate is listening
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Speech-to-text powered by OpenAI</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Lock className="w-3 h-3 text-amber-400" />
              Test Mode • Not saved to client record
            </span>
            <span className="italic font-serif text-slate-500 hidden md:inline">
              Navigate What's Next.
            </span>
          </div>
        </div>
      </div>

      {/* ── SESSION END DRAFT SUMMARY REVIEW MODAL ── */}
      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent className="max-w-2xl bg-[#091b2f] border border-white/15 text-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg font-bold text-white">
                Draft Session Summary
              </DialogTitle>
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                TEST MODE • NOT SAVED TO RECORD
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Review, edit, or copy the generated meeting/call summary before completing.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-3">
            {isGeneratingSummary ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-cyan-400 animate-spin" />
                <p className="text-xs font-semibold">Synthesizing meeting transcript & tracked issues...</p>
              </div>
            ) : (
              <Textarea
                value={draftSummary}
                onChange={(e) => setDraftSummary(e.target.value)}
                rows={16}
                className="w-full bg-[#0d2238] border-white/10 text-xs font-mono text-slate-200 leading-relaxed focus-visible:ring-cyan-400"
              />
            )}
          </div>

          <DialogFooter className="flex items-center justify-between border-t border-white/10 pt-3">
            <Button
              onClick={() => copyToClipboard(draftSummary, "Meeting summary")}
              variant="outline"
              className="bg-[#0d2238] border-white/10 text-xs hover:bg-white/10 text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Summary
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsSummaryModalOpen(false)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer"
              >
                Close Review
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EXPANDED TRANSCRIPT MODAL ── */}
      <Dialog open={isExpandTranscriptOpen} onOpenChange={setIsExpandTranscriptOpen}>
        <DialogContent className="max-w-4xl bg-[#091b2f] border border-white/15 text-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center justify-between">
              <span>Full Session Transcript ({session.transcript.length} turns)</span>
              <Badge variant="outline" className="text-xs font-mono text-cyan-400 border-cyan-400/30">
                {session.sessionType}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {session.transcript.map((t) => {
              const cfg = SPEAKER_CONFIG[t.speakerRole] || SPEAKER_CONFIG.Other;
              return (
                <div key={t.id} className="p-2.5 rounded-lg bg-[#0d2238] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${cfg.text}`}>{cfg.label}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200">{t.text}</p>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                copyToClipboard(
                  session.transcript.map((t) => `${t.speakerRole}: ${t.text}`).join("\n"),
                  "Full transcript"
                )
              }
              variant="outline"
              className="bg-[#0d2238] text-xs text-slate-200 border-white/10 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy Entire Transcript
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD NOTE DIALOG ── */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="bg-[#091b2f] border border-white/15 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white">Add Session Note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Type notes for this session..."
            className="bg-[#0d2238] border-white/10 text-xs text-white"
          />
          <DialogFooter>
            <Button
              onClick={() => {
                addNote(noteInput);
                setNoteInput("");
                setIsNoteDialogOpen(false);
              }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SAVE MOMENT DIALOG ── */}
      <Dialog open={isMomentDialogOpen} onOpenChange={setIsMomentDialogOpen}>
        <DialogContent className="bg-[#091b2f] border border-white/15 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white">Save Key Moment</DialogTitle>
          </DialogHeader>
          <Input
            value={momentInput}
            onChange={(e) => setMomentInput(e.target.value)}
            placeholder="Label this advocacy moment (e.g. School conceded evaluation)..."
            className="bg-[#0d2238] border-white/10 text-xs text-white"
          />
          <DialogFooter>
            <Button
              onClick={() => {
                saveMoment(momentInput);
                setMomentInput("");
                setIsMomentDialogOpen(false);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              Bookmark Moment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

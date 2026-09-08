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
    isFastAnalyzing,
    isDeepAnalyzing,
    isRephrasing,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    resetSession,
    setSessionType,
    setMode,
    attachRecord,
    addTranscriptTurn,
    rephraseSayThis,
    updateTrackedItem,
    dismissAlert,
    dismissConflict,
    addNote,
    saveMoment,
    askQuestion,
    generateSummary,
    clearTranscript,
    lastAskMeta,
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
  const [showAskTrace, setShowAskTrace] = useState(false);
  const [showLiveAssistTrace, setShowLiveAssistTrace] = useState(false);

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
  const [showDevLogs, setShowDevLogs] = useState(false);
  const [showDetectionsModal, setShowDetectionsModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemText, setEditItemText] = useState("");

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

        {/* Right side operational actions: Detections Review & Dev Logs */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowDetectionsModal(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Detections
            <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold px-1.5 py-0 h-4 border-none">
              {(session.requests?.length || 0) +
                (session.refusals?.length || 0) +
                (session.commitments?.length || 0) +
                (session.proposals?.length || 0)}
            </Badge>
          </button>
          <button
            onClick={() => setShowDevLogs(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Dev Logs
            <Badge className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold px-1.5 py-0 h-4 border-none">
              {session.devLogs?.length || 0}
            </Badge>
          </button>
        </div>
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
                  <span className="text-slate-500 font-bold shrink-0">Scenarios:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatorSpeaker("School");
                      setSimulatorText("His grades are passing, so we don't believe an evaluation is necessary.");
                    }}
                    className="px-2 py-1 rounded bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 whitespace-nowrap cursor-pointer"
                    title="Scenario 1: Evaluation Refusal"
                  >
                    1. Eval Refusal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatorSpeaker("School");
                      setSimulatorText("We're recommending reducing speech from 60 minutes to 30 minutes.");
                    }}
                    className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 whitespace-nowrap cursor-pointer"
                    title="Scenario 2: Service Reduction"
                  >
                    2. Service Reduction
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatorSpeaker("School");
                      setSimulatorText("Yes, we can put transition warnings and visual schedules into the IEP.");
                    }}
                    className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30 whitespace-nowrap cursor-pointer"
                    title="Scenario 3: Team Commitment"
                  >
                    3. Commitment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatorSpeaker("School");
                      setSimulatorText("We haven't received an evaluation request.");
                    }}
                    className="px-2 py-1 rounded bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30 whitespace-nowrap cursor-pointer"
                    title="Scenario 4: Timeline Conflict with Earlier Parent Statement"
                  >
                    4. Memory Conflict
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: 5 THEMED LIVE ASSIST GUIDANCE CARDS (6 Cols) ── */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-3 flex flex-col justify-between">
          {/* Active Discussion Thread & Unresolved Threads Indicator */}
          {session.threads && session.threads.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg bg-[#071728] border border-white/10 text-xs shadow-sm">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" /> Current Thread:
              </span>
              {session.threads
                .filter((t) => t.status === "active")
                .map((t) => (
                  <Badge key={t.id} className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold">
                    {t.name}
                  </Badge>
                ))}
              {session.threads
                .filter((t) => t.status === "open")
                .slice(0, 2)
                .map((t) => (
                  <Badge key={t.id} variant="outline" className="bg-white/5 text-slate-300 border-white/10 text-[10px]">
                    Open: {t.name}
                  </Badge>
                ))}
            </div>
          )}

          {/* Conflict Alert Banner (Test Scenario 4: Cross-Turn Rolling Memory Conflict) */}
          {session.conflicts &&
            session.conflicts
              .filter((c) => !c.resolved)
              .map((conflict) => (
                <div
                  key={conflict.id}
                  className="rounded-xl border border-amber-500/60 bg-gradient-to-r from-[#2a1708] to-[#1c0f05] p-3.5 shadow-lg flex items-start justify-between gap-3 animate-in fade-in"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
                          Possible Conflict Detected
                        </span>
                        <span className="text-xs font-semibold text-amber-200">
                          {conflict.title || "Contradiction in Session"}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-white mt-1 leading-relaxed">
                        {conflict.message}
                      </p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-black/40 p-2 rounded border border-white/5">
                        <div>
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase">Earlier Statement:</span>
                          <span className="text-amber-200 italic">"{conflict.earlierStatement}"</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase">Current Statement:</span>
                          <span className="text-amber-200 italic">"{conflict.currentStatement}"</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissConflict(conflict.id)}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    title="Dismiss Conflict Alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

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
                {isRephrasing && (
                  <span className="text-[10px] text-emerald-400 animate-pulse font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Adapting tone...
                  </span>
                )}
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

            {/* Quick Actions for Say This */}
            <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="text-emerald-400/80 font-bold uppercase tracking-wider text-[9px] mr-1">Rephrase:</span>
              <button
                type="button"
                disabled={isRephrasing}
                onClick={() => rephraseSayThis("another_version")}
                className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                Another Version
              </button>
              <button
                type="button"
                disabled={isRephrasing}
                onClick={() => rephraseSayThis("softer")}
                className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                Softer
              </button>
              <button
                type="button"
                disabled={isRephrasing}
                onClick={() => rephraseSayThis("firmer")}
                className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                Firmer
              </button>
              <button
                type="button"
                disabled={isRephrasing}
                onClick={() => rephraseSayThis("shorter")}
                className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                Shorter
              </button>
              <button
                type="button"
                disabled={isRephrasing}
                onClick={() => rephraseSayThis("followup_question")}
                className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                Follow-Up
              </button>
            </div>
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

        {/* Development AI Provenance & Validated Structured AI Output (Dev / Test Mode Only) */}
        {(import.meta.env.DEV || session.mode !== "LIVE") && (
          <div className="mt-3 rounded-lg border border-white/10 bg-[#061524] p-3 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-300">Live Assist AI Provenance:</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    (session.liveAssist?.provenanceMeta?.provenance || "AI: MOCK") === "AI: OPENAI"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : (session.liveAssist?.provenanceMeta?.provenance || "AI: MOCK") === "AI: FALLBACK"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : (session.liveAssist?.provenanceMeta?.provenance || "AI: MOCK") === "AI: MOCK"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  }`}
                >
                  {session.liveAssist?.provenanceMeta?.provenance || "AI: MOCK"}
                </span>
                <span className="text-[11px] text-slate-400">
                  {session.liveAssist?.provenanceMeta?.provider || "Initial Scenario Template"} •{" "}
                  {session.liveAssist?.provenanceMeta?.model || "scenario-1"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLiveAssistTrace(!showLiveAssistTrace)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                {showLiveAssistTrace ? "Hide Structured Output" : "Raw Structured AI Output"}
              </button>
            </div>

            {showLiveAssistTrace && (
              <div className="mt-2 pt-2 border-t border-white/10 space-y-2 text-[11px] text-slate-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-slate-500">Latency:</span> {session.liveAssist?.provenanceMeta?.latencyMs || 0} ms
                  </div>
                  <div>
                    <span className="text-slate-500">Confidence:</span> {session.liveAssist?.confidence || "High"}
                  </div>
                  <div>
                    <span className="text-slate-500">Procedure:</span> firstMate.fastAssist
                  </div>
                  <div>
                    <span className="text-slate-500">Updated:</span>{" "}
                    {new Date(session.liveAssist?.provenanceMeta?.timestamp || Date.now()).toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Validated Application Output:</span>
                  <pre className="mt-1 p-2 bg-black/50 rounded text-[10px] text-slate-300 overflow-x-auto max-h-48">
                    {JSON.stringify(
                      {
                        currentIssue: session.liveAssist?.currentIssue,
                        sayThis: session.liveAssist?.sayThis,
                        askNext: session.liveAssist?.askNext,
                        alert: session.alerts?.[0]?.message || null,
                        detections: [
                          ...session.requests.map((r) => ({ type: "REQUEST", summary: r.summary })),
                          ...session.refusals.map((r) => ({ type: "REFUSAL", summary: r.summary })),
                        ],
                        sessionStateUpdates: session.sessionState,
                        confidence: session.liveAssist?.confidence,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
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
          <div className="bg-[#0b2440] border border-cyan-500/30 rounded-lg p-3 text-xs flex flex-col gap-2 animate-in fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 w-full">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> First Mate Copilot:
                  </span>
                  {/* Provenance Indicator Badge (Test / Dev Mode) */}
                  {(import.meta.env.DEV || session.mode !== "LIVE") && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide border ${
                        (lastAskMeta?.provenance || "AI: FALLBACK") === "AI: OPENAI"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : (lastAskMeta?.provenance || "AI: FALLBACK") === "AI: FALLBACK"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : (lastAskMeta?.provenance || "AI: FALLBACK") === "AI: MOCK"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          : (lastAskMeta?.provenance || "AI: FALLBACK") === "AI: RULE"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {lastAskMeta?.provenance || "AI: FALLBACK"}
                    </span>
                  )}
                  {(import.meta.env.DEV || session.mode !== "LIVE") && (
                    <button
                      type="button"
                      onClick={() => setShowAskTrace(!showAskTrace)}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer ml-auto"
                    >
                      {showAskTrace ? "Hide Trace" : "AI Trace & Details"}
                    </button>
                  )}
                </div>
                <p className="text-slate-200 leading-relaxed whitespace-pre-line">{askAnswer}</p>
              </div>
              <button
                onClick={() => setAskAnswer(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Collapsible Developer Trace in Dev Mode */}
            {showAskTrace && (import.meta.env.DEV || session.mode !== "LIVE") && (
              <div className="mt-2 pt-2 border-t border-cyan-500/20 text-[11px] font-mono space-y-1 bg-[#061524] p-2.5 rounded border border-white/5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500">Provider:</span>{" "}
                    <span className="text-cyan-300 font-semibold">{lastAskMeta?.provider || "Local Fallback Heuristics"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Model:</span>{" "}
                    <span className="text-amber-300">{lastAskMeta?.model || "offline-heuristics"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Latency:</span>{" "}
                    <span className="text-emerald-300">{lastAskMeta?.latencyMs || 0} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Procedure:</span>{" "}
                    <span className="text-slate-200">firstMate.ask</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Timestamp:</span>{" "}
                    <span className="text-slate-400">{new Date(lastAskMeta?.timestamp || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Session ID:</span>{" "}
                    <span className="text-slate-400 truncate">{session.sessionId}</span>
                  </div>
                </div>
                {lastAskMeta?.rawStructuredOutput && (
                  <div className="mt-2">
                    <span className="text-slate-500 text-[10px]">Validated Structured Response:</span>
                    <pre className="mt-1 p-2 bg-black/40 rounded text-[10px] text-slate-300 overflow-x-auto max-h-32">
                      {JSON.stringify(lastAskMeta.rawStructuredOutput, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
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

      {/* ── DETECTIONS REVIEW & EDIT MODAL ── */}
      <Dialog open={showDetectionsModal} onOpenChange={setShowDetectionsModal}>
        <DialogContent className="max-w-3xl bg-[#091b2f] border border-white/15 text-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Tracked Detections & Decisions
              </DialogTitle>
              <Badge className="bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                {((session.requests || []).length +
                  (session.refusals || []).length +
                  (session.commitments || []).length +
                  (session.proposals || []).length +
                  (session.openIssues || []).length)}{" "}
                items
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Confirm, edit, or dismiss AI-identified parent requests, school refusals, commitments, and proposals.
              Dismissed items will not be re-generated.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
            {[
              ...(session.requests || []),
              ...(session.refusals || []),
              ...(session.commitments || []),
              ...(session.proposals || []),
              ...(session.openIssues || []),
            ].length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-semibold">No detections tracked yet</p>
                <p className="text-[11px] text-slate-600">
                  As conversation develops in Simulator or Live mode, items will appear here automatically.
                </p>
              </div>
            ) : (
              [
                ...(session.requests || []),
                ...(session.refusals || []),
                ...(session.commitments || []),
                ...(session.proposals || []),
                ...(session.openIssues || []),
              ].map((item) => {
                const isEditing = editingItemId === item.id;
                const typeColor =
                  item.type === "REQUEST"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : item.type === "POSSIBLE_REFUSAL"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : item.type === "PROPOSAL"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : item.type === "COMMITMENT"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    : "bg-purple-500/20 text-purple-300 border-purple-500/40";

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-[#0d2238] border border-white/10 flex flex-col gap-2 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] font-bold uppercase ${typeColor}`}>
                          {item.type.replace("_", " ")}
                        </Badge>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          Speaker: {item.speaker}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-mono ${
                            item.status === "confirmed"
                              ? "text-emerald-400 border-emerald-400/30"
                              : item.status === "dismissed"
                              ? "text-slate-500 border-white/10 line-through"
                              : "text-amber-400 border-amber-400/30"
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status !== "confirmed" && (
                          <button
                            type="button"
                            onClick={() => updateTrackedItem(item.id, "confirmed")}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) {
                              if (editItemText.trim()) {
                                updateTrackedItem(item.id, "edited", editItemText.trim());
                              }
                              setEditingItemId(null);
                            } else {
                              setEditingItemId(item.id);
                              setEditItemText(item.summary);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-semibold transition-all cursor-pointer"
                        >
                          {isEditing ? "Save" : "Edit"}
                        </button>
                        {item.status !== "dismissed" && (
                          <button
                            type="button"
                            onClick={() => updateTrackedItem(item.id, "dismissed")}
                            className="px-2 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <Input
                        value={editItemText}
                        onChange={(e) => setEditItemText(e.target.value)}
                        className="h-8 bg-[#091b2f] border-white/20 text-xs text-white"
                        autoFocus
                      />
                    ) : (
                      <p className="text-xs text-slate-200 font-medium">{item.summary}</p>
                    )}

                    {item.supportingTranscriptText && (
                      <p className="text-[11px] text-slate-400 italic bg-black/20 px-2 py-1 rounded border border-white/5">
                        "{item.supportingTranscriptText}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="border-t border-white/10 pt-3">
            <Button
              onClick={() => setShowDetectionsModal(false)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
            >
              Done Reviewing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── FIRST MATE DEV LOGS MODAL ── */}
      <Dialog open={showDevLogs} onOpenChange={setShowDevLogs}>
        <DialogContent className="max-w-3xl bg-[#091b2f] border border-white/15 text-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                First Mate Dev & AI Logs
              </DialogTitle>
              <Badge className="bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                {session.devLogs?.length || 0} calls
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Operational diagnostics tracking Two-Speed AI latency, stage execution, and model performance.
            </p>
          </DialogHeader>

          {/* Session Overview Strip */}
          <div className="p-2.5 rounded-lg bg-[#071626] border border-white/10 grid grid-cols-3 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Session ID:</span>
              <span className="text-cyan-300 truncate block">{session.sessionId}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Session Type:</span>
              <span className="text-white">{session.sessionType}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Active Mode:</span>
              <span className="text-emerald-400 font-bold">{session.mode}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 space-y-2">
            {!session.devLogs || session.devLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-1">
                <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-semibold">No AI requests executed yet</p>
                <p className="text-[11px] text-slate-600">
                  Send a simulator speaker turn or query First Mate to generate live logs.
                </p>
              </div>
            ) : (
              (session.devLogs || []).map((log) => {
                const stageColor =
                  log.stage === "FAST"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : log.stage === "DEEP"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    : log.stage === "REPHRASE"
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                    : log.stage === "ASK"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40";

                return (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-[#0d2238] border border-white/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] font-mono font-bold ${stageColor}`}>
                        {log.stage}
                      </Badge>
                      <span className="font-mono text-[11px] text-slate-300">
                        {log.model}
                      </span>
                      {log.notes && (
                        <span className="text-[11px] text-slate-400">
                          • {log.notes}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className={log.latencyMs < 500 ? "text-emerald-400" : "text-amber-400"}>
                        {log.latencyMs}ms
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      {log.success ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="Success" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-rose-500" title="Error" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="border-t border-white/10 pt-3">
            <Button
              onClick={() => setShowDevLogs(false)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
            >
              Close Diagnostics
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

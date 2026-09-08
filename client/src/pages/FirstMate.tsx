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
  ChevronUp,
  Maximize2,
  Users,
  AlertTriangle,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  BookOpen,
  Bug,
  Lock,
  CheckCircle2,
  X,
  Radio,
  Plus,
  Trash2,
  Edit2,
  Layers,
  ArrowRight,
  Mic,
  MicOff,
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
import { RadarReticleIcon, FirstMateReticleLogo } from "@/components/firstMate/RadarReticleIcon";

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
    clearAskHistory,
    generateSummary,
    clearTranscript,
    lastAskMeta,
    audioInputStatus,
    transcriptionStatus,
    interimTranscript,
    selectedSpeaker,
    setSelectedSpeaker,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    retryMicrophonePermission,
    microphoneDiagnostics,
    audioDevices,
    selectedAudioDevice,
    setSelectedAudioDevice,
    openPopoutWindow,
    endSessionAndProcess,
    isProcessingEndSession,
    startNewSession,
    continuePreviousSession,
    hasPreviousSession,
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
  const [copiedAskId, setCopiedAskId] = useState<string | null>(null);
  const [showAskTrace, setShowAskTrace] = useState(false);
  const [showLiveAssistTrace, setShowLiveAssistTrace] = useState(false);
  const [showBottomDiagnostics, setShowBottomDiagnostics] = useState(false);
  const [isCopiedAskAnswer, setIsCopiedAskAnswer] = useState(false);
  const [isCopiedTranscript, setIsCopiedTranscript] = useState(false);

  // Modals
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [draftSummary, setDraftSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isExpandTranscriptOpen, setIsExpandTranscriptOpen] = useState(false);
  const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("fm_transcript_collapsed");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleTranscriptCollapsed = () => {
    setIsTranscriptCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("fm_transcript_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const [isManualInputCollapsed, setIsManualInputCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("fm_manual_input_collapsed");
      return saved !== null ? saved === "true" : true; // collapsed by default
    } catch {
      return true;
    }
  });

  const toggleManualInputCollapsed = () => {
    setIsManualInputCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("fm_manual_input_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const [isControlBarCollapsed, setIsControlBarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("fm_control_bar_collapsed");
      return saved === "true";
    } catch {
      return false;
    }
  });

  const toggleControlBarCollapsed = () => {
    setIsControlBarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("fm_control_bar_collapsed", String(next));
      } catch {}
      return next;
    });
  };
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

  // End session and process notes to student file (Advocate Only)
  const handleEndSessionAndProcess = async () => {
    try {
      handleStopListening();
      await endSessionAndProcess();
    } catch (err) {
      console.warn("endSessionAndProcess error:", err);
    }
  };
  const handleStop = handleEndSessionAndProcess;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  return (
    <div className="min-h-screen bg-[#06111f] text-slate-100 flex flex-col font-sans -m-4 p-5 pb-12 antialiased select-none selection:bg-cyan-500/30 selection:text-white">
      {/* ── TOP NAV HEADER ── */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-white/10">
        {/* Left: Branding, Animated Radar Reticle, Title & Badges (Locked to single line) */}
        <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
          <FirstMateReticleLogo className="w-11 h-11 shrink-0 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
          <div className="shrink-0">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <h1 className="text-2xl font-bold tracking-tight text-white whitespace-nowrap">
                First Mate
              </h1>
              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] tracking-wider font-mono font-bold px-1.5 py-0.5 uppercase shrink-0">
                BETA
              </Badge>
              <Badge variant="outline" className="bg-white/5 text-slate-400 border-white/10 text-[10px] font-mono shrink-0">
                PG-037
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 whitespace-nowrap">Live guidance for every conversation.</p>
          </div>
        </div>

        {/* Right side: Top Header Toolbar */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto scrollbar-none">
          {/* 1. Pop Out First Mate */}
          <button
            type="button"
            onClick={openPopoutWindow}
            className="h-8 px-3 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 hover:border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95"
            title="Open First Mate in a synchronized floating window"
          >
            <FirstMateReticleLogo className="w-4 h-4" />
            <span>POP OUT FIRST MATE</span>
          </button>

          {/* 2. Detections Pill */}
          <button
            type="button"
            onClick={() => setShowDetectionsModal(true)}
            className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            title="View detected speech events, proposals, requests and commitments"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Detections</span>
            <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold px-1.5 py-0 h-4 border-none">
              {(session.requests?.length || 0) +
                (session.refusals?.length || 0) +
                (session.commitments?.length || 0) +
                (session.proposals?.length || 0)}
            </Badge>
          </button>

          {/* 3. Dev Logs Pill */}
          <button
            type="button"
            onClick={() => setShowDevLogs(true)}
            className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            title="View AI reasoning logs & latency timings"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dev Logs</span>
            <Badge className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold px-1.5 py-0 h-4 border-none">
              {session.devLogs?.length || 0}
            </Badge>
          </button>

          {/* Subtle Vertical Divider */}
          <div className="h-4 w-px bg-white/15 mx-0.5 shrink-0" />

          {/* 4. Feedback & Issues */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-issue-reporter"))}
            className="h-8 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
            title="Report Issue / Feedback to Linear Backlog (⌥+F)"
          >
            <Bug className="w-3.5 h-3.5 text-rose-500" />
            <span>Feedback & Issues</span>
          </button>

          {/* 5. Dev Info */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-dev-rules"))}
            className="h-8 px-2.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 hover:text-amber-300 border border-amber-400/30 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-amber-500/5 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            title="Developer Guidelines & Page Rules"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Dev Info</span>
          </button>
        </div>
      </header>

      {/* ── SUB-NAVIGATION TABS BAR (COMPACT) ── */}
      <div className="flex items-center justify-between gap-2 py-1 border-b border-white/5 text-[11px]">
        {/* Left: Clean Segmented Pill Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none bg-[#071728]/90 border border-white/10 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("assist")}
            className={`px-2.5 py-1 rounded font-medium text-[11px] transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === "assist"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Live Assist
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("simulator");
              setMode("SIMULATOR");
              setIsManualInputCollapsed(false);
            }}
            className={`px-2.5 py-1 rounded font-medium text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
              activeTab === "simulator"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <Radio className="w-2.5 h-2.5 text-amber-400" />
            Simulator
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("summaries");
              setIsSummaryModalOpen(true);
            }}
            className={`px-2.5 py-1 rounded font-medium text-[11px] transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === "summaries"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Meeting Summaries
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("settings");
              setShowBottomDiagnostics(true);
              const el = document.getElementById("ai-diagnostics");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className={`px-2.5 py-1 rounded font-medium text-[11px] transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === "settings"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Diagnostics & Settings
          </button>
        </div>

        {/* Right: Live Telemetry Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-mono shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">Active Session</span>
          </span>
          <span className="text-slate-600">•</span>
          <span>{session.transcript.length} turns recorded</span>
        </div>
      </div>

      {/* ── SUPER-MINIMIZED SESSION CONTROL BAR ── */}
      <div className="mt-1.5 bg-[#08182b]/95 border border-white/10 rounded-lg px-2 py-1 shadow-sm overflow-x-auto scrollbar-none">
        {isControlBarCollapsed ? (
          /* COLLAPSED MINI-BAR */
          <div className="flex items-center justify-between gap-2 text-[11px] min-w-max w-full">
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <span className="flex items-center gap-1.5 font-semibold text-white truncate text-[11px]">
                <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{SESSION_TYPE_OPTIONS.find((o) => o.value === session.sessionType)?.label || "IEP Meeting"}</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-300 font-medium truncate text-[11px]">
                {session.attachedName || "Avery Jenkins"}
              </span>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#061524] border border-cyan-500/30 text-[10.5px] font-mono font-bold text-cyan-300">
                <span className={`w-1.5 h-1.5 rounded-full ${audioInputStatus === "listening" ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`} />
                {formatDuration(session.durationSeconds)}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {audioInputStatus === "listening" ? (
                <>
                  <Button
                    onClick={pauseListening}
                    variant="outline"
                    className="h-6.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10.5px] font-bold rounded flex items-center gap-1 cursor-pointer"
                    title="Pause"
                  >
                    <Pause className="w-2.5 h-2.5 fill-amber-300" />
                    Pause
                  </Button>
                  <Button
                    onClick={handleEndSessionAndProcess}
                    disabled={isProcessingEndSession}
                    className="h-6.5 px-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10.5px] rounded flex items-center gap-1 shadow-sm border border-rose-400/80 cursor-pointer"
                  >
                    {isProcessingEndSession ? (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Square className="w-2.5 h-2.5 fill-white" />
                        End
                      </>
                    )}
                  </Button>
                </>
              ) : audioInputStatus === "paused" ? (
                <>
                  <Button
                    onClick={resumeListening}
                    className="h-6.5 px-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10.5px] rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    Resume
                  </Button>
                  <Button
                    onClick={handleEndSessionAndProcess}
                    disabled={isProcessingEndSession}
                    className="h-6.5 px-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10.5px] rounded flex items-center gap-1 shadow-sm border border-rose-400/80 cursor-pointer"
                  >
                    {isProcessingEndSession ? (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Square className="w-2.5 h-2.5 fill-white" />
                        End
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={async () => {
                      await startListening();
                    }}
                    className="h-6.5 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[10.5px] rounded flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    Start
                  </Button>
                </>
              )}
              <button
                type="button"
                onClick={toggleControlBarCollapsed}
                className="h-6.5 px-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10.5px] flex items-center gap-1 transition-colors cursor-pointer"
                title="Expand controls"
              >
                <span>Controls</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          /* EXPANDED STRICT SINGLE-ROW BAR */
          <div className="flex items-center justify-between gap-2 flex-nowrap min-w-max w-full whitespace-nowrap">
            {/* Left: Selectors and Config */}
            <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
              {/* 1. Session Type */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-6.5 px-2 rounded bg-[#0d2138] border border-white/10 hover:border-cyan-500/40 text-[10.5px] text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap">
                    <Users className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="font-semibold truncate max-w-[110px]">
                      {SESSION_TYPE_OPTIONS.find((o) => o.value === session.sessionType)?.label || "IEP Meeting"}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
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

              {/* 2. Attach Record */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-6.5 px-2 rounded bg-[#0d2138] border border-white/10 hover:border-cyan-500/40 text-[10.5px] text-white flex items-center gap-1.5 transition-colors cursor-pointer max-w-[170px]">
                    <div className="w-3.5 h-3.5 rounded-full bg-cyan-600/30 border border-cyan-400/40 text-cyan-300 flex items-center justify-center text-[7.5px] font-bold shrink-0">
                      {session.attachedName
                        ? session.attachedName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                        : "AJ"}
                    </div>
                    <span className="font-medium truncate">
                      {session.attachedName || "Avery Jenkins"}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 bg-[#0a1c30] border-white/15 text-white max-h-72 overflow-y-auto">
                  <DropdownMenuLabel className="text-slate-400 text-xs">CRM Contacts & Leads</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {attachableRecords.length === 0 ? (
                    <DropdownMenuItem disabled className="text-xs text-slate-500">No records found</DropdownMenuItem>
                  ) : (
                    attachableRecords.map((r) => (
                      <DropdownMenuItem
                        key={`${r.type}-${r.id}`}
                        onClick={() => attachRecord({ id: r.id, type: r.type, name: r.name, subtitle: r.subtitle })}
                        className="text-xs cursor-pointer hover:bg-cyan-500/20 hover:text-cyan-300 flex flex-col items-start py-1.5"
                      >
                        <span className="font-semibold">{r.name}</span>
                        <span className="text-[10px] text-slate-400">{r.subtitle}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 3. Mode Pill */}
              <div className="h-6.5 bg-[#0d2138] border border-white/10 rounded p-0.5 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setMode("LIVE")}
                  className={`h-full px-2 rounded text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    session.mode === "LIVE"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Mic className="w-2.5 h-2.5" />
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => setMode("TEST")}
                  className={`h-full px-1.5 rounded text-[9.5px] font-bold transition-all cursor-pointer ${
                    session.mode === "TEST"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => setMode("SIMULATOR")}
                  className={`h-full px-1.5 rounded text-[9.5px] font-bold transition-all cursor-pointer ${
                    session.mode === "SIMULATOR"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sim
                </button>
              </div>

              {/* 4. Speaker */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-6.5 px-2 rounded bg-[#0d2138] border border-white/10 hover:border-cyan-500/40 text-[10.5px] text-white flex items-center gap-1 transition-colors cursor-pointer">
                    <span className="text-slate-400 text-[9.5px]">Spk:</span>
                    <span className="font-semibold text-[10.5px]">{selectedSpeaker}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-36 bg-[#0a1c30] border-white/15 text-white">
                  {(["Parent", "School", "Advocate", "Other"] as SpeakerRole[]).map((r) => (
                    <DropdownMenuItem
                      key={r}
                      onClick={() => setSelectedSpeaker(r)}
                      className="text-xs cursor-pointer hover:bg-cyan-500/20 hover:text-cyan-300"
                    >
                      {r}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 5. Audio Input Device (if multiple) */}
              {audioDevices.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-6.5 px-2 rounded bg-[#0d2138] border border-white/10 hover:border-cyan-500/40 text-[10.5px] text-white flex items-center gap-1 transition-colors cursor-pointer max-w-[120px] truncate"
                      title={audioDevices.find((d) => d.deviceId === selectedAudioDevice)?.label || "Select Microphone"}
                    >
                      <Mic className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                      <span className="truncate text-[9.5px]">
                        {audioDevices.find((d) => d.deviceId === selectedAudioDevice)?.label.replace(/\(.*\)/, "").trim() || "Mic"}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 bg-[#0a1c30] border-white/15 text-white text-xs">
                    {audioDevices.map((d) => (
                      <DropdownMenuItem
                        key={d.deviceId}
                        onClick={() => setSelectedAudioDevice(d.deviceId)}
                        className={`text-xs cursor-pointer ${
                          selectedAudioDevice === d.deviceId ? "bg-cyan-500/20 text-cyan-300 font-bold" : "hover:bg-white/5"
                        }`}
                      >
                        <span className="truncate">{d.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Right: Actions, Duration & Minimize Button */}
            <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
              {/* Duration Timer */}
              <div className="h-6.5 px-2 bg-[#061524] border border-cyan-500/30 rounded flex items-center gap-1.5 text-[10.5px] font-mono font-bold text-cyan-300 shadow-inner">
                <span className={`w-1.5 h-1.5 rounded-full ${audioInputStatus === "listening" ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`} />
                <span>{formatDuration(session.durationSeconds)}</span>
              </div>

              {/* Action Buttons */}
              {audioInputStatus === "listening" ? (
                <>
                  <Button
                    onClick={pauseListening}
                    variant="outline"
                    className="h-6.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10.5px] font-bold rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Pause className="w-2.5 h-2.5 fill-amber-300" />
                    Pause
                  </Button>
                  <Button
                    onClick={handleEndSessionAndProcess}
                    disabled={isProcessingEndSession}
                    className="h-6.5 px-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10.5px] rounded flex items-center gap-1 shadow-sm border border-rose-400/80 cursor-pointer"
                  >
                    {isProcessingEndSession ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Square className="w-2.5 h-2.5 fill-white" />
                        End & Process
                      </>
                    )}
                  </Button>
                </>
              ) : audioInputStatus === "paused" ? (
                <>
                  <Button
                    onClick={resumeListening}
                    className="h-6.5 px-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10.5px] rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    Resume
                  </Button>
                  <Button
                    onClick={handleEndSessionAndProcess}
                    disabled={isProcessingEndSession}
                    className="h-6.5 px-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10.5px] rounded flex items-center gap-1 shadow-sm border border-rose-400/80 cursor-pointer"
                  >
                    {isProcessingEndSession ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Square className="w-2.5 h-2.5 fill-white" />
                        End & Process
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={async () => {
                      await startListening();
                    }}
                    className="h-6.5 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[10.5px] rounded flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    Start Listening
                  </Button>
                  <Button
                    onClick={handleEndSessionAndProcess}
                    disabled={isProcessingEndSession}
                    variant="outline"
                    className="h-6.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10.5px] font-semibold rounded flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isProcessingEndSession ? (
                      <>
                        <span className="w-3 h-3 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Square className="w-2.5 h-2.5 fill-rose-400" />
                        <span>End</span>
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Minimize Collapse Toggle */}
              <button
                type="button"
                onClick={toggleControlBarCollapsed}
                className="h-6.5 w-6.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Minimize session controls"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 1. THEMED LIVE ASSIST GUIDANCE (5 COLORED BLOCKS) ── */}
      <div className="mt-2.5 space-y-2">
        {/* Tier 1: Immediate Primary Guidance (Current Issue & Say This) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* CARD 1: CURRENT ISSUE (RED/CORAL) - 5 Cols */}
          <div className="lg:col-span-5 rounded-xl border border-rose-500/40 bg-gradient-to-b from-[#240c14] to-[#17080e] p-4 shadow-lg flex flex-col justify-between">
            <div>
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
          </div>

          {/* CARD 2: SAY THIS (TEAL/EMERALD) - 7 Cols */}
          <div className="lg:col-span-7 rounded-xl border border-emerald-500/40 bg-gradient-to-b from-[#082220] to-[#051716] p-4 shadow-lg flex flex-col justify-between">
            <div>
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
            </div>

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
        </div>

        {/* Tier 2: Supporting Analytical Blocks (Ask Next, Why It Matters, Related Sources) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* CARD 3: ASK NEXT (BLUE) */}
          <div className="rounded-xl border border-sky-500/40 bg-gradient-to-b from-[#081c30] to-[#051322] p-4 shadow-lg flex flex-col justify-between">
            <div>
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
          </div>

          {/* CARD 4: WHY IT MATTERS (PURPLE) */}
          <div className="rounded-xl border border-purple-500/40 bg-gradient-to-b from-[#180e2e] to-[#0f091f] p-4 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Lightbulb className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Why It Matters</span>
              </div>
              <p className="text-xs text-purple-200/90 leading-relaxed">
                {session.liveAssist?.whyItMatters ||
                  "Parents have the right to request an evaluation at any time. The school must consider the request and cannot deny it without a proper review of all available data."}
              </p>
            </div>
          </div>

          {/* CARD 5: RELATED SOURCES (AMBER/GOLD) */}
          <div className="rounded-xl border border-amber-500/40 bg-gradient-to-b from-[#241a08] to-[#171005] p-4 shadow-lg flex flex-col justify-between">
            <div>
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
      </div>

      {/* ── 2. LIVE TRANSCRIPT & SIMULATOR STREAM (BELOW COLORED BLOCKS) ── */}
      <div className="mt-4 bg-[#08182b] border border-white/10 rounded-xl p-4 flex flex-col shadow-xl">
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-white tracking-wide">Live Transcript</h2>
            {microphoneDiagnostics.listeningStatus === "LISTENING" ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  LISTENING
                </span>
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm border border-rose-400/60 transition-all cursor-pointer active:scale-95"
                  title="Stop recording and end session"
                >
                  <Square className="w-2.5 h-2.5 fill-white" />
                  Stop
                </button>
              </div>
            ) : microphoneDiagnostics.listeningStatus === "CONNECTING TO TRANSCRIPTION" ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  CONNECTING
                </span>
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm border border-rose-400/60 transition-all cursor-pointer active:scale-95"
                  title="Cancel and stop recording"
                >
                  <Square className="w-2.5 h-2.5 fill-white" />
                  Stop
                </button>
              </div>
            ) : audioInputStatus === "paused" ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-amber-400 font-bold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  PAUSED
                </span>
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm border border-rose-400/60 transition-all cursor-pointer active:scale-95"
                  title="Stop recording and end session"
                >
                  <Square className="w-2.5 h-2.5 fill-white" />
                  Stop
                </button>
              </div>
            ) : microphoneDiagnostics.listeningStatus === "MICROPHONE READY" ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                MICROPHONE READY
              </span>
            ) : microphoneDiagnostics.listeningStatus === "TRANSCRIPTION ERROR" ? (
              <span className="flex items-center gap-1.5 text-xs text-rose-400 font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                TRANSCRIPTION ERROR
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                ({session.status.toLowerCase()})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Collapse/Expand Toggle Button (2-Line Mode vs Full Transcript) */}
            <button
              type="button"
              onClick={toggleTranscriptCollapsed}
              title={
                isTranscriptCollapsed
                  ? "Expand to full scrollable transcript"
                  : "Collapse to 2-line preview mode"
              }
              className={`text-xs px-2.5 py-1 rounded border flex items-center gap-1.5 transition-all cursor-pointer font-medium ${
                isTranscriptCollapsed
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {isTranscriptCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>2-Line View ({session.transcript.length})</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Collapse (2 Lines)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (session.transcript.length === 0) {
                  toast.info("Transcript is currently empty");
                  return;
                }
                const fullText = session.transcript
                  .map((t) => {
                    const time = new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    return `[${time}] ${t.speakerRole}: ${t.text}`;
                  })
                  .join("\n\n");
                copyToClipboard(fullText, "full transcript");
                setIsCopiedTranscript(true);
                setTimeout(() => setIsCopiedTranscript(false), 2000);
              }}
              title="Copy full live transcript to clipboard"
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              {isCopiedTranscript ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold text-[11px]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-300" />
                  <span className="text-[11px] font-medium">Copy</span>
                </>
              )}
            </button>
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

        {/* MICROPHONE ACCESS REQUIRED BANNER */}
        {audioInputStatus === "permission_denied" && (
          <div className="mb-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MicOff className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-rose-300">MICROPHONE ACCESS REQUIRED</p>
                <p className="text-[11px] text-slate-400">
                  Microphone permission is required for live listening. Please allow access in browser settings.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={retryMicrophonePermission}
              className="h-8 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded cursor-pointer shrink-0"
            >
              Retry Access
            </Button>
          </div>
        )}

        {/* Transcript Messages Feed */}
        <div
          className={`overflow-y-auto py-2.5 space-y-2.5 transition-all duration-300 pr-1.5 ${
            isTranscriptCollapsed ? "max-h-[175px]" : "max-h-[420px]"
          }`}
        >
          {/* Banner when collapsed and earlier turns are hidden */}
          {isTranscriptCollapsed && session.transcript.length > 2 && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/25 text-[11px] text-cyan-300 animate-in fade-in">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Showing latest 2 turns ({session.transcript.length - 2} earlier {session.transcript.length - 2 === 1 ? "turn" : "turns"} hidden)
              </span>
              <button
                type="button"
                onClick={toggleTranscriptCollapsed}
                className="text-cyan-300 hover:text-white underline font-semibold flex items-center gap-0.5 cursor-pointer text-[10px]"
              >
                Expand full view <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          )}

          {session.transcript.length === 0 && !interimTranscript ? (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <Radio className="w-8 h-8 mx-auto text-slate-600 animate-bounce" />
              <p className="text-sm font-semibold">Transcript is empty</p>
              <p className="text-xs text-slate-600">
                Press Start Listening or use the Simulator controls below to inject speaker turns.
              </p>
            </div>
          ) : (
            (isTranscriptCollapsed ? session.transcript.slice(-2) : session.transcript).map((t) => {
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
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${cfg.text}`}>{cfg.label}</span>
                        {t.source === "microphone" && (
                          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 text-[9px] px-1 py-0 font-mono">
                            MIC
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-mono">{timeString}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(t.text, `quote from ${cfg.label}`)}
                          className="text-slate-500 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                          title="Copy text to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed bg-[#0d2138]/60 p-2.5 rounded-lg border border-white/5">
                      {t.text}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {/* Live Interim Transcript Fragment Display */}
          {interimTranscript && (
            <div className="flex items-start gap-3 animate-pulse">
              <div
                className={`w-8 h-8 rounded-full ${
                  (SPEAKER_CONFIG[selectedSpeaker] || SPEAKER_CONFIG.Other).bg
                } ${
                  (SPEAKER_CONFIG[selectedSpeaker] || SPEAKER_CONFIG.Other).text
                } border ${
                  (SPEAKER_CONFIG[selectedSpeaker] || SPEAKER_CONFIG.Other).border
                } flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}
              >
                {(SPEAKER_CONFIG[selectedSpeaker] || SPEAKER_CONFIG.Other).initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span
                    className={`font-bold ${
                      (SPEAKER_CONFIG[selectedSpeaker] || SPEAKER_CONFIG.Other).text
                    }`}
                  >
                    {(SPEAKER_CONFIG[selectedSpeaker] || SPEAKER_CONFIG.Other).label} (Speaking...)
                  </span>
                </div>
                <p className="text-xs text-slate-400 italic leading-relaxed bg-[#0d2138]/40 p-2.5 rounded-lg border border-white/5 border-dashed">
                  {interimTranscript}
                </p>
              </div>
            </div>
          )}

          <div ref={transcriptBottomRef} />
        </div>

        {/* Live Audio Telemetry Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Active Speaker: <strong className="text-white ml-0.5">{selectedSpeaker}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-mono text-[10px]">
              Engine: {microphoneDiagnostics.transcriptionModel}
            </span>
          </div>

          <span className="text-[10px] text-slate-500 font-mono">
            {session.transcript.length} turns recorded
          </span>
        </div>

        {/* ── EMBEDDED SIMULATOR MANUAL INPUT CONTROLS ── */}
        <div className="mt-2 border-t border-cyan-500/20 bg-[#071524] rounded-lg p-2.5 transition-all">
          <button
            type="button"
            onClick={toggleManualInputCollapsed}
            className="w-full flex items-center justify-between group cursor-pointer focus:outline-none"
            aria-expanded={!isManualInputCollapsed}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90 group-hover:text-cyan-300 flex items-center gap-1.5 transition-colors">
              <Radio className="w-3 h-3 text-cyan-400" />
              Manual Simulator Turn Input
              {isManualInputCollapsed && (
                <span className="text-[9px] text-slate-500 normal-case font-normal ml-1">
                  (collapsed)
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {!isManualInputCollapsed && (
                <span className="text-[9px] text-slate-400">Press Enter to Add</span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400/80 group-hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 px-2 py-0.5 rounded border border-cyan-500/30 transition-colors">
                {isManualInputCollapsed ? (
                  <>
                    <span>Expand</span>
                    <ChevronDown className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <span>Collapse</span>
                    <ChevronUp className="w-3 h-3" />
                  </>
                )}
              </span>
            </div>
          </button>

          {!isManualInputCollapsed && (
            <form onSubmit={handleAddTurn} className="mt-2.5 space-y-2 pt-2 border-t border-white/5">
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
          )}
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR (ASK FIRST MATE) ── */}
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

        {/* Ask First Mate History & In-Session Response Feed */}
        {((session.askHistory && session.askHistory.length > 0) || isAsking || askAnswer) && (
          <div className="bg-[#0b2440] border border-cyan-500/30 rounded-lg p-3 text-xs flex flex-col gap-2.5 animate-in fade-in">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5" /> First Mate Inquiries & Guidance
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {session.askHistory?.length || 0} {session.askHistory?.length === 1 ? "inquiry" : "inquiries"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBottomDiagnostics(true);
                    const el = document.getElementById("ai-diagnostics");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer flex items-center gap-1"
                  title="Scroll to technical AI trace and diagnostics at the bottom of the page"
                >
                  AI Trace & Details ↓
                </button>
                {session.askHistory && session.askHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAskHistory}
                    className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Clear Ask history for this session"
                  >
                    <Trash2 className="w-3 h-3" /> Clear History
                  </button>
                )}
              </div>
            </div>

            {/* In-Flight Inquiry Loader */}
            {isAsking && (
              <div className="p-2.5 rounded-md bg-cyan-950/60 border border-cyan-500/40 text-xs flex items-center gap-2 text-cyan-200 animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                <span className="font-medium">First Mate is analyzing transcript context and formulating guidance...</span>
              </div>
            )}

            {/* Q&A Feed (reverse-chronological with newest on top) */}
            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 divide-y divide-white/5">
              {(session.askHistory && session.askHistory.length > 0
                ? [...session.askHistory].reverse()
                : askAnswer
                ? [
                    {
                      id: "current",
                      question: askQuery || "In-Session Inquiry",
                      answer: askAnswer,
                      timestamp: Date.now(),
                      provenance: lastAskMeta?.provenance || "AI: OPENAI",
                    },
                  ]
                : []
              ).map((entry, idx) => (
                <div key={entry.id || idx} className="pt-2 first:pt-0 space-y-1.5">
                  {/* Question Bubble */}
                  <div className="flex items-start justify-between gap-2 text-[11px]">
                    <div className="flex items-start gap-1.5 text-slate-300 font-semibold">
                      <span className="text-cyan-400 font-mono text-[10px]">Q:</span>
                      <span className="text-white">{entry.question}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Copilot Answer Card */}
                  <div className="bg-[#07192b] border border-cyan-500/20 rounded-md p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> First Mate Copilot:
                        </span>
                        {entry.provenance && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wide border ${
                              entry.provenance === "AI: OPENAI"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : entry.provenance === "AI: FALLBACK"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : entry.provenance === "AI: MOCK"
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            }`}
                          >
                            {entry.provenance}
                          </span>
                        )}
                        {idx === 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/30 text-cyan-200 border border-cyan-400/40">
                            Latest
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          copyToClipboard(entry.answer, "First Mate response");
                          setCopiedAskId(entry.id);
                          setTimeout(() => setCopiedAskId(null), 2000);
                        }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-cyan-300 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/30 px-2 py-0.5 rounded border border-cyan-500/40 transition-all cursor-pointer shadow-sm ml-auto"
                        title="Copy response to clipboard"
                      >
                        {copiedAskId === entry.id ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-emerald-300 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-slate-200 leading-relaxed whitespace-pre-line text-xs">{entry.answer}</p>

                    {entry.suggestedFollowUp && (
                      <div className="mt-1 pt-1.5 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-cyan-300/90">
                        <span className="text-slate-400 text-[10px]">Suggested Follow-Up:</span>
                        <button
                          type="button"
                          onClick={() => handleAskSubmit(undefined, entry.suggestedFollowUp || undefined)}
                          className="hover:underline text-cyan-300 font-medium text-left cursor-pointer"
                          title="Click to ask this follow-up inquiry"
                        >
                          "{entry.suggestedFollowUp}" →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Line Footer matching mockup */}
        <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            {microphoneDiagnostics.listeningStatus === "LISTENING" ? (
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LISTENING
              </span>
            ) : microphoneDiagnostics.listeningStatus === "CONNECTING TO TRANSCRIPTION" ? (
              <span className="flex items-center gap-1.5 font-bold text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                CONNECTING TO TRANSCRIPTION
              </span>
            ) : microphoneDiagnostics.listeningStatus === "MICROPHONE READY" ? (
              <span className="flex items-center gap-1.5 font-bold text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                MICROPHONE READY
              </span>
            ) : microphoneDiagnostics.listeningStatus === "TRANSCRIPTION ERROR" ? (
              <span className="flex items-center gap-1.5 font-bold text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                TRANSCRIPTION ERROR
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                STANDBY
              </span>
            )}
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Speech-to-text powered by OpenAI ({microphoneDiagnostics.transcriptionModel})</span>
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

      {/* ── CURRENT THREAD & CONFLICT MONITORING (BELOW ASK FIRST MATE) ── */}
      {(Boolean(session.threads && session.threads.length > 0) || Boolean(session.conflicts && session.conflicts.some((c) => !c.resolved))) && (
        <div className="mt-4 space-y-2">
          {/* Active Discussion Thread & Unresolved Threads Indicator */}
          {session.threads && session.threads.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-xl bg-[#071728] border border-white/10 text-xs shadow-sm">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Current Thread:
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
                .slice(0, 3)
                .map((t) => (
                  <Badge key={t.id} variant="outline" className="bg-white/5 text-slate-300 border-white/10 text-[10px]">
                    Open: {t.name}
                  </Badge>
                ))}
            </div>
          )}

          {/* Conflict Alert Banner */}
          {session.conflicts &&
            session.conflicts
              .filter((c) => !c.resolved)
              .map((conflict) => (
                <div
                  key={conflict.id}
                  className="rounded-xl border border-amber-500/60 bg-gradient-to-r from-[#2a1708] to-[#170805] p-3.5 shadow-lg flex items-start justify-between gap-3"
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
        </div>
      )}

      {/* ── ADVANCED AI TRACE, PROVENANCE & DIAGNOSTICS INSPECTOR (Bottom of Page) ── */}
      <section id="ai-diagnostics" className="mt-8 pt-6 border-t border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#08182b] border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  AI Trace, Provenance & System Diagnostics
                </h3>
                <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono">
                  {lastAskMeta?.provenance || session.liveAssist?.provenanceMeta?.provenance || "AI: STANDBY"}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                OpenAI realtime transcription telemetry, Live Assist structured output, and rolling context memory inspection.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBottomDiagnostics(!showBottomDiagnostics)}
            className="text-xs font-semibold text-cyan-300 hover:text-white flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer shrink-0 self-start sm:self-center"
          >
            <span>{showBottomDiagnostics ? "Hide Diagnostics" : "Inspect Diagnostics & Provenance"}</span>
            {showBottomDiagnostics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showBottomDiagnostics && (
          <div className="space-y-4 animate-in fade-in">
            {/* Grid of Diagnostics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 1. Live Assist AI Provenance Card */}
              <div className="rounded-xl border border-white/10 bg-[#08182b] p-4 text-xs font-mono space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-200">Live Assist AI Provenance:</span>
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
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLiveAssistTrace(!showLiveAssistTrace)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    {showLiveAssistTrace ? "Hide JSON" : "Raw JSON Output"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-500">Provider:</span>{" "}
                    <span className="text-cyan-300 font-semibold">{session.liveAssist?.provenanceMeta?.provider || "Initial Scenario Template"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Model:</span>{" "}
                    <span className="text-amber-300 font-semibold">{session.liveAssist?.provenanceMeta?.model || "scenario-1"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Latency:</span>{" "}
                    <span className="text-emerald-300 font-semibold">{session.liveAssist?.provenanceMeta?.latencyMs || 0} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Confidence:</span>{" "}
                    <span className="text-slate-200">{session.liveAssist?.confidence || "High"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Procedure:</span> firstMate.fastAssist
                  </div>
                  <div>
                    <span className="text-slate-500">Updated:</span>{" "}
                    {new Date(session.liveAssist?.provenanceMeta?.timestamp || Date.now()).toLocaleTimeString()}
                  </div>
                </div>

                {showLiveAssistTrace && (
                  <div className="pt-2 border-t border-white/10">
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
                )}
              </div>

              {/* 2. Ask First Mate AI Trace Card */}
              <div className="rounded-xl border border-white/10 bg-[#08182b] p-4 text-xs font-mono space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-200">Ask First Mate Provenance:</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
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
                      {lastAskMeta?.provenance || "AI: STANDBY"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAskTrace(!showAskTrace)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    {showAskTrace ? "Hide JSON" : "Raw JSON Output"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-500">Provider:</span>{" "}
                    <span className="text-cyan-300 font-semibold">{lastAskMeta?.provider || "Local Fallback Heuristics"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Model:</span>{" "}
                    <span className="text-amber-300 font-semibold">{lastAskMeta?.model || "offline-heuristics"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Latency:</span>{" "}
                    <span className="text-emerald-300 font-semibold">{lastAskMeta?.latencyMs || 0} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Procedure:</span> firstMate.ask
                  </div>
                  <div>
                    <span className="text-slate-500">Timestamp:</span>{" "}
                    {new Date(lastAskMeta?.timestamp || Date.now()).toLocaleTimeString()}
                  </div>
                  <div>
                    <span className="text-slate-500">Session ID:</span>{" "}
                    <span className="text-slate-300 truncate">{session.sessionId}</span>
                  </div>
                </div>

                {showAskTrace && lastAskMeta?.rawStructuredOutput && (
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-slate-500 text-[10px]">Validated Response Output:</span>
                    <pre className="mt-1 p-2 bg-black/50 rounded text-[10px] text-slate-300 overflow-x-auto max-h-48">
                      {JSON.stringify(lastAskMeta.rawStructuredOutput, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Microphone & Transcription Diagnostics + Live Session Trace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Microphone & Realtime Audio Diagnostics */}
              <div className="rounded-xl border border-white/10 bg-[#08182b] p-4 text-xs font-mono space-y-3 shadow-lg">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  Microphone & Transcription Diagnostics
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Microphone Permission</span>
                    <span
                      className={`font-bold ${
                        microphoneDiagnostics.permission === "GRANTED"
                          ? "text-emerald-400"
                          : microphoneDiagnostics.permission === "DENIED"
                          ? "text-rose-400"
                          : "text-amber-400"
                      }`}
                    >
                      {microphoneDiagnostics.permission}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Audio Track</span>
                    <span
                      className={`font-bold ${
                        microphoneDiagnostics.audioTrack === "ACTIVE" ? "text-emerald-400" : "text-slate-400"
                      }`}
                    >
                      {microphoneDiagnostics.audioTrack}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Transcription Model</span>
                    <span className="font-bold text-cyan-300 truncate block">
                      {microphoneDiagnostics.transcriptionModel}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Realtime Connection</span>
                    <span
                      className={`font-bold ${
                        microphoneDiagnostics.realtimeConnection === "CONNECTED"
                          ? "text-emerald-400"
                          : microphoneDiagnostics.realtimeConnection === "CONNECTING"
                          ? "text-cyan-400 animate-pulse"
                          : microphoneDiagnostics.realtimeConnection === "ERROR"
                          ? "text-rose-400"
                          : "text-slate-500"
                      }`}
                    >
                      {microphoneDiagnostics.realtimeConnection}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Mic Speaker:</span>
                    <span className="text-slate-200 font-semibold">{selectedSpeaker}</span>
                  </div>
                  {microphoneDiagnostics.lastFinalTranscript && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Final Transcript:</span>
                      <span className="text-cyan-200 font-mono truncate max-w-[280px]">"{microphoneDiagnostics.lastFinalTranscript}"</span>
                    </div>
                  )}
                  {microphoneDiagnostics.lastTranscriptLatencyMs > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Transcript Latency:</span>
                      <span className="text-emerald-300 font-mono">{microphoneDiagnostics.lastTranscriptLatencyMs} ms</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Session & Ask Context Trace */}
              <div className="rounded-xl border border-white/10 bg-[#08182b] p-4 text-xs font-mono space-y-3 shadow-lg">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  Live Session & Context Memory Trace
                </span>
                <div className="space-y-1.5 text-xs bg-black/40 p-3 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ACTIVE SESSION ID:</span>
                    <span className="text-cyan-300 font-bold truncate max-w-[240px]">{session.sessionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">FINALIZED TRANSCRIPT TURNS:</span>
                    <span className="text-emerald-300 font-bold">{session.transcript?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ASK CONTEXT EVENT COUNT:</span>
                    <span className="text-purple-300 font-bold">{lastAskMeta?.askContextEventCount ?? session.transcript?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DUPLICATES SUPPRESSED:</span>
                    <span className="text-amber-300 font-bold">{microphoneDiagnostics.duplicatesSuppressed ?? 0}</span>
                  </div>
                  {lastAskMeta?.lastAskContextEvent && (
                    <div className="pt-1.5 border-t border-white/5">
                      <span className="text-slate-500 block text-[10px]">LAST ASK CONTEXT EVENT:</span>
                      <span className="text-slate-200 text-[11px] break-words">{lastAskMeta.lastAskContextEvent}</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-white/5">
                    <span className="text-slate-500 block text-[10px] mb-1">LAST 5 FINALIZED TURNS:</span>
                    {session.transcript && session.transcript.length > 0 ? (
                      session.transcript.slice(-5).map((t, idx) => (
                        <div key={t.id || idx} className="text-[10px] text-slate-400 truncate">
                          [{t.speakerRole}]: "{t.text}"
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-600 italic">(None recorded yet)</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

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

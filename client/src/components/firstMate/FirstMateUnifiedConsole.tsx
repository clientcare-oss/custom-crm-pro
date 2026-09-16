import React, { useState, useRef, useEffect, useCallback } from "react";
import { useFirstMate } from "@/contexts/FirstMateContext";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Copy,
  ExternalLink,
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  MessageSquare,
  HelpCircle,
  Clock,
  Layers,
  Maximize2,
  Volume2,
  Plus,
  Trash2,
  Globe,
  Scale,
  Compass,
  ArrowDown,
  Check,
  BookOpen,
  Settings,
  Mic,
  MicOff,
  User,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FirstMateGuidanceItem,
} from "../../../../shared/firstMate";
import { SUPPORTED_LANGUAGES, isSilenceHallucination } from "../../../../shared/firstMate";
import { RadarReticleIcon, FirstMateReticleLogo } from "@/components/firstMate/RadarReticleIcon";

// Format duration
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

// Speaker styling config
const SPEAKER_CONFIG: Record<
  string,
  { label: string; initial: string; bg: string; text: string; border: string }
> = {
  Parent: { label: "Parent", initial: "P", bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/40" },
  School: { label: "School", initial: "S", bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/40" },
  Advocate: { label: "Advocate (You)", initial: "A", bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40" },
  Student: { label: "Student", initial: "ST", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40" },
  Teacher: { label: "Teacher", initial: "T", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40" },
  Administrator: { label: "Admin", initial: "AD", bg: "bg-blue-600/20", text: "text-blue-300", border: "border-blue-500/40" },
  "Special Education Teacher": { label: "SpEd Teacher", initial: "SE", bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/40" },
  SLP: { label: "SLP", initial: "SL", bg: "bg-teal-500/20", text: "text-teal-400", border: "border-teal-500/40" },
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

export interface FirstMateUnifiedConsoleProps {
  /** Mode adapts layout for full page, popout window, or embedded panel */
  mode?: "full" | "popout" | "panel";
  /** Optional custom title */
  title?: string;
  /** Optional client context name */
  clientContextName?: string;
  /** Optional handler when advocate wants to attach a response/note to external call notes */
  onAddToNotes?: (text: string) => void;
  /** Additional top tab bar or header action node */
  headerActions?: React.ReactNode;
}

export function FirstMateUnifiedConsole({
  mode = "full",
  title = "First Mate AI Copilot",
  clientContextName,
  onAddToNotes,
  headerActions,
}: FirstMateUnifiedConsoleProps) {
  const {
    session,
    guidanceFeed,
    isAnalyzing,
    isRephrasing,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    setSessionType,
    language,
    setLanguage,
    addTranscriptTurn,
    rephraseSayThis,
    askQuestion,
    regenerateGuidance,
    clearAskHistory,
    audioInputStatus,
    interimTranscript,
    selectedSpeaker,
    setSelectedSpeaker,
    audioDevices,
    selectedAudioDevice,
    setSelectedAudioDevice,
    openPopoutWindow,
    startNewSession,
    endSessionAndProcess,
    isProcessingEndSession,
  } = useFirstMate();

  const isPopout = typeof window !== "undefined" && window.location.pathname.includes("/first-mate/popout");
  const isPanel = mode === "panel";

  // Feed State & Scrolling
  const [askInput, setAskInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [inputSpeaker, setInputSpeaker] = useState<SpeakerRole>("Advocate");
  const [inputType, setInputType] = useState<"ask" | "transcript">("ask");
  const [isDictating, setIsDictating] = useState(false);
  const dictationRef = useRef<any>(null);

  const toggleDictation = () => {
    if (isDictating) {
      try {
        dictationRef.current?.stop();
      } catch {}
      setIsDictating(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.info("Browser speech dictation is not supported in this browser. You can type directly.");
      return;
    }

    try {
      const rec = new SpeechRec();
      dictationRef.current = rec;
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = language === "es" ? "es-ES" : "en-US";

      rec.onstart = () => setIsDictating(true);
      rec.onresult = (evt: any) => {
        let text = "";
        for (let i = evt.resultIndex; i < evt.results.length; ++i) {
          text += evt.results[i][0].transcript;
        }
        if (text) {
          setAskInput(text);
        }
      };
      rec.onerror = () => setIsDictating(false);
      rec.onend = () => setIsDictating(false);
      rec.start();
    } catch {
      setIsDictating(false);
    }
  };

  // Auto-scroll toggle (default OFF per requirements)
  const [autoScroll, setAutoScroll] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("fm_autoscroll_enabled");
      return saved === "true"; // default false
    } catch {
      return false;
    }
  });

  const toggleAutoScroll = () => {
    setAutoScroll((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("fm_autoscroll_enabled", String(next));
      } catch {}
      return next;
    });
  };

  // Scroll monitoring & unread pill
  const [unreadCount, setUnreadCount] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const newestItemRef = useRef<HTMLDivElement | null>(null);
  const prevFeedLengthRef = useRef<number>(guidanceFeed.length);
  const isScrolledNearBottomRef = useRef<boolean>(true);

  // Collapsible Sections
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [expandedExplanationMap, setExpandedExplanationMap] = useState<Record<string, boolean>>({});
  const [expandedWordingMap, setExpandedWordingMap] = useState<Record<string, boolean>>({});
  const [expandedSourcesMap, setExpandedSourcesMap] = useState<Record<string, boolean>>({});

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNear = distanceToBottom < 80;
    isScrolledNearBottomRef.current = isNear;
    if (isNear && unreadCount > 0) {
      setUnreadCount(0);
    }
  }, [unreadCount]);

  // Handle incoming new guidance
  useEffect(() => {
    if (guidanceFeed.length > prevFeedLengthRef.current) {
      const added = guidanceFeed.length - prevFeedLengthRef.current;
      prevFeedLengthRef.current = guidanceFeed.length;

      if (autoScroll && isScrolledNearBottomRef.current) {
        requestAnimationFrame(() => {
          if (newestItemRef.current) {
            newestItemRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
          }
        });
      } else {
        setUnreadCount((c) => c + added);
      }
    } else {
      prevFeedLengthRef.current = guidanceFeed.length;
    }
  }, [guidanceFeed.length, autoScroll]);

  const handleJumpToNewest = () => {
    if (newestItemRef.current) {
      newestItemRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    setUnreadCount(0);
  };

  // Handle Submitting Input (Ask AI or Log Turn)
  const handleSubmitInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim() || isAsking) return;
    const text = askInput.trim();
    setAskInput("");

    if (inputType === "ask") {
      setIsAsking(true);
      try {
        await askQuestion(text);
        setTimeout(() => {
          if (newestItemRef.current) {
            newestItemRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
          }
        }, 150);
      } catch (err: any) {
        toast.error(err?.message || "Failed to query First Mate");
      } finally {
        setIsAsking(false);
      }
    } else {
      if (isSilenceHallucination(text, language)) {
        toast.error("Silence artifact filtered");
        return;
      }
      addTranscriptTurn(inputSpeaker, text, "manual");
      toast.success(`Logged turn for ${inputSpeaker}`);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle inline response actions
  const toggleExplanation = (id: string) => {
    setExpandedExplanationMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleWording = (id: string) => {
    setExpandedWordingMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSources = (id: string) => {
    setExpandedSourcesMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="flex flex-col h-full w-full bg-[#051120] text-slate-100 rounded-2xl border border-cyan-500/20 shadow-2xl overflow-hidden relative font-sans">
      
      {/* ── 1. COMPACT UNIFIED HEADER BAR ── */}
      <div className="px-4 py-3 bg-[#07192e] border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Reticle & Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <FirstMateReticleLogo className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            {session.status === "ACTIVE" && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">{title}</h1>
              {clientContextName && (
                <Badge className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px]">
                  {clientContextName}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-cyan-400/80 font-medium">Realtime Advocacy Intelligence Engine</p>
          </div>
        </div>

        {/* Middle: Live Audio Status Badge & Timer */}
        <div className="flex items-center gap-2">
          {session.status === "ACTIVE" ? (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LISTENING</span>
              <span className="font-mono text-[11px] text-emerald-200/90 border-l border-emerald-500/30 pl-2">
                {formatDuration(session.durationSeconds)}
              </span>
            </div>
          ) : session.status === "PAUSED" ? (
            <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 rounded-full text-xs font-bold text-amber-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>PAUSED</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-600/40 px-2.5 py-1 rounded-full text-xs font-medium text-slate-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>READY</span>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-medium bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded-full animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="hidden sm:inline">Synthesizing...</span>
            </div>
          )}
        </div>

        {/* Right: Controls & Options */}
        <div className="flex items-center gap-2">
          {/* Primary Audio Controls */}
          {session.status === "ACTIVE" ? (
            <>
              <button
                type="button"
                onClick={pauseListening}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Pause listening"
              >
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
              <button
                type="button"
                onClick={() => endSessionAndProcess()}
                disabled={isProcessingEndSession}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Stop session & generate final review"
              >
                <Square className="w-3.5 h-3.5 fill-rose-300" /> Stop
              </button>
            </>
          ) : session.status === "PAUSED" ? (
            <>
              <button
                type="button"
                onClick={resumeListening}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Resume
              </button>
              <button
                type="button"
                onClick={() => endSessionAndProcess()}
                disabled={isProcessingEndSession}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-rose-300" /> Stop
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startListening}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Mic className="w-3.5 h-3.5" /> Start Listening
            </button>
          )}

          {/* Try Again / Regenerate Button */}
          <button
            type="button"
            onClick={() => regenerateGuidance()}
            disabled={isAnalyzing}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            title="Try again — re-analyze latest turn with fresh AI response"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin text-indigo-400" : ""}`} />
            <span className="hidden sm:inline">Try Again</span>
          </button>

          {/* New Session Button */}
          <button
            type="button"
            onClick={() => startNewSession()}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            title="Start fresh session"
          >
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New</span>
          </button>

          {/* Popout Window Launcher (Only shown if not inside popout window) */}
          {!isPopout && (
            <button
              type="button"
              onClick={openPopoutWindow}
              className="px-2.5 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              title="Open floating copilot window"
            >
              <Maximize2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Popout</span>
            </button>
          )}

          {/* Settings & Secondary Controls Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-600/40 transition-all cursor-pointer"
                title="Settings & Audio Devices"
              >
                <Settings className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-[#091f38] border-cyan-500/30 text-slate-100 p-2 shadow-2xl space-y-1">
              <DropdownMenuLabel className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Session Controls
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-cyan-500/20" />
              
              {/* Session Type Picker */}
              <div className="px-2 py-1 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold block">Session Mode:</span>
                <select
                  value={session.sessionType}
                  onChange={(e) => setSessionType(e.target.value as FirstMateSessionType)}
                  className="w-full bg-[#061526] border border-cyan-500/30 text-xs text-white rounded p-1.5 focus:outline-none focus:border-cyan-400"
                >
                  {SESSION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Selector */}
              <div className="px-2 py-1 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold block">Speech Language:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#061526] border border-cyan-500/30 text-xs text-white rounded p-1.5 focus:outline-none focus:border-cyan-400"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Device Selector */}
              {audioDevices.length > 0 && (
                <div className="px-2 py-1 space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Microphone Device:</span>
                  <select
                    value={selectedAudioDevice || ""}
                    onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    className="w-full bg-[#061526] border border-cyan-500/30 text-xs text-white rounded p-1.5 focus:outline-none focus:border-cyan-400 truncate"
                  >
                    {audioDevices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Microphone ${dev.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <DropdownMenuSeparator className="bg-cyan-500/20" />

              {/* Auto-scroll setting toggle */}
              <button
                type="button"
                onClick={toggleAutoScroll}
                className="w-full text-left px-2 py-1.5 text-xs text-slate-200 hover:bg-cyan-900/40 rounded flex items-center justify-between cursor-pointer"
              >
                <span>Auto-scroll on new message</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${autoScroll ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                  {autoScroll ? "ON" : "OFF"}
                </span>
              </button>
            </DropdownMenuContent>
          </DropdownMenu>

          {headerActions}
        </div>
      </div>

      {/* ── 2. COMPACT COLLAPSIBLE LIVE TRANSCRIPT DRAWER ── */}
      <div className="bg-[#06182c] border-b border-cyan-500/15 shrink-0">
        <button
          type="button"
          onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs text-cyan-300 font-semibold hover:bg-cyan-950/30 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Transcript & Speech Stream ({session.transcript.length} turns)</span>
            {interimTranscript && (
              <span className="text-[10px] text-emerald-400 font-mono animate-pulse">
                • Hearing speech...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>{isTranscriptExpanded ? "Hide Transcript" : "Show Transcript"}</span>
            {isTranscriptExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isTranscriptExpanded && (
          <div className="p-3 bg-[#04111f] border-t border-cyan-500/15 max-h-48 overflow-y-auto space-y-2 text-xs font-mono">
            {interimTranscript && (
              <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 italic animate-pulse">
                <span className="font-bold text-emerald-400 not-italic mr-1.5">[{selectedSpeaker}]:</span>
                "{interimTranscript}"
              </div>
            )}
            {session.transcript.length === 0 && !interimTranscript ? (
              <p className="text-slate-500 text-center py-2 italic font-sans text-xs">
                No transcript turns logged yet. Speech will stream live here.
              </p>
            ) : (
              session.transcript.map((turn, idx) => {
                const cfg = SPEAKER_CONFIG[turn.speakerRole] || SPEAKER_CONFIG["Other"];
                return (
                  <div key={turn.id || idx} className="p-2 rounded bg-black/40 border border-white/5 flex items-start gap-2 text-slate-200">
                    <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${cfg.bg} ${cfg.text} shrink-0`}>
                      {cfg.initial}
                    </span>
                    <div className="flex-1">
                      <span className="font-bold text-slate-300 mr-1 font-sans text-[11px]">{turn.speakerRole}:</span>
                      <span>{turn.text}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── 3. SPACIOUS UNIFIED GPT CONVERSATION AREA ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 relative scroll-smooth"
      >
        {guidanceFeed.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">First Mate Copilot Active</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                First Mate is listening alongside you. As conversation happens, substantive guidance, legal citations, and recommended phrasing will appear here naturally.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left w-full text-xs mt-2">
              <div className="p-2.5 rounded-xl bg-[#091f38] border border-cyan-500/20 text-cyan-200">
                <strong className="text-cyan-400 block mb-0.5 font-bold">IEP Evaluation Refusal:</strong>
                <span>Legal standards & data requests under IDEA § 300.301</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#091f38] border border-cyan-500/20 text-cyan-200">
                <strong className="text-cyan-400 block mb-0.5 font-bold">Placement Reductions:</strong>
                <span>Prior Written Notice (PWN) requirement enforcement</span>
              </div>
            </div>
          </div>
        ) : (
          guidanceFeed.map((item, idx) => {
            const isLatest = idx === guidanceFeed.length - 1;
            const isExplaining = expandedExplanationMap[item.id] || false;
            const isWordingShow = expandedWordingMap[item.id] || false;
            const isSourcesShow = expandedSourcesMap[item.id] || false;

            return (
              <div
                key={item.id || idx}
                ref={isLatest ? newestItemRef : undefined}
                className="space-y-3 transition-all"
              >
                {/* User Typed Question / Prompt Bubble (if present) */}
                {item.userQuestion && (
                  <div className="flex justify-end mb-2">
                    <div className="max-w-xl bg-purple-950/60 border border-purple-500/40 p-3 rounded-2xl rounded-tr-none text-xs text-purple-100 shadow-md space-y-1">
                      <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                        Advocate Question:
                      </span>
                      <p className="font-medium text-white">{item.userQuestion}</p>
                    </div>
                  </div>
                )}

                {/* AI Response Card */}
                <div className="rounded-2xl border border-cyan-500/25 bg-[#0b213d]/90 p-4 lg:p-5 shadow-xl space-y-3 text-slate-100">
                  {/* Top Bar: Topic & Timestamp */}
                  <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2.5">
                    <div className="flex items-center gap-2">
                      <RadarReticleIcon className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        {item.topicLabel || item.heading || "Advocacy Guidance"}
                      </span>
                      {item.confidence && (
                        <Badge className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] px-1.5 py-0 font-semibold">
                          {item.confidence} Confidence
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button
                        type="button"
                        onClick={() => regenerateGuidance(item.id)}
                        disabled={isAnalyzing}
                        className="text-slate-400 hover:text-indigo-300 p-1 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 text-[11px] font-medium"
                        title="Try again — regenerate this response with fresh AI analysis"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin text-indigo-400" : ""}`} />
                        <span className="hidden sm:inline">Try again</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(item.content, item.id)}
                        className="text-slate-400 hover:text-cyan-300 p-1 transition-colors cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Suggested Response (Verbatim Advocate Wording) */}
                  {(item.suggestedClientWording || item.content?.includes("Suggested")) && (
                    <div className="p-3.5 rounded-xl bg-[#07241f] border border-emerald-500/35 text-xs text-emerald-100 space-y-1.5 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-emerald-400" /> Suggested Response
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(item.suggestedClientWording || item.content, `wording-${item.id}`)}
                          className="text-emerald-400 hover:text-emerald-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <p className="text-xs font-medium text-emerald-50 leading-relaxed italic">
                        "{item.suggestedClientWording?.replace(/^Suggested Client Wording:\s*['"]?|['"]?$/g, "") || item.content}"
                      </p>
                    </div>
                  )}

                  {/* Body Content (Important Legal & Strategic Context) */}
                  <div className="text-xs sm:text-sm leading-relaxed text-slate-100 space-y-2 whitespace-pre-line font-normal">
                    {!item.suggestedClientWording && item.content}
                    {item.suggestedClientWording && item.expandedExplanation && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Important Context:</span>
                        <p>{item.expandedExplanation}</p>
                      </div>
                    )}
                  </div>

                  {/* Optional Inline Action Attachments: Explain More, Suggested Wording, Sources */}
                  <div className="pt-2 border-t border-cyan-500/15 flex flex-wrap items-center gap-2 text-xs">
                    {/* Explain More Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExplanation(item.id)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isExplaining
                          ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40"
                          : "bg-cyan-950/40 text-cyan-300 border-cyan-500/25 hover:bg-cyan-900/50"
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isExplaining ? "Hide details" : "Explain more"}</span>
                    </button>

                    {/* How do I say this? Toggle */}
                    {(item.suggestedClientWording || session.liveAssist?.sayThis) && (
                      <button
                        type="button"
                        onClick={() => toggleWording(item.id)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isWordingShow
                            ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
                            : "bg-emerald-950/40 text-emerald-300 border-emerald-500/25 hover:bg-emerald-900/50"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isWordingShow ? "Hide wording" : "How do I say this?"}</span>
                      </button>
                    )}

                    {/* Show Sources Toggle */}
                    {(item.sources || session.liveAssist?.sources) && (
                      <button
                        type="button"
                        onClick={() => toggleSources(item.id)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSourcesShow
                            ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
                            : "bg-amber-950/40 text-amber-300 border-amber-500/25 hover:bg-amber-900/50"
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isSourcesShow ? "Hide sources" : "Show sources"}</span>
                      </button>
                    )}

                    {onAddToNotes && (
                      <button
                        type="button"
                        onClick={() => onAddToNotes(item.content)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/40 text-[11px] font-semibold ml-auto transition-all cursor-pointer"
                      >
                        + Add to Notes
                      </button>
                    )}
                  </div>

                  {/* Expanded Section 1: Detailed Explanation */}
                  {isExplaining && (
                    <div className="p-3 rounded-xl bg-[#061527] border border-cyan-500/25 text-xs text-cyan-100 leading-relaxed space-y-2 animate-in fade-in duration-200">
                      <strong className="text-cyan-300 font-bold block">Deep Legal & Strategic Context:</strong>
                      <p>
                        {item.expandedExplanation ||
                          session.liveAssist?.whyItMatters ||
                          "This issue relates directly to procedural safeguards under IDEA. The school team must base all placement and evaluation decisions on multidisciplinary data rather than administrative convenience."}
                      </p>
                    </div>
                  )}

                  {/* Expanded Section 2: Suggested Client Wording */}
                  {isWordingShow && (
                    <div className="p-3 rounded-xl bg-[#061c19] border border-emerald-500/30 text-xs text-emerald-100 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <strong className="text-emerald-300 font-bold">Suggested Client Wording:</strong>
                        <button
                          type="button"
                          onClick={() => copyText(item.suggestedClientWording || session.liveAssist?.sayThis || "", `wording_${item.id}`)}
                          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy Phrasing
                        </button>
                      </div>
                      <p className="italic font-medium text-emerald-50 text-sm bg-black/30 p-2.5 rounded-lg border border-emerald-500/20">
                        "{item.suggestedClientWording || session.liveAssist?.sayThis || "What specific evaluation data is the team relying on to determine that testing is not warranted?"}"
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                        <span className="text-emerald-400/80 font-bold mr-1">Rephrase Tone:</span>
                        {(["another_version", "softer", "firmer", "shorter"] as const).map((tone) => (
                          <button
                            key={tone}
                            type="button"
                            disabled={isRephrasing}
                            onClick={() => rephraseSayThis(tone)}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium capitalize"
                          >
                            {tone.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expanded Section 3: Verified Sources */}
                  {isSourcesShow && (
                    <div className="p-3 rounded-xl bg-[#1c1407] border border-amber-500/30 text-xs text-amber-100 space-y-2 animate-in fade-in duration-200">
                      <strong className="text-amber-300 font-bold block">Verified Sources & Authorities:</strong>
                      <div className="space-y-1.5">
                        {(item.sources || session.liveAssist?.sources || [
                          { title: "IDEA § 300.301 – Initial Evaluations", url: "https://sites.ed.gov/idea/regs/b/d/300.301", isVerified: true },
                          { title: "Parental Rights – Evaluation Requests", url: "https://www.parentcenterhub.org/evaluation/", isVerified: true },
                        ]).map((src, sIdx) => (
                          <div key={sIdx} className="flex items-center justify-between bg-black/30 p-2 rounded border border-amber-500/20">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-bold">•</span>
                              {src.url ? (
                                <a href={src.url} target="_blank" rel="noreferrer" className="text-amber-200 hover:underline flex items-center gap-1 font-medium">
                                  {src.title} <ExternalLink className="w-3 h-3 text-amber-400" />
                                </a>
                              ) : (
                                <span>{src.title}</span>
                              )}
                            </div>
                            {src.isVerified && <Badge className="bg-emerald-500/20 text-emerald-300 border-none text-[9px] px-1">Verified</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Floating Unread Guidance Pill (Appears when new guidance arrives outside view) */}
        {unreadCount > 0 && (
          <div className="sticky bottom-3 flex justify-center z-20 pointer-events-none">
            <button
              type="button"
              onClick={handleJumpToNewest}
              className="pointer-events-auto px-4 py-2 rounded-full bg-cyan-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 hover:bg-cyan-400 transition-all cursor-pointer animate-bounce"
            >
              <ArrowDown className="w-4 h-4" />
              <span>↓ New guidance ({unreadCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 4. PERSISTENT BOTTOM MESSAGE FIELD & INPUT BAR ── */}
      <div className="p-3 lg:p-4 bg-[#071a2e] border-t border-cyan-500/20 shrink-0">
        <form onSubmit={handleSubmitInput} className="space-y-2">
          <div className="flex items-center gap-2">
            {/* Mode Picker: Ask AI vs Log Speaker Turn */}
            <div className="flex items-center bg-[#051120] border border-cyan-500/30 rounded-lg p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setInputType("ask")}
                className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  inputType === "ask" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Ask First Mate
              </button>
              <button
                type="button"
                onClick={() => setInputType("transcript")}
                className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  inputType === "transcript" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Log Speaker Turn
              </button>
            </div>

            {/* Speaker Selector (if logging speaker turn) */}
            {inputType === "transcript" && (
              <select
                value={inputSpeaker}
                onChange={(e) => setInputSpeaker(e.target.value as SpeakerRole)}
                className="bg-[#051120] border border-cyan-500/30 text-xs text-white rounded-lg px-2 py-1 focus:outline-none"
              >
                {Object.keys(SPEAKER_CONFIG).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              placeholder={
                inputType === "ask"
                  ? "Ask First Mate about this conversation…"
                  : `Type speech for ${inputSpeaker}…`
              }
              disabled={isAsking}
              className="flex-1 bg-[#051324] border-cyan-500/30 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-cyan-500 focus-visible:border-cyan-400 rounded-xl py-5"
            />
            
            <button
              type="button"
              onClick={toggleDictation}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isDictating
                  ? "bg-rose-600 text-white border-rose-400 animate-pulse"
                  : "bg-[#051324] text-slate-400 border-cyan-500/30 hover:text-cyan-300 hover:border-cyan-500/50"
              }`}
              title={isDictating ? "Stop speech dictation" : "Dictate question using microphone"}
            >
              <Mic className="w-4 h-4" />
            </button>

            <Button
              type="submit"
              disabled={!askInput.trim() || isAsking}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-5 rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isAsking ? (
                <Sparkles className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

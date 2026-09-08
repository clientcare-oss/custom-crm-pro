import React, { useState, useEffect, useRef } from "react";
import { useFirstMate } from "@/contexts/FirstMateContext";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Square,
  Copy,
  CheckCircle2,
  Sparkles,
  Send,
  ExternalLink,
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
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SpeakerRole, SayThisStyle } from "../../../shared/firstMate";
import { RadarReticleIcon, FirstMateReticleLogo } from "@/components/firstMate/RadarReticleIcon";

// Speaker styling config
const SPEAKER_CONFIG: Record<
  string,
  { label: string; initial: string; bg: string; text: string; border: string }
> = {
  Parent: { label: "Parent", initial: "P", bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/40" },
  School: { label: "School", initial: "S", bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/40" },
  Advocate: { label: "Advocate", initial: "A", bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40" },
  Student: { label: "Student", initial: "ST", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40" },
  Teacher: { label: "Teacher", initial: "T", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40" },
  Administrator: { label: "Admin", initial: "AD", bg: "bg-blue-600/20", text: "text-blue-300", border: "border-blue-500/40" },
  "Special Education Teacher": { label: "SpEd Teacher", initial: "SE", bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/40" },
  SLP: { label: "SLP", initial: "SL", bg: "bg-teal-500/20", text: "text-teal-400", border: "border-teal-500/40" },
  Other: { label: "Other", initial: "O", bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/40" },
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FirstMatePopout() {
  const {
    session,
    audioInputStatus,
    pauseListening,
    resumeListening,
    stopListening,
    rephraseSayThis,
    isRephrasing,
    askQuestion,
    clearAskHistory,
    lastAskMeta,
    microphoneDiagnostics,
    startNewSession,
    continuePreviousSession,
    hasPreviousSession,
    endSessionAndProcess,
    isProcessingEndSession,
  } = useFirstMate();

  const canContinuePrevious = hasPreviousSession || session.status === "ENDED";

  // Density mode state: MINI, COMPACT, FULL (persisted in localStorage)
  const [density, setDensity] = useState<"MINI" | "COMPACT" | "FULL">(() => {
    try {
      return (localStorage.getItem("fm_popout_density") as any) || "COMPACT";
    } catch {
      return "COMPACT";
    }
  });

  const handleSetDensity = (newDensity: "MINI" | "COMPACT" | "FULL") => {
    setDensity(newDensity);
    try {
      localStorage.setItem("fm_popout_density", newDensity);
    } catch {}
  };

  // Ask First Mate state
  const [askQuery, setAskQuery] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [copiedAskId, setCopiedAskId] = useState<string | null>(null);
  const [isCopiedAskAnswer, setIsCopiedAskAnswer] = useState(false);
  const [isCopiedSayThis, setIsCopiedSayThis] = useState(false);
  const [isCopiedTranscript, setIsCopiedTranscript] = useState(false);

  // Collapsible sections
  const [isOpenMattersExpanded, setIsOpenMattersExpanded] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript when expanded
  useEffect(() => {
    if (isTranscriptExpanded && density === "FULL") {
      transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [session.transcript.length, isTranscriptExpanded, density]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  const handleAskSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!askQuery.trim()) return;

    setIsAsking(true);
    const answer = await askQuestion(askQuery);
    setAskAnswer(answer);
    setIsAsking(false);
    setAskQuery("");
  };

  const handleOpenFullCRM = () => {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
    } else {
      window.open("/first-mate", "_blank");
    }
  };

  const activeAlert = session.alerts?.find((a) => !a.dismissed);
  const sayThisText = session.liveAssist?.sayThis || "What data is the team relying on to support that determination?";
  const askNextQuestions = session.liveAssist?.askNext || [];
  const currentIssue = session.liveAssist?.currentIssue || "Collaborative Advocacy Review";

  const requestCount = session.requests?.length || 0;
  const refusalCount = session.refusals?.length || 0;
  const commitmentCount = session.commitments?.length || 0;
  const proposalCount = session.proposals?.length || 0;
  const openIssuesCount = session.openIssues?.length || 0;
  const totalOpenMatters = requestCount + refusalCount + commitmentCount + proposalCount + openIssuesCount;

  // Session Ended View
  if (session.status === "ENDED") {
    return (
      <div className="min-h-screen bg-[#06111f] text-slate-100 flex flex-col p-4 select-none">
        <header className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FirstMateReticleLogo className="w-6 h-6" />
            <span className="font-bold text-sm tracking-wider text-cyan-400">FIRST MATE</span>
          </div>
          <Badge variant="outline" className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] font-mono">
            SESSION ENDED
          </Badge>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <FirstMateReticleLogo className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Session Ended</h2>
            <p className="text-xs text-slate-400">
              Duration: {formatDuration(session.durationSeconds)} • {session.transcript.length} transcript turns recorded.
            </p>
          </div>
          <p className="text-xs text-slate-300 bg-white/5 p-3 rounded-lg border border-white/10 max-w-sm">
            Summary & full transcript have been processed and attached to {session.attachedName || "the student"}'s file under Notes (Advocate Only).
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
            <Button
              onClick={() => startNewSession()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Start New Session
            </Button>
            <Button
              variant="outline"
              onClick={() => continuePreviousSession()}
              className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/40 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Continue Session ({session.transcript.length} turns)
            </Button>
            <Button
              onClick={handleOpenFullCRM}
              variant="ghost"
              className="w-full bg-white/5 hover:bg-white/10 text-slate-300 text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Return to Full CRM Review
            </Button>
            <Button
              variant="outline"
              onClick={() => window.close()}
              className="w-full bg-white/5 hover:bg-white/10 text-slate-400 border-white/10 text-xs py-2 rounded-lg"
            >
              Close Window
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06111f] text-slate-100 flex flex-col p-3.5 select-none selection:bg-cyan-500/30 selection:text-white font-sans">
      {/* ── HEADER BAR ── */}
      <header className="pb-3 border-b border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FirstMateReticleLogo className="w-6 h-6 shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wider text-cyan-400 font-mono">FIRST MATE</span>
              {session.status === "ACTIVE" || audioInputStatus === "listening" ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  PAUSED
                </span>
              )}
            </div>
          </div>

          {/* Density Mode Selector */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px] font-mono">
            <button
              onClick={() => handleSetDensity("MINI")}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                density === "MINI" ? "bg-cyan-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
              title="Mini View: Say This & Ask Next only"
            >
              MINI
            </button>
            <button
              onClick={() => handleSetDensity("COMPACT")}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                density === "COMPACT" ? "bg-cyan-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
              title="Compact View: Adds Ask First Mate"
            >
              COMPACT
            </button>
            <button
              onClick={() => handleSetDensity("FULL")}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                density === "FULL" ? "bg-cyan-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
              title="Full View: Includes Open Matters & Live Transcript"
            >
              FULL
            </button>
          </div>
        </div>

        {/* Sub-header: Attached Record, Session Type, Timer & Controls */}
        <div className="flex items-center justify-between text-xs text-slate-300">
          <div className="truncate pr-2">
            <span className="font-semibold text-white truncate block">
              {session.attachedName || "Avery Jenkins"}
            </span>
            <span className="text-[10px] text-slate-400 truncate block">
              {session.sessionType.replace(/_/g, " ")} • {session.attachedSubtitle || "Active Consultation"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              {formatDuration(session.durationSeconds)}
            </span>

            {/* Quick Controls */}
            {session.status === "ACTIVE" || audioInputStatus === "listening" ? (
              <button
                onClick={pauseListening}
                className="p-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors"
                title="Pause listening"
              >
                <Pause className="w-3.5 h-3.5 fill-amber-300" />
              </button>
            ) : (
              <button
                onClick={resumeListening}
                className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
                title="Resume listening"
              >
                <Play className="w-3.5 h-3.5 fill-emerald-300" />
              </button>
            )}

            <button
              onClick={async () => {
                await endSessionAndProcess();
              }}
              disabled={isProcessingEndSession}
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm border border-rose-400/50 transition-all cursor-pointer active:scale-95"
              title="End session and process summary and full transcript into student's notes"
            >
              {isProcessingEndSession ? (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <>
                  <Square className="w-3 h-3 fill-white" />
                  End & Process
                </>
              )}
            </button>

            <button
              onClick={handleOpenFullCRM}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              title="Open full CRM window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Session Actions: New Session or Continue Last */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0 text-slate-400">
            <span className="text-[10px] uppercase font-mono text-cyan-400 tracking-wider">Session:</span>
            <span className="truncate text-slate-300 font-mono text-[10px]">
              {session.sessionId.replace(/^fm-/, "FM-")} • {session.transcript.length} turns
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => startNewSession()}
              className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
              title="Start a brand new clean session"
            >
              <Plus className="w-3 h-3" />
              New Session
            </button>

            <button
              onClick={() => continuePreviousSession()}
              disabled={!canContinuePrevious}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors border ${
                canContinuePrevious
                  ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40 cursor-pointer active:scale-95"
                  : "bg-white/5 text-slate-500 border-white/5 cursor-not-allowed opacity-50"
              }`}
              title={canContinuePrevious ? "Restore and continue previous session" : "No previous session available"}
            >
              <RotateCcw className="w-3 h-3" />
              Continue Last
            </button>
          </div>
        </div>
      </header>

      {/* ── SCROLLABLE BODY CONTENT ── */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-0.5">
        {/* CRITICAL ALERT (Section 7) */}
        {activeAlert && (
          <div className="rounded-lg bg-rose-500/20 border border-rose-500/40 p-2.5 flex items-start gap-2 shadow-sm animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono font-bold text-rose-300 uppercase tracking-wider block">
                {activeAlert.type.replace(/_/g, " ")}
              </span>
              <p className="text-xs font-semibold text-white leading-snug">{activeAlert.message}</p>
            </div>
          </div>
        )}

        {/* CURRENT ISSUE (Section 7) */}
        <div className="rounded-lg bg-[#0a1e33] border border-cyan-500/25 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ISSUE:</span>
            <span className="text-xs font-bold text-cyan-200 truncate">{currentIssue}</span>
          </div>
          <span className="text-[9px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
            ACTIVE
          </span>
        </div>

        {/* ── SECTION 6: PRIMARY ASSIST AREA (SAY THIS) ── */}
        <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-b from-[#082220] to-[#051716] p-3.5 shadow-md">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">SAY THIS</span>
              {isRephrasing && (
                <span className="text-[9px] text-emerald-300 animate-pulse font-mono flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Adapting...
                </span>
              )}
            </div>

            <button
              onClick={() => {
                copyToClipboard(sayThisText, "Say This");
                setIsCopiedSayThis(true);
                setTimeout(() => setIsCopiedSayThis(false), 2000);
              }}
              className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 rounded border border-emerald-500/40 transition-colors"
              title="Copy to clipboard"
            >
              {isCopiedSayThis ? (
                <>
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-2.5 h-2.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Large, high-contrast readable text */}
          <p className="text-sm font-semibold text-emerald-100 leading-relaxed italic select-text">
            "{sayThisText}"
          </p>

          {/* Quick Tone Actions (Section 9) */}
          <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex flex-wrap items-center gap-1 text-[10px]">
            <span className="text-emerald-400/80 font-bold uppercase tracking-wider text-[9px] mr-1">Tone:</span>
            <button
              type="button"
              disabled={isRephrasing}
              onClick={() => rephraseSayThis("shorter")}
              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 disabled:opacity-50"
            >
              Shorter
            </button>
            <button
              type="button"
              disabled={isRephrasing}
              onClick={() => rephraseSayThis("softer")}
              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 disabled:opacity-50"
            >
              Softer
            </button>
            <button
              type="button"
              disabled={isRephrasing}
              onClick={() => rephraseSayThis("firmer")}
              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 disabled:opacity-50"
            >
              Firmer
            </button>
            <button
              type="button"
              disabled={isRephrasing}
              onClick={() => rephraseSayThis("another_version")}
              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 disabled:opacity-50"
            >
              Another Version
            </button>
          </div>
        </div>

        {/* ── ASK NEXT (Section 6) ── */}
        {askNextQuestions.length > 0 && (
          <div className="rounded-xl border border-sky-500/30 bg-gradient-to-b from-[#061e33] to-[#041423] p-3 shadow-md space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">ASK NEXT</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {askNextQuestions.slice(0, 2).map((q, idx) => (
                <li
                  key={idx}
                  onClick={() => copyToClipboard(q, "Follow-up question")}
                  className="p-2 rounded bg-black/30 border border-white/5 hover:border-sky-500/40 transition-colors flex items-start justify-between gap-2 cursor-pointer group"
                  title="Click to copy question"
                >
                  <span className="leading-snug select-text">{q}</span>
                  <Copy className="w-3 h-3 text-slate-500 group-hover:text-sky-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── ASK FIRST MATE (Sections 8 & 19: COMPACT & FULL modes) ── */}
        {(density === "COMPACT" || density === "FULL") && (
          <div className="rounded-xl border border-cyan-500/30 bg-[#07192b] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> ASK FIRST MATE
                {session.askHistory && session.askHistory.length > 0 && (
                  <span className="ml-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {session.askHistory.length}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {lastAskMeta?.provenance && (
                  <Badge variant="outline" className="text-[9px] font-mono text-emerald-300 border-emerald-500/30">
                    {lastAskMeta.provenance}
                  </Badge>
                )}
                {session.askHistory && session.askHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAskHistory}
                    className="text-[9px] text-slate-400 hover:text-rose-300 flex items-center gap-0.5 cursor-pointer transition-colors"
                    title="Clear in-session Q&A history"
                  >
                    <Trash2 className="w-2.5 h-2.5" /> Clear
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleAskSubmit} className="flex gap-1.5">
              <Input
                value={askQuery}
                onChange={(e) => setAskQuery(e.target.value)}
                placeholder="Ask what to ask next, clarify, or confirm..."
                className="h-8 text-xs bg-black/40 border-white/15 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
              />
              <Button
                type="submit"
                disabled={isAsking || !askQuery.trim()}
                className="h-8 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shrink-0"
              >
                {isAsking ? <Sparkles className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </Button>
            </form>

            {/* In-Flight Inquiry Loader */}
            {isAsking && (
              <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3 h-3 animate-spin text-cyan-400 shrink-0" />
                <span>Analyzing transcript & generating guidance...</span>
              </div>
            )}

            {/* Q&A History Feed */}
            {((session.askHistory && session.askHistory.length > 0) || askAnswer) && (
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1 divide-y divide-white/5 pt-1">
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
                  <div key={entry.id || idx} className="pt-2 first:pt-0 space-y-1">
                    <div className="flex items-start justify-between gap-1 text-[10px]">
                      <span className="text-white font-medium truncate">
                        <span className="text-cyan-400 font-mono mr-1">Q:</span>{entry.question}
                      </span>
                      <span className="text-[9px] text-slate-500 shrink-0">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/30 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-cyan-300 text-[9px] uppercase">Copilot Answer:</span>
                          {idx === 0 && (
                            <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-cyan-500/30 text-cyan-200">
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
                          className="flex items-center gap-1 text-[9px] font-semibold text-cyan-300 hover:text-white bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/30 cursor-pointer"
                        >
                          {copiedAskId === entry.id ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-slate-200 leading-relaxed select-text text-[11px] whitespace-pre-line">{entry.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── OPEN MATTERS (Sections 10 & 19: FULL mode) ── */}
        {density === "FULL" && (
          <div className="rounded-xl border border-white/10 bg-[#071829] overflow-hidden">
            <button
              onClick={() => setIsOpenMattersExpanded(!isOpenMattersExpanded)}
              className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>OPEN MATTERS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white/10 rounded text-cyan-300">
                  {totalOpenMatters}
                </span>
              </div>
              {isOpenMattersExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isOpenMattersExpanded && (
              <div className="p-3 border-t border-white/10 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                  <div className="p-1.5 rounded bg-black/30 border border-white/5">
                    <span className="text-slate-500 block text-[9px]">Requests</span>
                    <span className="font-bold text-sky-400">{requestCount}</span>
                  </div>
                  <div className="p-1.5 rounded bg-black/30 border border-white/5">
                    <span className="text-slate-500 block text-[9px]">Refusals</span>
                    <span className="font-bold text-rose-400">{refusalCount}</span>
                  </div>
                  <div className="p-1.5 rounded bg-black/30 border border-white/5">
                    <span className="text-slate-500 block text-[9px]">Proposals</span>
                    <span className="font-bold text-amber-400">{proposalCount}</span>
                  </div>
                  <div className="p-1.5 rounded bg-black/30 border border-white/5">
                    <span className="text-slate-500 block text-[9px]">Commitments</span>
                    <span className="font-bold text-emerald-400">{commitmentCount}</span>
                  </div>
                </div>

                {/* List of active items */}
                <div className="space-y-1 max-h-32 overflow-y-auto pt-1">
                  {[
                    ...(session.requests || []).map((r) => ({ ...r, badgeClass: "bg-sky-500/20 text-sky-300" })),
                    ...(session.refusals || []).map((r) => ({ ...r, badgeClass: "bg-rose-500/20 text-rose-300" })),
                    ...(session.commitments || []).map((c) => ({ ...c, badgeClass: "bg-emerald-500/20 text-emerald-300" })),
                  ].slice(0, 6).map((item, idx) => (
                    <div key={item.id || idx} className="p-1.5 rounded bg-black/40 border border-white/5 flex items-start gap-1.5">
                      <span className={`text-[8px] font-mono font-bold px-1 rounded uppercase shrink-0 ${item.badgeClass}`}>
                        {item.type}
                      </span>
                      <span className="text-[11px] text-slate-300 leading-snug truncate">{item.summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LIVE TRANSCRIPT (Sections 11 & 19: FULL mode) ── */}
        {density === "FULL" && (
          <div className="rounded-xl border border-white/10 bg-[#071829] overflow-hidden">
            <div className="p-2.5 flex items-center justify-between text-xs font-bold text-slate-300 border-b border-white/10">
              <button
                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>LIVE TRANSCRIPT</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white/10 rounded text-cyan-300">
                  {session.transcript.length}
                </span>
                {isTranscriptExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
              </button>

              <button
                onClick={() => {
                  const text = session.transcript
                    .map((t) => `[${new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}] ${t.speakerRole}: ${t.text}`)
                    .join("\n\n");
                  copyToClipboard(text, "full transcript");
                  setIsCopiedTranscript(true);
                  setTimeout(() => setIsCopiedTranscript(false), 2000);
                }}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10"
              >
                {isCopiedTranscript ? (
                  <>
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-2.5 h-2.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {isTranscriptExpanded && (
              <div className="p-2.5 space-y-2 max-h-48 overflow-y-auto text-xs bg-black/30">
                {session.transcript.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic text-center py-4">No speech turns recorded yet.</p>
                ) : (
                  session.transcript.map((t) => {
                    const cfg = SPEAKER_CONFIG[t.speakerRole] || SPEAKER_CONFIG.Other;
                    return (
                      <div key={t.id} className="p-1.5 rounded bg-[#0b1f33] border border-white/5 space-y-0.5 group">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold ${cfg.text}`}>{cfg.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 font-mono">
                              {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <button
                              onClick={() => copyToClipboard(t.text, "quote")}
                              className="text-slate-500 hover:text-cyan-300 opacity-0 group-hover:opacity-100 p-0.5 transition-opacity"
                              title="Copy quote"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-200 text-[11px] leading-snug select-text">{t.text}</p>
                      </div>
                    );
                  })
                )}
                <div ref={transcriptBottomRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER STATUS (Minimal, calm) ── */}
      <footer className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span className="truncate">Session: {session.sessionId.slice(0, 16)}...</span>
        <button
          onClick={handleOpenFullCRM}
          className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
        >
          Full CRM View <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </footer>
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useFirstMate } from "@/contexts/FirstMateContext";
import { trpc } from "@/lib/trpc";
import { RadarReticleIcon } from "@/components/firstMate/RadarReticleIcon";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Pause,
  Square,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
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

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function CopilotUtilityCapsule() {
  // ── First Mate State ──
  const { session, openPopoutWindow, isPopout, stopListening } = useFirstMate();
  const [, setLocation] = useLocation();
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
  const [messages, setMessages] = useState<Message[]>([]);
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
    const newMessages: Message[] = [...messages, { role: "user", content }];
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

  return (
    <>
      {/* ── Vertical Frosted Glass Copilot Capsule (Bottom Right) ── */}
      <aside
        aria-label="Waypoint AI Copilots"
        className="fixed bottom-14 right-3 z-40 flex flex-col items-center select-none"
      >
        <div
          className={cn(
            "group/copilot relative flex flex-col items-center gap-1.5 p-1 rounded-full",
            "bg-slate-950/45 hover:bg-slate-950/75 backdrop-blur-2xl",
            "border border-white/20 hover:border-white/35",
            "shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_1.5px_rgba(255,255,255,0.25)]",
            "opacity-40 hover:opacity-100 transition-all duration-300"
          )}
        >
          {/* Top Specular Sheen across the capsule */}
          <span className="absolute top-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

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
                  "group/firstmate relative flex h-6.5 w-6.5 items-center justify-center rounded-full",
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
                <span className="absolute top-[2px] inset-x-1.5 h-2 rounded-t-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none opacity-85" />

                {/* Crisp luminous Radar Reticle icon */}
                <RadarReticleIcon
                  className={cn(
                    "h-3.5 w-3.5 text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.9)] relative z-10 transition-transform duration-200 group-hover/firstmate:scale-110",
                    isLive && "animate-pulse"
                  )}
                  pulse={stateKey === "LIVE"}
                />

                {/* LIVE wave ripple */}
                {stateKey === "LIVE" && (
                  <span className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-35 pointer-events-none" />
                )}

                {/* Status Dot */}
                {stateKey === "ALERT" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-1 ring-white/60 shadow-[0_0_6px_rgba(244,63,94,0.9)] animate-bounce" />
                )}
                {stateKey === "PAUSED" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-1 ring-white/60 shadow-[0_0_6px_rgba(251,191,36,0.9)] flex items-center justify-center">
                    <Pause className="w-1.5 h-1.5 text-black fill-black" />
                  </span>
                )}
                {stateKey === "LIVE" && !hasActiveAlert && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-1 ring-white/60 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                )}

                {/* Soft internal cyan refraction glint */}
                <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400/10 via-transparent to-white/10 pointer-events-none" />
              </button>

              {/* Ground Caustic Reflection Pool directly below orb */}
              <span className="absolute -bottom-1.5 inset-x-1 h-1.5 bg-cyan-400/25 rounded-full blur-[2px] pointer-events-none opacity-60 group-hover/copilot:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Delicate Horizontal Hairline Glass Divider */}
          <div className="w-3.5 h-px bg-gradient-to-r from-white/10 via-white/30 to-white/10 rounded-full shrink-0 my-0.5" />

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

            {/* Ground Caustic Reflection Pool directly below orb */}
            <span className="absolute -bottom-1.5 inset-x-1 h-1.5 bg-amber-400/25 rounded-full blur-[2px] pointer-events-none opacity-60 group-hover/copilot:opacity-100 transition-opacity" />
          </div>
        </div>
      </aside>

      {/* ── First Mate Session Context Menu (flies out to the left) ── */}
      {firstMateMenuOpen && (
        <div className="fixed bottom-14 right-14 z-50 bg-[#061222]/95 border border-cyan-500/30 rounded-2xl p-3 shadow-2xl shadow-cyan-950/80 text-xs w-68 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
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

      {/* ── Waypoint AI Chat Panel (anchored to the left of the dock) ── */}
      {aiOpen && (
        <div
          className="fixed bottom-14 right-14 z-50 w-[380px] max-w-[calc(100vw-4rem)] bg-[#071322]/95 border border-sky-500/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
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
              className="h-7 w-7 shrink-0 text-white/70 hover:text-white"
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
    </>
  );
}

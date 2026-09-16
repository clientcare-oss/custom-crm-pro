import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Send,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ArrowDown,
  Scale,
  MessageSquare,
} from "lucide-react";
import type { FirstMateGuidanceItem } from "../../../../shared/firstMate";
import { toast } from "sonner";

interface FirstMateGuidanceFeedProps {
  guidanceFeed: FirstMateGuidanceItem[];
  autoScroll: boolean;
  onToggleAction: (guidanceId: string, action: "explainMore" | "wording" | "sources") => void;
  onAskQuestion: (query: string) => Promise<string | void>;
  isAsking?: boolean;
  isAnalyzing?: boolean;
  recentTurns?: Array<{ speakerRole: string; text: string }>;
  isTranscriptCollapsed?: boolean;
  onToggleTranscript?: () => void;
  modeLabel?: string;
  isPopout?: boolean;
}

export function FirstMateGuidanceFeed({
  guidanceFeed,
  autoScroll,
  onToggleAction,
  onAskQuestion,
  isAsking = false,
  isAnalyzing = false,
  recentTurns = [],
  isTranscriptCollapsed = true,
  onToggleTranscript,
  modeLabel = "Live Advocacy Guidance",
  isPopout = false,
}: FirstMateGuidanceFeedProps) {
  const [askQuery, setAskQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const newestItemRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef<number>(guidanceFeed.length);
  const isScrolledNearBottomRef = useRef<boolean>(true);

  // Monitor scroll position
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNear = distanceToBottom < 60;
    isScrolledNearBottomRef.current = isNear;
    if (isNear && unreadCount > 0) {
      setUnreadCount(0);
    }
  }, [unreadCount]);

  // Handle new incoming guidance items
  useEffect(() => {
    if (guidanceFeed.length > prevCountRef.current) {
      const added = guidanceFeed.length - prevCountRef.current;
      prevCountRef.current = guidanceFeed.length;

      if (autoScroll && isScrolledNearBottomRef.current) {
        // If autoscroll is explicitly ON and user is at bottom, scroll down
        requestAnimationFrame(() => {
          if (newestItemRef.current) {
            newestItemRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
          }
        });
      } else {
        // Otherwise protect reading position: DO NOT SCROLL, increment unread counter
        setUnreadCount((c) => c + added);
      }
    } else {
      prevCountRef.current = guidanceFeed.length;
    }
  }, [guidanceFeed.length, autoScroll]);

  // Jump smoothly to the beginning of the newest response
  const handleJumpToNewest = () => {
    if (newestItemRef.current) {
      newestItemRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    setUnreadCount(0);
  };

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuery.trim() || isAsking) return;
    const q = askQuery.trim();
    setAskQuery("");
    try {
      await onAskQuestion(q);
      setTimeout(() => {
        if (newestItemRef.current) {
          newestItemRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      }, 150);
    } catch (err: any) {
      toast.error(err?.message || "Failed to ask First Mate");
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col flex-1 w-full relative">
      {/* ── UNIFIED GUIDANCE FEED CONTAINER ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 rounded-2xl border border-cyan-500/20 bg-[#07162b] p-4 lg:p-6 shadow-2xl relative"
        style={{ minHeight: isPopout ? "400px" : "480px" }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">First Mate Guidance</h2>
            <p className="text-xs text-cyan-400/80 font-medium">Updates as you listen</p>
          </div>
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded-full animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Synthesizing guidance...</span>
            </div>
          )}
        </div>

        {/* Guidance Items List */}
        {guidanceFeed.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-slate-300">Listening alongside you...</p>
            <p className="text-xs text-slate-500 max-w-md">
              Speak or start your meeting. First Mate will automatically detect legal issues, citations, and guidance here.
            </p>
          </div>
        ) : (
          guidanceFeed.map((item, index) => {
            const isLatest = index === guidanceFeed.length - 1;
            return (
              <div
                key={item.id || `g-${index}`}
                ref={isLatest ? newestItemRef : undefined}
                className="rounded-xl border border-cyan-500/25 bg-[#0b213d]/90 p-5 lg:p-6 shadow-lg transition-all space-y-4 text-slate-100"
              >
                {/* 1. Context / Trigger quote exchange */}
                {(item.triggerQuote || item.userQuestion) && (
                  <div className="text-xs text-slate-400 font-mono bg-[#07162b]/80 border border-cyan-500/15 rounded-lg p-2.5 leading-relaxed">
                    {item.userQuestion ? (
                      <p className="text-cyan-300">
                        <strong className="text-cyan-400 uppercase tracking-wider text-[10px] mr-1.5 font-bold font-sans">
                          YOU:
                        </strong>
                        {item.userQuestion}
                      </p>
                    ) : item.triggerQuote ? (
                      <p className="whitespace-pre-line text-slate-300">{item.triggerQuote}</p>
                    ) : null}
                  </div>
                )}

                {/* 2. Topic Category Tag */}
                {item.topicLabel && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                      {item.topicLabel}
                    </span>
                    {item.confidence && (
                      <span className="text-[10px] text-cyan-300/80 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full font-medium">
                        {item.confidence} Confidence
                      </span>
                    )}
                  </div>
                )}

                {/* 3. Big Prominent Heading */}
                {item.heading && (
                  <h3 className="text-xl lg:text-2xl font-bold text-white tracking-tight leading-snug">
                    {item.heading}
                  </h3>
                )}

                {/* 4. Natural GPT-Style Response Body (17-18px desktop font) */}
                <div className="text-[16px] lg:text-[17.5px] text-slate-100 leading-relaxed font-normal whitespace-pre-line space-y-3">
                  {item.content}
                </div>

                {/* 5. Primary Verified Source Citation Link */}
                {item.sources && item.sources.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {item.sources.map((src, sIdx) => (
                      <a
                        key={sIdx}
                        href={src.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{src.title}</span>
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                      </a>
                    ))}
                  </div>
                )}

                {/* 6. Expandable Drawers: How Do I Say This? */}
                {item.isWordingVisible && item.suggestedClientWording && (
                  <div className="mt-3 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-100 text-sm space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        Suggested Client Wording (Secondary)
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(item.suggestedClientWording || "", `wording-${item.id}`)}
                        className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1 bg-emerald-900/50 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        {copiedId === `wording-${item.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="italic font-medium leading-relaxed">
                      "{item.suggestedClientWording.replace(/^Suggested Client Wording:\s*/i, "")}"
                    </p>
                  </div>
                )}

                {/* 7. Expandable Drawers: Explain More */}
                {item.isExplainingMore && item.expandedExplanation && (
                  <div className="mt-3 p-3.5 rounded-lg bg-blue-950/40 border border-blue-500/40 text-blue-100 text-xs leading-relaxed space-y-1.5 animate-in fade-in duration-150">
                    <span className="font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1 text-[11px]">
                      <Scale className="w-3.5 h-3.5 text-blue-400" />
                      Statutory Analysis & Strategic Context
                    </span>
                    <p className="whitespace-pre-line text-blue-200">{item.expandedExplanation}</p>
                  </div>
                )}

                {/* 8. Expandable Drawers: Show Sources */}
                {item.areSourcesVisible && item.sources && item.sources.length > 0 && (
                  <div className="mt-3 p-3.5 rounded-lg bg-slate-900/80 border border-slate-700 text-xs space-y-2 animate-in fade-in duration-150">
                    <span className="font-bold uppercase tracking-wider text-slate-300 text-[11px] block">
                      All Applicable Sources & Citations
                    </span>
                    <ul className="space-y-1.5">
                      {item.sources.map((s, idx) => (
                        <li key={idx} className="flex items-center justify-between text-slate-300">
                          <span className="font-medium">• {s.title}</span>
                          {s.url && (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 text-[11px]"
                            >
                              Open statute <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 9. Action Buttons Row */}
                <div className="pt-2 border-t border-cyan-500/15 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onToggleAction(item.id, "explainMore")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      item.isExplainingMore
                        ? "bg-blue-600/30 text-blue-200 border-blue-400/60"
                        : "bg-transparent text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-400/60"
                    }`}
                  >
                    Explain more
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleAction(item.id, "wording")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      item.isWordingVisible
                        ? "bg-emerald-600/30 text-emerald-200 border-emerald-400/60"
                        : "bg-transparent text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-400/60"
                    }`}
                  >
                    How do I say this?
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleAction(item.id, "sources")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      item.areSourcesVisible
                        ? "bg-slate-700/50 text-slate-200 border-slate-400"
                        : "bg-transparent text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-400/60"
                    }`}
                  >
                    Show sources
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── FLOATING JUMP BUTTON (Reading Position Protection) ── */}
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={handleJumpToNewest}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-full shadow-xl shadow-cyan-500/30 border border-cyan-300/80 flex items-center gap-2 cursor-pointer transition-all animate-bounce"
        >
          <ArrowDown className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
          <span>↓ New guidance ({unreadCount})</span>
        </button>
      )}

      {/* ── CONTEXTUAL FOLLOW-UP INPUT BAR ── */}
      <div className="mt-3 bg-[#08182b] border border-cyan-500/25 rounded-xl p-3 shadow-xl space-y-2">
        <form onSubmit={handleAskSubmit} className="relative flex items-center w-full">
          <input
            type="text"
            value={askQuery}
            onChange={(e) => setAskQuery(e.target.value)}
            placeholder="Ask First Mate about this conversation..."
            disabled={isAsking}
            className="w-full h-11 pl-4 pr-12 bg-[#0b213d] border border-cyan-500/25 rounded-full text-sm text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-400/50 shadow-inner"
          />
          <button
            type="submit"
            disabled={isAsking || !askQuery.trim()}
            className="absolute right-1.5 w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 flex items-center justify-center cursor-pointer transition-all shadow-md active:scale-95"
            title="Ask First Mate about this conversation"
          >
            <Send className="w-4 h-4 fill-slate-950" />
          </button>
        </form>

        {/* Status bar below input */}
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Listening continues while you type</span>
          </div>

          {onToggleTranscript && (
            <button
              type="button"
              onClick={onToggleTranscript}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              {isTranscriptCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              <span>Live transcript ({isTranscriptCollapsed ? "collapsed" : "expanded"})</span>
            </button>
          )}

          <div className="text-[10px] text-slate-500 font-mono">{modeLabel}</div>
        </div>
      </div>
    </div>
  );
}

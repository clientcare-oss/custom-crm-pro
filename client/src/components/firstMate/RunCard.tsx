import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Copy,
  MessageSquare,
  Play,
  Radio,
  Sparkles,
  Star,
  Trash2,
  Users,
} from "lucide-react";

export interface RunCardProps {
  run: any;
  onOpenRun: (run: any, initialTab?: "guidance" | "feedback") => void;
  onLoadSession: (session: any) => void;
  onCopySummary: (run: any, e: React.MouseEvent) => void;
  onDeleteRun: (sessionId: string, e: React.MouseEvent) => void;
}

export function RunCard({
  run,
  onOpenRun,
  onLoadSession,
  onCopySummary,
  onDeleteRun,
}: RunCardProps) {
  const isLive = run.mode === "LIVE";
  const dateStr = new Date(run.createdAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = new Date(run.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const minutes = Math.floor((run.durationSeconds || 0) / 60);
  const seconds = (run.durationSeconds || 0) % 60;
  const durationFormatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

  const sayThisText = run.sayThis || run.liveAssist?.sayThis || "";
  const keyIssueText = run.keyIssue || run.liveAssist?.currentIssue || "Advocacy Guidance";

  return (
    <div
      onClick={() => onOpenRun(run, "guidance")}
      className="group bg-[#08182b] hover:bg-[#0b213a] border border-white/10 hover:border-cyan-500/40 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer space-y-3"
    >
      {/* Header row: Metadata badges */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode badge */}
          <Badge
            className={
              isLive
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold"
            }
          >
            {isLive ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE AUDIO
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Radio className="w-2.5 h-2.5" />
                SIMULATOR TEST
              </span>
            )}
          </Badge>

          {/* Session Type */}
          <span className="text-xs font-bold text-white">
            {run.sessionType?.replace(/_/g, " ") || "IEP Meeting"}
          </span>

          <span className="text-slate-600">•</span>

          {/* Student Record */}
          <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {run.studentName || "Student"}
          </span>
        </div>

        {/* Right: Date, duration & turn count */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            {dateStr} at {timeStr}
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            {durationFormatted}
          </span>
          <span className="text-slate-600">|</span>
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300">
            {run.turnCount || run.transcript?.length || 0} turns
          </span>
        </div>
      </div>

      {/* Key Issue & Prompt Quote */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">Key Issue:</span>
          <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
            {keyIssueText}
          </span>
        </div>

        {sayThisText && (
          <div className="bg-[#06111f] border border-white/5 rounded-lg p-2.5 text-xs text-slate-200 flex items-start gap-2.5">
            <div className="p-1 rounded bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5">
              <MessageSquare className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-400 block mb-0.5">
                AI Spoken Guidance (Say This):
              </span>
              <p className="italic text-slate-300 line-clamp-2 leading-relaxed">
                "{sayThisText}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer row: Evaluation / Feedback status + Action buttons */}
      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Advocate Evaluation Status */}
        <div className="flex items-center gap-2">
          {run.advocateRating ? (
            <div className="flex items-center gap-1 text-yellow-400 font-bold text-xs bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${
                      s <= run.advocateRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-600"
                    }`}
                  />
                ))}
              </div>
              <span className="ml-1 text-yellow-300 font-mono text-[11px]">
                {run.advocateRating}/5
              </span>
              {run.advocateFeedback && (
                <span className="text-[10.5px] text-slate-400 ml-1.5 font-normal truncate max-w-[200px] sm:max-w-xs">
                  — "{run.advocateFeedback}"
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Click to rate & improve AI prompt
            </span>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onOpenRun(run, "feedback")}
            className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
            title="Rate this AI response and add tuning critique"
          >
            <Star className="w-3 h-3" />
            <span>{run.advocateRating ? "Edit Feedback" : "Rate & Critique"}</span>
          </button>

          <button
            type="button"
            onClick={() => onLoadSession(run)}
            className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
            title="Load this session into active Copilot"
          >
            <Play className="w-3 h-3 fill-cyan-300" />
            <span>Load in Copilot</span>
          </button>

          <button
            type="button"
            onClick={(e) => onCopySummary(run, e)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
            title="Copy Markdown report"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => onDeleteRun(run.sessionId, e)}
            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-white/5 transition-colors cursor-pointer"
            title="Delete run"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Search,
  BookOpen,
  Layers,
  Radio,
  Bookmark,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RunCard } from "./RunCard";
import { RunDetailModal } from "./RunDetailModal";
import type { RunHistoryTabProps } from "./firstMateRunTypes";

export function RunHistoryTab({ activeSession, onLoadSession, onSnapshotCurrent }: RunHistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<"ALL" | "LIVE" | "SIMULATOR" | "RATED" | "NEEDS_FEEDBACK">("ALL");
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<
    "guidance" | "transcript" | "detections" | "qa" | "summary" | "feedback"
  >("guidance");
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  // Queries & Mutations
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.firstMate.listRecordedSessions.useQuery(
    {
      mode: modeFilter === "LIVE" || modeFilter === "SIMULATOR" ? modeFilter : undefined,
      search: searchQuery.trim() || undefined,
      limit: 100,
    },
    { refetchOnWindowFocus: true }
  );

  const deleteRunMutation = trpc.firstMate.deleteRecordedSession.useMutation();

  const sessions = data?.sessions || [];

  // Filtered list
  const filteredSessions = useMemo(() => {
    return sessions.filter((s: any) => {
      if (modeFilter === "RATED") return !!s.advocateRating;
      if (modeFilter === "NEEDS_FEEDBACK") return !s.advocateRating;
      return true;
    });
  }, [sessions, modeFilter]);

  // Telemetry Aggregates
  const stats = useMemo(() => {
    const total = sessions.length;
    const liveCount = sessions.filter((s: any) => s.mode === "LIVE").length;
    const simCount = sessions.filter((s: any) => s.mode === "SIMULATOR").length;
    const ratedCount = sessions.filter((s: any) => !!s.advocateRating).length;
    const sumRatings = sessions.reduce((acc: number, s: any) => acc + (s.advocateRating || 0), 0);
    const avgRating = ratedCount > 0 ? (sumRatings / ratedCount).toFixed(1) : "—";
    const totalTurns = sessions.reduce(
      (acc: number, s: any) => acc + (s.turnCount || s.transcript?.length || 0),
      0
    );
    const avgLatency = sessions.length > 0
      ? Math.round(sessions.reduce((acc: number, s: any) => acc + (s.aiLatencyMs || 350), 0) / sessions.length)
      : 340;

    return { total, liveCount, simCount, ratedCount, avgRating, totalTurns, avgLatency };
  }, [sessions]);

  const handleOpenRun = (run: any, tab: "guidance" | "feedback" = "guidance") => {
    setSelectedRun(run);
    setModalInitialTab(tab);
  };

  const handleCopyRunSummary = (run: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const md = `### First Mate Run: ${run.title || "Session"}\n- **Date**: ${new Date(run.createdAt).toLocaleString()}\n- **Mode**: ${run.mode}\n- **Student**: ${run.studentName || "Student"}\n- **Key Issue**: ${run.keyIssue || "N/A"}\n- **Say This**: "${run.sayThis || "N/A"}"\n- **Summary**: ${run.summary || "N/A"}`;
    navigator.clipboard.writeText(md);
    toast.success("Copied session summary Markdown to clipboard");
  };

  const handleDeleteRun = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this recorded run?")) return;
    try {
      await deleteRunMutation.mutateAsync({ sessionId });
      toast.success("Run removed from history");
      if (selectedRun?.sessionId === sessionId) setSelectedRun(null);
      refetch();
    } catch (err: any) {
      toast.error(`Failed to delete run: ${err.message || "Unknown error"}`);
    }
  };

  const handleSnapshot = async () => {
    setIsSnapshotting(true);
    try {
      await onSnapshotCurrent();
      toast.success("Current active session recorded to history!");
      await refetch();
    } catch (err: any) {
      toast.error(`Snapshot failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSnapshotting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── TOP TELEMETRY BANNER ── */}
      <div className="bg-[#08182b] border border-white/10 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Advocacy Run History & AI Learning Repository</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Every live advocacy meeting and simulator test is recorded here with speech turns, AI prompts, and legal citations for model tuning and evaluation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSnapshot}
              disabled={isSnapshotting || activeSession.transcript.length === 0}
              className="h-8 px-3 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Snapshot active session turns into history now"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isSnapshotting ? "Saving..." : "Snapshot Active Run"}</span>
            </Button>

            <button
              type="button"
              onClick={() => refetch()}
              className="h-8 w-8 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Refresh runs list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Aggregate metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-white/5 text-xs">
          <div className="bg-[#06111f] p-2.5 rounded-lg border border-white/5 space-y-0.5">
            <span className="text-slate-400 text-[10.5px]">Total Runs</span>
            <p className="text-base font-bold text-white">{stats.total}</p>
          </div>

          <div className="bg-[#06111f] p-2.5 rounded-lg border border-white/5 space-y-0.5">
            <span className="text-emerald-400 text-[10.5px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live Audio
            </span>
            <p className="text-base font-bold text-emerald-300">{stats.liveCount}</p>
          </div>

          <div className="bg-[#06111f] p-2.5 rounded-lg border border-white/5 space-y-0.5">
            <span className="text-amber-400 text-[10.5px] flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" /> Simulator Tests
            </span>
            <p className="text-base font-bold text-amber-300">{stats.simCount}</p>
          </div>

          <div className="bg-[#06111f] p-2.5 rounded-lg border border-white/5 space-y-0.5">
            <span className="text-purple-400 text-[10.5px]">Speech Turns</span>
            <p className="text-base font-bold text-purple-300">{stats.totalTurns}</p>
          </div>

          <div className="bg-[#06111f] p-2.5 rounded-lg border border-white/5 space-y-0.5">
            <span className="text-yellow-400 text-[10.5px]">Advocate Score</span>
            <p className="text-base font-bold text-yellow-300">
              {stats.avgRating} <span className="text-[10px] font-normal text-slate-400">/ 5★</span>
            </p>
          </div>

          <div className="bg-[#06111f] p-2.5 rounded-lg border border-white/5 space-y-0.5">
            <span className="text-cyan-400 text-[10.5px]">Avg AI Response</span>
            <p className="text-base font-bold text-cyan-300">{stats.avgLatency}ms</p>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER TOOLBAR ── */}
      <div className="bg-[#08182b] border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcripts, Say This guidance, student name..."
            className="pl-8 h-8 bg-[#06111f] border-white/10 text-xs text-white placeholder:text-slate-500 rounded"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "ALL", label: `All (${sessions.length})` },
            { id: "LIVE", label: `Live Audio (${stats.liveCount})` },
            { id: "SIMULATOR", label: `Simulator (${stats.simCount})` },
            { id: "RATED", label: `Evaluated (${stats.ratedCount})` },
            { id: "NEEDS_FEEDBACK", label: `Needs Review (${stats.total - stats.ratedCount})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setModeFilter(f.id as any)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                modeFilter === f.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── RUNS LIST ── */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 space-y-2">
          <div className="w-7 h-7 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold">Loading recorded runs repository...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-16 text-slate-400 space-y-3 bg-[#08182b] border border-white/10 rounded-xl p-8">
          <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">No Recorded Runs Match Filter</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Runs are automatically saved whenever you use First Mate (both in Live audio and Simulator tests) or when you click "Snapshot Active Run".
          </p>
          <Button
            onClick={handleSnapshot}
            disabled={activeSession.transcript.length === 0}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
          >
            <Bookmark className="w-3.5 h-3.5 mr-1" /> Snapshot Active Session Now
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((run: any) => (
            <RunCard
              key={run.sessionId}
              run={run}
              onOpenRun={handleOpenRun}
              onLoadSession={onLoadSession}
              onCopySummary={handleCopyRunSummary}
              onDeleteRun={handleDeleteRun}
            />
          ))}
        </div>
      )}

      {/* ── DETAILED RUN INSPECTION & AI EVALUATION MODAL ── */}
      <RunDetailModal
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
        onLoadSession={onLoadSession}
        onCopySummary={handleCopyRunSummary}
        onFeedbackSaved={() => {
          utils.firstMate.listRecordedSessions.invalidate();
          refetch();
        }}
        initialTab={modalInitialTab}
      />
    </div>
  );
}

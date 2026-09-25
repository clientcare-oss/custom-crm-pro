import React, { useState } from "react";
import { FileText, Play, Pause, FileCheck, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PortmasterFinding } from "./types";
import { toast } from "sonner";

interface ComparatorFindingCardProps {
  finding: PortmasterFinding;
}

export function ComparatorFindingCard({ finding }: ComparatorFindingCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const isMeetingConflict = finding.sourceTags.includes("meeting_conflict");
  const changeLabel = finding.updatedIep.changeLabel || "MODIFIED";

  const handlePlayClip = () => {
    setIsPlayingAudio(!isPlayingAudio);
    if (!isPlayingAudio) {
      toast.info(`Playing meeting audio clip from ${finding.meetingRecord?.evidence?.timestamp || "01:14:22"}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Comparator Circuit Visual Board (Before -> Circuit -> After) */}
      <div className="rounded-xl bg-[#041224] border border-[#113C6E] p-3 sm:p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-[#0F355E] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300 font-bold">
              IEP Comparator Circuit
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-[#F5B544] border border-amber-500/40">
              {changeLabel}
            </span>
          </div>
          {finding.comparatorDiff && (
            <div className="text-[11px] font-mono text-teal-300 flex items-center gap-1.5">
              <span>{finding.comparatorDiff.metricLabel}:</span>
              <span className="text-rose-300 line-through">{finding.comparatorDiff.previousVal}</span>
              <span className="text-blue-400">→</span>
              <span className="text-emerald-300 font-bold">{finding.comparatorDiff.updatedVal}</span>
            </div>
          )}
        </div>

        {/* 2-Card Flow with Central Glowing Circuit Line */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-2 sm:gap-3 items-stretch relative">
          {/* Card 1: Previous IEP (5 cols) */}
          <div className="lg:col-span-5 rounded-xl bg-[#05172C] border border-[#14477D] p-3.5 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10.5px] font-mono text-blue-300/70 border-b border-[#103A68] pb-1.5 mb-2">
                <span className="font-bold uppercase tracking-wider text-blue-300">Previous IEP</span>
                <span>Page {finding.previousIep.page}</span>
              </div>
              <span className="text-[10.5px] font-mono text-blue-400/80 block mb-1">
                {finding.previousIep.section}
              </span>
              <div className="text-xs font-bold text-slate-100 bg-[#071D38] p-2.5 rounded-lg border border-[#185394]">
                {finding.previousIep.value}
              </div>
            </div>
            <p className="text-[11px] text-blue-200/70 leading-relaxed pt-2">
              {finding.previousIep.details}
            </p>
          </div>

          {/* Central Circuit Connection Graphic (1 col) */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2 lg:py-0 relative select-none">
            <div className="w-full flex items-center justify-center">
              {/* Glowing Pulse Node */}
              <div className="relative flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-400/50 flex items-center justify-center shadow-[0_0_12px_rgba(20,184,166,0.3)]">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                </div>
              </div>
            </div>
            <span className="text-[9.5px] font-mono uppercase text-teal-300/80 mt-1 font-bold">
              Diff
            </span>
          </div>

          {/* Card 2: Updated IEP (5 cols) */}
          <div className="lg:col-span-5 rounded-xl bg-[#07182E] border border-rose-500/50 p-3.5 space-y-2 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between text-[10.5px] font-mono text-rose-300/80 border-b border-rose-500/30 pb-1.5 mb-2">
                <span className="font-bold uppercase tracking-wider text-rose-300">Updated IEP</span>
                <span>Page {finding.updatedIep.page}</span>
              </div>
              <span className="text-[10.5px] font-mono text-blue-300/70 block mb-1">
                {finding.updatedIep.section}
              </span>
              <div className="text-xs font-bold text-white bg-[#0A1F3B] p-2.5 rounded-lg border border-rose-500/40">
                {finding.updatedIep.value}
              </div>
            </div>
            <p className="text-[11px] text-rose-200/80 leading-relaxed pt-2">
              {finding.updatedIep.details}
            </p>
          </div>
        </div>
      </div>

      {/* Meeting Evidence Supplement (If Meeting Conflict) */}
      {isMeetingConflict && finding.meetingRecord?.evidence && (
        <div className="rounded-xl bg-[#06243A] border border-teal-500/40 p-3 sm:p-3.5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-teal-300">
              <span className="text-sm">⚓</span>
              <span className="text-xs font-bold uppercase tracking-wider font-mono">
                Meeting Evidence (Conflict with District Commitment)
              </span>
            </div>
            <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-teal-950/80 border border-teal-500/40 text-teal-300 font-bold">
              Timestamp {finding.meetingRecord.evidence.timestamp}
            </span>
          </div>

          <div className="text-xs text-blue-100 bg-[#041525] p-2.5 rounded-lg border border-[#0E355E] space-y-1">
            <p className="font-semibold text-teal-200">
              Team Commitment: {finding.meetingRecord.agreedDecision}
            </p>
            <p className="text-[11.5px] text-blue-200/80 italic">
              {finding.meetingRecord.evidence.transcriptExcerpt}
            </p>
            <span className="text-[10px] font-mono text-blue-400 block pt-0.5">
              Speaker: {finding.meetingRecord.evidence.speaker} · {finding.meetingRecord.evidence.meetingDate}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePlayClip}
              className="h-7 text-xs font-semibold bg-[#0A3052] border-teal-400/40 text-teal-200 hover:text-white hover:bg-teal-900/60 cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              {isPlayingAudio ? (
                <>
                  <Pause className="h-3 w-3 text-teal-300" />
                  <span>Pause Clip (0:42)</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 text-teal-300 fill-teal-300" />
                  <span>▶ Play Meeting Clip (0:42)</span>
                </>
              )}
            </Button>
            <span className="text-[11px] text-blue-300/60 font-mono">
              Direct recording sync verified
            </span>
          </div>
        </div>
      )}

      {/* Why Portmaster flagged this */}
      <div className="rounded-xl bg-[#051A33] border border-[#124278] p-3 sm:p-3.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-amber-500/20 text-[#F5B544]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Why Portmaster flagged this
          </h4>
        </div>
        <p className="text-xs text-blue-100/90 leading-relaxed pl-6">
          {finding.whyPortmasterFlagged}
        </p>
      </div>
    </div>
  );
}

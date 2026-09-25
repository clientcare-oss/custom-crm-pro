import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Anchor,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PortmasterFinding } from "./types";
import { toast } from "sonner";

interface ComparatorFindingCardProps {
  finding: PortmasterFinding;
  currentIndex?: number;
  totalCount?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

export function ComparatorFindingCard({
  finding,
  currentIndex = 1,
  totalCount = 5,
  onPrev,
  onNext,
}: ComparatorFindingCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const isMeetingConflict = finding.sourceTags.includes("meeting_conflict");
  const isReviewFirst = finding.severity === "review_first";
  const changeLabel = finding.updatedIep.changeLabel || "MODIFIED";

  const handlePlayClip = () => {
    setIsPlayingAudio(!isPlayingAudio);
    if (!isPlayingAudio) {
      toast.info(
        `Playing meeting audio clip from ${
          finding.meetingRecord?.evidence?.timestamp || "01:14:22"
        }`
      );
    }
  };

  const metricLabel = finding.comparatorDiff?.metricLabel || "Frequency";
  const prevVal = finding.comparatorDiff?.previousVal || finding.previousIep.value;
  const updatedVal = finding.comparatorDiff?.updatedVal || finding.updatedIep.value;

  return (
    <div className="space-y-4 select-none">
      {/* Top Header: Finding index, Navigation arrows, Title, and Review First badge */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-semibold text-blue-200/80">
            Finding {currentIndex} of {totalCount}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentIndex <= 1}
              className="w-7 h-7 rounded-lg bg-[#071F3B] border border-[#144A7E] text-blue-200 hover:text-white hover:bg-[#0B2C52] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={currentIndex >= totalCount}
              className="w-7 h-7 rounded-lg bg-[#071F3B] border border-[#144A7E] text-blue-200 hover:text-white hover:bg-[#0B2C52] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide font-sans">
              {finding.title}
            </h2>
            <p className="text-sm text-blue-200/90 mt-1 max-w-2xl leading-relaxed font-sans">
              {finding.oneLineExplanation}
            </p>
          </div>

          {/* Review First / Check Badge */}
          {isReviewFirst ? (
            <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center gap-2">
              <span className="text-rose-400 font-bold text-sm">!</span>
              <div>
                <span className="text-xs font-bold text-rose-300 block leading-none font-sans">
                  REVIEW FIRST
                </span>
                <span className="text-xs text-rose-200/80 block mt-0.5 font-sans">
                  This item may impact the student&apos;s program.
                </span>
              </div>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50 flex items-center gap-2">
              <span className="text-[#F5B544] font-bold text-sm">!</span>
              <div>
                <span className="text-xs font-bold text-[#F5B544] block leading-none font-sans">
                  CHECK
                </span>
                <span className="text-xs text-amber-200/80 block mt-0.5 font-sans">
                  Wording or model change requires verification.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* COMPARATOR CIRCUIT VISUAL BOARD (Restored Image 2 Structure + Animated Moving Circuit) */}
      {/* ============================================================== */}
      <div className="rounded-2xl bg-[#041224] border border-[#113C6E] p-4 sm:p-5 shadow-xl space-y-4">
        {/* Top Circuit Sub-Header */}
        <div className="flex items-center justify-between text-xs border-b border-[#0F355E] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold tracking-wider text-cyan-300 uppercase font-sans">
              IEP Comparator Circuit
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-[#F5B544] border border-amber-500/40 uppercase font-sans">
              {changeLabel}
            </span>
          </div>

          <div className="text-xs font-medium text-cyan-200 flex items-center gap-2 font-sans">
            <span>{metricLabel}:</span>
            <span className="text-rose-300 line-through font-semibold">{prevVal}</span>
            <span className="text-blue-400">→</span>
            <span className="text-emerald-300 font-bold">{updatedVal}</span>
          </div>
        </div>

        {/* 2-Card Flow with Real Animated Moving Circuit Connection */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-3 sm:gap-4 items-stretch relative">
          {/* Card 1: Previous IEP (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-[#05172C] border border-[#14477D] p-4 space-y-3 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-blue-300 border-b border-[#103A68] pb-2 mb-2 font-sans">
                <span className="font-bold tracking-wider uppercase text-cyan-300">
                  Previous IEP
                </span>
                <span className="text-slate-400 font-medium">Page {finding.previousIep.page}</span>
              </div>

              <span className="text-xs text-cyan-300/90 block mb-2 font-sans font-medium">
                {finding.previousIep.section}
              </span>

              {/* Value Box */}
              <div className="text-sm font-bold text-white bg-[#071D38] p-3 rounded-xl border border-[#185394] font-sans">
                {finding.previousIep.value}
              </div>
            </div>

            {/* Normal Readable Description */}
            <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed pt-2 font-sans font-normal">
              {finding.previousIep.details}
            </p>
          </div>

          {/* Central Moving Circuit Column (1 col on lg) */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-3 lg:py-0 relative select-none">
            {/* Animated Flowing SVG Circuit Wire with Traveling Electron Pulses */}
            <div className="w-full flex items-center justify-center relative">
              <svg className="w-full h-16 overflow-visible" viewBox="0 0 80 60" fill="none">
                {/* Background dashed guide line */}
                <line
                  x1="0"
                  y1="30"
                  x2="80"
                  y2="30"
                  stroke="#103D6D"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />

                {/* Moving Flowing Energy Stream (left to right) */}
                <line
                  x1="0"
                  y1="30"
                  x2="80"
                  y2="30"
                  stroke="#22D3EE"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="24"
                    to="0"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </line>

                {/* Particle 1: Traveling glowing electron node from Left -> Right */}
                <circle r="3.5" fill="#38BDF8" className="filter drop-shadow-[0_0_6px_#38BDF8]">
                  <animateMotion
                    path="M 0 30 L 80 30"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* Particle 2: Second staggered electron node */}
                <circle r="2.5" fill="#F5B544" className="filter drop-shadow-[0_0_5px_#F5B544]">
                  <animateMotion
                    path="M 0 30 L 80 30"
                    begin="0.9s"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>

              {/* Central Glowing Diff Node */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-[#042036] border-2 border-teal-400 flex items-center justify-center shadow-[0_0_16px_rgba(20,184,166,0.6)]">
                  <div className="w-3 h-3 rounded-full bg-teal-400 animate-ping" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white absolute" />
                </div>
              </div>
            </div>

            {/* DIFF Label */}
            <span className="text-[11px] font-bold tracking-wider uppercase text-teal-300 mt-2 font-sans">
              Diff
            </span>
          </div>

          {/* Card 2: Updated IEP (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-[#07182E] border border-rose-500/50 p-4 space-y-3 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-xs text-rose-300 border-b border-rose-500/30 pb-2 mb-2 font-sans">
                <span className="font-bold tracking-wider uppercase text-rose-300">
                  Updated IEP
                </span>
                <span className="text-slate-400 font-medium">Page {finding.updatedIep.page}</span>
              </div>

              <span className="text-xs text-blue-200/90 block mb-2 font-sans font-medium">
                {finding.updatedIep.section}
              </span>

              {/* Value Box */}
              <div className="text-sm font-bold text-white bg-[#0A1F3B] p-3 rounded-xl border border-rose-500/40 font-sans">
                {finding.updatedIep.value}
              </div>
            </div>

            {/* Normal Readable Description */}
            <p className="text-xs sm:text-[13px] text-rose-100/90 leading-relaxed pt-2 font-sans font-normal">
              {finding.updatedIep.details}
            </p>
          </div>
        </div>
      </div>

      {/* Meeting Evidence Supplement (If Meeting Conflict) */}
      {isMeetingConflict && finding.meetingRecord?.evidence && (
        <div className="rounded-2xl bg-[#06243A] border border-teal-500/40 p-4 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-teal-300">
              <Anchor className="h-4 w-4 text-[#F5B544]" />
              <span className="text-xs sm:text-sm font-bold tracking-wide font-sans">
                Meeting Evidence: Conflict with District Commitment
              </span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-950 border border-teal-500/40 text-teal-300 font-semibold font-sans">
              Timestamp {finding.meetingRecord.evidence.timestamp}
            </span>
          </div>

          <div className="text-sm text-blue-100 bg-[#041525] p-3 rounded-xl border border-[#0E355E] space-y-1.5 font-sans">
            <p className="font-semibold text-teal-200">
              Team Agreement: {finding.meetingRecord.agreedDecision}
            </p>
            <p className="text-slate-200 italic leading-relaxed">
              &ldquo;{finding.meetingRecord.evidence.transcriptExcerpt}&rdquo;
            </p>
            <span className="text-xs text-blue-300/70 block pt-1">
              Speaker: {finding.meetingRecord.evidence.speaker} · {finding.meetingRecord.evidence.meetingDate}
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePlayClip}
              className="h-8 px-3 text-xs font-semibold bg-[#0A3052] border-teal-400/40 text-teal-100 hover:text-white hover:bg-teal-900/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm font-sans"
            >
              {isPlayingAudio ? (
                <>
                  <Pause className="h-3.5 w-3.5 text-teal-300" />
                  <span>Pause Clip (0:42)</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-teal-300 fill-teal-300" />
                  <span>▶ Play Meeting Clip (0:42)</span>
                </>
              )}
            </Button>
            <span className="text-xs text-blue-300/70 font-sans">
              Verified directly from meeting audio transcript
            </span>
          </div>
        </div>
      )}

      {/* Why Portmaster Flagged This (Anchor Banner) */}
      <div className="rounded-2xl bg-[#041935] border border-[#103D6D] p-3.5 sm:p-4 flex items-start gap-3 shadow-md">
        <div className="w-8 h-8 rounded-xl bg-blue-900/50 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
          <Anchor className="h-4 w-4 text-[#F5B544]" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide font-sans">
            Why Portmaster flagged this
          </h4>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-sans font-normal">
            {finding.whyPortmasterFlagged}
          </p>
        </div>
      </div>
    </div>
  );
}

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
          <span className="text-xs font-semibold text-blue-200/80 font-sans">
            Finding {currentIndex} of {totalCount}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentIndex <= 1}
              className="w-7 h-7 rounded-lg bg-[#071F3B] border-2 border-[#144A7E] text-blue-200 hover:text-white hover:bg-[#0B2C52] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={currentIndex >= totalCount}
              className="w-7 h-7 rounded-lg bg-[#071F3B] border-2 border-[#144A7E] text-blue-200 hover:text-white hover:bg-[#0B2C52] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors"
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
            <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border-2 border-rose-500/70 flex items-center gap-2 shadow-md">
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
            <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border-2 border-amber-500/70 flex items-center gap-2 shadow-md">
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
      {/* COMPARATOR CIRCUIT VISUAL BOARD (Thicker Borders + Connected Flowing Circuit Line) */}
      {/* ============================================================== */}
      <div className="rounded-2xl bg-[#041224] border-[3px] border-[#1D5E9E] p-4 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
        {/* Subtle background circuit grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #38BDF8 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Top Circuit Sub-Header */}
        <div className="flex items-center justify-between text-xs border-b-2 border-[#0F355E] pb-3 flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold tracking-wider text-cyan-300 uppercase font-sans">
              IEP Comparator Circuit
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-[#F5B544] border-2 border-amber-500/60 uppercase font-sans shadow-xs">
              {changeLabel}
            </span>
          </div>

          <div className="text-xs font-medium text-cyan-200 flex items-center gap-2 font-sans">
            <span className="text-blue-300">{metricLabel}:</span>
            <span className="text-rose-300 line-through font-semibold">{prevVal}</span>
            <span className="text-cyan-400 font-bold">→</span>
            <span className="text-emerald-300 font-bold">{updatedVal}</span>
          </div>
        </div>

        {/* 2 Cards with DIRECT Circuit Connection physically bridging between them */}
        <div className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-stretch relative">
            {/* ===================== CARD 1: PREVIOUS IEP ===================== */}
            <div className="rounded-2xl bg-[#05172C] border-[3px] border-[#2563EB] p-4 sm:p-5 space-y-3 flex flex-col justify-between shadow-xl relative transition-all hover:border-cyan-400 group">
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

                {/* Value Box with Thicker Border */}
                <div className="text-sm font-bold text-white bg-[#071D38] p-3 rounded-xl border-2 border-[#1E60A6] font-sans shadow-inner">
                  {finding.previousIep.value}
                </div>
              </div>

              {/* Normal Readable Description */}
              <p className="text-xs sm:text-[13px] text-slate-100 leading-relaxed pt-2 font-sans font-normal">
                {finding.previousIep.details}
              </p>
            </div>

            {/* ===================== CONNECTING FLOWING CIRCUIT LINE ===================== */}
            {/* Desktop Horizontal Bridge directly spanning from Card 1 border to Card 2 border */}
            <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-14 z-30 items-center justify-center pointer-events-none">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 64 56" fill="none">
                {/* Circuit Glow Filter */}
                <defs>
                  <filter id="circuit-wire-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* 1. Base Wire Conductor - physically spans into both card borders */}
                <line
                  x1="-10"
                  y1="28"
                  x2="74"
                  y2="28"
                  stroke="#103D6D"
                  strokeWidth="4"
                />

                {/* 2. Active Flowing Electric Stream - moving dashed circuit energy */}
                <line
                  x1="-10"
                  y1="28"
                  x2="74"
                  y2="28"
                  stroke="#22D3EE"
                  strokeWidth="3.5"
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                  filter="url(#circuit-wire-glow)"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="28"
                    to="0"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </line>

                {/* 3. Traveling Golden / Cyan Electron Pulses */}
                <circle r="4" fill="#38BDF8" filter="url(#circuit-wire-glow)">
                  <animateMotion
                    path="M -10 28 L 74 28"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle r="3" fill="#F5B544" filter="url(#circuit-wire-glow)">
                  <animateMotion
                    path="M -10 28 L 74 28"
                    begin="0.6s"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* 4. Left Terminal Port Socket (anchored onto Card 1 right border) */}
                <circle
                  cx="0"
                  cy="28"
                  r="6"
                  fill="#041224"
                  stroke="#F5B544"
                  strokeWidth="3"
                  filter="url(#circuit-wire-glow)"
                />
                <circle cx="0" cy="28" r="2.5" fill="#FFFFFF" />

                {/* 5. Right Terminal Port Socket (anchored onto Card 2 left border) */}
                <circle
                  cx="64"
                  cy="28"
                  r="6"
                  fill="#041224"
                  stroke="#F5B544"
                  strokeWidth="3"
                  filter="url(#circuit-wire-glow)"
                />
                <circle cx="64" cy="28" r="2.5" fill="#FFFFFF" />

                {/* 6. Center Comparator Junction Diamond */}
                <rect
                  x="26"
                  y="22"
                  width="12"
                  height="12"
                  transform="rotate(45 32 28)"
                  fill="#041A30"
                  stroke="#F5B544"
                  strokeWidth="2.5"
                  filter="url(#circuit-wire-glow)"
                />
                <circle cx="32" cy="28" r="2.5" fill="#22D3EE" />

                {/* Pulsing ring around diamond */}
                <circle
                  cx="32"
                  cy="28"
                  r="6"
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="1.5"
                  opacity="0.8"
                >
                  <animate attributeName="r" values="3;10;3" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1.6s" repeatCount="indefinite" />
                </circle>
              </svg>

              {/* DIFF Badge right under the junction diamond */}
              <div className="absolute top-[38px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#F5B544] font-sans bg-[#04162B] px-1.5 py-0.5 rounded border border-[#F5B544]/50 shadow-md">
                  DIFF
                </span>
              </div>
            </div>

            {/* Mobile Vertical Circuit Bridge */}
            <div className="flex lg:hidden justify-center my-[-10px] z-30">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-16 overflow-visible" viewBox="0 0 48 64" fill="none">
                  {/* Vertical Base Wire */}
                  <line x1="24" y1="-8" x2="24" y2="72" stroke="#103D6D" strokeWidth="4" />
                  {/* Vertical Flowing Stream */}
                  <line
                    x1="24"
                    y1="-8"
                    x2="24"
                    y2="72"
                    stroke="#22D3EE"
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="28"
                      to="0"
                      dur="0.8s"
                      repeatCount="indefinite"
                    />
                  </line>
                  {/* Top Terminal */}
                  <circle cx="24" cy="0" r="5" fill="#041224" stroke="#F5B544" strokeWidth="2.5" />
                  {/* Bottom Terminal */}
                  <circle cx="24" cy="64" r="5" fill="#041224" stroke="#F5B544" strokeWidth="2.5" />
                  {/* Center Diamond */}
                  <rect
                    x="19"
                    y="27"
                    width="10"
                    height="10"
                    transform="rotate(45 24 32)"
                    fill="#041A30"
                    stroke="#F5B544"
                    strokeWidth="2"
                  />
                  <circle cx="24" cy="32" r="2" fill="#22D3EE" />
                </svg>
                <span className="text-[9.5px] font-bold text-[#F5B544] uppercase px-1.5 py-0.5 rounded bg-[#041B30] border border-[#F5B544]/50 mt-[-12px] font-sans">
                  DIFF
                </span>
              </div>
            </div>

            {/* ===================== CARD 2: UPDATED IEP ===================== */}
            <div className="rounded-2xl bg-[#07182E] border-[3px] border-rose-500 p-4 sm:p-5 space-y-3 flex flex-col justify-between shadow-xl relative transition-all hover:border-rose-400 group">
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

                {/* Value Box with Thicker Border */}
                <div className="text-sm font-bold text-white bg-[#0A1F3B] p-3 rounded-xl border-2 border-rose-500/60 font-sans shadow-inner">
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
      </div>

      {/* Meeting Evidence Supplement (If Meeting Conflict) */}
      {isMeetingConflict && finding.meetingRecord?.evidence && (
        <div className="rounded-2xl bg-[#06243A] border-2 border-teal-500/50 p-4 space-y-2.5 shadow-md">
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
              className="h-8 px-3 text-xs font-semibold bg-[#0A3052] border border-teal-400/40 text-teal-100 hover:text-white hover:bg-teal-900/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm font-sans"
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
      <div className="rounded-2xl bg-[#041935] border-2 border-[#103D6D] p-3.5 sm:p-4 flex items-start gap-3 shadow-md">
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

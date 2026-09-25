import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Anchor,
  Sparkles,
  ExternalLink,
  Star,
  CheckCircle2,
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
                <span className="text-xs font-bold text-rose-300 block leading-none">
                  REVIEW FIRST
                </span>
                <span className="text-xs text-rose-200/80 block mt-0.5">
                  This item may impact the student&apos;s program.
                </span>
              </div>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50 flex items-center gap-2">
              <span className="text-[#F5B544] font-bold text-sm">!</span>
              <div>
                <span className="text-xs font-bold text-[#F5B544] block leading-none">
                  CHECK
                </span>
                <span className="text-xs text-amber-200/80 block mt-0.5">
                  Wording or model change requires verification.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* COMPARATOR CIRCUIT FLOW VIEW (Matching Reference Screenshot 1) */}
      {/* ============================================================== */}
      <div className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-stretch relative">
          {/* ===================== LEFT CARD (Updated IEP) ===================== */}
          <div className="rounded-2xl bg-[#030e20] border border-[#0e2c56] p-4 sm:p-5 flex flex-col justify-between shadow-xl relative transition-all hover:border-[#16447e]">
            {/* Top Chip Bar */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-[#05162d] border border-[#0d3460] text-xs font-medium text-blue-200">
                  {String(currentIndex).padStart(2, "0")} · {finding.category}
                </span>

                <span className="px-3 py-1 rounded-full bg-[#1e1503] border border-[#f5b544]/60 text-xs font-bold text-[#f5b544]">
                  {metricLabel}: {prevVal} → {updatedVal}
                </span>
              </div>

              <span className="px-3 py-0.5 rounded-full bg-[#1e1503] border border-[#f5b544]/70 text-xs font-bold text-[#f5b544] uppercase tracking-wider">
                {changeLabel}
              </span>
            </div>

            {/* Card Heading */}
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans mb-3">
              {finding.title}
            </h3>

            {/* Dark Inner Narrative Box with Normal Readable Text */}
            <div className="rounded-xl bg-[#061834] border border-[#0e2d57] p-3.5 sm:p-4 text-slate-100 text-sm leading-relaxed font-sans shadow-inner">
              <p className="font-normal text-slate-200">
                {finding.updatedIep.details}
              </p>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between pt-3.5 text-xs border-t border-[#0a2347] mt-3">
              <span className="text-slate-400 font-normal">
                Page {finding.updatedIep.page} · {finding.updatedIep.section}
              </span>

              <button
                type="button"
                className="text-xs font-semibold text-blue-400 hover:text-blue-200 cursor-pointer inline-flex items-center gap-1 transition-colors"
              >
                <span>Inspect</span>
                <span>→</span>
              </button>
            </div>

            {/* Circuit Connector Node on Right Border (Desktop) */}
            <div className="hidden lg:flex absolute -right-[7px] top-1/2 -translate-y-1/2 z-20">
              <div className="w-3.5 h-3.5 rounded-full bg-[#F5B544] border-2 border-[#000820] shadow-[0_0_10px_rgba(245,181,68,0.9)]" />
            </div>
          </div>

          {/* ===================== CENTRAL CIRCUIT CONNECTION ===================== */}
          {/* Desktop Circuit Bridge with Gold Dashed Line & Glowing Diamond */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center pointer-events-none z-10 w-14">
            {/* Left Dashed Line */}
            <div className="w-4 h-[2px] border-t-2 border-dashed border-[#F5B544]/80" />

            {/* Center Glowing Diamond Node */}
            <div className="w-4 h-4 rotate-45 border-2 border-[#F5B544] bg-[#000820] shadow-[0_0_12px_rgba(245,181,68,0.9)] flex items-center justify-center shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F5B544]" />
            </div>

            {/* Right Dashed Line */}
            <div className="w-4 h-[2px] border-t-2 border-dashed border-[#F5B544]/80" />
          </div>

          {/* ===================== RIGHT CARD (Previous IEP / Old Baseline) ===================== */}
          <div className="rounded-2xl bg-[#030e20] border border-[#0e2c56] p-4 sm:p-5 flex flex-col justify-between shadow-xl relative transition-all hover:border-[#16447e]">
            {/* Circuit Connector Node on Left Border (Desktop) */}
            <div className="hidden lg:flex absolute -left-[7px] top-1/2 -translate-y-1/2 z-20">
              <div className="w-3.5 h-3.5 rounded-full bg-[#F5B544] border-2 border-[#000820] shadow-[0_0_10px_rgba(245,181,68,0.9)]" />
            </div>

            {/* Top Chip Bar */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full bg-[#05162d] border border-[#0d3460] text-xs font-medium text-blue-200">
                Old Baseline · {finding.category}
              </span>

              <span className="text-xs text-blue-300/70 font-medium">
                Prior Language
              </span>
            </div>

            {/* Card Heading */}
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans mb-3">
              {finding.title}
            </h3>

            {/* Dark Inner Narrative Box with Normal Readable Text */}
            <div className="rounded-xl bg-[#061834] border border-[#0e2d57] p-3.5 sm:p-4 text-slate-100 text-sm leading-relaxed font-sans shadow-inner">
              <p className="font-normal text-slate-200">
                {finding.previousIep.details}
              </p>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between pt-3.5 text-xs border-t border-[#0a2347] mt-3">
              <span className="text-slate-400 font-normal">
                Page {finding.previousIep.page} · {finding.previousIep.section}
              </span>

              <div className="flex items-center gap-2 text-blue-300/60">
                <Star className="h-3.5 w-3.5" />
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Evidence Supplement (If Meeting Conflict) */}
      {isMeetingConflict && finding.meetingRecord?.evidence && (
        <div className="rounded-2xl bg-[#06243A] border border-teal-500/40 p-4 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-teal-300">
              <Anchor className="h-4 w-4 text-[#F5B544]" />
              <span className="text-xs sm:text-sm font-bold tracking-wide">
                Meeting Evidence: Conflict with District Commitment
              </span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-950 border border-teal-500/40 text-teal-300 font-medium font-mono">
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
              className="h-8 px-3 text-xs font-semibold bg-[#0A3052] border-teal-400/40 text-teal-100 hover:text-white hover:bg-teal-900/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
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
            <span className="text-xs text-blue-300/70">
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

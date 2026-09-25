import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  CalendarCheck,
  Anchor,
  Play,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortmasterFinding } from "./types";
import { toast } from "sonner";

interface StandardPortmasterFindingCardProps {
  finding: PortmasterFinding;
  currentIndex?: number;
  totalCount?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

export function StandardPortmasterFindingCard({
  finding,
  currentIndex = 1,
  totalCount = 5,
  onPrev,
  onNext,
}: StandardPortmasterFindingCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const isReviewFirst = finding.severity === "review_first";

  const handlePlayClip = () => {
    setIsPlayingAudio(true);
    toast.info(`Playing meeting audio clip at ${finding.meetingRecord?.evidence?.timestamp || "01:14:22"}...`);
    setTimeout(() => {
      setIsPlayingAudio(false);
      toast.success("Finished playing meeting audio clip.");
    }, 4500);
  };

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

      {/* 3-Panel Document Progression: PREVIOUS IEP -> MEETING RECORD -> UPDATED IEP */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-2.5 items-center">
        {/* Panel 1: Previous IEP (3 cols on md) */}
        <div className="md:col-span-3 rounded-2xl bg-[#03152C] border border-[#0F3865] p-3.5 space-y-2.5 shadow-md">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center justify-center">
              <FileText className="h-3 w-3" />
            </div>
            <div>
              <span className="block leading-none font-sans">Previous IEP</span>
              <span className="text-[11px] text-blue-300/70 font-sans">Aug 14, 2025</span>
            </div>
          </div>

          {/* Clean White Paper Body */}
          <div className="rounded-xl bg-[#F8FAFC] text-slate-900 p-3.5 space-y-2 shadow-inner border border-slate-200">
            <h4 className="text-xs font-bold text-slate-950 tracking-wide font-sans">
              {finding.previousIep.section}
            </h4>
            <div className="text-xs font-semibold text-slate-800 font-sans">
              30 minutes
            </div>
            <div className="inline-block px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 text-xs font-bold font-sans">
              {finding.previousIep.value}
            </div>
            <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed pt-1 font-sans">
              {finding.previousIep.details}
            </p>
          </div>
        </div>

        {/* Transition Arrow 1 (1 col on md) */}
        <div className="hidden md:flex md:col-span-1 justify-center text-blue-400/80 text-xl font-bold">
          →
        </div>

        {/* Panel 2: Meeting Record (Center, 3 cols on md) */}
        <div className="md:col-span-3 rounded-2xl bg-[#03152C] border border-blue-500/40 p-3.5 space-y-2.5 shadow-md">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <div className="w-5 h-5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center">
              <CalendarCheck className="h-3 w-3" />
            </div>
            <div>
              <span className="block leading-none font-sans">Meeting Record</span>
              <span className="text-[11px] text-teal-300/80 font-sans">Sept 18, 2026</span>
            </div>
          </div>

          {/* Deep Navy Meeting Record Body */}
          <div className="rounded-xl bg-[#0B254E] text-slate-100 p-3.5 space-y-2 shadow-inner border border-blue-400/30">
            <h4 className="text-xs font-bold text-white tracking-wide font-sans">
              Team Decision
            </h4>
            <p className="text-xs sm:text-[13px] text-blue-100 leading-snug font-sans">
              {finding.meetingRecord?.agreedDecision || "Continue current reading service at 30 minutes 5 times per week."}
            </p>

            {/* Quote block with normal readable font */}
            <div className="p-2.5 rounded-lg bg-[#071A36] border border-blue-500/20 text-xs sm:text-[12.5px] text-blue-200 italic leading-relaxed font-sans">
              &ldquo;{finding.meetingRecord?.evidence?.transcriptExcerpt || "Team agreed to maintain reading supports at 5x/week. Progress has been positive."}&rdquo;
            </div>

            <div className="flex items-center justify-between text-xs text-blue-300/70 pt-0.5">
              <span>{finding.meetingRecord?.evidence?.timestamp || "01:14:22"}</span>
            </div>

            {/* Play Meeting Clip Button */}
            <button
              type="button"
              onClick={handlePlayClip}
              className={cn(
                "w-full h-8 rounded-lg text-xs font-semibold cursor-pointer transition-all inline-flex items-center justify-center gap-1.5 shadow-sm border font-sans",
                isPlayingAudio
                  ? "bg-teal-500 text-slate-950 border-teal-300 animate-pulse font-bold"
                  : "bg-[#113867] border-blue-400/40 text-blue-100 hover:bg-[#184882] hover:text-white"
              )}
            >
              {isPlayingAudio ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-slate-950 animate-bounce" />
                  <span>Playing 01:14:22...</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 fill-current text-blue-300" />
                  <span>Play Meeting Clip</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Transition Arrow 2 (1 col on md) */}
        <div className="hidden md:flex md:col-span-1 justify-center text-blue-400/80 text-xl font-bold">
          →
        </div>

        {/* Panel 3: Updated IEP (3 cols on md) */}
        <div className="md:col-span-3 rounded-2xl bg-[#03152C] border border-rose-500/40 p-3.5 space-y-2.5 shadow-md">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center">
              <FileText className="h-3 w-3" />
            </div>
            <div>
              <span className="block leading-none font-sans">Updated IEP</span>
              <span className="text-[11px] text-emerald-300/80 font-sans">Sept 25, 2026</span>
            </div>
          </div>

          {/* Light Pink/Red Paper Body */}
          <div className="rounded-xl bg-[#FEF2F2] text-slate-900 p-3.5 space-y-2 shadow-inner border border-rose-200">
            <h4 className="text-xs font-bold text-slate-950 tracking-wide font-sans">
              {finding.updatedIep.section}
            </h4>
            <div className="text-xs font-semibold text-slate-800 font-sans">
              30 minutes
            </div>
            <div className="inline-block px-2 py-0.5 rounded-md bg-rose-200 text-rose-950 text-xs font-bold font-sans">
              {finding.updatedIep.value}
            </div>
            <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed pt-1 font-sans">
              {finding.updatedIep.details}
            </p>
          </div>
        </div>
      </div>

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

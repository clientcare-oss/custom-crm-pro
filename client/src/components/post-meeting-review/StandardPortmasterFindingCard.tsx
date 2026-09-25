import React from "react";
import { ArrowRight, FileText, CalendarCheck, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortmasterFinding } from "./types";

interface StandardPortmasterFindingCardProps {
  finding: PortmasterFinding;
}

export function StandardPortmasterFindingCard({ finding }: StandardPortmasterFindingCardProps) {
  return (
    <div className="space-y-4">
      {/* 3-Panel Document Progression: PREVIOUS IEP -> MEETING RECORD -> UPDATED IEP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
        {/* Panel 1: Previous IEP */}
        <div className="rounded-xl bg-[#041528] border border-[#0F355E] p-3.5 space-y-2 relative shadow-sm">
          <div className="flex items-center justify-between gap-1 border-b border-[#0F355E]/80 pb-2">
            <div className="flex items-center gap-1.5 text-blue-300">
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10.5px] font-bold uppercase tracking-wider font-mono">
                Previous IEP
              </span>
            </div>
            <span className="text-[10px] font-mono text-blue-300/60">
              Page {finding.previousIep.page}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10.5px] text-blue-300/70 font-mono block">
              {finding.previousIep.section}
            </span>
            <div className="text-xs font-bold text-white bg-[#061C38] p-2 rounded-lg border border-[#134275]">
              {finding.previousIep.value}
            </div>
            <p className="text-[11px] text-blue-200/75 leading-relaxed pt-1">
              {finding.previousIep.details}
            </p>
          </div>
        </div>

        {/* Panel 2: Meeting Record (Center) */}
        <div className="rounded-xl bg-[#07243B] border border-teal-500/40 p-3.5 space-y-2 relative shadow-md">
          <div className="flex items-center justify-between gap-1 border-b border-teal-500/30 pb-2">
            <div className="flex items-center gap-1.5 text-teal-300">
              <CalendarCheck className="h-3.5 w-3.5 text-teal-400" />
              <span className="text-[10.5px] font-bold uppercase tracking-wider font-mono">
                Meeting Record
              </span>
            </div>
            <span className="text-[10px] font-mono text-teal-400/80">
              {finding.meetingRecord?.decisionDate || "Agreed"}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10.5px] text-teal-300/70 font-mono block">
              Team Commitment
            </span>
            <div className="text-xs font-bold text-teal-100 bg-[#062F4A]/80 p-2 rounded-lg border border-teal-400/40">
              {finding.meetingRecord?.agreedDecision || "Team agreement recorded in meeting notes."}
            </div>
            {finding.meetingRecord?.evidence && (
              <p className="text-[10.5px] font-mono text-teal-300/80 pt-1 italic">
                Verified at {finding.meetingRecord.evidence.timestamp} · {finding.meetingRecord.evidence.speaker}
              </p>
            )}
          </div>
        </div>

        {/* Panel 3: Updated IEP */}
        <div className="rounded-xl bg-[#041528] border border-rose-500/40 p-3.5 space-y-2 relative shadow-sm">
          <div className="flex items-center justify-between gap-1 border-b border-rose-500/30 pb-2">
            <div className="flex items-center gap-1.5 text-rose-300">
              <FileText className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-[10.5px] font-bold uppercase tracking-wider font-mono">
                Updated IEP
              </span>
            </div>
            <span className="text-[10px] font-mono text-rose-300/70">
              Page {finding.updatedIep.page}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-blue-300/70 font-mono">
                {finding.updatedIep.section}
              </span>
              {finding.updatedIep.changeLabel && (
                <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/40">
                  {finding.updatedIep.changeLabel}
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-white bg-[#061C38] p-2 rounded-lg border border-rose-500/30">
              {finding.updatedIep.value}
            </div>
            <p className="text-[11px] text-rose-200/80 leading-relaxed pt-1">
              {finding.updatedIep.details}
            </p>
          </div>
        </div>
      </div>

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

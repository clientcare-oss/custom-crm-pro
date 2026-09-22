import React from "react";
import { MeetingTarget } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Printer,
  HeartHandshake,
  Target,
  Lightbulb,
  FileBarChart2,
  Bookmark,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

interface ParentReadyViewProps {
  targets: MeetingTarget[];
  studentName?: string;
  meetingTitle?: string;
  meetingDate?: string;
}

export function ParentReadyView({
  targets,
  studentName = "Student",
  meetingTitle = "Annual IEP Meeting",
  meetingDate = "Upcoming",
}: ParentReadyViewProps) {
  const approvedTargets = targets;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Family view link copied to clipboard");
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Friendly Parent Header */}
      <div className="bg-[#0B1E36] border border-[#103E70] rounded-2xl p-6 sm:p-8 shadow-2xl print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#0E3E75]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 bg-emerald-950/40 text-xs gap-1.5 py-0.5">
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
                Family & Parent Guide
              </Badge>
              <span className="text-xs text-blue-200/70">Clear & Empowering IEP Priorities</span>
            </div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>{studentName}'s Meeting Roadmap</span>
            </h2>
            <p className="text-xs text-blue-300/70 mt-1">
              {meetingTitle} · {meetingDate} · {approvedTargets.length} Key Family Requests
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="border-[#0D4B84] bg-[#092244] text-blue-200 hover:text-white hover:bg-[#0E3E75] text-xs gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-300" />
              Share
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="border-[#0D4B84] bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] text-white hover:border-emerald-400/60 text-xs gap-1.5 cursor-pointer shadow-md"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-[#071C3C] border border-[#144A7E] text-xs text-blue-200 leading-relaxed">
          <p className="font-semibold text-white mb-1">How to use this guide:</p>
          This document is your plain-language roadmap for today's meeting. It outlines exactly what we are requesting for {studentName}, why each support matters, and the data backing it up so you can follow along confidently.
        </div>
      </div>

      {/* Target Cards for Parents */}
      <div className="space-y-6">
        {approvedTargets.map((target, idx) => {
          const whatWeWant = target.parentWhatWeWant || target.quickAdvocateSayThis || target.targetName;
          const whyWeWantIt = target.parentWhyWeWantIt || target.whyWeWantIt || "To support meaningful educational progress and access in the classroom.";
          const evidence = target.parentSupportingEvidence || target.supportingEvidence || "Observations and baseline evaluations.";

          return (
            <div
              key={target.id}
              className="bg-[#0B1E36] border border-[#103E70] rounded-2xl p-6 sm:p-7 shadow-xl relative print:border-none print:shadow-none print:p-0 print:mb-8"
            >
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#0E3E75]">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{target.targetName}</h3>
                  </div>
                </div>
                <Badge variant="outline" className="border-[#144A7E] text-blue-300 bg-[#071C3C] text-[11px] gap-1">
                  <Bookmark className="w-3 h-3 text-blue-400" />
                  {target.iepSection}
                </Badge>
              </div>

              <div className="space-y-4">
                {/* 🎯 WHAT WE WANT */}
                <div className="bg-[#092244]/90 border border-emerald-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wide mb-1.5">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <span>🎯 WHAT WE ARE REQUESTING</span>
                  </div>
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    {whatWeWant}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 💡 WHY WE WANT IT */}
                  <div className="bg-[#092244]/70 border border-[#103E70] rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#F5B544] uppercase tracking-wide mb-1.5">
                      <Lightbulb className="w-4 h-4 text-[#F5B544]" />
                      <span>💡 WHY THIS MATTERS FOR {studentName.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-blue-200 leading-relaxed">
                      {whyWeWantIt}
                    </p>
                  </div>

                  {/* 📊 SUPPORTING EVIDENCE */}
                  <div className="bg-[#092244]/70 border border-[#103E70] rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 uppercase tracking-wide mb-1.5">
                      <FileBarChart2 className="w-4 h-4 text-sky-400" />
                      <span>📊 SUPPORTING EVIDENCE & DATA</span>
                    </div>
                    <p className="text-xs text-blue-200 leading-relaxed">
                      {evidence}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

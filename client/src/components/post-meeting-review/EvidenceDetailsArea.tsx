import React, { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Mic, Sparkles, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PortmasterFinding } from "./types";

interface EvidenceDetailsAreaProps {
  finding: PortmasterFinding;
  onUpdateNotes: (notes: string) => void;
  onOpenStandaloneComparator?: () => void;
  onOpenMeetingWorkspace?: () => void;
}

export function EvidenceDetailsArea({
  finding,
  onUpdateNotes,
  onOpenStandaloneComparator,
  onOpenMeetingWorkspace,
}: EvidenceDetailsAreaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"comparison" | "meeting" | "notes">("comparison");

  return (
    <div className="rounded-xl border border-[#0F355E] bg-[#031120] overflow-hidden shadow-sm">
      {/* Toggle Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[#071F38] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-blue-400">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Evidence & Details
          </span>
          {finding.meetingRecord?.evidence && (
            <span className="px-1.5 py-0.2 rounded bg-teal-950/70 border border-teal-500/40 text-[10px] text-teal-300 font-mono">
              Meeting Clip Available
            </span>
          )}
        </div>
        <span className="text-[11px] text-blue-300/60 font-mono">
          {isOpen ? "Hide Details" : "Inspect Raw Text & Audio ▾"}
        </span>
      </button>

      {/* Expanded Content Area */}
      {isOpen && (
        <div className="p-3.5 border-t border-[#0F355E] space-y-3 bg-[#020A14]">
          {/* Sub-tabs inside Evidence */}
          <div className="flex items-center gap-1.5 border-b border-[#0E2F54] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("comparison")}
              className={`h-6 px-2.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                activeTab === "comparison"
                  ? "bg-[#0E3A68] text-white border border-blue-400/50"
                  : "text-blue-300/70 hover:text-white"
              }`}
            >
              📄 Document Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("meeting")}
              className={`h-6 px-2.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                activeTab === "meeting"
                  ? "bg-[#0E3A68] text-white border border-blue-400/50"
                  : "text-blue-300/70 hover:text-white"
              }`}
            >
              🎙️ Meeting Evidence
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={`h-6 px-2.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                activeTab === "notes"
                  ? "bg-[#0E3A68] text-white border border-blue-400/50"
                  : "text-blue-300/70 hover:text-white"
              }`}
            >
              📝 Advocate Notes
            </button>
          </div>

          {/* Sub-tab 1: Raw Document Text Comparison */}
          {activeTab === "comparison" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-[#041221] border border-[#0E3259] p-3 space-y-1">
                <span className="text-[10.5px] font-mono text-blue-300 uppercase tracking-wider font-bold block">
                  Previous IEP (Page {finding.previousIep.page})
                </span>
                <p className="text-[11.5px] font-mono text-blue-100/90 whitespace-pre-wrap leading-relaxed">
                  {finding.previousIep.details}
                </p>
              </div>

              <div className="rounded-lg bg-[#041221] border border-[#0E3259] p-3 space-y-1">
                <span className="text-[10.5px] font-mono text-rose-300 uppercase tracking-wider font-bold block">
                  Updated IEP (Page {finding.updatedIep.page})
                </span>
                <p className="text-[11.5px] font-mono text-rose-100/90 whitespace-pre-wrap leading-relaxed">
                  {finding.updatedIep.details}
                </p>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Meeting Audio / Transcript */}
          {activeTab === "meeting" && (
            <div className="rounded-lg bg-[#041221] border border-[#0E3259] p-3 space-y-2 text-xs">
              {finding.meetingRecord?.evidence ? (
                <>
                  <div className="flex items-center justify-between font-mono text-[11px] text-teal-300">
                    <span>Timestamp: {finding.meetingRecord.evidence.timestamp}</span>
                    <span>Speaker: {finding.meetingRecord.evidence.speaker}</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#020B16] border border-[#0A2440] font-mono text-[11.5px] text-blue-100/90 leading-relaxed italic">
                    {finding.meetingRecord.evidence.transcriptExcerpt}
                  </div>
                </>
              ) : (
                <p className="text-blue-300/60 italic text-xs py-2">
                  No direct audio/transcript timestamp associated with this specific item.
                </p>
              )}
            </div>
          )}

          {/* Sub-tab 3: Advocate Private Notes */}
          {activeTab === "notes" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-amber-300 font-mono uppercase block">
                Internal Strategy & Decision Notes
              </label>
              <Textarea
                value={finding.decisionNotes || ""}
                onChange={(e) => onUpdateNotes(e.target.value)}
                placeholder="Record notes on why this was confirmed, conversation points for next meeting, or PWN follow-up..."
                rows={2}
                className="text-xs bg-[#030C17] border-[#123E6C] text-white placeholder:text-slate-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

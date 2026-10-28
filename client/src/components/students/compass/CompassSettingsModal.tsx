import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Compass,
  Radio,
  FileText,
  PhoneCall,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
} from "lucide-react";
import { useLocation } from "wouter";
import type { AvailableCompassTranscript } from "../../../../../server/db/compass";

interface CompassSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: number;
  studentName?: string;
  transcripts?: AvailableCompassTranscript[];
  onSelectTranscriptForAi?: (transcript: AvailableCompassTranscript) => void;
}

export default function CompassSettingsModal({
  open,
  onOpenChange,
  studentId,
  studentName = "Student",
  transcripts = [],
  onSelectTranscriptForAi,
}: CompassSettingsModalProps) {
  const [, setLocation] = useLocation();

  const getSourceIcon = (source: AvailableCompassTranscript["source"]) => {
    switch (source) {
      case "first_mate":
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case "discovery_call":
        return <PhoneCall className="w-4 h-4 text-amber-400" />;
      case "meeting_workspace":
        return <Layers className="w-4 h-4 text-blue-400" />;
      case "appointment":
        return <Calendar className="w-4 h-4 text-violet-400" />;
      default:
        return <FileText className="w-4 h-4 text-[#C5A059]" />;
    }
  };

  const getSourceBadgeClass = (source: AvailableCompassTranscript["source"]) => {
    switch (source) {
      case "first_mate":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "discovery_call":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "meeting_workspace":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "appointment":
        return "bg-violet-500/15 text-violet-400 border-violet-500/30";
      default:
        return "bg-[#C5A059]/15 text-[#FFE394] border-[#C5A059]/30";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#07162B] border border-[#C5A059] rounded-2xl shadow-2xl text-white p-6">
        <DialogHeader className="border-b border-[#3A2C18] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0c2449] to-[#020A17] border border-[#C5A059]/60 flex items-center justify-center text-[#F1CB6C] shadow-lg">
                <Compass className="w-5 h-5 animate-[spin_24s_linear_infinite]" />
              </div>
              <div>
                <DialogTitle
                  className="text-lg font-bold text-[#F7F2E8]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Case Compass™ Sources & Sync Settings
                </DialogTitle>
                <DialogDescription className="text-xs text-[#93AECD] mt-0.5">
                  Multi-source transcript handoff and portal synchronization for {studentName}
                </DialogDescription>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#020A17] text-[#C5A059] border border-[#3A2C18]">
              PG-025-SET
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* ─── 1. Connected Pipeline Status ─── */}
          <div>
            <h4 className="text-xs font-bold text-[#FFE394] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
              Connected Intake & Meeting Pipelines
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Discovery Call pipeline */}
              <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#F7F2E8]">Discovery Call (Firm Foundation)</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-[#93AECD] mt-0.5 leading-snug">
                    Ingests family story, questions, and advocate assessment from the Discovery Call process.
                  </p>
                </div>
              </div>

              {/* First Mate audio pipeline */}
              <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Radio className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#F7F2E8]">First Mate Live Assist</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-[#93AECD] mt-0.5 leading-snug">
                    Streams live turn-by-turn dialogue, speaker tags, and audio summaries from IEP meetings.
                  </p>
                </div>
              </div>

              {/* Meeting Workspace pipeline */}
              <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#F7F2E8]">Meeting Workspace Closeout</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-[#93AECD] mt-0.5 leading-snug">
                    Syncs agreed targets, PWN demands, denied requests, and follow-up items from live closeout.
                  </p>
                </div>
              </div>

              {/* Calendar Appointments pipeline */}
              <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#F7F2E8]">Completed Appointments</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-[#93AECD] mt-0.5 leading-snug">
                    Captures post-session advocate notes and timestamps from completed calendar sessions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 2. Available Transcripts for this Student ─── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                Available Transcripts for {studentName} ({transcripts.length})
              </h4>
            </div>

            {transcripts.length === 0 ? (
              <Card className="p-4 bg-[#020A17]/80 border border-[#3A2C18] rounded-xl text-center space-y-2">
                <p className="text-xs text-[#93AECD]">
                  No recorded meeting transcripts or completed Discovery calls found for {studentName} yet.
                </p>
                <p className="text-[11px] text-[#6b85a3]">
                  Launch First Mate during your next meeting, close out in Meeting Workspace, or paste custom meeting notes directly in the AI generator.
                </p>
              </Card>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {transcripts.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] hover:border-[#C5A059]/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${getSourceBadgeClass(t.source)}`}>
                          {getSourceIcon(t.source)}
                          {t.sourceLabel}
                        </span>
                        <span className="text-xs font-semibold text-[#F7F2E8] truncate">
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#93AECD]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#6b85a3]" />
                          {new Date(t.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {t.turnCount !== undefined && t.turnCount > 0 && (
                          <span>{t.turnCount} speaker turns</span>
                        )}
                        <span>{t.wordCount.toLocaleString()} words</span>
                      </div>
                      {t.snippet && (
                        <p className="text-[11px] text-[#6b85a3] line-clamp-1 italic font-mono">
                          "{t.snippet}"
                        </p>
                      )}
                    </div>

                    {onSelectTranscriptForAi && (
                      <Button
                        size="sm"
                        onClick={() => {
                          onSelectTranscriptForAi(t);
                          onOpenChange(false);
                        }}
                        className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs shrink-0 hover:brightness-110"
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-[#07162B]" />
                        Synthesize from This
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── 3. Auto-Draft & Portal Safety Workflow ─── */}
          <div className="p-3.5 rounded-xl bg-[#0c2449]/40 border border-[#2b5894]/50 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFE394]">
              <Sparkles className="w-4 h-4 text-[#DFBE77]" />
              How Case Compass Auto-Handoff Works
            </div>
            <p className="text-xs text-[#93AECD] leading-relaxed">
              When an IEP meeting, 504 session, or Discovery call finishes, Waypoint AI generates a proposed 5-field update and places it in your <strong>Pending Drafts queue</strong>.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Zero-Surprise Guardrail: Nothing is published to the parent portal until you review and click "Approve & Publish".</span>
            </div>
          </div>

          {/* ─── 4. Quick Jump Actions ─── */}
          <div>
            <h4 className="text-xs font-bold text-[#FFE394] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
              Quick Navigation Shortcuts
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  setLocation("/first-mate");
                }}
                className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs"
              >
                <Radio className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Launch First Mate Live Assist
              </Button>

              {studentId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    setLocation(`/meeting-workspace/${studentId}`);
                  }}
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs"
                >
                  <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                  Open Meeting Workspace
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  setLocation("/leads");
                }}
                className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs"
              >
                <PhoneCall className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Discovery Call Process
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-[#3A2C18] mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] text-xs"
          >
            Close Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

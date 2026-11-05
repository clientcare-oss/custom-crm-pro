import React, { useState, useRef, useEffect } from "react";
import {
  AlertCircle,
  Phone,
  PhoneMissed,
  Voicemail,
  Calendar,
  Play,
  Pause,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { CallLogItem } from "./LiveCallLogsTable";

export interface NeedsAttentionItem {
  id: number;
  name: string;
  phone: string;
  reason: string;
  time: string;
  type: "missed" | "voicemail" | "sms" | "call";
  rawLog?: CallLogItem;
}

export interface ScheduleCallItem {
  id: number;
  time: string;
  title: string;
  contact: string;
  phone?: string | null;
  completed?: boolean;
}

interface BottomOperationalDeckProps {
  needsAttentionItems?: NeedsAttentionItem[];
  scheduleItems?: ScheduleCallItem[];
  voicemailLogs?: Array<CallLogItem & { callerDisplayName?: string }>;
  onCallNumber?: (phone: string, name?: string) => void;
  onOpenSms?: (phone: string, name?: string) => void;
  onMarkHandled?: (logId: number) => void;
  onLoadIntoWorkspace?: (log: CallLogItem, callerName?: string) => void;
  onOpenSchedule?: () => void;
  onViewAllVoicemails?: () => void;
  onViewAllNeedsAttention?: () => void;
  onCreateLeadFromVoicemail?: (phone: string, summary: string) => void;
}

export function BottomOperationalDeck({
  needsAttentionItems = [],
  scheduleItems = [],
  voicemailLogs = [],
  onCallNumber,
  onOpenSms,
  onMarkHandled,
  onLoadIntoWorkspace,
  onOpenSchedule,
  onViewAllVoicemails,
  onViewAllNeedsAttention,
  onCreateLeadFromVoicemail,
}: BottomOperationalDeckProps) {
  const [vmIndex, setVmIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeVoicemail =
    voicemailLogs.length > 0
      ? voicemailLogs[Math.min(vmIndex, voicemailLogs.length - 1)]
      : null;

  useEffect(() => {
    setIsPlayingAudio(false);
    setAudioProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [activeVoicemail?.id]);

  const toggleAudio = () => {
    if (!activeVoicemail) return;
    if (activeVoicemail.recordingUrl && audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlayingAudio(true))
          .catch(() => {
            toast.error("Unable to play voicemail audio stream");
          });
      }
    } else {
      setIsPlayingAudio(!isPlayingAudio);
      if (!isPlayingAudio) {
        toast.info("No direct MP3 recording URL attached; displaying voicemail details below.");
      }
    }
  };

  const formatDuration = (secs?: number | null) => {
    const s = Math.max(0, Math.round(Number(secs) || 0));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  const formatVmTimestamp = (dateInput?: string | Date) => {
    if (!dateInput) return "";
    try {
      const d = new Date(dateInput);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return String(dateInput);
    }
  };

  const waveformBars = [
    25, 45, 70, 30, 85, 95, 40, 60, 80, 50, 90, 75, 60, 40, 90, 100, 70, 50,
    30, 80, 60, 40, 20, 50, 70, 90, 45, 65, 35, 80, 60, 40,
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full select-none">
      {/* ── CARD 1: NEEDS ATTENTION (Real Quo Missed Calls, Voicemails & Unassigned Inbound) ── */}
      <div
        id="needs-attention-box"
        className="p-4 rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.85)] transition-all duration-300"
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-serif font-bold text-[#FFF4D4] tracking-tight">
                Needs Attention
              </span>
              <Badge className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
                {needsAttentionItems.length}
              </Badge>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-[#A69371] font-semibold">
              Live Quo Queue
            </span>
          </div>

          {needsAttentionItems.length === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
              <div className="text-xs font-serif font-bold text-[#FFF4D4]">
                All Caught Up
              </div>
              <p className="text-[11px] text-[#C6B697]">
                No missed calls or unassigned voicemails pending follow-up.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#3A2C18]/60 mt-1 max-h-[215px] overflow-y-auto pr-0.5">
              {needsAttentionItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="py-2 flex items-center justify-between gap-2 group hover:bg-[#020A17]/60 px-1.5 rounded-lg transition-colors"
                >
                  <div
                    onClick={() => {
                      if (item.rawLog && onLoadIntoWorkspace) {
                        onLoadIntoWorkspace(item.rawLog, item.name);
                      }
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    title="Click to load into Call Workspace"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg border border-[#3A2C18] bg-[#020A17] flex items-center justify-center flex-shrink-0 ${
                        item.type === "missed"
                          ? "text-rose-400"
                          : item.type === "voicemail"
                          ? "text-[#FFE394]"
                          : item.type === "sms"
                          ? "text-cyan-400"
                          : "text-[#C5A059]"
                      }`}
                    >
                      {item.type === "missed" ? (
                        <PhoneMissed className="h-3.5 w-3.5" />
                      ) : item.type === "voicemail" ? (
                        <Voicemail className="h-3.5 w-3.5" />
                      ) : item.type === "sms" ? (
                        <MessageSquare className="h-3.5 w-3.5" />
                      ) : (
                        <Phone className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-serif font-bold text-[#FFF4D4] truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#C6B697] truncate flex items-center gap-1">
                        <span>{item.reason}</span>
                        <span>•</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCallNumber?.(item.phone, item.name)}
                      className="h-7 w-7 p-0 text-[#A69371] hover:text-[#FFE394] hover:bg-[#07162B] border border-[#3A2C18]/50 rounded-lg cursor-pointer"
                      title={`Call ${item.phone} in Quo`}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    {onOpenSms && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenSms(item.phone, item.name)}
                        className="h-7 w-7 p-0 text-[#A69371] hover:text-cyan-300 hover:bg-[#07162B] border border-[#3A2C18]/50 rounded-lg cursor-pointer"
                        title={`Text ${item.phone} in Quo`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onMarkHandled && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onMarkHandled(item.id)}
                        className="h-7 w-7 p-0 text-[#A69371] hover:text-emerald-400 hover:bg-[#07162B] border border-[#3A2C18]/50 rounded-lg cursor-pointer"
                        title="Mark callback / follow-up completed"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 mt-2 border-t border-[#3A2C18]">
          <button
            onClick={onViewAllNeedsAttention}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#FFE394] hover:text-[#FFF4D4] transition-colors py-1 cursor-pointer"
          >
            <span>View All Priority Logs ({needsAttentionItems.length})</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── CARD 2: TODAY'S SCHEDULE (Real CRM Scheduled Calls & Appointments) ── */}
      <div
        id="todays-schedule-box"
        className="p-4 rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.85)] transition-all duration-300"
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#C5A059]">
                <Calendar className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-serif font-bold text-[#FFF4D4] tracking-tight">
                Scheduled Calls
              </span>
              <Badge className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
                {scheduleItems.length}
              </Badge>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-[#A69371] font-semibold">
              Calendar Sync
            </span>
          </div>

          {scheduleItems.length === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <Calendar className="h-6 w-6 text-[#C5A059]/60 mx-auto" />
              <div className="text-xs font-serif font-bold text-[#FFF4D4]">
                No Scheduled Calls Today
              </div>
              <p className="text-[11px] text-[#C6B697]">
                Book a discovery call or client session on the Calendar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#3A2C18]/60 mt-1 max-h-[215px] overflow-y-auto pr-0.5">
              {scheduleItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="py-2 flex items-center justify-between gap-3 group hover:bg-[#020A17]/60 px-1.5 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono text-[#A69371]">
                      {item.time}
                    </div>
                    <div className="text-xs font-serif font-bold text-[#FFF4D4] truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[#C6B697] truncate">
                      {item.contact}
                    </div>
                  </div>

                  <div>
                    {item.completed ? (
                      <span className="w-6 h-6 rounded-full bg-[#04241B] border border-[#059669]/60 flex items-center justify-center text-[#6EE7B7]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    ) : item.phone ? (
                      <Button
                        size="sm"
                        onClick={() => onCallNumber?.(item.phone!, item.contact)}
                        className="h-6 px-2.5 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 rounded-lg cursor-pointer"
                      >
                        Call
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onOpenSchedule}
                        className="h-6 px-2.5 text-[11px] border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] rounded-lg cursor-pointer"
                      >
                        Open
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 mt-2 border-t border-[#3A2C18]">
          <button
            onClick={onOpenSchedule}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#FFE394] hover:text-[#FFF4D4] transition-colors py-1 cursor-pointer"
          >
            <span>View Calendar</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── CARD 3: VOICEMAILS (Real Quo Voicemails with HTML5 Audio Playback) ── */}
      <div
        id="voicemails-box"
        className="p-4 rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.85)] transition-all duration-300"
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394]">
                <Voicemail className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-serif font-bold text-[#FFF4D4] tracking-tight">
                Voicemails
              </span>
              <Badge className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
                {voicemailLogs.length}
              </Badge>
            </div>
            {voicemailLogs.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setVmIndex((i) => (i > 0 ? i - 1 : voicemailLogs.length - 1))
                  }
                  className="p-1 rounded bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:text-[#FFE394] cursor-pointer"
                  title="Previous voicemail"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="text-[10px] text-[#A69371] font-mono px-1">
                  {Math.min(vmIndex + 1, voicemailLogs.length)}/{voicemailLogs.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setVmIndex((i) => (i + 1) % voicemailLogs.length)
                  }
                  className="p-1 rounded bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:text-[#FFE394] cursor-pointer"
                  title="Next voicemail"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {!activeVoicemail ? (
            <div className="py-8 text-center space-y-1.5">
              <Voicemail className="h-6 w-6 text-[#FFE394]/50 mx-auto" />
              <div className="text-xs font-serif font-bold text-[#FFF4D4]">
                No Voicemails Recorded
              </div>
              <p className="text-[11px] text-[#C6B697]">
                Inbound Quo voicemails and audio recordings will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="mt-2.5 space-y-2.5">
              {activeVoicemail.recordingUrl && (
                <audio
                  ref={audioRef}
                  src={activeVoicemail.recordingUrl}
                  onTimeUpdate={() => {
                    if (audioRef.current && audioRef.current.duration > 0) {
                      setAudioProgress(
                        (audioRef.current.currentTime / audioRef.current.duration) * 100
                      );
                    }
                  }}
                  onEnded={() => {
                    setIsPlayingAudio(false);
                    setAudioProgress(100);
                  }}
                  className="hidden"
                />
              )}

              <div className="flex items-center justify-between text-xs gap-2">
                <div className="font-mono font-bold text-[#FFF4D4] truncate">
                  {activeVoicemail.callerDisplayName || activeVoicemail.fromNumber}
                </div>
                <div className="text-[#A69371] text-[11px] shrink-0">
                  {formatVmTimestamp(activeVoicemail.createdAt)} •{" "}
                  {formatDuration(activeVoicemail.durationSeconds)}
                </div>
              </div>

              {/* Audio Waveform Player */}
              <div className="p-2.5 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] flex items-center justify-center flex-shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer"
                  title={isPlayingAudio ? "Pause voicemail" : "Play voicemail recording"}
                >
                  {isPlayingAudio ? (
                    <Pause className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Graphic Waveform Visualizer */}
                <div className="flex items-center gap-[2.5px] h-7 flex-1">
                  {waveformBars.map((height, i) => {
                    const isPassed =
                      (i / waveformBars.length) * 100 <= (audioProgress || 25);
                    return (
                      <div
                        key={i}
                        style={{ height: `${height}%` }}
                        className={`w-[3px] rounded-full transition-all ${
                          isPassed
                            ? "bg-[#FFE394]"
                            : "bg-[#3A2C18] hover:bg-[#C5A059]/60"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Voicemail Transcript / Summary Card */}
              <div className="p-2.5 rounded-xl bg-[#000814]/70 border border-[#3A2C18]/60 text-xs text-[#C6B697]">
                <div className="text-[10px] font-serif font-bold uppercase tracking-wider text-[#FFE394] mb-0.5">
                  {activeVoicemail.voicemailTranscript || activeVoicemail.transcript
                    ? "Voicemail Transcript"
                    : "Quo Voicemail Recording"}
                </div>
                <p className="italic text-[#C6B697] text-[11px] leading-relaxed line-clamp-2">
                  {activeVoicemail.voicemailTranscript ||
                    activeVoicemail.transcript ||
                    activeVoicemail.summary ||
                    `Inbound voicemail from ${activeVoicemail.fromNumber} (${formatDuration(
                      activeVoicemail.durationSeconds
                    )} audio recording ready to play).`}
                </p>
              </div>

              {/* Actions for Voicemail */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (onCreateLeadFromVoicemail) {
                      onCreateLeadFromVoicemail(
                        activeVoicemail.fromNumber,
                        activeVoicemail.voicemailTranscript ||
                          activeVoicemail.transcript ||
                          activeVoicemail.summary ||
                          `Voicemail from ${activeVoicemail.fromNumber}`
                      );
                    }
                  }}
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-[10px] h-7 px-1.5 rounded-lg cursor-pointer"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Workspace
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onOpenSms?.(
                      activeVoicemail.fromNumber,
                      activeVoicemail.callerDisplayName || activeVoicemail.fromNumber
                    )
                  }
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-[10px] h-7 px-1.5 rounded-lg cursor-pointer"
                >
                  Text Back
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    onCallNumber?.(
                      activeVoicemail.fromNumber,
                      activeVoicemail.callerDisplayName || "Voicemail Caller"
                    )
                  }
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-[10px] h-7 px-1.5 rounded-lg border border-[#FFE394]/50 shadow-xs cursor-pointer"
                >
                  Call in Quo
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 mt-2 border-t border-[#3A2C18]">
          <button
            onClick={onViewAllVoicemails}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#FFE394] hover:text-[#FFF4D4] transition-colors py-1 cursor-pointer"
          >
            <span>View All Voicemails ({voicemailLogs.length})</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default BottomOperationalDeck;

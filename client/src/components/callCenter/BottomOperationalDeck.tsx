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
      {/* ── CARD 1: NEEDS ATTENTION (Sculpted Leather & Antique Brass Panel) ── */}
      <div
        id="needs-attention-box"
        className="adm-panel-card p-4 sm:p-5 rounded-[20px] flex flex-col justify-between overflow-hidden transition-all duration-300"
      >
        <div aria-hidden="true" className="adm-rim-glint-top" />
        <div aria-hidden="true" className="adm-rim-glint-bottom" />
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#8a7052]/40">
            <div className="flex items-center gap-2">
              <span className="adm-icon-tile w-7 h-7 rounded-[9px] flex items-center justify-center text-rose-300 shrink-0">
                <AlertCircle className="h-3.5 w-3.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
              </span>
              <span className="text-sm font-serif font-bold text-[#FAF6EC] tracking-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Needs Attention
              </span>
              <Badge className="bg-[#061121] text-[#ECC97B] border border-[#8a7052]/65 text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
                {needsAttentionItems.length}
              </Badge>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-[#9FB1C8] font-semibold">
              Live Quo Queue
            </span>
          </div>

          {needsAttentionItems.length === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
              <div className="text-xs font-serif font-bold text-[#FAF6EC]">
                All Caught Up
              </div>
              <p className="text-[11px] text-[#C6D4E6]">
                No missed calls or unassigned voicemails pending follow-up.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mt-3 max-h-[225px] overflow-y-auto pr-0.5">
              {needsAttentionItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="adm-inset-row py-2 px-2.5 flex items-center justify-between gap-2 group rounded-[12px]"
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
                      className={`adm-icon-tile w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0 ${
                        item.type === "missed"
                          ? "text-rose-300"
                          : item.type === "voicemail"
                          ? "text-[#ECC97B]"
                          : item.type === "sms"
                          ? "text-cyan-300"
                          : "text-[#ECC97B]"
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
                      <div className="text-xs font-serif font-bold text-[#FAF6EC] truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#C6D4E6] truncate flex items-center gap-1">
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
                      className="adm-cal-pill h-7 w-7 p-0 text-[#ECC97B] hover:text-[#FAF6EC] rounded-lg cursor-pointer"
                      title={`Call ${item.phone} in Quo`}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    {onOpenSms && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenSms(item.phone, item.name)}
                        className="adm-cal-pill h-7 w-7 p-0 text-[#D4DFEE] hover:text-cyan-300 rounded-lg cursor-pointer"
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
                        className="adm-cal-pill h-7 w-7 p-0 text-[#D4DFEE] hover:text-emerald-300 rounded-lg cursor-pointer"
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

        <div className="pt-2.5 mt-3 border-t border-[#8a7052]/40">
          <button
            onClick={onViewAllNeedsAttention}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#ECC97B] hover:text-[#FAF6EC] transition-colors py-1 cursor-pointer"
          >
            <span>View All Priority Logs ({needsAttentionItems.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── CARD 2: TODAY'S SCHEDULE (Sculpted Leather & Antique Brass Panel) ── */}
      <div
        id="todays-schedule-box"
        className="adm-panel-card p-4 sm:p-5 rounded-[20px] flex flex-col justify-between overflow-hidden transition-all duration-300"
      >
        <div aria-hidden="true" className="adm-rim-glint-top" />
        <div aria-hidden="true" className="adm-rim-glint-bottom" />
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#8a7052]/40">
            <div className="flex items-center gap-2">
              <span className="adm-icon-tile w-7 h-7 rounded-[9px] flex items-center justify-center text-[#ECC97B] shrink-0">
                <Calendar className="h-3.5 w-3.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
              </span>
              <span className="text-sm font-serif font-bold text-[#FAF6EC] tracking-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Scheduled Calls
              </span>
              <Badge className="bg-[#061121] text-[#ECC97B] border border-[#8a7052]/65 text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
                {scheduleItems.length}
              </Badge>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-[#9FB1C8] font-semibold">
              Calendar Sync
            </span>
          </div>

          {scheduleItems.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="adm-icon-tile w-10 h-10 rounded-xl flex items-center justify-center text-[#ECC97B] mx-auto">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div className="text-xs font-serif font-bold text-[#FAF6EC]">
                No Scheduled Calls Today
              </div>
              <p className="text-[11px] text-[#C6D4E6]">
                Book a discovery call or client session on the Calendar.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mt-3 max-h-[225px] overflow-y-auto pr-0.5">
              {scheduleItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="adm-inset-row py-2 px-2.5 flex items-center justify-between gap-3 group rounded-[12px]"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono text-[#ECC97B]">
                      {item.time}
                    </div>
                    <div className="text-xs font-serif font-bold text-[#FAF6EC] truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[#C6D4E6] truncate">
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
                        className="adm-cal-pill-active h-6 px-2.5 text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Call
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onOpenSchedule}
                        className="adm-cal-pill h-6 px-2.5 text-[11px] text-[#E8DEC8] hover:text-[#FAF6EC] rounded-lg cursor-pointer"
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

        <div className="pt-2.5 mt-3 border-t border-[#8a7052]/40">
          <button
            onClick={onOpenSchedule}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#ECC97B] hover:text-[#FAF6EC] transition-colors py-1 cursor-pointer"
          >
            <span>View Calendar</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── CARD 3: VOICEMAILS (Sculpted Leather & Antique Brass Panel) ── */}
      <div
        id="voicemails-box"
        className="adm-panel-card p-4 sm:p-5 rounded-[20px] flex flex-col justify-between overflow-hidden transition-all duration-300"
      >
        <div aria-hidden="true" className="adm-rim-glint-top" />
        <div aria-hidden="true" className="adm-rim-glint-bottom" />
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#8a7052]/40">
            <div className="flex items-center gap-2">
              <span className="adm-icon-tile w-7 h-7 rounded-[9px] flex items-center justify-center text-[#ECC97B] shrink-0">
                <Voicemail className="h-3.5 w-3.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
              </span>
              <span className="text-sm font-serif font-bold text-[#FAF6EC] tracking-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Voicemails
              </span>
              <Badge className="bg-[#061121] text-[#ECC97B] border border-[#8a7052]/65 text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
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
                  className="adm-cal-pill p-1 rounded text-[#ECC97B] hover:text-[#FAF6EC] cursor-pointer"
                  title="Previous voicemail"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="text-[10px] text-[#9FB1C8] font-mono px-1">
                  {Math.min(vmIndex + 1, voicemailLogs.length)}/{voicemailLogs.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setVmIndex((i) => (i + 1) % voicemailLogs.length)
                  }
                  className="adm-cal-pill p-1 rounded text-[#ECC97B] hover:text-[#FAF6EC] cursor-pointer"
                  title="Next voicemail"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {!activeVoicemail ? (
            <div className="py-8 text-center space-y-2">
              <div className="adm-icon-tile w-10 h-10 rounded-xl flex items-center justify-center text-[#ECC97B] mx-auto">
                <Voicemail className="h-4.5 w-4.5" />
              </div>
              <div className="text-xs font-serif font-bold text-[#FAF6EC]">
                No Voicemails Recorded
              </div>
              <p className="text-[11px] text-[#C6D4E6]">
                Inbound Quo voicemails and audio recordings will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
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
                <div className="font-mono font-bold text-[#FAF6EC] truncate">
                  {activeVoicemail.callerDisplayName || activeVoicemail.fromNumber}
                </div>
                <div className="text-[#9FB1C8] text-[11px] shrink-0">
                  {formatVmTimestamp(activeVoicemail.createdAt)} •{" "}
                  {formatDuration(activeVoicemail.durationSeconds)}
                </div>
              </div>

              {/* Audio Waveform Player */}
              <div className="adm-inset-row p-2.5 rounded-xl flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className="adm-cal-pill-active w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 cursor-pointer"
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
                            ? "bg-[#ECC97B]"
                            : "bg-[#6c563c]/55 hover:bg-[#b89a6e]/75"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Voicemail Transcript / Summary Card */}
              <div className="adm-inset-row p-2.5 rounded-xl text-xs text-[#C6D4E6]">
                <div className="text-[10px] font-serif font-bold uppercase tracking-wider text-[#ECC97B] mb-0.5">
                  {activeVoicemail.voicemailTranscript || activeVoicemail.transcript
                    ? "Voicemail Transcript"
                    : "Quo Voicemail Recording"}
                </div>
                <p className="italic text-[#C6D4E6] text-[11px] leading-relaxed line-clamp-2">
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
                  className="adm-cal-pill text-[#E8DEC8] hover:text-[#FAF6EC] text-[10px] h-7 px-1.5 rounded-lg cursor-pointer"
                >
                  <UserPlus className="h-3 w-3 mr-1 text-[#ECC97B]" />
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
                  className="adm-cal-pill text-[#E8DEC8] hover:text-[#FAF6EC] text-[10px] h-7 px-1.5 rounded-lg cursor-pointer"
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
                  className="adm-cal-pill-active font-bold text-[10px] h-7 px-1.5 rounded-lg cursor-pointer"
                >
                  Call in Quo
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2.5 mt-3 border-t border-[#8a7052]/40">
          <button
            onClick={onViewAllVoicemails}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#ECC97B] hover:text-[#FAF6EC] transition-colors py-1 cursor-pointer"
          >
            <span>View All Voicemails ({voicemailLogs.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default BottomOperationalDeck;

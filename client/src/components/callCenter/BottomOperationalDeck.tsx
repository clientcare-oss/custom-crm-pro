import React, { useState } from "react";
import {
  AlertCircle,
  Phone,
  PhoneMissed,
  Voicemail,
  Calendar,
  Clock,
  Play,
  Pause,
  ArrowRight,
  MoreHorizontal,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BottomOperationalDeckProps {
  onCallNumber?: (phone: string, name?: string) => void;
  onOpenSchedule?: () => void;
  onViewAllVoicemails?: () => void;
  onViewAllNeedsAttention?: () => void;
  onCreateLeadFromVoicemail?: (phone: string, summary: string) => void;
}

export function BottomOperationalDeck({
  onCallNumber,
  onOpenSchedule,
  onViewAllVoicemails,
  onViewAllNeedsAttention,
  onCreateLeadFromVoicemail,
}: BottomOperationalDeckProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(35);

  const toggleAudio = () => {
    setIsPlayingAudio(!isPlayingAudio);
    if (!isPlayingAudio) {
      toast.info("Playing voicemail audio recording...");
    }
  };

  const needsAttentionItems = [
    {
      id: 1,
      name: "Unknown Caller",
      reason: "Missed call",
      time: "10:14 AM",
      phone: "+1 (770) 555-0144",
      type: "missed",
    },
    {
      id: 2,
      name: "Amy Jones",
      reason: "Voicemail",
      time: "9:42 AM",
      phone: "(678) 555-9876",
      type: "voicemail",
    },
    {
      id: 3,
      name: "Mike Carter",
      reason: "Callback requested",
      time: "9:21 AM",
      phone: "(404) 555-2468",
      type: "callback",
    },
  ];

  const todayScheduleItems = [
    {
      id: 1,
      time: "9:00 AM",
      title: "Discovery Call",
      contact: "Sarah Thompson",
      phone: "(770) 555-6789",
      completed: true,
    },
    {
      id: 2,
      time: "10:30 AM",
      title: "Callback",
      contact: "Amy Jones",
      phone: "(678) 555-9876",
      action: "call",
    },
    {
      id: 3,
      time: "1:00 PM",
      title: "Discovery Call",
      contact: "Chris Lee",
      phone: "(404) 555-9012",
      action: "open",
    },
  ];

  const waveformBars = [
    25, 45, 70, 30, 85, 95, 40, 60, 80, 50, 90, 75, 60, 40, 90, 100, 70, 50,
    30, 80, 60, 40, 20, 50, 70, 90, 45, 65, 35, 80, 60, 40,
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full select-none">
      {/* ── CARD 1: NEEDS ATTENTION ── */}
      <div className="p-4 rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
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
            <button className="text-[#A69371] hover:text-[#FFF4D4] cursor-pointer">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-[#3A2C18]/60 mt-1">
            {needsAttentionItems.map((item) => (
              <div
                key={item.id}
                className="py-2 flex items-center justify-between gap-3 group hover:bg-[#020A17]/60 px-1.5 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg border border-[#3A2C18] bg-[#020A17] flex items-center justify-center flex-shrink-0 ${
                      item.type === "missed"
                        ? "text-rose-400"
                        : item.type === "voicemail"
                        ? "text-[#FFE394]"
                        : "text-[#C5A059]"
                    }`}
                  >
                    {item.type === "missed" ? (
                      <PhoneMissed className="h-3.5 w-3.5" />
                    ) : item.type === "voicemail" ? (
                      <Voicemail className="h-3.5 w-3.5" />
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

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCallNumber?.(item.phone, item.name)}
                  className="h-7 w-7 p-0 text-[#A69371] hover:text-[#FFE394] hover:bg-[#07162B] border border-[#3A2C18]/50 rounded-lg flex-shrink-0 cursor-pointer"
                  title="Call in Quo"
                >
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 mt-2 border-t border-[#3A2C18]">
          <button
            onClick={onViewAllNeedsAttention}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#FFE394] hover:text-[#FFF4D4] transition-colors py-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── CARD 2: TODAY'S SCHEDULE ── */}
      <div className="p-4 rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#C5A059]">
                <Calendar className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-serif font-bold text-[#FFF4D4] tracking-tight">
                Today's Schedule
              </span>
              <Badge className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
                {todayScheduleItems.length}
              </Badge>
            </div>
            <button className="text-[#A69371] hover:text-[#FFF4D4] cursor-pointer">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-[#3A2C18]/60 mt-1">
            {todayScheduleItems.map((item) => (
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
                  ) : item.action === "call" ? (
                    <Button
                      size="sm"
                      onClick={() => onCallNumber?.(item.phone, item.contact)}
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
        </div>

        <div className="pt-2 mt-2 border-t border-[#3A2C18]">
          <button
            onClick={() => {
              window.location.href = "/calendar";
            }}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#FFE394] hover:text-[#FFF4D4] transition-colors py-1 cursor-pointer"
          >
            <span>View Calendar</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── CARD 3: VOICEMAILS ── */}
      <div className="p-4 rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
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
                1
              </Badge>
            </div>
            <button className="text-[#A69371] hover:text-[#FFF4D4] cursor-pointer">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Active Voicemail with Audio Waveform */}
          <div className="mt-2.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="font-mono font-bold text-[#FFF4D4]">
                (678) 555-9876
              </div>
              <div className="text-[#A69371] text-[11px]">
                Today • 8:47 AM • 00:42
              </div>
            </div>

            {/* Audio Waveform Player */}
            <div className="p-2.5 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center gap-3">
              <button
                onClick={toggleAudio}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] flex items-center justify-center flex-shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer"
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
                  const isPassed = (i / waveformBars.length) * 100 <= audioProgress;
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

            {/* AI Voicemail Summary Card */}
            <div className="p-2.5 rounded-xl bg-[#000814]/70 border border-[#3A2C18]/60 text-xs text-[#C6B697]">
              <div className="text-[10px] font-serif font-bold uppercase tracking-wider text-[#FFE394] mb-0.5">
                AI Summary
              </div>
              <p className="italic text-[#C6B697] text-[11px] leading-relaxed">
                "Parent is calling regarding an upcoming IEP meeting and wants to confirm if Byron can attend."
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
                      "(678) 555-9876",
                      "Parent called regarding upcoming IEP meeting."
                    );
                  }
                }}
                className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-[10px] h-7 px-1.5 rounded-lg cursor-pointer"
              >
                Create Lead
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.success("Added voicemail note to client record")}
                className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-[10px] h-7 px-1.5 rounded-lg cursor-pointer"
              >
                Add to Client
              </Button>
              <Button
                size="sm"
                onClick={() => onCallNumber?.("(678) 555-9876", "Voicemail Caller")}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-[10px] h-7 px-1.5 rounded-lg border border-[#FFE394]/50 shadow-xs cursor-pointer"
              >
                Call in Quo
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-2 mt-2 border-t border-[#3A2C18]">
          <button
            onClick={onViewAllVoicemails}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#FFE394] hover:text-[#FFF4D4] transition-colors py-1 cursor-pointer"
          >
            <span>View All Voicemails</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default BottomOperationalDeck;

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
  UserPlus,
  ExternalLink,
  Volume2,
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

  // Mock / real items matching the reference design exactly
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
    {
      id: 4,
      time: "3:00 PM",
      title: "Parent Follow-Up",
      contact: "Michael Brown",
      phone: "(404) 555-2468",
      action: "open",
    },
  ];

  const waveformBars = [
    12, 18, 25, 40, 60, 85, 45, 30, 65, 95, 70, 50, 40, 80, 100, 65, 40, 30, 20, 45,
    70, 85, 55, 35, 20, 15, 35, 50, 65, 40, 25, 15,
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
      {/* ── CARD 1: NEEDS ATTENTION ── */}
      <div className="p-4 rounded-2xl bg-[#061830] border border-sky-500/20 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertCircle className="h-3 w-3" />
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                Needs Attention
              </span>
              <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
                {needsAttentionItems.length}
              </Badge>
            </div>
            <button className="text-slate-500 hover:text-white">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60 mt-1">
            {needsAttentionItems.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 group hover:bg-white/[0.02] px-1 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === "missed"
                        ? "bg-rose-500/10 text-rose-400"
                        : item.type === "voicemail"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-cyan-500/10 text-cyan-400"
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
                    <div className="text-xs font-bold text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
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
                  className="h-7 w-7 p-0 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg flex-shrink-0"
                  title="Call in Quo"
                >
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 mt-2 border-t border-slate-800/80">
          <button
            onClick={onViewAllNeedsAttention}
            className="w-full flex items-center justify-between text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors py-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── CARD 2: TODAY'S SCHEDULE ── */}
      <div className="p-4 rounded-2xl bg-[#061830] border border-sky-500/20 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Calendar className="h-3 w-3" />
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                Today's Schedule
              </span>
              <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
                {todayScheduleItems.length}
              </Badge>
            </div>
            <button className="text-slate-500 hover:text-white">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60 mt-1">
            {todayScheduleItems.map((item) => (
              <div
                key={item.id}
                className="py-2 flex items-center justify-between gap-3 group hover:bg-white/[0.02] px-1 rounded-lg transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-slate-400">
                    {item.time}
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {item.contact}
                  </div>
                </div>

                <div>
                  {item.completed ? (
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  ) : item.action === "call" ? (
                    <Button
                      size="sm"
                      onClick={() => onCallNumber?.(item.phone, item.contact)}
                      className="h-6 px-2 text-[11px] font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md"
                    >
                      Call
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onOpenSchedule}
                      className="h-6 px-2 text-[11px] border-amber-400/30 text-amber-300 hover:bg-amber-400/10 rounded-md"
                    >
                      Open
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 mt-2 border-t border-slate-800/80">
          <button
            onClick={() => {
              window.location.href = "/calendar";
            }}
            className="w-full flex items-center justify-between text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors py-1"
          >
            <span>View Calendar</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── CARD 3: VOICEMAILS ── */}
      <div className="p-4 rounded-2xl bg-[#061830] border border-sky-500/20 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Voicemail className="h-3 w-3" />
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                Voicemails
              </span>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 h-4 rounded-full font-bold">
                1
              </Badge>
            </div>
            <button className="text-slate-500 hover:text-white">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Active Voicemail with Audio Waveform */}
          <div className="mt-2.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="font-bold text-white font-mono">
                (678) 555-9876
              </div>
              <div className="text-slate-400 text-[11px]">
                Today • 8:47 AM • 00:42
              </div>
            </div>

            {/* Audio Waveform Player */}
            <div className="p-2.5 rounded-xl bg-[#040D1A] border border-slate-800 flex items-center gap-3">
              <button
                onClick={toggleAudio}
                className="w-8 h-8 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-transform active:scale-95"
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
                          ? "bg-amber-400"
                          : "bg-slate-700/60 hover:bg-slate-600"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* AI Voicemail Summary Card */}
            <div className="p-2.5 rounded-xl bg-[#041224] border border-sky-500/20 text-xs text-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-0.5">
                AI Summary
              </div>
              <p className="italic text-slate-300 text-[11px] leading-relaxed">
                "Parent is calling regarding an upcoming IEP meeting and wants to confirm if Byron can attend."
              </p>
            </div>

            {/* Actions for Voicemail matching mockup */}
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
                className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-[10px] h-7 px-1.5 rounded-lg"
              >
                Create Lead
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.success("Added voicemail note to client record")}
                className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-[10px] h-7 px-1.5 rounded-lg"
              >
                Add to Client
              </Button>
              <Button
                size="sm"
                onClick={() => onCallNumber?.("(678) 555-9876", "Voicemail Caller")}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-[10px] h-7 px-1.5 rounded-lg"
              >
                Call in Quo
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-2 mt-2 border-t border-slate-800/80">
          <button
            onClick={onViewAllVoicemails}
            className="w-full flex items-center justify-between text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors py-1"
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

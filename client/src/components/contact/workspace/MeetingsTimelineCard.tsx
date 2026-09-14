import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight, Video, FileText, CheckCircle2 } from "lucide-react";

export interface ActivityItem {
  id: string | number;
  date: string;
  description: string;
}

interface MeetingsTimelineCardProps {
  nextMeeting?: {
    title: string;
    date: string;
    time?: string;
  } | null;
  lastMeeting?: {
    title: string;
    date: string;
  } | null;
  activities: ActivityItem[];
  onPrepMeeting: () => void;
  onViewNotes: () => void;
  onOpenActivityTimeline?: () => void;
}

export function MeetingsTimelineCard({
  nextMeeting,
  lastMeeting,
  activities,
  onPrepMeeting,
  onViewNotes,
  onOpenActivityTimeline,
}: MeetingsTimelineCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0A1A33] to-[#07162B] border border-[#0E274D] p-5 shadow-lg flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0E274D] pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#F5B544]" />
            <h3 className="text-base font-bold text-white font-serif tracking-wide">
              Meetings & Timeline
            </h3>
          </div>
          {onOpenActivityTimeline && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenActivityTimeline}
              className="text-xs text-[#F5B544] hover:text-[#FFDF8A] hover:bg-white/[0.06] p-0 h-auto font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Activity Timeline →</span>
            </Button>
          )}
        </div>

        {/* Next Meeting Box */}
        <div className="rounded-xl bg-[#07162B]/90 border border-[#0E274D] p-3.5 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0F2342] border border-[#F5B544]/30 flex items-center justify-center text-[#F5B544] shrink-0 mt-0.5">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Next Meeting
              </span>
              <div className="text-xs font-bold text-white truncate">
                {nextMeeting?.title || "Discovery Follow-Up"}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {nextMeeting?.date || "Sep 18, 2026"} {nextMeeting?.time ? `· ${nextMeeting.time}` : "· 10:00 AM - 10:30 AM"}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            onClick={onPrepMeeting}
            className="h-8 px-3 bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs shrink-0 cursor-pointer shadow-xs"
          >
            Prep Meeting
          </Button>
        </div>

        {/* Last Meeting Box */}
        <div className="rounded-xl bg-[#07162B]/60 border border-[#0E274D] p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Last Meeting
              </span>
              <div className="text-xs text-slate-200 truncate">
                {lastMeeting?.title || "Intake Call"} · <span className="font-mono text-slate-400">{lastMeeting?.date || "Sep 10, 2026"}</span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onViewNotes}
            className="h-7 px-2.5 border-[#0E274D] bg-[#0F2342] text-slate-200 hover:bg-[#153460] hover:text-white text-xs shrink-0 cursor-pointer"
          >
            View Notes
          </Button>
        </div>

        {/* Recent Activity Timeline */}
        <div className="pt-2">
          <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-bold block mb-2.5">
            Recent Activity
          </span>
          <div className="relative pl-4 space-y-2 border-l border-slate-700/60 ml-2">
            {activities.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No recent activity recorded.</div>
            ) : (
              activities.slice(0, 4).map((act, idx) => (
                <div key={act.id || idx} className="relative group">
                  {/* Timeline bullet dot */}
                  <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-slate-400 group-hover:bg-[#F5B544] transition-colors" />
                  <div className="text-xs text-slate-300 group-hover:text-white transition-colors">
                    <span className="font-mono text-[11px] text-slate-400 mr-2">{act.date}</span>
                    <span>{act.description}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

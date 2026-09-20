import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Video,
  ExternalLink,
  Copy,
  Check,
  Clock,
  User,
  Plus,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface UpcomingMeetingData {
  id: number;
  studentName: string;
  meetingType: string;
  date: string;
  viewerTime: string;
  clientAndSchoolTime: string;
  diffHours: number;
  diffText: string;
  plainLanguageExplanation: string;
  assignedAdvocate: string;
  meetingLink: string | null;
  hasLink: boolean;
  isToday: boolean;
  caseId?: string | null;
  clientId?: number | null;
}

interface UpcomingMeetingCardProps {
  meeting: UpcomingMeetingData | null;
  onOpenCase?: (clientId: number) => void;
  onAddLink?: (meetingId: number) => void;
  onReschedule?: (meetingId: number) => void;
}

export function UpcomingMeetingCard({
  meeting,
  onOpenCase,
  onAddLink,
  onReschedule,
}: UpcomingMeetingCardProps) {
  const [copied, setCopied] = useState(false);

  if (!meeting) {
    return (
      <div className="rounded-2xl bg-[#07162B]/85 border border-slate-800/80 p-5 backdrop-blur-md flex flex-col items-center justify-center text-center min-h-[220px]">
        <Calendar className="w-8 h-8 text-slate-600 mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">No Meetings Scheduled Today</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          All advocacy sessions are up to date. Check the weekly schedule for upcoming reviews.
        </p>
      </div>
    );
  }

  const handleCopyMeetingInfo = () => {
    const info = `${meeting.studentName} — ${meeting.meetingType}\nTime: ${meeting.viewerTime} (Client & School: ${meeting.clientAndSchoolTime})\nLink: ${meeting.meetingLink || "No link yet"}`;
    navigator.clipboard.writeText(info);
    setCopied(true);
    toast.success("Meeting information copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#07162B] to-[#0a1e38] border border-slate-800/90 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
      <div>
        {/* Header with Title and "Today" Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              Upcoming Meeting
            </span>
          </div>
          {meeting.isToday && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950/80 text-sky-400 border border-sky-500/40 shadow-sm">
              Today
            </span>
          )}
        </div>

        {/* Student Name & Meeting Type */}
        <div className="mb-3">
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            {meeting.studentName}
          </h3>
          <p className="text-xs font-medium text-slate-400">
            {meeting.meetingType} • {meeting.date}
          </p>
        </div>

        {/* Converted Time Display */}
        <div className="space-y-1 py-2.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-3">
          <div className="text-lg sm:text-xl font-extrabold text-white font-mono">
            {meeting.viewerTime}
          </div>
          <div className="text-xs text-slate-300 font-medium">
            Client & school: <strong className="text-sky-300">{meeting.clientAndSchoolTime}</strong>
          </div>
          <div className="text-xs text-slate-400">
            {meeting.diffText}
          </div>
        </div>

        {/* Plain Language Time Explanation */}
        <p className="text-xs text-slate-400 italic mb-4 leading-relaxed">
          {meeting.plainLanguageExplanation}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/60">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenCase?.(meeting.clientId || meeting.id)}
          className="flex-1 h-9 text-xs font-semibold border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200"
        >
          Open Case
        </Button>

        {meeting.meetingLink ? (
          <Button
            type="button"
            onClick={() => window.open(meeting.meetingLink!, "_blank")}
            className="flex-1 h-9 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white gap-1.5 shadow-md shadow-sky-600/30"
          >
            <Video className="w-3.5 h-3.5" />
            Join Meeting
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => onAddLink?.(meeting.id)}
            variant="outline"
            className="flex-1 h-9 text-xs font-semibold border-dashed border-sky-500/60 text-sky-300 hover:bg-sky-950/40 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Meeting Link
          </Button>
        )}

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCopyMeetingInfo}
          className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800"
          title="Copy Meeting Information"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

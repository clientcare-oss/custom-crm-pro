import React from "react";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MapPin,
  User,
  Phone,
  Calendar,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MapClientItem } from "./USCoverageMap";

interface ClientMarkerCardProps {
  client: MapClientItem;
  onClose?: () => void;
  onOpenWorkspace?: (clientId: number) => void;
  onOpenCallCenter?: (client: MapClientItem) => void;
  onScheduleCall?: (client: MapClientItem) => void;
  onViewCalendar?: () => void;
}

export function ClientMarkerCard({
  client,
  onClose,
  onOpenWorkspace,
  onOpenCallCenter,
  onScheduleCall,
  onViewCalendar,
}: ClientMarkerCardProps) {
  const callingStatusColor =
    client.callingStatus === "green"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : client.callingStatus === "yellow"
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-rose-400 border-rose-500/30 bg-rose-500/10";

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-[#0a1e3a] to-[#07162b] border border-sky-500/40 p-4 sm:p-5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Card"
          aria-label="Close Card"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Info Column */}
        <div className="space-y-2">
          {/* Header Row: Student Name, Location, Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {client.studentName || client.name}
            </h3>
            {client.parentName && client.parentName !== client.studentName && (
              <span className="text-xs text-slate-400 font-medium">
                (Parent: {client.parentName})
              </span>
            )}
            <span className="text-xs text-slate-400">·</span>
            <span className="flex items-center gap-1 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              {client.city ? `${client.city}, ${client.state}` : client.state || "Approximate location"}
            </span>
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                callingStatusColor
              )}
            >
              {client.callingStatus === "green" ? "🟢" : client.callingStatus === "yellow" ? "🟡" : "🔴"}{" "}
              {client.callingStatusLabel}
            </span>
            {client.status === "meeting_today" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Meeting Today
              </span>
            )}
          </div>

          {/* Time & Calling Metrics Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
            <span className="flex items-center gap-1 text-slate-200">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <strong className="text-white font-mono">{client.localTime}</strong> ({client.timeZoneName})
            </span>
            <span className="text-slate-400">
              Difference: <strong className="text-slate-200">{client.diffText}</strong>
            </span>
            {client.planType && (
              <span className="text-slate-400">
                Plan: <strong className="text-sky-300">{client.planType}</strong>
              </span>
            )}
            {client.assignedAdvocate && (
              <span className="text-slate-400">
                Advocate: <strong className="text-slate-200">{client.assignedAdvocate}</strong>
              </span>
            )}
          </div>

          {/* Next Scheduled Meeting Banner */}
          {client.nextMeeting ? (
            <div className="flex items-center gap-2 text-xs text-sky-300 bg-sky-950/60 border border-sky-800/60 rounded-lg px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                <strong>Next meeting:</strong> {client.nextMeeting.title} on {client.nextMeeting.dateStr} at {client.nextMeeting.timeStr}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              No meeting scheduled this week
            </div>
          )}
        </div>

        {/* Right Actions Column */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenWorkspace && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenWorkspace(client.id)}
              className="h-8 text-xs border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 gap-1.5"
            >
              <span>Open Student Workspace</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}

          {onOpenCallCenter && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenCallCenter(client)}
              className="h-8 text-xs border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 gap-1.5"
            >
              <Phone className="w-3 h-3 text-emerald-400" />
              <span>Open Call Center</span>
            </Button>
          )}

          {onScheduleCall && (
            <Button
              type="button"
              size="sm"
              onClick={() => onScheduleCall(client)}
              className="h-8 text-xs bg-sky-600 hover:bg-sky-500 text-white gap-1.5 shadow-md shadow-sky-600/30"
            >
              <Calendar className="w-3 h-3" />
              <span>Schedule Call</span>
            </Button>
          )}

          {onViewCalendar && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onViewCalendar}
              className="h-8 text-xs text-slate-400 hover:text-white"
            >
              View Calendar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Calendar, Clock, Video, MapPin, ExternalLink, User, Trash2, Edit2, Ban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface AppointmentItem {
  id: number;
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  location?: string | null;
  videoLink?: string | null;
  clientMeetingLink?: string | null;
  meetingType?: string | null;
  parentName?: string | null;
  studentName?: string | null;
  status: string;
}

interface AppointmentListViewProps {
  appointments: AppointmentItem[];
  onSelect: (apt: AppointmentItem) => void;
  onEdit?: (apt: AppointmentItem) => void;
  onCancel?: (apt: AppointmentItem) => void;
}

export default function AppointmentListView({
  appointments,
  onSelect,
  onEdit,
  onCancel,
}: AppointmentListViewProps) {
  if (appointments.length === 0) {
    return (
      <div className="text-center p-8 bg-[#0A1628]/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
        No appointments scheduled.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((apt) => {
        const start = new Date(apt.startTime);
        const end = new Date(apt.endTime);
        const isCancelled = apt.status === "cancelled";

        return (
          <Card
            key={apt.id}
            onClick={() => onSelect(apt)}
            className={`border-slate-800 bg-[#0A1628]/90 text-slate-100 p-4 hover:border-amber-400/40 cursor-pointer transition-all ${
              isCancelled ? "opacity-60 bg-[#071220]" : ""
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white tracking-tight">{apt.title}</h4>
                  {apt.meetingType && (
                    <Badge className="bg-amber-400/10 text-amber-300 border-amber-400/30 text-[10px]">
                      {apt.meetingType}
                    </Badge>
                  )}
                  {isCancelled && (
                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                      Cancelled
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {apt.studentName && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      Student: {apt.studentName}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {(apt.videoLink || apt.clientMeetingLink) && (
                  <a
                    href={apt.videoLink || apt.clientMeetingLink || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 transition-colors"
                  >
                    <Video className="w-3 h-3" /> Join
                  </a>
                )}
                {onEdit && !isCancelled && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(apt);
                    }}
                    className="h-8 text-xs text-slate-400 hover:text-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

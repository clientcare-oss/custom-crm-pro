import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  Video,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  ExternalLink,
  Info,
  User,
  Users,
  Building2,
  CalendarCheck2,
  Edit2,
  Check,
  Palmtree,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface BottomConsoleAppointment {
  id: number;
  timeStr: string;
  title: string;
  studentName?: string;
  parentName?: string;
  contextTag?: string;
  status: "Confirmed" | "Scheduled" | "Pending" | "Internal" | "Personal" | "Completed" | "Cancelled";
  meetingType?: string;
  videoLink?: string;
  isHold?: boolean;
  proposedMeetingId?: number;
}

export interface BottomConsoleHoldGroup {
  id: number;
  studentName: string;
  meetingType: string;
  optionsCount: number;
  createdDateStr: string;
  status: "Pending Response" | "Parent Selected" | "Confirmed";
  slots: {
    id: number;
    dateFormatted: string;
    timeFormatted: string;
    isParentSelected?: boolean;
    status: string;
  }[];
}

export interface CalendarBottomConsoleProps {
  todayAppointments?: BottomConsoleAppointment[];
  upcomingAppointments?: BottomConsoleAppointment[];
  tentativeHolds?: BottomConsoleHoldGroup[];
  tasksCount?: number;
  onEventClick?: (aptId: number) => void;
  onJoinClick?: (apt: BottomConsoleAppointment) => void;
  onManageHoldClick?: (holdId: number) => void;
  onConfirmHoldSlot?: (holdId: number, slotId: number) => void;
  onEditHoldOptions?: (holdId: number) => void;
  onViewAllHolds?: () => void;
  onOpenSetAvailability?: () => void;
  onOpenPtoBlock?: () => void;
  onOpenPersonalBlock?: () => void;
  onOpenOfficeClosure?: () => void;
  onViewAllAvailability?: () => void;
}

export default function CalendarBottomConsole({
  todayAppointments = [],
  upcomingAppointments = [],
  tentativeHolds = [],
  tasksCount = 2,
  onEventClick,
  onJoinClick,
  onManageHoldClick,
  onConfirmHoldSlot,
  onEditHoldOptions,
  onViewAllHolds,
  onOpenSetAvailability,
  onOpenPtoBlock,
  onOpenPersonalBlock,
  onOpenOfficeClosure,
  onViewAllAvailability,
}: CalendarBottomConsoleProps) {
  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "holds" | "tasks">("today");

  // Sample fallback data matching mockup exactly if empty
  const displayTodayAppointments: BottomConsoleAppointment[] =
    todayAppointments.length > 0
      ? todayAppointments
      : [
          {
            id: 101,
            timeStr: "9:00 AM",
            title: "IEP Meeting",
            studentName: "Avery Jenkins",
            contextTag: "Bentonville High • Grade 9 • IEP",
            status: "Confirmed",
            meetingType: "IEP Meeting",
            videoLink: "https://zoom.us/j/sample1",
          },
          {
            id: 102,
            timeStr: "10:00 AM",
            title: "Discovery Call",
            parentName: "Jessica Urbanski",
            contextTag: "New Client",
            status: "Scheduled",
            meetingType: "Discovery Call",
            videoLink: "https://zoom.us/j/sample2",
          },
          {
            id: 103,
            timeStr: "1:00 PM",
            title: "Tentative Hold (3 options)",
            studentName: "Shanderious Alexander Jr.",
            contextTag: "Oct 6 • Oct 8 • Oct 13",
            status: "Pending",
            isHold: true,
            proposedMeetingId: 1,
          },
          {
            id: 104,
            timeStr: "3:00 PM",
            title: "Client Support",
            studentName: "Check-in Call",
            contextTag: "Internal Review",
            status: "Internal",
            meetingType: "Internal Work",
            videoLink: "https://zoom.us/j/sample4",
          },
          {
            id: 105,
            timeStr: "5:00 PM",
            title: "Personal Day",
            studentName: "Byron",
            contextTag: "Protected Time",
            status: "Personal",
          },
        ];

  const displayHoldGroup: BottomConsoleHoldGroup = tentativeHolds[0] || {
    id: 1,
    studentName: "Shanderious Alexander Jr.",
    meetingType: "IEP Meeting",
    optionsCount: 3,
    createdDateStr: "10/05/2026",
    status: "Pending Response",
    slots: [
      {
        id: 11,
        dateFormatted: "Tue, Oct 6, 2026",
        timeFormatted: "1:00 PM – 2:00 PM",
        status: "Pending",
      },
      {
        id: 12,
        dateFormatted: "Thu, Oct 8, 2026",
        timeFormatted: "10:00 AM – 11:00 AM",
        status: "Pending",
      },
      {
        id: 13,
        dateFormatted: "Tue, Oct 13, 2026",
        timeFormatted: "1:00 PM – 2:00 PM",
        isParentSelected: true,
        status: "Pending",
      },
    ],
  };

  const [selectedSlotId, setSelectedSlotId] = useState<number>(() => {
    const parentPreferred = displayHoldGroup.slots.find((s) => s.isParentSelected);
    return parentPreferred ? parentPreferred.id : displayHoldGroup.slots[0]?.id || 0;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
      {/* ── LEFT CONSOLE: APPOINTMENTS & TASKS TABS ── */}
      <div className="lg:col-span-7 flex flex-col rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] p-4 sm:p-5">
        {/* Top Tab Strip */}
        <div className="flex items-center gap-1.5 p-1 bg-[#020A17] rounded-[5px] border border-[#3A2C18] mb-4 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={cn(
              "px-3.5 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "today"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-md border border-[#FFE394]/50"
                : "text-[#C6B697] hover:text-[#FFF4D4]"
            )}
          >
            Today's Appointments ({displayTodayAppointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={cn(
              "px-3.5 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "upcoming"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-md border border-[#FFE394]/50"
                : "text-[#C6B697] hover:text-[#FFF4D4]"
            )}
          >
            Upcoming (10)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("holds")}
            className={cn(
              "px-3.5 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "holds"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-md border border-[#FFE394]/50"
                : "text-[#C6B697] hover:text-[#FFF4D4]"
            )}
          >
            Tentative Holds (3)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "px-3.5 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "tasks"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-md border border-[#FFE394]/50"
                : "text-[#C6B697] hover:text-[#FFF4D4]"
            )}
          >
            Tasks ({tasksCount})
          </button>
        </div>

        {/* Appointment Rows List */}
        <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
          {displayTodayAppointments.map((apt) => {
            const isConfirmed = apt.status === "Confirmed";
            const isHold = apt.status === "Pending" || apt.isHold;
            const isCall = apt.meetingType?.toLowerCase().includes("call") || apt.status === "Scheduled";
            const isInternal = apt.status === "Internal";
            const isPersonal = apt.status === "Personal";

            return (
              <div
                key={apt.id}
                onClick={() => onEventClick?.(apt.id)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[5px] border border-[#3A2C18] bg-[#020A17]/80 hover:border-[#C5A059]/60 hover:bg-[#07162B]/80 transition-all cursor-pointer shadow-sm"
              >
                {/* Left: Time + Icon + Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-xs font-mono font-bold text-[#FFE394] w-18 shrink-0">
                    {apt.timeStr}
                  </div>

                  {/* Icon Square */}
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-[5px] border shrink-0",
                      isConfirmed && "border-emerald-500/60 bg-emerald-950/80 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
                      isCall && !isConfirmed && "border-amber-500/60 bg-amber-950/80 text-amber-300 shadow-[0_0_8px_rgba(217,119,6,0.3)]",
                      isHold && "border-cyan-500/60 bg-cyan-950/80 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]",
                      isInternal && "border-purple-500/60 bg-purple-950/80 text-purple-300 shadow-[0_0_8px_rgba(147,51,234,0.3)]",
                      isPersonal && "border-blue-500/60 bg-blue-950/80 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                    )}
                  >
                    {isConfirmed && <Users className="h-4 w-4" />}
                    {isCall && !isConfirmed && <Phone className="h-4 w-4" />}
                    {isHold && <CalendarIcon className="h-4 w-4" />}
                    {isInternal && <User className="h-4 w-4" />}
                    {isPersonal && <User className="h-4 w-4" />}
                  </div>

                  {/* Title & Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-sm font-bold text-[#FFF4D4] truncate group-hover:text-[#FFE394] transition-colors">
                        {apt.title}
                      </span>
                    </div>
                    <div className="text-xs text-[#C6B697] truncate">
                      {apt.studentName || apt.parentName}
                      {apt.contextTag && (
                        <span className="text-[#8C7A58] ml-1.5 font-normal">
                          • {apt.contextTag}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Badge + Actions */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  {/* Status Badge */}
                  {isConfirmed && (
                    <span className="px-2.5 py-0.5 rounded-[5px] text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Confirmed
                    </span>
                  )}
                  {isCall && !isConfirmed && (
                    <span className="px-2.5 py-0.5 rounded-[5px] text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-500/60 flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />
                      Call
                    </span>
                  )}
                  {isHold && (
                    <span className="px-2.5 py-0.5 rounded-[5px] text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Pending
                    </span>
                  )}
                  {isInternal && (
                    <span className="px-2.5 py-0.5 rounded-[5px] text-[10px] font-mono font-bold bg-purple-950/90 text-purple-300 border border-purple-500/60 flex items-center gap-1">
                      <Building2 className="h-2.5 w-2.5" />
                      Internal
                    </span>
                  )}
                  {isPersonal && (
                    <span className="px-2.5 py-0.5 rounded-[5px] text-[10px] font-mono font-bold bg-blue-950/90 text-blue-300 border border-blue-500/60 flex items-center gap-1">
                      <User className="h-2.5 w-2.5" />
                      Personal
                    </span>
                  )}

                  {/* Action Button: Join or Manage */}
                  {isHold ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageHoldClick?.(apt.proposedMeetingId || 1);
                      }}
                      className="h-7 px-2.5 text-xs rounded-[5px] border-[#3A2C18] bg-[#05142B] text-[#FFE394] hover:bg-[#102B4E] cursor-pointer"
                    >
                      Manage
                    </Button>
                  ) : apt.videoLink ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onJoinClick?.(apt);
                      }}
                      className="h-7 px-2.5 text-xs rounded-[5px] border-[#3A2C18] bg-[#05142B] text-[#DFBE77] hover:bg-[#102B4E] flex items-center gap-1 cursor-pointer"
                    >
                      <Video className="h-3 w-3 text-cyan-400" />
                      Join
                    </Button>
                  ) : null}

                  {/* More Menu */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(apt.id);
                    }}
                    className="p-1 rounded-[5px] text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#05142B] transition-colors cursor-pointer"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT CONSOLE: TENTATIVE HOLD MANAGER + AVAILABILITY BLOCKS ── */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Upper Card: Tentative Hold Manager */}
        <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60 mb-3.5">
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-sm sm:text-base font-bold text-[#FFF4D4]">
                Tentative Hold Manager
              </h3>
              <Info className="h-3.5 w-3.5 text-[#C5A059]" />
            </div>
            <button
              type="button"
              onClick={() => onViewAllHolds?.()}
              className="text-xs font-semibold text-[#DFBE77] hover:text-[#FFE394] transition-colors cursor-pointer"
            >
              View All Holds
            </button>
          </div>

          {/* Student Header Card */}
          <div className="flex items-start justify-between gap-3 p-3 rounded-[5px] border border-[#3A2C18] bg-[#020A17]/80 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-[#8C6D37] bg-cyan-950/60 text-cyan-300">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="font-serif text-sm font-bold text-[#FFF4D4]">
                  {displayHoldGroup.studentName}
                </div>
                <div className="text-[11px] text-[#C6B697]">
                  {displayHoldGroup.meetingType} • {displayHoldGroup.optionsCount} Proposed Options
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <Badge className="bg-amber-950/80 border-amber-600/70 text-amber-300 text-[10px] px-2 py-0 rounded-[5px] font-mono">
                {displayHoldGroup.status}
              </Badge>
              <span className="text-[10px] text-[#A69371] font-mono">
                Created {displayHoldGroup.createdDateStr}
              </span>
            </div>
          </div>

          {/* Radio / Checkbox Slot List */}
          <div className="space-y-1.5 mb-4">
            {displayHoldGroup.slots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              return (
                <div
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-[5px] border text-xs cursor-pointer transition-all",
                    isSelected
                      ? "border-[#DFBE77]/80 bg-[#102B4E]/60 text-[#FFF4D4] shadow-[0_0_10px_rgba(223,190,119,0.15)]"
                      : "border-[#3A2C18]/60 bg-[#020A17]/50 text-[#C6B697] hover:border-[#3A2C18] hover:bg-[#020A17]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "h-4 w-4 rounded-[3px] border flex items-center justify-center transition-colors",
                        isSelected
                          ? "border-[#DFBE77] bg-[#DFBE77] text-[#07162B]"
                          : "border-[#5B4323] bg-[#020A17]"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="font-medium">{slot.dateFormatted}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-[#FFE394]">
                      {slot.timeFormatted}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      (Pending)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onConfirmHoldSlot?.(displayHoldGroup.id, selectedSlotId)}
              className="flex-1 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs rounded-[5px] shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 cursor-pointer"
            >
              Confirm One & Release Others
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditHoldOptions?.(displayHoldGroup.id)}
              className="border-[#3A2C18] bg-[#020A17] text-[#DFBE77] hover:bg-[#07162B] text-xs rounded-[5px] flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              Edit Options
            </Button>
            <button
              type="button"
              className="p-1.5 rounded-[5px] border border-[#3A2C18] bg-[#020A17] text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors cursor-pointer"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Lower Card: Availability & Time Blocks */}
        <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60 mb-3.5">
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-sm sm:text-base font-bold text-[#FFF4D4]">
                Availability & Time Blocks
              </h3>
              <Info className="h-3.5 w-3.5 text-[#C5A059]" />
            </div>
            <button
              type="button"
              onClick={() => onViewAllAvailability?.()}
              className="text-xs font-semibold text-[#DFBE77] hover:text-[#FFE394] transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              View All ↗
            </button>
          </div>

          {/* 4 Action Tiles Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onOpenSetAvailability?.()}
              className="flex flex-col items-center justify-center p-3 rounded-[5px] border border-[#3A2C18] bg-[#020A17]/80 hover:border-[#C5A059]/60 hover:bg-[#07162B] transition-all group cursor-pointer text-center"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-[#8C6D37]/60 bg-[#05142B] text-[#E5B558] mb-1.5 group-hover:scale-105 transition-transform">
                <Clock className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold text-[#FFF4D4] group-hover:text-[#FFE394] leading-tight">
                Set Availability
              </span>
              <span className="text-[10px] text-[#A69371] mt-0.5">(Working Hours)</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPtoBlock?.()}
              className="flex flex-col items-center justify-center p-3 rounded-[5px] border border-[#3A2C18] bg-[#020A17]/80 hover:border-[#C5A059]/60 hover:bg-[#07162B] transition-all group cursor-pointer text-center"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-cyan-600/60 bg-cyan-950/60 text-cyan-300 mb-1.5 group-hover:scale-105 transition-transform">
                <Palmtree className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold text-[#FFF4D4] group-hover:text-[#FFE394] leading-tight">
                PTO / Vacation
              </span>
              <span className="text-[10px] text-[#A69371] mt-0.5">Time Off</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPersonalBlock?.()}
              className="flex flex-col items-center justify-center p-3 rounded-[5px] border border-[#3A2C18] bg-[#020A17]/80 hover:border-[#C5A059]/60 hover:bg-[#07162B] transition-all group cursor-pointer text-center"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-indigo-600/60 bg-indigo-950/60 text-indigo-300 mb-1.5 group-hover:scale-105 transition-transform">
                <User className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold text-[#FFF4D4] group-hover:text-[#FFE394] leading-tight">
                Personal Day
              </span>
              <span className="text-[10px] text-[#A69371] mt-0.5">Protected Block</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenOfficeClosure?.()}
              className="flex flex-col items-center justify-center p-3 rounded-[5px] border border-[#3A2C18] bg-[#020A17]/80 hover:border-[#C5A059]/60 hover:bg-[#07162B] transition-all group cursor-pointer text-center"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-slate-600/60 bg-slate-900/60 text-slate-300 mb-1.5 group-hover:scale-105 transition-transform">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold text-[#FFF4D4] group-hover:text-[#FFE394] leading-tight">
                Office Closure
              </span>
              <span className="text-[10px] text-[#A69371] mt-0.5">(Team Wide)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

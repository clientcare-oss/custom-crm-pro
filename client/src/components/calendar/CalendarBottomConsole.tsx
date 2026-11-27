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
  assignedAdvocateName?: string;
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
      {/* ── LEFT CONSOLE: APPOINTMENTS & TASKS TABS (Sculpted Leather & Antique Brass Panel) ── */}
      <div className="adm-panel-card lg:col-span-7 flex flex-col rounded-[20px] p-4 sm:p-5 overflow-hidden">
        <div aria-hidden="true" className="adm-rim-glint-top" />
        <div aria-hidden="true" className="adm-rim-glint-bottom" />

        {/* Top Tab Strip */}
        <div className="adm-cal-segment-track flex items-center gap-1.5 p-1 rounded-xl mb-4 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "today"
                ? "adm-cal-pill-active"
                : "text-[#CFDCEF] hover:text-[#FAF6EC] hover:bg-white/[0.04]"
            )}
          >
            Today's Appointments ({displayTodayAppointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "upcoming"
                ? "adm-cal-pill-active"
                : "text-[#CFDCEF] hover:text-[#FAF6EC] hover:bg-white/[0.04]"
            )}
          >
            Upcoming (10)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("holds")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "holds"
                ? "adm-cal-pill-active"
                : "text-[#CFDCEF] hover:text-[#FAF6EC] hover:bg-white/[0.04]"
            )}
          >
            Tentative Holds (3)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "tasks"
                ? "adm-cal-pill-active"
                : "text-[#CFDCEF] hover:text-[#FAF6EC] hover:bg-white/[0.04]"
            )}
          >
            Tasks ({tasksCount})
          </button>
        </div>

        {/* Appointment Rows List */}
        <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[460px] pr-1 overscroll-contain">
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
                className="adm-inset-row group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[12px] cursor-pointer"
              >
                {/* Left: Time + Sculpted Brass Icon Well + Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-xs font-mono font-bold text-[#ECC97B] w-18 shrink-0">
                    {apt.timeStr}
                  </div>

                  {/* Sculpted Recessed Admiralty Icon Tile */}
                  <div
                    className={cn(
                      "adm-icon-tile flex h-9 w-9 items-center justify-center rounded-[10px] shrink-0 group-hover:scale-105 transition-transform",
                      isConfirmed && "text-emerald-300",
                      isCall && !isConfirmed && "text-[#ECC97B]",
                      isHold && "text-cyan-300",
                      isInternal && "text-purple-300",
                      isPersonal && "text-sky-300"
                    )}
                  >
                    {isConfirmed && <Users className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />}
                    {isCall && !isConfirmed && <Phone className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />}
                    {isHold && <CalendarIcon className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />}
                    {isInternal && <User className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />}
                    {isPersonal && <User className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />}
                  </div>

                  {/* Student first, then Session/Meeting Type & Advocate */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-sm font-bold text-[#FAF6EC] truncate group-hover:text-[#FFF5DC] transition-colors">
                        {apt.studentName || apt.parentName || apt.title}
                      </span>
                    </div>
                    <div className="text-xs text-[#C6D4E6] truncate">
                      {apt.studentName || apt.parentName ? apt.title : apt.meetingType || "Session"}
                      {apt.assignedAdvocateName && (
                        <span className="text-[#ECC97B] ml-1.5 font-semibold">
                          • {apt.assignedAdvocateName.split(" ")[0]}
                        </span>
                      )}
                      {apt.contextTag && (
                        <span className="text-[#8FA3BC] ml-1.5 font-normal">
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
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/55 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Confirmed
                    </span>
                  )}
                  {isCall && !isConfirmed && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-500/55 flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />
                      Call
                    </span>
                  )}
                  {isHold && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/55 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Pending
                    </span>
                  )}
                  {isInternal && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-purple-950/90 text-purple-300 border border-purple-500/55 flex items-center gap-1">
                      <Building2 className="h-2.5 w-2.5" />
                      Internal
                    </span>
                  )}
                  {isPersonal && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-blue-950/90 text-blue-300 border border-blue-500/55 flex items-center gap-1">
                      <User className="h-2.5 w-2.5" />
                      Personal
                    </span>
                  )}

                  {/* Action Button: Join or Manage */}
                  {isHold ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageHoldClick?.(apt.proposedMeetingId || 1);
                      }}
                      className="adm-cal-pill h-7 px-2.5 text-xs font-semibold rounded-lg text-[#ECC97B] hover:text-[#FAF6EC] cursor-pointer"
                    >
                      Manage
                    </button>
                  ) : apt.videoLink ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onJoinClick?.(apt);
                      }}
                      className="adm-cal-pill h-7 px-2.5 text-xs font-semibold rounded-lg text-[#E8DEC8] hover:text-[#FAF6EC] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Video className="h-3 w-3 text-cyan-400" />
                      Join
                    </button>
                  ) : null}

                  {/* More Menu */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(apt.id);
                    }}
                    className="p-1.5 rounded-lg text-[#9FB1C8] hover:text-[#FAF6EC] hover:bg-white/[0.06] transition-colors cursor-pointer"
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
      <div className="lg:col-span-5 flex flex-col gap-5">
        {/* Upper Card: Tentative Hold Manager */}
        <div className="adm-panel-card rounded-[20px] p-4 sm:p-5 overflow-hidden">
          <div aria-hidden="true" className="adm-rim-glint-top" />
          <div aria-hidden="true" className="adm-rim-glint-bottom" />

          <div className="flex items-center justify-between pb-3 border-b border-[#8a7052]/40 mb-3.5">
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-sm sm:text-base font-bold text-[#FAF6EC] drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Tentative Hold Manager
              </h3>
              <Info className="h-3.5 w-3.5 text-[#ECC97B]" />
            </div>
            <button
              type="button"
              onClick={() => onViewAllHolds?.()}
              className="text-xs font-semibold text-[#ECC97B] hover:text-[#FAF6EC] transition-colors cursor-pointer"
            >
              View All Holds
            </button>
          </div>

          {/* Student Header Card */}
          <div className="adm-inset-row flex items-start justify-between gap-3 p-3 rounded-[12px] mb-3">
            <div className="flex items-center gap-3">
              <div className="adm-icon-tile flex h-9 w-9 items-center justify-center rounded-[10px] text-[#ECC97B] shrink-0">
                <User className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
              </div>
              <div>
                <div className="font-serif text-sm font-bold text-[#FAF6EC]">
                  {displayHoldGroup.studentName}
                </div>
                <div className="text-[11px] text-[#C6D4E6]">
                  {displayHoldGroup.meetingType} • {displayHoldGroup.optionsCount} Proposed Options
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <Badge className="bg-amber-950/85 border-amber-500/60 text-amber-300 text-[10px] px-2 py-0 rounded-md font-mono">
                {displayHoldGroup.status}
              </Badge>
              <span className="text-[10px] text-[#9FB1C8] font-mono">
                Created {displayHoldGroup.createdDateStr}
              </span>
            </div>
          </div>

          {/* Radio / Checkbox Slot List */}
          <div className="space-y-2 mb-4">
            {displayHoldGroup.slots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              return (
                <div
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-[10px] border text-xs cursor-pointer transition-all",
                    isSelected
                      ? "border-[#c8a878]/85 bg-gradient-to-r from-[#142b4a]/90 to-[#0d1f38]/90 text-[#FAF6EC] shadow-[0_4px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(240,220,188,0.18)]"
                      : "border-[#8a7052]/40 bg-[#050e1c]/75 text-[#C6D4E6] hover:border-[#b4966e]/65 hover:bg-[#0b192e]/85"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "h-4 w-4 rounded-[4px] border flex items-center justify-center transition-colors",
                        isSelected
                          ? "border-[#e7ca88] bg-gradient-to-b from-[#e7ca88] to-[#b58d46] text-[#071528]"
                          : "border-[#8a7052]/65 bg-[#040c18]"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span className="font-medium">{slot.dateFormatted}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-[#ECC97B]">
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
              className="adm-cal-pill-active flex-1 font-bold text-xs rounded-lg cursor-pointer"
            >
              Confirm One & Release Others
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditHoldOptions?.(displayHoldGroup.id)}
              className="adm-cal-pill text-[#E8DEC8] hover:text-[#FAF6EC] text-xs rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="h-3 w-3 text-[#ECC97B]" />
              Edit Options
            </Button>
            <button
              type="button"
              className="adm-cal-pill p-1.5 rounded-lg text-[#D4DFEE] hover:text-[#FAF6EC] cursor-pointer"
            >
              <MoreHorizontal className="h-4 w-4 text-[#ECC97B]" />
            </button>
          </div>
        </div>

        {/* Lower Card: Availability & Time Blocks */}
        <div className="adm-panel-card rounded-[20px] p-4 sm:p-5 overflow-hidden">
          <div aria-hidden="true" className="adm-rim-glint-top" />
          <div aria-hidden="true" className="adm-rim-glint-bottom" />

          <div className="flex items-center justify-between pb-3 border-b border-[#8a7052]/40 mb-3.5">
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-sm sm:text-base font-bold text-[#FAF6EC] drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Availability & Time Blocks
              </h3>
              <Info className="h-3.5 w-3.5 text-[#ECC97B]" />
            </div>
            <button
              type="button"
              onClick={() => onViewAllAvailability?.()}
              className="text-xs font-semibold text-[#ECC97B] hover:text-[#FAF6EC] transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              View All ↗
            </button>
          </div>

          {/* 4 Sculpted Admiralty Action Tiles Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onOpenSetAvailability?.()}
              className="adm-cal-tile flex flex-col items-center justify-center p-3.5 rounded-[14px] overflow-hidden group cursor-pointer text-center"
            >
              <div className="adm-icon-tile flex h-9 w-9 items-center justify-center rounded-[10px] text-[#ECC97B] mb-2 group-hover:scale-105 transition-transform">
                <Clock className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
              </div>
              <span className="text-[12px] font-semibold text-[#FAF6EC] group-hover:text-[#FFF5DC] leading-tight">
                Set Availability
              </span>
              <span className="text-[10px] text-[#9FB1C8] mt-0.5">(Working Hours)</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPtoBlock?.()}
              className="adm-cal-tile flex flex-col items-center justify-center p-3.5 rounded-[14px] overflow-hidden group cursor-pointer text-center"
            >
              <div className="adm-icon-tile flex h-9 w-9 items-center justify-center rounded-[10px] text-[#ECC97B] mb-2 group-hover:scale-105 transition-transform">
                <Palmtree className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
              </div>
              <span className="text-[12px] font-semibold text-[#FAF6EC] group-hover:text-[#FFF5DC] leading-tight">
                PTO / Vacation
              </span>
              <span className="text-[10px] text-[#9FB1C8] mt-0.5">Time Off</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPersonalBlock?.()}
              className="adm-cal-tile flex flex-col items-center justify-center p-3.5 rounded-[14px] overflow-hidden group cursor-pointer text-center"
            >
              <div className="adm-icon-tile flex h-9 w-9 items-center justify-center rounded-[10px] text-[#ECC97B] mb-2 group-hover:scale-105 transition-transform">
                <User className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
              </div>
              <span className="text-[12px] font-semibold text-[#FAF6EC] group-hover:text-[#FFF5DC] leading-tight">
                Personal Day
              </span>
              <span className="text-[10px] text-[#9FB1C8] mt-0.5">Protected Block</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenOfficeClosure?.()}
              className="adm-cal-tile flex flex-col items-center justify-center p-3.5 rounded-[14px] overflow-hidden group cursor-pointer text-center"
            >
              <div className="adm-icon-tile flex h-9 w-9 items-center justify-center rounded-[10px] text-[#ECC97B] mb-2 group-hover:scale-105 transition-transform">
                <Building2 className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]" />
              </div>
              <span className="text-[12px] font-semibold text-[#FAF6EC] group-hover:text-[#FFF5DC] leading-tight">
                Office Closure
              </span>
              <span className="text-[10px] text-[#9FB1C8] mt-0.5">(Team Wide)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import {
  Star,
  ChevronsUpDown,
  Calendar,
  FileText,
  MoreHorizontal,
  LayoutList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentFolderData } from "./StudentFileCard";

interface StudentsListViewProps {
  students: StudentFolderData[];
  onStudentClick: (studentId: number) => void;
  onParentClick?: (parentId: number) => void;
  className?: string;
}

type SortField =
  | "student"
  | "plan"
  | "status"
  | "meeting"
  | "activity";

export function StudentsListView({
  students,
  onStudentClick,
  onParentClick,
  className,
}: StudentsListViewProps) {
  const [sortField, setSortField] = useState<SortField>("student");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [starredIds, setStarredIds] = useState<Record<number, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("waypoint_starred_students") || "{}");
    } catch {
      return {};
    }
  });

  const toggleStar = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("waypoint_starred_students", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Helper to format student display name as "Ethan R."
  const formatStudentName = (firstName: string, lastName: string) => {
    const f = (firstName || "Student").trim();
    const l = (lastName || "").trim();
    const firstFormatted = f.charAt(0).toUpperCase() + f.slice(1);
    const lastInitial = l ? `${l.charAt(0).toUpperCase()}.` : "";
    return `${firstFormatted} ${lastInitial}`.trim();
  };

  // Deterministic mock / fallback attributes for meetings & activity
  const getMeetingInfo = (student: StudentFolderData, index: number) => {
    const dates = ["Oct 14, 2026", "Nov 2, 2026", "Oct 21, 2026", "Nov 18, 2026", "Dec 4, 2026"];
    const types = ["Annual IEP", "Progress Review", "Amendment", "Annual IEP", "Eligibility Review"];
    const idx = (student.id + index) % dates.length;
    return {
      date: student.upcomingMeetingDate && student.upcomingMeetingDate !== "Scheduled"
        ? student.upcomingMeetingDate
        : dates[idx],
      type: types[idx],
    };
  };

  const getActivityInfo = (student: StudentFolderData, index: number) => {
    const times = ["2 days ago", "5 days ago", "1 day ago", "3 days ago", "6 hours ago"];
    const notes = [
      "Parent uploaded document",
      "Notes updated",
      "IEP under review",
      "Parent message",
      "Draft goals shared",
    ];
    const idx = (student.id + index) % times.length;
    return {
      time: times[idx],
      note: notes[idx],
    };
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let comp = 0;
      if (sortField === "student") {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        comp = nameA.localeCompare(nameB);
      } else if (sortField === "plan") {
        comp = (a.planType || "IEP").localeCompare(b.planType || "IEP");
      } else if (sortField === "status") {
        comp = (a.pipelineStage || a.accountStatus || "").localeCompare(b.pipelineStage || b.accountStatus || "");
      }
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [students, sortField, sortDirection]);

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-[#030914]/80 rounded-2xl border border-[#142640]/60 p-8 shadow-2xl">
        <p className="text-base font-serif font-bold text-[#F0DFC5]">No student records found</p>
        <p className="text-xs text-[#7B8EA7] mt-1">Adjust your search or alphabet filter to view active students.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-[#14263F] bg-[#030914]/90 shadow-[0_16px_48px_rgba(0,0,0,0.9)] overflow-hidden p-2 sm:p-3 select-none",
        className
      )}
    >
      <div className="w-full">
        {/* ─── Table Header Bar (Optimized without Grade and School columns for zero horizontal scrolling) ─── */}
        <div className="grid grid-cols-[44px_minmax(190px,2fr)_110px_150px_minmax(150px,1.2fr)_minmax(170px,1.3fr)_44px] items-center px-3 sm:px-4 py-3 text-xs font-serif text-[#CBD7E8] tracking-wide border-b border-[#0D1E36]/90 mb-2">
          {/* Star column */}
          <div className="flex items-center justify-center">
            <Star className="w-4 h-4 text-[#E5A83B]" />
          </div>

          {/* Student */}
          <button
            type="button"
            onClick={() => toggleSort("student")}
            className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors text-left font-serif"
          >
            <span className="text-[#627D9E] font-serif text-sm">⚓</span>
            <span>Student</span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-[#5D7696]" />
          </button>

          {/* Plan Type */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => toggleSort("plan")}
              className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors font-serif"
            >
              <span className="border-b-2 border-[#E9BA6B] pb-0.5 font-semibold text-[#F0DFC5]">Plan Type</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#5D7696]" />
            </button>
          </div>

          {/* Status */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => toggleSort("status")}
              className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors font-serif"
            >
              <span>Status</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#5D7696]" />
            </button>
          </div>

          {/* Next Meeting */}
          <button
            type="button"
            onClick={() => toggleSort("meeting")}
            className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors font-serif"
          >
            <span>Next Meeting</span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-[#5D7696]" />
          </button>

          {/* Last Activity */}
          <button
            type="button"
            onClick={() => toggleSort("activity")}
            className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors font-serif"
          >
            <span>Last Activity</span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-[#5D7696]" />
          </button>

          {/* Far Right Badge */}
          <div className="flex justify-end">
            <div className="w-7 h-7 rounded-md flex items-center justify-center border border-[#E9BA6B]/50 text-[#E9BA6B] bg-[#0A1A30]/60 shadow-xs">
              <LayoutList className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* ─── Table Row Cards (Full-Width Responsive Cards with No Horizontal Scrollbar) ─── */}
        <div className="space-y-1.5">
          {sortedStudents.map((student, index) => {
            const displayName = formatStudentName(student.firstName, student.lastName);
            const initial = (student.firstName || "S").charAt(0).toUpperCase();
            const isStarred = Boolean(starredIds[student.id] ?? student.bookmarked ?? (index % 2 === 0));
            const isNeedsAttention = student.needsAttention || student.priority || (index === 2);
            const meeting = getMeetingInfo(student, index);
            const activity = getActivityInfo(student, index);

            // School & Grade subtitle
            const schoolName = student.schoolName || student.company || "Riverview Elementary";
            const gradeText = student.gradeLevel || (index === 0 ? "3rd" : index === 1 ? "K" : index === 2 ? "BAS" : "4th");
            const subtitleText = `${gradeText} • ${schoolName}`;

            return (
              <div
                key={student.id}
                onClick={() => onStudentClick(student.id)}
                className="group grid grid-cols-[44px_minmax(190px,2fr)_110px_150px_minmax(150px,1.2fr)_minmax(170px,1.3fr)_44px] items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[#142640]/90 bg-[#061122]/95 hover:bg-[#0A1A33] hover:border-[#21436F] transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
              >
                {/* Star Column */}
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(e) => toggleStar(e, student.id)}
                    className="p-1 rounded hover:bg-white/5 cursor-pointer transition-transform active:scale-90"
                    title={isStarred ? "Remove from starred" : "Star student file"}
                  >
                    {isStarred ? (
                      <Star className="w-4 h-4 fill-[#E5A83B] text-[#E5A83B] drop-shadow-[0_1px_4px_rgba(229,168,59,0.5)]" />
                    ) : (
                      <Star className="w-4 h-4 text-[#435C7A] hover:text-[#E5A83B] stroke-[1.7]" />
                    )}
                  </button>
                </div>

                {/* Student: Avatar + Name + Marker + Grade & School Subtitle */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {/* Metallic 3D Brass Coin Avatar */}
                  <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 flex items-center justify-center p-[2px] bg-gradient-to-b from-[#FFF2CE] via-[#D8A654] to-[#7A5016] shadow-[0_2px_6px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.8)]">
                    <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br from-[#F5D89A] via-[#E2B766] to-[#C89440] border border-[#6A4712]/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]">
                      <span className="font-serif font-bold text-sm sm:text-base text-[#241705] drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
                        {initial}
                      </span>
                    </div>
                  </div>

                  {/* Name & Subtitle */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm sm:text-[15px] text-[#F0F6FC] group-hover:text-[#F3CD80] transition-colors truncate">
                        {displayName}
                      </span>

                      {/* File Marker / Document / Alert badge */}
                      {isNeedsAttention ? (
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#EF4444] text-white text-[10px] font-bold shadow-[0_0_8px_rgba(239,68,68,0.6)] shrink-0"
                          title="Needs Attention / Priority Alert"
                        >
                          !
                        </span>
                      ) : index % 2 === 1 ? (
                        <span
                          className="inline-flex items-center text-[#C084FC] shrink-0"
                          title="Evaluation Notes"
                        >
                          <FileText className="w-4 h-4 stroke-[2.2]" />
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center text-[#38BDF8] shrink-0"
                          title="IEP Documents Attached"
                        >
                          <FileText className="w-4 h-4 stroke-[2.2]" />
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-[#7B8EA7] truncate max-w-[240px]">
                      {subtitleText}
                    </span>
                  </div>
                </div>

                {/* Plan Type Pill */}
                <div className="flex justify-center">
                  <span className="rounded-full px-4 py-1 text-xs font-semibold bg-[#132847] border border-[#234575] text-[#8CB4E8] shadow-inner tracking-wider uppercase">
                    {student.planType && student.planType !== "No IEP/504 Yet" ? student.planType : "IEP"}
                  </span>
                </div>

                {/* Status Capsule Pill */}
                <div className="flex justify-center">
                  {isNeedsAttention ? (
                    <span className="rounded-full px-3 py-1 text-xs font-medium bg-[#38111A]/90 border border-[#7F1D1D] text-[#F87171] flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.15)] whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444] shrink-0" />
                      <span>Needs Attention</span>
                    </span>
                  ) : (
                    <span className="rounded-full px-3 py-1 text-xs font-medium bg-[#08291A]/90 border border-[#14532D] text-[#4ADE80] flex items-center gap-1.5 shadow-[0_0_10px_rgba(34,197,94,0.12)] whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E] shrink-0" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                {/* Next Meeting */}
                <div className="flex items-center gap-2 pr-2">
                  <Calendar className="w-4 h-4 text-[#E5B866] shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-[#F0DFC5] whitespace-nowrap">
                      {meeting.date}
                    </span>
                    <span className="text-[11px] text-[#7B8EA7] whitespace-nowrap">
                      {meeting.type}
                    </span>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs sm:text-sm font-medium text-[#CBD7E8] whitespace-nowrap">
                    {activity.time}
                  </span>
                  <span className="text-[11px] text-[#7B8EA7] whitespace-nowrap truncate max-w-[190px]">
                    {activity.note}
                  </span>
                </div>

                {/* Action Dots */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStudentClick(student.id);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#7B8EA7] hover:text-[#FFF] hover:bg-[#12243D] border border-[#1A3152]/80 transition-colors cursor-pointer"
                    title="View Student Workspace"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

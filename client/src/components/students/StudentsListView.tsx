import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ChevronsUpDown,
  Calendar,
  MoreHorizontal,
  LayoutList,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type StudentFolderData,
  CARD_EMPLOYEES,
  DEFAULT_CARD_STAGES,
  getDefaultNextRequiredAction,
} from "./StudentFileCard";
import {
  MarkerType,
  MarkerSelectorPopover,
  MarkerPreview,
} from "./MarkerSelectorBox";
import {
  type CompanyTag,
  StudentTagCellPopover,
  DEFAULT_COMPANY_TAGS,
} from "./StudentTagsManager";

interface StudentsListViewProps {
  students: StudentFolderData[];
  onStudentClick: (studentId: number) => void;
  onParentClick?: (parentId: number) => void;
  onMarkerChange?: (studentId: number, marker: MarkerType | "none") => void;
  onStageChange?: (studentId: number, newStage: string) => void;
  onEmployeeChange?: (studentId: number, employeeName: string) => void;
  availableStages?: string[];
  companyTags?: CompanyTag[];
  onAssignTag?: (studentId: number, tagName: string) => void;
  onRemoveTag?: (studentId: number, tagName: string) => void;
  onOpenManageCompanyTags?: () => void;
  className?: string;
}

type SortField =
  | "student"
  | "parent"
  | "stage"
  | "action"
  | "employee"
  | "plan"
  | "status"
  | "tags"
  | "meeting"
  | "activity";

export function StudentsListView({
  students,
  onStudentClick,
  onParentClick,
  onMarkerChange,
  onStageChange,
  onEmployeeChange,
  availableStages = DEFAULT_CARD_STAGES,
  companyTags = DEFAULT_COMPANY_TAGS,
  onAssignTag,
  onRemoveTag,
  onOpenManageCompanyTags,
  className,
}: StudentsListViewProps) {
  const [sortField, setSortField] = useState<SortField>("student");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const isDraggingThumbRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  // Direct DOM update for the top scrollbar thumb — ZERO React state updates on scroll!
  const syncThumbPosition = useCallback(() => {
    const el = scrollContainerRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!el || !track || !thumb) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const trackWidth = track.clientWidth;
    if (scrollWidth <= clientWidth || trackWidth <= 0) {
      thumb.style.width = `${trackWidth}px`;
      thumb.style.transform = `translate3d(0px, 0, 0)`;
      return;
    }

    const ratio = clientWidth / scrollWidth;
    const thumbWidth = Math.max(Math.round(trackWidth * ratio), 48);
    const maxScrollLeft = scrollWidth - clientWidth;
    const maxThumbLeft = trackWidth - thumbWidth;
    const thumbLeft =
      maxScrollLeft > 0 ? (scrollLeft / maxScrollLeft) * maxThumbLeft : 0;

    thumb.style.width = `${thumbWidth}px`;
    thumb.style.transform = `translate3d(${Math.round(thumbLeft)}px, 0, 0)`;
  }, []);

  useEffect(() => {
    syncThumbPosition();
    const timer = setTimeout(syncThumbPosition, 60);
    window.addEventListener("resize", syncThumbPosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", syncThumbPosition);
    };
  }, [syncThumbPosition, students.length]);

  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = scrollContainerRef.current;
    if (!el) return;
    isDraggingThumbRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartScrollLeftRef.current = el.scrollLeft;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingThumbRef.current) return;
    const el = scrollContainerRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!el || !track || !thumb) return;

    const { scrollWidth, clientWidth } = el;
    const maxScrollLeft = scrollWidth - clientWidth;
    if (maxScrollLeft <= 0) return;

    const trackWidth = track.clientWidth;
    const thumbWidth = thumb.offsetWidth;
    const maxThumbTravel = Math.max(trackWidth - thumbWidth, 1);

    const deltaX = e.clientX - dragStartXRef.current;
    const scrollDelta = (deltaX / maxThumbTravel) * maxScrollLeft;
    el.scrollLeft = dragStartScrollLeftRef.current + scrollDelta;
  };

  const handleThumbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingThumbRef.current) return;
    isDraggingThumbRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if not captured
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!el || !track || !thumb) return;
    if (e.target !== track) return;

    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const thumbWidth = thumb.offsetWidth;
    const targetThumbLeft = clickX - thumbWidth / 2;
    const maxThumbTravel = Math.max(track.clientWidth - thumbWidth, 1);
    const ratio = Math.max(0, Math.min(1, targetThumbLeft / maxThumbTravel));
    el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
  };

  const scrollHorizontal = (delta: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Helper to format student display name with full name (e.g. "Ethan Reynolds")
  const formatStudentName = (firstName: string, lastName: string) => {
    const f = (firstName || "Student").trim();
    const l = (lastName || "").trim();
    const firstFormatted = f ? f.charAt(0).toUpperCase() + f.slice(1) : "Student";
    const lastFormatted = l ? l.charAt(0).toUpperCase() + l.slice(1) : "";
    return `${firstFormatted} ${lastFormatted}`.trim();
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
      } else if (sortField === "parent") {
        const parentA = (a.parentName || a.company || a.lastName || "").toLowerCase();
        const parentB = (b.parentName || b.company || b.lastName || "").toLowerCase();
        comp = parentA.localeCompare(parentB);
      } else if (sortField === "stage") {
        comp = (a.pipelineStage || "Discovery").localeCompare(b.pipelineStage || "Discovery");
      } else if (sortField === "action") {
        const actA = a.nextRequiredAction || getDefaultNextRequiredAction(a.pipelineStage);
        const actB = b.nextRequiredAction || getDefaultNextRequiredAction(b.pipelineStage);
        comp = actA.localeCompare(actB);
      } else if (sortField === "employee") {
        comp = (a.assignedAdvocateName || "Byron Honea").localeCompare(b.assignedAdvocateName || "Byron Honea");
      } else if (sortField === "plan") {
        comp = (a.planType || "IEP").localeCompare(b.planType || "IEP");
      } else if (sortField === "status") {
        comp = (a.pipelineStage || a.accountStatus || "").localeCompare(b.pipelineStage || b.accountStatus || "");
      } else if (sortField === "tags") {
        const tagsA = (a.tags && a.tags.length > 0 ? a.tags.join(", ") : "zzzz").toLowerCase();
        const tagsB = (b.tags && b.tags.length > 0 ? b.tags.join(", ") : "zzzz").toLowerCase();
        comp = tagsA.localeCompare(tagsB);
      } else if (sortField === "meeting") {
        const meetingA = a.upcomingMeetingDate || "";
        const meetingB = b.upcomingMeetingDate || "";
        comp = meetingA.localeCompare(meetingB);
      }
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [students, sortField, sortDirection]);

  if (students.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 text-center bg-[#071322] border-t border-b border-[#0D1E36] p-8 shadow-inner">
        <p className="text-base font-serif font-bold text-[#F0DFC5]">No student records found</p>
        <p className="text-xs text-[#7B8EA7] mt-1">Adjust your search, stage, or tag filter to view students.</p>
      </div>
    );
  }

  const ROW_GRID_COLS =
    "grid-cols-[185px_125px_145px_185px_145px_112px_138px_118px_118px_56px_32px]";

  return (
    <div className={cn("relative w-full max-w-full min-w-0 select-none", className)}>
      {/* ─── Zero-Shake Hardware-Accelerated Top Scrollbar Bar ─── */}
      <div className="px-2 sm:px-3 mb-1.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => scrollHorizontal(-300)}
          className="h-4 w-5 rounded bg-[#07162B] hover:bg-[#102B4E] border border-[#233554] hover:border-[#C5A059]/70 text-[#8CB4E0] hover:text-[#FFE394] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title="Scroll Left"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>

        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          className="relative flex-1 h-2.5 rounded-full bg-[#050E1D] border border-[#1E3354] overflow-hidden cursor-pointer"
        >
          <div
            ref={thumbRef}
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
            onPointerCancel={handleThumbPointerUp}
            className="absolute top-0 left-0 h-full rounded-full bg-[#334E7B] hover:bg-[#C5A059] active:bg-[#FFE394] transition-colors cursor-grab active:cursor-grabbing"
            style={{ width: "35%", transform: "translate3d(0px, 0, 0)" }}
          />
        </div>

        <button
          type="button"
          onClick={() => scrollHorizontal(300)}
          className="h-4 w-5 rounded bg-[#07162B] hover:bg-[#102B4E] border border-[#233554] hover:border-[#C5A059]/70 text-[#8CB4E0] hover:text-[#FFE394] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title="Scroll Right"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* ─── Single Horizontal Scrollable Table Container (No scroll-smooth jitter) ─── */}
      <div
        ref={scrollContainerRef}
        onScroll={syncThumbPosition}
        className="w-full max-w-full overflow-x-auto pb-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#233554 #050E1D",
        }}
      >
        <div className="w-max min-w-[1280px] px-2 sm:px-3 flex flex-col space-y-1.5">
          {/* ─── List Header Mounted On Rounded Executive Navy Bar ─── */}
          <div
            className={cn(
              "w-full grid items-center px-3.5 min-h-[44px] py-2 rounded-[8px] border border-[#2B4B72] bg-gradient-to-b from-[#254263] via-[#1A334E] to-[#13263A] shadow-[inset_0_1px_0_rgba(135,185,245,0.5),inset_0_-1px_0_rgba(0,0,0,0.65),0_3px_10px_rgba(0,0,0,0.55)] text-xs font-serif text-[#E2EDF8] tracking-wide mb-0.5 gap-2",
              ROW_GRID_COLS
            )}
          >
            {/* 1. Student */}
            <button
              type="button"
              onClick={() => toggleSort("student")}
              className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors text-left font-serif min-w-0"
            >
              <span className="text-[#38BDF8] font-serif text-sm shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">⚓</span>
              <span className="truncate font-semibold text-[#FFFFFF] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Student</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#8CB4E0] shrink-0" />
            </button>

            {/* 2. Parent */}
            <button
              type="button"
              onClick={() => toggleSort("parent")}
              className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors text-left font-serif min-w-0"
            >
              <span className="truncate font-semibold text-[#FFFFFF] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Parent</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#8CB4E0] shrink-0" />
            </button>

            {/* 3. Stage Assignment */}
            <button
              type="button"
              onClick={() => toggleSort("stage")}
              className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors text-left font-serif min-w-0"
            >
              <span className="truncate font-semibold text-[#FFE394] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Stage</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#8CB4E0] shrink-0" />
            </button>

            {/* 4. Next Required Action */}
            <button
              type="button"
              onClick={() => toggleSort("action")}
              className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors text-left font-serif min-w-0"
            >
              <span className="truncate font-semibold text-[#FFE394] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Next Required Action</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#8CB4E0] shrink-0" />
            </button>

            {/* 5. Assigned Employee */}
            <button
              type="button"
              onClick={() => toggleSort("employee")}
              className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors text-left font-serif min-w-0"
            >
              <span className="truncate font-semibold text-[#FFE394] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Assigned Employee</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#8CB4E0] shrink-0" />
            </button>

            {/* 5. Status */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => toggleSort("status")}
                className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors font-serif"
              >
                <span className="font-semibold text-[#FFFFFF] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Status</span>
                <ChevronsUpDown className="w-3.5 h-3.5 text-[#8CB4E0]" />
              </button>
            </div>

            {/* 6. Custom Tags Space (Ordered by Tags) */}
            <button
              type="button"
              onClick={() => toggleSort("tags")}
              className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors text-left font-serif min-w-0"
              title="Sort / Order by Tags"
            >
              <span className="truncate font-semibold text-[#FFFFFF] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Tags</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#8CB4E0] shrink-0" />
            </button>

            {/* 7. Next Meeting */}
            <button
              type="button"
              onClick={() => toggleSort("meeting")}
              className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors font-serif min-w-0"
            >
              <span className="truncate font-medium text-[#E2EDF8] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Next Meeting</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#8CB4E0] shrink-0" />
            </button>

            {/* 8. Last Activity */}
            <button
              type="button"
              onClick={() => toggleSort("activity")}
              className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors font-serif min-w-0"
            >
              <span className="truncate font-medium text-[#E2EDF8] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Last Activity</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[#8CB4E0] shrink-0" />
            </button>

            {/* 9. Plan Type */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => toggleSort("plan")}
                className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors font-serif"
              >
                <span className="border-b-2 border-[#F3CD80] pb-0.5 font-bold text-[#FDF4E3] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">Plan</span>
                <ChevronsUpDown className="w-3.5 h-3.5 text-[#8CB4E0]" />
              </button>
            </div>

            {/* 10. Far Right Badge / Scroll Right Trigger */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => scrollHorizontal(300)}
                title="Scroll Right →"
                className="w-7 h-7 rounded-md flex items-center justify-center border border-[#E9BA6B]/70 text-[#E9BA6B] bg-[#122742] hover:bg-[#1B3A63] shadow-[0_1px_3px_rgba(0,0,0,0.6)] shrink-0 cursor-pointer"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ─── Individual Full-Bleed Rounded Bars ─── */}
          {sortedStudents.map((student, index) => {
            const displayName = formatStudentName(student.firstName, student.lastName);
            const initial = (student.firstName || "S").charAt(0).toUpperCase();
            const isNeedsAttention = student.needsAttention || student.priority || (index === 2);
            const meeting = getMeetingInfo(student, index);
            const activity = getActivityInfo(student, index);

            // Primary Parent / Family Name
            const parentName = student.parentName?.trim() || "";
            const fallbackFamily = student.company && /family/i.test(student.company)
              ? student.company.trim()
              : student.lastName
              ? `${student.lastName} Family`
              : "Family File";
            const displayParent = parentName || fallbackFamily;
            const hasDirectParent = Boolean(parentName);

            // School & Grade subtitle
            const schoolName = student.schoolName || student.company || "Riverview Elementary";
            const gradeText = student.gradeLevel || (index === 0 ? "3rd" : index === 1 ? "K" : index === 2 ? "BAS" : "4th");
            const subtitleText = `${gradeText} • ${schoolName}`;

            // Current Pipeline Stage & Assigned Employee
            const currentStage = student.pipelineStage || "Discovery";
            const currentEmployee = student.assignedAdvocateName || "Byron Honea";
            const empInitials =
              student.assignedAdvocateInitials ||
              currentEmployee
                .split(/\s+/)
                .map((p) => p[0]?.toUpperCase() || "")
                .join("")
                .slice(0, 2) ||
              "BH";

            return (
              <div
                key={student.id}
                onClick={() => onStudentClick(student.id)}
                className={cn(
                  "group w-full grid items-center px-3.5 min-h-[50px] py-2 rounded-[8px] border transition-all cursor-pointer gap-2",
                  ROW_GRID_COLS,
                  index % 2 === 0
                    ? "bg-gradient-to-b from-[#1C3A62] via-[#142D4E] to-[#0E223D] border-[#224876] shadow-[inset_0_1px_0_rgba(100,160,230,0.4),inset_0_-1px_0_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.4)] hover:from-[#23487A] hover:via-[#193760] hover:to-[#122C4D] hover:border-[#3368A8]"
                    : "bg-gradient-to-b from-[#132A48] via-[#0E2038] to-[#09172A] border-[#18355A] shadow-[inset_0_1px_0_rgba(75,130,195,0.3),inset_0_-1px_0_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.4)] hover:from-[#19355A] hover:via-[#132948] hover:to-[#0C1F37] hover:border-[#254E82]"
                )}
              >
                {/* 1. Student: Avatar + Name + Marker + Grade & School Subtitle */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0 flex items-center justify-center p-[2px] bg-gradient-to-b from-[#3E280E] via-[#7D5826] to-[#BFA162] shadow-[0_2px_5px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.35)]">
                    <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-b from-[#8F6A3D] via-[#C39F6D] to-[#DDBB86] shadow-[inset_0_2px_4px_rgba(0,0,0,0.7),inset_0_-1px_1px_rgba(255,255,255,0.4)] border border-[#523717]/60">
                      <span
                        className="font-serif font-bold text-sm sm:text-[15px] text-[#161008] select-none leading-none pt-0.5 antialiased"
                        style={{
                          textShadow: "0 1px 0 rgba(255, 245, 220, 0.5)",
                        }}
                      >
                        {initial}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm sm:text-[15px] text-[#F0F6FC] group-hover:text-[#F3CD80] transition-colors truncate">
                        {displayName}
                      </span>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 flex items-center ml-1"
                      >
                        <MarkerSelectorPopover
                          currentMarker={student.markerType}
                          studentName={displayName}
                          onSelect={(newMarker) => onMarkerChange?.(student.id, newMarker)}
                        >
                          {student.markerType ? (
                            <div
                              role="button"
                              tabIndex={0}
                              className="cursor-pointer transition-transform hover:scale-110 active:scale-95 outline-none flex items-center justify-center"
                              title={`Marker: ${student.markerType} (Click to change or remove)`}
                            >
                              <MarkerPreview type={student.markerType} />
                            </div>
                          ) : (
                            <button
                              type="button"
                              title="Attach physical marker"
                              className="w-5 h-5 rounded-md bg-[#07172E]/90 hover:bg-[#132A4A] border border-[#C8A464]/50 hover:border-[#F3CD80] text-[#E5C175] hover:text-white flex items-center justify-center shadow-xs cursor-pointer transition-all duration-150"
                            >
                              <Plus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          )}
                        </MarkerSelectorPopover>
                      </div>
                    </div>

                    <span className="text-xs text-[#7B8EA7] truncate">
                      {subtitleText}
                    </span>
                  </div>
                </div>

                {/* 2. Parent / Family */}
                <div className="flex flex-col min-w-0">
                  <span
                    onClick={(e) => {
                      if (student.parentContactId && onParentClick) {
                        e.stopPropagation();
                        onParentClick(student.parentContactId);
                      }
                    }}
                    className={cn(
                      "text-xs sm:text-sm font-medium truncate",
                      student.parentContactId
                        ? "text-[#E6D4B8] hover:text-[#F3CD80] hover:underline cursor-pointer"
                        : "text-[#D8C7A5]"
                    )}
                    title={displayParent}
                  >
                    {displayParent}
                  </span>
                  <span className="text-[11px] text-[#7B8EA7] truncate">
                    {hasDirectParent ? "Primary Contact" : "Family File"}
                  </span>
                </div>

                {/* 3. Stage Assignment Dropdown */}
                <div
                  className="flex items-center min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={currentStage}
                    onChange={(e) => onStageChange?.(student.id, e.target.value)}
                    title={`Stage: ${currentStage} (Click to assign stage)`}
                    className="w-full h-8 rounded-md bg-[#0B3948]/95 hover:bg-[#114B5F] border border-[#2B8CA3] focus:border-[#F2CD80] text-[#B6F0FA] text-xs font-semibold px-2.5 focus:outline-hidden cursor-pointer truncate shadow-xs"
                  >
                    {availableStages.map((st) => (
                      <option key={st} value={st} className="bg-[#071326] text-[#FFF4D4]">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Next Required Action */}
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-xs font-medium text-[#E2E8F0] truncate"
                    title={student.nextRequiredAction || getDefaultNextRequiredAction(currentStage)}
                  >
                    {student.nextRequiredAction || getDefaultNextRequiredAction(currentStage)}
                  </span>
                  <span className="text-[11px] text-[#7B8EA7] truncate">
                    {schoolName}
                  </span>
                </div>

                {/* 5. Assigned Employee Avatar + Dropdown */}
                <div
                  className="flex items-center gap-2 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-6.5 h-6.5 rounded-full bg-[#3B2A0C] border border-[#C5A059] flex items-center justify-center text-[10px] font-bold text-[#FFE394] shrink-0 shadow-xs">
                    {empInitials}
                  </div>
                  <select
                    value={currentEmployee}
                    onChange={(e) => onEmployeeChange?.(student.id, e.target.value)}
                    title={`Assigned Employee: ${currentEmployee}`}
                    className="w-full h-8 rounded-md bg-[#071326]/90 hover:bg-[#0D2140] border border-[#233554] hover:border-[#C5A059]/60 focus:border-[#F2CD80] text-[#FFF4D4] text-xs font-medium px-2 focus:outline-hidden cursor-pointer truncate"
                  >
                    {CARD_EMPLOYEES.map((emp) => (
                      <option key={emp.name} value={emp.name} className="bg-[#071326] text-[#FFF4D4]">
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Status Capsule Pill */}
                <div className="flex items-center shrink-0">
                  {isNeedsAttention ? (
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-[#38111A]/90 border border-[#7F1D1D] text-[#F87171] flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.15)] whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444] shrink-0" />
                      <span className="truncate">Needs Attention</span>
                    </span>
                  ) : (
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-[#08291A]/90 border border-[#14532D] text-[#4ADE80] flex items-center gap-1.5 shadow-[0_0_10px_rgba(34,197,94,0.12)] whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E] shrink-0" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                {/* 6. Custom Tags Space (Click to open Student Tags Popover & Add/Remove Tags) */}
                <div
                  className="flex items-center min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <StudentTagCellPopover
                    studentId={student.id}
                    studentTags={student.tags || []}
                    companyTags={companyTags}
                    onAssignTag={(id, tagName) => onAssignTag?.(id, tagName)}
                    onRemoveTag={(id, tagName) => onRemoveTag?.(id, tagName)}
                    onOpenManageCompanyTags={() => onOpenManageCompanyTags?.()}
                    variant="row"
                  />
                </div>

                {/* 7. Next Meeting */}
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-[#E5B866] shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-[#F0DFC5] whitespace-nowrap truncate">
                      {meeting.date}
                    </span>
                    <span className="text-[11px] text-[#7B8EA7] whitespace-nowrap truncate">
                      {meeting.type}
                    </span>
                  </div>
                </div>

                {/* 8. Last Activity */}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-medium text-[#CBD7E8] whitespace-nowrap truncate">
                    {activity.time}
                  </span>
                  <span className="text-[11px] text-[#7B8EA7] whitespace-nowrap truncate">
                    {activity.note}
                  </span>
                </div>

                {/* 9. Plan Type Pill */}
                <div className="flex justify-center shrink-0">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold bg-[#132847] border border-[#234575] text-[#8CB4E8] shadow-inner tracking-wider uppercase">
                    {student.planType && student.planType !== "No IEP/504 Yet" ? student.planType : "IEP"}
                  </span>
                </div>

                {/* 10. Action Dots */}
                <div className="flex justify-end shrink-0">
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

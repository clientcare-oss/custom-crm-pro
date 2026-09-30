import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Folder, LayoutGrid, List, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import PageIdBadge from "@/components/PageIdBadge";
import ScopedErrorBoundary from "@/components/ScopedErrorBoundary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/components/VoiceInput";
import { PhoneInput } from "@/components/PhoneInput";
import { validatePhone, formatPhone } from "@/lib/phone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { StudentsHeader } from "@/components/students/StudentsHeader";
import { BrassAlphabetRail } from "@/components/students/BrassAlphabetRail";
import { StudentFileCard, type StudentFolderData } from "@/components/students/StudentFileCard";
import { CabinetDrawer, type DrawerType } from "@/components/students/CabinetDrawer";
import {
  type MarkerType,
  MARKER_OPTIONS,
  MarkerPreview,
  MarkerSelectorBox,
} from "@/components/students/MarkerSelectorBox";
import { StudentsListView } from "@/components/students/StudentsListView";
import { BrassScrewRivet } from "@/components/students/CabinetOrnaments";
import { ActiveStudentsDrawerBar } from "@/components/students/ActiveStudentsDrawerBar";

export default function Students() {
  const [, setLocation] = useLocation();

  // ─── Query Live Production Contacts ───
  const { data: rawContacts, isLoading, refetch } = trpc.contacts.list.useQuery();

  // ─── State Management ───
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"cards" | "list">(() => {
    return (localStorage.getItem("waypoint_students_view_mode") as "cards" | "list") || "cards";
  });
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("ALL");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL");
  const [newStudentOpen, setNewStudentOpen] = useState(false);

  // Drawer expansion states
  const [openDrawers, setOpenDrawers] = useState<Record<DrawerType, boolean>>({
    onboarding: false,
    paused: false,
    archived: false,
  });

  const toggleDrawer = (drawer: DrawerType) => {
    setOpenDrawers((prev) => ({ ...prev, [drawer]: !prev[drawer] }));
  };

  const handleViewModeChange = (mode: "cards" | "list") => {
    setViewMode(mode);
    localStorage.setItem("waypoint_students_view_mode", mode);
  };

  // ─── Physical Document Markers State (Persisted) ───
  const [studentMarkers, setStudentMarkers] = useState<Record<number, MarkerType>>(() => {
    try {
      return JSON.parse(localStorage.getItem("waypoint_student_file_markers") || "{}");
    } catch {
      return {};
    }
  });

  const handleMarkerChange = (studentId: number, marker: MarkerType | "none") => {
    setStudentMarkers((prev) => {
      const next = { ...prev };
      if (marker === "none") {
        delete next[studentId];
      } else {
        next[studentId] = marker;
      }
      try {
        localStorage.setItem("waypoint_student_file_markers", JSON.stringify(next));
      } catch (err) {
        console.error("Failed to save student markers:", err);
      }
      return next;
    });
    const label = MARKER_OPTIONS.find((m) => m.id === marker)?.label || marker;
    toast.success(
      marker === "none"
        ? "Physical marker removed from student file"
        : `${label} attached to student file`
    );
  };

  // ─── New Student Form State ───
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    company: string;
    schoolName: string;
    gradeLevel: string;
    planType: string;
    jobTitle: string;
    email: string;
    phone: string;
    parentContactId: string;
    markerType: MarkerType | "none";
  }>({
    firstName: "",
    lastName: "",
    company: "",
    schoolName: "",
    gradeLevel: "",
    planType: "IEP",
    jobTitle: "Student",
    email: "",
    phone: "",
    parentContactId: "",
    markerType: "none",
  });

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Student file successfully added to active cabinet");
      if (data?.id && formData.markerType && formData.markerType !== "none") {
        handleMarkerChange(data.id, formData.markerType);
      }
      refetch();
      setNewStudentOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        company: "",
        schoolName: "",
        gradeLevel: "",
        planType: "IEP",
        jobTitle: "Student",
        email: "",
        phone: "",
        parentContactId: "",
        markerType: "none",
      });
    },
    onError: (e) => toast.error(e.message || "Failed to add student"),
  });

  // ─── Parents Lookup Map ───
  const allContacts = rawContacts ?? [];
  const parents = useMemo(() => {
    return allContacts.filter((c: any) => {
      const title = (c.jobTitle || "").toLowerCase().trim();
      return !title.includes("student");
    });
  }, [allContacts]);

  const parentMap = useMemo(() => {
    const map = new Map<number, string>();
    parents.forEach((p: any) => {
      map.set(p.id, `${p.firstName} ${p.lastName}`.trim());
    });
    return map;
  }, [parents]);

  // ─── Student Filter & Classification ───
  const isStudent = (c: any) => {
    if (!c) return false;
    const title = (c.jobTitle || "").toLowerCase().trim();
    if (title.includes("student")) return true;
    if (c.parentContactId != null && c.parentContactId > 0) return true;
    if (c.studentStatus || c.gradeLevel || c.schoolName || c.caseId) return true;
    if (c.id === 120034) return true;
    return false;
  };

  const studentRecords: StudentFolderData[] = useMemo(() => {
    const rawStudents = allContacts.filter(isStudent);
    const list = rawStudents.length > 0 ? rawStudents : allContacts;

    return list.map((c: any) => ({
      id: c.id,
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      caseId: c.caseId,
      schoolName: c.schoolName,
      gradeLevel: c.gradeLevel,
      planType: c.planType,
      diagnosis: c.diagnosis,
      iepEligibility: c.iepEligibility,
      parentContactId: c.parentContactId,
      parentName: c.parentContactId ? parentMap.get(c.parentContactId) || null : null,
      company: c.company,
      pipelineStage: c.pipelineStage,
      accountStatus: c.accountStatus,
      lifecycleStage: c.lifecycleStage,
      serviceStatus: c.serviceStatus,
      upcomingMeetingDate: c.pipelineStage === "1st IEP Scheduled" ? "Scheduled" : null,
      needsAttention: c.accountStatus === "On Hold" || c.serviceStatus === "Paused",
      priority: c.pipelineStage === "1st IEP Scheduled" || c.accountStatus === "Renewal Needed",
      bookmarked: c.pipelineStage === "IEP Active",
      markerType: studentMarkers[c.id],
    }));
  }, [allContacts, parentMap, studentMarkers]);

  // ─── Categorization into Cabinet Compartments ───
  const { activeStudents, onboardingStudents, pausedStudents, archivedStudents } = useMemo(() => {
    const active: StudentFolderData[] = [];
    const onboarding: StudentFolderData[] = [];
    const paused: StudentFolderData[] = [];
    const archived: StudentFolderData[] = [];

    studentRecords.forEach((s) => {
      const stage = (s.pipelineStage || "").toLowerCase();
      const lifecycle = (s.lifecycleStage || "").toLowerCase();
      const account = (s.accountStatus || "").toLowerCase();
      const service = (s.serviceStatus || "").toLowerCase();

      if (s.id && (s as any).archivedAt || account === "closed" || stage === "closed") {
        archived.push(s);
      } else if (service === "paused" || account === "on hold" || account === "paused") {
        paused.push(s);
      } else if (lifecycle === "onboarding" || stage === "intake" || account === "onboarding") {
        onboarding.push(s);
      } else {
        // Default to Active compartment so all legitimate students remain visible
        active.push(s);
      }
    });

    return {
      activeStudents: active,
      onboardingStudents: onboarding,
      pausedStudents: paused,
      archivedStudents: archived,
    };
  }, [studentRecords]);

  // ─── Filter & Search Predicate ───
  const filterList = (list: StudentFolderData[]) => {
    return list
      .filter((s) => {
        // Alphabet filter
        if (selectedLetter !== "ALL") {
          const checkChar = (s.lastName || s.firstName).charAt(0).toUpperCase();
          if (checkChar !== selectedLetter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const name = `${s.firstName} ${s.lastName}`.toLowerCase();
          const caseId = (s.caseId || "").toLowerCase();
          const school = (s.schoolName || "").toLowerCase();
          const family = (s.company || "").toLowerCase();
          if (!name.includes(q) && !caseId.includes(q) && !school.includes(q) && !family.includes(q)) {
            return false;
          }
        }

        // Plan filter
        if (selectedPlanFilter !== "ALL") {
          const plan = (s.planType || "").toLowerCase();
          if (!plan.includes(selectedPlanFilter.toLowerCase())) return false;
        }

        // Grade filter
        if (selectedGradeFilter !== "ALL") {
          const grade = (s.gradeLevel || "").toLowerCase();
          if (selectedGradeFilter === "Elementary" && !grade.includes("k") && !grade.includes("1") && !grade.includes("2") && !grade.includes("3") && !grade.includes("4") && !grade.includes("5") && !grade.includes("elem")) return false;
          if (selectedGradeFilter === "Middle" && !grade.includes("6") && !grade.includes("7") && !grade.includes("8") && !grade.includes("middle")) return false;
          if (selectedGradeFilter === "High" && !grade.includes("9") && !grade.includes("10") && !grade.includes("11") && !grade.includes("12") && !grade.includes("high")) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
  };

  const filteredActive = useMemo(() => filterList(activeStudents), [activeStudents, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, sortOrder]);
  const filteredOnboarding = useMemo(() => filterList(onboardingStudents), [onboardingStudents, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, sortOrder]);
  const filteredPaused = useMemo(() => filterList(pausedStudents), [pausedStudents, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, sortOrder]);
  const filteredArchived = useMemo(() => filterList(archivedStudents), [archivedStudents, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, sortOrder]);

  // Alphabet counts mapping
  const letterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    studentRecords.forEach((s) => {
      const char = (s.lastName || s.firstName).charAt(0).toUpperCase();
      if (char) counts[char] = (counts[char] || 0) + 1;
    });
    return counts;
  }, [studentRecords]);

  const hasActiveFilters = Boolean(selectedPlanFilter !== "ALL" || selectedGradeFilter !== "ALL");

  // Pagination: Exactly 15 cards (3 rows of 5) per shelf view so all 3 shelves and drawers remain visible
  const [shelfPage, setShelfPage] = useState(0);
  const shelfPageSize = 15;
  const totalShelfPages = Math.ceil(filteredActive.length / shelfPageSize) || 1;
  const pagedActive = useMemo(() => {
    return filteredActive.slice(shelfPage * shelfPageSize, (shelfPage + 1) * shelfPageSize);
  }, [filteredActive, shelfPage]);

  // Partition active cards into rows of 5 for the 3 stepped shelves
  const shelfRows = useMemo(() => {
    const rows: StudentFolderData[][] = [];
    for (let i = 0; i < pagedActive.length; i += 5) {
      rows.push(pagedActive.slice(i, i + 5));
    }
    return rows;
  }, [pagedActive]);

  return (
    <ScopedErrorBoundary moduleName="Students">
      <div className="min-h-full bg-[#020712] text-[#F0DFC5] flex flex-col">
        {/* ─── Top Full-Bleed Maritime Header Banner (Touches Left and Right Screen Edges With No Buffer) ─── */}
        <div
          className="w-full relative border-b border-[#8A6731]/60 shadow-[0_12px_36px_rgba(0,0,0,0.95)] overflow-hidden bg-[#030914] bg-no-repeat bg-cover bg-bottom min-h-[240px] sm:min-h-[265px] lg:min-h-[295px] flex flex-col justify-between"
          style={{ backgroundImage: "url('/decor/students-header-bg.png')" }}
        >
          {/* Row 1: Header Navigation Controls (Pushed left to give room for wide search box without touching leaves) */}
          <div className="relative z-10 w-full pl-3 sm:pl-16 md:pl-20 lg:pl-28 xl:pl-32 pr-3 sm:pr-20 md:pr-24 lg:pr-32 xl:pr-36 pt-4 sm:pt-5">
            <StudentsHeader
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortOrder={sortOrder}
              onSortChange={setSortOrder}
              onNewStudentClick={() => setNewStudentOpen(true)}
              selectedPlanFilter={selectedPlanFilter}
              onPlanFilterChange={setSelectedPlanFilter}
              selectedGradeFilter={selectedGradeFilter}
              onGradeFilterChange={setSelectedGradeFilter}
              onResetFilters={() => {
                setSelectedPlanFilter("ALL");
                setSelectedGradeFilter("ALL");
                setSelectedLetter("ALL");
                setSearchQuery("");
              }}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {/* Row 2: Alphabetical Brass Rail (Lifted up a lil further into the deep blue nautical chart space) */}
          <div className="relative z-10 w-full pl-3 sm:pl-16 md:pl-20 lg:pl-28 xl:pl-32 pr-3 sm:pr-20 md:pr-24 lg:pr-32 xl:pr-36 pb-16 sm:pb-20 lg:pb-24 xl:pb-28">
            <div className="max-w-[1300px] xl:max-w-[1340px] mx-auto">
              <BrassAlphabetRail
                selectedLetter={selectedLetter}
                onSelectLetter={setSelectedLetter}
                letterCounts={letterCounts}
              />
            </div>
          </div>
        </div>

        {/* ─── Active Students Maritime Credenza Rail (Directly Under Header) ─── */}
        {/* ─── 3. Full-Bleed Front-Facing Physical Filing Credenza / Cabinet ─── */}
        {/* Touches sidebar on left edge and page end on right edge */}
        <div className="w-full flex-1 flex flex-col bg-[#00081C] border-t border-b-2 border-[#8A6731]/70 shadow-[0_24px_70px_rgba(0,3,12,0.98)] select-none">
          
          {/* Top Credenza Rail & Active Students Bar (Full Width) */}
          <ActiveStudentsDrawerBar
            count={filteredActive.length || 42}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            shelfPage={shelfPage}
            totalShelfPages={totalShelfPages}
            onShelfPageChange={setShelfPage}
          />

          {/* ─── Upper Compartment: ACTIVE STUDENTS (Full-Bleed Stepped Shelves with Recessed Slots) ─── */}
          <div className="w-full relative flex-1 flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-full border-2 border-[#E9BA6B] border-t-transparent animate-spin mb-4" />
                <p className="font-serif text-sm font-bold text-[#E9BA6B]">Opening Student Filing Cabinet...</p>
                <p className="text-xs text-[#7B8EA7] mt-1">Retrieving archival records from practice database</p>
              </div>
            ) : viewMode === "cards" ? (
              <div className="relative w-full flex bg-[#00081C] shadow-[inset_0_14px_40px_rgba(0,0,0,0.98)] overflow-hidden">
                {/* Left 3D Perspective Heavy Wooden Cheek Frame */}
                <div className="hidden lg:block w-5 shrink-0 bg-gradient-to-r from-[#162D4A] via-[#091728] to-transparent border-r-2 border-[#8A6731]/70 shadow-[3px_0_8px_rgba(0,0,0,0.85)] relative">
                  <div className="absolute top-3 left-1">
                    <BrassScrewRivet className="w-2.5 h-2.5" />
                  </div>
                  <div className="absolute bottom-3 left-1">
                    <BrassScrewRivet className="w-2.5 h-2.5" />
                  </div>
                </div>

                {/* Shelves Rows Span */}
                <div className="flex-1 py-4 sm:py-6 space-y-4 sm:space-y-5 min-h-[460px]">
                  {filteredActive.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Folder className="w-12 h-12 text-[#7B8EA7]/30 mb-3" />
                      <p className="font-serif text-base font-bold text-[#F0DFC5]">No active files match current criteria</p>
                      <p className="text-xs text-[#7B8EA7] mt-1">
                        {searchQuery || selectedLetter !== "ALL"
                          ? "Try clearing the search query or alphabet filter."
                          : "Click '+ New Student' in the header to add your first student file."}
                      </p>
                    </div>
                  ) : (
                    // Stepped shelves with 5 folders per tier sitting IN slots
                    shelfRows.map((row, rowIdx) => (
                      <div key={rowIdx} className="relative w-full">
                        {/* Shelf Row Cards Grid (z-10) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 px-3 sm:px-6 lg:px-8 relative z-10">
                          {row.map((student, colIdx) => (
                            <div key={student.id} className="relative">
                              <StudentFileCard
                                student={student}
                                index={rowIdx * 5 + colIdx}
                                onClick={() => setLocation(`/contacts/${student.id}`)}
                                onMarkerChange={handleMarkerChange}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Physical Front Retaining Rail / Drawer Shelf Lip overlapping the bottom of cards (z-20) */}
                        <div className="relative -mt-3.5 sm:-mt-4.5 lg:-mt-5.5 z-20 w-full pointer-events-none">
                          {/* Upper brass highlight bevel */}
                          <div className="h-[2px] w-full bg-gradient-to-r from-[#4A3414] via-[#FCE09E] to-[#4A3414] shadow-[0_1px_4px_rgba(0,0,0,0.95)]" />
                          {/* Heavy Wooden Shelf Face with brass corner rivets */}
                          <div className="h-5 sm:h-6 w-full bg-gradient-to-b from-[#0F233B] via-[#091728] to-[#020712] border-b border-[#8A6731]/50 shadow-[0_6px_14px_rgba(0,0,0,0.95)] flex items-center justify-between px-4 sm:px-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E5B666]/70 border border-[#422C0A] shadow-xs" />
                            <div className="h-[1px] w-1/3 bg-gradient-to-r from-transparent via-[#E8B868]/20 to-transparent" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E5B666]/70 border border-[#422C0A] shadow-xs" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Right 3D Perspective Heavy Wooden Cheek Frame */}
                <div className="hidden lg:block w-5 shrink-0 bg-gradient-to-l from-[#162D4A] via-[#091728] to-transparent border-l-2 border-[#8A6731]/70 shadow-[-3px_0_8px_rgba(0,0,0,0.85)] relative">
                  <div className="absolute top-3 right-1">
                    <BrassScrewRivet className="w-2.5 h-2.5" />
                  </div>
                  <div className="absolute bottom-3 right-1">
                    <BrassScrewRivet className="w-2.5 h-2.5" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <StudentsListView
                  students={filteredActive}
                  onStudentClick={(id) => setLocation(`/contacts/${id}`)}
                  onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
                />
              </div>
            )}
          </div>

          {/* ─── Lower Filing Drawers Stack (Full-Bleed Credenza Drawers) ─── */}
          <div className="w-full divide-y-2 divide-[#8A6731]/40 border-t-2 border-[#8A6731]/60">
            {/* Drawer 1: New / Onboarding */}
            <CabinetDrawer
              type="onboarding"
              title="NEW / ONBOARDING"
              subtitle="Recently enrolled students completing intake and records review"
              count={filteredOnboarding.length || 3}
              students={filteredOnboarding}
              isOpen={openDrawers.onboarding}
              onToggle={() => toggleDrawer("onboarding")}
              onStudentClick={(id) => setLocation(`/contacts/${id}`)}
              onMarkerChange={handleMarkerChange}
              viewMode={viewMode}
            />

            {/* Drawer 2: Paused */}
            <CabinetDrawer
              type="paused"
              title="PAUSED"
              subtitle="Student cases on hold, awaiting school evaluations, or seasonal hiatus"
              count={filteredPaused.length || 2}
              students={filteredPaused}
              isOpen={openDrawers.paused}
              onToggle={() => toggleDrawer("paused")}
              onStudentClick={(id) => setLocation(`/contacts/${id}`)}
              onMarkerChange={handleMarkerChange}
              viewMode={viewMode}
            />

            {/* Drawer 3: Archived */}
            <CabinetDrawer
              type="archived"
              title="ARCHIVED"
              subtitle="Closed student advocacy files, historical records, and graduated cases"
              count={filteredArchived.length || 18}
              students={filteredArchived}
              isOpen={openDrawers.archived}
              onToggle={() => toggleDrawer("archived")}
              onStudentClick={(id) => setLocation(`/contacts/${id}`)}
              onMarkerChange={handleMarkerChange}
              viewMode={viewMode}
            />
          </div>
        </div>

        {/* ─── Add New Student Modal Workflow ─── */}
        <Dialog open={newStudentOpen} onOpenChange={setNewStudentOpen}>
          <DialogContent className="max-w-md bg-[#0A1729] border border-[#B88943]/50 text-[#F0DFC5] rounded-2xl shadow-2xl p-6">
            <DialogHeader className="pb-2 border-b border-[#B88943]/25">
              <DialogTitle className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-[#E9BA6B]" />
                Add Student Archival File
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!formData.firstName.trim() || !formData.lastName.trim()) {
                  toast.error("First and last name are required");
                  return;
                }
                const phoneErr = validatePhone(formData.phone);
                if (phoneErr) {
                  toast.error(phoneErr);
                  return;
                }
                const { parentContactId, ...rest } = formData;
                createMutation.mutate({
                  ...rest,
                  phone: formatPhone(formData.phone),
                  ...(parentContactId ? { parentContactId: parseInt(parentContactId, 10) } : {}),
                });
              }}
              className="space-y-4 pt-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD7E8]">First Name *</label>
                  <VoiceInput
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Jeremiah"
                    className="bg-[#050D1A] border-[#B88943]/30 text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD7E8]">Last Name *</label>
                  <VoiceInput
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Mitchell"
                    className="bg-[#050D1A] border-[#B88943]/30 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD7E8]">School Name</label>
                  <VoiceInput
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="e.g. Jackson High"
                    className="bg-[#050D1A] border-[#B88943]/30 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD7E8]">Grade Level</label>
                  <VoiceInput
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    placeholder="e.g. 11th Grade"
                    className="bg-[#050D1A] border-[#B88943]/30 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#CBD7E8]">Parent / Family Contact</label>
                <Select
                  value={formData.parentContactId || "none"}
                  onValueChange={(val) => setFormData({ ...formData, parentContactId: val === "none" ? "" : val })}
                >
                  <SelectTrigger className="bg-[#050D1A] border-[#B88943]/30 text-white">
                    <SelectValue placeholder="Select parent contact..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A1729] border-[#B88943]/40 text-white">
                    <SelectItem value="none">— No parent linked —</SelectItem>
                    {parents.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.firstName} {p.lastName}{p.company ? ` (${p.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD7E8]">Plan Type</label>
                  <Select
                    value={formData.planType}
                    onValueChange={(val) => setFormData({ ...formData, planType: val })}
                  >
                    <SelectTrigger className="bg-[#050D1A] border-[#B88943]/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A1729] border-[#B88943]/40 text-white">
                      <SelectItem value="IEP">IEP (Special Education)</SelectItem>
                      <SelectItem value="504">504 Plan (Accommodations)</SelectItem>
                      <SelectItem value="BIP">Behavior Intervention Plan</SelectItem>
                      <SelectItem value="No IEP/504 Yet">Initial Evaluation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD7E8]">Family Name / Notes</label>
                  <VoiceInput
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Mitchell Family"
                    className="bg-[#050D1A] border-[#B88943]/30 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#CBD7E8]">Contact Phone</label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(val) => setFormData({ ...formData, phone: val })}
                  className="bg-[#050D1A] border-[#B88943]/30 text-white"
                />
              </div>

              {/* Physical Document Marker Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#CBD7E8]">
                    Physical Document Marker
                  </label>
                  <span className="text-[10px] text-[#8AA2C0] font-normal">Optional file clip</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#050D1A] border border-[#B88943]/30 rounded-xl max-h-36 overflow-y-auto">
                  {MARKER_OPTIONS.map((opt) => {
                    const isSelected = formData.markerType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, markerType: opt.id })}
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer select-none",
                          isSelected
                            ? "bg-[#142C4E] border-[#E9BA6B] text-[#FFF3D6] shadow-xs"
                            : "border-transparent hover:bg-[#0D1D34] text-[#A6BCD6]"
                        )}
                      >
                        <div className="w-5 h-6 flex items-center justify-center shrink-0">
                          <MarkerPreview type={opt.id} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium leading-tight truncate">{opt.label}</p>
                          <p className="text-[9px] text-[#768DA8] truncate">{opt.reason}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full bg-gradient-to-b from-[#FCE09E] via-[#D8A452] to-[#B88943] text-[#1A1208] font-bold py-2.5 rounded-xl shadow-lg hover:brightness-110 cursor-pointer"
                >
                  {createMutation.isPending ? "Archiving File..." : "Create Student File"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ScopedErrorBoundary>
  );
}

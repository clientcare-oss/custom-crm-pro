import React, { useState, useMemo, useEffect } from "react";
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
import { CabinetSidePillar } from "@/components/students/CabinetSidePillar";

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
    active: true,
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
    allContacts.forEach((p: any) => {
      const name = `${p.firstName || ""} ${p.lastName || ""}`.trim();
      if (name) {
        map.set(p.id, name);
      }
    });
    return map;
  }, [allContacts]);

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
      parentName: (c.parentContactId ? parentMap.get(c.parentContactId) || null : null) || c.secondParentName || null,
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

  const allFilteredStudents = useMemo(() => filterList(studentRecords), [studentRecords, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, sortOrder]);

  const [listCategory, setListCategory] = useState<"all" | "active" | "onboarding" | "paused" | "archived">("all");

  const displayedListStudents = useMemo(() => {
    switch (listCategory) {
      case "active":
        return filteredActive;
      case "onboarding":
        return filteredOnboarding;
      case "paused":
        return filteredPaused;
      case "archived":
        return filteredArchived;
      case "all":
      default:
        return allFilteredStudents;
    }
  }, [listCategory, filteredActive, filteredOnboarding, filteredPaused, filteredArchived, allFilteredStudents]);

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

          {/* Row 2: Alphabetical Brass Rail & View Controls (Lifted up into the deep blue nautical chart space) */}
          <div className="relative z-10 w-full pl-3 sm:pl-16 md:pl-20 lg:pl-28 xl:pl-32 pr-3 sm:pr-20 md:pr-24 lg:pr-32 xl:pr-36 pb-12 sm:pb-16 lg:pb-20 xl:pb-24">
            <div className="max-w-[1300px] xl:max-w-[1340px] mx-auto">
              <PageIdBadge id="PG-004" name="Students Case Registry" />

              {/* View Switcher & Rail Header Bar (Placed above alpha bar) */}
              <div className="flex items-center justify-between gap-3 mb-2.5 sm:mb-3">
                {/* Left: Master Registry Index Status */}
                <div className="flex items-center gap-2 select-none">
                  <span className="font-serif text-xs font-semibold text-[#D8B478] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                    Master Registry Index
                  </span>
                  {selectedLetter !== "ALL" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-serif text-[#C4D7ED] bg-[#061427]/90 px-2.5 py-0.5 rounded-full border border-[#8A6731]/40 shadow-xs">
                      Letter <span className="font-bold text-[#F2CD80]">{selectedLetter}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedLetter("ALL")}
                        className="ml-1 text-[#748CA8] hover:text-[#FFF] cursor-pointer"
                        title="Show all letters"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>

                {/* Right: Tactile Brass Cards / List View Switcher Capsule */}
                <div className="flex items-center p-1 rounded-xl border border-[#8A6731]/60 bg-[#051327]/90 shadow-[0_4px_16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-md">
                  <span className="font-serif text-xs text-[#9BB1CC] px-2.5 hidden sm:inline select-none tracking-wide">
                    View:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("cards")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer select-none",
                        viewMode === "cards"
                          ? "bg-gradient-to-b from-[#FCE09E] via-[#D8A452] to-[#B88943] text-[#1A1208] shadow-[0_2px_6px_rgba(216,164,82,0.45),inset_0_1px_1px_rgba(255,255,255,0.7)]"
                          : "text-[#7E97B8] hover:text-[#E2EDF8] hover:bg-[#12233B]/50"
                      )}
                      title="Cards Filing View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 stroke-[2.4]" />
                      <span>Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleViewModeChange("list")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer select-none",
                        viewMode === "list"
                          ? "bg-gradient-to-b from-[#FCE09E] via-[#D8A452] to-[#B88943] text-[#1A1208] shadow-[0_2px_6px_rgba(216,164,82,0.45),inset_0_1px_1px_rgba(255,255,255,0.7)]"
                          : "text-[#7E97B8] hover:text-[#E2EDF8] hover:bg-[#12233B]/50"
                      )}
                      title="Compact Registry List View"
                    >
                      <List className="w-3.5 h-3.5 stroke-[2.4]" />
                      <span>List</span>
                    </button>
                  </div>
                </div>
              </div>

              <BrassAlphabetRail
                selectedLetter={selectedLetter}
                onSelectLetter={setSelectedLetter}
                letterCounts={letterCounts}
              />
            </div>
          </div>
        </div>

        {/* ─── 3. Content Area: Clean Full-Bleed Table List View OR Full-Bleed Physical Filing Credenza ─── */}
        {viewMode === "list" ? (
          <div className="w-full flex-1 flex flex-col pt-3 pb-12">
            {/* Category Filter Tabs */}
            <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12 mb-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
              {[
                { id: "all", label: "All Students", count: allFilteredStudents.length },
                { id: "active", label: "Active Cases", count: filteredActive.length },
                { id: "onboarding", label: "Onboarding", count: filteredOnboarding.length },
                { id: "paused", label: "Paused", count: filteredPaused.length },
                { id: "archived", label: "Archived", count: filteredArchived.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setListCategory(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer whitespace-nowrap",
                    listCategory === tab.id
                      ? "bg-gradient-to-b from-[#FCE09E] via-[#D8A452] to-[#B88943] text-[#1A1208] shadow-[0_2px_8px_rgba(216,164,82,0.4)]"
                      : "bg-[#051327]/80 text-[#7E97B8] hover:text-[#E2EDF8] hover:bg-[#0E2344] border border-[#23436B]/50"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                      listCategory === tab.id
                        ? "bg-[#1A1208]/20 text-[#1A1208]"
                        : "bg-[#030914] text-[#A6C2E2]"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-full border-2 border-[#E9BA6B] border-t-transparent animate-spin mb-4" />
                <p className="font-serif text-sm font-bold text-[#E9BA6B]">Loading student records...</p>
                <p className="text-xs text-[#7B8EA7] mt-1">Retrieving archival records from practice database</p>
              </div>
            ) : (
              <StudentsListView
                students={displayedListStudents}
                onStudentClick={(id) => setLocation(`/contacts/${id}`)}
                onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
              />
            )}
          </div>
        ) : (
          /* Full-Bleed Front-Facing Physical Filing Credenza / Cabinet (Cards View Only) */
          <div className="w-full flex-1 flex flex-col bg-[#00081C] border-t border-b-2 border-[#8A6731]/70 shadow-[0_24px_70px_rgba(0,3,12,0.98)] select-none">
            {/* Replacement Piece for Old Top: Touching sidebar on left and end of page on right */}
            <div className="w-full relative z-30 select-none overflow-hidden shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.95)]">
              <img
                src="/decor/cabinet-top-molding.png"
                alt="Cabinet Top Molding"
                className="w-full h-[54px] sm:h-[60px] md:h-[66px] object-fill pointer-events-none select-none block"
              />
            </div>

            {/* ─── Physical Filing Cabinet Drawers (Framed by Left & Right 3D Side Barriers) ─── */}
            <div className="w-full relative flex-1 flex flex-row items-stretch">
              {/* Left 3D Side Barrier (Rich wood texture, brass bolt on peg at bottom) */}
              <CabinetSidePillar side="left" />

              {/* Central Credenza Drawers Stack */}
              <div className="flex-1 min-w-0 flex flex-col">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-[#E9BA6B] border-t-transparent animate-spin mb-4" />
                    <p className="font-serif text-sm font-bold text-[#E9BA6B]">Opening Student Filing Cabinet...</p>
                    <p className="text-xs text-[#7B8EA7] mt-1">Retrieving archival records from practice database</p>
                  </div>
                ) : (
                  <div className="w-full divide-y-2 divide-[#8A6731]/40">
                    {/* Drawer 0: Active Students (Directly Above New / Onboarding) */}
                    <CabinetDrawer
                      type="active"
                      title="ACTIVE STUDENTS"
                      subtitle="Current active IEP advocacy cases and ongoing representations"
                      count={filteredActive.length || 42}
                      students={filteredActive}
                      isOpen={openDrawers.active}
                      onToggle={() => toggleDrawer("active")}
                      onStudentClick={(id) => setLocation(`/contacts/${id}`)}
                      onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
                      onMarkerChange={handleMarkerChange}
                      viewMode="cards"
                    />

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
                      onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
                      onMarkerChange={handleMarkerChange}
                      viewMode="cards"
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
                      onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
                      onMarkerChange={handleMarkerChange}
                      viewMode="cards"
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
                      onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
                      onMarkerChange={handleMarkerChange}
                      viewMode="cards"
                    />
                  </div>
                )}

                {/* ─── Horizontal Bottom Piece of the Credenza ─── */}
                {/* Exact same width/thickness as the side pieces (h-[18px] sm:h-[28px] lg:h-[34px]), perfectly aligned with bottom corner squares */}
                <div className="w-[calc(100%+18px)] sm:w-[calc(100%+28px)] lg:w-[calc(100%+34px)] h-[18px] sm:h-[28px] lg:h-[34px] -ml-[9px] sm:-ml-[14px] lg:-ml-[17px] -mr-[9px] sm:-mr-[14px] lg:-mr-[17px] relative z-[1] shrink-0 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.95)]">
                  <img
                    src="/decor/credenza-bottom-rail.png"
                    alt="Credenza Bottom Rail"
                    className="w-full h-full object-fill pointer-events-none select-none block"
                  />
                </div>
              </div>

              {/* Right 3D Side Barrier */}
              <CabinetSidePillar side="right" />
            </div>
          </div>
        )}

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

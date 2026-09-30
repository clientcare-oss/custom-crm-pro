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
import { StudentFolderCard, type StudentFolderData } from "@/components/students/StudentFolderCard";
import { CabinetDrawer, type DrawerType } from "@/components/students/CabinetDrawer";
import { StudentsListView } from "@/components/students/StudentsListView";
import { BrassScrewRivet, AntiqueBrassNameplate } from "@/components/students/CabinetOrnaments";

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

  // ─── New Student Form State ───
  const [formData, setFormData] = useState({
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
  });

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Student file successfully added to active cabinet");
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
    }));
  }, [allContacts, parentMap]);

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
      <div className="min-h-full bg-[#020712] text-[#F0DFC5] p-2 sm:p-5 lg:p-7 space-y-5">
        {/* Top Header Badge & Meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PageIdBadge id="PG-004" name="Students Case Registry" />
          </div>
        </div>

        {/* ─── 1. Header (Navigation & Search with Plant on Books and Brass Lantern) ─── */}
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

        {/* ─── 2. Alphabetical Brass Indexing Rail ─── */}
        <BrassAlphabetRail
          selectedLetter={selectedLetter}
          onSelectLetter={setSelectedLetter}
          letterCounts={letterCounts}
        />

        {/* ─── 3. Large Front-Facing Physical Filing Credenza / Cabinet ─── */}
        <div className="relative rounded-2xl border-2 border-[#8A6731]/70 bg-gradient-to-b from-[#0A1A2F] via-[#061224] to-[#020814] p-3 sm:p-5 lg:p-6 shadow-[0_24px_70px_rgba(0,3,12,0.98)] ring-1 ring-[#F7D287]/20 space-y-4">
          
          {/* Top-left and Top-right corner brass bracket accents on outer credenza frame */}
          <div className="absolute top-2 left-2.5 pointer-events-none hidden sm:block">
            <BrassScrewRivet className="w-2.5 h-2.5" />
          </div>
          <div className="absolute top-2 right-2.5 pointer-events-none hidden sm:block">
            <BrassScrewRivet className="w-2.5 h-2.5" />
          </div>

          {/* ─── Upper Compartment: ACTIVE STUDENTS ─── */}
          <div className="space-y-3">
            {/* Compartment Control Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-[#8A6731]/35 flex-wrap gap-3">
              {/* Left: Antique Brass Nameplate with 4 Corner Rivets */}
              <div className="flex items-center gap-3">
                <AntiqueBrassNameplate
                  icon={Folder}
                  title="ACTIVE STUDENTS"
                  count={filteredActive.length || 42}
                />
              </div>

              {/* Right: Tactile View Switcher (Cards / List) & Shelf Pagination */}
              <div className="flex items-center gap-3">
                {totalShelfPages > 1 && viewMode === "cards" && (
                  <div className="flex items-center gap-1.5 text-xs text-[#D8B478] bg-[#030914] px-2.5 py-1 rounded-lg border border-[#8A6731]/40">
                    <button
                      disabled={shelfPage === 0}
                      onClick={() => setShelfPage(p => Math.max(0, p - 1))}
                      className="px-1 text-[#D8B478] hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      ‹
                    </button>
                    <span>Shelf {shelfPage + 1} of {totalShelfPages}</span>
                    <button
                      disabled={shelfPage >= totalShelfPages - 1}
                      onClick={() => setShelfPage(p => Math.min(totalShelfPages - 1, p + 1))}
                      className="px-1 text-[#D8B478] hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      ›
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#D8B478]">
                    View: Cards
                  </span>
                  <div className="flex items-center p-0.5 rounded-lg bg-[#030914] border border-[#8A6731]/50 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("cards")}
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded text-xs font-bold transition-all duration-200 cursor-pointer select-none",
                        viewMode === "cards"
                          ? "bg-gradient-to-b from-[#FCE09E] via-[#D8A452] to-[#B88943] text-[#1A1208] shadow-[0_2px_6px_rgba(216,164,82,0.5)]"
                          : "text-[#7B8EA7] hover:text-[#F0DFC5]"
                      )}
                      title="Cards view"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 stroke-[2.4]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("list")}
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded text-xs font-bold transition-all duration-200 cursor-pointer select-none",
                        viewMode === "list"
                          ? "bg-gradient-to-b from-[#FCE09E] via-[#D8A452] to-[#B88943] text-[#1A1208] shadow-[0_2px_6px_rgba(216,164,82,0.5)]"
                          : "text-[#7B8EA7] hover:text-[#F0DFC5]"
                      )}
                      title="List view"
                    >
                      <List className="w-3.5 h-3.5 stroke-[2.4]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Compartment Content: 3 Stepped Physical Wooden Shelves or List */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-full border-2 border-[#E9BA6B] border-t-transparent animate-spin mb-4" />
                <p className="font-serif text-sm font-bold text-[#E9BA6B]">Opening Student Filing Cabinet...</p>
                <p className="text-xs text-[#7B8EA7] mt-1">Retrieving archival records from practice database</p>
              </div>
            ) : viewMode === "cards" ? (
              <div className="relative flex rounded-xl bg-gradient-to-b from-[#020610] via-[#040C1A] to-[#061426] border border-[#8A6731]/40 shadow-[inset_0_12px_36px_rgba(0,0,0,0.95)] overflow-hidden">
                {/* Left 3D Perspective Wooden Cheek Wall */}
                <div className="hidden lg:block w-4 shrink-0 bg-gradient-to-r from-[#0D1F34] via-[#071322] to-transparent border-r border-[#8A6731]/30" />

                {/* Shelves Rows */}
                <div className="flex-1 p-3 sm:p-4 space-y-4 min-h-[440px]">
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
                    // Stepped shelves with 5 folders per tier
                    shelfRows.map((row, rowIdx) => (
                      <div key={rowIdx} className="space-y-2.5">
                        {/* Shelf Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
                          {row.map((student, colIdx) => (
                            <StudentFolderCard
                              key={student.id}
                              student={student}
                              index={rowIdx * 5 + colIdx}
                              onClick={() => setLocation(`/contacts/${student.id}`)}
                            />
                          ))}
                        </div>

                        {/* Physical Wooden Shelf Ledge / Step */}
                        <div className="relative h-2 w-full rounded-xs bg-gradient-to-r from-[#0C1C30] via-[#1B3554] to-[#0C1C30] border-t border-[#8A6731]/45 shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
                          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFF2D6]/20 to-transparent pointer-events-none" />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Right 3D Perspective Wooden Cheek Wall */}
                <div className="hidden lg:block w-4 shrink-0 bg-gradient-to-l from-[#0D1F34] via-[#071322] to-transparent border-l border-[#8A6731]/30" />
              </div>
            ) : (
              <StudentsListView
                students={filteredActive}
                onStudentClick={(id) => setLocation(`/contacts/${id}`)}
                onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
              />
            )}
          </div>

          {/* ─── Lower Filing Drawers (Prominently Stacked Under Active Compartment) ─── */}
          <div className="space-y-2.5 pt-2">

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

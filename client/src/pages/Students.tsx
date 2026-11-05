import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Folder, LayoutGrid, List, Plus, Search, X, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
import WaypointPillTab from "@/components/ui/WaypointPillTab";
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
import {
  type CompanyTag,
  type CustomStudentStage,
  loadCompanyTags,
  saveCompanyTags,
  loadStudentTagsMap,
  saveStudentTagsMap,
  loadCustomStudentStages,
  saveCustomStudentStages,
  ManageCompanyTagsModal,
  AddCustomStagePopover,
} from "@/components/students/StudentTagsManager";

export default function Students() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // ─── Query Live Production Contacts ───
  const { data: rawContacts, isLoading, refetch } = trpc.contacts.list.useQuery();

  // ─── State Management ───
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortBy, setSortBy] = useState<"name" | "tags">("name");
  const [viewMode, setViewMode] = useState<"cards" | "list">(() => {
    return (localStorage.getItem("waypoint_students_view_mode") as "cards" | "list") || "cards";
  });
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("ALL");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL");
  const [selectedTagFilter, setSelectedTagFilter] = useState("ALL");
  const [newStudentOpen, setNewStudentOpen] = useState(false);

  // ─── Company Tags, Per-Student Tags & Custom Stages State ───
  const [companyTags, setCompanyTags] = useState<CompanyTag[]>(() => loadCompanyTags());
  const [studentTagsMap, setStudentTagsMap] = useState<Record<number, string[]>>(() => loadStudentTagsMap());
  const [customStages, setCustomStages] = useState<CustomStudentStage[]>(() => loadCustomStudentStages());
  const [manageTagsOpen, setManageTagsOpen] = useState(false);

  // Drawer expansion states
  const [openDrawers, setOpenDrawers] = useState<Record<string, boolean>>({
    active: true,
    scholarship: false,
    renewal: false,
    archived: false,
  });

  const toggleDrawer = (drawer: string) => {
    setOpenDrawers((prev) => ({ ...prev, [drawer]: !prev[drawer] }));
  };

  const handleAssignTag = (studentId: number, rawTagName: string) => {
    const cleanName = rawTagName.trim();
    if (!cleanName) return;

    // Ensure tag exists in companyTags
    setCompanyTags((prevTags) => {
      const exists = prevTags.some((t) => t.name.toLowerCase() === cleanName.toLowerCase());
      if (exists) return prevTags;
      const nextTags: CompanyTag[] = [
        ...prevTags,
        { id: `tag-${Date.now()}`, name: cleanName, colorId: "blue" },
      ];
      saveCompanyTags(nextTags);
      return nextTags;
    });

    setStudentTagsMap((prev) => {
      const existing = prev[studentId] || [];
      if (existing.some((t) => t.toLowerCase() === cleanName.toLowerCase())) {
        return prev;
      }
      const next = { ...prev, [studentId]: [...existing, cleanName] };
      saveStudentTagsMap(next);
      return next;
    });
  };

  const handleRemoveTag = (studentId: number, tagName: string) => {
    setStudentTagsMap((prev) => {
      const existing = prev[studentId] || [];
      const filtered = existing.filter((t) => t.toLowerCase() !== tagName.toLowerCase());
      const next = { ...prev, [studentId]: filtered };
      saveStudentTagsMap(next);
      return next;
    });
  };

  const handleSaveCompanyTag = (savedTag: CompanyTag, previousName?: string) => {
    setCompanyTags((prev) => {
      const idx = prev.findIndex((t) => t.id === savedTag.id);
      const next = idx >= 0 ? prev.map((t, i) => (i === idx ? savedTag : t)) : [...prev, savedTag];
      saveCompanyTags(next);
      return next;
    });

    // If renamed, propagate the new tag name to all previously tagged students & custom stages
    if (previousName && previousName !== savedTag.name) {
      setStudentTagsMap((prev) => {
        const next: Record<number, string[]> = {};
        Object.entries(prev).forEach(([idStr, tags]) => {
          next[Number(idStr)] = (tags || []).map((t) =>
            t.toLowerCase() === previousName.toLowerCase() ? savedTag.name : t
          );
        });
        saveStudentTagsMap(next);
        return next;
      });
      setCustomStages((prev) => {
        const next = prev.map((st) =>
          st.linkedTagName.toLowerCase() === previousName.toLowerCase()
            ? { ...st, linkedTagName: savedTag.name }
            : st
        );
        saveCustomStudentStages(next);
        return next;
      });
    }
  };

  const handleDeleteCompanyTag = (tagId: string, tagName: string) => {
    setCompanyTags((prev) => {
      const next = prev.filter((t) => t.id !== tagId);
      saveCompanyTags(next);
      return next;
    });
    setStudentTagsMap((prev) => {
      const next: Record<number, string[]> = {};
      Object.entries(prev).forEach(([idStr, tags]) => {
        next[Number(idStr)] = (tags || []).filter(
          (t) => t.toLowerCase() !== tagName.toLowerCase()
        );
      });
      saveStudentTagsMap(next);
      return next;
    });
    toast.success(`Tag "${tagName}" removed`);
  };

  const handleAddCustomStage = (label: string, linkedTagName: string) => {
    const newStage: CustomStudentStage = {
      id: `stage-${Date.now()}`,
      label,
      linkedTagName,
    };
    // Ensure the linked tag exists in companyTags
    setCompanyTags((prev) => {
      const exists = prev.some((t) => t.name.toLowerCase() === linkedTagName.toLowerCase());
      if (exists) return prev;
      const next: CompanyTag[] = [
        ...prev,
        { id: `tag-${Date.now()}`, name: linkedTagName, colorId: "mint" },
      ];
      saveCompanyTags(next);
      return next;
    });
    setCustomStages((prev) => {
      const next = [...prev, newStage];
      saveCustomStudentStages(next);
      return next;
    });
    setOpenDrawers((prev) => ({ ...prev, [newStage.id]: true }));
    setListCategory(newStage.id);
    toast.success(`Custom stage "${label}" added (ordered by tag "${linkedTagName}")`);
  };

  const handleDeleteCustomStage = (stageId: string) => {
    setCustomStages((prev) => {
      const next = prev.filter((s) => s.id !== stageId);
      saveCustomStudentStages(next);
      return next;
    });
    if (listCategory === stageId) {
      setListCategory("all");
    }
    toast.info("Custom stage removed");
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
    newParentName: string;
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
    newParentName: "",
    markerType: "none",
  });

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Student & parent file added to active cabinet!");
      if (data?.id && formData.markerType && formData.markerType !== "none") {
        handleMarkerChange(data.id, formData.markerType);
      }
      setSelectedLetter("ALL");
      setSearchQuery("");
      setOpenDrawers((prev) => ({ ...prev, active: true }));
      utils.contacts.list.invalidate();
      utils.pipeline.cards.list.invalidate();
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
        newParentName: "",
        markerType: "none",
      });
    },
    onError: (e) => toast.error(e.message || "Failed to add student"),
  });

  const createSamplePairMutation = trpc.contacts.createSamplePair.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Sample student & parent added to active cabinet!");
      if (data?.studentId) {
        const sampleMarkers: MarkerType[] = ["star", "violet_bookmark", "paperclip", "green_bookmark"];
        const randomMarker = sampleMarkers[Math.floor(Math.random() * sampleMarkers.length)];
        handleMarkerChange(data.studentId, randomMarker);
      }
      setSelectedLetter("ALL");
      setSearchQuery("");
      setOpenDrawers((prev) => ({ ...prev, active: true }));
      utils.contacts.list.invalidate();
      utils.pipeline.cards.list.invalidate();
      refetch();
      setNewStudentOpen(false);
    },
    onError: (e) => toast.error(e.message || "Failed to add sample persons"),
  });

  const quickAddParentMutation = trpc.contacts.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Parent contact created & linked!");
      utils.contacts.list.invalidate();
      refetch().then((res) => {
        const newId = data?.id || (res.data && (res.data as any)[0]?.id);
        if (newId) {
          setFormData((prev) => ({ ...prev, parentContactId: newId.toString(), newParentName: "" }));
        }
      });
    },
    onError: (e) => toast.error(e.message || "Failed to create sample parent"),
  });

  const handleQuickAddSampleParent = () => {
    const typedParent = formData.newParentName.trim();
    const parts = typedParent ? typedParent.split(/\s+/) : [];
    const parentFirstName = parts[0] || "Sarah";
    const parentLastName = parts.slice(1).join(" ") || formData.lastName.trim() || "Sterling";
    quickAddParentMutation.mutate({
      firstName: parentFirstName,
      lastName: parentLastName,
      company: `${parentLastName} Family`,
      jobTitle: "Parent / Guardian",
      phone: formData.phone || "(404) 555-0182",
      email: `${parentFirstName.toLowerCase()}.${parentLastName.toLowerCase()}@sample.waypointadvocates.com`,
      notes: "Parent contact record.",
      bestTimeToCall: "Mornings before 11:00 AM",
    });
  };

  const handleFillSampleData = () => {
    const SAMPLE_STUDENTS = [
      {
        firstName: "Lucas",
        lastName: "Sterling",
        newParentName: "Sarah Sterling",
        schoolName: "North Atlanta High",
        gradeLevel: "10th Grade",
        company: "Sterling Family",
        planType: "IEP",
        phone: "(404) 555-0182",
        markerType: "star" as MarkerType,
      },
      {
        firstName: "Maya",
        lastName: "Vance",
        newParentName: "David Vance",
        schoolName: "Decatur High School",
        gradeLevel: "8th Grade",
        company: "Vance Family",
        planType: "504",
        phone: "(404) 555-0194",
        markerType: "violet_bookmark" as MarkerType,
      },
      {
        firstName: "Elijah",
        lastName: "Mitchell",
        newParentName: "Kendra Mitchell",
        schoolName: "Walton High School",
        gradeLevel: "11th Grade",
        company: "Mitchell Family",
        planType: "IEP",
        phone: "(770) 555-0138",
        markerType: "paperclip" as MarkerType,
      },
      {
        firstName: "Caleb",
        lastName: "Davis",
        newParentName: "Marcus Davis",
        schoolName: "Riverwood High School",
        gradeLevel: "6th Grade",
        company: "Davis Family",
        planType: "No IEP/504 Yet",
        phone: "(678) 555-0177",
        markerType: "calendar" as MarkerType,
      },
      {
        firstName: "Noah",
        lastName: "Mercer",
        newParentName: "Elena Mercer",
        schoolName: "Milton High School",
        gradeLevel: "9th Grade",
        company: "Mercer Family",
        planType: "IEP",
        phone: "(404) 555-0219",
        markerType: "green_bookmark" as MarkerType,
      },
    ];

    const pick = SAMPLE_STUDENTS[Math.floor(Math.random() * SAMPLE_STUDENTS.length)];
    const matchingParent = parents.find((p: any) =>
      p.lastName?.toLowerCase() === pick.lastName.toLowerCase() ||
      p.company?.toLowerCase()?.includes(pick.lastName.toLowerCase())
    );

    setFormData((prev) => ({
      ...prev,
      ...pick,
      parentContactId: matchingParent ? matchingParent.id.toString() : "",
      newParentName: matchingParent ? "" : pick.newParentName,
    }));
    toast.info(`Filled sample student (${pick.firstName} ${pick.lastName}) & parent (${pick.newParentName})`);
  };

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
    const hasSavedMap = Object.keys(studentTagsMap).length > 0;

    return list.map((c: any, idx: number) => {
      // Parse any DB tags
      let dbTags: string[] = [];
      if (Array.isArray(c.tags)) {
        dbTags = c.tags.filter(Boolean);
      } else if (typeof c.tags === "string" && c.tags.trim()) {
        try {
          const parsed = JSON.parse(c.tags);
          if (Array.isArray(parsed)) dbTags = parsed.filter(Boolean);
          else dbTags = c.tags.split(",").map((s: string) => s.trim()).filter(Boolean);
        } catch {
          dbTags = c.tags.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      }

      let resolvedTags: string[] = [];
      if (studentTagsMap[c.id] !== undefined) {
        resolvedTags = studentTagsMap[c.id];
      } else if (dbTags.length > 0) {
        resolvedTags = dbTags;
      } else if (!hasSavedMap) {
        // Seed initial sample tags on the first few records so tag pills & stages are immediately visible
        if (idx === 0) resolvedTags = ["Discovery", "Active"];
        else if (idx === 1) resolvedTags = ["Cancelation", "High Priority", "RENEWAL NEEDED"];
        else if (idx === 2) resolvedTags = ["SCHOLARSHIP", "Active"];
        else if (idx === 3) resolvedTags = ["IEP SOON"];
      }

      return {
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
        tags: resolvedTags,
      };
    });
  }, [allContacts, parentMap, studentMarkers, studentTagsMap]);

  // ─── Categorization into Stages & Cabinet Compartments (Ordered/Filtered by Tags & Status) ───
  const { activeStudents, scholarshipStudents, renewalStudents, archivedStudents } = useMemo(() => {
    const active: StudentFolderData[] = [];
    const scholarship: StudentFolderData[] = [];
    const renewal: StudentFolderData[] = [];
    const archived: StudentFolderData[] = [];

    studentRecords.forEach((s) => {
      const stage = (s.pipelineStage || "").toLowerCase();
      const account = (s.accountStatus || "").toLowerCase();
      const lowerTags = (s.tags || []).map((t) => t.toLowerCase());

      const isArchived =
        Boolean(s.id && (s as any).archivedAt) ||
        account === "closed" ||
        stage === "closed" ||
        lowerTags.includes("archive") ||
        lowerTags.includes("archived");

      const isScholarship =
        lowerTags.includes("scholarship") ||
        account.includes("scholarship") ||
        stage.includes("scholarship");

      const isRenewal =
        lowerTags.includes("renewal needed") ||
        lowerTags.includes("renewal") ||
        account.includes("renewal") ||
        stage.includes("renewal");

      if (isArchived) {
        archived.push(s);
      } else {
        if (isScholarship) {
          scholarship.push(s);
        }
        if (isRenewal) {
          renewal.push(s);
        }
        // Keep active students in Active (unless archived)
        active.push(s);
      }
    });

    return {
      activeStudents: active,
      scholarshipStudents: scholarship,
      renewalStudents: renewal,
      archivedStudents: archived,
    };
  }, [studentRecords]);

  // ─── Filter & Search Predicate (Including Tag Filter & Tag Ordering) ───
  const filterList = (list: StudentFolderData[]) => {
    return list
      .filter((s) => {
        // Alphabet filter
        if (selectedLetter !== "ALL") {
          const checkChar = (s.lastName || s.firstName).charAt(0).toUpperCase();
          if (checkChar !== selectedLetter) return false;
        }

        // Search query (matches student name, caseId, school, family, or any assigned tag)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const name = `${s.firstName} ${s.lastName}`.toLowerCase();
          const caseId = (s.caseId || "").toLowerCase();
          const school = (s.schoolName || "").toLowerCase();
          const family = (s.company || "").toLowerCase();
          const tagsStr = (s.tags || []).join(" ").toLowerCase();
          if (
            !name.includes(q) &&
            !caseId.includes(q) &&
            !school.includes(q) &&
            !family.includes(q) &&
            !tagsStr.includes(q)
          ) {
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

        // Tag filter
        if (selectedTagFilter !== "ALL") {
          const hasTag = (s.tags || []).some(
            (t) => t.toLowerCase() === selectedTagFilter.toLowerCase()
          );
          if (!hasTag) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "tags") {
          const tagA = (a.tags && a.tags.length > 0 ? a.tags.join(", ") : "zzzz").toLowerCase();
          const tagB = (b.tags && b.tags.length > 0 ? b.tags.join(", ") : "zzzz").toLowerCase();
          if (tagA !== tagB) {
            return sortOrder === "asc" ? tagA.localeCompare(tagB) : tagB.localeCompare(tagA);
          }
        }
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
  };

  const filteredActive = useMemo(
    () => filterList(activeStudents),
    [activeStudents, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, selectedTagFilter, sortOrder, sortBy]
  );
  const filteredScholarship = useMemo(
    () => filterList(scholarshipStudents),
    [scholarshipStudents, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, selectedTagFilter, sortOrder, sortBy]
  );
  const filteredRenewal = useMemo(
    () => filterList(renewalStudents),
    [renewalStudents, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, selectedTagFilter, sortOrder, sortBy]
  );
  const filteredArchived = useMemo(
    () => filterList(archivedStudents),
    [archivedStudents, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, selectedTagFilter, sortOrder, sortBy]
  );

  // Custom stage student lists (ordered/matched by each custom stage's linked tag)
  const customStageStudentsMap = useMemo(() => {
    const map: Record<string, StudentFolderData[]> = {};
    customStages.forEach((st) => {
      const targetTag = st.linkedTagName.toLowerCase();
      const matched = studentRecords.filter((s) =>
        (s.tags || []).some((t) => t.toLowerCase() === targetTag)
      );
      map[st.id] = filterList(matched);
    });
    return map;
  }, [customStages, studentRecords, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, selectedTagFilter, sortOrder, sortBy]);

  // Alphabet counts mapping
  const letterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    studentRecords.forEach((s) => {
      const char = (s.lastName || s.firstName).charAt(0).toUpperCase();
      if (char) counts[char] = (counts[char] || 0) + 1;
    });
    return counts;
  }, [studentRecords]);

  const hasActiveFilters = Boolean(
    selectedPlanFilter !== "ALL" ||
      selectedGradeFilter !== "ALL" ||
      selectedTagFilter !== "ALL" ||
      sortBy !== "name"
  );

  const allFilteredStudents = useMemo(
    () => filterList(studentRecords),
    [studentRecords, selectedLetter, searchQuery, selectedPlanFilter, selectedGradeFilter, selectedTagFilter, sortOrder, sortBy]
  );

  const [listCategory, setListCategory] = useState<string>("all");

  const displayedListStudents = useMemo(() => {
    switch (listCategory) {
      case "active":
        return filteredActive;
      case "scholarship":
        return filteredScholarship;
      case "renewal":
        return filteredRenewal;
      case "archived":
        return filteredArchived;
      case "all":
        return allFilteredStudents;
      default:
        return customStageStudentsMap[listCategory] || allFilteredStudents;
    }
  }, [
    listCategory,
    filteredActive,
    filteredScholarship,
    filteredRenewal,
    filteredArchived,
    allFilteredStudents,
    customStageStudentsMap,
  ]);

  const stageTabs = useMemo(
    () => [
      { id: "all", label: "All Students", count: allFilteredStudents.length },
      { id: "active", label: "Active", count: filteredActive.length },
      { id: "scholarship", label: "Scholarship", count: filteredScholarship.length },
      { id: "renewal", label: "Renewal", count: filteredRenewal.length },
      { id: "archived", label: "Archived", count: filteredArchived.length },
      ...customStages.map((st) => ({
        id: st.id,
        label: st.label,
        count: (customStageStudentsMap[st.id] || []).length,
      })),
    ],
    [
      allFilteredStudents.length,
      filteredActive.length,
      filteredScholarship.length,
      filteredRenewal.length,
      filteredArchived.length,
      customStages,
      customStageStudentsMap,
    ]
  );

  const handleStageTabClick = (tabId: string) => {
    setListCategory(tabId);
    if (viewMode === "cards" && tabId !== "all") {
      setOpenDrawers((prev) => ({
        active: false,
        scholarship: false,
        renewal: false,
        archived: false,
        ...Object.fromEntries(customStages.map((c) => [c.id, false])),
        ...prev,
        [tabId]: true,
      }));
    }
  };

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
              sortOrder={sortOrder}
              onSortChange={setSortOrder}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              onNewStudentClick={() => setNewStudentOpen(true)}
              onQuickSample={() => createSamplePairMutation.mutate({})}
              isCreatingSample={createSamplePairMutation.isPending}
              selectedPlanFilter={selectedPlanFilter}
              onPlanFilterChange={setSelectedPlanFilter}
              selectedGradeFilter={selectedGradeFilter}
              onGradeFilterChange={setSelectedGradeFilter}
              selectedTagFilter={selectedTagFilter}
              onTagFilterChange={setSelectedTagFilter}
              companyTags={companyTags}
              onOpenManageTags={() => setManageTagsOpen(true)}
              onResetFilters={() => {
                setSelectedPlanFilter("ALL");
                setSelectedGradeFilter("ALL");
                setSelectedTagFilter("ALL");
                setSortBy("name");
                setSelectedLetter("ALL");
                setSearchQuery("");
              }}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {/* Row 2: Alphabetical Brass Rail & View Controls (Lifted up into the deep blue nautical chart space) */}
          <div className="relative z-10 w-full pl-3 sm:pl-16 md:pl-20 lg:pl-28 xl:pl-32 pr-3 sm:pr-20 md:pr-24 lg:pr-32 xl:pr-36 pb-12 sm:pb-16 lg:pb-20 xl:pb-24">
            <div className="max-w-[1300px] xl:max-w-[1340px] mx-auto">
              <PageIdBadge id="PG-004" name="Student Workspaces" />

              {/* Coherent Line: Search Bar + View Mode Switcher Box (Nudged slightly right) */}
              <div className="relative flex items-center justify-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3 translate-x-2.5 sm:translate-x-4 md:translate-x-5 -translate-y-1.5 sm:-translate-y-2.5 md:-translate-y-3">
                {/* Active Letter Filter Pill (Anchored to left so center line remains strictly balanced) */}
                {selectedLetter !== "ALL" && (
                  <div className="absolute left-0 hidden xl:flex items-center gap-1.5 select-none">
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
                  </div>
                )}

                {/* Search Bar: Sized and positioned clear of the compass rose */}
                <div className="relative flex items-center w-full max-w-[210px] xs:max-w-[250px] sm:max-w-[280px] md:max-w-[320px]">
                  <Search className="absolute left-3 w-4 h-4 text-[#7E97B8] pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search students or tags..."
                    className={cn(
                      "w-full h-10 pl-8.5 sm:pl-9 pr-8 rounded-xl text-xs sm:text-sm text-[#F0F6FC] placeholder:text-[#6E87A8]",
                      "bg-[#040B17]/92 border border-[#8A6731]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7),0_4px_16px_rgba(0,0,0,0.6)]",
                      "focus:border-[#F2CD80] focus:ring-1 focus:ring-[#F2CD80]/40 transition-all"
                    )}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 p-1 rounded hover:bg-white/10 text-[#7E97B8] hover:text-white cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Center: Tactile Brass Cards / List View Switcher Capsule (Directly next to the search bar) */}
                <div className="flex items-center p-1 h-10 rounded-xl border border-[#8A6731]/60 bg-[#051327]/90 shadow-[0_4px_16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-md shrink-0">
                  <span className="font-serif text-xs text-[#9BB1CC] px-2 hidden sm:inline select-none tracking-wide">
                    View:
                  </span>
                  <div className="flex items-center gap-1 h-full">
                    <button
                      type="button"
                      onClick={() => handleViewModeChange("cards")}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-serif font-bold transition-all cursor-pointer select-none",
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
                        "flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-serif font-bold transition-all cursor-pointer select-none",
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

        {/* ─── Stage Filter Pill Bar: All Students, Active, Scholarship, Renewal, Archived, + Custom Stage ─── */}
        <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12 pt-3 pb-2 bg-[#020712] border-b border-[#8A6731]/25">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
              {stageTabs.map((tab) => (
                <WaypointPillTab
                  key={tab.id}
                  label={tab.label}
                  count={tab.count}
                  active={listCategory === tab.id}
                  onClick={() => handleStageTabClick(tab.id)}
                />
              ))}

              {/* "+" Button for adding a new custom stage (ordered/populated by tags) */}
              <AddCustomStagePopover
                companyTags={companyTags}
                customStages={customStages}
                onAddStage={handleAddCustomStage}
                onDeleteStage={handleDeleteCustomStage}
              />
            </div>

            {/* Quick Order-by-Tags & Manage Company Tags Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSortBy((prev) => (prev === "tags" ? "name" : "tags"))}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-serif font-semibold border transition-all cursor-pointer",
                  sortBy === "tags"
                    ? "bg-[#091931] text-[#FFE394] border-[#C5A059] shadow-[0_0_10px_rgba(197,160,89,0.25)]"
                    : "bg-[#050E1C] text-[#8EA6C6] border-[#1E3250] hover:text-[#E2EDF8] hover:border-[#3A5A88]"
                )}
                title="Order students by their assigned tags"
              >
                {sortBy === "tags" ? "Ordered by Tags ✓" : "Order by Tags"}
              </button>

              <button
                type="button"
                onClick={() => setManageTagsOpen(true)}
                className="px-3 py-1.5 rounded-full text-xs font-serif font-semibold bg-[#050E1C] text-[#D8C7A5] border border-[#3A2C18] hover:border-[#C5A059]/70 hover:text-[#FFE394] transition-all cursor-pointer"
              >
                Manage Tags
              </button>
            </div>
          </div>
        </div>

        {/* ─── 3. Content Area: Clean Full-Bleed Table List View OR Full-Bleed Physical Filing Credenza ─── */}
        {viewMode === "list" ? (
          <div className="w-full flex-1 flex flex-col pt-3 pb-12">
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
                onMarkerChange={handleMarkerChange}
                companyTags={companyTags}
                onAssignTag={handleAssignTag}
                onRemoveTag={handleRemoveTag}
                onOpenManageCompanyTags={() => setManageTagsOpen(true)}
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
                    {/* Drawer 0: Active Students */}
                    <CabinetDrawer
                      type="active"
                      title="ACTIVE"
                      subtitle="Current active IEP advocacy cases and ongoing representations"
                      count={filteredActive.length}
                      students={filteredActive}
                      isOpen={Boolean(openDrawers.active)}
                      onToggle={() => toggleDrawer("active")}
                      onStudentClick={(id) => setLocation(`/contacts/${id}`)}
                      onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
                      onMarkerChange={handleMarkerChange}
                      viewMode="cards"
                    />

                    {/* Drawer 1: Scholarship */}
                    <CabinetDrawer
                      type="scholarship"
                      title="SCHOLARSHIP"
                      subtitle="Students tagged or enrolled under Waypoint Scholarship advocacy"
                      count={filteredScholarship.length}
                      students={filteredScholarship}
                      isOpen={Boolean(openDrawers.scholarship)}
                      onToggle={() => toggleDrawer("scholarship")}
                      onStudentClick={(id) => setLocation(`/contacts/${id}`)}
                      onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
                      onMarkerChange={handleMarkerChange}
                      viewMode="cards"
                    />

                    {/* Drawer 2: Renewal */}
                    <CabinetDrawer
                      type="renewal"
                      title="RENEWAL"
                      subtitle="Students approaching annual plan renewal or tagged Renewal Needed"
                      count={filteredRenewal.length}
                      students={filteredRenewal}
                      isOpen={Boolean(openDrawers.renewal)}
                      onToggle={() => toggleDrawer("renewal")}
                      onStudentClick={(id) => setLocation(`/contacts/${id}`)}
                      onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
                      onMarkerChange={handleMarkerChange}
                      viewMode="cards"
                    />

                    {/* Custom Stage Drawers added via "+" */}
                    {customStages.map((st) => {
                      const stageStudents = customStageStudentsMap[st.id] || [];
                      return (
                        <CabinetDrawer
                          key={st.id}
                          type={st.id}
                          title={st.label.toUpperCase()}
                          subtitle={`Custom stage ordered by tag "${st.linkedTagName}"`}
                          count={stageStudents.length}
                          students={stageStudents}
                          isOpen={Boolean(openDrawers[st.id])}
                          onToggle={() => toggleDrawer(st.id)}
                          onStudentClick={(id) => setLocation(`/contacts/${id}`)}
                          onParentClick={(parentId) => setLocation(`/contacts/${parentId}`)}
                          onMarkerChange={handleMarkerChange}
                          viewMode="cards"
                        />
                      );
                    })}

                    {/* Drawer 3: Archived */}
                    <CabinetDrawer
                      type="archived"
                      title="ARCHIVED"
                      subtitle="Closed student advocacy files, historical records, and graduated cases"
                      count={filteredArchived.length}
                      students={filteredArchived}
                      isOpen={Boolean(openDrawers.archived)}
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
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden bg-[#0A1729] border border-[#B88943]/50 text-[#F0DFC5] rounded-2xl shadow-2xl">
            {/* Pinned Header */}
            <div className="p-4 sm:p-5 pb-3 border-b border-[#B88943]/25 shrink-0 flex flex-wrap items-center justify-between gap-2 bg-[#091526]">
              <DialogTitle className="font-serif text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-[#E9BA6B] shrink-0" />
                <span>Add New Student</span>
              </DialogTitle>
              <div className="flex items-center gap-1.5 pr-6">
                <button
                  type="button"
                  disabled={createSamplePairMutation.isPending}
                  onClick={() => createSamplePairMutation.mutate({})}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-serif font-bold bg-gradient-to-b from-[#142640] via-[#0C1A2E] to-[#071322] text-[#F5DC9F] border border-[#C5A059]/60 hover:border-[#FFE29A] hover:bg-[#1A3152] transition-all cursor-pointer shadow-xs"
                  title="Instantly generate and save a realistic sample student & parent pair"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F3C876]" />
                  <span>{createSamplePairMutation.isPending ? "Adding..." : "Add Sample Pair"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleFillSampleData}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-serif font-bold bg-[#E9BA6B]/15 text-[#FCE09E] border border-[#E9BA6B]/40 hover:bg-[#E9BA6B]/25 transition-all cursor-pointer shadow-xs"
                  title="Autofill realistic sample student data into this form"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FCE09E]" />
                  <span>Fill Form</span>
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form
              id="new-student-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!formData.firstName.trim()) {
                  toast.error("Please enter the student's name");
                  return;
                }
                const phoneErr = validatePhone(formData.phone);
                if (phoneErr) {
                  toast.error(phoneErr);
                  return;
                }
                let sFirst = formData.firstName.trim();
                let sLast = formData.lastName.trim();
                if (!sLast && sFirst.includes(" ")) {
                  const parts = sFirst.split(/\s+/);
                  sFirst = parts[0] || sFirst;
                  sLast = parts.slice(1).join(" ");
                }
                if (!sLast && formData.newParentName.trim().includes(" ")) {
                  const pParts = formData.newParentName.trim().split(/\s+/);
                  sLast = pParts.slice(1).join(" ");
                }
                const { parentContactId, newParentName, ...rest } = formData;
                createMutation.mutate({
                  ...rest,
                  firstName: sFirst,
                  lastName: sLast,
                  phone: formatPhone(formData.phone),
                  ...(parentContactId ? { parentContactId: parseInt(parentContactId, 10) } : {}),
                  ...(!parentContactId && newParentName.trim() ? { newParentName: newParentName.trim() } : {}),
                });
              }}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 min-h-0"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD7E8]">Student Name *</label>
                  <VoiceInput
                    value={formData.firstName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, firstName: val });
                    }}
                    placeholder="e.g. Lucas or Lucas Sterling"
                    className="bg-[#050D1A] border-[#B88943]/30 text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD7E8]">Last Name <span className="text-[10px] font-normal text-[#7E97B8]">(or auto-split)</span></label>
                  <VoiceInput
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Sterling"
                    className="bg-[#050D1A] border-[#B88943]/30 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD7E8]">School Name</label>
                  <VoiceInput
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="e.g. North Atlanta High"
                    className="bg-[#050D1A] border-[#B88943]/30 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#CBD7E8]">Grade Level</label>
                  <VoiceInput
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    placeholder="e.g. 10th Grade"
                    className="bg-[#050D1A] border-[#B88943]/30 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5 p-2.5 rounded-xl bg-[#061121] border border-[#B88943]/30">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#FCE09E]">Parent / Family Contact</label>
                  <button
                    type="button"
                    onClick={handleQuickAddSampleParent}
                    disabled={quickAddParentMutation.isPending}
                    className="text-[11px] text-[#E9BA6B] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    title="Create and link a parent contact immediately"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{quickAddParentMutation.isPending ? "Adding..." : "Quick Sample Parent"}</span>
                  </button>
                </div>
                <VoiceInput
                  value={formData.newParentName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      newParentName: e.target.value,
                      ...(e.target.value.trim() ? { parentContactId: "" } : {}),
                    })
                  }
                  placeholder="Type new parent name (e.g. Sarah Sterling) to auto-create & link..."
                  className="bg-[#050D1A] border-[#B88943]/30 text-white text-xs h-8.5"
                />
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] text-[#7E97B8] shrink-0">Or link existing:</span>
                  <Select
                    value={formData.parentContactId || "none"}
                    onValueChange={(val) =>
                      setFormData({
                        ...formData,
                        parentContactId: val === "none" ? "" : val,
                        ...(val !== "none" ? { newParentName: "" } : {}),
                      })
                    }
                  >
                    <SelectTrigger className="bg-[#050D1A] border-[#B88943]/30 text-white h-8 text-xs flex-1">
                      <SelectValue placeholder="Select existing parent..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A1729] border-[#B88943]/40 text-white">
                      <SelectItem value="none">— Create new or none —</SelectItem>
                      {parents.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.firstName} {p.lastName}{p.company ? ` (${p.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    placeholder="e.g. Sterling Family"
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
                <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#050D1A] border border-[#B88943]/30 rounded-xl max-h-32 overflow-y-auto">
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
            </form>

            {/* Pinned Footer: Guaranteed Always Visible */}
            <div className="p-3.5 sm:p-4 border-t border-[#B88943]/25 bg-[#06101D] shrink-0 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={createSamplePairMutation.isPending}
                onClick={() => {
                  const typedStudent = `${formData.firstName} ${formData.lastName}`.trim();
                  const typedParent = formData.newParentName.trim();
                  createSamplePairMutation.mutate({
                    ...(typedStudent ? { studentName: typedStudent } : {}),
                    ...(typedParent ? { parentName: typedParent } : {}),
                    ...(formData.schoolName.trim() ? { schoolName: formData.schoolName.trim() } : {}),
                    ...(formData.gradeLevel.trim() ? { gradeLevel: formData.gradeLevel.trim() } : {}),
                    ...(formData.planType ? { planType: formData.planType } : {}),
                  });
                }}
                className="h-9 px-3 text-xs font-serif font-semibold bg-[#11233D] border-[#2A446B] text-[#F3C876] hover:text-white hover:bg-[#183156] cursor-pointer flex items-center gap-1.5 shadow-sm"
                title="1-Click create both a student and a linked parent (uses any typed names above or generates a sample pair)"
              >
                <Zap className="w-3.5 h-3.5 text-[#E9BA6B]" />
                <span>{createSamplePairMutation.isPending ? "Adding..." : "1-Click Sample Pair"}</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setNewStudentOpen(false)}
                  className="h-9 px-3 text-xs text-[#9BB1CF] hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="new-student-form"
                  disabled={createMutation.isPending}
                  className="h-9 px-4 bg-gradient-to-b from-[#FCE09E] via-[#D8A452] to-[#B88943] text-[#1A1208] text-xs font-serif font-bold rounded-lg shadow-md hover:brightness-110 cursor-pointer"
                >
                  {createMutation.isPending ? "Archiving..." : "Create Student File"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Waypoint Admiralty Manage Company Tags Modal ─── */}
        <ManageCompanyTagsModal
          open={manageTagsOpen}
          onOpenChange={setManageTagsOpen}
          companyTags={companyTags}
          onSaveTag={handleSaveCompanyTag}
          onDeleteTag={handleDeleteCompanyTag}
        />
      </div>
    </ScopedErrorBoundary>
  );
}

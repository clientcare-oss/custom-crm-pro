/**
 * State Complaint Draft Storage & Recent Drafts Registry
 * Provides persistent auto-save, multi-student draft isolation,
 * and student-specific "Open Recent" session recovery for PG-020 State Complaint Builder.
 */

import { type OfficialComplaintFormState } from "@/components/complaint/stateFormsData";

export interface StoredComplaintDraft {
  id: string; // e.g., "student-120042" or "active" or timestamp
  studentId?: number | string | null;
  studentName: string;
  title: string;
  updatedAt: string; // ISO date string
  stateCode: string;
  pageCount: number;
  statementSnippet?: string;
  formState: OfficialComplaintFormState;
  caseDetails: {
    studentName?: string;
    studentDob?: string;
    grade?: string;
    school?: string;
    district?: string;
    parentName?: string;
    preparedBy?: string;
    submissionDate?: string;
    showLogo?: boolean;
    state?: string;
  };
  pages: any[];
}

export interface RecentDraftItem {
  id: string;
  studentId?: number | string | null;
  studentName: string;
  title: string;
  updatedAt: string;
  stateCode: string;
  pageCount: number;
  statementSnippet: string;
}

const REGISTRY_KEY = "waypoint_complaint_recent_registry_v1";

/**
 * Get storage key for a specific student's draft.
 */
export function getDraftStorageKey(idOrStudentId?: string | number | null): string {
  if (!idOrStudentId || idOrStudentId === "active") {
    return "complaint_draft_active";
  }
  return `complaint_draft_student_${idOrStudentId}`;
}

/**
 * Save draft into localStorage and update the Recent Drafts Registry.
 * If isCheckpoint is true, preserves this version as a distinct historical revision.
 */
export function saveComplaintDraft(draft: StoredComplaintDraft, isCheckpoint = false): void {
  if (typeof window === "undefined") return;

  try {
    const studentId = draft.studentId || draft.id || "active";
    const primaryKey = getDraftStorageKey(studentId);
    const serialized = JSON.stringify(draft);
    localStorage.setItem(primaryKey, serialized);

    const draftEntryId = isCheckpoint
      ? `complaint_checkpoint_${studentId}_${Date.now()}`
      : draft.id || `draft_${studentId}`;

    if (isCheckpoint) {
      localStorage.setItem(draftEntryId, serialized);
    }

    // Also update generic active draft for backward compatibility
    localStorage.setItem("complaint_draft_active", serialized);
    localStorage.setItem(
      `complaint_form_state_${studentId}`,
      JSON.stringify(draft.formState)
    );
    localStorage.setItem("complaint_form_state_active", JSON.stringify(draft.formState));

    // Update Recent Registry (limit to 35 items)
    const existingList = listRecentComplaintDrafts();
    const snippet = (
      draft.formState?.statementOfViolations ||
      draft.formState?.factsRelatingToViolations ||
      draft.pages?.[1]?.content ||
      ""
    ).slice(0, 140);

    const newItem: RecentDraftItem = {
      id: draftEntryId,
      studentId: draft.studentId,
      studentName: draft.studentName || draft.caseDetails?.studentName || "Student on Record",
      title: draft.title || `State Complaint – ${draft.studentName || "Draft"}`,
      updatedAt: draft.updatedAt || new Date().toISOString(),
      stateCode: draft.stateCode || draft.formState?.stateCode || "GA",
      pageCount: draft.pages?.length || 4,
      statementSnippet: snippet,
    };

    const filtered = isCheckpoint
      ? existingList.filter((item) => item.id !== draftEntryId)
      : existingList.filter((item) => {
          if (draft.studentId && item.studentId) {
            return String(item.studentId) !== String(draft.studentId);
          }
          return item.id !== draft.id;
        });

    const updatedRegistry = [newItem, ...filtered].slice(0, 35);
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(updatedRegistry));
  } catch (err) {
    console.warn("[saveComplaintDraft] localStorage quota exceeded or error:", err);
  }
}

/**
 * Load draft by studentId or checkpoint/draftId.
 */
export function loadComplaintDraft(idOrStudentId?: string | number | null): StoredComplaintDraft | null {
  if (typeof window === "undefined" || !idOrStudentId) return null;

  try {
    // 0. Try direct checkpoint/draft key first
    const directData = localStorage.getItem(String(idOrStudentId));
    if (directData) {
      return JSON.parse(directData) as StoredComplaintDraft;
    }

    // 1. Try student-specific key
    const studentKey = getDraftStorageKey(idOrStudentId);
    const studentData = localStorage.getItem(studentKey);
    if (studentData) {
      return JSON.parse(studentData) as StoredComplaintDraft;
    }

    // 2. Try active key if requested
    if (idOrStudentId === "active") {
      const activeData = localStorage.getItem("complaint_draft_active");
      if (activeData) {
        return JSON.parse(activeData) as StoredComplaintDraft;
      }
    }
  } catch (err) {
    console.warn("[loadComplaintDraft] Error reading draft:", err);
  }

  return null;
}

/**
 * List all recent complaint drafts from the registry.
 */
export function listRecentComplaintDrafts(): RecentDraftItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) return list;
  } catch (err) {
    console.warn("[listRecentComplaintDrafts] Error reading registry:", err);
  }
  return [];
}

/**
 * List recent drafts strictly filtered for a specific student.
 */
export function listRecentDraftsForStudent(studentId?: string | number | null, studentName?: string): RecentDraftItem[] {
  const all = listRecentComplaintDrafts();
  if (!studentId && (!studentName || studentName.includes("Student on Record"))) {
    return all;
  }

  return all.filter((d) => {
    if (studentId && d.studentId && String(d.studentId) === String(studentId)) {
      return true;
    }
    if (studentName && d.studentName && d.studentName.toLowerCase().trim() === studentName.toLowerCase().trim()) {
      return true;
    }
    return false;
  });
}

/**
 * Delete draft from storage and registry.
 */
export function deleteComplaintDraft(idOrStudentId: string | number): void {
  if (typeof window === "undefined") return;

  try {
    const directKey = String(idOrStudentId);
    const studentKey = getDraftStorageKey(idOrStudentId);
    localStorage.removeItem(directKey);
    localStorage.removeItem(studentKey);

    const existingList = listRecentComplaintDrafts();
    const updated = existingList.filter(
      (item) => item.id !== String(idOrStudentId) && String(item.studentId) !== String(idOrStudentId)
    );
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("[deleteComplaintDraft] Error deleting draft:", err);
  }
}

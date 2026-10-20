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
    const draftEntryId = isCheckpoint
      ? `complaint_checkpoint_${studentId}_${Date.now()}`
      : draft.id || `draft_${studentId}`;

    const writeKeys = (serializedData: string) => {
      // 1. Primary student key
      localStorage.setItem(primaryKey, serializedData);
      // 2. Draft entry key (always save both for checkpoints and standard auto-saves)
      localStorage.setItem(draftEntryId, serializedData);
      // 3. Direct numeric/id student key (matching ComplaintWorkspace auto-save)
      if (draft.studentId) {
        localStorage.setItem(`complaint_draft_${draft.studentId}`, serializedData);
        localStorage.setItem(`complaint_draft_student_${draft.studentId}`, serializedData);
      }
      if (studentId !== "active") {
        localStorage.setItem(`complaint_draft_${studentId}`, serializedData);
      }
      // 4. Global active fallback
      localStorage.setItem("complaint_draft_active", serializedData);

      // 5. Form states
      if (draft.formState) {
        const formSerialized = JSON.stringify(draft.formState);
        localStorage.setItem(`complaint_form_state_${studentId}`, formSerialized);
        if (draft.studentId) {
          localStorage.setItem(`complaint_form_state_${draft.studentId}`, formSerialized);
        }
        localStorage.setItem("complaint_form_state_active", formSerialized);
      }
    };

    try {
      writeKeys(JSON.stringify(draft));
    } catch (quotaErr) {
      console.warn("[saveComplaintDraft] LocalStorage quota reached on full draft. Saving text & form state without large image buffers:", quotaErr);
      // Remove heavy base64 dataUrl from renderedPages while preserving all text, issues, facts, and form data
      const lightweightDraft = {
        ...draft,
        pages: (draft.pages || []).map((p: any) => {
          if (p.renderedPages && Array.isArray(p.renderedPages)) {
            return {
              ...p,
              renderedPages: p.renderedPages.map((rp: any) => ({
                pageNumber: rp.pageNumber,
                width: rp.width,
                height: rp.height,
              })),
            };
          }
          return p;
        }),
      };
      writeKeys(JSON.stringify(lightweightDraft));
    }

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
 * Load draft by studentId or checkpoint/draftId with comprehensive key resolution.
 */
export function loadComplaintDraft(idOrStudentId?: string | number | null): StoredComplaintDraft | null {
  if (typeof window === "undefined" || !idOrStudentId) return null;

  try {
    const rawKey = String(idOrStudentId).trim();
    if (!rawKey) return null;

    // Collect all candidate keys to check in order of priority
    const candidates: string[] = [rawKey];

    // Check with getDraftStorageKey
    candidates.push(getDraftStorageKey(rawKey));

    // Handle 'draft_120042' -> '120042'
    if (rawKey.startsWith("draft_")) {
      const stripped = rawKey.replace(/^draft_/, "");
      candidates.push(
        stripped,
        getDraftStorageKey(stripped),
        `complaint_draft_${stripped}`,
        `complaint_draft_student_${stripped}`,
        `complaint_checkpoint_${stripped}`
      );
    }

    // Handle 'complaint_checkpoint_120042_...'
    if (rawKey.startsWith("complaint_checkpoint_")) {
      const parts = rawKey.split("_");
      if (parts.length >= 3) {
        const extractedStudentId = parts[2];
        candidates.push(
          extractedStudentId,
          getDraftStorageKey(extractedStudentId),
          `complaint_draft_${extractedStudentId}`,
          `complaint_draft_student_${extractedStudentId}`
        );
      }
    }

    // Check explicit complaint_draft_ variants
    candidates.push(
      `complaint_draft_${rawKey}`,
      `complaint_draft_student_${rawKey}`,
      `draft_${rawKey}`
    );

    // Active key as fallback if rawKey is 'active'
    if (rawKey === "active") {
      candidates.push("complaint_draft_active");
    }

    // Deduplicate candidates
    const uniqueCandidates = Array.from(new Set(candidates));

    for (const key of uniqueCandidates) {
      const rawData = localStorage.getItem(key);
      if (rawData) {
        try {
          const parsed = JSON.parse(rawData);
          if (parsed && typeof parsed === "object") {
            // Check if it has complaint data (pages, formState, caseDetails, or title)
            if (parsed.formState || parsed.pages || parsed.caseDetails || parsed.complaintTitle || parsed.title) {
              const numericId = rawKey.replace(/\D/g, "");
              const normalized: StoredComplaintDraft = {
                id: parsed.id || key,
                studentId: parsed.studentId ?? (numericId ? Number(numericId) : null),
                studentName: parsed.studentName || parsed.caseDetails?.studentName || parsed.formState?.studentName || "Student on Record",
                title: parsed.title || parsed.complaintTitle || `State Complaint – ${parsed.studentName || "Draft"}`,
                updatedAt: parsed.updatedAt || parsed.savedAt || new Date().toISOString(),
                stateCode: parsed.stateCode || parsed.formState?.stateCode || "GA",
                pageCount: Array.isArray(parsed.pages) ? parsed.pages.length : 4,
                statementSnippet: parsed.statementSnippet || "",
                formState: parsed.formState || {},
                caseDetails: parsed.caseDetails || {},
                pages: Array.isArray(parsed.pages) ? parsed.pages : [],
              };
              return normalized;
            }
          }
        } catch (e) {
          console.warn("[loadComplaintDraft] Failed to parse candidate key:", key, e);
        }
      }
    }

    // Exhaustive fallback: Search all localStorage keys for any key containing the numeric studentId
    const numericStudentId = rawKey.replace(/\D/g, "");
    if (numericStudentId) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes(numericStudentId) && (k.includes("complaint") || k.includes("draft"))) {
          const d = localStorage.getItem(k);
          if (d) {
            try {
              const p = JSON.parse(d);
              if (p && typeof p === "object" && (p.formState || p.pages || p.caseDetails || p.complaintTitle)) {
                return {
                  id: p.id || k,
                  studentId: Number(numericStudentId),
                  studentName: p.studentName || p.caseDetails?.studentName || p.formState?.studentName || "Student on Record",
                  title: p.title || p.complaintTitle || "State Complaint Draft",
                  updatedAt: p.updatedAt || p.savedAt || new Date().toISOString(),
                  stateCode: p.stateCode || p.formState?.stateCode || "GA",
                  pageCount: Array.isArray(p.pages) ? p.pages.length : 4,
                  statementSnippet: p.statementSnippet || "",
                  formState: p.formState || {},
                  caseDetails: p.caseDetails || {},
                  pages: Array.isArray(p.pages) ? p.pages : [],
                };
              }
            } catch {}
          }
        }
      }
    }

    // Last-ditch active draft fallback if nothing else was found
    const activeData = localStorage.getItem("complaint_draft_active");
    if (activeData) {
      try {
        const p = JSON.parse(activeData);
        if (p && (p.formState || p.pages || p.caseDetails)) {
          return {
            id: p.id || "complaint_draft_active",
            studentId: p.studentId || (numericStudentId ? Number(numericStudentId) : null),
            studentName: p.studentName || p.caseDetails?.studentName || "Student on Record",
            title: p.title || p.complaintTitle || "State Complaint Draft",
            updatedAt: p.updatedAt || p.savedAt || new Date().toISOString(),
            stateCode: p.stateCode || p.formState?.stateCode || "GA",
            pageCount: Array.isArray(p.pages) ? p.pages.length : 4,
            statementSnippet: p.statementSnippet || "",
            formState: p.formState || {},
            caseDetails: p.caseDetails || {},
            pages: Array.isArray(p.pages) ? p.pages : [],
          };
        }
      } catch {}
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

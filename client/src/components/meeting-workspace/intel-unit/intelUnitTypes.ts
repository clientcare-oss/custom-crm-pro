export type PrimaryChapterId =
  | "overview"
  | "present_levels"
  | "goals"
  | "accommodations"
  | "services"
  | "placement";

export type MoreChapterId =
  | "evaluations"
  | "behavior_supports"
  | "assistive_technology"
  | "transition";

export type IntelChapterId = PrimaryChapterId | MoreChapterId;

export interface IntelChapterMeta {
  id: IntelChapterId;
  label: string;
  shortLabel: string;
  isMore?: boolean;
  iepSectionName: string;
  description: string;
}

export const INTEL_PRIMARY_CHAPTERS: IntelChapterMeta[] = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Overview",
    iepSectionName: "Overview",
    description: "Review coverage, saved findings, and discussion items ready for Blueprint.",
  },
  {
    id: "present_levels",
    label: "Present Levels",
    shortLabel: "Present Levels",
    iepSectionName: "Present Levels / Academics",
    description: "Documented baselines, identified student needs, and source-linked questions.",
  },
  {
    id: "goals",
    label: "Goals",
    shortLabel: "Goals",
    iepSectionName: "Annual Goals",
    description: "Goal selection and Goal Auditor with baseline checks and three improvement paths.",
  },
  {
    id: "accommodations",
    label: "Accommodations",
    shortLabel: "Accommodations",
    iepSectionName: "Accommodations / Supports",
    description: "Current documented supports, suggested accommodations, documented needs, and wording.",
  },
  {
    id: "services",
    label: "Services",
    shortLabel: "Services",
    iepSectionName: "Related Services / AAC",
    description: "Special education and related service provisions, frequency, duration, and location.",
  },
  {
    id: "placement",
    label: "Placement",
    shortLabel: "Placement",
    iepSectionName: "Placement / LRE",
    description: "Least Restrictive Environment (LRE) placement provisions, setting percentages, and justification.",
  },
];

export const INTEL_MORE_CHAPTERS: IntelChapterMeta[] = [
  {
    id: "evaluations",
    label: "Evaluations & Assessments",
    shortLabel: "Evaluations",
    isMore: true,
    iepSectionName: "Evaluations & Assessments",
    description: "Triennial evaluations, IEEs, assessment dates, and unassessed areas of suspected disability.",
  },
  {
    id: "behavior_supports",
    label: "Behavior Supports (FBA / BIP)",
    shortLabel: "Behavior Supports",
    isMore: true,
    iepSectionName: "Special Factors / Behavior",
    description: "Functional Behavior Assessment (FBA), Behavior Intervention Plan (BIP), and positive supports.",
  },
  {
    id: "assistive_technology",
    label: "Assistive Technology & AAC",
    shortLabel: "Assistive Tech",
    isMore: true,
    iepSectionName: "Related Services / AAC",
    description: "Assistive technology devices, AAC trials, staff training, and cross-setting implementation.",
  },
  {
    id: "transition",
    label: "Transition Planning",
    shortLabel: "Transition",
    isMore: true,
    iepSectionName: "Transition Planning",
    description: "Post-secondary transition assessments, measurable goals, and agency linkages.",
  },
];

export const ALL_INTEL_CHAPTERS: IntelChapterMeta[] = [
  ...INTEL_PRIMARY_CHAPTERS,
  ...INTEL_MORE_CHAPTERS,
];

export type CheckTriState = "unchecked" | "documented" | "gap_identified";

export interface GoalImprovementSuggestion {
  key: "clarify_skill" | "strengthen_measurement" | "improve_alignment";
  number: 1 | 2 | 3;
  title: string;
  promptHint: string;
  rationale: string;
  proposedWording: string;
}

export interface GoalAuditWorkspaceItem {
  id: string;
  domain: string;
  originalGoal: string;
  sourcePage: string;
  sourceQuote: string;
  baselineCheck: CheckTriState;
  measurementCheck: CheckTriState;
  conditionCheck: CheckTriState;
  alignmentCheck: CheckTriState;
  findingSummary: string;
  reasoning: string;
  selectedSuggestionKey?: "clarify_skill" | "strengthen_measurement" | "improve_alignment" | null;
  suggestions: GoalImprovementSuggestion[];
  savedToDiscussion?: boolean;
  sentToBlueprint?: boolean;
}

export type RelatedSupportExistence =
  | "unverified"
  | "none_found"
  | "partial_or_testing_only"
  | "exists_needs_revision";

export interface AccommodationWorkspaceItem {
  id: string;
  category: string;
  currentDocumentedSupport: string;
  sourceReference: string;
  suggestedAccommodation: string;
  documentedNeed: string;
  relatedSupportStatus: RelatedSupportExistence;
  proposedWording: string;
  advocateNote: string;
  savedToDiscussion?: boolean;
  sentToBlueprint?: boolean;
}

export interface ChapterReviewState {
  documentedProvisions: string;
  identifiedNeedsOrBaselines: string;
  reviewQuestions: string;
  sourceReference: string;
  advocateNotes: string;
  proposedWording: string;
  explicitlyReviewed?: boolean;
}

export interface VaultDocumentOption {
  id: number;
  fileName: string;
  documentType: string;
  documentDate: string | null;
  uploadedAt?: string | null;
  mimeType?: string;
  category?: string;
  isCurrentPlan?: number;
  uploadOrigin?: string;
  fileUrl?: string;
}

export interface IntelBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IntelIndexedPage {
  pdfPageNumber: number;
  printedPageLabel: string | null;
  status: "readable" | "partial" | "unreadable";
  extractionMethod: "native_pdf" | "ocr_fallback" | "none";
  extractedText: string;
  textItems: Array<{
    text: string;
    box: IntelBoundingBox;
  }>;
  charCount: number;
  wordCount: number;
}

export interface IntelDocumentIndex {
  fileId: number;
  studentContactId: number;
  workspaceId: number | null;
  fileName: string;
  contentFingerprint: string;
  iepDocumentDate: string | null;
  iepDocumentDateLabel: string | null;
  uploadedAt: string | null;
  pageCount: number;
  readablePageCount: number;
  partialPageCount: number;
  unreadablePageCount: number;
  failedPages: number[];
  overallStatus: "complete" | "partial" | "failed";
  pages: IntelIndexedPage[];
}

export interface IntelActiveHighlight {
  documentId: number | null;
  pdfPageNumber: number | null;
  printedPageLabel?: string | null;
  excerpt: string;
  boundingBoxes: IntelBoundingBox[];
  verificationStatus: "verified" | "page_only" | "unverified";
  verificationReason?: string;
}

export interface IntelReadingPosition {
  docId: number | null;
  pageNumber: number;
  zoomPercent: number;
}

export interface PriorIepComparisonRecord {
  priorDocId: number | null;
  priorPageRef: string;
  priorWording: string;
  comparisonNotes: string;
  changeDisposition: "undetermined" | "removed_or_reduced" | "wording_changed" | "retained";
}

export interface IntelDocumentScopedWork {
  pageNumber: number;
  zoomPercent: number;
  goalSlots: GoalAuditWorkspaceItem[];
  accommodationSlots: AccommodationWorkspaceItem[];
  chapterStates: Record<IntelChapterId, ChapterReviewState>;
  priorComparisons?: Record<string, PriorIepComparisonRecord>;
}

export interface IntelPersistedState {
  selectedDocId: number | null;
  activeChapter: IntelChapterId;
  byDocument: Record<string, IntelDocumentScopedWork>;
}



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

export type RecordsReviewViewMode = "read" | "compare" | "prepare";

export type RecordReviewGroup =
  | "current_iep"
  | "school_evaluation"
  | "outside_evaluation"
  | "historical_iep";

export type ComparisonIepSection =
  | "Present levels"
  | "Goals"
  | "Accommodations"
  | "Services"
  | "Placement"
  | "Behavior supports"
  | "Assistive technology";

export type ComparisonConnectionStatus =
  | "Addressed"
  | "Partially addressed"
  | "Not located"
  | "Needs review";

export type FindingPriority = "high" | "medium" | "low";

export const COMPARISON_IEP_SECTIONS: ComparisonIepSection[] = [
  "Present levels",
  "Goals",
  "Accommodations",
  "Services",
  "Placement",
  "Behavior supports",
  "Assistive technology",
];

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
    label: "All Sections · Overview",
    shortLabel: "Overview",
    iepSectionName: "Overview",
    description: "Review coverage, saved findings, meeting questions, and items ready for Blueprint.",
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
    label: "Assistive Technology & Communication",
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
  returnViewMode?: RecordsReviewViewMode;
}

export interface PriorIepComparisonRecord {
  priorDocId: number | null;
  priorPageRef: string;
  priorWording: string;
  comparisonNotes: string;
  changeDisposition: "undetermined" | "removed_or_reduced" | "wording_changed" | "retained";
}

export interface SavedMeetingQuestionItem {
  id: string;
  section: string;
  question: string;
  sourceCitation?: string;
  sourceDocId?: number | null;
  sourcePageNumber?: number | null;
  priority: FindingPriority;
  confirmed: boolean;
  addedToBlueprint?: boolean;
}

export interface IntelDocumentScopedWork {
  pageNumber: number;
  zoomPercent: number;
  goalSlots: GoalAuditWorkspaceItem[];
  accommodationSlots: AccommodationWorkspaceItem[];
  chapterStates: Record<IntelChapterId, ChapterReviewState>;
  priorComparisons?: Record<string, PriorIepComparisonRecord>;
}

export type AiReviewProcessingStage =
  | "preparing_documents"
  | "reading_iep"
  | "comparing_evaluations"
  | "organizing_findings";

export interface AiReviewRecordSummaryItem {
  fileId: number;
  fileName: string;
  recordGroup: RecordReviewGroup;
  documentDate: string | null;
  pageCount: number;
  readablePageCount: number;
  unreadablePageCount: number;
  overallStatus: "complete" | "partial" | "failed" | "unavailable" | "unsupported";
  limitationNote?: string | null;
}

export interface AiReviewRunSnapshot {
  status: "ready" | "in_progress";
  completedAt: string;
  currentIepId: number;
  currentIepFileName: string;
  schoolEvalIds: number[];
  outsideEvalIds: number[];
  reviewedRecordsSummary: AiReviewRecordSummaryItem[];
  findingsCount: number;
}

export interface IntelPersistedState {
  selectedDocId: number | null;
  activeChapter: IntelChapterId;
  byDocument: Record<string, IntelDocumentScopedWork>;
  reviewViewMode?: RecordsReviewViewMode;
  firstMateOpen?: boolean;
  activeGuidedFindingId?: string | null;
  selectedEvalIdsForCompare?: number[];
  firstMateSelectedDocIds?: number[];
  savedMeetingQuestions?: SavedMeetingQuestionItem[];
  findingQuestionsMap?: Record<string, string>;
  findingPrioritiesMap?: Record<string, FindingPriority>;
  aiDraftFindingIds?: string[];
  recordGroupOverrides?: Record<number, RecordReviewGroup>;
  lastAiReviewSnapshot?: AiReviewRunSnapshot | null;
}

export function resolveClientRecordGroup(
  doc: VaultDocumentOption,
  overrides?: Record<number, RecordReviewGroup>
): RecordReviewGroup {
  if (overrides && overrides[doc.id]) {
    return overrides[doc.id];
  }
  const cat = String(doc.category || "").toLowerCase();
  const docType = String(doc.documentType || "").toLowerCase();
  const name = String(doc.fileName || "").toLowerCase();
  const combined = `${cat} ${docType} ${name}`;

  if (
    cat === "outside-evaluations" ||
    docType.includes("outside") ||
    docType.includes("independent") ||
    docType.includes("iee")
  ) {
    return "outside_evaluation";
  }
  if (
    cat === "school-evaluations" ||
    docType.includes("school eval") ||
    docType.includes("district eval")
  ) {
    return "school_evaluation";
  }
  if (doc.isCurrentPlan === 1 && !combined.includes("eval")) {
    return "current_iep";
  }
  if (
    combined.includes("outside") ||
    combined.includes("independent") ||
    combined.includes("iee") ||
    combined.includes("private") ||
    combined.includes("neuropsych") ||
    combined.includes("clinical") ||
    combined.includes("medical") ||
    cat === "medical-therapy"
  ) {
    return "outside_evaluation";
  }
  if (
    combined.includes("eval") ||
    combined.includes("psychoed") ||
    combined.includes("psycho-ed") ||
    combined.includes("psychological") ||
    combined.includes("assessment") ||
    combined.includes("fba") ||
    combined.includes("wechsler") ||
    combined.includes("wj-") ||
    combined.includes("woodcock") ||
    combined.includes("speech") ||
    combined.includes("occupational") ||
    cat === "evaluations" ||
    cat === "behavior-fba"
  ) {
    return "school_evaluation";
  }
  if (
    combined.includes("iep") ||
    combined.includes("504") ||
    cat === "ieps-504s"
  ) {
    return doc.isCurrentPlan === 1 ? "current_iep" : "historical_iep";
  }
  return "school_evaluation";
}

export function formatShortFileName(
  fileName: string | null | undefined,
  maxLen = 34
): string {
  if (!fileName) return "Untitled Document";
  const clean = fileName.replace(/^\d{10,}-/, "").trim();
  if (clean.length <= maxLen) return clean;
  const extIdx = clean.lastIndexOf(".");
  if (extIdx > 0 && clean.length - extIdx <= 6) {
    const ext = clean.slice(extIdx);
    const stem = clean.slice(0, maxLen - ext.length - 1);
    return `${stem}…${ext}`;
  }
  return `${clean.slice(0, maxLen - 1)}…`;
}

export function getCanonicalIepSectionOrder(sectionLabel?: string | null): number {
  const s = String(sectionLabel || "").toLowerCase();
  if (s.includes("present") || s.includes("baseline") || s.includes("plaafp")) return 1;
  if (s.includes("eval") || s.includes("assessment")) return 2;
  if (s.includes("goal")) return 3;
  if (s.includes("accommodat") || s.includes("modification")) return 4;
  if (s.includes("service") || s.includes("minute") || s.includes("frequency")) return 5;
  if (s.includes("assistive") || s.includes("aac") || s.includes("communication")) return 6;
  if (s.includes("behavior") || s.includes("fba") || s.includes("bip")) return 7;
  if (s.includes("placement") || s.includes("lre") || s.includes("setting")) return 8;
  if (s.includes("transition")) return 9;
  return 10;
}

export function getFindingEffectiveIepPage(
  finding: {
    sourceRef?: { documentId?: number; pdfPageNumber?: number | null } | null;
    relevantIepSectionPage?: number | null;
    quote?: string;
  },
  currentIepDocId?: number | null
): number {
  if (
    finding.sourceRef?.pdfPageNumber &&
    finding.sourceRef.pdfPageNumber > 0 &&
    (!currentIepDocId ||
      !finding.sourceRef.documentId ||
      finding.sourceRef.documentId === currentIepDocId)
  ) {
    return finding.sourceRef.pdfPageNumber;
  }
  if (finding.relevantIepSectionPage && finding.relevantIepSectionPage > 0) {
    return finding.relevantIepSectionPage;
  }
  if (finding.sourceRef?.pdfPageNumber && finding.sourceRef.pdfPageNumber > 0) {
    return finding.sourceRef.pdfPageNumber;
  }
  if (finding.quote) {
    const m = finding.quote.match(/\b(?:page|p\.?)\s*(\d+)\b/i);
    if (m) return parseInt(m[1], 10);
  }
  return 9999;
}

export function sortFindingsInIepDocumentOrder<
  T extends {
    id: string;
    category?: string;
    section?: string;
    quote?: string;
    relevantIepSectionPage?: number | null;
    sourceRef?: {
      documentId?: number;
      pdfPageNumber?: number | null;
      boundingBoxes?: IntelBoundingBox[];
    } | null;
  }
>(items: T[], currentIepDocId?: number | null): T[] {
  return [...items].sort((a, b) => {
    const pageA = getFindingEffectiveIepPage(a, currentIepDocId);
    const pageB = getFindingEffectiveIepPage(b, currentIepDocId);
    if (pageA !== pageB) return pageA - pageB;

    const yA = a.sourceRef?.boundingBoxes?.[0]?.y ?? 50;
    const yB = b.sourceRef?.boundingBoxes?.[0]?.y ?? 50;
    if (Math.abs(yA - yB) > 1.5) return yA - yB;

    const secA = getCanonicalIepSectionOrder(a.section || a.category);
    const secB = getCanonicalIepSectionOrder(b.section || b.category);
    if (secA !== secB) return secA - secB;

    return 0;
  });
}

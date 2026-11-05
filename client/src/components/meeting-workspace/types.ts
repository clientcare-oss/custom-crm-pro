export type MeetingWorkspaceStatus = "PREPARING" | "READY" | "LIVE" | "COMPLETED";

export type WorkspaceTab = "ASSEMBLY" | "BLUEPRINT" | "MEETING_MODE" | "PREP" | "ADVOCATE_READY" | "PARENT_READY";

export type PrepStep = "iep_intel" | "parent_intel" | "pcs" | "blueprint" | "ready";

export type FindingStatus = "keep" | "important" | "edit" | "dismiss";

export interface FindingSourceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FindingSourceReference {
  documentId: number;
  fileName: string;
  contentFingerprint?: string;
  pdfPageNumber: number | null;
  printedPageLabel?: string | null;
  excerpt?: string | null;
  boundingBoxes?: FindingSourceBoundingBox[];
  verificationStatus: "verified" | "page_only" | "unverified";
  verificationReason?: string;
}

export interface FindingEvaluationSourceReference extends FindingSourceReference {
  recordGroup?: "school_evaluation" | "outside_evaluation";
  documentDate?: string | null;
}

export interface IepIntelFinding {
  id: string;
  category: string;
  section: string;
  text: string;
  quote?: string;
  status: FindingStatus;
  isCustom?: boolean;
  advocateConfirmed?: boolean;
  aiGeneratedDraft?: boolean;
  reviewDecision?: "pending" | "saved" | "reviewed" | "dismissed";
  priority?: "high" | "medium" | "low";
  proposedQuestion?: string;
  whyItMatters?: string;
  sourceRef?: FindingSourceReference;
  evalSourceRef?: FindingEvaluationSourceReference;
  iepLocateStatus?: "Addressed" | "Partially addressed" | "Not located" | "Needs review";
  relevantIepSectionPage?: number | null;
  linkedTargetId?: string;
  sourceMaterialFlaggedForReview?: boolean;
  sourceMaterialFlagReason?: string;
  archivedMeetingOutcome?: {
    targetId: string;
    meetingStatus: TargetMeetingStatus;
    requestRaised?: boolean;
    notes?: string;
    approvedAt?: string;
    archivedAt: string;
  };
}

export interface ParentIntelConcern {
  id: string;
  topic: string;
  concern: string;
  source?: string;
  status: "keep" | "edit" | "dismiss";
  isCustom?: boolean;
}

export type TargetMeetingStatus = "NOT_DISCUSSED" | "DISCUSSED" | "APPROVED" | "AGREED" | "DENIED" | "DEFERRED" | "FOLLOW_UP";

export type TargetTagType = "ADVOCATE_REPAIR" | "IMPORTANT" | "PARENT_DOESNT_WANT" | "SKIP";

export type BlueprintParentReviewStatus =
  | "review_with_parent"
  | "parent_approved"
  | "ready_for_meeting";

export type BlueprintItemDestination =
  | "final_meeting_plan"
  | "keep_in_blueprint"
  | "parent_doesnt_want"
  | "set_aside";

export type ParentScriptStyleType =
  | "auto"
  | "accommodation"
  | "missing_goal"
  | "clarification";

export interface CombinedFindingSourceItem {
  findingId: string;
  findingText?: string;
  iepSection?: string;
  sourceRef?: FindingSourceReference;
  evalSourceRef?: FindingEvaluationSourceReference;
  sources?: string[];
}

export interface TargetRepairDetails {
  reasons: string[];
  note?: string;
  updatedAt?: string;
}

export interface MeetingTarget {
  id: string;
  externalTargetId?: string; // e.g. "TARGET-001"
  targetName: string; // e.g. "Noise Support"
  iepSection: string; // e.g. "Accommodations / Supports"
  sectionOrder: number;
  targetOrder: number;
  
  // Advocate scripts & strategy (Original technical analysis kept separate from parent-friendly explanation)
  quickAdvocateSayThis: string; // Proposed request / live script
  fullAdvocateScript: string;
  putItHereLocation: string; // e.g. "IEP Section 8 (Classroom Accommodations)"
  possibleIepWording: string;
  whyWeWantIt: string;
  supportingEvidence: string;
  sources: string[]; // ["Current IEP p. 12", "Parent Concern Statement"]
  ifTeamDisagrees: string;

  // Four Editable Parent-Friendly Blueprint Sections
  parentWhatWeFound?: string; // 1. What we found: gap or concern in plain language
  parentWhyWeWantIt: string; // 2. Why it matters: practical impact on the student
  parentWhatWeWant: string; // 3. What we want to ask for: specific proposed request
  parentInput?: string; // 4. Your input: parent's observations, priorities, questions, or requested changes
  parentSupportingEvidence: string;

  // Editable "What to Say to the Parent" Read-Aloud Script (Separate from formal meeting request, technical analysis, and parent feedback)
  whatToSayToParent?: string;
  whatToSayToParentEdited?: boolean;
  whatToSayToParentStyle?: ParentScriptStyleType;

  // Deliberate Parent-Review Status & Destination Controls
  parentReviewStatus?: BlueprintParentReviewStatus;
  blueprintDestination?: BlueprintItemDestination;
  parentDoesntWantReason?: string;
  removedFromPlan?: boolean;
  removedFromPlanAt?: string;
  parentPriorityOrder?: number;

  // Combined Findings Lineage (retaining every source reference when findings are merged)
  combinedSourceFindingIds?: string[];
  combinedSourceItems?: CombinedFindingSourceItem[];

  // Tags & Repair Tracking
  tags?: TargetTagType[];
  repairDetails?: TargetRepairDetails;

  // Live Meeting Mode State
  requestRaised: boolean; // Checkbox (means request was raised to the team)
  meetingStatus: TargetMeetingStatus;
  pwnNeeded: boolean;
  addedToIep: boolean;
  followUpNeeded: boolean;
  followUpOwnerDate?: string;
  notes?: string;
  isCustom?: boolean;

  // Contextual post-approval fields
  approvedAt?: string;
  responsiblePerson?: string;
  deadlineDate?: string;
  conditionNote?: string;

  // Connected Finding Lineage (Records Review -> Blueprint -> Meeting Space)
  sourceFindingId?: string;
  sourceRef?: FindingSourceReference;
  evalSourceRef?: FindingEvaluationSourceReference;
  priority?: "high" | "medium" | "low";
  sourceMaterialFlaggedForReview?: boolean;
  sourceMaterialFlagReason?: string;
  archivedOrWithdrawn?: boolean;
  archivedAt?: string;
  archivedReason?: string;
  archivedMeetingOutcome?: TargetMeetingStatus;
}

export interface AdvocateReadyImportItem extends MeetingTarget {
  included: boolean;
  needsReview?: boolean;
  reviewReason?: string;
}

export interface AdvocateReadyParseResult {
  detectedOrder: string[];
  targets: AdvocateReadyImportItem[];
  rawSummary?: string;
}

export interface ParkingLotItem {
  id: string;
  note: string;
  createdAt: string;
  status: "open" | "resolved" | "follow_up" | "carry_forward" | "not_needed";
}

export interface AdditionalItem {
  id: string;
  text: string;
  status: "open" | "discussed";
}

// ─── Live Meeting Follow-Through & Quick Note Taking Engine ───

export interface ScratchNote {
  id: string;
  text: string;
  createdAt: string; // e.g. "10:14 AM"
  movedToBeforeWeEnd?: boolean;
}

export type BeforeWeEndStatus =
  | "UNRESOLVED"
  | "APPROVED"
  | "DISCUSSED"
  | "DENIED"
  | "DEFERRED"
  | "FOLLOW_UP";

export interface BeforeWeEndItem {
  id: string;
  text: string;
  status: BeforeWeEndStatus;
  completed?: boolean; // Checkbox completion state: true when addressed/classified
  sourceNoteId?: string; // If converted from Scratch Pad note
  createdAt: string;
  approvedAt?: string;
  responsiblePerson?: string;
  deadlineDate?: string;
  conditionNote?: string;
}

export interface MeetingMinutesHistoryItem {
  action: string;
  timestamp: string;
  note?: string;
}

export interface MeetingMinutesEntry {
  id: string;
  sourceType: "target" | "before_we_end";
  sourceId: string;
  title: string;
  details?: string;
  status: "APPROVED" | "WITHDRAWN" | "MODIFIED";
  approvedAt: string;
  responsiblePerson?: string;
  deadlineDate?: string;
  notes?: string;
  history?: MeetingMinutesHistoryItem[];
}

export interface DocumentCheckItem {
  id: string;
  sourceType: "target" | "before_we_end";
  sourceId: string;
  title: string;
  expectedWordingOrDetails?: string;
  iepSectionOrLocation?: string;
  verified: boolean; // Verification against revised IEP document
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  status: "ACTIVE_AGREEMENT" | "WITHDRAWN";
  approvedAt: string;
}

export interface MeetingTimelineEvent {
  id: string;
  sourceId?: string;
  sourceType?: "target" | "before_we_end" | "meeting" | "scratch";
  timestamp: string; // e.g. "10:14 AM"
  type: "APPROVAL" | "APPROVAL_WITHDRAWN" | "STATUS_CHANGE" | "NOTE_CONVERTED" | "SESSION_START";
  title: string;
  description?: string;
}

export interface CloseoutChecks {
  allRequestsRaised: boolean;
  pwnIdentified: boolean;
  agreedLocationsClear: boolean;
  followUpAssigned: boolean;
  nextMeetingDiscussed: boolean;
  parentDoesntWant?: string;
  // Live Meeting Extension State
  scratchNotes?: ScratchNote[];
  scratchpadText?: string;
  beforeWeEndItems?: BeforeWeEndItem[];
  minutesEntries?: MeetingMinutesEntry[];
  documentCheckItems?: DocumentCheckItem[];
  timelineEvents?: MeetingTimelineEvent[];
}

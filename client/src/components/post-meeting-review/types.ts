export type FindingSeverity = "review_first" | "check" | "cleared";

export type FindingSourceTag = "comparator_found" | "meeting_verification" | "meeting_conflict";

export type FindingDecision = "unreviewed" | "confirmed" | "not_a_concern" | "hold";

export type FindingCategory =
  | "Services"
  | "Goals"
  | "Accommodations"
  | "Placement"
  | "Behavior"
  | "Related Services"
  | "Transportation";

export type FindingVisualType = "standard_portmaster" | "comparator_circuit";

export interface MeetingEvidenceData {
  timestamp: string;
  speaker: string;
  transcriptExcerpt: string;
  audioClipDuration?: string;
  decisionQuote: string;
  meetingDate: string;
}

export interface DocumentSectionRef {
  pageNumber?: number;
  sectionName: string;
  rawText: string;
  highlightedText?: string;
}

export type FollowUpActionType =
  | "add_case_compass"
  | "draft_school_email"
  | "create_meeting_target"
  | "request_pwn"
  | "create_task"
  | "no_action";

export interface PortmasterFinding {
  id: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  sourceTags: FindingSourceTag[];
  visualType: FindingVisualType;
  oneLineExplanation: string;
  whyPortmasterFlagged: string;
  
  // Previous IEP data
  previousIep: {
    section: string;
    page: number;
    value: string;
    details: string;
  };
  
  // Meeting Record data (if applicable)
  meetingRecord?: {
    agreedDecision: string;
    decisionDate: string;
    evidence?: MeetingEvidenceData;
  };

  // Updated IEP data
  updatedIep: {
    section: string;
    page: number;
    value: string;
    details: string;
    changeLabel?: "MODIFIED" | "REMOVED" | "UNLOCATED" | "REDUCED" | "ADDED";
  };

  // Decision & State
  decision: FindingDecision;
  decisionNotes?: string;
  decisionTimestamp?: string;
  selectedAction?: FollowUpActionType;
  actionDetails?: string;

  // Comparator circuit specific values (for before -> after diffing)
  comparatorDiff?: {
    metricLabel: string;
    previousVal: string;
    updatedVal: string;
  };
}

export interface PortmasterSessionState {
  studentId: number;
  studentName: string;
  grade?: string;
  schoolDistrict?: string;
  meetingType: string;
  meetingDate: string;
  totalAnalyzedCount: number;
  clearedAutomaticallyCount: number;
  findings: PortmasterFinding[];
  status: "in_review" | "completed";
  clientSummaryNote?: string;
  completedAt?: string;
}

export type MeetingWorkspaceStatus = "PREPARING" | "READY" | "LIVE" | "COMPLETED";

export type WorkspaceTab = "ASSEMBLY" | "BLUEPRINT" | "MEETING_MODE" | "PREP" | "ADVOCATE_READY" | "PARENT_READY";

export type PrepStep = "iep_intel" | "parent_intel" | "pcs" | "blueprint" | "ready";

export type FindingStatus = "keep" | "important" | "edit" | "dismiss";

export interface IepIntelFinding {
  id: string;
  category: string;
  section: string;
  text: string;
  quote?: string;
  status: FindingStatus;
  isCustom?: boolean;
}

export interface ParentIntelConcern {
  id: string;
  topic: string;
  concern: string;
  source?: string;
  status: "keep" | "edit" | "dismiss";
  isCustom?: boolean;
}

export type TargetMeetingStatus = "NOT_DISCUSSED" | "DISCUSSED" | "AGREED" | "DENIED" | "DEFERRED" | "FOLLOW_UP";

export type TargetTagType = "ADVOCATE_REPAIR" | "IMPORTANT" | "PARENT_DOESNT_WANT" | "SKIP";

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
  
  // Advocate scripts & strategy
  quickAdvocateSayThis: string; // Exactly one clear, persuasive sentence
  fullAdvocateScript: string;
  putItHereLocation: string; // e.g. "IEP Section 8 (Classroom Accommodations)"
  possibleIepWording: string;
  whyWeWantIt: string;
  supportingEvidence: string;
  sources: string[]; // ["Current IEP p. 12", "Parent Concern Statement"]
  ifTeamDisagrees: string;

  // Parent-Facing Fields (strictly isolated for Parent Ready)
  parentWhatWeWant: string;
  parentWhyWeWantIt: string;
  parentSupportingEvidence: string;

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

export interface CloseoutChecks {
  allRequestsRaised: boolean;
  pwnIdentified: boolean;
  agreedLocationsClear: boolean;
  followUpAssigned: boolean;
  nextMeetingDiscussed: boolean;
}

export type StageCategory =
  | "opportunity"
  | "active"
  | "waiting"
  | "escalation"
  | "completed"
  | "neutral";

export type PipelineGroupType = "opportunity" | "active_project";

export type LogicalStageGroup =
  | "opportunities"
  | "follow_up"
  | "onboarding"
  | "active_advocacy"
  | "renewal_closed";

export type CaseActionStatus =
  | "overdue"
  | "waiting_family"
  | "waiting_school"
  | "renewal_due"
  | "on_track"
  | "completed";

export interface PipelineStageItem {
  id: number;
  name: string;
  slug: string;
  order: number;
  accentColor: string;
  iconName: string;
  category: StageCategory | string;
  pipelineGroup?: PipelineGroupType;
  logicalGroup?: LogicalStageGroup;
  isArchived: boolean;
  isDefault?: boolean;
  caseCount?: number;
}

export interface PipelineCardItem {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  parentContactId?: number | null;
  parentName?: string;
  parentEmail?: string | null;
  parentPhone?: string | null;
  siblingCount?: number;
  siblingNames?: string[];
  schoolName: string;
  countyDistrict?: string;
  gradeLevel?: string | null;
  planType: string; // "IEP", "504", "No IEP/504 Yet", "Evaluation"
  planTier: string; // "Navigator", "Anchor", "Family", "Scholarship", "Pay Per Use", "On Hold", "Tools Only", "$55", "$105"
  rawPlanTier?: string;
  servicePlanLabel?: string;
  isScholarship?: boolean;
  scholarshipStatus?: string | null;
  pipelineStage: string;
  pipelineGroup?: PipelineGroupType;
  stageGroup?: PipelineGroupType;
  logicalGroup?: LogicalStageGroup;
  isOpportunity?: boolean;
  journeyType?: "opportunity" | "active_advocacy";
  lifecycleStage?: string;
  accountStatus: string; // "Active", "Onboarding", "Renewal Needed", "On Hold", "Offboarding", "Closed"
  billingStatus: string; // "Current", "Payment Failed", "Past Due", "Complimentary", "Not Applicable"
  contractStatus: string; // "Not Started", "Active", "Ending Soon", "Expired", "Renewed"
  assignedAdvocateName: string;
  assignedAdvocateInitials: string;
  caseId?: string;
  leadId?: number | null;
  discoveryStatus?: string | null;
  needsAttention: boolean;
  attentionReason?: string;
  actionStatus?: CaseActionStatus;
  actionStatusLabel?: string;
  dueDateLabel?: string;
  openTaskCount?: number;
  primaryTask?: string;
  primaryTaskIcon?: "clock" | "check" | "calendar" | "alert" | "mail";
  secondaryTask?: string;
  secondaryTaskIcon?: "clock" | "check" | "calendar" | "alert" | "mail";
  nextDate?: string;
  meetingDate?: string;
  lastActivityAt?: string;
  lastActivitySummary?: string;
  lastActivityText?: string;
  compassRiskLevel?: string | null;
  compassWhoHasBall?: string | null;
  compassNextStep?: string | null;
  activeWorkstreams?: string[];
  updatedAt?: string | Date;
}

export interface SavedViewItem {
  id: number;
  name: string;
  slug: string;
  filtersJson: string; // JSON string representing filter rules
  isPinned: boolean;
  isDefault?: boolean;
  isPrivate?: boolean;
  createdBy?: string | number | null;
  createdByName?: string | null;
  order: number;
}

export type PipelineSortField = "name" | "family" | "stage" | "lastActivity" | "nextDate";
export type PipelineSortDirection = "asc" | "desc";

export interface PipelineFilters {
  planTier?: string;
  advocate?: string;
  district?: string;
  school?: string;
  caseType?: string;
  stage?: string;
  pipelineGroup?: "all" | "opportunity" | "active_project";
  stageGroup?: "all" | "opportunity" | "active_project";
  logicalGroup?: "all" | LogicalStageGroup;
  meetingDate?: string;
  needsAttentionOnly?: boolean;
  accountStatus?: string;
  billingStatus?: string;
  contractStatus?: string;
  searchQuery?: string;
  isMyWork?: boolean;
}

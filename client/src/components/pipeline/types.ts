export type StageCategory = "active" | "waiting" | "escalation" | "completed" | "neutral";

export interface PipelineStageItem {
  id: number;
  name: string;
  slug: string;
  order: number;
  accentColor: string;
  iconName: string;
  category: StageCategory | string;
  isArchived: boolean;
  isDefault?: boolean;
}

export interface PipelineCardItem {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  schoolName: string;
  countyDistrict?: string;
  planType: string; // "IEP", "504", "No IEP/504 Yet", "Evaluation"
  planTier: string; // "$55", "$105", "Scholarship", "Pay Per Use", "Tools Only", etc.
  pipelineStage: string;
  accountStatus: string; // "Active", "Onboarding", "Renewal Needed", "On Hold", "Offboarding", "Closed"
  billingStatus: string; // "Current", "Payment Failed", "Past Due", "Complimentary", "Not Applicable"
  contractStatus: string; // "Not Started", "Active", "Ending Soon", "Expired", "Renewed"
  assignedAdvocateName: string;
  assignedAdvocateInitials: string;
  caseId?: string;
  needsAttention: boolean;
  attentionReason?: string;
  primaryTask?: string;
  primaryTaskIcon?: "clock" | "check" | "calendar" | "alert" | "mail";
  secondaryTask?: string;
  secondaryTaskIcon?: "clock" | "check" | "calendar" | "alert" | "mail";
  nextDate?: string;
  meetingDate?: string;
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
  createdBy?: string | number;
  order: number;
}

export interface PipelineFilters {
  planTier?: string;
  advocate?: string;
  district?: string;
  school?: string;
  caseType?: string;
  meetingDate?: string;
  needsAttentionOnly?: boolean;
  accountStatus?: string;
  billingStatus?: string;
  contractStatus?: string;
  searchQuery?: string;
}

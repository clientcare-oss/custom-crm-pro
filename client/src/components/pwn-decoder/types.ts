export interface StudentHeaderInfo {
  id: number;
  name: string;
  school?: string | null;
  district?: string | null;
  state?: string | null;
  gradeLevel?: string | null;
}

export type RequirementStatus = "PRESENT" | "WEAK_UNCLEAR" | "NOT_LOCATED" | "UNABLE_TO_DETERMINE";
export type DocumentationStrength = "STRONG" | "ADEQUATE" | "THIN" | "SERIOUS_CONCERN";
export type DecisionAction = "PROPOSED" | "REFUSED" | "UNCLEAR";
export type ConcernSeverity = "needs_attention" | "review" | "documented";
export type AdvocateReviewStatus = "UNREVIEWED" | "CONFIRMED" | "DISMISSED" | "UNDER_REVIEW";

export interface DecodedDecisionItem {
  id?: number;
  reviewId?: number;
  decisionTitle: string;
  action: DecisionAction;
  pwnLanguage: string;
  plainLanguage: string;
  reason: string;
  evidenceIdentified: string;
  evidenceStatus?: "PRESENT" | "WEAK" | "NOT_LOCATED";
  optionsConsidered: string;
  optionsStatus?: "PRESENT" | "NOT_LOCATED";
  rejectionReason: string;
  relevantFactors: string;
  documentLocation?: string | null;
}

export interface DecodedRequirementItem {
  id?: number;
  reviewId?: number;
  requirementKey: string;
  requirementTitle: string;
  status: RequirementStatus;
  relevantLanguage: string;
  explanation: string;
  strongerDocumentationTip: string;
  source: string;
  documentLocation?: string | null;
}

export interface DecodedConcernItem {
  id: number;
  reviewId: number;
  concernType: string;
  relatedDecision?: string | null;
  title: string;
  severity: ConcernSeverity;
  relevantPwnLanguage?: string | null;
  whyFlagged?: string | null;
  relatedRequirement?: string | null;
  source?: string | null;
  documentLocation?: string | null;
  advocateStatus: AdvocateReviewStatus;
  advocateNote?: string | null;
  advocateCorrection?: string | null;
  strongerDocumentationWouldIdentify?: string | null;
}

export interface FullPwnReview {
  id: number;
  studentContactId: number;
  pwnDocumentId?: number | null;
  pwnDocumentName?: string | null;
  pwnRawText?: string | null;
  stateOverlay: string;
  advocateName: string;
  status: "DRAFT" | "ADVOCATE_REVIEWED" | "COMPLETED";
  documentationStrength: DocumentationStrength;
  documentationStrengthReason: string;
  summary: string;
  highestAttentionItems: string[];
  strengths: Array<{ title: string; type: string; description: string }>;
  requiredElementCount: number;
  elementsNeedReviewCount: number;
  decisionsCount: number;
  potentialProblemsCount: number;
  advocateNotes?: string | null;
  createdAt: string | Date;
  completedAt?: string | Date | null;
  decisions: DecodedDecisionItem[];
  requirements: DecodedRequirementItem[];
  concerns: DecodedConcernItem[];
  student?: {
    id: number;
    firstName: string;
    lastName: string;
    schoolName?: string | null;
    countyDistrict?: string | null;
    state?: string | null;
  };
}

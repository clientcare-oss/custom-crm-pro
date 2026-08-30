export type JourneyStageStatus = "published" | "draft" | "review";

export type JourneyStageCategory = 
  | "Discovery & Intake"
  | "Plan & Checkout"
  | "Progressive Onboarding"
  | "Active Service"
  | "Account Lifecycle"
  | "Retention & Renewal";

export interface JourneyStage {
  id: string;
  pageId: string;
  stepNumber: string;
  name: string;
  category: JourneyStageCategory;
  description: string;
  status: JourneyStageStatus;
  triggerCondition: string;
  associatedPortalPage: string;
  associatedRoute: string;
  requiredClientActions: string[];
  availableClientActions: string[];
  stateEngineKey: string;
  iconName: string;
  customNotes?: string;
  lastUpdated?: string;
}

export type PageCategory = 
  | "Discovery & Pre-Sale"
  | "Onboarding & Setup"
  | "Active Workspaces"
  | "Account & Billing"
  | "Lifecycle & Offboarding"
  | "Retention & Renewal";

export interface PortalExperiencePage {
  id: string;
  pageId: string;
  name: string;
  slug: string;
  route: string;
  category: PageCategory;
  description: string;
  status: JourneyStageStatus;
  associatedStageId: string;
  associatedStageName: string;
  lastEditedBy?: string;
  isInteractivePreviewReady: boolean;
}

export type StateEngineState = 
  | "DISCOVERY_INQUIRY"
  | "DISCOVERY_SCHEDULED"
  | "DISCOVERY_COMPLETED"
  | "PLAN_SELECTION"
  | "PAYMENT_PENDING"
  | "ONBOARDING"
  | "ACTIVE"
  | "CLOSING"
  | "INACTIVE"
  | "RENEWAL_PENDING"
  | "RENEWED"
  | "CANCELED";

export interface StateEngineRule {
  state: StateEngineState;
  label: string;
  color: string;
  description: string;
  entryTriggers: string[];
  resolvedExperience: string;
  householdResolution: string;
  exitCondition: string;
  fallbackBehavior: string;
}

export interface SampleClientPersona {
  id: string;
  name: string;
  email: string;
  state: StateEngineState;
  stageName: string;
  studentsCount: number;
  students: Array<{
    name: string;
    grade: string;
    school: string;
    iepStatus: string;
  }>;
  appointment?: {
    date: string;
    time: string;
    coach: string;
    type: string;
    meetLink: string;
  };
  onboardingProgress?: {
    completedSteps: string[];
    pendingSteps: string[];
  };
  activeCase?: {
    caseTitle: string;
    focus: string;
    nextMeeting: string;
    recentDocument: string;
  };
}

import { ComponentType } from "react";
import { 
  Compass, 
  MessageSquare, 
  CheckSquare, 
  FileText, 
  FolderOpen, 
  Wrench, 
  Briefcase, 
  DollarSign, 
  Calendar, 
  StickyNote, 
  Info, 
  Scale, 
  Video, 
  Sparkles, 
  ShieldCheck, 
  PenTool, 
  GraduationCap, 
  UploadCloud, 
  ClipboardList, 
  Award,
  CheckCircle2,
  Clock,
  Lock,
  Layers
} from "lucide-react";

export type ClientStage = 
  | "DISCOVERY_INQUIRY"
  | "DISCOVERY_SCHEDULED"
  | "DISCOVERY_COMPLETED"
  | "PLAN_SELECTION"
  | "PAYMENT_PENDING"
  | "ONBOARDING"
  | "ACTIVE"
  | "CLOSING"
  | "INACTIVE";

export type SidebarGroup = "permanent" | "getting-started" | "case" | "account";

export type ModuleState = "active" | "preview" | "locked" | "hidden";

export interface PortalModuleDefinition {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  route?: string;
  sidebarGroup: SidebarGroup;
  displayOrder: number;
  // Stage conditions
  visibleStages: ClientStage[];
  unlockedStages: ClientStage[];
  lockedPreviewAllowed: boolean;
  isDefaultForStage?: ClientStage[];
  badgeText?: string;
  description?: string;
}

export const PORTAL_MODULE_REGISTRY: PortalModuleDefinition[] = [
  // ── Permanent Core Modules ──
  {
    id: "compass",
    name: "Compass",
    icon: Compass,
    sidebarGroup: "permanent",
    displayOrder: 1,
    visibleStages: ["DISCOVERY_INQUIRY", "DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING", "ONBOARDING", "ACTIVE", "CLOSING", "INACTIVE"],
    unlockedStages: ["DISCOVERY_INQUIRY", "DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING", "ONBOARDING", "ACTIVE", "CLOSING", "INACTIVE"],
    lockedPreviewAllowed: true,
    isDefaultForStage: ["ACTIVE", "CLOSING", "INACTIVE"],
    description: "Core Case Compass tracking stage, active focus, and who has the ball."
  },

  // ── GETTING STARTED Conditional Group (Onboarding & Pre-Sale) ──
  {
    id: "discovery-call",
    name: "Discovery Call",
    icon: Calendar,
    sidebarGroup: "getting-started",
    displayOrder: 10,
    visibleStages: ["DISCOVERY_INQUIRY", "DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING", "ONBOARDING"],
    unlockedStages: ["DISCOVERY_INQUIRY", "DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING", "ONBOARDING"],
    lockedPreviewAllowed: true,
    isDefaultForStage: ["DISCOVERY_SCHEDULED"],
    description: "Upcoming Discovery Call details, meeting link, and preparation notes."
  },
  {
    id: "your-journey",
    name: "Your Journey",
    icon: Sparkles,
    sidebarGroup: "getting-started",
    displayOrder: 11,
    visibleStages: ["DISCOVERY_INQUIRY", "DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING", "ONBOARDING"],
    unlockedStages: ["DISCOVERY_INQUIRY", "DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING", "ONBOARDING"],
    lockedPreviewAllowed: true,
    description: "Interactive visual roadmap of the Waypoint representation experience."
  },
  {
    id: "choose-support",
    name: "Choose Support",
    icon: ShieldCheck,
    sidebarGroup: "getting-started",
    displayOrder: 12,
    visibleStages: ["DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING", "ONBOARDING"],
    unlockedStages: ["DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING", "ONBOARDING"],
    lockedPreviewAllowed: true,
    isDefaultForStage: ["DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING"],
    description: "Select number of students, choose advocacy support tier, and complete checkout."
  },
  {
    id: "agreements",
    name: "Agreements",
    icon: PenTool,
    sidebarGroup: "getting-started",
    displayOrder: 13,
    visibleStages: ["ONBOARDING"],
    unlockedStages: ["ONBOARDING", "ACTIVE"],
    lockedPreviewAllowed: true,
    description: "Master Representation Agreement and FERPA electronic signature capture."
  },
  {
    id: "student-setup",
    name: "Student Setup",
    icon: GraduationCap,
    sidebarGroup: "getting-started",
    displayOrder: 14,
    visibleStages: ["ONBOARDING"],
    unlockedStages: ["ONBOARDING", "ACTIVE"],
    lockedPreviewAllowed: true,
    description: "Student demographic, district, placement, and IEP team profile builder."
  },
  {
    id: "upload-records",
    name: "Upload Records",
    icon: UploadCloud,
    sidebarGroup: "getting-started",
    displayOrder: 15,
    visibleStages: ["ONBOARDING"],
    unlockedStages: ["ONBOARDING", "ACTIVE"],
    lockedPreviewAllowed: true,
    description: "Secure R2 dropzone for current IEP, 504 plans, and psychological evaluations."
  },
  {
    id: "advocacy-intake",
    name: "Advocacy Intake",
    icon: ClipboardList,
    sidebarGroup: "getting-started",
    displayOrder: 16,
    visibleStages: ["ONBOARDING"],
    unlockedStages: ["ONBOARDING", "ACTIVE"],
    lockedPreviewAllowed: true,
    description: "Parent priorities questionnaire with spoken voice note recorder and autosave."
  },

  // ── Permanent & Active Client Modules ──
  {
    id: "communication",
    name: "Communication",
    icon: MessageSquare,
    sidebarGroup: "permanent",
    displayOrder: 20,
    visibleStages: ["DISCOVERY_INQUIRY", "DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING", "ONBOARDING", "ACTIVE", "CLOSING", "INACTIVE"],
    unlockedStages: ["DISCOVERY_INQUIRY", "DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "PLAN_SELECTION", "PAYMENT_PENDING", "ONBOARDING", "ACTIVE", "CLOSING", "INACTIVE"],
    lockedPreviewAllowed: true,
    description: "Direct messaging with Byron Honea and advocacy team."
  },
  {
    id: "tasks",
    name: "Tasks",
    icon: CheckSquare,
    sidebarGroup: "permanent",
    displayOrder: 21,
    visibleStages: ["DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "ONBOARDING", "ACTIVE", "CLOSING"],
    unlockedStages: ["ACTIVE", "CLOSING"],
    lockedPreviewAllowed: true,
    description: "Assigned action items, meeting prep checklists, and task tracking."
  },
  {
    id: "smart-docs",
    name: "Documents",
    icon: FileText,
    sidebarGroup: "permanent",
    displayOrder: 22,
    visibleStages: ["DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "ONBOARDING", "ACTIVE", "CLOSING", "INACTIVE"],
    unlockedStages: ["ACTIVE", "CLOSING", "INACTIVE"],
    lockedPreviewAllowed: true,
    description: "Cloudflare R2 document vault and IEP comparison archive."
  },
  {
    id: "files",
    name: "Files",
    icon: FolderOpen,
    sidebarGroup: "permanent",
    displayOrder: 23,
    visibleStages: ["ONBOARDING", "ACTIVE", "CLOSING", "INACTIVE"],
    unlockedStages: ["ACTIVE", "CLOSING", "INACTIVE"],
    lockedPreviewAllowed: true,
    description: "General file uploads and shared school correspondence."
  },
  {
    id: "tools",
    name: "Tools",
    icon: Wrench,
    sidebarGroup: "case",
    displayOrder: 30,
    visibleStages: ["ACTIVE"],
    unlockedStages: ["ACTIVE"],
    lockedPreviewAllowed: false,
    description: "Advocacy tools: IEP Comparator & State Complaint Builder."
  },
  {
    id: "cases",
    name: "Cases",
    icon: Briefcase,
    sidebarGroup: "case",
    displayOrder: 31,
    visibleStages: ["ACTIVE", "CLOSING"],
    unlockedStages: ["ACTIVE", "CLOSING"],
    lockedPreviewAllowed: false,
    description: "Chronological milestone case boards."
  },
  {
    id: "financials",
    name: "Billing",
    icon: DollarSign,
    sidebarGroup: "account",
    displayOrder: 40,
    visibleStages: ["ONBOARDING", "ACTIVE", "CLOSING", "INACTIVE"],
    unlockedStages: ["ONBOARDING", "ACTIVE", "CLOSING", "INACTIVE"],
    lockedPreviewAllowed: true,
    description: "Household invoices, payment history receipts, and retainer balances."
  },
  {
    id: "appointments",
    name: "Appointments",
    icon: Calendar,
    sidebarGroup: "permanent",
    displayOrder: 24,
    visibleStages: ["ONBOARDING", "ACTIVE", "CLOSING"],
    unlockedStages: ["ONBOARDING", "ACTIVE", "CLOSING"],
    lockedPreviewAllowed: true,
    description: "Scheduled IEP meetings, strategy sessions, and clarity calls."
  },
  {
    id: "voyage-log",
    name: "Voyage Log",
    icon: Video,
    sidebarGroup: "case",
    displayOrder: 32,
    visibleStages: ["ACTIVE"],
    unlockedStages: ["ACTIVE"],
    lockedPreviewAllowed: false,
    description: "Meeting video/audio recordings and transcription notes."
  },
  {
    id: "notes",
    name: "Notes",
    icon: StickyNote,
    sidebarGroup: "case",
    displayOrder: 33,
    visibleStages: ["ACTIVE"],
    unlockedStages: ["ACTIVE"],
    lockedPreviewAllowed: false,
    description: "Advocate shared notes and parent journal."
  },
  {
    id: "attorney",
    name: "Legal Counsel",
    icon: Scale,
    sidebarGroup: "case",
    displayOrder: 34,
    visibleStages: ["ACTIVE"],
    unlockedStages: ["ACTIVE"],
    lockedPreviewAllowed: false,
    description: "Attorney coordination and legal records."
  },
  {
    id: "details",
    name: "Student Workspace",
    icon: Info,
    sidebarGroup: "permanent",
    displayOrder: 25,
    visibleStages: ["DISCOVERY_SCHEDULED", "DISCOVERY_COMPLETED", "ONBOARDING", "ACTIVE", "CLOSING"],
    unlockedStages: ["ACTIVE", "CLOSING"],
    lockedPreviewAllowed: true,
    description: "Comprehensive student IEP goals, accommodations, and service minutes."
  }
];

export function resolveModuleState(
  module: PortalModuleDefinition,
  stage: ClientStage
): ModuleState {
  if (!module.visibleStages.includes(stage)) {
    return "hidden";
  }
  if (module.unlockedStages.includes(stage)) {
    return "active";
  }
  if (module.lockedPreviewAllowed) {
    return "preview";
  }
  return "locked";
}

export function getDefaultModuleForStage(stage: ClientStage): string {
  const match = PORTAL_MODULE_REGISTRY.find(
    (m) => m.isDefaultForStage && m.isDefaultForStage.includes(stage)
  );
  return match ? match.id : "compass";
}

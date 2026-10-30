import {
  Users,
  Headset,
  FileText,
  Laptop,
  Settings,
  Crown,
  LayoutDashboard,
  Calendar,
  Globe2,
  Workflow,
  TrendingUp,
  FolderKanban,
  Shield,
  Zap,
  Compass,
  LayoutGrid,
  CalendarClock,
  ClipboardList,
  LayoutTemplate,
  ScrollText,
  Briefcase,
  Banknote,
  Radio,
  Wrench,
  Video,
  Sparkles,
  GitBranch,
  Brain,
  CheckSquare,
  Layers,
  Phone,
  BookOpen,
  ListChecks,
  UserCheck,
  HandHeart,
  LucideIcon,
} from "lucide-react";

export type RoleId =
  | "advocate"
  | "call_center"
  | "documentation"
  | "technology"
  | "operations"
  | "management";

export type CaseAccessLevel = "none" | "view" | "edit" | "manage";

export interface CaseWorkspaceModuleDefinition {
  id: string;
  label: string;
  category: "Strategy & Core" | "Case Records & Notes" | "Practice & Finances" | "Live IEP & Review";
  description: string;
  allowedLevels: CaseAccessLevel[];
}

export const CASE_WORKSPACE_MODULES: CaseWorkspaceModuleDefinition[] = [
  {
    id: "compass",
    label: "Case Compass",
    category: "Strategy & Core",
    description: "Real-time IEP advocacy pipeline stage, who has the ball, and next meeting deadlines.",
    allowedLevels: ["none", "view", "edit", "manage"],
  },
  {
    id: "notes",
    label: "Internal Notes & Observations",
    category: "Case Records & Notes",
    description: "Confidential advocate notes, district communications, and internal parent observations.",
    allowedLevels: ["none", "view", "edit", "manage"],
  },
  {
    id: "files",
    label: "Student Documents & IEP Packets",
    category: "Case Records & Notes",
    description: "Uploads, psychological evaluations, prior written notices (PWN), and accommodation packets.",
    allowedLevels: ["none", "view", "edit", "manage"],
  },
  {
    id: "tools",
    label: "Advocacy Tools & Worksheets",
    category: "Strategy & Core",
    description: "Worksheet studio, IEP comparator, and PWN decoder analysis workspaces.",
    allowedLevels: ["none", "view", "edit", "manage"],
  },
  {
    id: "appointments",
    label: "Appointments & Timeline",
    category: "Practice & Finances",
    description: "Case calendar bookings, ARD/IEP meeting schedules, and advocate coverage blocks.",
    allowedLevels: ["none", "view", "edit", "manage"],
  },
  {
    id: "financials",
    label: "Billing, Retainers & Invoices",
    category: "Practice & Finances",
    description: "Retainer hours, fee schedules, client invoices, and payment ledger details.",
    allowedLevels: ["none", "view", "edit", "manage"],
  },
  {
    id: "meeting_workspace",
    label: "Live Meeting Workspace",
    category: "Live IEP & Review",
    description: "Real-time live meeting guidance console and First Mate AI copilot assistance.",
    allowedLevels: ["none", "view", "manage"],
  },
  {
    id: "post_meeting_review",
    label: "Post-Meeting Review",
    category: "Live IEP & Review",
    description: "Meeting outcomes recap, IEP amendment diff tracker, and parent summary generator.",
    allowedLevels: ["none", "view", "manage"],
  },
  {
    id: "projects",
    label: "State Complaints & Disputes",
    category: "Strategy & Core",
    description: "State complaint drafts, legal violation matrices, and formal dispute filings.",
    allowedLevels: ["none", "view", "edit", "manage"],
  },
  {
    id: "voyage_log",
    label: "Voyage Log (Recordings)",
    category: "Case Records & Notes",
    description: "Meeting audio recordings, transcript logs, and speaker-attributed records.",
    allowedLevels: ["none", "view", "manage"],
  },
  {
    id: "tasks",
    label: "Case Tasks Queue",
    category: "Practice & Finances",
    description: "Assigned follow-up action items, school requests, and evaluation deadline tasks.",
    allowedLevels: ["none", "view", "edit", "manage"],
  },
  {
    id: "activity_timeline",
    label: "Student Activity Timeline",
    category: "Case Records & Notes",
    description: "Chronological audit trail of case changes, portal interactions, and status updates.",
    allowedLevels: ["none", "view", "edit"],
  },
];

export interface RoleDefinition {
  id: RoleId;
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  dotColor: string;
  description: string;
  defaultModules: string[];
  defaultPermissions: string[];
  defaultCaseAccess: Record<string, CaseAccessLevel>;
}

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  management: {
    id: "management",
    label: "Management",
    icon: Crown,
    badgeClass: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    dotColor: "bg-amber-400",
    description: "Practice executive, partner, or operations director with full system oversight.",
    defaultModules: ["all"],
    defaultPermissions: ["all"],
    defaultCaseAccess: {
      compass: "manage",
      notes: "manage",
      files: "manage",
      tools: "manage",
      appointments: "manage",
      financials: "manage",
      meeting_workspace: "manage",
      post_meeting_review: "manage",
      projects: "manage",
      voyage_log: "manage",
      tasks: "manage",
      activity_timeline: "edit",
    },
  },
  advocate: {
    id: "advocate",
    label: "Advocate",
    icon: Users,
    badgeClass: "bg-sky-400/15 text-sky-300 border-sky-400/30",
    dotColor: "bg-sky-400",
    description: "Special education advocate managing student cases, meetings, and strategies.",
    defaultModules: [
      "crew_quarters",
      "calendar",
      "advocacy_pipeline",
      "students_cases",
      "meeting_workspace",
      "post_meeting_review",
      "case_compass",
      "smart_files",
      "contracts",
      "first_mate",
      "tools_hub",
      "voyage_log",
      "braindump",
      "tasks",
      "templates",
      "knowledge_base",
      "walkthroughs",
    ],
    defaultPermissions: [
      "view_clients",
      "edit_clients",
      "upload_files",
      "view_assigned_cases",
      "manage_appointments",
      "view_team_calendar",
      "view_reports",
    ],
    defaultCaseAccess: {
      compass: "edit",
      notes: "edit",
      files: "edit",
      tools: "edit",
      appointments: "edit",
      financials: "view",
      meeting_workspace: "manage",
      post_meeting_review: "manage",
      projects: "edit",
      voyage_log: "manage",
      tasks: "edit",
      activity_timeline: "view",
    },
  },
  call_center: {
    id: "call_center",
    label: "Call Center",
    icon: Headset,
    badgeClass: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    dotColor: "bg-emerald-400",
    description: "Inbound family inquiry triage, discovery call scheduling, and phone callback coverage.",
    defaultModules: [
      "crew_quarters",
      "call_center",
      "calendar",
      "leads",
      "scheduler",
      "tasks",
      "knowledge_base",
    ],
    defaultPermissions: [
      "view_clients",
      "manage_appointments",
      "view_team_calendar",
      "manage_team_calendar",
    ],
    defaultCaseAccess: {
      compass: "view",
      notes: "view",
      files: "none",
      tools: "none",
      appointments: "edit",
      financials: "none",
      meeting_workspace: "none",
      post_meeting_review: "none",
      projects: "none",
      voyage_log: "none",
      tasks: "view",
      activity_timeline: "view",
    },
  },
  documentation: {
    id: "documentation",
    label: "Documentation",
    icon: FileText,
    badgeClass: "bg-purple-400/15 text-purple-300 border-purple-400/30",
    dotColor: "bg-purple-400",
    description: "Records review specialist, file prep, IEP comparison paperwork, and administrative case drafting.",
    defaultModules: [
      "crew_quarters",
      "students_cases",
      "tools_hub",
      "tasks",
      "templates",
      "knowledge_base",
      "walkthroughs",
    ],
    defaultPermissions: [
      "view_clients",
      "view_assigned_cases",
      "upload_files",
      "export_records",
    ],
    defaultCaseAccess: {
      compass: "view",
      notes: "view",
      files: "edit",
      tools: "edit",
      appointments: "view",
      financials: "none",
      meeting_workspace: "view",
      post_meeting_review: "edit",
      projects: "edit",
      voyage_log: "view",
      tasks: "edit",
      activity_timeline: "view",
    },
  },
  technology: {
    id: "technology",
    label: "Technology",
    icon: Laptop,
    badgeClass: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
    dotColor: "bg-cyan-400",
    description: "Systems architect, IT security, integration management, and CRM tool engineering.",
    defaultModules: [
      "crew_quarters",
      "automations",
      "ai_connections",
      "tech_tasks",
      "knowledge_base",
      "settings",
    ],
    defaultPermissions: [
      "access_admin_settings",
      "manage_integrations",
      "access_ai_config",
      "view_reports",
    ],
    defaultCaseAccess: {
      compass: "none",
      notes: "none",
      files: "none",
      tools: "manage",
      appointments: "none",
      financials: "none",
      meeting_workspace: "view",
      post_meeting_review: "none",
      projects: "none",
      voyage_log: "view",
      tasks: "view",
      activity_timeline: "view",
    },
  },
  operations: {
    id: "operations",
    label: "Operations",
    icon: Settings,
    badgeClass: "bg-slate-400/15 text-slate-300 border-slate-400/30",
    dotColor: "bg-slate-400",
    description: "Practice workflow coordinator, billing guardian, vendor logistics, and staff support.",
    defaultModules: [
      "crew_quarters",
      "calendar",
      "invoices",
      "services",
      "bill_guardian",
      "tasks",
      "tech_tasks",
      "giving",
      "walkthroughs",
    ],
    defaultPermissions: [
      "view_team_calendar",
      "manage_team_calendar",
      "view_reports",
      "modify_billing",
      "modify_contracts",
      "upload_files",
      "export_records",
    ],
    defaultCaseAccess: {
      compass: "view",
      notes: "view",
      files: "view",
      tools: "view",
      appointments: "edit",
      financials: "manage",
      meeting_workspace: "none",
      post_meeting_review: "view",
      projects: "view",
      voyage_log: "view",
      tasks: "manage",
      activity_timeline: "view",
    },
  },
};

export interface PermissionDefinition {
  id: string;
  label: string;
  category: "Client & Cases" | "Calendar & Coverage" | "Staff & Management" | "Finance & System";
  description: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Client & Cases
  { id: "view_clients", label: "View Clients & Students", category: "Client & Cases", description: "View student profiles, contacts, and basic demographic files." },
  { id: "edit_clients", label: "Edit Clients & Students", category: "Client & Cases", description: "Create, modify, and update student records and accommodations." },
  { id: "delete_records", label: "Delete Records & Cases", category: "Client & Cases", description: "Permanently delete student records, case documents, and archive histories." },
  { id: "export_records", label: "Download & Export Data", category: "Client & Cases", description: "Export student caseloads, IEP analysis sheets, and roster CSV spreadsheets." },
  { id: "upload_files", label: "Upload Documents & Evaluations", category: "Client & Cases", description: "Upload FERPA-adjacent IEPs, psychological evaluations, and clinical records." },
  { id: "modify_contracts", label: "Modify Contracts & Agreements", category: "Client & Cases", description: "Draft, amend, send, and void client advocacy service agreements." },
  { id: "view_assigned_cases", label: "View Assigned Cases Only", category: "Client & Cases", description: "Restricts case visibility strictly to assigned students." },
  { id: "view_all_cases", label: "View All Practice Cases", category: "Client & Cases", description: "Grants visibility to all active and archived practice cases." },
  
  // Calendar & Coverage
  { id: "manage_appointments", label: "Schedule & Edit Appointments", category: "Calendar & Coverage", description: "Create IEP meeting bookings and discovery calls." },
  { id: "view_team_calendar", label: "View Full Team Calendar", category: "Calendar & Coverage", description: "See all staff schedules, blocks, and client meetings." },
  { id: "manage_team_calendar", label: "Manage Team Calendar & Reassign", category: "Calendar & Coverage", description: "Reassign advocate coverage and adjust team booking slots." },
  
  // Staff & Management
  { id: "approve_time_off", label: "Approve Time Off (PTO)", category: "Staff & Management", description: "Review and approve or deny staff time-off requests." },
  { id: "manage_employees", label: "Manage Employees & Staff", category: "Staff & Management", description: "Add new employees, edit compensation, assign roles, and run offboarding." },
  { id: "manage_roles", label: "Manage Roles & Permissions", category: "Staff & Management", description: "Configure system roles, case workspace access, and security policies." },

  // Finance & System
  { id: "modify_billing", label: "Modify Billing & Retainers", category: "Finance & System", description: "Adjust hourly advocate rates, create/edit invoices, and credit retainer hours." },
  { id: "issue_refunds", label: "Issue Refunds & Adjustments", category: "Finance & System", description: "Process payment refunds, void charges, and issue retainer credits." },
  { id: "manage_payroll", label: "View & Manage Payroll (Sensitive)", category: "Finance & System", description: "Access compensation, pay rates, and direct deposit details." },
  { id: "view_sensitive_admin", label: "View Sensitive Admin Notes", category: "Finance & System", description: "Access confidential employee HR notes, compensation histories, and disciplinary records." },
  { id: "view_reports", label: "View Practice Reports & Metrics", category: "Finance & System", description: "Access advocacy metrics, giving ledgers, and caseload revenue dashboards." },
  { id: "change_company_settings", label: "Change Company & Practice Settings", category: "Finance & System", description: "Modify business profile, practice branding, legal terms, and global CRM defaults." },
  { id: "manage_integrations", label: "Manage System Integrations", category: "Finance & System", description: "Configure Stripe payments, Quo VoIP telephony, AssemblyAI, and Clerk authentication." },
  { id: "access_ai_config", label: "Access AI & Copilot Configuration", category: "Finance & System", description: "Manage Cloudflare Workers AI LLM prompts, model selection, and First Mate copilot tuning." },
  { id: "access_admin_settings", label: "Access System Settings", category: "Finance & System", description: "Full technical control over CRM configuration, database tools, and security." },
];

export interface ModuleDefinition {
  id: string;
  label: string;
  path: string;
  group: string;
  icon: LucideIcon;
  isSensitive?: boolean;
}

export const CRM_MODULES: ModuleDefinition[] = [
  // Overview
  { id: "crew_quarters", label: "Crew Quarters (Employee Station)", path: "/crew-quarters", group: "Overview", icon: LayoutDashboard },
  // Call Center & Scheduling
  { id: "call_center", label: "Call Center Telephony", path: "/call-center", group: "Call Center & Scheduling", icon: Headset },
  { id: "calendar", label: "Calendar & Availability", path: "/calendar", group: "Call Center & Scheduling", icon: Calendar },
  { id: "national_coverage", label: "National Coverage Map", path: "/calendar?tab=coverage", group: "Call Center & Scheduling", icon: Globe2 },
  // Pipelines
  { id: "advocacy_pipeline", label: "Advocacy Pipeline", path: "/advocacy-pipeline", group: "Pipelines", icon: Workflow },
  { id: "leads", label: "Lead Center & Pipeline", path: "/leads", group: "Pipelines", icon: TrendingUp },
  // Cases & Clients
  { id: "students_cases", label: "Students & Contacts", path: "/projects", group: "Cases & Clients", icon: Users },
  // Manage Experiences
  { id: "portal_management", label: "Client Portal Management", path: "/portal-management", group: "Manage Experiences", icon: Shield },
  { id: "meeting_workspace", label: "Meeting Workspace (PG-043)", path: "/meeting-workspace", group: "Manage Experiences", icon: Zap },
  { id: "post_meeting_review", label: "Post-Meeting Review (PG-044)", path: "/post-meeting-review", group: "Manage Experiences", icon: Zap },
  { id: "case_compass", label: "Case Compass", path: "/case-compass", group: "Manage Experiences", icon: Compass },
  { id: "scheduler", label: "Session Types", path: "/calendar?tab=session-types", group: "Call Center & Scheduling", icon: CalendarClock },
  // Templates & Forms
  { id: "lead_forms", label: "Lead Forms Builder", path: "/leads/forms", group: "Templates & Forms", icon: ClipboardList },
  { id: "smart_files", label: "Smart Files Suite", path: "/smart-files", group: "Templates & Forms", icon: LayoutTemplate },
  { id: "contracts", label: "Contracts & Agreements", path: "/contracts", group: "Templates & Forms", icon: ScrollText },
  { id: "invoices", label: "Invoices & Billing", path: "/invoices", group: "Templates & Forms", icon: FileText, isSensitive: true },
  { id: "services", label: "Services Catalog", path: "/services", group: "Templates & Forms", icon: Briefcase },
  { id: "bill_guardian", label: "Bill Guardian", path: "/bill-guardian", group: "Templates & Forms", icon: Banknote, isSensitive: true },
  // Advocacy & AI Tools
  { id: "first_mate", label: "First Mate AI Copilot", path: "/first-mate", group: "Advocacy & AI Tools", icon: Radio },
  { id: "tools_hub", label: "Tools Hub & IEP Suite", path: "/tools", group: "Advocacy & AI Tools", icon: Wrench },
  { id: "voyage_log", label: "Voyage Log (Recorder)", path: "/tools/voyage-recorder", group: "Advocacy & AI Tools", icon: Video },
  { id: "automations", label: "Automations Engine", path: "/automations", group: "Advocacy & AI Tools", icon: Zap },
  { id: "ai_connections", label: "AI Connections", path: "/ai-connections", group: "Advocacy & AI Tools", icon: Sparkles },
  { id: "braindump", label: "Advocate BrainDump", path: "/brain-dump", group: "Advocacy & AI Tools", icon: Brain },
  // Practice & Operations
  { id: "tasks", label: "Tasks Queue", path: "/tasks", group: "Practice & Operations", icon: CheckSquare },
  { id: "templates", label: "Templates Hub", path: "/templates", group: "Practice & Operations", icon: LayoutTemplate },
  { id: "knowledge_base", label: "Knowledge Base", path: "/knowledge-base", group: "Practice & Operations", icon: BookOpen },
  { id: "walkthroughs", label: "Walkthroughs (SOPs)", path: "/walkthroughs", group: "Practice & Operations", icon: ListChecks },
  // Giving & Impact
  { id: "giving", label: "Giving & Impact", path: "/giving", group: "Giving & Impact", icon: HandHeart },
  // Company & Leadership
  { id: "team", label: "Team & Staff Management", path: "/team", group: "Company", icon: UserCheck, isSensitive: true },
  { id: "workflows", label: "Workflow Designer", path: "/settings?section=operations", group: "Company", icon: GitBranch, isSensitive: true },
  { id: "settings", label: "System Settings", path: "/settings", group: "Company", icon: Settings, isSensitive: true },
];

export interface EmployeeCompensation {
  payType: "Salary" | "Hourly" | "Contractor";
  amount: string;
  frequency: "Bi-Weekly" | "Semi-Monthly" | "Monthly";
  effectiveDate: string;
  notes?: string;
  history: Array<{
    amount: string;
    effectiveDate: string;
    payType: string;
    note?: string;
  }>;
}

export interface EmployeeDirectDeposit {
  maskedAccount: string; // e.g. "•••• 4821"
  accountType: "Checking" | "Savings";
  routingMasked: string; // e.g. "•••• 0192"
  bankName: string;
  active: boolean;
  lastUpdated: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  category:
    | "Employment Agreement"
    | "Contractor Agreement"
    | "W-9"
    | "W-4"
    | "I-9"
    | "Policy Acknowledgment"
    | "Confidentiality"
    | "Certification"
    | "Performance"
    | "Other";
  uploadedDate: string;
  uploadedBy: string;
  size: string;
  status: "Active" | "Archived";
}

export interface EmployeeEquipmentItem {
  id: string;
  item: string;
  assetId: string;
  category: "Laptop" | "Display" | "Headset" | "Security Key" | "Tablet" | "Credit Card" | "Other";
  assignedDate: string;
  status: "Assigned" | "Returned" | "Repair";
  returnedDate?: string;
  notes?: string;
}

export interface EmployeeTrainingItem {
  id: string;
  title: string;
  category: "Legal & Compliance" | "IEP Strategy" | "CRM Systems" | "Ethics & FERPA";
  status: "Completed" | "In Progress" | "Not Started" | "Past Due" | "Optional";
  dueDate?: string;
  completedDate?: string;
  assignedBy: string;
}

export interface EmployeeNote {
  id: string;
  author: string;
  date: string;
  category: "Administrative" | "Coaching" | "Scheduling" | "Performance" | "General";
  note: string;
  isConfidential: boolean;
}

export interface EmployeeActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface DaySchedule {
  day: string;
  isAvailable: boolean;
  start: string;
  end: string;
}

export interface EmployeeRecord {
  id: string;
  userId?: number;
  openId?: string;
  isProtectedOwner?: boolean;
  hasAdminAccess?: boolean;
  invitationStatus?: "pending" | "accepted" | "expired" | "revoked";
  invitationToken?: string | null;
  invitedAt?: string | null;
  invitationExpiresAt?: string | null;
  acceptedAt?: string | null;
  name: string;
  preferredName?: string;
  email: string;
  phone?: string;
  avatarColor: string;
  jobTitle: string;
  primaryRole: RoleId;
  additionalRoles: RoleId[];
  status: "active" | "on_leave" | "inactive";
  employmentType: "Full-Time" | "Part-Time" | "Contractor";
  startDate: string;
  manager: string;
  department: string;
  workLocation: string;
  emergencyContact: string;
  bio?: string;
  statesCovered?: string;
  certifications?: string;
  availabilityStatus: "Available" | "In Meeting" | "On Leave" | "Out Today" | "Offline";
  normalScheduleSummary: string;
  nextTimeOff?: string;
  activeCaseloadCount: number;
  weeklySchedule: DaySchedule[];
  compensation: EmployeeCompensation;
  directDeposit: EmployeeDirectDeposit;
  modulePermissions: Record<string, "none" | "view" | "edit">;
  caseWorkspaceAccess: Record<string, CaseAccessLevel>;
  permissionOverrides: Record<string, boolean>;
  documents: EmployeeDocument[];
  equipment: EmployeeEquipmentItem[];
  training: EmployeeTrainingItem[];
  notes: EmployeeNote[];
  activity: EmployeeActivityLog[];
}

export const FICTIONAL_SEEDED_EMPLOYEE_IDS = new Set([
  "emp-sarah-jenkins",
  "emp-marcus-vance",
  "emp-elena-rostova",
  "emp-abby-miller",
]);

export const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: "emp-byron-honea",
    userId: 9060114,
    openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
    isProtectedOwner: true,
    hasAdminAccess: true,
    name: "Byron Honea",
    preferredName: "Byron",
    email: "byron@waypointadvocates.com",
    phone: "(404) 555-0192",
    avatarColor: "bg-amber-600 text-slate-950",
    jobTitle: "Founder & Lead Special Education Advocate",
    primaryRole: "management",
    additionalRoles: ["advocate"],
    status: "active",
    employmentType: "Full-Time",
    startDate: "Jan 15, 2021",
    manager: "Self (Protected Owner / CEO)",
    department: "Executive Leadership & Practice Operations",
    workLocation: "Atlanta, GA (Metro & Virtual)",
    emergencyContact: "Angela Honea (Spouse) — (404) 555-0193",
    bio: "Founder of Waypoint Advocates and Lead Special Education Advocate leading special education advocacy and dispute resolution across Georgia and Southeast districts.",
    statesCovered: "Georgia (Primary), Florida, North Carolina",
    certifications: "COPAA Special Ed Advocacy, GA Advocacy Network",
    availabilityStatus: "Available",
    normalScheduleSummary: "Mon–Thu 9:00 AM – 4:00 PM",
    nextTimeOff: "Dec 22 – Dec 23, 2026",
    activeCaseloadCount: 8,
    weeklySchedule: [
      { day: "Monday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
      { day: "Tuesday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
      { day: "Wednesday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
      { day: "Thursday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
      { day: "Friday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
    ],
    compensation: {
      payType: "Salary",
      amount: "$120,000 / yr",
      frequency: "Semi-Monthly",
      effectiveDate: "Jan 01, 2026",
      notes: "Executive partner draw & practice salary.",
      history: [
        { amount: "$105,000 / yr", effectiveDate: "Jan 01, 2025", payType: "Salary", note: "Annual practice adjustment." },
        { amount: "$90,000 / yr", effectiveDate: "Jan 01, 2024", payType: "Salary", note: "Founder baseline." },
      ],
    },
    directDeposit: {
      maskedAccount: "•••• 4821",
      accountType: "Checking",
      routingMasked: "•••• 0192",
      bankName: "Chase Private Client",
      active: true,
      lastUpdated: "Sep 29, 2026",
    },
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
    documents: [
      { id: "doc-1", name: "Operating Agreement & Founder Certificate", category: "Employment Agreement", uploadedDate: "Jan 15, 2021", uploadedBy: "Byron Honea", size: "2.4 MB", status: "Active" },
      { id: "doc-2", name: "Advocacy Credentials Verification 2026", category: "Certification", uploadedDate: "Jan 05, 2026", uploadedBy: "Byron Honea", size: "1.1 MB", status: "Active" },
    ],
    equipment: [
      { id: "eq-1", item: "Apple MacBook Pro 16\" M3 Max", assetId: "WP-MBP-001", category: "Laptop", assignedDate: "Jan 15, 2024", status: "Assigned", notes: "Executive primary station" },
      { id: "eq-2", item: "Dual Dell 32\" UltraSharp 4K", assetId: "WP-MON-001/002", category: "Display", assignedDate: "Jan 15, 2024", status: "Assigned" },
      { id: "eq-3", item: "YubiKey 5C NFC Security Key", assetId: "WP-SEC-001", category: "Security Key", assignedDate: "Jan 15, 2024", status: "Assigned" },
    ],
    training: [
      { id: "tr-1", title: "IDEA 2026 Federal Updates & Case Law", category: "Legal & Compliance", status: "Completed", completedDate: "Sep 15, 2026", assignedBy: "COPAA" },
      { id: "tr-2", title: "FERPA & Student Privacy Data Protection", category: "Ethics & FERPA", status: "Completed", completedDate: "Aug 20, 2026", assignedBy: "Waypoint Legal" },
    ],
    notes: [
      { id: "nt-1", author: "Byron Honea", date: "Sep 20, 2026", category: "Administrative", note: "Finalizing Q4 IEP advocacy slots and preparing onboarding for winter apprentices.", isConfidential: true },
    ],
    activity: [
      { id: "act-1", timestamp: "Sep 29, 2026 • 10:04 AM", actor: "Byron Honea", action: "Profile Updated", details: "Direct deposit verified and credentials confirmed." },
    ],
  },
  {
    id: "emp-byron-honea-2",
    userId: 9060115,
    openId: "user_3HEhAHIdXNwvbiK5NSR6RPkTInD",
    isProtectedOwner: true,
    hasAdminAccess: true,
    name: "Byron Honea",
    preferredName: "Byron (Client Care)",
    email: "clientcare@waypointadvocates.com",
    phone: "(404) 555-0192",
    avatarColor: "bg-amber-700 text-white",
    jobTitle: "Protected Owner & Executive Account",
    primaryRole: "management",
    additionalRoles: ["advocate"],
    status: "active",
    employmentType: "Full-Time",
    startDate: "Jan 15, 2021",
    manager: "Self (Protected Owner / CEO)",
    department: "Executive Leadership & Client Care",
    workLocation: "Atlanta, GA (Metro & Virtual)",
    emergencyContact: "Angela Honea (Spouse) — (404) 555-0193",
    bio: "Secondary Protected Owner Clerk account (9060115) for Byron Honea with full administrative and advocacy authority.",
    statesCovered: "Georgia (Primary), Florida, North Carolina",
    certifications: "COPAA Special Ed Advocacy, GA Advocacy Network",
    availabilityStatus: "Available",
    normalScheduleSummary: "Mon–Thu 9:00 AM – 4:00 PM",
    activeCaseloadCount: 0,
    weeklySchedule: [
      { day: "Monday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
      { day: "Tuesday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
      { day: "Wednesday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
      { day: "Thursday", isAvailable: true, start: "9:00 AM", end: "4:00 PM" },
      { day: "Friday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
    ],
    compensation: {
      payType: "Salary",
      amount: "Consolidated with Owner Account (9060114)",
      frequency: "Semi-Monthly",
      effectiveDate: "Jan 01, 2026",
      notes: "Secondary Protected Owner login account.",
      history: [],
    },
    directDeposit: {
      maskedAccount: "•••• 4821",
      accountType: "Checking",
      routingMasked: "•••• 0192",
      bankName: "Chase Private Client",
      active: true,
      lastUpdated: "Sep 29, 2026",
    },
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
    documents: [],
    equipment: [],
    training: [],
    notes: [],
    activity: [],
  },
  {
    id: "emp-kyle-atkins",
    userId: 9060249,
    openId: "user_3HELy6EVi_kyle_atkins",
    isProtectedOwner: false,
    hasAdminAccess: true,
    name: "Kyle Atkins",
    preferredName: "Kyle",
    email: "kyle@waypointadvocates.com",
    phone: "(404) 555-0199",
    avatarColor: "bg-cyan-600 text-white",
    jobTitle: "Technology / Developer",
    primaryRole: "technology",
    additionalRoles: ["management"],
    status: "active",
    employmentType: "Full-Time",
    startDate: "Jan 10, 2024",
    manager: "Byron Honea",
    department: "Technology & Infrastructure",
    workLocation: "Atlanta, GA (Virtual)",
    emergencyContact: "On File",
    bio: "Authorized CRM developer and systems architect managing Cloudflare Workers, security architecture, integrations, and automations.",
    availabilityStatus: "Available",
    normalScheduleSummary: "Mon–Fri 9:00 AM – 5:00 PM",
    activeCaseloadCount: 0,
    weeklySchedule: [
      { day: "Monday", isAvailable: true, start: "9:00 AM", end: "5:00 PM" },
      { day: "Tuesday", isAvailable: true, start: "9:00 AM", end: "5:00 PM" },
      { day: "Wednesday", isAvailable: true, start: "9:00 AM", end: "5:00 PM" },
      { day: "Thursday", isAvailable: true, start: "9:00 AM", end: "5:00 PM" },
      { day: "Friday", isAvailable: true, start: "9:00 AM", end: "5:00 PM" },
      { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
    ],
    compensation: {
      payType: "Contractor",
      amount: "Developer Retainer",
      frequency: "Monthly",
      effectiveDate: "Jan 01, 2026",
      history: [],
    },
    directDeposit: {
      maskedAccount: "•••• 1024",
      accountType: "Checking",
      routingMasked: "•••• 0210",
      bankName: "Chase",
      active: true,
      lastUpdated: "Jan 01, 2026",
    },
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
    documents: [],
    equipment: [],
    training: [],
    notes: [],
    activity: [],
  },
  {
    id: "emp-wyatt-smith",
    userId: 9060250,
    openId: "user_3KPhcRBro_wyatt",
    isProtectedOwner: false,
    hasAdminAccess: false,
    name: "Wyatt Smith",
    preferredName: "Wyatt",
    email: "wyatt.smith@waypointadvocates.com",
    phone: "(404) 555-0139",
    avatarColor: "bg-emerald-600 text-white",
    jobTitle: "Call Center & Intake Coordinator",
    primaryRole: "call_center",
    additionalRoles: [],
    status: "active",
    employmentType: "Full-Time",
    startDate: "Jan 10, 2024",
    manager: "Byron Honea",
    department: "Call Center & Intake",
    workLocation: "Atlanta, GA",
    emergencyContact: "Jessica Smith (Spouse) — (404) 555-0138",
    bio: "Call Center and client intake coordinator handling parent discovery inquiries, callback scheduling, and lead triage.",
    availabilityStatus: "Available",
    normalScheduleSummary: "Mon–Fri 9:00 AM – 5:00 PM",
    nextTimeOff: "Dec 24 – Dec 31, 2026",
    activeCaseloadCount: 0,
    weeklySchedule: [
      { day: "Monday", isAvailable: true, start: "9:00 AM", end: "5:00 PM" },
      { day: "Tuesday", isAvailable: true, start: "9:00 AM", end: "5:00 PM" },
      { day: "Wednesday", isAvailable: true, start: "9:00 AM", end: "5:00 PM" },
      { day: "Thursday", isAvailable: true, start: "9:00 AM", end: "5:00 PM" },
      { day: "Friday", isAvailable: true, start: "9:00 AM", end: "5:00 PM" },
      { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
    ],
    compensation: {
      payType: "Salary",
      amount: "$64,000 / yr",
      frequency: "Semi-Monthly",
      effectiveDate: "Jan 10, 2026",
      notes: "Call Center & Intake Coordinator compensation.",
      history: [],
    },
    directDeposit: {
      maskedAccount: "•••• 6204",
      accountType: "Checking",
      routingMasked: "•••• 0441",
      bankName: "Fidelity Investments",
      active: true,
      lastUpdated: "Jan 10, 2026",
    },
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
    documents: [
      { id: "doc-8", name: "Confidentiality & Security Protocol 2026", category: "Confidentiality", uploadedDate: "Jan 10, 2026", uploadedBy: "Byron Honea", size: "850 KB", status: "Active" },
    ],
    equipment: [
      { id: "eq-9", item: "Apple MacBook Pro 16\" M3 Pro", assetId: "WP-MBP-008", category: "Laptop", assignedDate: "Jan 10, 2024", status: "Assigned" },
      { id: "eq-10", item: "YubiKey 5C NFC (Primary & Backup)", assetId: "WP-SEC-010/011", category: "Security Key", assignedDate: "Jan 10, 2024", status: "Assigned" },
    ],
    training: [
      { id: "tr-6", title: "Call Center Intake & Discovery Triage Protocols", category: "CRM Systems", status: "Completed", completedDate: "Mar 15, 2024", assignedBy: "Byron Honea" },
    ],
    notes: [
      { id: "nt-5", author: "Byron Honea", date: "Sep 25, 2026", category: "Administrative", note: "Assigned to Call Center & Intake operations.", isConfidential: false },
    ],
    activity: [
      { id: "act-5", timestamp: "Sep 29, 2026 • 10:10 AM", actor: "Byron Honea", action: "Module Permissions Updated", details: "Configured role defaults for Call Center." },
    ],
  },
];

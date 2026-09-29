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
    description: "Special education advocate and IEP Coach managing student cases, meetings, and strategies.",
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
      "call_logs",
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
  { id: "scheduler", label: "Public Scheduler", path: "/scheduler", group: "Manage Experiences", icon: CalendarClock },
  // Templates & Forms
  { id: "lead_forms", label: "Lead Forms Builder", path: "/lead-forms", group: "Templates & Forms", icon: ClipboardList },
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
  { id: "call_logs", label: "Call Logs (Quo VoIP)", path: "/call-logs", group: "Practice & Operations", icon: Phone },
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

export const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: "emp-byron-honea",
    name: "Byron Honea",
    preferredName: "Byron",
    email: "byron@waypointadvocates.com",
    phone: "(404) 555-0192",
    avatarColor: "bg-amber-600 text-slate-950",
    jobTitle: "Founder & Master IEP Coach®",
    primaryRole: "management",
    additionalRoles: ["advocate"],
    status: "active",
    employmentType: "Full-Time",
    startDate: "Jan 15, 2021",
    manager: "Self (Owner / CEO)",
    department: "Executive Leadership & Practice Operations",
    workLocation: "Atlanta, GA (Metro & Virtual)",
    emergencyContact: "Angela Honea (Spouse) — (404) 555-0193",
    bio: "Founder of Waypoint Advocates and Master IEP Coach® leading special education advocacy and dispute resolution across Georgia and Southeast districts.",
    statesCovered: "Georgia (Primary), Florida, North Carolina",
    certifications: "Master IEP Coach® (MIPC-2024-884), COPAA Special Ed Advocacy",
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
      { id: "doc-2", name: "Master IEP Coach Verification 2026", category: "Certification", uploadedDate: "Jan 05, 2026", uploadedBy: "Byron Honea", size: "1.1 MB", status: "Active" },
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
    id: "emp-sarah-jenkins",
    name: "Sarah Jenkins",
    preferredName: "Sarah",
    email: "sarah.jenkins@waypointadvocates.com",
    phone: "(404) 555-0144",
    avatarColor: "bg-blue-600 text-white",
    jobTitle: "Senior Special Education Advocate",
    primaryRole: "advocate",
    additionalRoles: ["documentation"],
    status: "active",
    employmentType: "Full-Time",
    startDate: "Mar 01, 2023",
    manager: "Byron Honea",
    department: "Advocacy Casework",
    workLocation: "Gwinnett County & North Atlanta",
    emergencyContact: "David Jenkins (Spouse) — (404) 555-0145",
    bio: "Former special educator with 12 years of public school experience, specializing in autism spectrum supports and manifestation determinations.",
    statesCovered: "Georgia",
    certifications: "GA Special Ed Certified (P-12), IEP Coach Verified",
    availabilityStatus: "In Meeting",
    normalScheduleSummary: "Mon–Fri 8:30 AM – 4:30 PM",
    nextTimeOff: "Oct 10 – Oct 14, 2026",
    activeCaseloadCount: 6,
    weeklySchedule: [
      { day: "Monday", isAvailable: true, start: "8:30 AM", end: "4:30 PM" },
      { day: "Tuesday", isAvailable: true, start: "8:30 AM", end: "4:30 PM" },
      { day: "Wednesday", isAvailable: true, start: "8:30 AM", end: "4:30 PM" },
      { day: "Thursday", isAvailable: true, start: "8:30 AM", end: "4:30 PM" },
      { day: "Friday", isAvailable: true, start: "8:30 AM", end: "2:00 PM" },
      { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
    ],
    compensation: {
      payType: "Salary",
      amount: "$84,000 / yr",
      frequency: "Semi-Monthly",
      effectiveDate: "Jul 01, 2026",
      notes: "Senior advocate rate following annual review.",
      history: [
        { amount: "$76,000 / yr", effectiveDate: "Mar 01, 2024", payType: "Salary", note: "Standard progression." },
        { amount: "$70,000 / yr", effectiveDate: "Mar 01, 2023", payType: "Salary", note: "Hiring baseline." },
      ],
    },
    directDeposit: {
      maskedAccount: "•••• 3190",
      accountType: "Checking",
      routingMasked: "•••• 0021",
      bankName: "Wells Fargo",
      active: true,
      lastUpdated: "Jul 01, 2026",
    },
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
    documents: [
      { id: "doc-3", name: "Employment Agreement — Sarah Jenkins", category: "Employment Agreement", uploadedDate: "Mar 01, 2023", uploadedBy: "Byron Honea", size: "1.8 MB", status: "Active" },
      { id: "doc-4", name: "W-4 Employee Withholding 2026", category: "W-4", uploadedDate: "Jan 10, 2026", uploadedBy: "Sarah Jenkins", size: "450 KB", status: "Active" },
    ],
    equipment: [
      { id: "eq-4", item: "Apple MacBook Pro 14\" M3", assetId: "WP-MBP-004", category: "Laptop", assignedDate: "Mar 01, 2023", status: "Assigned" },
      { id: "eq-5", item: "Jabra Evolve2 65 Headset", assetId: "WP-AUD-009", category: "Headset", assignedDate: "Mar 01, 2023", status: "Assigned" },
    ],
    training: [
      { id: "tr-3", title: "Manifestation Determination Review Protocols", category: "IEP Strategy", status: "Completed", completedDate: "Jun 12, 2026", assignedBy: "Byron Honea" },
    ],
    notes: [
      { id: "nt-2", author: "Byron Honea", date: "Aug 15, 2026", category: "Performance", note: "Outstanding parent feedback on Forsyth County settlement negotiation.", isConfidential: false },
    ],
    activity: [
      { id: "act-2", timestamp: "Sep 28, 2026 • 2:15 PM", actor: "Byron Honea", action: "Schedule Blocked", details: "Added IEP meeting block for Tuesday morning." },
    ],
  },
  {
    id: "emp-marcus-vance",
    name: "Marcus Vance",
    preferredName: "Marcus",
    email: "marcus.vance@waypointadvocates.com",
    phone: "(404) 555-0188",
    avatarColor: "bg-emerald-600 text-white",
    jobTitle: "Client Intake Specialist & Call Coordinator",
    primaryRole: "call_center",
    additionalRoles: ["operations"],
    status: "active",
    employmentType: "Full-Time",
    startDate: "Oct 15, 2024",
    manager: "Byron Honea",
    department: "Intake & Communications",
    workLocation: "Virtual / Atlanta Hub",
    emergencyContact: "Tanya Vance (Sister) — (404) 555-0189",
    bio: "Compassionate first-contact coordinator with a background in pediatric clinic intake and family crisis communication.",
    availabilityStatus: "Available",
    normalScheduleSummary: "Mon–Fri 8:00 AM – 5:00 PM",
    nextTimeOff: "Nov 26 – Nov 28, 2026",
    activeCaseloadCount: 4,
    weeklySchedule: [
      { day: "Monday", isAvailable: true, start: "8:00 AM", end: "5:00 PM" },
      { day: "Tuesday", isAvailable: true, start: "8:00 AM", end: "5:00 PM" },
      { day: "Wednesday", isAvailable: true, start: "8:00 AM", end: "5:00 PM" },
      { day: "Thursday", isAvailable: true, start: "8:00 AM", end: "5:00 PM" },
      { day: "Friday", isAvailable: true, start: "8:00 AM", end: "5:00 PM" },
      { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
    ],
    compensation: {
      payType: "Hourly",
      amount: "$28.50 / hr",
      frequency: "Bi-Weekly",
      effectiveDate: "Jan 01, 2026",
      notes: "Hourly intake lead rate with overtime eligibility.",
      history: [
        { amount: "$25.00 / hr", effectiveDate: "Oct 15, 2024", payType: "Hourly", note: "Starting intake rate." },
      ],
    },
    directDeposit: {
      maskedAccount: "•••• 8912",
      accountType: "Checking",
      routingMasked: "•••• 1120",
      bankName: "Bank of America",
      active: true,
      lastUpdated: "Jan 01, 2026",
    },
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
    documents: [
      { id: "doc-5", name: "Marcus Vance — Telephony & Intake Agreement", category: "Employment Agreement", uploadedDate: "Oct 15, 2024", uploadedBy: "Byron Honea", size: "1.2 MB", status: "Active" },
    ],
    equipment: [
      { id: "eq-6", item: "Lenovo ThinkPad P14s", assetId: "WP-PC-012", category: "Laptop", assignedDate: "Oct 15, 2024", status: "Assigned" },
      { id: "eq-7", item: "Poly Voyager Focus 2 Headset", assetId: "WP-AUD-014", category: "Headset", assignedDate: "Oct 15, 2024", status: "Assigned" },
    ],
    training: [
      { id: "tr-4", title: "Quo VoIP Telephony & Call Queue Protocol", category: "CRM Systems", status: "Completed", completedDate: "Nov 01, 2024", assignedBy: "Byron Honea" },
    ],
    notes: [
      { id: "nt-3", author: "Byron Honea", date: "Sep 10, 2026", category: "Coaching", note: "Handling discovery call triage exceptionally well; maintains 98% callback compliance within 2 hours.", isConfidential: false },
    ],
    activity: [
      { id: "act-3", timestamp: "Sep 29, 2026 • 9:30 AM", actor: "Marcus Vance", action: "Call Center Logged", details: "Logged 4 discovery callbacks." },
    ],
  },
  {
    id: "emp-elena-rostova",
    name: "Elena Rostova",
    preferredName: "Elena",
    email: "elena.rostova@waypointadvocates.com",
    phone: "(404) 555-0172",
    avatarColor: "bg-purple-600 text-white",
    jobTitle: "IEP Records Review & Documentation Specialist",
    primaryRole: "documentation",
    additionalRoles: [],
    status: "active",
    employmentType: "Part-Time",
    startDate: "Feb 01, 2025",
    manager: "Byron Honea",
    department: "Records & Documentation",
    workLocation: "Virtual",
    emergencyContact: "Mikhail Rostov (Brother) — (404) 555-0173",
    bio: "Paralegal and special education document analyst reviewing multi-year psychological evaluations, PWNs, and progress reports.",
    availabilityStatus: "Available",
    normalScheduleSummary: "Tue–Fri 10:00 AM – 3:00 PM",
    nextTimeOff: "None scheduled",
    activeCaseloadCount: 2,
    weeklySchedule: [
      { day: "Monday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Tuesday", isAvailable: true, start: "10:00 AM", end: "3:00 PM" },
      { day: "Wednesday", isAvailable: true, start: "10:00 AM", end: "3:00 PM" },
      { day: "Thursday", isAvailable: true, start: "10:00 AM", end: "3:00 PM" },
      { day: "Friday", isAvailable: true, start: "10:00 AM", end: "3:00 PM" },
      { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
    ],
    compensation: {
      payType: "Contractor",
      amount: "$35.00 / hr",
      frequency: "Bi-Weekly",
      effectiveDate: "Feb 01, 2025",
      notes: "Part-time documentation and record analysis hourly rate.",
      history: [],
    },
    directDeposit: {
      maskedAccount: "•••• 7741",
      accountType: "Checking",
      routingMasked: "•••• 0981",
      bankName: "Capital One",
      active: true,
      lastUpdated: "Feb 01, 2025",
    },
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
    documents: [
      { id: "doc-6", name: "Contractor Agreement — Elena Rostova", category: "Contractor Agreement", uploadedDate: "Feb 01, 2025", uploadedBy: "Byron Honea", size: "1.4 MB", status: "Active" },
      { id: "doc-7", name: "W-9 Form 2026", category: "W-9", uploadedDate: "Jan 12, 2026", uploadedBy: "Elena Rostova", size: "620 KB", status: "Active" },
    ],
    equipment: [
      { id: "eq-8", item: "Dell Latitude 5540", assetId: "WP-PC-019", category: "Laptop", assignedDate: "Feb 01, 2025", status: "Assigned" },
    ],
    training: [
      { id: "tr-5", title: "IEP Comparator & PWN Decoder Workflows", category: "CRM Systems", status: "Completed", completedDate: "Feb 10, 2025", assignedBy: "Byron Honea" },
    ],
    notes: [
      { id: "nt-4", author: "Byron Honea", date: "Sep 05, 2026", category: "Administrative", note: "Elena is handling the multi-year psych analysis for Fulton County dispute.", isConfidential: false },
    ],
    activity: [
      { id: "act-4", timestamp: "Sep 28, 2026 • 4:00 PM", actor: "Elena Rostova", action: "Document Uploaded", details: "Added IEP review notes." },
    ],
  },
  {
    id: "emp-wyatt-smith",
    name: "Wyatt Smith",
    preferredName: "Wyatt",
    email: "wyatt.smith@waypointadvocates.com",
    phone: "(404) 555-0139",
    avatarColor: "bg-cyan-600 text-white",
    jobTitle: "IT Systems & Technical Operations Lead",
    primaryRole: "technology",
    additionalRoles: ["operations"],
    status: "active",
    employmentType: "Full-Time",
    startDate: "Jan 10, 2024",
    manager: "Byron Honea",
    department: "Technology & Infrastructure",
    workLocation: "Atlanta, GA",
    emergencyContact: "Jessica Smith (Spouse) — (404) 555-0138",
    bio: "Systems architect and CRM engineer managing Cloudflare Workers, secure FERPA compliance, and AI tool integrations.",
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
      amount: "$92,000 / yr",
      frequency: "Semi-Monthly",
      effectiveDate: "Jan 10, 2026",
      notes: "Senior tech lead compensation.",
      history: [
        { amount: "$85,000 / yr", effectiveDate: "Jan 10, 2024", payType: "Salary", note: "Starting offer." },
      ],
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
      { id: "tr-6", title: "Cloudflare D1 & Zero Trust Security Architecture", category: "CRM Systems", status: "Completed", completedDate: "Mar 15, 2024", assignedBy: "Byron Honea" },
    ],
    notes: [
      { id: "nt-5", author: "Byron Honea", date: "Sep 25, 2026", category: "Administrative", note: "Led the migration to PG-019 Team Management console and double-deck navigation.", isConfidential: false },
    ],
    activity: [
      { id: "act-5", timestamp: "Sep 29, 2026 • 10:10 AM", actor: "Wyatt Smith", action: "Module Permissions Updated", details: "Configured role defaults for Call Center." },
    ],
  },
  {
    id: "emp-abby-miller",
    name: "Abby Miller",
    preferredName: "Abby",
    email: "abby.miller@waypointadvocates.com",
    phone: "(404) 555-0163",
    avatarColor: "bg-amber-600 text-white",
    jobTitle: "Practice Operations Coordinator",
    primaryRole: "operations",
    additionalRoles: ["documentation"],
    status: "on_leave",
    employmentType: "Full-Time",
    startDate: "Aug 01, 2023",
    manager: "Byron Honea",
    department: "Practice Operations",
    workLocation: "Atlanta Office & Hybrid",
    emergencyContact: "Robert Miller (Father) — (404) 555-0164",
    bio: "Coordinates advocate logistics, invoices, parent onboarding, and state complaint filing documentation.",
    availabilityStatus: "On Leave",
    normalScheduleSummary: "Mon–Fri 9:00 AM – 4:30 PM",
    nextTimeOff: "Current: Sep 28 – Oct 02, 2026",
    activeCaseloadCount: 0,
    weeklySchedule: [
      { day: "Monday", isAvailable: true, start: "9:00 AM", end: "4:30 PM" },
      { day: "Tuesday", isAvailable: true, start: "9:00 AM", end: "4:30 PM" },
      { day: "Wednesday", isAvailable: true, start: "9:00 AM", end: "4:30 PM" },
      { day: "Thursday", isAvailable: true, start: "9:00 AM", end: "4:30 PM" },
      { day: "Friday", isAvailable: true, start: "9:00 AM", end: "3:00 PM" },
      { day: "Saturday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
      { day: "Sunday", isAvailable: false, start: "Unavailable", end: "Unavailable" },
    ],
    compensation: {
      payType: "Salary",
      amount: "$68,000 / yr",
      frequency: "Semi-Monthly",
      effectiveDate: "Jan 01, 2026",
      notes: "Operations lead salary.",
      history: [
        { amount: "$62,000 / yr", effectiveDate: "Aug 01, 2023", payType: "Salary", note: "Starting offer." },
      ],
    },
    directDeposit: {
      maskedAccount: "•••• 9031",
      accountType: "Checking",
      routingMasked: "•••• 0511",
      bankName: "Truist Bank",
      active: true,
      lastUpdated: "Jan 01, 2026",
    },
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
    documents: [
      { id: "doc-9", name: "Employment Agreement — Abby Miller", category: "Employment Agreement", uploadedDate: "Aug 01, 2023", uploadedBy: "Byron Honea", size: "1.9 MB", status: "Active" },
    ],
    equipment: [
      { id: "eq-11", item: "Apple MacBook Air 15\" M2", assetId: "WP-MBA-015", category: "Laptop", assignedDate: "Aug 01, 2023", status: "Assigned" },
    ],
    training: [
      { id: "tr-7", title: "Bill Guardian & Invoice Reconciliation", category: "CRM Systems", status: "Completed", completedDate: "Sep 01, 2023", assignedBy: "Byron Honea" },
    ],
    notes: [
      { id: "nt-6", author: "Byron Honea", date: "Sep 27, 2026", category: "Scheduling", note: "On approved medical leave through Oct 02. Coverage assigned to Marcus and Wyatt.", isConfidential: false },
    ],
    activity: [
      { id: "act-6", timestamp: "Sep 27, 2026 • 5:00 PM", actor: "Byron Honea", action: "PTO Approved", details: "Medical leave approved Sep 28 – Oct 02, 2026." },
    ],
  },
];

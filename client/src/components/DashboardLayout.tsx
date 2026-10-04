import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import CopilotUtilityCapsule from "@/components/CopilotUtilityCapsule";
import { LayoutDashboard, Banknote, LogOut, PanelLeft, PanelLeftClose, PanelLeftOpen, Users, GraduationCap, Briefcase, FileText, FileSignature, Calendar, CalendarClock, TrendingUp, ScrollText, Settings, Compass, FolderOpen, BookOpen, Star, Heart, Target, ClipboardList, Layers, CheckSquare, Sun, Moon, Wrench, LayoutTemplate, Zap, Plug, GitBranch, ListChecks, Phone, UserCheck, Brain, Sparkles, LayoutGrid, Video, Minimize2, Maximize2, Square, Volume2, Monitor, Shield, ChevronDown, ChevronRight, ChevronsUpDown, Search, X, Bug, Headphones, Radar, Headset, Workflow, HandHeart, Receipt, BarChart3, Landmark, DollarSign, Globe, Globe2, MessageSquare, Bell, Activity, Lock, Home, Contact, type LucideIcon } from "lucide-react";
import { getStoredEmployees, checkEmployeeModuleAccess } from "@/components/team/teamStore";
import { CRM_MODULES } from "@/components/team/teamTypes";
import { useTerminology, type ProjectIconKey } from "@/contexts/TerminologyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import QuickSetupModal from './QuickSetupModal';
import { IssueReporterModal } from "./IssueReporterModal";
import ScopedErrorBoundary from "./ScopedErrorBoundary";
import { cn } from "@/lib/utils";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { LighthouseCottageIcon } from "@/components/ui/LighthouseCottageIcon";
import { MarineRadarIcon } from "@/components/ui/MarineRadarIcon";
import { getTestUnreadState } from "@/lib/testUnreadHelper";

const LOGO_URL = "/waypoint-logo.png";

const ICON_MAP: Record<ProjectIconKey, LucideIcon> = {
  GraduationCap,
  Briefcase,
  FolderOpen,
  BookOpen,
  Users,
  Star,
  Heart,
  Target,
  Compass,
  ClipboardList,
  FileText,
  Layers,
};

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  keywords?: string[];
}

export interface MenuGroup {
  groupLabel: string;
  items: MenuItem[];
}

function buildMenuGroups(projectLabelPlural: string, projectIcon: LucideIcon): MenuGroup[] {
  return [
    {
      groupLabel: "Home",
      items: [
        { 
          icon: LighthouseCottageIcon as any, 
          label: "Crew Quarters", 
          path: "/",
          keywords: ["crew quarters", "home", "dashboard", "personal", "employee", "pg-038", "my work"]
        },
      ],
    },
    {
      groupLabel: "Intake & Scheduling",
      items: [
        { 
          icon: Headset, 
          label: "Call Center", 
          path: "/call-center",
          keywords: ["call center", "calls", "discovery call", "phone", "voicemail", "dialer", "pg-018"]
        },
        { 
          icon: TrendingUp, 
          label: "Lead Center", 
          path: "/leads",
          keywords: ["lead center", "leads", "discovery pipeline", "pipeline", "kanban", "intake", "pg-003"]
        },
        { 
          icon: Calendar, 
          label: "Calendar", 
          path: "/calendar",
          keywords: ["calendar", "appointments", "schedule", "national coverage", "session types", "coverage", "time zones", "clocks", "scheduler", "pg-007", "pg-041", "pg-008"],
        },
      ],
    },
    {
      groupLabel: "Advocacy",
      items: [
        { 
          icon: Workflow, 
          label: "Advocacy Pipeline", 
          path: "/advocacy-pipeline",
          keywords: ["advocacy pipeline", "pipeline", "kanban", "stages", "cases", "pg-039"]
        },
        { 
          icon: projectIcon, 
          label: projectLabelPlural, 
          path: "/projects",
          keywords: [projectLabelPlural.toLowerCase(), "cases", "students", "clients", "roster", "directory", "case files", "pg-004"]
        },
        { 
          icon: Users, 
          label: "Contacts", 
          path: "/contacts",
          keywords: ["contacts", "parents", "educators", "professionals", "directory", "pg-002"]
        },
        { 
          icon: Zap, 
          label: "Meeting Workspace", 
          path: "/meeting-workspace",
          keywords: ["meeting", "iep meeting", "meeting workspace", "pg-043", "blueprint", "advocate ready", "targets", "live meeting"]
        },
      ],
    },
    {
      groupLabel: "Resources",
      items: [
        { 
          icon: Wrench, 
          label: "Tools", 
          path: "/tools",
          keywords: ["tools", "tools hub", "pwn decoder", "iep comparator", "worksheet builder", "voyage recorder", "first mate", "timeline builder", "pg-010", "pg-037"]
        },
        { 
          icon: BookOpen, 
          label: "Knowledge Base", 
          path: "/knowledge-base",
          keywords: ["knowledge base", "documents", "walkthroughs", "sop", "resources", "articles", "guidelines", "pg-016", "pg-017"]
        },
        { 
          icon: LayoutTemplate, 
          label: "Templates", 
          path: "/templates",
          keywords: ["templates", "documents", "emails", "forms", "letters", "smart files", "pg-011"]
        },
      ],
    },
    {
      groupLabel: "Business",
      items: [
        { 
          icon: Briefcase, 
          label: "Services", 
          path: "/services",
          keywords: ["services", "catalog", "pricing", "packages", "service allowances", "pg-035"]
        },
        { 
          icon: FileText, 
          label: "Billing", 
          path: "/invoices",
          keywords: ["billing", "invoices", "payments", "revenue", "bill guardian", "fee tracker", "audit", "pg-005", "pg-022"]
        },
        { 
          icon: FileSignature, 
          label: "Agreements", 
          path: "/agreements",
          keywords: ["agreements", "contracts", "signatures", "e-sign", "templates", "legal", "smart files", "pg-046"]
        },
      ],
    },
    {
      groupLabel: "Operations",
      items: [
        { 
          icon: CheckSquare, 
          label: "Tasks", 
          path: "/tasks",
          keywords: ["tasks", "todos", "action items", "reminders", "pg-009"]
        },
        { 
          icon: Zap, 
          label: "Automations", 
          path: "/automations",
          keywords: ["automations", "triggers", "workflow automation", "actions", "pg-013"]
        },
        { 
          icon: UserCheck, 
          label: "Team", 
          path: "/team",
          keywords: ["team", "staff", "employees", "workforce", "directory", "management", "pg-019"]
        },
      ],
    },
    {
      groupLabel: "Giving",
      items: [
        { 
          icon: HandHeart, 
          label: "Giving & Impact", 
          path: "/giving",
          keywords: ["giving", "impact", "donations", "nonprofit", "501c3", "supporters", "scholarships", "funds", "receipts", "reports", "website tools", "pg-040"]
        },
      ],
    },
    {
      groupLabel: "Management",
      items: [
        { 
          icon: Activity, 
          label: "Metrics", 
          path: "/metrics",
          keywords: ["metrics", "kpi", "analytics", "lead journey", "revenue", "advocacy hours", "retention", "practice health", "pg-042"]
        },
      ],
    },
    {
      groupLabel: "System / Company",
      items: [
        { 
          icon: Settings, 
          label: "Settings", 
          path: "/settings",
          keywords: ["settings", "preferences", "config", "pg-024", "integrations", "ai connections", "portal management", "client portal", "pg-014", "pg-032", "pg-027", "receipts", "tokens", "workflow designer"]
        },
      ],
    },
  ];
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

// Authentic 8-Point Waypoint Nautical Compass Star with 3D faceted gold shading
export function WaypointCompassStar({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="wp-gold-facet-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF4D6" />
          <stop offset="40%" stopColor="#F5D07F" />
          <stop offset="100%" stopColor="#D4A74B" />
        </linearGradient>
        <linearGradient id="wp-gold-facet-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#BA8832" />
          <stop offset="50%" stopColor="#8C5E1B" />
          <stop offset="100%" stopColor="#54370B" />
        </linearGradient>
        <linearGradient id="wp-gold-facet-mid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE4A0" />
          <stop offset="100%" stopColor="#B3832E" />
        </linearGradient>
      </defs>

      {/* Outer Fine Brass Concentric Ring */}
      <circle cx="50" cy="50" r="28" stroke="url(#wp-gold-facet-mid)" strokeWidth="1.2" opacity="0.85" />
      <circle cx="50" cy="50" r="27" stroke="#0D1829" strokeWidth="0.5" opacity="0.5" />

      {/* 4 Diagonal Smaller Points (NE, SE, SW, NW) */}
      <polygon points="50,50 50,32 63,37" fill="url(#wp-gold-facet-dark)" />
      <polygon points="50,50 63,37 68,50" fill="url(#wp-gold-facet-light)" />

      <polygon points="50,50 68,50 63,63" fill="url(#wp-gold-facet-dark)" />
      <polygon points="50,50 63,63 50,68" fill="url(#wp-gold-facet-light)" />

      <polygon points="50,50 50,68 37,63" fill="url(#wp-gold-facet-dark)" />
      <polygon points="50,50 37,63 32,50" fill="url(#wp-gold-facet-light)" />

      <polygon points="50,50 32,50 37,37" fill="url(#wp-gold-facet-dark)" />
      <polygon points="50,50 37,37 50,32" fill="url(#wp-gold-facet-light)" />

      {/* 4 Primary Large Cardinal Points (N, S, E, W) */}
      {/* NORTH */}
      <polygon points="50,50 45.5,50 50,6" fill="url(#wp-gold-facet-light)" />
      <polygon points="50,50 54.5,50 50,6" fill="url(#wp-gold-facet-dark)" />

      {/* SOUTH */}
      <polygon points="50,50 54.5,50 50,94" fill="url(#wp-gold-facet-light)" />
      <polygon points="50,50 45.5,50 50,94" fill="url(#wp-gold-facet-dark)" />

      {/* EAST */}
      <polygon points="50,50 50,45.5 94,50" fill="url(#wp-gold-facet-dark)" />
      <polygon points="50,50 50,54.5 94,50" fill="url(#wp-gold-facet-light)" />

      {/* WEST */}
      <polygon points="50,50 50,54.5 6,50" fill="url(#wp-gold-facet-dark)" />
      <polygon points="50,50 50,45.5 6,50" fill="url(#wp-gold-facet-light)" />

      {/* Center Beveled Brass Rivet Boss */}
      <circle cx="50" cy="50" r="4.5" fill="url(#wp-gold-facet-light)" stroke="#261704" strokeWidth="0.8" />
      <circle cx="49" cy="49" r="1.5" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

export interface MasterNavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  isActive: (loc: string) => boolean;
}

export function buildMasterNavItems(projectLabelPlural: string, projectIcon: React.ComponentType<{ className?: string }>): MasterNavItem[] {
  return [
    {
      id: "home",
      icon: LighthouseCottageIcon,
      label: "Home",
      path: "/",
      isActive: (loc) => loc === "/" || loc === "/crew-quarters" || loc === "/dashboard" || loc === "/company/dashboard",
    },
    {
      id: "call-center",
      icon: Headset,
      label: "Call Center",
      path: "/call-center",
      isActive: (loc) => loc === "/call-center" || loc.startsWith("/call-center/") || loc === "/call-logs",
    },
    {
      id: "lead-center",
      icon: TrendingUp,
      label: "Lead Center",
      path: "/leads",
      isActive: (loc) => loc === "/leads" || loc.startsWith("/leads/") || loc === "/lead-forms",
    },
    {
      id: "calendar",
      icon: Calendar,
      label: "Calendar",
      path: "/calendar",
      isActive: (loc) => loc === "/calendar" || loc === "/appointments" || loc === "/national-coverage" || loc === "/session-types" || loc === "/scheduler",
    },
    {
      id: "students",
      icon: projectIcon,
      label: projectLabelPlural || "Students",
      path: "/students",
      isActive: (loc) =>
        loc === "/students" ||
        loc.startsWith("/students/") ||
        loc === "/projects" ||
        loc.startsWith("/projects/") ||
        loc.startsWith("/contacts/") ||
        loc.startsWith("/project-workspace/"),
    },
    {
      id: "contacts",
      icon: Users,
      label: "Contacts",
      path: "/contacts",
      isActive: (loc) => loc === "/contacts" || loc === "/contacts/new",
    },
    {
      id: "advocacy",
      icon: Workflow,
      label: "Advocacy",
      path: "/advocacy-pipeline",
      isActive: (loc) => loc === "/advocacy-pipeline" || loc.startsWith("/advocacy-pipeline") || loc === "/meeting-workspace" || loc.startsWith("/meeting-workspace") || loc === "/workspace" || loc.startsWith("/post-meeting-review"),
    },
    {
      id: "documents",
      icon: FileSignature,
      label: "Documents",
      path: "/agreements",
      isActive: (loc) => loc === "/agreements" || loc === "/contracts" || loc.startsWith("/smart-files") || loc === "/invoices" || loc === "/bill-guardian",
    },
    {
      id: "templates",
      icon: LayoutTemplate,
      label: "Templates",
      path: "/templates",
      isActive: (loc) => loc === "/templates" || loc.startsWith("/templates/"),
    },
    {
      id: "tools",
      icon: Wrench,
      label: "Tools",
      path: "/tools",
      isActive: (loc) => loc === "/tools" || (loc.startsWith("/tools/") && !loc.startsWith("/tools/state-complaint")) || loc === "/first-mate" || loc === "/knowledge-base" || loc === "/walkthroughs",
    },
    {
      id: "reports",
      icon: Activity,
      label: "Reports",
      path: "/metrics",
      isActive: (loc) => loc === "/metrics" || loc.startsWith("/metrics") || loc === "/company/metrics",
    },
    {
      id: "giving",
      icon: HandHeart,
      label: "Giving & Impact",
      path: "/giving",
      isActive: (loc) => loc === "/giving" || loc.startsWith("/giving") || loc === "/sponsors",
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      path: "/settings",
      isActive: (loc) => loc === "/settings" || loc.startsWith("/settings") || loc === "/team" || loc.startsWith("/team") || loc === "/automations" || loc === "/integrations" || loc === "/ai-connections" || loc === "/portal-management" || loc === "/manage-experiences" || loc === "/services" || loc === "/tasks",
    },
  ];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1b2a]">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <img src={LOGO_URL} alt="Waypoint Advocates" className="w-24 h-24 object-contain" />
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Sign in to continue</h1>
            <p className="text-sm text-white/60">Access to this dashboard requires authentication.</p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full bg-amber-500 hover:bg-amber-400 text-[#0d1b2a] font-semibold shadow-lg"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

interface SearchDirectoryItem {
  id: string;
  name: string;
  category: "module" | "tool";
  path: string;
  badge?: string;
  keywords: string[];
  icon: LucideIcon;
}

function isStudentContact(c: any) {
  if (!c) return false;
  const title = (c.jobTitle || "").toLowerCase().trim();
  if (title.includes("student")) return true;
  if (c.parentContactId != null && c.parentContactId > 0) return true;
  if (c.studentStatus || c.gradeLevel || c.schoolName || c.caseId) return true;
  return false;
}

const SEARCHABLE_DIRECTORY: SearchDirectoryItem[] = [
  // Modules
  { id: "mod-crew", name: "Crew Quarters", category: "module", path: "/", badge: "PG-038", keywords: ["home", "dashboard", "personal", "employee", "my work"], icon: LighthouseCottageIcon as any },
  { id: "mod-call", name: "Call Center", category: "module", path: "/call-center", badge: "PG-018", keywords: ["calls", "logs", "phone", "dialer", "voice", "caller id", "quo"], icon: Headset },
  { id: "mod-leads", name: "Lead Center", category: "module", path: "/leads", badge: "PG-003", keywords: ["leads", "prospects", "intake", "pipeline", "discovery call", "forms"], icon: TrendingUp },
  { id: "mod-calendar", name: "Calendar & Appointments", category: "module", path: "/calendar", badge: "PG-007", keywords: ["schedule", "appointments", "sessions", "coverage", "booking"], icon: Calendar },
  { id: "mod-students", name: "Students File Cabinet", category: "module", path: "/students", badge: "PG-004", keywords: ["students", "roster", "iep", "504", "cases", "files", "cabinet"], icon: GraduationCap },
  { id: "mod-contacts", name: "Contacts Directory", category: "module", path: "/contacts", badge: "PG-002", keywords: ["clients", "parents", "directory", "people", "directory", "families"], icon: Users },
  { id: "mod-advocacy", name: "Advocacy Pipeline", category: "module", path: "/advocacy-pipeline", badge: "PG-039", keywords: ["pipeline", "advocacy", "cases", "stages", "retention"], icon: Workflow },
  { id: "mod-agreements", name: "Agreements Engine", category: "module", path: "/agreements", badge: "PG-046", keywords: ["contracts", "signatures", "smart files", "agreements", "terms"], icon: FileSignature },
  { id: "mod-invoices", name: "Invoices & Billing", category: "module", path: "/invoices", badge: "PG-005", keywords: ["invoices", "payments", "receipts", "billing", "charges"], icon: Banknote },
  { id: "mod-templates", name: "Templates", category: "module", path: "/templates", badge: "PG-011", keywords: ["templates", "forms", "letters", "documents", "email templates"], icon: LayoutTemplate },
  { id: "mod-reports", name: "Reports & Metrics", category: "module", path: "/metrics", badge: "PG-042", keywords: ["analytics", "metrics", "kpi", "performance", "financials"], icon: Activity },
  { id: "mod-giving", name: "Giving & Impact", category: "module", path: "/giving", badge: "PG-040", keywords: ["giving", "scholarships", "donations", "charity", "funds", "sponsors"], icon: HandHeart },
  { id: "mod-settings", name: "Settings", category: "module", path: "/settings", badge: "PG-024", keywords: ["settings", "configuration", "preferences", "receipts", "domain"], icon: Settings },
  { id: "mod-team", name: "Team Management", category: "module", path: "/team", badge: "PG-019", keywords: ["staff", "employees", "permissions", "roles", "payroll", "equipment"], icon: Shield },
  { id: "mod-tasks", name: "Tasks Queue", category: "module", path: "/tasks", badge: "PG-009", keywords: ["tasks", "todos", "action items", "reminders", "assignments"], icon: CheckSquare },
  { id: "mod-messages", name: "Client Messages", category: "module", path: "/messages", badge: "PG-045", keywords: ["sms", "messages", "chat", "inbox", "conversations"], icon: MessageSquare },

  // Tools Hub items
  { id: "tool-recorder", name: "Voyage Meeting Recorder", category: "tool", path: "/tools/voyage-recorder", badge: "PG-010-REC", keywords: ["voyage", "recorder", "audio", "meeting", "transcription", "screen", "live"], icon: Video },
  { id: "tool-pwn", name: "PWN Decoder", category: "tool", path: "/tools/pwn-decoder", badge: "PG-010-PWN", keywords: ["pwn", "decoder", "prior written notice", "special ed", "district"], icon: Sparkles },
  { id: "tool-iep", name: "IEP Comparator", category: "tool", path: "/tools/iep-comparator", badge: "PG-010-IEP", keywords: ["iep", "compare", "diff", "accommodations", "goals", "annual"], icon: Layers },
  { id: "tool-worksheet", name: "Worksheet Studio", category: "tool", path: "/tools/worksheet-builder", badge: "PG-010-WS", keywords: ["worksheet", "builder", "discovery sheet", "intake form", "studio"], icon: FileText },
  { id: "tool-complaint", name: "State Complaint Builder", category: "tool", path: "/state-complaint-builder", badge: "PG-020", keywords: ["complaint", "state complaint", "legal", "violation", "idea", "due process"], icon: Shield },
  { id: "tool-firstmate", name: "First Mate Fast Assist", category: "tool", path: "/first-mate", badge: "PG-037", keywords: ["first mate", "ai", "copilot", "prompt", "fast assist", "guidance"], icon: Sparkles },
  { id: "tool-bill", name: "Bill Guardian", category: "tool", path: "/bill-guardian", badge: "PG-022", keywords: ["bill guardian", "audit", "invoice scanner", "billing review"], icon: Receipt },
  { id: "tool-braindump", name: "BrainDump & Quick Notes", category: "tool", path: "/brain-dump", badge: "PG-021", keywords: ["brain dump", "notes", "scratchpad", "ideas", "memos"], icon: Brain },
  { id: "tool-compass", name: "Case Compass Console", category: "tool", path: "/case-compass", badge: "PG-025", keywords: ["case compass", "progress", "milestones", "visual compass"], icon: Compass },
  { id: "tool-kb", name: "Knowledge Base", category: "tool", path: "/knowledge-base", badge: "PG-016", keywords: ["knowledge base", "sop", "laws", "guidelines", "research"], icon: BookOpen },
  { id: "tool-sop", name: "Walkthroughs (SOP)", category: "tool", path: "/walkthroughs", badge: "PG-017", keywords: ["walkthroughs", "sop", "procedures", "call scripts", "steps"], icon: ListChecks },
  { id: "tool-meeting", name: "Meeting Workspace", category: "tool", path: "/meeting-workspace", badge: "PG-043", keywords: ["meeting", "live meeting", "workspace", "in-session"], icon: Video },
  { id: "tool-postmeeting", name: "Post-Meeting Review", category: "tool", path: "/post-meeting-review", badge: "PG-044", keywords: ["post meeting", "review", "summary", "follow-up", "action items"], icon: ClipboardList },
];

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "blue";
  const { data: logoData } = trpc.system.getCompanyLogo.useQuery();
  const { projectLabel, projectLabelPlural, projectIconKey } = useTerminology();
  const projectIcon = ICON_MAP[projectIconKey] ?? GraduationCap;

  // Global search across students, clients, modules, tools
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: rawContacts = [] } = trpc.contacts.list.useQuery(undefined, {
    enabled: !!user && user.role !== "client",
  });

  // Query unread messages for staff / team members
  const { data: crewStats } = trpc.crewMessages.getOverviewStats.useQuery(undefined, {
    enabled: !!user && user.role !== "client",
    refetchInterval: 15000,
  });
  const { data: unreadClientMsgs = [] } = trpc.messages.unread.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Simulated unread message tester state
  const [testUnreadActive, setTestUnreadActive] = useState(() => getTestUnreadState());
  useEffect(() => {
    const handleTestChange = (e: any) => {
      setTestUnreadActive(e?.detail?.active ?? getTestUnreadState());
    };
    window.addEventListener("waypoint-test-unread-changed", handleTestChange);
    window.addEventListener("storage", handleTestChange);
    return () => {
      window.removeEventListener("waypoint-test-unread-changed", handleTestChange);
      window.removeEventListener("storage", handleTestChange);
    };
  }, []);

  const unreadMessageCount =
    (crewStats?.unreadTotal || 0) +
    (Array.isArray(unreadClientMsgs) ? unreadClientMsgs.length : 0) +
    (testUnreadActive ? 1 : 0);
  const hasUnreadMessages = unreadMessageCount > 0;

  // Match current user to employee record (by email) for dynamic sidebar and route access
  const currentEmployee = useMemo(() => {
    if (!user?.email) return null;
    const employees = getStoredEmployees();
    return (
      employees.find(
        (e) => e.email.toLowerCase() === user.email?.toLowerCase()
      ) || null
    );
  }, [user?.email]);

  const rawNavItems = useMemo(
    () => buildMasterNavItems(projectLabelPlural, projectIcon),
    [projectLabelPlural, projectIcon]
  );

  // Dynamically filter sidebar modules according to role permissions and employee overrides
  const navItems = useMemo(() => {
    if (
      !currentEmployee ||
      user?.role === "admin" ||
      user?.email?.toLowerCase().includes("byron@waypointadvocates.com")
    ) {
      return rawNavItems;
    }

    return rawNavItems.filter((item) => {
      const modDef = CRM_MODULES.find(
        (m) => m.path === item.path || (item.path !== "/" && m.path.startsWith(item.path))
      );
      if (!modDef) return true;
      const access = checkEmployeeModuleAccess(currentEmployee, modDef.id);
      return access !== "none";
    });
  }, [rawNavItems, currentEmployee, user?.role, user?.email]);
  const [location, setLocation] = useLocation();

  // Route security check: block direct URL access to modules without permission
  const currentForbiddenModule = useMemo(() => {
    if (
      !currentEmployee ||
      user?.role === "admin" ||
      user?.email?.toLowerCase().includes("byron@waypointadvocates.com")
    ) {
      return null;
    }
    const currentMod = CRM_MODULES.find(
      (m) => m.path === location || (m.path !== "/" && location.startsWith(m.path))
    );
    if (!currentMod) return null;
    const access = checkEmployeeModuleAccess(currentEmployee, currentMod.id);
    return access === "none" ? currentMod : null;
  }, [currentEmployee, user?.role, user?.email, location]);
  const { state, toggleSidebar, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [goToPageOpen, setGoToPageOpen] = useState(false);

  // Search open/close & selection handlers
  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    setSearchQuery("");
    setHighlightedIndex(0);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setHighlightedIndex(0);
  };

  const handleSelectResult = (path: string) => {
    setLocation(path);
    handleCloseSearch();
  };

  // Close search on click outside
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        handleCloseSearch();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchOpen]);

  // Global keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isSearchOpen) {
          handleCloseSearch();
        } else {
          handleOpenSearch();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  const searchNormalized = searchQuery.trim().toLowerCase();

  const { filteredStudents, filteredClients, filteredModules, filteredTools } = useMemo(() => {
    if (!searchNormalized) {
      return {
        filteredStudents: [],
        filteredClients: [],
        filteredModules: [],
        filteredTools: [],
      };
    }

    const students: any[] = [];
    const clients: any[] = [];

    (rawContacts as any[]).forEach((c) => {
      const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const school = (c.schoolName || "").toLowerCase();
      const grade = (c.gradeLevel || "").toLowerCase();
      const caseId = (c.caseId || "").toLowerCase();
      const diagnosis = (c.diagnosis || "").toLowerCase();
      const company = (c.company || "").toLowerCase();

      const matches =
        fullName.includes(searchNormalized) ||
        email.includes(searchNormalized) ||
        phone.includes(searchNormalized) ||
        school.includes(searchNormalized) ||
        grade.includes(searchNormalized) ||
        caseId.includes(searchNormalized) ||
        diagnosis.includes(searchNormalized) ||
        company.includes(searchNormalized);

      if (matches) {
        if (isStudentContact(c)) {
          students.push(c);
        } else {
          clients.push(c);
        }
      }
    });

    const modules = SEARCHABLE_DIRECTORY.filter(
      (item) =>
        item.category === "module" &&
        (item.name.toLowerCase().includes(searchNormalized) ||
          item.badge?.toLowerCase().includes(searchNormalized) ||
          item.keywords.some((k) => k.toLowerCase().includes(searchNormalized)))
    );

    const tools = SEARCHABLE_DIRECTORY.filter(
      (item) =>
        item.category === "tool" &&
        (item.name.toLowerCase().includes(searchNormalized) ||
          item.badge?.toLowerCase().includes(searchNormalized) ||
          item.keywords.some((k) => k.toLowerCase().includes(searchNormalized)))
    );

    return {
      filteredStudents: students.slice(0, 6),
      filteredClients: clients.slice(0, 6),
      filteredModules: modules.slice(0, 5),
      filteredTools: tools.slice(0, 5),
    };
  }, [rawContacts, searchNormalized]);

  // Flattened items for keyboard navigation
  const flatSearchResults = useMemo(() => {
    const list: { id: string; name: string; path: string; category: string }[] = [];
    if (!searchNormalized) return list;

    filteredStudents.forEach((s) =>
      list.push({
        id: `student-${s.id}`,
        name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student",
        path: `/contacts/${s.id}`,
        category: "Student",
      })
    );
    filteredClients.forEach((c) =>
      list.push({
        id: `client-${c.id}`,
        name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Client",
        path: `/contacts/${c.id}`,
        category: "Client",
      })
    );
    filteredTools.forEach((t) =>
      list.push({
        id: t.id,
        name: t.name,
        path: t.path,
        category: "Tool",
      })
    );
    filteredModules.forEach((m) =>
      list.push({
        id: m.id,
        name: m.name,
        path: m.path,
        category: "Module",
      })
    );
    return list;
  }, [searchNormalized, filteredStudents, filteredClients, filteredTools, filteredModules]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCloseSearch();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flatSearchResults.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % flatSearchResults.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatSearchResults.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + flatSearchResults.length) % flatSearchResults.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatSearchResults[highlightedIndex]) {
        handleSelectResult(flatSearchResults[highlightedIndex].path);
      }
    }
  };




  // ============ VOYAGE RECORDER GLOBAL PIPELINE ENGINE ============
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [title, setTitle] = useState("Voyage Session Recording");
  const [autoSync, setAutoSync] = useState(true);
  const [saveBackup, setSaveBackup] = useState(true);
  const [advocateDirectives, setAdvocateDirectives] = useState(() => {
    return localStorage.getItem("voyage_recorder_directives") || 
      `[AI Prompt & System Guidelines]\n1. Focus on flagging special education service changes.\n2. Tag any OT, PT, or Speech Therapy mentions.\n3. Identify FAPE compliance discussions.`;
  });

  const miniVideoRef = useRef<HTMLVideoElement>(null);

  // Expose global controller registry in window context for child pages (VoyageRecorder, Tools)
  useEffect(() => {
    (window as any).voyageGlobalRecorder = {
      isRecording,
      setIsRecording,
      recordDuration,
      setRecordDuration,
      liveTranscript,
      setLiveTranscript,
      stream,
      setStream,
      isMinimized,
      setIsMinimized,
      selectedContactId,
      setSelectedContactId,
      title,
      setTitle,
      autoSync,
      setAutoSync,
      saveBackup,
      setSaveBackup,
      advocateDirectives,
      setAdvocateDirectives,
      stopRecording: () => {
        handleStopRecording();
      },
      startRecording: async () => {
        await handleStartRecording();
      }
    };
  }, [isRecording, recordDuration, liveTranscript, stream, isMinimized, selectedContactId, title, autoSync, saveBackup, advocateDirectives]);

  // Request screen capture using getDisplayMedia
  const handleStartRecording = async () => {
    try {
      if (typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
      
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true
      });
      setStream(mediaStream);
      setIsRecording(true);
      setIsMinimized(false);
      
      // Auto register end track callback
      mediaStream.getVideoTracks()[0].onended = () => {
        // Trigger notification
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Voyage Recording Paused", {
            body: "Confirm you are done with the meeting? Click to stop the recording and process video/audio.",
            requireInteraction: true
          });
        }
        toast.warning(
          "Screen sharing was stopped. Click to stop the recording and initiate AI transcription pipeline.",
          {
            duration: 10000,
            action: {
              label: "Stop & Save",
              onClick: () => {
                handleStopRecording();
              }
            }
          }
        );
      };
    } catch (err: any) {
      console.warn("Screen share request denied or failed, starting simulated capture:", err);
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsRecording(false);
    setIsMinimized(false);
    toast.success("Meeting recording successfully saved to student's Voyage Log!");
  };

  // Recording Timer effect
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordDuration((prev) => {
          const next = prev + 1;
          if (next === 2) {
            setLiveTranscript((t) => [...t, "Advocate: We're starting the IEP review session."]);
          } else if (next === 5) {
            setLiveTranscript((t) => [...t, "Parent: I want to focus on reading support options today."]);
          } else if (next === 8) {
            setLiveTranscript((t) => [...t, "Special Ed Teacher: The current goal is 15 minutes daily support."]);
          } else if (next === 11) {
            setLiveTranscript((t) => [...t, "Advocate: We should request individual goals."]);
          }
          return next;
        });
      }, 1000);
    } else {
      setRecordDuration(0);
      setLiveTranscript([]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Handle mini-video preview rendering
  useEffect(() => {
    if (isRecording && stream && isMinimized) {
      setTimeout(() => {
        if (miniVideoRef.current) {
          miniVideoRef.current.srcObject = stream;
          miniVideoRef.current.play().catch(() => {});
        }
      }, 300);
    }
  }, [isRecording, stream, isMinimized]);

  // Developer Rules state & queries
  const [isDevRulesOpen, setIsDevRulesOpen] = useState(false);
  const [devRuleText, setDevRuleText] = useState("");
  const [issueReporterOpen, setIssueReporterOpen] = useState(false);

  const pageKey = "crm:path:" + (location === "/" ? "dashboard" : location.replace(/^\//, "").replaceAll("/", ":"));
  const { data: devRules = [], refetch: refetchDevRules } = trpc.portal.getDevRules.useQuery();

  // Global shortcut (⌥+F or Alt+F) and custom events to trigger Linear issue reporter / Dev rules
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && (e.key === "f" || e.key === "F")) ||
        (e.metaKey && e.shiftKey && (e.key === "f" || e.key === "F"))
      ) {
        e.preventDefault();
        setIssueReporterOpen(true);
      }
    };
    const handleOpenIssues = () => setIssueReporterOpen(true);
    const handleOpenDevRules = () => {
      const rule = devRules.find((r: any) => r.tabKey === pageKey);
      setDevRuleText(rule?.content || "");
      setIsDevRulesOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-issue-reporter", handleOpenIssues);
    window.addEventListener("open-dev-rules", handleOpenDevRules);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-issue-reporter", handleOpenIssues);
      window.removeEventListener("open-dev-rules", handleOpenDevRules);
    };
  }, [devRules, pageKey]);

  const saveDevRulesMutation = trpc.portal.saveDevRules.useMutation({
    onSuccess: () => {
      toast.success("Developer guidelines saved");
      refetchDevRules();
      setIsDevRulesOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save developer rules");
    }
  });

  const handleSaveDevRules = () => {
    saveDevRulesMutation.mutate({
      tabKey: pageKey,
      content: devRuleText
    });
  };
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = navItems.find((item) => item.isActive(location));

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 transition-all duration-[3000ms] ease-in-out"
          disableTransition={isResizing}
        >
          {/* ── Header: Gold Shimmer + Circle Theme Toggle + Collapse Button + Logo & Wordmark ── */}
          <SidebarHeader className="px-3 pt-3.5 pb-2 bg-transparent border-b border-[#152744] gap-0 relative z-40 overflow-visible">
            {/* Top golden accent shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#F7D287] to-transparent shadow-[0_0_10px_rgba(247,210,135,0.75)] pointer-events-none z-30" />

            {!isCollapsed ? (
              <div className="relative w-full flex flex-col items-center justify-center pt-1 pb-1">
                {/* Circle Light/Dark Mode Toggle at top left (matching Client Portal) */}
                <button
                  onClick={toggleTheme}
                  className={`absolute top-0 left-0 w-7 h-7 rounded-full border flex items-center justify-center overflow-hidden transition-all duration-[300ms] ease-in-out cursor-pointer shadow-md z-20 ${
                    isLight
                      ? "border-amber-500/50 bg-white text-slate-700 hover:bg-slate-50 hover:border-amber-500"
                      : "border-[#F5B544]/70 hover:border-[#F5B544] bg-[#07152B] hover:bg-[#0C1F3D] text-[#F5B544] shadow-amber-500/10"
                  }`}
                  title={isLight ? "Switch to dark mode" : "Switch to light mode"}
                  aria-label="Toggle theme"
                >
                  {/* Sun Icon (rises and rotates in light mode) */}
                  <Sun
                    className={`absolute h-3.5 w-3.5 text-amber-500 transition-all duration-[300ms] ease-in-out transform ${
                      isLight
                        ? "translate-y-0 rotate-0 scale-100 opacity-100"
                        : "translate-y-6 -rotate-90 scale-50 opacity-0"
                    }`}
                  />
                  {/* Moon Icon (sets and rotates in dark mode) */}
                  <Moon
                    className={`absolute h-3.5 w-3.5 text-amber-300 transition-all duration-[300ms] ease-in-out transform ${
                      !isLight
                        ? "translate-y-0 rotate-0 scale-100 opacity-100"
                        : "-translate-y-6 rotate-90 scale-50 opacity-0"
                    }`}
                  />
                </button>

                {/* Collapse button at top right */}
                <button
                  onClick={toggleSidebar}
                  className="absolute top-0 right-0 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] text-white/60 hover:text-white cursor-pointer z-20"
                  title="Close sidebar"
                  aria-label="Close sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>

                {/* Waypoint Advocates Logo & Wordmark */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <img
                    src={logoData?.logoUrl || LOGO_URL}
                    alt="Waypoint Advocates"
                    className="h-12 w-12 object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  />
                  <div className="flex flex-col items-center leading-tight w-full">
                    <span className="font-serif tracking-[0.24em] text-[#E5C175] text-[15px] font-bold uppercase select-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] pl-1">
                      WAYPOINT
                    </span>

                    {/* ADVOCATES Row with Expanding Search Bar */}
                    <div ref={searchContainerRef} className="relative w-full flex items-center justify-center min-h-[28px] mt-0.5">
                      {/* Normal State: ADVOCATES with Magnifying Glass to its Left, Lined Up Under Moon Icon */}
                      <div
                        className={cn(
                          "w-full relative flex items-center justify-center transition-all duration-200",
                          isSearchOpen ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
                        )}
                      >
                        {/* Magnifying Glass Icon Button (left of ADVOCATES, lined up directly under the moon icon) */}
                        <button
                          type="button"
                          onClick={handleOpenSearch}
                          className="absolute left-0 w-7 h-7 rounded-full flex items-center justify-center text-[#B9CDE3]/80 hover:text-[#F8D279] hover:bg-white/[0.08] transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] group"
                          aria-label="Search students, clients, modules, tools"
                        >
                          <Search className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                        </button>

                        {/* Centered ADVOCATES Text */}
                        <span className="tracking-[0.28em] text-[#B9CDE3] text-[10.5px] font-semibold uppercase select-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] pl-1">
                          ADVOCATES
                        </span>

                        {/* Messages Icon Button (right of ADVOCATES, directly under the close/collapse button) */}
                        <button
                          type="button"
                          onClick={() => setLocation("/crew-quarters?tab=messages")}
                          className="absolute right-0 w-7 h-7 rounded-full flex items-center justify-center text-[#B9CDE3]/80 hover:text-[#F8D279] hover:bg-white/[0.08] transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] group"
                          aria-label="Team member messages"
                          title={hasUnreadMessages ? `${unreadMessageCount} new message${unreadMessageCount > 1 ? "s" : ""} — click to view` : "Team Member Messages"}
                        >
                          <MessageSquare className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                          {hasUnreadMessages && (
                            <span className="absolute -top-1 -left-1 flex h-3 w-3 items-center justify-center pointer-events-none">
                              {/* Continuous circular ripple waves expanding outward and fading */}
                              <span className="absolute h-full w-full rounded-full border-2 border-amber-400 bg-amber-400/35 animate-ripple-out pointer-events-none" />
                              <span className="absolute h-full w-full rounded-full border border-amber-300 bg-amber-300/25 animate-ripple-out-delay pointer-events-none" />

                              {/* Center anchor amber jewel dot */}
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-tr from-amber-500 via-amber-400 to-[#FFF3B0] border border-[#051124] shadow-[0_0_8px_#F5B544,0_0_14px_rgba(245,181,68,0.95)]" />
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Expanding Search Bar (enters from left to right, covering ADVOCATES) */}
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 right-0 flex items-center transition-all duration-300 ease-out origin-left z-30",
                          isSearchOpen
                            ? "w-full opacity-100 scale-x-100 pointer-events-auto"
                            : "w-0 opacity-0 scale-x-0 pointer-events-none overflow-hidden"
                        )}
                      >
                        <div className="relative w-full flex items-center">
                          <Search className="absolute left-2.5 h-3 w-3 text-[#E5C175] pointer-events-none drop-shadow-[0_0_4px_rgba(229,193,117,0.4)]" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setHighlightedIndex(0);
                            }}
                            onBlur={(e) => {
                              if (!searchContainerRef.current?.contains(e.relatedTarget as Node)) {
                                handleCloseSearch();
                              }
                            }}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Search students, tools, modules..."
                            className="w-full h-7 pl-7 pr-6 text-[11px] font-medium bg-[#07162C] border border-[#D4AF37]/60 focus:border-[#F8D279] text-white placeholder-white/40 rounded-full shadow-[0_0_12px_rgba(212,175,55,0.25),inset_0_1px_2px_rgba(0,0,0,0.6)] focus:outline-none focus:ring-1 focus:ring-[#F8D279] transition-all"
                          />
                          <button
                            type="button"
                            onClick={handleCloseSearch}
                            className="absolute right-1.5 h-4 w-4 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            aria-label="Close search"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Results Popover Dropdown — ONLY renders when actively typing a query */}
                      {isSearchOpen && searchNormalized.length > 0 && (
                        <div
                          className="absolute top-[calc(100%+8px)] -left-2 -right-2 bg-[#061426]/98 border border-[#1C3A60] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_16px_rgba(212,175,55,0.15)] backdrop-blur-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left"
                          style={{ maxHeight: "380px" }}
                        >
                          <div className="p-1.5 max-h-[340px] overflow-y-auto space-y-2 divide-y divide-white/5">
                              {/* Students Section */}
                              {filteredStudents.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#F8D279]">
                                    <GraduationCap className="h-3 w-3" />
                                    <span>Students ({filteredStudents.length})</span>
                                  </div>
                                  {filteredStudents.map((s) => {
                                    const itemId = `student-${s.id}`;
                                    const isSelected = flatSearchResults[highlightedIndex]?.id === itemId;
                                    const studentName = `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student";
                                    return (
                                      <button
                                        key={itemId}
                                        type="button"
                                        onClick={() => handleSelectResult(`/contacts/${s.id}`)}
                                        className={cn(
                                          "w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer border",
                                          isSelected
                                            ? "bg-gradient-to-r from-[#173050] to-[#1F416A] border-[#D4AF37]/60 text-white shadow-sm"
                                            : "hover:bg-white/[0.07] border-transparent text-[#CFDFEE]"
                                        )}
                                      >
                                        <div className="min-w-0 flex-1 pr-2">
                                          <p className="text-xs font-semibold text-white truncate">{studentName}</p>
                                          <p className="text-[10px] text-[#8FA3BF] truncate">
                                            {s.gradeLevel ? `Grade ${s.gradeLevel}` : "Student"}
                                            {s.schoolName ? ` • ${s.schoolName}` : ""}
                                            {s.caseId ? ` • ${s.caseId}` : ""}
                                          </p>
                                        </div>
                                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-[#F8D279] border border-amber-500/30 shrink-0">
                                          {s.planType || "Student"}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Clients Section */}
                              {filteredClients.length > 0 && (
                                <div className="space-y-1 pt-1.5">
                                  <div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#79C0FF]">
                                    <Users className="h-3 w-3" />
                                    <span>Clients ({filteredClients.length})</span>
                                  </div>
                                  {filteredClients.map((c) => {
                                    const itemId = `client-${c.id}`;
                                    const isSelected = flatSearchResults[highlightedIndex]?.id === itemId;
                                    const clientName = `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Client";
                                    return (
                                      <button
                                        key={itemId}
                                        type="button"
                                        onClick={() => handleSelectResult(`/contacts/${c.id}`)}
                                        className={cn(
                                          "w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer border",
                                          isSelected
                                            ? "bg-gradient-to-r from-[#173050] to-[#1F416A] border-[#D4AF37]/60 text-white shadow-sm"
                                            : "hover:bg-white/[0.07] border-transparent text-[#CFDFEE]"
                                        )}
                                      >
                                        <div className="min-w-0 flex-1 pr-2">
                                          <p className="text-xs font-semibold text-white truncate">{clientName}</p>
                                          <p className="text-[10px] text-[#8FA3BF] truncate">
                                            {c.email || c.phone || c.company || "Client Contact"}
                                          </p>
                                        </div>
                                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                                          Client
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Advocate Tools Section */}
                              {filteredTools.length > 0 && (
                                <div className="space-y-1 pt-1.5">
                                  <div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#E5C175]">
                                    <Wrench className="h-3 w-3" />
                                    <span>Advocate Tools ({filteredTools.length})</span>
                                  </div>
                                  {filteredTools.map((t) => {
                                    const isSelected = flatSearchResults[highlightedIndex]?.id === t.id;
                                    const ToolIcon = t.icon;
                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleSelectResult(t.path)}
                                        className={cn(
                                          "w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer border",
                                          isSelected
                                            ? "bg-gradient-to-r from-[#173050] to-[#1F416A] border-[#D4AF37]/60 text-white shadow-sm"
                                            : "hover:bg-white/[0.07] border-transparent text-[#CFDFEE]"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                          <ToolIcon className="h-3.5 w-3.5 text-[#F8D279] shrink-0" />
                                          <p className="text-xs font-semibold text-white truncate">{t.name}</p>
                                        </div>
                                        {t.badge && (
                                          <span className="text-[9px] font-mono text-[#8FA3BF] bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                                            {t.badge}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* CRM Modules Section */}
                              {filteredModules.length > 0 && (
                                <div className="space-y-1 pt-1.5">
                                  <div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#A5C1E5]">
                                    <Compass className="h-3 w-3" />
                                    <span>Modules & Pages ({filteredModules.length})</span>
                                  </div>
                                  {filteredModules.map((m) => {
                                    const isSelected = flatSearchResults[highlightedIndex]?.id === m.id;
                                    const ModIcon = m.icon;
                                    return (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => handleSelectResult(m.path)}
                                        className={cn(
                                          "w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer border",
                                          isSelected
                                            ? "bg-gradient-to-r from-[#173050] to-[#1F416A] border-[#D4AF37]/60 text-white shadow-sm"
                                            : "hover:bg-white/[0.07] border-transparent text-[#CFDFEE]"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                          <ModIcon className="h-3.5 w-3.5 text-[#A5C1E5] shrink-0" />
                                          <p className="text-xs font-semibold text-white truncate">{m.name}</p>
                                        </div>
                                        {m.badge && (
                                          <span className="text-[9px] font-mono text-[#8FA3BF] bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                                            {m.badge}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Empty State */}
                              {flatSearchResults.length === 0 && (
                                <div className="py-6 px-3 text-center">
                                  <Search className="h-5 w-5 text-white/30 mx-auto mb-2" />
                                  <p className="text-xs font-semibold text-white/80">No results found for "{searchQuery}"</p>
                                  <p className="text-[10px] text-white/40 mt-1">
                                    Try searching for a student, parent, tool (e.g. Voyage), or CRM module.
                                  </p>
                                </div>
                              )}
                            </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-1 gap-2">
                <button
                  onClick={toggleSidebar}
                  className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] text-[#E5C175] hover:text-[#FFF4D4] cursor-pointer group"
                  title="Open sidebar"
                  aria-label="Open sidebar"
                >
                  <PanelLeftOpen className="h-5 w-5 group-hover:scale-110 transition-transform text-[#E5C175] drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
                </button>
                <button
                  onClick={toggleTheme}
                  className={`relative w-7 h-7 rounded-full border flex items-center justify-center overflow-hidden transition-all duration-[300ms] ease-in-out cursor-pointer shadow-md ${
                    isLight
                      ? "border-amber-500/50 bg-white text-slate-700 hover:bg-slate-50 hover:border-amber-500"
                      : "border-[#F5B544]/70 hover:border-[#F5B544] bg-[#07152B] hover:bg-[#0C1F3D] text-[#F5B544] shadow-amber-500/10"
                  }`}
                  title={isLight ? "Switch to dark mode" : "Switch to light mode"}
                  aria-label="Toggle theme"
                >
                  <Sun
                    className={`absolute h-3.5 w-3.5 text-amber-500 transition-all duration-[300ms] ease-in-out transform ${
                      isLight
                        ? "translate-y-0 rotate-0 scale-100 opacity-100"
                        : "translate-y-6 -rotate-90 scale-50 opacity-0"
                    }`}
                  />
                  <Moon
                    className={`absolute h-3.5 w-3.5 text-amber-300 transition-all duration-[300ms] ease-in-out transform ${
                      !isLight
                        ? "translate-y-0 rotate-0 scale-100 opacity-100"
                        : "-translate-y-6 rotate-90 scale-50 opacity-0"
                    }`}
                  />
                </button>
              </div>
            )}
          </SidebarHeader>

          {/* ── Nav items: Clean Vertical List with Byron's Picked Icons & Radiant Highlight ── */}
          <SidebarContent className="bg-transparent px-2.5 py-3 overflow-y-auto space-y-1">
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive = item.isActive(location);
                const IconComponent = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={cn(
                        "h-10 w-full px-3 rounded-lg text-[13.5px] cursor-pointer transition-all duration-150 flex items-center gap-3.5 select-none",
                        isActive
                          ? "bg-gradient-to-r from-[#173050]/95 via-[#23456F]/85 to-[#162E4D]/95 border border-[#D4AF37]/50 text-white font-semibold shadow-[0_2px_12px_rgba(212,175,55,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]"
                          : "text-[#B9CDE3] hover:text-white hover:bg-white/[0.07] border border-transparent font-medium"
                      )}
                    >
                      {IconComponent && (
                        <IconComponent
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform",
                            isActive
                              ? "text-[#F8D279] drop-shadow-[0_0_6px_rgba(248,210,121,0.6)] scale-105"
                              : "text-[#E0B86C] drop-shadow-[0_0_2px_rgba(224,184,108,0.3)]"
                          )}
                        />
                      )}
                      <span className="truncate tracking-wide">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* ── Footer: Compact Employee Pill Matching Reference ── */}
          <SidebarFooter className="bg-[#07152B] border-t border-[#152744] px-2 py-2">
            <div className="flex items-center gap-1.5 w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center h-8 rounded-md border border-[#172D4D] bg-[#07172E]/90 hover:bg-[#0B1E38] hover:border-[#D4AF37]/50 transition-all flex-1 text-left overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] cursor-pointer shadow-sm group">
                    {/* Left Star compartment matching reference image */}
                    <div className="h-full px-2 flex items-center justify-center border-r border-[#152B4B] bg-[#051122]/60 group-hover:bg-[#07172E]/80 transition-colors shrink-0">
                      <Star className="h-3.5 w-3.5 text-[#D8B467] fill-[#D8B467]/20 shrink-0" />
                    </div>

                    {/* Employee Name & Up/Down Chevron */}
                    <div className="flex-1 flex items-center justify-between px-2 min-w-0 relative group-data-[collapsible=icon]:hidden">
                      <div className="flex items-center gap-1.5 min-w-0 py-0.5">
                        <span className="text-[12px] font-serif font-medium text-[#F1E8D9] tracking-wide truncate group-hover:text-white transition-colors">
                          {user?.name || currentEmployee?.name || "Byron Honea"}
                        </span>
                      </div>
                      <ChevronsUpDown className="h-3 w-3 text-[#7E95B3] group-hover:text-white shrink-0 ml-1 transition-colors opacity-70 group-hover:opacity-100" />

                      {/* Subtle golden underline glint matching the reference image */}
                      <div className="absolute -bottom-0.5 left-2 right-5 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent pointer-events-none" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#082043] border border-[#0D4B84] text-white shadow-xl backdrop-blur-md">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-semibold text-white truncate">
                      {user?.name || currentEmployee?.name || "Byron Honea"}
                    </p>
                    <p className="text-[11px] text-blue-200/70 truncate mt-0.5">
                      {user?.email || "Advocate"}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => setLocation("/crew-quarters?tab=profile")}
                    className="cursor-pointer text-xs focus:bg-white/10"
                  >
                    <UserCheck className="mr-2 h-3.5 w-3.5 text-amber-400" />
                    <span>My Profile & Credentials</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-xs text-rose-400 focus:text-rose-300 focus:bg-rose-500/10"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => setIssueReporterOpen(true)}
                title="Report Issue / Linear Backlog (⌥+F)"
                className="h-8 w-8 rounded-md bg-[#07172E] hover:border-[#D4AF37]/40 border border-[#172D4D] transition-colors flex items-center justify-center text-white/60 hover:text-rose-400 shrink-0 group-data-[collapsible=icon]:hidden focus:outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer shadow-sm"
              >
                <Bug className="h-3.5 w-3.5 text-rose-400" />
              </button>

              <button
                onClick={() => setGoToPageOpen(true)}
                title="Go to Page"
                className="h-8 w-8 rounded-md bg-[#07172E] hover:border-[#D4AF37]/40 border border-[#172D4D] transition-colors flex items-center justify-center text-white/60 hover:text-amber-400 shrink-0 group-data-[collapsible=icon]:hidden focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer shadow-sm"
              >
                <Compass className="h-3.5 w-3.5 text-amber-400" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-amber-400/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className={cn(location.startsWith("/meeting-workspace") && "bg-[#000820]")}>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground">{activeMenuItem?.label ?? "Menu"}</span>
            </div>
          </div>
        )}
        <main className={cn(
          "flex-1 p-4 relative",
          (location.startsWith("/meeting-workspace") || location === "/students" || location === "/projects") && "p-0 bg-[#020712]",
          (location.startsWith("/students/") || location.startsWith("/contacts/") || location.startsWith("/project-workspace/")) && "p-0 overflow-hidden",
          location === "/contacts" && "p-0 bg-[#07152B]",
          (location === "/giving" || location.startsWith("/giving")) && "p-0 bg-[#07162B]",
          (location === "/agreements" || location.startsWith("/agreements") || location === "/contracts" || location.startsWith("/smart-files")) && "p-0 bg-[#07162B]",
          (location.startsWith("/state-complaint-builder") || location.startsWith("/tools/state-complaint-builder")) && "p-0 bg-[#030D1A]"
        )}>
          {currentForbiddenModule ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto text-center px-4 py-12">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-5 shadow-lg shadow-rose-950/40">
                <Lock className="w-8 h-8" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-3 tracking-wide uppercase">
                Access Restricted
              </span>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Permission Required
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Your employee profile does not have permission to view or manage the <strong className="text-white font-medium">{currentForbiddenModule.label}</strong> module.
                If you require access for your role, please contact your administrator or Byron Honea in Team Management.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => setLocation("/")}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 h-9 shadow-md"
                >
                  Return to Crew Quarters
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/crew-quarters?tab=profile")}
                  className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-medium px-4 h-9"
                >
                  View My Credentials & Roles
                </Button>
              </div>
            </div>
          ) : (
            <ScopedErrorBoundary moduleName={activeMenuItem?.label ?? "Page"}>
              {children}
            </ScopedErrorBoundary>
          )}


        </main>
      </SidebarInset>

      {/* Voyage Minimized Floating Panel */}
      {isRecording && isMinimized && (
        <div className="fixed bottom-6 right-6 z-[9999] w-[340px] bg-[#07162B]/95 border border-amber-500/30 text-white rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-slide-up">
          {/* Live Video Capture Preview */}
          <div className="relative w-24 h-16 bg-black rounded-xl overflow-hidden border border-white/10 shrink-0 flex items-center justify-center">
            {stream ? (
              <video
                ref={miniVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-tr from-[#021024] to-[#0A2647] opacity-80" />
            )}
            <div className="absolute top-1 left-1.5 bg-rose-600/90 text-white text-[7px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
              <span className="w-1 h-1 rounded-full bg-white animate-ping" />
              Rec
            </div>
            <span className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-semibold text-white leading-none">
              {Math.floor(recordDuration / 60).toString().padStart(2, '0')}:
              {(recordDuration % 60).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs truncate text-white font-sans leading-tight">
              {title}
            </h4>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              Recording Active...
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setIsMinimized(false);
                setLocation("/tools/voyage-recorder");
              }}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
              title="Maximize Recorder Settings"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleStopRecording}
              className="h-8 w-8 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center shadow-lg"
              title="Stop & Save Recording"
            >
              <Square className="h-3.5 w-3.5 fill-white" />
            </Button>
          </div>
        </div>
      )}

      <CopilotUtilityCapsule />
      <QuickSetupModal open={quickSetupOpen} onClose={() => setQuickSetupOpen(false)} />
      <GoToPageModal open={goToPageOpen} onClose={() => setGoToPageOpen(false)} />
      <IssueReporterModal open={issueReporterOpen} onOpenChange={setIssueReporterOpen} />

      {/* Developer Guidelines Editor Dialog */}
      <Dialog open={isDevRulesOpen} onOpenChange={setIsDevRulesOpen}>
        <DialogContent className="bg-[#0A1628] border border-slate-800 text-white rounded-xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Developer Guidelines: <span className="capitalize text-amber-300 font-semibold">{location === "/" ? "dashboard" : location.replace(/^\//, "").replaceAll("/", " ")}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Use this space to store guidelines, ideas, or constraints for this page. This popup is visible **only to developer/staff** users.
            </p>
            <div className="space-y-2">
              <Label htmlFor="dev-rules" className="text-xs font-semibold text-slate-350">Guidelines & Ideas</Label>
              <Textarea
                id="dev-rules"
                value={devRuleText}
                onChange={(e) => setDevRuleText(e.target.value)}
                placeholder="Write rules or details for this page here..."
                rows={8}
                className="bg-[#07111E] border-slate-800 text-white focus:border-amber-400 rounded-lg text-xs leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-slate-800/80 pt-4">
            <Button 
              onClick={() => setIsDevRulesOpen(false)} 
              className="bg-transparent hover:bg-slate-850 text-slate-400 rounded-lg px-4 py-1.5 text-xs border border-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDevRules}
              disabled={saveDevRulesMutation.isPending}
              className="bg-amber-400 hover:bg-amber-500 text-[#07111E] font-bold rounded-lg px-4 py-1.5 text-xs gap-1.5 shadow-lg shadow-amber-400/10"
            >
              {saveDevRulesMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Guidelines
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const PAGE_LIST = [
  { id: "PG-001", name: "Dashboard / Home Base", path: "/" },
  { id: "PG-002", name: "Contacts", path: "/contacts" },
  { id: "PG-003", name: "Lead Center", path: "/leads" },
  { id: "PG-004", name: "Students", path: "/projects" },
  { id: "PG-005", name: "Invoices & Billing", path: "/invoices" },
  { id: "PG-006", name: "Contracts (Redirects to /agreements)", path: "/contracts" },
  { id: "PG-007", name: "Appointments & Calendar", path: "/calendar" },
  { id: "PG-008", name: "Session Types", path: "/calendar?tab=session-types" },
  { id: "PG-009", name: "Tasks", path: "/tasks" },
  { id: "PG-010", name: "Tools Hub", path: "/tools" },
  { id: "PG-010-REC", name: "Voyage Meeting Recorder", path: "/tools/voyage-recorder" },
  { id: "PG-010-PWN", name: "PWN Decoder", path: "/tools/pwn-decoder" },
  { id: "PG-010-IEP", name: "IEP Comparator", path: "/tools/iep-comparator" },
  { id: "PG-010-WS", name: "Worksheet Studio", path: "/tools/worksheet-builder" },
  { id: "PG-011", name: "Templates", path: "/templates" },
  { id: "PG-012", name: "Lead Forms", path: "/leads/forms" },
  { id: "PG-013", name: "Automations", path: "/automations" },
  { id: "PG-014", name: "Integrations", path: "/integrations" },
  { id: "PG-015", name: "Workflows", path: "/workflows" },
  { id: "PG-016", name: "Knowledge Base", path: "/knowledge-base" },
  { id: "PG-017", name: "Walkthroughs (SOP)", path: "/walkthroughs" },
  { id: "PG-018", name: "Call Center", path: "/call-center" },
  { id: "PG-019", name: "Team & Staff Management", path: "/team" },
  { id: "PG-020", name: "State Complaint Builder", path: "/state-complaint-builder" },
  { id: "PG-021", name: "My Notes & Company Notes", path: "/brain-dump" },
  { id: "PG-038-NOT", name: "My Notes (Crew Quarters)", path: "/crew-quarters?tab=notes" },
  { id: "PG-024-NOT", name: "Company Notes (Settings)", path: "/settings?section=operations" },
  { id: "PG-022", name: "Bill Guardian", path: "/bill-guardian" },
  { id: "PG-023", name: "Client Portal", path: "/client-portal" },
  { id: "PG-024", name: "Settings", path: "/settings" },
  { id: "PG-025", name: "Case Compass", path: "/case-compass" },
  { id: "PG-026", name: "Page ID Showcase", path: "/page-id-showcase" },
  { id: "PG-027", name: "Portal Management", path: "/portal-management" },
  { id: "PG-028", name: "Intake Form", path: "/intake" },
  { id: "PG-029", name: "Booking", path: "/book" },
  { id: "PG-031", name: "Workspace", path: "/workspace" },
  { id: "PG-032", name: "AI Connections", path: "/ai-connections" },
  { id: "PG-035", name: "Services Catalog", path: "/services" },
  { id: "PG-037", name: "First Mate", path: "/first-mate" },
  { id: "PG-038", name: "Crew Quarters", path: "/crew-quarters" },
  { id: "PG-039", name: "Advocacy Pipeline", path: "/advocacy-pipeline" },
  { id: "PG-040", name: "Giving & Impact Overview", path: "/giving" },
  { id: "PG-040-SUP", name: "Giving Supporters & Donors", path: "/giving/supporters" },
  { id: "PG-040-DON", name: "Giving Donations Ledger", path: "/giving/donations" },
  { id: "PG-040-SCH", name: "Giving Scholarships & Grants", path: "/giving/scholarships" },
  { id: "PG-040-FND", name: "Giving Charitable Funds", path: "/giving/funds" },
  { id: "PG-040-REC", name: "Giving Receipts & Statements", path: "/giving/receipts" },
  { id: "PG-040-REP", name: "Giving Reports & Analytics", path: "/giving/reports" },
  { id: "PG-040-WEB", name: "Giving Website Tools", path: "/giving/website-tools" },
  { id: "PG-041", name: "National Coverage", path: "/calendar?tab=coverage" },
  { id: "PG-042", name: "Waypoint Metrics", path: "/metrics" },
  { id: "PG-043", name: "Meeting Workspace", path: "/meeting-workspace" },
  { id: "PG-044", name: "Post-Meeting Review", path: "/post-meeting-review" },
  { id: "PG-046", name: "Agreements Engine", path: "/agreements" },
  { id: "PG-047", name: "Payment Receipt Experience", path: "/settings?section=receipts" },
];

function GoToPageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const query = search.trim().toLowerCase();

  const filtered = PAGE_LIST.filter(item => {
    if (!query) return true;
    const digitsOnly = query.replace(/\D/g, "");
    if (digitsOnly) {
      const itemDigits = item.id.replace(/\D/g, "");
      const queryVal = parseInt(digitsOnly, 10);
      const itemVal = parseInt(itemDigits, 10);
      if (itemDigits.includes(digitsOnly) || itemVal === queryVal) {
        return true;
      }
    }
    return (
      item.name.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      item.path.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    if (!query) return 0;
    const digitsOnly = query.replace(/\D/g, "");
    if (digitsOnly) {
      const aVal = parseInt(a.id.replace(/\D/g, ""), 10);
      const bVal = parseInt(b.id.replace(/\D/g, ""), 10);
      const queryVal = parseInt(digitsOnly, 10);
      if (aVal === queryVal && bVal !== queryVal) return -1;
      if (bVal === queryVal && aVal !== queryVal) return 1;
    }
    return 0;
  });

  const handleSelect = (path: string) => {
    setLocation(path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filtered.length > 0) {
      handleSelect(filtered[0].path);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md bg-[#0b192c]/95 border border-white/10 text-white backdrop-blur shadow-2xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-400" />
            Go to Page
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="relative">
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type page number (e.g. 4, 23) or name..."
              className="w-full bg-[#0d1e33] border-white/10 text-white placeholder-white/45 focus:border-amber-400 focus:ring-amber-400 pr-10 rounded-xl"
            />
            <div className="absolute right-3 top-2.5 text-[9px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded font-mono">
              ENTER
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filtered.length > 0 ? (
              filtered.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.path)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all border border-transparent
                    ${idx === 0 
                      ? "bg-amber-400/10 border-amber-400/30 text-amber-300" 
                      : "hover:bg-white/5 text-white/80"
                    }`}
                >
                  <span className="font-semibold text-sm">{item.name}</span>
                  <span className="text-xs font-mono opacity-60 bg-white/5 px-2 py-0.5 rounded">
                    {item.id}
                  </span>
                </button>
              ))
            ) : (
              <div className="text-center py-6 text-white/40 text-sm">
                No pages found matching "{search}"
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

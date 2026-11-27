import { useAuth } from "@/_core/hooks/useAuth";
import { logComponentMount, logComponentUnmount } from "@/lib/scrollDiagnostics";
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
import { LayoutDashboard, Banknote, CreditCard, LogOut, PanelLeft, PanelLeftClose, PanelLeftOpen, Users, GraduationCap, Briefcase, FileText, FileSignature, FileBox, Archive, Calendar, CalendarClock, TrendingUp, ScrollText, Settings, Compass, FolderOpen, BookOpen, Star, Heart, Target, ClipboardList, Layers, CheckSquare, Sun, Moon, Wrench, LayoutTemplate, Zap, Plug, GitBranch, ListChecks, Phone, UserCheck, Brain, Sparkles, LayoutGrid, Video, Minimize2, Maximize2, Square, Volume2, Monitor, Shield, ChevronDown, ChevronRight, ChevronsUpDown, Search, X, Bug, Headphones, Radar, Headset, Workflow, HandHeart, Receipt, BarChart3, Landmark, DollarSign, Globe, Globe2, MessageSquare, Bell, Activity, Lock, Home, Contact, type LucideIcon } from "lucide-react";
import {
  getStoredEmployees,
  checkEmployeeModuleAccess,
  hydrateEmployeesFromBackend,
  type BackendStaffAccessProfile,
} from "@/components/team/teamStore";
import { CRM_MODULES } from "@/components/team/teamTypes";
import { useTerminology, type ProjectIconKey } from "@/contexts/TerminologyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, startTransition, useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
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
import { CashRegisterIcon } from "@/components/ui/CashRegisterIcon";
import { MarineRadarIcon } from "@/components/ui/MarineRadarIcon";
import { getTestUnreadState } from "@/lib/testUnreadHelper";
import { broadcastPageId } from "@/lib/pageIdRegistry";
import { useWorkspaceLock } from "@/contexts/WorkspaceLockContext";
import "@/styles/admiraltyBridge.css";

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
          icon: Sparkles,
          label: "The Studio",
          path: "/studio",
          keywords: ["studio", "the studio", "whiteboard", "neon", "teaching", "presentation", "board", "notes", "brainstorming", "pg-049"]
        },
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
          label: "Invoices",
          path: "/invoices",
          keywords: ["billing", "invoices", "payments", "revenue", "pg-005"]
        },
        {
          icon: CashRegisterIcon as any,
          label: "Register",
          path: "/payment-station",
          keywords: ["register", "cash register", "payment station", "payments", "pos", "point of sale", "charge", "card by phone", "donation", "stripe", "pg-050"]
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
          icon: GitBranch,
          label: "Workflow Designer",
          path: "/workflows",
          keywords: ["workflow designer", "workflows", "monorail", "workflow map", "sop", "guide steps", "pg-015"]
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
          icon: Archive,
          label: "Archive",
          path: "/archive",
          keywords: ["archive", "archived records", "do not serve", "blacklist", "restricted", "restrictions", "pg-048"]
        },
        {
          icon: Banknote,
          label: "Bill Guardian",
          path: "/bill-guardian",
          keywords: ["bill guardian", "bills", "fee tracker", "audit", "expenses", "transactions", "pg-022"]
        },
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
        loc.startsWith("/project-workspace/") ||
        loc === "/meeting-workspace" ||
        loc.startsWith("/meeting-workspace") ||
        loc === "/workspace" ||
        loc.startsWith("/post-meeting-review"),
    },
    {
      id: "contacts",
      icon: Users,
      label: "Contacts",
      path: "/contacts",
      isActive: (loc) => loc === "/contacts" || loc === "/contacts/new",
    },
    {
      id: "documents",
      icon: FileSignature,
      label: "Documents",
      path: "/agreements",
      isActive: (loc) => loc === "/agreements" || loc === "/contracts" || loc.startsWith("/smart-files") || loc === "/invoices",
    },
    {
      id: "payment-station",
      icon: CashRegisterIcon as any,
      label: "Register",
      path: "/payment-station",
      isActive: (loc) => loc === "/payment-station" || loc.startsWith("/payment-station/") || loc === "/payments" || loc === "/pos",
    },
    {
      id: "templates",
      icon: LayoutTemplate,
      label: "Templates",
      path: "/templates",
      isActive: (loc) => loc === "/templates" || loc.startsWith("/templates/"),
    },
    {
      id: "studio",
      icon: Sparkles,
      label: "The Studio",
      path: "/studio",
      isActive: (loc) => loc === "/studio" || loc.startsWith("/studio/") || loc === "/tools/studio",
    },
    {
      id: "tools",
      icon: Wrench,
      label: "Tools",
      path: "/tools",
      isActive: (loc) => loc === "/tools" || (loc.startsWith("/tools/") && !loc.startsWith("/tools/state-complaint") && loc !== "/tools/studio") || loc === "/first-mate",
    },
    {
      id: "knowledge-base",
      icon: BookOpen,
      label: "Knowledge Base",
      path: "/knowledge-base",
      isActive: (loc) => loc === "/knowledge-base" || loc.startsWith("/knowledge-base") || loc === "/walkthroughs" || loc.startsWith("/walkthroughs"),
    },
    {
      id: "automations",
      icon: Zap,
      label: "Automations",
      path: "/automations",
      isActive: (loc) => loc === "/automations" || loc.startsWith("/automations"),
    },
    {
      id: "workflows",
      icon: GitBranch,
      label: "Workflow Designer",
      path: "/workflows",
      isActive: (loc) => loc === "/workflows" || loc.startsWith("/workflows/"),
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
      id: "archive",
      icon: Archive,
      label: "Archive",
      path: "/archive",
      isActive: (loc) =>
        loc === "/archive" ||
        loc.startsWith("/archive/") ||
        loc === "/do-not-serve" ||
        loc.startsWith("/do-not-serve/"),
    },
    {
      id: "bill-guardian",
      icon: Banknote,
      label: "Bill Guardian",
      path: "/bill-guardian",
      isActive: (loc) => loc === "/bill-guardian" || loc.startsWith("/bill-guardian/"),
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      path: "/settings",
      isActive: (loc) => loc === "/settings" || loc.startsWith("/settings") || loc === "/team" || loc.startsWith("/team") || loc === "/integrations" || loc === "/ai-connections" || loc === "/portal-management" || loc === "/manage-experiences" || loc === "/services" || loc === "/tasks",
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
    logComponentMount("Shell:DashboardLayout");
    return () => {
      logComponentUnmount("Shell:DashboardLayout");
    };
  }, []);

  useEffect(() => {
    if (loading) {
      console.warn("[DashboardLayout] Auth is loading! (Could cause skeleton flash)");
    }
  }, [loading]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  const initialAuthDone = useRef(false);
  if (!loading && user) {
    initialAuthDone.current = true;
  }

  if (loading && !initialAuthDone.current) return <DashboardLayoutSkeleton />;

  if (!user && !initialAuthDone.current) {
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
  { id: "mod-start", name: "Start Screen & Privacy Lock", category: "module", path: "/start", badge: "PG-000", keywords: ["start", "start screen", "privacy", "lock", "lock workspace", "pin", "private workspace", "launch"], icon: Lock },
  { id: "mod-crew", name: "Crew Quarters", category: "module", path: "/", badge: "PG-038", keywords: ["home", "dashboard", "personal", "employee", "my work"], icon: LighthouseCottageIcon as any },
  { id: "mod-call", name: "Call Center", category: "module", path: "/call-center", badge: "PG-018", keywords: ["calls", "logs", "phone", "dialer", "voice", "caller id", "quo"], icon: Headset },
  { id: "mod-leads", name: "Lead Center", category: "module", path: "/leads", badge: "PG-003", keywords: ["leads", "prospects", "intake", "pipeline", "discovery call", "forms"], icon: TrendingUp },
  { id: "mod-calendar", name: "Calendar & Appointments", category: "module", path: "/calendar", badge: "PG-007", keywords: ["schedule", "appointments", "sessions", "coverage", "booking"], icon: Calendar },
  { id: "mod-students", name: "Students & Pipeline", category: "module", path: "/students", badge: "PG-004", keywords: ["students", "roster", "iep", "504", "cases", "files", "cabinet", "pipeline", "stages"], icon: GraduationCap },
  { id: "mod-contacts", name: "Contacts Directory", category: "module", path: "/contacts", badge: "PG-002", keywords: ["clients", "parents", "directory", "people", "directory", "families"], icon: Users },
  { id: "mod-agreements", name: "Agreements Engine", category: "module", path: "/agreements", badge: "PG-046", keywords: ["contracts", "signatures", "smart files", "agreements", "terms"], icon: FileSignature },
  { id: "mod-invoices", name: "Invoices & Billing", category: "module", path: "/invoices", badge: "PG-005", keywords: ["invoices", "payments", "receipts", "billing", "charges"], icon: Banknote },
  { id: "mod-payment-station", name: "Register", category: "module", path: "/payment-station", badge: "PG-050", keywords: ["register", "cash register", "payment station", "pos", "point of sale", "payments", "card by phone", "charge", "donation", "receipt", "stripe"], icon: CashRegisterIcon as any },
  { id: "mod-templates", name: "Templates", category: "module", path: "/templates", badge: "PG-011", keywords: ["templates", "forms", "letters", "documents", "email templates"], icon: LayoutTemplate },
  { id: "mod-automations", name: "Automations", category: "module", path: "/automations", badge: "PG-013", keywords: ["automations", "triggers", "actions", "workflows", "zapier", "webhooks"], icon: Zap },
  { id: "mod-workflows", name: "Workflow Designer", category: "module", path: "/workflows", badge: "PG-015", keywords: ["workflow designer", "workflows", "monorail", "workflow map", "guide steps", "stations", "traditional"], icon: GitBranch },
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
  const { openStartScreen, lockWorkspace } = useWorkspaceLock();
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

  const unreadMessageCount = crewStats?.unreadTotal || 0;
  const hasUnreadMessages = unreadMessageCount > 0;

  // Fetch authoritative backend staff access profile (`staff_access_profiles`) for current user
  const { data: myStaffAccess } = trpc.team.getMyStaffAccess.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: true,
  });

  // Match current user to employee record hydrated from backend `staff_access_profiles`
  const currentEmployee = useMemo(() => {
    const employees = getStoredEmployees();
    if (myStaffAccess && (myStaffAccess.isStaff || myStaffAccess.employeeId)) {
      const hydrated = hydrateEmployeesFromBackend(
        [myStaffAccess as BackendStaffAccessProfile],
        employees
      );
      if (hydrated.length > 0) {
        return hydrated[0];
      }
    }
    const uid = String(user?.id || "");
    if (uid === "user_3HEhAHIdXNwvbiK5NSR6RPkTInD") {
      return employees.find((e) => e.id === "emp-byron-honea-2") || employees.find((e) => e.id === "emp-byron-honea") || null;
    }
    if (
      uid === "user_3HamsO4oLoKLKOnDi9BR16e6RZW" ||
      uid === "user_test_byron"
    ) {
      return employees.find((e) => e.id === "emp-byron-honea") || null;
    }
    if (uid.startsWith("user_3HELy6EVi")) {
      return employees.find((e) => e.id === "emp-kyle-atkins") || null;
    }
    if (uid.startsWith("user_3KPhcRBro")) {
      return employees.find((e) => e.id === "emp-wyatt-smith") || null;
    }
    if (!user?.email) return null;
    return (
      employees.find(
        (e) => e.email.toLowerCase() === user.email?.toLowerCase()
      ) || null
    );
  }, [myStaffAccess, user?.id, user?.email]);

  const isVerifiedAdmin = useMemo(() => {
    if (currentEmployee?.status === "inactive" || user?.id === "katkins-admin-openid") {
      return false;
    }
    if (myStaffAccess) {
      return Boolean(myStaffAccess.hasAdminAccess && myStaffAccess.accountStatus === "active");
    }
    const uid = String(user?.id || "");
    if (
      uid === "user_3HamsO4oLoKLKOnDi9BR16e6RZW" ||
      uid === "user_3HEhAHIdXNwvbiK5NSR6RPkTInD" ||
      uid === "user_test_byron" ||
      uid.startsWith("user_3HELy6EVi")
    ) {
      return true;
    }
    if (
      currentEmployee?.isProtectedOwner ||
      currentEmployee?.hasAdminAccess ||
      currentEmployee?.primaryRole === "management" ||
      currentEmployee?.additionalRoles?.includes("management")
    ) {
      return true;
    }
    return false;
  }, [myStaffAccess, user?.id, currentEmployee]);

  const rawNavItems = useMemo(
    () => buildMasterNavItems(projectLabelPlural, projectIcon),
    [projectLabelPlural, projectIcon]
  );

  // Dynamically filter sidebar modules according to role permissions and employee overrides
  const navItems = useMemo(() => {
    if (currentEmployee?.status === "inactive" || user?.id === "katkins-admin-openid") {
      return [];
    }
    if (isVerifiedAdmin) {
      return rawNavItems;
    }
    if (!currentEmployee) {
      return [];
    }

    return rawNavItems.filter((item) => {
      const modDef = CRM_MODULES.find(
        (m) => m.path === item.path || (item.path !== "/" && m.path.startsWith(item.path))
      );
      if (!modDef) return true;
      const access = checkEmployeeModuleAccess(currentEmployee, modDef.id);
      return access !== "none";
    });
  }, [rawNavItems, currentEmployee, isVerifiedAdmin, user?.id]);
  const [location, setLocation] = useLocation();

  // Route security check: block direct URL access to modules without permission
  const currentForbiddenModule = useMemo(() => {
    if (currentEmployee?.status === "inactive" || user?.id === "katkins-admin-openid") {
      return CRM_MODULES[0];
    }
    if (isVerifiedAdmin) {
      return null;
    }
    const currentMod = CRM_MODULES.find(
      (m) => m.path === location || (m.path !== "/" && location.startsWith(m.path))
    );
    if (!currentMod) return null;
    if (!currentEmployee) return currentMod;
    const access = checkEmployeeModuleAccess(currentEmployee, currentMod.id);
    return access === "none" ? currentMod : null;
  }, [currentEmployee, isVerifiedAdmin, user?.id, location]);
  const { state, toggleSidebar, isMobile, setOpen, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [goToPageOpen, setGoToPageOpen] = useState(false);

  // Auto-collapse sidebar when entering State Complaint Workspace or IEP Comparator to maximize document canvas space
  const prevLocationRef = useRef<string>("");
  useEffect(() => {
    const isAutoCollapseDocWorkspace =
      location.startsWith("/state-complaint-builder") ||
      location.startsWith("/tools/state-complaint-builder") ||
      location.startsWith("/complaint") ||
      location.startsWith("/tools/iep-comparator");
    const wasAutoCollapseDocWorkspace =
      prevLocationRef.current.startsWith("/state-complaint-builder") ||
      prevLocationRef.current.startsWith("/tools/state-complaint-builder") ||
      prevLocationRef.current.startsWith("/complaint") ||
      prevLocationRef.current.startsWith("/tools/iep-comparator");

    if (isAutoCollapseDocWorkspace && !wasAutoCollapseDocWorkspace) {
      setOpen(false);
      if (isMobile) {
        setOpenMobile(false);
      }
    }
    prevLocationRef.current = location;
  }, [location, isMobile, setOpen, setOpenMobile]);

  // Listen for explicit sidebar collapse events across the system
  useEffect(() => {
    const handleCollapse = () => {
      setOpen(false);
      if (isMobile) {
        setOpenMobile(false);
      }
    };
    window.addEventListener("waypoint:collapse-sidebar", handleCollapse);
    return () => window.removeEventListener("waypoint:collapse-sidebar", handleCollapse);
  }, [isMobile, setOpen, setOpenMobile]);

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
    if (
      path.startsWith("/state-complaint-builder") ||
      path.startsWith("/tools/state-complaint-builder") ||
      path.startsWith("/complaint") ||
      path.startsWith("/tools/iep-comparator")
    ) {
      setOpen(false);
      if (isMobile) setOpenMobile(false);
    }
    setLocation(path);
    handleCloseSearch();
  };

  // Handler to open Crew Messages Workspace (PG-038-MSG)
  const handleOpenCrewMessages = () => {
    const isAlreadyOnCrewQuarters =
      location === "/" ||
      location === "/crew-quarters" ||
      location.startsWith("/crew-quarters") ||
      location === "/crew-messages";

    if (isAlreadyOnCrewQuarters) {
      window.dispatchEvent(
        new CustomEvent("waypoint:switch-crew-tab", { detail: { tab: "messages" } })
      );
      const params = new URLSearchParams(window.location.search);
      params.set("tab", "messages");
      const targetPath = location === "/" ? "/crew-quarters" : location;
      const newUrl = `${targetPath}?${params.toString()}`;
      window.history.pushState(null, "", newUrl);
      broadcastPageId({
        id: "PG-038-MSG",
        name: "Crew Messages Workspace",
        category: "Communications",
        description: "Internal team communication, direct messaging, and case collaboration",
      });
    } else {
      setLocation("/crew-quarters?tab=messages");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("waypoint:switch-crew-tab", { detail: { tab: "messages" } })
        );
      }, 60);
    }
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
          miniVideoRef.current.play().catch(() => { });
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
  const navSlotRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const navMenuRef = useRef<HTMLUListElement>(null);
  const monorailRef = useRef<HTMLLIElement>(null);
  const monorailAnimRef = useRef<Animation | null>(null);
  const pageContentRef = useRef<HTMLDivElement>(null);
  const pageFadeAnimRef = useRef<Animation | null>(null);
  const navTimerRef = useRef<number | null>(null);
  const prevRouteKeyRef = useRef<string | null>(null);
  const navItemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const navMetricsRef = useRef<{ pitch: number; visibleRows: number; totalRows: number; pad: number }>({
    pitch: 52,
    visibleRows: 12,
    totalRows: navItems.length,
    pad: 3,
  });
  const navWheelTargetRowRef = useRef<number>(0);
  const navWheelActiveUntilRef = useRef<number>(0);
  const navSnapTimerRef = useRef<number | null>(null);
  const [navViewportHeight, setNavViewportHeight] = useState<number | null>(null);
  const monorailInitializedRef = useRef(false);
  const monorailGeoRef = useRef<{ x: number; y: number; height: number; width: number }>({
    x: 0,
    y: 0,
    height: 46,
    width: 0,
  });
  const [optimisticNavId, setOptimisticNavId] = useState<string | null>(null);
  const activeMenuItem = navItems.find((item) => item.isActive(location));
  const routeNavId = activeMenuItem?.id ?? null;

  const normalizeRouteKey = (rawPath: string) => {
    const cleanPath = (rawPath.split("?")[0] || "/").replace(/\/+$/, "") || "/";
    if (cleanPath === "/" || cleanPath === "/crew-quarters" || cleanPath === "/crew-messages") {
      return "/crew-quarters";
    }
    return cleanPath;
  };

  // Normalize pathname so same-page aliases (/ and /crew-quarters) don't double-fade on tab switches
  const routeTransitionKey = useMemo(() => normalizeRouteKey(location), [location]);

  // Clear optimistic target as soon as the real route catches up
  useEffect(() => {
    setOptimisticNavId(null);
  }, [location]);

  // Clean up any pending fade-out navigation timer on unmount
  useEffect(() => {
    return () => {
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
      }
    };
  }, []);

  // Smooth GPU quickfade-in on EVERY page change (sidebar clicks, in-page links, Back/Forward, Go to Page)
  useLayoutEffect(() => {
    const el = pageContentRef.current;
    if (!el) return;

    if (prevRouteKeyRef.current === null) {
      prevRouteKeyRef.current = routeTransitionKey;
      el.style.opacity = "1";
      return;
    }

    if (prevRouteKeyRef.current === routeTransitionKey) return;
    prevRouteKeyRef.current = routeTransitionKey;

    if (pageFadeAnimRef.current) {
      pageFadeAnimRef.current.cancel();
      pageFadeAnimRef.current = null;
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    el.style.opacity = "1";
    if (!prefersReduced && typeof el.animate === "function") {
      const anim = el.animate(
        [
          { opacity: 0 },
          { opacity: 1 },
        ],
        {
          duration: 220,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "none",
        }
      );
      pageFadeAnimRef.current = anim;
      anim.onfinish = () => {
        if (pageFadeAnimRef.current === anim) pageFadeAnimRef.current = null;
      };
    }
  }, [routeTransitionKey]);

  const activeNavId = optimisticNavId ?? routeNavId;

  useLayoutEffect(() => {
    const syncMonorail = (instant = false) => {
      const menuEl = navMenuRef.current;
      const pillEl = monorailRef.current;
      const itemEl = activeNavId ? navItemRefs.current[activeNavId] : null;
      if (!menuEl || !pillEl) return;

      if (!itemEl || menuEl.offsetWidth === 0) {
        if (!itemEl) pillEl.style.opacity = "0";
        return;
      }

      const btnEl = (itemEl.querySelector("button") as HTMLElement | null) || itemEl;
      const targetX = itemEl.offsetLeft + btnEl.offsetLeft;
      const targetY = itemEl.offsetTop + btnEl.offsetTop;
      const targetW = btnEl.offsetWidth;
      const targetH = btnEl.offsetHeight;
      if (targetH === 0) return;

      pillEl.style.height = `${targetH}px`;
      pillEl.style.width = isCollapsed && targetW > 0 ? `${targetW}px` : "";
      pillEl.style.opacity = "1";

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      // Read the LIVE mid-flight GPU position if an animation is already running
      let fromX = monorailGeoRef.current.x;
      let fromY = monorailGeoRef.current.y;
      if (monorailAnimRef.current && monorailInitializedRef.current) {
        try {
          const matrix = new DOMMatrixReadOnly(getComputedStyle(pillEl).transform);
          fromX = matrix.m41;
          fromY = matrix.m42;
        } catch {
          // fallback to last recorded coordinates
        }
      }

      // Cancel any running Web Animation cleanly before committing new coordinates
      if (monorailAnimRef.current) {
        monorailAnimRef.current.cancel();
        monorailAnimRef.current = null;
      }

      const targetTransform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      const deltaY = Math.abs(targetY - fromY);
      const shouldAnimate =
        !instant &&
        !prefersReduced &&
        monorailInitializedRef.current &&
        deltaY > 1 &&
        typeof pillEl.animate === "function";

      monorailGeoRef.current = { x: targetX, y: targetY, height: targetH, width: targetW };
      pillEl.style.transform = targetTransform;

      if (shouldAnimate) {
        // Silky weighted monorail velocity: gentle smooth launch, liquid cruise, soft magnetic settle
        const duration = Math.round(Math.min(620, Math.max(440, 400 + deltaY * 0.54)));
        const anim = pillEl.animate(
          [
            { transform: `translate3d(${fromX}px, ${fromY}px, 0)` },
            { transform: targetTransform },
          ],
          {
            duration,
            easing: "cubic-bezier(0.36, 0.04, 0.2, 1)",
            fill: "none",
          }
        );
        monorailAnimRef.current = anim;
        anim.onfinish = () => {
          if (monorailAnimRef.current === anim) monorailAnimRef.current = null;
        };
      }

      monorailInitializedRef.current = true;
    };

    syncMonorail(false);

    const menuEl = navMenuRef.current;
    if (!menuEl || typeof ResizeObserver === "undefined") return;
    let prevWidth = menuEl.offsetWidth;
    const ro = new ResizeObserver(() => {
      const nextWidth = menuEl.offsetWidth;
      if (nextWidth > 0 && nextWidth !== prevWidth) {
        const wasHidden = prevWidth === 0;
        prevWidth = nextWidth;
        if (wasHidden) monorailInitializedRef.current = false;
        syncMonorail(true);
      }
    });
    ro.observe(menuEl);
    return () => ro.disconnect();
  }, [activeNavId, isCollapsed, navItems.length]);

  // Lock sidebar scroll viewport to an exact integer number of full items (zero half-cut items at top or bottom)
  const navItemsKey = navItems.map((item) => item.id).join("|");
  const navItemIdsRef = useRef<string[]>([]);
  navItemIdsRef.current = navItems.map((item) => item.id);

  useLayoutEffect(() => {
    const slotEl = navSlotRef.current;
    const scrollEl = navScrollRef.current;
    if (!slotEl || !scrollEl) return;

    const recalcViewport = () => {
      const ids = navItemIdsRef.current;
      const firstId = ids[0];
      const secondId = ids[1];
      const firstEl = firstId ? navItemRefs.current[firstId] : null;
      const secondEl = secondId ? navItemRefs.current[secondId] : null;

      const measuredItemH = firstEl ? Math.round(firstEl.getBoundingClientRect().height) : 0;
      const itemH = measuredItemH > 0 ? measuredItemH : isCollapsed ? 32 : 46;
      const measuredPitch =
        firstEl && secondEl ? Math.round(secondEl.offsetTop - firstEl.offsetTop) : 0;
      const pitch = measuredPitch >= itemH ? measuredPitch : itemH + 6;
      const gap = Math.max(0, pitch - itemH);
      const pad = gap / 2;

      const slotStyle = getComputedStyle(slotEl);
      const padTop = parseFloat(slotStyle.paddingTop) || 0;
      const padBottom = parseFloat(slotStyle.paddingBottom) || 0;
      const availH = Math.floor(slotEl.clientHeight - padTop - padBottom);
      if (availH <= 0 || pitch <= 0) return;

      const totalRows = ids.length;
      const visibleRows = Math.max(1, Math.min(totalRows, Math.floor(availH / pitch)));
      const snappedHeight = visibleRows * pitch;

      navMetricsRef.current = { pitch, visibleRows, totalRows, pad };
      scrollEl.style.setProperty("--adm-nav-pad", `${pad}px`);
      scrollEl.style.height = `${snappedHeight}px`;
      setNavViewportHeight((prev) => (prev === snappedHeight ? prev : snappedHeight));

      const maxRow = Math.max(0, totalRows - visibleRows);
      const snappedRow = Math.min(maxRow, Math.max(0, Math.round(scrollEl.scrollTop / pitch)));
      const snappedTop = snappedRow * pitch;
      if (Math.abs(scrollEl.scrollTop - snappedTop) > 0.5) {
        scrollEl.scrollTop = snappedTop;
      }
      navWheelTargetRowRef.current = snappedRow;
    };

    recalcViewport();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      recalcViewport();
    });
    ro.observe(slotEl);
    if (navMenuRef.current) ro.observe(navMenuRef.current);
    return () => ro.disconnect();
  }, [navItemsKey, isCollapsed]);

  // Clean row-by-row wheel stepping + scrollend/debounced snap guarantee for trackpad & scrollbar drags
  useEffect(() => {
    const scrollEl = navScrollRef.current;
    if (!scrollEl) return;

    const prefersReduced = () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const snapToNearestRow = () => {
      const { pitch, visibleRows, totalRows } = navMetricsRef.current;
      if (pitch <= 0 || totalRows <= visibleRows) return;
      const maxRow = Math.max(0, totalRows - visibleRows);
      const nearestRow = Math.min(maxRow, Math.max(0, Math.round(scrollEl.scrollTop / pitch)));
      const exactTop = nearestRow * pitch;
      navWheelTargetRowRef.current = nearestRow;
      if (Math.abs(scrollEl.scrollTop - exactTop) > 0.5) {
        scrollEl.scrollTo({
          top: exactTop,
          behavior: prefersReduced() ? "auto" : "smooth",
        });
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const { pitch, visibleRows, totalRows } = navMetricsRef.current;
      if (pitch <= 0 || totalRows <= visibleRows) return;
      if (e.ctrlKey || e.metaKey) return;

      // Discrete notched mouse wheel (lines/pages or standard ±100/±120 integer pixel ticks)
      const isDiscreteWheel =
        e.deltaMode !== 0 ||
        (e.deltaX === 0 && Math.abs(e.deltaY) >= 48 && Number.isInteger(e.deltaY));
      if (!isDiscreteWheel) return;

      e.preventDefault();

      const maxRow = Math.max(0, totalRows - visibleRows);
      const now = performance.now();
      const baseRow =
        now < navWheelActiveUntilRef.current
          ? navWheelTargetRowRef.current
          : Math.round(scrollEl.scrollTop / pitch);

      let stepRows = 0;
      if (e.deltaMode === 2) {
        stepRows = Math.sign(e.deltaY) * Math.max(1, visibleRows - 1);
      } else if (e.deltaMode === 1) {
        stepRows = Math.sign(e.deltaY) * Math.max(1, Math.round(Math.abs(e.deltaY) / 3));
      } else {
        stepRows = Math.sign(e.deltaY) * Math.max(1, Math.round(Math.abs(e.deltaY) / 100));
      }

      const nextRow = Math.min(maxRow, Math.max(0, baseRow + stepRows));
      navWheelTargetRowRef.current = nextRow;
      navWheelActiveUntilRef.current = now + 380;

      scrollEl.scrollTo({
        top: nextRow * pitch,
        behavior: prefersReduced() ? "auto" : "smooth",
      });
    };

    const supportsScrollEnd = typeof window !== "undefined" && "onscrollend" in window;
    const handleScrollFallback = () => {
      if (navSnapTimerRef.current !== null) {
        window.clearTimeout(navSnapTimerRef.current);
      }
      navSnapTimerRef.current = window.setTimeout(() => {
        navSnapTimerRef.current = null;
        if (performance.now() >= navWheelActiveUntilRef.current) {
          snapToNearestRow();
        }
      }, 160);
    };

    const handleScrollEnd = () => {
      if (navSnapTimerRef.current !== null) {
        window.clearTimeout(navSnapTimerRef.current);
        navSnapTimerRef.current = null;
      }
      snapToNearestRow();
    };

    scrollEl.addEventListener("wheel", handleWheel, { passive: false });
    if (supportsScrollEnd) {
      scrollEl.addEventListener("scrollend", handleScrollEnd);
    } else {
      scrollEl.addEventListener("scroll", handleScrollFallback, { passive: true });
    }

    return () => {
      scrollEl.removeEventListener("wheel", handleWheel);
      if (supportsScrollEnd) {
        scrollEl.removeEventListener("scrollend", handleScrollEnd);
      } else {
        scrollEl.removeEventListener("scroll", handleScrollFallback);
      }
      if (navSnapTimerRef.current !== null) {
        window.clearTimeout(navSnapTimerRef.current);
        navSnapTimerRef.current = null;
      }
    };
  }, []);

  // Ensure active route item scrolls cleanly into full integer-row view when navigated off-fold
  useEffect(() => {
    const scrollEl = navScrollRef.current;
    if (!scrollEl || !activeNavId) return;
    const activeIdx = navItemIdsRef.current.indexOf(activeNavId);
    if (activeIdx < 0) return;

    const { pitch, visibleRows, totalRows } = navMetricsRef.current;
    if (pitch <= 0 || totalRows <= visibleRows) return;

    const maxRow = Math.max(0, totalRows - visibleRows);
    const currentTopRow = Math.round(scrollEl.scrollTop / pitch);
    const currentBottomRow = currentTopRow + visibleRows - 1;

    let targetRow: number | null = null;
    if (activeIdx < currentTopRow) {
      targetRow = activeIdx;
    } else if (activeIdx > currentBottomRow) {
      targetRow = Math.min(maxRow, activeIdx - visibleRows + 1);
    }

    if (targetRow !== null) {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      navWheelTargetRowRef.current = targetRow;
      scrollEl.scrollTo({
        top: targetRow * pitch,
        behavior: prefersReduced ? "auto" : "smooth",
      });
    }
  }, [activeNavId, navViewportHeight, navItemsKey]);

  const handleNavItemSelect = (itemId: string, path: string) => {
    if (navTimerRef.current !== null) {
      window.clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }

    const targetRouteKey = normalizeRouteKey(path);
    const sameRoute = targetRouteKey === routeTransitionKey;

    // 1. Immediately start 120fps GPU compositor monorail glide on Frame 0
    if (itemId !== activeNavId) {
      setOptimisticNavId(itemId);
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const el = pageContentRef.current;

    if (sameRoute || prefersReduced || !el || typeof el.animate !== "function") {
      if (!sameRoute || location !== path) {
        startTransition(() => setLocation(path));
      }
      return;
    }

    // 2. Quick silky fade-out (~90ms) over the dark Admiralty canvas, then swap route & fade-in
    if (pageFadeAnimRef.current) {
      pageFadeAnimRef.current.cancel();
      pageFadeAnimRef.current = null;
    }
    const outAnim = el.animate(
      [
        { opacity: 1 },
        { opacity: 0 },
      ],
      {
        duration: 100,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards",
      }
    );
    pageFadeAnimRef.current = outAnim;

    navTimerRef.current = window.setTimeout(() => {
      navTimerRef.current = null;
      startTransition(() => {
        setLocation(path);
      });
      // Safety guard: guarantee page is never left hidden if navigation is prevented/redirected back
      window.setTimeout(() => {
        if (pageFadeAnimRef.current === outAnim) {
          outAnim.cancel();
          pageFadeAnimRef.current = null;
          el.style.opacity = "1";
        }
      }, 280);
    }, 85);
  };

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
      {/* Hidden Global SVG Shader Definitions: 3D Chiseled Solid-Brass Embossed Hardware Icons */}
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        className="fixed pointer-events-none opacity-0"
        style={{ position: "fixed", width: 0, height: 0 }}
      >
        <defs>
          {/* Vertical metallic brushed-gold gradient for sidebar icons (userSpaceOnUse preserves straight horizontal/vertical lines!) */}
          <linearGradient id="adm-brass-grad" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">
            <stop offset="0%" stopColor="#FFF7D6" />
            <stop offset="28%" stopColor="#F5D57E" />
            <stop offset="65%" stopColor="#CF9D42" />
            <stop offset="100%" stopColor="#8A601B" />
          </linearGradient>

          {/* Brighter gleaming champagne-gold gradient for active nav icon */}
          <linearGradient id="adm-brass-grad-active" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">
            <stop offset="0%" stopColor="#FFFDEC" />
            <stop offset="30%" stopColor="#FCE190" />
            <stop offset="68%" stopColor="#E1B14E" />
            <stop offset="100%" stopColor="#A67624" />
          </linearGradient>

          {/* 3D Embossed Bevel + Extruded Metallic Thickness + Deep Leather Cast Shadow */}
          <filter id="adm-brass-3d" x="-35%" y="-35%" width="170%" height="185%">
            {/* Soft dark ambient shadow onto navy leather */}
            <feDropShadow dx="0" dy="2.4" stdDeviation="1.6" floodColor="#000000" floodOpacity="0.92" result="castShadow" />
            {/* Tight extruded bronze bottom thickness edge (gives 3D physical metal depth) */}
            <feOffset in="SourceAlpha" dx="0" dy="1.05" result="extrudeOff" />
            <feFlood floodColor="#3A2406" floodOpacity="0.95" result="extrudeColor" />
            <feComposite in="extrudeColor" in2="extrudeOff" operator="in" result="extrudeLip" />
            {/* Specular bevel catchlight on upper-left ridge of every icon stroke */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.55" result="blurAlpha" />
            <feSpecularLighting
              in="blurAlpha"
              surfaceScale="2.6"
              specularConstant="1.15"
              specularExponent="22"
              lightingColor="#FFF8DC"
              result="specLight"
            >
              <feDistantLight azimuth="238" elevation="56" />
            </feSpecularLighting>
            <feComposite in="specLight" in2="SourceAlpha" operator="in" result="specClipped" />
            <feMerge>
              <feMergeNode in="castShadow" />
              <feMergeNode in="extrudeLip" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="specClipped" />
            </feMerge>
          </filter>

          {/* Active Icon: 3D Embossed Bevel + Extruded Lip + Warm Golden Radial Aura */}
          <filter id="adm-brass-3d-active" x="-55%" y="-55%" width="210%" height="210%">
            {/* Warm golden halo radiating over the dark leather pill */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="haloBlur" />
            <feFlood floodColor="#F6C15A" floodOpacity="0.62" result="haloColor" />
            <feComposite in="haloColor" in2="haloBlur" operator="in" result="warmHalo" />
            {/* Deep grounded drop shadow */}
            <feDropShadow dx="0" dy="2.4" stdDeviation="1.6" floodColor="#000000" floodOpacity="0.92" result="castShadow" />
            {/* Tight extruded bronze bottom thickness edge */}
            <feOffset in="SourceAlpha" dx="0" dy="1.1" result="extrudeOff" />
            <feFlood floodColor="#462B07" floodOpacity="0.96" result="extrudeColor" />
            <feComposite in="extrudeColor" in2="extrudeOff" operator="in" result="extrudeLip" />
            {/* Razor specular bevel highlight along upper ridge */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.55" result="blurAlpha" />
            <feSpecularLighting
              in="blurAlpha"
              surfaceScale="2.8"
              specularConstant="1.35"
              specularExponent="20"
              lightingColor="#FFFCE8"
              result="specLight"
            >
              <feDistantLight azimuth="238" elevation="58" />
            </feSpecularLighting>
            <feComposite in="specLight" in2="SourceAlpha" operator="in" result="specClipped" />
            <feMerge>
              <feMergeNode in="warmHalo" />
              <feMergeNode in="castShadow" />
              <feMergeNode in="extrudeLip" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="specClipped" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 transition-all duration-200 ease-in-out"
          disableTransition={isResizing}
        >
          {/* ── Header: Gleaming Champagne-Brass Top Bezel + 3D Moon Medallion + Collapse Button + Logo & Wordmark ── */}
          <SidebarHeader className="px-4 pt-4 pb-3 bg-transparent border-b-0 gap-0 relative z-40 overflow-visible">
            {/* Top gleaming champagne-brass specular rail with center flare */}
            <div aria-hidden="true" className="adm-sidebar-top-bezel" />

            {!isCollapsed ? (
              <div className="relative w-full flex flex-col items-center justify-center pt-1 pb-0">
                {/* Circle Light/Dark Mode Medallion at top left */}
                <button
                  onClick={toggleTheme}
                  className={`absolute top-0 left-0 w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-all duration-[300ms] ease-in-out cursor-pointer z-20 ${isLight
                    ? "border border-amber-500/50 bg-white text-slate-700 hover:bg-slate-50 hover:border-amber-500 shadow-md"
                    : "adm-moon-medallion text-[#f5d888] hover:brightness-115"
                    }`}
                  title={isLight ? "Switch to dark mode" : "Switch to light mode"}
                  aria-label="Toggle theme"
                >
                  {/* Sun Icon (rises and rotates in light mode) */}
                  <Sun
                    className={`absolute h-4 w-4 text-amber-500 transition-all duration-[300ms] ease-in-out transform ${isLight
                      ? "translate-y-0 rotate-0 scale-100 opacity-100"
                      : "translate-y-6 -rotate-90 scale-50 opacity-0"
                      }`}
                  />
                  {/* Moon Icon (sets and rotates in dark mode) */}
                  <Moon
                    strokeWidth={2.15}
                    className={`adm-brass-icon absolute h-[18px] w-[18px] fill-[#f5d88a]/25 transition-all duration-[300ms] ease-in-out transform ${!isLight
                      ? "translate-y-0 rotate-0 scale-100 opacity-100"
                      : "-translate-y-6 rotate-90 scale-50 opacity-0"
                      }`}
                  />
                </button>

                {/* Collapse button at top right */}
                <button
                  onClick={toggleSidebar}
                  className="adm-sidebar-util-btn absolute top-0.5 right-0 h-7 w-7 flex items-center justify-center rounded-[7px] transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] text-[#dce5f2] hover:text-[#fff3cc] cursor-pointer z-20"
                  title="Close sidebar"
                  aria-label="Close sidebar"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>

                {/* Waypoint Advocates Logo & Wordmark */}
                <div className="flex flex-col items-center gap-1.5 w-full pt-2">
                  <img
                    src={logoData?.logoUrl || LOGO_URL}
                    alt="Waypoint Advocates"
                    className="h-[88px] w-[88px] object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.88)]"
                  />
                  <div className="flex flex-col items-center leading-none w-full">
                    <span className="font-serif tracking-[0.26em] text-[#FAF5E8] text-[18px] leading-none font-bold uppercase select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] pl-1">
                      WAYPOINT
                    </span>

                    {/* Centered ADVOCATES Text with Hairline Rules — directly under WAYPOINT */}
                    <div className="flex items-center justify-center gap-2.5 select-none leading-none mt-[1px]">
                      <span aria-hidden="true" className="h-[1px] w-7 bg-gradient-to-r from-transparent to-[#d8c49a]/80" />
                      <span className="tracking-[0.28em] text-[#D2DCEF] text-[9.5px] leading-none font-semibold uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)] pl-0.5">
                        ADVOCATES
                      </span>
                      <span aria-hidden="true" className="h-[1px] w-7 bg-gradient-to-l from-transparent to-[#d8c49a]/80" />
                    </div>

                    {/* Quick Search & Crew Messages Icon Row (below the ADVOCATES line) + Expanding Search Bar */}
                    <div ref={searchContainerRef} className="relative w-full flex items-center justify-between min-h-[26px] mt-1.5">
                      {/* Normal State: Quick Search (left) & Crew Messages (right) below ADVOCATES */}
                      <div
                        className={cn(
                          "w-full flex items-center justify-between transition-all duration-200",
                          isSearchOpen ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
                        )}
                      >
                        {/* Magnifying Glass Icon Button (left, aligned under moon icon) */}
                        <button
                          type="button"
                          onClick={handleOpenSearch}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[#9db4d2]/75 hover:text-[#F8D279] hover:bg-white/[0.07] transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] group"
                          aria-label="Search students, clients, modules, tools"
                        >
                          <Search className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                        </button>

                        {/* Messages Icon Button (right, aligned under collapse button) */}
                        <button
                          type="button"
                          onClick={handleOpenCrewMessages}
                          className="relative w-6 h-6 rounded-full flex items-center justify-center text-[#9bb0cf]/75 hover:text-[#F8D279] hover:bg-white/[0.07] transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] group"
                          aria-label="Crew Messages Workspace (PG-038-MSG)"
                          title={hasUnreadMessages ? `${unreadMessageCount} new message${unreadMessageCount > 1 ? "s" : ""} — click to open Crew Messages Workspace` : "Crew Messages Workspace (PG-038-MSG)"}
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
                  className={`relative w-7 h-7 rounded-full border flex items-center justify-center overflow-hidden transition-all duration-[300ms] ease-in-out cursor-pointer shadow-md ${isLight
                    ? "border-amber-500/50 bg-white text-slate-700 hover:bg-slate-50 hover:border-amber-500"
                    : "border-[#F5B544]/70 hover:border-[#F5B544] bg-[#07152B] hover:bg-[#0C1F3D] text-[#F5B544] shadow-amber-500/10"
                    }`}
                  title={isLight ? "Switch to dark mode" : "Switch to light mode"}
                  aria-label="Toggle theme"
                >
                  <Sun
                    className={`absolute h-3.5 w-3.5 text-amber-500 transition-all duration-[300ms] ease-in-out transform ${isLight
                      ? "translate-y-0 rotate-0 scale-100 opacity-100"
                      : "translate-y-6 -rotate-90 scale-50 opacity-0"
                      }`}
                  />
                  <Moon
                    className={`absolute h-3.5 w-3.5 text-amber-300 transition-all duration-[300ms] ease-in-out transform ${!isLight
                      ? "translate-y-0 rotate-0 scale-100 opacity-100"
                      : "-translate-y-6 rotate-90 scale-50 opacity-0"
                      }`}
                  />
                </button>
              </div>
            )}

            {/* Even horizontal debossed leather crease centered between Search/Messages row and Home */}
            <div aria-hidden="true" className="adm-sidebar-leather-crease" />
          </SidebarHeader>

          {/* ── Nav items: Row-Locked Scroll Viewport + Smooth Monorail Sliding Leather-and-Brass Switch ── */}
          <SidebarContent
            ref={navSlotRef}
            className="bg-transparent px-0 pt-[9px] pb-[9px] overflow-hidden flex flex-col justify-start"
          >
            <div
              ref={navScrollRef}
              data-testid="sidebar-nav-scroll"
              className="adm-sidebar-nav-scroll w-full px-3.5 shrink-0"
              style={navViewportHeight !== null ? { height: `${navViewportHeight}px` } : undefined}
            >
              <SidebarMenu ref={navMenuRef} className="relative gap-[6px] py-[3px]">
                {/* Floating Sculpted 3D Monorail Slider Carriage (120fps Web Animations API GPU glide) */}
                <li
                  ref={monorailRef}
                  aria-hidden="true"
                  data-testid="sidebar-monorail-pill"
                  className="adm-nav-active adm-nav-monorail list-none"
                />

                {navItems.map((item) => {
                  const isActive = activeNavId === item.id;
                  const IconComponent = item.icon;
                  const isHomeIcon = item.id === "home";
                  const isCustomBrassIcon = isHomeIcon || item.id === "payment-station";
                  return (
                    <SidebarMenuItem
                      key={item.id}
                      ref={(el) => {
                        navItemRefs.current[item.id] = el;
                      }}
                      className="adm-sidebar-nav-item relative z-10"
                    >
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => handleNavItemSelect(item.id, item.path)}
                        tooltip={item.label}
                        className={cn(
                          "h-[46px] w-full px-3.5 rounded-[13px] text-[14.5px] cursor-pointer transition-colors duration-250 flex items-center gap-3.5 select-none [&>svg]:!size-[22px] border border-transparent",
                          isCustomBrassIcon && "[&>svg]:!size-[24px]",
                          isActive
                            ? "!bg-transparent hover:!bg-transparent active:!bg-transparent text-[#FAF7EE] font-semibold"
                            : "bg-transparent text-[#E1E9F6] hover:text-[#FFF8E6] hover:bg-white/[0.045] hover:border-[#d4bc88]/25 font-normal"
                        )}
                      >
                        {IconComponent && (
                          <IconComponent
                            className={cn(
                              "shrink-0",
                              isCustomBrassIcon && "adm-brass-icon-home",
                              isActive ? "adm-brass-icon-active" : "adm-brass-icon"
                            )}
                          />
                        )}
                        <span className="truncate tracking-[0.015em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>
          </SidebarContent>

          {/* ── Footer: Full-Width Gleaming Gold Rail (Matches Top Rail) + Sculpted Hardware Tiles ── */}
          <SidebarFooter className="relative bg-transparent border-t-0 px-2.5 pt-3 pb-3">
            <div aria-hidden="true" className="adm-sidebar-footer-rule" />
            <div className="flex items-center gap-1.5 w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="adm-sidebar-util-btn flex items-center h-8 rounded-[9px] flex-1 text-left overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] cursor-pointer group">
                    {/* Left Star compartment */}
                    <div className="h-full px-2 flex items-center justify-center border-r border-[#d4bc88]/25 bg-[#050d1a]/55 group-hover:bg-[#0a1930]/80 transition-colors shrink-0">
                      <Star strokeWidth={2.1} className="adm-brass-icon h-4 w-4 fill-[#E8C678]/15 shrink-0" />
                    </div>

                    {/* Employee Name & Up/Down Chevron */}
                    <div className="flex-1 flex items-center justify-between px-1.5 min-w-0 relative group-data-[collapsible=icon]:hidden">
                      <div className="flex items-center gap-1 min-w-0 py-0.5">
                        <span className="text-[11.5px] font-serif font-semibold text-[#F8F3E6] tracking-wide truncate group-hover:text-white transition-colors">
                          {user?.name || currentEmployee?.name || "Byron Honea"}
                        </span>
                      </div>
                      <ChevronsUpDown className="h-3 w-3 text-[#CBB582] group-hover:text-[#FFF0BE] shrink-0 ml-0.5 transition-colors" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#081934] border border-[#c8a055]/45 text-white shadow-2xl backdrop-blur-md">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-semibold text-white truncate">
                      {user?.name || currentEmployee?.name || "Byron Honea"}
                    </p>
                    <p className="text-[11px] text-blue-200/70 truncate mt-0.5">
                      {user?.email || "Advocate"}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => openStartScreen()}
                    className="cursor-pointer text-xs focus:bg-white/10"
                  >
                    <Sparkles className="mr-2 h-3.5 w-3.5 text-amber-400" />
                    <span>Start Screen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      openStartScreen();
                      void lockWorkspace();
                    }}
                    className="cursor-pointer text-xs focus:bg-white/10"
                  >
                    <Lock className="mr-2 h-3.5 w-3.5 text-amber-400" />
                    <span>Lock Workspace</span>
                  </DropdownMenuItem>
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
                onClick={() => openStartScreen()}
                title="Open Waypoint Start Screen"
                data-testid="sidebar-start-screen-btn"
                className="adm-sidebar-util-btn h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0 group-data-[collapsible=icon]:hidden focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                <Lock strokeWidth={2.1} className="adm-brass-icon h-4 w-4" />
              </button>

              <button
                onClick={() => setIssueReporterOpen(true)}
                title="Report Issue / Linear Backlog (⌥+F)"
                className="adm-sidebar-util-btn h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0 group-data-[collapsible=icon]:hidden focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                <Bug strokeWidth={2.1} className="adm-brass-icon h-4 w-4" />
              </button>

              <button
                onClick={() => setGoToPageOpen(true)}
                title="Go to Page"
                className="adm-sidebar-util-btn h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0 group-data-[collapsible=icon]:hidden focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                <Compass strokeWidth={2.1} className="adm-brass-icon h-4 w-4" />
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

      <SidebarInset className={cn(
        !isLight && "bg-[#040d1d]",
        (
          location.startsWith("/meeting-workspace") ||
          location === "/leads" || location.startsWith("/leads") ||
          location === "/advocacy-pipeline" || location.startsWith("/advocacy-pipeline") ||
          location === "/pipeline" || location.startsWith("/pipeline") ||
          location === "/templates" || location.startsWith("/templates") ||
          location === "/tools" || (location.startsWith("/tools") && !location.startsWith("/tools/state-complaint-builder")) ||
          location === "/automations" || location.startsWith("/automations") || location.startsWith("/waypoint-ai") ||
          location === "/workflows" || location.startsWith("/workflows") ||
          location === "/metrics" || location.startsWith("/metrics") || location === "/company/metrics" || location.startsWith("/company/metrics") ||
          location === "/settings" || location.startsWith("/settings") ||
          location === "/messages" || location.startsWith("/messages") ||
          location === "/archive" || location.startsWith("/archive/") ||
          location === "/do-not-serve" || location.startsWith("/do-not-serve/") ||
          location === "/bill-guardian" || location.startsWith("/bill-guardian") ||
          location === "/payment-station" || location.startsWith("/payment-station") || location === "/payments" || location === "/pos"
        ) && "bg-[#000820]",
        (location === "/tools/waypoint-places" || location.startsWith("/tools/waypoint-places/") || location === "/waypoint-places" || location.startsWith("/waypoint-places/") || location === "/workflows" || location.startsWith("/workflows")) && "h-svh max-h-svh min-h-0 overflow-hidden"
      )}>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground">{activeMenuItem?.label ?? "Menu"}</span>
            </div>
          </div>
        )}
        <div
          ref={pageContentRef}
          data-testid="page-transition-stage"
          className={cn(
            "flex-1 min-w-0 p-4 relative will-change-[opacity]",
            (location.startsWith("/meeting-workspace") || location === "/students" || location === "/projects") && "p-0 bg-[#020712]",
            (location.startsWith("/students/") || location.startsWith("/contacts/") || location.startsWith("/project-workspace/")) && "p-0 overflow-hidden",
            (location === "/tools/waypoint-places" || location.startsWith("/tools/waypoint-places/") || location === "/waypoint-places" || location.startsWith("/waypoint-places/")) && "p-0 bg-[#000820] flex flex-col min-h-0 h-full overflow-hidden",
            (location === "/studio" || location.startsWith("/studio/") || location === "/tools/studio") && "p-0 bg-[#000820] flex flex-col min-h-0 h-full overflow-hidden",
            location === "/contacts" && "p-0 bg-[#07152B]",
            (location === "/giving" || location.startsWith("/giving")) && "p-0 bg-[#07162B]",
            (location === "/agreements" || location.startsWith("/agreements") || location === "/contracts" || location.startsWith("/smart-files")) && "p-0 bg-[#07162B]",
            (location.startsWith("/state-complaint-builder") || location.startsWith("/tools/state-complaint-builder")) && "p-0 bg-[#030D1A]",
            (location.startsWith("/call-center") || location.startsWith("/call-logs")) && "p-0 bg-[#07162B]",
            (location === "/calendar" || location.startsWith("/calendar") || location === "/appointments" || location.startsWith("/appointments")) && "p-0 bg-[#07162B]",
            (location === "/" || location.startsWith("/crew-quarters")) && "p-0 bg-[#040d1d]",
            (location === "/knowledge-base" || location.startsWith("/knowledge-base") || location === "/walkthroughs" || location.startsWith("/walkthroughs")) && "p-0 bg-[#07162B]",
            (location === "/leads" || location.startsWith("/leads") || location === "/lead-forms" || location.startsWith("/lead-forms")) && "p-0 bg-[#000820]",
            (location === "/advocacy-pipeline" || location.startsWith("/advocacy-pipeline") || location === "/pipeline" || location.startsWith("/pipeline")) && "p-0 bg-[#000820]",
            (location === "/templates" || location.startsWith("/templates")) && "p-0 bg-[#000820]",
            (location === "/tools" || (location.startsWith("/tools") && !location.startsWith("/tools/state-complaint-builder"))) && "p-0 bg-[#000820]",
            (location === "/automations" || location.startsWith("/automations") || location.startsWith("/waypoint-ai")) && "p-0 bg-[#000820]",
            (location === "/workflows" || location.startsWith("/workflows")) && "p-0 bg-[#000820] flex flex-col min-h-0 h-full overflow-hidden",
            (location === "/metrics" || location.startsWith("/metrics") || location === "/company/metrics" || location.startsWith("/company/metrics")) && "p-0 bg-[#000820]",
            (location === "/settings" || location.startsWith("/settings")) && "p-0 bg-[#000820]",
            (location === "/messages" || location.startsWith("/messages")) && "p-0 bg-[#000820]",
            (location === "/archive" || location.startsWith("/archive/") || location === "/do-not-serve" || location.startsWith("/do-not-serve/")) && "p-0 bg-[#000820]",
            (location === "/payment-station" || location.startsWith("/payment-station") || location === "/payments" || location === "/pos") && "p-0 bg-[#000820]",
            (location === "/bill-guardian" || location.startsWith("/bill-guardian")) && "p-0 bg-[#07162B]"
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


        </div>
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
  { id: "PG-000", name: "Start Screen & Privacy Lock", path: "/start" },
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
  { id: "PG-024-IMP", name: "Client CRM Import (Settings)", path: "/settings/import" },
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
  { id: "PG-043-ASM", name: "Meeting Workspace → 1. Assemble", path: "/meeting-workspace?tab=assemble" },
  { id: "PG-043-BLP", name: "Meeting Workspace → 2. Blueprint", path: "/meeting-workspace?tab=blueprint" },
  { id: "PG-043-MTG", name: "Meeting Workspace → 3. Meeting Space", path: "/meeting-workspace?tab=meeting-space" },
  { id: "PG-044", name: "Post-Meeting Review", path: "/post-meeting-review" },
  { id: "PG-046", name: "Agreements Engine", path: "/agreements" },
  { id: "PG-047", name: "Payment Receipt Experience", path: "/settings?section=receipts" },
  { id: "PG-050", name: "Register (POS)", path: "/payment-station" },
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

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
import { AIAssistant } from "@/components/AIAssistant";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, Banknote, LogOut, PanelLeft, Users, GraduationCap, Briefcase, FileText, Calendar, CalendarClock, TrendingUp, ScrollText, Settings, Compass, FolderOpen, BookOpen, Star, Heart, Target, ClipboardList, Layers, CheckSquare, Sun, Moon, Wrench, LayoutTemplate, Zap, Plug, GitBranch, ListChecks, Phone, UserCheck, Brain, Sparkles, LayoutGrid, type LucideIcon } from "lucide-react";
import { useTerminology, type ProjectIconKey } from "@/contexts/TerminologyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, useEffect, useRef, useState } from "react";
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
import ScopedErrorBoundary from "./ScopedErrorBoundary";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

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

function buildMenuItems(projectLabel: string, projectIcon: LucideIcon) {
  return [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Users, label: "Contacts", path: "/contacts" },
    { icon: TrendingUp, label: "Leads", path: "/leads" },
    { icon: projectIcon, label: projectLabel + "s", path: "/projects" },
    { icon: FileText, label: "Invoices", path: "/invoices" },
    { icon: ScrollText, label: "Contracts", path: "/contracts" },
    { icon: LayoutTemplate, label: "Smart Files", path: "/smart-files" },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
    { icon: CalendarClock, label: "Scheduler", path: "/scheduler" },
    { icon: CheckSquare, label: "Tasks", path: "/tasks" },
    { icon: Layers, label: "Tech Tasks", path: "/tech-tasks" },
    { icon: Wrench, label: "Tools", path: "/tools" },
    { icon: LayoutTemplate, label: "Templates", path: "/templates" },
    { icon: ClipboardList, label: "Lead Forms", path: "/lead-forms" },
    { icon: GitBranch, label: "Workflows", path: "/workflows" },
    { icon: BookOpen, label: "Knowledge Base", path: "/knowledge-base" },
    { icon: ListChecks, label: "Walkthroughs (SOP)", path: "/walkthroughs" },
    { icon: Phone, label: "Call Logs (Quo)", path: "/call-logs" },
    { icon: UserCheck, label: "Team", path: "/team" },
    { icon: Brain, label: "BrainDump", path: "/brain-dump" },
    { icon: Sparkles, label: "AI Connections", path: "/ai-connections" },
    { icon: Briefcase, label: "Services", path: "/services" },
    { icon: Heart, label: "Sponsors", path: "/sponsors" },
    { icon: Banknote, label: "Bill Guardian", path: "/bill-guardian" },
    { icon: Zap, label: "Automations", path: "/automations" },
    { icon: Plug, label: "Integrations", path: "/integrations" },
    { icon: Compass, label: "Client Portal", path: "/portal-management" },
    { icon: LayoutGrid, label: "Workspace", path: "/workspace" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

// Compass rose SVG watermark
function CompassRose({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Main cardinal points */}
      <polygon points="60,8 55,55 60,50 65,55" fill="currentColor" opacity="0.6" />
      <polygon points="60,112 55,65 60,70 65,65" fill="currentColor" opacity="0.6" />
      <polygon points="8,60 55,55 50,60 55,65" fill="currentColor" opacity="0.6" />
      <polygon points="112,60 65,55 70,60 65,65" fill="currentColor" opacity="0.6" />
      {/* Ordinal points */}
      <polygon points="22,22 52,55 57,50" fill="currentColor" opacity="0.35" />
      <polygon points="98,22 68,55 63,50" fill="currentColor" opacity="0.35" />
      <polygon points="22,98 52,65 57,70" fill="currentColor" opacity="0.35" />
      <polygon points="98,98 68,65 63,70" fill="currentColor" opacity="0.35" />
      {/* Center ring */}
      <circle cx="60" cy="60" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="60" cy="60" r="3" fill="currentColor" opacity="0.5" />
      {/* Outer ring */}
      <circle cx="60" cy="60" r="48" stroke="currentColor" strokeWidth="0.75" opacity="0.2" />
      <circle cx="60" cy="60" r="38" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.2" />
      {/* N label */}
      <text x="57" y="6" fontSize="7" fill="currentColor" opacity="0.5" fontFamily="serif" fontWeight="bold">N</text>
    </svg>
  );
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

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: logoData } = trpc.system.getCompanyLogo.useQuery();
  const { projectLabel, projectIconKey } = useTerminology();
  const projectIcon = ICON_MAP[projectIconKey] ?? GraduationCap;
  const menuItems = buildMenuItems(projectLabel, projectIcon);
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [goToPageOpen, setGoToPageOpen] = useState(false);

  // Developer Rules state & queries
  const [isDevRulesOpen, setIsDevRulesOpen] = useState(false);
  const [devRuleText, setDevRuleText] = useState("");

  const pageKey = "crm:path:" + (location === "/" ? "dashboard" : location.replace(/^\//, "").replaceAll("/", ":"));

  const { data: devRules = [], refetch: refetchDevRules } = trpc.portal.getDevRules.useQuery();

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
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

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
          className="border-r-0"
          disableTransition={isResizing}
          style={{ "--sidebar-background": "#071422" } as CSSProperties}
        >
          {/* ── Header: toggle + logo ── */}
          <SidebarHeader className="px-3 pt-4 pb-3 bg-[#071422]">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-white/60" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={logoData?.logoUrl || LOGO_URL}
                    alt="Waypoint Advocates"
                    className="h-9 w-9 object-contain shrink-0"
                  />
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-sm font-bold tracking-widest text-white uppercase truncate">Waypoint</span>
                    <span className="text-[10px] tracking-[0.2em] text-white/50 uppercase truncate">Advocates</span>
                  </div>
                </div>
              )}
              {isCollapsed && (
                <img
                  src={logoData?.logoUrl || LOGO_URL}
                  alt="Waypoint Advocates"
                  className="h-8 w-8 object-contain mx-auto"
                />
              )}
            </div>
          </SidebarHeader>

          {/* ── Nav items ── */}
          <SidebarContent className="gap-0 bg-[#071422] px-2 py-1">
            <div className="rounded-xl bg-[#0d1f33] border border-white/5 py-1.5 px-1 shadow-inner">
            <SidebarMenu className="">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-9 transition-all font-normal rounded-lg
                        ${isActive
                          ? "border border-amber-400/70 text-amber-300 bg-amber-400/10 hover:bg-amber-400/15 hover:text-amber-300"
                          : "text-white/75 hover:text-white hover:bg-white/8 border border-transparent"
                        }`}
                    >
                      {item.icon && (
                        <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-400" : "text-white/50"}`} />
                      )}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            </div>
          </SidebarContent>

          {/* ── Footer: controls ── */}
          <SidebarFooter className="bg-[#071422] p-3 space-y-2">
            {/* Quick Setup */}
            <button
              onClick={() => setQuickSetupOpen(true)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-amber-500 hover:bg-amber-400 transition-all w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 shadow-sm group-data-[collapsible=icon]:justify-center"
              title="Quick Client Setup"
            >
              <Zap className="h-4 w-4 text-[#0d1b2a] shrink-0" />
              <span className="text-sm font-bold text-[#0d1b2a] group-data-[collapsible=icon]:hidden">
                Quick Setup
              </span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'navy' ? 'Switch to Light mode' : 'Switch to Navy mode'}
              className="flex items-center justify-center gap-2 w-full rounded-lg p-2 hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 text-white/50 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:mx-auto"
              aria-label="Toggle theme"
            >
              {theme === 'navy'
                ? <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                : <Moon className="h-4 w-4 text-indigo-300 shrink-0" />}
              <span className="text-xs font-medium group-data-[collapsible=icon]:hidden text-white/60">
                {theme === 'navy' ? 'Light mode' : 'Dark mode'}
              </span>
            </button>

            {/* User profile with Go to Page button */}
            <div className="flex items-center justify-between gap-1.5 w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-white/10 transition-colors flex-1 text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 min-w-0">
                    <Avatar className="h-8 w-8 border border-amber-400/30 shrink-0">
                      <AvatarFallback className="text-xs font-semibold bg-amber-500/20 text-amber-300">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                      <p className="text-sm font-medium truncate leading-none text-white/90">
                        {user?.name || "-"}
                      </p>
                      <p className="text-xs text-white/40 truncate mt-1">
                        {user?.email || "-"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => setGoToPageOpen(true)}
                title="Go to Page"
                className="h-8 w-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-white/50 hover:text-white shrink-0 group-data-[collapsible=icon]:hidden focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <Compass className="h-4.5 w-4.5 text-amber-400" />
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

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground">{activeMenuItem?.label ?? "Menu"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 relative">
          <ScopedErrorBoundary moduleName={activeMenuItem?.label ?? "Page"}>
            {children}
          </ScopedErrorBoundary>

          {/* Golden Developer Guidelines Floating Button */}
          <div className="absolute top-4 right-4 z-20">
            <Button
              onClick={() => {
                const rule = devRules.find((r: any) => r.tabKey === pageKey);
                setDevRuleText(rule?.content || "");
                setIsDevRulesOpen(true);
              }}
              className="h-8 px-2.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-lg text-xs font-bold gap-1 shadow-lg shadow-amber-500/5 transition-all"
              title="Developer Guidelines & Page Rules"
            >
              <BookOpen className="w-3.5 h-3.5" /> Dev Info
            </Button>
          </div>
        </main>
      </SidebarInset>

      <AIAssistant />
      <QuickSetupModal open={quickSetupOpen} onClose={() => setQuickSetupOpen(false)} />
      <GoToPageModal open={goToPageOpen} onClose={() => setGoToPageOpen(false)} />

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
  { id: "PG-001", name: "Dashboard", path: "/" },
  { id: "PG-002", name: "Contacts", path: "/contacts" },
  { id: "PG-003", name: "Leads", path: "/leads" },
  { id: "PG-004", name: "Students", path: "/projects" },
  { id: "PG-005", name: "Invoices", path: "/invoices" },
  { id: "PG-006", name: "Contracts", path: "/contracts" },
  { id: "PG-007", name: "Appointments / Calendar", path: "/calendar" },
  { id: "PG-008", name: "Scheduler", path: "/scheduler" },
  { id: "PG-009", name: "Tasks", path: "/tasks" },
  { id: "PG-010", name: "Tools", path: "/tools" },
  { id: "PG-011", name: "Templates", path: "/templates" },
  { id: "PG-012", name: "Lead Forms", path: "/lead-forms" },
  { id: "PG-013", name: "Automations", path: "/automations" },
  { id: "PG-014", name: "Integrations", path: "/integrations" },
  { id: "PG-015", name: "Workflows", path: "/workflows" },
  { id: "PG-016", name: "Knowledge Base", path: "/knowledge-base" },
  { id: "PG-017", name: "Walkthroughs", path: "/walkthroughs" },
  { id: "PG-018", name: "Call Logs", path: "/call-logs" },
  { id: "PG-019", name: "Team", path: "/team" },
  { id: "PG-020", name: "State Complaint Builder", path: "/state-complaint-builder" },
  { id: "PG-021", name: "Brain Dump", path: "/brain-dump" },
  { id: "PG-022", name: "Bill Guardian", path: "/bill-guardian" },
  { id: "PG-023", name: "Client Portal", path: "/client-portal" },
  { id: "PG-024", name: "Settings", path: "/settings" },
  { id: "PG-025", name: "Case Compass", path: "/case-compass" },
  { id: "PG-026", name: "Page ID Showcase", path: "/page-id-showcase" },
  { id: "PG-027", name: "Portal Management", path: "/portal-management" },
  { id: "PG-028", name: "Intake Form", path: "/intake" },
  { id: "PG-029", name: "Booking", path: "/book" },
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

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
import { LayoutDashboard, Banknote, LogOut, PanelLeft, Users, GraduationCap, Briefcase, FileText, Calendar, CalendarClock, TrendingUp, ScrollText, Settings, Compass, FolderOpen, BookOpen, Star, Heart, Target, ClipboardList, Layers, CheckSquare, Sun, Moon, Wrench, LayoutTemplate, Zap, Plug, GitBranch, ListChecks, Phone, UserCheck, Brain, Sparkles, type LucideIcon } from "lucide-react";
import { useTerminology, type ProjectIconKey } from "@/contexts/TerminologyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import PageIdBadge from './PageIdBadge';
import QuickSetupModal from './QuickSetupModal';

const LOGO_URL = "/manus-storage/waypoint-logo_92199447.png";

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
    { icon: Banknote, label: "Bill Guardian", path: "/bill-guardian" },
    { icon: Zap, label: "Automations", path: "/automations" },
    { icon: Plug, label: "Integrations", path: "/integrations" },
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
  const { projectLabel, projectIconKey } = useTerminology();
  const projectIcon = ICON_MAP[projectIconKey] ?? GraduationCap;
  const menuItems = buildMenuItems(projectLabel, projectIcon);
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
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
                    src={LOGO_URL}
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
                  src={LOGO_URL}
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

            {/* User profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-white/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
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
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>

      <AIAssistant />
      <PageIdBadge />
      <QuickSetupModal open={quickSetupOpen} onClose={() => setQuickSetupOpen(false)} />
    </>
  );
}

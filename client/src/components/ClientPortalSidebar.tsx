import React from "react";
import { useLocation } from "wouter";
import {
  Compass, MessageSquare, CheckSquare, FileText, FolderOpen, Wrench,
  Briefcase, DollarSign, Calendar, StickyNote, Info, Sun, Moon, LogOut, X, Scale,
  ChevronLeft, ChevronRight, Home, Video, Sparkles, CheckCircle2, Lock, PenTool, GraduationCap,
  MapPin, RotateCcw, CreditCard, PenLine, FileSignature, CircleParking, RefreshCw, Gift, Star, PanelLeft
} from "lucide-react";
import { VaultSafeIcon } from "@/components/ui/VaultSafeIcon";
import { ActionCenterIcon } from "@/components/ui/ActionCenterIcon";
import { 
  PORTAL_MODULE_REGISTRY, 
  TOUR_MODULES,
  ClientStage, 
  resolveModuleState, 
  PortalModuleDefinition 
} from "./portal/portalModuleRegistry";
import { cn } from "@/lib/utils";

const LOGO_URL = "/waypoint-logo.png";

export const NAV_ITEMS = [
  { id: "details",       icon: GraduationCap, label: "My Students" },
  { id: "appointments",  icon: Calendar,         label: "Appointments" },
  { id: "compass",       icon: Compass,          label: "Compass" },
  { id: "communication", icon: MessageSquare,     label: "Communication" },
  { id: "tasks",         icon: CheckSquare,       label: "Tasks" },
  { id: "parking-lot",   icon: CircleParking,    label: "Parking Lot" },
  { id: "smart-docs",    icon: VaultSafeIcon,    label: "Document Vault" },
  { id: "agreements",    icon: FileSignature,    label: "Agreements" },
  { id: "files",         icon: ActionCenterIcon, label: "Action Center" },
  { id: "tools",         icon: Wrench,        label: "Tools" },
  { id: "cases",         icon: Briefcase,     label: "Cases" },
  { id: "voyage-log",    icon: Video,         label: "Voyage Log" },
  { id: "financials",    icon: CreditCard,    label: "Membership" },
  { id: "referrals",     icon: Gift,          label: "Referrals" },
  { id: "renewal",       icon: Sparkles,      label: "Plan Renewal" },
  { id: "notes",         icon: StickyNote,    label: "Notes" },
  { id: "attorney",      icon: Scale,         label: "Legal Counsel" },
] as const;

export type NavId = typeof NAV_ITEMS[number]["id"] | string;

interface ClientPortalSidebarProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
  mobile?: boolean;
  onCloseMobile?: () => void;
  displayName: string;
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
  logoUrl?: string | null;
  hasAttorney?: boolean;
  navItems?: readonly { id: string; icon: any; label: string }[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  clientStage?: ClientStage;
  completedOnboardingSteps?: string[];
  // Exploration Mode Props
  isExplorationActive?: boolean;
  exploredTourIds?: string[];
  onStartTour?: () => void;
  onEndExploration?: () => void;
  onResetTour?: () => void;
  daysUntilPlanEnd?: number;
}

export function ClientPortalSidebar({
  activeTab,
  onSelectTab,
  mobile = false,
  onCloseMobile,
  displayName,
  theme,
  onToggleTheme,
  onLogout,
  logoUrl,
  hasAttorney = false,
  navItems,
  isCollapsed = false,
  onToggleCollapse,
  clientStage = "ACTIVE",
  completedOnboardingSteps = [],
  isExplorationActive = false,
  exploredTourIds = [],
  onStartTour,
  onEndExploration,
  onResetTour,
  daysUntilPlanEnd
}: ClientPortalSidebarProps) {
  const [location, setLocation] = useLocation();
  const isWorkspace = location.startsWith("/projects/");
  const isLight = theme === "blue";

  const navRef = React.useRef<HTMLElement>(null);
  const isFirstRender = React.useRef(true);

  // Auto-scroll sidebar to reveal and center whichever tab is activated from internal parent navigation or tab change
  React.useEffect(() => {
    if (!activeTab || !navRef.current) return;

    const nav = navRef.current;
    const timer = setTimeout(() => {
      const activeBtn = nav.querySelector<HTMLElement>(`[data-nav-id="${activeTab}"]`);
      if (!activeBtn) return;

      const navRect = nav.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();

      const isComfortablyVisible = (
        btnRect.top >= navRect.top + 36 &&
        btnRect.bottom <= navRect.bottom - 36
      );

      if (!isComfortablyVisible) {
        const currentScrollTop = nav.scrollTop;
        const relativeTop = btnRect.top - navRect.top;
        const targetScrollTop = currentScrollTop + relativeTop - (nav.clientHeight / 2) + (btnRect.height / 2);

        nav.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: isFirstRender.current ? "auto" : "smooth",
        });
      }

      isFirstRender.current = false;
    }, 70);

    return () => clearTimeout(timer);
  }, [activeTab, isCollapsed]);

  const totalTourCount = TOUR_MODULES.length || 6;
  const exploredCount = exploredTourIds.length;
  const isTourAllExplored = exploredCount >= totalTourCount;

  // Build Getting Started items based on clientStage
  const isOnboardingOrPreSale = clientStage !== "ACTIVE" && clientStage !== "CLOSING" && clientStage !== "INACTIVE";

  const gettingStartedModules: Array<{ id: string; icon: any; label: string; isCompleted: boolean; isCurrent: boolean }> = [];

  if (isOnboardingOrPreSale) {
    if (clientStage === "DISCOVERY_SCHEDULED" || clientStage === "DISCOVERY_INQUIRY") {
      gettingStartedModules.push(
        { id: "discovery-call", icon: Calendar, label: "Discovery Call", isCompleted: false, isCurrent: activeTab === "discovery-call" },
        { id: "your-journey", icon: Sparkles, label: "Your Journey", isCompleted: false, isCurrent: activeTab === "your-journey" },
        { id: "explore-portal", icon: MapPin, label: "Explore Your Portal", isCompleted: isTourAllExplored, isCurrent: activeTab === "explore-portal" }
      );
    } else if (clientStage === "DISCOVERY_COMPLETED" || clientStage === "PLAN_SELECTION" || clientStage === "PAYMENT_PENDING") {
      gettingStartedModules.push(
        { id: "discovery-call", icon: CheckCircle2, label: "Discovery Call", isCompleted: true, isCurrent: activeTab === "discovery-call" },
        { id: "choose-support", icon: Sparkles, label: "Choose Support", isCompleted: false, isCurrent: activeTab === "choose-support" },
        { id: "your-journey", icon: Compass, label: "Your Journey", isCompleted: false, isCurrent: activeTab === "your-journey" },
        { id: "explore-portal", icon: MapPin, label: "Explore Your Portal", isCompleted: isTourAllExplored, isCurrent: activeTab === "explore-portal" }
      );
    } else if (clientStage === "ONBOARDING") {
      const agreementsDone = completedOnboardingSteps.includes("agreements");
      const studentSetupDone = completedOnboardingSteps.includes("student-setup");
      const recordsDone = completedOnboardingSteps.includes("upload-records");
      const intakeDone = completedOnboardingSteps.includes("advocacy-intake");

      gettingStartedModules.push(
        { id: "discovery-call", icon: CheckCircle2, label: "Discovery Call", isCompleted: true, isCurrent: activeTab === "discovery-call" },
        { id: "choose-support", icon: CheckCircle2, label: "Support Selected", isCompleted: true, isCurrent: activeTab === "choose-support" },
        { id: "agreements", icon: agreementsDone ? CheckCircle2 : PenTool, label: "Agreements", isCompleted: agreementsDone, isCurrent: activeTab === "agreements" },
        { id: "student-setup", icon: studentSetupDone ? CheckCircle2 : GraduationCap, label: "Student Setup", isCompleted: studentSetupDone, isCurrent: activeTab === "student-setup" },
        { id: "upload-records", icon: recordsDone ? CheckCircle2 : FolderOpen, label: "Upload Records", isCompleted: recordsDone, isCurrent: activeTab === "upload-records" },
        { id: "advocacy-intake", icon: intakeDone ? CheckCircle2 : CheckSquare, label: "Advocacy Intake", isCompleted: intakeDone, isCurrent: activeTab === "advocacy-intake" },
        { id: "explore-portal", icon: MapPin, label: "Explore Your Portal", isCompleted: isTourAllExplored, isCurrent: activeTab === "explore-portal" }
      );
    }
  }

  // Regular nav items filtered by attorney / custom props - Plan Renewal shown with daysRemaining badge
  const daysRemaining = daysUntilPlanEnd ?? 45;
  const rawItems = navItems || NAV_ITEMS.filter(({ id }) => id !== "attorney" || hasAttorney);
  const baseItems: Array<{ id: string; icon: any; label: string; badge?: string }> = rawItems.map((item) => {
    if (item.id === "renewal") {
      return {
        ...item,
        badge: `${daysRemaining}d`,
      };
    }
    return item;
  });

  return (
    <div 
      className={cn(
        "relative flex flex-col h-full border-r transition-all duration-300 ease-in-out overflow-hidden shadow-2xl select-none",
        isLight ? "bg-white border-slate-200" : "border-[#152744]",
        mobile ? "w-72" : isCollapsed ? "w-20" : "w-64 shrink-0"
      )}
      style={!isLight ? {
        background: "#07152B",
      } : undefined}
    >
      
      {/* ── Header: Gold Shimmer Line + Circular Theme Toggle + Logo & Wordmark + Collapse Button ── */}
      <div className={cn(
        "pt-3.5 pb-2.5 flex flex-col items-center border-b transition-colors duration-300 relative z-40",
        isLight ? "border-slate-200 bg-slate-50/50" : "border-[#152744] bg-transparent",
        isCollapsed && !mobile ? "px-2" : "px-3"
      )}>
        {/* Top golden accent shimmer line (exact match to Advocate Sidebar) */}
        {!isLight && (
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#F7D287] to-transparent shadow-[0_0_10px_rgba(247,210,135,0.75)] pointer-events-none z-30" />
        )}
        
        {!isCollapsed || mobile ? (
          <div className="relative w-full flex flex-col items-center justify-center pt-1 pb-1">
            {/* Circular Light/Dark Mode Toggle at top left (exact match to Advocate Sidebar) */}
            <button
              onClick={onToggleTheme}
              className={cn(
                "absolute top-0 left-0 w-7 h-7 rounded-full border flex items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer shadow-md z-20",
                isLight
                  ? "border-amber-500/50 bg-white text-slate-700 hover:bg-slate-50 hover:border-amber-500"
                  : "border-[#F5B544]/70 hover:border-[#F5B544] bg-[#07152B] hover:bg-[#0C1F3D] text-[#F5B544] shadow-amber-500/10"
              )}
              title={isLight ? "Switch to dark mode" : "Switch to light mode"}
              aria-label="Toggle theme"
            >
              <Sun
                className={cn(
                  "absolute h-3.5 w-3.5 text-amber-500 transition-all duration-300 transform",
                  isLight
                    ? "translate-y-0 rotate-0 scale-100 opacity-100"
                    : "translate-y-6 -rotate-90 scale-50 opacity-0"
                )}
              />
              <Moon
                className={cn(
                  "absolute h-3.5 w-3.5 text-amber-300 transition-all duration-300 transform",
                  !isLight
                    ? "translate-y-0 rotate-0 scale-100 opacity-100"
                    : "-translate-y-6 rotate-90 scale-50 opacity-0"
                )}
              />
            </button>

            {/* Collapse / Close / Back to CRM button at top right */}
            <div className="absolute top-0 right-0 flex items-center gap-1 z-20">
              {isWorkspace && (
                <button
                  onClick={() => setLocation("/projects")}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer border",
                    isLight
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-700 hover:bg-amber-500/20"
                      : "bg-[#07172E] border-[#172D4D] text-[#E0B86C] hover:text-[#F8D279] hover:border-[#D4AF37]/50"
                  )}
                  title="Back to CRM Dashboard"
                  aria-label="Back to CRM Dashboard"
                >
                  <Home className="h-3.5 w-3.5" />
                </button>
              )}

              {mobile ? (
                <button
                  onClick={onCloseMobile}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer",
                    isLight ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-white/50 hover:text-white hover:bg-white/[0.08]"
                  )}
                  title="Close navigation"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : onToggleCollapse ? (
                <button
                  onClick={onToggleCollapse}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] cursor-pointer",
                    isLight ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-white/50 hover:text-white hover:bg-white/[0.08]"
                  )}
                  title="Collapse navigation"
                  aria-label="Collapse navigation"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* Waypoint Advocates Logo & Wordmark (Admiralty Theme) */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <img
                src={logoUrl || LOGO_URL}
                alt="Waypoint Advocates"
                className="h-11 w-11 object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
              />
              <div className="flex flex-col items-center leading-tight w-full">
                <span className={cn(
                  "font-serif tracking-[0.24em] text-[15px] font-bold uppercase select-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] pl-1",
                  isLight ? "text-amber-800" : "text-[#E5C175]"
                )}>
                  WAYPOINT
                </span>
                <span className={cn(
                  "tracking-[0.28em] text-[10.5px] font-semibold uppercase select-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] pl-1",
                  isLight ? "text-slate-500" : "text-[#B9CDE3]"
                )}>
                  CLIENT PORTAL
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed Header */
          <div className="flex flex-col items-center justify-center py-1 gap-2 w-full">
            <img
              src={logoUrl || LOGO_URL}
              alt="Waypoint Advocates"
              className="h-8 w-8 object-contain drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]"
            />
            <button
              onClick={onToggleTheme}
              className={cn(
                "relative w-7 h-7 rounded-full border flex items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer shadow-md",
                isLight
                  ? "border-amber-500/50 bg-white text-slate-700 hover:bg-slate-50 hover:border-amber-500"
                  : "border-[#F5B544]/70 hover:border-[#F5B544] bg-[#07152B] hover:bg-[#0C1F3D] text-[#F5B544] shadow-amber-500/10"
              )}
              title={isLight ? "Switch to dark mode" : "Switch to light mode"}
              aria-label="Toggle theme"
            >
              <Sun
                className={cn(
                  "absolute h-3.5 w-3.5 text-amber-500 transition-all duration-300 transform",
                  isLight
                    ? "translate-y-0 rotate-0 scale-100 opacity-100"
                    : "translate-y-6 -rotate-90 scale-50 opacity-0"
                )}
              />
              <Moon
                className={cn(
                  "absolute h-3.5 w-3.5 text-amber-300 transition-all duration-300 transform",
                  !isLight
                    ? "translate-y-0 rotate-0 scale-100 opacity-100"
                    : "-translate-y-6 rotate-90 scale-50 opacity-0"
                )}
              />
            </button>
            {isWorkspace && (
              <button
                onClick={() => setLocation("/projects")}
                className={cn(
                  "h-7 w-7 rounded-lg transition-colors flex items-center justify-center border",
                  isLight
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-700 hover:bg-amber-500/20"
                    : "bg-[#07172E] border-[#172D4D] text-[#E0B86C] hover:text-[#F8D279] hover:border-[#D4AF37]/50"
                )}
                title="Back to CRM"
              >
                <Home className="h-3.5 w-3.5" />
              </button>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer",
                  isLight ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-white/50 hover:text-white hover:bg-white/[0.08]"
                )}
                title="Expand navigation"
                aria-label="Expand navigation"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Nav Items Container (Advocate Clean Layout with Radiant Highlights) ── */}
      <nav ref={navRef} className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto scroll-smooth custom-scrollbar">
        
        {/* ── 1. GETTING STARTED CONDITIONAL SIDEBAR GROUP ── */}
        {isOnboardingOrPreSale && gettingStartedModules.length > 0 && (
          <div className="space-y-1 pb-2">
            {(!isCollapsed || mobile) && (
              <div className="px-3 py-1 flex items-center justify-between">
                <span className={cn(
                  "text-[9.5px] font-extrabold uppercase tracking-widest font-mono",
                  isLight ? "text-amber-800" : "text-[#F8D279]"
                )}>
                  Getting Started
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#F8D279] animate-pulse" />
              </div>
            )}

            {gettingStartedModules.map(({ id, icon: Icon, label, isCompleted }) => {
              const isActive = activeTab === id;
              const isTourItem = id === "explore-portal";

              // Special treatment for Explore Your Portal: progress bar inside card
              if (isTourItem) {
                return (
                  <button
                    key={id}
                    data-nav-id={id}
                    onClick={() => {
                      onSelectTab(id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    title={isCollapsed ? label : undefined}
                    className={cn(
                      "w-full flex flex-col rounded-lg transition-all duration-150 text-left cursor-pointer",
                      isCollapsed && !mobile ? "items-center justify-center p-2" : "px-3 py-2",
                      isActive
                        ? isLight
                          ? "bg-amber-500/15 border border-amber-500/50 text-amber-900 font-semibold shadow-sm"
                          : "bg-gradient-to-r from-[#173050]/95 via-[#23456F]/85 to-[#162E4D]/95 border border-[#D4AF37]/50 text-white font-semibold shadow-[0_2px_12px_rgba(212,175,55,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]"
                        : isLight
                          ? "border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-800"
                          : "border border-[#172D4D] bg-[#07172E]/90 hover:border-[#D4AF37]/50 text-[#CFDFEE] shadow-sm"
                    )}
                  >
                    <div className="w-full flex items-center gap-2.5">
                      <Icon className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        isActive 
                          ? "text-[#F8D279] drop-shadow-[0_0_6px_rgba(248,210,121,0.6)] scale-105" 
                          : "text-emerald-400"
                      )} />
                      
                      {(!isCollapsed || mobile) && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold truncate">{label}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {isTourAllExplored && <span className="text-[10px] text-emerald-400 font-bold ml-1">✓</span>}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onResetTour?.();
                                }}
                                title="Reset & Replay Tour"
                                className="p-1 rounded-md hover:bg-white/10 text-white/50 hover:text-amber-300 transition-colors"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* ── Progress Bar Directly Inside Item ── */}
                          <div className="mt-1.5 space-y-1">
                            <div className="relative h-1.5 w-full bg-slate-900/90 rounded-full border border-white/10">
                              <div
                                className="absolute top-0 left-0 h-full bg-emerald-400/40 rounded-full blur-[2px] transition-all duration-500 pointer-events-none"
                                style={{ width: `${Math.max(16, Math.min(100, (exploredCount / totalTourCount) * 100))}%` }}
                              />
                              <div
                                className="relative h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.7)] transition-all duration-500"
                                style={{ width: `${Math.max(16, Math.min(100, (exploredCount / totalTourCount) * 100))}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={cn("font-mono text-[9.5px]", isLight ? "text-slate-500" : "text-[#B9CDE3]")}>
                                {isTourAllExplored
                                  ? "Portal Explored ✓"
                                  : `${exploredCount}/${totalTourCount} explored`}
                              </span>
                              <span className="text-emerald-400 font-mono text-[9px] font-bold">
                                {Math.round((exploredCount / totalTourCount) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              }

              // Standard Getting Started items
              return (
                <button
                  key={id}
                  data-nav-id={id}
                  onClick={() => {
                    onSelectTab(id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title={isCollapsed ? label : undefined}
                  className={cn(
                    "h-9 w-full rounded-lg text-xs cursor-pointer transition-all duration-150 flex items-center select-none",
                    isCollapsed && !mobile ? "justify-center" : "gap-2.5 px-3 text-left",
                    isActive
                      ? isLight
                        ? "bg-amber-500/15 border border-amber-500/50 text-amber-900 font-semibold shadow-sm"
                        : "bg-gradient-to-r from-[#173050]/95 via-[#23456F]/85 to-[#162E4D]/95 border border-[#D4AF37]/50 text-white font-semibold shadow-[0_2px_12px_rgba(212,175,55,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]"
                      : isCompleted
                        ? isLight
                          ? "text-emerald-700 hover:bg-emerald-50 border border-transparent font-medium"
                          : "text-emerald-400 hover:text-emerald-300 hover:bg-white/[0.07] border border-transparent font-medium"
                        : isLight
                          ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent font-medium"
                          : "text-[#B9CDE3] hover:text-white hover:bg-white/[0.07] border border-transparent font-medium"
                  )}
                >
                  <Icon className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    isCompleted 
                      ? "text-emerald-400" 
                      : isActive 
                        ? "text-[#F8D279] drop-shadow-[0_0_6px_rgba(248,210,121,0.6)] scale-105" 
                        : isLight
                          ? "text-slate-400"
                          : "text-[#E0B86C] drop-shadow-[0_0_2px_rgba(224,184,108,0.3)]"
                  )} />
                  {(!isCollapsed || mobile) && (
                    <span className="truncate flex-1 flex items-center justify-between tracking-wide">
                      <span>{label}</span>
                      {isCompleted && <span className="text-[10px] text-emerald-400 font-bold ml-1">✓</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── 2. PERMANENT WORKSPACE MODULES (Exact Match to Advocate Sidebar Navigation) ── */}
        <div className={cn(
          "space-y-1",
          isOnboardingOrPreSale && gettingStartedModules.length > 0 ? "pt-1.5 border-t border-[#152744]" : ""
        )}>
          {(!isCollapsed || mobile) && isOnboardingOrPreSale && (
            <div className="px-3 py-1">
              <span className={cn(
                "text-[9.5px] font-bold uppercase tracking-wider font-mono",
                isLight ? "text-slate-400" : "text-[#A5C1E5]"
              )}>
                Workspaces
              </span>
            </div>
          )}

          {baseItems.map((item) => {
            const { id, icon: Icon, label, badge } = item;
            const isActive = activeTab === id;
            const isTourTarget = isExplorationActive && TOUR_MODULES.some(m => m.id === id);
            const isUnexplored = isTourTarget && !exploredTourIds.includes(id);

            return (
              <button
                key={id}
                data-nav-id={id}
                onClick={() => {
                  onSelectTab(id);
                  if (onCloseMobile) onCloseMobile();
                }}
                title={isCollapsed ? label : undefined}
                className={cn(
                  "h-10 w-full rounded-lg cursor-pointer transition-all duration-150 flex items-center select-none",
                  isCollapsed && !mobile ? "justify-center px-1" : "gap-3 px-3 text-left",
                  isActive
                    ? isLight
                      ? "bg-amber-500/15 border border-amber-500/50 text-amber-900 font-semibold shadow-sm"
                      : "bg-gradient-to-r from-[#173050]/95 via-[#23456F]/85 to-[#162E4D]/95 border border-[#D4AF37]/50 text-white font-semibold shadow-[0_2px_12px_rgba(212,175,55,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent font-medium"
                      : "text-[#B9CDE3] hover:text-white hover:bg-white/[0.07] border border-transparent font-medium"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  isActive 
                    ? "text-[#F8D279] drop-shadow-[0_0_6px_rgba(248,210,121,0.6)] scale-105" 
                    : isLight
                      ? "text-slate-400"
                      : "text-[#E0B86C] drop-shadow-[0_0_2px_rgba(224,184,108,0.3)]",
                  id === "plan-transition" && isActive ? "animate-spin-slow" : ""
                )} />
                {(!isCollapsed || mobile) && (
                  <span className="truncate flex-1 flex items-center justify-between tracking-wide text-[13.5px]">
                    <span>{label === "Details" || label === "Student Workspace" ? "My Students" : label}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {badge && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold",
                          isLight
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-amber-400/20 text-[#F8D279] border border-amber-400/35 shadow-xs"
                        )}>
                          {badge}
                        </span>
                      )}
                      {isUnexplored && (
                        <span className="text-emerald-400 font-bold text-base leading-none" title="Unexplored area">•</span>
                      )}
                      {isOnboardingOrPreSale && (id === "details" || id === "smart-docs" || id === "files" || id === "tasks" || id === "tools") && (
                        <Lock className={cn("h-3 w-3", isLight ? "text-slate-400" : "text-white/35")} />
                      )}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Footer: Compact Client Pill & Controls Matching Advocate Reference ── */}
      <div className={cn(
        "px-2.5 pb-3 pt-2.5 border-t space-y-2 relative z-20",
        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 backdrop-blur-md border-[#152744]"
      )}>
        
        {/* Permanent Portal Tour utility for active clients */}
        {!isOnboardingOrPreSale && onStartTour && (
          <button
            onClick={onStartTour}
            title="Start Portal Tour"
            className={cn(
              "w-full flex items-center gap-2 rounded-md border text-xs font-semibold py-1.5 px-2.5 transition-all shadow-sm cursor-pointer",
              isLight 
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20" 
                : "border-[#172D4D] bg-[#07172E]/90 hover:bg-[#0B1E38] hover:border-[#D4AF37]/50 text-[#F8D279]",
              isCollapsed && !mobile ? "justify-center p-2 w-8 h-8 mx-auto shrink-0" : ""
            )}
          >
            <RotateCcw className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            {(!isCollapsed || mobile) && <span>Portal Tour</span>}
          </button>
        )}

        {(!isCollapsed || mobile) ? (
          <div className="space-y-1.5">
            {/* Client Name Pill (exact match to Advocate Side Employee Pill) */}
            <div className={cn(
              "flex items-center h-8.5 rounded-md border transition-all flex-1 text-left overflow-hidden shadow-sm group relative",
              isLight
                ? "border-slate-300 bg-white"
                : "border-[#172D4D] bg-[#07172E]/90 hover:bg-[#0B1E38] hover:border-[#D4AF37]/50"
            )}>
              {/* Left Star compartment matching advocate reference */}
              <div className={cn(
                "h-full px-2.5 flex items-center justify-center border-r shrink-0",
                isLight ? "border-slate-200 bg-slate-50" : "border-[#152B4B] bg-[#051122]/60 group-hover:bg-[#07172E]/80 transition-colors"
              )}>
                <Star className="h-3.5 w-3.5 text-[#D8B467] fill-[#D8B467]/20 shrink-0" />
              </div>

              {/* Client Name & Golden Glint */}
              <div className="flex-1 flex items-center justify-between px-2.5 min-w-0 relative">
                <span className={cn(
                  "text-[12px] font-serif font-medium tracking-wide truncate",
                  isLight ? "text-slate-800" : "text-[#F1E8D9] group-hover:text-white transition-colors"
                )}>
                  {displayName}
                </span>

                {/* Subtle golden underline glint matching advocate image */}
                {!isLight && (
                  <div className="absolute -bottom-0.5 left-2.5 right-2.5 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent pointer-events-none" />
                )}
              </div>
            </div>

            {/* Utility Action Buttons */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              {isWorkspace && (
                <button
                  onClick={() => setLocation("/projects")}
                  title="Back to CRM"
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                    isLight 
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-700 hover:bg-amber-500/20" 
                      : "bg-[#07172E] border-[#172D4D] text-[#E0B86C] hover:text-[#F8D279] hover:border-[#D4AF37]/50"
                  )}
                >
                  <Home className="h-3.5 w-3.5 shrink-0" />
                  <span>Back to CRM</span>
                </button>
              )}

              <button
                onClick={onLogout}
                title="Logout"
                className={cn(
                  "flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium transition-all ml-auto cursor-pointer shadow-sm",
                  isLight 
                    ? "bg-white border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300" 
                    : "bg-[#07172E] border-[#172D4D] text-rose-400 hover:text-rose-300 hover:border-rose-400/50 hover:bg-rose-950/40"
                )}
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        ) : (
          /* Collapsed Footer */
          <div className="flex flex-col items-center gap-1.5 w-full">
            <div 
              title={displayName}
              className="w-8 h-8 rounded-md border border-[#172D4D] bg-[#07172E] flex items-center justify-center text-[#D8B467] shadow-sm"
            >
              <Star className="h-3.5 w-3.5 text-[#D8B467] fill-[#D8B467]/20" />
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="w-8 h-8 rounded-md border border-[#172D4D] bg-[#07172E] hover:border-rose-400/50 hover:text-rose-300 text-rose-400 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

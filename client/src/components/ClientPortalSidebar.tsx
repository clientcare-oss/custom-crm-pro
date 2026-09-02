import React from "react";
import { useLocation } from "wouter";
import {
  Compass, MessageSquare, CheckSquare, FileText, FolderOpen, Wrench,
  Briefcase, DollarSign, Calendar, StickyNote, Info, Sun, Moon, LogOut, X, Scale,
  ChevronLeft, ChevronRight, Home, Video, Sparkles, CheckCircle2, Lock, PenTool, GraduationCap,
  MapPin, RotateCcw, FolderLock
} from "lucide-react";
import { 
  PORTAL_MODULE_REGISTRY, 
  TOUR_MODULES,
  ClientStage, 
  resolveModuleState, 
  PortalModuleDefinition 
} from "./portal/portalModuleRegistry";

const LOGO_URL = "/waypoint-logo.png";

export const NAV_ITEMS = [
  { id: "compass",       icon: Compass,        label: "Compass" },
  { id: "communication", icon: MessageSquare,   label: "Communication" },
  { id: "tasks",         icon: CheckSquare,     label: "Tasks" },
  { id: "smart-docs",    icon: FolderLock,      label: "Document Vault" },
  { id: "files",         icon: FolderOpen,      label: "Files" },
  { id: "tools",         icon: Wrench,          label: "Tools" },
  { id: "cases",         icon: Briefcase,       label: "Cases" },
  { id: "financials",    icon: DollarSign,      label: "Billing" },
  { id: "appointments",  icon: Calendar,        label: "Appointments" },
  { id: "voyage-log",    icon: Video,          label: "Voyage Log" },
  { id: "notes",         icon: StickyNote,      label: "Notes" },
  { id: "attorney",      icon: Scale,          label: "Legal Counsel" },
  { id: "details",       icon: Info,            label: "Details" },
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
  onResetTour
}: ClientPortalSidebarProps) {
  const [location, setLocation] = useLocation();
  const isWorkspace = location.startsWith("/projects/");
  const isLight = theme === "blue";

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

  // Regular nav items filtered by attorney / custom props
  const baseItems = navItems || NAV_ITEMS.filter(({ id }) => id !== "attorney" || hasAttorney);

  return (
    <div className={`flex flex-col h-full border-r transition-all duration-[300ms] ease-in-out
      ${isLight ? "bg-white border-slate-200" : "bg-[#06172F] border-white/10"}
      ${mobile ? "w-72" : isCollapsed ? "w-20" : "w-64 shrink-0"}`}>
      
      {/* Header Logo */}
      <div className={`pt-5 pb-4 flex flex-col items-center border-b transition-colors duration-[3000ms] ease-in-out
        ${isLight ? "border-slate-200" : "border-white/8"}
        ${isCollapsed && !mobile ? "px-2 gap-3" : "px-5"}`}>
        
        <div className={`flex w-full items-center ${isCollapsed && !mobile ? "justify-center" : "justify-between"}`}>
          <div className="flex items-center gap-3">
            <img src={logoUrl || LOGO_URL} alt="Waypoint Advocates" className="h-10 w-10 object-contain shrink-0" />
            {(!isCollapsed || mobile) && (
              <div>
                <p className={`text-sm font-bold tracking-widest uppercase leading-tight font-serif transition-colors duration-[3000ms] ease-in-out ${
                  isLight ? "text-slate-800" : "text-white"
                }`}>Waypoint</p>
                <p className={`text-[10px] tracking-[0.2em] uppercase transition-colors duration-[3000ms] ease-in-out ${
                  isLight ? "text-slate-400" : "text-white/40"
                }`}>Advocates</p>
              </div>
            )}
          </div>

          {mobile ? (
            <button onClick={onCloseMobile} className={`transition-colors duration-[3000ms] ease-in-out ${isLight ? "text-slate-400 hover:text-slate-700" : "text-white/40 hover:text-white"}`}>
              <X className="h-5 w-5" />
            </button>
          ) : !isCollapsed ? (
            <div className="flex items-center gap-2">
              {isWorkspace && (
                <button
                  onClick={() => setLocation("/projects")}
                  className={`p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center hover:scale-105 border ${
                    isLight 
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-700 hover:bg-amber-500/20" 
                      : "bg-amber-400/10 border-amber-400/20 text-amber-300 hover:bg-amber-400/20 hover:shadow-[0_0_8px_rgba(250,204,21,0.2)]"
                  }`}
                  title="Back to CRM Dashboard"
                >
                  <Home className="h-4 w-4" />
                </button>
              )}
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className={`p-1.5 rounded transition-colors duration-[3000ms] ease-in-out ${
                    isLight ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-white/40 hover:text-white hover:bg-white/10"
                  }`}
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : null}
        </div>

        {isCollapsed && !mobile && (
          <div className="flex flex-col items-center gap-2 w-full pt-1 animate-fadeIn">
            {isWorkspace && (
              <button
                onClick={() => setLocation("/projects")}
                className={`p-2 rounded-lg transition-all duration-300 flex items-center justify-center hover:scale-105 border w-10 h-10 ${
                  isLight 
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-700 hover:bg-amber-500/20" 
                    : "bg-amber-400/10 border-amber-400/20 text-amber-300 hover:bg-amber-400/20 hover:shadow-[0_0_8px_rgba(250,204,21,0.2)]"
                }`}
                title="Back to CRM Dashboard"
              >
                <Home className="h-4 w-4" />
              </button>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className={`p-2 rounded transition-colors duration-[3000ms] ease-in-out w-10 h-10 flex items-center justify-center ${
                  isLight ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-white/40 hover:text-white hover:bg-white/10"
                }`}
                title="Expand Sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav Items Container */}
      <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        
        {/* ── 1. GETTING STARTED CONDITIONAL SIDEBAR GROUP ── */}
        {isOnboardingOrPreSale && gettingStartedModules.length > 0 && (
          <div className="space-y-1.5 pb-2">
            {(!isCollapsed || mobile) && (
              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400/90 font-mono">
                  Getting Started
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
            )}

            {gettingStartedModules.map(({ id, icon: Icon, label, isCompleted }) => {
              const isActive = activeTab === id;
              const isTourItem = id === "explore-portal";

              // Special treatment for Explore Your Portal: slightly taller with progress bar directly inside
              if (isTourItem) {
                return (
                  <button
                    key={id}
                    onClick={() => {
                      onSelectTab(id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    title={isCollapsed ? label : undefined}
                    className={`w-full flex flex-col rounded-xl transition-all duration-200 text-left
                      ${isCollapsed && !mobile ? "items-center justify-center p-2.5" : "px-3 py-2.5"}
                      ${isActive
                        ? isLight
                          ? "border border-amber-500/50 text-amber-900 bg-amber-500/15 shadow-sm"
                          : "border border-amber-400/80 text-amber-300 bg-amber-400/10 shadow-sm"
                        : isLight
                          ? "border border-slate-200/60 bg-white hover:bg-slate-50 text-slate-800"
                          : "border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white"
                      }`}
                  >
                    <div className="w-full flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-amber-400" : "text-emerald-400"
                      }`} />
                      
                      {(!isCollapsed || mobile) && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">{label}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {isTourAllExplored && <span className="text-[10px] text-emerald-400 font-bold ml-1">✓</span>}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onResetTour?.();
                                }}
                                title="Reset & Replay Tour"
                                className="p-1 rounded-md hover:bg-white/15 text-white/50 hover:text-amber-300 transition-colors"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* ── Progress Bar Directly Inside Item ── */}
                          <div className="mt-1.5 space-y-1.5">
                            <div className="relative h-1.5 w-full bg-slate-900/90 rounded-full border border-white/10">
                              {/* Soft ambient glow behind progress fill */}
                              <div
                                className="absolute top-0 left-0 h-full bg-emerald-400/50 rounded-full blur-[2.5px] transition-all duration-500 pointer-events-none"
                                style={{ width: `${Math.max(16, Math.min(100, (exploredCount / totalTourCount) * 100))}%` }}
                              />
                              {/* Foreground crisp vibrant emerald bar with illuminated glow */}
                              <div
                                className="relative h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.85),0_0_3px_rgba(16,185,129,0.9)] transition-all duration-500"
                                style={{ width: `${Math.max(16, Math.min(100, (exploredCount / totalTourCount) * 100))}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={`font-mono font-medium ${isLight ? "text-slate-500" : "text-white/70"}`}>
                                {isTourAllExplored
                                  ? "Portal Explored ✓"
                                  : `${exploredCount} of ${totalTourCount} explored`}
                              </span>
                              {isTourAllExplored ? (
                                <span className="text-emerald-400 font-bold drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]">100%</span>
                              ) : (
                                <span className="text-emerald-400/90 font-mono text-[9px]">
                                  {Math.round((exploredCount / totalTourCount) * 100)}%
                                </span>
                              )}
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
                  onClick={() => {
                    onSelectTab(id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title={isCollapsed ? label : undefined}
                  className={`w-full flex items-center rounded-xl transition-all duration-200 text-xs font-semibold
                    ${isCollapsed && !mobile ? "justify-center p-2" : "gap-2.5 px-3 py-2 text-left"}
                    ${isActive
                      ? isLight
                        ? "border border-amber-500/50 text-amber-800 bg-amber-500/15 shadow-sm"
                        : "border border-amber-400/70 text-amber-300 bg-amber-400/10 shadow-sm"
                      : isCompleted
                      ? "text-emerald-400 hover:bg-white/5"
                      : isLight
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-white/80 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${
                    isCompleted 
                      ? "text-emerald-400" 
                      : isActive 
                      ? "text-amber-400" 
                      : "text-white/50"
                  }`} />
                  {(!isCollapsed || mobile) && (
                    <span className="truncate flex-1 flex items-center justify-between">
                      <span>{label}</span>
                      {isCompleted && <span className="text-[10px] text-emerald-400 font-bold ml-1">✓</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── 2. PERMANENT WORKSPACE MODULES (STARTS WITH COMPASS) ── */}
        <div className={`space-y-1 ${isOnboardingOrPreSale && gettingStartedModules.length > 0 ? "pt-1 border-t border-white/8" : ""}`}>
          {(!isCollapsed || mobile) && isOnboardingOrPreSale && (
            <div className="px-3 py-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 font-mono">
                Workspaces
              </span>
            </div>
          )}

          {baseItems.map(({ id, icon: Icon, label }) => {
            const isActive = activeTab === id;
            const isTourTarget = isExplorationActive && TOUR_MODULES.some(m => m.id === id);
            const isUnexplored = isTourTarget && !exploredTourIds.includes(id);

            return (
              <button
                key={id}
                onClick={() => {
                  onSelectTab(id);
                  if (onCloseMobile) onCloseMobile();
                }}
                title={isCollapsed ? label : undefined}
                className={`w-full flex items-center rounded-xl transition-all duration-200 text-sm font-medium
                  ${isCollapsed && !mobile ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5 text-left"}
                  ${isActive
                    ? isLight
                      ? "border border-amber-500/50 text-amber-700 bg-amber-500/10 shadow-sm"
                      : "border border-amber-400/80 text-amber-300 bg-amber-400/10 shadow-lg shadow-amber-500/10"
                    : isLight
                      ? "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      : "border border-transparent text-white/60 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-400" : isLight ? "text-slate-450" : "text-white/40"}`} />
                {(!isCollapsed || mobile) && (
                  <span className="truncate flex-1 flex items-center justify-between">
                    <span>{label === "Details" ? "Student Workspace" : label}</span>
                    <span className="flex items-center gap-1.5">
                      {isUnexplored && (
                        <span className="text-emerald-400 font-bold text-base leading-none" title="Unexplored area">•</span>
                      )}
                      {isOnboardingOrPreSale && (id === "details" || id === "smart-docs" || id === "files" || id === "tasks") && (
                        <Lock className="h-3 w-3 text-white/30" />
                      )}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer Controls */}
      <div className={`px-3 pb-4 pt-3 border-t space-y-2.5 ${isLight ? "border-slate-200" : "border-white/8"}`}>
        
        {/* Permanent Portal Tour utility for active clients */}
        {!isOnboardingOrPreSale && onStartTour && (
          <button
            onClick={onStartTour}
            title="Start Portal Tour"
            className={`w-full flex items-center gap-2 rounded-xl transition-all text-xs font-semibold py-2 px-3
              ${isLight 
                ? "text-emerald-800 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25" 
                : "text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 shadow-xs"}
              ${isCollapsed && !mobile ? "p-2 justify-center w-8 h-8 mx-auto shrink-0" : ""}`}
          >
            <RotateCcw className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            {(!isCollapsed || mobile) && <span>Portal Tour</span>}
          </button>
        )}

        <div className={`flex ${isCollapsed && !mobile ? "flex-col items-center gap-2" : "items-center justify-between gap-2 px-1"}`}>
          <button
            onClick={onToggleTheme}
            title={isLight ? "Dark mode" : "Light mode"}
            className={`flex items-center gap-1.5 rounded-lg transition-colors duration-[3000ms] ease-in-out text-xs overflow-hidden
              ${isLight ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100" : "text-white/40 hover:text-white/70"}
              ${isCollapsed && !mobile ? "p-2 justify-center" : "px-2.5 py-1.5"}`}
          >
            <div className="relative w-3.5 h-3.5 overflow-hidden shrink-0">
              <Sun className={`absolute inset-0 h-3.5 w-3.5 text-amber-500 transition-all duration-[3000ms] ease-in-out transform ${
                isLight 
                  ? "translate-y-0 rotate-0 scale-100 opacity-100" 
                  : "translate-y-4 -rotate-90 scale-50 opacity-0"
              }`} />
              <Moon className={`absolute inset-0 h-3.5 w-3.5 text-indigo-500 transition-all duration-[3000ms] ease-in-out transform ${
                !isLight 
                  ? "translate-y-0 rotate-0 scale-100 opacity-100" 
                  : "-translate-y-4 rotate-90 scale-50 opacity-0"
              }`} />
            </div>
            {(!isCollapsed || mobile) && <span>{isLight ? "Dark" : "Light"}</span>}
          </button>

          {isWorkspace && (
            <button
              onClick={() => setLocation("/projects")}
              title="Back to CRM"
              className={`flex items-center gap-1.5 rounded-lg transition-colors text-xs font-semibold
                ${isLight 
                  ? "text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25" 
                  : "text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 hover:shadow-[0_0_8px_rgba(250,204,21,0.2)] border border-amber-400/20"}
                ${isCollapsed && !mobile ? "p-2 justify-center w-8 h-8 shrink-0" : "px-2 py-1.5"}`}
            >
              <Home className="h-3.5 w-3.5 shrink-0" />
              {(!isCollapsed || mobile) && <span>Back to CRM</span>}
            </button>
          )}

          <button
            onClick={onLogout}
            title="Logout"
            className={`flex items-center gap-1.5 rounded-lg transition-colors text-xs
              ${isLight ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100" : "text-white/40 hover:text-red-400"}
              ${isCollapsed && !mobile ? "p-2 justify-center" : "px-2.5 py-1.5"}`}
          >
            <LogOut className={`h-3.5 w-3.5 ${isLight ? "text-red-500" : "text-red-400"}`} />
            {(!isCollapsed || mobile) && <span>Logout</span>}
          </button>
        </div>

        {/* ── CLIENT NAME AT BOTTOM ── */}
        {(!isCollapsed || mobile) && (
          <div className="px-1 pt-1">
            <p className={`text-xs font-semibold truncate ${isLight ? "text-slate-800" : "text-white/80"}`}>
              {displayName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

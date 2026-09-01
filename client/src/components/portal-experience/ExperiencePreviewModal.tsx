import React, { useState, useEffect } from "react";
import { JourneyStage, SampleClientPersona } from "./types";
import { SAMPLE_CLIENT_PERSONAS, INITIAL_JOURNEY_STAGES } from "./journeyData";
import { InteractivePageIdPill } from "./InteractivePageIdPill";
import { ClientPortalSidebar } from "@/components/ClientPortalSidebar";
import { DiscoveryCallExperience } from "@/components/portal/onboarding/DiscoveryCallExperience";
import { YourJourneyExperience } from "@/components/portal/onboarding/YourJourneyExperience";
import { ChooseSupportExperience } from "@/components/portal/onboarding/ChooseSupportExperience";
import { AgreementsExperience } from "@/components/portal/onboarding/AgreementsExperience";
import { StudentSetupExperience } from "@/components/portal/onboarding/StudentSetupExperience";
import { UploadRecordsExperience } from "@/components/portal/onboarding/UploadRecordsExperience";
import { AdvocacyIntakeExperience } from "@/components/portal/onboarding/AdvocacyIntakeExperience";
import { ExplorePortalExperience } from "@/components/portal/onboarding/ExplorePortalExperience";
import { TourDiscoveryCard } from "@/components/portal/onboarding/TourDiscoveryCard";
import { LockedModulePreview } from "@/components/portal/onboarding/LockedModulePreview";
import { RenewalListingExperience } from "@/components/portal/onboarding/RenewalListingExperience";
import { ClientStage, TOUR_MODULES } from "@/components/portal/portalModuleRegistry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  Laptop, 
  Tablet, 
  Smartphone, 
  Calendar, 
  Clock, 
  Video, 
  Shield, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Compass, 
  CheckCircle2, 
  FileText, 
  Users, 
  FolderOpen, 
  MessageSquare, 
  Scale, 
  Info, 
  ChevronRight, 
  GraduationCap, 
  PenTool, 
  UploadCloud, 
  ClipboardList, 
  X, 
  Maximize2, 
  Minimize2, 
  Menu,
  CheckSquare,
  DollarSign,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";

interface ExperiencePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStage: JourneyStage | null;
}

type DeviceMode = "full" | "tablet" | "mobile";

export function ExperiencePreviewModal({
  open,
  onOpenChange,
  selectedStage
}: ExperiencePreviewModalProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("full");
  const [isBarCollapsed, setIsBarCollapsed] = useState<boolean>(false);
  const [simulatedStageIndex, setSimulatedStageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("discovery-call");
  const [previewTheme, setPreviewTheme] = useState<"navy" | "blue">("navy");
  const [completedSteps, setCompletedSteps] = useState<string[]>(["discovery-call"]);

  // Exploration / Tour State inside Simulator (Auto-started with 1 of 6 explored)
  const [isExplorationActive, setIsExplorationActive] = useState<boolean>(true);
  const [exploredTourIds, setExploredTourIds] = useState<string[]>(["explore-portal"]);
  const [acknowledgedTourIntros, setAcknowledgedTourIntros] = useState<string[]>([]);

  // Synchronize when selectedStage changes from parent
  useEffect(() => {
    if (selectedStage) {
      const idx = INITIAL_JOURNEY_STAGES.findIndex(s => s.id === selectedStage.id || s.pageId === selectedStage.pageId);
      if (idx !== -1) {
        setSimulatedStageIndex(idx);
      }
    }
  }, [selectedStage]);

  // Update active tab when simulated stage changes
  useEffect(() => {
    const stage = INITIAL_JOURNEY_STAGES[simulatedStageIndex] || INITIAL_JOURNEY_STAGES[0];
    switch (stage.stepNumber) {
      case "01":
      case "02":
        setActiveTab("discovery-call");
        break;
      case "03":
      case "04":
      case "05":
      case "06":
        setActiveTab("choose-support");
        break;
      case "07":
      case "08":
        setActiveTab("agreements");
        break;
      case "09":
        setActiveTab("student-setup");
        break;
      case "10":
        setActiveTab("upload-records");
        break;
      case "11":
        setActiveTab("advocacy-intake");
        break;
      case "12":
      case "13":
      case "14":
        setActiveTab("compass");
        break;
      case "15":
        setActiveTab("renewal");
        break;
      default:
        setActiveTab("discovery-call");
    }
  }, [simulatedStageIndex]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const currentStage = INITIAL_JOURNEY_STAGES[simulatedStageIndex] || INITIAL_JOURNEY_STAGES[0];
  const currentPageId = currentStage.pageId;
  const currentStageName = currentStage.name;

  // Map stepNumber to ClientStage
  const getMappedClientStage = (): ClientStage => {
    const step = parseInt(currentStage.stepNumber, 10);
    if (step <= 2) return "DISCOVERY_SCHEDULED";
    if (step <= 6) return "DISCOVERY_COMPLETED";
    if (step <= 11) return "ONBOARDING";
    if (step <= 13) return "ACTIVE";
    if (step === 14) return "CLOSING";
    if (step === 15) return "ACTIVE";
    return "CLOSING";
  };

  const clientStage = getMappedClientStage();
  const displayName = "Sarah Jenkins";

  const getContainerWidth = () => {
    switch (deviceMode) {
      case "mobile":
        return "max-w-[440px] mx-auto border-x border-white/10 shadow-2xl h-full flex flex-col bg-[#040C16] overflow-hidden";
      case "tablet":
        return "max-w-[900px] mx-auto border-x border-white/10 shadow-2xl h-full flex flex-col bg-[#040C16] overflow-hidden";
      case "full":
      default:
        return "w-full h-full flex flex-col bg-[#040C16] overflow-hidden";
    }
  };

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => Array.from(new Set([...prev, stepId])));
  };

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    if (isExplorationActive && TOUR_MODULES.some(m => m.id === tabId) && !exploredTourIds.includes(tabId)) {
      setExploredTourIds(prev => [...prev, tabId]);
      toast.success(`Explored ${tabId}! Progress updated.`);
    }
  };

  const currentTourModule = TOUR_MODULES.find(m => m.id === activeTab);
  const showDiscoveryBanner = isExplorationActive && !!currentTourModule && !acknowledgedTourIntros.includes(activeTab);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* ── TOP ADMIN FLOATING OVERLAY BAR ─────────────────────────────────── */}
      <header className={`border-b border-white/15 bg-[#071422]/95 backdrop-blur-md shadow-lg transition-all duration-200 z-50 shrink-0 ${isBarCollapsed ? "py-1.5 px-4" : "py-2.5 px-6"}`}>
        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Brand + Stage Info + Page ID */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 hidden sm:inline font-mono">
                PG-023 Client Portal Simulator
              </span>
            </div>

            {/* Signature # Page ID Badge */}
            <InteractivePageIdPill
              pageId={currentPageId}
              name={currentStageName}
              showName={!isBarCollapsed}
              className="bg-amber-400/10 border-amber-400/40 text-amber-300 font-bold text-xs"
            />

            {!isBarCollapsed && (
              <Badge variant="outline" className="hidden lg:inline-flex text-[10px] font-mono text-white/70 border-white/20 bg-white/5">
                Stage {currentStage.stepNumber} of {INITIAL_JOURNEY_STAGES.length} · {currentStage.category}
              </Badge>
            )}
          </div>

          {/* Center: Stage Switcher + Viewport Switcher */}
          <div className="flex items-center gap-3">
            {/* Stage Selector */}
            <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/15 rounded-lg px-2.5 py-1">
              <span className="text-[11px] font-semibold text-white/50 hidden sm:inline">
                Simulated Stage:
              </span>
              <select
                value={simulatedStageIndex}
                onChange={(e) => setSimulatedStageIndex(Number(e.target.value))}
                className="text-xs font-bold bg-transparent border-0 focus:ring-0 text-white cursor-pointer pr-1"
              >
                {INITIAL_JOURNEY_STAGES.map((s, idx) => (
                  <option key={s.id} value={idx} className="bg-[#071422] text-white">
                    {s.stepNumber} · {s.name} ({s.pageId})
                  </option>
                ))}
              </select>
            </div>

            {/* Viewport Width Selector */}
            <div className="hidden sm:flex items-center gap-1 bg-white/[0.05] border border-white/15 rounded-lg p-1">
              <Button
                size="sm"
                variant={deviceMode === "full" ? "default" : "ghost"}
                onClick={() => setDeviceMode("full")}
                className={`h-7 px-2.5 text-xs font-semibold gap-1 ${deviceMode === "full" ? "bg-amber-400 text-[#071422] font-bold" : "text-white/60 hover:text-white"}`}
                title="Full Client Screen"
              >
                <Laptop className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Full Screen</span>
              </Button>
              <Button
                size="sm"
                variant={deviceMode === "tablet" ? "default" : "ghost"}
                onClick={() => setDeviceMode("tablet")}
                className={`h-7 px-2 text-xs font-semibold ${deviceMode === "tablet" ? "bg-amber-400 text-[#071422] font-bold" : "text-white/60 hover:text-white"}`}
                title="Tablet Viewport"
              >
                <Tablet className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={deviceMode === "mobile" ? "default" : "ghost"}
                onClick={() => setDeviceMode("mobile")}
                className={`h-7 px-2 text-xs font-semibold ${deviceMode === "mobile" ? "bg-amber-400 text-[#071422] font-bold" : "text-white/60 hover:text-white"}`}
                title="Mobile Viewport"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Right: Bar Minimize & Exit */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsBarCollapsed(!isBarCollapsed)}
              className="h-8 w-8 p-0 text-white/50 hover:text-white hidden md:flex"
              title={isBarCollapsed ? "Expand Admin Bar" : "Minimize Admin Bar"}
            >
              {isBarCollapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </Button>

            <Button
              size="sm"
              variant="default"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-bold gap-1.5 bg-red-600/90 hover:bg-red-600 text-white shadow-md"
              title="Close preview (or press ESC)"
            >
              <X className="h-4 w-4" />
              <span>Exit Preview</span>
              <kbd className="hidden lg:inline text-[9px] bg-white/20 px-1 py-0.5 rounded font-mono">
                ESC
              </kbd>
            </Button>
          </div>
        </div>
      </header>

      {/* ── SIMULATED PG-023 CLIENT PORTAL APP (SIDEBAR + WORKSPACE VIEWPORT) ── */}
      <div className="flex-1 overflow-hidden bg-[#040C16] relative flex justify-center">
        <div className={getContainerWidth()}>
          
          {/* Main 2-Column Portal App Shell */}
          <div className="flex-1 flex overflow-hidden w-full h-full">
            
            {/* Left Persistent Sidebar (PG-023) */}
            <div className="hidden md:flex flex-col h-full shrink-0">
              <ClientPortalSidebar
                activeTab={activeTab}
                onSelectTab={handleTabSelect}
                displayName={displayName}
                theme={previewTheme}
                onToggleTheme={() => setPreviewTheme(prev => prev === "navy" ? "blue" : "navy")}
                onLogout={() => toast.info("Logout simulated")}
                clientStage={clientStage}
                completedOnboardingSteps={completedSteps}
                isExplorationActive={isExplorationActive}
                exploredTourIds={exploredTourIds}
                onStartTour={() => {
                  setIsExplorationActive(true);
                  setActiveTab("explore-portal");
                }}
                onEndExploration={() => setIsExplorationActive(false)}
              />
            </div>

            {/* Right Portal Workspace Viewport (PG-023) */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#040C16]">
              
              {/* Top Header Bar inside Portal */}
              <div className="h-14 border-b border-white/10 bg-[#06172F] px-6 flex items-center justify-between shrink-0 relative z-30 overflow-hidden">
                <img
                  src="/sextant-header-bg.png"
                  alt="Navigational Sextant & Chart"
                  className="absolute inset-0 w-full h-full object-cover object-[right_bottom] sm:object-[center_bottom] pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#06172F]/80 via-[#06172F]/30 to-transparent pointer-events-none" />
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight font-serif">
                      Liam Jenkins
                    </p>
                    <p className="text-xs font-medium text-amber-400/90 mt-0.5">
                      Welcome, {displayName || "Jackson T."}
                    </p>
                  </div>
                </div>

                {/* ── Middle: Student Switcher Pill ── */}
                <div className="hidden lg:flex items-center rounded-2xl border border-[#F5B544]/60 bg-[#07152B] px-3 py-1 gap-2.5 shadow-md">
                  <div className="w-7 h-7 rounded-full border border-[#F5B544] bg-[#0C1F3D] text-[#F5B544] font-bold text-[10px] flex items-center justify-center shrink-0">
                    LJ
                  </div>
                  <div className="space-y-0 text-left">
                    <p className="text-xs font-bold text-white leading-tight">Liam Jenkins</p>
                    <p className="text-[9px] text-blue-200/70 leading-tight">Student ID: 84257 · Current Student</p>
                  </div>
                  <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                    <ArrowRight className="h-3 w-3 text-[#F5B544]" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className="bg-amber-400/15 text-amber-300 border-amber-400/30 text-[10px] font-semibold py-0.5 px-2.5">
                    {currentStage.name}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info("Scheduling simulated")}
                    className="h-7 text-[11px] font-semibold border-white/15 text-white/80 hover:bg-white/5 gap-1.5"
                  >
                    <Calendar className="h-3 w-3 text-amber-400" />
                    Schedule Meeting
                  </Button>
                </div>
              </div>

              {/* Viewport Content Area */}
              <div className={`flex-1 overflow-y-auto bg-[#040C16] relative pb-28 ${["01", "02"].includes(currentStage.stepNumber) && activeTab !== "explore-portal" ? "p-0" : "p-4 md:p-6 lg:p-8"}`}>
                
                {/* Non-Blocking Tour Contextual Banner */}
                {showDiscoveryBanner && currentTourModule && (
                  <TourDiscoveryCard
                    moduleId={activeTab}
                    title={currentTourModule.tourTitle || currentTourModule.name}
                    description={currentTourModule.tourDescription || ""}
                    onDismiss={() => setAcknowledgedTourIntros(prev => [...prev, activeTab])}
                    onFinishTourEarly={() => setIsExplorationActive(false)}
                    exploredCount={exploredTourIds.length}
                    totalCount={TOUR_MODULES.length}
                  />
                )}

                {/* ── Explore Your Portal Module ── */}
                {activeTab === "explore-portal" && (
                  <ExplorePortalExperience
                    onContinueExploring={() => {
                      setActiveTab("compass");
                      if (!exploredTourIds.includes("compass")) {
                        setExploredTourIds(prev => [...prev, "compass"]);
                      }
                    }}
                    onFinishTour={() => {
                      setIsExplorationActive(false);
                      toast.info("Exploration mode ended.");
                    }}
                    onNavigateTab={handleTabSelect}
                    exploredModuleIds={exploredTourIds}
                  />
                )}

                {/* ── STAGE 01 & 02: Discovery Inquiry Submitted / Discovery Call Scheduled (PG-027-S01 / PG-027-S02) ── */}
                {activeTab !== "explore-portal" && ["01", "02"].includes(currentStage.stepNumber) && (
                  <DiscoveryCallExperience
                    displayName={displayName}
                    upcomingAppointment={{
                      startTime: "2025-05-28T14:00:00.000Z",
                      location: "https://meet.google.com/waypoint-discovery"
                    }}
                    onNavigateTab={handleTabSelect}
                    onOpenScheduler={() => toast.info("Scheduler opened")}
                  />
                )}

                {/* ── STAGE 03 - 05: Discovery Completed & Support Selection / Checkout ── */}
                {activeTab !== "explore-portal" && ["03", "04", "05"].includes(currentStage.stepNumber) && (
                  <ChooseSupportExperience
                    onPaymentSuccess={() => {
                      setSimulatedStageIndex(5); // Advances to stage 06 (Welcome / Agreements)
                      handleStepComplete("choose-support");
                    }}
                    onNavigateTab={handleTabSelect}
                  />
                )}

                {/* ── STAGE 06 - 07: Representation Agreements ── */}
                {activeTab !== "explore-portal" && ["06", "07"].includes(currentStage.stepNumber) && (
                  <AgreementsExperience
                    onComplete={() => {
                      setSimulatedStageIndex(7); // Advances to stage 08 (Student Setup)
                      handleStepComplete("agreements");
                    }}
                    onNavigateTab={handleTabSelect}
                  />
                )}

                {/* ── STAGE 08: Student Setup Profile ── */}
                {activeTab !== "explore-portal" && currentStage.stepNumber === "08" && (
                  <StudentSetupExperience
                    onComplete={() => {
                      setSimulatedStageIndex(8); // Advances to stage 09 (Upload Records)
                      handleStepComplete("student-setup");
                    }}
                    onNavigateTab={handleTabSelect}
                  />
                )}

                {/* ── STAGE 09: Upload School Records ── */}
                {activeTab !== "explore-portal" && currentStage.stepNumber === "09" && (
                  <UploadRecordsExperience
                    onComplete={() => {
                      setSimulatedStageIndex(9); // Advances to stage 10 (Advocacy Intake)
                      handleStepComplete("upload-records");
                    }}
                    onNavigateTab={handleTabSelect}
                  />
                )}

                {/* ── STAGE 10: Advocacy Priorities Intake ── */}
                {activeTab !== "explore-portal" && currentStage.stepNumber === "10" && (
                  <AdvocacyIntakeExperience
                    onComplete={() => {
                      setSimulatedStageIndex(10); // Advances to stage 11 (Active Representation)
                      handleStepComplete("advocacy-intake");
                    }}
                    onNavigateTab={handleTabSelect}
                  />
                )}

                {/* ── STAGE 11 - 12: Active Advocacy & Case Compass ── */}
                {activeTab !== "explore-portal" && ["11", "12"].includes(currentStage.stepNumber) && (
                  <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
                    <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active Representation
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                          Liam's Case Compass & Representation Command Center
                        </h1>
                        <p className="text-sm text-white/70 mt-1">
                          Live tracking of IEP milestones, meeting talking points, and advocate communications.
                        </p>
                      </div>
                      <Button
                        onClick={() => toast.info("Opening message composer...")}
                        className="gap-2 bg-amber-400 hover:bg-amber-500 text-[#071422] font-bold text-xs px-5 shadow-md self-start sm:self-auto"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message Byron
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-white/15 bg-white/[0.02] p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <Compass className="h-4 w-4 text-amber-400" />
                          Case Compass Status
                        </div>
                        <p className="text-xs text-white/60">Stage 3: Evidence Gathering & IEP Proposal Formulation</p>
                        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/80 leading-relaxed">
                          Byron is auditing the 2024 Psycho-Educational Evaluation and formulating proposed amendments to Reading Fluency Goal #3.
                        </div>
                      </Card>

                      <Card className="border-white/15 bg-white/[0.02] p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <Calendar className="h-4 w-4 text-amber-400" />
                          Upcoming IEP Table Meeting
                        </div>
                        <p className="text-base font-extrabold text-white">Thursday, October 8, 2026 @ 10:00 AM</p>
                        <p className="text-xs text-white/60">
                          Pre-meeting agenda and talking points will be delivered 48 hours prior to the session.
                        </p>
                      </Card>
                    </div>
                  </div>
                )}

                {/* ── STAGE 13: Case Closing & Document Archive ── */}
                {activeTab !== "explore-portal" && currentStage.stepNumber === "13" && (
                  <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                    <div className="border-b border-white/10 pb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 text-xs font-semibold mb-3 border border-teal-500/20">
                        <Shield className="h-3.5 w-3.5" />
                        Case Resolution & Permanent Archive
                      </div>
                      <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                        Advocacy Resolution Archive for Liam Jenkins
                      </h1>
                      <p className="text-sm text-white/70 mt-1">
                        Your representation case has concluded with an amended and finalized IEP. Your documents remain permanently accessible in your R2 vault.
                      </p>
                    </div>

                    <Card className="border-white/15 bg-white/[0.02] p-6 rounded-2xl space-y-4">
                      <h3 className="text-base font-bold text-white">Download Complete Student Records Bundle</h3>
                      <p className="text-xs text-white/60 leading-relaxed">
                        Download a single encrypted ZIP bundle containing all IEP drafts, formal school requests, psych evaluation notes, and meeting recordings.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => toast.success("Downloading Liam_Jenkins_2026_IEP_Bundle.zip")}
                        className="gap-2 text-xs font-bold border-white/20 text-white hover:bg-white/10"
                      >
                        <FolderOpen className="h-4 w-4 text-amber-400" />
                        Download 2026 IEP Records Bundle (.ZIP)
                      </Button>
                    </Card>
                  </div>
                )}

                {/* ── STAGE 14: Annual Advocacy Renewal & Retainer Listing ── */}
                {(activeTab === "renewal" || (activeTab !== "explore-portal" && currentStage.stepNumber === "14")) && (
                  <div className="max-w-6xl mx-auto py-2">
                    <RenewalListingExperience
                      studentName="Liam Jenkins"
                      studentGrade="5th Grade → 6th Grade (Middle School Transition)"
                      currentTierName="Full IEP Representation (2025–2026)"
                      expirationDate="September 15, 2026"
                      daysRemaining={16}
                      onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── FLOATING BOTTOM-RIGHT # PAGE ID BADGE ─────────────────────────── */}
        <div className="fixed bottom-5 right-6 z-50">
          <InteractivePageIdPill
            pageId={currentPageId}
            name={currentStageName}
            showName={true}
            size="default"
            className="shadow-2xl border-amber-400/60 bg-[#071422]/95 backdrop-blur-md px-3.5 py-1.5 font-bold text-amber-300 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

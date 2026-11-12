import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import { broadcastPageId } from "@/lib/pageIdRegistry";
import {
  LeadStageStrip,
  type WorkspaceStageTab,
} from "@/components/leads/LeadStageStrip";
import {
  LeadTunerConsole,
  TUNER_STAGES,
} from "@/components/leads/LeadTunerConsole";
import { LeadContextDrawers } from "@/components/leads/LeadContextDrawers";
import { LeadInquiryUnit } from "@/components/leads/LeadInquiryUnit";
import { LeadDiscoveryUnit } from "@/components/leads/LeadDiscoveryUnit";
import { LeadDecisionUnit } from "@/components/leads/LeadDecisionUnit";
import { LeadOnboardingUnit } from "@/components/leads/LeadOnboardingUnit";
import { NewServiceInquiryModal } from "@/components/leads/NewServiceInquiryModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Users,
  History,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  Loader2,
  PhoneCall,
  MoreHorizontal,
  Send,
  RotateCcw,
  Sparkles,
} from "lucide-react";

type DiscoverySubFilter = "all" | "today" | "upcoming" | "needs_followup";
type DecisionSubFilter = "active" | "closed";
type OnboardingSubFilter = "active" | "completed";
type NewLeadsSubFilter = "all" | "link_sent" | "needs_followup";

function parseLeadRoute(pathname: string, search: string): {
  leadId: number | null;
  stageParam: WorkspaceStageTab | null;
  sessionMode: boolean;
} {
  const params = new URLSearchParams(search || "");
  const queryLeadId = params.get("leadId") ? Number(params.get("leadId")) : null;
  const queryStage = params.get("stage")?.toLowerCase() || null;
  const querySession =
    params.get("session") === "1" || params.get("mode") === "session";

  const clean = pathname.replace(/\/+$/, "");
  const match = clean.match(
    /^\/leads\/(\d+)(?:\/([a-z-]+))?(?:\/([a-z-]+))?$/i
  );
  if (match) {
    const id = Number(match[1]);
    const seg1 = (match[2] || "").toLowerCase();
    const seg2 = (match[3] || "").toLowerCase();

    let stageParam: WorkspaceStageTab | null = null;
    if (seg1 === "inquiry" || seg1 === "new") stageParam = "inquiry";
    else if (seg1 === "discovery" || seg1 === "discovery-session")
      stageParam = "discovery";
    else if (seg1 === "decision") stageParam = "decision";
    else if (seg1 === "onboarding" || seg1 === "active")
      stageParam = "onboarding";

    const isSession =
      seg1 === "discovery-session" ||
      (seg1 === "discovery" && seg2 === "session") ||
      querySession;

    return {
      leadId: isNaN(id) ? null : id,
      stageParam,
      sessionMode: isSession,
    };
  }

  if (queryLeadId && !isNaN(queryLeadId)) {
    let stageParam: WorkspaceStageTab | null = null;
    if (queryStage === "inquiry" || queryStage === "new") stageParam = "inquiry";
    else if (queryStage === "discovery") stageParam = "discovery";
    else if (queryStage === "decision") stageParam = "decision";
    else if (queryStage === "onboarding") stageParam = "onboarding";
    return {
      leadId: queryLeadId,
      stageParam,
      sessionMode: querySession,
    };
  }

  let topStageParam: WorkspaceStageTab | null = null;
  if (queryStage === "inquiry" || queryStage === "new") topStageParam = "inquiry";
  else if (queryStage === "discovery") topStageParam = "discovery";
  else if (queryStage === "decision") topStageParam = "decision";
  else if (queryStage === "onboarding") topStageParam = "onboarding";

  return { leadId: null, stageParam: topStageParam, sessionMode: false };
}

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function Leads() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const searchStr = typeof window !== "undefined" ? window.location.search : "";
  const utils = trpc.useUtils();

  const routeState = useMemo(
    () => parseLeadRoute(location.split("?")[0], searchStr),
    [location, searchStr]
  );

  // Selected Radio Stage (`New Leads -> Discovery -> Decision -> Onboarding`)
  const [selectedRadioStage, setSelectedRadioStage] = useState<WorkspaceStageTab>(
    routeState.stageParam || "inquiry"
  );

  // Stage-specific compact sub-filters (preserved when opening a lead and returning)
  const [newLeadsFilter, setNewLeadsFilter] = useState<NewLeadsSubFilter>("all");
  const [discoveryFilter, setDiscoveryFilter] =
    useState<DiscoverySubFilter>("all");
  const [decisionFilter, setDecisionFilter] =
    useState<DecisionSubFilter>("active");
  const [onboardingFilter, setOnboardingFilter] =
    useState<OnboardingSubFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");

  const [newInquiryOpen, setNewInquiryOpen] = useState(false);
  const [openDrawer, setOpenDrawer] = useState<"contacts" | "history" | null>(
    null
  );
  const [viewedStageOverride, setViewedStageOverride] =
    useState<WorkspaceStageTab | null>(null);
  const [isSessionMode, setIsSessionMode] = useState<boolean>(
    routeState.sessionMode
  );

  // Sync URL ?newClient=1 or ?newInquiry=1
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("newClient") === "1" || params.get("newInquiry") === "1") {
        setNewInquiryOpen(true);
      }
    }
  }, [location]);

  // Hydrated leads list for Radio Counts & Stage Lists
  const leadsQuery = trpc.leads.listHydrated.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const hydratedLeads = leadsQuery.data || [];

  // Resolve effective leadId
  const effectiveLeadId = useMemo(() => {
    if (routeState.leadId === null) return null;
    if (routeState.leadId === 0 && hydratedLeads.length > 0) {
      return hydratedLeads[0].id;
    }
    return routeState.leadId > 0 ? routeState.leadId : null;
  }, [routeState.leadId, hydratedLeads]);

  // Hydrated workspace for a single opened lead
  const workspaceQuery = trpc.leads.getWorkspace.useQuery(
    { leadId: effectiveLeadId || 0 },
    {
      enabled: Boolean(effectiveLeadId && effectiveLeadId > 0),
    }
  );
  const workspace = workspaceQuery.data;

  // Contextual quick actions from the stage list
  const updateInquiryMutation = trpc.leads.updateInquiry.useMutation({
    onSuccess: (_, vars) => {
      utils.leads.listHydrated.invalidate();
      utils.leads.getWorkspace.invalidate();
      if (vars.sendSchedulingLink) {
        toast.success("Scheduling link sent · Status updated in New Leads");
      } else if (vars.recordContactAttempt) {
        toast.success("Contact attempt recorded");
      } else if (vars.progressDirectlyToDecision) {
        toast.success("Lead progressed directly to Decision");
      }
    },
    onError: (err) => toast.error(err.message || "Could not update lead"),
  });

  const reopenDecisionMutation = trpc.leads.saveDecision.useMutation({
    onSuccess: () => {
      utils.leads.listHydrated.invalidate();
      utils.leads.getWorkspace.invalidate();
      toast.success("Lead reopened in Decision stage");
    },
    onError: (err) => toast.error(err.message || "Could not reopen lead"),
  });

  const createTestLeadMutation = trpc.leads.createInquiry.useMutation({
    onSuccess: async (res, vars) => {
      setSelectedRadioStage("inquiry");
      setNewLeadsFilter("all");
      setSearchQuery("");
      if (effectiveLeadId) {
        setLocation("/leads");
      }
      await Promise.all([
        utils.leads.list.invalidate(),
        utils.leads.listHydrated.invalidate(),
        utils.contacts.list.invalidate(),
        leadsQuery.refetch(),
      ]);
      const parentFull = `${vars.parent.firstName} ${vars.parent.lastName || ""}`.trim();
      toast.success(`Test lead added: ${parentFull} · Ready in New Leads`, {
        action: {
          label: "Open Lead",
          onClick: () => setLocation(`/leads/${res.leadId}/inquiry`),
        },
      });
    },
    onError: (err) => toast.error(err.message || "Could not add test lead"),
  });

  const handleAddTestLead = () => {
    const samples = [
      {
        firstName: "Eleanor",
        lastName: "Vance",
        studentFirst: "Leo",
        studentGrade: "4th Grade",
        schoolName: "Morningside Elementary",
        iepOr504: "IEP",
        concerns:
          "IEP reading goals have not been updated in two years; requesting specialized reading intervention and updated present levels.",
        desiredOutcome:
          "Comprehensive IEP goal overhaul, Wilson reading support, and advocacy at upcoming annual review.",
      },
      {
        firstName: "Marcus",
        lastName: "Sterling",
        studentFirst: "Maya",
        studentGrade: "7th Grade",
        schoolName: "Inman Middle School",
        iepOr504: "IEP",
        concerns:
          "Executive functioning accommodations are not being implemented consistently across core classes.",
        desiredOutcome:
          "Enforce classroom accommodations, update Behavior Intervention Plan, and establish weekly progress tracking.",
      },
      {
        firstName: "Clara",
        lastName: "Kensington",
        studentFirst: "Noah",
        studentGrade: "2nd Grade",
        schoolName: "Springdale Park Elementary",
        iepOr504: "504",
        concerns:
          "Currently on a 504 Plan for dyslexia and speech-language, but struggling significantly with decoding and written expression.",
        desiredOutcome:
          "Transition from 504 Plan to full IEP eligibility with an Independent Educational Evaluation (IEE).",
      },
      {
        firstName: "Julian",
        lastName: "Mercer",
        studentFirst: "Caleb",
        studentGrade: "5th Grade",
        schoolName: "Peachtree Charter",
        iepOr504: "IEP",
        concerns:
          "School proposed reducing speech and occupational therapy service minutes without updated evaluation data.",
        desiredOutcome:
          "Prevent reduction of related service minutes and request Prior Written Notice review before placement changes.",
      },
      {
        firstName: "Hannah",
        lastName: "Bennett",
        studentFirst: "Eli",
        studentGrade: "9th Grade",
        schoolName: "Midtown High School",
        iepOr504: "IEP",
        concerns:
          "Transitioning to high school schedule; extended time and assistive technology supports were omitted from the draft IEP.",
        desiredOutcome:
          "Restore assistive technology and testing accommodations and build a strong high school transition plan.",
      },
    ];

    const pick = samples[hydratedLeads.length % samples.length];
    const randDigits = String(1000 + Math.floor(Math.random() * 9000));
    const uniqueTag = Math.floor(100 + Math.random() * 900);

    createTestLeadMutation.mutate({
      forceCreateSeparate: true,
      parent: {
        firstName: pick.firstName,
        lastName: `${pick.lastName}`,
        phone: `(404) 555-${randDigits}`,
        email: `${pick.firstName.toLowerCase()}.${pick.lastName.toLowerCase()}${uniqueTag}@example.com`,
        preferredContactMethod: "Phone",
        availability: "Weekday mornings (Eastern Time)",
        city: "Atlanta",
        state: "GA",
      },
      students: [
        {
          firstName: pick.studentFirst,
          lastName: pick.lastName,
          gradeLevel: pick.studentGrade,
          schoolName: pick.schoolName,
          iepOr504: pick.iepOr504,
        },
      ],
      concerns: pick.concerns,
      desiredOutcome: pick.desiredOutcome,
      source: "Test Lead Generator (PG-003)",
      callNotes: "Sample family inquiry created from Lead Center three-dot menu for workflow testing.",
    });
  };

  // Sync viewed stage override when route changes
  useEffect(() => {
    setViewedStageOverride(routeState.stageParam);
    setIsSessionMode(routeState.sessionMode);
    setOpenDrawer(null);
    if (routeState.stageParam) {
      setSelectedRadioStage(routeState.stageParam);
    }
  }, [effectiveLeadId, routeState.stageParam, routeState.sessionMode]);

  // Determine the current persisted stage and the currently viewed stage tab when a lead is open
  const persistedStage:
    | "inquiry"
    | "discovery"
    | "decision"
    | "onboarding"
    | "active" = workspace?.journey?.stage || "inquiry";

  const defaultTabForPersisted: WorkspaceStageTab =
    persistedStage === "active" ? "onboarding" : persistedStage;

  const activeStageTab: WorkspaceStageTab = effectiveLeadId
    ? viewedStageOverride || routeState.stageParam || defaultTabForPersisted
    : selectedRadioStage;

  // Keep radio stage aligned when workspace finishes loading
  useEffect(() => {
    if (effectiveLeadId && workspace?.journey?.stage) {
      const targetTab: WorkspaceStageTab =
        viewedStageOverride ||
        routeState.stageParam ||
        (workspace.journey.stage === "active"
          ? "onboarding"
          : workspace.journey.stage);
      setSelectedRadioStage(targetTab);
    }
  }, [
    effectiveLeadId,
    workspace?.journey?.stage,
    viewedStageOverride,
    routeState.stageParam,
  ]);

  // Broadcast accurate Page ID (`PG-003`, `PG-003-INQ`, `PG-003-DSC`, `PG-003-SES`, `PG-003-DEC`, `PG-003-ONB`)
  useEffect(() => {
    if (!effectiveLeadId) {
      if (selectedRadioStage === "discovery") {
        broadcastPageId("PG-003-DSC");
      } else if (selectedRadioStage === "decision") {
        broadcastPageId("PG-003-DEC");
      } else if (selectedRadioStage === "onboarding") {
        broadcastPageId("PG-003-ONB");
      } else if (routeState.stageParam === "inquiry") {
        broadcastPageId("PG-003-INQ");
      } else {
        broadcastPageId("PG-003");
      }
      return;
    }
    if (activeStageTab === "inquiry") {
      broadcastPageId("PG-003-INQ");
    } else if (activeStageTab === "discovery") {
      const inProg =
        isSessionMode || workspace?.journey?.discoveryState === "in_progress";
      broadcastPageId(inProg ? "PG-003-SES" : "PG-003-DSC");
    } else if (activeStageTab === "decision") {
      broadcastPageId("PG-003-DEC");
    } else if (activeStageTab === "onboarding") {
      broadcastPageId("PG-003-ONB");
    } else {
      broadcastPageId("PG-003");
    }
  }, [
    effectiveLeadId,
    selectedRadioStage,
    routeState.stageParam,
    activeStageTab,
    isSessionMode,
    workspace?.journey?.discoveryState,
  ]);

  // Tuning the radio changes which stage the advocate is viewing (never mutates a lead's stage)
  const handleTuneRadioStage = (stage: WorkspaceStageTab) => {
    setSelectedRadioStage(stage);
    if (effectiveLeadId) {
      // Return to the stage list for the newly tuned radio stage
      setLocation("/leads");
    }
  };

  // Navigating between stages inside an opened lead workspace
  const handleNavigateStage = (
    targetStage: WorkspaceStageTab,
    sessionMode: boolean = false
  ) => {
    setViewedStageOverride(targetStage);
    setSelectedRadioStage(targetStage);
    setIsSessionMode(sessionMode);
    if (effectiveLeadId) {
      if (targetStage === "discovery" && sessionMode) {
        setLocation(`/leads/${effectiveLeadId}/discovery/session`);
      } else {
        setLocation(`/leads/${effectiveLeadId}/${targetStage}`);
      }
    }
  };

  // Real Stage Counts for the Radio (active leads in each stage)
  const stageCounts = useMemo(() => {
    const counts = {
      inquiry: 0,
      discovery: 0,
      decision: 0,
      onboarding: 0,
      closedDecision: 0,
      completedOnboarding: 0,
    };
    for (const l of hydratedLeads) {
      if (l.stage === "active") {
        counts.completedOnboarding++;
        continue;
      }
      if (l.isClosed) {
        if (l.stage === "decision" || l.decisionChoice === "not_proceeding") {
          counts.closedDecision++;
        }
        continue;
      }
      if (l.stage === "inquiry") counts.inquiry++;
      else if (l.stage === "discovery") counts.discovery++;
      else if (l.stage === "decision") counts.decision++;
      else if (l.stage === "onboarding") counts.onboarding++;
    }
    return counts;
  }, [hydratedLeads]);

  // Stage-specific filtered & sorted leads for the working area below the radio
  const currentStageLeads = useMemo(() => {
    const now = new Date();
    const q = searchQuery.trim().toLowerCase();

    const matchesSearch = (l: any) => {
      if (!q) return true;
      const hay = [
        l.parentName,
        ...(l.studentNames || []),
        l.parentPhone,
        l.parentEmail,
        l.concerns,
        l.statusSummary,
        l.nextActionLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    };

    if (selectedRadioStage === "inquiry") {
      // Stage 1: New Leads — ALL leads in inquiry, newest first by default
      return hydratedLeads
        .filter((l: any) => {
          if (l.stage !== "inquiry" || l.isClosed) return false;
          if (newLeadsFilter === "link_sent" && !l.schedulingLinkSent)
            return false;
          if (newLeadsFilter === "needs_followup" && !l.isOverdue) return false;
          return matchesSearch(l);
        })
        .sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
    }

    if (selectedRadioStage === "discovery") {
      // Stage 2: Discovery — prioritize Today and Upcoming, surface past calls needing outcome
      return hydratedLeads
        .filter((l: any) => {
          if (l.stage !== "discovery" || l.isClosed) return false;
          const apptDate = l.discoveryCallDate
            ? new Date(l.discoveryCallDate)
            : null;
          const isValidAppt = apptDate && !isNaN(apptDate.getTime());
          const isToday = isValidAppt ? isSameCalendarDay(apptDate!, now) : false;
          const isPastNeedingOutcome =
            isValidAppt &&
            apptDate!.getTime() < now.getTime() &&
            !isToday &&
            l.discoveryOutcome !== "completed";
          const isNeedsFollowup =
            Boolean(l.isOverdue) ||
            isPastNeedingOutcome ||
            l.discoveryOutcome === "no_answer" ||
            l.discoveryOutcome === "reschedule_needed" ||
            l.discoveryOutcome === "follow_up_later";
          const isUpcoming =
            isValidAppt && apptDate!.getTime() >= now.getTime() && !isToday;

          if (discoveryFilter === "today" && !isToday) return false;
          if (discoveryFilter === "upcoming" && !isUpcoming) return false;
          if (discoveryFilter === "needs_followup" && !isNeedsFollowup)
            return false;
          return matchesSearch(l);
        })
        .sort((a: any, b: any) => {
          // Sort: Today first -> Past needing outcome / overdue -> Upcoming -> Others
          const getPriority = (l: any) => {
            const d = l.discoveryCallDate ? new Date(l.discoveryCallDate) : null;
            if (d && !isNaN(d.getTime())) {
              if (isSameCalendarDay(d, now)) return 1;
              if (d.getTime() < now.getTime() && l.discoveryOutcome !== "completed")
                return 2;
              if (d.getTime() >= now.getTime()) return 3;
            }
            if (l.isOverdue) return 2;
            return 4;
          };
          const pA = getPriority(a);
          const pB = getPriority(b);
          if (pA !== pB) return pA - pB;
          const tA = a.discoveryCallDate
            ? new Date(a.discoveryCallDate).getTime()
            : Infinity;
          const tB = b.discoveryCallDate
            ? new Date(b.discoveryCallDate).getTime()
            : Infinity;
          return tA - tB;
        });
    }

    if (selectedRadioStage === "decision") {
      // Stage 3: Decision — Active vs Closed (Declined)
      return hydratedLeads
        .filter((l: any) => {
          if (decisionFilter === "closed") {
            return (
              (l.stage === "decision" || l.decisionChoice === "not_proceeding") &&
              Boolean(l.isClosed) &&
              matchesSearch(l)
            );
          }
          return l.stage === "decision" && !l.isClosed && matchesSearch(l);
        })
        .sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
    }

    // Stage 4: Onboarding — Active vs Completed (Active Clients)
    return hydratedLeads
      .filter((l: any) => {
        if (onboardingFilter === "completed") {
          return l.stage === "active" && matchesSearch(l);
        }
        return l.stage === "onboarding" && !l.isClosed && matchesSearch(l);
      })
      .sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
  }, [
    hydratedLeads,
    selectedRadioStage,
    newLeadsFilter,
    discoveryFilter,
    decisionFilter,
    onboardingFilter,
    searchQuery,
  ]);

  const activeStageMeta =
    TUNER_STAGES.find((s) => s.id === selectedRadioStage) || TUNER_STAGES[0];

  return (
    <ScopedErrorBoundary moduleName="Lead Center">
      <div
        className="min-h-screen w-full bg-[#000820] text-[#F8FAFC] px-4 sm:px-6 lg:px-8 pt-4 pb-24 overflow-x-hidden [scrollbar-gutter:stable]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, rgba(22,45,92,0.42) 0%, rgba(0,8,32,0.98) 65%, #000820 100%)",
        }}
      >
        <div className="max-w-[1320px] mx-auto space-y-4">
          {/* ─── 1. EXISTING RADIO TUNER CONSOLE AT TOP OF LEAD CENTER ─── */}
          <LeadTunerConsole
            selectedStage={activeStageTab}
            onSelectStage={handleTuneRadioStage}
            stageCounts={{
              inquiry: stageCounts.inquiry,
              discovery: stageCounts.discovery,
              decision: stageCounts.decision,
              onboarding: stageCounts.onboarding,
            }}
            currentStageLeads={currentStageLeads}
            onManageForms={() => setLocation("/leads/forms")}
            onNewInquiry={() => setNewInquiryOpen(true)}
            onAddTestLead={handleAddTestLead}
            isAddingTestLead={createTestLeadMutation.isPending}
            onOpenLead={(leadId, stage) =>
              setLocation(`/leads/${leadId}/${stage}`)
            }
            isClientOpen={Boolean(effectiveLeadId)}
            openedClientName={workspace?.lead?.parentName}
          />

          {/* ─── 2. SINGLE FOCUSED STAGE WORKING AREA DIRECTLY BELOW RADIO ─── */}
          {effectiveLeadId ? (
            /* ── IN-CONTEXT OPENED LEAD WORKSPACE (FUTURISTIC SCI-FI HUD CONTAINER) ── */
            <div
              className="relative rounded-2xl border border-cyan-400/45 bg-[#040B1B]/95 p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_32px_rgba(34,211,238,0.14),inset_0_0_32px_rgba(56,189,248,0.06)] space-y-5 overflow-hidden"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at 50% 0%, rgba(14, 116, 144, 0.16) 0%, transparent 65%), linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px)",
                backgroundSize: "100% 100%, 28px 28px, 28px 28px",
              }}
              data-testid="lead-stage-in-context-workspace"
            >
              {/* Sci-Fi Top Laser Filament & 4 Tactical Corner Brackets */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-12 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_12px_#22d3ee]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-sm"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80 rounded-tr-sm"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80 rounded-bl-sm"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80 rounded-br-sm"
              />

              {workspaceQuery.isLoading || !workspace ? (
                <div className="rounded-2xl border border-cyan-400/30 bg-[#061229]/90 p-10 flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-300" />
                  <span className="text-base font-mono text-cyan-100">
                    INITIALIZING LEAD DETAILS PROFILE...
                  </span>
                </div>
              ) : (
                <>
                  {/* Top Lead Details Profile · Futuristic Command Header */}
                  <div className="relative rounded-xl border border-cyan-400/35 bg-gradient-to-r from-[#07152E]/95 via-[#091B3A]/95 to-[#061126]/95 p-4 sm:p-5 shadow-[0_12px_32px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(103,232,249,0.18)] space-y-4">
                    {/* Row 1: Large Sci-Fi Go Back Button + Holographic Telemetry Label + Quick Action Toggles */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-cyan-400/20">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setLocation("/leads")}
                          data-testid="back-to-lead-center-btn"
                          className="group inline-flex items-center gap-2.5 h-11 px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold text-white bg-gradient-to-b from-[#0E254C] to-[#07152E] hover:from-[#133266] hover:to-[#0A1E40] border border-cyan-400/65 hover:border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all cursor-pointer shrink-0"
                        >
                          <ArrowLeft className="w-5 h-5 text-cyan-300 group-hover:-translate-x-0.5 transition-transform stroke-[2.5]" />
                          Go Back to {activeStageMeta.label} List
                        </button>

                        <span
                          data-testid="single-client-view-badge"
                          className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-[#041024] border border-cyan-400/50 text-cyan-200 text-xs font-mono font-bold uppercase tracking-[0.14em] shadow-[0_0_14px_rgba(34,211,238,0.18),inset_0_0_10px_rgba(34,211,238,0.08)]"
                        >
                          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                          LEAD DETAILS PROFILE // SINGLE CLIENT VIEW
                        </span>
                      </div>

                      {/* Right: Progressive Disclosure Drawer Toggles + Primary Action */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenDrawer(
                              openDrawer === "contacts" ? null : "contacts"
                            )
                          }
                          data-testid="toggle-contact-drawer-btn"
                          className={`inline-flex items-center gap-2 h-10 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                            openDrawer === "contacts"
                              ? "bg-[#0E2954] text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                              : "bg-[#050E22] text-slate-200 border-cyan-500/35 hover:bg-[#0A1B3D] hover:border-cyan-400/70 hover:text-white"
                          }`}
                        >
                          <Users className="w-4 h-4 text-cyan-300" />
                          Family & Contacts
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenDrawer(
                              openDrawer === "history" ? null : "history"
                            )
                          }
                          data-testid="toggle-history-drawer-btn"
                          className={`inline-flex items-center gap-2 h-10 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                            openDrawer === "history"
                              ? "bg-[#0E2954] text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                              : "bg-[#050E22] text-slate-200 border-cyan-500/35 hover:bg-[#0A1B3D] hover:border-cyan-400/70 hover:text-white"
                          }`}
                        >
                          <History className="w-4 h-4 text-cyan-300" />
                          History & Notes
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-400/40 text-xs font-mono font-bold text-cyan-300">
                            {(workspace.journey.sharedHistory?.length || 0) +
                              (workspace.journey.callAttempts?.length || 0)}
                          </span>
                        </button>

                        {activeStageTab === "inquiry" && (
                          <button
                            type="button"
                            onClick={() => handleNavigateStage("discovery", true)}
                            className="inline-flex items-center gap-2 h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] border border-[#FFE394] shadow-[0_4px_14px_rgba(197,160,89,0.45)] hover:brightness-110 cursor-pointer"
                          >
                            <PhoneCall className="w-4 h-4" />
                            Start Discovery Now
                          </button>
                        )}

                        {activeStageTab === "discovery" &&
                          workspace.journey.discoveryOutcome !== "completed" &&
                          !isSessionMode && (
                            <button
                              type="button"
                              onClick={() =>
                                handleNavigateStage("discovery", true)
                              }
                              className="inline-flex items-center gap-2 h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] border border-[#FFE394] shadow-[0_4px_14px_rgba(197,160,89,0.45)] hover:brightness-110 cursor-pointer"
                            >
                              <PhoneCall className="w-4 h-4" />
                              Run Discovery
                            </button>
                          )}

                        {activeStageTab === "discovery" &&
                          workspace.journey.discoveryOutcome === "completed" && (
                            <button
                              type="button"
                              onClick={() => handleNavigateStage("decision")}
                              className="inline-flex items-center gap-2 h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] border border-[#FFE394] shadow-[0_4px_14px_rgba(197,160,89,0.45)] hover:brightness-110 cursor-pointer"
                            >
                              Open Decision
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Row 2: Prominent Client Name + Student + Stage & Next Action */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 min-w-0">
                        <h2
                          className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                          }}
                          data-testid="workspace-family-name"
                        >
                          {workspace.lead.parentName || "Family Inquiry"}
                        </h2>

                        {workspace.students?.length > 0 && (
                          <span className="text-xs sm:text-sm text-cyan-100 font-semibold inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#051229] border border-cyan-400/35">
                            <Users className="w-4 h-4 text-cyan-300" />
                            Student:{" "}
                            {workspace.students
                              .map((s: any) =>
                                `${s.firstName} ${s.lastName}`.trim()
                              )
                              .join(", ")}
                          </span>
                        )}

                        <span className="text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-lg font-bold bg-[#051229] text-[#FFE394] border border-[#C5A059]/45">
                          Stage: {workspace.journey.stageLabel}
                        </span>
                      </div>

                      <div
                        className="flex flex-wrap items-center gap-2 text-xs sm:text-sm bg-[#040D20]/90 border border-cyan-400/30 px-3.5 py-1.5 rounded-xl"
                        data-testid="workspace-status-next-summary"
                      >
                        <span className="text-slate-200 font-medium">
                          {workspace.journey.statusSummary}
                        </span>
                        <span className="text-cyan-400">·</span>
                        <span
                          className={`font-bold ${
                            workspace.journey.isOverdue
                              ? "text-rose-300"
                              : "text-cyan-300"
                          }`}
                        >
                          Next: {workspace.journey.nextActionLabel}
                        </span>
                      </div>
                    </div>

                    {/* Stage Navigation Strip (`New Leads · Discovery · Decision · Onboarding`) */}
                    <LeadStageStrip
                      currentPersistedStage={persistedStage}
                      viewedStage={activeStageTab}
                      onSelectStage={(st) => handleNavigateStage(st, false)}
                      isClosed={workspace.journey.isClosed}
                    />
                  </div>

                  {/* Progressive Disclosure Drawers for Contacts or Shared History */}
                  <LeadContextDrawers
                    workspace={workspace}
                    openDrawer={openDrawer}
                    onClose={() => setOpenDrawer(null)}
                    onUpdated={() => {
                      workspaceQuery.refetch();
                      leadsQuery.refetch();
                    }}
                  />

                  {/* Active Stage Unit */}
                  {activeStageTab === "inquiry" && (
                    <LeadInquiryUnit
                      workspace={workspace}
                      onRefresh={() => {
                        workspaceQuery.refetch();
                        leadsQuery.refetch();
                      }}
                      onNavigateStage={handleNavigateStage}
                    />
                  )}

                  {activeStageTab === "discovery" && (
                    <LeadDiscoveryUnit
                      workspace={workspace}
                      isSessionMode={isSessionMode}
                      onSetSessionMode={(s) =>
                        handleNavigateStage("discovery", s)
                      }
                      onRefresh={() => {
                        workspaceQuery.refetch();
                        leadsQuery.refetch();
                      }}
                      onNavigateStage={handleNavigateStage}
                    />
                  )}

                  {activeStageTab === "decision" && (
                    <LeadDecisionUnit
                      workspace={workspace}
                      onRefresh={() => {
                        workspaceQuery.refetch();
                        leadsQuery.refetch();
                      }}
                      onStageChange={(st) => handleNavigateStage(st, false)}
                    />
                  )}

                  {activeStageTab === "onboarding" && (
                    <LeadOnboardingUnit
                      workspace={workspace}
                      onRefresh={() => {
                        workspaceQuery.refetch();
                        leadsQuery.refetch();
                      }}
                    />
                  )}

                  {/* Bottom Sci-Fi HUD Go Back Bar for Easy Return to List */}
                  <div className="rounded-xl border border-cyan-400/35 bg-[#061229]/95 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_10px_28px_rgba(0,0,0,0.65)]">
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-mono text-cyan-200/90">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                      <span>
                        ACTIVE DOSSIER: <strong className="text-white">{workspace.lead.parentName}</strong> // SINGLE CLIENT VIEW
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocation("/leads")}
                      data-testid="bottom-back-to-lead-center-btn"
                      className="group inline-flex items-center gap-2.5 h-11 px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold text-white bg-gradient-to-b from-[#0E254C] to-[#07152E] hover:from-[#133266] hover:to-[#0A1E40] border border-cyan-400/65 hover:border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5 text-cyan-300 group-hover:-translate-x-0.5 transition-transform stroke-[2.5]" />
                      Go Back to {activeStageMeta.label} List
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── STAGE WORKING AREA: SELECTED STAGE'S LEAD LIST & TOOLS ── */
            <div
              className="min-h-[420px] rounded-2xl border border-[#1B305C] bg-[#05102B]/95 p-4 sm:p-5 shadow-[0_12px_32px_rgba(0,0,0,0.65)] space-y-4"
              data-testid={`stage-working-area-${selectedRadioStage}`}
            >
              {/* Stage Working Area Top Bar: Stage Title + Compact Filters + Search */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-[#16284C]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1 overflow-hidden">
                  <div className="min-w-0 sm:w-[290px] lg:w-[320px] shrink-0">
                    <div className="flex items-center gap-2">
                      <h2
                        className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] whitespace-nowrap"
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                        data-testid="working-area-stage-heading"
                      >
                        {activeStageMeta.label}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0C204B] text-[#FFE394] border border-[#C5A059]/45 shrink-0">
                        {currentStageLeads.length}
                      </span>
                    </div>
                    <p className="text-xs text-[#93A8C8] mt-0.5 truncate whitespace-nowrap">
                      {activeStageMeta.rescueSubtext}
                    </p>
                  </div>

                  {/* Stage-Specific Compact Sub-Filters */}
                  {selectedRadioStage === "inquiry" && (
                    <div
                      className="flex items-center gap-1.5 flex-nowrap shrink-0"
                      data-testid="new-leads-filters"
                    >
                      {(
                        [
                          { key: "all", label: "All" },
                          { key: "link_sent", label: "Scheduling link sent" },
                          { key: "needs_followup", label: "Needs follow-up" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setNewLeadsFilter(f.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                            newLeadsFilter === f.key
                              ? "bg-[#122856] text-white border-[#D8B979]"
                              : "bg-[#030A1C] text-[#93A8C8] border-[#16284C] hover:text-white"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedRadioStage === "discovery" && (
                    <div
                      className="flex items-center gap-1.5 flex-nowrap shrink-0"
                      data-testid="discovery-stage-filters"
                    >
                      {(
                        [
                          { key: "all", label: "All" },
                          { key: "today", label: "Today" },
                          { key: "upcoming", label: "Upcoming" },
                          { key: "needs_followup", label: "Needs follow-up" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          data-testid={`discovery-filter-${f.key}`}
                          onClick={() => setDiscoveryFilter(f.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                            discoveryFilter === f.key
                              ? "bg-[#122856] text-white border-[#D8B979]"
                              : "bg-[#030A1C] text-[#93A8C8] border-[#16284C] hover:text-white"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedRadioStage === "decision" && (
                    <div
                      className="flex items-center gap-1.5 flex-nowrap shrink-0"
                      data-testid="decision-stage-filters"
                    >
                      <button
                        type="button"
                        data-testid="decision-filter-active"
                        onClick={() => setDecisionFilter("active")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                          decisionFilter === "active"
                            ? "bg-[#122856] text-white border-[#D8B979]"
                            : "bg-[#030A1C] text-[#93A8C8] border-[#16284C] hover:text-white"
                        }`}
                      >
                        Active ({stageCounts.decision})
                      </button>
                      <button
                        type="button"
                        data-testid="decision-filter-closed"
                        onClick={() => setDecisionFilter("closed")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                          decisionFilter === "closed"
                            ? "bg-[#122856] text-white border-[#D8B979]"
                            : "bg-[#030A1C] text-[#93A8C8] border-[#16284C] hover:text-white"
                        }`}
                      >
                        Closed ({stageCounts.closedDecision})
                      </button>
                    </div>
                  )}

                  {selectedRadioStage === "onboarding" && (
                    <div
                      className="flex items-center gap-1.5 flex-nowrap shrink-0"
                      data-testid="onboarding-stage-filters"
                    >
                      <button
                        type="button"
                        data-testid="onboarding-filter-active"
                        onClick={() => setOnboardingFilter("active")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                          onboardingFilter === "active"
                            ? "bg-[#122856] text-white border-[#D8B979]"
                            : "bg-[#030A1C] text-[#93A8C8] border-[#16284C] hover:text-white"
                        }`}
                      >
                        Active Setup ({stageCounts.onboarding})
                      </button>
                      <button
                        type="button"
                        data-testid="onboarding-filter-completed"
                        onClick={() => setOnboardingFilter("completed")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                          onboardingFilter === "completed"
                            ? "bg-[#122856] text-white border-[#D8B979]"
                            : "bg-[#030A1C] text-[#93A8C8] border-[#16284C] hover:text-white"
                        }`}
                      >
                        Completed ({stageCounts.completedOnboarding})
                      </button>
                    </div>
                  )}
                </div>

                {/* Compact Search Input */}
                <div className="relative w-full lg:w-64 shrink-0">
                  <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeStageMeta.label.toLowerCase()}...`}
                    data-testid="lead-search-input"
                    className="w-full rounded-lg bg-[#030A1C] border border-[#1E335C] pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#D8B979]"
                  />
                </div>
              </div>

              {/* Clean Stage Lead List */}
              {leadsQuery.isLoading ? (
                <div className="py-10 flex items-center justify-center gap-2 text-xs text-[#93A8C8]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#D8B979]" />
                  Loading {activeStageMeta.label.toLowerCase()}...
                </div>
              ) : currentStageLeads.length === 0 ? (
                <div className="py-10 text-center space-y-2.5 rounded-xl border border-[#16284C] bg-[#030A1C]/60">
                  <p className="text-sm text-[#CBD5E1] font-medium">
                    No leads currently in this {activeStageMeta.label} view.
                  </p>
                  <p className="text-xs text-[#7E95B8]">
                    {selectedRadioStage === "inquiry"
                      ? "Add a New Service Inquiry or tune the radio dial to inspect Discovery, Decision, or Onboarding."
                      : "Tune the radio dial to another stage or adjust the stage filter above."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#16284C] rounded-xl border border-[#16284C] bg-[#030A1C]/90 overflow-hidden">
                  {currentStageLeads.map((lead: any) => {
                    const targetStage: WorkspaceStageTab =
                      lead.stage === "active"
                        ? "onboarding"
                        : lead.stage || selectedRadioStage;

                    // Concise stage-specific status badge
                    const conciseStatus =
                      selectedRadioStage === "discovery"
                        ? lead.callStatusLabel || "Scheduled"
                        : selectedRadioStage === "decision"
                        ? lead.decisionStatusLabel || "Considering"
                        : selectedRadioStage === "inquiry"
                        ? lead.schedulingLinkSent
                          ? "Scheduling link sent"
                          : "New lead"
                        : lead.stage === "active"
                        ? "Active Client"
                        : lead.statusSummary || "In Onboarding";

                    // Appointment or next-follow-up date display
                    const dateInfoText = (() => {
                      if (lead.discoveryCallDate && selectedRadioStage === "discovery") {
                        const d = new Date(lead.discoveryCallDate);
                        if (!isNaN(d.getTime())) {
                          const isToday = isSameCalendarDay(d, new Date());
                          const isPast =
                            d.getTime() < Date.now() &&
                            !isToday &&
                            lead.discoveryOutcome !== "completed";
                          const formatted = d.toLocaleString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          });
                          if (isToday) return `Today · ${formatted}`;
                          if (isPast) return `Past call (needs outcome) · ${formatted}`;
                          return `Scheduled · ${formatted}`;
                        }
                      }
                      if (lead.nextFollowUpAt) {
                        const d = new Date(lead.nextFollowUpAt);
                        if (!isNaN(d.getTime())) {
                          return `Follow-up: ${d.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}`;
                        }
                      }
                      return null;
                    })();

                    // Primary Action label for this row
                    const primaryActionLabel =
                      selectedRadioStage === "inquiry"
                        ? "Schedule Discovery"
                        : selectedRadioStage === "discovery"
                        ? "Run Discovery"
                        : selectedRadioStage === "decision"
                        ? lead.isClosed
                          ? "Reopen"
                          : lead.nextActionLabel || "Prepare offer"
                        : lead.stage === "active"
                        ? "Open Workspace"
                        : lead.nextActionLabel || "Continue Onboarding";

                    return (
                      <div
                        key={lead.id}
                        data-testid={`lead-row-${lead.id}`}
                        onClick={() =>
                          setLocation(`/leads/${lead.id}/${targetStage}`)
                        }
                        className="p-3.5 sm:p-4 hover:bg-[#081738] transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                      >
                        {/* Left: Parent/Family Name, Student Info, Relevant Status, Date */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm sm:text-base font-semibold text-white">
                              {lead.parentName}
                            </span>

                            {lead.studentNames?.length > 0 && (
                              <span className="text-xs text-[#93A8C8]">
                                · Student{lead.studentNames.length > 1 ? "s" : ""}:{" "}
                                <strong className="text-[#E2E8F0] font-medium">
                                  {lead.studentNames.join(", ")}
                                </strong>
                              </span>
                            )}

                            {/* Relevant Concise Status Pill */}
                            <span
                              data-testid={`lead-status-pill-${lead.id}`}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                conciseStatus === "Completed" ||
                                conciseStatus === "Ready to proceed" ||
                                conciseStatus === "Active Client"
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : conciseStatus === "No answer" ||
                                    conciseStatus === "Reschedule needed" ||
                                    conciseStatus === "Declined" ||
                                    lead.isOverdue
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : "bg-[#0C204B] text-[#FFE394] border-[#28447A]"
                              }`}
                            >
                              {conciseStatus}
                            </span>

                            {lead.isOverdue && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                <AlertTriangle className="w-3 h-3" />
                                Needs follow-up
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#8DA2C4]">
                            {dateInfoText && (
                              <span className="inline-flex items-center gap-1 text-[#FFE394] font-medium">
                                <Calendar className="w-3.5 h-3.5 text-[#D8B979]" />
                                {dateInfoText}
                              </span>
                            )}
                            <span>{lead.statusSummary}</span>
                            {lead.nextActionLabel &&
                              lead.nextActionLabel !== lead.statusSummary && (
                                <>
                                  <span className="text-[#334E83]">·</span>
                                  <span className="text-[#D8B979] font-medium">
                                    Next: {lead.nextActionLabel}
                                  </span>
                                </>
                              )}
                            {lead.concerns && (
                              <>
                                <span className="text-[#334E83]">·</span>
                                <span className="truncate max-w-md text-[#7E95B8]">
                                  {lead.concerns}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right: One Clear Primary Action + Contextual Secondary Menu */}
                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            data-testid={`primary-action-lead-${lead.id}`}
                            onClick={() => {
                              if (
                                selectedRadioStage === "decision" &&
                                lead.isClosed
                              ) {
                                reopenDecisionMutation.mutate({
                                  leadId: lead.id,
                                  choice: "considering",
                                  note: "Reopened from Decision Closed list",
                                });
                                return;
                              }
                              if (selectedRadioStage === "discovery") {
                                setLocation(
                                  `/leads/${lead.id}/discovery/session`
                                );
                                return;
                              }
                              setLocation(`/leads/${lead.id}/${targetStage}`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] shadow-md hover:brightness-105 transition-all cursor-pointer"
                          >
                            <span>{primaryActionLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Contextual Secondary Actions Menu */}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                data-testid={`lead-row-menu-${lead.id}`}
                                aria-label={`More actions for ${lead.parentName}`}
                                className="h-8 w-8 rounded-lg bg-[#05102B] hover:bg-[#102452] border border-[#1E335C] text-[#93A8C8] hover:text-white inline-flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 bg-[#07162B] border border-[#3A2C18] text-[#FFF4D4] shadow-2xl"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  setLocation(`/leads/${lead.id}/${targetStage}`)
                                }
                                className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] text-xs py-2"
                              >
                                Open {activeStageMeta.label} Workspace
                              </DropdownMenuItem>

                              {selectedRadioStage === "inquiry" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateInquiryMutation.mutate({
                                        leadId: lead.id,
                                        sendSchedulingLink: true,
                                      })
                                    }
                                    className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2"
                                  >
                                    <Send className="w-3.5 h-3.5 text-[#D8B979]" />
                                    <span>Send scheduling link</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateInquiryMutation.mutate({
                                        leadId: lead.id,
                                        recordContactAttempt:
                                          "Called / reached out from New Leads list",
                                      })
                                    }
                                    className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5 text-[#D8B979]" />
                                    <span>Record contact attempt</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-[#3A2C18]/60" />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateInquiryMutation.mutate({
                                        leadId: lead.id,
                                        progressDirectlyToDecision: true,
                                        directToDecisionNote:
                                          "Progressed directly to Decision (discovery unnecessary)",
                                      })
                                    }
                                    className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-[#D8B979]" />
                                    <span>Progress directly to Decision</span>
                                  </DropdownMenuItem>
                                </>
                              )}

                              {selectedRadioStage === "discovery" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setLocation(
                                      `/leads/${lead.id}/discovery/session`
                                    )
                                  }
                                  className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2"
                                >
                                  <PhoneCall className="w-3.5 h-3.5 text-[#D8B979]" />
                                  <span>Run Discovery Session</span>
                                </DropdownMenuItem>
                              )}

                              {selectedRadioStage === "decision" && lead.isClosed && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    reopenDecisionMutation.mutate({
                                      leadId: lead.id,
                                      choice: "considering",
                                      note: "Reopened in Decision stage",
                                    })
                                  }
                                  className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-[#D8B979]" />
                                  <span>Reopen Lead in Decision</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* New Service Inquiry Modal */}
        <NewServiceInquiryModal
          open={newInquiryOpen}
          onOpenChange={setNewInquiryOpen}
          onSuccess={(res) => {
            leadsQuery.refetch();
            setNewInquiryOpen(false);
            setSelectedRadioStage("inquiry");
            setLocation(`/leads/${res.leadId}/inquiry`);
          }}
        />
      </div>
    </ScopedErrorBoundary>
  );
}

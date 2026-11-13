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
type NewLeadsSubFilter =
  | "all"
  | "needs_scheduling"
  | "link_sent"
  | "scheduled"
  | "needs_followup";

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

  const startDiscoveryHeaderMutation = trpc.leads.startDiscoveryNow.useMutation({
    onSuccess: () => {
      utils.leads.listHydrated.invalidate();
      utils.leads.getWorkspace.invalidate();
      handleNavigateStage("discovery", true);
    },
    onError: (err) => toast.error(err.message || "Could not start discovery"),
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
      // Stage 1: New Leads — ALL leads who have not started their discovery conversation (including scheduled & unscheduled)
      return hydratedLeads
        .filter((l: any) => {
          if (l.stage !== "inquiry" || l.isClosed) return false;
          const aptState =
            l.appointmentState ||
            (l.scheduledAppointment
              ? "scheduled"
              : l.schedulingLinkSent
              ? "awaiting_booking"
              : "needs_scheduling");
          if (
            newLeadsFilter === "needs_scheduling" &&
            aptState !== "needs_scheduling" &&
            aptState !== "needs_rescheduling"
          ) {
            return false;
          }
          if (newLeadsFilter === "link_sent" && aptState !== "awaiting_booking") {
            return false;
          }
          if (newLeadsFilter === "scheduled" && aptState !== "scheduled") {
            return false;
          }
          if (
            newLeadsFilter === "needs_followup" &&
            !l.isOverdue &&
            aptState !== "needs_rescheduling" &&
            aptState !== "awaiting_booking"
          ) {
            return false;
          }
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

  const openedHydratedLead = useMemo(
    () =>
      effectiveLeadId
        ? hydratedLeads.find((l: any) => l.id === effectiveLeadId) || null
        : null,
    [hydratedLeads, effectiveLeadId]
  );

  return (
    <ScopedErrorBoundary moduleName="Lead Center">
      <div
        className="min-h-screen w-full bg-[#000820] text-[#F8FAFC] pt-4 pb-24 overflow-x-hidden"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, rgba(22,45,92,0.42) 0%, rgba(0,8,32,0.98) 65%, #000820 100%)",
        }}
      >
        {/* ─── 1. EXISTING RADIO TUNER CONSOLE AT TOP OF LEAD CENTER (FULL-BLEED PURPLE BACK-LAY EDGE-TO-EDGE) ─── */}
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
          openedClientName={
            workspace?.lead?.parentName || openedHydratedLead?.parentName
          }
          openedClientStudentName={
            workspace?.students?.length
              ? workspace.students
                  .map((s: any) => `${s.firstName} ${s.lastName}`.trim())
                  .join(", ")
              : workspace?.lead?.childName || openedHydratedLead?.childName
          }
          openedClientStatusLabel={
            workspace?.journey?.statusSummary ||
            openedHydratedLead?.statusSummary ||
            "Needs scheduling"
          }
          openedClientNextAction={
            workspace?.journey?.nextActionLabel ||
            openedHydratedLead?.nextActionLabel ||
            "Schedule discovery"
          }
          openedClientCurrentStage={defaultTabForPersisted}
        />

        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 space-y-4">
          {/* ─── 2. SINGLE FOCUSED STAGE WORKING AREA DIRECTLY BELOW RADIO ─── */}
          {effectiveLeadId ? (
            activeStageTab === "inquiry" ||
            activeStageTab === "discovery" ||
            activeStageTab === "decision" ? (
              /* ── PG-003-INQ / PG-003-DSC / PG-003-SES / PG-003-DEC · CLEAN ADMIRALTY WORKSPACE BELOW RADIO ── */
              <div
                className="relative pt-1 pb-4 space-y-2"
                data-testid="lead-stage-in-context-workspace"
              >
                {workspaceQuery.isLoading || !workspace ? (
                  <div className="rounded-2xl border border-[#C5A059]/30 bg-[#061229]/90 p-10 flex items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[#DFBE77]" />
                    <span className="text-base font-serif text-[#FFF4D4]">
                      Loading family workspace...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Hidden/Accessible Workspace Summary & Drawer Triggers for E2E Compatibility */}
                    <div className="sr-only">
                      <span data-testid="workspace-family-name">
                        {workspace.lead.parentName || "Family Inquiry"}
                      </span>
                      <span data-testid="workspace-status-next-summary">
                        {workspace.journey.statusSummary} · Next:{" "}
                        {workspace.journey.nextActionLabel}
                      </span>
                    </div>

                    <LeadContextDrawers
                      workspace={workspace}
                      openDrawer={openDrawer}
                      onClose={() => setOpenDrawer(null)}
                      onUpdated={() => {
                        workspaceQuery.refetch();
                        leadsQuery.refetch();
                      }}
                    />

                    {activeStageTab === "inquiry" ? (
                      <LeadInquiryUnit
                        workspace={workspace}
                        onRefresh={() => {
                          workspaceQuery.refetch();
                          leadsQuery.refetch();
                        }}
                        onNavigateStage={handleNavigateStage}
                        onBackToList={() => setLocation("/leads")}
                      />
                    ) : activeStageTab === "discovery" ? (
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
                    ) : (
                      <LeadDecisionUnit
                        workspace={workspace}
                        onRefresh={() => {
                          workspaceQuery.refetch();
                          leadsQuery.refetch();
                        }}
                        onStageChange={(st) => handleNavigateStage(st, false)}
                        onOpenHistoryDrawer={() =>
                          setOpenDrawer(
                            openDrawer === "history" ? null : "history"
                          )
                        }
                      />
                    )}

                    <div className="pt-2 px-2 flex items-center justify-between text-xs text-[#C6B697]">
                      <button
                        type="button"
                        onClick={() => setLocation("/leads")}
                        data-testid="back-to-lead-center-btn"
                        className="inline-flex items-center gap-1.5 text-[#D8B467] hover:text-[#FFF4D4] transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to {activeStageMeta.label} List
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* ── IN-CONTEXT OPENED LEAD WORKSPACE FOR DISCOVERY / DECISION / ONBOARDING ── */
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
            )
          ) : (
            /* ── STAGE WORKING AREA: SELECTED STAGE'S LEAD LIST (EXACT PICTURE MATCH) ── */
            <div
              className="min-h-[420px] pt-2 px-1 sm:px-2 space-y-4"
              data-testid={`stage-working-area-${selectedRadioStage}`}
            >
              {/* Row 1: Stage Title | Count on Left + Gold-Rimmed Search Pill on Right */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <h2
                    className="text-2xl sm:text-[30px] font-serif font-bold text-white leading-none"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                    data-testid="working-area-stage-heading"
                  >
                    {activeStageMeta.label}
                  </h2>
                  <span className="text-[#C5A059]/60 text-lg font-light">|</span>
                  <span
                    className="text-base sm:text-lg font-serif italic text-[#E2E8F0]"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  >
                    {currentStageLeads.length}{" "}
                    {currentStageLeads.length === 1 ? "family" : "families"}
                  </span>
                </div>

                {/* Gold-Rimmed Pill Search Input */}
                <div className="relative w-full sm:w-80 shrink-0">
                  <Search className="w-4 h-4 text-[#C5A059] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search families..."
                    data-testid="lead-search-input"
                    className="w-full rounded-full bg-[#040B1C]/90 border border-[#C5A059]/65 pl-10 pr-4 py-1.5 text-sm font-serif italic text-white placeholder:text-[#B8CCE4]/80 focus:outline-none focus:border-[#FFE394] shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Stage-Specific Sub-Filters with Gold Active Pill & Pipe Dividers */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedRadioStage === "inquiry" && (
                  <div
                    className="flex flex-wrap items-center gap-2"
                    data-testid="new-leads-filters"
                  >
                    {(
                      [
                        { key: "all", label: "All" },
                        { key: "needs_scheduling", label: "Needs scheduling" },
                        { key: "link_sent", label: "Link sent" },
                        { key: "scheduled", label: "Scheduled" },
                        { key: "needs_followup", label: "Follow-up due" },
                      ] as const
                    ).map((f, idx, arr) => {
                      const isActive = newLeadsFilter === f.key;
                      return (
                        <React.Fragment key={f.key}>
                          <button
                            type="button"
                            data-testid={`new-leads-filter-${f.key}`}
                            onClick={() => setNewLeadsFilter(f.key)}
                            className={
                              isActive
                                ? "px-4 py-0.5 rounded-full bg-gradient-to-b from-[#EAD08A] via-[#C89D4C] to-[#987026] text-[#07162B] font-serif font-bold text-xs sm:text-sm border border-[#FFE5A3]/85 shadow-[0_2px_8px_rgba(0,0,0,0.65)] cursor-pointer"
                                : "px-2 py-0.5 text-xs sm:text-sm font-serif text-[#E2E8F0] hover:text-[#FFE394] transition-colors cursor-pointer"
                            }
                            style={{
                              fontFamily: "'Playfair Display', Georgia, serif",
                            }}
                          >
                            {f.label}
                          </button>
                          {idx < arr.length - 1 && (
                            <span className="text-[#C5A059]/45 text-xs select-none">
                              |
                            </span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {selectedRadioStage === "discovery" && (
                  <div
                    className="flex flex-wrap items-center gap-2"
                    data-testid="discovery-stage-filters"
                  >
                    {(
                      [
                        { key: "all", label: "All" },
                        { key: "today", label: "Today" },
                        { key: "upcoming", label: "Upcoming" },
                        { key: "needs_followup", label: "Follow-up due" },
                      ] as const
                    ).map((f, idx, arr) => {
                      const isActive = discoveryFilter === f.key;
                      return (
                        <React.Fragment key={f.key}>
                          <button
                            type="button"
                            data-testid={`discovery-filter-${f.key}`}
                            onClick={() => setDiscoveryFilter(f.key)}
                            className={
                              isActive
                                ? "px-4 py-0.5 rounded-full bg-gradient-to-b from-[#EAD08A] via-[#C89D4C] to-[#987026] text-[#07162B] font-serif font-bold text-xs sm:text-sm border border-[#FFE5A3]/85 shadow-[0_2px_8px_rgba(0,0,0,0.65)] cursor-pointer"
                                : "px-2 py-0.5 text-xs sm:text-sm font-serif text-[#E2E8F0] hover:text-[#FFE394] transition-colors cursor-pointer"
                            }
                            style={{
                              fontFamily: "'Playfair Display', Georgia, serif",
                            }}
                          >
                            {f.label}
                          </button>
                          {idx < arr.length - 1 && (
                            <span className="text-[#C5A059]/45 text-xs select-none">
                              |
                            </span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {selectedRadioStage === "decision" && (
                  <div
                    className="flex flex-wrap items-center gap-2"
                    data-testid="decision-stage-filters"
                  >
                    <button
                      type="button"
                      data-testid="decision-filter-active"
                      onClick={() => setDecisionFilter("active")}
                      className={
                        decisionFilter === "active"
                          ? "px-4 py-0.5 rounded-full bg-gradient-to-b from-[#EAD08A] via-[#C89D4C] to-[#987026] text-[#07162B] font-serif font-bold text-xs sm:text-sm border border-[#FFE5A3]/85 shadow-[0_2px_8px_rgba(0,0,0,0.65)] cursor-pointer"
                          : "px-2 py-0.5 text-xs sm:text-sm font-serif text-[#E2E8F0] hover:text-[#FFE394] transition-colors cursor-pointer"
                      }
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      Active ({stageCounts.decision})
                    </button>
                    <span className="text-[#C5A059]/45 text-xs select-none">
                      |
                    </span>
                    <button
                      type="button"
                      data-testid="decision-filter-closed"
                      onClick={() => setDecisionFilter("closed")}
                      className={
                        decisionFilter === "closed"
                          ? "px-4 py-0.5 rounded-full bg-gradient-to-b from-[#EAD08A] via-[#C89D4C] to-[#987026] text-[#07162B] font-serif font-bold text-xs sm:text-sm border border-[#FFE5A3]/85 shadow-[0_2px_8px_rgba(0,0,0,0.65)] cursor-pointer"
                          : "px-2 py-0.5 text-xs sm:text-sm font-serif text-[#E2E8F0] hover:text-[#FFE394] transition-colors cursor-pointer"
                      }
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      Closed ({stageCounts.closedDecision})
                    </button>
                  </div>
                )}

                {selectedRadioStage === "onboarding" && (
                  <div
                    className="flex flex-wrap items-center gap-2"
                    data-testid="onboarding-stage-filters"
                  >
                    <button
                      type="button"
                      data-testid="onboarding-filter-active"
                      onClick={() => setOnboardingFilter("active")}
                      className={
                        onboardingFilter === "active"
                          ? "px-4 py-0.5 rounded-full bg-gradient-to-b from-[#EAD08A] via-[#C89D4C] to-[#987026] text-[#07162B] font-serif font-bold text-xs sm:text-sm border border-[#FFE5A3]/85 shadow-[0_2px_8px_rgba(0,0,0,0.65)] cursor-pointer"
                          : "px-2 py-0.5 text-xs sm:text-sm font-serif text-[#E2E8F0] hover:text-[#FFE394] transition-colors cursor-pointer"
                      }
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      Active Setup ({stageCounts.onboarding})
                    </button>
                    <span className="text-[#C5A059]/45 text-xs select-none">
                      |
                    </span>
                    <button
                      type="button"
                      data-testid="onboarding-filter-completed"
                      onClick={() => setOnboardingFilter("completed")}
                      className={
                        onboardingFilter === "completed"
                          ? "px-4 py-0.5 rounded-full bg-gradient-to-b from-[#EAD08A] via-[#C89D4C] to-[#987026] text-[#07162B] font-serif font-bold text-xs sm:text-sm border border-[#FFE5A3]/85 shadow-[0_2px_8px_rgba(0,0,0,0.65)] cursor-pointer"
                          : "px-2 py-0.5 text-xs sm:text-sm font-serif text-[#E2E8F0] hover:text-[#FFE394] transition-colors cursor-pointer"
                      }
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      Completed ({stageCounts.completedOnboarding})
                    </button>
                  </div>
                )}
              </div>

              {/* Row 3: Brass-Divided Table of Families */}
              {leadsQuery.isLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-sm font-serif italic text-[#D8C7A5]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#DFBE77]" />
                  Loading {activeStageMeta.label.toLowerCase()}...
                </div>
              ) : currentStageLeads.length === 0 ? (
                <div className="py-12 text-center space-y-2 border-t border-b border-[#C5A059]/35">
                  <p
                    className="text-base font-serif text-[#FFF4D4]"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  >
                    No families currently in this {activeStageMeta.label} view.
                  </p>
                  <p
                    className="text-xs font-serif italic text-[#B8CCE4]"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  >
                    {selectedRadioStage === "inquiry"
                      ? "Click + New inquiry above or tune the stage dial to browse other stages."
                      : "Tune the stage dial to another stage or switch the filter above."}
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  {/* Table Column Header Bar */}
                  <div className="grid grid-cols-12 items-center gap-3 py-2.5 px-2 border-t border-b border-[#C5A059]/45 text-[10.5px] sm:text-[11px] font-serif uppercase tracking-[0.22em] text-[#D8C7A5]">
                    <div className="col-span-6 sm:col-span-5 pl-1">
                      FAMILY / STUDENT
                    </div>
                    <div className="col-span-3 hidden sm:block">STATUS</div>
                    <div className="col-span-3 sm:col-span-2">NEXT ACTION</div>
                    <div className="col-span-3 sm:col-span-2 text-right pr-2" />
                  </div>

                  {/* Family Rows */}
                  <div className="divide-y divide-[#C5A059]/30 border-b border-[#C5A059]/45">
                    {currentStageLeads.map((lead: any) => {
                      const targetStage: WorkspaceStageTab =
                        lead.stage === "active"
                          ? "onboarding"
                          : lead.stage || selectedRadioStage;

                      // Compute 2-letter Initials for Gold-Ringed Avatar
                      const initials = (lead.parentName || "FA")
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part: string) => part[0]?.toUpperCase() || "")
                        .join("");

                      const studentDisplay =
                        lead.studentNames?.length > 0
                          ? lead.studentNames.join(", ")
                          : lead.studentName || "Pending student";

                      // Status Column Text (Unified dynamic status across list, workspace & radio)
                      const statusText =
                        selectedRadioStage === "inquiry"
                          ? lead.statusSummary || "Needs scheduling"
                          : selectedRadioStage === "discovery"
                          ? lead.statusSummary || "Discovery in progress"
                          : selectedRadioStage === "decision"
                          ? lead.statusSummary || lead.decisionStatusLabel || "Considering"
                          : lead.stage === "active"
                          ? "Active client"
                          : lead.statusSummary || "In onboarding";

                      // Next Action Column Text (Unified dynamic next action across list, workspace & radio)
                      const nextActionText =
                        selectedRadioStage === "inquiry"
                          ? lead.nextActionLabel || "Schedule discovery"
                          : selectedRadioStage === "discovery"
                          ? lead.nextActionLabel || "Resume discovery"
                          : selectedRadioStage === "decision"
                          ? lead.isClosed
                            ? "Reopen"
                            : lead.nextActionLabel || "Review offer"
                          : lead.stage === "active"
                          ? "Open workspace"
                          : lead.nextActionLabel || "Continue setup";

                      return (
                        <div
                          key={lead.id}
                          data-testid={`lead-row-${lead.id}`}
                          onClick={() =>
                            setLocation(`/leads/${lead.id}/${targetStage}`)
                          }
                          className="grid grid-cols-12 items-center gap-3 py-3.5 px-2 hover:bg-[#091938]/55 transition-colors cursor-pointer"
                        >
                          {/* Col 1: Gold-Ringed Initials Circle + Family Name + Student Subtitle */}
                          <div className="col-span-6 sm:col-span-5 flex items-center gap-3.5 min-w-0">
                            <div
                              className="w-11 h-11 rounded-full border-2 border-[#C5A059]/80 bg-gradient-to-b from-[#0E2248] to-[#051026] text-white font-serif font-bold text-sm sm:text-base flex items-center justify-center shrink-0 shadow-[0_3px_10px_rgba(0,0,0,0.75)]"
                              style={{
                                fontFamily: "'Playfair Display', Georgia, serif",
                              }}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div
                                className="text-base sm:text-[19px] font-serif font-bold text-white leading-tight truncate"
                                style={{
                                  fontFamily:
                                    "'Playfair Display', Georgia, serif",
                                }}
                              >
                                {lead.parentName}
                              </div>
                              <div
                                className="text-xs sm:text-sm font-serif italic text-[#CBD5E1] mt-0.5 truncate"
                                style={{
                                  fontFamily:
                                    "'Playfair Display', Georgia, serif",
                                }}
                              >
                                Student: {studentDisplay}
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Status */}
                          <div className="col-span-3 hidden sm:flex items-center">
                            <span
                              data-testid={`lead-status-pill-${lead.id}`}
                              className="text-sm sm:text-base font-serif text-[#F1F5F9]"
                              style={{
                                fontFamily:
                                  "'Playfair Display', Georgia, serif",
                              }}
                            >
                              {statusText}
                            </span>
                          </div>

                          {/* Col 3: Next Action */}
                          <div className="col-span-3 sm:col-span-2 flex items-center">
                            <span
                              className="text-sm sm:text-base font-serif text-[#F1F5F9]"
                              style={{
                                fontFamily:
                                  "'Playfair Display', Georgia, serif",
                              }}
                            >
                              {nextActionText}
                            </span>
                          </div>

                          {/* Col 4: Open family -> Pill Button */}
                          <div
                            className="col-span-3 sm:col-span-2 flex items-center justify-end"
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
                                setLocation(`/leads/${lead.id}/${targetStage}`);
                              }}
                              className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-full border border-[#C5A059]/80 bg-gradient-to-b from-[#0E2248] to-[#051026] hover:from-[#163266] hover:to-[#0A1D3E] hover:border-[#FFE394] text-[#FFF4D4] text-xs sm:text-sm font-serif shadow-[0_3px_10px_rgba(0,0,0,0.7)] transition-all cursor-pointer whitespace-nowrap"
                              style={{
                                fontFamily:
                                  "'Playfair Display', Georgia, serif",
                              }}
                            >
                              <span>
                                {selectedRadioStage === "decision" &&
                                lead.isClosed
                                  ? "Reopen"
                                  : "Open family"}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-[#DFBE77]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

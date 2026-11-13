import React, { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  PhoneCall,
  CheckCircle2,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Save,
  Loader2,
  History,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  DiscoveryProcessSteps,
  DEFAULT_DISCOVERY_QUESTIONS,
  type DiscoveryQuestionItem,
  type PricingStateData,
} from "./DiscoveryProcessSteps";

interface LeadDiscoveryUnitProps {
  workspace: any;
  isSessionMode: boolean;
  onSetSessionMode: (session: boolean) => void;
  onRefresh: () => void;
  onNavigateStage: (
    stage: "inquiry" | "discovery" | "decision" | "onboarding",
    sessionMode?: boolean
  ) => void;
}

const DEFAULT_OPENING_SCRIPT = `"Hi, is this [Parent Name]?"

My name is [Your Name] with Waypoint Advocates. I'm calling for our scheduled discovery conversation about [Student Name] and how we can help. Do you have a few minutes?`;

const DEFAULT_VOICEMAIL_SCRIPT = `"Hi [Parent Name], this is [Your Name] with Waypoint Advocates calling for our discovery conversation about [Student Name]. Please give us a call back or reply when convenient so we can connect. Talk soon!"`;

const DEFAULT_PRICING_STATE: PricingStateData = {
  studentCount: 1,
  selectedPlan: "complaints_100",
  notes: "",
  planPublishedToPortal: false,
  overridePortalDisplay: false,
  showAdvocacyOnlyInPortal: true,
  showComplaintsInPortal: true,
  spouseFollowUpChecklist: {},
  lostReason: "",
  lostFeedbackNotes: "",
  lostNurtureOptions: {},
};

function parsePricingState(raw?: string | null): PricingStateData {
  if (!raw) return { ...DEFAULT_PRICING_STATE };
  try {
    const parsed = JSON.parse(raw);
    return {
      studentCount:
        typeof parsed.studentCount === "number" ? parsed.studentCount : 1,
      selectedPlan: parsed.selectedPlan || "complaints_100",
      notes: parsed.notes || "",
      planPublishedToPortal: Boolean(parsed.planPublishedToPortal),
      overridePortalDisplay: Boolean(parsed.overridePortalDisplay),
      showAdvocacyOnlyInPortal:
        parsed.showAdvocacyOnlyInPortal !== undefined
          ? Boolean(parsed.showAdvocacyOnlyInPortal)
          : true,
      showComplaintsInPortal:
        parsed.showComplaintsInPortal !== undefined
          ? Boolean(parsed.showComplaintsInPortal)
          : true,
      spouseFollowUpChecklist: parsed.spouseFollowUpChecklist || {},
      lostReason: parsed.lostReason || "",
      lostFeedbackNotes: parsed.lostFeedbackNotes || "",
      lostNurtureOptions: parsed.lostNurtureOptions || {},
    };
  } catch {
    return { ...DEFAULT_PRICING_STATE, notes: raw };
  }
}

export function LeadDiscoveryUnit({
  workspace,
  isSessionMode,
  onSetSessionMode,
  onRefresh,
  onNavigateStage,
}: LeadDiscoveryUnitProps) {
  const { lead, students = [], discoveryCall, appointments = [], journey } =
    workspace;

  const { data: rawQuestions = [] } = trpc.discovery.getQuestions.useQuery();

  const questions: DiscoveryQuestionItem[] = DEFAULT_DISCOVERY_QUESTIONS.map(
    (def, idx) => {
      const dbQ = rawQuestions[idx];
      return {
        ...def,
        id: dbQ?.id ?? def.id,
      };
    }
  );

  const parentFullName = lead.parentName || "Eleanor Vance";
  const parentFirstName = parentFullName.trim().split(/\s+/)[0] || "Parent";
  const studentDisplayName =
    students
      .map((s: any) => s.firstName)
      .filter(Boolean)
      .join(" & ") ||
    lead.studentName ||
    "your child";

  const personalizeScript = useCallback(
    (raw: string) =>
      raw
        .replace(/\[Parent Name\]/gi, parentFullName)
        .replace(/\[Student Name\]/gi, studentDisplayName)
        .replace(/\[Your Name\]/gi, "Byron"),
    [parentFullName, studentDisplayName]
  );

  // Active Step (1..7) from the user's Discovery Call Process
  const [activeStep, setActiveStep] = useState<number>(() => {
    const saved = discoveryCall?.currentStepId;
    return saved && saved >= 1 && saved <= 7 ? saved : 2;
  });
  const [activeQuestionId, setActiveQuestionId] = useState<number>(
    questions[0]?.id || 1
  );
  const [questionMode, setQuestionMode] = useState<"iep" | "general">(
    discoveryCall?.questionMode === "general" ? "general" : "iep"
  );

  // 7-Step Discovery Call Process state
  const [openingScript, setOpeningScript] = useState(() =>
    personalizeScript(discoveryCall?.openingScript || DEFAULT_OPENING_SCRIPT)
  );
  const [voicemailScript, setVoicemailScript] = useState(() =>
    personalizeScript(
      discoveryCall?.voicemailScript || DEFAULT_VOICEMAIL_SCRIPT
    )
  );
  const [callScriptNotes, setCallScriptNotes] = useState(
    discoveryCall?.callScriptNotes || ""
  );
  const [theirStoryNotes, setTheirStoryNotes] = useState(
    discoveryCall?.theirStoryNotes || ""
  );
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>(
    () => {
      if (discoveryCall?.questionNotes) {
        try {
          return JSON.parse(discoveryCall.questionNotes);
        } catch {}
      }
      return {};
    }
  );
  const [howItWorksNotes, setHowItWorksNotes] = useState(
    discoveryCall?.howItWorksNotes || ""
  );
  const [pricingState, setPricingState] = useState<PricingStateData>(() =>
    parsePricingState(discoveryCall?.pricingNotes)
  );
  const [closingResponse, setClosingResponse] = useState<string>(
    discoveryCall?.closingResponse || ""
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    discoveryCall?.additionalNotes || ""
  );
  const [privateNotes, setPrivateNotes] = useState(
    discoveryCall?.privateNotes || ""
  );

  const [rightPanelTab, setRightPanelTab] = useState<"intake" | "scripts">(
    "intake"
  );
  const [showInlineIntakeEditor, setShowInlineIntakeEditor] = useState(false);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Inline intake fields for cold-call / mid-session discovery collection
  const [intakeParentPhone, setIntakeParentPhone] = useState(
    lead.parentPhone || ""
  );
  const [intakeParentEmail, setIntakeParentEmail] = useState(
    lead.parentEmail || ""
  );
  const [intakeStudentFirst, setIntakeStudentFirst] = useState(
    students[0]?.firstName || lead.studentName?.split(" ")[0] || ""
  );
  const [intakeStudentLast, setIntakeStudentLast] = useState(
    students[0]?.lastName ||
      lead.studentName?.split(" ").slice(1).join(" ") ||
      ""
  );
  const [intakeStudentGrade, setIntakeStudentGrade] = useState(
    students[0]?.gradeLevel || lead.studentGrade || ""
  );
  const [intakeStudentSchool, setIntakeStudentSchool] = useState(
    students[0]?.schoolName || ""
  );
  const [intakeConcerns, setIntakeConcerns] = useState(journey.concerns || "");
  const [intakeDesiredOutcome, setIntakeDesiredOutcome] = useState(
    journey.desiredOutcome || ""
  );

  const updateIntakeDuringDiscoveryMutation =
    trpc.leads.updateInquiry.useMutation({
      onSuccess: () => {
        toast.success("Intake details saved to family record");
        setShowInlineIntakeEditor(false);
        onRefresh();
      },
      onError: (err) => toast.error(err.message),
    });

  // Scheduling controls
  const tomorrowDefault = new Date(Date.now() + 86400000);
  tomorrowDefault.setHours(10, 0, 0, 0);
  const [scheduleDate, setScheduleDate] = useState(
    tomorrowDefault.toISOString().slice(0, 10)
  );
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);

  // Complete Discovery Outcome modal/drawer state
  const [showCompletePanel, setShowCompletePanel] = useState(false);
  const [progressedToDecisionBanner, setProgressedToDecisionBanner] =
    useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<
    | "completed"
    | "no_answer"
    | "reschedule_needed"
    | "follow_up_later"
    | "cancelled"
    | "declined"
  >("completed");
  const [outcomeNote, setOutcomeNote] = useState("");
  const [nextActionLabel, setNextActionLabel] = useState(
    "Retry the call tomorrow"
  );
  const [nextActionDate, setNextActionDate] = useState(
    tomorrowDefault.toISOString().slice(0, 10)
  );
  const [rescheduleDate, setRescheduleDate] = useState(
    tomorrowDefault.toISOString().slice(0, 10)
  );
  const [rescheduleTime, setRescheduleTime] = useState("14:00");
  const [declineReason, setDeclineReason] = useState("");

  // Autosave draft persistence
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date>(
    discoveryCall?.updatedAt ? new Date(discoveryCall.updatedAt) : new Date()
  );

  useEffect(() => {
    if (!discoveryCall) return;
    if (discoveryCall.openingScript) {
      setOpeningScript(discoveryCall.openingScript);
    }
    if (discoveryCall.voicemailScript) {
      setVoicemailScript(discoveryCall.voicemailScript);
    }
    setCallScriptNotes(discoveryCall.callScriptNotes || "");
    setTheirStoryNotes(discoveryCall.theirStoryNotes || "");
    setHowItWorksNotes(discoveryCall.howItWorksNotes || "");
    setAdditionalNotes(discoveryCall.additionalNotes || "");
    setPrivateNotes(discoveryCall.privateNotes || "");
    setClosingResponse(discoveryCall.closingResponse || "");
    setPricingState(parsePricingState(discoveryCall.pricingNotes));
    if (discoveryCall.questionNotes) {
      try {
        setQuestionNotes(JSON.parse(discoveryCall.questionNotes));
      } catch {}
    }
  }, [discoveryCall?.id]);

  useEffect(() => {
    if (
      questions.length > 0 &&
      !questions.some((q) => q.id === activeQuestionId)
    ) {
      setActiveQuestionId(questions[0].id);
    }
  }, [rawQuestions.length]);

  const saveDraftMutation = trpc.discovery.save.useMutation({
    onSuccess: () => {
      setSavingDraft(false);
      setLastSavedAt(new Date());
      onRefresh();
    },
    onError: () => setSavingDraft(false),
  });

  const triggerDraftSave = useCallback(
    (overrides?: {
      step?: number;
      qMode?: "iep" | "general";
      openScr?: string;
      vmScr?: string;
      callScrNotes?: string;
      story?: string;
      howItWorks?: string;
      additional?: string;
      priv?: string;
      qNotes?: Record<string, string>;
      pricing?: PricingStateData;
      closing?: string;
    }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSavingDraft(true);
        saveDraftMutation.mutate({
          leadId: lead.id,
          currentStepId: overrides?.step ?? activeStep,
          questionMode: overrides?.qMode ?? questionMode,
          openingScript: overrides?.openScr ?? openingScript,
          voicemailScript: overrides?.vmScr ?? voicemailScript,
          callScriptNotes: overrides?.callScrNotes ?? callScriptNotes,
          theirStoryNotes: overrides?.story ?? theirStoryNotes,
          howItWorksNotes: overrides?.howItWorks ?? howItWorksNotes,
          additionalNotes: overrides?.additional ?? additionalNotes,
          privateNotes: overrides?.priv ?? privateNotes,
          questionNotes: JSON.stringify(overrides?.qNotes ?? questionNotes),
          pricingNotes: JSON.stringify(overrides?.pricing ?? pricingState),
          closingResponse: overrides?.closing ?? closingResponse,
        });
      }, 650);
    },
    [
      lead.id,
      activeStep,
      questionMode,
      openingScript,
      voicemailScript,
      callScriptNotes,
      theirStoryNotes,
      howItWorksNotes,
      additionalNotes,
      privateNotes,
      questionNotes,
      pricingState,
      closingResponse,
    ]
  );

  const handlePublishPlanToPortal = () => {
    const nextPricing: PricingStateData = {
      ...pricingState,
      planPublishedToPortal: true,
    };
    setPricingState(nextPricing);
    setSavingDraft(true);
    saveDraftMutation.mutate(
      {
        leadId: lead.id,
        currentStepId: activeStep,
        questionMode,
        openingScript,
        voicemailScript,
        callScriptNotes,
        theirStoryNotes,
        howItWorksNotes,
        additionalNotes,
        privateNotes,
        questionNotes: JSON.stringify(questionNotes),
        pricingNotes: JSON.stringify(nextPricing),
        closingResponse: closingResponse || "Yes",
      },
      {
        onSuccess: () => {
          const planTitle =
            nextPricing.selectedPlan === "advocacy_55"
              ? "Advocacy Only"
              : nextPricing.selectedPlan === "single_complaint"
              ? "State Complaint Support"
              : "Advocacy + State Complaints";
          toast.success(
            `Published ${planTitle} to ${parentFirstName}'s portal`
          );
        },
      }
    );
  };

  const scheduleDiscoveryMutation = trpc.leads.scheduleDiscovery.useMutation({
    onSuccess: () => {
      toast.success("Discovery appointment scheduled");
      setShowRescheduleForm(false);
      onRefresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const startDiscoveryMutation = trpc.leads.startDiscoveryNow.useMutation({
    onSuccess: () => {
      onSetSessionMode(true);
      onRefresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const completeDiscoveryMutation = trpc.leads.completeDiscovery.useMutation({
    onSuccess: (_updatedWs, vars) => {
      setShowCompletePanel(false);
      onRefresh();
      if (vars.outcome === "completed") {
        toast.success("Discovery saved · Lead progressed to Decision");
        setProgressedToDecisionBanner(true);
        onSetSessionMode(false);
      } else if (vars.outcome === "declined") {
        toast.success("Lead marked Not proceeding");
        onSetSessionMode(false);
      } else {
        toast.success(
          `Recorded outcome: ${
            vars.outcome === "no_answer"
              ? "No answer"
              : vars.outcome === "reschedule_needed"
              ? "Reschedule needed"
              : vars.outcome === "follow_up_later"
              ? "Follow up later"
              : "Canceled"
          }`
        );
        onSetSessionMode(false);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleProgressToDecisionDirect = () => {
    completeDiscoveryMutation.mutate({
      leadId: lead.id,
      outcome: "completed",
      note: "Discovery completed in Lead Center · Progressed to Decision.",
      theirStoryNotes,
      howItWorksNotes,
      additionalNotes,
      questionNotes,
    });
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (isNaN(startTime.getTime())) {
      toast.error("Please select a valid date and time.");
      return;
    }
    scheduleDiscoveryMutation.mutate({
      leadId: lead.id,
      startTime,
      durationMinutes: 30,
      timeZone: journey.timeZone || "Eastern",
      assignedAdvocateName: journey.assignedAdvocate || "Byron Honea",
      notes: scheduleNotes.trim() || undefined,
    });
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOutcome === "declined" && !declineReason.trim()) {
      toast.error(
        "Please enter or select a reason when the family explicitly declines."
      );
      return;
    }

    let rescheduleStartTime: Date | null = null;
    if (
      selectedOutcome === "reschedule_needed" &&
      rescheduleDate &&
      rescheduleTime
    ) {
      const parsed = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      if (!isNaN(parsed.getTime())) {
        rescheduleStartTime = parsed;
      }
    }

    completeDiscoveryMutation.mutate({
      leadId: lead.id,
      outcome: selectedOutcome,
      note: outcomeNote.trim() || undefined,
      nextActionLabel:
        selectedOutcome === "no_answer" ||
        selectedOutcome === "follow_up_later" ||
        selectedOutcome === "cancelled"
          ? nextActionLabel
          : undefined,
      nextActionDate:
        (selectedOutcome === "no_answer" ||
          selectedOutcome === "follow_up_later" ||
          selectedOutcome === "cancelled") &&
        nextActionDate
          ? new Date(`${nextActionDate}T10:00:00`)
          : null,
      rescheduleStartTime,
      declineReason:
        selectedOutcome === "declined" ? declineReason.trim() : undefined,
      theirStoryNotes,
      howItWorksNotes,
      additionalNotes,
      questionNotes,
    });
  };

  const scheduledAt =
    journey.scheduledAppointment?.startTime ||
    discoveryCall?.scheduledAt ||
    lead.discoveryCallDate;
  const upcomingApt =
    appointments.find((a: any) => a.status !== "Cancelled") || null;
  const dState = isSessionMode ? "in_progress" : journey.discoveryState;
  const callAttempts = journey.callAttempts || [];

  // Missing details detection for the Right Column (`Missing details`)
  const missingDetailItems: Array<{ label: string; status: string }> = [];
  if (!intakeStudentSchool.trim()) {
    missingDetailItems.push({
      label: "School / district",
      status: "Not provided",
    });
  }
  if (!intakeStudentGrade.trim()) {
    missingDetailItems.push({
      label: "Grade level",
      status: "Not provided",
    });
  }
  if (!intakeDesiredOutcome.trim()) {
    missingDetailItems.push({
      label: "Desired outcome",
      status: "Not provided",
    });
  }
  if (!intakeParentPhone.trim() && !intakeParentEmail.trim()) {
    missingDetailItems.push({
      label: "Phone / email",
      status: "Not provided",
    });
  }
  if (!intakeConcerns.trim()) {
    missingDetailItems.push({
      label: "Main concerns",
      status: "Not provided",
    });
  }

  const savedTimeFormatted = lastSavedAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const concernBullets = intakeConcerns
    .split(/\n|;|(?<=\.)\s+/)
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div
      data-testid="lead-discovery-unit"
      className="pt-2 pb-6 px-1 sm:px-3 space-y-5"
    >
      {/* ── Pre-Session / Non-Session Status Banners (when viewing `/leads/:id/discovery` outside live session) ── */}
      {dState === "unscheduled" && !isSessionMode && (
        <div
          data-testid="discovery-state-unscheduled"
          className="rounded-xl border border-[#C5A059]/35 bg-[#051024]/95 p-4 space-y-3 shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2
                  className="text-base sm:text-lg font-serif font-bold text-[#FFFDF7]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {journey.discoveryOutcome !== "pending"
                    ? `Discovery · ${
                        journey.discoveryOutcome === "no_answer"
                          ? "No answer"
                          : journey.discoveryOutcome === "reschedule_needed"
                          ? "Needs rescheduling"
                          : "Canceled"
                      }`
                    : "Start or Schedule Discovery Conversation"}
                </h2>
                <Badge className="bg-[#0D1E47] text-[#FFE394] border-[#C5A059]/45 text-[11px]">
                  Next: {journey.nextActionLabel}
                </Badge>
              </div>
              <p className="text-xs text-[#CBD5E1]">
                Start the discovery conversation below or schedule a future call
                time.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                data-testid="discovery-record-attempt-btn"
                onClick={() => {
                  setSelectedOutcome("no_answer");
                  setShowCompletePanel(true);
                }}
                className="h-9 border-[#C5A059]/40 bg-[#051024] text-[#E6ECF5] hover:bg-[#0D1E47] text-xs cursor-pointer"
              >
                Record Call Outcome
              </Button>
              <Button
                type="button"
                data-testid="discovery-start-live-btn"
                onClick={() =>
                  startDiscoveryMutation.mutate({ leadId: lead.id })
                }
                className="h-9 rounded-full px-5 bg-gradient-to-b from-[#F3DC99] via-[#D4AF5A] to-[#9E782F] text-[#071326] font-serif font-bold hover:brightness-105 text-xs cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 mr-1.5" />
                {journey.hasStartedDiscovery ||
                journey.hasSavedDiscoveryProgress
                  ? "Resume discovery"
                  : "Start discovery now"}
              </Button>
            </div>
          </div>

          <form
            onSubmit={handleScheduleSubmit}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2.5 border-t border-[#C5A059]/25"
          >
            <div>
              <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                Date
              </label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                Time ({journey.timeZone || "Eastern"})
              </label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                Note (Optional)
              </label>
              <Input
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Preparation or contact note"
                className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                data-testid="discovery-schedule-submit-btn"
                disabled={scheduleDiscoveryMutation.isPending}
                className="w-full h-8 bg-[#0D1E47] border border-[#C5A059]/50 text-[#FFE394] hover:bg-[#162F5E] text-xs font-semibold cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Schedule Discovery
              </Button>
            </div>
          </form>
        </div>
      )}

      {dState === "scheduled" && !isSessionMode && (
        <div
          data-testid="discovery-state-scheduled"
          className="rounded-xl border border-[#C5A059]/40 bg-[#051024]/95 p-4 space-y-3 shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#102347] text-[#FFE394] border-[#C5A059]/45 text-[11px]">
                  <Calendar className="w-3 h-3 mr-1" />
                  Discovery Scheduled
                </Badge>
                <span className="text-sm font-serif font-bold text-[#FFFDF7]">
                  {journey.scheduledAppointment?.formattedDateTimeTz ||
                    (scheduledAt
                      ? new Date(scheduledAt).toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Appointment linked")}
                </span>
              </div>
              <p className="text-xs text-[#CBD5E1]">
                Advocate:{" "}
                {journey.scheduledAppointment?.assignedAdvocateName ||
                  upcomingApt?.assignedAdvocateName ||
                  journey.assignedAdvocate ||
                  "Byron Honea"}{" "}
                · Contact: {lead.parentName} (
                {lead.parentPhone || lead.parentEmail || "No phone"})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRescheduleForm((p) => !p)}
                className="h-8 border-[#C5A059]/40 bg-[#071333] text-[#E6ECF5] hover:bg-[#0D1E47] text-xs cursor-pointer"
              >
                Reschedule
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="scheduled-record-outcome-btn"
                onClick={() => {
                  setSelectedOutcome("no_answer");
                  setShowCompletePanel(true);
                }}
                className="h-8 border-[#C5A059]/40 bg-[#071333] text-[#E6ECF5] hover:bg-[#0D1E47] text-xs cursor-pointer"
              >
                No Answer / Outcome
              </Button>
              <Button
                type="button"
                data-testid="start-scheduled-discovery-btn"
                onClick={() =>
                  startDiscoveryMutation.mutate({ leadId: lead.id })
                }
                className="h-8 rounded-full px-5 bg-gradient-to-b from-[#F3DC99] via-[#D4AF5A] to-[#9E782F] text-[#071326] font-serif font-bold hover:brightness-105 text-xs cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 mr-1.5" />
                {journey.hasStartedDiscovery ||
                journey.hasSavedDiscoveryProgress
                  ? "Resume discovery"
                  : "Start discovery"}
              </Button>
            </div>
          </div>

          {showRescheduleForm && (
            <form
              onSubmit={handleScheduleSubmit}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#C5A059]/25"
            >
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                required
              />
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                required
              />
              <Input
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Reason for reschedule"
                className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
              />
              <Button
                type="submit"
                className="h-8 bg-[#102347] border border-[#C5A059]/50 text-[#FFE394] text-xs cursor-pointer"
              >
                Update Appointment
              </Button>
            </form>
          )}
        </div>
      )}

      {dState === "completed" && !isSessionMode && (
        <div
          data-testid="discovery-state-completed"
          className="rounded-xl border border-[#C5A059]/45 bg-[#051024]/95 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-400/30 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Discovery Completed
                </Badge>
                <span className="text-xs text-[#D8C7A5]">
                  Next: {journey.nextActionLabel}
                </span>
              </div>
              <h2
                className="text-lg font-serif font-bold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Discovery Call Summary
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl">
                {theirStoryNotes ||
                  additionalNotes ||
                  journey.concerns ||
                  "Discovery call completed. Ready to manage the family's decision."}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSetSessionMode(true)}
                className="h-9 border-[#C5A059]/45 bg-[#071333] text-slate-200 hover:bg-[#0D1E47] text-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Review Session Notes
              </Button>
              <Button
                type="button"
                data-testid="discovery-continue-to-decision-btn"
                onClick={() => onNavigateStage("decision", false)}
                className="h-9 rounded-full px-5 bg-gradient-to-b from-[#F3DC99] via-[#D4AF5A] to-[#9E782F] text-[#071326] font-serif font-bold hover:brightness-105 text-xs cursor-pointer"
              >
                Open Decision →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Interrupted / Saved Progress Banner when viewing Discovery outside active session ── */}
      {!isSessionMode &&
        dState === "in_progress" &&
        journey.discoveryOutcome !== "completed" && (
          <div
            data-testid="discovery-interrupted-resume-banner"
            className="rounded-xl border border-[#C5A059]/50 bg-gradient-to-r from-[#1A1405]/90 via-[#08152E] to-[#040D22] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#E6ECF5]">
              <Badge className="bg-amber-500/20 text-[#FFE394] border-[#C5A059]/50 text-[11px]">
                <Clock className="w-3 h-3 mr-1" />
                Discovery in progress · Saved progress retained
              </Badge>
              <span>
                Click <strong className="text-white">Resume discovery</strong>{" "}
                to continue in full session mode.
              </span>
            </div>
            <Button
              type="button"
              data-testid="resume-discovery-primary-btn"
              onClick={() => onSetSessionMode(true)}
              className="h-8 rounded-full px-5 bg-gradient-to-b from-[#F3DC99] via-[#D4AF5A] to-[#9E782F] text-[#071326] font-serif font-bold hover:brightness-105 text-xs cursor-pointer shrink-0"
            >
              <PhoneCall className="w-3.5 h-3.5 mr-1.5" />
              Resume discovery →
            </Button>
          </div>
        )}

      {/* ── Complete Discovery Outcome Panel (When Finishing or Selecting Another Call Outcome) ── */}
      {showCompletePanel && (
        <form
          onSubmit={handleCompleteSubmit}
          data-testid="complete-discovery-outcome-panel"
          className="rounded-xl border border-[#C5A059]/60 bg-[#051024] p-5 space-y-4 shadow-[0_16px_40px_rgba(0,0,0,0.85)]"
        >
          <div className="flex items-center justify-between border-b border-[#C5A059]/25 pb-3">
            <div>
              <h3
                className="text-base sm:text-lg font-serif font-bold text-[#FFFDF7]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Finish Discovery / Record Call Outcome
              </h3>
              <p className="text-xs text-[#CBD5E1]">
                Choose the outcome of this discovery conversation. All attempts
                and notes are preserved.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCompletePanel(false)}
              className="text-xs text-[#D8C7A5] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[
              {
                key: "completed",
                label: "Completed",
                desc: "Progress to Decision",
              },
              {
                key: "no_answer",
                label: "No answer",
                desc: "Needs rescheduling",
              },
              {
                key: "reschedule_needed",
                label: "Needs rescheduling",
                desc: "Pick new time",
              },
              {
                key: "follow_up_later",
                label: "Follow up later",
                desc: "Stay in Discovery",
              },
              {
                key: "cancelled",
                label: "Canceled",
                desc: "Needs rescheduling",
              },
              {
                key: "declined",
                label: "Not proceeding",
                desc: "Close Lead",
              },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                data-testid={`discovery-outcome-option-${opt.key}`}
                onClick={() => {
                  setSelectedOutcome(opt.key as any);
                  if (opt.key === "follow_up_later") {
                    setNextActionLabel("Follow up with family on discovery");
                  } else if (opt.key === "no_answer") {
                    setNextActionLabel("Reschedule discovery");
                  }
                }}
                className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                  selectedOutcome === opt.key
                    ? "bg-[#102347] border-[#DFBE77] text-white shadow-[0_0_12px_rgba(223,190,119,0.25)]"
                    : "bg-[#030A18] border-[#C5A059]/30 text-slate-300 hover:border-[#C5A059]/60"
                }`}
              >
                <p className="text-xs font-serif font-bold">{opt.label}</p>
                <p className="text-[10px] text-[#C6B697] mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>

          {(selectedOutcome === "no_answer" ||
            selectedOutcome === "follow_up_later" ||
            selectedOutcome === "cancelled") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                  Next Action
                </label>
                <Input
                  value={nextActionLabel}
                  onChange={(e) => setNextActionLabel(e.target.value)}
                  placeholder="e.g. Reschedule discovery"
                  className="h-9 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                  Follow-up / Retry Date
                </label>
                <Input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="h-9 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                />
              </div>
            </div>
          )}

          {selectedOutcome === "reschedule_needed" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                  New Discovery Date (Optional if not yet chosen)
                </label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="h-9 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                  New Discovery Time
                </label>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="h-9 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                />
              </div>
            </div>
          )}

          {selectedOutcome === "declined" && (
            <div>
              <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                Decline / Early Closure Reason *
              </label>
              <Input
                data-testid="discovery-decline-reason-input"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Family resolved issue with district or declined services"
                className="h-9 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-[#D8C7A5] mb-1 block">
              Call Outcome Note (Optional)
            </label>
            <Textarea
              data-testid="discovery-outcome-note-input"
              value={outcomeNote}
              onChange={(e) => setOutcomeNote(e.target.value)}
              placeholder="Brief summary of the call or attempt..."
              rows={2}
              className="bg-[#030A18] border-[#C5A059]/35 text-white text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCompletePanel(false)}
              className="h-9 rounded-full px-5 text-xs border-[#C5A059]/45 bg-[#040D22] text-[#E6ECF5] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="confirm-discovery-outcome-btn"
              disabled={completeDiscoveryMutation.isPending}
              className="h-9 rounded-full px-6 text-xs bg-gradient-to-b from-[#F3DC99] via-[#D4AF5A] to-[#9E782F] text-[#071326] font-serif font-bold cursor-pointer"
            >
              {completeDiscoveryMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving Outcome...
                </>
              ) : selectedOutcome === "completed" ? (
                "Complete Discovery & Open Decision →"
              ) : selectedOutcome === "declined" ? (
                "Close Lead"
              ) : (
                "Save Call Attempt"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          DISCOVERY CONVERSATION WORKSPACE (`PG-003-SES` — 3-COLUMN ADMIRALTY LAYOUT
          WITH USER'S 7 DESIGNED DISCOVERY CALL PROCESS STEPS)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {(dState === "in_progress" || isSessionMode || dState !== "completed") && (
        <div data-testid="discovery-session-workspace" className="space-y-0">
          {/* ─── 1. TOP HEADER BAR: `Discovery conversation` + `Draft saved` | `Pause session` + `Finish discovery` ─── */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5 border-b border-[#C5A059]/35">
            <div className="flex flex-wrap items-baseline gap-4 sm:gap-6">
              <h2
                className="text-2xl sm:text-[32px] font-serif font-bold text-[#FFFDF7] tracking-tight leading-none"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Discovery conversation
              </h2>

              <div className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E]"
                />
                <span
                  className="text-xs sm:text-[14px] font-serif italic text-[#CBD5E1]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {savingDraft
                    ? "Saving draft..."
                    : `Draft saved ${savedTimeFormatted}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="pause-discovery-session-btn"
                onClick={() => {
                  saveDraftMutation.mutate({
                    leadId: lead.id,
                    currentStepId: activeStep,
                    questionMode,
                    openingScript,
                    voicemailScript,
                    callScriptNotes,
                    theirStoryNotes,
                    howItWorksNotes,
                    additionalNotes,
                    privateNotes,
                    questionNotes: JSON.stringify(questionNotes),
                    pricingNotes: JSON.stringify(pricingState),
                    closingResponse,
                  });
                  toast.success(
                    "Discovery progress saved · Click Resume discovery anytime to continue"
                  );
                  onSetSessionMode(false);
                }}
                className="h-10 px-6 rounded-full border border-[#C5A059]/55 bg-[#051024]/90 hover:bg-[#0A1E3F] hover:border-[#FFE394] text-[#F1F5F9] text-sm sm:text-[15px] font-serif transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Pause session
              </button>

              <button
                type="button"
                data-testid="open-complete-discovery-btn"
                onClick={() => {
                  setSelectedOutcome("completed");
                  setShowCompletePanel(true);
                }}
                className="h-10 px-7 rounded-full bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] hover:brightness-105 text-[#071326] border border-[#FFE8A3]/90 text-sm sm:text-[15px] font-serif font-bold shadow-[0_4px_14px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.55)] transition-all cursor-pointer"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Finish discovery
              </button>

              {/* Hidden direct-complete button preserved for automated E2E tests */}
              <button
                type="button"
                data-testid="progress-to-decision-btn"
                onClick={handleProgressToDecisionDirect}
                className="sr-only"
              >
                Progress to Decision
              </button>
            </div>
          </div>

          {/* ─── 2. THREE-COLUMN CONVERSATION WORKSPACE (`CONVERSATION GUIDE (01-07)` | `STEP WORKSPACE` | `FROM INTAKE`) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-[#C5A059]/30 pt-4">
            <DiscoveryProcessSteps
              activeStep={activeStep}
              onSelectStep={(step) => {
                setActiveStep(step);
                triggerDraftSave({ step });
              }}
              parentFirstName={parentFirstName}
              parentFullName={parentFullName}
              studentDisplayName={studentDisplayName}
              questions={questions}
              activeQuestionId={activeQuestionId}
              onSelectQuestionId={setActiveQuestionId}
              questionMode={questionMode}
              onChangeQuestionMode={(mode) => {
                setQuestionMode(mode);
                triggerDraftSave({ qMode: mode });
              }}
              openingScript={openingScript}
              onChangeOpeningScript={(val) => {
                setOpeningScript(val);
                triggerDraftSave({ openScr: val });
              }}
              voicemailScript={voicemailScript}
              onChangeVoicemailScript={(val) => {
                setVoicemailScript(val);
                triggerDraftSave({ vmScr: val });
              }}
              callScriptNotes={callScriptNotes}
              onChangeCallScriptNotes={(val) => {
                setCallScriptNotes(val);
                triggerDraftSave({ callScrNotes: val });
              }}
              theirStoryNotes={theirStoryNotes}
              onChangeTheirStoryNotes={(val) => {
                setTheirStoryNotes(val);
                triggerDraftSave({ story: val });
              }}
              questionNotes={questionNotes}
              onChangeQuestionNotes={(next) => {
                setQuestionNotes(next);
                triggerDraftSave({ qNotes: next });
              }}
              howItWorksNotes={howItWorksNotes}
              onChangeHowItWorksNotes={(val) => {
                setHowItWorksNotes(val);
                triggerDraftSave({ howItWorks: val });
              }}
              pricingState={pricingState}
              onChangePricingState={(next) => {
                setPricingState(next);
                triggerDraftSave({ pricing: next });
              }}
              closingResponse={closingResponse}
              onChangeClosingResponse={(val) => {
                setClosingResponse(val);
                triggerDraftSave({ closing: val });
              }}
              additionalNotes={additionalNotes}
              onChangeAdditionalNotes={(val) => {
                setAdditionalNotes(val);
                triggerDraftSave({ additional: val });
              }}
              privateNotes={privateNotes}
              onChangePrivateNotes={(val) => {
                setPrivateNotes(val);
                triggerDraftSave({ priv: val });
              }}
              onPublishPlanToPortal={handlePublishPlanToPortal}
              isPublishingPlan={saveDraftMutation.isPending}
              onFinishDiscovery={() => {
                setSelectedOutcome("completed");
                setShowCompletePanel(true);
              }}
              onRecordDeclinedFromStep5={(reason, note) => {
                setSelectedOutcome("declined");
                setDeclineReason(reason);
                setOutcomeNote(note);
                completeDiscoveryMutation.mutate({
                  leadId: lead.id,
                  outcome: "declined",
                  declineReason: reason,
                  note: note || undefined,
                  theirStoryNotes,
                  howItWorksNotes,
                  additionalNotes,
                  questionNotes,
                });
              }}
            />

            {/* ═══ RIGHT COLUMN (3 Cols): `FROM INTAKE`, `Intake | Scripts`, `Missing details`, `Other call outcomes →` ═══ */}
            <div className="lg:col-span-3 lg:pl-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3.5">
                {/* Eyebrow: FROM INTAKE */}
                <span className="text-[11px] sm:text-xs font-serif uppercase tracking-[0.22em] text-[#D8C7A5] block">
                  FROM INTAKE
                </span>

                {/* Main concerns */}
                <div className="space-y-1.5">
                  <h4
                    className="text-sm sm:text-[15px] font-serif font-bold text-[#FFFDF7]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Main concerns
                  </h4>

                  {concernBullets.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-[#CBD5E1]">
                      {concernBullets.map((line: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] mt-1.5 shrink-0" />
                          <span className="line-clamp-2 leading-snug">
                            {line}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-2 py-1" aria-hidden="true">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
                        <span className="h-2 w-4/5 rounded-full bg-[#334155]/75" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
                        <span className="h-2 w-3/4 rounded-full bg-[#334155]/75" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
                        <span className="h-2 w-2/3 rounded-full bg-[#334155]/75" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Desired outcome */}
                <div className="space-y-1 pt-0.5">
                  <h4
                    className="text-sm sm:text-[15px] font-serif font-bold text-[#FFFDF7]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Desired outcome
                  </h4>
                  <p
                    className="text-xs sm:text-[13px] font-serif italic text-[#94A3B8] line-clamp-2"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {intakeDesiredOutcome.trim()
                      ? intakeDesiredOutcome
                      : "Available in intake details"}
                  </p>
                  <div className="pt-0.5">
                    <button
                      type="button"
                      data-testid="read-intake-details-btn"
                      onClick={() => {
                        setRightPanelTab("intake");
                        setShowInlineIntakeEditor((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1 text-xs sm:text-[14px] font-serif italic font-semibold text-[#DFBE77] hover:text-[#FFE394] underline underline-offset-4 decoration-[#C5A059]/65 cursor-pointer"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      <span>
                        {showInlineIntakeEditor ? "Hide intake" : "Read intake"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Divider */}
                <div className="h-px bg-[#C5A059]/30 my-2" />

                {/* Two-Segment Toggle Pill: `Intake` | `Scripts` */}
                <div className="inline-flex rounded-lg border border-[#C5A059]/45 bg-[#040B1A] p-0.5">
                  <button
                    type="button"
                    data-testid="discovery-subtab-intake"
                    onClick={() => {
                      setRightPanelTab("intake");
                      setShowInlineIntakeEditor(true);
                    }}
                    className={`px-5 py-1 rounded-md text-xs sm:text-[14px] font-serif transition-all cursor-pointer ${
                      rightPanelTab === "intake"
                        ? "bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071326] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                        : "text-[#E2E8F0] hover:text-white"
                    }`}
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Intake
                  </button>
                  <button
                    type="button"
                    data-testid="discovery-subtab-scripts"
                    onClick={() => setRightPanelTab("scripts")}
                    className={`px-5 py-1 rounded-md text-xs sm:text-[14px] font-serif transition-all cursor-pointer ${
                      rightPanelTab === "scripts"
                        ? "bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071326] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                        : "text-[#E2E8F0] hover:text-white"
                    }`}
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Scripts
                  </button>
                </div>

                {/* Content Below Segmented Toggle */}
                {rightPanelTab === "intake" ? (
                  <div className="space-y-2.5 pt-1">
                    <h4
                      className="text-sm sm:text-[15px] font-serif font-bold text-[#FFFDF7]"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      Missing details
                    </h4>

                    {(missingDetailItems.length > 0
                      ? missingDetailItems.slice(0, 2)
                      : [
                          {
                            label: "School / district",
                            status: intakeStudentSchool || "Provided",
                          },
                        ]
                    ).map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[#C5A059]/35 bg-[#051024]/90 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-[#E6ECF5] font-medium truncate">
                          {item.label}
                        </span>
                        <span
                          className="text-[#94A3B8] font-serif italic truncate"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                          }}
                        >
                          {item.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowInlineIntakeEditor(true)}
                          className="inline-flex items-center gap-1 text-[#DFBE77] hover:text-[#FFE394] font-serif font-semibold underline underline-offset-4 decoration-[#C5A059]/65 shrink-0 cursor-pointer"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                          }}
                        >
                          <span>Add details</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Scripts View inside Right Column */
                  <div className="space-y-2.5 pt-1">
                    <div className="rounded-lg border border-[#C5A059]/35 bg-[#051024]/90 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-serif font-bold text-[#FFE394]">
                          Opening Script
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(openingScript);
                            setCopiedScript("opening");
                            setTimeout(() => setCopiedScript(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-[#CBD5E1] hover:text-white cursor-pointer"
                        >
                          {copiedScript === "opening" ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          Copy
                        </button>
                      </div>
                      <p className="text-[11px] text-[#E2E8F0] whitespace-pre-line leading-relaxed">
                        {openingScript}
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#C5A059]/35 bg-[#051024]/90 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-serif font-bold text-[#FFE394]">
                          Voicemail Script
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(voicemailScript);
                            setCopiedScript("voicemail");
                            setTimeout(() => setCopiedScript(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-[#CBD5E1] hover:text-white cursor-pointer"
                        >
                          {copiedScript === "voicemail" ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          Copy
                        </button>
                      </div>
                      <p className="text-[11px] text-[#E2E8F0] whitespace-pre-line leading-relaxed">
                        {voicemailScript}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom-Right Link: `Other call outcomes →` */}
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  data-testid="discovery-bottom-outcome-no_answer"
                  onClick={() => {
                    setSelectedOutcome("no_answer");
                    setShowCompletePanel((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm sm:text-[15px] font-serif italic font-semibold text-[#DFBE77] hover:text-[#FFE394] underline underline-offset-[6px] decoration-[#C5A059]/60 hover:decoration-[#FFE394] transition-colors cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <span>Other call outcomes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ─── 3. INLINE EXPANDABLE INTAKE EDITOR (WHEN `Read intake →`, `Intake`, OR `Add details →` IS CLICKED) ─── */}
          {showInlineIntakeEditor && (
            <div
              data-testid="discovery-inline-intake-panel"
              className="mt-4 rounded-xl border border-[#C5A059]/45 bg-[#051024]/95 p-5 space-y-4 shadow-[0_12px_30px_rgba(0,0,0,0.75)]"
            >
              <div className="flex items-center justify-between border-b border-[#C5A059]/25 pb-2.5">
                <div>
                  <h4
                    className="text-base font-serif font-bold text-[#FFFDF7]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Family & Student Intake Details
                  </h4>
                  <p className="text-xs text-[#CBD5E1]">
                    Review existing intake information or add missing details
                    collected during discovery.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInlineIntakeEditor(false)}
                    className="text-xs text-[#C6B697] hover:text-white px-2 py-1 cursor-pointer"
                  >
                    Close
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    data-testid="save-discovery-intake-btn"
                    disabled={updateIntakeDuringDiscoveryMutation.isPending}
                    onClick={() => {
                      updateIntakeDuringDiscoveryMutation.mutate({
                        leadId: lead.id,
                        parent: {
                          phone: intakeParentPhone,
                          email: intakeParentEmail,
                        },
                        students: intakeStudentFirst.trim()
                          ? [
                              {
                                id: students[0]?.id || undefined,
                                firstName: intakeStudentFirst.trim(),
                                lastName:
                                  intakeStudentLast.trim() ||
                                  lead.parentName?.split(" ").slice(-1)[0] ||
                                  "Student",
                                gradeLevel: intakeStudentGrade,
                                schoolName: intakeStudentSchool,
                                iepOr504: students[0]?.iepOr504 || "IEP",
                              },
                            ]
                          : undefined,
                        concerns: intakeConcerns,
                        desiredOutcome: intakeDesiredOutcome,
                      });
                    }}
                    className="h-8 rounded-full px-4 bg-gradient-to-b from-[#F3DC99] via-[#D4AF5A] to-[#9E782F] text-[#071326] font-serif font-bold text-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save Intake Details
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                    Parent Phone
                  </label>
                  <Input
                    data-testid="discovery-intake-phone"
                    value={intakeParentPhone}
                    onChange={(e) => setIntakeParentPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                    Parent Email
                  </label>
                  <Input
                    data-testid="discovery-intake-email"
                    value={intakeParentEmail}
                    onChange={(e) => setIntakeParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                    Student First Name
                  </label>
                  <Input
                    data-testid="discovery-intake-student-first"
                    value={intakeStudentFirst}
                    onChange={(e) => setIntakeStudentFirst(e.target.value)}
                    placeholder="Student first name"
                    className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                    Student Last Name
                  </label>
                  <Input
                    value={intakeStudentLast}
                    onChange={(e) => setIntakeStudentLast(e.target.value)}
                    placeholder="Student last name"
                    className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                    Grade Level
                  </label>
                  <Input
                    value={intakeStudentGrade}
                    onChange={(e) => setIntakeStudentGrade(e.target.value)}
                    placeholder="e.g. 4th Grade"
                    className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                    School / District
                  </label>
                  <Input
                    value={intakeStudentSchool}
                    onChange={(e) => setIntakeStudentSchool(e.target.value)}
                    placeholder="School or district"
                    className="h-8 bg-[#030A18] border-[#C5A059]/35 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                    Main Concerns
                  </label>
                  <Textarea
                    data-testid="discovery-intake-concerns"
                    value={intakeConcerns}
                    onChange={(e) => setIntakeConcerns(e.target.value)}
                    rows={3}
                    placeholder="Capture main special education / IEP / 504 concerns..."
                    className="bg-[#030A18] border-[#C5A059]/35 text-white text-xs resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#D8C7A5] mb-1 block">
                    Desired Outcome
                  </label>
                  <Textarea
                    data-testid="discovery-intake-desired-outcome"
                    value={intakeDesiredOutcome}
                    onChange={(e) => setIntakeDesiredOutcome(e.target.value)}
                    rows={3}
                    placeholder="What outcome is the family hoping to achieve?"
                    className="bg-[#030A18] border-[#C5A059]/35 text-white text-xs resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Banner when Progressed to Decision: Offers Open Decision immediately */}
      {progressedToDecisionBanner && (
        <div
          data-testid="progressed-to-decision-banner"
          className="rounded-xl border border-emerald-500/40 bg-[#061A2E] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">
                Discovery completed · Lead moved to Decision
              </p>
              <p className="text-xs text-slate-300">
                Discovery notes and call outcome have been saved, and radio
                stage counts have been updated.
              </p>
            </div>
          </div>
          <Button
            type="button"
            data-testid="open-decision-after-discovery-btn"
            onClick={() => onNavigateStage("decision", false)}
            className="h-9 rounded-full px-5 bg-gradient-to-b from-[#F3DC99] via-[#D4AF5A] to-[#9E782F] text-[#071326] font-serif font-bold text-xs cursor-pointer shrink-0"
          >
            Open Decision →
          </Button>
        </div>
      )}

      {/* ── Call Attempt History (Shown when attempts exist) ── */}
      {callAttempts.length > 0 && (
        <div
          data-testid="discovery-attempt-history"
          className="rounded-xl border border-[#C5A059]/30 bg-[#051024]/90 p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-serif font-semibold uppercase tracking-wider text-[#D8C7A5] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#FFE394]" />
              Call Attempt History ({callAttempts.length})
            </h4>
          </div>
          <div className="space-y-2">
            {callAttempts.map((att: any) => (
              <div
                key={att.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-[#C5A059]/25 bg-[#030A18] px-3.5 py-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {att.outcomeLabel}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(att.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {att.note && <p className="text-slate-300">{att.note}</p>}
                </div>
                {att.nextAction && (
                  <Badge className="bg-[#0D1E47] text-[#FFE394] border-[#C5A059]/35 text-[10px] shrink-0">
                    Next: {att.nextAction}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  PhoneCall,
  AlertCircle,
  Check,
  Plus,
  Save,
  Loader2,
  GraduationCap,
  User,
  Link2,
  ArrowRight,
  Globe,
  UserCheck,
  MessageSquarePlus,
  ClipboardCheck,
  ChevronRight,
  Clock,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

interface LeadInquiryUnitProps {
  workspace: any;
  onRefresh: () => void;
  onNavigateStage: (
    stage: "inquiry" | "discovery" | "decision" | "onboarding",
    sessionMode?: boolean
  ) => void;
  onBackToList?: () => void;
}

export function LeadInquiryUnit({
  workspace,
  onRefresh,
  onNavigateStage,
}: LeadInquiryUnitProps) {
  const { lead, parentContact, students = [], journey } = workspace;

  const [concerns, setConcerns] = useState(journey.concerns || "");
  const [desiredOutcome, setDesiredOutcome] = useState(
    journey.desiredOutcome || ""
  );
  const [preferredContactMethod, setPreferredContactMethod] = useState(
    journey.preferredContactMethod || "Phone"
  );
  const [availability, setAvailability] = useState(journey.availability || "");
  const [timeZone, setTimeZone] = useState(journey.timeZone || "Eastern");
  const [assignedAdvocate, setAssignedAdvocate] = useState(
    journey.assignedAdvocate || "Byron Honea"
  );
  const [parentPhone, setParentPhone] = useState(lead.parentPhone || "");
  const [parentEmail, setParentEmail] = useState(lead.parentEmail || "");

  const [studentList, setStudentList] = useState<any[]>(
    students.length > 0
      ? students
      : [
          {
            firstName: lead.studentName?.split(" ")[0] || "",
            lastName: lead.studentName?.split(" ").slice(1).join(" ") || "",
            gradeLevel: lead.studentGrade || "",
            schoolName: "",
            iepOr504: "IEP",
          },
        ]
  );

  const isAlreadyScheduled = Boolean(
    journey.appointmentState === "scheduled" && journey.scheduledAppointment
  );
  const isNeedsRescheduling = journey.appointmentState === "needs_rescheduling";

  // Inline scheduling drawer & collapsible sections
  const [showScheduler, setShowScheduler] = useState(false);
  const [intakeExpanded, setIntakeExpanded] = useState(false);
  const [familyFileTab, setFamilyFileTab] = useState<"contacts" | "notes">(
    "contacts"
  );
  const [showContactDetailsInline, setShowContactDetailsInline] =
    useState(false);

  const tomorrowDefault = new Date(Date.now() + 86400000);
  tomorrowDefault.setHours(10, 0, 0, 0);
  const [scheduleDate, setScheduleDate] = useState(
    journey.scheduledAppointment?.startTime
      ? new Date(journey.scheduledAppointment.startTime)
          .toISOString()
          .slice(0, 10)
      : tomorrowDefault.toISOString().slice(0, 10)
  );
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [scheduleNotes, setScheduleNotes] = useState("");

  // Contact attempt & direct-to-decision inline drawers
  const [attemptNote, setAttemptNote] = useState("");
  const [showDirectDecisionBox, setShowDirectDecisionBox] = useState(false);
  const [directDecisionNote, setDirectDecisionNote] = useState("");

  useEffect(() => {
    setConcerns(journey.concerns || "");
    setDesiredOutcome(journey.desiredOutcome || "");
    setPreferredContactMethod(journey.preferredContactMethod || "Phone");
    setAvailability(journey.availability || "");
    setTimeZone(journey.timeZone || "Eastern");
    setAssignedAdvocate(journey.assignedAdvocate || "Byron Honea");
    setParentPhone(lead.parentPhone || "");
    setParentEmail(lead.parentEmail || "");
    if (students.length > 0) {
      setStudentList(students);
    }
  }, [
    lead.id,
    journey.concerns,
    journey.desiredOutcome,
    journey.timeZone,
    journey.assignedAdvocate,
    students.length,
  ]);

  const updateInquiryMutation = trpc.leads.updateInquiry.useMutation({
    onSuccess: (_updated, vars) => {
      onRefresh();
      if (vars.sendSchedulingLink) {
        toast.success(
          "Scheduling link sent · Lead stays in New Leads while awaiting booking"
        );
      } else if (vars.recordContactAttempt) {
        toast.success("Note & contact attempt recorded");
        setAttemptNote("");
      } else if (vars.progressDirectlyToDecision) {
        toast.success("Progressed directly to Decision");
        setShowDirectDecisionBox(false);
        onNavigateStage("decision", false);
      } else {
        toast.success("Client account & intake details saved");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const scheduleDiscoveryMutation = trpc.leads.scheduleDiscovery.useMutation({
    onSuccess: () => {
      toast.success(
        "Discovery appointment scheduled · Lead remains in New Leads until discovery conversation starts"
      );
      setShowScheduler(false);
      onRefresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const startDiscoveryNowMutation = trpc.leads.startDiscoveryNow.useMutation({
    onSuccess: () => {
      toast.success(
        "Live discovery session started · Moved to Stage 2: Discovery"
      );
      onRefresh();
      onNavigateStage("discovery", true);
    },
    onError: (err) => toast.error(err.message),
  });

  const markAppointmentOutcomeMutation =
    trpc.leads.completeDiscovery.useMutation({
      onSuccess: (_, vars) => {
        toast.success(
          vars.outcome === "cancelled"
            ? "Appointment canceled · Status updated to Needs rescheduling"
            : "Missed appointment recorded · Status updated to Needs rescheduling"
        );
        setShowScheduler(true);
        onRefresh();
      },
      onError: (err) => toast.error(err.message),
    });

  const handleSaveInquiry = () => {
    updateInquiryMutation.mutate({
      leadId: lead.id,
      parent: {
        phone: parentPhone,
        email: parentEmail,
        preferredContactMethod,
        availability,
      },
      students: studentList.filter((s) => s.firstName?.trim()),
      concerns,
      desiredOutcome,
      timeZone,
      assignedAdvocate,
    });
  };

  const handleSendSchedulingLink = () => {
    if (!parentEmail.trim() && !parentPhone.trim()) {
      toast.error(
        "Please enter an email address or phone number before sending a scheduling link."
      );
      setIntakeExpanded(true);
      return;
    }
    updateInquiryMutation.mutate({
      leadId: lead.id,
      parent: {
        phone: parentPhone,
        email: parentEmail,
        preferredContactMethod,
        availability,
      },
      timeZone,
      assignedAdvocate,
      sendSchedulingLink: true,
    });
  };

  const handleRecordAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attemptNote.trim()) {
      toast.error("Please enter a note for this contact attempt.");
      return;
    }
    updateInquiryMutation.mutate({
      leadId: lead.id,
      recordContactAttempt: attemptNote.trim(),
    });
  };

  const handleProgressDirectlyToDecision = (e: React.FormEvent) => {
    e.preventDefault();
    updateInquiryMutation.mutate({
      leadId: lead.id,
      progressDirectlyToDecision: true,
      directToDecisionNote:
        directDecisionNote.trim() ||
        "Discovery call unnecessary; progressed directly to Decision.",
    });
  };

  const handleScheduleDiscovery = (e: React.FormEvent) => {
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
      assignedAdvocateName: assignedAdvocate || "Byron Honea",
      timeZone: timeZone || "Eastern",
      notes: scheduleNotes.trim() || undefined,
    });
  };

  const validStudents = studentList.filter((s) => s.firstName?.trim());
  const hasStudentProfile = validStudents.length > 0;
  const hasConcernsAndOutcome = Boolean(concerns.trim());

  const blockingIssues: string[] = [];
  if (!lead.parentName || lead.parentName === "Unknown Parent") {
    blockingIssues.push("Parent or guardian name is missing.");
  }
  if (!parentPhone.trim() && !parentEmail.trim()) {
    blockingIssues.push(
      "A phone number or email address is required to reach the family."
    );
  }
  if (!hasStudentProfile) {
    blockingIssues.push("At least one student name is required.");
  }
  if (!hasConcernsAndOutcome) {
    blockingIssues.push("Main concerns are needed to prepare for discovery.");
  }

  const isPreFilledReady =
    Boolean(journey.intakeCompleted) || blockingIssues.length === 0;

  const parentFullName = lead.parentName || "Eleanor Vance";
  const parentFirstName =
    parentFullName.trim().split(/\s+/)[0] || "Family";
  const studentDisplayName =
    validStudents.length > 0
      ? validStudents
          .map((s) => `${s.firstName || ""} ${s.lastName || ""}`.trim())
          .join(", ")
      : lead.studentName || lead.childName || "Student";

  const combinedHistory = [
    ...(journey.sharedHistory || []),
    ...(journey.callAttempts || []),
  ];

  // Primary objective headline on the left
  const primaryObjectiveTitle = isAlreadyScheduled
    ? "Start discovery"
    : isNeedsRescheduling
    ? "Reschedule discovery"
    : "Schedule discovery";

  return (
    <div
      data-testid="lead-inquiry-unit"
      className="pt-3 pb-6 px-1 sm:px-3 space-y-7"
    >
      {/* ─── UPPER TWO-COLUMN SECTION (MATCHING REFERENCE IMAGE) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* ═══ LEFT COLUMN: NEXT FOR {FIRST_NAME}, 3-STEP CHECKLIST & GOLD CTA ═══ */}
        <div className="lg:col-span-7 space-y-5 pt-1">
          {/* Eyebrow: NEXT FOR ELEANOR ─────────────── */}
          <div className="flex items-center gap-4">
            <span
              data-testid="workspace-status-next-summary"
              className="text-xs sm:text-[13px] font-semibold uppercase tracking-[0.22em] text-[#D8B467] shrink-0"
            >
              NEXT FOR {parentFirstName.toUpperCase()}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#C5A059]/55 via-[#C5A059]/25 to-transparent" />
          </div>

          {/* Main Large Serif Title: "Schedule discovery" / "Start discovery" */}
          <h2
            className="text-3xl sm:text-[42px] font-serif font-bold text-[#FFFDF7] tracking-tight leading-[1.1] drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {primaryObjectiveTitle}
          </h2>

          {/* 3-Row Checklist with Thin Horizontal Dividers */}
          <div className="divide-y divide-[#C5A059]/25 border-b border-[#C5A059]/25 max-w-[600px]">
            {/* Row 1: Family account created */}
            <div className="py-3.5 flex items-center gap-3.5">
              <span className="w-6 h-6 rounded-full bg-gradient-to-b from-[#34D399] to-[#059669] border border-[#6EE7B7]/80 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)] shrink-0">
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
              </span>
              <span className="text-base sm:text-[18px] text-[#E6ECF5] font-normal">
                Family account created
              </span>
            </div>

            {/* Row 2: Intake received */}
            <div className="py-3.5 flex items-center justify-between gap-3.5">
              <div className="flex items-center gap-3.5">
                {isPreFilledReady ? (
                  <span className="w-6 h-6 rounded-full bg-gradient-to-b from-[#34D399] to-[#059669] border border-[#6EE7B7]/80 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)] shrink-0">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-5 h-5 mx-0.5 rounded-full bg-gradient-to-b from-[#FDE68A] via-[#EAB308] to-[#B45309] border border-[#FEF08A] shadow-[0_0_10px_rgba(234,179,8,0.55)] shrink-0" />
                )}
                <span
                  data-testid="intake-status-badge"
                  className="text-base sm:text-[18px] text-[#E6ECF5] font-normal"
                >
                  {isPreFilledReady
                    ? "Intake received"
                    : `Intake incomplete (${blockingIssues.length} item${
                        blockingIssues.length === 1 ? "" : "s"
                      })`}
                </span>
              </div>

              {!isPreFilledReady && (
                <button
                  type="button"
                  onClick={() => setIntakeExpanded(true)}
                  className="text-xs text-[#DFBE77] hover:text-[#FFF4D4] underline underline-offset-4 cursor-pointer"
                >
                  Complete intake
                </button>
              )}
            </div>

            {/* Row 3: Choose a discovery time / Discovery scheduled */}
            <div className="py-3.5 flex items-center justify-between gap-3.5">
              <div className="flex items-center gap-3.5">
                {isAlreadyScheduled && journey.scheduledAppointment ? (
                  <>
                    <span className="w-6 h-6 rounded-full bg-gradient-to-b from-[#34D399] to-[#059669] border border-[#6EE7B7]/80 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)] shrink-0">
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </span>
                    <span
                      data-testid="appointment-status-badge"
                      className="text-base sm:text-[19px] font-serif font-bold text-[#FFFDF7]"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      Discovery scheduled ·{" "}
                      <span
                        data-testid="scheduled-appointment-datetime"
                        className="text-[#FFE394]"
                      >
                        {journey.scheduledAppointment.formattedDateTimeTz}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-5 h-5 mx-0.5 rounded-full bg-gradient-to-b from-[#FFE8A3] via-[#DFB24C] to-[#9E7220] border border-[#FFF4D4]/80 shadow-[0_0_12px_rgba(223,178,76,0.65)] shrink-0" />
                    <span
                      data-testid="appointment-status-badge"
                      className="text-base sm:text-[19px] font-serif font-bold text-[#FFFDF7]"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      {isNeedsRescheduling
                        ? "Choose a new discovery time"
                        : journey.schedulingLinkSent
                        ? "Choose a discovery time (Awaiting booking)"
                        : "Choose a discovery time"}
                    </span>
                  </>
                )}
              </div>

              {journey.schedulingLinkSent && !isAlreadyScheduled && (
                <span
                  data-testid="scheduling-link-sent-badge"
                  className="text-xs font-medium text-[#FFE394] bg-[#C5A059]/15 border border-[#C5A059]/40 px-2.5 py-0.5 rounded-full"
                >
                  Awaiting booking
                </span>
              )}
            </div>
          </div>

          {/* Primary Brushed-Gold Button + Inline Links Row */}
          <div className="pt-2 flex flex-wrap items-center gap-x-7 gap-y-3">
            {isAlreadyScheduled ? (
              <>
                <button
                  type="button"
                  data-testid="start-scheduled-discovery-primary-btn"
                  disabled={startDiscoveryNowMutation.isPending}
                  onClick={() =>
                    startDiscoveryNowMutation.mutate({ leadId: lead.id })
                  }
                  className="relative inline-flex items-center justify-center min-w-[250px] h-14 px-8 rounded-[14px] bg-gradient-to-b from-[#F3DC99] via-[#D4AF5A] to-[#9E782F] text-[#071326] border border-[#FFE8A3]/85 shadow-[0_10px_24px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.65)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-3.5 w-2 h-2 rounded-full bg-[#78581C] shadow-[inset_0_1px_1px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.4)]"
                  />
                  <span
                    className="text-lg sm:text-[21px] font-serif font-bold tracking-tight"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  >
                    {startDiscoveryNowMutation.isPending
                      ? "Starting discovery..."
                      : "Start discovery"}
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="manage-reschedule-appointment-btn"
                  onClick={() => setShowScheduler((prev) => !prev)}
                  className="text-sm sm:text-[16px] text-[#E6ECF5] hover:text-[#FFE394] underline underline-offset-[6px] decoration-[#C5A059]/60 hover:decoration-[#FFE394] transition-colors cursor-pointer"
                >
                  {showScheduler
                    ? "Hide appointment details"
                    : "Manage or reschedule appointment"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="schedule-discovery-primary-btn"
                  onClick={() => {
                    setShowScheduler((prev) => !prev);
                    setTimeout(() => {
                      const el = document.getElementById(
                        "schedule-discovery-date-input"
                      );
                      if (el) el.focus();
                    }, 50);
                  }}
                  className="relative inline-flex items-center justify-center min-w-[260px] h-14 px-8 rounded-[14px] bg-gradient-to-b from-[#F3DC99] via-[#D4AF5A] to-[#9E782F] text-[#071326] border border-[#FFE8A3]/85 shadow-[0_10px_24px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.65)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-3.5 w-2 h-2 rounded-full bg-[#78581C] shadow-[inset_0_1px_1px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.4)]"
                  />
                  <span
                    className="text-lg sm:text-[21px] font-serif font-bold tracking-tight"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  >
                    {isNeedsRescheduling
                      ? "Reschedule discovery"
                      : "Schedule discovery"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowScheduler(true);
                    setTimeout(() => {
                      const el = document.getElementById(
                        "schedule-discovery-date-input"
                      );
                      if (el) el.focus();
                    }, 50);
                  }}
                  className="text-sm sm:text-[16px] text-[#E6ECF5] hover:text-[#FFE394] underline underline-offset-[6px] decoration-[#C5A059]/60 hover:decoration-[#FFE394] transition-colors cursor-pointer"
                >
                  Already scheduled? Add details
                </button>
              </>
            )}
          </div>

          {/* Secondary Immediate / Cold-Call & Link Actions Strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs sm:text-sm text-[#C6B697]">
            <button
              type="button"
              data-testid="start-discovery-now-btn"
              disabled={startDiscoveryNowMutation.isPending}
              onClick={() =>
                startDiscoveryNowMutation.mutate({ leadId: lead.id })
              }
              className="inline-flex items-center gap-1.5 text-[#DFBE77] hover:text-[#FFF4D4] font-semibold underline underline-offset-4 decoration-[#C5A059]/50 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Start discovery now (Cold call / live phone)
            </button>

            <span className="text-[#C5A059]/40">·</span>

            <button
              type="button"
              data-testid="send-scheduling-link-btn"
              disabled={updateInquiryMutation.isPending}
              onClick={handleSendSchedulingLink}
              className="inline-flex items-center gap-1.5 text-[#C6B697] hover:text-[#FFF4D4] underline underline-offset-4 decoration-[#C5A059]/40 cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              {journey.schedulingLinkSent
                ? "Follow up / resend scheduling link"
                : "Send booking link"}
            </button>

            <span className="text-[#C5A059]/40">·</span>

            <button
              type="button"
              data-testid="progress-directly-to-decision-menu-item"
              onClick={() => setShowDirectDecisionBox((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[#A69371] hover:text-[#FFF4D4] underline underline-offset-4 decoration-[#C5A059]/30 cursor-pointer"
            >
              Bypass to Decision
            </button>
          </div>

          {/* Scheduled Appointment Details Card (When Scheduled) */}
          {isAlreadyScheduled && journey.scheduledAppointment && (
            <div
              data-testid="scheduled-discovery-appointment-card"
              className="rounded-xl border border-[#C5A059]/50 bg-[#061329]/95 p-4 space-y-3 shadow-[0_10px_28px_rgba(0,0,0,0.65)] max-w-[600px]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FFE394]">
                  <Calendar className="w-4 h-4 text-[#DFBE77]" />
                  <span>Scheduled Discovery Call</span>
                </div>
                <span
                  data-testid="scheduled-appointment-tz"
                  className="text-xs text-[#C6B697]"
                >
                  Timezone: {journey.scheduledAppointment.timeZone} (
                  {journey.scheduledAppointment.timeZoneAbbr}) · Advocate:{" "}
                  {journey.scheduledAppointment.assignedAdvocateName}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#C5A059]/25">
                <span className="text-xs text-[#C6B697]">
                  If the call could not take place:
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="mark-appointment-missed-btn"
                    disabled={markAppointmentOutcomeMutation.isPending}
                    onClick={() =>
                      markAppointmentOutcomeMutation.mutate({
                        leadId: lead.id,
                        outcome: "no_answer",
                        note: "Missed scheduled discovery call; needs rescheduling.",
                      })
                    }
                    className="h-7 border-amber-400/40 bg-[#1C1206] text-amber-200 hover:bg-[#2E1E0A] text-xs cursor-pointer"
                  >
                    Mark Missed
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="cancel-scheduled-appointment-btn"
                    disabled={markAppointmentOutcomeMutation.isPending}
                    onClick={() =>
                      markAppointmentOutcomeMutation.mutate({
                        leadId: lead.id,
                        outcome: "cancelled",
                        note: "Discovery appointment canceled; needs rescheduling.",
                      })
                    }
                    className="h-7 border-rose-400/40 bg-[#1F0910] text-rose-200 hover:bg-[#330F1A] text-xs cursor-pointer"
                  >
                    Cancel Call
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Missed or Canceled Appointment Banner */}
          {isNeedsRescheduling && (
            <div
              data-testid="needs-rescheduling-banner"
              className="rounded-xl border border-rose-400/50 bg-[#1C0B16]/90 p-3.5 text-xs text-rose-200 flex items-center justify-between gap-3 max-w-[600px]"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                Previous discovery appointment was missed or canceled — Needs rescheduling.
              </span>
              <button
                type="button"
                onClick={() => setShowScheduler(true)}
                className="font-bold text-[#FFE394] underline cursor-pointer shrink-0"
              >
                Pick new time
              </button>
            </div>
          )}

          {/* Inline Collapsible Scheduling Form (Admiralty Navy & Brass) */}
          {showScheduler && (
            <form
              onSubmit={handleScheduleDiscovery}
              data-testid="inquiry-schedule-discovery-panel"
              className="rounded-xl border border-[#C5A059]/60 bg-[#061329] p-5 space-y-4 shadow-[0_14px_34px_rgba(0,0,0,0.8)] max-w-[600px]"
            >
              <div className="flex items-center justify-between border-b border-[#C5A059]/25 pb-2.5">
                <h3
                  className="text-base sm:text-lg font-serif font-bold text-[#FFF4D4]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {isAlreadyScheduled || isNeedsRescheduling
                    ? "Reschedule Discovery Appointment"
                    : "Schedule Discovery Appointment"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowScheduler(false)}
                  className="text-xs text-[#C6B697] hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#D8C7A5] font-semibold mb-1 block">
                    Consultation Date *
                  </label>
                  <Input
                    id="schedule-discovery-date-input"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="h-9 bg-[#030A18] border-[#3A2C18] text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-[#D8C7A5] font-semibold mb-1 block">
                    Time ({timeZone}) *
                  </label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="h-9 bg-[#030A18] border-[#3A2C18] text-white text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#D8C7A5] font-semibold mb-1 block">
                    Responsible Advocate
                  </label>
                  <Input
                    value={assignedAdvocate}
                    onChange={(e) => setAssignedAdvocate(e.target.value)}
                    className="h-9 bg-[#030A18] border-[#3A2C18] text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#D8C7A5] font-semibold mb-1 block">
                    Meeting Prep Note
                  </label>
                  <Input
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder="e.g. Phone or Zoom preference"
                    className="h-9 bg-[#030A18] border-[#3A2C18] text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="submit"
                  data-testid="confirm-schedule-discovery-btn"
                  disabled={scheduleDiscoveryMutation.isPending}
                  className="h-10 px-6 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold hover:brightness-110 cursor-pointer"
                >
                  {scheduleDiscoveryMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : isAlreadyScheduled || isNeedsRescheduling ? (
                    "Confirm Rescheduled Discovery"
                  ) : (
                    "Confirm Discovery Time"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Direct to Decision Inline Box */}
          {showDirectDecisionBox && (
            <form
              onSubmit={handleProgressDirectlyToDecision}
              data-testid="direct-to-decision-panel"
              className="rounded-xl border border-[#C5A059]/45 bg-[#061329] p-4 space-y-3 max-w-[600px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#FFF4D4]">
                  Progress Directly to Decision
                </span>
                <button
                  type="button"
                  onClick={() => setShowDirectDecisionBox(false)}
                  className="text-xs text-[#C6B697] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  data-testid="direct-to-decision-note-input"
                  value={directDecisionNote}
                  onChange={(e) => setDirectDecisionNote(e.target.value)}
                  placeholder="Optional note explaining why discovery is bypassed..."
                  className="h-9 bg-[#030917] border-[#3A2C18] text-white text-xs flex-1"
                />
                <Button
                  type="submit"
                  data-testid="confirm-direct-to-decision-btn"
                  disabled={updateInquiryMutation.isPending}
                  className="h-9 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-semibold text-xs cursor-pointer"
                >
                  Move to Decision →
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* ═══ RIGHT COLUMN: STITCHED LEATHER "FAMILY FILE" DOSSIER WITH CONTACTS & NOTES TABS ═══ */}
        <div className="lg:col-span-5 pt-1">
          <div className="relative mx-auto max-w-[460px] lg:max-w-none">
            {/* Protruding Top Folder Tabs (`Contacts` and `Notes`) */}
            <div className="flex items-end justify-center gap-2 pl-6 pr-6 -mb-[2px] relative z-10">
              {/* Contacts Tab */}
              <button
                type="button"
                data-testid="toggle-contact-drawer-btn"
                onClick={() => setFamilyFileTab("contacts")}
                className={`relative inline-flex items-center justify-center min-w-[136px] h-10 px-6 rounded-t-xl font-serif font-bold text-sm sm:text-[16px] transition-all cursor-pointer ${
                  familyFileTab === "contacts"
                    ? "bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071428] border-t border-x border-[#FFE8A3] shadow-[0_-4px_14px_rgba(0,0,0,0.6)]"
                    : "bg-[#091731] text-[#D8C7A5] border-t border-x border-[#C5A059]/35 hover:text-[#FFF4D4] hover:bg-[#0D2144]"
                }`}
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-2.5 w-1.5 h-1.5 rounded-full ${
                    familyFileTab === "contacts"
                      ? "bg-[#6E5015] shadow-[0_1px_0_rgba(255,255,255,0.45)]"
                      : "bg-[#C5A059]/50"
                  }`}
                />
                <span>Contacts</span>
                <span
                  aria-hidden="true"
                  className={`absolute right-2.5 w-1.5 h-1.5 rounded-full ${
                    familyFileTab === "contacts"
                      ? "bg-[#6E5015] shadow-[0_1px_0_rgba(255,255,255,0.45)]"
                      : "bg-[#C5A059]/50"
                  }`}
                />
              </button>

              {/* Notes Tab */}
              <button
                type="button"
                data-testid="toggle-history-drawer-btn"
                onClick={() => setFamilyFileTab("notes")}
                className={`relative inline-flex items-center justify-center min-w-[130px] h-10 px-6 rounded-t-xl font-serif font-bold text-sm sm:text-[16px] transition-all cursor-pointer ${
                  familyFileTab === "notes"
                    ? "bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071428] border-t border-x border-[#FFE8A3] shadow-[0_-4px_14px_rgba(0,0,0,0.6)]"
                    : "bg-[#091731] text-[#D8C7A5] border-t border-x border-[#C5A059]/35 hover:text-[#FFF4D4] hover:bg-[#0D2144]"
                }`}
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <span>Notes</span>
                {combinedHistory.length > 0 && (
                  <span
                    className={`ml-1.5 text-[11px] px-1.5 py-0.2 rounded-full font-sans font-bold ${
                      familyFileTab === "notes"
                        ? "bg-[#071428]/20 text-[#071428]"
                        : "bg-[#C5A059]/20 text-[#FFE394]"
                    }`}
                  >
                    {combinedHistory.length}
                  </span>
                )}
              </button>
            </div>

            {/* Back Folder Leather Lip Layer */}
            <div
              aria-hidden="true"
              className="absolute -top-1 left-2 right-2 h-6 rounded-t-2xl bg-[#0B1B38] border-t border-x border-[#C5A059]/35 -z-0"
            />

            {/* Main Stitched Navy Leather Folder Card */}
            <div className="relative z-10 rounded-2xl bg-gradient-to-b from-[#0A1A36] via-[#071329] to-[#050E20] p-2.5 border border-[#C5A059]/55 shadow-[0_18px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.08)]">
              {/* Right Leather Clasp Tab */}
              <div
                aria-hidden="true"
                className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 w-5 h-24 rounded-l-xl rounded-r-md bg-gradient-to-r from-[#061124] to-[#0A1B38] border border-[#C5A059]/45 shadow-[-4px_4px_10px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-1 rounded-l-lg border border-dashed border-[#C5A059]/40" />
              </div>

              {/* Inner Dashed Gold Stitched Perimeter */}
              <div className="relative rounded-xl border border-dashed border-[#C5A059]/55 px-6 py-5 space-y-4">
                {/* 4 Brass Corner Rivets */}
                <span
                  aria-hidden="true"
                  className="absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-gradient-to-b from-[#FFE394] to-[#8C6520] shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />
                <span
                  aria-hidden="true"
                  className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-gradient-to-b from-[#FFE394] to-[#8C6520] shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />
                <span
                  aria-hidden="true"
                  className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 rounded-full bg-gradient-to-b from-[#FFE394] to-[#8C6520] shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />
                <span
                  aria-hidden="true"
                  className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-gradient-to-b from-[#FFE394] to-[#8C6520] shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                />

                {/* Top Centered Divider: —— FAMILY FILE —— */}
                <div className="flex items-center justify-center gap-3 pt-0.5">
                  <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-[#C5A059]/65" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#D8B467]">
                    FAMILY FILE
                  </span>
                  <div className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-[#C5A059]/65" />
                </div>

                {familyFileTab === "contacts" ? (
                  <div className="space-y-4 pr-2">
                    {/* Parent / Primary Contact Section */}
                    <div className="space-y-1">
                      <h3
                        data-testid="workspace-family-name"
                        className="text-2xl sm:text-[28px] font-serif font-bold text-[#FFFDF7] leading-tight"
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                      >
                        {parentFullName}
                      </h3>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B8C4D9]">
                        PARENT / PRIMARY CONTACT
                      </p>
                      <div className="pt-1.5">
                        <button
                          type="button"
                          data-testid="view-contact-details-btn"
                          onClick={() =>
                            setShowContactDetailsInline((prev) => !prev)
                          }
                          className="text-sm text-[#E6ECF5] hover:text-[#FFE394] underline underline-offset-4 decoration-[#C5A059]/65 transition-colors cursor-pointer"
                        >
                          {showContactDetailsInline
                            ? "Hide contact details"
                            : "View contact details"}
                        </button>
                      </div>

                      {showContactDetailsInline && (
                        <div
                          data-testid="inline-contact-details-box"
                          className="mt-2.5 rounded-lg bg-[#030A18]/90 border border-[#C5A059]/35 p-3 space-y-1.5 text-xs text-[#E2E8F0]"
                        >
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-[#DFBE77]" />
                            <span>
                              {parentPhone || "No phone recorded"} (
                              {preferredContactMethod})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-[#DFBE77]" />
                            <span>{parentEmail || "No email recorded"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#C6B697]">
                            <Clock className="w-3.5 h-3.5 text-[#DFBE77]" />
                            <span>
                              {timeZone} Time · Advocate: {assignedAdvocate}
                            </span>
                          </div>
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setIntakeExpanded(true)}
                              className="text-[11px] text-[#FFE394] underline cursor-pointer"
                            >
                              Edit in Intake details below
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Horizontal Thin Brass Rule */}
                    <div className="h-px bg-[#C5A059]/40" />

                    {/* Student Section */}
                    <div className="space-y-1 pb-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B8C4D9]">
                        STUDENT
                      </p>
                      <p
                        className="text-xl sm:text-[25px] font-serif font-bold text-[#FFFDF7] leading-tight"
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                      >
                        {studentDisplayName}
                      </p>
                      {validStudents[0]?.gradeLevel && (
                        <p className="text-xs text-[#C6B697]">
                          {validStudents[0].gradeLevel}
                          {validStudents[0]?.iepOr504
                            ? ` · ${validStudents[0].iepOr504}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Notes Tab Content */
                  <div
                    data-testid="family-file-notes-panel"
                    className="space-y-3 pr-2"
                  >
                    <form
                      onSubmit={handleRecordAttempt}
                      data-testid="record-contact-attempt-panel"
                      className="space-y-2"
                    >
                      <Input
                        data-testid="contact-attempt-note-input"
                        value={attemptNote}
                        onChange={(e) => setAttemptNote(e.target.value)}
                        placeholder="Add a call note or contact attempt..."
                        className="h-8 bg-[#030A18] border-[#C5A059]/40 text-white text-xs"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          size="sm"
                          data-testid="save-contact-attempt-btn"
                          disabled={updateInquiryMutation.isPending}
                          className="h-7 px-3 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs cursor-pointer"
                        >
                          <MessageSquarePlus className="w-3 h-3 mr-1" />
                          Save Note
                        </Button>
                      </div>
                    </form>

                    <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                      {combinedHistory.length === 0 ? (
                        <p className="text-xs text-[#C6B697] italic py-2">
                          No call notes or contact attempts logged yet.
                        </p>
                      ) : (
                        combinedHistory.slice(0, 6).map((item: any, idx: number) => (
                          <div
                            key={item.id || idx}
                            className="rounded-lg bg-[#030A18]/85 border border-[#C5A059]/25 p-2.5 text-xs space-y-0.5"
                          >
                            <p className="text-[#FFF4D4] leading-snug">
                              {item.summary || item.note || item.title}
                            </p>
                            {item.timestamp && (
                              <span className="text-[10px] text-[#A69371] block">
                                {new Date(item.timestamp).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FULL-WIDTH BOTTOM ACCORDION BAR: `> Intake details` ─── */}
      <div className="pt-2">
        <div className="border-y border-[#C5A059]/35">
          <button
            type="button"
            data-testid="toggle-intake-details-btn"
            onClick={() => setIntakeExpanded((prev) => !prev)}
            className="w-full py-3.5 px-2 flex items-center justify-between gap-3 text-left hover:bg-[#0A1B38]/40 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <ChevronRight
                className={`w-4 h-4 text-[#D8B467] transition-transform duration-200 ${
                  intakeExpanded ? "rotate-90" : ""
                }`}
              />
              <span
                className="text-lg sm:text-[20px] font-serif font-bold text-[#FFFDF7] group-hover:text-[#FFE394] transition-colors"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Intake details
              </span>
            </div>

            {!isPreFilledReady && (
              <span className="text-xs text-[#FFE394] font-medium">
                {blockingIssues.length} missing item
                {blockingIssues.length === 1 ? "" : "s"}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Editable Intake Details Form */}
        {intakeExpanded && (
          <div
            data-testid="expanded-intake-details-panel"
            className="pt-5 space-y-5"
          >
            {blockingIssues.length > 0 && (
              <div
                data-testid="inquiry-blocking-issues"
                className="rounded-xl border border-[#D4AF37]/45 bg-[#07142C] p-4 space-y-2"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FFE394]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Missing intake details</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                  {blockingIssues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left 7 Cols: Parent & Student Info */}
              <div className="lg:col-span-7 rounded-xl border border-[#C5A059]/35 bg-[#061329]/95 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
                <div className="flex items-center justify-between border-b border-[#C5A059]/25 pb-2.5">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFE394] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#DFBE77]" />
                    Parent / Guardian Account & Assignment
                  </h3>
                  <span className="text-xs text-[#C6B697]">
                    {lead.source || "Lead Intake Record"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#D8C7A5] font-semibold block mb-1">
                      Parent / Guardian Phone *
                    </label>
                    <Input
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="(404) 555-0100"
                      className="h-9 bg-[#030917] border-[#3A2C18] text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#D8C7A5] font-semibold block mb-1">
                      Parent / Guardian Email *
                    </label>
                    <Input
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="h-9 bg-[#030917] border-[#3A2C18] text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#D8C7A5] font-semibold block mb-1">
                      Preferred Contact Method
                    </label>
                    <select
                      value={preferredContactMethod}
                      onChange={(e) =>
                        setPreferredContactMethod(e.target.value)
                      }
                      className="w-full h-9 rounded-md bg-[#030917] border border-[#3A2C18] px-2.5 text-xs text-white"
                    >
                      <option value="Phone">Phone</option>
                      <option value="Email">Email</option>
                      <option value="Text / SMS">Text / SMS</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#D8C7A5] font-semibold block mb-1">
                      Best Time / Availability
                    </label>
                    <Input
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      placeholder="e.g. Weekday mornings"
                      className="h-9 bg-[#030917] border-[#3A2C18] text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#D8C7A5] font-semibold flex items-center gap-1 mb-1">
                      <Globe className="w-3.5 h-3.5 text-[#DFBE77]" />
                      Family Time Zone
                    </label>
                    <select
                      data-testid="inquiry-timezone-select"
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                      className="w-full h-9 rounded-md bg-[#030917] border border-[#3A2C18] px-2.5 text-xs text-white"
                    >
                      <option value="Eastern">Eastern Time (ET)</option>
                      <option value="Central">Central Time (CT)</option>
                      <option value="Mountain">Mountain Time (MT)</option>
                      <option value="Pacific">Pacific Time (PT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#D8C7A5] font-semibold flex items-center gap-1 mb-1">
                      <UserCheck className="w-3.5 h-3.5 text-[#DFBE77]" />
                      Assigned Lead Advocate
                    </label>
                    <Input
                      data-testid="inquiry-advocate-input"
                      value={assignedAdvocate}
                      onChange={(e) => setAssignedAdvocate(e.target.value)}
                      placeholder="Byron Honea"
                      className="h-9 bg-[#030917] border-[#3A2C18] text-white text-xs"
                    />
                  </div>
                </div>

                {/* Students Sub-Section */}
                <div className="pt-3 border-t border-[#C5A059]/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFE394] flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#DFBE77]" />
                      Student Profile(s) ({studentList.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setStudentList((prev) => [
                          ...prev,
                          {
                            firstName: "",
                            lastName: parentContact?.lastName || "",
                            gradeLevel: "",
                            schoolName: "",
                            iepOr504: "IEP",
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#DFBE77] hover:text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Another Student
                    </button>
                  </div>

                  {studentList.map((stu, idx) => (
                    <div
                      key={stu.id || idx}
                      className="rounded-lg border border-[#C5A059]/25 bg-[#040B1A] p-3 space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] text-[#D8C7A5] font-medium block mb-0.5">
                            Student First Name *
                          </label>
                          <Input
                            value={stu.firstName || ""}
                            onChange={(e) =>
                              setStudentList((prev) =>
                                prev.map((s, i) =>
                                  i === idx
                                    ? { ...s, firstName: e.target.value }
                                    : s
                                )
                              )
                            }
                            placeholder="First Name"
                            className="h-8 bg-[#030814] border-[#3A2C18] text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[#D8C7A5] font-medium block mb-0.5">
                            Student Last Name
                          </label>
                          <Input
                            value={stu.lastName || ""}
                            onChange={(e) =>
                              setStudentList((prev) =>
                                prev.map((s, i) =>
                                  i === idx
                                    ? { ...s, lastName: e.target.value }
                                    : s
                                )
                              )
                            }
                            placeholder="Last Name"
                            className="h-8 bg-[#030814] border-[#3A2C18] text-white text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[11px] text-[#D8C7A5] font-medium block mb-0.5">
                            Grade Level
                          </label>
                          <Input
                            value={stu.gradeLevel || ""}
                            onChange={(e) =>
                              setStudentList((prev) =>
                                prev.map((s, i) =>
                                  i === idx
                                    ? { ...s, gradeLevel: e.target.value }
                                    : s
                                )
                              )
                            }
                            placeholder="e.g. 4th Grade"
                            className="h-8 bg-[#030814] border-[#3A2C18] text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[#D8C7A5] font-medium block mb-0.5">
                            School Name
                          </label>
                          <Input
                            value={stu.schoolName || ""}
                            onChange={(e) =>
                              setStudentList((prev) =>
                                prev.map((s, i) =>
                                  i === idx
                                    ? { ...s, schoolName: e.target.value }
                                    : s
                                )
                              )
                            }
                            placeholder="School or District"
                            className="h-8 bg-[#030814] border-[#3A2C18] text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[#D8C7A5] font-medium block mb-0.5">
                            Current Plan Status
                          </label>
                          <select
                            value={stu.iepOr504 || "IEP"}
                            onChange={(e) =>
                              setStudentList((prev) =>
                                prev.map((s, i) =>
                                  i === idx
                                    ? { ...s, iepOr504: e.target.value }
                                    : s
                                )
                              )
                            }
                            className="w-full h-8 rounded-md bg-[#030814] border border-[#3A2C18] px-2 text-xs text-white"
                          >
                            <option value="IEP">IEP</option>
                            <option value="504">504 Plan</option>
                            <option value="504 Plan">504 Plan</option>
                            <option value="Evaluation Needed">
                              Seeking Evaluation
                            </option>
                            <option value="General">General</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 5 Cols: Concerns & Desired Outcome */}
              <div className="lg:col-span-5 rounded-xl border border-[#C5A059]/35 bg-[#061329]/95 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
                <div className="flex items-center justify-between border-b border-[#C5A059]/25 pb-2.5">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFE394] flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-[#DFBE77]" />
                    Family Intake Story & Goals
                  </h3>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-[#FFF4D4] block mb-1">
                      Main School / IEP / 504 Concerns *
                    </label>
                    <Textarea
                      data-testid="inquiry-concerns-input"
                      value={concerns}
                      onChange={(e) => setConcerns(e.target.value)}
                      placeholder="Summarize the family's primary school, IEP/504, evaluation, or placement concerns..."
                      rows={4}
                      className="bg-[#030917] border-[#3A2C18] text-white text-xs leading-relaxed resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#FFF4D4] block mb-1">
                      Desired Advocacy Outcome
                    </label>
                    <Textarea
                      data-testid="inquiry-desired-outcome-input"
                      value={desiredOutcome}
                      onChange={(e) => setDesiredOutcome(e.target.value)}
                      placeholder="What is the family hoping to achieve with Waypoint Advocates?"
                      rows={3}
                      className="bg-[#030917] border-[#3A2C18] text-white text-xs leading-relaxed resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-[#C5A059]/25">
                  <Button
                    type="button"
                    size="sm"
                    data-testid="save-inquiry-details-btn"
                    disabled={updateInquiryMutation.isPending}
                    onClick={handleSaveInquiry}
                    className="h-9 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 text-xs font-bold cursor-pointer"
                  >
                    {updateInquiryMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Save Account & Intake Details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

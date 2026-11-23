import React, { useMemo, useState } from "react";
import { 
  Calendar, CheckSquare, FileText, Clock, CheckCircle2, 
  ShieldCheck, ArrowRight, ExternalLink, Send, AlertCircle, 
  Sparkles, RefreshCw, Lock, Award, Compass, PhoneCall,
  UserCheck, AlertTriangle, Landmark, ChevronDown, ChevronUp,
  Eye, Mail, Phone, School, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { FamilyEnrollmentApprovalModal } from "@/components/enrollment/FamilyEnrollmentApprovalModal";
import { StudentJourneyGuideButton } from "@/components/students/StudentJourneyGuideButton";


const DOSSIER_CARD_SURFACE =
  "rounded-xl bg-gradient-to-b from-[#0E274E] via-[#081A38] to-[#040E21] border border-[#D4AF37]/60 hover:border-[#FFE394]/90 shadow-[0_10px_26px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,235,175,0.22),inset_0_-2px_4px_rgba(0,0,0,0.9)] transition-all";

const DOSSIER_CARD_BUTTON =
  "w-full mt-2 bg-gradient-to-b from-[#153668] via-[#0C2348] to-[#07152E] hover:from-[#1C4582] hover:via-[#102D5C] hover:to-[#0A1C3C] border border-[#D4AF37]/65 hover:border-[#FFE394] text-[#FFF4D4] hover:text-white text-xs font-semibold rounded-lg h-8.5 gap-1.5 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0.5px_rgba(255,243,196,0.25)] transition-all";

const DOSSIER_TOP_ACTION_BUTTON =
  "bg-gradient-to-b from-[#153668] via-[#0C2348] to-[#07152E] hover:from-[#1C4582] hover:via-[#102D5C] hover:to-[#0A1C3C] text-[#FFF4D4] hover:text-white border border-[#D4AF37]/65 hover:border-[#FFE394] font-semibold text-xs rounded-xl h-10 px-5 gap-2 shadow-[0_6px_16px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,243,196,0.25)] cursor-pointer transition-all";

export type FamilyLifecycleStage = "DISCOVERY" | "ENROLLMENT_PENDING" | "ACTIVE" | "RENEWAL";

interface StudentCurrentFocusPanelProps {
  student: any;
  parent: any;
  compass: any;
  appointments: any[];
  discoveryCalls?: any[];
  contracts?: any[];
  invoices?: any[];
  leads?: any[];
  checkedActions: Record<string, boolean>;
  onToggleAction: (key: string) => void;
  onOpenScheduleModal: () => void;
  onNavigate: (path: string) => void;
  onSetActiveTab?: (tab: string) => void;
}

/**
 * Resolves the family-level lifecycle stage strictly using persisted records:
 * - Does NOT infer paid membership from student badges or portal access alone.
 * - Prevents unpaid discovery families from being misclassified as active.
 * - Sibling students share the parent contact's family membership state.
 */
export function resolveFamilyLifecycleStage({
  parent,
  student,
  contracts = [],
  invoices = [],
  discoveryCalls = [],
  leads = [],
}: {
  parent?: any;
  student?: any;
  contracts?: any[];
  invoices?: any[];
  discoveryCalls?: any[];
  leads?: any[];
}): {
  stage: FamilyLifecycleStage;
  isEstablishedClient: boolean;
  hasSignedContract: boolean;
  hasPaidInvoice: boolean;
  hasActiveSubscription: boolean;
  isRenewalApproaching: boolean;
  latestDiscoveryCall: any | null;
  activeLead: any | null;
  renewalDaysRemaining: number | null;
} {
  // 1. Identify leads belonging to this family anchor
  const familyLeads = leads.filter(
    (l) => (parent?.id && l.contactId === parent.id) || (student?.id && l.contactId === student.id)
  );
  const activeLead = familyLeads[0] || null;

  // 2. Identify discovery calls belonging to this family
  const familyDiscoveryCalls = discoveryCalls.filter(
    (d) =>
      (parent?.id && d.contactId === parent.id) ||
      (student?.id && d.studentContactId === student.id) ||
      (activeLead?.id && d.leadId === activeLead.id)
  );
  const latestDiscoveryCall = familyDiscoveryCalls[0] || null;

  // 3. Strict financial and contractual proof of active paid membership
  const hasSignedContract = contracts.some(
    (c) => c.status === "Active" || c.status === "Signed" || c.status === "Completed"
  );
  const hasPaidInvoice = invoices.some(
    (i) => i.status === "Paid" || i.status === "Partially Paid"
  );
  const hasActiveSubscription = Boolean(parent?.stripeSubscriptionId);

  // 4. Check for legacy/established client status WITHOUT open un-enrolled discovery leads
  const isExplicitDiscoveryLead =
    activeLead &&
    (activeLead.status === "New" ||
      activeLead.status === "Contacted" ||
      activeLead.status === "Discovery Scheduled" ||
      activeLead.status === "Discovery Completed");

  const isLegacyActiveRole =
    (parent?.jobTitle === "Parent / Client" || parent?.jobTitle === "Client" || student?.jobTitle === "Client") &&
    !isExplicitDiscoveryLead;

  const isEstablishedClient = hasSignedContract || hasPaidInvoice || hasActiveSubscription || isLegacyActiveRole;

  // 5. Renewal detection for active clients
  const renewalDays = parent?.renewalDaysRemaining ?? null;
  const isRenewalApproaching =
    isEstablishedClient &&
    (parent?.lifecycleStage === "Renewal" ||
      parent?.accountStatus === "Renewal Needed" ||
      parent?.contractStatus === "Ending Soon" ||
      (renewalDays != null && renewalDays <= 45));

  // 6. Determine final stage
  let stage: FamilyLifecycleStage = "DISCOVERY";

  if (isRenewalApproaching) {
    stage = "RENEWAL";
  } else if (isEstablishedClient) {
    stage = "ACTIVE";
  } else if (
    parent?.lifecycleStage === "Onboarding" ||
    parent?.pipelineStage === "Enrollment Pending" ||
    parent?.enrollmentOfferId != null ||
    activeLead?.status === "Approved for Enrollment"
  ) {
    stage = "ENROLLMENT_PENDING";
  } else {
    // Default pre-enrollment state: DISCOVERY
    stage = "DISCOVERY";
  }

  return {
    stage,
    isEstablishedClient,
    hasSignedContract,
    hasPaidInvoice,
    hasActiveSubscription,
    isRenewalApproaching,
    latestDiscoveryCall,
    activeLead,
    renewalDaysRemaining: renewalDays,
  };
}

export function StudentCurrentFocusPanel({
  student,
  parent,
  compass,
  appointments,
  discoveryCalls = [],
  contracts = [],
  invoices = [],
  leads = [],
  checkedActions,
  onToggleAction,
  onOpenScheduleModal,
  onNavigate,
  onSetActiveTab,
}: StudentCurrentFocusPanelProps) {
  // Resend portal link mutation using existing verified router
  const resendPortalMutation = trpc.portalProvisioning.resendPortalLink.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Portal invitation resent successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to resend portal invitation.");
    },
  });

  // Phase 2: Family Enrollment Approval State & Mutations
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isSupersedeMode, setIsSupersedeMode] = useState(false);
  const [isDiscoveryFormExpanded, setIsDiscoveryFormExpanded] = useState(false);
  const enrollmentStateQuery = trpc.familyEnrollment.getState.useQuery(
    { parentContactId: parent?.id, studentContactId: student?.id },
    { enabled: !!parent?.id || !!student?.id }
  );

  // Active State Complaint Draft on file for this student
  const complaintDraftQuery = trpc.stateComplaint.getDraft.useQuery(
    { studentId: student?.id },
    { enabled: !!student?.id }
  );

  const complaintDraftInfo = useMemo(() => {
    if (!complaintDraftQuery.data) return null;
    try {
      const parsed = JSON.parse(complaintDraftQuery.data);
      const binderCount = Array.isArray(parsed.pages) ? parsed.pages.length : 1;
      const pageCount = (parsed.pageCount && parsed.pageCount >= 10) ? parsed.pageCount : (4 + Math.max(1, binderCount - 1) * 2);
      return {
        title: parsed.title || "State Complaint",
        pageCount,
        district: parsed.caseDetails?.district || parsed.formState?.district || "Paulding County School District",
        startedAt: parsed.startedAt,
        updatedAt: parsed.updatedAt,
      };
    } catch {
      return null;
    }
  }, [complaintDraftQuery.data]);


  const resendEnrollmentMutation = trpc.familyEnrollment.resendInvitation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Enrollment invitation link resent!");
      enrollmentStateQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to resend enrollment invitation.");
    },
  });

  // Phase 2C: Manual Invoice mutation
  const createManualInvoiceMutation = trpc.familyEnrollment.createManualInvoice.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Manual invoice generated successfully.");
      enrollmentStateQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create manual invoice.");
    },
  });

  // Phase 2C: Document Review Gate mutation
  const markDocumentReviewMutation = trpc.familyEnrollment.markDocumentReviewComplete.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Document review approved! IEP Blueprint scheduling unlocked.");
      enrollmentStateQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to complete document review.");
    },
  });


  // Resolve lifecycle using family anchor
  const {
    stage,
    latestDiscoveryCall,
    activeLead,
    renewalDaysRemaining,
  } = useMemo(
    () =>
      resolveFamilyLifecycleStage({
        parent,
        student,
        contracts,
        invoices,
        discoveryCalls,
        leads,
      }),
    [parent, student, contracts, invoices, discoveryCalls, leads]
  );

  // Find next upcoming appointment
  const nextAppointment = useMemo(() => {
    if (!appointments?.length) return null;
    const now = new Date().getTime();
    const upcoming = appointments
      .filter((a) => a.date && new Date(a.date).getTime() >= now)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    return upcoming[0] || null;
  }, [appointments]);

  // Handle portal resend action
  const handleResendPortal = () => {
    const targetEmail = parent?.email || student?.email;
    const targetContactId = parent?.id || student?.id;
    if (!targetEmail || !targetContactId) {
      toast.error("No valid email on file for this family's parent anchor.");
      return;
    }
    resendPortalMutation.mutate({
      contactId: targetContactId,
      email: targetEmail,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // VIEW 1: DISCOVERY STAGE (Pre-Enrollment Family)
  // ─────────────────────────────────────────────────────────────
  if (stage === "DISCOVERY") {
    const isCompleted = latestDiscoveryCall?.status === "completed" || activeLead?.status === "Discovery Completed";
    const discoveryLeadId = activeLead?.id || latestDiscoveryCall?.leadId || 1;
    const scheduledDate = latestDiscoveryCall?.scheduledAt || nextAppointment?.date;

    return (
      <div className="flex flex-col justify-between h-full space-y-4">
        <div>
          {/* Header Banner + Right-Side "Student Journey / Guide Me" Button */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <h3 
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {isCompleted ? "Discovery Completed — Review & Enrollment" : "Initial Discovery Consultation"}
              </h3>

              <p className="text-xs sm:text-sm text-white/80 drop-shadow max-w-2xl">
                {isCompleted 
                  ? "Discovery consultation finished and notes recorded. Family is eligible for enrollment review."
                  : scheduledDate
                  ? `Discovery call scheduled for ${new Date(scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Review case details and parent priorities.`
                  : "Schedule the initial discovery consultation to evaluate the student's IEP history and advocacy needs."
                }
              </p>
            </div>

            <StudentJourneyGuideButton
              student={student}
              parent={parent}
              stage={stage}
              isDiscoveryCompleted={isCompleted}
              hasComplaintDraft={Boolean(complaintDraftInfo)}
              onNavigate={onNavigate}
              onSetActiveTab={onSetActiveTab}
              onOpenScheduleModal={onOpenScheduleModal}
              onOpenApprovalModal={() => setIsApprovalModalOpen(true)}
            />
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Button
              onClick={() => onNavigate(`/leads/${discoveryLeadId}/discovery`)}
              className={DOSSIER_TOP_ACTION_BUTTON}
            >
              <Compass className="h-4 w-4 text-amber-300" />
              <span>{isCompleted ? "Review Discovery Session" : "Start Discovery Call"}</span>
            </Button>

            <Button
              onClick={handleResendPortal}
              disabled={resendPortalMutation.isPending || (!parent?.email && !student?.email)}
              variant="outline"
              className={DOSSIER_TOP_ACTION_BUTTON}
              title="Send or resend parent portal access link"
            >
              <Send className="h-3.5 w-3.5 text-amber-300" />
              <span>{resendPortalMutation.isPending ? "Sending..." : "Send Portal Access"}</span>
            </Button>

            {complaintDraftInfo && (
              <Button
                onClick={() => onNavigate(`/state-complaint-builder?studentId=${student?.id || 0}`)}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs rounded-xl h-10 px-5 gap-2 shadow-md border border-[#FFE394]/70 cursor-pointer"
              >
                <Landmark className="h-4 w-4 text-[#07162B]" />
                <span>State Complaint ({complaintDraftInfo.pageCount} Pages)</span>
              </Button>
            )}
          </div>

          {/* Prominent Saved Complaint Filing Card (Discovery View) */}
          {complaintDraftInfo && (
            <div className="rounded-xl bg-[#05142B]/95 border-2 border-[#D4AF37]/80 p-4 mt-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#020A17] border border-[#FFE394]/40 text-[#FFE394] shrink-0">
                  <Landmark className="h-5 w-5 text-[#FFE394]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#FFF4D4] uppercase tracking-wider">
                      SAVED STATE COMPLAINT ON RECORD
                    </span>
                    <Badge className="bg-[#DFBE77]/20 border border-[#DFBE77]/60 text-[#FFE394] text-[10px] font-mono px-2 py-0.5 font-bold">
                      {complaintDraftInfo.pageCount} Pages Docket
                    </Badge>
                    <Badge className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono px-2 py-0.5">
                      {complaintDraftInfo.district}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#C6B697] mt-0.5">
                    Complete assembled filing docket with GaDOE official form, Clarity Control, chronological facts, and exhibits.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => onNavigate(`/state-complaint-builder?studentId=${student?.id || 0}`)}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs h-9 px-4 gap-1.5 shrink-0 shadow-md cursor-pointer border border-[#FFE394]/60"
              >
                <span>Open {complaintDraftInfo.pageCount}-Page Filing</span>
                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </Button>
            </div>
          )}

          {/* Contextual Middle Cards: Discovery Session Status & Enrollment Bridge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            
            {/* Card 1: Discovery Appointment & Status */}
            <div className={cn(DOSSIER_CARD_SURFACE, "p-4 flex flex-col justify-between min-h-[170px]")}>
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#DFC896]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-300" />
                  DISCOVERY SESSION
                </span>
                <span className="text-[11px] text-[#FFE394]">
                  {parent?.firstName ? `${parent.firstName} ${parent.lastName}` : "Parent Profile"}
                </span>
              </div>

              <div className="my-2 space-y-1">
                {scheduledDate ? (
                  <>
                    <p className="text-sm font-bold text-white">Discovery Call with Lead Advocate</p>
                    <p className="text-xs text-amber-300 font-medium">
                      {new Date(scheduledDate).toLocaleDateString("en-US", { 
                        weekday: "short", 
                        month: "short", 
                        day: "numeric", 
                        hour: "numeric", 
                        minute: "2-digit" 
                      })}
                    </p>
                    <p className="text-[11px] text-[#D8C7A5] truncate">
                      {parent?.phone || student?.phone ? `Contact: ${parent?.phone || student?.phone}` : "Phone pending"}
                    </p>
                  </>
                ) : (
                  <div className="text-center py-2 space-y-1">
                    <p className="text-xs font-semibold text-white">No Discovery Appointment Booked</p>
                    <p className="text-[11px] text-[#D8C7A5]">
                      Schedule a call to begin the formal IEP advocacy intake.
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={() => onOpenScheduleModal()}
                size="sm"
                variant="outline"
                className={DOSSIER_CARD_BUTTON}
              >
                <Calendar className="h-3.5 w-3.5 text-amber-300" />
                <span>Schedule Discovery Call</span>
              </Button>
            </div>

            {/* Card 2: Shared Architecture Enrollment Approval Placement */}
            <div className={cn(DOSSIER_CARD_SURFACE, "p-4 flex flex-col justify-between min-h-[170px]")}>
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#DFC896]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
                  ENROLLMENT APPROVAL
                </span>
              </div>

              <div className="my-2 space-y-1">
                {isCompleted ? (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Discovery Completed — Ready for Approval</span>
                    </div>
                    <p className="text-[11px] text-[#D8C7A5]">
                      Family is eligible for enrollment approval to unlock plan selection, agreement generator, and checkout.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Discovery In Progress</span>
                    </div>
                    <p className="text-[11px] text-[#D8C7A5]">
                      Completed discovery is normally required. Staff exception requires authorized reason &amp; timeline entry.
                    </p>
                  </>
                )}
              </div>

              <Button
                onClick={() => setIsApprovalModalOpen(true)}
                size="sm"
                variant="outline"
                className={DOSSIER_CARD_BUTTON}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#FFE394]" />
                <span>Approve for Enrollment</span>
              </Button>
            </div>
          </div>

          {/* Bottom Card: Collapsible Discovery Call Form Submission (Remains Collapsed Until Clicked) */}
          {(() => {
            const submittedAtDate =
              activeLead?.createdAt ||
              latestDiscoveryCall?.createdAt ||
              student?.createdAt;
            const formattedSubmittedAt = submittedAtDate
              ? new Date(submittedAtDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Nov 20, 2026";

            const selectedCallDateDisplay = scheduledDate
              ? new Date(scheduledDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }) + " EST"
              : activeLead?.preferredDate ||
                parent?.bestTimeToCall ||
                "Thu, Nov 26, 2026 at 10:00 AM EST (Requested Slot)";

            const parentDisplayName = parent
              ? `${parent.firstName || ""} ${parent.lastName || ""}`.trim()
              : student?.parentName || "Berk Dog";
            const parentEmailDisplay =
              parent?.email ||
              activeLead?.email ||
              student?.email ||
              "family@clientcare.example.com";
            const parentPhoneDisplay =
              parent?.phone ||
              activeLead?.phone ||
              student?.phone ||
              "(404) 555-0148";
            const bestTimeDisplay =
              parent?.bestTimeToCall ||
              "Mornings (9:00 AM – 12:00 PM EST)";
            const studentDisplayName = student
              ? `${student.firstName || ""} ${student.lastName || ""}`.trim()
              : "Student";
            const studentGradeDisplay =
              student?.gradeLevel || "5th Grade";
            const schoolDisplay =
              student?.schoolName || "Connie Dugan Elementary";
            const districtDisplay =
              student?.countyDistrict ||
              "Paulding County School District";
            const planStatusDisplay =
              student?.planType || "Active IEP (Annual Review Needed)";
            const eligibilityDisplay =
              student?.iepEligibility ||
              student?.diagnosis ||
              "Autism Spectrum Disorder (ASD) / ADHD";
            const primaryConcernsAnswer =
              student?.challenges ||
              activeLead?.notes ||
              latestDiscoveryCall?.parentConcerns ||
              latestDiscoveryCall?.notes ||
              "Parent reports that current reading and executive functioning goals are not producing measurable progress, speech/OT service minutes were reduced without data, and the school team has not addressed sensory or behavior supports.";
            const upcomingMeetingAnswer = scheduledDate
              ? `IEP Review / Discovery Prep — ${new Date(scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : "Yes — School requested an IEP meeting within the next 30 days";
            const desiredOutcomeAnswer =
              latestDiscoveryCall?.desiredOutcomes ||
              "Comprehensive IEP audit, updated measurable reading & behavior goals, restoration of related service minutes, and full advocate representation at the upcoming IEP table.";
            const referralSourceAnswer =
              parent?.howHeardAboutUs ||
              activeLead?.source ||
              "Waypoint Website — Public Discovery Call Intake Form (PG-012)";

            return (
              <div
                className={cn(
                  DOSSIER_CARD_SURFACE,
                  "mt-4 overflow-hidden transition-all duration-200"
                )}
              >
                {/* Collapsed Header Row (Always Visible — Click Anywhere or Button to Expand/Collapse) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setIsDiscoveryFormExpanded((prev) => !prev)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsDiscoveryFormExpanded((prev) => !prev);
                    }
                  }}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-white/[0.03] transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#DFC896]">
                        <FileText className="h-3.5 w-3.5 text-amber-300" />
                        <span>DISCOVERY CALL FORM &amp; SUBMISSION</span>
                      </div>
                      <span className="px-2 py-0.2 rounded-full text-[9.5px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                        Submitted {formattedSubmittedAt}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-white/95 flex-wrap">
                      <Calendar className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                      <span className="text-[#D8C7A5]">
                        Selected Discovery Call Date:
                      </span>
                      <strong className="text-[#FFE394] font-semibold">
                        {selectedCallDateDisplay}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDiscoveryFormExpanded((prev) => !prev);
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-gradient-to-b from-[#153668] to-[#081833] hover:from-[#1C4582] hover:to-[#0C2248] border border-[#D4AF37]/65 hover:border-[#FFE394] text-[#FFF4D4] text-xs font-semibold rounded-lg h-8.5 px-3.5 gap-1.5 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_0.5px_rgba(255,243,196,0.22)]"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#FFE394]" />
                      <span>
                        {isDiscoveryFormExpanded
                          ? "Hide Submission"
                          : "View Submission"}
                      </span>
                      {isDiscoveryFormExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-[#FFE394]" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-[#FFE394]" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Submission Body (Only renders when clicked) */}
                {isDiscoveryFormExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#D4AF37]/30 bg-[#040D1E]/95 space-y-4 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* 1. Highlighted Selected Calendar Date & Time Banner */}
                    <div className="p-3 rounded-xl bg-gradient-to-r from-[#102A52] via-[#0B1F3F] to-[#07152C] border border-[#D4AF37]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#051022] border border-[#D4AF37]/60 flex items-center justify-center text-[#FFE394] shrink-0">
                          <Calendar className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#DFC896] block">
                            Parent&apos;s Selected Discovery Call Calendar Slot
                          </span>
                          <p className="text-sm font-bold text-[#FFF4D4] mt-0.5">
                            {selectedCallDateDisplay}
                          </p>
                          <p className="text-[11px] text-[#93B4DB]">
                            Preferred Call Window: {bestTimeDisplay}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenScheduleModal()}
                          className="bg-gradient-to-b from-[#153668] to-[#07152E] hover:from-[#1C4582] hover:to-[#0A1C3C] border border-[#D4AF37]/65 text-[#FFF4D4] text-[11px] font-semibold h-8 px-3 rounded-lg cursor-pointer"
                        >
                          <Calendar className="h-3 w-3 text-[#FFE394] mr-1.5" />
                          Change Date
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onNavigate(`/leads/${discoveryLeadId}/discovery`)
                          }
                          className="bg-gradient-to-b from-[#153668] to-[#07152E] hover:from-[#1C4582] hover:to-[#0A1C3C] border border-[#D4AF37]/65 text-[#FFF4D4] text-[11px] font-semibold h-8 px-3 rounded-lg cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3 text-[#FFE394] mr-1.5" />
                          Open Call Console
                        </Button>
                      </div>
                    </div>

                    {/* 2. Submitted Contact & Student Information Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-[#07162E] border border-[#1E3B68] space-y-2">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFE394] border-b border-[#1E3B68] pb-1">
                          Submitted Parent / Guardian Info
                        </div>
                        <div className="space-y-1.5 text-[11.5px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#93B4DB]">Parent Name:</span>
                            <span className="font-semibold text-white text-right">
                              {parentDisplayName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#93B4DB]">Phone Number:</span>
                            <span className="font-semibold text-[#FFE394] text-right">
                              {parentPhoneDisplay}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#93B4DB]">Email Address:</span>
                            <span className="font-semibold text-white truncate max-w-[180px] text-right">
                              {parentEmailDisplay}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#93B4DB]">Best Time to Call:</span>
                            <span className="font-medium text-[#D8C7A5] text-right">
                              {bestTimeDisplay}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#07162E] border border-[#1E3B68] space-y-2">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFE394] border-b border-[#1E3B68] pb-1">
                          Submitted Student &amp; School Details
                        </div>
                        <div className="space-y-1.5 text-[11.5px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#93B4DB]">Student Name:</span>
                            <span className="font-semibold text-white text-right">
                              {studentDisplayName} ({studentGradeDisplay})
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#93B4DB]">School &amp; District:</span>
                            <span className="font-semibold text-white truncate max-w-[185px] text-right">
                              {schoolDisplay} · {districtDisplay}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#93B4DB]">Current Plan Status:</span>
                            <span className="font-semibold text-[#FFE394] text-right">
                              {planStatusDisplay}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#93B4DB]">Eligibility / Diagnosis:</span>
                            <span className="font-medium text-[#D8C7A5] truncate max-w-[185px] text-right">
                              {eligibilityDisplay}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Questionnaire Answers Submitted by Parent */}
                    <div className="p-3.5 rounded-xl bg-[#07162E] border border-[#1E3B68] space-y-3">
                      <div className="flex items-center justify-between border-b border-[#1E3B68] pb-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFE394]">
                          Discovery Call Questionnaire Answers
                        </span>
                        <span className="text-[10px] text-[#93B4DB]">
                          Source: {referralSourceAnswer}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-[11.5px]">
                        <div>
                          <p className="font-semibold text-[#DFC896]">
                            1. What are your primary concerns with your child&apos;s current IEP, 504 plan, or school support?
                          </p>
                          <p className="text-white/95 mt-0.5 leading-relaxed bg-[#040C1B] p-2.5 rounded-lg border border-[#162D52]">
                            {primaryConcernsAnswer}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="bg-[#040C1B] p-2.5 rounded-lg border border-[#162D52]">
                            <p className="font-semibold text-[#DFC896]">
                              2. Upcoming IEP / 504 Meeting Status:
                            </p>
                            <p className="text-white/95 mt-0.5">
                              {upcomingMeetingAnswer}
                            </p>
                          </div>

                          <div className="bg-[#040C1B] p-2.5 rounded-lg border border-[#162D52]">
                            <p className="font-semibold text-[#DFC896]">
                              3. Primary Advocacy Goal:
                            </p>
                            <p className="text-white/95 mt-0.5">
                              {desiredOutcomeAnswer}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Shared Family Enrollment Approval Modal */}
        <FamilyEnrollmentApprovalModal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          parentContactId={parent?.id || 0}
          studentContactId={student?.id}
          leadId={activeLead?.id}
          familyName={parent ? `${parent.firstName} ${parent.lastName}` : undefined}
          studentName={student ? `${student.firstName} ${student.lastName}` : undefined}
          onSuccess={() => {
            enrollmentStateQuery.refetch();
          }}
        />
      </div>
    );
  }


  // ─────────────────────────────────────────────────────────────
  // VIEW 2: ENROLLMENT PENDING STAGE (Approved for Enrollment)
  // ─────────────────────────────────────────────────────────────
  if (stage === "ENROLLMENT_PENDING") {
    const activeOffer = enrollmentStateQuery.data?.activeOffer;
    const planTier = activeOffer
      ? activeOffer.enrollmentMode === "custom"
        ? `Custom Offer: $${activeOffer.customMonthlyPrice}/mo (${activeOffer.customPlanName || "Advocacy Retainer"})`
        : "Standard Catalog Plans Unlocked (Navigator, Anchor, Family)"
      : parent?.planTier || "$105 / Month Comprehensive IEP Support";

    return (
      <div className="flex flex-col justify-between h-full space-y-4">
        <div>
          {/* Header Banner + Right-Side "Student Journey / Guide Me" Button */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <h3 
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Enrollment Offer Under Review
              </h3>

              <p className="text-xs sm:text-sm text-white/80 drop-shadow max-w-2xl">
                Family has been approved for enrollment. Parent selects their preferred plan in the portal, executes the advocacy agreement, and authorizes payment.
              </p>
            </div>

            <StudentJourneyGuideButton
              student={student}
              parent={parent}
              stage={stage}
              isDiscoveryCompleted={true}
              hasComplaintDraft={Boolean(complaintDraftInfo)}
              onNavigate={onNavigate}
              onSetActiveTab={onSetActiveTab}
              onOpenScheduleModal={onOpenScheduleModal}
              onOpenApprovalModal={() => setIsApprovalModalOpen(true)}
            />
          </div>

          {/* Offer & Pipeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            
            {/* Card 1: Approval & Plan Tier */}
            <div className={cn(DOSSIER_CARD_SURFACE, "p-4 flex flex-col justify-between min-h-[160px]")}>
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#DFC896]">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  APPROVAL STATUS
                </span>
                <div className="flex items-center gap-1.5">
                  {(activeOffer?.revisionNumber || 1) > 1 && (
                    <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-300 bg-amber-950/40">
                      Rev #{activeOffer?.revisionNumber}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-300 bg-emerald-950/30">
                    Approved
                  </Badge>
                </div>
              </div>

              <div className="my-2 space-y-1">
                <p className="text-sm font-bold text-white">
                  {activeOffer?.approvedByName ? `Approved by ${activeOffer.approvedByName}` : "Approved by Lead Advocate"}
                </p>
                <p className="text-xs text-amber-300 font-medium">{planTier}</p>
                {activeOffer?.selectedPlanName && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-[#FFF4D4]">Selected Plan:</span>
                    <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-300 bg-amber-950/40">
                      {activeOffer.selectedPlanName}
                      {activeOffer.selectedPlanPrice ? ` ($${activeOffer.selectedPlanPrice}/mo)` : ""}
                    </Badge>
                  </div>
                )}
                <p className="text-[11px] text-[#D8C7A5]">
                  {activeOffer?.billingArrangement === "manual_invoice"
                    ? `Manual Invoicing: Due ${activeOffer.manualInvoiceDueDate}`
                    : "Autopay Billing via Stripe"}
                  {activeOffer?.invitationExpiresAt
                    ? ` • Expires ${new Date(activeOffer.invitationExpiresAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>

              {activeOffer && ["plan_selected", "agreement_pending", "agreement_signed", "payment_pending", "active"].includes(activeOffer.status) ? (
                <Button
                  onClick={() => {
                    setIsSupersedeMode(true);
                    setIsApprovalModalOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                  className={DOSSIER_CARD_BUTTON}
                >
                  <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                  <span>Supersede Offer Terms</span>
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setIsSupersedeMode(false);
                    setIsApprovalModalOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                  className={DOSSIER_CARD_BUTTON}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#FFE394]" />
                  <span>Edit Offer Terms</span>
                </Button>
              )}
            </div>

            {/* Card 2: Agreement & Payment Status */}
            <div className={cn(DOSSIER_CARD_SURFACE, "p-4 flex flex-col justify-between min-h-[160px]")}>
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#DFC896]">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-300" />
                  AGREEMENT &amp; CHECKOUT
                </span>
                <Badge variant="outline" className={cn(
                  "text-[9px]",
                  activeOffer?.hasPendingRevision
                    ? "border-amber-400/40 text-amber-300 bg-amber-950/30"
                    : activeOffer?.invitationStatus === "dispatched"
                    ? "border-blue-400/40 text-blue-300 bg-blue-950/30"
                    : activeOffer?.invitationStatus === "failed"
                    ? "border-red-400/40 text-red-300 bg-red-950/30"
                    : "border-amber-400/40 text-amber-300 bg-amber-950/30"
                )}>
                  {activeOffer?.hasPendingRevision
                    ? "Revision Pending"
                    : activeOffer?.invitationStatus === "dispatched"
                    ? (activeOffer.resendCount ? `Dispatched (${activeOffer.resendCount}x)` : "Dispatched")
                    : activeOffer?.invitationStatus === "failed"
                    ? "Delivery Failed"
                    : "Invitation Pending"}
                </Badge>
              </div>

              <div className="my-2 space-y-1.5 text-xs">
                {activeOffer?.hasPendingRevision && (
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-200 flex items-center justify-between mb-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 text-amber-400" />
                      Revision Pending
                    </span>
                    <Badge variant="outline" className="text-[9px] border-amber-400/50 text-amber-300 bg-amber-950/50">
                      Draft #{activeOffer.pendingRevisionAgreementId}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[#C6B697]">Agreement:</span>
                  <Badge variant="outline" className={cn(
                    "text-[9px]",
                    activeOffer?.hasPendingRevision
                      ? "border-amber-400/40 text-amber-300 bg-amber-950/30"
                      : activeOffer?.agreementStatus === "signed"
                      ? "border-emerald-500/40 text-emerald-300 bg-emerald-950/30"
                      : activeOffer?.status === "agreement_pending"
                      ? "border-amber-400/40 text-amber-300 bg-amber-950/30"
                      : "border-slate-700/40 text-slate-400 bg-slate-950/30"
                  )}>
                    {activeOffer?.hasPendingRevision
                      ? "Revision Pending (Original Preserved)"
                      : activeOffer?.agreementStatus === "signed"
                      ? "Executed & Locked"
                      : activeOffer?.status === "agreement_pending"
                      ? "Awaiting Signature"
                      : "Awaiting Selection"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#C6B697]">Payment:</span>
                  <Badge variant="outline" className={cn(
                    "text-[9px]",
                    activeOffer?.hasPendingRevision
                      ? "border-amber-400/40 text-amber-300 bg-amber-950/30"
                      : activeOffer?.status === "payment_attention" || activeOffer?.paymentStatus === "failed"
                      ? "border-rose-500/50 text-rose-300 bg-rose-950/40"
                      : activeOffer?.billingArrangement === "manual_invoice"
                      ? "border-sky-400/40 text-sky-300 bg-sky-950/30"
                      : activeOffer?.agreementStatus === "signed" || activeOffer?.status === "payment_pending"
                      ? "border-amber-400/40 text-amber-300 bg-amber-950/30"
                      : "border-slate-700/40 text-slate-400 bg-slate-950/30"
                  )}>
                    {activeOffer?.hasPendingRevision
                      ? "Revision In Progress"
                      : activeOffer?.status === "payment_attention" || activeOffer?.paymentStatus === "failed"
                      ? "Attention Required"
                      : activeOffer?.billingArrangement === "manual_invoice"
                      ? (activeOffer.initialInvoiceId ? "Invoice Issued" : "Manual Invoice Pending")
                      : activeOffer?.agreementStatus === "signed" || activeOffer?.status === "payment_pending"
                      ? "Payment Pending"
                      : "Pending Agreement"}
                  </Badge>
                </div>

                <p className="text-[11px] text-[#C6B697] pt-0.5">
                  {activeOffer?.hasPendingRevision
                    ? `Payment structure revision requested (${activeOffer.pendingRevisionStructure === "pay_in_full" ? "Pay in Full" : "Monthly Autopay"}). Original signed agreement #${activeOffer.agreementId} remains preserved while replacement draft #${activeOffer.pendingRevisionAgreementId} awaits signature.`
                    : activeOffer?.status === "payment_attention" || activeOffer?.paymentStatus === "failed"
                    ? `Payment authorization declined: ${activeOffer.paymentAttentionReason || "Family notified to retry payment in portal."}`
                    : activeOffer?.billingArrangement === "manual_invoice"
                    ? (activeOffer.initialInvoiceId
                        ? `Invoice #${activeOffer.initialInvoiceId} issued. Verified first payment required for activation.`
                        : "Approved manual invoicing arrangement. Initial invoice ready to issue.")
                    : activeOffer?.agreementStatus === "signed" || activeOffer?.status === "payment_pending"
                    ? "Agreement signed. First-payment card authorization pending in portal."
                    : activeOffer?.invitationStatus === "dispatched"
                    ? "Parent completes plan choice, agreement signing, and payment authorization in portal."
                    : "Portal enrollment is ready. Outbound invitation dispatch prepared."}
                </p>
              </div>

              {activeOffer?.billingArrangement === "manual_invoice" && !activeOffer?.initialInvoiceId && activeOffer?.agreementStatus === "signed" ? (
                <Button
                  onClick={() => {
                    if (activeOffer?.id && parent?.id) {
                      createManualInvoiceMutation.mutate({
                        offerId: activeOffer.id,
                        parentContactId: parent.id,
                      });
                    }
                  }}
                  disabled={createManualInvoiceMutation.isPending}
                  size="sm"
                  variant="outline"
                  className={DOSSIER_CARD_BUTTON}
                >
                  <FileText className="h-3.5 w-3.5 text-amber-300" />
                  <span>{createManualInvoiceMutation.isPending ? "Generating..." : "Generate Initial Invoice"}</span>
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (activeOffer?.id) {
                      resendEnrollmentMutation.mutate({ offerId: activeOffer.id });
                    } else {
                      toast.error("No active enrollment offer found to resend.");
                    }
                  }}
                  disabled={!activeOffer?.id || resendEnrollmentMutation.isPending}
                  size="sm"
                  variant="outline"
                  className={DOSSIER_CARD_BUTTON}
                >
                  <Send className="h-3.5 w-3.5 text-[#FFE394]" />
                  <span>{resendEnrollmentMutation.isPending ? "Sending..." : "Resend Enrollment Link"}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Card: Portal Account Status */}
          <div className={cn(DOSSIER_CARD_SURFACE, "p-3.5 mt-4 flex items-center justify-between")}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#DFC896]">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
                <span>PARENT PORTAL ACCESS</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/90">
                <Clock className="h-3.5 w-3.5 text-amber-300/80" />
                <span>
                  {parent?.email ? `Pre-enrollment access active for ${parent.email}` : "Portal access available upon parent invite."}
                </span>
              </div>
            </div>

            <Button
              onClick={handleResendPortal}
              disabled={resendPortalMutation.isPending || (!parent?.email && !student?.email)}
              variant="outline"
              size="sm"
              className="bg-gradient-to-b from-[#153668] to-[#07152E] hover:from-[#1C4582] hover:to-[#0A1C3C] border border-[#D4AF37]/65 hover:border-[#FFE394] text-[#FFF4D4] text-xs sm:text-sm font-semibold rounded-lg h-8.5 px-3.5 gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.75),inset_0_1px_0.5px_rgba(255,243,196,0.22)]"
            >
              <Send className="h-3.5 w-3.5 text-[#FFE394]" />
              <span>{resendPortalMutation.isPending ? "Sending..." : "Resend Invite"}</span>
            </Button>
          </div>
        </div>

        {/* Shared Family Enrollment Approval Modal */}
        <FamilyEnrollmentApprovalModal
          isOpen={isApprovalModalOpen}
          isSupersedeMode={isSupersedeMode}
          onClose={() => {
            setIsApprovalModalOpen(false);
            setIsSupersedeMode(false);
          }}
          parentContactId={parent?.id || 0}
          studentContactId={student?.id}
          leadId={activeLead?.id}
          familyName={parent ? `${parent.firstName} ${parent.lastName}` : undefined}
          studentName={student ? `${student.firstName} ${student.lastName}` : undefined}
          onSuccess={() => {
            enrollmentStateQuery.refetch();
          }}
        />
      </div>
    );
  }


  // ─────────────────────────────────────────────────────────────
  // VIEW 3 & 4: ACTIVE CLIENT & RENEWAL STAGES
  // Preserves 100% of existing layout and functionality.
  // In Renewal stage, prepends a compact renewal banner.
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col justify-between h-full space-y-4">
      <div>
        {/* COMPACT RENEWAL BANNER (Displayed ONLY when approaching renewal) */}
        {stage === "RENEWAL" && (
          <div className="rounded-xl bg-[#05142B]/90 border border-[#D4AF37]/60 p-3.5 mb-4 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFE394]">
                <RefreshCw className="h-4 w-4 text-[#C5A059]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#FFF4D4] uppercase tracking-wider">
                    Annual Advocacy Renewal
                  </span>
                  <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-300 bg-amber-950/40">
                    {renewalDaysRemaining != null ? `${renewalDaysRemaining} Days Remaining` : "Renewal Approaching"}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#C6B697] mt-0.5">
                  Family membership commitment period ending soon. All existing case history and service allowances preserved.
                </p>
              </div>
            </div>

            <Button
              disabled
              variant="outline"
              size="sm"
              className="border-[#C5A059]/40 text-[#FFE394] bg-[#07162B] opacity-80 cursor-not-allowed text-xs font-semibold rounded-lg h-8 px-3 gap-1.5 shrink-0"
              title="Renewal review terms"
            >
              <span>Review Renewal Terms</span>
            </Button>
          </div>
        )}

        {/* Post-Activation Onboarding Gate: Documents Awaiting Review */}
        {enrollmentStateQuery.data?.activeOffer?.status === "active" && 
         enrollmentStateQuery.data?.activeOffer?.documentReviewStatus !== "approved" && (
          <div className="rounded-xl bg-[#05142B]/90 border border-amber-500/50 p-4 mb-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#020A17] border border-[#3A2C18] text-amber-400 shrink-0">
                <FileText className="h-5 w-5 text-amber-400" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#FFF4D4] uppercase tracking-wider">
                    Documents Awaiting Review
                  </span>
                  <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-300 bg-amber-950/40">
                    Blueprint Scheduling Locked
                  </Badge>
                </div>
                <p className="text-[11px] text-[#C6B697] leading-relaxed max-w-xl">
                  Family membership is verified active. Lead advocate document review is required before unlocking the IEP Blueprint Strategy Session in the parent portal.
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                if (enrollmentStateQuery.data?.activeOffer?.id) {
                  markDocumentReviewMutation.mutate({
                    offerId: enrollmentStateQuery.data.activeOffer.id,
                    studentContactId: student?.id,
                  });
                }
              }}
              disabled={markDocumentReviewMutation.isPending}
              size="sm"
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#d5b36a] hover:to-[#917133] text-[#07162B] font-bold text-xs h-9 px-4 gap-1.5 shrink-0 shadow-md cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{markDocumentReviewMutation.isPending ? "Approving..." : "Mark Document Review Complete"}</span>
            </Button>
          </div>
        )}

        {enrollmentStateQuery.data?.activeOffer?.status === "active" && 
         enrollmentStateQuery.data?.activeOffer?.documentReviewStatus === "approved" && (
          <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-3 mb-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Document Review Complete — IEP Blueprint Strategy Session Unlocked</span>
            </div>
            {enrollmentStateQuery.data.activeOffer.documentReviewCompletedByName && (
              <span className="text-[11px] text-[#C6B697]">
                Approved by {enrollmentStateQuery.data.activeOffer.documentReviewCompletedByName}
              </span>
            )}
          </div>
        )}

        {/* Existing Current Focus Banner + Right-Side "Student Journey / Guide Me" Button */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <h3 
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {compass?.currentStatus || "Prepare for the next IEP meeting"}
            </h3>
            <p className="text-xs sm:text-sm text-white/80 drop-shadow">
              {compass?.nextStep || "Review records and organize parent concerns."}
            </p>
          </div>

          <StudentJourneyGuideButton
            student={student}
            parent={parent}
            stage={stage}
            isDiscoveryCompleted={true}
            hasComplaintDraft={Boolean(complaintDraftInfo)}
            onNavigate={onNavigate}
            onSetActiveTab={onSetActiveTab}
            onOpenScheduleModal={onOpenScheduleModal}
            onOpenApprovalModal={() => setIsApprovalModalOpen(true)}
          />
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button
            onClick={() => onNavigate(`/meeting-workspace/${student?.id || 0}`)}
            className={DOSSIER_TOP_ACTION_BUTTON}
          >
            <Calendar className="h-4 w-4 text-amber-300" />
            <span>Prepare for Meeting</span>
          </Button>

          <Button
            onClick={() => onNavigate(`/post-meeting-review/${student?.id || 0}`)}
            variant="outline"
            className={DOSSIER_TOP_ACTION_BUTTON}
          >
            <FileText className="h-4 w-4 text-amber-300" />
            <span>Post-Meeting Review</span>
          </Button>

          {complaintDraftInfo && (
            <Button
              onClick={() => onNavigate(`/state-complaint-builder?studentId=${student?.id || 0}`)}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs rounded-xl h-10 px-5 gap-2 shadow-md border border-[#FFE394]/70 cursor-pointer"
            >
              <Landmark className="h-4 w-4 text-[#07162B]" />
              <span>State Complaint ({complaintDraftInfo.pageCount} Pages)</span>
            </Button>
          )}
        </div>

        {/* Prominent Saved Complaint Filing Card (Active View) */}
        {complaintDraftInfo && (
          <div className="rounded-xl bg-[#05142B]/95 border-2 border-[#D4AF37]/80 p-4 mt-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#020A17] border border-[#FFE394]/40 text-[#FFE394] shrink-0">
                <Landmark className="h-5 w-5 text-[#FFE394]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#FFF4D4] uppercase tracking-wider">
                    SAVED STATE COMPLAINT ON RECORD
                  </span>
                  <Badge className="bg-[#DFBE77]/20 border border-[#DFBE77]/60 text-[#FFE394] text-[10px] font-mono px-2 py-0.5 font-bold">
                    {complaintDraftInfo.pageCount} Pages Docket
                  </Badge>
                  <Badge className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono px-2 py-0.5">
                    {complaintDraftInfo.district}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#C6B697] mt-0.5">
                  Complete assembled filing docket with GaDOE official form, Clarity Control, chronological facts, and exhibits.
                </p>
              </div>
            </div>

            <Button
              onClick={() => onNavigate(`/state-complaint-builder?studentId=${student?.id || 0}`)}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs h-9 px-4 gap-1.5 shrink-0 shadow-md cursor-pointer border border-[#FFE394]/60"
            >
              <span>Open {complaintDraftInfo.pageCount}-Page Filing</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </Button>
          </div>
        )}

        {/* Middle Cards: Next Meeting & Next Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          
          {/* Card 1: Next Meeting */}
          <div className={cn(DOSSIER_CARD_SURFACE, "p-4 flex flex-col justify-between min-h-[160px]")}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#DFC896]">
              <Calendar className="h-3.5 w-3.5 text-amber-300" />
              <span>NEXT MEETING</span>
            </div>

            {nextAppointment ? (
              <div className="my-2 space-y-1">
                <p className="text-sm font-bold text-white">{nextAppointment.title || "IEP Review Session"}</p>
                <p className="text-xs sm:text-sm text-amber-300 font-medium">
                  {new Date(nextAppointment.date!).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center my-2 space-y-1">
                <Calendar className="h-6 w-6 text-[#FFE394]/60" />
                <p className="text-xs sm:text-sm font-semibold text-white">No meeting scheduled</p>
                <p className="text-[11px] text-[#D8C7A5] max-w-[220px]">
                  Schedule a meeting to keep this case on track.
                </p>
              </div>
            )}

            <Button
              onClick={() => onOpenScheduleModal()}
              size="sm"
              variant="outline"
              className={DOSSIER_CARD_BUTTON}
            >
              <Calendar className="h-3.5 w-3.5 text-amber-300" />
              <span>Schedule meeting</span>
            </Button>
          </div>

          {/* Card 2: Next Actions */}
          <div className={cn(DOSSIER_CARD_SURFACE, "p-4 flex flex-col justify-between min-h-[160px]")}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#DFC896] mb-2.5">
              <CheckSquare className="h-3.5 w-3.5 text-amber-300" />
              <span>NEXT ACTIONS</span>
            </div>

            <div className="space-y-2">
              {[
                { id: "review-iep", label: "Review latest IEP" },
                { id: "confirm-priorities", label: "Confirm parent priorities" },
                { id: "missing-records", label: "Request missing records" },
              ].map((action) => {
                const isDone = !!checkedActions[action.id];
                return (
                  <button
                    key={action.id}
                    onClick={() => onToggleAction(action.id)}
                    className="w-full flex items-center gap-2.5 text-left text-xs sm:text-sm text-white/95 hover:text-white transition-colors cursor-pointer group"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                      isDone 
                        ? "bg-amber-400 border-amber-300 text-slate-950 font-bold" 
                        : "border-[#D4AF37]/60 group-hover:border-amber-300 bg-black/30"
                    )}>
                      {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                    <span className={cn(isDone && "line-through text-white/40")}>
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-1.5 text-[11px] text-[#D8C7A5]">
              {Object.values(checkedActions).filter(Boolean).length} of 3 completed
            </div>
          </div>
        </div>

        {/* Bottom Card: Recent Activity */}
        <div className={cn(DOSSIER_CARD_SURFACE, "p-3.5 mt-4 flex items-center justify-between")}>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#DFC896]">
              <FileText className="h-3.5 w-3.5 text-amber-300" />
              <span>RECENT ACTIVITY</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-white/90">
              <Clock className="h-3.5 w-3.5 text-amber-300/80" />
              <span>Case updates appear here.</span>
            </div>
          </div>

          <Button
            onClick={() => onSetActiveTab?.("more")}
            variant="outline"
            size="sm"
            className="bg-gradient-to-b from-[#133262] to-[#081833] hover:from-[#1A427E] hover:to-[#0C2248] border border-[#D4AF37]/65 hover:border-[#FFE394] text-[#FFF4D4] text-xs sm:text-sm font-semibold rounded-lg h-8.5 px-3.5 gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_0.5px_rgba(255,243,196,0.22)]"
          >
            <Clock className="h-3.5 w-3.5 text-[#FFE394]" />
            <span>View timeline</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

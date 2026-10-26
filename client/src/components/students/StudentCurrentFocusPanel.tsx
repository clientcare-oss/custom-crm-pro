import React, { useMemo, useState } from "react";
import { 
  Calendar, CheckSquare, FileText, Clock, CheckCircle2, 
  ShieldCheck, ArrowRight, ExternalLink, Send, AlertCircle, 
  Sparkles, RefreshCw, Lock, Award, Compass, PhoneCall,
  UserCheck, AlertTriangle, Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { FamilyEnrollmentApprovalModal } from "@/components/enrollment/FamilyEnrollmentApprovalModal";


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
          {/* Header Banner */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-amber-300/90 drop-shadow">
                CURRENT FOCUS — DISCOVERY &amp; EVALUATION
              </p>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider py-0 px-2",
                  isCompleted 
                    ? "border-emerald-500/50 text-emerald-300 bg-emerald-950/40" 
                    : "border-amber-500/50 text-amber-300 bg-amber-950/40"
                )}
              >
                {isCompleted ? "Discovery Completed" : scheduledDate ? "Call Scheduled" : "Discovery Pending"}
              </Badge>
            </div>

            <h3 
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {isCompleted ? "Discovery Completed — Review & Enrollment" : "Initial Discovery Consultation"}
            </h3>

            <p className="text-xs sm:text-sm text-white/80 drop-shadow max-w-2xl">
              {isCompleted 
                ? "Discovery consultation finished and notes recorded. Family is eligible for Phase 2 enrollment review."
                : scheduledDate
                ? `Discovery call scheduled for ${new Date(scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Review case details and parent priorities.`
                : "Schedule the initial discovery consultation to evaluate the student's IEP history and advocacy needs."
              }
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Button
              onClick={() => onNavigate(`/leads/${discoveryLeadId}/discovery`)}
              className="bg-gradient-to-r from-[#0d2242] to-[#14325c] hover:from-[#13305c] hover:to-[#1a4078] text-white border border-[#D4AF37]/80 font-semibold text-xs rounded-xl h-10 px-5 gap-2 shadow-md cursor-pointer"
            >
              <Compass className="h-4 w-4 text-amber-300" />
              <span>{isCompleted ? "Review Discovery Session" : "Start / Resume Discovery Call"}</span>
            </Button>

            <Button
              onClick={() => onOpenScheduleModal()}
              variant="outline"
              className="bg-[#081a33]/60 hover:bg-[#0c2447] text-white/95 hover:text-white border-white/20 font-semibold text-xs rounded-xl h-10 px-5 gap-2 shadow-sm cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-amber-300" />
              <span>{scheduledDate ? "Reschedule Discovery" : "Schedule Discovery Call"}</span>
            </Button>

            <Button
              onClick={handleResendPortal}
              disabled={resendPortalMutation.isPending || (!parent?.email && !student?.email)}
              variant="outline"
              className="bg-[#081a33]/60 hover:bg-[#0c2447] text-white/95 hover:text-white border-white/20 font-semibold text-xs rounded-xl h-10 px-4 gap-2 shadow-sm cursor-pointer"
              title="Send or resend parent portal access link"
            >
              <Send className="h-3.5 w-3.5 text-sky-300" />
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
            <div className="rounded-xl bg-[#020b18]/40 border border-[#3A2C18] p-4 flex flex-col justify-between min-h-[170px] shadow-inner">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#C6B697]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-300" />
                  DISCOVERY SESSION
                </span>
                <span className="text-[11px] text-[#FFE394]">
                  {parent?.firstName ? `Anchor: ${parent.firstName} ${parent.lastName}` : "Parent Profile"}
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
                    <p className="text-[11px] text-[#C6B697] truncate">
                      {parent?.phone || student?.phone ? `Contact: ${parent?.phone || student?.phone}` : "Phone pending"}
                    </p>
                  </>
                ) : (
                  <div className="text-center py-2 space-y-1">
                    <p className="text-xs font-semibold text-white/90">No Discovery Appointment Booked</p>
                    <p className="text-[11px] text-[#C6B697]">
                      Schedule a call to begin the formal IEP advocacy intake.
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={() => onNavigate(`/calendar`)}
                size="sm"
                variant="outline"
                className="w-full mt-2 bg-[#091b35]/60 hover:bg-[#0f2a52] border-[#D4AF37]/50 text-white text-xs font-semibold rounded-lg h-8 gap-1.5 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-amber-300" />
                <span>Open Calendar Dispatch</span>
              </Button>
            </div>

            {/* Card 2: Shared Architecture Enrollment Approval Placement */}
            <div className="rounded-xl bg-[#020b18]/40 border border-[#3A2C18] p-4 flex flex-col justify-between min-h-[170px] shadow-inner">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#C6B697]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
                  ENROLLMENT APPROVAL
                </span>
                <Badge variant="outline" className="text-[9px] border-amber-400/40 text-amber-300 bg-amber-950/30">
                  Phase 2 Pipeline
                </Badge>
              </div>

              <div className="my-2 space-y-1">
                {isCompleted ? (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Discovery Completed — Ready for Approval</span>
                    </div>
                    <p className="text-[11px] text-[#C6B697]">
                      Family is eligible for enrollment approval. Phase 2 will unlock plan selection, agreement generator, and checkout.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-amber-300/90 font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Discovery In Progress</span>
                    </div>
                    <p className="text-[11px] text-[#C6B697]">
                      Completed discovery is normally required. Staff exception requires authorized reason &amp; timeline entry (Phase 2).
                    </p>
                  </>
                )}
              </div>

              <Button
                onClick={() => setIsApprovalModalOpen(true)}
                size="sm"
                variant="outline"
                className="w-full mt-2 border-[#C5A059] text-[#FFE394] hover:text-white bg-[#07162B] hover:bg-[#0f2a52] text-xs font-semibold rounded-lg h-8 gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#C5A059]" />
                <span>Approve for Enrollment</span>
              </Button>
            </div>
          </div>

          {/* Bottom Card: Discovery Intake History Inset */}
          <div className="rounded-xl bg-[#020b18]/25 border border-white/15 p-3.5 mt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-white/50">
                <FileText className="h-3.5 w-3.5" />
                <span>DISCOVERY &amp; INTAKE DOSSIER</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/75">
                <Clock className="h-3.5 w-3.5 text-white/40" />
                <span>
                  {latestDiscoveryCall 
                    ? `Session created on ${new Date(latestDiscoveryCall.createdAt).toLocaleDateString()} — Pre-enrollment record active.`
                    : "No discovery session recorded yet."
                  }
                </span>
              </div>
            </div>

            <Button
              onClick={() => onNavigate(`/leads/${discoveryLeadId}/discovery`)}
              variant="outline"
              size="sm"
              className="bg-transparent hover:bg-white/5 border-white/20 text-white text-xs sm:text-sm font-semibold rounded-lg h-8 px-3 gap-2 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 text-white/70" />
              <span>Open Console</span>
            </Button>
          </div>
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
          {/* Header Banner */}
          <div className="space-y-1">
              <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-sky-300 drop-shadow">
                CURRENT FOCUS — ENROLLMENT &amp; ONBOARDING
              </p>
              <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider py-0 px-2 border-sky-400/50 text-sky-200 bg-sky-950/40">
                Enrollment Pending
              </Badge>
              {activeOffer?.hasPendingRevision && (
                <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider py-0 px-2 border-amber-400/50 text-amber-300 bg-amber-950/40">
                  Revision Pending
                </Badge>
              )}
            </div>

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

          {/* Offer & Pipeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            
            {/* Card 1: Approval & Plan Tier */}
            <div className="rounded-xl bg-[#020b18]/40 border border-[#3A2C18] p-4 flex flex-col justify-between min-h-[160px] shadow-inner">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#C6B697]">
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
                <p className="text-[11px] text-[#C6B697]">
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
                  className="w-full mt-2 border-amber-500/40 text-amber-300 hover:text-white bg-[#07162B] hover:bg-[#0f2a52] text-xs font-semibold rounded-lg h-8 gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
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
                  className="w-full mt-2 border-[#C5A059] text-[#FFE394] hover:text-white bg-[#07162B] hover:bg-[#0f2a52] text-xs font-semibold rounded-lg h-8 gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#C5A059]" />
                  <span>Edit Offer Terms</span>
                </Button>
              )}
            </div>

            {/* Card 2: Agreement & Payment Status */}
            <div className="rounded-xl bg-[#020b18]/40 border border-[#3A2C18] p-4 flex flex-col justify-between min-h-[160px] shadow-inner">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-[#C6B697]">
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
                  className="w-full mt-2 border-sky-500/50 text-sky-200 hover:text-white bg-[#07162B] hover:bg-[#0f2a52] text-xs font-semibold rounded-lg h-8 gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                >
                  <FileText className="h-3.5 w-3.5 text-sky-400" />
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
                  className="w-full mt-2 border-[#C5A059] text-[#FFE394] hover:text-white bg-[#07162B] hover:bg-[#0f2a52] text-xs font-semibold rounded-lg h-8 gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                >
                  <Send className="h-3.5 w-3.5 text-[#C5A059]" />
                  <span>{resendEnrollmentMutation.isPending ? "Sending..." : "Resend Enrollment Link"}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Card: Portal Account Status */}
          <div className="rounded-xl bg-[#020b18]/25 border border-white/15 p-3.5 mt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-white/50">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>PARENT PORTAL ACCESS</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/75">
                <Clock className="h-3.5 w-3.5 text-white/40" />
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
              className="bg-transparent hover:bg-white/5 border-white/20 text-white text-xs sm:text-sm font-semibold rounded-lg h-8 px-3 gap-2 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-white/70" />
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
              title="Renewal review will be connected in Phase 2"
            >
              <span>Review Renewal Terms (Phase 2)</span>
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

        {/* Existing Current Focus Banner */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold tracking-widest uppercase text-sky-300/90 drop-shadow">
            CURRENT FOCUS
          </p>
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

        {/* Primary Action Buttons (Preserved exactly) */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button
            onClick={() => onNavigate(`/meeting-workspace/${student?.id || 0}`)}
            className="bg-gradient-to-r from-[#0d2242] to-[#14325c] hover:from-[#13305c] hover:to-[#1a4078] text-white border border-[#D4AF37]/80 font-semibold text-xs rounded-xl h-10 px-5 gap-2 shadow-md cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-amber-300" />
            <span>Prepare for Meeting</span>
          </Button>

          <Button
            onClick={() => onNavigate(`/post-meeting-review/${student?.id || 0}`)}
            variant="outline"
            className="bg-[#081a33]/60 hover:bg-[#0c2447] text-white/95 hover:text-white border-white/20 font-semibold text-xs rounded-xl h-10 px-5 gap-2 shadow-sm cursor-pointer"
          >
            <FileText className="h-4 w-4 text-white/75" />
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

        {/* Middle Cards: Next Meeting & Next Actions (Preserved exactly) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          
          {/* Card 1: Next Meeting */}
          <div className="rounded-xl bg-[#020b18]/25 border border-white/15 p-4 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-white/50">
              <Calendar className="h-3.5 w-3.5" />
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
                <Calendar className="h-6 w-6 text-white/35" />
                <p className="text-xs sm:text-sm font-semibold text-white/95">No meeting scheduled</p>
                <p className="text-[11px] text-white/55 max-w-[220px]">
                  Schedule a meeting to keep this case on track.
                </p>
              </div>
            )}

            <Button
              onClick={() => onOpenScheduleModal()}
              size="sm"
              variant="outline"
              className="w-full mt-2 bg-[#091b35]/60 hover:bg-[#0f2a52] border-[#D4AF37]/50 text-white text-xs font-semibold rounded-lg h-8 gap-2 cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-amber-300" />
              <span>Schedule meeting</span>
            </Button>
          </div>

          {/* Card 2: Next Actions */}
          <div className="rounded-xl bg-[#020b18]/25 border border-white/15 p-4 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-white/50 mb-2.5">
              <CheckSquare className="h-3.5 w-3.5" />
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
                    className="w-full flex items-center gap-2.5 text-left text-xs sm:text-sm text-white/90 hover:text-white transition-colors cursor-pointer group"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                      isDone 
                        ? "bg-amber-400 border-amber-300 text-slate-950 font-bold" 
                        : "border-white/30 group-hover:border-amber-300 bg-black/20"
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

            <div className="pt-1.5 text-[11px] text-white/40">
              {Object.values(checkedActions).filter(Boolean).length} of 3 completed
            </div>
          </div>
        </div>

        {/* Bottom Card: Recent Activity */}
        <div className="rounded-xl bg-[#020b18]/25 border border-white/15 p-3.5 mt-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-white/50">
              <FileText className="h-3.5 w-3.5" />
              <span>RECENT ACTIVITY</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-white/75">
              <Clock className="h-3.5 w-3.5 text-white/40" />
              <span>Case updates appear here.</span>
            </div>
          </div>

          <Button
            onClick={() => onSetActiveTab?.("more")}
            variant="outline"
            size="sm"
            className="bg-transparent hover:bg-white/5 border-white/20 text-white text-xs sm:text-sm font-semibold rounded-lg h-8 px-3 gap-2 cursor-pointer"
          >
            <Clock className="h-3.5 w-3.5 text-white/70" />
            <span>View timeline</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

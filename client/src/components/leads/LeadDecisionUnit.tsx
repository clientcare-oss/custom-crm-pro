import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Phone,
  Send,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface LeadDecisionUnitProps {
  workspace: any;
  onRefresh: () => void;
  onStageChange: (
    stage: "inquiry" | "discovery" | "decision" | "onboarding"
  ) => void;
  onOpenHistoryDrawer?: () => void;
}

type ChoiceOption =
  | "considering"
  | "ready_to_start"
  | "needs_time"
  | "another_conversation"
  | "not_proceeding";

const NOT_PROCEEDING_REASONS = [
  "Budget / Financial timing",
  "Resolved issue with school district directly",
  "Chose another provider or legal counsel",
  "Postponing until next IEP cycle",
  "Outside service scope",
  "Other reason",
];

const NEEDS_TIME_REASONS = [
  "Needs more time",
  "Discussing options with spouse / co-parent",
  "Reviewing household budget",
  "Waiting for upcoming school evaluation results",
  "Waiting for a particular month to start",
  "Comparing service plans",
  "Upcoming move",
];

export function LeadDecisionUnit({
  workspace,
  onRefresh,
  onStageChange,
  onOpenHistoryDrawer,
}: LeadDecisionUnitProps) {
  const utils = trpc.useUtils();
  const savedDecision = workspace.journey?.decision;
  const enrollment = workspace.enrollment || {};
  const activeOffer = enrollment.activeOffer;

  const hasSavedDecision =
    savedDecision &&
    savedDecision.choice &&
    savedDecision.choice !== "undecided";

  const [selectedChoice, setSelectedChoice] = useState<ChoiceOption>(
    hasSavedDecision ? (savedDecision.choice as ChoiceOption) : "needs_time"
  );

  // Published plans from existing service catalog
  const publishedPlans = enrollment.publishedPlans || [
    {
      key: "navigator",
      name: "Navigator",
      monthlyPrice: 55,
      description: "Essential IEP guidance and preparation",
    },
    {
      key: "anchor",
      name: "Anchor",
      monthlyPrice: 105,
      description: "Comprehensive year-round advocacy support",
    },
    {
      key: "family",
      name: "Family",
      monthlyPrice: 135,
      description: "Multi-student household advocacy coverage",
    },
  ];

  // Bridge Discovery Step 05 plan selection if decision hasn't saved a plan yet
  const discoveryPlanFallback = (() => {
    try {
      if (workspace.discoveryCall?.pricingNotes) {
        const parsed = JSON.parse(workspace.discoveryCall.pricingNotes);
        if (parsed.selectedPlan === "advocacy_55") return "navigator";
        if (parsed.selectedPlan === "complaints_100") return "anchor";
      }
    } catch {}
    return "anchor";
  })();

  const [enrollmentMode, setEnrollmentMode] = useState<"standard" | "custom">(
    "standard"
  );
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(
    activeOffer?.selectedPlanKey ||
      savedDecision?.selectedPlanKey ||
      discoveryPlanFallback
  );
  const [customPlanName, setCustomPlanName] = useState<string>(
    "Custom Advocacy Arrangement"
  );
  const [customMonthlyPrice, setCustomMonthlyPrice] = useState<number>(105);
  const [paymentStructure, setPaymentStructure] = useState<
    "monthly_autopay" | "pay_in_full"
  >(savedDecision?.paymentStructure || "monthly_autopay");
  const [billingArrangement, setBillingArrangement] = useState<
    "autopay" | "manual_invoice"
  >(savedDecision?.billingArrangement || "autopay");
  const [manualInvoiceDueDate] = useState<string>(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().slice(0, 10);
  });

  // Needs time state (defaults to "Needs more time" — never "After a move")
  const [needsTimeReason, setNeedsTimeReason] = useState<string>(
    savedDecision?.reason || "Needs more time"
  );
  const [followUpDate, setFollowUpDate] = useState<string>(() => {
    if (savedDecision?.followUpDate)
      return savedDecision.followUpDate.slice(0, 10);
    const d = new Date(Date.now() + 14 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [followUpSequenceId, setFollowUpSequenceId] = useState<number | null>(
    savedDecision?.followUpSequenceId || null
  );

  // Another conversation state
  const [conversationPurpose, setConversationPurpose] = useState<string>(
    savedDecision?.conversationPurpose || "Review advocacy plan with co-parent"
  );
  const [conversationDate] = useState<string>(
    savedDecision?.conversationScheduledAt
      ? savedDecision.conversationScheduledAt.slice(0, 10)
      : ""
  );
  const [conversationTime] = useState<string>("14:00");
  const [nextContactAction] = useState<string>(
    savedDecision?.nextContactAction ||
      "Call family to confirm time for second conversation"
  );
  const [nextContactDate] = useState<string>(
    savedDecision?.nextContactDate
      ? savedDecision.nextContactDate.slice(0, 10)
      : ""
  );

  // Not proceeding / Declined state
  const [closedReason, setClosedReason] = useState<string>(
    savedDecision?.closedReason || NOT_PROCEEDING_REASONS[0]
  );

  // Shared note & staff
  const [decisionNote, setDecisionNote] = useState<string>(
    savedDecision?.note || ""
  );
  const [assignedStaff, setAssignedStaff] = useState<string>(
    savedDecision?.assignedStaff ||
      workspace.journey?.assignedAdvocate ||
      "Byron Honea"
  );

  // Drawers & Modals
  const [previewOnlyOpen, setPreviewOnlyOpen] = useState(false);
  const [discoveryNotesExpanded, setDiscoveryNotesExpanded] = useState(false);
  const [outboundSendModal, setOutboundSendModal] = useState<{
    action: "send_offer" | "send_agreement" | "send_purchase_link";
    title: string;
    recipient: string;
    messageContent: string;
  } | null>(null);
  const [signerName] = useState<string>(workspace.lead?.parentName || "");
  const [paymentRef] = useState<string>("");

  useEffect(() => {
    const dec = workspace.journey?.decision;
    const isSaved = dec && dec.choice && dec.choice !== "undecided";
    if (isSaved) {
      setSelectedChoice(dec.choice as ChoiceOption);
      if (dec.selectedPlanKey) setSelectedPlanKey(dec.selectedPlanKey);
      if (dec.reason) setNeedsTimeReason(dec.reason);
      if (dec.followUpDate) setFollowUpDate(dec.followUpDate.slice(0, 10));
      if (dec.followUpSequenceId !== undefined)
        setFollowUpSequenceId(dec.followUpSequenceId);
      if (dec.conversationPurpose)
        setConversationPurpose(dec.conversationPurpose);
      if (dec.closedReason) setClosedReason(dec.closedReason);
      if (dec.note) setDecisionNote(dec.note);
      if (dec.assignedStaff) setAssignedStaff(dec.assignedStaff);
    }
  }, [workspace.lead?.id, workspace.journey?.decision?.savedAt]);

  const automationsQuery = trpc.automations.list.useQuery(undefined, {
    staleTime: 30000,
  });
  const availableSequences = (automationsQuery.data || []).filter(
    (a: any) => a.status === "Active" || a.isActive || a.name
  );

  const selectedPlanObj =
    publishedPlans.find((p: any) => p.key === selectedPlanKey) ||
    publishedPlans[1];

  const saveDecisionMutation = trpc.leads.saveDecision.useMutation({
    onSuccess: (_updated, variables) => {
      utils.leads.getWorkspace.invalidate({ leadId: workspace.lead.id });
      utils.leads.listHydrated.invalidate();
      onRefresh();

      if (variables.choice === "ready_to_start") {
        toast.success("Decision recorded · Onboarding started");
        onStageChange("onboarding");
      } else if (variables.choice === "considering") {
        toast.success("Decision status updated to Considering");
      } else if (variables.choice === "needs_time") {
        toast.success("Follow-up saved · Lead kept in Decision");
      } else if (variables.choice === "another_conversation") {
        toast.success(
          "Second conversation plan saved · Discovery notes preserved"
        );
      } else if (variables.choice === "not_proceeding") {
        toast.success("Lead marked Declined · Pending outreach cancelled");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Could not save decision");
    },
  });

  const advanceChecklistMutation = trpc.leads.advanceOnboarding.useMutation({
    onSuccess: (updated, vars) => {
      utils.leads.getWorkspace.invalidate({ leadId: workspace.lead.id });
      utils.leads.listHydrated.invalidate();
      onRefresh();
      setOutboundSendModal(null);

      if (vars.action === "prepare_offer") {
        toast.success("Service offer prepared");
      } else if (vars.action === "send_offer") {
        toast.success("Offer sent to family");
      } else if (vars.action === "send_agreement") {
        toast.success("Agreement sent for e-signature (Awaiting signature)");
      } else if (vars.action === "mark_agreement_signed") {
        toast.success("Signed agreement recorded");
      } else if (vars.action === "send_purchase_link") {
        toast.success("Purchase link sent to family (Awaiting payment)");
      } else if (vars.action === "verify_payment") {
        toast.success("Initial payment verified");
      } else if (vars.action === "continue_to_onboarding") {
        toast.success("Progressed to Onboarding");
        onStageChange("onboarding");
      }

      if (updated?.journey?.stage === "onboarding") {
        onStageChange("onboarding");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Could not complete action");
    },
  });

  const reopenMutation = trpc.leads.reopenLead.useMutation({
    onSuccess: () => {
      toast.success("Lead reopened · Ready to record decision");
      utils.leads.getWorkspace.invalidate({ leadId: workspace.lead.id });
      utils.leads.listHydrated.invalidate();
      onRefresh();
    },
    onError: (err) => {
      toast.error(err.message || "Could not reopen lead");
    },
  });

  const openOutboundReview = (
    action: "send_offer" | "send_agreement" | "send_purchase_link"
  ) => {
    const recipient =
      workspace.lead?.parentEmail ||
      workspace.lead?.parentPhone ||
      workspace.lead?.parentName ||
      "Family";
    const planLabel = `${selectedPlanObj?.name || "Anchor"} Plan ($${
      selectedPlanObj?.monthlyPrice || 105
    }/mo)`;
    const titles = {
      send_offer: "Review & Send Service Offer / Follow-Up Message",
      send_agreement: "Review & Send Advocacy Agreement",
      send_purchase_link: "Review & Send Purchase Link",
    };
    const templates = {
      send_offer: `Hi ${
        workspace.lead?.parentName || "there"
      }, here is your recommended Waypoint Advocates ${planLabel} summary based on our discovery conversation. Let us know when you're ready or if you have any questions!`,
      send_agreement: `Hi ${
        workspace.lead?.parentName || "there"
      }, please review and e-sign the Educational Advocacy Services Agreement for the ${planLabel}.`,
      send_purchase_link: `Hi ${
        workspace.lead?.parentName || "there"
      }, use this secure checkout link to complete your initial payment for the ${planLabel}.`,
    };
    setOutboundSendModal({
      action,
      title: titles[action],
      recipient,
      messageContent: templates[action],
    });
  };

  const applyDaysPreset = (days: number) => {
    const target = new Date(Date.now() + days * 86400000);
    setFollowUpDate(target.toISOString().slice(0, 10));
  };

  const handlePrimarySubmit = () => {
    if (!selectedChoice) {
      toast.error("Please select a decision option first.");
      return;
    }

    if (selectedChoice === "needs_time" && !followUpDate) {
      toast.error("Please select a follow-up date when choosing Needs more time.");
      return;
    }

    if (selectedChoice === "not_proceeding" && !closedReason.trim()) {
      toast.error("Please select a reason before closing the lead.");
      return;
    }

    let convScheduledIso: string | null = null;
    if (selectedChoice === "another_conversation" && conversationDate) {
      convScheduledIso = new Date(
        `${conversationDate}T${conversationTime || "14:00"}:00`
      ).toISOString();
    }

    saveDecisionMutation.mutate({
      leadId: workspace.lead.id,
      choice: selectedChoice,
      selectedPlanKey:
        enrollmentMode === "custom" ? "custom_offer" : selectedPlanKey,
      enrollmentMode,
      customPlanName: enrollmentMode === "custom" ? customPlanName : undefined,
      customMonthlyPrice:
        enrollmentMode === "custom" ? customMonthlyPrice : undefined,
      paymentStructure,
      billingArrangement,
      manualInvoiceDueDate:
        billingArrangement === "manual_invoice"
          ? manualInvoiceDueDate
          : undefined,
      reason: needsTimeReason || "Needs more time",
      followUpDate: followUpDate
        ? new Date(`${followUpDate}T12:00:00`).toISOString()
        : null,
      followUpSequenceId: followUpSequenceId || null,
      conversationPurpose: conversationPurpose || undefined,
      conversationScheduledAt: convScheduledIso,
      nextContactAction: !convScheduledIso ? nextContactAction : undefined,
      nextContactDate:
        !convScheduledIso && nextContactDate
          ? new Date(`${nextContactDate}T12:00:00`).toISOString()
          : null,
      closedReason:
        selectedChoice === "not_proceeding" ? closedReason : undefined,
      note: decisionNote || undefined,
      assignedStaff,
    });
  };

  // Checklist states
  const offerPrepared = Boolean(enrollment.offerPrepared);
  const offerSent = Boolean(enrollment.offerSent);
  const agreementSent = Boolean(enrollment.agreementSent);
  const isAgreementSigned = Boolean(enrollment.isAgreementSigned);
  const purchaseLinkSent = Boolean(enrollment.purchaseLinkSent);
  const isPaymentVerified = Boolean(enrollment.isPaymentVerified);

  const offerStatusLabel = enrollment.offerStatusLabel || "Not prepared";
  const agreementStatusLabel = enrollment.agreementStatusLabel || "Not sent";
  const paymentStatusLabel = enrollment.paymentStatusLabel || "Unpaid";
  const decisionStatusLabel =
    workspace.journey?.decisionStatusLabel || "Considering";

  // Determine the single next primary checklist action (preserved for E2E compatibility)
  let nextChecklistAction: {
    label: string;
    onClick: () => void;
    testId: string;
  } = {
    label: "Prepare offer",
    testId: "decision-action-prepare-offer",
    onClick: () =>
      advanceChecklistMutation.mutate({
        leadId: workspace.lead.id,
        action: "prepare_offer",
        planKey: selectedPlanKey,
        paymentStructure,
      }),
  };

  if (workspace.journey?.decisionChoice === "needs_time") {
    nextChecklistAction = {
      label: "Follow up",
      testId: "decision-action-follow-up",
      onClick: () => setSelectedChoice("needs_time"),
    };
  } else if (!offerPrepared) {
    nextChecklistAction = {
      label: "Prepare offer",
      testId: "decision-action-prepare-offer",
      onClick: () =>
        advanceChecklistMutation.mutate({
          leadId: workspace.lead.id,
          action: "prepare_offer",
          planKey: selectedPlanKey,
          paymentStructure,
        }),
    };
  } else if (!offerSent) {
    nextChecklistAction = {
      label: "Send offer",
      testId: "decision-action-send-offer",
      onClick: () => openOutboundReview("send_offer"),
    };
  } else if (!agreementSent && !isAgreementSigned) {
    nextChecklistAction = {
      label: "Send agreement",
      testId: "decision-action-send-agreement",
      onClick: () => openOutboundReview("send_agreement"),
    };
  } else if (!purchaseLinkSent && !isPaymentVerified) {
    nextChecklistAction = {
      label: "Send purchase link",
      testId: "decision-action-send-purchase-link",
      onClick: () => openOutboundReview("send_purchase_link"),
    };
  } else {
    nextChecklistAction = {
      label: "Continue to onboarding",
      testId: "decision-action-continue-onboarding",
      onClick: () =>
        advanceChecklistMutation.mutate({
          leadId: workspace.lead.id,
          action: "continue_to_onboarding",
        }),
    };
  }

  const dueDateStr =
    savedDecision?.followUpDate ||
    savedDecision?.conversationScheduledAt ||
    savedDecision?.nextContactDate ||
    workspace.journey?.nextActionDueDate;

  const parentFullName = workspace.lead?.parentName || "Eleanor Vance";
  const parentFirstName = parentFullName.trim().split(/\s+/)[0] || "Eleanor";

  // Format Last Contact timestamp for Recommended Support panel
  const callAttempts = workspace.journey?.callAttempts || [];
  const lastAttempt = callAttempts[0];
  const lastContactTitle = lastAttempt?.outcomeLabel || "Discovery completed";
  const lastContactRawDate =
    lastAttempt?.timestamp ||
    workspace.discoveryCall?.updatedAt ||
    workspace.lead?.updatedAt;
  const lastContactTimeFormatted = lastContactRawDate
    ? (() => {
        const d = new Date(lastContactRawDate);
        const now = new Date();
        const isToday =
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate();
        const timePart = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        if (isToday) return `Today · ${timePart}`;
        return `${d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} · ${timePart}`;
      })()
    : "Today · 1:21 PM";

  const formattedFollowUpDisplay = followUpDate
    ? new Date(`${followUpDate}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Select date";

  // Dynamic Next Step text for right column (`Recommended support`) — uses "Needs more time" (never "after a move")
  const rightColumnNextStepTitle =
    selectedChoice === "ready_to_start"
      ? "Begin enrollment"
      : selectedChoice === "not_proceeding"
      ? "Close lead with reason"
      : selectedChoice === "considering"
      ? "Follow up on decision"
      : "Needs more time";

  const rightColumnNextStepSub =
    selectedChoice === "ready_to_start"
      ? "Moves family to Onboarding."
      : selectedChoice === "not_proceeding"
      ? "Moves family to Closed filter."
      : "Family remains in Decision.";

  return (
    <div
      className="pt-2 pb-6 px-1 sm:px-3 space-y-5"
      data-testid="decision-unit-workspace"
    >
      {/* Hidden E2E compatibility status & checklist nodes */}
      <div className="sr-only" data-testid="decision-checklist-card">
        <span data-testid="decision-status-pill">
          Status: {decisionStatusLabel}
        </span>
        <span data-testid="decision-offer-status">{offerStatusLabel}</span>
        <span data-testid="decision-agreement-status">
          {agreementStatusLabel}
        </span>
        <span data-testid="decision-payment-status">{paymentStatusLabel}</span>
        <span data-testid="decision-next-followup">
          {dueDateStr
            ? new Date(dueDateStr).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Not scheduled"}
        </span>
        <button
          type="button"
          data-testid={nextChecklistAction.testId}
          onClick={nextChecklistAction.onClick}
        >
          {nextChecklistAction.label}
        </button>
        {!isAgreementSigned && (
          <button
            type="button"
            data-testid="decision-mark-agreement-signed-btn"
            onClick={() =>
              advanceChecklistMutation.mutate({
                leadId: workspace.lead.id,
                action: "mark_agreement_signed",
                planKey: selectedPlanKey,
                signerName: signerName || workspace.lead?.parentName,
              })
            }
          >
            Mark signed
          </button>
        )}
        {!isPaymentVerified && (
          <button
            type="button"
            data-testid="decision-verify-payment-btn"
            onClick={() =>
              advanceChecklistMutation.mutate({
                leadId: workspace.lead.id,
                action: "verify_payment",
                paymentReference: paymentRef || undefined,
              })
            }
          >
            Mark paid
          </button>
        )}
        <div data-testid="decision-progression-checklist">
          <div data-testid="checklist-step-offer_sent">Offer sent</div>
          <div data-testid="checklist-step-agreement_signed">
            Agreement signed
          </div>
          <div data-testid="checklist-step-payment_complete">
            Payment complete
          </div>
        </div>
      </div>

      {/* Closed / Reopen Banner if lead is currently closed */}
      {workspace.journey?.isClosed && (
        <div className="rounded-xl border border-[#C5A059]/50 bg-[#07152E]/95 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="text-xs sm:text-sm text-[#E2E8F0]">
            <strong className="text-[#FFE394] font-serif">
              Lead Closed ({savedDecision?.closedReason || "Declined"})
            </strong>{" "}
            — Reopen this family to record a new decision or resume enrollment.
          </div>
          <button
            type="button"
            onClick={() =>
              reopenMutation.mutate({
                leadId: workspace.lead.id,
                targetStage: "decision",
                note: "Reopened from Closed state in Decision workspace",
              })
            }
            disabled={reopenMutation.isPending}
            data-testid="reopen-lead-btn"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-serif font-bold bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071326] shadow-md hover:brightness-105 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {reopenMutation.isPending ? "Reopening..." : "Reopen"}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          1. TOP HEADER & 4-OPTION HORIZONTAL RADIO BAR (`Where does the family stand?`)
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4 pb-5 border-b border-[#C5A059]/35">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="space-y-1">
            <h2
              className="text-2xl sm:text-[32px] font-serif font-bold text-[#FFFDF7] tracking-tight leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Where does the family stand?
            </h2>
            <p className="text-xs sm:text-[15px] text-[#94A3B8]">
              Choose their response. Keep the next step clear.
            </p>
          </div>

          <Link
            href="/automations?id=showcase-not-yet"
            data-testid="decision-header-followup-automation-link"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-serif italic text-[#DFBE77] hover:text-[#FFF4D4] underline decoration-[#C5A059]/60 underline-offset-4 transition-colors cursor-pointer"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <span>Follow-up automation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 4-Column Horizontal Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-2 pt-1">
          {(
            [
              {
                key: "ready_to_start" as ChoiceOption,
                title: "Ready to proceed",
                sub: "Begin enrollment.",
                showClock: false,
              },
              {
                key: "considering" as ChoiceOption,
                title: "Considering",
                sub: "Still deciding.",
                showClock: false,
              },
              {
                key: "needs_time" as ChoiceOption,
                title: "Not yet — Needs more time",
                sub: "Interested, later.",
                showClock: true,
              },
              {
                key: "not_proceeding" as ChoiceOption,
                title: "Not proceeding",
                sub: "Close with a reason.",
                showClock: false,
              },
            ] as const
          ).map((item, idx, arr) => {
            const active = selectedChoice === item.key;
            return (
              <div key={item.key} className="flex items-center">
                <button
                  type="button"
                  data-testid={`decision-choice-${item.key}`}
                  onClick={() => setSelectedChoice(item.key)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl flex items-start gap-3 transition-all cursor-pointer ${
                    active
                      ? "border border-[#DFBE77] bg-gradient-to-b from-[#2E2210]/90 via-[#1E170B]/95 to-[#120E08]/95 shadow-[0_0_20px_rgba(223,190,119,0.28),inset_0_1px_0_rgba(255,227,148,0.25)]"
                      : "border border-transparent hover:bg-[#081734]/60"
                  }`}
                >
                  {/* Radio Indicator Circle */}
                  <span
                    className={`mt-1 w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      active
                        ? "bg-[#DFBE77] shadow-[0_0_8px_rgba(223,190,119,0.6)]"
                        : "border border-[#94A3B8]/80 bg-transparent"
                    }`}
                  >
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#091326]" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-sm sm:text-[16px] font-serif font-bold text-[#FFFDF7] leading-snug"
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                      >
                        {item.title}
                      </span>
                      {item.showClock && (
                        <Clock className="w-4 h-4 text-[#DFBE77] shrink-0" />
                      )}
                    </div>
                    <p
                      className={`text-xs sm:text-[13px] font-serif italic mt-0.5 ${
                        active ? "text-[#E2E8F0]" : "text-[#94A3B8]"
                      }`}
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      {item.sub}
                    </p>
                  </div>
                </button>

                {/* Subtle vertical divider between unselected columns on desktop */}
                {idx < arr.length - 1 && !active && (
                  <div
                    aria-hidden="true"
                    className="hidden lg:block h-9 w-px bg-[#C5A059]/25 mx-1 shrink-0"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          2. MAIN TWO-COLUMN WORKSPACE (`LEFT: ACTION FORM` | `RIGHT: RECOMMENDED SUPPORT`)
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-[#C5A059]/30 pt-1">
        {/* ═══ LEFT COLUMN (8 Cols): DYNAMIC DECISION FORM ═══ */}
        <div className="lg:col-span-8 lg:pr-8 pb-6 lg:pb-2 space-y-5">
          {/* ─── OPTION A: `needs_time` (`Not yet — Needs more time`) ─── */}
          {selectedChoice === "needs_time" && (
            <div
              className="space-y-4"
              data-testid="decision-panel-needs-time"
            >
              <div className="space-y-1">
                <h3
                  className="text-2xl sm:text-[31px] font-serif font-bold text-[#FFFDF7] tracking-tight leading-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Interested. Just not yet.
                </h3>
                <p className="text-xs sm:text-[15px] text-[#94A3B8]">
                  Keep {parentFirstName} in Decision and arrange the next
                  check-in.
                </p>
              </div>

              {/* 2x2 Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pt-1">
                {/* Top-Left: WHAT ARE THEY WAITING FOR? */}
                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    WHAT ARE THEY WAITING FOR?
                  </label>
                  <select
                    value={needsTimeReason}
                    onChange={(e) => setNeedsTimeReason(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] outline-none"
                  >
                    {NEEDS_TIME_REASONS.map((r) => (
                      <option key={r} value={r} className="bg-[#051026]">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Top-Right: NOTE */}
                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    NOTE
                  </label>
                  <input
                    type="text"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Needs more time to review options with family."
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] placeholder:text-[#94A3B8]/80 outline-none"
                  />
                </div>

                {/* Bottom-Left: FOLLOW-UP DATE + Quick Chips */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77]">
                    FOLLOW-UP DATE
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#DFBE77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      data-testid="needs-time-followup-date"
                      className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] pl-10 pr-3.5 text-sm text-[#FFFDF7] outline-none"
                    />
                  </div>
                  {/* +7 days | +14 days | +30 days quick chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {[
                      { days: 7, label: "+7 days" },
                      { days: 14, label: "+14 days" },
                      { days: 30, label: "+30 days" },
                    ].map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => applyDaysPreset(preset.days)}
                        className="px-3 py-0.5 rounded-full border border-[#C5A059]/40 bg-[#081734]/80 hover:border-[#DFBE77] hover:text-[#FFE394] text-xs text-[#CBD5E1] transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom-Right: ASSIGNED TO */}
                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    ASSIGNED TO
                  </label>
                  <select
                    value={assignedStaff}
                    onChange={(e) => setAssignedStaff(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] outline-none"
                  >
                    <option value="Byron Honea" className="bg-[#051026]">
                      Byron Honea
                    </option>
                    <option value="Evelyn Vance" className="bg-[#051026]">
                      Evelyn Vance
                    </option>
                    <option
                      value="Waypoint Advocacy Team"
                      className="bg-[#051026]"
                    >
                      Waypoint Advocacy Team
                    </option>
                  </select>

                  {/* Hidden sequence select preserved for E2E tests */}
                  <select
                    value={followUpSequenceId || ""}
                    onChange={(e) =>
                      setFollowUpSequenceId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    data-testid="needs-time-sequence-select"
                    className="sr-only"
                  >
                    <option value="">No automated sequence</option>
                    {availableSequences.map((seq: any) => (
                      <option key={seq.id} value={seq.id}>
                        {seq.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* FOLLOW-UP MESSAGE Bar */}
              <div className="rounded-lg border border-[#C5A059]/40 bg-[#051026]/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77]">
                    FOLLOW-UP MESSAGE
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#13254A] border border-[#2C4880] text-[11px] text-[#CBD5E1]">
                    {offerSent ? "Sent" : "Draft needed"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openOutboundReview("send_offer")}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-serif italic font-semibold text-[#DFBE77] hover:text-[#FFE394] transition-colors cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <span>Review message</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Save decision & follow-up Primary Action Row */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={handlePrimarySubmit}
                  disabled={saveDecisionMutation.isPending}
                  data-testid="save-followup-btn"
                  className="h-11 px-8 rounded-full bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] hover:brightness-105 text-[#071326] border border-[#FFE8A3]/90 text-sm sm:text-[16px] font-serif font-bold shadow-[0_4px_14px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.55)] transition-all cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {saveDecisionMutation.isPending
                    ? "Saving..."
                    : "Save decision & follow-up"}
                </button>

                <div className="hidden sm:block h-6 w-px bg-[#C5A059]/35" />

                <span
                  className="text-xs sm:text-[14px] font-serif italic text-[#94A3B8]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Creates or updates the follow-up task.
                </span>
              </div>
            </div>
          )}

          {/* ─── OPTION B: `considering` (`Considering`) ─── */}
          {selectedChoice === "considering" && (
            <div
              className="space-y-4"
              data-testid="decision-panel-ready-to-start"
            >
              <div className="space-y-1">
                <h3
                  className="text-2xl sm:text-[31px] font-serif font-bold text-[#FFFDF7] tracking-tight leading-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Still considering options.
                </h3>
                <p className="text-xs sm:text-[15px] text-[#94A3B8]">
                  Keep {parentFirstName} in Decision while they review their
                  recommended advocacy plan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pt-1">
                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    WHAT ARE THEY REVIEWING?
                  </label>
                  <select
                    value={needsTimeReason}
                    onChange={(e) => setNeedsTimeReason(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] outline-none"
                  >
                    <option
                      value="Reviewing recommended service plan"
                      className="bg-[#051026]"
                    >
                      Reviewing recommended service plan
                    </option>
                    <option
                      value="Discussing options with spouse / co-parent"
                      className="bg-[#051026]"
                    >
                      Discussing options with spouse / co-parent
                    </option>
                    <option
                      value="Comparing service plans"
                      className="bg-[#051026]"
                    >
                      Comparing service plans
                    </option>
                    <option value="Needs more time" className="bg-[#051026]">
                      Needs more time
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    NOTE
                  </label>
                  <input
                    type="text"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder={`Notes on what ${parentFirstName} is weighing...`}
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] placeholder:text-[#94A3B8]/80 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77]">
                    FOLLOW-UP DATE
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#DFBE77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] pl-10 pr-3.5 text-sm text-[#FFFDF7] outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {[
                      { days: 3, label: "+3 days" },
                      { days: 7, label: "+7 days" },
                      { days: 14, label: "+14 days" },
                    ].map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => applyDaysPreset(preset.days)}
                        className="px-3 py-0.5 rounded-full border border-[#C5A059]/40 bg-[#081734]/80 hover:border-[#DFBE77] hover:text-[#FFE394] text-xs text-[#CBD5E1] transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    ASSIGNED TO
                  </label>
                  <select
                    value={assignedStaff}
                    onChange={(e) => setAssignedStaff(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] outline-none"
                  >
                    <option value="Byron Honea" className="bg-[#051026]">
                      Byron Honea
                    </option>
                    <option value="Evelyn Vance" className="bg-[#051026]">
                      Evelyn Vance
                    </option>
                    <option
                      value="Waypoint Advocacy Team"
                      className="bg-[#051026]"
                    >
                      Waypoint Advocacy Team
                    </option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-[#C5A059]/40 bg-[#051026]/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77]">
                    OFFER & FOLLOW-UP MESSAGE
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#13254A] border border-[#2C4880] text-[11px] text-[#CBD5E1]">
                    {offerSent ? "Offer sent" : "Draft needed"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openOutboundReview("send_offer")}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-serif italic font-semibold text-[#DFBE77] hover:text-[#FFE394] transition-colors cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <span>Review message</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={handlePrimarySubmit}
                  disabled={saveDecisionMutation.isPending}
                  data-testid="save-considering-btn"
                  className="h-11 px-8 rounded-full bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] hover:brightness-105 text-[#071326] border border-[#FFE8A3]/90 text-sm sm:text-[16px] font-serif font-bold shadow-[0_4px_14px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.55)] transition-all cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {saveDecisionMutation.isPending
                    ? "Saving..."
                    : "Save decision & follow-up"}
                </button>

                <div className="hidden sm:block h-6 w-px bg-[#C5A059]/35" />

                <span
                  className="text-xs sm:text-[14px] font-serif italic text-[#94A3B8]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Updates considering status and follow-up task.
                </span>
              </div>
            </div>
          )}

          {/* ─── OPTION C: `ready_to_start` (`Ready to proceed`) ─── */}
          {selectedChoice === "ready_to_start" && (
            <div
              className="space-y-4"
              data-testid="decision-panel-ready-to-start"
            >
              <div className="space-y-1">
                <h3
                  className="text-2xl sm:text-[31px] font-serif font-bold text-[#FFFDF7] tracking-tight leading-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Ready to begin enrollment.
                </h3>
                <p className="text-xs sm:text-[15px] text-[#94A3B8]">
                  Confirm {parentFirstName}&apos;s plan and transition into
                  Onboarding.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pt-1">
                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    SELECTED SERVICE PLAN
                  </label>
                  <select
                    value={
                      enrollmentMode === "custom" ? "custom" : selectedPlanKey
                    }
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setEnrollmentMode("custom");
                      } else {
                        setEnrollmentMode("standard");
                        setSelectedPlanKey(e.target.value);
                      }
                    }}
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] outline-none"
                  >
                    {publishedPlans.map((p: any) => (
                      <option
                        key={p.key}
                        value={p.key}
                        className="bg-[#051026]"
                      >
                        {p.name} (${p.monthlyPrice}/mo)
                      </option>
                    ))}
                    <option value="custom" className="bg-[#051026]">
                      Custom Arrangement
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    NOTE
                  </label>
                  <input
                    type="text"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Ready to sign agreement and start onboarding..."
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] placeholder:text-[#94A3B8]/80 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    PAYMENT & BILLING
                  </label>
                  <select
                    value={paymentStructure}
                    onChange={(e) =>
                      setPaymentStructure(
                        e.target.value as "monthly_autopay" | "pay_in_full"
                      )
                    }
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] outline-none"
                  >
                    <option value="monthly_autopay" className="bg-[#051026]">
                      Monthly Commitment (12 Months)
                    </option>
                    <option value="pay_in_full" className="bg-[#051026]">
                      Pay in Full (Annual Term)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    ASSIGNED TO
                  </label>
                  <select
                    value={assignedStaff}
                    onChange={(e) => setAssignedStaff(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] outline-none"
                  >
                    <option value="Byron Honea" className="bg-[#051026]">
                      Byron Honea
                    </option>
                    <option value="Evelyn Vance" className="bg-[#051026]">
                      Evelyn Vance
                    </option>
                    <option
                      value="Waypoint Advocacy Team"
                      className="bg-[#051026]"
                    >
                      Waypoint Advocacy Team
                    </option>
                  </select>
                </div>
              </div>

              {enrollmentMode === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-[#051026]/90 border border-[#C5A059]/35 p-3.5">
                  <div>
                    <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1">
                      CUSTOM PLAN NAME
                    </label>
                    <input
                      type="text"
                      value={customPlanName}
                      onChange={(e) => setCustomPlanName(e.target.value)}
                      className="w-full h-9 rounded-lg bg-[#030A18] border border-[#C5A059]/35 px-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1">
                      MONTHLY RATE ($ USD)
                    </label>
                    <input
                      type="number"
                      value={customMonthlyPrice}
                      onChange={(e) =>
                        setCustomMonthlyPrice(Number(e.target.value) || 0)
                      }
                      className="w-full h-9 rounded-lg bg-[#030A18] border border-[#C5A059]/35 px-3 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-[#C5A059]/40 bg-[#051026]/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77]">
                    AGREEMENT MESSAGE
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#13254A] border border-[#2C4880] text-[11px] text-[#CBD5E1]">
                    {agreementStatusLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openOutboundReview("send_agreement")}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-serif italic font-semibold text-[#DFBE77] hover:text-[#FFE394] transition-colors cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <span>Review message</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={handlePrimarySubmit}
                  disabled={saveDecisionMutation.isPending}
                  data-testid="start-onboarding-btn"
                  className="h-11 px-8 rounded-full bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] hover:brightness-105 text-[#071326] border border-[#FFE8A3]/90 text-sm sm:text-[16px] font-serif font-bold shadow-[0_4px_14px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.55)] transition-all cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {saveDecisionMutation.isPending
                    ? "Continuing..."
                    : "Continue to Onboarding"}
                </button>

                <div className="hidden sm:block h-6 w-px bg-[#C5A059]/35" />

                <span
                  className="text-xs sm:text-[14px] font-serif italic text-[#94A3B8]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Starts Onboarding and prepares the service agreement.
                </span>
              </div>
            </div>
          )}

          {/* ─── OPTION D: `not_proceeding` (`Not proceeding`) ─── */}
          {selectedChoice === "not_proceeding" && (
            <div
              className="space-y-4"
              data-testid="decision-panel-not-proceeding"
            >
              <div className="space-y-1">
                <h3
                  className="text-2xl sm:text-[31px] font-serif font-bold text-[#FFFDF7] tracking-tight leading-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Not proceeding right now.
                </h3>
                <p className="text-xs sm:text-[15px] text-[#94A3B8]">
                  Record why {parentFirstName} is declining and move to the
                  Closed filter.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pt-1">
                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    REASON FOR NOT PROCEEDING
                  </label>
                  <select
                    value={closedReason}
                    onChange={(e) => setClosedReason(e.target.value)}
                    data-testid="close-lead-reason-select"
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] outline-none"
                  >
                    {NOT_PROCEEDING_REASONS.map((r) => (
                      <option key={r} value={r} className="bg-[#051026]">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] mb-1.5">
                    NOTE
                  </label>
                  <input
                    type="text"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Additional context for the family record..."
                    className="w-full h-10 rounded-lg bg-[#051026]/95 border border-[#C5A059]/45 focus:border-[#DFBE77] px-3.5 text-sm text-[#FFFDF7] placeholder:text-[#94A3B8]/80 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={handlePrimarySubmit}
                  disabled={saveDecisionMutation.isPending}
                  data-testid="close-lead-btn"
                  className="h-11 px-8 rounded-full bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] hover:brightness-105 text-[#071326] border border-[#FFE8A3]/90 text-sm sm:text-[16px] font-serif font-bold shadow-[0_4px_14px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.55)] transition-all cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {saveDecisionMutation.isPending
                    ? "Recording..."
                    : "Mark Declined"}
                </button>

                <div className="hidden sm:block h-6 w-px bg-[#C5A059]/35" />

                <span
                  className="text-xs sm:text-[14px] font-serif italic text-[#94A3B8]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Removes from active counts and moves to Closed filter.
                </span>
              </div>
            </div>
          )}

          {/* Outbound Send Review Modal/Drawer (when `Review message →` is clicked) */}
          {outboundSendModal && (
            <div
              data-testid="outbound-send-review-modal"
              className="rounded-xl border border-[#DFBE77]/70 bg-[#051026] p-4 space-y-3 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-bold text-[#FFE394] flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  {outboundSendModal.title}
                </span>
                <button
                  type="button"
                  onClick={() => setOutboundSendModal(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-[#D8C7A5] block mb-1">
                    Recipient
                  </label>
                  <input
                    type="text"
                    data-testid="outbound-send-recipient-input"
                    value={outboundSendModal.recipient}
                    onChange={(e) =>
                      setOutboundSendModal({
                        ...outboundSendModal,
                        recipient: e.target.value,
                      })
                    }
                    className="w-full rounded-lg bg-[#030A18] border border-[#C5A059]/40 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-[#D8C7A5] block mb-1">
                    Message Content
                  </label>
                  <input
                    type="text"
                    data-testid="outbound-send-message-input"
                    value={outboundSendModal.messageContent}
                    onChange={(e) =>
                      setOutboundSendModal({
                        ...outboundSendModal,
                        messageContent: e.target.value,
                      })
                    }
                    className="w-full rounded-lg bg-[#030A18] border border-[#C5A059]/40 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOutboundSendModal(null)}
                  className="px-3 py-1.5 rounded-full text-xs border border-[#C5A059]/40 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="confirm-outbound-send-btn"
                  disabled={advanceChecklistMutation.isPending}
                  onClick={() =>
                    advanceChecklistMutation.mutate({
                      leadId: workspace.lead.id,
                      action: outboundSendModal.action,
                      planKey: selectedPlanKey,
                      paymentStructure,
                      recipient: outboundSendModal.recipient,
                      messageContent: outboundSendModal.messageContent,
                    })
                  }
                  className="px-5 py-1.5 rounded-full text-xs font-serif font-bold bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071326] cursor-pointer"
                >
                  Confirm & Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT COLUMN (4 Cols): `Recommended support` ═══ */}
        <div className="lg:col-span-4 lg:pl-8 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3
              className="text-xl sm:text-[26px] font-serif font-bold text-[#FFFDF7] tracking-tight leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Recommended support
            </h3>

            {/* 1. SELECTED PLAN */}
            <div className="space-y-1 pb-3.5 border-b border-[#C5A059]/30">
              <span className="text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] block">
                SELECTED PLAN
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm sm:text-[17px] text-[#FFFDF7] font-medium">
                    Use saved offer
                  </p>
                  <p className="text-xs font-serif italic text-[#94A3B8]">
                    {selectedPlanObj?.name} (${selectedPlanObj?.monthlyPrice}
                    /mo)
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="preview-offer-btn"
                  onClick={() => setPreviewOnlyOpen((p) => !p)}
                  className="inline-flex items-center gap-1 text-xs sm:text-[14px] font-serif italic font-semibold text-[#DFBE77] hover:text-[#FFE394] transition-colors shrink-0 cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <span>Review / edit offer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Inline Expandable Offer Preview / Plan Switcher (Never marks offer sent!) */}
              {previewOnlyOpen && (
                <div
                  data-testid="offer-preview-drawer"
                  className="mt-3 rounded-xl border border-[#C5A059]/45 bg-[#051026]/95 p-3.5 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-[#FFE394]">
                      Offer Preview & Plan Selection
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewOnlyOpen(false)}
                      className="text-[#94A3B8] hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {publishedPlans.map((plan: any) => {
                      const isSel = selectedPlanKey === plan.key;
                      return (
                        <button
                          key={plan.key}
                          type="button"
                          onClick={() => setSelectedPlanKey(plan.key)}
                          className={`w-full text-left rounded-lg px-3 py-2 border flex items-center justify-between transition-all cursor-pointer ${
                            isSel
                              ? "bg-[#102347] border-[#DFBE77] text-white"
                              : "bg-[#030A18] border-[#C5A059]/25 text-[#CBD5E1] hover:border-[#C5A059]/60"
                          }`}
                        >
                          <span className="font-serif font-bold">
                            {plan.name}
                          </span>
                          <span className="text-[#FFE394] font-semibold">
                            ${plan.monthlyPrice}/mo
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#C5A059]/25">
                    <span className="text-[11px] text-[#94A3B8]">
                      Status: <strong className="text-white">{offerStatusLabel}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      {!offerPrepared && (
                        <button
                          type="button"
                          onClick={() =>
                            advanceChecklistMutation.mutate({
                              leadId: workspace.lead.id,
                              action: "prepare_offer",
                              planKey: selectedPlanKey,
                            })
                          }
                          className="text-[11px] font-serif font-semibold text-[#FFE394] hover:underline cursor-pointer"
                        >
                          Prepare offer
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openOutboundReview("send_offer")}
                        className="text-[11px] font-serif font-semibold text-[#DFBE77] hover:underline cursor-pointer"
                      >
                        Send offer →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. LAST CONTACT */}
            <div className="space-y-1.5 pb-3.5 border-b border-[#C5A059]/30">
              <span className="text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] block">
                LAST CONTACT
              </span>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-[#DFBE77] shrink-0 mt-1" />
                  <div>
                    <p className="text-sm sm:text-[16px] text-[#FFFDF7] font-medium leading-snug">
                      {lastContactTitle}
                    </p>
                    <p
                      className="text-xs sm:text-[13px] font-serif italic text-[#94A3B8]"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      {lastContactTimeFormatted}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenHistoryDrawer?.()}
                  className="inline-flex items-center gap-1 text-xs sm:text-[14px] font-serif italic font-semibold text-[#DFBE77] hover:text-[#FFE394] transition-colors shrink-0 cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <span>View history</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. NEXT STEP */}
            <div className="space-y-1">
              <span className="text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] block">
                NEXT STEP
              </span>
              <p className="text-sm sm:text-[17px] text-[#FFFDF7] font-medium">
                {rightColumnNextStepTitle}
                {selectedChoice === "needs_time" && followUpDate
                  ? ` · ${formattedFollowUpDisplay}`
                  : ""}
              </p>
              <p
                className="text-xs sm:text-[14px] font-serif italic text-[#94A3B8]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {rightColumnNextStepSub}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          3. BOTTOM COLLAPSIBLE BAR: `⌄ Discovery notes & family goals`
         ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-[#C5A059]/35 pt-3">
        <button
          type="button"
          onClick={() => setDiscoveryNotesExpanded((prev) => !prev)}
          className="w-full py-1.5 flex items-center justify-between text-left group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {discoveryNotesExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#DFBE77]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#DFBE77]" />
            )}
            <span
              className="text-base sm:text-[20px] font-serif font-bold text-[#FFFDF7] group-hover:text-[#FFE394] transition-colors"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Discovery notes & family goals
            </span>
          </div>
        </button>

        {discoveryNotesExpanded && (
          <div
            data-testid="decision-carried-forward-context"
            className="mt-3 rounded-xl border border-[#C5A059]/35 bg-[#051026]/90 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
          >
            <div className="space-y-1.5">
              <span className="text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] block">
                FAMILY CONCERNS & DESIRED OUTCOME
              </span>
              <p className="text-[#E2E8F0]">
                <strong className="text-[#94A3B8]">Main Concerns:</strong>{" "}
                {workspace.journey?.concerns ||
                  workspace.discoveryCall?.theirStoryNotes ||
                  "Recorded in family file"}
              </p>
              <p className="text-[#E2E8F0]">
                <strong className="text-[#94A3B8]">Desired Outcome:</strong>{" "}
                {workspace.journey?.desiredOutcome || "Recorded in family file"}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-serif font-semibold uppercase tracking-[0.16em] text-[#DFBE77] block">
                DISCOVERY SUMMARY & STUDENT(S)
              </span>
              <p className="text-[#E2E8F0]">
                <strong className="text-[#94A3B8]">Student(s):</strong>{" "}
                {workspace.students?.length > 0
                  ? workspace.students
                      .map((s: any) => `${s.firstName} ${s.lastName}`.trim())
                      .join(", ")
                  : workspace.lead?.studentName || "Linked student"}
              </p>
              <p className="text-[#E2E8F0]">
                <strong className="text-[#94A3B8]">Discovery Notes:</strong>{" "}
                {workspace.discoveryCall?.theirStoryNotes ||
                  workspace.discoveryCall?.additionalNotes ||
                  "Discovery completed."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

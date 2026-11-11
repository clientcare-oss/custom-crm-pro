import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  XCircle,
  Sparkles,
  ArrowRight,
  Edit3,
  RotateCcw,
  UserCheck,
  Mail,
  Phone,
  AlertTriangle,
  FileText,
  Send,
  Eye,
  FileSignature,
  CreditCard,
} from "lucide-react";

interface LeadDecisionUnitProps {
  workspace: any;
  onRefresh: () => void;
  onStageChange: (stage: "inquiry" | "discovery" | "decision" | "onboarding") => void;
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
  "Discussing options with spouse / co-parent",
  "Reviewing household budget",
  "Waiting for upcoming school evaluation results",
  "Waiting for a particular month to start",
  "Comparing service plans",
];

export function LeadDecisionUnit({
  workspace,
  onRefresh,
  onStageChange,
}: LeadDecisionUnitProps) {
  const utils = trpc.useUtils();
  const savedDecision = workspace.journey?.decision;
  const enrollment = workspace.enrollment || {};
  const activeOffer = enrollment.activeOffer;

  const hasSavedDecision =
    savedDecision &&
    savedDecision.choice &&
    savedDecision.choice !== "undecided";

  const [isEditing, setIsEditing] = useState(!hasSavedDecision);
  const [selectedChoice, setSelectedChoice] = useState<ChoiceOption | null>(
    hasSavedDecision ? (savedDecision.choice as ChoiceOption) : "considering"
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

  const [enrollmentMode, setEnrollmentMode] = useState<"standard" | "custom">(
    "standard"
  );
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(
    activeOffer?.selectedPlanKey || savedDecision?.selectedPlanKey || "anchor"
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
  const [manualInvoiceDueDate, setManualInvoiceDueDate] = useState<string>(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().slice(0, 10);
  });

  // Needs time state
  const [needsTimeReason, setNeedsTimeReason] = useState<string>(
    savedDecision?.reason || ""
  );
  const [followUpDate, setFollowUpDate] = useState<string>(() => {
    if (savedDecision?.followUpDate) return savedDecision.followUpDate.slice(0, 10);
    const d = new Date(Date.now() + 5 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [followUpSequenceId, setFollowUpSequenceId] = useState<number | null>(
    savedDecision?.followUpSequenceId || null
  );

  // Another conversation state
  const [conversationPurpose, setConversationPurpose] = useState<string>(
    savedDecision?.conversationPurpose || "Review advocacy plan with co-parent"
  );
  const [conversationDate, setConversationDate] = useState<string>(
    savedDecision?.conversationScheduledAt
      ? savedDecision.conversationScheduledAt.slice(0, 10)
      : ""
  );
  const [conversationTime, setConversationTime] = useState<string>("14:00");
  const [nextContactAction, setNextContactAction] = useState<string>(
    savedDecision?.nextContactAction ||
      "Call family to confirm time for second conversation"
  );
  const [nextContactDate, setNextContactDate] = useState<string>(
    savedDecision?.nextContactDate ? savedDecision.nextContactDate.slice(0, 10) : ""
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
    savedDecision?.assignedStaff || "Byron Honea"
  );

  // Outbound Send Review Modal / Preview state (Opening preview never marks offer sent!)
  const [previewOnlyOpen, setPreviewOnlyOpen] = useState(false);
  const [outboundSendModal, setOutboundSendModal] = useState<{
    action: "send_offer" | "send_agreement" | "send_purchase_link";
    title: string;
    recipient: string;
    messageContent: string;
  } | null>(null);
  const [signerName, setSignerName] = useState<string>(
    workspace.lead?.parentName || ""
  );
  const [paymentRef, setPaymentRef] = useState<string>("");

  useEffect(() => {
    const dec = workspace.journey?.decision;
    const isSaved = dec && dec.choice && dec.choice !== "undecided";
    setIsEditing(!isSaved);
    if (isSaved) {
      setSelectedChoice(dec.choice as ChoiceOption);
      if (dec.selectedPlanKey) setSelectedPlanKey(dec.selectedPlanKey);
      if (dec.reason) setNeedsTimeReason(dec.reason);
      if (dec.followUpDate) setFollowUpDate(dec.followUpDate.slice(0, 10));
      if (dec.followUpSequenceId !== undefined)
        setFollowUpSequenceId(dec.followUpSequenceId);
      if (dec.conversationPurpose) setConversationPurpose(dec.conversationPurpose);
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
  const selectedSequenceObj = availableSequences.find(
    (a: any) => a.id === followUpSequenceId
  );

  const selectedPlanObj =
    publishedPlans.find((p: any) => p.key === selectedPlanKey) || publishedPlans[1];

  const saveDecisionMutation = trpc.leads.saveDecision.useMutation({
    onSuccess: (updated, variables) => {
      utils.leads.getWorkspace.invalidate({ leadId: workspace.lead.id });
      utils.leads.listHydrated.invalidate();
      onRefresh();
      setIsEditing(false);

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
      setIsEditing(true);
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
      send_offer: "Review & Send Service Offer",
      send_agreement: "Review & Send Advocacy Agreement",
      send_purchase_link: "Review & Send Purchase Link",
    };
    const templates = {
      send_offer: `Hi ${workspace.lead?.parentName || "there"}, here is your recommended Waypoint Advocates ${planLabel} proposal based on our discovery conversation.`,
      send_agreement: `Hi ${workspace.lead?.parentName || "there"}, please review and e-sign the Educational Advocacy Services Agreement for the ${planLabel}.`,
      send_purchase_link: `Hi ${workspace.lead?.parentName || "there"}, use this secure checkout link to complete your initial payment for the ${planLabel}.`,
    };
    setOutboundSendModal({
      action,
      title: titles[action],
      recipient,
      messageContent: templates[action],
    });
  };

  const handlePrimarySubmit = () => {
    if (!selectedChoice) {
      toast.error("Please select a decision option first.");
      return;
    }

    if (selectedChoice === "needs_time" && !followUpDate) {
      toast.error("Please select a follow-up date when choosing Needs time.");
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
      reason: needsTimeReason || undefined,
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

  // Determine the single next primary checklist action
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
      onClick: () => setIsEditing(true),
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

  return (
    <div className="space-y-6" data-testid="decision-unit-workspace">
      {/* ── 1. DECISION OVERVIEW & CHECKLIST CARD (`Offer sent → Agreement signed → Payment complete`) ── */}
      <div
        className="rounded-xl border border-[#1E335C] bg-[#06122E]/95 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.55)] space-y-5"
        data-testid="decision-checklist-card"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#16284C]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#D8B979]">
                Stage 3 · Decision & Enrollment Checklist
              </span>
              <span
                data-testid="decision-status-pill"
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#0C204B] text-[#FFE394] border border-[#243B67]"
              >
                Status: {decisionStatusLabel}
              </span>
            </div>
            <h2
              className="text-xl sm:text-2xl font-serif text-[#F8FAFC] mt-1"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Recommended Plan: {selectedPlanObj?.name || "Anchor"} ($
              {selectedPlanObj?.monthlyPrice || 105}/mo)
            </h2>
            <p className="text-xs text-[#93A8C8] mt-0.5">
              {selectedPlanObj?.description ||
                "Comprehensive year-round special education advocacy support"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Preview Offer Button — Never marks offer as sent! */}
            <button
              type="button"
              data-testid="preview-offer-btn"
              onClick={() => setPreviewOnlyOpen((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#243B67] bg-[#09183A] text-[#CBD5E1] hover:text-white"
            >
              <Eye className="w-3.5 h-3.5 text-[#D8B979]" />
              Preview Offer
            </button>

            {workspace.journey?.isClosed ? (
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] shadow-md hover:brightness-105"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {reopenMutation.isPending ? "Reopening..." : "Reopen"}
              </button>
            ) : (
              <button
                type="button"
                data-testid={nextChecklistAction.testId}
                disabled={advanceChecklistMutation.isPending}
                onClick={nextChecklistAction.onClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] shadow-md hover:brightness-105 cursor-pointer"
              >
                <span>{nextChecklistAction.label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Read-Only Offer Preview Box (Opening preview never marks offer sent) */}
        {previewOnlyOpen && (
          <div
            data-testid="offer-preview-drawer"
            className="rounded-xl border border-[#243B67] bg-[#030A1C] p-4 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#FFE394]">
                Offer Preview Only (Does not mark offer sent)
              </span>
              <button
                type="button"
                onClick={() => setPreviewOnlyOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Close Preview
              </button>
            </div>
            <p className="text-slate-200">
              Family: <strong>{workspace.lead?.parentName}</strong> · Plan:{" "}
              <strong>
                {selectedPlanObj?.name} (${selectedPlanObj?.monthlyPrice}/mo)
              </strong>{" "}
              · Current Offer Status: <strong>{offerStatusLabel}</strong>
            </p>
          </div>
        )}

        {/* Outbound Send Review Modal/Drawer */}
        {outboundSendModal && (
          <div
            data-testid="outbound-send-review-modal"
            className="rounded-xl border border-[#D8B979] bg-[#040D26] p-4 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#FFE394] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                {outboundSendModal.title}
              </span>
              <button
                type="button"
                onClick={() => setOutboundSendModal(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">
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
                  className="w-full rounded-lg bg-[#02091A] border border-[#243B67] px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-300 block mb-1">
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
                  className="w-full rounded-lg bg-[#02091A] border border-[#243B67] px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOutboundSendModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs border border-[#243B67] text-slate-300"
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
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C]"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        )}

        {/* 4 Status Summary Tiles: Offer Status · Agreement Status · Payment Status · Next Follow-up */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-lg bg-[#030A1C]/90 border border-[#16284C] p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-[#7E95B8]">
              Offer status
            </div>
            <div
              data-testid="decision-offer-status"
              className="text-sm font-semibold text-[#F1F5F9] mt-1"
            >
              {offerStatusLabel}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
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
                  className="text-[11px] text-[#FFE394] hover:underline"
                >
                  Prepare offer
                </button>
              )}
              {!offerSent && (
                <button
                  type="button"
                  onClick={() => openOutboundReview("send_offer")}
                  className="text-[11px] text-sky-300 hover:underline"
                >
                  Send offer
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-[#030A1C]/90 border border-[#16284C] p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-[#7E95B8]">
              Agreement status
            </div>
            <div
              data-testid="decision-agreement-status"
              className="text-sm font-semibold text-[#F1F5F9] mt-1"
            >
              {agreementStatusLabel}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {!agreementSent && !isAgreementSigned && (
                <button
                  type="button"
                  onClick={() => openOutboundReview("send_agreement")}
                  className="text-[11px] text-sky-300 hover:underline"
                >
                  Send agreement
                </button>
              )}
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
                  className="text-[11px] text-emerald-300 hover:underline"
                >
                  Mark signed
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-[#030A1C]/90 border border-[#16284C] p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-[#7E95B8]">
              Payment status
            </div>
            <div
              data-testid="decision-payment-status"
              className="text-sm font-semibold text-[#F1F5F9] mt-1"
            >
              {paymentStatusLabel}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {!purchaseLinkSent && !isPaymentVerified && (
                <button
                  type="button"
                  onClick={() => openOutboundReview("send_purchase_link")}
                  className="text-[11px] text-sky-300 hover:underline"
                >
                  Send purchase link
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
                  className="text-[11px] text-emerald-300 hover:underline"
                >
                  Mark paid
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-[#030A1C]/90 border border-[#16284C] p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-[#7E95B8]">
              Next follow-up
            </div>
            <div
              data-testid="decision-next-followup"
              className="text-sm font-semibold text-[#F1F5F9] mt-1"
            >
              {dueDateStr
                ? new Date(dueDateStr).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Not scheduled"}
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedChoice("needs_time");
                  setIsEditing(true);
                }}
                className="text-[11px] text-[#FFE394] hover:underline"
              >
                Schedule follow-up
              </button>
            </div>
          </div>
        </div>

        {/* Checklist Strip: Offer sent → Agreement signed → Payment complete */}
        <div
          data-testid="decision-progression-checklist"
          className="rounded-xl bg-[#030A1C]/95 border border-[#182B52] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-3">
            {[
              { key: "offer_sent", label: "Offer sent", done: offerSent },
              {
                key: "agreement_signed",
                label: "Agreement signed",
                done: isAgreementSigned,
              },
              {
                key: "payment_complete",
                label: "Payment complete",
                done: isPaymentVerified,
              },
            ].map((step, i) => (
              <React.Fragment key={step.key}>
                {i > 0 && (
                  <ArrowRight className="w-3.5 h-3.5 text-[#475569] shrink-0" />
                )}
                <div
                  data-testid={`checklist-step-${step.key}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    step.done
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-[#06122E] text-slate-300 border-[#1E335C]"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-[#D8B979]" />
                  )}
                  <span>{step.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          <span className="text-[11px] text-[#93A8C8]">
            Completing Agreement + Payment progresses the lead to Onboarding automatically.
          </span>
        </div>
      </div>

      {/* ── 2. DECISION STATUS & FOLLOW-UP CONTROLS ── */}
      <div className="rounded-xl border border-[#1E335C] bg-[#06122E]/95 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-5 border-b border-[#16284C]">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#D8B979]">
              Family Decision Status
            </span>
            <h3
              className="text-xl font-serif text-[#F8FAFC] mt-0.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Update Decision Status or Follow-up Timing
            </h3>
          </div>
        </div>

        {/* Decision Status Choices: Considering · Needs time · Ready to proceed · Declined */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
          {[
            {
              key: "considering" as ChoiceOption,
              label: "Considering",
              sub: "Reviewing recommended service plan and proposal",
              icon: Sparkles,
              accent: "text-sky-400",
            },
            {
              key: "needs_time" as ChoiceOption,
              label: "Needs time",
              sub: "Keep in Decision with a required follow-up date and reason",
              icon: Clock,
              accent: "text-[#D8B979]",
            },
            {
              key: "ready_to_start" as ChoiceOption,
              label: "Ready to proceed",
              sub: "Select service plan and continue to onboarding",
              icon: CheckCircle2,
              accent: "text-emerald-400",
            },
            {
              key: "not_proceeding" as ChoiceOption,
              label: "Declined",
              sub: "Record reason, stop outreach, and move to Closed filter",
              icon: XCircle,
              accent: "text-slate-400",
            },
          ].map((item) => {
            const Icon = item.icon;
            const active = selectedChoice === item.key;
            return (
              <button
                key={item.key}
                type="button"
                data-testid={`decision-choice-${item.key}`}
                onClick={() => {
                  setSelectedChoice(item.key);
                  setIsEditing(true);
                }}
                className={`text-left rounded-xl p-4 border transition-all cursor-pointer ${
                  active
                    ? "bg-[#0C204B] border-[#D8B979] shadow-[0_0_20px_rgba(216,185,121,0.15)]"
                    : "bg-[#030A1C]/90 border-[#182B52] hover:border-[#2C4880] hover:bg-[#071535]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${item.accent}`} />
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      active
                        ? "border-[#D8B979] bg-[#D8B979]/20"
                        : "border-[#334E83]"
                    }`}
                  >
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-[#D8B979]" />
                    )}
                  </span>
                </div>
                <div className="font-semibold text-sm text-[#F8FAFC] mt-3">
                  {item.label}
                </div>
                <div className="text-xs text-[#8DA2C4] mt-1 leading-relaxed">
                  {item.sub}
                </div>
              </button>
            );
          })}
        </div>

        {/* Considering or Ready to Proceed Plan Selector */}
        {(selectedChoice === "considering" ||
          selectedChoice === "ready_to_start") && (
          <div
            className="mt-6 pt-6 border-t border-[#16284C] space-y-5"
            data-testid="decision-panel-ready-to-start"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-[#F8FAFC]">
                  Recommended Service Plan & Pricing
                </h4>
                <p className="text-xs text-[#8DA2C4]">
                  Connected to the Waypoint Service Catalog (`PUBLISHED_MEMBERSHIP_PLANS`).
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-[#1E335C] bg-[#030A1C] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setEnrollmentMode("standard")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    enrollmentMode === "standard"
                      ? "bg-[#122856] text-[#F8FAFC]"
                      : "text-[#8DA2C4]"
                  }`}
                >
                  Published Plans
                </button>
                <button
                  type="button"
                  onClick={() => setEnrollmentMode("custom")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    enrollmentMode === "custom"
                      ? "bg-[#122856] text-[#F8FAFC]"
                      : "text-[#8DA2C4]"
                  }`}
                >
                  Custom Arrangement
                </button>
              </div>
            </div>

            {enrollmentMode === "standard" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {publishedPlans.map((plan: any) => {
                  const isSelected = selectedPlanKey === plan.key;
                  return (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => setSelectedPlanKey(plan.key)}
                      className={`text-left rounded-xl p-4 border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#0D2352] border-[#D8B979] shadow-md"
                          : "bg-[#030A1C]/80 border-[#182B52] hover:border-[#2C4880]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-[#F8FAFC]">
                          {plan.name}
                        </span>
                        <span className="text-sm font-bold text-[#D8B979]">
                          ${plan.monthlyPrice}/mo
                        </span>
                      </div>
                      <p className="text-xs text-[#8DA2C4] mt-1.5">
                        {plan.description ||
                          "12-month special education advocacy plan"}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-[#030A1C]/90 border border-[#182B52] p-4">
                <div>
                  <label className="block text-xs font-medium text-[#93A8C8] mb-1">
                    Custom Plan Name
                  </label>
                  <input
                    type="text"
                    value={customPlanName}
                    onChange={(e) => setCustomPlanName(e.target.value)}
                    className="w-full rounded-lg bg-[#06122E] border border-[#243B67] px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#93A8C8] mb-1">
                    Monthly Rate ($ USD)
                  </label>
                  <input
                    type="number"
                    value={customMonthlyPrice}
                    onChange={(e) =>
                      setCustomMonthlyPrice(Number(e.target.value) || 0)
                    }
                    className="w-full rounded-lg bg-[#06122E] border border-[#243B67] px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#93A8C8] mb-1.5">
                  Payment Structure
                </label>
                <select
                  value={paymentStructure}
                  onChange={(e) =>
                    setPaymentStructure(
                      e.target.value as "monthly_autopay" | "pay_in_full"
                    )
                  }
                  className="w-full rounded-lg bg-[#030A1C] border border-[#243B67] px-3 py-2 text-xs text-white"
                >
                  <option value="monthly_autopay">
                    Monthly Commitment (12 Months)
                  </option>
                  <option value="pay_in_full">Pay in Full (Annual Term)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#93A8C8] mb-1.5">
                  Billing Arrangement
                </label>
                <select
                  value={billingArrangement}
                  onChange={(e) =>
                    setBillingArrangement(
                      e.target.value as "autopay" | "manual_invoice"
                    )
                  }
                  className="w-full rounded-lg bg-[#030A1C] border border-[#243B67] px-3 py-2 text-xs text-white"
                >
                  <option value="autopay">
                    Standard Card / Autopay Checkout
                  </option>
                  <option value="manual_invoice">Manual Invoice Exception</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#93A8C8] mb-1.5">
                  Assigned Advocate
                </label>
                <input
                  type="text"
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  className="w-full rounded-lg bg-[#030A1C] border border-[#243B67] px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              {selectedChoice === "considering" ? (
                <button
                  type="button"
                  onClick={handlePrimarySubmit}
                  disabled={saveDecisionMutation.isPending}
                  data-testid="save-considering-btn"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#102452] text-white border border-[#D8B979] hover:bg-[#16306B] transition-all"
                >
                  {saveDecisionMutation.isPending
                    ? "Saving..."
                    : "Save Considering Status"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrimarySubmit}
                  disabled={saveDecisionMutation.isPending}
                  data-testid="start-onboarding-btn"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] shadow-lg hover:brightness-105 transition-all"
                >
                  {saveDecisionMutation.isPending
                    ? "Continuing..."
                    : "Continue to Onboarding"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Needs time panel */}
        {selectedChoice === "needs_time" && (
          <div
            className="mt-6 pt-6 border-t border-[#16284C] space-y-5"
            data-testid="decision-panel-needs-time"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#93A8C8] mb-1.5">
                  Follow-up Date <span className="text-[#D8B979]">* (Required)</span>
                </label>
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  data-testid="needs-time-followup-date"
                  className="w-full rounded-lg bg-[#030A1C] border border-[#243B67] px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#93A8C8] mb-1.5">
                  Reason (Optional — e.g., moving later, budget, waiting for a month)
                </label>
                <input
                  type="text"
                  list="needs-time-reasons"
                  value={needsTimeReason}
                  onChange={(e) => setNeedsTimeReason(e.target.value)}
                  placeholder="e.g., Discussing options with co-parent or waiting for next month"
                  className="w-full rounded-lg bg-[#030A1C] border border-[#243B67] px-3 py-2 text-xs text-white"
                />
                <datalist id="needs-time-reasons">
                  {NEEDS_TIME_REASONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#93A8C8] mb-1.5">
                  Follow-up Sequence (Optional)
                </label>
                <select
                  value={followUpSequenceId || ""}
                  onChange={(e) =>
                    setFollowUpSequenceId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  data-testid="needs-time-sequence-select"
                  className="w-full rounded-lg bg-[#030A1C] border border-[#243B67] px-3 py-2 text-xs text-white"
                >
                  <option value="">
                    No automated sequence (Manual follow-up only)
                  </option>
                  {availableSequences.map((seq: any) => (
                    <option key={seq.id} value={seq.id}>
                      {seq.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#93A8C8] mb-1.5">
                  Optional Note
                </label>
                <input
                  type="text"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Context for next check-in..."
                  className="w-full rounded-lg bg-[#030A1C] border border-[#243B67] px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {selectedSequenceObj && (
              <div className="rounded-xl bg-[#030A1C]/90 border border-[#243B67] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#D8B979] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Outbound Follow-up Review
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#0C204B] text-[#93A8C8]">
                    Safe Preview · Preserves Offer & Discovery Info
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[#7E95B8] block">Recipient</span>
                    <span className="text-white font-medium">
                      {workspace.lead?.parentName} (
                      {workspace.lead?.parentEmail ||
                        workspace.lead?.parentPhone ||
                        "No contact"}
                      )
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7E95B8] block">Sequence</span>
                    <span className="text-white font-medium">
                      {selectedSequenceObj.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7E95B8] block">Follow-up Date</span>
                    <span className="text-white font-medium">
                      {followUpDate || "Select date above"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#8DA2C4]">
                Keeps the lead in Decision until they decide and preserves all existing offer & discovery information.
              </span>
              <button
                type="button"
                onClick={handlePrimarySubmit}
                disabled={saveDecisionMutation.isPending}
                data-testid="save-followup-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] shadow-lg hover:brightness-105 transition-all"
              >
                {saveDecisionMutation.isPending ? "Saving..." : "Save Follow-up"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Declined / Not proceeding panel */}
        {selectedChoice === "not_proceeding" && (
          <div
            className="mt-6 pt-6 border-t border-[#16284C] space-y-4"
            data-testid="decision-panel-not-proceeding"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#93A8C8] mb-1.5">
                  Decline Reason
                </label>
                <select
                  value={closedReason}
                  onChange={(e) => setClosedReason(e.target.value)}
                  data-testid="close-lead-reason-select"
                  className="w-full rounded-lg bg-[#030A1C] border border-[#243B67] px-3 py-2 text-xs text-white"
                >
                  {NOT_PROCEEDING_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#93A8C8] mb-1.5">
                  Optional Note
                </label>
                <input
                  type="text"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Additional context for family record..."
                  className="w-full rounded-lg bg-[#030A1C] border border-[#243B67] px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#8DA2C4]">
                Declined leads are removed from active counts while remaining accessible through the Closed filter with a Reopen action.
              </span>
              <button
                type="button"
                onClick={handlePrimarySubmit}
                disabled={saveDecisionMutation.isPending}
                data-testid="close-lead-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-200 border border-rose-400/40 hover:bg-rose-500/30 transition-all"
              >
                {saveDecisionMutation.isPending
                  ? "Recording..."
                  : "Mark Declined"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

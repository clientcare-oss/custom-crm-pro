import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Lock, Clock, 
  CreditCard, FileText, Sparkles, X, ChevronRight, Info
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FamilyEnrollmentApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentContactId: number;
  studentContactId?: number;
  leadId?: number;
  familyName?: string;
  studentName?: string;
  isSupersedeMode?: boolean;
  onSuccess?: () => void;
}

export function FamilyEnrollmentApprovalModal({
  isOpen,
  onClose,
  parentContactId,
  studentContactId,
  leadId,
  familyName,
  studentName,
  isSupersedeMode = false,
  onSuccess,
}: FamilyEnrollmentApprovalModalProps) {
  // Query family enrollment state
  const stateQuery = trpc.familyEnrollment.getState.useQuery(
    { parentContactId, studentContactId, leadId },
    { enabled: isOpen && (parentContactId > 0 || !!studentContactId || !!leadId) }
  );

  const approveMutation = trpc.familyEnrollment.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Enrollment approval confirmed.");
      stateQuery.refetch();
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to confirm enrollment approval.");
    },
  });

  const supersedeMutation = trpc.familyEnrollment.supersede.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Enrollment offer superseded with new terms.");
      stateQuery.refetch();
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to supersede enrollment offer.");
    },
  });


  // State
  const [enrollmentMode, setEnrollmentMode] = useState<"standard" | "custom">("standard");
  const [billingArrangement, setBillingArrangement] = useState<"autopay" | "manual_invoice">("autopay");
  const [manualInvoiceDueDate, setManualInvoiceDueDate] = useState<string>("1st of the month");
  const [manualInvoiceReason, setManualInvoiceReason] = useState<string>("");
  const [expirationDays, setExpirationDays] = useState<number>(14);
  const [overrideDiscovery, setOverrideDiscovery] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");

  // Custom Offer Form
  const [customPlanKey, setCustomPlanKey] = useState<string>("custom_retainer");
  const [customPlanName, setCustomPlanName] = useState<string>("Custom Advocacy Retainer");
  const [customMonthlyPrice, setCustomMonthlyPrice] = useState<number>(125);
  const [customCommitmentMonths, setCustomCommitmentMonths] = useState<number>(12);
  const [customTerms, setCustomTerms] = useState<string>("");

  const activeOffer = stateQuery.data?.activeOffer;
  const isEditingExistingOffer = !!activeOffer;
  const isOfferLocked = Boolean(
    activeOffer &&
    ["plan_selected", "agreement_pending", "agreement_signed", "active"].includes(activeOffer.status)
  );

  const [changeReason, setChangeReason] = useState<string>("");

  const isDiscoveryCompleted = Boolean(stateQuery.data?.isDiscoveryCompleted);
  const publishedPlans = stateQuery.data?.publishedPlans || [];

  // Hydrate form values when editing an existing active offer
  useEffect(() => {
    if (activeOffer && isOpen) {
      setEnrollmentMode(activeOffer.enrollmentMode as "standard" | "custom");
      setBillingArrangement(activeOffer.billingArrangement as "autopay" | "manual_invoice");
      if (activeOffer.manualInvoiceDueDate) setManualInvoiceDueDate(activeOffer.manualInvoiceDueDate);
      if (activeOffer.manualInvoiceReason) setManualInvoiceReason(activeOffer.manualInvoiceReason);

      if (activeOffer.invitationExpiresAt) {
        const diffMs = new Date(activeOffer.invitationExpiresAt).getTime() - Date.now();
        const days = Math.max(0, Math.round(diffMs / 86400000));
        setExpirationDays(days);
      }

      setOverrideDiscovery(Boolean(activeOffer.isDiscoveryOverridden));
      if (activeOffer.discoveryOverrideReason) setOverrideReason(activeOffer.discoveryOverrideReason);
      if (activeOffer.internalNotes) setInternalNotes(activeOffer.internalNotes);

      // Custom plan fields
      if (activeOffer.customPlanKey) setCustomPlanKey(activeOffer.customPlanKey);
      if (activeOffer.customPlanName) setCustomPlanName(activeOffer.customPlanName);
      if (activeOffer.customMonthlyPrice) setCustomMonthlyPrice(Number(activeOffer.customMonthlyPrice));
      if (activeOffer.customCommitmentMonths) setCustomCommitmentMonths(Number(activeOffer.customCommitmentMonths));
      if (activeOffer.customTerms) setCustomTerms(activeOffer.customTerms);
      setChangeReason("");
    }
  }, [activeOffer, isOpen]);

  // Reset override if discovery becomes completed
  useEffect(() => {
    if (isDiscoveryCompleted) {
      setOverrideDiscovery(false);
      setOverrideReason("");
    }
  }, [isDiscoveryCompleted]);

  // Validation
  const isOverrideNeeded = !isDiscoveryCompleted;
  const isOverrideValid = !isOverrideNeeded || (overrideDiscovery && overrideReason.trim().length >= 5);
  const isManualInvoiceValid = billingArrangement === "autopay" || (manualInvoiceReason.trim().length >= 5 && !!manualInvoiceDueDate);
  const isCustomOfferValid = enrollmentMode === "standard" || (customMonthlyPrice > 0 && !!customPlanName);
  const isSupersedeValid = isSupersedeMode && changeReason.trim().length >= 5;
  const canSubmit = isSupersedeMode
    ? isSupersedeValid && isOverrideValid && isManualInvoiceValid && isCustomOfferValid && !supersedeMutation.isPending
    : !isOfferLocked && isOverrideValid && isManualInvoiceValid && isCustomOfferValid && !approveMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isSupersedeMode && activeOffer) {
      supersedeMutation.mutate({
        offerId: activeOffer.id,
        reason: changeReason.trim(),
        enrollmentMode,
        customPlanKey: enrollmentMode === "custom" ? customPlanKey : undefined,
        customPlanName: enrollmentMode === "custom" ? customPlanName : undefined,
        customMonthlyPrice: enrollmentMode === "custom" ? Number(customMonthlyPrice) : undefined,
        customBillingFrequency: "monthly",
        customCommitmentMonths: enrollmentMode === "custom" ? Number(customCommitmentMonths) : 12,
        customTerms: enrollmentMode === "custom" ? customTerms : undefined,
        billingArrangement,
        manualInvoiceDueDate: billingArrangement === "manual_invoice" ? manualInvoiceDueDate : undefined,
        manualInvoiceReason: billingArrangement === "manual_invoice" ? manualInvoiceReason : undefined,
        expirationDays,
        overrideDiscovery: isOverrideNeeded ? overrideDiscovery : false,
        overrideReason: isOverrideNeeded ? overrideReason : undefined,
        internalNotes: internalNotes.trim() ? internalNotes : undefined,
      });
      return;
    }

    approveMutation.mutate({
      parentContactId: stateQuery.data?.parentContactId || parentContactId,
      studentContactId: stateQuery.data?.studentContactId || studentContactId,
      leadId: stateQuery.data?.activeLead?.id || leadId,
      enrollmentMode,
      customPlanKey: enrollmentMode === "custom" ? customPlanKey : undefined,
      customPlanName: enrollmentMode === "custom" ? customPlanName : undefined,
      customMonthlyPrice: enrollmentMode === "custom" ? Number(customMonthlyPrice) : undefined,
      customBillingFrequency: "monthly",
      customCommitmentMonths: enrollmentMode === "custom" ? Number(customCommitmentMonths) : 12,
      customTerms: enrollmentMode === "custom" ? customTerms : undefined,
      billingArrangement,
      manualInvoiceDueDate: billingArrangement === "manual_invoice" ? manualInvoiceDueDate : undefined,
      manualInvoiceReason: billingArrangement === "manual_invoice" ? manualInvoiceReason : undefined,
      expirationDays,
      overrideDiscovery: isOverrideNeeded ? overrideDiscovery : false,
      overrideReason: isOverrideNeeded ? overrideReason : undefined,
      internalNotes: internalNotes.trim() ? internalNotes : undefined,
      changeReason: isEditingExistingOffer && changeReason.trim() ? changeReason.trim() : undefined,
    });
  };

  const displayName = familyName || (stateQuery.data?.parentContact ? `${stateQuery.data.parentContact.firstName} ${stateQuery.data.parentContact.lastName}` : "Family");
  const studentDisplayName = studentName || (stateQuery.data?.studentContact ? `${stateQuery.data.studentContact.firstName} ${stateQuery.data.studentContact.lastName}` : null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#05142B] border border-[#3A2C18] text-[#D8C7A5] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-xl sm:rounded-2xl">
        <DialogHeader className="border-b border-[#3A2C18]/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C5A059]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle 
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#FFF4D4]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {isSupersedeMode
                  ? `Supersede Offer Terms (Offer #${activeOffer?.id})`
                  : isOfferLocked
                  ? "Enrollment Offer Locked"
                  : isEditingExistingOffer
                  ? `Edit Offer Terms (Rev #${(activeOffer?.revisionNumber || 1) + 1})`
                  : "Approve Family for Enrollment"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#C6B697] mt-0.5">
                Family Anchor: <span className="font-semibold text-white">{displayName}</span>
                {studentDisplayName && (
                  <> &bull; Student: <span className="font-semibold text-white">{studentDisplayName}</span></>
                )}
                {isEditingExistingOffer && activeOffer && (
                  <> &bull; Current Status: <span className="font-semibold text-[#FFE394] capitalize">{activeOffer.status.replace(/_/g, " ")}</span></>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Supersede Mode Banner */}
        {isSupersedeMode && activeOffer && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3 shadow-inner my-2">
            <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 w-full">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300">Staff-Authorized Offer Supersede</span>
                <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-300 bg-amber-950/60">
                  New Active Offer
                </Badge>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Superseding will void pending unsigned agreements or preserve executed agreements for compliance records. A replacement offer will be generated requiring the parent to choose their plan and sign.
              </p>
              <div className="pt-1.5">
                <label className="block text-[11px] font-semibold text-[#FFF4D4] mb-1">
                  Supersede Reason (Required, min 5 characters) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Terms renegotiated following IEP eligibility meeting"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs rounded-lg px-2.5 py-1.5 focus:border-[#C5A059] focus:outline-none placeholder:text-stone-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Locked Offer Banner (shown ONLY when not superseding) */}
        {!isSupersedeMode && isOfferLocked && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-3 shadow-inner my-2">
            <Lock className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-300">
                Offer Terms Locked ({activeOffer?.status?.replace(/_/g, " ").toUpperCase()})
              </p>
              <p className="mt-1 text-red-200/80 leading-relaxed">
                This family has already selected a plan or entered the agreement workflow. Terms cannot be edited or replaced silently to protect agreement integrity. Any replacement requires an authorized supersede flow.
              </p>
            </div>
          </div>
        )}

        {/* Pre-acceptance Revision Banner */}
        {!isSupersedeMode && isEditingExistingOffer && !isOfferLocked && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3 shadow-inner my-2">
            <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 w-full">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300">Editing Pre-Acceptance Offer</span>
                <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-300 bg-amber-950/60">
                  Saving as Rev #{(activeOffer?.revisionNumber || 1) + 1}
                </Badge>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Modifying terms will preserve all previous terms in the audit log and reset the invitation dispatch state.
              </p>
              <div className="pt-1.5">
                <label className="block text-[11px] font-semibold text-[#FFF4D4] mb-1">
                  Reason for Terms Revision
                </label>
                <input
                  type="text"
                  placeholder="e.g. Adjusted monthly retainer rate per consultation"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs rounded-lg px-2.5 py-1.5 focus:border-[#C5A059] focus:outline-none placeholder:text-stone-600"
                />
              </div>
            </div>
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Discovery Status Banner */}
          <div className="rounded-lg p-3 bg-[#020A17]/80 border border-[#3A2C18]/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A69371]">Discovery Status:</span>
                {isDiscoveryCompleted ? (
                  <Badge variant="outline" className="text-[11px] border-emerald-500/50 text-emerald-300 bg-emerald-950/40 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Discovery Completed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] border-amber-500/50 text-amber-300 bg-amber-950/40 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Discovery In Progress
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-[#A69371]">
                {isDiscoveryCompleted ? "Standard approval ready" : "Completion normally required"}
              </span>
            </div>

            {/* Discovery Incomplete Warning & Override Exception */}
            {!isDiscoveryCompleted && (
              <div className="pt-2 border-t border-[#3A2C18]/60 space-y-2">
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  The discovery call for this family is not marked complete. Standard approval is locked until discovery finishes, or an authorized staff exception is granted.
                </p>

                <div className="rounded-md bg-amber-950/20 border border-amber-500/30 p-2.5 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-300">
                    <input
                      type="checkbox"
                      checked={overrideDiscovery}
                      onChange={(e) => setOverrideDiscovery(e.target.checked)}
                      className="rounded border-[#3A2C18] text-[#C5A059] focus:ring-[#C5A059]"
                    />
                    <span>Grant Authorized Staff Override Exception</span>
                  </label>

                  {overrideDiscovery && (
                    <div className="space-y-1 pl-5">
                      <Label className="text-[11px] font-semibold text-amber-200">
                        Mandatory Exception Reason (Recorded in Activity Timeline):
                      </Label>
                      <Input
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="e.g. Expedited DPR deadline; parent requested direct onboarding with advocate pre-approval"
                        className="bg-[#020A17] border-amber-500/40 text-xs text-white placeholder:text-white/30 h-8"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 1: Enrollment Mode */}
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
              1. Enrollment Mode
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEnrollmentMode("standard")}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all cursor-pointer",
                  enrollmentMode === "standard"
                    ? "bg-[#091b35] border-[#C5A059] shadow-[0_0_12px_rgba(197,160,89,0.15)]"
                    : "bg-[#020A17]/60 border-[#3A2C18] hover:border-[#3A2C18]/90 opacity-75"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#FFF4D4]">Standard Enrollment</span>
                  <Badge variant="outline" className="text-[9px] border-[#C5A059]/40 text-[#C5A059]">
                    Default
                  </Badge>
                </div>
                <p className="text-[11px] text-[#C6B697] mt-1 leading-snug">
                  Unlocks all 3 published Services Catalog plans in the Parent Portal. Parent chooses their tier.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEnrollmentMode("custom")}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all cursor-pointer",
                  enrollmentMode === "custom"
                    ? "bg-[#091b35] border-[#C5A059] shadow-[0_0_12px_rgba(197,160,89,0.15)]"
                    : "bg-[#020A17]/60 border-[#3A2C18] hover:border-[#3A2C18]/90 opacity-75"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#FFF4D4]">Custom Enrollment</span>
                  <Badge variant="outline" className="text-[9px] border-sky-400/40 text-sky-300">
                    Staff Custom
                  </Badge>
                </div>
                <p className="text-[11px] text-[#C6B697] mt-1 leading-snug">
                  Authorize a tailored offer with specific monthly pricing and custom terms. Parent sees only this offer.
                </p>
              </button>
            </div>

            {/* Standard Mode Plans Preview */}
            {enrollmentMode === "standard" ? (
              <div className="rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 p-3 space-y-2">
                <span className="text-[11px] font-semibold text-[#A69371] uppercase tracking-wider">
                  Published Plans Unlocked for Family Selection:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {publishedPlans.map((plan: any) => (
                    <div key={plan.planKey} className="p-2 rounded bg-[#05142B] border border-[#3A2C18] text-center">
                      <p className="text-xs font-bold text-white">{plan.planName}</p>
                      <p className="text-sm font-extrabold text-[#FFE394] mt-0.5">${plan.priceMonthly}<span className="text-[10px] text-white/60">/mo</span></p>
                      <p className="text-[10px] text-[#C6B697] mt-1 line-clamp-2">{plan.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Custom Mode Offer Configuration */
              <div className="rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 p-3 space-y-3">
                <span className="text-[11px] font-semibold text-[#C5A059] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Custom Offer Configuration
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-[#C6B697]">Offer Name</Label>
                    <Input
                      value={customPlanName}
                      onChange={(e) => setCustomPlanName(e.target.value)}
                      placeholder="e.g. Specialized Case Retainer"
                      className="bg-[#05142B] border-[#3A2C18] text-xs text-white h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-[#C6B697]">Custom Monthly Price ($)</Label>
                    <Input
                      type="number"
                      value={customMonthlyPrice}
                      onChange={(e) => setCustomMonthlyPrice(Number(e.target.value))}
                      className="bg-[#05142B] border-[#3A2C18] text-xs text-white h-8 mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-[#C6B697]">Commitment (Months)</Label>
                    <Input
                      type="number"
                      value={customCommitmentMonths}
                      onChange={(e) => setCustomCommitmentMonths(Number(e.target.value))}
                      className="bg-[#05142B] border-[#3A2C18] text-xs text-white h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-[#C6B697]">Custom Terms / Scope Note</Label>
                    <Input
                      value={customTerms}
                      onChange={(e) => setCustomTerms(e.target.value)}
                      placeholder="e.g. Includes 2 expedited IEP sessions"
                      className="bg-[#05142B] border-[#3A2C18] text-xs text-white h-8 mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Payment Arrangement */}
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
              2. Payment Arrangement
            </Label>

            <div className="space-y-2">
              <label 
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  billingArrangement === "autopay"
                    ? "bg-[#091b35] border-[#C5A059]"
                    : "bg-[#020A17]/60 border-[#3A2C18] opacity-75"
                )}
              >
                <input
                  type="radio"
                  name="billingArrangement"
                  value="autopay"
                  checked={billingArrangement === "autopay"}
                  onChange={() => setBillingArrangement("autopay")}
                  className="mt-0.5 text-[#C5A059] focus:ring-[#C5A059]"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#FFF4D4]">Automatic Monthly Billing (Autopay — Default)</span>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-300">
                      Standard
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#C6B697]">
                    Secures a payment method on file via Stripe for automated recurring monthly dues.
                  </p>
                </div>
              </label>

              <label 
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  billingArrangement === "manual_invoice"
                    ? "bg-[#091b35] border-[#C5A059]"
                    : "bg-[#020A17]/60 border-[#3A2C18] opacity-75"
                )}
              >
                <input
                  type="radio"
                  name="billingArrangement"
                  value="manual_invoice"
                  checked={billingArrangement === "manual_invoice"}
                  onChange={() => setBillingArrangement("manual_invoice")}
                  className="mt-0.5 text-[#C5A059] focus:ring-[#C5A059]"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#FFF4D4]">Manual Monthly Invoicing (Staff Exception Only)</span>
                    <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-300">
                      Exception Required
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#C6B697]">
                    Requires authorized staff justification. Parents will be issued monthly invoices manually.
                  </p>
                </div>
              </label>
            </div>

            {/* Manual Invoicing Details */}
            {billingArrangement === "manual_invoice" && (
              <div className="rounded-lg bg-amber-950/20 border border-amber-500/40 p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-amber-200">Monthly Due Date</Label>
                    <select
                      value={manualInvoiceDueDate}
                      onChange={(e) => setManualInvoiceDueDate(e.target.value)}
                      className="w-full bg-[#020A17] border border-amber-500/40 rounded-md text-xs text-white p-2 mt-1"
                    >
                      <option value="1st of the month">1st of the month</option>
                      <option value="15th of the month">15th of the month</option>
                      <option value="Upon receipt (Net 7)">Upon receipt (Net 7)</option>
                      <option value="Upon receipt (Net 14)">Upon receipt (Net 14)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-amber-200">Mandatory Exception Reason</Label>
                    <Input
                      value={manualInvoiceReason}
                      onChange={(e) => setManualInvoiceReason(e.target.value)}
                      placeholder="e.g. Third-party scholarship trust fund disbursement"
                      className="bg-[#020A17] border-amber-500/40 text-xs text-white h-8 mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Expiration & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                3. Invitation Expiration
              </Label>
              <select
                value={expirationDays}
                onChange={(e) => setExpirationDays(Number(e.target.value))}
                className="w-full bg-[#020A17] border border-[#3A2C18] rounded-md text-xs text-white p-2 mt-1.5"
              >
                <option value={7}>7 Days</option>
                <option value={14}>14 Days (Default Standard)</option>
                <option value={30}>30 Days</option>
                <option value={0}>No Expiration</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                Internal Advocate Notes
              </Label>
              <Input
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Optional notes for crew records"
                className="bg-[#020A17] border-[#3A2C18] text-xs text-white h-8 mt-1.5"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-[#3A2C18]/80 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] text-xs h-9 px-5 gap-1.5 transition-all",
                !canSubmit && "opacity-50 cursor-not-allowed"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>
                {approveMutation.isPending || supersedeMutation.isPending
                  ? "Saving..."
                  : isSupersedeMode
                  ? "Authorize & Supersede Offer"
                  : isOfferLocked
                  ? "Terms Locked"
                  : isEditingExistingOffer
                  ? `Save Revised Terms (Rev #${(activeOffer?.revisionNumber || 1) + 1})`
                  : "Confirm Approval & Prepare Portal"}
              </span>

            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  FileText, 
  Award,
  ChevronRight,
  Info,
  Loader2,
  AlertTriangle,
  Clock,
  Compass,
  FileCheck,
  CreditCard,
  UploadCloud,
  Calendar,
  RefreshCw,
  X,
  FileSignature
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ChooseSupportExperienceProps {
  onPaymentSuccess?: () => void;
  onNavigateTab: (tabId: string) => void;
  parentContactId?: number;
  studentContactId?: number;
}

export function ChooseSupportExperience({
  onPaymentSuccess,
  onNavigateTab,
  parentContactId,
  studentContactId,
}: ChooseSupportExperienceProps) {
  // Query family enrollment state
  const { data: enrollmentState, isLoading, refetch } = trpc.familyEnrollment.portalGetState.useQuery(
    { parentContactId, studentContactId },
    { refetchOnWindowFocus: false }
  );

  const activeOffer = enrollmentState?.activeOffer;
  const availablePlans = enrollmentState?.availablePlans || [];
  const canEnroll = Boolean(enrollmentState?.canEnroll);

  // Selected plan state: MUST NOT preselect any plan if not already chosen by parent
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);

  // Initialize selected plan only if parent previously persisted a selection
  useEffect(() => {
    if (activeOffer?.selectedPlanKey) {
      setSelectedPlanKey(activeOffer.selectedPlanKey);
    } else if (activeOffer?.enrollmentMode === "custom" && availablePlans.length === 1) {
      // In custom mode, single authorized offer is selected
      setSelectedPlanKey(availablePlans[0].planKey);
    } else {
      // Standard enrollment: strictly NO default preselection
      setSelectedPlanKey(null);
    }
  }, [activeOffer?.selectedPlanKey, activeOffer?.enrollmentMode, availablePlans]);

  // Plan selection mutation
  const selectPlanMutation = trpc.familyEnrollment.selectPlan.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Advocacy plan confirmed! Loading agreement...");
      refetch();
      // Auto-transition to Agreements tab for review and e-signature
      onNavigateTab("agreements");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to select advocacy plan.");
    },
  });

  // Phase 2E: Payment structure selection before agreement generation.
  // Must be explicitly chosen; never preselected.
  const [selectedPaymentStructure, setSelectedPaymentStructure] = useState<"monthly_autopay" | "pay_in_full" | null>(null);

  // Phase 2E: Revision modal state for post-signing changes
  const [isChangeStructureOpen, setIsChangeStructureOpen] = useState(false);

  // Phase 2E: Request payment structure revision after signing
  const requestRevisionMutation = trpc.familyEnrollment.requestPaymentStructureRevision.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Revised agreement generated! Loading for e-signature...");
      setIsChangeStructureOpen(false);
      refetch();
      onNavigateTab("agreements");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to request payment structure revision.");
    },
  });

  // Phase 2F.1: Cancel payment structure revision draft and restore original signed agreement
  const cancelRevisionMutation = trpc.familyEnrollment.cancelPaymentStructureRevision.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Revision draft discarded. Original signed agreement restored.");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel revision.");
    },
  });

  // Phase 2D: Retrieve authoritative calculation quote
  const quoteQuery = trpc.familyEnrollment.getPaymentQuote.useQuery(
    { offerId: activeOffer?.id || 0 },
    { enabled: !!activeOffer?.id }
  );
  const quote = quoteQuery.data;

  // Phase 2C: Stripe Checkout mutation
  const checkoutMutation = trpc.familyEnrollment.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      toast.success("Checkout session initialized (Test Mode)");
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create checkout session.");
    },
  });

  // Phase 2C: Verify Session mutation (for redirect verification or instant test checkout)
  const verifySessionMutation = trpc.familyEnrollment.verifySession.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Membership verified and activated! Welcome to Waypoint.");
      refetch();
      if (onPaymentSuccess) onPaymentSuccess();
    },
    onError: (err) => {
      toast.error(err.message || "Payment verification failed.");
    },
  });

  // Handle URL redirect query params from Stripe (e.g. ?session_id=...&payment=success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const paymentStatus = params.get("payment");

    if (sessionId && paymentStatus === "success") {
      verifySessionMutation.mutate({
        sessionId,
        parentContactId,
      });
      // Clean up URL query params without reloading
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    } else if (paymentStatus === "cancelled") {
      toast.info("Checkout was cancelled. Your executed agreement is preserved; you can authorize payment anytime.");
    }
  }, []);

  const handleSelectAndProceed = () => {
    if (!activeOffer?.id || !selectedPlanKey) {
      toast.error("Please choose a membership plan to continue.");
      return;
    }

    if (!selectedPaymentStructure) {
      toast.error("Please choose how you'd like to pay (Pay Monthly or Pay in Full).");
      return;
    }

    selectPlanMutation.mutate({
      offerId: activeOffer.id,
      planKey: selectedPlanKey,
      paymentStructure: selectedPaymentStructure,
      parentContactId,
    });
  };

  const handleStartCheckout = () => {
    if (!activeOffer?.id) {
      toast.error("No active enrollment offer found.");
      return;
    }

    checkoutMutation.mutate({
      offerId: activeOffer.id,
      parentContactId,
      paymentStructure: (activeOffer as any).paymentStructure || "monthly_autopay",
    });
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 text-[#C5A059] animate-spin" />
        <p className="text-sm font-medium text-[#C6B697]">
          Verifying family enrollment authorization...
        </p>
      </div>
    );
  }

  // 2. Ineligible / Unapproved / Expired / Revoked State
  if (!canEnroll || !activeOffer) {
    const reason = enrollmentState?.ineligibleReason || "unapproved";
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto animate-in fade-in duration-300">
        <Card className="rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] p-8 shadow-[0_8px_24px_rgba(0,0,0,0.85)] text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#020A17] border border-[#3A2C18] flex items-center justify-center mx-auto text-[#C5A059] shadow-inner">
            {reason === "expired" ? (
              <Clock className="h-8 w-8 text-amber-400" />
            ) : reason === "already_active" ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            ) : (
              <Lock className="h-8 w-8 text-[#C5A059]" />
            )}
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="text-xs uppercase tracking-wider border-[#3A2C18] text-[#C6B697] bg-[#020A17]">
              {reason === "expired"
                ? "Enrollment Window Expired"
                : reason === "already_active"
                ? "Membership Active"
                : reason === "revoked"
                ? "Offer Closed"
                : "Advocate Authorization Required"}
            </Badge>
            <h2 className="text-2xl font-serif font-bold text-[#FFF4D4]">
              {reason === "expired"
                ? "Your Enrollment Invitation Has Expired"
                : reason === "already_active"
                ? "Your Family Advocacy Membership Is Active"
                : reason === "revoked"
                ? "Enrollment Offer Under Revision"
                : "Advocacy Plan Selection Under Review"}
            </h2>
            <p className="text-sm text-[#C6B697] max-w-lg mx-auto leading-relaxed">
              {enrollmentState?.message ||
                "Your lead advocate is reviewing your case discovery notes. You will receive an invitation as soon as family enrollment is authorized."}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => onNavigateTab("discovery-call")}
              variant="outline"
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-9"
            >
              <Compass className="h-4 w-4 mr-2 text-[#C5A059]" />
              Return to Discovery &amp; Schedule
            </Button>
            {reason === "already_active" && (
              <Button
                onClick={() => onNavigateTab("voyage-log")}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-5"
              >
                Go to Student Workspace
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // 3. Post-Activation State (Membership Active with Verified First Payment)
  if (activeOffer.status === "active" && activeOffer.paymentStatus === "paid") {
    const isDocReviewApproved = activeOffer.documentReviewStatus === "approved";

    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto animate-in fade-in duration-300">
        <Card className="rounded-2xl bg-[#05142B]/90 border border-emerald-500/40 p-8 shadow-[0_8px_24px_rgba(0,0,0,0.85)] text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
            <ShieldCheck className="h-9 w-9" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="text-xs uppercase tracking-wider border-emerald-400/50 text-emerald-300 bg-emerald-950/40">
              Active Member Verified
            </Badge>
            <h2 className="text-3xl font-serif font-bold text-[#FFF4D4]">
              Welcome to Waypoint Advocates
            </h2>
            <p className="text-sm text-[#C6B697] max-w-lg mx-auto leading-relaxed">
              Your family membership for the <strong className="text-white">{activeOffer.selectedPlanName}</strong> plan is fully active. All ongoing case protections, document tracking, and advocate representation are unlocked.
            </p>
          </div>

          {/* Post-Activation Onboarding Card */}
          <div className="p-5 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] max-w-lg mx-auto text-left space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C6B697]">Onboarding Status</span>
              <Badge variant="outline" className={cn(
                "text-[10px]",
                isDocReviewApproved 
                  ? "border-emerald-400/40 text-emerald-300 bg-emerald-950/30"
                  : "border-amber-400/40 text-amber-300 bg-amber-950/30"
              )}>
                {isDocReviewApproved ? "Document Review Complete" : "Documents Awaiting Review"}
              </Badge>
            </div>

            <div className="space-y-2 text-xs text-[#C6B697]">
              <div className="flex items-start gap-2.5">
                <UploadCloud className="h-4 w-4 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">1. Upload Initial Student Records</strong>
                  <span>Please upload your child's recent IEP, 504 plans, psychological evaluations, and school progress reports into Document Vault.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <Calendar className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">2. IEP Blueprint Strategy Session</strong>
                  {isDocReviewApproved ? (
                    <span className="text-emerald-300 font-medium">
                      ✓ Initial records reviewed by your lead advocate. You are now unlocked to schedule your IEP Blueprint session!
                    </span>
                  ) : (
                    <span className="text-amber-200/80">
                      Scheduling unlocks automatically once your assigned advocate completes their review of your uploaded documents.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isDocReviewApproved && (
              <Button
                onClick={() => onNavigateTab("appointments")}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#d5b36a] hover:to-[#917133] text-[#07162B] font-bold text-xs h-10 px-6 gap-2 shadow-[0_3px_10px_rgba(0,0,0,0.8)] cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                <span>Schedule Your IEP Blueprint Call</span>
              </Button>
            )}
            <Button
              onClick={() => onNavigateTab("upload-records")}
              variant={isDocReviewApproved ? "outline" : "default"}
              className={isDocReviewApproved
                ? "border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-10 px-5 gap-2 cursor-pointer"
                : "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-10 px-6 gap-2 shadow-[0_3px_10px_rgba(0,0,0,0.8)] cursor-pointer"
              }
            >
              <UploadCloud className="h-4 w-4" />
              <span>{isDocReviewApproved ? "Upload More Records" : "Upload Records to Vault"}</span>
            </Button>
            <Button
              onClick={() => onNavigateTab("agreements")}
              variant="outline"
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-10 px-5 gap-2 cursor-pointer"
            >
              <FileText className="h-4 w-4 text-[#C5A059]" />
              <span>View Executed Agreement</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 4. Payment Attention Required (Failed First Payment)
  if (activeOffer.status === "payment_attention" || activeOffer.paymentStatus === "failed") {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto animate-in fade-in duration-300">
        <Card className="rounded-2xl bg-[#05142B]/90 border border-rose-500/40 p-8 shadow-[0_8px_24px_rgba(0,0,0,0.85)] text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-rose-950/40 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-inner">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="text-xs uppercase tracking-wider border-rose-400/50 text-rose-300 bg-rose-950/40">
              Payment Attention Required
            </Badge>
            <h2 className="text-2xl font-serif font-bold text-[#FFF4D4]">
              First Payment Authorization Needed
            </h2>
            <p className="text-sm text-[#C6B697] max-w-lg mx-auto leading-relaxed">
              Your advocacy agreement for <strong className="text-white">{activeOffer.selectedPlanName}</strong> is securely signed and preserved. However, the initial card transaction could not be completed.
            </p>
          </div>

          {activeOffer.paymentAttentionReason && (
            <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30 max-w-md mx-auto text-xs text-rose-200">
              <strong>Decline Detail:</strong> {activeOffer.paymentAttentionReason}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={handleStartCheckout}
              disabled={checkoutMutation.isPending}
              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs h-10 px-6 gap-2 shadow-[0_0_20px_rgba(245,181,68,0.3)]"
            >
              <RefreshCw className={cn("h-4 w-4", checkoutMutation.isPending && "animate-spin")} />
              <span>{checkoutMutation.isPending ? "Connecting to Stripe..." : "Retry Secure Payment"}</span>
            </Button>
            <Button
              onClick={() => onNavigateTab("agreements")}
              variant="outline"
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-10 px-5 gap-2"
            >
              <FileText className="h-4 w-4" />
              <span>Review Signed Agreement</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 5. Agreement Signed & Awaiting First Payment
  const isAgreementSigned =
    activeOffer.status === "agreement_signed" ||
    activeOffer.status === "payment_pending" ||
    activeOffer.agreementStatus === "signed";

  if (isAgreementSigned) {
    const isManual = activeOffer.billingArrangement === "manual_invoice";
    const currentStructure = (activeOffer as any).paymentStructure || "monthly_autopay";
    const isPayInFull = currentStructure === "pay_in_full";
    const planPrice = Number(activeOffer.selectedPlanPrice) || 105;
    const payInFullFinal = quote?.payInFull?.finalAmount || (activeOffer as any).payInFullFinalAmount || (planPrice * 12).toFixed(2);
    const formattedPayInFull = Number(payInFullFinal).toLocaleString("en-US", {
      minimumFractionDigits: Number(payInFullFinal) % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });

    const hasPendingRevision = !!(activeOffer as any).hasPendingRevision;
    const pendingStructure = (activeOffer as any).pendingRevisionStructure || (isPayInFull ? "monthly_autopay" : "pay_in_full");
    const isPendingPayInFull = pendingStructure === "pay_in_full";

    // Phase 2F.1: Revision Pending State — Preserves original signed agreement while revision draft is pending
    if (hasPendingRevision) {
      return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto animate-in fade-in duration-300">
          <Card className="rounded-2xl bg-[#05142B]/90 border border-amber-500/40 p-8 shadow-[0_8px_24px_rgba(0,0,0,0.85)] text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
              <FileSignature className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="text-xs uppercase tracking-wider border-amber-400/50 text-amber-300 bg-amber-950/40 font-semibold px-3 py-0.5">
                  Revision Pending
                </Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#FFF4D4]">
                Payment Structure Revision Pending
              </h2>
              <p className="text-sm text-[#C6B697] max-w-xl mx-auto leading-relaxed">
                You requested to switch payment terms for <strong className="text-white">{activeOffer.selectedPlanName || "Advocacy Support Plan"}</strong> from{" "}
                <strong className="text-white">{isPayInFull ? "Pay in Full" : "Monthly Autopay"}</strong> to{" "}
                <strong className="text-amber-300">{isPendingPayInFull ? "Pay in Full" : "Monthly Autopay"}</strong>.
              </p>
            </div>

            {/* Comparison of Original Preserved Terms vs Revision Draft */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
              {/* Preserved Original Agreement */}
              <div className="p-4 rounded-xl bg-[#020A17]/90 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Current Signed Agreement</span>
                  <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-300 bg-emerald-950/40">
                    Signed &amp; Preserved
                  </Badge>
                </div>
                <div className="text-base font-serif font-bold text-[#FFF4D4]">
                  {isPayInFull ? `$${formattedPayInFull} in Full` : `$${planPrice}/month`}
                </div>
                <p className="text-[11px] text-[#A69371] leading-snug">
                  Legally binding executed agreement #{activeOffer.agreementId || ""}. Preserved in full effect until replacement is signed.
                </p>
              </div>

              {/* Pending Revision Draft */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Requested Revision</span>
                  <Badge variant="outline" className="text-[9px] border-amber-400/50 text-amber-300 bg-amber-950/40">
                    Awaiting E-Signature
                  </Badge>
                </div>
                <div className="text-base font-serif font-bold text-amber-200">
                  {isPendingPayInFull ? `$${formattedPayInFull} in Full` : `$${planPrice}/month`}
                </div>
                <p className="text-[11px] text-[#C6B697] leading-snug">
                  Draft agreement awaiting your e-signature. Checkout is temporarily paused until signed or cancelled.
                </p>
              </div>
            </div>

            {/* Information Banner */}
            <div className="p-3.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18] text-xs text-[#C6B697] max-w-xl mx-auto text-left space-y-1">
              <strong className="text-[#FFE394] block">How Revision Works:</strong>
              <p>
                • Your original signed agreement remains legally active until you execute the replacement.
              </p>
              <p>
                • Checkout against conflicting payment terms is held until the revision is signed.
              </p>
              <p>
                • You can cancel this revision at any time to return immediately to your original terms and checkout.
              </p>
            </div>

            {/* Revision Action Triggers */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => onNavigateTab("agreements")}
                className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs h-10 px-6 gap-2 shadow-[0_0_20px_rgba(245,181,68,0.3)] cursor-pointer"
              >
                <FileSignature className="h-4 w-4" />
                <span>Review &amp; Sign Revised Agreement</span>
              </Button>

              <Button
                onClick={() => {
                  cancelRevisionMutation.mutate({ offerId: activeOffer.id });
                }}
                disabled={cancelRevisionMutation.isPending}
                variant="outline"
                className="border-rose-500/40 bg-[#020A17] text-rose-200 hover:bg-rose-950/30 hover:border-rose-400 text-xs h-10 px-4 gap-1.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5 text-rose-400" />
                <span>{cancelRevisionMutation.isPending ? "Cancelling..." : "Cancel Revision & Keep Original Terms"}</span>
              </Button>

              <Button
                onClick={() => onNavigateTab("agreements")}
                variant="ghost"
                className="text-xs text-[#C6B697] hover:text-white h-10 px-3 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                <span>View Original Agreement</span>
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto animate-in fade-in duration-300">
        <Card className="rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] p-8 shadow-[0_8px_24px_rgba(0,0,0,0.85)] text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
            <FileCheck className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="text-xs uppercase tracking-wider border-emerald-400/40 text-emerald-300 bg-emerald-950/40">
              Agreement Executed • Step 2 of 2: Payment
            </Badge>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#FFF4D4]">
              Complete Your Enrollment Payment
            </h2>
            <p className="text-sm text-[#C6B697] max-w-xl mx-auto leading-relaxed">
              Your advocacy agreement for <strong className="text-white">{activeOffer.selectedPlanName || "Advocacy Support Plan"}</strong> has been signed and securely filed.
            </p>
          </div>

          {/* Selected Terms Card */}
          <div className="p-5 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] max-w-md mx-auto text-left space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C6B697]">Selected Payment Terms</span>
              <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-300 bg-amber-950/30">
                {isPayInFull ? "Pay in Full" : "Monthly Autopay"}
              </Badge>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-[#C6B697]">Amount Due Now:</span>
              <span className="text-xl font-serif font-bold text-[#FFE394]">
                {isPayInFull ? `$${formattedPayInFull} in Full` : `$${planPrice}/month`}
              </span>
            </div>
            <p className="text-[11px] text-[#A69371] leading-relaxed">
              {isPayInFull
                ? "Single upfront payment for the complete contractual term with zero automatic recurring charges."
                : `Automatic monthly card billing of $${planPrice}/mo across the contractual commitment.`}
            </p>
          </div>

          {/* Primary and Secondary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!isManual ? (
              <Button
                onClick={handleStartCheckout}
                disabled={checkoutMutation.isPending}
                className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs h-10 px-6 gap-2 shadow-[0_0_20px_rgba(245,181,68,0.3)] cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                <span>
                  {checkoutMutation.isPending
                    ? "Connecting to Stripe..."
                    : isPayInFull
                    ? `Proceed to Stripe Checkout — $${formattedPayInFull} in Full`
                    : `Proceed to Stripe Checkout — $${planPrice}/mo`}
                </span>
              </Button>
            ) : (
              <div className="text-xs text-sky-300">
                Manual Invoicing Arrangement Active. Awaiting staff receipt verification.
              </div>
            )}

            {/* Correction C: Change Payment Structure Action */}
            <Button
              onClick={() => setIsChangeStructureOpen(true)}
              variant="outline"
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-10 px-4 gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>Change Payment Structure</span>
            </Button>

            <Button
              onClick={() => onNavigateTab("agreements")}
              variant="ghost"
              className="text-xs text-[#C6B697] hover:text-white h-10 px-3 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              <span>View Signed Agreement</span>
            </Button>
          </div>

          {/* Change Payment Structure Dialog */}
          <Dialog open={isChangeStructureOpen} onOpenChange={setIsChangeStructureOpen}>
            <DialogContent className="bg-[#05142B] border border-[#3A2C18] text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-lg text-[#FFF4D4]">
                  Change Payment Structure
                </DialogTitle>
                <DialogDescription className="text-xs text-[#C6B697] pt-2 leading-relaxed">
                  You are currently enrolled under{" "}
                  <strong className="text-white">{isPayInFull ? "Pay in Full" : "Monthly Autopay"}</strong>.
                  Switching to <strong className="text-[#FFE394]">{isPayInFull ? "Monthly Autopay" : "Pay in Full"}</strong> requires a revised agreement to be generated.
                </DialogDescription>
              </DialogHeader>

              <div className="p-3.5 rounded-lg bg-[#020A17] border border-amber-500/30 text-xs text-amber-200/90 space-y-1.5 text-left">
                <strong className="text-amber-300 block">Agreement Revision Notice:</strong>
                <p>
                  • Your original signed agreement will be securely preserved in your compliance history.
                </p>
                <p>
                  • A revised agreement reflecting {isPayInFull ? `Monthly Autopay ($${planPrice}/mo)` : `Pay in Full ($${formattedPayInFull})`} will be generated.
                </p>
                <p>
                  • You must review and e-sign the revised agreement before continuing to checkout.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangeStructureOpen(false)}
                  className="border-[#3A2C18] bg-[#020A17] text-white hover:bg-[#07162B] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={requestRevisionMutation.isPending}
                  onClick={() => {
                    const targetStructure = isPayInFull ? "monthly_autopay" : "pay_in_full";
                    requestRevisionMutation.mutate({
                      offerId: activeOffer.id,
                      newPaymentStructure: targetStructure,
                    });
                  }}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs"
                >
                  {requestRevisionMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      <span>Generating Revision...</span>
                    </>
                  ) : (
                    <span>Switch to {isPayInFull ? "Monthly Autopay" : "Pay in Full"}</span>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      </div>
    );
  }

  // 4. Plan Selection Experience
  const isCustomMode = activeOffer.enrollmentMode === "custom";

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="border-b border-[#3A2C18] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#DFBE77]/10 via-[#C5A059]/20 to-[#9E7D3B]/10 text-[#FFE394] text-xs font-semibold mb-3 border border-[#C5A059]/30">
          <ShieldCheck className="h-3.5 w-3.5 text-[#C5A059]" />
          <span>Parent Portal Enrollment • Step 1 of 2</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#FFF4D4]">
          {isCustomMode
            ? "Your Authorized Custom Advocacy Plan"
            : "Select Your Family Advocacy Plan"}
        </h1>
        <p className="text-sm text-[#C6B697] mt-1.5 leading-relaxed">
          {isCustomMode
            ? "Review your custom advocacy terms authorized by Lead Advocate Byron Honea."
            : "Choose the membership plan that best fits your student's representation needs. All standard plans have a 12-month commitment."}
        </p>
      </div>

      {/* Plan Selection Cards */}
      <div className="space-y-4">
        {isCustomMode ? (
          /* Custom Plan View: ONLY shows the authorized custom offer */
          <div className="max-w-xl mx-auto">
            {availablePlans.map((plan: any) => {
              const isSelected = selectedPlanKey === plan.planKey;
              return (
                <Card
                  key={plan.planKey}
                  onClick={() => setSelectedPlanKey(plan.planKey)}
                  className={cn(
                    "p-6 rounded-2xl border transition-all cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.85)]",
                    isSelected
                      ? "border-[#C5A059] bg-[#05142B]/95 ring-2 ring-[#C5A059]/50"
                      : "border-[#3A2C18] bg-[#05142B]/80 hover:border-[#C5A059]/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs uppercase tracking-wider border-[#C5A059]/40 text-[#FFE394] bg-[#020A17]">
                      Authorized Custom Terms
                    </Badge>
                    <CheckCircle2 className="h-5 w-5 text-[#C5A059]" />
                  </div>

                  <div className="mt-4">
                    <h3 className="font-serif font-bold text-xl text-white">{plan.planName}</h3>
                    <div className="text-3xl font-serif font-bold text-[#FFE394] mt-2">
                      ${plan.priceMonthly}{" "}
                      <span className="text-xs font-sans font-normal text-[#C6B697]">
                        / {plan.billingFrequency || "month"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#C6B697] mt-3 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="mt-5 pt-4 border-t border-[#3A2C18]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#A69371] mb-2">
                      Authorized Inclusions &amp; Schedule
                    </div>
                    <ul className="space-y-2 text-xs text-[#D8C7A5]">
                      {plan.features.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Standard Plans: Exactly the 3 published plans, NONE preselected */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {availablePlans.map((plan: any) => {
              const isSelected = selectedPlanKey === plan.planKey;
              return (
                <Card
                  key={plan.planKey}
                  onClick={() => setSelectedPlanKey(plan.planKey)}
                  className={cn(
                    "p-5 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all shadow-[0_8px_24px_rgba(0,0,0,0.85)]",
                    isSelected
                      ? "border-[#C5A059] bg-[#05142B]/95 ring-2 ring-[#C5A059]/60 shadow-[0_0_20px_rgba(197,160,89,0.25)]"
                      : "border-[#3A2C18] bg-[#05142B]/75 hover:border-[#C5A059]/40 hover:bg-[#05142B]/90"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase font-bold tracking-wider",
                          isSelected
                            ? "border-[#FFE394]/60 text-[#FFE394] bg-[#C5A059]/20"
                            : "border-[#3A2C18] text-[#C6B697] bg-[#020A17]"
                        )}
                      >
                        {plan.commitmentMonths}-Month Plan
                      </Badge>
                      {isSelected ? (
                        <CheckCircle2 className="h-5 w-5 text-[#FFE394]" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-white/20" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-serif font-bold text-lg text-white">{plan.planName}</h3>
                      <div className="text-2xl font-serif font-bold text-[#FFE394] mt-1.5">
                        ${plan.priceMonthly}{" "}
                        <span className="text-xs font-sans font-normal text-[#C6B697]">/ month</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#C6B697] leading-relaxed min-h-[36px]">
                      {plan.description}
                    </p>

                    <div className="pt-3 border-t border-[#3A2C18]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#A69371] mb-2">
                        Included Services
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-[#D8C7A5]">
                        {plan.features.map((feat: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#3A2C18]/60">
                    <Button
                      type="button"
                      size="sm"
                      className={cn(
                        "w-full text-xs font-bold rounded-lg transition-all",
                        isSelected
                          ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                          : "border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4]"
                      )}
                    >
                      {isSelected ? "Selected" : `Choose ${plan.planName}`}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Correction A: Payment Choice Before Agreement Generation */}
      {selectedPlanKey && (() => {
        const selectedPlanObj = availablePlans.find((p: any) => p.planKey === selectedPlanKey);
        const currentPriceMonthly = selectedPlanObj?.priceMonthly || (activeOffer?.selectedPlanPrice ? Number(activeOffer.selectedPlanPrice) : 105);
        const currentCommitmentMonths = selectedPlanObj?.commitmentMonths || activeOffer?.customCommitmentMonths || 12;

        const currentMonthlyCents = Math.round(currentPriceMonthly * 100);
        const currentOriginalCents = currentMonthlyCents * currentCommitmentMonths;
        const currentOriginalTotal = (currentOriginalCents / 100).toFixed(2);

        const currentDiscountType = (activeOffer as any)?.payInFullDiscountType || "none";
        const currentDiscountValue = Number((activeOffer as any)?.payInFullDiscountValue || 0);

        let currentDiscountCents = 0;
        if (currentDiscountType === "percentage" && currentDiscountValue > 0) {
          currentDiscountCents = Math.round(currentOriginalCents * (currentDiscountValue / 100));
        } else if (currentDiscountType === "fixed_amount" && currentDiscountValue > 0) {
          currentDiscountCents = Math.round(currentDiscountValue * 100);
        }
        currentDiscountCents = Math.max(0, Math.min(currentDiscountCents, currentOriginalCents));

        const currentDiscountTotal = (currentDiscountCents / 100).toFixed(2);
        const currentFinalCents = currentOriginalCents - currentDiscountCents;
        const currentFinalTotal = (currentFinalCents / 100).toFixed(2);
        const currentHasDiscount = currentDiscountCents > 0;

        const formattedPayInFullFinal = Number(currentFinalTotal).toLocaleString("en-US", {
          minimumFractionDigits: Number(currentFinalTotal) % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        });
        const formattedPayInFullOriginal = Number(currentOriginalTotal).toLocaleString("en-US", {
          minimumFractionDigits: Number(currentOriginalTotal) % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        });

        return (
          <div className="space-y-4 pt-4 border-t border-[#3A2C18] animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-xl font-serif font-bold text-[#FFF4D4]">
                Choose How You'd Like to Pay
              </h2>
              <p className="text-xs text-[#C6B697]">
                Select your preferred payment structure. Your Advocacy Services Agreement will be generated with these exact terms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: PAY MONTHLY */}
              <div
                onClick={() => setSelectedPaymentStructure("monthly_autopay")}
                className={cn(
                  "p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-4",
                  selectedPaymentStructure === "monthly_autopay"
                    ? "bg-[#091b35] border-amber-400/90 shadow-[0_0_20px_rgba(245,181,68,0.2)] ring-1 ring-amber-400/50"
                    : "bg-[#020A17]/80 border-[#3A2C18] hover:border-white/30"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      PAY MONTHLY
                    </span>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center",
                        selectedPaymentStructure === "monthly_autopay"
                          ? "border-amber-400 bg-amber-400"
                          : "border-white/40"
                      )}
                    >
                      {selectedPaymentStructure === "monthly_autopay" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-white font-semibold">Automatic monthly payments.</p>
                  <div className="pt-1">
                    <span className="text-2xl font-extrabold text-[#FFE394]">${currentPriceMonthly}</span>
                    <span className="text-xs text-[#C6B697] font-medium"> / month</span>
                  </div>
                  <p className="text-xs text-[#C6B697] leading-relaxed">
                    Convenient recurring monthly billing throughout the {currentCommitmentMonths}-month contractual commitment (${(currentPriceMonthly * currentCommitmentMonths).toLocaleString("en-US")} total commitment).
                  </p>
                </div>
                <div className="pt-3 border-t border-white/10 text-[11px] text-[#A69371] flex items-center justify-between">
                  <span>Due Today:</span>
                  <span className="text-emerald-400 font-bold text-xs">${currentPriceMonthly}.00</span>
                </div>
              </div>

              {/* Option 2: PAY IN FULL */}
              <div
                onClick={() => setSelectedPaymentStructure("pay_in_full")}
                className={cn(
                  "p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-4",
                  selectedPaymentStructure === "pay_in_full"
                    ? "bg-[#091b35] border-amber-400/90 shadow-[0_0_20px_rgba(245,181,68,0.2)] ring-1 ring-amber-400/50"
                    : "bg-[#020A17]/80 border-[#3A2C18] hover:border-white/30"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      PAY IN FULL
                    </span>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center",
                        selectedPaymentStructure === "pay_in_full"
                          ? "border-amber-400 bg-amber-400"
                          : "border-white/40"
                      )}
                    >
                      {selectedPaymentStructure === "pay_in_full" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-white font-semibold">One payment covering the approved commitment.</p>
                  <div className="pt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-[#FFE394]">
                      ${formattedPayInFullFinal}
                    </span>
                    <span className="text-xs text-[#C6B697] font-medium"> in Full</span>
                    {currentHasDiscount && (
                      <span className="text-xs line-through text-white/40">
                        ${formattedPayInFullOriginal}
                      </span>
                    )}
                  </div>
                  {currentHasDiscount ? (
                    <Badge className="bg-emerald-950/60 border-emerald-500/50 text-emerald-300 text-[10px]">
                      Authorized Discount Applied: -${Number(currentDiscountTotal).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </Badge>
                  ) : (
                    <p className="text-xs text-[#C6B697] leading-relaxed">
                      Prepaid coverage for the entire {currentCommitmentMonths}-month advocacy term. Zero automatic recurring monthly billing.
                    </p>
                  )}
                </div>
                <div className="pt-3 border-t border-white/10 text-[11px] text-[#A69371] flex items-center justify-between">
                  <span>Due Today (Full Term):</span>
                  <span className="text-emerald-400 font-bold text-xs">${formattedPayInFullFinal}</span>
                </div>
              </div>
            </div>

            {/* Flexible Financing Information Box */}
            <div className="p-4 rounded-xl bg-[#020A17]/70 border border-[#3A2C18] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FFE394]">
                <CreditCard className="h-4 w-4 text-amber-400" />
                <span>FLEXIBLE THIRD-PARTY FINANCING</span>
              </div>
              <p className="text-xs text-[#C6B697] leading-relaxed">
                Eligible Klarna, Affirm, or Afterpay financing options may be available through Stripe Checkout for Pay-in-Full payments. Financing is provided by independent third parties and is subject to eligibility and provider credit terms. Financing approval is not guaranteed.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Plan Confirmation & Agreement CTA */}
      <div className="pt-4 border-t border-[#3A2C18] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-[#C6B697] text-center sm:text-left">
          {selectedPlanKey ? (
            selectedPaymentStructure ? (
              <p>
                Selected:{" "}
                <strong className="text-white">
                  {availablePlans.find((p: any) => p.planKey === selectedPlanKey)?.planName || selectedPlanKey}
                </strong>{" "}
                ({selectedPaymentStructure === "pay_in_full" ? "Pay in Full" : "Monthly Autopay"}) • Agreement will be generated for electronic review and signature.
              </p>
            ) : (
              <p className="text-amber-300">
                Please choose how you'd like to pay (Pay Monthly or Pay in Full) to continue.
              </p>
            )
          ) : (
            <p className="text-amber-300">
              Please choose a plan to generate your Advocacy Services Agreement.
            </p>
          )}
        </div>

        {(() => {
          const selectedPlanObj = availablePlans.find((p: any) => p.planKey === selectedPlanKey);
          const currentPriceMonthly = selectedPlanObj?.priceMonthly || (activeOffer?.selectedPlanPrice ? Number(activeOffer.selectedPlanPrice) : 105);
          const currentCommitmentMonths = selectedPlanObj?.commitmentMonths || activeOffer?.customCommitmentMonths || 12;
          const currentMonthlyCents = Math.round(currentPriceMonthly * 100);
          const currentOriginalCents = currentMonthlyCents * currentCommitmentMonths;
          const currentDiscountType = (activeOffer as any)?.payInFullDiscountType || "none";
          const currentDiscountValue = Number((activeOffer as any)?.payInFullDiscountValue || 0);

          let currentDiscountCents = 0;
          if (currentDiscountType === "percentage" && currentDiscountValue > 0) {
            currentDiscountCents = Math.round(currentOriginalCents * (currentDiscountValue / 100));
          } else if (currentDiscountType === "fixed_amount" && currentDiscountValue > 0) {
            currentDiscountCents = Math.round(currentDiscountValue * 100);
          }
          currentDiscountCents = Math.max(0, Math.min(currentDiscountCents, currentOriginalCents));
          const currentFinalCents = currentOriginalCents - currentDiscountCents;
          const formattedPayInFullFinal = Number((currentFinalCents / 100).toFixed(2)).toLocaleString("en-US", {
            minimumFractionDigits: (currentFinalCents % 100 === 0) ? 0 : 2,
            maximumFractionDigits: 2,
          });

          const getPrimaryButtonLabel = () => {
            if (selectPlanMutation.isPending) return "Generating Agreement...";
            if (!selectedPlanKey) return "Select an Advocacy Plan";
            if (!selectedPaymentStructure) return "Choose Payment Option to Continue";
            if (selectedPaymentStructure === "monthly_autopay") {
              return `Review Agreement — $${currentPriceMonthly}/month`;
            }
            return `Review Agreement — $${formattedPayInFullFinal} in Full`;
          };

          const isActionDisabled = !selectedPlanKey || !selectedPaymentStructure || selectPlanMutation.isPending;

          return (
            <Button
              onClick={handleSelectAndProceed}
              disabled={isActionDisabled}
              className={cn(
                "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] text-xs h-10 px-6 gap-2 shrink-0 transition-all",
                isActionDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {selectPlanMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating Agreement...</span>
                </>
              ) : (
                <>
                  <span>{getPrimaryButtonLabel()}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          );
        })()}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Check,
  AlertTriangle,
  Pause,
  FileText,
  ChevronDown,
  Clock,
  Eye,
  Radio,
  Settings,
  ArrowRight,
  Compass,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { canGuideClientsLive } from "@/lib/guidancePermissions";
import { GuideClientLiveModal } from "@/components/guidance/GuideClientLiveModal";
import { ManagePortalAccessModal } from "@/components/guidance/ManagePortalAccessModal";
import { OnboardingChoiceModal } from "./dialogs/OnboardingChoiceModal";
import { ReviewPauseModal } from "./dialogs/ReviewPauseModal";
import { ResolvePaymentModal } from "./dialogs/ResolvePaymentModal";
import { RenewalModal } from "./dialogs/RenewalModal";
import { OffboardingModal } from "./dialogs/OffboardingModal";

// Modular Lower Panel Cards
import { PaymentAttentionCard } from "./cards/PaymentAttentionCard";
import { ServicesPausedCard } from "./cards/ServicesPausedCard";
import { ActiveSnapshotCard } from "./cards/ActiveSnapshotCard";
import { RenewalRoadmapCard } from "./cards/RenewalRoadmapCard";
import { OffboardingRoadmapCard } from "./cards/OffboardingRoadmapCard";
import { DiscoveryRoadmapCard } from "./cards/DiscoveryRoadmapCard";
import { OnboardingRoadmapCard } from "./cards/OnboardingRoadmapCard";
import { getQuickApplyPayload } from "@/lib/journeyStateHelpers";

interface ClientJourneyCardProps {
  contact: any;
  contactId: number;
  compass?: any;
  nextAppointment?: any;
  onNavigateToTab?: (tab: string) => void;
  onOpenDiscoveryCall?: () => void;
  onStateChange?: (payload: any) => void;
  parentContact?: any;
  onPreviewPortal?: () => void;
}

export function ClientJourneyCard({
  contact,
  contactId,
  compass,
  nextAppointment,
  onNavigateToTab,
  onOpenDiscoveryCall,
  onStateChange,
  parentContact,
  onPreviewPortal,
}: ClientJourneyCardProps) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const updateJourney = trpc.contacts.updateJourneyState.useMutation();

  const { user } = useAuth();
  const canGuideLive = canGuideClientsLive(user);
  const [showGuideLiveModal, setShowGuideLiveModal] = useState(false);
  const [showManageAccessModal, setShowManageAccessModal] = useState(false);

  // Dialog open states
  const [showOnboardingChoice, setShowOnboardingChoice] = useState(false);
  const [showReviewPause, setShowReviewPause] = useState(false);
  const [showResolvePayment, setShowResolvePayment] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showOffboardingModal, setShowOffboardingModal] = useState(false);

  // Optimistic state for 0ms instantaneous state switching
  const [optimisticState, setOptimisticState] = useState<any>(null);

  // Clear optimistic state when contact prop genuinely updates
  useEffect(() => {
    setOptimisticState(null);
  }, [contact?.lifecycleStage, contact?.operationalState]);

  const activeContact = { ...contact, ...(optimisticState || {}) };

  const handleOpenClientView = () => {
    if (onPreviewPortal) {
      onPreviewPortal();
    } else {
      const parentId = parentContact?.id || activeContact?.parentContactId;
      const url = `/portal?preview=true&contactId=${contactId}${parentId ? `&parentContactId=${parentId}` : ""}`;
      window.open(url, "_blank");
    }
  };

  // Derive active states from activeContact
  const lifecycleStage = (activeContact?.lifecycleStage || "Active") as
    | "Discovery"
    | "Onboarding"
    | "Active"
    | "Renewal"
    | "Offboarding"
    | "Closed";

  const operationalState = (activeContact?.operationalState || "Normal") as
    | "Normal"
    | "Scholarship Pending"
    | "Services Paused"
    | "Payment Attention"
    | "Grace Period"
    | "Renewal Due"
    | "Offboarding"
    | "Pending Closeout";

  const isPaymentAttention =
    operationalState === "Payment Attention" || activeContact?.billingStatus === "Payment Failed";

  const isServicesPaused =
    operationalState === "Services Paused" || activeContact?.serviceStatus === "Paused";

  const isRenewal = lifecycleStage === "Renewal" || operationalState === "Renewal Due";
  const isOffboarding = lifecycleStage === "Offboarding" || operationalState === "Pending Closeout";
  const isDiscovery = lifecycleStage === "Discovery";
  const isOnboarding = lifecycleStage === "Onboarding";
  const isNormalActive =
    lifecycleStage === "Active" && !isPaymentAttention && !isServicesPaused;

  // Single Quick-Switch Handler with 0ms optimistic UI update + D1 persist
  const handleQuickApply = async (stateKey: string) => {
    const payload = getQuickApplyPayload(stateKey, activeContact);

    // 1. Instantaneous optimistic update in 0ms (local + parent sync)
    setOptimisticState(payload);
    onStateChange?.(payload);
    const friendlyName =
      payload.operationalState && payload.operationalState !== "Normal"
        ? payload.operationalState
        : payload.lifecycleStage;
    toast.success(`Switched to ${friendlyName}`);

    // 2. Persist to live Cloudflare D1
    try {
      await updateJourney.mutateAsync({
        id: contactId,
        ...payload,
        reason: `Manager stage switch to ${friendlyName}`,
      });
      await utils.contacts.detail.invalidate({ id: contactId });
      await utils.contacts.list.invalidate();
    } catch (e: any) {
      console.warn("[ClientJourneyCard] State sync notice:", e);
      toast.error("State sync notice: " + (e?.message || e));
    }
  };

  // Derive primary button details
  let eyebrowLabel = "NEXT STEP";
  let eyebrowColor = "text-[#38BDF8]";
  let primaryButtonText = "Review Case Workspace";
  let primaryButtonIcon = <FileText className="h-4.5 w-4.5 shrink-0" />;
  let primaryButtonBg = "bg-[#F5B544] hover:bg-[#F5B544]/90 text-[#07162B]";
  let primaryButtonHelper = "Open case documents and goals";
  let onPrimaryActionClick = () => onNavigateToTab?.("workspace");

  if (isPaymentAttention) {
    eyebrowLabel = "NEEDS ATTENTION";
    eyebrowColor = "text-[#FF2D55]";
    primaryButtonText = "Resolve Payment Issue";
    primaryButtonIcon = <AlertTriangle className="h-4.5 w-4.5 text-white shrink-0 fill-white/20" />;
    primaryButtonBg = "bg-[#E11D48] hover:bg-[#F43F5E] text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]";
    primaryButtonHelper = "Review billing and contact the family";
    onPrimaryActionClick = () => setShowResolvePayment(true);
  } else if (isServicesPaused) {
    eyebrowLabel = "NEXT STEP";
    eyebrowColor = "text-[#38BDF8]";
    primaryButtonText = "Review Pause";
    primaryButtonIcon = <Pause className="h-4.5 w-4.5 text-white shrink-0 fill-white/20" />;
    primaryButtonBg = "bg-[#8B5CF6] hover:bg-[#9333EA] text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]";
    primaryButtonHelper = "View terms, dates, and return plan";
    onPrimaryActionClick = () => setShowReviewPause(true);
  } else if (isRenewal) {
    eyebrowLabel = "NEXT STEP";
    eyebrowColor = "text-[#38BDF8]";
    primaryButtonText = "Start Renewal";
    primaryButtonIcon = <FileText className="h-4.5 w-4.5 text-[#07162B] shrink-0" />;
    primaryButtonBg = "bg-[#F5B544] hover:bg-[#F5B544]/90 text-[#07162B]";
    primaryButtonHelper = "Review plan and send renewal form";
    onPrimaryActionClick = () => setShowRenewalModal(true);
  } else if (isOffboarding) {
    eyebrowLabel = "NEXT STEP";
    eyebrowColor = "text-[#38BDF8]";
    primaryButtonText = "Start Offboarding";
    primaryButtonIcon = <FileText className="h-4.5 w-4.5 text-[#07162B] shrink-0" />;
    primaryButtonBg = "bg-[#F5B544] hover:bg-[#F5B544]/90 text-[#07162B]";
    primaryButtonHelper = "Review reason and begin guided closeout";
    onPrimaryActionClick = () => setShowOffboardingModal(true);
  } else if (isDiscovery) {
    eyebrowLabel = "NEXT STEP";
    eyebrowColor = "text-[#38BDF8]";
    primaryButtonText = "Start Discovery Call";
    primaryButtonIcon = <FileText className="h-4.5 w-4.5 text-[#07162B] shrink-0" />;
    primaryButtonBg = "bg-[#F5B544] hover:bg-[#F5B544]/90 text-[#07162B]";
    primaryButtonHelper = "Open the guided call checklist";
    onPrimaryActionClick = () => {
      if (onOpenDiscoveryCall) {
        onOpenDiscoveryCall();
      } else {
        toast.info("Opening Discovery Call checklist...");
      }
    };
  } else if (isOnboarding) {
    eyebrowLabel = "NEXT STEP";
    eyebrowColor = "text-[#38BDF8]";
    primaryButtonText = "Continue Onboarding";
    primaryButtonIcon = <FileText className="h-4.5 w-4.5 text-[#07162B] shrink-0" />;
    primaryButtonBg = "bg-[#F5B544] hover:bg-[#F5B544]/90 text-[#07162B]";
    primaryButtonHelper = "Collect educational records & notify school";
    onPrimaryActionClick = () => setShowOnboardingChoice(true);
  } else if (activeContact?.currentPrimaryAction) {
    primaryButtonText = activeContact.currentPrimaryAction;
    primaryButtonHelper = activeContact?.currentActionHelperText || "Due today • Uploaded by parent";
    onPrimaryActionClick = () => {
      if (activeContact?.currentActionDestination === "comparator") {
        setLocation(`/tools/iep-comparator?studentId=${contactId}`);
      } else if (activeContact?.currentActionDestination === "files") {
        onNavigateToTab?.("files");
      } else {
        setLocation(`/tools/iep-comparator?studentId=${contactId}`);
      }
    };
  }

  // Derive Left Subtitle
  let subtitleHeadline = "Services active";
  let subtitleDetail = `Renewal due ${activeContact?.renewalDate || "March 15, 2027"}`;

  if (isPaymentAttention) {
    subtitleHeadline = "Payment attempt unsuccessful";
    subtitleDetail = `Failed ${activeContact?.paymentFailureDate || "September 19, 2026"} • Automatic retry ${activeContact?.nextRetryDate || "September 22"}`;
  } else if (isServicesPaused) {
    subtitleHeadline = "Services temporarily paused";
    subtitleDetail = `${activeContact?.pauseReason || "Residential placement"} • Review ${activeContact?.pauseReviewDate || "January 15, 2027"}`;
  } else if (isRenewal) {
    subtitleHeadline = `Renewal due in ${activeContact?.renewalDaysRemaining || 14} days`;
    subtitleDetail = `Current term ends ${activeContact?.renewalDate || "March 15, 2027"}`;
  } else if (isOffboarding) {
    subtitleHeadline = "Offboarding requested";
    subtitleDetail = "Services remain active until final confirmation";
  } else if (isDiscovery) {
    subtitleHeadline = "Discovery call scheduled";
    subtitleDetail = "Thursday, September 24 • 10:00 AM";
  } else if (isOnboarding) {
    subtitleHeadline = "Onboarding in progress";
    subtitleDetail = `${activeContact?.journeyProgress || 3} of ${activeContact?.journeyTotalSteps || 6} steps complete`;
  }

  // Stepper state indicator
  const getStepStatus = (stepIndex: number) => {
    if (isDiscovery) return stepIndex === 1 ? "current" : "future";
    if (isOnboarding) return stepIndex === 1 ? "completed" : stepIndex === 2 ? "current" : "future";
    if (isNormalActive || isServicesPaused || isPaymentAttention) {
      return stepIndex <= 2 ? "completed" : stepIndex === 3 ? "current" : "future";
    }
    if (isRenewal) return stepIndex <= 3 ? "completed" : stepIndex === 4 ? "current" : "future";
    if (isOffboarding) return stepIndex <= 4 ? "completed" : stepIndex === 5 ? "current" : "future";
    return "completed";
  };

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────
          PANEL 1: CLIENT JOURNEY (Timeline + Single Primary Action)
      ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#071A38] via-[#092248] to-[#071A38] border border-[#0E356A] py-2 px-3.5 sm:py-2.5 sm:px-4.5 shadow-xl relative overflow-hidden">
        {/* Ambient Glows */}
        {isPaymentAttention && (
          <div className="absolute -top-10 -right-10 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        )}
        {isServicesPaused && (
          <div className="absolute -top-10 -right-10 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        )}
        {!isPaymentAttention && !isServicesPaused && (
          <div className="absolute -top-10 -right-10 w-80 h-80 bg-[#F5B544]/10 rounded-full blur-3xl pointer-events-none" />
        )}

        {/* Header Bar: Title + Quick State Switcher */}
        <div className="flex items-center justify-between mb-1.5 relative z-10 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-slate-200">
              CLIENT JOURNEY
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-[#38BDF8] hover:text-sky-300 bg-[#0A1D38] border border-[#0E356A] hover:border-[#38BDF8]/60 px-2.5 py-0.5 rounded-lg transition-all cursor-pointer shadow-xs"
                  title="Quick switch student journey & operational state"
                >
                  <span>
                    {isPaymentAttention
                      ? "Payment Attention"
                      : isServicesPaused
                      ? "Services Paused"
                      : isRenewal
                      ? "Renewal Due"
                      : isOffboarding
                      ? "Offboarding"
                      : lifecycleStage}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-[#07162B] border-[#0E356A] text-slate-200 w-64 shadow-2xl p-1.5 z-50">
                {/* 1. Discovery */}
                <DropdownMenuItem onSelect={() => handleQuickApply("discovery")} onClick={() => handleQuickApply("discovery")} className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sky-200">Discovery Stage</span>
                    <span className="text-[10px] text-slate-400">Clarity call roadmap</span>
                  </div>
                </DropdownMenuItem>
                {/* 2. Onboarding */}
                <DropdownMenuItem onSelect={() => handleQuickApply("onboarding")} onClick={() => handleQuickApply("onboarding")} className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-emerald-200">Onboarding Stage</span>
                    <span className="text-[10px] text-slate-400">3 of 6 steps complete</span>
                  </div>
                </DropdownMenuItem>
                {/* 3. Active */}
                <DropdownMenuItem onSelect={() => handleQuickApply("active")} onClick={() => handleQuickApply("active")} className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5B544] shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-white">Active (Normal)</span>
                    <span className="text-[10px] text-slate-400">Services active · Priority task</span>
                  </div>
                </DropdownMenuItem>
                {/* 4. Payment Attention */}
                <DropdownMenuItem onSelect={() => handleQuickApply("payment")} onClick={() => handleQuickApply("payment")} className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D55] shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-rose-300">Payment Attention</span>
                    <span className="text-[10px] text-slate-400">$55 due · Retry Sep 22</span>
                  </div>
                </DropdownMenuItem>
                {/* 5. Paused */}
                <DropdownMenuItem onSelect={() => handleQuickApply("paused")} onClick={() => handleQuickApply("paused")} className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-purple-300">Services Paused</span>
                    <span className="text-[10px] text-slate-400">Residential · Time preserved</span>
                  </div>
                </DropdownMenuItem>
                {/* 6. Renewal */}
                <DropdownMenuItem onSelect={() => handleQuickApply("renewal")} onClick={() => handleQuickApply("renewal")} className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-indigo-200">Renewal Due</span>
                    <span className="text-[10px] text-slate-400">14 days remaining</span>
                  </div>
                </DropdownMenuItem>
                {/* 7. Offboarding */}
                <DropdownMenuItem onSelect={() => handleQuickApply("offboarding")} onClick={() => handleQuickApply("offboarding")} className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5B544] shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-amber-200">Offboarding</span>
                    <span className="text-[10px] text-slate-400">Services active until confirmed</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Grid: Left Timeline (7 cols) + Right Primary Action (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start relative z-10">
          {/* LEFT 7 COLS: Timeline Stepper & Subtitle */}
          <div className="lg:col-span-7 space-y-1.5">
            {/* 5-Stage Continuous Stepper with Seamless Connecting Line */}
            <div className="grid grid-cols-5 w-full relative">
              {/* 1. Continuous Background Track connecting all 5 dots from center of dot 1 (10%) to center of dot 5 (90%) */}
              <div className="absolute top-5 -translate-y-1/2 left-[10%] right-[10%] h-[2.5px] bg-[#0E356A] pointer-events-none rounded-full" />

              {/* 2. Active Glowing Cyan Track connecting from dot 1 through the active stage dot */}
              <div
                className="absolute top-5 -translate-y-1/2 left-[10%] h-[2.5px] bg-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.8)] rounded-full transition-all duration-300 pointer-events-none z-0"
                style={{
                  width:
                    isOffboarding
                      ? "80%"
                      : isRenewal
                      ? "60%"
                      : isNormalActive || isServicesPaused || isPaymentAttention
                      ? "40%"
                      : isOnboarding
                      ? "20%"
                      : "0%",
                }}
              />

              {/* STAGE 1: Discovery (Center at 10%) */}
              <div className="flex flex-col items-center relative z-10 text-center">
                {(() => {
                  const status = getStepStatus(1);
                  const isDone = status === "completed";
                  const isCurr = status === "current";
                  return (
                    <button
                      type="button"
                      onClick={() => handleQuickApply("discovery")}
                      className="flex flex-col items-center gap-2 group cursor-pointer text-center focus:outline-hidden"
                      title="Click to switch to Discovery stage"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${
                          isDone
                            ? "bg-[#07162B] border-2 border-[#00E5FF] shadow-[0_0_14px_rgba(0,229,255,0.4)] text-[#00E5FF]"
                            : isCurr
                            ? "bg-[#07162B] border-2 border-[#F5B544] shadow-[0_0_14px_rgba(245,181,68,0.4)] text-[#F5B544]"
                            : "bg-[#07162B] border-2 border-slate-700 text-slate-500 font-mono text-xs group-hover:border-slate-500"
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-5 w-5 stroke-[2.5]" />
                        ) : isCurr ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#F5B544]" />
                        ) : (
                          "1"
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold tracking-wide ${
                          isDone || isCurr
                            ? "text-[#00E5FF]"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      >
                        Discovery
                      </span>
                    </button>
                  );
                })()}
              </div>

              {/* STAGE 2: Onboarding (Center at 30%) */}
              <div className="flex flex-col items-center relative z-10 text-center">
                {(() => {
                  const status = getStepStatus(2);
                  const isDone = status === "completed";
                  const isCurr = status === "current";
                  return (
                    <button
                      type="button"
                      onClick={() => handleQuickApply("onboarding")}
                      className="flex flex-col items-center gap-2 group cursor-pointer text-center focus:outline-hidden"
                      title="Click to switch to Onboarding stage"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${
                          isDone
                            ? "bg-[#07162B] border-2 border-[#00E5FF] shadow-[0_0_14px_rgba(0,229,255,0.4)] text-[#00E5FF]"
                            : isCurr
                            ? "bg-[#07162B] border-2 border-[#F5B544] shadow-[0_0_14px_rgba(245,181,68,0.4)] text-[#F5B544]"
                            : "bg-[#07162B] border-2 border-slate-700 text-slate-500 font-mono text-xs group-hover:border-slate-500"
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-5 w-5 stroke-[2.5]" />
                        ) : isCurr ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#F5B544]" />
                        ) : (
                          "2"
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold tracking-wide ${
                          isDone
                            ? "text-[#00E5FF]"
                            : isCurr
                            ? "text-white"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      >
                        Onboarding
                      </span>
                    </button>
                  );
                })()}
              </div>

              {/* STAGE 3: Active / Paused / Payment Dropdown Menu (Center at 50%) */}
              <div className="flex flex-col items-center relative z-10 text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex flex-col items-center gap-2 group cursor-pointer text-center focus:outline-hidden"
                      title="Click to switch Active operational states (Active, Payment Attention, Services Paused)"
                    >
                      {isPaymentAttention ? (
                        <div className="w-10 h-10 rounded-full bg-[#07162B] border-2 border-[#FF2D55] shadow-[0_0_20px_rgba(255,45,85,0.7)] text-[#FF2D55] flex items-center justify-center transition-transform group-hover:scale-110">
                          <AlertTriangle className="h-5 w-5 fill-[#FF2D55]/20 stroke-[2.5]" />
                        </div>
                      ) : isServicesPaused ? (
                        <div className="w-10 h-10 rounded-full bg-[#07162B] border-2 border-[#A855F7] shadow-[0_0_18px_rgba(168,85,247,0.5)] text-[#A855F7] flex items-center justify-center transition-transform group-hover:scale-110">
                          <Pause className="h-5 w-5 fill-[#A855F7]/30 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${
                            getStepStatus(3) === "completed"
                              ? "bg-[#07162B] border-2 border-[#00E5FF] shadow-[0_0_14px_rgba(0,229,255,0.4)] text-[#00E5FF]"
                              : getStepStatus(3) === "current"
                              ? "bg-[#07162B] border-2 border-[#F5B544] shadow-[0_0_16px_rgba(245,181,68,0.45)] text-[#F5B544]"
                              : "bg-[#07162B] border-2 border-slate-700 text-slate-500 font-mono text-xs group-hover:border-slate-500"
                          }`}
                        >
                          {getStepStatus(3) === "completed" ? (
                            <Check className="h-5 w-5 stroke-[2.5]" />
                          ) : getStepStatus(3) === "current" ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#F5B544]" />
                          ) : (
                            "3"
                          )}
                        </div>
                      )}
                      <span
                        className={`text-xs font-semibold tracking-wide whitespace-nowrap ${
                          isPaymentAttention
                            ? "text-[#FF2D55] font-bold"
                            : isServicesPaused
                            ? "text-[#C084FC] font-bold"
                            : getStepStatus(3) === "completed"
                            ? "text-[#00E5FF]"
                            : getStepStatus(3) === "current"
                            ? "text-[#F5B544] font-bold"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      >
                        {isPaymentAttention
                          ? "Payment Attention"
                          : isServicesPaused
                          ? "Services Paused"
                          : "Active"}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    className="bg-[#07162B] border-[#0E356A] text-slate-200 w-60 shadow-2xl p-1.5 z-50"
                  >
                    <DropdownMenuItem
                      onSelect={() => handleQuickApply("active")}
                      onClick={() => handleQuickApply("active")}
                      className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F5B544] shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-white">Active (Normal)</span>
                        <span className="text-[10px] text-slate-400">Services active · Regular priority</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleQuickApply("payment")}
                      onClick={() => handleQuickApply("payment")}
                      className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D55] shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-rose-300">Payment Attention</span>
                        <span className="text-[10px] text-slate-400">$55 due · Grace period active</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleQuickApply("paused")}
                      onClick={() => handleQuickApply("paused")}
                      className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-purple-300">Services Paused</span>
                        <span className="text-[10px] text-slate-400">Residential · Time preserved</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleQuickApply("scholarship")}
                      onClick={() => handleQuickApply("scholarship")}
                      className="cursor-pointer gap-2.5 text-xs py-2 hover:bg-white/[0.08] rounded-md"
                    >
                      <Clock className="h-3 w-3 text-amber-300 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-amber-300">Scholarship Pending</span>
                        <span className="text-[10px] text-slate-400">Awaiting manager approval</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* STAGE 4: Renewal (Center at 70%) */}
              <div className="flex flex-col items-center relative z-10 text-center">
                {(() => {
                  const status = getStepStatus(4);
                  const isDone = status === "completed";
                  const isCurr = status === "current";
                  return (
                    <button
                      type="button"
                      onClick={() => handleQuickApply("renewal")}
                      className="flex flex-col items-center gap-2 group cursor-pointer text-center focus:outline-hidden"
                      title="Click to switch to Renewal stage"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${
                          isDone
                            ? "bg-[#07162B] border-2 border-[#00E5FF] shadow-[0_0_14px_rgba(0,229,255,0.4)] text-[#00E5FF]"
                            : isCurr
                            ? "bg-[#07162B] border-2 border-[#F5B544] shadow-[0_0_14px_rgba(245,181,68,0.4)] text-[#F5B544]"
                            : "bg-[#07162B] border-2 border-slate-700 text-slate-500 font-mono text-xs group-hover:border-slate-500"
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-5 w-5 stroke-[2.5]" />
                        ) : isCurr ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#F5B544]" />
                        ) : (
                          "4"
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold tracking-wide ${
                          isDone
                            ? "text-[#00E5FF]"
                            : isCurr
                            ? "text-[#F5B544] font-bold"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      >
                        Renewal
                      </span>
                    </button>
                  );
                })()}
              </div>

              {/* STAGE 5: Offboarding (Center at 90%) */}
              <div className="flex flex-col items-center relative z-10 text-center">
                {(() => {
                  const status = getStepStatus(5);
                  const isDone = status === "completed";
                  const isCurr = status === "current";
                  return (
                    <button
                      type="button"
                      onClick={() => handleQuickApply("offboarding")}
                      className="flex flex-col items-center gap-2 group cursor-pointer text-center focus:outline-hidden"
                      title="Click to switch to Offboarding stage"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${
                          isDone
                            ? "bg-[#07162B] border-2 border-[#00E5FF] shadow-[0_0_14px_rgba(0,229,255,0.4)] text-[#00E5FF]"
                            : isCurr
                            ? "bg-[#07162B] border-2 border-[#F5B544] shadow-[0_0_14px_rgba(245,181,68,0.4)] text-[#F5B544]"
                            : "bg-[#07162B] border-2 border-slate-700 text-slate-500 font-mono text-xs group-hover:border-slate-500"
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-5 w-5 stroke-[2.5]" />
                        ) : isCurr ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#F5B544]" />
                        ) : (
                          "5"
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold tracking-wide ${
                          isDone
                            ? "text-[#00E5FF]"
                            : isCurr
                            ? "text-[#F5B544] font-bold"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      >
                        Offboarding
                      </span>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Subtitle Headline + Detail */}
            <div className="space-y-0.5 pt-0.5">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {subtitleHeadline}
              </h3>
              <p className="text-xs text-slate-400">
                {subtitleDetail}
              </p>
            </div>
          </div>

          {/* RIGHT 5 COLS: Dynamic Single Primary Action (Tucked to top, ultra-compact) */}
          <div className="lg:col-span-5 lg:border-l lg:border-[#0E356A]/80 lg:pl-5 flex flex-col justify-start space-y-1.5 -mt-0.5">
            {/* Top Row: Eyebrow on left + Helper text on right */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className={`text-[10px] font-mono font-bold tracking-widest uppercase shrink-0 ${eyebrowColor}`}>
                {eyebrowLabel}
              </span>
              <span className="text-[10.5px] text-slate-400 truncate text-right" title={primaryButtonHelper}>
                {primaryButtonHelper}
              </span>
            </div>

            {/* Primary Action Button (Moved all the way up) */}
            <button
              type="button"
              onClick={onPrimaryActionClick}
              className={`w-full py-2 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${primaryButtonBg}`}
            >
              {primaryButtonIcon}
              <span className="truncate">{primaryButtonText}</span>
            </button>

            {/* Dedicated Client Portal Controls (Sleek Single-Row Horizontal Action Strip) */}
            <div className="pt-1 border-t border-[#0E356A]/70 grid grid-cols-3 gap-1.5">
              {/* 1. Open Client View */}
              <button
                type="button"
                onClick={handleOpenClientView}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#081E3D] hover:bg-[#0D2D59] border border-blue-900/60 text-slate-200 hover:text-white text-xs font-semibold transition-all cursor-pointer group shadow-xs"
                title="Opens an independent staff preview of what the client can currently see"
              >
                <Eye className="h-3 w-3 text-sky-400 shrink-0" />
                <span className="text-[11px] font-bold truncate">Client View</span>
              </button>

              {/* 2. Guide Client Live */}
              {canGuideLive && (
                <button
                  type="button"
                  onClick={() => setShowGuideLiveModal(true)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-gradient-to-r from-emerald-950/90 to-teal-950/90 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/60 text-emerald-200 hover:text-white text-xs font-bold transition-all shadow-[0_0_8px_rgba(16,185,129,0.2)] cursor-pointer group"
                  title="Connects to the client’s active portal session after client approval"
                >
                  <Radio className="h-3 w-3 text-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[11px] font-extrabold truncate">Guide Live</span>
                </button>
              )}

              {/* 3. Manage Portal Access */}
              <button
                type="button"
                onClick={() => setShowManageAccessModal(true)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#081E3D] hover:bg-[#0D2D59] border border-blue-900/60 text-slate-200 hover:text-white text-xs font-semibold transition-all cursor-pointer group shadow-xs"
                title="Changes portal stage, unlocked tasks, and visibility settings"
              >
                <Settings className="h-3 w-3 text-[#F5B544] shrink-0" />
                <span className="text-[11px] font-bold truncate">Manage</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          PANEL 2: CONTEXTUAL LOWER CARD (Responsive Subcomponents)
      ───────────────────────────────────────────────────────── */}
      {isPaymentAttention && <PaymentAttentionCard contact={activeContact} />}

      {isServicesPaused && <ServicesPausedCard contact={activeContact} />}

      {isNormalActive && (
        <ActiveSnapshotCard compass={compass} nextAppointment={nextAppointment} />
      )}

      {isRenewal && <RenewalRoadmapCard contact={activeContact} />}

      {isOffboarding && <OffboardingRoadmapCard />}

      {isDiscovery && <DiscoveryRoadmapCard />}

      {isOnboarding && <OnboardingRoadmapCard contact={activeContact} />}

      {/* ─────────────────────────────────────────────────────────
          MODALS & DRAWERS
      ───────────────────────────────────────────────────────── */}
      <OnboardingChoiceModal
        open={showOnboardingChoice}
        onOpenChange={setShowOnboardingChoice}
        contactId={contactId}
        contact={activeContact}
      />

      <ReviewPauseModal
        open={showReviewPause}
        onOpenChange={setShowReviewPause}
        contactId={contactId}
        contact={activeContact}
      />

      <ResolvePaymentModal
        open={showResolvePayment}
        onOpenChange={setShowResolvePayment}
        contactId={contactId}
        contact={activeContact}
      />

      <RenewalModal
        open={showRenewalModal}
        onOpenChange={setShowRenewalModal}
        contactId={contactId}
        contact={activeContact}
      />

      <OffboardingModal
        open={showOffboardingModal}
        onOpenChange={setShowOffboardingModal}
        contactId={contactId}
        contact={activeContact}
      />

      {/* Guide Client Live Co-Browsing Console */}
      <GuideClientLiveModal
        open={showGuideLiveModal}
        onOpenChange={setShowGuideLiveModal}
        contact={activeContact}
        parentContact={parentContact}
      />

      {/* Manage Portal Access Dialog */}
      <ManagePortalAccessModal
        open={showManageAccessModal}
        onOpenChange={setShowManageAccessModal}
        contact={activeContact}
        parentContact={parentContact}
      />
    </div>
  );
}

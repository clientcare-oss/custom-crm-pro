import React, { useState, useEffect, useRef } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import type { StripeElementStyle } from "@stripe/stripe-js";
import {
  Delete,
  Loader2,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Lock,
  Heart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  UserSearch,
  WifiOff,
} from "lucide-react";
import {
  formatCents,
  PAYMENT_DECLINED_INLINE_MESSAGE,
  PAYMENT_OFFLINE_INLINE_MESSAGE,
  PAYMENT_REQUIRES_ACTION_INLINE_MESSAGE,
  PAYMENT_SUCCESS_INLINE_MESSAGE,
  PAYMENT_UNCONFIRMED_INLINE_MESSAGE,
  type PaymentStationMethod,
  type PaymentStationMode,
  type PaymentStationReceiptStatus,
} from "@shared/paymentStation";
import {
  ManagerKeyPanel,
  MANAGER_PREVIEW_SCENARIOS,
  type ManagerKeyMode,
  type ManagerPreviewScenario,
} from "./ManagerKeyPanel";
import {
  RegisterDonationPanel,
  type RegisterDonationClientOption,
  type RegisterDonationFormState,
} from "./RegisterDonationPanel";
import { SavedCardsPanel } from "./SavedCardsPanel";

export interface RegisterSavedMethod {
  id: string;
  stripePaymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  chargeable: boolean;
}

export interface PaymentRegisterProps {
  mode: PaymentStationMode;
  hasSelectedClient: boolean;
  displayName: string;
  subtitleText: string;
  amountCents: number;
  activeTab: PaymentStationMethod;
  onTabChange: (tab: PaymentStationMethod) => void;
  onDigitPress: (digit: number) => void;
  onBackspacePress: () => void;
  onClearPress: () => void;
  onResetAmount?: () => void;
  showResetAmount?: boolean;
  onOpenPurposePicker: () => void;
  onRequestSelectClient: () => void;
  onRequestDonationMode: () => void;
  onClearClient?: () => void;
  onExitDonationMode?: () => void;

  // Card by phone state (non-PCI fields only; PAN/Exp/CVC live exclusively in Stripe Elements)
  cardholderName: string;
  onCardholderNameChange: (val: string) => void;
  postalCode: string;
  onPostalCodeChange: (val: string) => void;
  stripeElementsMounted: boolean;
  stripeCardReady: { number: boolean; expiry: boolean; cvc: boolean };
  onStripeFieldChange: (
    field: "number" | "expiry" | "cvc",
    complete: boolean,
    errorMessage?: string
  ) => void;
  cardElementError: string | null;

  // Saved card state + in-register Update card & Update & charge flow
  savedMethods: RegisterSavedMethod[];
  selectedSavedMethodId: string | null;
  onSelectSavedMethod: (pmId: string) => void;
  savedCardAction: "list" | "update";
  updatingSavedMethodId: string | null;
  onStartUpdateSavedCard: (pmId: string | null) => void;
  onCancelUpdateSavedCard: () => void;
  setAsDefaultCard: boolean;
  onSetAsDefaultCardChange: (val: boolean) => void;
  savedCardsPreviewActive: boolean;
  previewReplacementCardId: string;
  onSelectPreviewReplacementCard: (id: string) => void;

  // Send link state
  linkRecipientEmail: string;
  onLinkRecipientEmailChange: (val: string) => void;
  sendLinkByEmail: boolean;
  onSendLinkByEmailChange: (val: boolean) => void;
  generatedLinkUrl: string | null;
  generatedSessionId: string | null;
  onCopyLink: () => void;
  linkCopied: boolean;
  onCheckLinkStatus: () => void;
  isCheckingLink: boolean;

  // Readiness & execution
  configReady: {
    cardByPhoneReady: boolean;
    savedCardReady: boolean;
    paymentLinkReady: boolean;
    emailDeliveryReady: boolean;
    mode: "test" | "live" | "unconfigured";
  };
  paymentStatus: PaymentStationReceiptStatus;
  canVerifyUnconfirmed: boolean;
  validationError: string | null;
  processorError: string | null;
  isSubmitting: boolean;
  canCharge: boolean;
  onCharge: () => void;
  onTryAnotherCard: () => void;
  onCheckUnconfirmedStatus: () => void;
  onCompleteThreeDs?: () => void;
  onRetryConnection: () => void;
  isCheckingConnection?: boolean;
  onResetStation: () => void;
  onOpenSetupInfo: () => void;
  onScaledHeightChange?: (heightPx: number) => void;
  successWaveKey?: number;

  // Physical Manager Key switch & unlocked test/tools bay
  managerMode: ManagerKeyMode;
  managerPanelVisible: boolean;
  managerPinDigits: string;
  managerPinError: string | null;
  activePreviewScenario: ManagerPreviewScenario | null;
  onManagerKeyClick: () => void;
  onSubmitManagerPin: () => void;
  onCancelManagerPin: () => void;
  onSelectPreviewScenario: (scenario: ManagerPreviewScenario) => void;
  onStepPreviewScenario: (delta: -1 | 1) => void;
  onTriggerPaperFeed: () => void;
  onOpenRecentDrawer: () => void;
  onToggleManagerPanel: (visible: boolean) => void;
  onLockManager: () => void;

  // In-Register Donation & 501(c)(3) Compliance Bay (zero separate modal windows)
  donationClients: RegisterDonationClientOption[];
  donationForm: RegisterDonationFormState;
  donationSubView: "donor" | "payment";
  donationComplianceStatus: "pass" | "warn" | "fail";
  onDonationSubViewChange: (view: "donor" | "payment") => void;
  onUpdateDonationForm: (patch: Partial<RegisterDonationFormState>) => void;
  onSelectDonorAccount: (clientId: number | null) => void;
  onSelectQuickDonationAmount: (cents: number) => void;
}

// Canonical desktop coordinate space matching tightly cropped register-chassis-cropped.jpg (1160x808, ratio 1.4356)
const CANONICAL_WIDTH = 800;
const CANONICAL_HEIGHT = 557;

const STRIPE_ELEMENT_STYLE: StripeElementStyle = {
  base: {
    color: "#F3F6FD",
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: "14px",
    fontSmoothing: "antialiased",
    "::placeholder": {
      color: "#6C7FA6",
    },
  },
  invalid: {
    color: "#FDA4AF",
    iconColor: "#FDA4AF",
  },
};

export function PaymentRegister({
  mode,
  hasSelectedClient,
  displayName,
  subtitleText,
  amountCents,
  activeTab,
  onTabChange,
  onDigitPress,
  onBackspacePress,
  onClearPress,
  onResetAmount,
  showResetAmount,
  onOpenPurposePicker,
  onRequestSelectClient,
  onRequestDonationMode,
  onClearClient,
  onExitDonationMode,
  cardholderName,
  onCardholderNameChange,
  postalCode,
  onPostalCodeChange,
  stripeElementsMounted,
  onStripeFieldChange,
  cardElementError,
  savedMethods,
  selectedSavedMethodId,
  onSelectSavedMethod,
  savedCardAction,
  updatingSavedMethodId,
  onStartUpdateSavedCard,
  onCancelUpdateSavedCard,
  setAsDefaultCard,
  onSetAsDefaultCardChange,
  savedCardsPreviewActive,
  previewReplacementCardId,
  onSelectPreviewReplacementCard,
  linkRecipientEmail,
  onLinkRecipientEmailChange,
  sendLinkByEmail,
  onSendLinkByEmailChange,
  generatedLinkUrl,
  generatedSessionId,
  onCopyLink,
  linkCopied,
  onCheckLinkStatus,
  isCheckingLink,
  configReady,
  paymentStatus,
  canVerifyUnconfirmed,
  validationError,
  processorError,
  isSubmitting,
  canCharge,
  onCharge,
  onTryAnotherCard,
  onCheckUnconfirmedStatus,
  onCompleteThreeDs,
  onRetryConnection,
  isCheckingConnection = false,
  onResetStation,
  onOpenSetupInfo,
  onScaledHeightChange,
  successWaveKey = 0,
  managerMode,
  managerPanelVisible,
  managerPinDigits,
  managerPinError,
  activePreviewScenario,
  onManagerKeyClick,
  onSubmitManagerPin,
  onCancelManagerPin,
  onSelectPreviewScenario,
  onStepPreviewScenario,
  onTriggerPaperFeed,
  onOpenRecentDrawer,
  onToggleManagerPanel,
  onLockManager,
  donationClients,
  donationForm,
  donationSubView,
  donationComplianceStatus,
  onDonationSubViewChange,
  onUpdateDonationForm,
  onSelectDonorAccount,
  onSelectQuickDonationAmount,
}: PaymentRegisterProps) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true
  );
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Proportional scaling guarantees controls NEVER overflow, wrap awkwardly, or clip at ANY desktop width
  useEffect(() => {
    if (!isDesktop || !hostRef.current) return;
    const el = hostRef.current;
    const updateScale = () => {
      const avail = el.clientWidth;
      if (avail > 0) {
        const nextScale = Math.min(1.45, Math.max(0.62, avail / CANONICAL_WIDTH));
        setScale(nextScale);
        onScaledHeightChange?.(Math.round(CANONICAL_HEIGHT * nextScale));
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isDesktop, onScaledHeightChange]);

  const formattedAmount = formatCents(amountCents);
  const isPinEntry = managerMode === "pin";
  const showManagerSurface =
    isPinEntry || (managerMode === "unlocked" && managerPanelVisible);
  const showPreviewStrip = managerMode === "unlocked" && !managerPanelVisible;

  const isOffline = !isPinEntry && paymentStatus === "offline";
  const isDeclined = !isPinEntry && paymentStatus === "failed";
  const isSuccess = !isPinEntry && paymentStatus === "paid";
  const isUnconfirmed = !isPinEntry && paymentStatus === "unconfirmed";
  const isRequiresAction = !isPinEntry && paymentStatus === "requires_action";
  const isDonationDisplay =
    !isPinEntry &&
    !isOffline &&
    !isDeclined &&
    !isSuccess &&
    !isUnconfirmed &&
    !isRequiresAction &&
    mode === "donation";
  const isSelectClientMode =
    !hasSelectedClient &&
    mode !== "donation" &&
    !savedCardsPreviewActive &&
    !isPinEntry &&
    !isOffline &&
    !isDeclined &&
    !isSuccess &&
    !isUnconfirmed &&
    !isRequiresAction;

  const ledName = (hasSelectedClient ? displayName : "SELECT CLIENT").toUpperCase();

  const ledLeftText = isPinEntry
    ? "MANAGER KEY"
    : isOffline
      ? "NO INTERNET"
      : isDeclined
        ? "CARD DECLINED"
        : isSuccess
          ? "PAYMENT SUCCESSFUL"
          : isUnconfirmed
            ? "STATUS UNCONFIRMED"
            : isRequiresAction
              ? "AUTH REQUIRED"
              : mode === "donation"
                ? "DONATION"
                : ledName;

  const ledRightText = isPinEntry
    ? `PIN ${"•".repeat(managerPinDigits.length)}${"_".repeat(Math.max(0, 4 - managerPinDigits.length))}`
    : formattedAmount;

  const ledLeftClass = isOffline
    ? "pos-dotmatrix-offline"
    : isDeclined
      ? "pos-dotmatrix-declined"
      : isSuccess
        ? "pos-dotmatrix-success"
        : isDonationDisplay
          ? "pos-dotmatrix-donation"
          : "pos-dotmatrix-name";

  const ledGlassClass = isOffline
    ? "pos-dotmatrix-glass-offline"
    : isDeclined
      ? "pos-dotmatrix-glass-declined"
      : isSuccess
        ? "pos-dotmatrix-glass-success"
        : isDonationDisplay
          ? "pos-dotmatrix-glass-donation"
          : "pos-dotmatrix-glass-overlay";

  const inlineBanner = (() => {
    if (showManagerSurface) return null;
    if (isDeclined) {
      return {
        tone: "declined" as const,
        role: "alert" as const,
        text: PAYMENT_DECLINED_INLINE_MESSAGE,
      };
    }
    if (isRequiresAction) {
      return {
        tone: "unconfirmed" as const,
        role: "alert" as const,
        text: PAYMENT_REQUIRES_ACTION_INLINE_MESSAGE,
      };
    }
    if (isUnconfirmed) {
      return {
        tone: "unconfirmed" as const,
        role: "alert" as const,
        text: PAYMENT_UNCONFIRMED_INLINE_MESSAGE,
      };
    }
    if (isSuccess) {
      return {
        tone: "success" as const,
        role: "status" as const,
        text: PAYMENT_SUCCESS_INLINE_MESSAGE,
      };
    }
    if (processorError) {
      return {
        tone: "declined" as const,
        role: "alert" as const,
        text: processorError,
      };
    }
    return null;
  })();

  const hasInlineBanner = Boolean(inlineBanner);
  const compactFieldWell = hasInlineBanner || mode === "donation" || showPreviewStrip;
  const tightBannerForm = showPreviewStrip && hasInlineBanner;
  const fieldWellHeightClass = tightBannerForm
    ? "h-[24px]"
    : compactFieldWell
      ? "h-[29px]"
      : "h-[35px]";

  const isUpdateAndCharge = activeTab === "saved_card" && savedCardAction === "update";

  const chargeButtonLabel = (() => {
    if (isPinEntry) return "Enter Manager Code";
    if (isOffline) return isCheckingConnection ? "Checking connection..." : "Check connection";
    if (isSubmitting) return "Processing...";
    if (isDeclined) return "Try another card";
    if (isRequiresAction) return onCompleteThreeDs ? "Complete 3DS check" : "Check payment status";
    if (isUnconfirmed) {
      return canVerifyUnconfirmed ? "Check payment status" : "Reset station";
    }
    if (isSuccess) return "New payment";
    if (isSelectClientMode) return "Select a client";
    if (isUpdateAndCharge) {
      if (mode === "donation") {
        return amountCents > 0
          ? `Update & accept donation ${formattedAmount}`
          : "Update & accept donation";
      }
      return amountCents > 0 ? `Update & charge ${formattedAmount}` : "Update & charge";
    }
    if (mode === "donation") {
      return amountCents > 0 ? `Accept donation ${formattedAmount}` : "Accept donation";
    }
    if (activeTab === "send_link") {
      return `Send link ${formattedAmount}`;
    }
    return `Charge ${formattedAmount}`;
  })();

  const activeTabConfigured =
    savedCardsPreviewActive && activeTab === "saved_card"
      ? true
      : activeTab === "card_by_phone" || isUpdateAndCharge
        ? configReady.cardByPhoneReady
        : activeTab === "saved_card"
          ? configReady.savedCardReady
          : configReady.paymentLinkReady;

  const primaryActionDisabled = (() => {
    if (isPinEntry) return managerPinDigits.length < 4;
    if (isOffline) return isCheckingConnection;
    if (isSubmitting) return true;
    if (isSelectClientMode || isDeclined || isUnconfirmed || isRequiresAction || isSuccess) {
      return false;
    }
    return !canCharge || !activeTabConfigured;
  })();

  const handlePrimaryAction = () => {
    if (isPinEntry) {
      onSubmitManagerPin();
      return;
    }
    if (isOffline) {
      onRetryConnection();
      return;
    }
    if (isSubmitting) return;
    if (isSelectClientMode) {
      onRequestSelectClient();
      return;
    }
    if (isDeclined) {
      onTryAnotherCard();
      return;
    }
    if (isRequiresAction) {
      if (onCompleteThreeDs) {
        onCompleteThreeDs();
      } else {
        onCheckUnconfirmedStatus();
      }
      return;
    }
    if (isUnconfirmed) {
      if (canVerifyUnconfirmed) {
        onCheckUnconfirmedStatus();
      } else {
        onResetStation();
      }
      return;
    }
    if (isSuccess) {
      onResetStation();
      return;
    }
    onCharge();
  };

  const activeScenarioIdx = activePreviewScenario
    ? MANAGER_PREVIEW_SCENARIOS.findIndex((s) => s.id === activePreviewScenario)
    : -1;
  const activeScenarioMeta =
    activeScenarioIdx >= 0 ? MANAGER_PREVIEW_SCENARIOS[activeScenarioIdx] : null;

  const TAB_TRACK_SEGMENTS = [
    { id: "saved_card" as const, label: "Saved card", left: "0%", width: "31.5%" },
    { id: "card_by_phone" as const, label: "Card by phone", left: "31.5%", width: "37%" },
    { id: "send_link" as const, label: "Send link", left: "68.5%", width: "31.5%" },
  ];
  const activeTabSegment =
    TAB_TRACK_SEGMENTS.find((seg) => seg.id === activeTab) ?? TAB_TRACK_SEGMENTS[1];

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onTabChange(TAB_TRACK_SEGMENTS[(idx + 1) % TAB_TRACK_SEGMENTS.length].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onTabChange(
        TAB_TRACK_SEGMENTS[(idx - 1 + TAB_TRACK_SEGMENTS.length) % TAB_TRACK_SEGMENTS.length].id
      );
    }
  };

  const renderTabsAndForms = () => (
    <div className="flex flex-col pr-1">
      {/* Unified Continuous Hardware Tab Track with Silky Monorail-Glide Highlight */}
      <div
        role="tablist"
        aria-label="Payment method"
        className="pos-tab-track grid grid-cols-[31.5%_37%_31.5%] h-[36px] rounded-[9px]"
      >
        {/* Sliding Luminous Violet-Indigo Glider Highlight */}
        <div
          aria-hidden="true"
          data-testid="pos-tab-glider"
          className="pos-tab-glide-pill pointer-events-none z-0"
          style={{
            left: activeTabSegment.left,
            width: activeTabSegment.width,
          }}
        />

        {TAB_TRACK_SEGMENTS.map((tab, idx) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => {
                onTabChange(tab.id);
                if (mode === "donation" && donationSubView === "donor") {
                  onDonationSubViewChange("payment");
                }
              }}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className={`relative z-10 h-full rounded-[8px] px-2 text-[13px] whitespace-nowrap transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 ${active
                ? "text-[#F8FAFF] font-normal"
                : "text-[#DFE7F7] hover:text-white font-normal"
                }`}
              style={
                active
                  ? {
                    fontFamily:
                      '"Libre Baskerville", "Playfair Display", Georgia, serif',
                    fontSize: "13px",
                    letterSpacing: "0.005em",
                  }
                  : undefined
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Manager Key PIN Entry OR Unlocked Test & Tools Surface (cleanly between slider switch & Charge bar) */}
      {showManagerSurface ? (
        <div className="mt-2 min-h-[166px]">
          <ManagerKeyPanel
            mode={isPinEntry ? "pin" : "unlocked"}
            pinDigits={managerPinDigits}
            pinError={managerPinError}
            activePreviewScenario={activePreviewScenario}
            onSubmitPin={onSubmitManagerPin}
            onCancelPin={onCancelManagerPin}
            onSelectPreviewScenario={onSelectPreviewScenario}
            onTriggerPaperFeed={onTriggerPaperFeed}
            onOpenSetupInfo={onOpenSetupInfo}
            onOpenRecentDrawer={onOpenRecentDrawer}
            onHidePanelToForm={() => onToggleManagerPanel(false)}
            onLockManager={onLockManager}
          />
        </div>
      ) : (
        <>
          {/* Compact interactive state-stepper strip when Manager Key is unlocked while viewing live register */}
          {showPreviewStrip && (
            <div
              data-testid="pos-manager-preview-strip"
              className="mt-1 flex items-center justify-between gap-1.5 rounded-[6.5px] bg-[#162749]/95 border border-[#CFA657]/60 px-2 py-0.5 text-[10px] text-[#FCE6A6]"
            >
              <span className="inline-flex items-center gap-1 font-semibold min-w-0 truncate">
                <img
                  src="/assets/pos/manager-brass-key.png"
                  alt=""
                  aria-hidden="true"
                  className="h-3 w-3 object-contain shrink-0 rotate-90"
                />
                <span className="truncate" data-testid="pos-manager-preview-label">
                  {activeScenarioMeta
                    ? `${activeScenarioMeta.label} (${activeScenarioIdx + 1}/${MANAGER_PREVIEW_SCENARIOS.length})`
                    : "State Tester Active"}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  data-testid="pos-preview-prev-btn"
                  onClick={() => onStepPreviewScenario(-1)}
                  title="Previous testable state"
                  aria-label="Previous testable state"
                  className="h-[18px] w-[18px] rounded bg-[#0c1d3d] hover:bg-[#1a3466] border border-[#CFA657]/55 inline-flex items-center justify-center text-[#FCE6A6] cursor-pointer"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  data-testid="pos-preview-next-btn"
                  onClick={() => onStepPreviewScenario(1)}
                  title="Next testable state"
                  aria-label="Next testable state"
                  className="h-[18px] w-[18px] rounded bg-[#0c1d3d] hover:bg-[#1a3466] border border-[#CFA657]/55 inline-flex items-center justify-center text-[#FCE6A6] cursor-pointer"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  data-testid="pos-manager-open-panel-btn"
                  onClick={() => onToggleManagerPanel(true)}
                  className="h-[18px] px-1.5 rounded bg-[#0c1d3d] hover:bg-[#1a3466] border border-[#6E86B8]/50 text-[9.5px] font-medium text-[#E8F0FF] cursor-pointer"
                >
                  All
                </button>
                <button
                  type="button"
                  data-testid="pos-manager-strip-lock-btn"
                  onClick={onLockManager}
                  className="h-[18px] px-1.5 rounded bg-[#3b151e] hover:bg-[#521e2b] border border-rose-400/45 text-[9.5px] font-medium text-rose-100 cursor-pointer"
                >
                  Lock
                </button>
              </span>
            </div>
          )}

          {/* In-Register Donation Mode Switcher (Donor & 501(c)(3) vs. Card / Payment — zero separate window) */}
          {mode === "donation" && (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div
                role="tablist"
                aria-label="Donation register view"
                className="inline-flex rounded-[7px] bg-[#040D22]/95 border border-[#CFA657]/55 p-[2px]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={donationSubView === "donor"}
                  data-testid="pos-donation-tab-donor"
                  onClick={() => onDonationSubViewChange("donor")}
                  className={`h-[21px] px-2.5 rounded-[5px] text-[10.5px] font-semibold transition-colors cursor-pointer ${donationSubView === "donor"
                    ? "bg-gradient-to-b from-[#DFBE77] to-[#A67C32] text-[#091224]"
                    : "text-[#DFBE77] hover:text-[#FFF2C4]"
                    }`}
                >
                  Donor &amp; 501(c)(3)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={donationSubView === "payment"}
                  data-testid="pos-donation-tab-payment"
                  onClick={() => onDonationSubViewChange("payment")}
                  className={`h-[21px] px-2.5 rounded-[5px] text-[10.5px] font-semibold transition-colors cursor-pointer ${donationSubView === "payment"
                    ? "bg-[#3F3FA8] text-white"
                    : "text-[#B5C5E4] hover:text-white"
                    }`}
                >
                  {activeTab === "saved_card"
                    ? "Saved card"
                    : activeTab === "send_link"
                      ? "Send link"
                      : "Card entry"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => onDonationSubViewChange("donor")}
                title="501(c)(3) donation compliance status"
                className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-full border text-[9.5px] font-semibold cursor-pointer ${donationComplianceStatus === "fail"
                  ? "bg-[#43111A]/85 border-rose-400/60 text-rose-200"
                  : donationComplianceStatus === "warn"
                    ? "bg-[#2C210B]/85 border-amber-400/55 text-amber-200"
                    : "bg-[#0B2922]/85 border-emerald-400/45 text-emerald-200"
                  }`}
              >
                {donationComplianceStatus === "pass" ? (
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                )}
                <span>
                  {donationComplianceStatus === "pass"
                    ? "501(c)(3) Ready"
                    : donationComplianceStatus === "warn"
                      ? "501(c)(3) Note"
                      : "Check Donor"}
                </span>
              </button>
            </div>
          )}

          {/* Static Inline Payment Status Message (exact position below tabs per hardware specification) */}
          {inlineBanner && (
            <div
              role={inlineBanner.role}
              aria-live={inlineBanner.role === "alert" ? "assertive" : "polite"}
              data-testid="pos-inline-status-banner"
              className={`${showPreviewStrip ? "mt-1 px-2.5 py-1 text-[10.5px] leading-tight" : "mt-1.5 px-3 py-1.5 text-[11.5px] leading-snug"} rounded-[7px] border font-medium ${inlineBanner.tone === "declined"
                ? "bg-[#4A111A]/90 border-[#A33646]/80 text-[#FDE8EB]"
                : inlineBanner.tone === "unconfirmed"
                  ? "bg-[#1A294B]/92 border-[#D9A74A]/70 text-[#FEF0C7]"
                  : "bg-[#0D3527]/90 border-[#2EB87D]/70 text-[#D9FBE9]"
                }`}
            >
              {inlineBanner.text}
            </div>
          )}

          {/* Tab Panel Body */}
          <div className={`${tightBannerForm ? "mt-1" : compactFieldWell ? "mt-1.5" : "mt-2.5"} min-h-[120px]`}>
            {isOffline ? (
              <div
                role="alert"
                aria-live="assertive"
                data-testid="pos-offline-bay"
                className={`pos-field-well rounded-[10px] border border-[#D98B2B]/65 bg-[#1D1306]/85 px-4 ${showPreviewStrip ? "py-2 min-h-[116px] gap-1.5" : "py-2.5 min-h-[130px] gap-2"} flex flex-col items-center justify-center text-center`}
              >
                <div className={`${showPreviewStrip ? "h-8 w-8" : "h-9 w-9"} rounded-full bg-[#382108] border border-[#E59E3A]/65 flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.65)]`}>
                  <WifiOff className="h-4 w-4 text-[#FFB946]" />
                </div>
                <div className="space-y-0.5 max-w-[310px]">
                  <div
                    className="text-[14.5px] font-bold text-[#FFE8B3] tracking-wide"
                    style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                  >
                    Internet disconnected
                  </div>
                  <p className="text-[11px] text-[#E6C792] leading-snug">
                    {PAYMENT_OFFLINE_INLINE_MESSAGE}
                    {canVerifyUnconfirmed
                      ? " Check payment status once reconnected before retrying."
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="pos-offline-retry-btn"
                  disabled={isCheckingConnection}
                  onClick={onRetryConnection}
                  className="h-[26px] px-3 rounded-[7px] bg-[#2D1C08] hover:bg-[#3E270C] border border-[#E59E3A]/65 text-[11px] font-semibold text-[#FFE8B3] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isCheckingConnection ? "animate-spin" : ""}`} />
                  <span>{isCheckingConnection ? "Checking..." : "Retry connection"}</span>
                </button>
              </div>
            ) : isSelectClientMode ? (
              <div
                data-testid="pos-select-client-bay"
                className={`pos-field-well rounded-[10px] border border-[#CFA657]/45 px-4 ${showPreviewStrip ? "py-2 min-h-[116px] gap-1.5" : "py-2.5 min-h-[130px] gap-2"} flex flex-col items-center justify-center text-center`}
              >
                <div className={`${showPreviewStrip ? "h-8 w-8" : "h-9 w-9"} rounded-full bg-[#102247] border border-[#CFA657]/60 flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.65)]`}>
                  <UserSearch className="h-4 w-4 text-[#F0CE7D]" />
                </div>
                <div className="space-y-0.5 max-w-[300px]">
                  <div
                    className="text-[14.5px] font-bold text-[#FFF3D1] tracking-wide"
                    style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                  >
                    Select a client account
                  </div>
                  <p className="text-[11px] text-[#9BB0D4] leading-snug">
                    Station is cleared between accounts. Pick a client to load invoices &amp; saved cards, or start a donation.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    data-testid="pos-bay-select-client-btn"
                    onClick={onRequestSelectClient}
                    className="h-[26px] px-3.5 rounded-[7px] bg-gradient-to-b from-[#DFBE77] to-[#A67C32] hover:brightness-110 border border-[#FFF2C4]/70 text-[#091224] text-[11.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
                  >
                    <UserSearch className="h-3.5 w-3.5" />
                    <span>Select Client</span>
                  </button>
                  <button
                    type="button"
                    data-testid="pos-bay-start-donation-btn"
                    onClick={onRequestDonationMode}
                    className="h-[26px] px-3 rounded-[7px] bg-[#0B1C3D] hover:bg-[#142D5C] border border-[#CFA657]/55 text-[#F7E3AA] text-[11.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Heart className="h-3 w-3 text-[#DFBE77]" />
                    <span>Donation</span>
                  </button>
                </div>
              </div>
            ) : mode === "donation" && donationSubView === "donor" ? (
              <RegisterDonationPanel
                clients={donationClients}
                amountCents={amountCents}
                donationForm={donationForm}
                onUpdateDonationForm={onUpdateDonationForm}
                onSelectDonorAccount={onSelectDonorAccount}
                onSelectQuickAmount={onSelectQuickDonationAmount}
                onContinueToPayment={() => onDonationSubViewChange("payment")}
                compact={showPreviewStrip}
              />
            ) : (
              <>
                {activeTab === "card_by_phone" && (
                  <div
                    role="tabpanel"
                    aria-label="Card by phone"
                    className={tightBannerForm ? "space-y-0.5" : compactFieldWell ? "space-y-1" : "space-y-2"}
                  >
                    {/* Cardholder Name */}
                    <div>
                      <label
                        htmlFor="pos-cardholder-name"
                        className={`block ${tightBannerForm ? "text-[10.5px] leading-tight mb-0" : `text-[11.5px] ${hasInlineBanner ? "mb-0.5" : "mb-1"}`} font-medium text-[#D2DDF2]`}
                      >
                        Cardholder name
                      </label>
                      <div
                        className={`pos-field-well rounded-[8px] ${fieldWellHeightClass} px-3 flex items-center`}
                      >
                        <input
                          id="pos-cardholder-name"
                          type="text"
                          autoComplete="cc-name"
                          value={cardholderName}
                          onChange={(e) => onCardholderNameChange(e.target.value)}
                          placeholder="Full name on card"
                          className="w-full bg-transparent text-[13.5px] text-[#F4F7FF] placeholder-[#6C7FA6] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Secure Stripe Card Number Element (NEVER an ordinary controlled input!) */}
                    <div>
                      <div
                        className={`flex items-center justify-between gap-2 ${tightBannerForm ? "mb-0" : hasInlineBanner ? "mb-0.5" : "mb-1"
                          }`}
                      >
                        <label className={`${tightBannerForm ? "text-[10.5px] leading-tight" : "text-[11.5px]"} font-medium text-[#D2DDF2] whitespace-nowrap`}>
                          Card number
                        </label>
                        {!configReady.cardByPhoneReady && (
                          <button
                            type="button"
                            onClick={onOpenSetupInfo}
                            className="inline-flex items-center gap-1 text-[10.5px] text-amber-300/90 hover:text-amber-200 whitespace-nowrap cursor-pointer"
                          >
                            <Lock className="h-3 w-3 shrink-0" />
                            <span>Stripe setup needed</span>
                          </button>
                        )}
                      </div>
                      <div
                        className={`pos-field-well rounded-[8px] ${fieldWellHeightClass} px-3 flex items-center`}
                      >
                        {stripeElementsMounted && configReady.cardByPhoneReady ? (
                          <div className="w-full">
                            <CardNumberElement
                              options={{
                                style: STRIPE_ELEMENT_STYLE,
                                placeholder: "1234 5678 9012 3456",
                                showIcon: false,
                              }}
                              onChange={(e) =>
                                onStripeFieldChange("number", e.complete, e.error?.message)
                              }
                            />
                          </div>
                        ) : (
                          <div
                            aria-disabled="true"
                            className="w-full flex items-center justify-between text-[13.5px] text-[#6E82AA] tracking-[0.06em]"
                          >
                            <span>1234 5678 9012 3456</span>
                            <Lock className="h-3.5 w-3.5 text-[#6C7FA6]/70 shrink-0" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expiration / CVC / ZIP Row */}
                    <div className="grid grid-cols-[1.12fr_0.9fr_1fr] gap-2.5">
                      <div>
                        <label
                          className={`block ${tightBannerForm ? "text-[10.5px] leading-tight mb-0" : `text-[11.5px] ${hasInlineBanner ? "mb-0.5" : "mb-1"}`} font-medium text-[#D2DDF2]`}
                        >
                          Expiration
                        </label>
                        <div
                          className={`pos-field-well rounded-[8px] ${fieldWellHeightClass} px-3 flex items-center`}
                        >
                          {stripeElementsMounted && configReady.cardByPhoneReady ? (
                            <div className="w-full">
                              <CardExpiryElement
                                options={{
                                  style: STRIPE_ELEMENT_STYLE,
                                  placeholder: "MM/YY",
                                }}
                                onChange={(e) =>
                                  onStripeFieldChange("expiry", e.complete, e.error?.message)
                                }
                              />
                            </div>
                          ) : (
                            <span aria-disabled="true" className="text-[13.5px] text-[#6E82AA]">
                              MM/YY
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label
                          className={`block ${tightBannerForm ? "text-[10.5px] leading-tight mb-0" : `text-[11.5px] ${hasInlineBanner ? "mb-0.5" : "mb-1"}`} font-medium text-[#D2DDF2]`}
                        >
                          CVC
                        </label>
                        <div
                          className={`pos-field-well rounded-[8px] ${fieldWellHeightClass} px-3 flex items-center`}
                        >
                          {stripeElementsMounted && configReady.cardByPhoneReady ? (
                            <div className="w-full">
                              <CardCvcElement
                                options={{
                                  style: STRIPE_ELEMENT_STYLE,
                                  placeholder: "CVC",
                                }}
                                onChange={(e) =>
                                  onStripeFieldChange("cvc", e.complete, e.error?.message)
                                }
                              />
                            </div>
                          ) : (
                            <span aria-disabled="true" className="text-[13.5px] text-[#6E82AA]">
                              CVC
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="pos-postal-code"
                          className={`block ${tightBannerForm ? "text-[10.5px] leading-tight mb-0" : `text-[11.5px] ${hasInlineBanner ? "mb-0.5" : "mb-1"}`} font-medium text-[#D2DDF2]`}
                        >
                          ZIP
                        </label>
                        <div
                          className={`pos-field-well rounded-[8px] ${fieldWellHeightClass} px-3 flex items-center`}
                        >
                          <input
                            id="pos-postal-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="postal-code"
                            maxLength={12}
                            value={postalCode}
                            onChange={(e) => onPostalCodeChange(e.target.value)}
                            placeholder="ZIP"
                            className="w-full bg-transparent text-[13.5px] text-[#F4F7FF] placeholder-[#6E82AA] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {cardElementError && (
                      <p className="text-[11px] text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{cardElementError}</span>
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "saved_card" && (
                  <SavedCardsPanel
                    savedMethods={savedMethods}
                    selectedSavedMethodId={selectedSavedMethodId}
                    onSelectSavedMethod={onSelectSavedMethod}
                    savedCardAction={savedCardAction}
                    updatingSavedMethodId={updatingSavedMethodId}
                    onStartUpdateSavedCard={onStartUpdateSavedCard}
                    onCancelUpdateSavedCard={onCancelUpdateSavedCard}
                    setAsDefaultCard={setAsDefaultCard}
                    onSetAsDefaultCardChange={onSetAsDefaultCardChange}
                    cardholderName={cardholderName}
                    onCardholderNameChange={onCardholderNameChange}
                    postalCode={postalCode}
                    onPostalCodeChange={onPostalCodeChange}
                    stripeElementsMounted={stripeElementsMounted}
                    cardByPhoneReady={configReady.cardByPhoneReady}
                    savedCardReady={configReady.savedCardReady}
                    stripeElementStyle={STRIPE_ELEMENT_STYLE}
                    onStripeFieldChange={onStripeFieldChange}
                    cardElementError={cardElementError}
                    onOpenSetupInfo={onOpenSetupInfo}
                    isPreviewMode={savedCardsPreviewActive}
                    previewReplacementCardId={previewReplacementCardId}
                    onSelectPreviewReplacementCard={onSelectPreviewReplacementCard}
                    compact={compactFieldWell || showPreviewStrip}
                  />
                )}

                {activeTab === "send_link" && (
                  <div
                    role="tabpanel"
                    aria-label="Send payment link"
                    className={showPreviewStrip ? "space-y-1.5" : "space-y-2.5"}
                  >
                    <div>
                      <label
                        htmlFor="pos-link-email"
                        className={`block text-[11.5px] font-medium text-[#D2DDF2] ${showPreviewStrip ? "mb-0.5" : "mb-1"}`}
                      >
                        Recipient email for Stripe checkout link
                      </label>
                      <div className={`pos-field-well rounded-[8px] ${showPreviewStrip ? "h-[30px]" : "h-[36px]"} px-3 flex items-center`}>
                        <input
                          id="pos-link-email"
                          type="email"
                          value={linkRecipientEmail}
                          onChange={(e) => onLinkRecipientEmailChange(e.target.value)}
                          placeholder="client@example.com"
                          className="w-full bg-transparent text-[13.5px] text-[#F4F7FF] placeholder-[#6C7FA6] focus:outline-none"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-[12px] text-[#CBD6EC] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendLinkByEmail}
                        disabled={!configReady.emailDeliveryReady}
                        onChange={(e) => onSendLinkByEmailChange(e.target.checked)}
                        className="rounded border-[#6D85B8] bg-[#040D21] accent-[#5650D8]"
                      />
                      <span>
                        Email checkout link automatically
                        {!configReady.emailDeliveryReady && (
                          <span className="text-amber-300/85"> (Gmail SMTP not configured)</span>
                        )}
                      </span>
                    </label>

                    {generatedLinkUrl ? (
                      <div className="pos-field-well rounded-[8px] p-2.5 space-y-1.5 border-cyan-400/35">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-300">
                            Pending payment
                          </span>
                          {generatedSessionId && (
                            <button
                              type="button"
                              onClick={onCheckLinkStatus}
                              disabled={isCheckingLink}
                              className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 cursor-pointer"
                            >
                              <RefreshCw className={`h-3 w-3 ${isCheckingLink ? "animate-spin" : ""}`} />
                              <span>Verify</span>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={generatedLinkUrl}
                            aria-label="Generated Stripe checkout URL"
                            className="flex-1 bg-[#030A1A] border border-white/10 rounded px-2 py-1 text-[11px] text-cyan-100 font-mono truncate"
                          />
                          <button
                            type="button"
                            onClick={onCopyLink}
                            className="h-7 px-2.5 rounded bg-[#1A2F5D] hover:bg-[#243E78] border border-[#D4AF60]/50 text-xs text-white inline-flex items-center gap-1 cursor-pointer"
                          >
                            {linkCopied ? (
                              <Check className="h-3 w-3 text-emerald-300" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span>{linkCopied ? "Copied" : "Copy"}</span>
                          </button>
                          <a
                            href={generatedLinkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="h-7 w-7 rounded bg-[#142750] hover:bg-[#1E3568] border border-white/15 text-cyan-200 inline-flex items-center justify-center"
                            title="Open Stripe Checkout"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11.5px] text-[#8FA4CD] leading-relaxed">
                        Creates a verified Stripe Checkout session for{" "}
                        <strong className="text-[#EDF2FC]">{formattedAmount}</strong>. Receipt remains
                        pending until confirmed by Stripe.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderKeypad = () => (
    <div className="flex flex-col pl-1">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[17.5px] text-[#F1F4FC] tracking-wide"
          style={{ fontFamily: '"Playfair Display", "Libre Baskerville", Georgia, serif' }}
        >
          Amount
        </span>
        {validationError && (
          <span className="text-[10.5px] font-medium text-rose-300 truncate max-w-[140px]">
            {validationError}
          </span>
        )}
      </div>

      <div role="group" aria-label="Amount keypad" className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <div key={digit} className="pos-key-pocket">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onDigitPress(digit)}
              aria-label={`Enter digit ${digit}`}
              className="pos-key-brass w-full h-[40px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <span
                className="pos-key-face-navy flex items-center justify-center text-[19px] font-medium text-[#F4F0E6]"
                style={{ fontFamily: '"Libre Baskerville", Georgia, serif' }}
              >
                {digit}
              </span>
            </button>
          </div>
        ))}

        <div className="pos-key-pocket">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onBackspacePress}
            aria-label="Backspace"
            title="Backspace"
            className="pos-key-brass w-full h-[40px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            <span className="pos-key-face-burgundy flex items-center justify-center text-[#FBF0F3]">
              <Delete className="h-[17px] w-[17px]" />
            </span>
          </button>
        </div>

        <div className="pos-key-pocket">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onDigitPress(0)}
            aria-label="Enter digit 0"
            className="pos-key-brass w-full h-[40px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <span
              className="pos-key-face-navy flex items-center justify-center text-[19px] font-medium text-[#F4F0E6]"
              style={{ fontFamily: '"Libre Baskerville", Georgia, serif' }}
            >
              0
            </span>
          </button>
        </div>

        <div className="pos-key-pocket">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClearPress}
            aria-label="Clear amount"
            className="pos-key-brass w-full h-[40px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            <span className="pos-key-face-indigo flex items-center justify-center text-[13px] font-medium text-[#F5F7FF]">
              Clear
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderChargeBar = () => (
    <div>
      <div className="pos-charge-pocket">
        <button
          type="button"
          data-testid="pos-charge-btn"
          disabled={primaryActionDisabled}
          onClick={handlePrimaryAction}
          className="pos-charge-gold w-full h-[49px] rounded-[11px] flex items-center justify-center gap-2 text-[22px] leading-none font-bold tracking-[-0.01em] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040D22]"
          style={{
            fontFamily: '"Playfair Display", "Libre Baskerville", Georgia, serif',
            fontVariantNumeric: "lining-nums tabular-nums",
          }}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-[#080c15]" />}
          <span>{chargeButtonLabel}</span>
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] text-[#A2B6DA]">
        <span>Processed securely by Stripe</span>
        {configReady.mode === "test" && (
          <span className="px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-300/35 text-amber-200 text-[9.5px] font-semibold uppercase tracking-wider">
            Test Mode
          </span>
        )}
        {isUnconfirmed && canVerifyUnconfirmed && (
          <button
            type="button"
            onClick={onResetStation}
            className="text-[#C8D7F2] hover:text-white underline underline-offset-2 cursor-pointer"
          >
            Reset station
          </button>
        )}
        {!activeTabConfigured && !isDeclined && !isSuccess && !isUnconfirmed && !isRequiresAction && !isOffline && (
          <button
            type="button"
            onClick={onOpenSetupInfo}
            className="text-amber-300/95 hover:text-amber-200 underline underline-offset-2 cursor-pointer"
          >
            Setup required
          </button>
        )}
      </div>
    </div>
  );

  const renderSuccessWaveText = (
    text: string,
    startIndex: number,
    variant: "status" | "amount"
  ) =>
    Array.from(text).map((ch, idx) =>
      ch === " " ? (
        <span key={`${successWaveKey}-${idx}`} className="inline-block w-[0.42em]">
          {" "}
        </span>
      ) : (
        <span
          key={`${successWaveKey}-${idx}`}
          data-wave-char={variant}
          className={
            variant === "amount" ? "pos-success-wave-amount-char" : "pos-success-wave-char"
          }
          style={{ animationDelay: `${(startIndex + idx) * 52}ms` }}
        >
          {ch}
        </span>
      )
    );

  const scaledHeight = Math.round(CANONICAL_HEIGHT * scale);

  return (
    <section
      aria-label="Waypoint Payment Register"
      className="relative w-full select-none"
    >
      {isDesktop ? (
        /* ── DESKTOP (md+): PROPORTIONALLY SCALED 800x557 CANONICAL 3D HARDWARE STAGE ── */
        <div
          ref={hostRef}
          className="relative w-full max-w-[1160px] mx-auto"
          style={{ height: `${scaledHeight}px` }}
        >
          <div
            className="relative origin-top-left"
            style={{
              width: `${CANONICAL_WIDTH}px`,
              height: `${CANONICAL_HEIGHT}px`,
              transform: `scale(${scale})`,
            }}
          >
            {/* Tightly Cropped Blank 3D Studio-Rendered Hardware Chassis */}
            <img
              src="/assets/pos/register-chassis-cropped.jpg"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pos-studio-blend pointer-events-none absolute inset-0 h-full w-full object-fill select-none"
            />

            {/* 1. LIVE DOT-MATRIX LED DISPLAY — locked inside the 3D recessed glass bezel */}
            <div
              className={`${ledGlassClass} absolute z-10 rounded-[12px] px-4 flex items-center justify-between gap-3`}
              style={{
                top: "9.2%",
                height: "10.0%",
                left: "17.6%",
                right: "17.0%",
              }}
              role="status"
              aria-live="polite"
              aria-label={`Register display: ${ledLeftText}, ${formattedAmount}`}
            >
              <span
                data-testid="pos-display-status"
                className={`${ledLeftClass} ${isSuccess
                  ? "text-[20px] whitespace-nowrap overflow-visible py-1.5"
                  : "text-[23px] truncate"
                  } leading-none`}
              >
                {isSuccess ? renderSuccessWaveText(ledLeftText, 0, "status") : ledLeftText}
              </span>
              <span
                data-testid="pos-display-amount"
                className={`pos-dotmatrix-amount text-[36px] leading-none shrink-0 ${isSuccess ? "whitespace-nowrap overflow-visible py-1" : ""
                  }`}
              >
                {isSuccess
                  ? renderSuccessWaveText(ledRightText, ledLeftText.length + 1, "amount")
                  : ledRightText}
              </span>
            </div>

            {/* 2. SERVICE / PLAN & INVOICE SELECTOR + PHYSICAL BRASS MANAGER KEY CYLINDER */}
            <div
              className="absolute z-10 flex items-center justify-between gap-2 px-1"
              style={{
                top: "20.6%",
                height: "6.4%",
                left: "16.8%",
                right: "16.8%",
              }}
            >
              <button
                type="button"
                onClick={isSelectClientMode ? onRequestSelectClient : onOpenPurposePicker}
                className="group inline-flex items-center gap-1.5 text-left text-[15px] text-[#EDF2FB] hover:text-[#FFE39A] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 rounded px-1 -mx-1 min-w-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                style={{ fontFamily: '"Playfair Display", "Libre Baskerville", Georgia, serif' }}
                title={
                  isSelectClientMode
                    ? "Select a client account"
                    : "Change invoice or authorized payment purpose"
                }
              >
                {mode === "donation" && (
                  <Heart className="h-3.5 w-3.5 text-[#E5C175] fill-[#E5C175]/30 shrink-0" />
                )}
                <span className="truncate">{subtitleText}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#9BB0D4] group-hover:text-[#FFE39A] transition-colors shrink-0" />
              </button>

              <div className="flex items-center gap-2 shrink-0">
                {mode === "donation" && onExitDonationMode ? (
                  <button
                    type="button"
                    onClick={onExitDonationMode}
                    className="text-[11.5px] font-medium text-[#DFBE77] hover:text-[#FFF1C4] underline underline-offset-2 shrink-0 cursor-pointer"
                  >
                    Exit donation
                  </button>
                ) : (
                  <>
                    {showResetAmount && onResetAmount && (
                      <button
                        type="button"
                        onClick={onResetAmount}
                        className="inline-flex items-center gap-1 text-[11.5px] text-cyan-300/90 hover:text-cyan-200 transition-colors shrink-0 cursor-pointer"
                        title="Reset amount to invoice balance"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Full balance</span>
                      </button>
                    )}
                    {hasSelectedClient && onClearClient && (
                      <button
                        type="button"
                        data-testid="pos-apron-clear-client-btn"
                        onClick={onClearClient}
                        className="text-[11px] font-medium text-[#A9BCDE] hover:text-[#FFF1C4] underline underline-offset-2 shrink-0 cursor-pointer"
                        title="Clear active client and return to Select Client standby mode"
                      >
                        Clear client
                      </button>
                    )}
                  </>
                )}

                {/* Physical Brass Key Inserted Inside Machined Cylinder Keyhole + Jewel Green LED */}
                <button
                  type="button"
                  data-testid="pos-manager-key-btn"
                  data-manager-mode={managerMode}
                  onClick={onManagerKeyClick}
                  aria-expanded={managerMode !== "locked"}
                  title={
                    managerMode === "unlocked"
                      ? "Manager Key turned 90° in keyhole (unlocked) — click to lock"
                      : managerMode === "pin"
                        ? "Cancel Manager PIN entry"
                        : "Manager Key — click and enter 4-digit code"
                  }
                  className="pos-manager-key-assembly group inline-flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded-full"
                >
                  {/* Recessed leather mounting pocket holding the real 3D brass lock cylinder with key inserted in keyhole */}
                  <span
                    className={`pos-keylock-socket relative inline-flex items-center justify-center w-[42px] h-[42px] rounded-full ${managerMode === "unlocked" ? "pos-keylock-socket-unlocked" : ""
                      }`}
                  >
                    <img
                      src="/assets/pos/manager-key-in-lock.png"
                      alt="Brass manager key inserted in keyhole"
                      draggable={false}
                      data-testid="pos-manager-key-icon"
                      className="pos-physical-brass-key pointer-events-none w-[42px] h-[42px] object-contain select-none"
                      style={{
                        transform:
                          managerMode === "unlocked"
                            ? "rotate(90deg)"
                            : managerMode === "pin"
                              ? "rotate(25deg)"
                              : "rotate(0deg)",
                      }}
                    />
                  </span>

                  {/* Brass-bezeled hardware jewel indicator LED (lights bright green on valid unlock) */}
                  <span className="pos-key-led-bezel inline-flex items-center justify-center w-[13px] h-[13px] rounded-full shrink-0">
                    <span
                      data-testid="pos-manager-key-led"
                      data-led-state={managerMode === "unlocked" ? "green" : "off"}
                      aria-hidden="true"
                      className={`w-[8px] h-[8px] rounded-full transition-all duration-300 ${managerMode === "unlocked"
                        ? "bg-[#2ce88f] shadow-[0_0_8px_rgba(44,232,143,1),0_0_16px_rgba(22,212,124,0.82)]"
                        : managerMode === "pin"
                          ? "bg-[#f4c454] shadow-[0_0_6px_rgba(244,196,84,0.78)]"
                          : "bg-[#081327] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]"
                        }`}
                    />
                  </span>
                </button>
              </div>
            </div>

            {/* 3. LOWER SLOPING CONTROL BAY — guaranteed 100% inside the brass frame with generous breathing room above Charge bar */}
            <div
              className="absolute z-10 flex flex-col justify-between"
              style={{
                top: "31.2%",
                bottom: "12.2%",
                left: "9.8%",
                right: "9.8%",
              }}
            >
              {/* Upper Two-Column Bay */}
              <div className="px-[22px] grid grid-cols-[1.36fr_1px_0.92fr] gap-4 items-start">
                {renderTabsAndForms()}
                <div
                  aria-hidden="true"
                  className="self-stretch w-[1px] my-1"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(212, 178, 108, 0.14) 0%, rgba(128, 152, 204, 0.32) 50%, rgba(212, 178, 108, 0.14) 100%)",
                  }}
                />
                {renderKeypad()}
              </div>

              {/* Bottom Brushed-Gold Charge Bar + Stripe Caption cleanly ABOVE lower brass rail */}
              <div className="px-[10px]">{renderChargeBar()}</div>
            </div>
          </div>
        </div>
      ) : (
        /* ── MOBILE (< md): COMPACT BRASS-TRIMMED FINE LEATHER HOUSING (ZERO HORIZONTAL SCROLL) ── */
        <div className="relative w-full rounded-[22px] border-[2.5px] border-[#CFA85B] pos-mobile-leather shadow-[0_18px_48px_rgba(0,0,0,0.82)] overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-[#C8A157]/35">
            <div className="pos-display-bezel-mobile rounded-[16px] p-[3.5px]">
              <div
                className={`rounded-[12.5px] bg-[#020B18] ${ledGlassClass} px-3.5 py-2.5 flex items-center justify-between gap-2 min-h-[54px]`}
                role="status"
                aria-live="polite"
              >
                <span
                  data-testid="pos-display-status"
                  className={`${ledLeftClass} text-[15px] leading-none ${isSuccess ? "whitespace-nowrap overflow-visible py-1" : "truncate"
                    }`}
                >
                  {isSuccess ? renderSuccessWaveText(ledLeftText, 0, "status") : ledLeftText}
                </span>
                <span
                  data-testid="pos-display-amount"
                  className={`pos-dotmatrix-amount text-[24px] leading-none shrink-0 ${isSuccess ? "whitespace-nowrap overflow-visible py-1" : ""
                    }`}
                >
                  {isSuccess
                    ? renderSuccessWaveText(ledRightText, ledLeftText.length + 1, "amount")
                    : ledRightText}
                </span>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <button
                type="button"
                onClick={onOpenPurposePicker}
                className="inline-flex items-center gap-1.5 text-left text-[13.5px] text-[#ECF1FA] max-w-full"
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                {mode === "donation" && (
                  <Heart className="h-3.5 w-3.5 text-[#E5C175] fill-[#E5C175]/30 shrink-0" />
                )}
                <span className="truncate">{subtitleText}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#9BB0D4] shrink-0" />
              </button>

              <div className="flex items-center gap-2">
                {mode === "donation" && onExitDonationMode && (
                  <button
                    type="button"
                    onClick={onExitDonationMode}
                    className="text-[11px] font-medium text-[#DFBE77] underline underline-offset-2"
                  >
                    Exit donation
                  </button>
                )}
                <button
                  type="button"
                  data-testid="pos-manager-key-btn"
                  data-manager-mode={managerMode}
                  onClick={onManagerKeyClick}
                  title="Manager Key — enter 4-digit code"
                  className="pos-manager-key-assembly inline-flex items-center gap-2 cursor-pointer rounded-full"
                >
                  <span
                    className={`pos-keylock-socket relative inline-flex items-center justify-center w-[38px] h-[38px] rounded-full ${managerMode === "unlocked" ? "pos-keylock-socket-unlocked" : ""
                      }`}
                  >
                    <img
                      src="/assets/pos/manager-key-in-lock.png"
                      alt="Brass manager key inserted in keyhole"
                      draggable={false}
                      data-testid="pos-manager-key-icon"
                      className="pos-physical-brass-key pointer-events-none w-[38px] h-[38px] object-contain select-none"
                      style={{
                        transform:
                          managerMode === "unlocked"
                            ? "rotate(90deg)"
                            : managerMode === "pin"
                              ? "rotate(25deg)"
                              : "rotate(0deg)",
                      }}
                    />
                  </span>
                  <span className="pos-key-led-bezel inline-flex items-center justify-center w-[12px] h-[12px] rounded-full shrink-0">
                    <span
                      data-testid="pos-manager-key-led"
                      data-led-state={managerMode === "unlocked" ? "green" : "off"}
                      aria-hidden="true"
                      className={`w-[7.5px] h-[7.5px] rounded-full transition-all duration-300 ${managerMode === "unlocked"
                        ? "bg-[#2ce88f] shadow-[0_0_8px_rgba(44,232,143,1),0_0_16px_rgba(22,212,124,0.82)]"
                        : managerMode === "pin"
                          ? "bg-[#f4c454] shadow-[0_0_6px_rgba(244,196,84,0.78)]"
                          : "bg-[#081327] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]"
                        }`}
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {renderTabsAndForms()}
            {renderKeypad()}
            {renderChargeBar()}
          </div>
        </div>
      )}
    </section>
  );
}

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ScopedErrorBoundary from "@/components/ScopedErrorBoundary";
import {
  appendKeypadDigitCents,
  backspaceKeypadCents,
  classifyPaymentErrorKind,
  clearKeypadCents,
  DONATION_FUND_OPTIONS,
  evaluateDonationCompliance,
  formatCents,
  MIN_PAYMENT_CENTS,
  parseCurrencyInputToCents,
  PAYMENT_DECLINED_INLINE_MESSAGE,
  PAYMENT_UNCONFIRMED_INLINE_MESSAGE,
  validateInvoicePaymentAmountCents,
  type PaymentStationMethod,
  type PaymentStationMode,
  type PaymentStationReceiptStatus,
} from "@shared/paymentStation";
import { PaymentRegister, type RegisterSavedMethod } from "@/components/paymentStation/PaymentRegister";
import {
  MANAGER_PREVIEW_SCENARIOS,
  type ManagerKeyMode,
  type ManagerPreviewScenario,
} from "@/components/paymentStation/ManagerKeyPanel";
import type { RegisterDonationFormState } from "@/components/paymentStation/RegisterDonationPanel";
import { PREVIEW_REPLACEMENT_CARDS } from "@/components/paymentStation/SavedCardsPanel";
import { PaymentStationHeaderBar } from "@/components/paymentStation/PaymentStationHeaderBar";
import { ReceiptPrinter } from "@/components/paymentStation/ReceiptPrinter";
import {
  ClientInvoiceModal,
  type PickerInvoiceItem,
  type PickerServiceItem,
} from "@/components/paymentStation/ClientInvoiceModal";
import { RecentPaymentsDrawer } from "@/components/paymentStation/RecentPaymentsDrawer";
import { StripeSetupDialog } from "@/components/paymentStation/StripeSetupDialog";
import {
  playCardDeclinedSound,
  playManagerKeyPong,
  playPaymentPaidChaChingSound,
  playReceiptPaperFeedSound,
} from "@/components/paymentStation/posSounds";
import "@/components/paymentStation/paymentStation.css";

const MANAGER_KEY_CODE = "1148";

const INITIAL_MANAGER_PREVIEW_SAVED_CARDS: RegisterSavedMethod[] = [
  {
    id: "mgr-preview-1",
    stripePaymentMethodId: "pm_preview_visa_4242",
    brand: "visa",
    last4: "4242",
    expMonth: 11,
    expYear: 2029,
    isDefault: true,
    chargeable: true,
  },
  {
    id: "mgr-preview-2",
    stripePaymentMethodId: "pm_preview_mc_8819",
    brand: "mastercard",
    last4: "8819",
    expMonth: 12,
    expYear: 2026,
    isDefault: false,
    chargeable: true,
  },
  {
    id: "mgr-preview-3",
    stripePaymentMethodId: "pm_preview_amex_1004",
    brand: "amex",
    last4: "1004",
    expMonth: 8,
    expYear: 2028,
    isDefault: false,
    chargeable: true,
  },
];

const INITIAL_DONATION_FORM: RegisterDonationFormState = {
  donorSource: "account",
  donorClientId: null,
  donorName: "",
  donorEmail: "",
  donorAddress: "",
  fundId: DONATION_FUND_OPTIONS[0].id,
  fundName: DONATION_FUND_OPTIONS[0].name,
  noGoodsOrServicesProvided: true,
  goodsOrServicesDescription: "",
  goodsOrServicesFmvInput: "",
  note: "",
};

interface VerifiedReceiptState {
  transactionId: number | null;
  receiptNumber: string | null;
  status: PaymentStationReceiptStatus;
  paymentMethodSummary: string | null;
  transactionRef: string | null;
  paymentIntentId: string | null;
  checkoutUrl: string | null;
  sessionId: string | null;
  sentToEmail: string | null;
  sendError: string | null;
}

const INITIAL_RECEIPT_STATE: VerifiedReceiptState = {
  transactionId: null,
  receiptNumber: null,
  status: "awaiting_payment",
  paymentMethodSummary: null,
  transactionRef: null,
  paymentIntentId: null,
  checkoutUrl: null,
  sessionId: null,
  sentToEmail: null,
  sendError: null,
};

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function PaymentStationTerminal({ stripeMounted }: { stripeMounted: boolean }) {
  const [, setLocation] = useLocation();
  const stripe = useStripe();
  const elements = useElements();

  // Queries
  const configQuery = trpc.paymentStation.getConfig.useQuery(undefined, {
    retry: false,
  });
  const clientsQuery = trpc.paymentStation.searchClients.useQuery(
    {},
    { enabled: !configQuery.isError }
  );
  const recentQuery = trpc.paymentStation.listRecentPayments.useQuery(
    { limit: 30 },
    { enabled: !configQuery.isError }
  );

  // Core selection state
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [mode, setMode] = useState<PaymentStationMode>("invoice");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedServiceTitle, setSelectedServiceTitle] = useState<string>("Anchor Plan");
  const [donationForm, setDonationForm] = useState<RegisterDonationFormState>(INITIAL_DONATION_FORM);
  const [donationSubView, setDonationSubView] = useState<"donor" | "payment">("donor");
  const [preservedInvoiceAmountCents, setPreservedInvoiceAmountCents] = useState<number>(0);

  // Synchronized integer-cents amount state
  const [amountCents, setAmountCents] = useState<number>(0);
  const [isFreshPrefill, setIsFreshPrefill] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<PaymentStationMethod>("card_by_phone");

  // Card by phone non-PCI state
  const [cardholderName, setCardholderName] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [stripeCardReady, setStripeCardReady] = useState({
    number: false,
    expiry: false,
    cvc: false,
  });
  const [cardElementError, setCardElementError] = useState<string | null>(null);

  // Saved card state + in-register Update card & Update & charge flow
  const [selectedSavedMethodId, setSelectedSavedMethodId] = useState<string | null>(null);
  const [savedCardAction, setSavedCardAction] = useState<"list" | "update">("list");
  const [updatingSavedMethodId, setUpdatingSavedMethodId] = useState<string | null>(null);
  const [setAsDefaultCard, setSetAsDefaultCard] = useState<boolean>(true);

  // Send link state
  const [linkRecipientEmail, setLinkRecipientEmail] = useState<string>("");
  const [sendLinkByEmail, setSendLinkByEmail] = useState<boolean>(false);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // Transaction & receipt state
  const [receiptState, setReceiptState] = useState<VerifiedReceiptState>(INITIAL_RECEIPT_STATE);
  const [paperFeedKey, setPaperFeedKey] = useState<number>(0);
  const [processorError, setProcessorError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const submissionLockRef = useRef<boolean>(false);
  const paidPrintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals, drawers & top-bar Client dropdown trigger
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [pickerInitialView, setPickerInitialView] = useState<"client" | "purpose">("client");
  const [clientDropdownRequestKey, setClientDropdownRequestKey] = useState<number>(0);
  const [recentDrawerOpen, setRecentDrawerOpen] = useState<boolean>(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState<boolean>(false);
  const [registerScaledHeight, setRegisterScaledHeight] = useState<number>(580);
  const printerFeetLiftPx = Math.max(24, Math.round(registerScaledHeight * 0.074 - 4));

  // Physical Manager Key switch & ephemeral visual preview state (never persists to DB or fakes charges)
  const [managerMode, setManagerMode] = useState<ManagerKeyMode>("locked");
  const [managerPanelVisible, setManagerPanelVisible] = useState<boolean>(false);
  const [managerPinDigits, setManagerPinDigits] = useState<string>("");
  const [managerPinError, setManagerPinError] = useState<string | null>(null);
  const [activePreviewScenario, setActivePreviewScenario] =
    useState<ManagerPreviewScenario | null>(null);
  const [successWaveKey, setSuccessWaveKey] = useState<number>(0);
  const [managerPreviewSavedMethods, setManagerPreviewSavedMethods] = useState<
    RegisterSavedMethod[] | null
  >(null);
  const [previewReplacementCardId, setPreviewReplacementCardId] = useState<string>(
    PREVIEW_REPLACEMENT_CARDS[0].id
  );
  const [managerPreviewPaymentSummary, setManagerPreviewPaymentSummary] = useState<string | null>(
    null
  );
  const [managerPreviewReceiptSentTo, setManagerPreviewReceiptSentTo] = useState<string | null>(
    null
  );
  const [managerPreviewDonationForm, setManagerPreviewDonationForm] =
    useState<RegisterDonationFormState>({
      ...INITIAL_DONATION_FORM,
      donorSource: "custom",
      donorName: "Preview Supporter",
      donorEmail: "preview@waypointadvocates.com",
      donorAddress: "1200 Peachtree St NE, Atlanta, GA 30309",
    });
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);

  // Live automatic browser online / offline connectivity monitoring
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setIsBrowserOnline(true);
      toast.success("Internet connection restored — Payment Station is back online.");
      configQuery.refetch();
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
      toast.warning("Internet disconnected — payments paused until connection returns.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [configQuery]);

  const clients = clientsQuery.data ?? [];

  // Station boots & resets in clean Select Client standby mode so no prior client account lingers active.
  const billingQuery = trpc.paymentStation.getClientBillingContext.useQuery(
    { clientId: selectedClientId ?? 0 },
    { enabled: Boolean(selectedClientId) }
  );

  // Never leak cached billing data from a previously cleared client once selectedClientId is null
  const billing = selectedClientId ? billingQuery.data : undefined;

  // Hydrate invoice / service / cardholder / saved card when client billing loads
  useEffect(() => {
    if (!billing) return;

    if (mode !== "donation") {
      setCardholderName(billing.client.name);
      setLinkRecipientEmail(billing.client.email || "");
      const defaultSaved =
        billing.savedMethods.find((m) => m.isDefault) || billing.savedMethods[0] || null;
      setSelectedSavedMethodId(defaultSaved?.stripePaymentMethodId ?? null);

      const firstOpenInvoice = billing.invoices[0] || null;
      if (firstOpenInvoice) {
        setMode("invoice");
        setSelectedInvoiceId(firstOpenInvoice.id);
        setSelectedServiceId(null);
        setAmountCents(firstOpenInvoice.remainingCents);
        setPreservedInvoiceAmountCents(firstOpenInvoice.remainingCents);
        setIsFreshPrefill(true);
      } else {
        const firstService = billing.authorizedServices[0] || null;
        setMode("service");
        setSelectedInvoiceId(null);
        setSelectedServiceId(firstService?.id ?? null);
        setSelectedServiceTitle(firstService?.title || billing.client.planTier || "Advocacy Plan");
        const initialCents =
          firstService && firstService.standardPriceCents > 0 ? firstService.standardPriceCents : 10500;
        setAmountCents(initialCents);
        setPreservedInvoiceAmountCents(initialCents);
        setIsFreshPrefill(true);
      }
      setReceiptState(INITIAL_RECEIPT_STATE);
      setProcessorError(null);
    }
  }, [billing?.client.id]);

  // Keyboard shortcut Cmd+K / Ctrl+K is handled directly by PaymentStationHeaderBar's matching brass dropdown.

  // Mutations
  const createCardIntentMut = trpc.paymentStation.createCardPaymentIntent.useMutation();
  const chargeSavedCardMut = trpc.paymentStation.chargeSavedCard.useMutation();
  const createLinkMut = trpc.paymentStation.createPaymentLink.useMutation();
  const verifyResultMut = trpc.paymentStation.verifyPaymentResult.useMutation();
  const sendReceiptMut = trpc.paymentStation.sendReceipt.useMutation();

  const selectedInvoice = useMemo(
    () => billing?.invoices.find((i) => i.id === selectedInvoiceId) || null,
    [billing?.invoices, selectedInvoiceId]
  );

  const isScenarioPreview = managerMode === "unlocked" && activePreviewScenario !== null;
  const isDonationPreview = isScenarioPreview && activePreviewScenario === "donation";
  const effectiveMode: PaymentStationMode = isScenarioPreview
    ? isDonationPreview
      ? "donation"
      : "invoice"
    : mode;
  const effectiveDonationForm = isDonationPreview ? managerPreviewDonationForm : donationForm;

  const donationFmvCents = effectiveDonationForm.noGoodsOrServicesProvided
    ? 0
    : parseCurrencyInputToCents(effectiveDonationForm.goodsOrServicesFmvInput);

  const donationCompliance = useMemo(
    () =>
      evaluateDonationCompliance({
        donorName: effectiveDonationForm.donorName,
        donorEmail: effectiveDonationForm.donorEmail,
        donorAddress: effectiveDonationForm.donorAddress,
        amountCents:
          isDonationPreview && amountCents === 0 ? 5000 : amountCents,
        fundId: effectiveDonationForm.fundId,
        noGoodsOrServicesProvided: effectiveDonationForm.noGoodsOrServicesProvided,
        goodsOrServicesDescription: effectiveDonationForm.goodsOrServicesDescription,
        goodsOrServicesFmvCents: donationFmvCents,
        is501c3Active: false,
      }),
    [effectiveDonationForm, amountCents, donationFmvCents, isDonationPreview]
  );

  const donationComplianceStatus: "pass" | "warn" | "fail" =
    donationCompliance.blockingIssues.length > 0
      ? "fail"
      : donationCompliance.warnings.length > 0
        ? "warn"
        : "pass";

  const effectiveHasSelectedClient = isScenarioPreview
    ? activePreviewScenario !== "select_client"
    : Boolean(selectedClientId);

  const effectiveAmountCents = (() => {
    if (isScenarioPreview && activePreviewScenario === "select_client") return 0;
    if (isDonationPreview) return amountCents > 0 ? amountCents : 5000;
    if (isScenarioPreview) return amountCents > 0 ? amountCents : 10500;
    return amountCents;
  })();

  // Compute live synchronized display & receipt labels
  const displayName =
    effectiveMode === "donation"
      ? effectiveDonationForm.donorName.trim() || "Supporter"
      : !effectiveHasSelectedClient
        ? "Select client"
        : billing?.client.name || "Preview Client";

  const activeDescription =
    effectiveMode === "donation"
      ? "Donation"
      : !effectiveHasSelectedClient
        ? "Ready for payment"
        : billing
          ? mode === "invoice" && selectedInvoice
            ? selectedInvoice.title
            : selectedServiceTitle
          : "Advocacy Plan (Preview)";

  const activeSubtitle =
    effectiveMode === "donation"
      ? `${effectiveDonationForm.donorName.trim() || "Attach donor"}  ·  ${effectiveDonationForm.fundName}`
      : !effectiveHasSelectedClient
        ? "Select a client account to begin"
        : billing
          ? mode === "invoice" && selectedInvoice
            ? `${selectedInvoice.title}  ·  Invoice ${selectedInvoice.invoiceNumber}`
            : `${selectedServiceTitle}  ·  Authorized payment`
          : "Preview Client  ·  State Tester";

  // Live amount validation against invoice balance rules
  const validationError = useMemo(() => {
    if (amountCents === 0) return null;
    if (amountCents < MIN_PAYMENT_CENTS) {
      return `Min ${formatCents(MIN_PAYMENT_CENTS)}`;
    }
    if (mode === "invoice" && selectedInvoice) {
      const check = validateInvoicePaymentAmountCents({
        invoiceStatus: selectedInvoice.status,
        invoiceTotalCents: selectedInvoice.totalCents,
        amountPaidCents: selectedInvoice.amountPaidCents,
        requestedPaymentCents: amountCents,
      });
      if (!check.valid) {
        return `Max ${formatCents(selectedInvoice.remainingCents)}`;
      }
    }
    return null;
  }, [amountCents, mode, selectedInvoice]);

  // Keypad handlers (exact integer cents)
  const resetReceiptIfTerminal = useCallback(() => {
    setProcessorError(null);
    setReceiptState((prev) =>
      prev.status === "paid" || prev.status === "failed" ? INITIAL_RECEIPT_STATE : prev
    );
  }, []);

  const cancelPendingPaidPrint = useCallback(() => {
    if (paidPrintTimerRef.current) {
      clearTimeout(paidPrintTimerRef.current);
      paidPrintTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelPendingPaidPrint(), [cancelPendingPaidPrint]);

  const handleLockManager = useCallback(() => {
    cancelPendingPaidPrint();
    setManagerMode("locked");
    setManagerPanelVisible(false);
    setManagerPinDigits("");
    setManagerPinError(null);
    setActivePreviewScenario(null);
    setManagerPreviewSavedMethods(null);
    setManagerPreviewPaymentSummary(null);
    setManagerPreviewReceiptSentTo(null);
    setSavedCardAction("list");
    setUpdatingSavedMethodId(null);
  }, [cancelPendingPaidPrint]);

  const handleManagerKeyClick = useCallback(() => {
    if (managerMode === "unlocked") {
      handleLockManager();
    } else if (managerMode === "pin") {
      setManagerMode("locked");
      setManagerPinDigits("");
      setManagerPinError(null);
    } else {
      setManagerMode("pin");
      setManagerPinDigits("");
      setManagerPinError(null);
    }
  }, [managerMode, handleLockManager]);

  const handleSubmitManagerPin = useCallback(() => {
    if (managerPinDigits === MANAGER_KEY_CODE) {
      playManagerKeyPong();
      setManagerMode("unlocked");
      setManagerPanelVisible(true);
      setManagerPinDigits("");
      setManagerPinError(null);
      toast.success("Manager key unlocked — 12-state tester active.");
    } else {
      setManagerPinError("Incorrect 4-digit code. Try again.");
      setManagerPinDigits("");
    }
  }, [managerPinDigits]);

  const handleCancelManagerPin = useCallback(() => {
    setManagerMode("locked");
    setManagerPinDigits("");
    setManagerPinError(null);
  }, []);

  const triggerReceiptPaperFeed = useCallback(() => {
    setPaperFeedKey((k) => k + 1);
    playReceiptPaperFeedSound();
  }, []);

  /**
   * Choreographs Payment Paid hardware audio & visuals:
   * t = 0ms   -> Vintage brass cash register "CHA-CHING!" + green display wave
   * t = 340ms -> Thermal receipt printer motor + paper feed emergence
   */
  const triggerPaymentPaidEffects = useCallback(() => {
    cancelPendingPaidPrint();
    setSuccessWaveKey((k) => k + 1);
    playPaymentPaidChaChingSound();
    paidPrintTimerRef.current = setTimeout(() => {
      paidPrintTimerRef.current = null;
      triggerReceiptPaperFeed();
    }, 340);
  }, [cancelPendingPaidPrint, triggerReceiptPaperFeed]);

  const ensurePreviewSavedMethods = useCallback(() => {
    let cards = managerPreviewSavedMethods;
    if (!cards || cards.length === 0) {
      cards = INITIAL_MANAGER_PREVIEW_SAVED_CARDS.map((c) => ({ ...c }));
      setManagerPreviewSavedMethods(cards);
    }
    return cards;
  }, [managerPreviewSavedMethods]);

  const handleSelectPreviewScenario = useCallback(
    (scenario: ManagerPreviewScenario) => {
      cancelPendingPaidPrint();
      setActivePreviewScenario(scenario);
      setManagerPanelVisible(false);
      setManagerPreviewReceiptSentTo(null);
      setProcessorError(null);

      if (scenario === "saved_cards") {
        const cards = ensurePreviewSavedMethods();
        setSelectedSavedMethodId(cards[0]?.stripePaymentMethodId ?? null);
        setActiveTab("saved_card");
        setSavedCardAction("list");
        setUpdatingSavedMethodId(null);
        setManagerPreviewPaymentSummary(null);
        return;
      }

      if (scenario === "update_card") {
        const cards = ensurePreviewSavedMethods();
        const firstId = cards[0]?.stripePaymentMethodId ?? null;
        setSelectedSavedMethodId(firstId);
        setActiveTab("saved_card");
        setSavedCardAction("update");
        setUpdatingSavedMethodId(firstId);
        setSetAsDefaultCard(true);
        setManagerPreviewPaymentSummary(null);
        return;
      }

      setSavedCardAction("list");
      setUpdatingSavedMethodId(null);

      if (scenario === "pending") {
        setActiveTab("send_link");
        if (!linkRecipientEmail.trim()) {
          setLinkRecipientEmail("preview@waypointadvocates.com");
        }
        triggerReceiptPaperFeed();
        return;
      }

      if (scenario === "donation") {
        setDonationSubView("donor");
        return;
      }

      if (scenario === "paid") {
        triggerPaymentPaidEffects();
        return;
      }

      if (scenario === "failed") {
        setActiveTab("card_by_phone");
        playCardDeclinedSound();
        return;
      }

      if (
        scenario === "select_client" ||
        scenario === "ready" ||
        scenario === "processing" ||
        scenario === "unconfirmed" ||
        scenario === "requires_action"
      ) {
        setActiveTab("card_by_phone");
      }
    },
    [
      cancelPendingPaidPrint,
      ensurePreviewSavedMethods,
      linkRecipientEmail,
      triggerPaymentPaidEffects,
      triggerReceiptPaperFeed,
    ]
  );

  const handleStepPreviewScenario = useCallback(
    (delta: -1 | 1) => {
      const total = MANAGER_PREVIEW_SCENARIOS.length;
      const currentIdx = activePreviewScenario
        ? MANAGER_PREVIEW_SCENARIOS.findIndex((s) => s.id === activePreviewScenario)
        : -1;
      const nextIdx =
        currentIdx < 0
          ? delta > 0
            ? 0
            : total - 1
          : (currentIdx + delta + total) % total;
      handleSelectPreviewScenario(MANAGER_PREVIEW_SCENARIOS[nextIdx].id);
    },
    [activePreviewScenario, handleSelectPreviewScenario]
  );

  const handleRetryConnection = useCallback(async () => {
    // If previewing offline state via Manager Tools, restoring exits offline preview cleanly
    if (managerMode === "unlocked" && activePreviewScenario === "offline" && isBrowserOnline) {
      setActivePreviewScenario(selectedClientId ? "ready" : "select_client");
      toast.success("Preview: Internet connection restored.");
      return;
    }

    setIsCheckingConnection(true);
    try {
      const res = await fetch("/api/trpc/auth.me", { cache: "no-store" });
      if (res.ok || res.status < 500) {
        setIsBrowserOnline(true);
        toast.success("Internet connection restored — Payment Station is back online.");
        configQuery.refetch();
      } else {
        setIsBrowserOnline(false);
        toast.error("Still unable to reach Waypoint servers.");
      }
    } catch {
      setIsBrowserOnline(false);
      toast.error("Still offline — check Wi-Fi or Ethernet connection.");
    } finally {
      setIsCheckingConnection(false);
    }
  }, [managerMode, activePreviewScenario, isBrowserOnline, selectedClientId, configQuery]);

  const handleStartUpdateSavedCard = useCallback((pmId: string | null) => {
    setUpdatingSavedMethodId(pmId);
    setSavedCardAction("update");
    setSetAsDefaultCard(true);
    setCardElementError(null);
  }, []);

  const handleCancelUpdateSavedCard = useCallback(() => {
    setSavedCardAction("list");
    setUpdatingSavedMethodId(null);
    setCardElementError(null);
  }, []);

  // Physical keyboard support while entering 4-digit Manager Key code (0-9, Backspace, Enter, Escape)
  useEffect(() => {
    if (managerMode !== "pin") return;
    const onPinKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setManagerPinError(null);
        setManagerPinDigits((prev) => (prev.length < 4 ? prev + e.key : prev));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setManagerPinError(null);
        setManagerPinDigits((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSubmitManagerPin();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancelManagerPin();
      }
    };
    window.addEventListener("keydown", onPinKeyDown);
    return () => window.removeEventListener("keydown", onPinKeyDown);
  }, [managerMode, handleSubmitManagerPin, handleCancelManagerPin]);

  const handleDigitPress = useCallback(
    (digit: number) => {
      if (managerMode === "pin") {
        setManagerPinError(null);
        setManagerPinDigits((prev) => (prev.length < 4 ? prev + String(digit) : prev));
        return;
      }
      if (
        activePreviewScenario &&
        activePreviewScenario !== "saved_cards" &&
        activePreviewScenario !== "update_card" &&
        activePreviewScenario !== "donation" &&
        activePreviewScenario !== "ready"
      ) {
        setActivePreviewScenario("ready");
      }
      resetReceiptIfTerminal();
      setAmountCents((prev) =>
        appendKeypadDigitCents(prev, digit, { replacePrefill: isFreshPrefill })
      );
      setIsFreshPrefill(false);
    },
    [managerMode, activePreviewScenario, isFreshPrefill, resetReceiptIfTerminal]
  );

  const handleBackspacePress = useCallback(() => {
    if (managerMode === "pin") {
      setManagerPinError(null);
      setManagerPinDigits((prev) => prev.slice(0, -1));
      return;
    }
    resetReceiptIfTerminal();
    setAmountCents((prev) => backspaceKeypadCents(prev));
    setIsFreshPrefill(false);
  }, [managerMode, resetReceiptIfTerminal]);

  const handleClearPress = useCallback(() => {
    if (managerMode === "pin") {
      setManagerPinError(null);
      setManagerPinDigits("");
      return;
    }
    resetReceiptIfTerminal();
    setAmountCents(clearKeypadCents());
    setIsFreshPrefill(false);
  }, [managerMode, resetReceiptIfTerminal]);

  const handleResetToInvoiceBalance = useCallback(() => {
    if (selectedInvoice) {
      setAmountCents(selectedInvoice.remainingCents);
      setIsFreshPrefill(true);
      setProcessorError(null);
    }
  }, [selectedInvoice]);

  const handleSelectInvoice = (inv: PickerInvoiceItem) => {
    setMode("invoice");
    setSelectedInvoiceId(inv.id);
    setSelectedServiceId(null);
    setAmountCents(inv.remainingCents);
    setPreservedInvoiceAmountCents(inv.remainingCents);
    setIsFreshPrefill(true);
    setReceiptState(INITIAL_RECEIPT_STATE);
    setProcessorError(null);
  };

  const handleSelectService = (svc: PickerServiceItem) => {
    setMode("service");
    setSelectedInvoiceId(null);
    setSelectedServiceId(svc.id);
    setSelectedServiceTitle(svc.title);
    const nextCents = svc.standardPriceCents > 0 ? svc.standardPriceCents : 10500;
    setAmountCents(nextCents);
    setPreservedInvoiceAmountCents(nextCents);
    setIsFreshPrefill(true);
    setReceiptState(INITIAL_RECEIPT_STATE);
    setProcessorError(null);
  };

  const handleExitDonationMode = useCallback(() => {
    if (!selectedClientId) {
      setMode("invoice");
      setAmountCents(0);
      setCardholderName("");
      setLinkRecipientEmail("");
      setIsFreshPrefill(true);
      setReceiptState(INITIAL_RECEIPT_STATE);
      setProcessorError(null);
      return;
    }
    if (selectedInvoice) {
      setMode("invoice");
      setAmountCents(selectedInvoice.remainingCents);
    } else {
      setMode("service");
      setAmountCents(preservedInvoiceAmountCents || 10500);
    }
    setCardholderName(billing?.client.name || "");
    setLinkRecipientEmail(billing?.client.email || "");
    setIsFreshPrefill(true);
    setReceiptState(INITIAL_RECEIPT_STATE);
    setProcessorError(null);
  }, [
    selectedClientId,
    selectedInvoice,
    preservedInvoiceAmountCents,
    billing?.client.name,
    billing?.client.email,
  ]);

  const handleToggleDonationMode = useCallback(() => {
    if (mode === "donation") {
      handleExitDonationMode();
      return;
    }
    // Enter Donation Mode directly ON the cash register (no separate popup window!)
    // Preserve selectedInvoiceId & balance untouched so exiting restores it cleanly.
    setPreservedInvoiceAmountCents(selectedInvoice?.remainingCents ?? amountCents);
    const attachedClient = billing?.client ?? null;
    setDonationForm({
      ...INITIAL_DONATION_FORM,
      donorSource: attachedClient ? "account" : "custom",
      donorClientId: attachedClient?.id ?? null,
      donorName: attachedClient?.name ?? "",
      donorEmail: attachedClient?.email ?? "",
    });
    setDonationSubView("donor");
    setMode("donation");
    setAmountCents(5000); // Default $50.00 — typing any digit on keypad immediately replaces it
    setCardholderName(attachedClient?.name ?? "");
    setLinkRecipientEmail(attachedClient?.email ?? "");
    setIsFreshPrefill(true);
    setReceiptState(INITIAL_RECEIPT_STATE);
    setProcessorError(null);
    if (managerMode === "unlocked" && managerPanelVisible) {
      setManagerPanelVisible(false);
    }
  }, [
    mode,
    handleExitDonationMode,
    selectedInvoice?.remainingCents,
    amountCents,
    billing?.client,
    managerMode,
    managerPanelVisible,
  ]);

  const handleUpdateDonationForm = useCallback(
    (patch: Partial<RegisterDonationFormState>) => {
      if (isDonationPreview) {
        setManagerPreviewDonationForm((prev) => ({ ...prev, ...patch }));
        return;
      }
      setDonationForm((prev) => {
        const next = { ...prev, ...patch };
        if (patch.donorName !== undefined) {
          setCardholderName(patch.donorName);
        }
        if (patch.donorEmail !== undefined) {
          setLinkRecipientEmail(patch.donorEmail);
        }
        return next;
      });
    },
    [isDonationPreview]
  );

  const handleSelectDonorAccount = useCallback(
    (clientId: number | null) => {
      const found = clients.find((c) => c.id === clientId) || null;
      if (isDonationPreview) {
        setManagerPreviewDonationForm((prev) =>
          found
            ? {
              ...prev,
              donorSource: "account",
              donorClientId: found.id,
              donorName: found.name,
              donorEmail: found.email || "",
            }
            : {
              ...prev,
              donorClientId: null,
              donorName: "",
              donorEmail: "",
            }
        );
        return;
      }
      if (found) {
        setSelectedClientId(found.id);
        setDonationForm((prev) => ({
          ...prev,
          donorSource: "account",
          donorClientId: found.id,
          donorName: found.name,
          donorEmail: found.email || "",
        }));
        setCardholderName(found.name);
        setLinkRecipientEmail(found.email || "");
      } else {
        setDonationForm((prev) => ({
          ...prev,
          donorClientId: null,
          donorName: "",
          donorEmail: "",
        }));
        setCardholderName("");
        setLinkRecipientEmail("");
      }
    },
    [clients, isDonationPreview]
  );

  const handleSelectQuickDonationAmount = useCallback(
    (cents: number) => {
      resetReceiptIfTerminal();
      setAmountCents(cents);
      setIsFreshPrefill(false);
    },
    [resetReceiptIfTerminal]
  );

  const handleStripeFieldChange = useCallback(
    (field: "number" | "expiry" | "cvc", complete: boolean, errMsg?: string) => {
      setStripeCardReady((prev) => ({ ...prev, [field]: complete }));
      setCardElementError(errMsg || null);
    },
    []
  );

  const clearStripeCardElements = useCallback(
    (focusNumber = false) => {
      if (elements) {
        const numberEl = elements.getElement(CardNumberElement);
        const expiryEl = elements.getElement(CardExpiryElement);
        const cvcEl = elements.getElement(CardCvcElement);
        numberEl?.clear();
        expiryEl?.clear();
        cvcEl?.clear();
        if (focusNumber) {
          numberEl?.focus();
        }
      }
      setStripeCardReady({ number: false, expiry: false, cvc: false });
      setCardElementError(null);
    },
    [elements]
  );

  const handleTryAnotherCard = useCallback(() => {
    setActiveTab("card_by_phone");
    setProcessorError(null);
    if (managerMode === "unlocked" && activePreviewScenario === "failed") {
      setActivePreviewScenario("ready");
      return;
    }
    setReceiptState(INITIAL_RECEIPT_STATE);
    clearStripeCardElements(true);
  }, [managerMode, activePreviewScenario, clearStripeCardElements]);

  const handleRequestSelectClient = useCallback(() => {
    setClientDropdownRequestKey((k) => k + 1);
  }, []);

  /**
   * Resets the station cleanly back to Select Client standby mode so no prior client's
   * account, balance, saved cards, or billing details stay active between payments.
   */
  const handleResetStation = useCallback(() => {
    if (managerMode === "unlocked" && activePreviewScenario !== null) {
      setActivePreviewScenario("select_client");
      setManagerPreviewReceiptSentTo(null);
      setProcessorError(null);
      return;
    }
    setSelectedClientId(null);
    setSelectedInvoiceId(null);
    setSelectedServiceId(null);
    setMode("invoice");
    setAmountCents(0);
    setPreservedInvoiceAmountCents(0);
    setIsFreshPrefill(true);
    setCardholderName("");
    setPostalCode("");
    setLinkRecipientEmail("");
    setSelectedSavedMethodId(null);
    setSavedCardAction("list");
    setUpdatingSavedMethodId(null);
    setDonationForm(INITIAL_DONATION_FORM);
    setProcessorError(null);
    setActivePreviewScenario(null);
    setManagerPreviewSavedMethods(null);
    setManagerPreviewPaymentSummary(null);
    setManagerPreviewReceiptSentTo(null);
    setReceiptState(INITIAL_RECEIPT_STATE);
    clearStripeCardElements(false);
  }, [managerMode, activePreviewScenario, clearStripeCardElements]);

  // Payment execution handler with duplicate-submission protection & explicit processor-result classification
  const handleCharge = async () => {
    if (submissionLockRef.current || isSubmitting) return;
    if (!isBrowserOnline) {
      toast.error("No internet connection. Wait until connection returns before collecting payment.");
      return;
    }
    if (validationError || effectiveAmountCents < MIN_PAYMENT_CENTS) {
      toast.error(validationError || "Enter a valid payment amount.");
      return;
    }

    // Manager Preview Mode: simulate Saved Card Charge or Update & Charge cleanly without hitting Stripe/DB
    if (
      managerMode === "unlocked" &&
      managerPreviewSavedMethods !== null &&
      activeTab === "saved_card"
    ) {
      submissionLockRef.current = true;
      setIsSubmitting(true);
      setActivePreviewScenario("processing");
      setTimeout(() => {
        if (savedCardAction === "update") {
          const replacement =
            PREVIEW_REPLACEMENT_CARDS.find((c) => c.id === previewReplacementCardId) ||
            PREVIEW_REPLACEMENT_CARDS[0];
          const updatedPmId = `${replacement.id}_${Date.now()}`;
          const nextCard: RegisterSavedMethod = {
            id: updatedPmId,
            stripePaymentMethodId: updatedPmId,
            brand: replacement.brand,
            last4: replacement.last4,
            expMonth: replacement.expMonth,
            expYear: replacement.expYear,
            isDefault: setAsDefaultCard,
            chargeable: true,
          };
          setManagerPreviewSavedMethods((prev) => {
            const list = (prev || []).filter(
              (m) => m.stripePaymentMethodId !== updatingSavedMethodId
            );
            const normalized = setAsDefaultCard
              ? list.map((m) => ({ ...m, isDefault: false }))
              : list;
            return [nextCard, ...normalized];
          });
          setSelectedSavedMethodId(updatedPmId);
          setSavedCardAction("list");
          setUpdatingSavedMethodId(null);
          const brandCap = replacement.brand.charAt(0).toUpperCase() + replacement.brand.slice(1);
          setManagerPreviewPaymentSummary(`${brandCap} •••• ${replacement.last4} (Updated · Preview)`);
          setActivePreviewScenario("paid");
          triggerPaymentPaidEffects();
          toast.success(
            `Preview: Updated card to ${brandCap} •••• ${replacement.last4} & charged ${formatCents(effectiveAmountCents)} (no live charge).`
          );
        } else {
          const chosen =
            managerPreviewSavedMethods.find(
              (m) => m.stripePaymentMethodId === selectedSavedMethodId
            ) || managerPreviewSavedMethods[0];
          const brandCap = chosen
            ? chosen.brand.charAt(0).toUpperCase() + chosen.brand.slice(1)
            : "Card";
          setManagerPreviewPaymentSummary(
            `${brandCap} •••• ${chosen?.last4 || "4242"} (Preview)`
          );
          setActivePreviewScenario("paid");
          triggerPaymentPaidEffects();
          toast.success(
            `Preview: Charged saved ${brandCap} •••• ${chosen?.last4 || "4242"} for ${formatCents(effectiveAmountCents)} (no live charge).`
          );
        }
        setIsSubmitting(false);
        submissionLockRef.current = false;
      }, 520);
      return;
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);
    setProcessorError(null);
    setReceiptState((prev) => ({
      ...prev,
      status: "processing",
      paymentIntentId: null,
      sendError: null,
    }));

    const idempotencyKey = createIdempotencyKey();
    let activePaymentIntentId: string | null = null;

    try {
      const commonPayload = {
        idempotencyKey,
        mode,
        amountCents,
        clientId: mode === "donation" ? donationForm.donorClientId : selectedClientId,
        invoiceId: mode === "invoice" ? selectedInvoiceId : null,
        serviceId: mode === "service" ? selectedServiceId : null,
        purposeLabel: mode === "service" ? selectedServiceTitle : null,
        donorName: mode === "donation" ? donationForm.donorName.trim() || null : null,
        donorEmail: mode === "donation" ? donationForm.donorEmail.trim() || null : null,
        donorAddress: mode === "donation" ? donationForm.donorAddress.trim() || null : null,
        fundId: mode === "donation" ? donationForm.fundId : null,
        fundName: mode === "donation" ? donationForm.fundName : null,
        noGoodsOrServicesProvided:
          mode === "donation" ? donationForm.noGoodsOrServicesProvided : undefined,
        goodsOrServicesDescription:
          mode === "donation" ? donationForm.goodsOrServicesDescription.trim() || null : null,
        goodsOrServicesFmvCents: mode === "donation" ? donationFmvCents : undefined,
        donationNote: mode === "donation" ? donationForm.note.trim() || null : null,
      };

      const isLiveUpdateAndCharge =
        activeTab === "saved_card" && savedCardAction === "update";

      if (activeTab === "card_by_phone" || isLiveUpdateAndCharge) {
        if (!stripe || !elements || !stripeMounted) {
          throw new Error(
            "Stripe Elements is not ready. Verify VITE_STRIPE_PUBLISHABLE_KEY is configured."
          );
        }
        const cardNumberEl = elements.getElement(CardNumberElement);
        if (!cardNumberEl) {
          throw new Error("Secure Stripe card input is not mounted.");
        }

        const intent = await createCardIntentMut.mutateAsync({
          ...commonPayload,
          ...(isLiveUpdateAndCharge
            ? {
              saveCardToCustomer: true,
              setAsDefaultPaymentMethod: setAsDefaultCard,
              replacePaymentMethodId: updatingSavedMethodId,
            }
            : {}),
        });
        activePaymentIntentId = intent.paymentIntentId;

        const confirmRes = await stripe.confirmCardPayment(intent.clientSecret, {
          payment_method: {
            card: cardNumberEl,
            billing_details: {
              name: cardholderName.trim() || displayName,
              email:
                mode === "donation"
                  ? donationForm.donorEmail.trim() || undefined
                  : billing?.client.email || undefined,
              address: postalCode.trim() ? { postal_code: postalCode.trim() } : undefined,
            },
          },
        });

        if (confirmRes.error) {
          if (confirmRes.error.type === "api_connection_error") {
            const connErr = new Error(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
            (connErr as Error & { code?: string }).code = "api_connection_error";
            throw connErr;
          }
          throw new Error(confirmRes.error.message || PAYMENT_DECLINED_INLINE_MESSAGE);
        }

        activePaymentIntentId = confirmRes.paymentIntent?.id || intent.paymentIntentId;

        // Verify directly on the server before marking anything PAID!
        const verified = await verifyResultMut.mutateAsync({
          paymentIntentId: activePaymentIntentId,
        });

        if (verified.status === "paid" && verified.receipt) {
          setReceiptState({
            transactionId: verified.receipt.transactionId,
            receiptNumber: verified.receipt.receiptNumber,
            status: "paid",
            paymentMethodSummary: verified.receipt.paymentMethodSummary,
            transactionRef: verified.receipt.transactionRef,
            paymentIntentId: activePaymentIntentId,
            checkoutUrl: null,
            sessionId: null,
            sentToEmail: verified.receipt.emailSentAt ? verified.receipt.clientOrDonorEmail : null,
            sendError: null,
          });
          triggerPaymentPaidEffects();
          if (isLiveUpdateAndCharge) {
            setSavedCardAction("list");
            setUpdatingSavedMethodId(null);
          }
          toast.success(
            isLiveUpdateAndCharge
              ? `Card updated & ${mode === "donation" ? "donation" : "payment"} confirmed (${formatCents(verified.receipt.amountCents)})`
              : `${mode === "donation" ? "Donation" : "Payment"} confirmed (${formatCents(verified.receipt.amountCents)})`
          );
          billingQuery.refetch();
          recentQuery.refetch();
        } else if (verified.status === "pending") {
          setProcessorError(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
          setReceiptState((prev) => ({
            ...prev,
            status: "unconfirmed",
            paymentIntentId: activePaymentIntentId,
          }));
          toast.warning(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
        } else {
          throw new Error(verified.errorMessage || PAYMENT_DECLINED_INLINE_MESSAGE);
        }
      } else if (activeTab === "saved_card") {
        if (!selectedClientId || !selectedSavedMethodId) {
          throw new Error("Select a saved payment method first.");
        }
        const res = await chargeSavedCardMut.mutateAsync({
          ...commonPayload,
          clientId: selectedClientId,
          paymentMethodId: selectedSavedMethodId,
        });
        activePaymentIntentId = res.paymentIntentId ?? null;

        if (res.status === "requires_action" && res.clientSecret) {
          setReceiptState((prev) => ({
            ...prev,
            status: "requires_action",
            paymentIntentId: activePaymentIntentId,
          }));
          if (!stripe) {
            throw new Error(
              "Additional 3DS card authentication is required. Configure VITE_STRIPE_PUBLISHABLE_KEY to complete authentication in-browser."
            );
          }
          const nextAction = await stripe.handleNextAction({ clientSecret: res.clientSecret });
          if (nextAction.error) {
            if (nextAction.error.type === "api_connection_error") {
              const connErr = new Error(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
              (connErr as Error & { code?: string }).code = "api_connection_error";
              throw connErr;
            }
            throw new Error(nextAction.error.message || PAYMENT_DECLINED_INLINE_MESSAGE);
          }
          activePaymentIntentId = res.paymentIntentId || nextAction.paymentIntent?.id || null;
          const verified = await verifyResultMut.mutateAsync({
            paymentIntentId: activePaymentIntentId || undefined,
          });
          if (verified.status === "paid" && verified.receipt) {
            setReceiptState({
              transactionId: verified.receipt.transactionId,
              receiptNumber: verified.receipt.receiptNumber,
              status: "paid",
              paymentMethodSummary: verified.receipt.paymentMethodSummary,
              transactionRef: verified.receipt.transactionRef,
              paymentIntentId: activePaymentIntentId,
              checkoutUrl: null,
              sessionId: null,
              sentToEmail: null,
              sendError: null,
            });
            triggerPaymentPaidEffects();
            toast.success("Payment confirmed after authentication.");
            billingQuery.refetch();
            recentQuery.refetch();
          } else if (verified.status === "pending") {
            setProcessorError(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
            setReceiptState((prev) => ({
              ...prev,
              status: "unconfirmed",
              paymentIntentId: activePaymentIntentId,
            }));
            toast.warning(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
          } else {
            throw new Error(verified.errorMessage || PAYMENT_DECLINED_INLINE_MESSAGE);
          }
        } else if (res.status === "paid" && res.receipt) {
          setReceiptState({
            transactionId: res.receipt.transactionId,
            receiptNumber: res.receipt.receiptNumber,
            status: "paid",
            paymentMethodSummary: res.receipt.paymentMethodSummary,
            transactionRef: res.receipt.transactionRef,
            paymentIntentId: activePaymentIntentId,
            checkoutUrl: null,
            sessionId: null,
            sentToEmail: null,
            sendError: null,
          });
          triggerPaymentPaidEffects();
          toast.success(
            `${mode === "donation" ? "Donation" : "Payment"} confirmed (${formatCents(res.receipt.amountCents)})`
          );
          billingQuery.refetch();
          recentQuery.refetch();
        } else {
          throw new Error(res.errorMessage || PAYMENT_DECLINED_INLINE_MESSAGE);
        }
      } else {
        // Send link
        const linkRes = await createLinkMut.mutateAsync({
          ...commonPayload,
          sendByEmail: sendLinkByEmail,
          recipientEmail: linkRecipientEmail.trim() || null,
        });

        setReceiptState({
          transactionId: linkRes.receipt.transactionId,
          receiptNumber: linkRes.receipt.receiptNumber,
          status: "pending",
          paymentMethodSummary: "Payment link (pending)",
          transactionRef: linkRes.sessionId,
          paymentIntentId: null,
          checkoutUrl: linkRes.checkoutUrl,
          sessionId: linkRes.sessionId,
          sentToEmail: null,
          sendError: null,
        });
        triggerReceiptPaperFeed();

        if (sendLinkByEmail && linkRes.emailDelivery) {
          if (linkRes.emailDelivery.sent) {
            toast.success(`Payment link emailed to ${linkRecipientEmail}`);
          } else {
            toast.warning(
              linkRes.emailDelivery.error ||
              "Payment link created, but email delivery is not configured. Copy the link below."
            );
          }
        } else {
          toast.success("Stripe payment link created — awaiting payment confirmation.");
        }
        recentQuery.refetch();
      }
    } catch (err: unknown) {
      const errorKind = classifyPaymentErrorKind(err);
      if (errorKind === "unconfirmed") {
        setProcessorError(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
        setReceiptState((prev) => ({
          ...prev,
          status: "unconfirmed",
          paymentIntentId: activePaymentIntentId ?? prev.paymentIntentId,
        }));
        toast.warning(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
      } else {
        const msg = err instanceof Error ? err.message : PAYMENT_DECLINED_INLINE_MESSAGE;
        setProcessorError(PAYMENT_DECLINED_INLINE_MESSAGE);
        setReceiptState((prev) => ({
          ...prev,
          status: prev.status === "pending" ? "pending" : "failed",
          paymentIntentId: activePaymentIntentId ?? prev.paymentIntentId,
        }));
        playCardDeclinedSound();
        toast.error(msg || PAYMENT_DECLINED_INLINE_MESSAGE);
      }
    } finally {
      setIsSubmitting(false);
      submissionLockRef.current = false;
    }
  };

  const handleCheckUnconfirmedStatus = async () => {
    if (managerMode === "unlocked" && activePreviewScenario === "unconfirmed") {
      toast.info("Preview: Re-checked status — still unconfirmed (use Reset station or ◀/▶).");
      return;
    }
    if (submissionLockRef.current || isSubmitting) return;
    if (!receiptState.paymentIntentId && !receiptState.sessionId) return;

    submissionLockRef.current = true;
    setIsSubmitting(true);
    try {
      const verified = await verifyResultMut.mutateAsync({
        paymentIntentId: receiptState.paymentIntentId || undefined,
        checkoutSessionId: receiptState.sessionId || undefined,
      });
      if (verified.status === "paid" && verified.receipt) {
        setProcessorError(null);
        setReceiptState({
          transactionId: verified.receipt.transactionId,
          receiptNumber: verified.receipt.receiptNumber,
          status: "paid",
          paymentMethodSummary: verified.receipt.paymentMethodSummary,
          transactionRef: verified.receipt.transactionRef,
          paymentIntentId: receiptState.paymentIntentId,
          checkoutUrl: null,
          sessionId: null,
          sentToEmail: null,
          sendError: null,
        });
        triggerPaymentPaidEffects();
        toast.success("Payment confirmed by Stripe.");
        billingQuery.refetch();
        recentQuery.refetch();
      } else if (verified.status === "failed") {
        setProcessorError(PAYMENT_DECLINED_INLINE_MESSAGE);
        setReceiptState((prev) => ({ ...prev, status: "failed" }));
        playCardDeclinedSound();
        toast.error(verified.errorMessage || PAYMENT_DECLINED_INLINE_MESSAGE);
      } else {
        setProcessorError(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
        setReceiptState((prev) => ({ ...prev, status: "unconfirmed" }));
        toast.warning(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
      }
    } catch {
      setProcessorError(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
      setReceiptState((prev) => ({ ...prev, status: "unconfirmed" }));
      toast.warning(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
    } finally {
      setIsSubmitting(false);
      submissionLockRef.current = false;
    }
  };

  const handleCompleteThreeDs = () => {
    if (managerMode === "unlocked" && activePreviewScenario === "requires_action") {
      setActivePreviewScenario("processing");
      setTimeout(() => {
        setManagerPreviewPaymentSummary("Visa •••• 4242 (3DS Verified · Preview)");
        setActivePreviewScenario("paid");
        triggerPaymentPaidEffects();
        toast.success("Preview: 3DS authentication completed (no live charge).");
      }, 420);
      return;
    }
    void handleCheckUnconfirmedStatus();
  };

  const handleCheckLinkStatus = async () => {
    if (managerMode === "unlocked" && activePreviewScenario === "pending") {
      setManagerPreviewPaymentSummary("Stripe Checkout Link (Preview)");
      setActivePreviewScenario("paid");
      triggerPaymentPaidEffects();
      toast.success("Preview: Payment link confirmed (no live charge).");
      return;
    }
    if (!receiptState.sessionId) return;
    try {
      const verified = await verifyResultMut.mutateAsync({
        checkoutSessionId: receiptState.sessionId,
      });
      if (verified.status === "paid" && verified.receipt) {
        setProcessorError(null);
        setReceiptState({
          transactionId: verified.receipt.transactionId,
          receiptNumber: verified.receipt.receiptNumber,
          status: "paid",
          paymentMethodSummary: verified.receipt.paymentMethodSummary,
          transactionRef: verified.receipt.transactionRef,
          paymentIntentId: null,
          checkoutUrl: null,
          sessionId: null,
          sentToEmail: null,
          sendError: null,
        });
        triggerPaymentPaidEffects();
        toast.success("Stripe confirmed payment link completion!");
        billingQuery.refetch();
        recentQuery.refetch();
      } else if (verified.status === "pending") {
        toast.info("Still pending — Stripe has not confirmed payment yet.");
      } else {
        setProcessorError(PAYMENT_DECLINED_INLINE_MESSAGE);
        setReceiptState((prev) => ({ ...prev, status: "failed" }));
        playCardDeclinedSound();
        toast.error(verified.errorMessage || PAYMENT_DECLINED_INLINE_MESSAGE);
      }
    } catch (err: unknown) {
      if (classifyPaymentErrorKind(err) === "unconfirmed") {
        setProcessorError(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
        setReceiptState((prev) => ({ ...prev, status: "unconfirmed" }));
        toast.warning(PAYMENT_UNCONFIRMED_INLINE_MESSAGE);
      } else {
        toast.error(err instanceof Error ? err.message : "Could not check link status.");
      }
    }
  };

  const handleSendReceipt = async (overrideTxId?: number, overrideEmail?: string | null) => {
    if (!overrideTxId && managerMode === "unlocked" && activePreviewScenario === "paid") {
      const previewEmail =
        (effectiveMode === "donation"
          ? effectiveDonationForm.donorEmail.trim()
          : billing?.client.email) || "preview@waypointadvocates.com";
      setManagerPreviewReceiptSentTo(`${previewEmail} (Preview)`);
      toast.success(`Preview: Receipt marked sent to ${previewEmail} (no live email sent).`);
      return;
    }
    const txId = overrideTxId ?? receiptState.transactionId;
    if (!txId) {
      toast.error("Confirm a payment first before sending a receipt.");
      return;
    }
    const targetEmail =
      overrideEmail ??
      (mode === "donation" ? donationForm.donorEmail.trim() || undefined : billing?.client.email) ??
      undefined;

    try {
      const res = await sendReceiptMut.mutateAsync({
        transactionId: txId,
        recipientEmail: targetEmail || null,
      });
      if (res.sent) {
        if (!overrideTxId) {
          setReceiptState((prev) => ({
            ...prev,
            sentToEmail: res.recipientEmail,
            sendError: null,
          }));
        }
        toast.success(`Receipt ${res.receiptNumber} sent to ${res.recipientEmail}`);
        recentQuery.refetch();
      } else {
        const msg =
          res.delivery.error ||
          "Email provider is not configured. Configure Gmail in Integrations → Gmail (PG-014).";
        if (!overrideTxId) {
          setReceiptState((prev) => ({ ...prev, sendError: msg }));
        }
        toast.error(msg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send receipt.";
      if (!overrideTxId) {
        setReceiptState((prev) => ({ ...prev, sendError: msg }));
      }
      toast.error(msg);
    }
  };

  const effectiveGeneratedLinkUrl =
    isScenarioPreview && activePreviewScenario === "pending"
      ? "https://checkout.stripe.com/c/pay/cs_test_preview_waypoint_demo"
      : receiptState.checkoutUrl;
  const effectiveGeneratedSessionId =
    isScenarioPreview && activePreviewScenario === "pending"
      ? "cs_test_preview_waypoint"
      : receiptState.sessionId;

  const handleCopyLink = async () => {
    if (!effectiveGeneratedLinkUrl) return;
    try {
      await navigator.clipboard.writeText(effectiveGeneratedLinkUrl);
      setLinkCopied(true);
      toast.success("Stripe payment link copied to clipboard");
      setTimeout(() => setLinkCopied(false), 2200);
    } catch {
      toast.error("Could not copy link automatically.");
    }
  };

  // Unauthorized / forbidden state returned by server RBAC
  if (configQuery.isError) {
    return (
      <div className="pos-stage min-h-screen w-full flex items-center justify-center px-6 py-16 text-white">
        <div className="max-w-md w-full rounded-2xl bg-[#071530] border border-[#C8A157]/45 p-7 text-center space-y-4 shadow-2xl">
          <div className="mx-auto h-12 w-12 rounded-xl bg-rose-500/15 border border-rose-400/35 flex items-center justify-center">
            <Lock className="h-6 w-6 text-rose-300" />
          </div>
          <h1
            className="text-2xl text-[#FFF4D6]"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Payment Station Restricted
          </h1>
          <p className="text-sm text-[#9FB3D7] leading-relaxed">
            {configQuery.error?.message ||
              "Your staff profile does not have permission to access Payment Station."}
          </p>
        </div>
      </div>
    );
  }

  const cfg = configQuery.data;
  const configReady = {
    cardByPhoneReady: Boolean(cfg?.cardByPhoneReady),
    savedCardReady: Boolean(cfg?.savedCardReady),
    paymentLinkReady: Boolean(cfg?.paymentLinkReady),
    emailDeliveryReady: Boolean(cfg?.emailDeliveryReady),
    mode: cfg?.mode ?? ("unconfigured" as const),
  };

  const savedCardsPreviewActive =
    managerMode === "unlocked" &&
    managerPreviewSavedMethods !== null &&
    (activePreviewScenario === "saved_cards" || activePreviewScenario === "update_card");
  const effectiveSavedMethods: RegisterSavedMethod[] = savedCardsPreviewActive
    ? managerPreviewSavedMethods!
    : (billing?.savedMethods ?? []);

  const canChargeNow = (() => {
    if (!cfg?.permissions.canCollect) return false;
    if (validationError || effectiveAmountCents < MIN_PAYMENT_CENTS) return false;
    if (effectiveMode === "donation" && !donationCompliance.ready) return false;
    if (activeTab === "saved_card" && savedCardsPreviewActive) {
      return savedCardAction === "update" || Boolean(selectedSavedMethodId);
    }
    if (effectiveMode !== "donation" && !selectedClientId) return false;
    if (activeTab === "card_by_phone" || (activeTab === "saved_card" && savedCardAction === "update")) {
      return (
        configReady.cardByPhoneReady &&
        stripeCardReady.number &&
        stripeCardReady.expiry &&
        stripeCardReady.cvc
      );
    }
    if (activeTab === "saved_card") {
      const pm = effectiveSavedMethods.find(
        (m) => m.stripePaymentMethodId === selectedSavedMethodId
      );
      return configReady.savedCardReady && Boolean(pm?.chargeable);
    }
    return configReady.paymentLinkReady;
  })();

  const effectivePaymentStatus: PaymentStationReceiptStatus = (() => {
    if (!isBrowserOnline) return "offline";
    if (isScenarioPreview) {
      if (
        activePreviewScenario === "processing" ||
        activePreviewScenario === "paid" ||
        activePreviewScenario === "failed" ||
        activePreviewScenario === "unconfirmed" ||
        activePreviewScenario === "offline" ||
        activePreviewScenario === "pending" ||
        activePreviewScenario === "requires_action"
      ) {
        return activePreviewScenario;
      }
      return "awaiting_payment";
    }
    return receiptState.status;
  })();
  const effectiveIsSubmitting =
    isSubmitting || (isScenarioPreview && activePreviewScenario === "processing");
  const effectiveCanSendReceipt =
    effectivePaymentStatus !== "offline" &&
    ((receiptState.status === "paid" && Boolean(receiptState.transactionId)) ||
      (isScenarioPreview && activePreviewScenario === "paid"));
  const effectiveReceiptSentTo =
    isScenarioPreview && activePreviewScenario === "paid"
      ? managerPreviewReceiptSentTo
      : receiptState.sentToEmail;
  const effectiveReceiptNumber =
    isScenarioPreview && (activePreviewScenario === "paid" || activePreviewScenario === "pending")
      ? "WP-PREVIEW-050"
      : receiptState.receiptNumber;
  const effectiveTransactionRef =
    isScenarioPreview && activePreviewScenario === "paid"
      ? "pi_preview_demo_4242"
      : isScenarioPreview && activePreviewScenario === "pending"
        ? "cs_test_preview_waypoint"
        : receiptState.transactionRef;
  const effectivePaymentMethodSummary =
    isScenarioPreview && activePreviewScenario === "paid"
      ? managerPreviewPaymentSummary || "Visa •••• 4242 (Preview)"
      : isScenarioPreview && activePreviewScenario === "pending"
        ? "Payment link (pending)"
        : receiptState.paymentMethodSummary;

  return (
    <div className="pos-stage min-h-screen w-full overflow-x-hidden text-[#F3F6FD] flex flex-col">
      <div className="w-full max-w-[1540px] mx-auto px-3 sm:px-5 lg:px-6 pt-0 pb-4 flex-1 flex flex-col">
        {/* ── SYMMETRICAL PHOTOREALISTIC FULL-PILL BRUSHED-BRASS & NAVY TOP COMMAND BAR ── */}
        <PaymentStationHeaderBar
          clientName={billing?.client.name || ""}
          selectedClientId={selectedClientId}
          clients={clients}
          invoices={billing?.invoices ?? []}
          services={billing?.authorizedServices ?? []}
          selectedInvoiceId={selectedInvoiceId}
          selectedServiceId={selectedServiceId}
          isLoadingClients={clientsQuery.isLoading}
          mode={effectiveMode}
          openClientDropdownTrigger={clientDropdownRequestKey}
          onSelectClient={(id) => {
            if (mode === "donation") {
              handleSelectDonorAccount(id);
            } else {
              setSelectedClientId(id);
            }
          }}
          onClearClient={handleResetStation}
          onSelectInvoice={handleSelectInvoice}
          onSelectService={handleSelectService}
          onOpenClientPicker={() => {
            setPickerInitialView("client");
            setPickerOpen(true);
          }}
          onOpenDonationModal={handleToggleDonationMode}
        />

        {/* ── CENTRAL STAGE: COMMANDING PROPORTIONAL HARDWARE REGISTER + RECEIPT PRINTER BESIDE IT ── */}
        <main className="mt-2 lg:-mt-2 flex flex-col lg:flex-row items-center lg:items-end justify-center gap-6 lg:gap-0">
          <div className="w-full max-w-[1160px] flex-1 min-w-0 lg:-ml-5 lg:-mr-7">
            <PaymentRegister
              mode={effectiveMode}
              hasSelectedClient={effectiveHasSelectedClient}
              displayName={displayName}
              subtitleText={activeSubtitle}
              amountCents={effectiveAmountCents}
              activeTab={activeTab}
              onTabChange={(t) => {
                setActiveTab(t);
                if (receiptState.status === "paid" || receiptState.status === "failed") {
                  setProcessorError(null);
                  setReceiptState(INITIAL_RECEIPT_STATE);
                }
              }}
              onDigitPress={handleDigitPress}
              onBackspacePress={handleBackspacePress}
              onClearPress={handleClearPress}
              onResetAmount={handleResetToInvoiceBalance}
              showResetAmount={
                effectiveMode === "invoice" &&
                Boolean(selectedInvoice) &&
                amountCents !== selectedInvoice!.remainingCents
              }
              onOpenPurposePicker={() => {
                setPickerInitialView("purpose");
                setPickerOpen(true);
              }}
              onRequestSelectClient={handleRequestSelectClient}
              onRequestDonationMode={handleToggleDonationMode}
              onClearClient={handleResetStation}
              onExitDonationMode={
                effectiveMode === "donation"
                  ? isDonationPreview
                    ? () => setActivePreviewScenario("ready")
                    : handleExitDonationMode
                  : undefined
              }
              cardholderName={cardholderName}
              onCardholderNameChange={setCardholderName}
              postalCode={postalCode}
              onPostalCodeChange={setPostalCode}
              stripeElementsMounted={stripeMounted}
              stripeCardReady={stripeCardReady}
              onStripeFieldChange={handleStripeFieldChange}
              cardElementError={cardElementError}
              savedMethods={effectiveSavedMethods}
              selectedSavedMethodId={selectedSavedMethodId}
              onSelectSavedMethod={setSelectedSavedMethodId}
              savedCardAction={savedCardAction}
              updatingSavedMethodId={updatingSavedMethodId}
              onStartUpdateSavedCard={handleStartUpdateSavedCard}
              onCancelUpdateSavedCard={handleCancelUpdateSavedCard}
              setAsDefaultCard={setAsDefaultCard}
              onSetAsDefaultCardChange={setSetAsDefaultCard}
              savedCardsPreviewActive={savedCardsPreviewActive}
              previewReplacementCardId={previewReplacementCardId}
              onSelectPreviewReplacementCard={setPreviewReplacementCardId}
              linkRecipientEmail={linkRecipientEmail}
              onLinkRecipientEmailChange={setLinkRecipientEmail}
              sendLinkByEmail={sendLinkByEmail}
              onSendLinkByEmailChange={setSendLinkByEmail}
              generatedLinkUrl={effectiveGeneratedLinkUrl}
              generatedSessionId={effectiveGeneratedSessionId}
              onCopyLink={handleCopyLink}
              linkCopied={linkCopied}
              onCheckLinkStatus={handleCheckLinkStatus}
              isCheckingLink={verifyResultMut.isPending}
              configReady={configReady}
              paymentStatus={effectivePaymentStatus}
              canVerifyUnconfirmed={
                (isScenarioPreview && activePreviewScenario === "unconfirmed") ||
                Boolean(receiptState.paymentIntentId || receiptState.sessionId)
              }
              validationError={validationError}
              processorError={processorError}
              isSubmitting={effectiveIsSubmitting}
              canCharge={canChargeNow}
              onCharge={handleCharge}
              onTryAnotherCard={handleTryAnotherCard}
              onCheckUnconfirmedStatus={handleCheckUnconfirmedStatus}
              onCompleteThreeDs={handleCompleteThreeDs}
              onRetryConnection={handleRetryConnection}
              isCheckingConnection={isCheckingConnection}
              onResetStation={handleResetStation}
              onOpenSetupInfo={() => setSetupDialogOpen(true)}
              onScaledHeightChange={setRegisterScaledHeight}
              successWaveKey={successWaveKey}
              managerMode={managerMode}
              managerPanelVisible={managerPanelVisible}
              managerPinDigits={managerPinDigits}
              managerPinError={managerPinError}
              activePreviewScenario={activePreviewScenario}
              onManagerKeyClick={handleManagerKeyClick}
              onSubmitManagerPin={handleSubmitManagerPin}
              onCancelManagerPin={handleCancelManagerPin}
              onSelectPreviewScenario={handleSelectPreviewScenario}
              onStepPreviewScenario={handleStepPreviewScenario}
              onTriggerPaperFeed={triggerReceiptPaperFeed}
              onOpenRecentDrawer={() => {
                recentQuery.refetch();
                setRecentDrawerOpen(true);
              }}
              onToggleManagerPanel={setManagerPanelVisible}
              onLockManager={handleLockManager}
              donationClients={clients}
              donationForm={effectiveDonationForm}
              donationSubView={donationSubView}
              donationComplianceStatus={donationComplianceStatus}
              onDonationSubViewChange={setDonationSubView}
              onUpdateDonationForm={handleUpdateDonationForm}
              onSelectDonorAccount={handleSelectDonorAccount}
              onSelectQuickDonationAmount={handleSelectQuickDonationAmount}
            />
          </div>

          <div
            className="flex justify-center lg:pb-[var(--pos-printer-lift)]"
            style={{ "--pos-printer-lift": `${printerFeetLiftPx}px` } as React.CSSProperties}
          >
            <ReceiptPrinter
              mode={effectiveMode}
              hasSelectedClient={effectiveHasSelectedClient}
              clientOrDonorName={displayName}
              description={activeDescription}
              invoiceNumber={effectiveMode === "invoice" ? selectedInvoice?.invoiceNumber : null}
              donationNote={effectiveMode === "donation" ? effectiveDonationForm.note.trim() || null : null}
              donationFundName={effectiveMode === "donation" ? effectiveDonationForm.fundName : null}
              noGoodsOrServicesProvided={effectiveDonationForm.noGoodsOrServicesProvided}
              goodsOrServicesFmvCents={donationFmvCents}
              amountCents={effectiveAmountCents}
              status={effectivePaymentStatus}
              paymentMethodSummary={effectivePaymentMethodSummary}
              transactionRef={effectiveTransactionRef}
              receiptNumber={effectiveReceiptNumber}
              paperFeedKey={paperFeedKey}
              canSendReceipt={effectiveCanSendReceipt}
              emailDeliveryReady={configReady.emailDeliveryReady}
              isSendingReceipt={sendReceiptMut.isPending}
              receiptSentTo={effectiveReceiptSentTo}
              receiptSendError={receiptState.sendError}
              onSendReceipt={() => handleSendReceipt()}
            />
          </div>
        </main>

        {/* ── FOOTER: RECENT PAYMENTS DRAWER TRIGGER ── */}
        <footer className="mt-2 lg:mt-3 flex items-center justify-end">
          <button
            type="button"
            data-testid="pos-recent-payments-btn"
            onClick={() => {
              recentQuery.refetch();
              setRecentDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-[14px] text-[#C8D5EE] hover:text-[#FFF4D6] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded px-2 py-1"
          >
            <span>Recent payments</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </footer>
      </div>

      {/* Modals & Drawers */}
      <ClientInvoiceModal
        open={pickerOpen}
        initialView={pickerInitialView}
        onOpenChange={setPickerOpen}
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClient={(id) => {
          if (mode === "donation") {
            handleSelectDonorAccount(id);
          } else {
            setSelectedClientId(id);
          }
        }}
        invoices={billing?.invoices ?? []}
        services={billing?.authorizedServices ?? []}
        selectedInvoiceId={selectedInvoiceId}
        selectedServiceId={selectedServiceId}
        onSelectInvoice={handleSelectInvoice}
        onSelectService={handleSelectService}
      />

      <RecentPaymentsDrawer
        open={recentDrawerOpen}
        onClose={() => setRecentDrawerOpen(false)}
        items={recentQuery.data?.items ?? []}
        isLoading={recentQuery.isFetching}
        canRefund={Boolean(recentQuery.data?.canRefund)}
        onRefresh={() => recentQuery.refetch()}
        onResendReceipt={(txId, email) => handleSendReceipt(txId, email)}
        onNavigateToInvoices={() => {
          setRecentDrawerOpen(false);
          setLocation("/invoices");
        }}
      />

      <StripeSetupDialog
        open={setupDialogOpen}
        onOpenChange={setSetupDialogOpen}
        config={cfg}
      />
    </div>
  );
}

export default function PaymentStation() {
  const configQuery = trpc.paymentStation.getConfig.useQuery(undefined, {
    retry: false,
  });

  const publishableKey =
    configQuery.data?.publishableKey ||
    (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ||
    null;

  const stripePromise = useMemo<Promise<StripeJs | null> | null>(() => {
    if (!publishableKey) return null;
    if (!publishableKey.startsWith("pk_test_") && !publishableKey.startsWith("pk_live_")) {
      return null;
    }
    return loadStripe(publishableKey);
  }, [publishableKey]);

  return (
    <ScopedErrorBoundary moduleName="Payment Station">
      <Elements stripe={stripePromise}>
        <PaymentStationTerminal stripeMounted={Boolean(stripePromise)} />
      </Elements>
    </ScopedErrorBoundary>
  );
}

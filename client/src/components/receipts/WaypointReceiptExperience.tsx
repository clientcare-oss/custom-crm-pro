import React, { useState, useEffect } from "react";
import {
  Printer,
  Download,
  Mail,
  MoreHorizontal,
  CheckCircle2,
  FileText,
  Sparkles,
  Loader2,
  ArrowRight,
  Anchor,
  ShieldCheck,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { WaypointPrintableReceipt, PrintableReceiptData } from "./WaypointPrintableReceipt";
import { trpc } from "@/lib/trpc";

export interface TransactionReceiptData {
  id?: number;
  receiptNumber: string;
  serviceName: string;
  planName?: string;
  transactionType?: string; // enrollment, recurring, standalone, retainer
  amountCents: number;
  currency?: string;
  status: string; // PAID, PARTIALLY_REFUNDED, REFUNDED
  paymentMethodBrand?: string;
  paymentMethodLast4?: string;
  paidAt: Date | string;
  nextPaymentDate?: Date | string | null;
  nextPaymentAmountCents?: number | null;
  clientName?: string;
  clientEmail?: string;
  studentName?: string;
  caseId?: string;
  stripePaymentIntentId?: string;
  refundAmountCents?: number;
  refundReason?: string;
}

export interface ReceiptExperienceProps {
  transaction: TransactionReceiptData;
  settings?: {
    companyName?: string;
    receiptDisplayName?: string;
    businessEmail?: string;
    businessPhone?: string;
    businessAddress?: string;
    website?: string;
    completionHeadline?: string;
    completionSupportingMessage?: string;
    completionButtonText?: string;
    completionButtonUrl?: string;
    receiptFooterMessage?: string;
    showPaymentMethod?: number;
    showNextPaymentDate?: number;
    showPlanServiceName?: number;
    showReceiptNumber?: number;
    paymentSuccessAnimation?: number;
    receiptPrinterAnimation?: number;
  };
  isTestMode?: boolean;
  initialStep?: "idle" | "processing" | "approved" | "printing" | "completed";
  onContinue?: () => void;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onEmailReceipt?: (email: string) => void;
}

export const WaypointReceiptExperience: React.FC<ReceiptExperienceProps> = ({
  transaction,
  settings,
  isTestMode = false,
  initialStep = "completed",
  onContinue,
  onPrint,
  onDownloadPdf,
  onEmailReceipt,
}) => {
  const [step, setStep] = useState<"idle" | "processing" | "approved" | "printing" | "completed">(initialStep);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState(transaction.clientEmail || "");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Check if system prefers reduced motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const animationEnabled =
    settings?.receiptPrinterAnimation !== 0 && !prefersReducedMotion;

  // Auto-play sequence if initiated with processing or approved
  useEffect(() => {
    if (initialStep === "processing") {
      const t1 = setTimeout(() => {
        setStep("approved");
      }, 1200);

      const t2 = setTimeout(() => {
        setStep(animationEnabled ? "printing" : "completed");
      }, 2200);

      const t3 = setTimeout(() => {
        if (animationEnabled) {
          setStep("completed");
        }
      }, 3800);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else if (initialStep === "approved") {
      const t1 = setTimeout(() => {
        setStep(animationEnabled ? "printing" : "completed");
      }, 1000);

      const t2 = setTimeout(() => {
        if (animationEnabled) {
          setStep("completed");
        }
      }, 2600);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (initialStep === "printing" && animationEnabled) {
      const t1 = setTimeout(() => {
        setStep("completed");
      }, 1600);
      return () => clearTimeout(t1);
    }
  }, [initialStep, animationEnabled]);

  const sendEmailMutation = trpc.receipts.sendReceiptEmail.useMutation({
    onSuccess: (res) => {
      setIsSendingEmail(false);
      setShowEmailModal(false);
      toast.success(`Receipt sent to ${res.sentTo}`);
      if (res.duplicateWarning) {
        toast.warning("Note: Stripe receipt emails are also active. Client may receive duplicate copies.");
      }
    },
    onError: (err) => {
      setIsSendingEmail(false);
      toast.error(err.message || "Failed to send receipt email");
    },
  });

  const handleEmailSubmit = () => {
    if (!emailInput.trim()) {
      toast.error("Please enter a valid recipient email address");
      return;
    }
    if (onEmailReceipt) {
      onEmailReceipt(emailInput.trim());
      setShowEmailModal(false);
      return;
    }
    if (transaction.id) {
      setIsSendingEmail(true);
      sendEmailMutation.mutate({
        transactionId: transaction.id,
        recipientEmail: emailInput.trim(),
      });
    } else {
      toast.success(`Simulated receipt dispatched to ${emailInput.trim()}`);
      setShowEmailModal(false);
    }
  };

  const formattedAmount = `$${(transaction.amountCents / 100).toFixed(2)}`;
  const paidDate = new Date(transaction.paidAt);
  const paidDateStr = paidDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const paidTimeStr = paidDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  // Dynamic context messaging
  const isAdvocacyEnrollment =
    transaction.transactionType === "enrollment" ||
    transaction.serviceName.toLowerCase().includes("advocacy") ||
    transaction.serviceName.toLowerCase().includes("anchor");

  const completionHeadline =
    settings?.completionHeadline ||
    (isAdvocacyEnrollment ? "You're officially aboard." : "Payment complete.");

  const completionSupportingMessage =
    settings?.completionSupportingMessage ||
    (isAdvocacyEnrollment
      ? "Your Waypoint advocacy plan is active."
      : "Your service payment has been verified and applied to your case.");

  const completionButtonText =
    settings?.completionButtonText ||
    (isAdvocacyEnrollment ? "Continue to Onboarding →" : "View Case Workspace →");

  const printableData: PrintableReceiptData = {
    receiptNumber: transaction.receiptNumber,
    companyName: settings?.companyName || "Waypoint Advocates",
    businessEmail: settings?.businessEmail || "billing@waypointadvocates.com",
    businessPhone: settings?.businessPhone || "(404) 555-0100",
    businessAddress: settings?.businessAddress || "Atlanta, GA",
    website: settings?.website || "https://waypointadvocates.com",
    clientName: transaction.clientName || "Valued Client",
    clientEmail: transaction.clientEmail,
    studentName: transaction.studentName,
    caseId: transaction.caseId,
    serviceName: transaction.serviceName,
    planName: transaction.planName,
    transactionType: transaction.transactionType,
    amountCents: transaction.amountCents,
    currency: transaction.currency || "usd",
    status: transaction.status,
    paymentMethodBrand: transaction.paymentMethodBrand || "Visa",
    paymentMethodLast4: transaction.paymentMethodLast4 || "2986",
    paidAt: transaction.paidAt,
    nextPaymentDate: transaction.nextPaymentDate,
    nextPaymentAmountCents: transaction.nextPaymentAmountCents,
    stripePaymentIntentId: transaction.stripePaymentIntentId,
    refundAmountCents: transaction.refundAmountCents,
    refundReason: transaction.refundReason,
    footerMessage: settings?.receiptFooterMessage,
  };

  return (
    <div className="relative w-full min-h-[720px] bg-[#000820] text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none font-sans">
      {/* ── BACKGROUND ATMOSPHERIC MARITIME NIGHT SCENE ────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle radial gradient beacon */}
        <div className="absolute top-1/4 -right-16 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 -left-20 w-80 h-80 bg-amber-500/5 rounded-full blur-[90px]" />

        {/* Faint distant maritime lighthouse silhouette on right edge */}
        <div className="absolute bottom-12 right-6 opacity-15 hidden sm:block">
          <svg width="120" height="280" viewBox="0 0 100 240" fill="none">
            {/* Beacon beam */}
            <polygon points="50,40 0,0 0,60" fill="url(#beamGrad)" opacity="0.6" />
            {/* Lighthouse Tower */}
            <rect x="42" y="20" width="16" height="15" rx="3" fill="#cbd5e1" />
            <polygon points="40,35 60,35 66,200 34,200" fill="#475569" />
            <rect x="30" y="200" width="40" height="30" rx="4" fill="#334155" />
            <defs>
              <linearGradient id="beamGrad" x1="50" y1="40" x2="0" y2="30" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fef08a" stopOpacity="0.4" />
                <stop offset="1" stopColor="#fef08a" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* ── TOP HEADER / LOGO BAR ────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          {/* Compass Star / Lighthouse Gold Emblem */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0c234b] to-[#040e1e] border border-[#d4af37]/60 flex items-center justify-center shadow-lg shadow-blue-950/50">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#d4af37" strokeWidth="1.5" />
              <path d="M12 2L13.5 10.5L22 12L13.5 13.5L12 22L10.5 13.5L2 12L10.5 10.5L12 2Z" fill="#d4af37" />
              <circle cx="12" cy="12" r="2.5" fill="#000820" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-serif font-bold tracking-[0.2em] text-white">
              {settings?.receiptDisplayName || "WAYPOINT ADVOCATES"}
            </h2>
            <p className="text-[10px] tracking-wider text-[#d4af37]/80 uppercase">
              Guided Horizons Advocacy
            </p>
          </div>
        </div>

        {/* Action Menu (•••) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-[#06172f]/80 border border-slate-700/60 hover:border-slate-500 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-md">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#06172f] border border-[#1b3a60] text-slate-200">
            <DropdownMenuItem onClick={() => setShowPrintModal(true)} className="cursor-pointer gap-2 hover:bg-[#0a264e]">
              <FileText className="w-4 h-4 text-amber-400" />
              View Full Receipt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowPrintModal(true)} className="cursor-pointer gap-2 hover:bg-[#0a264e]">
              <Printer className="w-4 h-4 text-blue-400" />
              Print Receipt
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (onDownloadPdf) onDownloadPdf();
                else setShowPrintModal(true);
              }}
              className="cursor-pointer gap-2 hover:bg-[#0a264e]"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#18365D]" />
            <DropdownMenuItem onClick={() => setShowEmailModal(true)} className="cursor-pointer gap-2 hover:bg-[#0a264e]">
              <Mail className="w-4 h-4 text-purple-400" />
              Email Receipt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Test Mode Banner Notice */}
      {isTestMode && (
        <div className="relative z-10 w-full max-w-md mb-4 bg-amber-500/15 border border-amber-500/40 text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          TEST MODE — NO PAYMENT PROCESSED
        </div>
      )}

      {/* ── STEP 1: PROCESSING STATE ────────────────────────────────────────── */}
      {step === "processing" && (
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
          <p className="text-sm font-semibold tracking-wider uppercase text-blue-200">
            Processing Payment...
          </p>
          <p className="text-xs text-slate-400 text-center">
            Confirming transaction with Stripe secure gateway
          </p>
        </div>
      )}

      {/* ── STEP 2: APPROVED BADGE FLASH ───────────────────────────────────── */}
      {step === "approved" && (
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white tracking-wide">
              Payment Approved ✓
            </h3>
            <p className="text-xs text-emerald-300/90 mt-1">
              Confirmed: {formattedAmount} via {transaction.paymentMethodBrand || "Card"}
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 3: PHYSICAL RECEIPT PRINTER & PAPER FEED SEQUENCE ──────────── */}
      {(step === "printing" || step === "completed") && (
        <div className="relative z-10 w-full max-w-md flex flex-col items-center">
          {/* Executive Hardware Printer Terminal Slit */}
          <div className="w-full relative rounded-2xl bg-gradient-to-b from-[#091830] via-[#051124] to-[#020914] p-3 border border-[#1b3a60] shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
            {/* Brushed Gold Rim Bevel */}
            <div className="rounded-xl border border-[#d4af37]/40 p-2.5 bg-[#030c1a]/90 flex flex-col items-center relative overflow-hidden">
              {/* Glowing Azure Active Feed LED Bar */}
              <div className="w-32 h-1 bg-gradient-to-r from-transparent via-[#00d2ff] to-transparent rounded-full shadow-[0_0_12px_#00d2ff] mb-2.5" />

              {/* Embossed Slit Header */}
              <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#7392b7] mb-2">
                WAYPOINT PAY
              </div>

              {/* The Physical Paper Mouth / Throat Slit */}
              <div className="w-full h-3.5 bg-black rounded-full border-t border-black/80 shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] relative" />
            </div>
          </div>

          {/* ── THE PAPER RECEIPT (Feeding Out Of Slit) ──────────────────────── */}
          <div
            className={`w-[92%] -mt-2 transition-all ease-out duration-1000 ${
              step === "printing" && animationEnabled
                ? "animate-[receiptFeed_1.4s_cubic-bezier(0.2,0.8,0.2,1)_forwards]"
                : ""
            }`}
          >
            {/* Paper Texture Canvas */}
            <div
              className="relative bg-[#FAF8F5] text-slate-800 shadow-[0_16px_36px_rgba(0,0,0,0.6)] pt-6 px-6 pb-2 border-x border-slate-300"
              style={{
                backgroundImage:
                  "radial-gradient(#e2e8f0 0.75px, transparent 0.75px), radial-gradient(#f1f5f9 0.75px, #FAF8F5 0.75px)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 8px 8px",
              }}
            >
              {/* Subtle Watermark Lighthouse in background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
                <svg width="220" height="220" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15 8H9L12 2ZM8 9H16L17 21H7L8 9Z" />
                </svg>
              </div>

              {/* Receipt Header */}
              <div className="text-center relative z-10 mb-4">
                <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-[#06172F] text-[#D4af37] flex items-center justify-center font-bold text-xs shadow-sm">
                  ⚓
                </div>
                <div className="font-serif font-bold text-xs tracking-[0.2em] text-[#06172F]">
                  {settings?.companyName || "WAYPOINT ADVOCATES"}
                </div>
                <div className="text-[10px] tracking-widest uppercase text-slate-500 font-semibold mt-0.5">
                  {transaction.transactionType === "recurring" ? "RECURRING PAYMENT" : "ENROLLMENT RECEIPT"}
                </div>
              </div>

              {/* Dashed Separator */}
              <div className="border-b border-dashed border-slate-300 my-3" />

              {/* Plan / Service Block with Anchor Icon */}
              <div className="flex items-center gap-3 my-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#06172F] shrink-0">
                  <Anchor className="w-5 h-5 text-[#06172F]" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-[#06172F] leading-tight truncate">
                    {transaction.serviceName}
                  </h4>
                  {transaction.planName && (
                    <p className="text-[11px] text-slate-500 truncate">
                      {transaction.planName}
                    </p>
                  )}
                </div>
              </div>

              {/* Dashed Separator */}
              <div className="border-b border-dashed border-slate-300 my-3" />

              {/* Financial & Card Meta Row */}
              <div className="flex justify-between items-start my-3">
                <div className="text-[11px] space-y-0.5 text-slate-600">
                  <div className="font-semibold text-slate-800">Paid Today</div>
                  <div>
                    {transaction.paymentMethodBrand || "Visa"} •••• {transaction.paymentMethodLast4 || "2986"}
                  </div>
                  <div>{paidDateStr}</div>
                  <div>{paidTimeStr}</div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#06172F]">
                    {formattedAmount}
                  </span>
                  {transaction.status === "REFUNDED" && (
                    <div className="text-[10px] font-bold text-rose-600 uppercase">
                      REFUNDED
                    </div>
                  )}
                </div>
              </div>

              {/* Dashed Separator */}
              <div className="border-b border-dashed border-slate-300 my-3" />

              {/* Enrollment / Status Confirmation Badge */}
              <div className="my-3 py-1 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <div className="font-bold text-xs uppercase tracking-wide text-emerald-800">
                    {transaction.status === "REFUNDED" ? "REFUND RECORDED" : "ENROLLMENT COMPLETE"}
                  </div>
                  <div className="text-[11px] text-slate-600 leading-tight">
                    {isAdvocacyEnrollment
                      ? "Your Waypoint advocacy plan is active."
                      : "Payment successfully verified."}
                  </div>
                </div>
              </div>

              {/* Next Scheduled Payment Section (when applicable) */}
              {transaction.nextPaymentDate && transaction.nextPaymentAmountCents && (
                <>
                  <div className="border-b border-dashed border-slate-300 my-3" />
                  <div className="flex justify-between text-[11px] my-2 text-slate-700">
                    <div>
                      <div className="font-semibold text-slate-800">Next Payment</div>
                      <div>${(transaction.nextPaymentAmountCents / 100).toFixed(2)}</div>
                    </div>
                    <div className="text-right font-medium">
                      {new Date(transaction.nextPaymentDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Receipt Number */}
              <div className="text-center text-[10px] font-mono text-slate-400 mt-4 mb-2">
                Receipt #{transaction.receiptNumber}
              </div>

              {/* Realistic SVG Barcode at bottom of receipt */}
              <div className="flex justify-center mb-3">
                <svg width="220" height="34" viewBox="0 0 220 34" fill="#1e293b">
                  {/* Pattern of varying width bars */}
                  <rect x="0" y="0" width="3" height="34" />
                  <rect x="6" y="0" width="1" height="34" />
                  <rect x="9" y="0" width="4" height="34" />
                  <rect x="16" y="0" width="2" height="34" />
                  <rect x="21" y="0" width="1" height="34" />
                  <rect x="25" y="0" width="3" height="34" />
                  <rect x="31" y="0" width="2" height="34" />
                  <rect x="36" y="0" width="4" height="34" />
                  <rect x="43" y="0" width="1" height="34" />
                  <rect x="47" y="0" width="3" height="34" />
                  <rect x="53" y="0" width="2" height="34" />
                  <rect x="58" y="0" width="1" height="34" />
                  <rect x="62" y="0" width="4" height="34" />
                  <rect x="69" y="0" width="2" height="34" />
                  <rect x="74" y="0" width="1" height="34" />
                  <rect x="78" y="0" width="3" height="34" />
                  <rect x="84" y="0" width="1" height="34" />
                  <rect x="88" y="0" width="4" height="34" />
                  <rect x="95" y="0" width="2" height="34" />
                  <rect x="100" y="0" width="3" height="34" />
                  <rect x="106" y="0" width="1" height="34" />
                  <rect x="110" y="0" width="4" height="34" />
                  <rect x="117" y="0" width="2" height="34" />
                  <rect x="122" y="0" width="1" height="34" />
                  <rect x="126" y="0" width="3" height="34" />
                  <rect x="132" y="0" width="2" height="34" />
                  <rect x="137" y="0" width="4" height="34" />
                  <rect x="144" y="0" width="1" height="34" />
                  <rect x="148" y="0" width="3" height="34" />
                  <rect x="154" y="0" width="2" height="34" />
                  <rect x="159" y="0" width="1" height="34" />
                  <rect x="163" y="0" width="4" height="34" />
                  <rect x="170" y="0" width="2" height="34" />
                  <rect x="175" y="0" width="1" height="34" />
                  <rect x="179" y="0" width="3" height="34" />
                  <rect x="185" y="0" width="1" height="34" />
                  <rect x="189" y="0" width="4" height="34" />
                  <rect x="196" y="0" width="2" height="34" />
                  <rect x="201" y="0" width="3" height="34" />
                  <rect x="207" y="0" width="1" height="34" />
                  <rect x="211" y="0" width="4" height="34" />
                  <rect x="218" y="0" width="2" height="34" />
                </svg>
              </div>
            </div>

            {/* Realistic Jagged Torn Thermal Edge (SVG Teeth) */}
            <div className="w-full -mt-0.5 overflow-hidden leading-none">
              <svg
                viewBox="0 0 400 14"
                className="w-full h-3 text-[#FAF8F5] fill-current drop-shadow-md"
                preserveAspectRatio="none"
              >
                <polygon points="0,0 10,12 20,0 30,12 40,0 50,12 60,0 70,12 80,0 90,12 100,0 110,12 120,0 130,12 140,0 150,12 160,0 170,12 180,0 190,12 200,0 210,12 220,0 230,12 240,0 250,12 260,0 270,12 280,0 290,12 300,0 310,12 320,0 330,12 340,0 350,12 360,0 370,12 380,0 390,12 400,0" />
              </svg>
            </div>
          </div>

          {/* ── UNDER-RECEIPT ACTION BAR (Glassmorphic) ───────────────────────── */}
          <div className="w-full max-w-sm mt-6 rounded-2xl bg-[#06172f]/85 backdrop-blur-md border border-[#1b3a60] p-1.5 shadow-2xl flex items-center divide-x divide-[#1b3a60]">
            <button
              onClick={() => {
                if (onPrint) onPrint();
                else setShowPrintModal(true);
              }}
              className="flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span className="text-[11px] font-semibold">Print Receipt</span>
            </button>

            <button
              onClick={() => {
                if (onDownloadPdf) onDownloadPdf();
                else setShowPrintModal(true);
              }}
              className="flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-semibold">Download PDF</span>
            </button>

            <button
              onClick={() => setShowEmailModal(true)}
              className="flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-semibold">Email Receipt</span>
            </button>
          </div>

          {/* ── NAUTICAL GOLD COMPASS DIVIDER (― ✦ ―) ────────────────────────── */}
          <div className="flex items-center justify-center gap-3 w-64 my-6 opacity-75">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4af37] to-[#d4af37]" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L13.5 10.5L22 12L13.5 13.5L12 22L10.5 13.5L2 12L10.5 10.5L12 2Z" fill="#d4af37" />
              <circle cx="12" cy="12" r="1.5" fill="#000820" />
            </svg>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4af37] to-[#d4af37]" />
          </div>

          {/* ── COMPLETION MESSAGE ───────────────────────────────────────────── */}
          <div className="text-center space-y-1.5 mb-6">
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              {completionHeadline}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              {completionSupportingMessage}
            </p>
          </div>

          {/* ── PRIMARY GOLD ACTION BUTTON ───────────────────────────────────── */}
          <button
            onClick={() => {
              if (onContinue) {
                onContinue();
              } else if (settings?.completionButtonUrl) {
                window.location.href = settings.completionButtonUrl;
              } else {
                toast.info("Navigating to Onboarding...");
              }
            }}
            className="w-full max-w-sm py-4 px-8 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#c5a028] text-[#000820] font-bold text-sm tracking-wide shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{completionButtonText}</span>
          </button>
        </div>
      )}

      {/* ── MODAL 1: CLEAN PRINTABLE RECEIPT VIEWER ─────────────────────────── */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 bg-slate-100 border-none">
          <WaypointPrintableReceipt
            data={printableData}
            onClose={() => setShowPrintModal(false)}
            onDownloadPdf={() => {
              window.print();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: EMAIL RECEIPT PROMPT ───────────────────────────────────── */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-md bg-[#06172f] border border-[#1b3a60] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-400" />
              Email Payment Receipt
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-300">
              Send an official branded Waypoint payment confirmation for receipt{" "}
              <strong className="text-amber-300 font-mono">{transaction.receiptNumber}</strong> ({formattedAmount}).
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Recipient Email Address</label>
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="name@example.com"
                className="bg-[#030c1a] border-[#1b3a60] text-white text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                variant="ghost"
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEmailSubmit}
                disabled={isSendingEmail}
                className="bg-gradient-to-r from-[#d4af37] to-[#c5a028] text-[#000820] font-bold"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  "Send Receipt Email"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import React from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  formatCents,
  getPrinterIndicatorState,
  type PaymentStationMode,
  type PaymentStationReceiptStatus,
} from "@shared/paymentStation";

export interface ReceiptPrinterProps {
  mode: PaymentStationMode;
  hasSelectedClient?: boolean;
  clientOrDonorName: string;
  description: string;
  invoiceNumber?: string | null;
  donationNote?: string | null;
  donationFundName?: string | null;
  noGoodsOrServicesProvided?: boolean;
  goodsOrServicesFmvCents?: number;
  amountCents: number;
  status: PaymentStationReceiptStatus;
  paymentMethodSummary?: string | null;
  transactionRef?: string | null;
  receiptNumber?: string | null;
  paperFeedKey: number;
  canSendReceipt: boolean;
  emailDeliveryReady: boolean;
  isSendingReceipt: boolean;
  receiptSentTo: string | null;
  receiptSendError: string | null;
  onSendReceipt: () => void;
}

// Crisp serrated thermal cutter edge (36 sharp teeth matching the hardware specification)
const SERRATED_EDGE_POINTS = (() => {
  const width = 200;
  const teeth = 36;
  const step = width / teeth;
  const pts: string[] = ["0,6"];
  for (let i = 0; i < teeth; i++) {
    const midX = ((i + 0.5) * step).toFixed(2);
    const endX = ((i + 1) * step).toFixed(2);
    pts.push(`${midX},0.9`, `${endX},6`);
  }
  return pts.join(" ");
})();

const RECEIPT_SERIF_FONT =
  '"Libre Baskerville", "Playfair Display", Georgia, "Times New Roman", serif';

export function ReceiptPrinter({
  mode,
  hasSelectedClient = true,
  clientOrDonorName,
  description,
  invoiceNumber,
  donationNote,
  donationFundName,
  noGoodsOrServicesProvided = true,
  goodsOrServicesFmvCents = 0,
  amountCents,
  status,
  paymentMethodSummary,
  transactionRef,
  receiptNumber,
  paperFeedKey,
  canSendReceipt,
  emailDeliveryReady,
  isSendingReceipt,
  receiptSentTo,
  receiptSendError,
  onSendReceipt,
}: ReceiptPrinterProps) {
  const formattedAmount = formatCents(amountCents);
  const isStandbyClient = mode !== "donation" && !hasSelectedClient && status === "awaiting_payment";
  const lineItemLabel = isStandbyClient
    ? "Ready for payment"
    : mode === "donation"
      ? "Donation"
      : description || "Advocacy Services";

  const indicatorState = getPrinterIndicatorState(status);

  const statusText = (() => {
    if (isStandbyClient) return "Awaiting client";
    switch (status) {
      case "paid":
        return "PAID";
      case "pending":
        return "Pending payment";
      case "processing":
        return "Processing payment...";
      case "requires_action":
        return "Authentication required";
      case "unconfirmed":
        return "Status unconfirmed";
      case "offline":
        return "Offline — paused";
      case "failed":
        return "NOT PAID";
      case "awaiting_payment":
      default:
        return "Awaiting payment";
    }
  })();

  const statusTextColor =
    status === "paid"
      ? "text-emerald-800 font-bold not-italic tracking-[0.06em]"
      : status === "failed"
        ? "text-[#A81C24] font-semibold italic tracking-[0.04em]"
        : status === "offline" ||
          status === "unconfirmed" ||
          status === "pending" ||
          status === "requires_action"
          ? "text-amber-900 font-semibold italic"
          : "text-[#1A2336] italic";

  const indicatorAccessibleLabel = (() => {
    if (indicatorState === "green_solid") {
      return "Printer indicator solid green: Payment successful, PAID";
    }
    if (indicatorState === "red_pulse") {
      return "Printer indicator pulsing red: Payment declined, NOT PAID";
    }
    if (indicatorState === "amber_pulse") {
      return "Printer indicator pulsing amber: Internet disconnected, payments paused";
    }
    return `Printer indicator solid blue: ${statusText}`;
  })();

  return (
    <aside
      aria-label="Receipt printer"
      className="relative z-10 flex flex-col items-center w-[250px] lg:w-[256px] xl:w-[292px] 2xl:w-[322px] select-none shrink-0"
    >
      {/* ── LAYER 2 (z-20): REAL CREAM SERRATED THERMAL PAPER EMERGING FROM INSIDE THE BRASS SLOT ──
          Inner slot in angled 1-point-perspective printer-chassis-exact.jpg (938x738, ratio 1.271)
          spans x=14.93%..86.03% (center 50.48%), and the gleaming front brass lip starts at y=15.30%
          of chassis height (= 12.04% of printer width). -mb-[13.6%] tucks the paper cleanly behind the z-30 lip! */}
      <div
        key={paperFeedKey}
        data-testid="pos-receipt-paper"
        className={`pos-receipt-paper-wrap relative z-20 w-[68.5%] ml-[1%] -mb-[13.6%] ${paperFeedKey > 0 ? "pos-paper-feed-anim" : ""
          }`}
      >
        <div
          style={{
            clipPath: "polygon(0% 0%, 100% 0%, 97.4% 100%, 2.6% 100%)",
          }}
        >
          {/* Micro-Serrated Thermal Cutter Edge */}
          <svg
            aria-hidden="true"
            viewBox="0 0 200 6"
            preserveAspectRatio="none"
            className="block w-full h-[6px] -mb-[0.5px]"
          >
            <polygon fill="#FFFAF0" points={SERRATED_EDGE_POINTS} />
          </svg>

          {/* Warm Curved Cream Receipt Paper Body */}
          <div className="pos-receipt-paper px-4 pt-3.5 pb-6 text-[#111A2C]">
            {/* WAYPOINT Classic Serif Wordmark */}
            <div className="text-center pb-2.5 border-b border-[#C8B99D]/80">
              <div
                className="text-[16px] xl:text-[17.5px] tracking-[0.19em] font-normal text-[#101A2C] leading-none"
                style={{ fontFamily: RECEIPT_SERIF_FONT }}
              >
                WAYPOINT
              </div>
              {mode === "donation" && (
                <div className="text-[8.5px] uppercase tracking-[0.18em] text-[#5B503E] mt-1 font-semibold">
                  Donation Receipt
                </div>
              )}
            </div>

            {/* Client / Donor Name in Crisp Bold Serif */}
            <div
              data-testid="pos-receipt-client-name"
              className={`mt-3 text-[15px] xl:text-[16px] leading-snug truncate ${isStandbyClient
                ? "font-medium italic text-[#5B6577]"
                : "font-bold text-[#0F1829]"
                }`}
              style={{ fontFamily: RECEIPT_SERIF_FONT }}
            >
              {isStandbyClient ? "No client selected" : clientOrDonorName || "Select client"}
            </div>

            {/* Service / Donation Description & Amount */}
            <div className="mt-2.5 pb-3 border-b border-[#C8B99D]/80">
              <div className="flex items-baseline justify-between gap-2 text-[12.5px] xl:text-[13.5px] text-[#1A2438]">
                <span className="truncate font-medium">{lineItemLabel}</span>
                <span className="font-medium tabular-nums shrink-0">{formattedAmount}</span>
              </div>

              {mode === "invoice" && invoiceNumber && (
                <div className="mt-0.5 text-[10px] text-[#556073] truncate">
                  Invoice {invoiceNumber}
                </div>
              )}
              {mode === "donation" && donationFundName && (
                <div className="mt-0.5 text-[9.5px] text-[#4C5566] truncate">
                  {donationFundName}
                </div>
              )}
              {mode === "donation" && donationNote && (
                <div className="mt-0.5 text-[9.5px] text-[#556073] line-clamp-2">
                  {donationNote}
                </div>
              )}
            </div>

            {/* Total Row in Classic Bold Serif */}
            <div
              className="mt-3 flex items-baseline justify-between gap-2 text-[#0D1628]"
              style={{ fontFamily: RECEIPT_SERIF_FONT }}
            >
              <span className="text-[14.5px] xl:text-[15.5px] font-bold">Total</span>
              <span
                data-testid="pos-receipt-total"
                className="text-[15.5px] xl:text-[16.5px] font-bold tabular-nums"
              >
                {formattedAmount}
              </span>
            </div>

            {/* Payment Status in Classic Serif — always paired with indicator light */}
            <div
              data-testid="pos-receipt-status"
              className={`mt-3.5 text-center text-[12.5px] xl:text-[13.5px] leading-snug ${statusTextColor}`}
              style={{ fontFamily: RECEIPT_SERIF_FONT }}
            >
              {statusText}
            </div>

            {mode === "donation" && (
              <div
                data-testid="pos-receipt-donation-compliance"
                className="mt-1.5 pt-1.5 border-t border-[#C8B99D]/60 text-center text-[8.5px] leading-snug text-[#4E5666] space-y-0.5"
              >
                <div>
                  {noGoodsOrServicesProvided
                    ? "No goods or services provided"
                    : `Goods/services FMV: ${formatCents(goodsOrServicesFmvCents)}`}
                </div>
                <div className="italic text-[#626A78]">
                  Non-deductible until 501(c)(3) active
                </div>
              </div>
            )}

            {status === "paid" && paymentMethodSummary && (
              <div className="mt-0.5 text-center text-[9.5px] font-medium text-[#374355] truncate">
                {paymentMethodSummary}
              </div>
            )}

            {(receiptNumber || transactionRef) &&
              status !== "awaiting_payment" &&
              status !== "failed" && (
                <div className="mt-0.5 text-center text-[9px] font-mono text-[#4B5567] truncate">
                  {receiptNumber ? `${receiptNumber}` : ""}
                  {receiptNumber && transactionRef ? " · " : ""}
                  {transactionRef ? `${transactionRef.slice(0, 15)}` : ""}
                </div>
              )}

            {/* Gentle warm contact shadow right where paper enters behind the front brass slot lip */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-4"
              style={{
                background:
                  "linear-gradient(180deg, rgba(84, 56, 20, 0) 0%, rgba(56, 36, 12, 0.24) 72%, rgba(28, 16, 5, 0.42) 100%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── LAYERED 1-POINT-PERSPECTIVE 3D THERMAL PRINTER CHASSIS (receding left side wall + straight front face) ── */}
      <div className="relative w-full" style={{ aspectRatio: "938 / 738" }}>
        {/* Matching purple/violet tabletop underglow directly beneath the printer's brass feet */}
        <div
          aria-hidden="true"
          className="pos-printer-underglow pointer-events-none absolute -bottom-[15%] -left-[10%] -right-[10%] h-[30%] z-0 rounded-full"
        />

        {/* LAYER 1 (z-10): Full blank 3D printer chassis (back rim, dark cavity recess, left side wall, top deck) */}
        <img
          src="/assets/pos/printer-chassis-exact.jpg"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pos-studio-blend pointer-events-none absolute inset-0 z-10 h-full w-full object-fill select-none"
        />

        {/* LAYER 3 (z-30): Exact front brass slot lip + cyan LED + front navy housing OVER the tucked bottom of the paper */}
        <img
          src="/assets/pos/printer-chassis-exact.jpg"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pos-studio-blend pointer-events-none absolute inset-0 z-30 h-full w-full object-fill select-none"
          style={{
            clipPath: "inset(15.3% 0 0 0)",
          }}
        />

        {/* LAYER 4A (z-40): Hardware Indicator Light (solid blue ready/processing/unconfirmed, solid green paid, 3s gentle red pulse declined) */}
        <div
          role="status"
          aria-live="polite"
          data-testid="pos-printer-indicator"
          data-indicator-state={indicatorState}
          aria-label={indicatorAccessibleLabel}
          className="pointer-events-none absolute z-40 flex items-center justify-center"
          style={{
            top: "21.6%",
            left: "73.2%",
            width: "14.2%",
            height: "4.8%",
          }}
        >
          {/* Opaque recessed bezel mask cleanly isolates green/red LED from baked-in cyan top-deck halo */}
          {indicatorState !== "blue_solid" && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse 68% 68% at 50% 50%, #0b1933 52%, rgba(11, 25, 51, 0.85) 74%, rgba(11, 25, 51, 0) 100%)",
              }}
            />
          )}
          {/* Recessed dark metallic pill socket + animated/solid indicator lens */}
          <span
            aria-hidden="true"
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: "70%",
              height: "52%",
              background: indicatorState === "blue_solid" ? "transparent" : "#071225",
              padding: "1px",
            }}
          >
            <span
              data-testid="pos-printer-indicator-lens"
              className={`block w-full h-full rounded-full ${indicatorState === "green_solid"
                ? "pos-printer-led-green"
                : indicatorState === "red_pulse"
                  ? "pos-printer-led-red"
                  : indicatorState === "amber_pulse"
                    ? "pos-printer-led-amber"
                    : "pos-printer-led-blue"
                }`}
            />
          </span>
        </div>

        {/* LAYER 4B (z-40): Machined-Brass & Soft-Touch Navy "Send receipt" Button Centered Squarely on the Front Face */}
        <div
          className="absolute z-40 flex items-center justify-center"
          style={{
            top: "51.5%",
            height: "19.5%",
            left: "23.5%",
            right: "15.5%",
          }}
        >
          <div className="pos-printer-btn-well w-full h-full">
            <button
              type="button"
              data-testid="pos-send-receipt-btn"
              disabled={!canSendReceipt || isSendingReceipt}
              onClick={onSendReceipt}
              title={
                !canSendReceipt
                  ? "Available after payment is confirmed by Stripe"
                  : !emailDeliveryReady
                    ? "Email provider not configured — click for details"
                    : "Send verified receipt by email"
              }
              className={`pos-printer-btn block w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${canSendReceipt ? "cursor-pointer" : "cursor-not-allowed"
                }`}
            >
              <span
                className={`pos-printer-btn-face flex items-center justify-center gap-2.5 px-3 text-[13.5px] xl:text-[14.5px] font-normal tracking-[0.015em] ${canSendReceipt ? "text-[#F7F3EA]" : "text-[#EAE6DC]"
                  }`}
                style={{ fontFamily: '"Outfit", "Plus Jakarta Sans", sans-serif' }}
              >
                {isSendingReceipt ? (
                  <Loader2 className="h-[16px] w-[16px] animate-spin text-cyan-200 shrink-0" />
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-[17px] w-[17px] xl:h-[18px] xl:w-[18px] text-[#EFECE3] shrink-0"
                  >
                    <path
                      d="M21.5 3.5L2.8 10.6L9.4 13.5L12.1 20.1L21.5 3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.4 13.5L21.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.4 13.5L9.4 18.8L11.5 16.5"
                      stroke="currentColor"
                      strokeWidth="1.45"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span>{isSendingReceipt ? "Sending..." : "Send receipt"}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Delivery Feedback (honest status only — never claims delivery without server confirmation) */}
      {(receiptSentTo || receiptSendError) && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-2 w-full rounded-lg px-2.5 py-1.5 text-[11px] flex items-start gap-1.5 ${receiptSentTo
            ? "bg-emerald-950/70 border border-emerald-500/35 text-emerald-200"
            : "bg-amber-950/70 border border-amber-500/35 text-amber-200"
            }`}
        >
          {receiptSentTo ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-300" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-300" />
          )}
          <span className="leading-snug">
            {receiptSentTo ? `Sent to ${receiptSentTo}` : receiptSendError}
          </span>
        </div>
      )}
    </aside>
  );
}

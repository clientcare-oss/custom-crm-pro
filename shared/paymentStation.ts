/**
 * Shared integer minor-unit (cents) currency helpers and validation rules
 * for Waypoint CRM Payment Station (PG-050).
 *
 * All calculations use exact integer cents to avoid floating-point drift.
 */

export const MIN_PAYMENT_CENTS = 50; // $0.50 Stripe USD card minimum
export const MAX_PAYMENT_CENTS = 99_999_999; // $999,999.99 safety cap

export type PaymentStationMethod = "saved_card" | "card_by_phone" | "send_link";
export type PaymentStationMode = "invoice" | "service" | "donation";
export type PaymentStationReceiptStatus =
  | "awaiting_payment"
  | "pending"
  | "processing"
  | "requires_action"
  | "paid"
  | "failed"
  | "unconfirmed"
  | "offline";

export type PrinterIndicatorState = "blue_solid" | "green_solid" | "red_pulse" | "amber_pulse";

export const PAYMENT_DECLINED_INLINE_MESSAGE =
  "Payment declined. No payment was collected.";
export const PAYMENT_UNCONFIRMED_INLINE_MESSAGE =
  "Payment status unconfirmed. Check status before retrying.";
export const PAYMENT_SUCCESS_INLINE_MESSAGE =
  "Payment successful. Receipt is ready to send.";
export const PAYMENT_OFFLINE_INLINE_MESSAGE =
  "No internet connection. Payments are paused until connection returns.";
export const PAYMENT_REQUIRES_ACTION_INLINE_MESSAGE =
  "Card authentication required. Complete 3DS verification to finish payment.";

export interface DonationFundOption {
  id: string;
  name: string;
  restrictionType: "unrestricted" | "restricted";
}

export const DONATION_FUND_OPTIONS: DonationFundOption[] = [
  {
    id: "fnd-2",
    name: "General Impact Fund",
    restrictionType: "unrestricted",
  },
  {
    id: "fnd-1",
    name: "Advocacy Scholarship Fund",
    restrictionType: "restricted",
  },
  {
    id: "fnd-3",
    name: "Emergency Due Process Fund",
    restrictionType: "restricted",
  },
];

export interface DonationComplianceInput {
  donorName: string;
  donorEmail?: string | null;
  donorAddress?: string | null;
  amountCents: number;
  fundId?: string | null;
  noGoodsOrServicesProvided: boolean;
  goodsOrServicesDescription?: string | null;
  goodsOrServicesFmvCents?: number;
  is501c3Active?: boolean;
}

export interface DonationComplianceItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface DonationComplianceResult {
  ready: boolean;
  blockingIssues: string[];
  warnings: string[];
  netCharitableCents: number;
  checks: DonationComplianceItem[];
}

/**
 * Evaluates federal 501(c)(3) & Georgia charitable donation compliance readiness:
 * - Donor legal name (mandatory for receipt & audit trail)
 * - IRC §170(f)(8) written acknowledgment contact info (required >= $250)
 * - IRS Form 990 Schedule B mailing address (required >= $5,000)
 * - IRC §170(f)(8) & §6115 quid pro quo goods/services disclosure (> $75)
 * - FASB ASC 958 fund designation (unrestricted vs. restricted)
 * - IRC §6113 pre-501(c)(3) non-deductibility guardrail
 */
export function evaluateDonationCompliance(
  input: DonationComplianceInput
): DonationComplianceResult {
  const checks: DonationComplianceItem[] = [];
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  const cleanName = (input.donorName || "").trim();
  const cleanEmail = (input.donorEmail || "").trim();
  const cleanAddress = (input.donorAddress || "").trim();
  const amountCents = Math.max(0, Math.round(input.amountCents || 0));
  const fmvCents = input.noGoodsOrServicesProvided
    ? 0
    : Math.max(0, Math.round(input.goodsOrServicesFmvCents || 0));

  // 1. Donor legal name
  if (cleanName.length >= 2) {
    checks.push({
      id: "donor_identity",
      label: "Donor identity",
      status: "pass",
      detail: `Recorded for ${cleanName}`,
    });
  } else {
    const msg = "Enter the donor's full legal name or attach an account.";
    blockingIssues.push(msg);
    checks.push({
      id: "donor_identity",
      label: "Donor identity",
      status: "fail",
      detail: msg,
    });
  }

  // 2. Contact / Written acknowledgment threshold (IRC §170(f)(8) >= $250, Schedule B >= $5,000)
  if (amountCents >= 500_000 && !cleanAddress) {
    const msg = "IRS Schedule B (≥$5,000): Mailing address is required.";
    warnings.push(msg);
    checks.push({
      id: "acknowledgment_contact",
      label: "IRS acknowledgment",
      status: "warn",
      detail: msg,
    });
  } else if (amountCents >= 25_000 && !cleanEmail && !cleanAddress) {
    const msg = "IRS ≥$250 rule: Add email or mailing address for written receipt.";
    warnings.push(msg);
    checks.push({
      id: "acknowledgment_contact",
      label: "IRS acknowledgment",
      status: "warn",
      detail: msg,
    });
  } else {
    checks.push({
      id: "acknowledgment_contact",
      label: "IRS acknowledgment",
      status: "pass",
      detail: cleanEmail || cleanAddress ? "Receipt contact recorded" : "Under $250 threshold",
    });
  }

  // 3. Quid pro quo goods/services disclosure (IRC §170(f)(8) & §6115)
  if (input.noGoodsOrServicesProvided) {
    checks.push({
      id: "quid_pro_quo",
      label: "Goods / services",
      status: "pass",
      detail: "No goods or services provided in exchange",
    });
  } else if (fmvCents <= 0 || fmvCents > amountCents) {
    const msg =
      fmvCents > amountCents
        ? "Goods/services FMV cannot exceed the donation amount."
        : "IRC §6115: Enter fair market value of goods/services received.";
    blockingIssues.push(msg);
    checks.push({
      id: "quid_pro_quo",
      label: "Goods / services",
      status: "fail",
      detail: msg,
    });
  } else {
    checks.push({
      id: "quid_pro_quo",
      label: "Goods / services",
      status: "pass",
      detail: `FMV ${formatCents(fmvCents)} disclosed; net gift ${formatCents(amountCents - fmvCents)}`,
    });
  }

  // 4. Fund restriction designation (FASB ASC 958)
  const matchedFund = DONATION_FUND_OPTIONS.find((f) => f.id === input.fundId);
  checks.push({
    id: "fund_designation",
    label: "Fund accounting",
    status: "pass",
    detail: matchedFund
      ? `${matchedFund.name} (${matchedFund.restrictionType})`
      : "General Impact Fund (unrestricted)",
  });

  // 5. Tax-exempt disclosure guardrail (IRC §6113)
  if (input.is501c3Active) {
    checks.push({
      id: "tax_status",
      label: "501(c)(3) status",
      status: "pass",
      detail: "Active 501(c)(3) disclosure enabled",
    });
  } else {
    checks.push({
      id: "tax_status",
      label: "Pre-501(c)(3) guard",
      status: "pass",
      detail: "Receipt states non-deductible until 501(c)(3) is approved",
    });
  }

  return {
    ready: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    netCharitableCents: Math.max(0, amountCents - fmvCents),
    checks,
  };
}

/**
 * Maps verified payment station state to exact hardware printer indicator light behavior:
 * - Waiting / ready / pending / requires_action / unconfirmed -> Solid blue
 * - Processing -> Keep solid blue
 * - Payment successful -> Solid green
 * - Payment declined -> Slowly pulsing red (solid red under reduced motion)
 * - Internet disconnected -> Slowly pulsing amber (solid amber under reduced motion)
 */
export function getPrinterIndicatorState(
  status: PaymentStationReceiptStatus
): PrinterIndicatorState {
  if (status === "paid") return "green_solid";
  if (status === "failed") return "red_pulse";
  if (status === "offline") return "amber_pulse";
  return "blue_solid";
}

/**
 * Distinguishes connection/network uncertainty (where processor outcome may be unknown)
 * from explicit payment declines so we never misreport an unconfirmed charge as declined.
 */
export function classifyPaymentErrorKind(error: unknown): "declined" | "unconfirmed" {
  const errObj = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const code = String(errObj?.code ?? errObj?.type ?? "").toLowerCase();
  const name = String(errObj?.name ?? "").toLowerCase();
  const message = (
    error instanceof Error
      ? error.message
      : typeof errObj?.message === "string"
        ? errObj.message
        : String(error ?? "")
  ).toLowerCase();

  if (
    code.includes("api_connection") ||
    code.includes("network") ||
    code.includes("timeout") ||
    name === "aborterror" ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("load failed") ||
    message.includes("connection") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("status unconfirmed") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  ) {
    return "unconfirmed";
  }
  return "declined";
}

/**
 * Formats integer cents as USD currency (e.g. 10500 -> "$105.00").
 */
export function formatCents(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  const dollars = Math.floor(safe / 100);
  const remainder = safe % 100;
  return `$${dollars.toLocaleString("en-US")}.${String(remainder).padStart(2, "0")}`;
}

/**
 * Formats integer cents as plain decimal string (e.g. 10500 -> "105.00").
 */
export function centsToDecimalString(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  const dollars = Math.floor(safe / 100);
  const remainder = safe % 100;
  return `${dollars}.${String(remainder).padStart(2, "0")}`;
}

/**
 * Converts a numeric or string dollar value into exact integer cents.
 */
export function dollarsToCents(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const str = String(value).replace(/[^0-9.-]/g, "").trim();
  if (!str) return 0;
  const parsed = Number(str);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

/**
 * Appends a single keypad digit (0-9) using predictable POS two-decimal
 * minor-unit entry:
 *   0 -> "1" -> 1 ($0.01) -> "0" -> 10 ($0.10) -> "5" -> 105 ($1.05) -> "0" -> 1050 ($10.50) -> "0" -> 10500 ($105.00)
 *
 * When `replacePrefill` is true (e.g. first key press after selecting an invoice),
 * starts fresh with the entered digit so advocates can immediately type a partial
 * payment without pressing Clear first.
 */
export function appendKeypadDigitCents(
  currentCents: number,
  digit: number,
  options?: { replacePrefill?: boolean }
): number {
  const cleanDigit = Math.trunc(digit);
  if (!Number.isInteger(cleanDigit) || cleanDigit < 0 || cleanDigit > 9) {
    return Math.max(0, Math.round(currentCents));
  }
  const base = options?.replacePrefill ? 0 : Math.max(0, Math.round(currentCents));
  const next = base * 10 + cleanDigit;
  if (next > MAX_PAYMENT_CENTS) {
    return base;
  }
  return next;
}

/**
 * Removes the rightmost minor-unit digit (integer division by 10).
 */
export function backspaceKeypadCents(currentCents: number): number {
  const safe = Math.max(0, Math.round(currentCents));
  return Math.floor(safe / 10);
}

/**
 * Clears the entered amount to $0.00.
 */
export function clearKeypadCents(): number {
  return 0;
}

/**
 * Parses a user-entered currency string (e.g. "105", "105.5", "105.00", "$45.25")
 * into exact integer cents.
 */
export function parseCurrencyInputToCents(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const parts = cleaned.split(".");
  const wholePart = parts[0] || "0";
  const fracPart = (parts[1] || "").slice(0, 2).padEnd(2, "0");
  const cents = parseInt(wholePart, 10) * 100 + parseInt(fracPart || "0", 10);
  if (!Number.isFinite(cents) || cents < 0) return 0;
  return Math.min(cents, MAX_PAYMENT_CENTS);
}

export interface InvoiceBalanceValidationInput {
  invoiceStatus: string;
  invoiceTotalCents: number;
  amountPaidCents: number;
  requestedPaymentCents: number;
}

export interface InvoiceBalanceValidationResult {
  valid: boolean;
  remainingCents: number;
  isPartialPayment: boolean;
  willSettleInFull: boolean;
  error?: string;
}

const NON_PAYABLE_INVOICE_STATUSES = new Set([
  "Paid",
  "Voided",
  "Cancelled",
  "Uncollectible",
]);

/**
 * Enforces Waypoint CRM invoice payment rules:
 * - Blocks charging Paid, Voided, Cancelled, or Uncollectible invoices.
 * - Enforces Stripe minimum ($0.50) and maximum caps.
 * - Prevents overpayment above remaining invoice balance (never silently alters invoice total).
 * - Allows accurate full or partial payments.
 */
export function validateInvoicePaymentAmountCents(
  input: InvoiceBalanceValidationInput
): InvoiceBalanceValidationResult {
  const totalCents = Math.max(0, Math.round(input.invoiceTotalCents));
  const paidCents = Math.max(0, Math.round(input.amountPaidCents));
  const requestedCents = Math.round(input.requestedPaymentCents);
  const remainingCents = Math.max(0, totalCents - paidCents);

  if (NON_PAYABLE_INVOICE_STATUSES.has(input.invoiceStatus)) {
    return {
      valid: false,
      remainingCents,
      isPartialPayment: false,
      willSettleInFull: false,
      error: `Invoice cannot be charged because its status is "${input.invoiceStatus}".`,
    };
  }

  if (remainingCents <= 0) {
    return {
      valid: false,
      remainingCents: 0,
      isPartialPayment: false,
      willSettleInFull: false,
      error: "This invoice has no remaining balance due.",
    };
  }

  if (!Number.isInteger(requestedCents) || requestedCents < MIN_PAYMENT_CENTS) {
    return {
      valid: false,
      remainingCents,
      isPartialPayment: false,
      willSettleInFull: false,
      error: `Minimum payment amount is ${formatCents(MIN_PAYMENT_CENTS)}.`,
    };
  }

  if (requestedCents > remainingCents) {
    return {
      valid: false,
      remainingCents,
      isPartialPayment: false,
      willSettleInFull: false,
      error: `Payment amount (${formatCents(requestedCents)}) exceeds the remaining invoice balance (${formatCents(remainingCents)}). Invoice balances cannot be silently altered.`,
    };
  }

  const willSettleInFull = requestedCents === remainingCents;
  return {
    valid: true,
    remainingCents,
    isPartialPayment: !willSettleInFull,
    willSettleInFull,
  };
}

/**
 * Validates a standalone authorized service or donation payment amount.
 */
export function validateStandalonePaymentAmountCents(requestedCents: number): {
  valid: boolean;
  error?: string;
} {
  if (!Number.isInteger(requestedCents) || requestedCents < MIN_PAYMENT_CENTS) {
    return {
      valid: false,
      error: `Minimum payment amount is ${formatCents(MIN_PAYMENT_CENTS)}.`,
    };
  }
  if (requestedCents > MAX_PAYMENT_CENTS) {
    return {
      valid: false,
      error: `Payment amount exceeds maximum single-transaction limit of ${formatCents(MAX_PAYMENT_CENTS)}.`,
    };
  }
  return { valid: true };
}

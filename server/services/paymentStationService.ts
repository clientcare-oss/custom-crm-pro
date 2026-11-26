import type Stripe from "stripe";
import { eq, desc } from "drizzle-orm";
import { getSafeStripe } from "../stripeClient";
import { getDb } from "../db/connection";
import {
  invoices,
  transactions,
  sponsors,
  receiptSettings,
} from "../../drizzle/schema";
import {
  getContactById,
  getContactsByOwner,
  inMemoryContacts,
} from "../db/contacts";
import {
  listAllInvoicesDetailed,
  getInvoiceWithDetails,
  inMemoryBillingInvoices,
  getFamilyPaymentMethods,
  addFamilyPaymentMethod,
  removeFamilyPaymentMethod,
} from "../db/billing";
import { listServices } from "../db/services";
import { storedDonations, storedSupporters } from "../db/giving";
import {
  inMemoryTransactions,
  inMemoryReceiptSettings,
  DEFAULT_RECEIPT_SETTINGS,
} from "../routers/receipts";
import { generateAndArchiveReceiptPdf } from "./receiptPdfService";
import { recordCaseActivity } from "./caseActivityService";
import { dispatchPaymentAutomationTriggers } from "../db/automations";
import {
  getEmailProviderStatus,
  sendEmailDetailed,
  type EmailDeliveryResult,
} from "../_core/email";
import {
  dollarsToCents,
  formatCents,
  centsToDecimalString,
  validateInvoicePaymentAmountCents,
  validateStandalonePaymentAmountCents,
  DONATION_FUND_OPTIONS,
  type PaymentStationMode,
} from "../../shared/paymentStation";

export interface PaymentStationConfigStatus {
  mode: "test" | "live" | "unconfigured";
  secretKeyConfigured: boolean;
  publishableKeyConfigured: boolean;
  publishableKey: string | null;
  webhookSecretConfigured: boolean;
  modeMismatch: boolean;
  cardByPhoneReady: boolean;
  savedCardReady: boolean;
  paymentLinkReady: boolean;
  emailDeliveryReady: boolean;
  emailProvider: string;
  emailSender: string | null;
  missingSetupItems: string[];
}

export interface PaymentStationClientSummary {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  planTier: string | null;
  caseId: string | null;
  openInvoiceCount: number;
  openBalanceCents: number;
}

export interface PaymentStationInvoiceSummary {
  id: number;
  invoiceNumber: string;
  title: string;
  serviceDescription: string | null;
  status: string;
  totalCents: number;
  amountPaidCents: number;
  remainingCents: number;
  dueDate: string | null;
}

export interface PaymentStationSavedMethod {
  id: string;
  stripePaymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  source: "stripe" | "crm";
  chargeable: boolean;
}

export interface PaymentStationServiceOption {
  id: number;
  title: string;
  serviceCode: string;
  standardPriceCents: number;
  billingType: string;
}

export interface PaymentStationReceiptSnapshot {
  transactionId: number | null;
  receiptNumber: string | null;
  status: "awaiting_payment" | "pending" | "paid" | "failed" | "requires_action";
  mode: PaymentStationMode;
  clientId: number | null;
  clientOrDonorName: string;
  clientOrDonorEmail: string | null;
  description: string;
  subtitle: string | null;
  invoiceId: number | null;
  invoiceNumber: string | null;
  amountCents: number;
  paymentMethodSummary: string | null;
  transactionRef: string | null;
  checkoutUrl: string | null;
  paidAt: string | null;
  collectedByName: string | null;
  emailSentAt: string | null;
  donationNote: string | null;
}

export interface StaffCollectorIdentity {
  userId: number;
  name: string;
  email: string;
  role: string;
}

export interface PaymentStationAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  outcome: "initiated" | "succeeded" | "pending" | "requires_action" | "failed" | "receipt_sent";
  mode: PaymentStationMode;
  method: "saved_card" | "card_by_phone" | "send_link" | "receipt";
  amountCents: number;
  clientId: number | null;
  invoiceId: number | null;
  clientOrDonorName: string;
  collectedByUserId: number;
  collectedByName: string;
  transactionRef: string | null;
  detail: string;
}

// ── Test Override & Idempotency / Audit Stores ───────────────────────────────
let _stripeOverrideForTests: Stripe | null = null;
let _publishableKeyOverrideForTests: string | null | undefined = undefined;
let _posSequenceCounter = 5100;

const idempotencyCache = new Map<string, { createdAt: number; payload: unknown }>();
const posAuditTrail: PaymentStationAuditEntry[] = [];
const finalizedStripeRefs = new Map<string, PaymentStationReceiptSnapshot>();

export function __setPaymentStationStripeForTests(
  stripeMock: Stripe | null,
  publishableKey?: string | null
): void {
  _stripeOverrideForTests = stripeMock;
  _publishableKeyOverrideForTests = publishableKey;
}

export function __resetPaymentStationStateForTests(): void {
  _stripeOverrideForTests = null;
  _publishableKeyOverrideForTests = undefined;
  idempotencyCache.clear();
  posAuditTrail.length = 0;
  finalizedStripeRefs.clear();
}

export function getPaymentStationAuditTrail(): PaymentStationAuditEntry[] {
  return [...posAuditTrail];
}

function resolveStripeClient(): Stripe | null {
  if (_stripeOverrideForTests) return _stripeOverrideForTests;
  return getSafeStripe();
}

function resolvePublishableKey(): string | null {
  if (_publishableKeyOverrideForTests !== undefined) {
    return _publishableKeyOverrideForTests;
  }
  const cfEnv = (globalThis as unknown as { __CF_ENV__?: Record<string, string | undefined> }).__CF_ENV__;
  const key =
    process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    cfEnv?.VITE_STRIPE_PUBLISHABLE_KEY ||
    cfEnv?.STRIPE_PUBLISHABLE_KEY ||
    null;
  return key && key.trim() ? key.trim() : null;
}

function resolveSecretKeyRaw(): string | null {
  const cfEnv = (globalThis as unknown as { __CF_ENV__?: Record<string, string | undefined> }).__CF_ENV__;
  const key = process.env.STRIPE_SECRET_KEY || cfEnv?.STRIPE_SECRET_KEY || null;
  return key && key.trim() ? key.trim() : null;
}

function resolveWebhookSecretRaw(): string | null {
  const cfEnv = (globalThis as unknown as { __CF_ENV__?: Record<string, string | undefined> }).__CF_ENV__;
  const key = process.env.STRIPE_WEBHOOK_SECRET || cfEnv?.STRIPE_WEBHOOK_SECRET || null;
  return key && key.trim() ? key.trim() : null;
}

function pushAudit(entry: Omit<PaymentStationAuditEntry, "id" | "timestamp">): void {
  posAuditTrail.unshift({
    id: `pos-aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (posAuditTrail.length > 250) {
    posAuditTrail.length = 250;
  }
}

function readIdempotency<T>(key: string | undefined): T | null {
  if (!key) return null;
  const hit = idempotencyCache.get(key);
  if (!hit) return null;
  return hit.payload as T;
}

function writeIdempotency(key: string | undefined, payload: unknown): void {
  if (!key) return;
  idempotencyCache.set(key, { createdAt: Date.now(), payload });
}

// ── 1. Configuration & Honest Integration Readiness ──────────────────────────
export async function getPaymentStationConfigStatus(): Promise<PaymentStationConfigStatus> {
  const stripe = resolveStripeClient();
  const rawSecret = resolveSecretKeyRaw();
  const publishableKey = resolvePublishableKey();
  const webhookSecret = resolveWebhookSecretRaw();
  const emailStatus = await getEmailProviderStatus();

  const secretKeyConfigured = Boolean(stripe);
  const publishableKeyConfigured = Boolean(
    publishableKey && (publishableKey.startsWith("pk_test_") || publishableKey.startsWith("pk_live_"))
  );
  const webhookSecretConfigured = Boolean(webhookSecret);

  const secretMode: "test" | "live" | "unconfigured" = !secretKeyConfigured
    ? "unconfigured"
    : rawSecret?.startsWith("sk_live_")
      ? "live"
      : "test";

  const pkMode: "test" | "live" | "unconfigured" = !publishableKeyConfigured
    ? "unconfigured"
    : publishableKey?.startsWith("pk_live_")
      ? "live"
      : "test";

  const modeMismatch =
    secretMode !== "unconfigured" &&
    pkMode !== "unconfigured" &&
    secretMode !== pkMode;

  const missingSetupItems: string[] = [];
  if (!secretKeyConfigured) {
    missingSetupItems.push("STRIPE_SECRET_KEY (server-side Stripe secret key: sk_test_... or sk_live_...)");
  }
  if (!publishableKeyConfigured) {
    missingSetupItems.push("VITE_STRIPE_PUBLISHABLE_KEY (Stripe publishable key for secure Card by phone Elements: pk_test_... or pk_live_...)");
  }
  if (modeMismatch) {
    missingSetupItems.push("Stripe key mode mismatch: STRIPE_SECRET_KEY and VITE_STRIPE_PUBLISHABLE_KEY must both be test or both be live.");
  }
  if (!webhookSecretConfigured) {
    missingSetupItems.push("STRIPE_WEBHOOK_SECRET (required for asynchronous Stripe webhook confirmation of payment links and 3DS charges)");
  }
  if (!emailStatus.configured) {
    missingSetupItems.push("Gmail SMTP credentials (Integrations → Gmail or GMAIL_USER & GMAIL_APP_PASSWORD) for sending receipts and payment links by email");
  }

  return {
    mode: secretMode,
    secretKeyConfigured,
    publishableKeyConfigured,
    publishableKey: publishableKeyConfigured ? publishableKey : null,
    webhookSecretConfigured,
    modeMismatch,
    cardByPhoneReady: secretKeyConfigured && publishableKeyConfigured && !modeMismatch,
    savedCardReady: secretKeyConfigured,
    paymentLinkReady: secretKeyConfigured,
    emailDeliveryReady: emailStatus.configured,
    emailProvider: emailStatus.provider,
    emailSender: emailStatus.senderEmail,
    missingSetupItems,
  };
}

// ── 2. Client Search & Billing Context ───────────────────────────────────────
function formatContactName(c: Record<string, unknown>): string {
  const first = String(c.firstName || "").trim();
  const last = String(c.lastName || "").trim();
  const full = `${first} ${last}`.trim();
  return full || String(c.company || c.email || `Client #${c.id}`);
}

export async function searchPaymentStationClients(
  ownerId: number,
  query?: string
): Promise<PaymentStationClientSummary[]> {
  const contactsList = await getContactsByOwner(ownerId);
  const allInvoices = await listAllInvoicesDetailed({});

  const openByClient = new Map<number, { count: number; balanceCents: number }>();
  for (const inv of allInvoices) {
    if (!inv || !inv.clientId) continue;
    if (["Paid", "Voided", "Cancelled", "Uncollectible"].includes(String(inv.status))) continue;
    const totalCents = dollarsToCents(inv.total ?? inv.amount);
    const paidCents = dollarsToCents(inv.amountPaid ?? 0);
    const remaining = Math.max(0, totalCents - paidCents);
    if (remaining <= 0) continue;
    const cur = openByClient.get(inv.clientId) || { count: 0, balanceCents: 0 };
    cur.count += 1;
    cur.balanceCents += remaining;
    openByClient.set(inv.clientId, cur);
  }

  const normalizedQuery = (query || "").trim().toLowerCase();
  const activeContacts = (contactsList || []).filter((c: Record<string, unknown>) => {
    if (!c || c.archivedAt) return false;
    if (!normalizedQuery) return true;
    const hay = [
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.company,
      c.caseId,
      c.planTier,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(normalizedQuery);
  });

  const mapped: PaymentStationClientSummary[] = activeContacts.map((c: Record<string, unknown>) => {
    const id = Number(c.id);
    const open = openByClient.get(id) || { count: 0, balanceCents: 0 };
    return {
      id,
      name: formatContactName(c),
      firstName: String(c.firstName || ""),
      lastName: String(c.lastName || ""),
      email: c.email ? String(c.email) : null,
      phone: c.phone ? String(c.phone) : null,
      planTier: c.planTier ? String(c.planTier) : null,
      caseId: c.caseId ? String(c.caseId) : null,
      openInvoiceCount: open.count,
      openBalanceCents: open.balanceCents,
    };
  });

  // Sort: real clients with open invoices first, non-[DEV]/[TEST] fixtures before test contacts, then alphabetical
  mapped.sort((a, b) => {
    const aSynthetic = /^\[(DEV|TEST)/i.test(a.name) ? 1 : 0;
    const bSynthetic = /^\[(DEV|TEST)/i.test(b.name) ? 1 : 0;
    if (aSynthetic !== bSynthetic) return aSynthetic - bSynthetic;
    if (b.openInvoiceCount !== a.openInvoiceCount) return b.openInvoiceCount - a.openInvoiceCount;
    return a.name.localeCompare(b.name);
  });

  return mapped.slice(0, 40);
}

async function findOrCreateStripeCustomerForEmail(
  stripe: Stripe,
  email: string | null | undefined,
  name: string,
  clientId?: number | null
): Promise<string | null> {
  if (!email || !email.trim()) return null;
  const cleanEmail = email.trim().toLowerCase();
  const existing = await stripe.customers.list({ email: cleanEmail, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }
  const created = await stripe.customers.create({
    email: cleanEmail,
    name,
    metadata: {
      source: "waypoint_payment_station",
      ...(clientId ? { crm_client_id: String(clientId) } : {}),
    },
  });
  return created.id;
}

export async function getClientBillingContext(clientId: number): Promise<{
  client: PaymentStationClientSummary;
  invoices: PaymentStationInvoiceSummary[];
  savedMethods: PaymentStationSavedMethod[];
  authorizedServices: PaymentStationServiceOption[];
}> {
  const contact =
    inMemoryContacts.get(clientId) || (await getContactById(clientId));
  if (!contact) {
    throw new Error(`Client #${clientId} was not found.`);
  }

  const rawInvoices = await listAllInvoicesDetailed({ clientId });
  const payableInvoices: PaymentStationInvoiceSummary[] = rawInvoices
    .filter((inv) => {
      if (!inv) return false;
      if (["Paid", "Voided", "Cancelled", "Uncollectible"].includes(String(inv.status))) {
        return false;
      }
      const totalCents = dollarsToCents(inv.total ?? inv.amount);
      const paidCents = dollarsToCents(inv.amountPaid ?? 0);
      return totalCents - paidCents > 0;
    })
    .map((inv) => {
      const totalCents = dollarsToCents(inv.total ?? inv.amount);
      const amountPaidCents = dollarsToCents(inv.amountPaid ?? 0);
      return {
        id: Number(inv.id),
        invoiceNumber: String(inv.invoiceNumber || `WP-${inv.id}`),
        title: String(inv.title || inv.serviceDescription || "Advocacy Services"),
        serviceDescription: inv.serviceDescription ? String(inv.serviceDescription) : null,
        status: String(inv.status || "Sent"),
        totalCents,
        amountPaidCents,
        remainingCents: Math.max(0, totalCents - amountPaidCents),
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
      };
    });

  // Load saved payment methods from CRM + Stripe (masked only!)
  const stripe = resolveStripeClient();
  const savedMethodsMap = new Map<string, PaymentStationSavedMethod>();

  const crmMethods = await getFamilyPaymentMethods(clientId);
  for (const m of crmMethods) {
    const pmId = String(m.stripePaymentMethodId || "");
    if (!pmId) continue;
    const isRealStripePm = pmId.startsWith("pm_") && !pmId.startsWith("pm_mock_");
    savedMethodsMap.set(pmId, {
      id: String(m.id),
      stripePaymentMethodId: pmId,
      brand: String(m.brand || "card"),
      last4: String(m.last4 || "••••"),
      expMonth: m.expMonth ? Number(m.expMonth) : null,
      expYear: m.expYear ? Number(m.expYear) : null,
      isDefault: Boolean(m.isDefault),
      source: "crm",
      chargeable: Boolean(stripe && isRealStripePm),
    });
  }

  if (stripe && contact.email) {
    try {
      const customers = await stripe.customers.list({
        email: String(contact.email).trim().toLowerCase(),
        limit: 1,
      });
      if (customers.data.length > 0) {
        const cust = customers.data[0];
        const defaultPmId =
          typeof cust.invoice_settings?.default_payment_method === "string"
            ? cust.invoice_settings.default_payment_method
            : cust.invoice_settings?.default_payment_method?.id || null;
        const stripePms = await stripe.paymentMethods.list({
          customer: cust.id,
          type: "card",
          limit: 10,
        });
        for (const pm of stripePms.data) {
          savedMethodsMap.set(pm.id, {
            id: pm.id,
            stripePaymentMethodId: pm.id,
            brand: pm.card?.brand || "card",
            last4: pm.card?.last4 || "••••",
            expMonth: pm.card?.exp_month ?? null,
            expYear: pm.card?.exp_year ?? null,
            isDefault: defaultPmId ? pm.id === defaultPmId : savedMethodsMap.size === 0,
            source: "stripe",
            chargeable: true,
          });
        }
      }
    } catch (err) {
      console.warn("[PaymentStation] Could not fetch Stripe saved payment methods:", err instanceof Error ? err.message : err);
    }
  }

  // Authorized services / plans from catalog
  const catalog = await listServices({ status: "active" });
  const authorizedServices: PaymentStationServiceOption[] = (catalog || [])
    .slice(0, 20)
    .map((svc) => ({
      id: Number(svc.id),
      title: String(svc.clientFacingTitle || svc.name || svc.internalName || "Advocacy Service"),
      serviceCode: String(svc.serviceCode || `SVC-${svc.id}`),
      standardPriceCents: dollarsToCents(svc.standardPrice ?? svc.price ?? 0),
      billingType: String(svc.billingType || "one_time"),
    }));

  const openBalanceCents = payableInvoices.reduce((acc, inv) => acc + inv.remainingCents, 0);

  return {
    client: {
      id: Number(contact.id),
      name: formatContactName(contact as Record<string, unknown>),
      firstName: String(contact.firstName || ""),
      lastName: String(contact.lastName || ""),
      email: contact.email ? String(contact.email) : null,
      phone: contact.phone ? String(contact.phone) : null,
      planTier: contact.planTier ? String(contact.planTier) : null,
      caseId: contact.caseId ? String(contact.caseId) : null,
      openInvoiceCount: payableInvoices.length,
      openBalanceCents,
    },
    invoices: payableInvoices,
    savedMethods: Array.from(savedMethodsMap.values()),
    authorizedServices,
  };
}

// ── 3. Server-Side Target Validation ─────────────────────────────────────────
interface ValidatedPaymentTarget {
  mode: PaymentStationMode;
  amountCents: number;
  clientId: number | null;
  clientOrDonorName: string;
  clientOrDonorEmail: string | null;
  donorAddress: string | null;
  fundId: string | null;
  fundName: string | null;
  noGoodsOrServicesProvided: boolean;
  goodsOrServicesDescription: string | null;
  goodsOrServicesFmvCents: number;
  invoiceId: number | null;
  invoiceNumber: string | null;
  serviceId: number | null;
  description: string;
  subtitle: string | null;
  donationNote: string | null;
  isPartialPayment: boolean;
}

async function validatePaymentTarget(params: {
  mode: PaymentStationMode;
  amountCents: number;
  clientId?: number | null;
  invoiceId?: number | null;
  serviceId?: number | null;
  purposeLabel?: string | null;
  donorName?: string | null;
  donorEmail?: string | null;
  donorAddress?: string | null;
  fundId?: string | null;
  fundName?: string | null;
  noGoodsOrServicesProvided?: boolean;
  goodsOrServicesDescription?: string | null;
  goodsOrServicesFmvCents?: number;
  donationNote?: string | null;
}): Promise<ValidatedPaymentTarget> {
  if (params.mode === "donation") {
    const amtCheck = validateStandalonePaymentAmountCents(params.amountCents);
    if (!amtCheck.valid) throw new Error(amtCheck.error);

    let donorName = (params.donorName || "").trim();
    let donorEmail = (params.donorEmail || "").trim() || null;
    let donorAddress = (params.donorAddress || "").trim() || null;

    if (params.clientId) {
      const c = inMemoryContacts.get(params.clientId) || (await getContactById(params.clientId));
      if (c) {
        if (!donorName) donorName = formatContactName(c as Record<string, unknown>);
        if (!donorEmail && c.email) donorEmail = String(c.email);
        const contactAddr = String((c as Record<string, unknown>).address || "").trim();
        if (!donorAddress && contactAddr) donorAddress = contactAddr;
      }
    }

    if (!donorName) {
      throw new Error("Donor name is required to collect a donation.");
    }

    const noGoods = params.noGoodsOrServicesProvided !== false;
    const fmvCents = noGoods ? 0 : Math.max(0, Math.round(params.goodsOrServicesFmvCents ?? 0));
    if (!noGoods && fmvCents > params.amountCents) {
      throw new Error("Estimated fair market value of goods/services cannot exceed donation amount.");
    }
    const goodsDesc = noGoods ? null : (params.goodsOrServicesDescription || "").trim() || null;
    const matchedFund =
      DONATION_FUND_OPTIONS.find((f) => f.id === params.fundId) || DONATION_FUND_OPTIONS[0];
    const resolvedFundId = params.fundId || matchedFund.id;
    const resolvedFundName = (params.fundName || "").trim() || matchedFund.name;

    const cleanNote = (params.donationNote || "").trim() || null;
    // IMPORTANT: Never attach invoiceId in donation mode so the selected invoice is never modified or charged.
    return {
      mode: "donation",
      amountCents: params.amountCents,
      clientId: params.clientId ?? null,
      clientOrDonorName: donorName,
      clientOrDonorEmail: donorEmail,
      donorAddress,
      fundId: resolvedFundId,
      fundName: resolvedFundName,
      noGoodsOrServicesProvided: noGoods,
      goodsOrServicesDescription: goodsDesc,
      goodsOrServicesFmvCents: fmvCents,
      invoiceId: null,
      invoiceNumber: null,
      serviceId: null,
      description: "Donation",
      subtitle: cleanNote ? `${resolvedFundName} · ${cleanNote}` : resolvedFundName,
      donationNote: cleanNote,
      isPartialPayment: false,
    };
  }

  if (!params.clientId) {
    throw new Error("A client account must be selected before collecting payment.");
  }

  const client = inMemoryContacts.get(params.clientId) || (await getContactById(params.clientId));
  if (!client) {
    throw new Error(`Client #${params.clientId} not found.`);
  }
  const clientName = formatContactName(client as Record<string, unknown>);
  const clientEmail = client.email ? String(client.email) : null;

  if (params.mode === "invoice") {
    if (!params.invoiceId) {
      throw new Error("An outstanding invoice must be selected for invoice payment.");
    }
    const invoice = await getInvoiceWithDetails(params.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice #${params.invoiceId} was not found.`);
    }
    if (invoice.clientId && Number(invoice.clientId) !== Number(params.clientId)) {
      throw new Error("Selected invoice does not belong to the selected client account.");
    }

    const totalCents = dollarsToCents(invoice.total ?? invoice.amount);
    const amountPaidCents = dollarsToCents(invoice.amountPaid ?? 0);
    const check = validateInvoicePaymentAmountCents({
      invoiceStatus: String(invoice.status || "Sent"),
      invoiceTotalCents: totalCents,
      amountPaidCents,
      requestedPaymentCents: params.amountCents,
    });
    if (!check.valid) {
      throw new Error(check.error || "Invalid invoice payment amount.");
    }

    const invNum = String(invoice.invoiceNumber || `WP-${invoice.id}`);
    const title = String(invoice.title || invoice.serviceDescription || "Advocacy Plan");
    return {
      mode: "invoice",
      amountCents: params.amountCents,
      clientId: Number(client.id),
      clientOrDonorName: clientName,
      clientOrDonorEmail: clientEmail,
      donorAddress: null,
      fundId: null,
      fundName: null,
      noGoodsOrServicesProvided: false,
      goodsOrServicesDescription: null,
      goodsOrServicesFmvCents: 0,
      invoiceId: Number(invoice.id),
      invoiceNumber: invNum,
      serviceId: null,
      description: title,
      subtitle: `${title} · Invoice ${invNum}`,
      donationNote: null,
      isPartialPayment: check.isPartialPayment,
    };
  }

  // Authorized payment purpose / service
  const amtCheck = validateStandalonePaymentAmountCents(params.amountCents);
  if (!amtCheck.valid) throw new Error(amtCheck.error);

  const label = (params.purposeLabel || "").trim() || "Authorized Advocacy Payment";
  return {
    mode: "service",
    amountCents: params.amountCents,
    clientId: Number(client.id),
    clientOrDonorName: clientName,
    clientOrDonorEmail: clientEmail,
    donorAddress: null,
    fundId: null,
    fundName: null,
    noGoodsOrServicesProvided: false,
    goodsOrServicesDescription: null,
    goodsOrServicesFmvCents: 0,
    invoiceId: null,
    invoiceNumber: null,
    serviceId: params.serviceId ?? null,
    description: label,
    subtitle: label,
    donationNote: null,
    isPartialPayment: false,
  };
}

// ── 4. Allocation, Recording & Ledger Settlement (ONLY After Stripe Verification) ──
async function allocateReceiptNumber(ownerId: number): Promise<string> {
  let prefix = "WP-";
  let seq = ++_posSequenceCounter;
  const cached = inMemoryReceiptSettings.get(ownerId);
  if (cached) {
    prefix = cached.receiptPrefix || "WP-";
    seq = cached.nextReceiptSequence || seq;
    cached.nextReceiptSequence = seq + 1;
    return `${prefix}${String(seq).padStart(6, "0")}`;
  }
  const db = await getDb();
  if (db) {
    try {
      const [row] = await db
        .select()
        .from(receiptSettings)
        .where(eq(receiptSettings.ownerId, ownerId))
        .limit(1);
      if (row) {
        prefix = row.receiptPrefix || "WP-";
        seq = row.nextReceiptSequence || seq;
        await db
          .update(receiptSettings)
          .set({ nextReceiptSequence: seq + 1, updatedAt: new Date() })
          .where(eq(receiptSettings.ownerId, ownerId));
      }
    } catch {}
  }
  return `${prefix}${String(seq).padStart(6, "0")}`;
}

async function applyVerifiedInvoiceSettlement(params: {
  invoiceId: number;
  amountCents: number;
  stripePaymentIntentId: string;
  collectedByName: string;
}): Promise<{ newStatus: string; remainingCents: number }> {
  const existing = await getInvoiceWithDetails(params.invoiceId);
  if (!existing) throw new Error(`Invoice #${params.invoiceId} not found during settlement.`);

  const totalCents = dollarsToCents(existing.total ?? existing.amount);
  const previousPaidCents = dollarsToCents(existing.amountPaid ?? 0);
  const newPaidCents = Math.min(totalCents, previousPaidCents + params.amountCents);
  const isPaidInFull = totalCents > 0 && newPaidCents >= totalCents;
  const nextStatus = isPaidInFull ? "Paid" : String(existing.status || "Sent");
  const remainingCents = Math.max(0, totalCents - newPaidCents);
  const note = isPaidInFull
    ? `Paid in full (${formatCents(params.amountCents)}) via Payment Station by ${params.collectedByName} (${params.stripePaymentIntentId})`
    : `Partial payment of ${formatCents(params.amountCents)} collected via Payment Station by ${params.collectedByName} (${formatCents(remainingCents)} remaining)`;

  if (inMemoryBillingInvoices.has(params.invoiceId)) {
    const inv = inMemoryBillingInvoices.get(params.invoiceId);
    inv.amountPaid = centsToDecimalString(newPaidCents);
    inv.status = nextStatus;
    if (isPaidInFull) inv.paidDate = new Date();
    inv.stripePaymentIntentId = params.stripePaymentIntentId;
    inv.paymentStatusNote = note;
    inv.updatedAt = new Date();
  }

  const db = await getDb();
  if (db) {
    try {
      await db
        .update(invoices)
        .set({
          amountPaid: centsToDecimalString(newPaidCents),
          status: nextStatus as "Sent" | "Paid" | "Overdue",
          paidDate: isPaidInFull ? new Date() : existing.paidDate,
          stripePaymentIntentId: params.stripePaymentIntentId,
          paymentStatusNote: note,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, params.invoiceId));
    } catch (err) {
      console.warn("[PaymentStation] DB invoice update fallback:", err instanceof Error ? err.message : err);
    }
  }

  if (existing.clientId && params.amountCents > 0) {
    try {
      await dispatchPaymentAutomationTriggers({
        paymentId: params.stripePaymentIntentId,
        contactId: Number(existing.clientId),
        invoiceId: params.invoiceId,
        status: "PAID",
        amountCents: params.amountCents,
        invoiceTotalCents: totalCents,
        invoicePaidBeforeCents: previousPaidCents,
        invoicePaidAfterCents: newPaidCents,
        remainingBalanceCents: remainingCents,
        paymentType: isPaidInFull ? "invoice_payment" : "installment",
      });
    } catch {}
  }

  return { newStatus: nextStatus, remainingCents };
}

async function recordVerifiedDonationEntry(params: {
  ownerId: number;
  donorName: string;
  donorEmail: string | null;
  donorAddress?: string | null;
  fundId?: string | null;
  fundName?: string | null;
  noGoodsOrServicesProvided?: boolean;
  goodsOrServicesDescription?: string | null;
  goodsOrServicesFmvCents?: number;
  clientId: number | null;
  amountCents: number;
  note: string | null;
  receiptNumber: string;
  paymentMethodSummary: string;
  stripeRef: string;
  collectedByName: string;
}): Promise<void> {
  const now = new Date();
  const goodsSummary =
    params.noGoodsOrServicesProvided === false
      ? `Goods/Services FMV: ${formatCents(params.goodsOrServicesFmvCents || 0)}${
          params.goodsOrServicesDescription ? ` (${params.goodsOrServicesDescription})` : ""
        }`
      : "No goods or services provided";
  const noteWithRef = [
    params.note,
    goodsSummary,
    `Collected via Payment Station by ${params.collectedByName} (Ref: ${params.stripeRef})`,
  ]
    .filter(Boolean)
    .join(" — ");

  // Record in Giving ledger separately from invoices — NEVER claim tax deductibility until exempt status is verified
  storedDonations.unshift({
    id: `pos-don-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    donorName: params.donorName,
    donorEmail: params.donorEmail || undefined,
    donorAddress: params.donorAddress || undefined,
    amountCents: params.amountCents,
    fundId: params.fundId || "fnd-2",
    fundName: params.fundName || "General Impact Fund",
    paymentMethod: `Stripe (${params.paymentMethodSummary})`,
    frequency: "one_time",
    coverFees: false,
    anonymous: false,
    taxDeductible: false,
    receiptNumber: params.receiptNumber,
    receiptStatus: "Ready",
    donatedAt: now.toISOString(),
    notes: noteWithRef,
  });

  // Update supporter directory if matching or add new supporter record
  const existingSup = storedSupporters.find(
    (s) =>
      (params.donorEmail && s.email.toLowerCase() === params.donorEmail.toLowerCase()) ||
      s.name.toLowerCase() === params.donorName.toLowerCase()
  );
  if (existingSup) {
    existingSup.lifetimeGivingCents += params.amountCents;
    existingSup.donationCount += 1;
    existingSup.lastGiftDate = now.toISOString();
  } else {
    storedSupporters.unshift({
      id: `sup-pos-${Date.now()}`,
      name: params.donorName,
      entityType: "individual",
      supporterType: "One-Time Donor",
      email: params.donorEmail || "",
      phone: "",
      lifetimeGivingCents: params.amountCents,
      donationCount: 1,
      lastGiftDate: now.toISOString(),
      status: "active",
      notes: noteWithRef,
    });
  }

  const db = await getDb();
  if (db) {
    try {
      await db.insert(sponsors).values({
        ownerId: params.ownerId,
        type: "gift",
        donorName: params.donorName,
        donorEmail: params.donorEmail,
        amount: params.amountCents,
        familyContactId: params.clientId,
        notes: noteWithRef,
        status: "received",
        donatedAt: now,
      });
    } catch (err) {
      console.warn("[PaymentStation] DB sponsors insert fallback:", err instanceof Error ? err.message : err);
    }
  }
}

async function persistVerifiedTransactionAndReceipt(params: {
  ownerId: number;
  collector: StaffCollectorIdentity;
  mode: PaymentStationMode;
  method: "saved_card" | "card_by_phone" | "send_link";
  clientId: number | null;
  clientOrDonorName: string;
  clientOrDonorEmail: string | null;
  invoiceId: number | null;
  invoiceNumber: string | null;
  serviceId: number | null;
  description: string;
  subtitle: string | null;
  amountCents: number;
  stripePaymentIntentId: string;
  stripeCustomerId?: string | null;
  paymentMethodBrand: string;
  paymentMethodLast4: string;
  donationNote?: string | null;
  donorAddress?: string | null;
  fundId?: string | null;
  fundName?: string | null;
  noGoodsOrServicesProvided?: boolean;
  goodsOrServicesDescription?: string | null;
  goodsOrServicesFmvCents?: number;
  existingTransactionId?: number | null;
}): Promise<PaymentStationReceiptSnapshot> {
  // Idempotent guard against duplicate settlement of same Stripe PaymentIntent
  const existingSnapshot = finalizedStripeRefs.get(params.stripePaymentIntentId);
  if (existingSnapshot) {
    return existingSnapshot;
  }

  // Also check if already recorded in transactions store
  const existingTx = Array.from(inMemoryTransactions.values()).find(
    (t) =>
      t.stripePaymentIntentId === params.stripePaymentIntentId &&
      t.status === "PAID"
  );
  if (existingTx) {
    const parsedMeta = safeJsonParse(existingTx.metadata);
    const snap: PaymentStationReceiptSnapshot = {
      transactionId: Number(existingTx.id),
      receiptNumber: String(existingTx.receiptNumber),
      status: "paid",
      mode: (parsedMeta.mode as PaymentStationMode) || params.mode,
      clientId: existingTx.clientId ? Number(existingTx.clientId) : params.clientId,
      clientOrDonorName: String(parsedMeta.clientOrDonorName || params.clientOrDonorName),
      clientOrDonorEmail: (parsedMeta.clientOrDonorEmail as string | null) ?? params.clientOrDonorEmail,
      description: String(existingTx.serviceName || params.description),
      subtitle: (parsedMeta.subtitle as string | null) ?? params.subtitle,
      invoiceId: (parsedMeta.invoiceId as number | null) ?? params.invoiceId,
      invoiceNumber: (parsedMeta.invoiceNumber as string | null) ?? params.invoiceNumber,
      amountCents: Number(existingTx.amountCents),
      paymentMethodSummary: formatMethodSummary(existingTx.paymentMethodBrand, existingTx.paymentMethodLast4),
      transactionRef: params.stripePaymentIntentId,
      checkoutUrl: null,
      paidAt: existingTx.paidAt ? new Date(existingTx.paidAt).toISOString() : new Date().toISOString(),
      collectedByName: String(parsedMeta.collectedByName || params.collector.name),
      emailSentAt: existingTx.emailSentAt ? new Date(existingTx.emailSentAt).toISOString() : null,
      donationNote: (parsedMeta.donationNote as string | null) ?? params.donationNote ?? null,
    };
    finalizedStripeRefs.set(params.stripePaymentIntentId, snap);
    return snap;
  }

  const now = new Date();
  const receiptNumber = await allocateReceiptNumber(params.ownerId);
  const methodSummary = formatMethodSummary(params.paymentMethodBrand, params.paymentMethodLast4);

  // 1. Settle invoice OR record separate donation (NEVER both!)
  if (params.mode === "invoice" && params.invoiceId) {
    await applyVerifiedInvoiceSettlement({
      invoiceId: params.invoiceId,
      amountCents: params.amountCents,
      stripePaymentIntentId: params.stripePaymentIntentId,
      collectedByName: params.collector.name,
    });
  } else if (params.mode === "donation") {
    await recordVerifiedDonationEntry({
      ownerId: params.ownerId,
      donorName: params.clientOrDonorName,
      donorEmail: params.clientOrDonorEmail,
      donorAddress: params.donorAddress || null,
      fundId: params.fundId || null,
      fundName: params.fundName || null,
      noGoodsOrServicesProvided: params.noGoodsOrServicesProvided,
      goodsOrServicesDescription: params.goodsOrServicesDescription || null,
      goodsOrServicesFmvCents: params.goodsOrServicesFmvCents ?? 0,
      clientId: params.clientId,
      amountCents: params.amountCents,
      note: params.donationNote || null,
      receiptNumber,
      paymentMethodSummary: methodSummary,
      stripeRef: params.stripePaymentIntentId,
      collectedByName: params.collector.name,
    });
  }

  // 2. Generate PDF receipt archive
  const settings = inMemoryReceiptSettings.get(params.ownerId) || DEFAULT_RECEIPT_SETTINGS;
  const txId = params.existingTransactionId || ++_posSequenceCounter;
  const pdfResult = await generateAndArchiveReceiptPdf({
    receiptNumber,
    transactionId: txId,
    companyName: settings.companyName || "Waypoint Advocates",
    businessEmail: settings.businessEmail || "billing@waypointadvocates.com",
    businessPhone: settings.businessPhone || "(404) 555-0100",
    businessAddress: settings.businessAddress || "Atlanta, GA",
    website: settings.website || "https://waypointadvocates.com",
    clientName: params.clientOrDonorName,
    clientEmail: params.clientOrDonorEmail,
    serviceName: params.mode === "donation" ? "Donation" : params.description,
    planName: params.subtitle || undefined,
    transactionType: params.mode === "donation" ? "donation" : "standalone",
    amountCents: params.amountCents,
    currency: "usd",
    status: "PAID",
    paymentMethodBrand: params.paymentMethodBrand,
    paymentMethodLast4: params.paymentMethodLast4,
    paidAt: now,
    stripePaymentIntentId: params.stripePaymentIntentId,
    footerMessage:
      params.mode === "donation"
        ? "Thank you for supporting Waypoint Advocates."
        : settings.receiptFooterMessage || null,
    clientId: params.clientId ?? undefined,
  });

  const metadataObj = {
    source: "payment_station",
    mode: params.mode,
    method: params.method,
    clientOrDonorName: params.clientOrDonorName,
    clientOrDonorEmail: params.clientOrDonorEmail,
    invoiceId: params.invoiceId,
    invoiceNumber: params.invoiceNumber,
    subtitle: params.subtitle,
    donationNote: params.donationNote || null,
    donorAddress: params.donorAddress || null,
    fundId: params.fundId || null,
    fundName: params.fundName || null,
    noGoodsOrServicesProvided: params.noGoodsOrServicesProvided !== false,
    goodsOrServicesDescription: params.goodsOrServicesDescription || null,
    goodsOrServicesFmvCents: params.goodsOrServicesFmvCents ?? 0,
    collectedByUserId: params.collector.userId,
    collectedByName: params.collector.name,
    collectedByRole: params.collector.role,
    documentHash: pdfResult.documentHash,
  };

  const txRecord = {
    id: txId,
    receiptNumber,
    ownerId: params.ownerId,
    clientId: params.clientId,
    studentContactId: params.clientId,
    serviceId: params.serviceId,
    serviceName: params.mode === "donation" ? "Donation" : params.description,
    planName: params.subtitle,
    transactionType: params.mode === "donation" ? "donation" : "standalone",
    amountCents: params.amountCents,
    currency: "usd",
    status: "PAID",
    paymentMethodType: "card",
    paymentMethodBrand: params.paymentMethodBrand,
    paymentMethodLast4: params.paymentMethodLast4,
    paidAt: now,
    stripeCustomerId: params.stripeCustomerId || null,
    stripePaymentIntentId: params.stripePaymentIntentId,
    stripeInvoiceId: params.invoiceNumber,
    refundAmountCents: 0,
    refundReason: null,
    refundedAt: null,
    receiptPdfUrl: pdfResult.pdfUrl,
    receiptPdfKey: pdfResult.pdfKey,
    emailSentAt: null as Date | null,
    internalNotes: `Collected via Payment Station by ${params.collector.name} (${params.collector.role})`,
    metadata: JSON.stringify(metadataObj),
    createdAt: now,
    updatedAt: now,
  };

  inMemoryTransactions.set(txId, txRecord);

  const db = await getDb();
  if (db) {
    try {
      await db.insert(transactions).values({
        receiptNumber,
        ownerId: params.ownerId,
        clientId: params.clientId,
        studentContactId: params.clientId,
        serviceId: params.serviceId,
        serviceName: txRecord.serviceName,
        planName: txRecord.planName,
        transactionType: txRecord.transactionType,
        amountCents: params.amountCents,
        currency: "usd",
        status: "PAID",
        paymentMethodType: "card",
        paymentMethodBrand: params.paymentMethodBrand,
        paymentMethodLast4: params.paymentMethodLast4,
        paidAt: now,
        stripeCustomerId: params.stripeCustomerId || null,
        stripePaymentIntentId: params.stripePaymentIntentId,
        stripeInvoiceId: params.invoiceNumber,
        receiptPdfUrl: pdfResult.pdfUrl,
        receiptPdfKey: pdfResult.pdfKey,
        internalNotes: txRecord.internalNotes,
        metadata: txRecord.metadata,
      });
    } catch (err) {
      console.warn("[PaymentStation] DB transaction insert fallback:", err instanceof Error ? err.message : err);
    }
  }

  // 3. Record accountable activity log
  if (params.clientId) {
    try {
      await recordCaseActivity({
        studentContactId: params.clientId,
        eventType: params.mode === "donation" ? "donation_received" : "payment_received",
        title:
          params.mode === "donation"
            ? `Donation Collected (${receiptNumber})`
            : `Payment Collected via Payment Station (${receiptNumber})`,
        description:
          params.mode === "donation"
            ? `Confirmed donation of ${formatCents(params.amountCents)} from ${params.clientOrDonorName} (${methodSummary}). Collected by ${params.collector.name}. Ref: ${params.stripePaymentIntentId}`
            : `Confirmed payment of ${formatCents(params.amountCents)} for "${params.subtitle || params.description}" (${methodSummary}). Collected by ${params.collector.name}. Ref: ${params.stripePaymentIntentId}`,
        ownerName: params.collector.name,
        ownerRole: params.collector.role,
        categoryColor: "green",
        sources: [
          {
            type: "document",
            label: `Receipt ${receiptNumber}`,
            url: pdfResult.pdfUrl,
          },
        ],
      });
    } catch {}
  }

  pushAudit({
    action: params.mode === "donation" ? "collect_donation" : "collect_payment",
    outcome: "succeeded",
    mode: params.mode,
    method: params.method,
    amountCents: params.amountCents,
    clientId: params.clientId,
    invoiceId: params.invoiceId,
    clientOrDonorName: params.clientOrDonorName,
    collectedByUserId: params.collector.userId,
    collectedByName: params.collector.name,
    transactionRef: params.stripePaymentIntentId,
    detail: `Confirmed ${formatCents(params.amountCents)} via ${methodSummary} (${receiptNumber})`,
  });

  const snapshot: PaymentStationReceiptSnapshot = {
    transactionId: txId,
    receiptNumber,
    status: "paid",
    mode: params.mode,
    clientId: params.clientId,
    clientOrDonorName: params.clientOrDonorName,
    clientOrDonorEmail: params.clientOrDonorEmail,
    description: params.mode === "donation" ? "Donation" : params.description,
    subtitle: params.subtitle,
    invoiceId: params.invoiceId,
    invoiceNumber: params.invoiceNumber,
    amountCents: params.amountCents,
    paymentMethodSummary: methodSummary,
    transactionRef: params.stripePaymentIntentId,
    checkoutUrl: null,
    paidAt: now.toISOString(),
    collectedByName: params.collector.name,
    emailSentAt: null,
    donationNote: params.donationNote || null,
  };

  finalizedStripeRefs.set(params.stripePaymentIntentId, snapshot);
  return snapshot;
}

// ── 5. Payment Collection Flows ──────────────────────────────────────────────

/**
 * Step 1 of Card by Phone (PCI-safe Stripe Elements flow):
 * Creates a real Stripe PaymentIntent on the server so card details go directly
 * from Stripe Elements to Stripe without touching our React state or server.
 */
export async function createCardByPhonePaymentIntent(params: {
  ownerId: number;
  collector: StaffCollectorIdentity;
  idempotencyKey: string;
  mode: PaymentStationMode;
  amountCents: number;
  clientId?: number | null;
  invoiceId?: number | null;
  serviceId?: number | null;
  purposeLabel?: string | null;
  donorName?: string | null;
  donorEmail?: string | null;
  donorAddress?: string | null;
  fundId?: string | null;
  fundName?: string | null;
  noGoodsOrServicesProvided?: boolean;
  goodsOrServicesDescription?: string | null;
  goodsOrServicesFmvCents?: number;
  donationNote?: string | null;
  saveCardToCustomer?: boolean;
  setAsDefaultPaymentMethod?: boolean;
  replacePaymentMethodId?: string | null;
}): Promise<{
  paymentIntentId: string;
  clientSecret: string;
  amountCents: number;
  duplicate: boolean;
}> {
  const cached = readIdempotency<{
    paymentIntentId: string;
    clientSecret: string;
    amountCents: number;
  }>(params.idempotencyKey);
  if (cached) {
    return { ...cached, duplicate: true };
  }

  const stripe = resolveStripeClient();
  const publishableKey = resolvePublishableKey();
  if (!stripe || !publishableKey) {
    throw new Error(
      "Stripe Card by Phone is not configured. Add STRIPE_SECRET_KEY and VITE_STRIPE_PUBLISHABLE_KEY before collecting card payments."
    );
  }

  const target = await validatePaymentTarget(params);
  const customerId = await findOrCreateStripeCustomerForEmail(
    stripe,
    target.clientOrDonorEmail,
    target.clientOrDonorName,
    target.clientId
  );

  const intent = await stripe.paymentIntents.create(
    {
      amount: target.amountCents,
      currency: "usd",
      customer: customerId || undefined,
      payment_method_types: ["card"],
      ...(params.saveCardToCustomer && customerId
        ? { setup_future_usage: "off_session" as const }
        : {}),
      description: target.subtitle || target.description,
      metadata: {
        source: "payment_station",
        mode: target.mode,
        method: params.saveCardToCustomer ? "saved_card" : "card_by_phone",
        owner_id: String(params.ownerId),
        client_id: target.clientId ? String(target.clientId) : "",
        invoice_id: target.invoiceId ? String(target.invoiceId) : "",
        invoice_number: target.invoiceNumber || "",
        service_id: target.serviceId ? String(target.serviceId) : "",
        description: target.description.slice(0, 200),
        subtitle: (target.subtitle || "").slice(0, 200),
        client_or_donor_name: target.clientOrDonorName.slice(0, 200),
        client_or_donor_email: (target.clientOrDonorEmail || "").slice(0, 200),
        donor_address: (target.donorAddress || "").slice(0, 300),
        fund_id: target.fundId || "",
        fund_name: (target.fundName || "").slice(0, 120),
        no_goods_or_services: target.noGoodsOrServicesProvided ? "true" : "false",
        goods_or_services_desc: (target.goodsOrServicesDescription || "").slice(0, 240),
        goods_or_services_fmv_cents: String(target.goodsOrServicesFmvCents || 0),
        donation_note: (target.donationNote || "").slice(0, 300),
        save_card_to_customer: params.saveCardToCustomer ? "true" : "false",
        set_as_default: params.setAsDefaultPaymentMethod !== false ? "true" : "false",
        replace_payment_method_id: params.replacePaymentMethodId || "",
        collected_by_user_id: String(params.collector.userId),
        collected_by_name: params.collector.name.slice(0, 120),
        collected_by_role: params.collector.role,
        idempotency_key: params.idempotencyKey,
      },
    },
    { idempotencyKey: `pos_pi_${params.idempotencyKey}` }
  );

  if (!intent.client_secret) {
    throw new Error("Stripe did not return a client_secret for this payment intent.");
  }

  pushAudit({
    action: "create_phone_card_intent",
    outcome: "initiated",
    mode: target.mode,
    method: "card_by_phone",
    amountCents: target.amountCents,
    clientId: target.clientId,
    invoiceId: target.invoiceId,
    clientOrDonorName: target.clientOrDonorName,
    collectedByUserId: params.collector.userId,
    collectedByName: params.collector.name,
    transactionRef: intent.id,
    detail: `Initialized Stripe PaymentIntent for ${formatCents(target.amountCents)}`,
  });

  const payload = {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    amountCents: target.amountCents,
  };
  writeIdempotency(params.idempotencyKey, payload);
  return { ...payload, duplicate: false };
}

/**
 * Saved Card flow:
 * Verifies the saved payment method belongs to the selected client and charges it
 * through Stripe PaymentIntents with idempotency and 3DS requires_action support.
 */
export async function chargeSavedCardPayment(params: {
  ownerId: number;
  collector: StaffCollectorIdentity;
  idempotencyKey: string;
  mode: PaymentStationMode;
  amountCents: number;
  clientId: number;
  paymentMethodId: string;
  invoiceId?: number | null;
  serviceId?: number | null;
  purposeLabel?: string | null;
  donorName?: string | null;
  donorEmail?: string | null;
  donorAddress?: string | null;
  fundId?: string | null;
  fundName?: string | null;
  noGoodsOrServicesProvided?: boolean;
  goodsOrServicesDescription?: string | null;
  goodsOrServicesFmvCents?: number;
  donationNote?: string | null;
  saveCardToCustomer?: boolean;
  setAsDefaultPaymentMethod?: boolean;
  replacePaymentMethodId?: string | null;
}): Promise<{
  status: "paid" | "requires_action" | "failed";
  clientSecret?: string | null;
  paymentIntentId?: string | null;
  receipt?: PaymentStationReceiptSnapshot;
  errorMessage?: string;
  duplicate?: boolean;
}> {
  const cached = readIdempotency<{
    status: "paid" | "requires_action" | "failed";
    clientSecret?: string | null;
    paymentIntentId?: string | null;
    receipt?: PaymentStationReceiptSnapshot;
    errorMessage?: string;
  }>(params.idempotencyKey);
  if (cached) {
    return { ...cached, duplicate: true };
  }

  const stripe = resolveStripeClient();
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY before charging saved payment methods."
    );
  }

  const target = await validatePaymentTarget(params);
  const billingCtx = await getClientBillingContext(params.clientId);
  const matchedMethod = billingCtx.savedMethods.find(
    (m) => m.stripePaymentMethodId === params.paymentMethodId
  );
  if (!matchedMethod) {
    throw new Error("The selected saved payment method is not authorized for this client account.");
  }
  if (!matchedMethod.chargeable) {
    throw new Error("This saved payment method cannot be charged directly via Stripe.");
  }

  const customerId = await findOrCreateStripeCustomerForEmail(
    stripe,
    target.clientOrDonorEmail,
    target.clientOrDonorName,
    target.clientId
  );
  if (!customerId) {
    throw new Error("Client must have a valid email address linked to a Stripe customer to charge a saved card.");
  }

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: target.amountCents,
        currency: "usd",
        customer: customerId,
        payment_method: matchedMethod.stripePaymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
        description: target.subtitle || target.description,
        metadata: {
          source: "payment_station",
          mode: target.mode,
          method: "saved_card",
          owner_id: String(params.ownerId),
          client_id: target.clientId ? String(target.clientId) : "",
          invoice_id: target.invoiceId ? String(target.invoiceId) : "",
          invoice_number: target.invoiceNumber || "",
          service_id: target.serviceId ? String(target.serviceId) : "",
          description: target.description.slice(0, 200),
          subtitle: (target.subtitle || "").slice(0, 200),
          client_or_donor_name: target.clientOrDonorName.slice(0, 200),
          client_or_donor_email: (target.clientOrDonorEmail || "").slice(0, 200),
          donor_address: (target.donorAddress || "").slice(0, 300),
          fund_id: target.fundId || "",
          fund_name: (target.fundName || "").slice(0, 120),
          no_goods_or_services: target.noGoodsOrServicesProvided ? "true" : "false",
          goods_or_services_desc: (target.goodsOrServicesDescription || "").slice(0, 240),
          goods_or_services_fmv_cents: String(target.goodsOrServicesFmvCents || 0),
          donation_note: (target.donationNote || "").slice(0, 300),
          collected_by_user_id: String(params.collector.userId),
          collected_by_name: params.collector.name.slice(0, 120),
          collected_by_role: params.collector.role,
          idempotency_key: params.idempotencyKey,
        },
      },
      { idempotencyKey: `pos_saved_${params.idempotencyKey}` }
    );

    if (intent.status === "succeeded") {
      const receipt = await persistVerifiedTransactionAndReceipt({
        ownerId: params.ownerId,
        collector: params.collector,
        mode: target.mode,
        method: "saved_card",
        clientId: target.clientId,
        clientOrDonorName: target.clientOrDonorName,
        clientOrDonorEmail: target.clientOrDonorEmail,
        invoiceId: target.invoiceId,
        invoiceNumber: target.invoiceNumber,
        serviceId: target.serviceId,
        description: target.description,
        subtitle: target.subtitle,
        amountCents: intent.amount_received || target.amountCents,
        stripePaymentIntentId: intent.id,
        stripeCustomerId: customerId,
        paymentMethodBrand: matchedMethod.brand,
        paymentMethodLast4: matchedMethod.last4,
        donationNote: target.donationNote,
        donorAddress: target.donorAddress,
        fundId: target.fundId,
        fundName: target.fundName,
        noGoodsOrServicesProvided: target.noGoodsOrServicesProvided,
        goodsOrServicesDescription: target.goodsOrServicesDescription,
        goodsOrServicesFmvCents: target.goodsOrServicesFmvCents,
      });
      const result = { status: "paid" as const, paymentIntentId: intent.id, receipt };
      writeIdempotency(params.idempotencyKey, result);
      return result;
    }

    if (intent.status === "requires_action" || intent.status === "requires_confirmation") {
      pushAudit({
        action: "charge_saved_card",
        outcome: "requires_action",
        mode: target.mode,
        method: "saved_card",
        amountCents: target.amountCents,
        clientId: target.clientId,
        invoiceId: target.invoiceId,
        clientOrDonorName: target.clientOrDonorName,
        collectedByUserId: params.collector.userId,
        collectedByName: params.collector.name,
        transactionRef: intent.id,
        detail: "Additional card authentication (3DS) required by card issuer.",
      });
      const result = {
        status: "requires_action" as const,
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
      };
      writeIdempotency(params.idempotencyKey, result);
      return result;
    }

    const msg = `Stripe returned status "${intent.status}" — payment was not confirmed.`;
    pushAudit({
      action: "charge_saved_card",
      outcome: "failed",
      mode: target.mode,
      method: "saved_card",
      amountCents: target.amountCents,
      clientId: target.clientId,
      invoiceId: target.invoiceId,
      clientOrDonorName: target.clientOrDonorName,
      collectedByUserId: params.collector.userId,
      collectedByName: params.collector.name,
      transactionRef: intent.id,
      detail: msg,
    });
    return { status: "failed", paymentIntentId: intent.id, errorMessage: msg };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Card charge declined by processor.";
    pushAudit({
      action: "charge_saved_card",
      outcome: "failed",
      mode: target.mode,
      method: "saved_card",
      amountCents: target.amountCents,
      clientId: target.clientId,
      invoiceId: target.invoiceId,
      clientOrDonorName: target.clientOrDonorName,
      collectedByUserId: params.collector.userId,
      collectedByName: params.collector.name,
      transactionRef: null,
      detail: errMsg,
    });
    return { status: "failed", errorMessage: errMsg };
  }
}

/**
 * Send Link flow:
 * Creates a real Stripe Checkout Session for the validated target & amount,
 * marks a PENDING ledger entry (never PAID until Stripe confirms), and optionally
 * sends the link via Waypoint's supported email system.
 */
export async function createPaymentStationLink(params: {
  ownerId: number;
  collector: StaffCollectorIdentity;
  idempotencyKey: string;
  origin: string;
  mode: PaymentStationMode;
  amountCents: number;
  clientId?: number | null;
  invoiceId?: number | null;
  serviceId?: number | null;
  purposeLabel?: string | null;
  donorName?: string | null;
  donorEmail?: string | null;
  donorAddress?: string | null;
  fundId?: string | null;
  fundName?: string | null;
  noGoodsOrServicesProvided?: boolean;
  goodsOrServicesDescription?: string | null;
  goodsOrServicesFmvCents?: number;
  donationNote?: string | null;
  sendByEmail?: boolean;
  recipientEmail?: string | null;
}): Promise<{
  sessionId: string;
  checkoutUrl: string;
  receipt: PaymentStationReceiptSnapshot;
  emailDelivery?: EmailDeliveryResult;
  duplicate: boolean;
}> {
  const cached = readIdempotency<{
    sessionId: string;
    checkoutUrl: string;
    receipt: PaymentStationReceiptSnapshot;
    emailDelivery?: EmailDeliveryResult;
  }>(params.idempotencyKey);
  if (cached) {
    return { ...cached, duplicate: true };
  }

  const stripe = resolveStripeClient();
  if (!stripe) {
    throw new Error(
      "Stripe Payment Links are not configured. Add STRIPE_SECRET_KEY before generating hosted payment links."
    );
  }

  const target = await validatePaymentTarget(params);
  const customerId = await findOrCreateStripeCustomerForEmail(
    stripe,
    target.clientOrDonorEmail,
    target.clientOrDonorName,
    target.clientId
  );

  const productName =
    target.mode === "donation"
      ? "Waypoint Support Donation"
      : target.invoiceNumber
        ? `${target.description} (${target.invoiceNumber})`
        : target.description;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      customer: customerId || undefined,
      customer_email: customerId ? undefined : target.clientOrDonorEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description: target.subtitle || productName,
            },
            unit_amount: target.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        source: "payment_station",
        mode: target.mode,
        method: "send_link",
        owner_id: String(params.ownerId),
        client_id: target.clientId ? String(target.clientId) : "",
        invoice_id: target.invoiceId ? String(target.invoiceId) : "",
        invoice_number: target.invoiceNumber || "",
        service_id: target.serviceId ? String(target.serviceId) : "",
        description: target.description.slice(0, 200),
        subtitle: (target.subtitle || "").slice(0, 200),
        client_or_donor_name: target.clientOrDonorName.slice(0, 200),
        client_or_donor_email: (target.clientOrDonorEmail || "").slice(0, 200),
        donor_address: (target.donorAddress || "").slice(0, 300),
        fund_id: target.fundId || "",
        fund_name: (target.fundName || "").slice(0, 120),
        no_goods_or_services: target.noGoodsOrServicesProvided ? "true" : "false",
        goods_or_services_desc: (target.goodsOrServicesDescription || "").slice(0, 240),
        goods_or_services_fmv_cents: String(target.goodsOrServicesFmvCents || 0),
        donation_note: (target.donationNote || "").slice(0, 300),
        collected_by_user_id: String(params.collector.userId),
        collected_by_name: params.collector.name.slice(0, 120),
        collected_by_role: params.collector.role,
        idempotency_key: params.idempotencyKey,
      },
      success_url: `${params.origin}/portal?tab=billing&payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${params.origin}/portal?tab=billing&payment=cancelled`,
    },
    { idempotencyKey: `pos_link_${params.idempotencyKey}` }
  );

  if (!session.url) {
    throw new Error("Stripe Checkout did not return a hosted payment URL.");
  }

  const now = new Date();
  const txId = ++_posSequenceCounter;
  const pendingRef = `PEND-${session.id.slice(-8).toUpperCase()}`;

  const pendingTxRecord = {
    id: txId,
    receiptNumber: pendingRef,
    ownerId: params.ownerId,
    clientId: target.clientId,
    studentContactId: target.clientId,
    serviceId: target.serviceId,
    serviceName: target.mode === "donation" ? "Donation" : target.description,
    planName: target.subtitle,
    transactionType: target.mode === "donation" ? "donation" : "standalone",
    amountCents: target.amountCents,
    currency: "usd",
    status: "PENDING",
    paymentMethodType: "payment_link",
    paymentMethodBrand: "Payment link",
    paymentMethodLast4: "",
    paidAt: now,
    stripeCustomerId: customerId || null,
    stripePaymentIntentId: session.id,
    stripeInvoiceId: target.invoiceNumber,
    refundAmountCents: 0,
    receiptPdfUrl: null,
    receiptPdfKey: null,
    emailSentAt: null,
    internalNotes: `Payment link created via Payment Station by ${params.collector.name}`,
    metadata: JSON.stringify({
      source: "payment_station",
      mode: target.mode,
      method: "send_link",
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      clientOrDonorName: target.clientOrDonorName,
      clientOrDonorEmail: target.clientOrDonorEmail,
      invoiceId: target.invoiceId,
      invoiceNumber: target.invoiceNumber,
      subtitle: target.subtitle,
      donationNote: target.donationNote,
      collectedByUserId: params.collector.userId,
      collectedByName: params.collector.name,
      collectedByRole: params.collector.role,
    }),
    createdAt: now,
    updatedAt: now,
  };
  inMemoryTransactions.set(txId, pendingTxRecord);

  let emailDelivery: EmailDeliveryResult | undefined;
  const targetEmail = (params.recipientEmail || target.clientOrDonorEmail || "").trim();
  if (params.sendByEmail) {
    if (!targetEmail) {
      emailDelivery = {
        sent: false,
        status: "failed",
        error: "No recipient email address available for this client/donor.",
      };
    } else {
      const subject =
        target.mode === "donation"
          ? `Waypoint Advocates — Secure Donation Link (${formatCents(target.amountCents)})`
          : `Waypoint Advocates — Secure Payment Link (${formatCents(target.amountCents)})`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #000820; color: #f8fafc; border-radius: 14px; overflow: hidden; border: 1px solid #C5A059;">
          <div style="padding: 24px; background: #06172F; border-bottom: 1px solid #C5A059; text-align: center;">
            <h1 style="margin: 0; font-size: 18px; letter-spacing: 3px; color: #FFF4D4;">WAYPOINT</h1>
            <p style="margin: 6px 0 0; font-size: 12px; color: #C6B697;">${target.mode === "donation" ? "Secure Donation Link" : "Secure Payment Request"}</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 14px; font-size: 14px; color: #E2E8F0;">Hello ${escapeHtml(target.clientOrDonorName)},</p>
            <p style="margin: 0 0 18px; font-size: 13px; color: #CBD5E1; line-height: 1.6;">
              ${escapeHtml(params.collector.name)} at Waypoint Advocates prepared a secure Stripe checkout link for <strong>${escapeHtml(target.subtitle || target.description)}</strong> in the amount of <strong>${formatCents(target.amountCents)}</strong>.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${session.url}" style="display: inline-block; background: linear-gradient(135deg, #E5C57B, #C5A059); color: #051126; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px;">Complete Secure Payment (${formatCents(target.amountCents)})</a>
            </div>
            <p style="margin: 16px 0 0; font-size: 11px; color: #94A3B8;">Processed securely by Stripe. Status remains pending until confirmed by Stripe.</p>
          </div>
        </div>
      `;
      emailDelivery = await sendEmailDetailed({
        to: targetEmail,
        subject,
        html,
        contactId: target.clientId,
        idempotencyKey: `pos_link_email_${params.idempotencyKey}`,
      });
    }
  }

  pushAudit({
    action: "create_payment_link",
    outcome: "pending",
    mode: target.mode,
    method: "send_link",
    amountCents: target.amountCents,
    clientId: target.clientId,
    invoiceId: target.invoiceId,
    clientOrDonorName: target.clientOrDonorName,
    collectedByUserId: params.collector.userId,
    collectedByName: params.collector.name,
    transactionRef: session.id,
    detail: `Created Stripe hosted checkout session (${formatCents(target.amountCents)}). Awaiting confirmation.`,
  });

  const receipt: PaymentStationReceiptSnapshot = {
    transactionId: txId,
    receiptNumber: pendingRef,
    status: "pending",
    mode: target.mode,
    clientId: target.clientId,
    clientOrDonorName: target.clientOrDonorName,
    clientOrDonorEmail: target.clientOrDonorEmail,
    description: target.mode === "donation" ? "Donation" : target.description,
    subtitle: target.subtitle,
    invoiceId: target.invoiceId,
    invoiceNumber: target.invoiceNumber,
    amountCents: target.amountCents,
    paymentMethodSummary: "Payment link (pending)",
    transactionRef: session.id,
    checkoutUrl: session.url,
    paidAt: null,
    collectedByName: params.collector.name,
    emailSentAt: null,
    donationNote: target.donationNote,
  };

  const payload = { sessionId: session.id, checkoutUrl: session.url, receipt, emailDelivery };
  writeIdempotency(params.idempotencyKey, payload);
  return { ...payload, duplicate: false };
}

/**
 * Verifies a Stripe PaymentIntent or Checkout Session DIRECTLY with Stripe
 * before marking anything Paid in Waypoint CRM. Never trusts client claims alone.
 */
export async function verifyStripePaymentResult(params: {
  ownerId: number;
  collector: StaffCollectorIdentity;
  paymentIntentId?: string;
  checkoutSessionId?: string;
}): Promise<{
  status: "paid" | "pending" | "requires_action" | "failed";
  receipt?: PaymentStationReceiptSnapshot;
  errorMessage?: string;
}> {
  const stripe = resolveStripeClient();
  if (!stripe) {
    throw new Error("Stripe is not configured; cannot verify processor confirmation.");
  }

  if (params.checkoutSessionId) {
    const session = await stripe.checkout.sessions.retrieve(params.checkoutSessionId, {
      expand: ["payment_intent.payment_method"],
    });
    if (session.payment_status !== "paid") {
      return {
        status: session.status === "expired" ? "failed" : "pending",
        errorMessage:
          session.status === "expired"
            ? "Payment link expired before payment was completed."
            : undefined,
      };
    }

    const piObj =
      typeof session.payment_intent === "object" && session.payment_intent
        ? (session.payment_intent as Stripe.PaymentIntent)
        : null;
    const pmObj =
      piObj && typeof piObj.payment_method === "object" && piObj.payment_method
        ? (piObj.payment_method as Stripe.PaymentMethod)
        : null;
    const meta = session.metadata || {};
    const stripeRef = piObj?.id || session.id;

    // Remove pending placeholder record if one exists for this session
    let existingTxId: number | null = null;
    for (const [id, tx] of Array.from(inMemoryTransactions.entries())) {
      if (tx.stripePaymentIntentId === session.id && tx.status === "PENDING") {
        existingTxId = id;
        break;
      }
    }

    const receipt = await persistVerifiedTransactionAndReceipt({
      ownerId: Number(meta.owner_id) || params.ownerId,
      collector: {
        userId: Number(meta.collected_by_user_id) || params.collector.userId,
        name: meta.collected_by_name || params.collector.name,
        email: params.collector.email,
        role: meta.collected_by_role || params.collector.role,
      },
      mode: (meta.mode as PaymentStationMode) || "invoice",
      method: "send_link",
      clientId: meta.client_id ? Number(meta.client_id) : null,
      clientOrDonorName: meta.client_or_donor_name || session.customer_details?.name || "Client",
      clientOrDonorEmail: meta.client_or_donor_email || session.customer_details?.email || null,
      invoiceId: meta.invoice_id ? Number(meta.invoice_id) : null,
      invoiceNumber: meta.invoice_number || null,
      serviceId: meta.service_id ? Number(meta.service_id) : null,
      description: meta.description || "Advocacy Services",
      subtitle: meta.subtitle || null,
      amountCents: session.amount_total || 0,
      stripePaymentIntentId: stripeRef,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
      paymentMethodBrand: pmObj?.card?.brand || "Card",
      paymentMethodLast4: pmObj?.card?.last4 || "••••",
      donationNote: meta.donation_note || null,
      donorAddress: meta.donor_address || null,
      fundId: meta.fund_id || null,
      fundName: meta.fund_name || null,
      noGoodsOrServicesProvided: meta.no_goods_or_services !== "false",
      goodsOrServicesDescription: meta.goods_or_services_desc || null,
      goodsOrServicesFmvCents: Number(meta.goods_or_services_fmv_cents || 0) || 0,
      existingTransactionId: existingTxId,
    });
    return { status: "paid", receipt };
  }

  if (!params.paymentIntentId) {
    throw new Error("Either paymentIntentId or checkoutSessionId is required for verification.");
  }

  const intent = await stripe.paymentIntents.retrieve(params.paymentIntentId, {
    expand: ["payment_method"],
  });

  if (intent.status === "succeeded") {
    const pm =
      typeof intent.payment_method === "object" && intent.payment_method
        ? (intent.payment_method as Stripe.PaymentMethod)
        : null;
    const meta = intent.metadata || {};

    // PCI-safe Update & Charge: persist newly attached masked card & optionally replace old saved card
    if (meta.save_card_to_customer === "true" && meta.client_id && pm?.id) {
      const clientIdNum = Number(meta.client_id);
      const isDefault = meta.set_as_default !== "false";
      const oldPmId = (meta.replace_payment_method_id || "").trim();
      try {
        if (isDefault && typeof intent.customer === "string" && stripe.customers?.update) {
          await stripe.customers.update(intent.customer, {
            invoice_settings: { default_payment_method: pm.id },
          });
        }
      } catch {}

      try {
        if (oldPmId && oldPmId !== pm.id) {
          if (stripe.paymentMethods?.detach) {
            try {
              await stripe.paymentMethods.detach(oldPmId);
            } catch {}
          }
          const existingSaved = await getFamilyPaymentMethods(clientIdNum);
          const oldEntry = existingSaved.find((m) => m.stripePaymentMethodId === oldPmId);
          if (oldEntry?.id) {
            await removeFamilyPaymentMethod(clientIdNum, Number(oldEntry.id));
          }
        }
        await addFamilyPaymentMethod({
          clientId: clientIdNum,
          stripePaymentMethodId: pm.id,
          brand: pm.card?.brand || "card",
          last4: pm.card?.last4 || "••••",
          expMonth: pm.card?.exp_month ?? undefined,
          expYear: pm.card?.exp_year ?? undefined,
          isDefault,
        });
      } catch (err) {
        console.warn("[PaymentStation] Saved card sync fallback:", err instanceof Error ? err.message : err);
      }
    }

    const receipt = await persistVerifiedTransactionAndReceipt({
      ownerId: Number(meta.owner_id) || params.ownerId,
      collector: {
        userId: Number(meta.collected_by_user_id) || params.collector.userId,
        name: meta.collected_by_name || params.collector.name,
        email: params.collector.email,
        role: meta.collected_by_role || params.collector.role,
      },
      mode: (meta.mode as PaymentStationMode) || "invoice",
      method: (meta.method as "saved_card" | "card_by_phone") || "card_by_phone",
      clientId: meta.client_id ? Number(meta.client_id) : null,
      clientOrDonorName: meta.client_or_donor_name || "Client",
      clientOrDonorEmail: meta.client_or_donor_email || null,
      invoiceId: meta.invoice_id ? Number(meta.invoice_id) : null,
      invoiceNumber: meta.invoice_number || null,
      serviceId: meta.service_id ? Number(meta.service_id) : null,
      description: meta.description || "Advocacy Services",
      subtitle: meta.subtitle || null,
      amountCents: intent.amount_received || intent.amount,
      stripePaymentIntentId: intent.id,
      stripeCustomerId: typeof intent.customer === "string" ? intent.customer : null,
      paymentMethodBrand: pm?.card?.brand || "Card",
      paymentMethodLast4: pm?.card?.last4 || "••••",
      donationNote: meta.donation_note || null,
      donorAddress: meta.donor_address || null,
      fundId: meta.fund_id || null,
      fundName: meta.fund_name || null,
      noGoodsOrServicesProvided: meta.no_goods_or_services !== "false",
      goodsOrServicesDescription: meta.goods_or_services_desc || null,
      goodsOrServicesFmvCents: Number(meta.goods_or_services_fmv_cents || 0) || 0,
    });
    return { status: "paid", receipt };
  }

  if (intent.status === "requires_action" || intent.status === "requires_confirmation") {
    return { status: "requires_action" };
  }
  if (intent.status === "processing") {
    return { status: "pending" };
  }
  return {
    status: "failed",
    errorMessage:
      intent.last_payment_error?.message ||
      `PaymentIntent status is "${intent.status}" — payment was not confirmed.`,
  };
}

/**
 * Webhook reconciler invoked from server/stripe.ts for asynchronous Stripe events
 * originating from Payment Station (`metadata.source === "payment_station"`).
 */
export async function handlePaymentStationStripeWebhook(event: Stripe.Event): Promise<boolean> {
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    if (intent.metadata?.source !== "payment_station") return false;
    const meta = intent.metadata;
    await persistVerifiedTransactionAndReceipt({
      ownerId: Number(meta.owner_id) || 1,
      collector: {
        userId: Number(meta.collected_by_user_id) || 1,
        name: meta.collected_by_name || "Stripe Webhook",
        email: "",
        role: meta.collected_by_role || "staff",
      },
      mode: (meta.mode as PaymentStationMode) || "invoice",
      method: (meta.method as "saved_card" | "card_by_phone") || "card_by_phone",
      clientId: meta.client_id ? Number(meta.client_id) : null,
      clientOrDonorName: meta.client_or_donor_name || "Client",
      clientOrDonorEmail: meta.client_or_donor_email || null,
      invoiceId: meta.invoice_id ? Number(meta.invoice_id) : null,
      invoiceNumber: meta.invoice_number || null,
      serviceId: meta.service_id ? Number(meta.service_id) : null,
      description: meta.description || "Advocacy Services",
      subtitle: meta.subtitle || null,
      amountCents: intent.amount_received || intent.amount,
      stripePaymentIntentId: intent.id,
      stripeCustomerId: typeof intent.customer === "string" ? intent.customer : null,
      paymentMethodBrand: "Card",
      paymentMethodLast4: "••••",
      donationNote: meta.donation_note || null,
      donorAddress: meta.donor_address || null,
      fundId: meta.fund_id || null,
      fundName: meta.fund_name || null,
      noGoodsOrServicesProvided: meta.no_goods_or_services !== "false",
      goodsOrServicesDescription: meta.goods_or_services_desc || null,
      goodsOrServicesFmvCents: Number(meta.goods_or_services_fmv_cents || 0) || 0,
    });
    return true;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.source !== "payment_station") return false;
    if (session.payment_status !== "paid") return true;
    const meta = session.metadata;
    const stripeRef =
      typeof session.payment_intent === "string" ? session.payment_intent : session.id;
    let existingTxId: number | null = null;
    for (const [id, tx] of Array.from(inMemoryTransactions.entries())) {
      if (tx.stripePaymentIntentId === session.id && tx.status === "PENDING") {
        existingTxId = id;
        break;
      }
    }
    await persistVerifiedTransactionAndReceipt({
      ownerId: Number(meta.owner_id) || 1,
      collector: {
        userId: Number(meta.collected_by_user_id) || 1,
        name: meta.collected_by_name || "Stripe Webhook",
        email: "",
        role: meta.collected_by_role || "staff",
      },
      mode: (meta.mode as PaymentStationMode) || "invoice",
      method: "send_link",
      clientId: meta.client_id ? Number(meta.client_id) : null,
      clientOrDonorName: meta.client_or_donor_name || session.customer_details?.name || "Client",
      clientOrDonorEmail: meta.client_or_donor_email || session.customer_details?.email || null,
      invoiceId: meta.invoice_id ? Number(meta.invoice_id) : null,
      invoiceNumber: meta.invoice_number || null,
      serviceId: meta.service_id ? Number(meta.service_id) : null,
      description: meta.description || "Advocacy Services",
      subtitle: meta.subtitle || null,
      amountCents: session.amount_total || 0,
      stripePaymentIntentId: stripeRef,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
      paymentMethodBrand: "Card",
      paymentMethodLast4: "••••",
      donationNote: meta.donation_note || null,
      donorAddress: meta.donor_address || null,
      fundId: meta.fund_id || null,
      fundName: meta.fund_name || null,
      noGoodsOrServicesProvided: meta.no_goods_or_services !== "false",
      goodsOrServicesDescription: meta.goods_or_services_desc || null,
      goodsOrServicesFmvCents: Number(meta.goods_or_services_fmv_cents || 0) || 0,
      existingTransactionId: existingTxId,
    });
    return true;
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    if (intent.metadata?.source !== "payment_station") return false;
    const meta = intent.metadata;
    pushAudit({
      action: "payment_intent_failed",
      outcome: "failed",
      mode: (meta.mode as PaymentStationMode) || "invoice",
      method: (meta.method as "saved_card" | "card_by_phone") || "card_by_phone",
      amountCents: intent.amount || 0,
      clientId: meta.client_id ? Number(meta.client_id) : null,
      invoiceId: meta.invoice_id ? Number(meta.invoice_id) : null,
      clientOrDonorName: meta.client_or_donor_name || "Client",
      collectedByUserId: Number(meta.collected_by_user_id) || 0,
      collectedByName: meta.collected_by_name || "Staff",
      transactionRef: intent.id,
      detail: intent.last_payment_error?.message || "Stripe reported payment failure.",
    });
    return true;
  }

  return false;
}

// ── 6. Receipt Delivery & Recent Payments ────────────────────────────────────
export async function sendPaymentStationReceipt(params: {
  ownerId: number;
  collector: StaffCollectorIdentity;
  transactionId: number;
  recipientEmail?: string | null;
}): Promise<{
  sent: boolean;
  recipientEmail: string | null;
  delivery: EmailDeliveryResult;
  receiptNumber: string;
}> {
  let tx: Record<string, unknown> | undefined = inMemoryTransactions.get(params.transactionId);
  if (!tx) {
    const db = await getDb();
    if (db) {
      try {
        const [row] = await db
          .select()
          .from(transactions)
          .where(eq(transactions.id, params.transactionId))
          .limit(1);
        if (row) tx = row as unknown as Record<string, unknown>;
      } catch {}
    }
  }

  if (!tx) {
    throw new Error("Transaction not found. Receipts can only be sent after a confirmed payment.");
  }
  if (String(tx.status).toUpperCase() !== "PAID") {
    throw new Error(
      `Cannot send a paid receipt while payment status is "${tx.status}". Wait for Stripe confirmation first.`
    );
  }

  const meta = safeJsonParse(tx.metadata as string | null);
  const isDonation = tx.transactionType === "donation" || meta.mode === "donation";
  const clientOrDonorName = String(meta.clientOrDonorName || "Valued Client");

  let toEmail = (params.recipientEmail || "").trim() || (meta.clientOrDonorEmail as string | undefined) || "";
  if (!toEmail && tx.clientId) {
    const c = inMemoryContacts.get(Number(tx.clientId)) || (await getContactById(Number(tx.clientId)));
    if (c?.email) toEmail = String(c.email);
  }

  if (!toEmail) {
    return {
      sent: false,
      recipientEmail: null,
      receiptNumber: String(tx.receiptNumber),
      delivery: {
        sent: false,
        status: "failed",
        error: "No email address on file for this recipient.",
      },
    };
  }

  const formattedAmount = formatCents(Number(tx.amountCents || 0));
  const settings = inMemoryReceiptSettings.get(params.ownerId) || DEFAULT_RECEIPT_SETTINGS;
  const headingLabel = isDonation ? "Donation Receipt" : "Payment Receipt";
  const noGoods = meta.noGoodsOrServicesProvided !== false;
  const goodsFmvCents = Number(meta.goodsOrServicesFmvCents || 0) || 0;
  const goodsDisclosureLine = noGoods
    ? "No goods or services were provided in exchange for this contribution."
    : `Estimated fair market value of goods/services provided: ${formatCents(goodsFmvCents)}${
        meta.goodsOrServicesDescription ? ` (${String(meta.goodsOrServicesDescription)})` : ""
      }.`;
  const footerNote = isDonation
    ? "Thank you for supporting Waypoint Advocates. Contributions are not currently deductible as charitable gifts for federal income tax purposes."
    : settings.receiptFooterMessage || "Thank you for trusting Waypoint Advocates.";

  // IMPORTANT: Zero charitable tax-deductibility or 501(c)(3) claims until exempt status is verified!
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #000820; color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #C5A059;">
      <div style="padding: 24px; text-align: center; background: #06172F; border-bottom: 2px solid #C5A059;">
        <h1 style="margin: 0; font-size: 20px; letter-spacing: 3px; color: #FFF4D4;">WAYPOINT</h1>
        <p style="margin: 6px 0 0; font-size: 11px; color: #DFBE77; text-transform: uppercase; letter-spacing: 1.5px;">${headingLabel}</p>
      </div>
      <div style="padding: 28px 24px;">
        <div style="background: #F6F0E4; color: #111827; padding: 22px; border-radius: 10px;">
          <div style="font-size: 16px; font-weight: 700; margin-bottom: 10px;">${escapeHtml(clientOrDonorName)}</div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #d6cbb8; padding-bottom: 10px; margin-bottom: 10px; font-size: 14px;">
            <span>${escapeHtml(String(tx.serviceName || (isDonation ? "Donation" : "Advocacy Services")))}</span>
            <strong>${formattedAmount}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; margin-bottom: 14px;">
            <span>Total</span>
            <span>${formattedAmount}</span>
          </div>
          <div style="font-size: 12px; color: #475569; line-height: 1.7;">
            <div><strong>Status:</strong> Paid</div>
            <div><strong>Receipt #:</strong> ${escapeHtml(String(tx.receiptNumber))}</div>
            ${tx.stripePaymentIntentId ? `<div><strong>Reference:</strong> ${escapeHtml(String(tx.stripePaymentIntentId))}</div>` : ""}
            ${meta.invoiceNumber ? `<div><strong>Invoice:</strong> ${escapeHtml(String(meta.invoiceNumber))}</div>` : ""}
            ${isDonation && meta.fundName ? `<div><strong>Fund:</strong> ${escapeHtml(String(meta.fundName))}</div>` : ""}
            ${isDonation && meta.donorAddress ? `<div><strong>Donor Address:</strong> ${escapeHtml(String(meta.donorAddress))}</div>` : ""}
            ${meta.donationNote ? `<div><strong>Note:</strong> ${escapeHtml(String(meta.donationNote))}</div>` : ""}
            ${isDonation ? `<div><strong>Disclosure:</strong> ${escapeHtml(goodsDisclosureLine)}</div>` : ""}
            <div><strong>Date:</strong> ${new Date(String(tx.paidAt || new Date())).toLocaleString("en-US")}</div>
          </div>
        </div>
      </div>
      <div style="padding: 16px 24px; background: #030D1D; border-top: 1px solid #18365D; text-align: center; font-size: 11px; color: #94a3b8;">
        ${escapeHtml(footerNote)}
      </div>
    </div>
  `;

  const delivery = await sendEmailDetailed({
    to: toEmail,
    subject: `Waypoint ${headingLabel}: ${String(tx.receiptNumber)} (${formattedAmount})`,
    html,
    contactId: tx.clientId ? Number(tx.clientId) : null,
    idempotencyKey: `pos_receipt_${params.transactionId}_${Date.now()}`,
  });

  if (delivery.sent) {
    const sentAt = new Date();
    tx.emailSentAt = sentAt;
    if (tx.stripePaymentIntentId && finalizedStripeRefs.has(String(tx.stripePaymentIntentId))) {
      const snap = finalizedStripeRefs.get(String(tx.stripePaymentIntentId))!;
      snap.emailSentAt = sentAt.toISOString();
    }
    const db = await getDb();
    if (db) {
      try {
        await db
          .update(transactions)
          .set({ emailSentAt: sentAt, updatedAt: sentAt })
          .where(eq(transactions.id, params.transactionId));
      } catch {}
    }
  }

  pushAudit({
    action: "send_receipt",
    outcome: delivery.sent ? "receipt_sent" : "failed",
    mode: isDonation ? "donation" : "invoice",
    method: "receipt",
    amountCents: Number(tx.amountCents || 0),
    clientId: tx.clientId ? Number(tx.clientId) : null,
    invoiceId: meta.invoiceId ? Number(meta.invoiceId) : null,
    clientOrDonorName,
    collectedByUserId: params.collector.userId,
    collectedByName: params.collector.name,
    transactionRef: tx.stripePaymentIntentId ? String(tx.stripePaymentIntentId) : String(tx.receiptNumber),
    detail: delivery.sent
      ? `Receipt ${String(tx.receiptNumber)} delivered to ${toEmail}`
      : delivery.error || `Receipt delivery unavailable (${delivery.status})`,
  });

  return {
    sent: delivery.sent,
    recipientEmail: toEmail,
    delivery,
    receiptNumber: String(tx.receiptNumber),
  };
}

export async function listRecentPaymentStationTransactions(
  limit = 25
): Promise<PaymentStationReceiptSnapshot[]> {
  const results: PaymentStationReceiptSnapshot[] = [];
  const seenRefs = new Set<string>();

  const toSnapshot = (row: Record<string, unknown>): PaymentStationReceiptSnapshot => {
    const meta = safeJsonParse(row.metadata as string | null);
    const rawStatus = String(row.status || "PAID").toUpperCase();
    const mappedStatus: PaymentStationReceiptSnapshot["status"] =
      rawStatus === "PAID"
        ? "paid"
        : rawStatus === "PENDING"
          ? "pending"
          : rawStatus === "FAILED"
            ? "failed"
            : "paid";

    return {
      transactionId: Number(row.id),
      receiptNumber: String(row.receiptNumber || ""),
      status: mappedStatus,
      mode:
        row.transactionType === "donation" || meta.mode === "donation"
          ? "donation"
          : meta.invoiceId
            ? "invoice"
            : "service",
      clientId: row.clientId ? Number(row.clientId) : null,
      clientOrDonorName: String(meta.clientOrDonorName || "Client"),
      clientOrDonorEmail: (meta.clientOrDonorEmail as string | null) ?? null,
      description: String(row.serviceName || "Advocacy Services"),
      subtitle: row.planName ? String(row.planName) : (meta.subtitle as string | null) ?? null,
      invoiceId: meta.invoiceId ? Number(meta.invoiceId) : null,
      invoiceNumber: (meta.invoiceNumber as string | null) ?? (row.stripeInvoiceId ? String(row.stripeInvoiceId) : null),
      amountCents: Number(row.amountCents || 0),
      paymentMethodSummary: formatMethodSummary(
        row.paymentMethodBrand as string | null,
        row.paymentMethodLast4 as string | null
      ),
      transactionRef: row.stripePaymentIntentId ? String(row.stripePaymentIntentId) : null,
      checkoutUrl: (meta.checkoutUrl as string | null) ?? null,
      paidAt: row.paidAt ? new Date(String(row.paidAt)).toISOString() : null,
      collectedByName: (meta.collectedByName as string | null) ?? null,
      emailSentAt: row.emailSentAt ? new Date(String(row.emailSentAt)).toISOString() : null,
      donationNote: (meta.donationNote as string | null) ?? null,
    };
  };

  for (const tx of Array.from(inMemoryTransactions.values()).reverse()) {
    const refKey = String(tx.stripePaymentIntentId || tx.receiptNumber || tx.id);
    if (seenRefs.has(refKey)) continue;
    seenRefs.add(refKey);
    results.push(toSnapshot(tx as Record<string, unknown>));
  }

  const db = await getDb();
  if (db) {
    try {
      const dbRows = await db
        .select()
        .from(transactions)
        .orderBy(desc(transactions.createdAt))
        .limit(limit);
      for (const row of dbRows) {
        const refKey = String(row.stripePaymentIntentId || row.receiptNumber || row.id);
        if (seenRefs.has(refKey)) continue;
        seenRefs.add(refKey);
        results.push(toSnapshot(row as unknown as Record<string, unknown>));
      }
    } catch {}
  }

  return results.slice(0, limit);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function safeJsonParse(raw: string | null | undefined): Record<string, unknown> {
  if (!raw || typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function formatMethodSummary(brand?: string | null, last4?: string | null): string {
  const b = (brand || "Card").trim();
  const formattedBrand = b.charAt(0).toUpperCase() + b.slice(1);
  if (last4 && last4.trim()) {
    return `${formattedBrand} •••• ${last4.trim()}`;
  }
  return formattedBrand;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

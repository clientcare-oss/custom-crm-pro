import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  appendKeypadDigitCents,
  backspaceKeypadCents,
  classifyPaymentErrorKind,
  clearKeypadCents,
  evaluateDonationCompliance,
  formatCents,
  getPrinterIndicatorState,
  PAYMENT_DECLINED_INLINE_MESSAGE,
  PAYMENT_UNCONFIRMED_INLINE_MESSAGE,
  validateInvoicePaymentAmountCents,
} from "../shared/paymentStation";
import {
  __setPaymentStationStripeForTests,
  __resetPaymentStationStateForTests,
  getPaymentStationAuditTrail,
  handlePaymentStationStripeWebhook,
} from "./services/paymentStationService";
import { inMemoryContacts } from "./db/contacts";
import {
  inMemoryBillingInvoices,
  inMemoryFamilyPaymentMethods,
} from "./db/billing";
import { inMemoryTransactions } from "./routers/receipts";
import { storedDonations } from "./db/giving";
import { __setMockEmailTransportForTests } from "./_core/email";
import { upsertStaffAccessProfile } from "./_core/staffAccess";

function makeCaller(user: {
  id: number;
  openId: string;
  name: string;
  email: string;
  role?: "admin" | "user" | "client";
} | null) {
  const ctx: TrpcContext = {
    user: user
      ? ({
          id: user.id,
          openId: user.openId,
          name: user.name,
          email: user.email,
          role: user.role ?? "user",
          loginMethod: "clerk",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as any)
      : null,
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: {} as any,
  };
  return appRouter.createCaller(ctx);
}

const ADMIN_OWNER = {
  id: 9060114,
  openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
  name: "Byron Honea",
  email: "byron@waypointadvocates.com",
  role: "admin" as const,
};

const CALL_CENTER_USER = {
  id: 9060250,
  openId: "user_3KPhcRBro_wyatt",
  name: "Wyatt Smith",
  email: "wyatt.smith@waypointadvocates.com",
  role: "user" as const,
};

const CLIENT_ID = 77001;
const INVOICE_ID = 88001;

function seedTestClientAndInvoice() {
  inMemoryContacts.set(CLIENT_ID, {
    id: CLIENT_ID,
    ownerId: ADMIN_OWNER.id,
    firstName: "Emily",
    lastName: "Parker",
    email: "emily.parker@example.com",
    phone: "(404) 555-0148",
    planTier: "Anchor Plan",
    caseId: "WP-2026-1048",
    archivedAt: null,
  });

  inMemoryBillingInvoices.set(INVOICE_ID, {
    id: INVOICE_ID,
    ownerId: ADMIN_OWNER.id,
    clientId: CLIENT_ID,
    invoiceNumber: "WP-1048",
    title: "Anchor Plan",
    serviceDescription: "Anchor Plan Monthly Advocacy",
    amount: "105.00",
    tax: "0.00",
    total: "105.00",
    amountPaid: "0.00",
    status: "Sent",
    dueDate: new Date("2026-12-01T00:00:00Z"),
    paidDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryFamilyPaymentMethods.set(CLIENT_ID, [
    {
      id: 9901,
      clientId: CLIENT_ID,
      stripePaymentMethodId: "pm_test_emily_visa_4242",
      brand: "visa",
      last4: "4242",
      expMonth: 11,
      expYear: 2029,
      isDefault: true,
    },
  ]);
}

function createFakeStripe(overrides?: {
  savedCardStatus?: "succeeded" | "requires_action" | "decline";
  retrieveIntentStatus?: "succeeded" | "processing" | "requires_payment_method";
}) {
  const intents = new Map<string, any>();
  const sessions = new Map<string, any>();
  let piCounter = 1;
  let csCounter = 1;

  const stripeMock = {
    customers: {
      list: async ({ email }: { email: string }) => ({
        data: email === "emily.parker@example.com"
          ? [{ id: "cus_test_emily", email, invoice_settings: { default_payment_method: "pm_test_emily_visa_4242" } }]
          : [],
      }),
      create: async (payload: any) => ({
        id: `cus_test_new_${Date.now()}`,
        email: payload.email,
      }),
    },
    paymentMethods: {
      list: async () => ({
        data: [
          {
            id: "pm_test_emily_visa_4242",
            card: { brand: "visa", last4: "4242", exp_month: 11, exp_year: 2029 },
          },
        ],
      }),
    },
    paymentIntents: {
      create: async (params: any) => {
        if (params.confirm && overrides?.savedCardStatus === "decline") {
          throw new Error("Your card was declined.");
        }
        const id = `pi_test_pos_${piCounter++}`;
        const status = params.confirm
          ? overrides?.savedCardStatus || "succeeded"
          : "requires_payment_method";
        const obj = {
          id,
          client_secret: `${id}_secret_xyz`,
          amount: params.amount,
          amount_received: status === "succeeded" ? params.amount : 0,
          currency: params.currency,
          customer: params.customer,
          status,
          metadata: params.metadata || {},
          payment_method: {
            id: params.payment_method || "pm_test_phone_card",
            card: { brand: "visa", last4: "4242" },
          },
        };
        intents.set(id, obj);
        return obj;
      },
      retrieve: async (id: string) => {
        const stored = intents.get(id);
        if (!stored) throw new Error("No such payment_intent");
        const status = overrides?.retrieveIntentStatus || "succeeded";
        return {
          ...stored,
          status,
          amount_received: status === "succeeded" ? stored.amount : 0,
          last_payment_error:
            status === "requires_payment_method"
              ? { message: "Card authentication failed." }
              : null,
        };
      },
    },
    checkout: {
      sessions: {
        create: async (params: any) => {
          const id = `cs_test_pos_${csCounter++}`;
          const unitAmount = params.line_items?.[0]?.price_data?.unit_amount ?? 0;
          const obj = {
            id,
            url: `https://checkout.stripe.com/c/pay/${id}`,
            status: "open",
            payment_status: "unpaid",
            amount_total: unitAmount,
            customer: params.customer,
            metadata: params.metadata || {},
          };
          sessions.set(id, obj);
          return obj;
        },
        retrieve: async (id: string) => {
          const stored = sessions.get(id);
          if (!stored) throw new Error("No such checkout session");
          return stored;
        },
      },
    },
  } as unknown as Stripe;

  return { stripeMock, intents, sessions };
}

describe("Payment Station (PG-050)", () => {
  beforeEach(() => {
    __resetPaymentStationStateForTests();
    __setMockEmailTransportForTests(null);
    inMemoryContacts.delete(CLIENT_ID);
    inMemoryBillingInvoices.delete(INVOICE_ID);
    inMemoryFamilyPaymentMethods.delete(CLIENT_ID);
    for (const [txId, tx] of Array.from(inMemoryTransactions.entries())) {
      if (String(tx.stripePaymentIntentId || "").startsWith("pi_test_pos_") || String(tx.stripePaymentIntentId || "").startsWith("cs_test_pos_")) {
        inMemoryTransactions.delete(txId);
      }
    }
    seedTestClientAndInvoice();
  });

  afterEach(() => {
    __resetPaymentStationStateForTests();
    __setMockEmailTransportForTests(null);
  });

  it("handles integer minor-unit keypad math accurately without floating-point drift", () => {
    let cents = 0;
    cents = appendKeypadDigitCents(cents, 1);
    cents = appendKeypadDigitCents(cents, 0);
    cents = appendKeypadDigitCents(cents, 5);
    cents = appendKeypadDigitCents(cents, 0);
    cents = appendKeypadDigitCents(cents, 0);
    expect(cents).toBe(10500);
    expect(formatCents(cents)).toBe("$105.00");

    // Fresh prefill replacement starts clean on first digit press
    expect(appendKeypadDigitCents(10500, 5, { replacePrefill: true })).toBe(5);
    expect(backspaceKeypadCents(10500)).toBe(1050);
    expect(clearKeypadCents()).toBe(0);
  });

  it("enforces invoice balance rules: allows partial/full, blocks overpayment and closed invoices", () => {
    const partial = validateInvoicePaymentAmountCents({
      invoiceStatus: "Sent",
      invoiceTotalCents: 10500,
      amountPaidCents: 0,
      requestedPaymentCents: 5000,
    });
    expect(partial.valid).toBe(true);
    expect(partial.isPartialPayment).toBe(true);
    expect(partial.willSettleInFull).toBe(false);

    const overpay = validateInvoicePaymentAmountCents({
      invoiceStatus: "Sent",
      invoiceTotalCents: 10500,
      amountPaidCents: 5000,
      requestedPaymentCents: 6000,
    });
    expect(overpay.valid).toBe(false);
    expect(overpay.error).toContain("exceeds");

    const alreadyPaid = validateInvoicePaymentAmountCents({
      invoiceStatus: "Paid",
      invoiceTotalCents: 10500,
      amountPaidCents: 10500,
      requestedPaymentCents: 10500,
    });
    expect(alreadyPaid.valid).toBe(false);
  });

  it("enforces RBAC on server: authorizes management & advocate, blocks call_center & unauthenticated", async () => {
    // Unauthenticated rejected
    const anonCaller = makeCaller(null);
    await expect(anonCaller.paymentStation.getConfig()).rejects.toThrow();

    // Call center staff (Wyatt) blocked from Payment Station
    const wyattCaller = makeCaller(CALL_CENTER_USER);
    await expect(wyattCaller.paymentStation.getConfig()).rejects.toThrow(/restricted|not authorized/i);

    // Authorized Advocate granted access
    await upsertStaffAccessProfile({
      userId: 9060999,
      openId: "user_advocate_pos_test",
      employeeId: "emp-pos-advocate",
      name: "Claire Advocate",
      email: "claire.advocate@waypointadvocates.com",
      primaryRole: "advocate",
      additionalRoles: [],
      isProtectedOwner: false,
      hasAdminAccess: false,
      isStaff: true,
      accountStatus: "active",
      modulePermissions: {},
      caseWorkspaceAccess: {},
      permissionOverrides: {},
    });

    const advocateCaller = makeCaller({
      id: 9060999,
      openId: "user_advocate_pos_test",
      name: "Claire Advocate",
      email: "claire.advocate@waypointadvocates.com",
      role: "user",
    });
    const cfg = await advocateCaller.paymentStation.getConfig();
    expect(cfg.permissions.canCollect).toBe(true);
    expect(cfg.permissions.role).toBe("advocate");
  });

  it("reports missing Stripe config honestly and refuses to fake payments when unconfigured", async () => {
    __setPaymentStationStripeForTests(null, null);
    const caller = makeCaller(ADMIN_OWNER);

    const cfg = await caller.paymentStation.getConfig();
    expect(cfg.cardByPhoneReady).toBe(false);
    expect(cfg.savedCardReady).toBe(false);
    expect(cfg.paymentLinkReady).toBe(false);
    expect(cfg.missingSetupItems.some((item) => item.includes("STRIPE_SECRET_KEY"))).toBe(true);
    expect(cfg.missingSetupItems.some((item) => item.includes("VITE_STRIPE_PUBLISHABLE_KEY"))).toBe(true);

    await expect(
      caller.paymentStation.createCardPaymentIntent({
        idempotencyKey: "idem-unconfigured-001",
        mode: "invoice",
        amountCents: 10500,
        clientId: CLIENT_ID,
        invoiceId: INVOICE_ID,
      })
    ).rejects.toThrow(/not configured/i);

    await expect(
      caller.paymentStation.chargeSavedCard({
        idempotencyKey: "idem-unconfigured-002",
        mode: "invoice",
        amountCents: 10500,
        clientId: CLIENT_ID,
        invoiceId: INVOICE_ID,
        paymentMethodId: "pm_test_emily_visa_4242",
      })
    ).rejects.toThrow(/not configured/i);

    await expect(
      caller.paymentStation.createPaymentLink({
        idempotencyKey: "idem-unconfigured-003",
        mode: "invoice",
        amountCents: 10500,
        clientId: CLIENT_ID,
        invoiceId: INVOICE_ID,
      })
    ).rejects.toThrow(/not configured/i);
  });

  it("processes Card by Phone with idempotency, partial + full invoice settlement, and verified receipt delivery", async () => {
    const { stripeMock } = createFakeStripe();
    __setPaymentStationStripeForTests(stripeMock, "pk_test_fake_12345");
    const sentEmails: Array<{ to: string; subject: string; html: string }> = [];
    __setMockEmailTransportForTests(async (payload) => {
      sentEmails.push({ to: payload.to, subject: payload.subject, html: payload.html });
      return { sent: true, status: "submitted_to_provider", messageId: "msg_test_1" };
    });

    const caller = makeCaller(ADMIN_OWNER);

    // 1. Partial payment ($50.00 of $105.00) with idempotency duplicate check
    const firstIntent = await caller.paymentStation.createCardPaymentIntent({
      idempotencyKey: "idem-partial-001",
      mode: "invoice",
      amountCents: 5000,
      clientId: CLIENT_ID,
      invoiceId: INVOICE_ID,
    });
    const dupIntent = await caller.paymentStation.createCardPaymentIntent({
      idempotencyKey: "idem-partial-001",
      mode: "invoice",
      amountCents: 5000,
      clientId: CLIENT_ID,
      invoiceId: INVOICE_ID,
    });
    expect(dupIntent.duplicate).toBe(true);
    expect(dupIntent.paymentIntentId).toBe(firstIntent.paymentIntentId);

    // Verify directly with Stripe -> invoice stays Sent with amountPaid = 50.00, total untouched at 105.00
    const partialVerify = await caller.paymentStation.verifyPaymentResult({
      paymentIntentId: firstIntent.paymentIntentId,
    });
    expect(partialVerify.status).toBe("paid");
    expect(partialVerify.receipt?.amountCents).toBe(5000);
    const invAfterPartial = inMemoryBillingInvoices.get(INVOICE_ID);
    expect(invAfterPartial.total).toBe("105.00");
    expect(invAfterPartial.amountPaid).toBe("50.00");
    expect(invAfterPartial.status).toBe("Sent");

    // Attempting to overpay remaining $55.00 is blocked server-side
    await expect(
      caller.paymentStation.createCardPaymentIntent({
        idempotencyKey: "idem-overpay-002",
        mode: "invoice",
        amountCents: 6000,
        clientId: CLIENT_ID,
        invoiceId: INVOICE_ID,
      })
    ).rejects.toThrow(/exceeds/i);

    // 2. Remaining $55.00 settles invoice in full
    const finalIntent = await caller.paymentStation.createCardPaymentIntent({
      idempotencyKey: "idem-final-003",
      mode: "invoice",
      amountCents: 5500,
      clientId: CLIENT_ID,
      invoiceId: INVOICE_ID,
    });
    const finalVerify = await caller.paymentStation.verifyPaymentResult({
      paymentIntentId: finalIntent.paymentIntentId,
    });
    expect(finalVerify.status).toBe("paid");
    const invAfterFull = inMemoryBillingInvoices.get(INVOICE_ID);
    expect(invAfterFull.amountPaid).toBe("105.00");
    expect(invAfterFull.status).toBe("Paid");

    // 3. Send receipt via supported email transport
    const receiptRes = await caller.paymentStation.sendReceipt({
      transactionId: finalVerify.receipt!.transactionId!,
      recipientEmail: "emily.parker@example.com",
    });
    expect(receiptRes.sent).toBe(true);
    expect(sentEmails.length).toBe(1);
    expect(sentEmails[0].html).toContain("WAYPOINT");
    expect(sentEmails[0].html).toContain("Emily Parker");

    // Audit trail captures staff collector & ref
    const audit = getPaymentStationAuditTrail();
    expect(audit.some((a) => a.collectedByUserId === ADMIN_OWNER.id && a.outcome === "succeeded")).toBe(true);
  });

  it("handles Saved Card 3DS requires_action, card declines, and unauthorized PM rejection", async () => {
    // Decline scenario
    const declineStripe = createFakeStripe({ savedCardStatus: "decline" });
    __setPaymentStationStripeForTests(declineStripe.stripeMock, "pk_test_fake_12345");
    const caller = makeCaller(ADMIN_OWNER);

    const declined = await caller.paymentStation.chargeSavedCard({
      idempotencyKey: "idem-saved-decline-1",
      mode: "invoice",
      amountCents: 10500,
      clientId: CLIENT_ID,
      invoiceId: INVOICE_ID,
      paymentMethodId: "pm_test_emily_visa_4242",
    });
    expect(declined.status).toBe("failed");
    expect(declined.errorMessage).toContain("declined");
    expect(inMemoryBillingInvoices.get(INVOICE_ID).status).toBe("Sent");

    // Unauthorized PM rejected
    await expect(
      caller.paymentStation.chargeSavedCard({
        idempotencyKey: "idem-saved-unauth-2",
        mode: "invoice",
        amountCents: 10500,
        clientId: CLIENT_ID,
        invoiceId: INVOICE_ID,
        paymentMethodId: "pm_someone_elses_card",
      })
    ).rejects.toThrow(/not authorized/i);

    // 3DS requires_action returned cleanly
    const scaStripe = createFakeStripe({ savedCardStatus: "requires_action" });
    __setPaymentStationStripeForTests(scaStripe.stripeMock, "pk_test_fake_12345");
    const sca = await caller.paymentStation.chargeSavedCard({
      idempotencyKey: "idem-saved-3ds-3",
      mode: "invoice",
      amountCents: 10500,
      clientId: CLIENT_ID,
      invoiceId: INVOICE_ID,
      paymentMethodId: "pm_test_emily_visa_4242",
    });
    expect(sca.status).toBe("requires_action");
    expect(sca.clientSecret).toBeTruthy();
    expect(inMemoryBillingInvoices.get(INVOICE_ID).status).toBe("Sent");
  });

  it("supports PCI-safe Update & Charge on Saved Cards (setup_future_usage + replaces old card on verified success)", async () => {
    const { stripeMock, intents } = createFakeStripe();
    __setPaymentStationStripeForTests(stripeMock, "pk_test_fake_12345");
    const caller = makeCaller(ADMIN_OWNER);

    const intentRes = await caller.paymentStation.createCardPaymentIntent({
      idempotencyKey: "idem-update-charge-001",
      mode: "invoice",
      amountCents: 10500,
      clientId: CLIENT_ID,
      invoiceId: INVOICE_ID,
      saveCardToCustomer: true,
      setAsDefaultPaymentMethod: true,
      replacePaymentMethodId: "pm_test_emily_visa_4242",
    });

    const createdIntent = intents.get(intentRes.paymentIntentId);
    expect(createdIntent.metadata.save_card_to_customer).toBe("true");
    expect(createdIntent.metadata.replace_payment_method_id).toBe("pm_test_emily_visa_4242");

    // Simulate Stripe verifying newly attached card pm_test_new_9910
    createdIntent.payment_method = {
      id: "pm_test_new_9910",
      card: { brand: "visa", last4: "9910", exp_month: 12, exp_year: 2030 },
    };

    const verified = await caller.paymentStation.verifyPaymentResult({
      paymentIntentId: intentRes.paymentIntentId,
    });
    expect(verified.status).toBe("paid");
    expect(inMemoryBillingInvoices.get(INVOICE_ID).status).toBe("Paid");

    // Replaced old card (4242) with new default card (9910)
    const updatedMethods = inMemoryFamilyPaymentMethods.get(CLIENT_ID) || [];
    expect(updatedMethods.some((m) => m.stripePaymentMethodId === "pm_test_new_9910")).toBe(true);
    expect(updatedMethods.some((m) => m.stripePaymentMethodId === "pm_test_emily_visa_4242")).toBe(false);
  });

  it("keeps Send Link pending until Stripe webhook confirms completion", async () => {
    const { stripeMock } = createFakeStripe();
    __setPaymentStationStripeForTests(stripeMock, "pk_test_fake_12345");
    const caller = makeCaller(ADMIN_OWNER);

    const linkRes = await caller.paymentStation.createPaymentLink({
      idempotencyKey: "idem-link-001",
      mode: "invoice",
      amountCents: 10500,
      clientId: CLIENT_ID,
      invoiceId: INVOICE_ID,
      sendByEmail: false,
    });
    expect(linkRes.receipt.status).toBe("pending");
    expect(linkRes.checkoutUrl).toContain("checkout.stripe.com");
    // Invoice MUST still be unpaid before Stripe confirms!
    expect(inMemoryBillingInvoices.get(INVOICE_ID).status).toBe("Sent");

    // Attempting to send a paid receipt while pending MUST fail
    await expect(
      caller.paymentStation.sendReceipt({
        transactionId: linkRes.receipt.transactionId!,
      })
    ).rejects.toThrow(/PENDING/i);

    // Now simulate Stripe webhook checkout.session.completed
    const handled = await handlePaymentStationStripeWebhook({
      id: "evt_live_pos_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: linkRes.sessionId,
          payment_status: "paid",
          payment_intent: "pi_test_from_checkout_001",
          amount_total: 10500,
          customer: "cus_test_emily",
          metadata: {
            source: "payment_station",
            mode: "invoice",
            method: "send_link",
            owner_id: String(ADMIN_OWNER.id),
            client_id: String(CLIENT_ID),
            invoice_id: String(INVOICE_ID),
            invoice_number: "WP-1048",
            description: "Anchor Plan",
            subtitle: "Anchor Plan · Invoice WP-1048",
            client_or_donor_name: "Emily Parker",
            client_or_donor_email: "emily.parker@example.com",
            collected_by_user_id: String(ADMIN_OWNER.id),
            collected_by_name: ADMIN_OWNER.name,
            collected_by_role: "management",
          },
        },
      },
    } as unknown as Stripe.Event);

    expect(handled).toBe(true);
    expect(inMemoryBillingInvoices.get(INVOICE_ID).status).toBe("Paid");
    expect(inMemoryBillingInvoices.get(INVOICE_ID).amountPaid).toBe("105.00");
  });

  it("records Donations separately without altering selected invoice and without tax-deductibility claims", async () => {
    const { stripeMock } = createFakeStripe();
    __setPaymentStationStripeForTests(stripeMock, "pk_test_fake_12345");
    const sentEmails: Array<{ html: string; subject: string }> = [];
    __setMockEmailTransportForTests(async (payload) => {
      sentEmails.push({ html: payload.html, subject: payload.subject });
      return { sent: true, status: "submitted_to_provider", messageId: "msg_don_1" };
    });

    const caller = makeCaller(ADMIN_OWNER);
    const donationsBefore = storedDonations.length;

    const intent = await caller.paymentStation.createCardPaymentIntent({
      idempotencyKey: "idem-donation-001",
      mode: "donation",
      amountCents: 2500,
      clientId: CLIENT_ID,
      invoiceId: INVOICE_ID, // Passed defensively — server MUST ignore & preserve invoice!
      donorName: "Emily Parker",
      donorEmail: "emily.parker@example.com",
      donationNote: "Scholarship family support",
    });

    const verified = await caller.paymentStation.verifyPaymentResult({
      paymentIntentId: intent.paymentIntentId,
    });
    expect(verified.status).toBe("paid");
    expect(verified.receipt?.mode).toBe("donation");
    expect(verified.receipt?.description).toBe("Donation");
    expect(verified.receipt?.invoiceId).toBeNull();

    // Invoice MUST remain 100% untouched!
    const inv = inMemoryBillingInvoices.get(INVOICE_ID);
    expect(inv.status).toBe("Sent");
    expect(inv.amountPaid).toBe("0.00");
    expect(inv.total).toBe("105.00");

    // Recorded separately in donations store with taxDeductible: false
    expect(storedDonations.length).toBe(donationsBefore + 1);
    expect(storedDonations[0].donorName).toBe("Emily Parker");
    expect(storedDonations[0].amountCents).toBe(2500);
    expect(storedDonations[0].taxDeductible).toBe(false);

    // Donation receipt email MUST NOT include charitable tax-deductibility or 501(c)(3) claims before approval
    await caller.paymentStation.sendReceipt({
      transactionId: verified.receipt!.transactionId!,
    });
    expect(sentEmails.length).toBe(1);
    expect(sentEmails[0].subject).toContain("Donation Receipt");
    expect(sentEmails[0].html.toLowerCase()).not.toContain("tax-deductible");
    expect(sentEmails[0].html.toLowerCase()).not.toContain("501(c)(3)");
    expect(sentEmails[0].html).toContain("No goods or services were provided");
  });

  it("evaluates 501(c)(3) donation compliance rules (legal name, >=$250 receipt, >=$5,000 Schedule B, quid pro quo FMV)", () => {
    // Missing donor legal name blocks submission
    const missingName = evaluateDonationCompliance({
      donorName: "",
      amountCents: 5000,
      noGoodsOrServicesProvided: true,
    });
    expect(missingName.ready).toBe(false);
    expect(missingName.blockingIssues.length).toBeGreaterThan(0);

    // >= $250 without email or mailing address emits IRS §170(f)(8) warning
    const needsContact = evaluateDonationCompliance({
      donorName: "Jordan Lee",
      donorEmail: "",
      donorAddress: "",
      amountCents: 25000,
      fundId: "fnd-1",
      noGoodsOrServicesProvided: true,
    });
    expect(needsContact.ready).toBe(true);
    expect(needsContact.warnings.some((w) => w.includes("$250"))).toBe(true);

    // >= $5,000 without mailing address emits Schedule B warning
    const scheduleB = evaluateDonationCompliance({
      donorName: "Jordan Lee",
      donorEmail: "jordan@example.com",
      donorAddress: "",
      amountCents: 500000,
      fundId: "fnd-1",
      noGoodsOrServicesProvided: true,
    });
    expect(scheduleB.warnings.some((w) => w.includes("Schedule B"))).toBe(true);

    // Quid pro quo goods/services calculates net charitable contribution and rejects missing/excessive FMV
    const missingFmv = evaluateDonationCompliance({
      donorName: "Jordan Lee",
      donorEmail: "jordan@example.com",
      amountCents: 10000,
      noGoodsOrServicesProvided: false,
      goodsOrServicesFmvCents: 0,
    });
    expect(missingFmv.ready).toBe(false);

    const validQuidProQuo = evaluateDonationCompliance({
      donorName: "Jordan Lee",
      donorEmail: "jordan@example.com",
      donorAddress: "123 Peachtree St, Atlanta, GA 30309",
      amountCents: 10000,
      fundId: "fnd-2",
      noGoodsOrServicesProvided: false,
      goodsOrServicesDescription: "Gala dinner",
      goodsOrServicesFmvCents: 3500,
    });
    expect(validQuidProQuo.ready).toBe(true);
    expect(validQuidProQuo.warnings.length).toBe(0);
    expect(validQuidProQuo.netCharitableCents).toBe(6500);
  });

  it("maps printer indicator states and classifies processor declines vs connection uncertainty accurately", () => {
    // Waiting / ready / pending / processing / requires_action / unconfirmed -> solid blue
    expect(getPrinterIndicatorState("awaiting_payment")).toBe("blue_solid");
    expect(getPrinterIndicatorState("pending")).toBe("blue_solid");
    expect(getPrinterIndicatorState("processing")).toBe("blue_solid");
    expect(getPrinterIndicatorState("requires_action")).toBe("blue_solid");
    expect(getPrinterIndicatorState("unconfirmed")).toBe("blue_solid");
    // Confirmed success -> solid green
    expect(getPrinterIndicatorState("paid")).toBe("green_solid");
    // Declined payment -> slow pulsing red
    expect(getPrinterIndicatorState("failed")).toBe("red_pulse");
    // Internet disconnected -> slow pulsing amber
    expect(getPrinterIndicatorState("offline")).toBe("amber_pulse");

    // Connection / network errors leave outcome unconfirmed; card errors classify as declined
    expect(classifyPaymentErrorKind(new TypeError("Failed to fetch"))).toBe("unconfirmed");
    expect(classifyPaymentErrorKind({ type: "api_connection_error", message: "Lost network" })).toBe(
      "unconfirmed"
    );
    expect(classifyPaymentErrorKind(new Error("Request timed out (504)"))).toBe("unconfirmed");
    expect(classifyPaymentErrorKind(new Error("Your card was declined."))).toBe("declined");
    expect(classifyPaymentErrorKind(new Error("Insufficient funds"))).toBe("declined");

    expect(PAYMENT_DECLINED_INLINE_MESSAGE).toBe("Payment declined. No payment was collected.");
    expect(PAYMENT_UNCONFIRMED_INLINE_MESSAGE).toBe(
      "Payment status unconfirmed. Check status before retrying."
    );
  });
});

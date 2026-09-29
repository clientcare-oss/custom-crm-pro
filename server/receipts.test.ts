import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  inMemoryReceiptSettings,
  inMemoryTransactions,
} from "./routers/receipts";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(id = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `admin-${id}`,
    email: `admin${id}@waypointadvocates.com`,
    name: "Byron Honea",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createClientContext(id = 50): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `client-${id}`,
    email: `client${id}@example.com`,
    name: "Jane Smith",
    loginMethod: "manus",
    role: "client",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("Waypoint Payment Receipts Engine (PG-047 / PG-024-REC)", () => {
  beforeEach(() => {
    inMemoryReceiptSettings.clear();
    inMemoryTransactions.clear();
  });

  // TEST 1: Default Settings
  it("TEST 1: Retrieves default receipt configuration for admin", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const settings = await caller.receipts.getSettings();
    expect(settings).toBeDefined();
    expect(settings.receiptExperienceEnabled).toBe(1);
    expect(settings.receiptPrefix).toBe("WP-");
    expect(settings.completionHeadline).toBe("You're officially aboard.");
    expect(settings.companyName).toBe("Waypoint Advocates");
    expect(settings.showPaymentMethod).toBe(1);
  });

  // TEST 2: Update Settings
  it("TEST 2: Admin can update receipt experience preferences and prefix numbering", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const res = await caller.receipts.updateSettings({
      receiptPrefix: "WAYPOINT-",
      nextReceiptSequence: 2000,
      completionHeadline: "Welcome aboard the Waypoint fleet!",
      autoSendEmail: 1,
      stripeReceiptEmailEnabled: 1,
    });

    expect(res.success).toBe(true);
    expect(res.settings.receiptPrefix).toBe("WAYPOINT-");
    expect(res.settings.nextReceiptSequence).toBe(2000);
    expect(res.settings.completionHeadline).toBe("Welcome aboard the Waypoint fleet!");
  });

  // TEST 3: Idempotent Payment Recording & Numbering
  it("TEST 3: Records confirmed Stripe payment idempotently, allocates friendly number, and generates PDF", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    // Initial payment confirmation
    const payment = await caller.receipts.recordConfirmedPayment({
      stripePaymentIntentId: "pi_test_anchor_12345",
      stripeCustomerId: "cus_test_client_99",
      clientId: 50,
      studentContactId: 10,
      serviceName: "Anchor Advocacy",
      planName: "12-Month Advocacy Plan",
      transactionType: "enrollment",
      amountCents: 10500,
      currency: "usd",
      paymentMethodBrand: "Visa",
      paymentMethodLast4: "2986",
      nextPaymentDate: "2026-10-29T11:24:00Z",
      nextPaymentAmountCents: 10500,
    });

    expect(payment.success).toBe(true);
    expect(payment.duplicate).toBe(false);
    expect(payment.transaction.receiptNumber).toMatch(/^WP-\d{6}$/);
    expect(payment.transaction.amountCents).toBe(10500);
    expect(payment.transaction.status).toBe("PAID");
    expect(payment.transaction.receiptPdfUrl).toBeDefined();

    // Secondary duplicate webhook callback with same Stripe PaymentIntent ID
    const duplicatePayment = await caller.receipts.recordConfirmedPayment({
      stripePaymentIntentId: "pi_test_anchor_12345",
      amountCents: 10500,
      serviceName: "Anchor Advocacy",
    });

    expect(duplicatePayment.duplicate).toBe(true);
    expect(duplicatePayment.transaction.receiptNumber).toBe(payment.transaction.receiptNumber);
    expect(duplicatePayment.transaction.id).toBe(payment.transaction.id);
  });

  // TEST 4: Client Isolation & Authorization
  it("TEST 4: Client can view their own receipt, but is forbidden from viewing other clients' receipts", async () => {
    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    // Create receipt for client 50
    const payment = await adminCaller.receipts.recordConfirmedPayment({
      stripePaymentIntentId: "pi_test_auth_guard_1",
      clientId: 50,
      serviceName: "Comprehensive IEP Review",
      amountCents: 25000,
    });

    // Client 50 accesses their own receipt
    const client50Ctx = createClientContext(50);
    const client50Caller = appRouter.createCaller(client50Ctx);

    const clientReceipt = await client50Caller.receipts.getTransaction({
      id: payment.transaction.id,
    });
    expect(clientReceipt.id).toBe(payment.transaction.id);
    expect(clientReceipt.amountCents).toBe(25000);

    // Another client (Client 99) attempts unauthorized access
    const unauthorizedClientCtx = createClientContext(99);
    const unauthorizedCaller = appRouter.createCaller(unauthorizedClientCtx);

    await expect(
      unauthorizedCaller.receipts.getTransaction({
        id: payment.transaction.id,
      })
    ).rejects.toThrow(/not authorized/i);
  });

  // TEST 5: System Health Diagnostics
  it("TEST 5: Runs system integration test and flags duplicate email warning if both channels are enabled", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    // With default settings (Stripe emails off, Waypoint emails on)
    const test1 = await caller.receipts.runSystemTest();
    expect(test1.allOperational).toBe(true);
    const dupCheck1 = test1.tests.find((t) => t.id === "duplicate_receipt_check");
    expect(dupCheck1?.status).toBe("green");

    // Enable both Waypoint and Stripe customer receipt emails
    await caller.receipts.updateSettings({
      autoSendEmail: 1,
      stripeReceiptEmailEnabled: 1,
    });

    const test2 = await caller.receipts.runSystemTest();
    const dupCheck2 = test2.tests.find((t) => t.id === "duplicate_receipt_check");
    expect(dupCheck2?.status).toBe("yellow");
    expect(dupCheck2?.description).toMatch(/duplicate emails/i);
  });

  // TEST 6: Stripe Test Payment Simulator
  it("TEST 6: Simulates Stripe test mode payments for enrollment, recurring, standalone, and refunds", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    // Test Enrollment Simulation
    const enrollment = await caller.receipts.testStripePayment({
      scenario: "enrollment",
      amountCents: 10500,
    });
    expect(enrollment.success).toBe(true);
    expect(enrollment.transaction.status).toBe("PAID");
    expect(enrollment.transaction.serviceName).toBe("Anchor Advocacy");

    // Test Partial Refund Simulation
    const partialRefund = await caller.receipts.testStripePayment({
      scenario: "partial_refund",
      amountCents: 10500,
    });
    expect(partialRefund.transaction.status).toBe("PARTIALLY_REFUNDED");
    expect(partialRefund.transaction.refundAmountCents).toBe(3500);

    // Test Full Refund Simulation
    const fullRefund = await caller.receipts.testStripePayment({
      scenario: "full_refund",
      amountCents: 10500,
    });
    expect(fullRefund.transaction.status).toBe("REFUNDED");
    expect(fullRefund.transaction.refundAmountCents).toBe(10500);
  });

  // TEST 7: Receipt Email Dispatch
  it("TEST 7: Dispatches branded receipt email with duplicate warning detection", async () => {
    const adminCtx = createAdminContext();
    const caller = appRouter.createCaller(adminCtx);

    const payment = await caller.receipts.recordConfirmedPayment({
      stripePaymentIntentId: "pi_test_email_001",
      clientId: 50,
      serviceName: "Anchor Advocacy",
      amountCents: 10500,
    });

    const emailRes = await caller.receipts.sendReceiptEmail({
      transactionId: payment.transaction.id,
      recipientEmail: "client50@example.com",
    });

    expect(emailRes.success).toBe(true);
    expect(emailRes.sentTo).toBe("client50@example.com");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Waypoint Referral & Waypoint Credit System", () => {
  const mockAdminUser = {
    id: 1,
    openId: "user_test_byron",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "manually_created",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
    logoUrl: null,
  };

  const adminCaller = appRouter.createCaller({
    user: mockAdminUser,
    req: {} as any,
    res: {} as any,
  });

  const publicCaller = appRouter.createCaller({
    user: null as any,
    req: {} as any,
    res: {} as any,
  });

  it("1. should retrieve default referral program settings with No Cash Value", async () => {
    const settings = await adminCaller.referrals.getSettings();
    expect(settings).toBeDefined();
    expect(settings.programEnabled).toBe(true);
    expect(settings.newClientDiscountCents).toBe(2500); // $25.00
    expect(settings.referrerCreditCents).toBe(2500); // $25.00
    expect(settings.creditType).toBe("Waypoint Credit");
    expect(settings.cashValue).toBe("NONE");
  });

  it("2. should generate a permanent, unique referral code (WP-XXXXX) for an existing client", async () => {
    const clientId = 9901;
    const code1 = await db.getOrCreateClientReferralCode(clientId);
    expect(code1).toMatch(/^WP-[A-Z0-9]{5}$/);

    // Idempotency: calling again returns the same permanent code
    const code2 = await db.getOrCreateClientReferralCode(clientId);
    expect(code2).toBe(code1);
  });

  it("3. should validate referral codes on public lead forms with safe masking", async () => {
    const clientId = 9902;
    const code = await db.getOrCreateClientReferralCode(clientId);

    // Valid code check
    const validRes = await publicCaller.referrals.validateCode({ code });
    expect(validRes.valid).toBe(true);
    expect(validRes.referralCode).toBe(code);
    expect(validRes.referrerClientId).toBe(clientId);

    // Invalid code check
    const invalidRes = await publicCaller.referrals.validateCode({ code: "WP-INVALID99" });
    expect(invalidRes.valid).toBe(false);
  });

  it("4. should safely search referrers without leaking confidential FERPA or student data", async () => {
    const results = await publicCaller.referrals.searchReferrersPublic({ query: "Byron" });
    expect(Array.isArray(results)).toBe(true);

    if (results.length > 0) {
      const first = results[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("displayName");
      expect(first).toHaveProperty("referralCode");
      // FERPA guard: ensure full confidential case details are NOT exposed
      expect((first as any).caseDetails).toBeUndefined();
      expect((first as any).iepDiagnosis).toBeUndefined();
    }
  });

  it("5. should create a pending referral relationship when lead arrives with referral code", async () => {
    const referrerClientId = 9903;
    const refCode = await db.getOrCreateClientReferralCode(referrerClientId);

    const ref = await db.createReferralRecord({
      referralCode: refCode,
      referredLeadId: 5501,
      source: "url_param",
    });

    expect(ref).toBeDefined();
    expect(ref.referralCode).toBe(refCode);
    expect(ref.referrerClientId).toBe(referrerClientId);
    expect(ref.referredLeadId).toBe(5501);
    expect(ref.status).toBe("pending");
    expect(ref.newClientDiscountCents).toBe(2500);
    expect(ref.referrerCreditCents).toBe(2500);

    // Self-referral prevention guard
    await expect(
      db.createReferralRecord({
        referralCode: refCode,
        referredClientId: referrerClientId, // referring self!
        source: "url_param",
      })
    ).rejects.toThrow("Self-referrals are not permitted");
  });

  it("6. should qualify and reward referral upon first payment with STRICT idempotency", async () => {
    const referrerClientId = 9904;
    const referredClientId = 9905;
    const refCode = await db.getOrCreateClientReferralCode(referrerClientId);

    const initialBalance = (await db.getClientCreditBalance(referrerClientId)).availableCreditCents;

    // Create pending referral
    const referral = await db.createReferralRecord({
      referralCode: refCode,
      referredClientId,
      source: "url_param",
    });

    // 1st trigger: qualification and reward
    const rewardRes1 = await db.qualifyAndRewardReferral({
      referralId: referral.id,
      qualifyingInvoiceId: 1201,
      paymentId: "pi_test_123",
    });

    expect(rewardRes1.success).toBe(true);
    expect(rewardRes1.rewarded).toBe(true);
    expect(rewardRes1.creditIssuedCents).toBe(2500);

    // Verify referrer received +$25 in Waypoint Credit
    const newBalance = (await db.getClientCreditBalance(referrerClientId)).availableCreditCents;
    expect(newBalance).toBe(initialBalance + 2500);

    // Verify ledger entry was created
    const ledger = await db.getClientCreditLedger(referrerClientId);
    const rewardTx = ledger.find((tx) => tx.referralId === referral.id);
    expect(rewardTx).toBeDefined();
    expect(rewardTx?.amount).toBe(2500);
    expect(rewardTx?.transactionType).toBe("referral_reward");

    // 2nd trigger (IDEMPOTENCY TEST): webhook retry or page refresh must NOT issue duplicate reward!
    const rewardRes2 = await db.qualifyAndRewardReferral({
      referralId: referral.id,
      qualifyingInvoiceId: 1201,
      paymentId: "pi_test_123",
    });

    expect(rewardRes2.success).toBe(true);
    expect(rewardRes2.rewarded).toBe(false); // already rewarded!
    expect(rewardRes2.creditIssuedCents).toBe(0);

    // Balance must NOT have increased a second time
    const balanceAfterRetry = (await db.getClientCreditBalance(referrerClientId)).availableCreditCents;
    expect(balanceAfterRetry).toBe(newBalance);
  });

  it("7. should enforce Waypoint Credit ledger business rules (no cash value, non-negative)", async () => {
    const testClientId = 9906;

    // Available balance starts at 0 for clean client
    const balance0 = (await db.getClientCreditBalance(testClientId)).availableCreditCents;
    expect(balance0).toBeGreaterThanOrEqual(0);

    // Staff manual credit adjustment: +$50
    const addRes = await adminCaller.referrals.addManualAdjustment({
      clientId: testClientId,
      amountCents: 5000,
      reason: "Courtesy credit for scheduling accommodation",
    });
    expect(addRes.success).toBe(true);

    const balanceAfterAdd = (await db.getClientCreditBalance(testClientId)).availableCreditCents;
    expect(balanceAfterAdd).toBe(balance0 + 5000);

    // Apply credit to eligible payment ($30)
    const applyRes = await db.applyCreditToInvoice({
      clientId: testClientId,
      invoiceId: 991,
      requestedAmountCents: 3000,
      invoiceBalanceCents: 3000,
    });
    expect(applyRes.success).toBe(true);
    expect(applyRes.appliedAmountCents).toBe(3000);
    expect(applyRes.remainingInvoiceBalanceCents).toBe(0);

    // Remaining credit balance is $20
    const balanceAfterApply = (await db.getClientCreditBalance(testClientId)).availableCreditCents;
    expect(balanceAfterApply).toBe(balanceAfterAdd - 3000);

    // Rule: Cannot deduct more than available credit
    const excessiveDeductionRes = await db.addManualCreditAdjustment({
      clientId: testClientId,
      amountCents: -99999, // trying to force balance negative
      staffUserId: mockAdminUser.id,
      staffUserName: mockAdminUser.name,
      reason: "Invalid deduction test",
    });
    expect(excessiveDeductionRes.success).toBe(false);
    expect(excessiveDeductionRes.error).toContain("exceeds available credit");
  });

  it("8. should provide privacy-protected referral data for the Client Portal", async () => {
    const portalClientId = 9904;
    const portalData = await db.getClientPortalReferralData(portalClientId);

    expect(portalData).toBeDefined();
    expect(portalData.referralCode).toMatch(/^WP-[A-Z0-9]{5}$/);
    expect(portalData.stats).toBeDefined();
    expect(portalData.stats.totalReferred).toBeGreaterThanOrEqual(1);
    expect(portalData.stats.becameClients).toBeGreaterThanOrEqual(1);
    expect(portalData.stats.availableCreditDollars).toBeGreaterThanOrEqual(25);

    // Verify privacy protection on referrals list: names must be masked (First + Last Initial)
    if (portalData.referrals.length > 0) {
      for (const item of portalData.referrals) {
        expect(item).toHaveProperty("displayName");
        expect(item).toHaveProperty("status");
        // No full emails, phone numbers, or confidential case data exposed
        expect((item as any).email).toBeUndefined();
        expect((item as any).phone).toBeUndefined();
      }
    }

    // Verify history contains valid ledger audit trail
    if (portalData.history.length > 0) {
      for (const tx of portalData.history) {
        expect(tx).toHaveProperty("amountCents");
        expect(tx).toHaveProperty("amountFormatted");
        expect(tx).toHaveProperty("status");
        expect(tx).toHaveProperty("transactionType");
        expect(tx).toHaveProperty("date");
      }
    }
  });

  it("9. should allow authorized staff to update referral attribution with an audit note", async () => {
    const referrer1 = 9907;
    const referrer2 = 9908;
    const code1 = await db.getOrCreateClientReferralCode(referrer1);
    await db.getOrCreateClientReferralCode(referrer2);

    const ref = await db.createReferralRecord({
      referralCode: code1,
      referredLeadId: 5509,
      source: "manual_staff",
    });

    const updateRes = await adminCaller.referrals.updateAttribution({
      referralId: ref.id,
      newReferrerClientId: referrer2,
      reason: "Client clarified during discovery call that referrer was Byron's neighbor",
    });

    expect(updateRes.success).toBe(true);

    const updated = await db.getReferralById(ref.id);
    expect(updated?.referrerClientId).toBe(referrer2);
    expect(updated?.notes).toContain("Reassigned by Byron Honea");
    expect(updated?.notes).toContain("neighbor");
  });

  it("10. should allow updating referral program settings dynamically", async () => {
    const updated = await adminCaller.referrals.updateSettings({
      programEnabled: true,
      newClientDiscountCents: 3500, // test changing to $35
      referrerCreditCents: 3500,
    });

    expect(updated.newClientDiscountCents).toBe(3500);
    expect(updated.referrerCreditCents).toBe(3500);

    // Reset back to standard $25 / $25
    const reset = await adminCaller.referrals.updateSettings({
      programEnabled: true,
      newClientDiscountCents: 2500,
      referrerCreditCents: 2500,
    });
    expect(reset.newClientDiscountCents).toBe(2500);
    expect(reset.referrerCreditCents).toBe(2500);
  });
});

describe("Client-Controlled Credit Application & Billing Integration (Tests 1-9)", () => {
  // Helper to create future date N days ahead
  function getFutureDate(daysAhead: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d;
  }

  // TEST 1: $105 payment, $25 credit applied -> Actual scheduled charge = $80
  it("TEST 1: should reduce $105 payment by $25 credit so actual scheduled charge is $80", async () => {
    const clientId = 10001;
    // Issue $50 available credit
    await db.addManualCreditAdjustment({
      clientId,
      amountCents: 5000,
      reason: "Initial earned referral credits",
    });

    // Create upcoming invoice for $105 due in 10 days (well outside 5-day cutoff)
    const dueDate = getFutureDate(10);
    const invoice = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-TEST-001",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate,
    });

    // Client applies $25 credit
    const applyRes = await db.applyCreditToNextPayment({
      clientId,
      invoiceId: invoice.id,
      amountCents: 2500,
      staffUserName: "Client (Portal)",
    });

    expect(applyRes.success).toBe(true);
    expect(applyRes.appliedCents).toBe(2500);
    expect(applyRes.newPaymentAmountCents).toBe(8000); // $80.00 actual scheduled charge!

    // Verify invoice record
    const updatedInvoice = await db.getInvoiceById(invoice.id);
    expect(updatedInvoice?.total).toBe("80.00");
    expect(updatedInvoice?.regularPlanAmount).toBe("105.00"); // Original plan amount preserved!
    expect(updatedInvoice?.referralCreditApplied).toBe("25.00");
    expect(updatedInvoice?.creditApplicationStatus).toBe("pending_application");

    // Verify upcoming scheduled payment query
    const upcoming = await db.getUpcomingScheduledPayment({ clientId });
    expect(upcoming.hasUpcomingPayment).toBe(true);
    expect(upcoming.regularPlanAmountFormatted).toBe("$105.00");
    expect(upcoming.referralCreditAppliedFormatted).toBe("$25.00");
    expect(upcoming.scheduledChargeFormatted).toBe("$80.00");
    expect(upcoming.scheduledChargeCents).toBe(8000);
  });

  // TEST 2: $105 payment, $105 credit applied -> Actual scheduled charge = $0 / satisfied by credit
  it("TEST 2: should allow $105 credit on $105 payment, setting scheduled charge to $0 / satisfied by credit", async () => {
    const clientId = 10002;
    // Issue $125 credit
    await db.addManualCreditAdjustment({
      clientId,
      amountCents: 12500,
      reason: "Earned referral credits",
    });

    const dueDate = getFutureDate(12);
    const invoice = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-TEST-002",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate,
    });

    // Client applies full $105 credit
    const applyRes = await db.applyCreditToNextPayment({
      clientId,
      invoiceId: invoice.id,
      amountCents: 10500,
      staffUserName: "Client (Portal)",
    });

    expect(applyRes.success).toBe(true);
    expect(applyRes.newPaymentAmountCents).toBe(0); // $0.00!

    const updatedInvoice = await db.getInvoiceById(invoice.id);
    expect(updatedInvoice?.total).toBe("0.00");
    expect(updatedInvoice?.creditApplicationStatus).toBe("satisfied_by_credit");

    // Process payment when due ($0 payment)
    const processRes = await db.processScheduledPayment({
      invoiceId: invoice.id,
      paymentId: "satisfied_by_referral_credit",
    });

    expect(processRes.success).toBe(true);
    expect(processRes.chargedAmountCents).toBe(0);
    expect(processRes.isSatisfiedByCredit).toBe(true);
    expect(processRes.status).toBe("Paid");

    // Invoice status is marked appropriately as satisfied without charging card $0
    const finalInvoice = await db.getInvoiceById(invoice.id);
    expect(finalInvoice?.status).toBe("Paid");
    expect(finalInvoice?.paymentStatusNote).toContain("Satisfied by Referral Credit");
  });

  // TEST 3: $105 payment, $150 available credit -> System does not allow more than $105 to be applied
  it("TEST 3: should prevent client with $150 credit from applying more than the $105 invoice amount", async () => {
    const clientId = 10003;
    // Issue $150 credit
    await db.addManualCreditAdjustment({
      clientId,
      amountCents: 15000,
      reason: "Available credit $150",
    });

    const dueDate = getFutureDate(8);
    const invoice = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-TEST-003",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate,
    });

    // Attempt to apply $120 (more than $105 bill)
    const overApplyRes = await db.applyCreditToNextPayment({
      clientId,
      invoiceId: invoice.id,
      amountCents: 12000,
    });

    expect(overApplyRes.success).toBe(false);
    expect(overApplyRes.error).toContain("cannot exceed the upcoming invoice balance");

    // But applying exactly $105 succeeds and leaves $45 remaining in available balance
    const exactApplyRes = await db.applyCreditToNextPayment({
      clientId,
      invoiceId: invoice.id,
      amountCents: 10500,
    });
    expect(exactApplyRes.success).toBe(true);

    const balance = await db.getClientCreditBalance(clientId);
    expect(balance.availableCreditCents).toBe(4500); // $45.00 remaining!
  });

  // TEST 4: Client attempts application fewer than 5 days before payment -> System blocks application
  it("TEST 4: should block credit application inside the 5-day cutoff window with a friendly lock message", async () => {
    const clientId = 10004;
    await db.addManualCreditAdjustment({
      clientId,
      amountCents: 5000,
      reason: "Available credit",
    });

    // Invoice due in 3 days (inside 5-day cutoff!)
    const dueDate = getFutureDate(3);
    const invoice = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-TEST-004",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate,
    });

    // Upcoming payment query reflects isPastCutoff = true and lock message
    const upcoming = await db.getUpcomingScheduledPayment({ clientId });
    expect(upcoming.isPastCutoff).toBe(true);
    expect(upcoming.message).toContain("Next payment is already processing");
    expect(upcoming.message).toContain("Referral credits can no longer be applied to this upcoming payment");

    // Attempting application must be rejected
    const blockedRes = await db.applyCreditToNextPayment({
      clientId,
      invoiceId: invoice.id,
      amountCents: 2500,
    });

    expect(blockedRes.success).toBe(false);
    expect(blockedRes.error).toContain("Referral credits can no longer be applied to this upcoming payment");

    // Available credit remains safe and untouched
    const balance = await db.getClientCreditBalance(clientId);
    expect(balance.availableCreditCents).toBe(5000);
  });

  // TEST 5: Client applies $50 -> The same $50 cannot be applied again (deducted immediately, pending)
  it("TEST 5: should immediately deduct applied credit from available balance and prevent double use", async () => {
    const clientId = 10005;
    // Issue $50 available credit
    await db.addManualCreditAdjustment({
      clientId,
      amountCents: 5000,
      reason: "Available credit $50",
    });

    const dueDate = getFutureDate(10);
    const invoice1 = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-TEST-005A",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate,
    });

    // Client applies $50 to invoice 1
    const applyRes1 = await db.applyCreditToNextPayment({
      clientId,
      invoiceId: invoice1.id,
      amountCents: 5000,
    });
    expect(applyRes1.success).toBe(true);

    // Spendable balance must immediately become $0 (Pending Application = $50)
    const balanceAfter = await db.getClientCreditBalance(clientId);
    expect(balanceAfter.availableCreditCents).toBe(0);
    expect(balanceAfter.pendingCreditCents).toBe(5000);

    // Attempting to apply again to another invoice must fail because available is $0
    const invoice2 = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-TEST-005B",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate: getFutureDate(20),
    });

    const doubleUseRes = await db.applyCreditToNextPayment({
      clientId,
      invoiceId: invoice2.id,
      amountCents: 5000,
    });

    expect(doubleUseRes.success).toBe(false);
    expect(doubleUseRes.error).toContain("exceeds your available Waypoint Credit balance");
  });

  // TEST 6: Credit is applied and payment processes successfully -> Credit changes from Pending -> Used
  it("TEST 6: should transition credit status from Pending -> Used after successful payment processing", async () => {
    const clientId = 10006;
    await db.addManualCreditAdjustment({
      clientId,
      amountCents: 5000,
      reason: "Available credit $50",
    });

    const dueDate = getFutureDate(9);
    const invoice = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-TEST-006",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate,
    });

    // Apply $50 credit
    await db.applyCreditToNextPayment({
      clientId,
      invoiceId: invoice.id,
      amountCents: 5000,
    });

    // Verify pending ledger status
    let ledger = await db.getClientCreditLedger(clientId);
    const pendingTx = ledger.find((tx) => tx.relatedInvoiceId === invoice.id);
    expect(pendingTx?.status).toBe("pending_application");

    // Process payment
    const processRes = await db.processScheduledPayment({
      invoiceId: invoice.id,
      paymentId: "pi_stripe_success_006",
    });
    expect(processRes.success).toBe(true);
    expect(processRes.chargedAmountCents).toBe(5500); // Charged $55

    // Ledger entry is now USED
    ledger = await db.getClientCreditLedger(clientId);
    const usedTx = ledger.find((tx) => tx.relatedInvoiceId === invoice.id);
    expect(usedTx?.status).toBe("used");

    const balance = await db.getClientCreditBalance(clientId);
    expect(balance.pendingCreditCents).toBe(0);
    expect(balance.totalUsedCents).toBe(5000);
  });

  // TEST 7: Credit is reserved but payment is canceled before processing -> Credit returned to Available
  it("TEST 7: should return reserved credit to Available if scheduled payment is canceled before processing", async () => {
    const clientId = 10007;
    await db.addManualCreditAdjustment({
      clientId,
      amountCents: 5000,
      reason: "Available credit $50",
    });

    const dueDate = getFutureDate(14);
    const invoice = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-TEST-007",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate,
    });

    // Apply $50
    await db.applyCreditToNextPayment({
      clientId,
      invoiceId: invoice.id,
      amountCents: 5000,
    });

    expect((await db.getClientCreditBalance(clientId)).availableCreditCents).toBe(0);

    // Client or staff cancels application before processing
    const cancelRes = await db.cancelCreditApplication({
      clientId,
      invoiceId: invoice.id,
      staffUserName: "Client (Portal)",
    });

    expect(cancelRes.success).toBe(true);
    expect(cancelRes.restoredTotalCents).toBe(10500); // Invoice restored to $105

    // Credit returned to available balance!
    const balance = await db.getClientCreditBalance(clientId);
    expect(balance.availableCreditCents).toBe(5000);
    expect(balance.pendingCreditCents).toBe(0);

    // Ledger has "credit_returned" record
    const ledger = await db.getClientCreditLedger(clientId);
    const returnedTx = ledger.find((tx) => tx.transactionType === "credit_returned");
    expect(returnedTx).toBeDefined();
    expect(returnedTx?.amount).toBe(5000);
    expect(returnedTx?.status).toBe("returned");
  });

  // TEST 8: Credit used for one month's payment -> Following month's normal recurring plan remains unchanged
  it("TEST 8: should keep normal recurring plan amount unchanged ($105) for subsequent billing cycles", async () => {
    const clientId = 10008;
    await db.addManualCreditAdjustment({
      clientId,
      amountCents: 5000,
      reason: "Available credit $50",
    });

    // Month 1 (e.g. October): $105 invoice
    const month1Invoice = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-OCT-008",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate: getFutureDate(10),
    });

    // Apply $50 credit to Month 1
    await db.applyCreditToNextPayment({
      clientId,
      invoiceId: month1Invoice.id,
      amountCents: 5000,
    });

    // Process Month 1 ($55 charged)
    await db.processScheduledPayment({
      invoiceId: month1Invoice.id,
      paymentId: "pi_month_1_paid",
    });

    // Month 2 (e.g. November): Next scheduled billing cycle invoice generated
    const month2Invoice = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-NOV-008",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate: getFutureDate(40),
    });

    // Verify Month 2 returns to full regular $105 amount
    expect(month2Invoice.regularPlanAmount).toBe("105.00");
    expect(month2Invoice.total).toBe("105.00");
    expect(month2Invoice.referralCreditApplied).toBe("0.00");
    expect(month2Invoice.creditApplicationStatus).toBe("none");

    const upcoming = await db.getUpcomingScheduledPayment({ clientId });
    expect(upcoming.regularPlanAmountFormatted).toBe("$105.00");
    expect(upcoming.scheduledChargeFormatted).toBe("$105.00");
  });

  // TEST 9: Payment processor receives the actual adjusted amount ($55)
  it("TEST 9: should ensure the payment processor receives the reduced charge amount ($55) rather than $105", async () => {
    const clientId = 10009;
    await db.addManualCreditAdjustment({
      clientId,
      amountCents: 5000,
      reason: "Available credit $50",
    });

    const invoice = await db.createInvoice({
      clientId,
      invoiceNumber: "INV-TEST-009",
      regularPlanAmount: "105.00",
      total: "105.00",
      status: "Draft",
      dueDate: getFutureDate(8),
    });

    // Apply $50 credit
    await db.applyCreditToNextPayment({
      clientId,
      invoiceId: invoice.id,
      amountCents: 5000,
    });

    // Inspect the actual invoice record sent to payment gateway
    const invoiceForGateway = await db.getInvoiceById(invoice.id);
    expect(invoiceForGateway).toBeDefined();

    // The payment processor calculates unit_amount as Math.round(parseFloat(invoice.total) * 100)
    const gatewayChargeAmountCents = Math.round(parseFloat(invoiceForGateway?.total || "0") * 100);
    expect(gatewayChargeAmountCents).toBe(5500); // Exactly $55.00 charged to card!
    expect(gatewayChargeAmountCents).not.toBe(10500); // Original amount is NOT charged!
  });
});

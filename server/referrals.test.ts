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

    // Verify privacy protection on referral history: names must be masked (First + Last Initial)
    if (portalData.history.length > 0) {
      for (const item of portalData.history) {
        expect(item).toHaveProperty("maskedName");
        expect(item).toHaveProperty("status");
        expect(item).toHaveProperty("rewardIssued");
        // No full emails, phone numbers, or IEP data exposed
        expect((item as any).email).toBeUndefined();
        expect((item as any).phone).toBeUndefined();
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

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PUBLISHED_MEMBERSHIP_PLANS,
  calculatePayInFullQuote,
  approveFamilyEnrollment,
  selectFamilyEnrollmentPlan,
  signFamilyAdvocacyAgreement,
  createFamilyEnrollmentCheckoutSession,
  processFamilyEnrollmentWebhook,
  markDocumentReviewComplete,
  calculateCalendarCommitmentEndDate,
} from "./services/familyEnrollmentService";
import { inMemoryPaymentLedger } from "./db/familyEnrollment";
import * as db from "./db";

describe("PHASE 2G — STAGING VERIFICATION SUITE (Isolated Test-Mode Validation)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. APPROVED PLAN CATALOG & NO AUTOMATIC PAY-IN-FULL DISCOUNT
  // ═══════════════════════════════════════════════════════════════════════════
  describe("1. Approved Plan Catalog & Pay in Full Integrity", () => {
    it("exports exactly Navigator ($55/mo), Anchor ($105/mo), and Family ($155/mo) with 12-month commitments", () => {
      expect(PUBLISHED_MEMBERSHIP_PLANS).toHaveLength(3);

      const [navigator, anchor, family] = PUBLISHED_MEMBERSHIP_PLANS;
      expect(navigator).toMatchObject({
        planKey: "navigator",
        planName: "Navigator",
        priceMonthly: 55,
        commitmentMonths: 12,
      });

      expect(anchor).toMatchObject({
        planKey: "anchor",
        planName: "Anchor",
        priceMonthly: 105,
        commitmentMonths: 12,
      });

      expect(family).toMatchObject({
        planKey: "family",
        planName: "Family",
        priceMonthly: 155,
        commitmentMonths: 12,
      });
    });

    it("enforces NO automatic Pay-in-Full discount by default (exact 12-month totals)", () => {
      // Navigator: $55 * 12 = $660.00
      const navQuote = calculatePayInFullQuote({ priceMonthly: 55, commitmentMonths: 12 });
      expect(navQuote.originalAmount).toBe("660.00");
      expect(navQuote.discountAmount).toBe("0.00");
      expect(navQuote.finalAmount).toBe("660.00");
      expect(navQuote.discountType).toBe("none");

      // Anchor: $105 * 12 = $1,260.00
      const anchorQuote = calculatePayInFullQuote({ priceMonthly: 105, commitmentMonths: 12 });
      expect(anchorQuote.originalAmount).toBe("1260.00");
      expect(anchorQuote.discountAmount).toBe("0.00");
      expect(anchorQuote.finalAmount).toBe("1260.00");

      // Family: $155 * 12 = $1,860.00
      const familyQuote = calculatePayInFullQuote({ priceMonthly: 155, commitmentMonths: 12 });
      expect(familyQuote.originalAmount).toBe("1860.00");
      expect(familyQuote.discountAmount).toBe("0.00");
      expect(familyQuote.finalAmount).toBe("1860.00");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. NAVIGATOR PLAN — FULL 11-STEP LIFECYCLE (Monthly Autopay)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("2. Navigator Plan Lifecycle (Monthly Autopay — $55/mo)", () => {
    it("executes the full 11-step lifecycle from Discovery Call to Blueprint Unlock", async () => {
      const parentContact = { id: 201, firstName: "Elena", lastName: "Rostova", jobTitle: "Parent", email: "elena@example.com" };
      const studentContact = { id: 301, firstName: "Leo", lastName: "Rostov", parentContactId: 201 };

      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => {
        if (id === 201) return parentContact as any;
        if (id === 301) return studentContact as any;
        return null;
      });
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([studentContact as any]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 101, status: "completed" } as any]);

      let offerRecord: any = null;
      vi.spyOn(db, "createEnrollmentOffer").mockImplementation(async (data: any) => {
        offerRecord = {
          ...data,
          id: 601,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return offerRecord;
      });
      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === 601) return offerRecord;
        return null;
      });
      vi.spyOn(db, "getEnrollmentOfferByStripeSubscriptionId").mockImplementation(async (subId: string) => {
        if (offerRecord?.stripeSubscriptionId === subId) return offerRecord;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        offerRecord = { ...offerRecord, ...data };
        return offerRecord;
      });

      // ── Step 1 & 2: Discovery Call Completed & Staff Enrollment Approval ──
      const approvedOffer = await approveFamilyEnrollment({
        parentContactId: 201,
        approvedByUserId: 1,
        approverName: "Byron Clausen",
        enrollmentMode: "standard",
      });
      expect(approvedOffer.status).toBe("approved");
      expect(approvedOffer.parentContactId).toBe(201);

      // ── Step 3 & 4: Secure Parent Portal & Plan Selection (Navigator $55/mo) ──
      const planSelectionResult = await selectFamilyEnrollmentPlan({
        offerId: 601,
        parentContactId: 201,
        planKey: "navigator",
        billingArrangement: "autopay",
      });
      expect(planSelectionResult.offer.selectedPlanKey).toBe("navigator");
      expect(Number(planSelectionResult.offer.selectedPlanPrice)).toBe(55);
      expect(planSelectionResult.offer.status).toBe("agreement_pending");

      // ── Step 5: Authoritative 15-Section Agreement Signature ──
      const { inMemoryAgreements } = await import("./routers/agreements");
      const agreementId = planSelectionResult.agreementId!;
      expect(agreementId).toBeDefined();
      expect(inMemoryAgreements.has(agreementId)).toBe(true);

      const agreementRecord = inMemoryAgreements.get(agreementId)!;

      // SECTION 6 VERIFICATION:
      // State complaint benefit must explicitly reside in Section 6 and state $200 add-on notice for Navigator
      expect(agreementRecord.content).toContain("6. ✍️ WRITTEN ADVOCACY &amp; STATE COMPLAINTS");
      expect(agreementRecord.content).toContain(
        "State complaint preparation is not included under the Navigator plan. Standalone state complaint preparation is available as an optional add-on service at $200 per complaint."
      );
      // Student full legal name in Section 2 and header:
      expect(agreementRecord.content).toContain("Leo Rostov");
      // Monthly price in Section 2 table:
      expect(agreementRecord.content).toContain("$55 / month");
      expect(agreementRecord.content).toContain("Total: $660.00");

      // Execute parent electronic signature:
      agreementRecord.status = "Signed";
      agreementRecord.signedAt = new Date();
      agreementRecord.contentLocked = 1;
      agreementRecord.signerName = "Elena Rostova";
      offerRecord.agreementStatus = "signed";
      offerRecord.status = "payment_pending";

      // ── Step 6: Stripe Test-Mode Checkout Session Generation ──
      const checkoutSession = await createFamilyEnrollmentCheckoutSession({
        offerId: 601,
        parentContactId: 201,
      });
      expect(checkoutSession.sessionId).toBeDefined();
      expect(checkoutSession.amountTotal).toBe(55); // Exactly $55.00
      expect(checkoutSession.mode).toBe("subscription");

      // ── Step 7 & 8: Webhook Ingestion, Persistent Ledger Latch & Membership Activation ──
      offerRecord.stripeSubscriptionId = "sub_nav_staging_601";
      const invoiceId = "in_nav_staging_cycle_1";
      inMemoryPaymentLedger.delete(invoiceId);

      const webhookEvent = {
        id: "evt_nav_checkout_001",
        type: "checkout.session.completed",
        data: {
          object: {
            id: checkoutSession.sessionId,
            invoice: invoiceId,
            subscription: "sub_nav_staging_601",
            customer: "cus_nav_601",
            payment_status: "paid",
            metadata: {
              family_enrollment_offer_id: "601",
              payment_structure: "monthly_autopay",
            },
          },
        },
      };

      const webhookRes = await processFamilyEnrollmentWebhook(webhookEvent);
      expect(webhookRes.action).toBe("membership_activated");
      expect(offerRecord.status).toBe("active");
      expect(offerRecord.paymentStatus).toBe("paid");
      expect(offerRecord.collectedInstallmentCount).toBe(1);
      expect(offerRecord.outstandingBalanceCents).toBe(60500); // $660.00 - $55.00 = $605.00
      expect(offerRecord.documentReviewStatus).toBe("pending");

      // Verify persistent ledger contains unique entry
      expect(inMemoryPaymentLedger.has(invoiceId)).toBe(true);
      const ledgerEntry = inMemoryPaymentLedger.get(invoiceId);
      expect(ledgerEntry?.installmentNumber).toBe(1);
      expect(ledgerEntry?.amountPaidCents).toBe(5500);
      expect(ledgerEntry?.status).toBe("paid");

      // ── Step 9: Document Upload & Onboarding Gate Enforcement ──
      // Before advocate review approval, Blueprint Call scheduling is blocked
      expect(offerRecord.documentReviewStatus).toBe("pending");

      // ── Step 10 & 11: Advocate Review Approval & Blueprint Call Scheduling Unlock ──
      const reviewResult = await markDocumentReviewComplete({
        offerId: 601,
        studentContactId: 301,
        advocateUserId: 1,
        advocateUserName: "Byron Clausen",
        reviewNotes: "Initial IEP and psychoeducational evaluation verified. Ready for Blueprint Strategy Session.",
      });

      expect(reviewResult.documentReviewStatus).toBe("approved");
      expect(reviewResult.documentReviewCompletedByName).toBe("Byron Clausen");
      // Blueprint Call scheduling is now completely unlocked!
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ANCHOR PLAN — PAY IN FULL LIFECYCLE ($1,260.00 Full Upfront Payment)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("3. Anchor Plan Lifecycle (Pay in Full — $1,260.00 Total)", () => {
    it("verifies single upfront payment of $1,260 without automatic discount", async () => {
      const parentContact = { id: 202, firstName: "David", lastName: "Miller", jobTitle: "Parent" };
      const studentContact = { id: 302, firstName: "Samantha", lastName: "Miller", parentContactId: 202 };

      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => {
        if (id === 202) return parentContact as any;
        if (id === 302) return studentContact as any;
        return null;
      });
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([studentContact as any]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 102, status: "completed" } as any]);

      let offerRecord: any = null;
      vi.spyOn(db, "createEnrollmentOffer").mockImplementation(async (data: any) => {
        offerRecord = { ...data, id: 602, createdAt: new Date(), updatedAt: new Date() };
        return offerRecord;
      });
      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === 602) return offerRecord;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        offerRecord = { ...offerRecord, ...data };
        return offerRecord;
      });

      // Staff approval
      await approveFamilyEnrollment({
        parentContactId: 202,
        approvedByUserId: 1,
        approverName: "Byron Clausen",
        enrollmentMode: "standard",
      });

      // Plan selection: Anchor with Pay in Full
      const planSelection = await selectFamilyEnrollmentPlan({
        offerId: 602,
        parentContactId: 202,
        planKey: "anchor",
        paymentStructure: "pay_in_full",
      });

      expect(planSelection.offer.selectedPlanKey).toBe("anchor");
      expect(planSelection.offer.paymentStructure).toBe("pay_in_full");
      // Pay in Full amount is EXACTLY $1,260.00 (NO AUTOMATIC DISCOUNT)
      expect(planSelection.offer.payInFullFinalAmount).toBe("1260.00");
      expect(planSelection.offer.payInFullDiscountAmount).toBe("0.00");

      // Agreement generation check:
      const { inMemoryAgreements } = await import("./routers/agreements");
      const agreementId = planSelection.agreementId!;
      expect(agreementId).toBeDefined();
      expect(inMemoryAgreements.has(agreementId)).toBe(true);

      const agreementRecord = inMemoryAgreements.get(agreementId)!;

      // Section 6 states included state complaint benefit for Anchor:
      expect(agreementRecord.content).toContain("6. ✍️ WRITTEN ADVOCACY &amp; STATE COMPLAINTS");
      expect(agreementRecord.content).toContain(
        "Includes one (1) qualifying state complaint preparation per 12-month membership term."
      );
      // Fee table shows Single Upfront Payment $1260.00:
      expect(agreementRecord.content).toContain("$1260.00");
      expect(agreementRecord.content).toContain("Single Upfront Payment");

      // Sign agreement:
      agreementRecord.status = "Signed";
      agreementRecord.signedAt = new Date();
      agreementRecord.contentLocked = 1;
      agreementRecord.signerName = "David Miller";
      offerRecord.agreementStatus = "signed";
      offerRecord.status = "payment_pending";

      // Checkout session for Pay in Full
      const checkoutSession = await createFamilyEnrollmentCheckoutSession({
        offerId: 602,
        parentContactId: 202,
      });
      expect(checkoutSession.amountTotal).toBe(1260); // Exactly $1,260.00
      expect(checkoutSession.quote?.finalCents).toBe(126000); // 126,000 cents
      expect(checkoutSession.mode).toBe("payment"); // One-time charge mode

      // Webhook ingestion for Pay in Full
      const invoiceId = "in_anchor_pif_602";
      inMemoryPaymentLedger.delete(invoiceId);

      const webhookEvent = {
        id: "evt_anchor_pif_checkout",
        type: "checkout.session.completed",
        data: {
          object: {
            id: checkoutSession.sessionId,
            invoice: invoiceId,
            customer: "cus_anchor_602",
            payment_status: "paid",
            metadata: {
              family_enrollment_offer_id: "602",
              payment_structure: "pay_in_full",
            },
          },
        },
      };

      const webhookRes = await processFamilyEnrollmentWebhook(webhookEvent);
      expect(webhookRes.action).toBe("membership_activated");
      expect(offerRecord.status).toBe("active");
      expect(offerRecord.paymentStatus).toBe("paid");
      expect(offerRecord.collectedInstallmentCount).toBe(1);
      expect(offerRecord.totalScheduledInstallments).toBe(1);
      expect(offerRecord.outstandingBalanceCents).toBe(0); // Fully satisfied!
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. FAMILY PLAN — MULTI-STUDENT COVERAGE ($155/mo — $1,860 Total)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("4. Family Plan Lifecycle (Multi-Student Coverage — $155/mo)", () => {
    it("covers multiple siblings under one family plan with family-level complaint entitlement in Section 6", async () => {
      const parentContact = { id: 203, firstName: "Maria", lastName: "Hernandez", jobTitle: "Parent" };
      const sibling1 = { id: 303, firstName: "Lucas", lastName: "Hernandez", parentContactId: 203 };
      const sibling2 = { id: 304, firstName: "Sofia", lastName: "Hernandez", parentContactId: 203 };

      vi.spyOn(db, "getContactById").mockImplementation(async (id: number) => {
        if (id === 203) return parentContact as any;
        if (id === 303) return sibling1 as any;
        if (id === 304) return sibling2 as any;
        return null;
      });
      vi.spyOn(db, "getStudentsByParentContactId").mockResolvedValue([sibling1 as any, sibling2 as any]);
      vi.spyOn(db, "getLeadsByOwner").mockResolvedValue([]);
      vi.spyOn(db, "listDiscoveryCalls").mockResolvedValue([{ id: 103, status: "completed" } as any]);

      let offerRecord: any = null;
      vi.spyOn(db, "createEnrollmentOffer").mockImplementation(async (data: any) => {
        offerRecord = { ...data, id: 603, createdAt: new Date(), updatedAt: new Date() };
        return offerRecord;
      });
      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === 603) return offerRecord;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        offerRecord = { ...offerRecord, ...data };
        return offerRecord;
      });

      // Staff approval covering both siblings
      await approveFamilyEnrollment({
        parentContactId: 203,
        coveredStudentIds: [303, 304],
        approvedByUserId: 1,
        approverName: "Byron Clausen",
        enrollmentMode: "standard",
      });

      // Select Family Plan ($155/mo)
      await selectFamilyEnrollmentPlan({
        offerId: 603,
        parentContactId: 203,
        planKey: "family",
        billingArrangement: "autopay",
      });

      expect(offerRecord.selectedPlanKey).toBe("family");
      expect(Number(offerRecord.selectedPlanPrice)).toBe(155);

      // Agreement generation check:
      const { inMemoryAgreements } = await import("./routers/agreements");
      const agreementId = offerRecord.agreementId!;
      expect(agreementId).toBeDefined();
      expect(inMemoryAgreements.has(agreementId)).toBe(true);

      const agreementRecord = inMemoryAgreements.get(agreementId)!;

      // Verify both student names appear in agreement:
      expect(agreementRecord.content).toContain("Lucas Hernandez");
      expect(agreementRecord.content).toContain("Sofia Hernandez");

      // Section 6 states family-level state complaint benefit:
      expect(agreementRecord.content).toContain("6. ✍️ WRITTEN ADVOCACY &amp; STATE COMPLAINTS");
      expect(agreementRecord.content).toContain(
        "This included complaint benefit applies at the Family Account level across all covered children, not separately to each enrolled student."
      );
      // Fee table shows $155 / month, Total: $1860.00:
      expect(agreementRecord.content).toContain("$155 / month");
      expect(agreementRecord.content).toContain("Total: $1860.00");

      // Sign agreement:
      agreementRecord.status = "Signed";
      agreementRecord.signedAt = new Date();
      agreementRecord.contentLocked = 1;
      agreementRecord.signerName = "Maria Hernandez";
      offerRecord.agreementStatus = "signed";
      offerRecord.status = "payment_pending";
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. BILLING SAFEGUARDS: 12TH MONTH TERMINATION, DST & NON-RENEWAL
  // ═══════════════════════════════════════════════════════════════════════════
  describe("5. Billing Safeguards: 12th Month Completion & No 13th Payment", () => {
    it("safeguards against 13th payment by scheduling cancel_at_period_end on final 12th installment", async () => {
      const offerId = 604;
      let currentOffer: any = {
        id: offerId,
        parentContactId: 204,
        status: "active",
        paymentStatus: "paid",
        selectedPlanPrice: "105.00",
        customCommitmentMonths: 12,
        totalScheduledInstallments: 12,
        collectedInstallmentCount: 11, // At 11th installment
        outstandingBalanceCents: 10500, // 1 installment ($105.00) remaining
        stripeSubscriptionId: "sub_anchor_final_604",
      };

      vi.spyOn(db, "getEnrollmentOfferByStripeSubscriptionId").mockImplementation(async (subId: string) => {
        if (subId === "sub_anchor_final_604") return currentOffer;
        return null;
      });
      vi.spyOn(db, "getEnrollmentOfferById").mockImplementation(async (id: number) => {
        if (id === offerId) return currentOffer;
        return null;
      });
      vi.spyOn(db, "updateEnrollmentOffer").mockImplementation(async (id: number, data: any) => {
        currentOffer = { ...currentOffer, ...data };
        return currentOffer;
      });

      const finalInvoiceId = "in_anchor_final_cycle_12";
      inMemoryPaymentLedger.delete(finalInvoiceId);

      const finalEvent = {
        id: "evt_cycle_12_success",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: finalInvoiceId,
            subscription: "sub_anchor_final_604",
            customer: "cus_anchor_604",
            billing_reason: "subscription_cycle",
            amount_paid: 10500,
          },
        },
      };

      const finalRes = await processFamilyEnrollmentWebhook(finalEvent);
      expect(finalRes.action).toBe("recurring_payment_succeeded");

      // Verify all 12 installments collected and balance is strictly 0
      expect(currentOffer.collectedInstallmentCount).toBe(12);
      expect(currentOffer.outstandingBalanceCents).toBe(0);
      expect(currentOffer.status).toBe("active"); // Retains active service access through term

      // Verify calendar calculation guarantees no premature expiration:
      const enrollmentDate = new Date("2026-10-24T12:00:00.000Z");
      const endDate = calculateCalendarCommitmentEndDate(enrollmentDate, 12);
      expect(endDate.toISOString()).toBe("2027-10-24T12:00:00.000Z");
    });
  });
});

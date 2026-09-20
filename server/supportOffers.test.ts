import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import {
  listOffersForStudent,
  getOfferById,
  saveDraftOffer,
  sendOffer,
  updateOfferStatus,
  recordOfferEvent,
  listOfferEvents,
} from "./db/supportOffers";

describe("PG-030 Student Workspace — Client Journey Support Offer Panel", () => {
  const mockAdvocateUser = {
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

  const adminCtx = {
    user: mockAdvocateUser,
    req: {} as any,
    res: {} as any,
  };

  const publicCtx = {
    user: null,
    req: {} as any,
    res: {} as any,
  };

  const adminCaller = appRouter.createCaller(adminCtx);
  const portalCaller = appRouter.createCaller(publicCtx);

  const testStudentId = 88201;
  const testFamilyId = 55101;
  const testParentContactId = 99101;

  it("1. should save an offer as a draft, keeping it invisible to parent until sent", async () => {
    const draft = await adminCaller.supportOffers.saveDraft({
      studentId: testStudentId,
      familyId: testFamilyId,
      parentContactId: testParentContactId,
      sourceType: "library",
      sourceServiceId: 101,
      title: "IEP Document Review & Strategy Session",
      description: "Complete IEP document review with 60-min meeting strategy prep.",
      price: 75000, // $750.00
      currency: "usd",
      deliveryTime: "3 business days",
      includedItems: [
        "Full IEP document review",
        "Accommodation audit",
        "Strategy prep call",
      ],
      planEligibility: "one-time add-on",
      personalNote: "Sarah, this will help Liam get properly supported for next month's meeting.",
      allowDocumentUpload: true,
      requirePayment: true,
      priorityEnabled: true,
      priorityPrice: 15000, // +$150.00
      priorityDeliveryTime: "24 hours",
      priorityDescription: "Expedited rush queue turnaround",
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    });

    expect(draft).toBeDefined();
    expect(draft.id).toBeGreaterThan(0);
    expect(draft.status).toBe("draft");
    expect(draft.price).toBe(75000);
    expect(draft.createdBy).toBe("Byron Honea");

    // Parent should NOT see draft offers in the portal
    const portalActive = await portalCaller.supportOffers.portalGetActive({
      studentId: testStudentId,
    });
    expect(portalActive).toBeNull();

    // Verify audit trail recorded "draft_saved"
    const events = await listOfferEvents(draft.id);
    expect(events.some((e) => e.eventType === "draft_saved")).toBe(true);
  });

  it("2. should allow editing draft fields without mutating master service catalog records", async () => {
    // List offers for this student
    const offers = await adminCaller.supportOffers.listForStudent({
      studentId: testStudentId,
    });
    expect(offers.length).toBeGreaterThan(0);
    const draft = offers[0];

    // Advocate customizes price from $750 to $600 for this specific student
    const updated = await adminCaller.supportOffers.saveDraft({
      id: draft.id,
      studentId: testStudentId,
      familyId: testFamilyId,
      parentContactId: testParentContactId,
      sourceType: "library",
      sourceServiceId: 101,
      title: "IEP Document Review & Strategy Session (Client Courtesy)",
      description: "Customized rate for Liam Jenkins.",
      price: 60000, // $600.00
      currency: "usd",
      deliveryTime: "48 hours",
      includedItems: [
        "Full IEP document review",
        "Accommodation audit",
        "Strategy prep call",
        "Bonus PWN response guide",
      ],
      planEligibility: "one-time add-on",
      allowDocumentUpload: true,
      requirePayment: true,
      priorityEnabled: false,
    });

    expect(updated.price).toBe(60000);
    expect(updated.deliveryTime).toBe("48 hours");
    expect(updated.title).toContain("Client Courtesy");

    // Check that public catalog retains original master pricing
    const catalog = await portalCaller.services.publicCatalog();
    const originalService = catalog.services.find((s) => s.name.includes("IEP Document Review"));
    if (originalService) {
      expect(originalService.price).toBe(75000); // master service unchanged!
    }
  });

  it("3. should send offer to Client Portal, notifying the family and recording events", async () => {
    const offers = await adminCaller.supportOffers.listForStudent({
      studentId: testStudentId,
    });
    const draft = offers[0];

    const sent = await adminCaller.supportOffers.sendOffer({ id: draft.id });
    expect(sent.status).toBe("sent");
    expect(sent.sentBy).toBe("Byron Honea");
    expect(sent.sentAt).toBeDefined();

    // Now parent CAN see active offer in the Parent Portal
    const portalOffer = await portalCaller.supportOffers.portalGetActive({
      studentId: testStudentId,
    });
    expect(portalOffer).toBeDefined();
    expect(portalOffer?.id).toBe(draft.id);
    expect(portalOffer?.title).toContain("Client Courtesy");

    // Audit trail should record "offer_sent" and "parent_notified"
    const events = await listOfferEvents(draft.id);
    expect(events.some((e) => e.eventType === "offer_sent")).toBe(true);
    expect(events.some((e) => e.eventType === "parent_notified")).toBe(true);
  });

  it("4. should handle parent acceptance and immediate Stripe payment with idempotency protection", async () => {
    const portalOffer = await portalCaller.supportOffers.portalGetActive({
      studentId: testStudentId,
    });
    expect(portalOffer).toBeDefined();
    if (!portalOffer) return;

    const idempotencyKey = "idemp_test_key_abc123";

    // Parent submits payment
    const paymentResult = await portalCaller.supportOffers.portalProcessPayment({
      offerId: portalOffer.id,
      selectedPriority: false,
      idempotencyKey,
    });

    expect(paymentResult.success).toBe(true);
    expect(paymentResult.offer?.status).toBe("paid");
    expect(paymentResult.amountCharged).toBe(60000); // $600.00

    // Duplicate submit attempt with same key or already paid state should be idempotent
    const duplicateAttempt = await portalCaller.supportOffers.portalProcessPayment({
      offerId: portalOffer.id,
      selectedPriority: false,
      idempotencyKey,
    });

    expect(duplicateAttempt.success).toBe(true);
    expect(duplicateAttempt.alreadyPaid).toBe(true);

    // Verify final offer status and events
    const finalOffer = await getOfferById(portalOffer.id);
    expect(finalOffer?.status).toBe("paid");
    expect(finalOffer?.paidAt).toBeDefined();

    const events = await listOfferEvents(portalOffer.id);
    expect(events.some((e) => e.eventType === "payment_completed")).toBe(true);
    expect(events.some((e) => e.eventType === "service_started")).toBe(true);
  });

  it("5. should support complimentary / free ($0) offers without requiring Stripe payment", async () => {
    const freeStudentId = 88202;

    // Save a free offer
    const draft = await adminCaller.supportOffers.saveDraft({
      studentId: freeStudentId,
      title: "Complimentary IEP Accommodation Review",
      description: "Courtesy follow-up review for Liam.",
      price: 0,
      currency: "usd",
      deliveryTime: "24 hours",
      planEligibility: "No charge",
      requirePayment: false,
    });

    // Send it
    await adminCaller.supportOffers.sendOffer({ id: draft.id });

    // Parent accepts free offer
    const accepted = await portalCaller.supportOffers.portalAcceptFreeOffer({
      offerId: draft.id,
    });

    expect(accepted.status).toBe("accepted");
    expect(accepted.acceptedAt).toBeDefined();

    const events = await listOfferEvents(draft.id);
    expect(events.some((e) => e.eventType === "offer_accepted")).toBe(true);
    expect(events.some((e) => e.eventType === "service_started")).toBe(true);
  });
});

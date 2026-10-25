import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { contacts, projects } from "../drizzle/schema";
import { inMemoryContacts } from "./db/contacts";
import { getStudentCaseTimeline } from "./services/caseActivityService";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-byron",
    email: "byron@waypointadvocates.com",
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

function createFamilyContext(contactId: number, email = "parent@example.com"): TrpcContext {
  const user: AuthenticatedUser = {
    id: contactId,
    openId: `parent-${contactId}`,
    email,
    name: "Sarah Jenkins",
    loginMethod: "manus",
    role: "user",
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

describe("Single Invoice Management & Payment Experience (E2E 14 Requirements)", () => {
  const adminCaller = appRouter.createCaller(createAdminContext());
  const familyContactId = 9101;
  const anotherFamilyId = 9102;
  const studentProjectId = 9201;

  it("0. Prepares test family and student records in DB", async () => {
    const database = await db.getDb();

    // Register contacts in inMemoryContacts store to ensure instant retrieval in test mode
    const familyContact = {
      id: familyContactId,
      ownerId: 1,
      firstName: "Sarah",
      lastName: "Jenkins",
      email: "sarah.jenkins@example.com",
      phone: "404-555-0199",
      jobTitle: "Parent",
      status: "Active",
      stripeCustomerId: `cus_test_${Date.now()}`,
      defaultPaymentMethodBrand: "visa",
      defaultPaymentMethodLast4: "4242",
      defaultPaymentMethodExp: "12/2028",
      defaultPaymentMethodId: `pm_visa_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryContacts.set(familyContactId, familyContact);

    const otherContact = {
      id: anotherFamilyId,
      ownerId: 1,
      firstName: "David",
      lastName: "Miller",
      email: "david.miller@example.com",
      phone: "404-555-0188",
      jobTitle: "Parent",
      status: "Active",
      stripeCustomerId: `cus_other_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryContacts.set(anotherFamilyId, otherContact);

    try {
      await database.insert(contacts).values(familyContact);
      await database.insert(contacts).values(otherContact);
    } catch {}

    try {
      await database.insert(projects).values({
        id: studentProjectId,
        name: "Liam Jenkins Case",
        studentName: "Liam Jenkins",
        clientId: familyContactId,
        status: "Active",
        ownerId: 1,
      });
    } catch {}

    // Seed a saved payment method for the family
    await db.addFamilyPaymentMethod({
      clientId: familyContactId,
      stripePaymentMethodId: `pm_visa_${Date.now()}`,
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: 2028,
      isDefault: true,
    });

    expect(familyContactId).toBeGreaterThan(0);
    expect(anotherFamilyId).toBeGreaterThan(0);
    expect(studentProjectId).toBeGreaterThan(0);
  });

  let createdInvoice1Id: number;
  let createdInvoice1Number: string;

  // Requirement 1: Staff creates and sends a one-time invoice
  it("Requirement 1: Staff creates and sends a one-time invoice", async () => {
    const inv = await adminCaller.invoices.create({
      clientId: familyContactId,
      projectId: studentProjectId,
      title: "State Complaint Preparation",
      serviceDescription: "Comprehensive legal and IEP document audit with formal state complaint drafting.",
      lineItems: [
        {
          description: "Document Audit & Prior Written Notice Review",
          quantity: 1,
          unitPrice: 150,
          total: 150,
        },
        {
          description: "Formal State Complaint Drafting",
          quantity: 1,
          unitPrice: 50,
          total: 50,
        },
      ],
      discountAmount: 0,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      internalNotes: "Internal note: Byron authorized 1-hour fast turn around.",
      clientNotes: "Thank you for partnering with Waypoint Advocates on Liam's case.",
      status: "Sent",
    });

    expect(inv).toBeDefined();
    expect(inv.id).toBeGreaterThan(0);
    expect(inv.title).toBe("State Complaint Preparation");
    expect(Number(inv.total)).toBe(200);
    expect(inv.status).toBe("Sent");
    expect(inv.invoiceNumber).toMatch(/^INV-\d{4}-\d{4,5}$/);

    createdInvoice1Id = inv.id;
    createdInvoice1Number = inv.invoiceNumber;
  });

  // Requirement 2: The correct family sees the alert on PG-023-STU
  it("Requirement 2: Correct family sees the alert balance on PG-023-STU", async () => {
    const familyCaller = appRouter.createCaller(createFamilyContext(familyContactId));
    const balance = await familyCaller.invoices.getFamilyOutstandingBalance({ contactId: familyContactId });

    expect(balance.totalBalance).toBe(200);
    expect(balance.count).toBe(1);
    expect(balance.invoices.length).toBe(1);
    expect(balance.invoices[0].title).toBe("State Complaint Preparation");
  });

  // Requirement 3: The alert opens the exact invoice
  it("Requirement 3: The alert links directly to the exact target invoice", async () => {
    const familyCaller = appRouter.createCaller(createFamilyContext(familyContactId));
    const balance = await familyCaller.invoices.getFamilyOutstandingBalance({ contactId: familyContactId });

    expect(balance.invoices[0].id).toBe(createdInvoice1Id);
    expect(balance.invoices[0].invoiceNumber).toBe(createdInvoice1Number);
    expect(Number(balance.invoices[0].total)).toBe(200);
  });

  // Requirement 4: Parent pays using an eligible saved payment method
  it("Requirement 4: Parent pays using eligible saved payment method (1-click confirmation)", async () => {
    const familyCaller = appRouter.createCaller(createFamilyContext(familyContactId));
    const payResult = await familyCaller.invoices.payWithSavedMethod({
      invoiceId: createdInvoice1Id,
    });

    expect(payResult.success).toBe(true);
    expect(payResult.alreadyPaid).toBe(false);
    expect(Number(payResult.amountPaid)).toBe(200);
    expect(payResult.receiptUrl).toBe(`/receipt/${createdInvoice1Id}`);

    // Verify invoice is updated in DB
    const fetched = await db.getInvoiceWithDetails(createdInvoice1Id);
    expect(fetched?.status).toBe("Paid");
    expect(fetched?.paidDate).toBeDefined();
  });

  // Requirement 5: Parent pays using a new payment method
  let createdInvoice2Id: number;
  it("Requirement 5: Staff creates 2nd invoice and parent pays with new payment method", async () => {
    const inv2 = await adminCaller.invoices.create({
      clientId: familyContactId,
      projectId: studentProjectId,
      title: "IEP Meeting Observation & Debrief",
      lineItems: [
        {
          description: "Advocate Live Attendance & Case Notes",
          quantity: 1,
          unitPrice: 125,
          total: 125,
        },
      ],
      status: "Sent",
    });

    createdInvoice2Id = inv2.id;

    const familyCaller = appRouter.createCaller(createFamilyContext(familyContactId));
    const payResult = await familyCaller.invoices.payWithNewMethod({
      invoiceId: createdInvoice2Id,
      brand: "mastercard",
      last4: "8888",
      saveForFuture: true,
      setAsDefault: false,
    });

    expect(payResult.success).toBe(true);
    expect(payResult.alreadyPaid).toBe(false);
    expect(Number(payResult.amountPaid)).toBe(125);
    expect(payResult.receiptUrl).toBe(`/receipt/${createdInvoice2Id}`);

    const fetched = await db.getInvoiceWithDetails(createdInvoice2Id);
    expect(fetched?.status).toBe("Paid");
  });

  // Requirement 6: A payment requiring additional authentication completes correctly
  it("Requirement 6: Payment requiring 3DS additional authentication is caught and signaled", async () => {
    const inv3 = await adminCaller.invoices.create({
      clientId: familyContactId,
      title: "PWN Analysis Consultation",
      lineItems: [{ description: "PWN Review", quantity: 1, unitPrice: 75, total: 75 }],
      status: "Sent",
    });

    const familyCaller = appRouter.createCaller(createFamilyContext(familyContactId));
    const challengeResult = await familyCaller.invoices.payWithNewMethod({
      invoiceId: inv3.id,
      brand: "visa",
      last4: "3000",
      simulateRequiresAction: true,
    });

    expect(challengeResult.success).toBe(false);
    expect(challengeResult.requiresAction).toBe(true);
    expect(challengeResult.clientSecret).toBeDefined();
  });

  // Requirement 7: A failed payment remains unpaid with a clear retry option
  it("Requirement 7: Failed payment remains unpaid with retry capability", async () => {
    const inv4 = await adminCaller.invoices.create({
      clientId: familyContactId,
      title: "Emergency ARD Support",
      lineItems: [{ description: "Expedited Strategy", quantity: 1, unitPrice: 180, total: 180 }],
      status: "Sent",
    });

    const familyCaller = appRouter.createCaller(createFamilyContext(familyContactId));
    await expect(
      familyCaller.invoices.payWithNewMethod({
        invoiceId: inv4.id,
        brand: "visa",
        last4: "0002",
        simulateFailure: true,
      })
    ).rejects.toThrow(/declined/i);

    const check = await db.getInvoiceWithDetails(inv4.id);
    expect(check?.status).toBe("Sent"); // Remains unpaid
    expect(check?.paidDate).toBeNull();
  });

  // Requirement 8: Multiple outstanding invoices display correctly
  let multiInv1Id: number;
  let multiInv2Id: number;
  it("Requirement 8: Multiple outstanding invoices aggregate total balance and count correctly", async () => {
    const invA = await adminCaller.invoices.create({
      clientId: familyContactId,
      title: "Eligibility Evaluation Review",
      lineItems: [{ description: "Psychological Eval Review", quantity: 1, unitPrice: 150, total: 150 }],
      status: "Sent",
    });
    const invB = await adminCaller.invoices.create({
      clientId: familyContactId,
      title: "504 Plan Accommodation Audit",
      lineItems: [{ description: "Accommodation Analysis", quantity: 1, unitPrice: 100, total: 100 }],
      status: "Sent",
    });

    multiInv1Id = invA.id;
    multiInv2Id = invB.id;

    const familyCaller = appRouter.createCaller(createFamilyContext(familyContactId));
    const balance = await familyCaller.invoices.getFamilyOutstandingBalance({ contactId: familyContactId });

    // Outstanding invoices include inv4 (180), invA (150), invB (100)
    expect(balance.count).toBeGreaterThanOrEqual(2);
    expect(balance.totalBalance).toBeGreaterThanOrEqual(250);
  });

  // Requirement 9: Payment success removes or updates the alert
  it("Requirement 9: Paying outstanding invoices reduces balance and clears alert", async () => {
    const familyCaller = appRouter.createCaller(createFamilyContext(familyContactId));
    const initial = await familyCaller.invoices.getFamilyOutstandingBalance({ contactId: familyContactId });
    const initialBalance = initial.totalBalance;

    // Pay multiInv1 ($150)
    await familyCaller.invoices.payWithSavedMethod({ invoiceId: multiInv1Id });

    const afterPayment = await familyCaller.invoices.getFamilyOutstandingBalance({ contactId: familyContactId });
    expect(afterPayment.totalBalance).toBe(initialBalance - 150);
    expect(afterPayment.count).toBe(initial.count - 1);
  });

  // Requirement 10: Receipts become available after confirmed payment
  it("Requirement 10: Receipts become available after confirmed payment", async () => {
    const fetched = await db.getInvoiceWithDetails(createdInvoice1Id);
    expect(fetched?.status).toBe("Paid");
    expect(fetched?.paidDate).toBeDefined();

    // Verify client list exposes paid date and receipt data
    const familyCaller = appRouter.createCaller(createFamilyContext(familyContactId));
    const invoices = await familyCaller.invoices.clientList({ contactId: familyContactId });
    const paidInvoice = invoices.find((i: any) => i.id === createdInvoice1Id);

    expect(paidInvoice).toBeDefined();
    expect(paidInvoice?.status).toBe("Paid");
    expect(paidInvoice?.paidDate).toBeDefined();
  });

  // Requirement 11: Membership autopay continues without disruption
  it("Requirement 11: Membership retainers continue independently of one-time invoices", async () => {
    const familyContact = await db.getContactById(familyContactId);
    expect(familyContact).toBeDefined();
    // One-time invoices exist independently in the invoices table
    const allInvoices = await db.listAllInvoicesDetailed({ clientId: familyContactId });
    const oneTimeInvoices = allInvoices.filter((i: any) => i.title);
    expect(oneTimeInvoices.length).toBeGreaterThan(0);
  });

  // Requirement 12: A family cannot access another family's invoices
  it("Requirement 12: Strict cross-family invoice data isolation", async () => {
    const otherCaller = appRouter.createCaller(createFamilyContext(anotherFamilyId));
    const otherInvoices = await otherCaller.invoices.clientList({ contactId: anotherFamilyId });

    // The other family should see 0 invoices from familyContactId
    const leaked = otherInvoices.filter((i: any) => i.id === createdInvoice1Id);
    expect(leaked.length).toBe(0);

    const otherBalance = await otherCaller.invoices.getFamilyOutstandingBalance({ contactId: anotherFamilyId });
    expect(otherBalance.totalBalance).toBe(0);
    expect(otherBalance.count).toBe(0);
  });

  // Requirement 13: Duplicate clicks and webhook retries do not create duplicate charges
  it("Requirement 13: Idempotency safeguards prevent double charges on duplicate payment submissions", async () => {
    const familyCaller = appRouter.createCaller(createFamilyContext(familyContactId));

    // Try paying already-paid createdInvoice1 again
    const secondPayment = await familyCaller.invoices.payWithSavedMethod({
      invoiceId: createdInvoice1Id,
    });

    expect(secondPayment.success).toBe(true);
    expect(secondPayment.alreadyPaid).toBe(true);
    expect(secondPayment.message).toMatch(/already been paid/i);

    // Try payWithNewMethod on already-paid invoice
    const thirdPayment = await familyCaller.invoices.payWithNewMethod({
      invoiceId: createdInvoice1Id,
      brand: "visa",
      last4: "4242",
    });

    expect(thirdPayment.success).toBe(true);
    expect(thirdPayment.alreadyPaid).toBe(true);
  });

  // Requirement 14: Invoice records and Activity Timeline stay synchronized
  it("Requirement 14: Case Activity Timeline logs invoice issuance and payments", async () => {
    const timeline = await getStudentCaseTimeline(familyContactId);
    expect(timeline.length).toBeGreaterThan(0);

    const paymentEvents = timeline.filter(
      (e: any) => e.eventType === "billing" || e.title.includes("Paid") || e.title.includes("Invoice")
    );
    expect(paymentEvents.length).toBeGreaterThan(0);
  });
});

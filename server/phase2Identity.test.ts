import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import { inMemoryContacts } from "./db/contacts";
import { contacts, oneTimeInvoices } from "../drizzle/schema";
import type { TrpcContext, AuthenticatedUser } from "./_core/trpc";

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-byron",
    email: "clientcare@waypointadvocates.com",
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

function createParentContext(parentContactId: number, email = "parent@example.com"): TrpcContext {
  const user: AuthenticatedUser = {
    id: parentContactId,
    openId: `parent-${parentContactId}`,
    email,
    name: "Verified Parent",
    loginMethod: "manus",
    role: "client",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    portalContactId: parentContactId,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("Phase 2: Correct Student Portal Identity Verification", () => {
  // Family A: Eleanor Harrison with two children (Lucas & Maya Harrison)
  const parentAId = 8810;
  const studentA1Id = 8811; // Lucas Harrison (5th Grade)
  const studentA2Id = 8812; // Maya Harrison (3rd Grade, Sibling)

  // Family B: Marcus Vance with one child (Chloe Vance)
  const parentBId = 8820;
  const studentBId = 8821;  // Chloe Vance (8th Grade)

  let invoiceAId: number;
  let invoiceBId: number;

  beforeAll(async () => {
    // 1. Register Fictional Family A (Eleanor, Lucas, Maya)
    inMemoryContacts.set(parentAId, {
      id: parentAId,
      ownerId: 1,
      type: "parent",
      firstName: "Eleanor",
      lastName: "Harrison",
      email: "eleanor.harrison@example.com",
      phone: "404-555-0101",
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    inMemoryContacts.set(studentA1Id, {
      id: studentA1Id,
      ownerId: 1,
      type: "student",
      parentContactId: parentAId,
      firstName: "Lucas",
      lastName: "Harrison",
      gradeLevel: "5th Grade",
      caseId: "CASE-HARRISON-LUCAS",
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    inMemoryContacts.set(studentA2Id, {
      id: studentA2Id,
      ownerId: 1,
      type: "student",
      parentContactId: parentAId,
      firstName: "Maya",
      lastName: "Harrison",
      gradeLevel: "3rd Grade",
      caseId: "CASE-HARRISON-MAYA",
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // 2. Register Fictional Family B (Marcus, Chloe)
    inMemoryContacts.set(parentBId, {
      id: parentBId,
      ownerId: 1,
      type: "parent",
      firstName: "Marcus",
      lastName: "Vance",
      email: "marcus.vance@example.com",
      phone: "404-555-0102",
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    inMemoryContacts.set(studentBId, {
      id: studentBId,
      ownerId: 1,
      type: "student",
      parentContactId: parentBId,
      firstName: "Chloe",
      lastName: "Vance",
      gradeLevel: "8th Grade",
      caseId: "CASE-VANCE-CHLOE",
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // 3. Create isolated invoices for Family A and Family B
    const adminCaller = appRouter.createCaller(createAdminContext());
    const invA = await adminCaller.invoices.create({
      clientId: parentAId,
      title: "Harrison Family IEP Advisory Retainer",
      lineItems: [{ description: "Advisory Service", quantity: 1, unitPrice: 350, total: 350 }],
      status: "Sent",
      dueDate: new Date(Date.now() + 86400000 * 7),
    });
    invoiceAId = invA.id;

    const invB = await adminCaller.invoices.create({
      clientId: parentBId,
      title: "Vance Family 504 Plan Audit",
      lineItems: [{ description: "504 Audit", quantity: 1, unitPrice: 200, total: 200 }],
      status: "Sent",
      dueDate: new Date(Date.now() + 86400000 * 5),
    });
    invoiceBId = invB.id;
  });

  // ─── 1. STAFF PREVIEW: STUDENT A DOSSIER OPENS STUDENT A PORTAL ────────────
  it("Verification 1: Staff preview for Student A resolves Lucas Harrison, not Liam Jenkins", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const student = await adminCaller.contacts.detail({ id: studentA1Id });

    expect(student?.contact?.id).toBe(studentA1Id);
    expect(student?.contact?.firstName).toBe("Lucas");
    expect(student?.contact?.lastName).toBe("Harrison");
    expect(student?.contact?.parentContactId).toBe(parentAId);
    expect(student?.contact?.firstName).not.toBe("Liam");
  });

  // ─── 2. STAFF PREVIEW: STUDENT B DOSSIER OPENS STUDENT B PORTAL ────────────
  it("Verification 2: Staff preview for Student B resolves Chloe Vance", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const student = await adminCaller.contacts.detail({ id: studentBId });

    expect(student?.contact?.id).toBe(studentBId);
    expect(student?.contact?.firstName).toBe("Chloe");
    expect(student?.contact?.lastName).toBe("Vance");
    expect(student?.contact?.parentContactId).toBe(parentBId);
    expect(student?.contact?.firstName).not.toBe("Liam");
    expect(student?.contact?.firstName).not.toBe("Lucas");
  });

  // ─── 3. SIBLINGS BELONGING TO SAME FAMILY ARE DISPLAYED ───────────────────
  it("Verification 3: Resolves correct parent and sibling switcher shows both Family A children", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const familyAStudents = await adminCaller.portal.getStudentsForParent({ parentContactId: parentAId });

    expect(familyAStudents.length).toBe(2);
    const names = familyAStudents.map((s) => `${s.firstName} ${s.lastName}`);
    expect(names).toContain("Lucas Harrison");
    expect(names).toContain("Maya Harrison");
  });

  // ─── 4. UNRELATED FAMILY STUDENTS NEVER APPEAR ─────────────────────────────
  it("Verification 4: Family B student (Chloe Vance) never appears in Family A's portal", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const familyAStudents = await adminCaller.portal.getStudentsForParent({ parentContactId: parentAId });

    const studentIds = familyAStudents.map((s) => s.id);
    expect(studentIds).not.toContain(studentBId);

    const familyBStudents = await adminCaller.portal.getStudentsForParent({ parentContactId: parentBId });
    const bStudentIds = familyBStudents.map((s) => s.id);
    expect(bStudentIds).toContain(studentBId);
    expect(bStudentIds).not.toContain(studentA1Id);
    expect(bStudentIds).not.toContain(studentA2Id);
  });

  // ─── 5. AUTHENTICATED PARENT SESSION ACCESS IS STRICTLY CONFINED ───────────
  it("Verification 5: Authenticated parent A cannot access Family B's student records", async () => {
    const parentACaller = appRouter.createCaller(createParentContext(parentAId, "eleanor.harrison@example.com"));

    // Parent A can access their own student's appointments/files
    const appointmentsA = await parentACaller.portal.getStudentAppointments({ studentContactId: studentA1Id });
    expect(Array.isArray(appointmentsA)).toBe(true);

    // Parent A is strictly FORBIDDEN from accessing Family B student
    await expect(
      parentACaller.portal.getStudentAppointments({ studentContactId: studentBId })
    ).rejects.toThrow();

    await expect(
      parentACaller.portal.getStudentFiles({ studentContactId: studentBId })
    ).rejects.toThrow();

    await expect(
      parentACaller.portal.getStudentBilling({ studentContactId: studentBId })
    ).rejects.toThrow();
  });

  // ─── 6. FAMILY-LEVEL BILLING ATTACHES TO CORRECT ACCOUNT ───────────────────
  it("Verification 6: Family-level billing isolates balances and invoices per family", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());

    const balanceA = await adminCaller.invoices.getFamilyOutstandingBalance({ contactId: parentAId });
    expect(balanceA.totalBalance).toBe(350);
    expect(balanceA.count).toBe(1);
    expect(balanceA.invoices[0].id).toBe(invoiceAId);

    const balanceB = await adminCaller.invoices.getFamilyOutstandingBalance({ contactId: parentBId });
    expect(balanceB.totalBalance).toBe(200);
    expect(balanceB.count).toBe(1);
    expect(balanceB.invoices[0].id).toBe(invoiceBId);
  });

  // ─── 7. INVOICE ALERTS REMAIN INTACT & ACCURATE ───────────────────────────
  it("Verification 7: Existing two-state invoice alert logic functions accurately for Family A", async () => {
    const parentACaller = appRouter.createCaller(createParentContext(parentAId));
    const balance = await parentACaller.invoices.getFamilyOutstandingBalance({ contactId: parentAId });

    expect(balance.totalBalance).toBe(350);
    expect(balance.count).toBe(1);
    expect(balance.hasOverdue).toBe(false); // Due date is 7 days in future
    expect(balance.invoices[0].isOverdue).toBe(false);
    expect(Number(balance.invoices[0].total)).toBe(350);
  });

  // ─── 8. PREVENT SAMPLE DATA / LIAM JENKINS FALLBACK FROM SERVER ────────────
  it("Verification 8: Server responses never return hardcoded Liam Jenkins for verified families", async () => {
    const parentBCaller = appRouter.createCaller(createParentContext(parentBId));
    const studentsB = await parentBCaller.portal.getMyStudents();

    expect(studentsB.length).toBe(1);
    expect(studentsB[0].firstName).toBe("Chloe");
    expect(studentsB[0].lastName).toBe("Vance");
    expect(studentsB[0].firstName).not.toBe("Liam");
  });
});

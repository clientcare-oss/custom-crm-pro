import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(id = 1): TrpcContext {
  return {
    user: {
      id,
      openId: `admin-${id}`,
      email: `admin${id}@waypointadvocates.com`,
      name: "Byron Honea",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("PG-024 · Settings & Practice Profile — Client CRM Import Engine", () => {
  it("successfully ingests external CRM clients with auto-generated Case IDs and locations", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const result = await caller.contacts.bulkImport({
      sourceCrm: "HoneyBook",
      duplicateStrategy: "create_new",
      defaultPlanTier: "$105",
      defaultPipelineStage: "Active",
      clients: [
        {
          firstName: "Arthur",
          lastName: "Pendleton",
          email: `arthur.${Date.now()}@pendleton-family.example`,
          phone: "(404) 555-9812",
          city: "Atlanta",
          state: "GA",
          zipCode: "30308",
          company: "Pendleton Household",
          studentFirstName: "Gwen",
          studentLastName: "Pendleton",
          schoolName: "Midtown High",
          gradeLevel: "10th Grade",
          diagnosis: "ADHD, Dyslexia",
          planType: "IEP",
          planTier: "$105",
          notes: "Initial consultation notes imported from HoneyBook.",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.totalProcessed).toBe(1);
    expect(result.importedCount).toBeGreaterThanOrEqual(1);

    // Verify created contacts include Case IDs
    const parentContact = result.createdContacts.find((c) => c.role === "Client");
    expect(parentContact).toBeDefined();
    expect(parentContact?.name).toBe("Arthur Pendleton");
    expect(parentContact?.caseId).toMatch(/^WP-\d{4}-\d+/);

    // Verify linked student was created
    const studentContact = result.createdContacts.find((c) => c.role === "Student");
    expect(studentContact).toBeDefined();
    expect(studentContact?.name).toBe("Gwen Pendleton");
    expect(studentContact?.caseId).toMatch(/^WP-\d{4}-\d+/);
  });

  it("handles duplicate email skipping gracefully when duplicateStrategy is 'skip'", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const sharedEmail = `dup.test.${Date.now()}@example.com`;

    // Step 1: Import initial client
    const firstRun = await caller.contacts.bulkImport({
      sourceCrm: "Dubsado",
      duplicateStrategy: "create_new",
      clients: [
        {
          firstName: "Marcus",
          lastName: "Davenport",
          email: sharedEmail,
          phone: "(678) 555-4321",
          city: "Marietta",
          state: "GA",
          zipCode: "30062",
        },
      ],
    });
    expect(firstRun.importedCount).toBeGreaterThanOrEqual(1);

    // Step 2: Attempt importing duplicate with skip strategy
    const secondRun = await caller.contacts.bulkImport({
      sourceCrm: "Dubsado",
      duplicateStrategy: "skip",
      clients: [
        {
          firstName: "Marcus",
          lastName: "Davenport",
          email: sharedEmail,
          phone: "(678) 555-4321",
          city: "Marietta",
          state: "GA",
        },
      ],
    });

    expect(secondRun.skippedCount).toBe(1);
    expect(secondRun.skippedContacts[0].email).toBe(sharedEmail);
  });

  it("handles duplicate update when duplicateStrategy is 'update'", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const updateEmail = `update.test.${Date.now()}@example.com`;

    // Initial insert
    await caller.contacts.bulkImport({
      sourceCrm: "Clio",
      duplicateStrategy: "create_new",
      clients: [
        {
          firstName: "Helena",
          lastName: "Troy",
          email: updateEmail,
          city: "Decatur",
          state: "GA",
        },
      ],
    });

    // Update run
    const updateRun = await caller.contacts.bulkImport({
      sourceCrm: "Clio",
      duplicateStrategy: "update",
      clients: [
        {
          firstName: "Helena",
          lastName: "Troy",
          email: updateEmail,
          phone: "(404) 555-7799",
          schoolName: "Decatur High School",
          notes: "Updated IEP accommodation review.",
        },
      ],
    });

    expect(updateRun.updatedCount).toBe(1);
    expect(updateRun.updatedContacts[0].name).toBe("Helena Troy");
  });

  it("successfully performs quick 30-second express setup with parent and student names only", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const result = await caller.contacts.expressSetup({
      parentName: "Rebecca Sterling",
      studentName: "Lucas Sterling",
      schoolName: "Chamblee High School",
      gradeLevel: "10th Grade",
      diagnosis: "ADHD Inattentive Type",
      planType: "IEP",
      planTier: "$55",
      notes: "Quick express setup. Email and phone will be collected on upcoming intake call.",
    });

    expect(result.success).toBe(true);
    expect(result.parentName).toBe("Rebecca Sterling");
    expect(result.studentName).toBe("Lucas Sterling");
    expect(result.caseId).toMatch(/^WP-\d{4}-\d+/);
    expect(result.studentContactId).toBeGreaterThan(0);
    expect(result.parentContactId).toBeGreaterThan(0);
    expect(result.workspaceUrl).toContain(`/contacts/${result.studentContactId}`);
    expect(result.meetingWorkspaceUrl).toContain(`/meeting-workspace/${result.studentContactId}`);
  });

  it("successfully performs express setup with strictly parent and student names only (no other fields)", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const result = await caller.contacts.expressSetup({
      parentName: "Derek Washington",
      studentName: "Maya Washington",
    });

    expect(result.success).toBe(true);
    expect(result.parentName).toBe("Derek Washington");
    expect(result.studentName).toBe("Maya Washington");
    expect(result.caseId).toMatch(/^WP-\d{4}-\d+/);
    expect(result.studentContactId).toBeGreaterThan(0);
    expect(result.parentContactId).toBeGreaterThan(0);
    expect(result.workspaceUrl).toBe(`/contacts/${result.studentContactId}`);
    expect(result.meetingWorkspaceUrl).toBe(`/meeting-workspace/${result.studentContactId}`);
  });
});


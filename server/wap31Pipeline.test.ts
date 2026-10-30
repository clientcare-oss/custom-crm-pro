import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { appRouter } from "./routers";
import {
  listPipelineStages,
  upsertPipelineStage,
  reorderPipelineStages,
  archiveOrDeletePipelineStage,
  listPipelineSavedViews,
  upsertPipelineSavedView,
  deletePipelineSavedView,
  listPipelineCards,
  updatePipelineCardStage,
  assignPipelineCardAdvocate,
  transitionOpportunityToActiveAdvocacy,
  resetPipelineTestOverlay,
} from "./db/pipeline";
import {
  saveAutomation,
  listAutomationRuns,
} from "./db/automations";
import { inMemoryContacts } from "./db/contacts";
import { getCaseActivityByStudent } from "./db/caseActivity";
import { upsertCaseCompass, getCaseCompass } from "./db/compass";

function createTestCaller(
  role: "admin" | "advocate" | "client",
  userId?: number,
  name?: string
) {
  const resolvedUserId =
    role === "admin" ? 9060114 : role === "advocate" ? 9060250 : userId || 9099;
  const resolvedOpenId =
    role === "admin"
      ? "user_3HamsO4oLoKLKOnDi9BR16e6RZW"
      : role === "advocate"
      ? "user_3KPhcRBro_wyatt"
      : `test-client-${resolvedUserId}`;
  const resolvedName =
    name ||
    (role === "admin"
      ? "Byron Honea"
      : role === "advocate"
      ? "Wyatt Smith"
      : "Parent User");
  const resolvedEmail =
    role === "admin"
      ? "byron@waypointadvocates.com"
      : role === "advocate"
      ? "wyatt.smith@waypointadvocates.com"
      : "parent@example.com";

  return appRouter.createCaller({
    req: {} as any,
    res: {} as any,
    user: {
      id: resolvedUserId,
      openId: resolvedOpenId,
      name: resolvedName,
      email: resolvedEmail,
      role,
      staffRole:
        role === "admin"
          ? "Owner"
          : role === "advocate"
          ? "Lead IEP Advocate"
          : undefined,
      loginMethod: "clerk",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
  });
}

describe("WAP 3.1: Advocacy Pipeline Functional Completion & HoneyBook Workflow Integration", () => {
  const testContactIds: number[] = [];

  beforeEach(() => {
    resetPipelineTestOverlay();
    while (testContactIds.length > 0) {
      const id = testContactIds.pop()!;
      inMemoryContacts.delete(id);
    }
  });

  async function seedFamilyWithTwoStudents() {
    const parentId = 880001;
    const student1Id = 880002;
    const student2Id = 880003;

    inMemoryContacts.set(parentId, {
      id: parentId,
      firstName: "angela",
      lastName: "TestFamily",
      email: "angela.testfamily@example.com",
      phone: "404-555-0199",
      jobTitle: "Parent",
      contactType: "parent",
      lifecycleStage: "Lead",
      pipelineStage: "Discovery",
      planTier: "Navigator",
      accountStatus: "Active",
      billingStatus: "Current",
      contractStatus: "Pending",
      managerApprovalStatus: "pending",
      assignedAdvocateName: "Byron Honea",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemoryContacts.set(student1Id, {
      id: student1Id,
      firstName: "Jordan",
      lastName: "TestFamily",
      email: "angela.testfamily@example.com",
      parentContactId: parentId,
      jobTitle: "Student",
      contactType: "student",
      caseId: "CASE-WAP31-01",
      schoolName: "Peachtree Elementary",
      countyDistrict: "Fulton County",
      planType: "IEP",
      planTier: "$55",
      lifecycleStage: "Lead",
      pipelineStage: "Discovery",
      accountStatus: "Active",
      billingStatus: "Current",
      contractStatus: "Pending",
      managerApprovalStatus: "pending",
      assignedAdvocateName: "Byron Honea",
      assignedAdvocateInitials: "BH",
      discoveryNotes: "Parent concerned about reading fluency and speech therapy minutes.",
      uploadedDocuments: ["Jordan_IEP_2026.pdf"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    inMemoryContacts.set(student2Id, {
      id: student2Id,
      firstName: "Taylor",
      lastName: "TestFamily",
      email: "angela.testfamily@example.com",
      parentContactId: parentId,
      jobTitle: "Student",
      contactType: "student",
      caseId: "CASE-WAP31-02",
      schoolName: "Peachtree Middle",
      countyDistrict: "Fulton County",
      planType: "504",
      planTier: "Scholarship",
      lifecycleStage: "Client",
      pipelineStage: "Records Review",
      accountStatus: "Renewal Needed",
      billingStatus: "Current",
      contractStatus: "Active",
      managerApprovalStatus: "approved",
      assignedAdvocateName: "Erin Smith",
      assignedAdvocateInitials: "ES",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    testContactIds.push(parentId, student1Id, student2Id);

    // Seed Case Compass for Student 1
    await upsertCaseCompass("CASE-WAP31-01", {
      studentId: student1Id,
      currentStatus: "Reviewing Speech Evaluation",
      ideaRiskLevel: "High",
      whoHasBall: "Advocate",
      nextStep: "Request PWN from district",
    });

    return { parentId, student1Id, student2Id };
  }

  it("1 & 2. Supports both HoneyBook-inspired Opportunity stages and Active Advocacy stages with accurate counts", async () => {
    const stages = await listPipelineStages();
    const opportunityStages = stages.filter((s) => s.pipelineGroup === "opportunity");
    const activeProjectStages = stages.filter(
      (s) => s.pipelineGroup === "active_project"
    );

    expect(opportunityStages.map((s) => s.name)).toEqual(
      expect.arrayContaining([
        "Discovery",
        "Free Session",
        "Proposal (14-Day Exp)",
        "2-Week Follow-Up",
        "30-Day Follow-Up",
        "3-Month Follow-Up",
        "Reconnect Review",
      ])
    );

    expect(activeProjectStages.map((s) => s.name)).toEqual(
      expect.arrayContaining([
        "Intake / Onboarding",
        "Billing & Authorization",
        "Client Upload Tasks",
        "Records Review",
        "School Contact",
        "Meeting Scheduled",
        "State Complaint",
        "Monitoring",
        "Closed",
      ])
    );
  });

  it("3, 4 & 18. Transitions Opportunity to Active Advocacy without duplicating contacts and without altering billing, plans, agreements, or scholarship approval", async () => {
    const { parentId, student1Id } = await seedFamilyWithTwoStudents();
    const countBefore = inMemoryContacts.size;

    const transitionRes = await transitionOpportunityToActiveAdvocacy({
      contactId: student1Id,
      targetStage: "Intake / Onboarding",
      actorName: "Byron Honea",
      actorRole: "admin",
    });

    expect(transitionRes.success).toBe(true);
    expect(transitionRes.preservedIds.studentContactId).toBe(student1Id);
    expect(transitionRes.preservedIds.parentContactId).toBe(parentId);
    expect(inMemoryContacts.size).toBe(countBefore); // Zero duplicate records created

    const updatedStudent = inMemoryContacts.get(student1Id);
    expect(updatedStudent.pipelineStage).toBe("Intake / Onboarding");
    expect(updatedStudent.lifecycleStage).toBe("Client");

    // Verify billing, planTier, contractStatus, and scholarship approval were NOT automatically modified
    expect(updatedStudent.planTier).toBe("$55");
    expect(updatedStudent.billingStatus).toBe("Current");
    expect(updatedStudent.contractStatus).toBe("Pending");
    expect(updatedStudent.managerApprovalStatus).toBe("pending");

    // Verify Discovery Call notes and uploaded files remain attached to the student
    expect(updatedStudent.discoveryNotes).toContain("reading fluency");
    expect(updatedStudent.uploadedDocuments).toContain("Jordan_IEP_2026.pdf");
  });

  it("5. Links multiple students under one family with sibling counts and parent/family metadata", async () => {
    const { parentId, student1Id, student2Id } = await seedFamilyWithTwoStudents();

    const cards = await listPipelineCards();
    const card1 = cards.find((c) => c.id === student1Id)!;
    const card2 = cards.find((c) => c.id === student2Id)!;

    expect(card1).toBeDefined();
    expect(card2).toBeDefined();
    expect(card1.parentContactId).toBe(parentId);
    expect(card2.parentContactId).toBe(parentId);
    expect(card1.parentName).toBe("angela TestFamily");
    expect(card1.siblingCount).toBe(2);
    expect(card1.siblingNames).toContain("Taylor TestFamily");
    expect(card2.siblingCount).toBe(2);
    expect(card2.siblingNames).toContain("Jordan TestFamily");
  });

  it("6 & 7. Supports all pipeline views (Main View, My Work, Leads, Active Projects, Scholarship, Renewals, Plan Views) and enforces personal custom view privacy", async () => {
    const callerByron = createTestCaller("admin", 9001, "Byron Honea");
    const callerErin = createTestCaller("advocate", 9002, "Erin Smith");

    const defaultViews = await callerByron.pipeline.views.list();
    const viewSlugs = defaultViews.map((v) => v.slug);
    expect(viewSlugs).toEqual(
      expect.arrayContaining([
        "all-clients",
        "my-work",
        "leads",
        "active-projects",
        "scholarship",
        "renewals",
        "plan-55",
        "plan-105",
        "family-plan",
        "pay-per-use",
        "on-hold",
      ])
    );

    // Byron creates a private custom view
    await callerByron.pipeline.views.upsert({
      name: "Byron Private Follow-Ups",
      filtersJson: JSON.stringify({ pipelineGroup: "opportunity" }),
      isPinned: true,
      isPrivate: true,
    });

    // Byron creates a shared team view
    await callerByron.pipeline.views.upsert({
      name: "Team Fulton Escalations",
      filtersJson: JSON.stringify({ district: "Fulton County" }),
      isPinned: false,
      isPrivate: false,
    });

    const byronViews = await callerByron.pipeline.views.list();
    const erinViews = await callerErin.pipeline.views.list();

    expect(byronViews.some((v) => v.name === "Byron Private Follow-Ups")).toBe(true);
    expect(erinViews.some((v) => v.name === "Byron Private Follow-Ups")).toBe(false);
    expect(erinViews.some((v) => v.name === "Team Fulton Escalations")).toBe(true);
  });

  it("8 & 9. Supports filtering by advocate, service plan, stage, group, status, search, and sorting", async () => {
    const { student1Id, student2Id } = await seedFamilyWithTwoStudents();

    const byronCards = await listPipelineCards({ advocate: "Byron Honea" });
    expect(byronCards.some((c) => c.id === student1Id)).toBe(true);
    expect(byronCards.some((c) => c.id === student2Id)).toBe(false);

    const scholarshipCards = await listPipelineCards({ planTier: "Scholarship" });
    expect(scholarshipCards.some((c) => c.id === student2Id)).toBe(true);
    expect(scholarshipCards.some((c) => c.id === student1Id)).toBe(false);

    const opportunityCards = await listPipelineCards({ pipelineGroup: "opportunity" });
    expect(opportunityCards.some((c) => c.id === student1Id)).toBe(true);
    expect(opportunityCards.some((c) => c.id === student2Id)).toBe(false);

    const renewalCards = await listPipelineCards({ accountStatus: "Renewal Needed" });
    expect(renewalCards.some((c) => c.id === student2Id)).toBe(true);

    const sortedDesc = await listPipelineCards({
      search: "TestFamily",
      sortField: "name",
      sortDirection: "desc",
    });
    expect(sortedDesc.map((c) => c.fullName)).toEqual([
      "Taylor TestFamily",
      "Jordan TestFamily",
    ]);
  });

  it("10, 15, 16 & 17. Stage movement updates the record, triggers WAP 2.1 stage_changed automations once, logs to Activity Timeline, and preserves Case Compass IDEA risk score", async () => {
    const { student1Id } = await seedFamilyWithTwoStudents();

    // Create an active stage_changed automation for "Meeting Scheduled"
    const autoSave = await saveAutomation({
      name: "WAP 3.1 Stage Move to Meeting Scheduled",
      triggerEvent: "stage_changed",
      triggerConfig: { stageTo: "Meeting Scheduled" },
      isActive: true,
      steps: [
        {
          stepNumber: 1,
          type: "task",
          title: "Prepare parent agenda for {{studentName}}",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_event",
          config: {
            taskTitle: "Prepare parent agenda for {{studentName}}",
            taskPriority: "high",
          },
        },
      ],
    });

    const moveRes = await updatePipelineCardStage({
      contactId: student1Id,
      stage: "Meeting Scheduled",
      actorName: "Byron Honea",
      actorRole: "admin",
    });

    expect(moveRes.success).toBe(true);
    expect(moveRes.stageChanged).toBe(true);
    expect(moveRes.previousStage).toBe("Discovery");
    expect(moveRes.stage).toBe("Meeting Scheduled");

    // Verify Activity Timeline entry was recorded
    const timelineEntries = await getCaseActivityByStudent(student1Id);
    expect(timelineEntries.length).toBeGreaterThanOrEqual(1);
    expect(
      timelineEntries.some((t) => t.title.includes("Meeting Scheduled"))
    ).toBe(true);

    // Verify WAP 2.1 automation executed once for our custom automation
    const runsAfterFirst = await listAutomationRuns({
      automationId: autoSave.id,
    });
    const studentRuns = runsAfterFirst.filter(
      (r) => r.contactId === student1Id && r.automationId === autoSave.id
    );
    expect(studentRuns.length).toBe(1);
    expect(studentRuns[0].status).toBe("completed");

    // Moving to the same stage again does not duplicate automation execution
    await updatePipelineCardStage({
      contactId: student1Id,
      stage: "Meeting Scheduled",
      actorName: "Byron Honea",
      actorRole: "admin",
    });
    const runsAfterDuplicate = await listAutomationRuns({
      automationId: autoSave.id,
    });
    expect(
      runsAfterDuplicate.filter(
        (r) => r.contactId === student1Id && r.automationId === autoSave.id
      ).length
    ).toBe(1);

    // Verify Case Compass risk level remained untouched ("High")
    const compassAfter = await getCaseCompass("CASE-WAP31-01", student1Id);
    expect(compassAfter?.ideaRiskLevel).toBe("High");
  });

  it("11 & 12. Stage management (add, rename, reorder, archive) works and migrates cards without orphaning records", async () => {
    const { student1Id } = await seedFamilyWithTwoStudents();

    // Add a custom stage
    const added = await upsertPipelineStage({
      name: "MDR Strategy Session",
      pipelineGroup: "active_project",
      category: "escalation",
      accentColor: "#F87171",
    });
    expect(added.stage.name).toBe("MDR Strategy Session");

    // Move student1 into the new custom stage
    await updatePipelineCardStage({
      contactId: student1Id,
      stage: "MDR Strategy Session",
      actorName: "Byron Honea",
    });
    expect(inMemoryContacts.get(student1Id)?.pipelineStage).toBe(
      "MDR Strategy Session"
    );

    // Rename the stage -> verify student1's pipelineStage is automatically updated
    await upsertPipelineStage({
      id: added.stage.id,
      name: "Manifestation Determination Review",
      pipelineGroup: "active_project",
    });
    expect(inMemoryContacts.get(student1Id)?.pipelineStage).toBe(
      "Manifestation Determination Review"
    );

    // Reorder stages
    const reordered = await reorderPipelineStages([
      { id: added.stage.id, order: 2 },
      { id: 1, order: 1 },
    ]);
    expect(reordered.find((s) => s.id === added.stage.id)?.order).toBe(2);

    // Archive the custom stage -> verify student1 is safely migrated to a fallback stage (never orphaned)
    const archiveRes = await archiveOrDeletePipelineStage({
      id: added.stage.id,
      mode: "archive",
    });
    expect(archiveRes.success).toBe(true);

    const activeStageNames = (await listPipelineStages())
      .filter((s) => !s.isArchived)
      .map((s) => s.name);
    const currentStudentStage = inMemoryContacts.get(student1Id)?.pipelineStage;
    expect(activeStageNames).toContain(currentStudentStage);
  });

  it("13 & 14. Layout uses responsive wrapping grid with zero horizontal page scrolling and cards link to /students/:id", () => {
    const boardPath = path.resolve(
      __dirname,
      "../client/src/components/pipeline/KanbanBoard.tsx"
    );
    const stageGridPath = path.resolve(
      __dirname,
      "../client/src/components/pipeline/StageOverviewGrid.tsx"
    );
    const cardPath = path.resolve(
      __dirname,
      "../client/src/components/pipeline/KanbanCard.tsx"
    );
    const pagePath = path.resolve(
      __dirname,
      "../client/src/pages/AdvocacyPipeline.tsx"
    );

    const boardSrc = fs.readFileSync(boardPath, "utf-8");
    const stageGridSrc = fs.readFileSync(stageGridPath, "utf-8");
    const cardSrc = fs.readFileSync(cardPath, "utf-8");
    const pageSrc = fs.readFileSync(pagePath, "utf-8");

    // KanbanBoard uses responsive multi-column grid instead of overflow-x-auto horizontal strip
    expect(boardSrc).toContain(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    );
    expect(boardSrc).not.toContain("overflow-x-auto");

    // StageOverviewGrid wraps cleanly without horizontal scrollbar
    expect(stageGridSrc).toContain("grid grid-cols-2 sm:grid-cols-4");
    expect(stageGridSrc).not.toContain("overflow-x-auto");

    // Page container enforces overflow-x-hidden
    expect(pageSrc).toContain("overflow-x-hidden");

    // Clicking a card navigates to Student Workspace (/students/:id)
    expect(cardSrc).toContain("setLocation(`/students/${card.id}`)");
  });

  it("19. Enforces backend permissions: blocks client portal users and restricts stage customization to management", async () => {
    const clientCaller = createTestCaller("client", 9099, "Parent User");
    const advocateCaller = createTestCaller("advocate", 9002, "Erin Smith");
    const adminCaller = createTestCaller("admin", 9001, "Byron Honea");

    // Client portal user cannot view or mutate pipeline
    await expect(clientCaller.pipeline.cards.list()).rejects.toThrow();
    await expect(clientCaller.pipeline.stages.list()).rejects.toThrow();

    // Standard advocate can view pipeline cards & stages, but cannot add/delete pipeline stages
    const advStages = await advocateCaller.pipeline.stages.list();
    expect(advStages.length).toBeGreaterThan(0);

    await expect(
      advocateCaller.pipeline.stages.upsert({
        name: "Unauthorized Advocate Stage",
      })
    ).rejects.toThrow(/Only authorized management/i);

    // Management/Admin can add stages
    const adminAdd = await adminCaller.pipeline.stages.upsert({
      name: "Authorized Management Stage",
      pipelineGroup: "opportunity",
    });
    expect(adminAdd.name).toBe("Authorized Management Stage");
  });

  it("20. Preserves local.sqlite, local.sqlite.bak-wap1a2a, and drizzle/schema.ts untouched", () => {
    const hashFile = (relPath: string) => {
      const fullPath = path.resolve(__dirname, "..", relPath);
      const buf = fs.readFileSync(fullPath);
      return crypto.createHash("sha256").update(buf).digest("hex").toUpperCase();
    };

    expect(hashFile("local.sqlite")).toBe(
      "E9613D3EA6BC63D784B4658AD921C4C9700159039D98076481ED3A276E3A3247"
    );
    expect(hashFile("local.sqlite.bak-wap1a2a")).toBe(
      "BCCE8AC6D4EA6BD4A571BC382E3689505E4AF4A921791458E7441C2FC8060921"
    );
    expect(hashFile("drizzle/schema.ts")).toBe(
      "6A3553C8233CD22835037AA5C2B0A81BEAA8A680BCD05B18161D6B215D287866"
    );
  });
});

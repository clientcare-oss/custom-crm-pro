import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { inMemoryContacts } from "./db/contacts";
import {
  __resetAutomationsStateForTests,
  __resetAutomationsMemoryOnlyForRestartTest,
  getAutomationCreatedTasks,
  getAutomationSentEmails,
  getAutomationAttachedFiles,
  triggerAutomationFlow,
} from "./db/automations";

const require = createRequire(import.meta.url);

function createTestContext(user: {
  id: number;
  openId: string;
  name: string;
  email: string;
  role: "admin" | "user" | "client";
}): TrpcContext {
  return {
    user: {
      ...user,
      loginMethod: "clerk",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: {
      headers: {},
      cookies: {},
    } as any,
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as any,
  };
}

describe("WAP 2.1: Automations Functional Audit & Completion", () => {
  const adminCaller = appRouter.createCaller(
    createTestContext({
      id: 9060114,
      openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
      name: "Byron Honea",
      email: "byron@waypointadvocates.com",
      role: "admin",
    })
  );

  const techCaller = appRouter.createCaller(
    createTestContext({
      id: 9060249,
      openId: "user_3HELy6EVi_kyle_atkins",
      name: "Kyle Atkins",
      email: "kyle@waypointadvocates.com",
      role: "admin",
    })
  );

  const callCenterCaller = appRouter.createCaller(
    createTestContext({
      id: 9060250,
      openId: "user_3KPhcRBro_wyatt",
      name: "Wyatt Smith",
      email: "wyatt.smith@waypointadvocates.com",
      role: "user",
    })
  );

  const clientCaller = appRouter.createCaller(
    createTestContext({
      id: 77701,
      openId: "parent-portal-77701",
      name: "Sarah Sterling",
      email: "sarah.sterling@example.com",
      role: "client",
    })
  );

  beforeEach(() => {
    __resetAutomationsStateForTests();
    // Seed a parent + student pair in inMemoryContacts
    inMemoryContacts.set(701, {
      id: 701,
      ownerId: 1,
      firstName: "Sarah",
      lastName: "Sterling",
      email: "sarah.sterling@example.com",
      phone: "(404) 555-0182",
      jobTitle: "Parent",
      portalAccess: "active",
      accountStatus: "Active",
      contractStatus: "signed",
      caseId: "WP-2026-0701",
    } as any);

    inMemoryContacts.set(702, {
      id: 702,
      ownerId: 1,
      parentContactId: 701,
      firstName: "Lucas",
      lastName: "Sterling",
      email: "sarah.sterling@example.com",
      jobTitle: "Student",
      diagnosis: "Autism Spectrum Disorder, ADHD",
      iepEligibility: "Autism",
      planType: "IEP",
      portalAccess: "active",
      accountStatus: "Active",
      lifecycleStage: "Active",
      pipelineStage: "Discovery",
      contractStatus: "signed",
      assignedAdvocateName: "Byron Honea",
      caseId: "WP-2026-0702",
    } as any);
  });

  it("1. Lists all 9 core Waypoint Advocates automation workflows out of the box", async () => {
    const list = await adminCaller.automations.list();
    expect(list.length).toBeGreaterThanOrEqual(9);

    const triggers = list.map((a) => a.triggerEvent);
    expect(triggers).toContain("lead_form_submitted");
    expect(triggers).toContain("questionnaire_submitted");
    expect(triggers).toContain("meeting_scheduled");
    expect(triggers).toContain("contract_signed");
    expect(triggers).toContain("first_payment_paid");
    expect(triggers).toContain("file_completed");
    expect(triggers).toContain("session_ends");
    expect(triggers).toContain("review_request_point");
    expect(triggers).toContain("stage_changed");
  });

  it("2. Executes New Client Inquiry & Intake workflows with personalized merge tokens and task creation", async () => {
    const res = await triggerAutomationFlow("lead_form_submitted", 702, false, {
      eventKey: "lead_submit_702_1",
    });
    expect(res.success).toBe(true);

    const emails = getAutomationSentEmails();
    expect(emails.length).toBe(1);
    expect(emails[0].toEmail).toBe("sarah.sterling@example.com");
    expect(emails[0].subject).toContain("Lucas Sterling");
    expect(emails[0].body).toContain("Sarah Sterling");
    expect(emails[0].body).toContain("1-833-696-4377");
    expect(emails[0].deliveryMode).toBe("logged_safe");

    const tasks = getAutomationCreatedTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toContain("Review New Family Intake");
    expect(tasks[0].priority).toBe("High");
    expect(tasks[0].assignmentSource).toBe("system_automation");
  });

  it("3. Executes Client Onboarding (contract_signed) and First Payment (first_payment_paid) workflows", async () => {
    await triggerAutomationFlow("contract_signed", 702, false, {
      eventKey: "contract_702_signed",
    });

    const files = getAutomationAttachedFiles();
    expect(files.length).toBe(1);
    expect(files[0].fileName).toContain("FERPA Release");

    const emails = getAutomationSentEmails();
    expect(emails.some((e) => e.subject.includes("Lucas Sterling"))).toBe(true);

    await triggerAutomationFlow("first_payment_paid", 702, false, {
      eventKey: "payment_702_first",
    });

    const tasks = getAutomationCreatedTasks();
    expect(
      tasks.some((t) => t.title.includes("Notify School of Advocate"))
    ).toBe(true);
    expect(
      tasks.some((t) => t.title.includes("Verify Billing Authorization"))
    ).toBe(true);
  });

  it("4. Executes Meeting Scheduled & Session Ends workflows with accurate before_event and after_event due dates", async () => {
    const futureMeetingDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await triggerAutomationFlow("meeting_scheduled", 702, false, {
      eventKey: "apt_sched_702",
      meetingType: "First IEP Meeting",
      meetingTitle: "Lucas Sterling Initial IEP Meeting",
      eventDate: futureMeetingDate,
    });

    const tasksAfterSched = getAutomationCreatedTasks();
    const prepTask = tasksAfterSched.find((t) =>
      t.title.includes("Prepare Pre-Meeting Strategy Brief")
    );
    expect(prepTask).toBeDefined();
    // Should be scheduled 1 day BEFORE the meeting date (approx 6 days from now)
    const diffDays =
      (futureMeetingDate.getTime() - prepTask!.dueDate.getTime()) /
      (24 * 60 * 60 * 1000);
    expect(Math.round(diffDays)).toBe(1);

    // Now complete the session and trigger review_request_point
    await triggerAutomationFlow("session_ends", 702, false, {
      eventKey: "apt_end_702",
      meetingType: "First IEP Meeting",
      eventDate: new Date(),
    });
    await triggerAutomationFlow("review_request_point", 702, false, {
      eventKey: "apt_review_702",
      meetingType: "First IEP Meeting",
      eventDate: new Date(),
    });

    const allTasks = getAutomationCreatedTasks();
    expect(
      allTasks.some((t) => t.title.includes("Update Waypoint Case Compass"))
    ).toBe(true);
    expect(
      allTasks.some((t) => t.title.includes("Verify Family Review Tracker"))
    ).toBe(true);

    const allEmails = getAutomationSentEmails();
    expect(
      allEmails.some((e) =>
        e.body.includes("https://g.page/r/waypoint-advocates/review")
      )
    ).toBe(true);
  });

  it("5. Evaluates step-level and workflow-level conditions accurately and skips non-matching steps", async () => {
    // Save a custom automation with conditions
    const saved = await adminCaller.automations.save({
      name: "Conditional Autism & Signed Contract Check",
      description: "Only runs when student has Autism tag and contract is signed",
      triggerEvent: "tags_added",
      isActive: true,
      triggerConfig: { meetingType: "Any Meeting" },
      steps: [
        {
          type: "task",
          title: "Autism Specialist Review Task",
          delayValue: 1,
          delayUnit: "days",
          delayAnchor: "after_trigger",
          config: {
            taskPriority: "high",
            hasCondition: true,
            conditionField: "student_tag",
            conditionOperator: "contains",
            conditionValue: "Autism",
          },
        },
        {
          type: "task",
          title: "Unsigned Contract Follow-Up (Should Skip)",
          delayValue: 1,
          delayUnit: "days",
          delayAnchor: "after_trigger",
          config: {
            taskPriority: "low",
            hasCondition: true,
            conditionField: "contract_status",
            conditionOperator: "equals",
            conditionValue: "unsigned",
          },
        },
      ],
    });

    expect(saved.id).toBeGreaterThan(0);

    await triggerAutomationFlow("tags_added", 702, false, {
      eventKey: "tag_check_702",
    });

    const tasks = getAutomationCreatedTasks();
    expect(tasks.some((t) => t.title === "Autism Specialist Review Task")).toBe(true);
    expect(
      tasks.some((t) => t.title === "Unsigned Contract Follow-Up (Should Skip)")
    ).toBe(false);

    // Also verify workflow-level meetingType filter skips Discovery Call on "First IEP Meeting" review_request_point
    const reviewSkipRes = await triggerAutomationFlow(
      "review_request_point",
      702,
      false,
      {
        eventKey: "disc_no_review_702",
        meetingType: "Discovery Consultation",
        meetingTitle: "Discovery Call",
      }
    );
    expect(
      reviewSkipRes.logs.some((l) => l.includes("does not match required"))
    ).toBe(true);
  });

  it("6. Prevents duplicate execution when the same CRM event fires multiple times (Idempotency)", async () => {
    const firstRun = await triggerAutomationFlow("file_completed", 702, false, {
      eventKey: "file_upload_unique_99",
      fileName: "Lucas_IEP_2026.pdf",
    });
    expect(firstRun.runsCreated?.length).toBe(1);
    const taskCountAfterFirst = getAutomationCreatedTasks().length;

    // Fire the exact same event again
    const duplicateRun = await triggerAutomationFlow(
      "file_completed",
      702,
      false,
      {
        eventKey: "file_upload_unique_99",
        fileName: "Lucas_IEP_2026.pdf",
      }
    );
    expect(duplicateRun.skippedDuplicate).toBe(true);
    expect(duplicateRun.runsCreated?.length).toBe(0);
    expect(getAutomationCreatedTasks().length).toBe(taskCountAfterFirst);
  });

  it("7. Respects disabled / paused automations and does not execute them", async () => {
    // Pause automation 1009 (stage_changed)
    await adminCaller.automations.toggleActive({
      id: 1009,
      isActive: false,
    });

    const res = await triggerAutomationFlow("stage_changed", 702, false, {
      eventKey: "stage_paused_test",
      stageTo: "Records Review",
    });
    expect(res.runsCreated?.length).toBe(0);
    expect(getAutomationCreatedTasks().length).toBe(0);

    // Re-enable and verify it executes
    await adminCaller.automations.toggleActive({
      id: 1009,
      isActive: true,
    });
    const resActive = await triggerAutomationFlow("stage_changed", 702, false, {
      eventKey: "stage_active_test",
      stageTo: "Records Review",
    });
    expect(resActive.runsCreated?.length).toBe(1);
    expect(getAutomationCreatedTasks().length).toBe(1);
  });

  it("8. Records failed runs in execution history and supports retrying failed runs", async () => {
    await adminCaller.automations.save({
      name: "Retryable Workflow Test",
      description: "Tests failure capture and retry recovery",
      triggerEvent: "session_starts",
      isActive: true,
      steps: [
        {
          type: "task",
          title: "Prepare Session Room [FAIL_TEST]",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: {
            simulateFailure: true,
            failureReason: "Temporary task service timeout",
          },
        },
      ],
    });

    const failedRes = await triggerAutomationFlow("session_starts", 702, false, {
      eventKey: "session_start_fail_1",
    });
    expect(failedRes.success).toBe(false);

    const runs = await adminCaller.automations.listRuns({
      status: "failed",
    });
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe("failed");
    expect(runs[0].errorMessage).toContain("Temporary task service timeout");

    // Now retry the failed run with clearFailureFlags: true
    const retried = await adminCaller.automations.retryRun({
      runId: runs[0].id,
      clearFailureFlags: true,
    });
    expect(retried.success).toBe(true);
    expect(retried.run.status).toBe("completed");
    expect(retried.run.retryCount).toBe(1);
  });

  it("9. Enforces strict staff authorization on automations and workflows routers", async () => {
    // Client portal user must be blocked
    await expect(clientCaller.automations.list()).rejects.toThrow();
    await expect(
      clientCaller.automations.save({
        name: "Unauthorized",
        triggerEvent: "lead_form_submitted",
        isActive: true,
        steps: [],
      })
    ).rejects.toThrow();
    await expect(clientCaller.workflows.list()).rejects.toThrow();

    // Call Center role without automations module permission must be blocked from automations
    await expect(callCenterCaller.automations.list()).rejects.toThrow();

    // Technology role (Victoria) has automations access
    const techList = await techCaller.automations.list();
    expect(techList.length).toBeGreaterThanOrEqual(9);
  });

  it("10. Persists automations, steps, and execution history in SQLite across simulated server restarts", async () => {
    const { DatabaseSync } = require("node:sqlite");
    const sqlite = new DatabaseSync(":memory:");

    sqlite.exec(`
      CREATE TABLE developer_rules (
        tabKey TEXT PRIMARY KEY,
        content TEXT
      );
      CREATE TABLE honeybook_automations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        triggerEvent TEXT NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        triggerConfig TEXT
      );
      CREATE TABLE honeybook_automation_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        automationId INTEGER NOT NULL,
        stepNumber INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        delayValue INTEGER NOT NULL DEFAULT 0,
        delayUnit TEXT NOT NULL DEFAULT 'minutes',
        delayAnchor TEXT NOT NULL DEFAULT 'after_trigger',
        config TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE honeybook_automation_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        automationId INTEGER NOT NULL,
        contactId INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        logText TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const d1Mock = {
      prepare(query: string) {
        const stmt = sqlite.prepare(query);
        return {
          bind(...Values: any[]) {
            const norm = Values.map((v) =>
              v instanceof Date ? v.toISOString() : typeof v === "boolean" ? (v ? 1 : 0) : v ?? null
            );
            return {
              async all() {
                const isSelect = /^\s*select/i.test(query);
                if (isSelect) {
                  return { results: stmt.all(...norm) };
                }
                const info = stmt.run(...norm);
                return {
                  results: [],
                  meta: { last_row_id: Number(info.lastInsertRowid || 0) },
                };
              },
              async run() {
                const info = stmt.run(...norm);
                return {
                  success: true,
                  meta: { last_row_id: Number(info.lastInsertRowid || 0) },
                };
              },
              async first() {
                return stmt.get(...norm) || null;
              },
              async raw() {
                const isSelect = /^\s*select/i.test(query);
                if (isSelect) {
                  const rows = stmt.all(...norm) as Record<string, any>[];
                  return rows.map((r) => Object.values(r));
                }
                stmt.run(...norm);
                return [];
              },
            };
          },
        };
      },
      async exec(query: string) {
        sqlite.exec(query);
      },
      async batch(stmts: any[]) {
        const out = [];
        for (const s of stmts) out.push(await s.all());
        return out;
      },
    };

    (globalThis as any).__CF_ENV_DB__ = d1Mock;
    try {
      __resetAutomationsStateForTests();
      inMemoryContacts.set(702, {
        id: 702,
        ownerId: 1,
        firstName: "Lucas",
        lastName: "Sterling",
        email: "sarah.sterling@example.com",
        jobTitle: "Student",
        diagnosis: "Autism",
        contractStatus: "signed",
      } as any);

      // 1. Save a custom automation and run it
      const saved = await adminCaller.automations.save({
        name: "Persistent SQLite Onboarding Workflow",
        description: "Persisted in honeybook_automations",
        triggerEvent: "all_signatures_collected",
        isActive: true,
        triggerConfig: { meetingType: "Any Meeting" },
        steps: [
          {
            type: "task",
            title: "Persistent Onboarding Task",
            delayValue: 2,
            delayUnit: "days",
            delayAnchor: "after_trigger",
            config: { taskPriority: "high" },
          },
        ],
      });

      await triggerAutomationFlow("all_signatures_collected", 702, false, {
        eventKey: "persist_sig_702",
      });

      // 2. Simulate full server restart by clearing all in-memory maps
      __resetAutomationsMemoryOnlyForRestartTest();

      // 3. Verify automations, steps, runs, and idempotency keys re-hydrate from SQLite!
      const afterRestartList = await adminCaller.automations.list();
      const hydratedAuto = afterRestartList.find(
        (a) => a.name === "Persistent SQLite Onboarding Workflow"
      );
      expect(hydratedAuto).toBeDefined();
      expect(hydratedAuto?.id).toBe(saved.id);
      expect(hydratedAuto?.steps.length).toBe(1);
      expect(hydratedAuto?.steps[0].title).toBe("Persistent Onboarding Task");

      const afterRestartRuns = await adminCaller.automations.listRuns({
        automationId: saved.id,
      });
      expect(afterRestartRuns.length).toBe(1);
      expect(afterRestartRuns[0].status).toBe("completed");
      expect(afterRestartRuns[0].eventKey).toBe("persist_sig_702");

      // 4. Verify duplicate execution is STILL prevented after server restart!
      const dupAfterRestart = await triggerAutomationFlow(
        "all_signatures_collected",
        702,
        false,
        {
          eventKey: "persist_sig_702",
        }
      );
      expect(dupAfterRestart.skippedDuplicate).toBe(true);
    } finally {
      delete (globalThis as any).__CF_ENV_DB__;
      sqlite.close();
    }
  });
});


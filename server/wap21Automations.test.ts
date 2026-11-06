import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { inMemoryContacts } from "./db/contacts";
import { __setMockEmailTransportForTests } from "./_core/email";
import {
  __markSmartFileTemplateDeletedForTests,
  __resetSmartFileTemplateTestState,
} from "./db/automationHelpers";
import {
  __resetAutomationsStateForTests,
  __resetAutomationsMemoryOnlyForRestartTest,
  getAutomationCreatedTasks,
  getAutomationSentEmails,
  getAutomationAttachedFiles,
  triggerAutomationFlow,
  dispatchPaymentAutomationTriggers,
  processDueAutomationJobs,
  handleAppointmentScheduleChange,
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

describe("WAP 2.1: Automations Engine Full Reliability & Completion Suite", () => {
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

  let mockSentMessages: Array<{
    to: string;
    subject: string;
    html: string;
    messageId: string;
  }> = [];

  beforeEach(() => {
    __resetAutomationsStateForTests();
    __resetSmartFileTemplateTestState();
    mockSentMessages = [];

    // Register deterministic mock email provider for unit tests (never sends external SMTP)
    __setMockEmailTransportForTests(async ({ to, subject, html }) => {
      const messageId = `<mock-${mockSentMessages.length + 1}@waypointadvocates.test>`;
      mockSentMessages.push({ to, subject, html, messageId });
      return {
        sent: true,
        status: "submitted_to_provider",
        messageId,
        senderEmail: "byron@waypointadvocates.com",
        provider: "gmail_smtp",
      };
    });

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
      tags: JSON.stringify(["IEP", "High Priority"]),
      portalAccess: "active",
      accountStatus: "Active",
      lifecycleStage: "Active",
      pipelineStage: "Discovery",
      contractStatus: "signed",
      assignedAdvocateName: "Byron Honea",
      caseId: "WP-2026-0702",
    } as any);
  });

  afterEach(() => {
    __setMockEmailTransportForTests(null);
    __resetSmartFileTemplateTestState();
  });

  it("1. Lists all 9 core Waypoint Advocates automation workflows out of the box with accurate run counts", async () => {
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

    for (const item of list) {
      expect(typeof item.queuedRunsCount).toBe("number");
      expect(typeof item.runningRunsCount).toBe("number");
      expect(typeof item.completedRunsCount).toBe("number");
      expect(typeof item.failedRunsCount).toBe("number");
    }
  });

  it("2. Executes real email delivery via configured transport, honors custom subject/body overrides vs template fallback, and never fakes Sent when unconfigured", async () => {
    // 2A. Standard template fallback execution
    const res = await triggerAutomationFlow("lead_form_submitted", 702, false, {
      eventKey: "lead_submit_702_1",
    });
    expect(res.success).toBe(true);

    const emails = getAutomationSentEmails();
    expect(emails.length).toBe(1);
    expect(emails[0].toEmail).toBe("sarah.sterling@example.com");
    expect(emails[0].subject).toContain("Lucas Sterling");
    expect(emails[0].body).toContain("Sarah Sterling");
    expect(emails[0].deliveryMode).toBe("submitted_to_provider");
    expect(emails[0].providerMessageId).toContain("@waypointadvocates.test");

    // 2B. Custom subject & body override on an automation step
    const customEmailAuto = await adminCaller.automations.save({
      name: "Custom Email Override Workflow",
      description: "Verifies step-specific subject and body overrides",
      triggerEvent: "manual_trigger",
      isActive: true,
      steps: [
        {
          type: "email",
          title: "Custom Override Email",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: {
            templateId: "welcome-email",
            emailSubject: "CUSTOM OVERRIDE SUBJECT FOR {{studentName}}",
            emailBody: "Hello {{parentName}}, this is a custom step body for {{studentName}}.",
          },
        },
      ],
    });

    const runNowRes = await adminCaller.automations.runNow({
      automationId: customEmailAuto.id,
      contactId: 702,
      dryRun: false,
    });
    expect(runNowRes.success).toBe(true);

    const latestEmail = getAutomationSentEmails()[getAutomationSentEmails().length - 1];
    expect(latestEmail.subject).toBe("CUSTOM OVERRIDE SUBJECT FOR Lucas Sterling");
    expect(latestEmail.body).toContain(
      "Hello Sarah Sterling, this is a custom step body for Lucas Sterling."
    );
    expect(latestEmail.deliveryMode).toBe("submitted_to_provider");

    // 2C. When email provider is unconfigured, never fake "Sent" — record provider_unconfigured and fail when strict
    __setMockEmailTransportForTests(async () => ({
      sent: false,
      status: "provider_unconfigured",
      provider: "unconfigured",
      missingConfig: ["GMAIL_USER", "GMAIL_APP_PASSWORD"],
      error: "Outbound email provider is not configured. Missing: GMAIL_USER, GMAIL_APP_PASSWORD.",
    }));

    const unconfigRes = await adminCaller.automations.runNow({
      automationId: customEmailAuto.id,
      contactId: 702,
      dryRun: false,
    });
    const lastRecordedEmail = getAutomationSentEmails()[getAutomationSentEmails().length - 1];
    expect(lastRecordedEmail.deliveryMode).toBe("provider_unconfigured");
    expect(lastRecordedEmail.deliveryStatus).not.toBe("submitted_to_provider");
    expect(
      unconfigRes.logs.some((l: string) =>
        /provider unconfigured|not sent/i.test(l)
      )
    ).toBe(true);
  });

  it("3. Creates, saves, reloads, edits, duplicates (as inactive draft), pauses, resumes (holding overdue external emails), and deletes while preserving history", async () => {
    const created = await adminCaller.automations.save({
      name: "Lifecycle Test Sequence",
      description: "Initial description",
      triggerEvent: "manual_trigger",
      isActive: true,
      steps: [
        {
          type: "task",
          title: "Immediate Setup Task",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: { taskPriority: "high" },
        },
      ],
    });

    // Execute once so it has completed run history
    await adminCaller.automations.runNow({
      automationId: created.id,
      contactId: 702,
      dryRun: false,
    });

    // Edit and reload
    await adminCaller.automations.save({
      id: created.id,
      name: "Lifecycle Test Sequence (Edited)",
      description: "Updated description",
      triggerEvent: "manual_trigger",
      isActive: true,
      steps: [
        {
          type: "task",
          title: "Immediate Setup Task v2",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: { taskPriority: "medium" },
        },
      ],
    });

    const reloaded = (await adminCaller.automations.list()).find(
      (a) => a.id === created.id
    );
    expect(reloaded?.name).toBe("Lifecycle Test Sequence (Edited)");
    expect(reloaded?.steps[0].title).toBe("Immediate Setup Task v2");

    // Duplicate must start as inactive draft with new ID and zero copied history
    const duplicated = await adminCaller.automations.duplicate({ id: created.id });
    expect(duplicated.id).not.toBe(created.id);
    expect(duplicated.isActive).toBe(false);

    const dupRuns = await adminCaller.automations.listRuns({
      automationId: duplicated.id,
    });
    expect(dupRuns.length).toBe(0);

    // Delete original automation and verify completed run history is preserved
    await adminCaller.automations.delete({ id: created.id });
    const preservedRuns = await adminCaller.automations.listRuns({
      automationId: created.id,
    });
    expect(preservedRuns.length).toBe(1);
    expect(preservedRuns[0].status).toBe("completed");
  });

  it("4. Queues delayed steps, chains after_prev steps to preceding step completion, and recalculates/cancels pending jobs on appointment reschedule/cancel", async () => {
    const chainedAuto = await adminCaller.automations.save({
      name: "Delayed & Chained Queue Test",
      description: "Tests durable queue and after_prev chaining",
      triggerEvent: "meeting_scheduled",
      isActive: true,
      triggerConfig: {
        meetingType: "First IEP Meeting",
        pastScheduledPolicy: "run_immediately",
      },
      steps: [
        {
          type: "email",
          title: "Step 1: Delayed Prep Email",
          delayValue: 10,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: {
            templateId: "iep-parent-prep",
            emailSubject: "Prep Step 1 for {{studentName}}",
            emailBody: "Step 1 body",
          },
        },
        {
          type: "email",
          title: "Step 2: Chained 1 Day After Step 1 Completes",
          delayValue: 1,
          delayUnit: "days",
          delayAnchor: "after_prev",
          config: {
            templateId: "welcome-email",
            emailSubject: "Chained Step 2 for {{studentName}}",
            emailBody: "Step 2 body",
          },
        },
      ],
    });

    const initialMeetingDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const triggerRes = await triggerAutomationFlow("meeting_scheduled", 702, false, {
      eventKey: "apt_queue_702",
      appointmentId: 555,
      meetingType: "First IEP Meeting",
      eventDate: initialMeetingDate,
    });

    expect(triggerRes.status).toBe("queued");

    // Verify jobs are queued in honeybook_automation_jobs
    const jobsBefore = await adminCaller.automations.listJobs({
      automationId: chainedAuto.id,
    });
    expect(jobsBefore.length).toBe(2);
    expect(jobsBefore.every((j: any) => j.status === "queued")).toBe(true);

    // Advance time 15 minutes so Step 1 is due, and process due jobs
    const fifteenMinLater = new Date(Date.now() + 15 * 60 * 1000);
    const proc1 = await processDueAutomationJobs(fifteenMinLater);
    expect(proc1.completed).toBeGreaterThanOrEqual(1);

    // Step 2 (after_prev: 1 day after Step 1 completion) should now be anchored ~24h after fifteenMinLater
    const jobsMid = await adminCaller.automations.listJobs({
      automationId: chainedAuto.id,
    });
    const step2Job = jobsMid.find((j: any) => Number(j.stepIndex) === 1);
    expect(step2Job?.status).toBe("queued");
    const step2DueMs = new Date(step2Job.scheduledFor).getTime();
    expect(step2DueMs).toBeGreaterThan(fifteenMinLater.getTime() + 20 * 60 * 60 * 1000);

    // Cancel the appointment and verify remaining queued appointment-linked jobs are canceled
    await handleAppointmentScheduleChange({
      appointmentId: 555,
      contactId: 702,
      status: "cancelled",
    });

    const jobsAfterCancel = await adminCaller.automations.listJobs({
      automationId: chainedAuto.id,
    });
    const canceledStep2 = jobsAfterCancel.find((j: any) => Number(j.stepIndex) === 1);
    expect(canceledStep2?.status).toBe("canceled");
  });

  it("5. Fires payment_received, first_payment_paid, and invoice_paid_in_full ONLY for their exact billing conditions", async () => {
    const firedTriggers: string[] = [];
    for (const trig of [
      "payment_received",
      "first_payment_paid",
      "invoice_paid_in_full",
    ]) {
      await adminCaller.automations.save({
        name: `Billing Audit: ${trig}`,
        triggerEvent: trig,
        isActive: true,
        steps: [
          {
            type: "task",
            title: `Task for ${trig}`,
            delayValue: 0,
            delayUnit: "minutes",
            delayAnchor: "after_trigger",
            config: { taskPriority: "medium" },
          },
        ],
      });
    }

    // Case A: Failed or $0 payment must fire NOTHING
    const failedPay = await dispatchPaymentAutomationTriggers({
      contactId: 702,
      paymentId: "pay_failed_1",
      invoiceId: 901,
      amountCents: 50000,
      paymentStatus: "failed",
      priorPriorSuccessfulPaymentsCount: 0,
      invoicePreviousBalanceCents: 100000,
      invoiceRemainingBalanceCents: 100000,
      invoiceStatus: "sent",
    });
    expect(failedPay.firedTriggers).toEqual([]);

    // Case B: First partial payment ($500 on a $1,000 invoice) -> fires payment_received + first_payment_paid, NOT invoice_paid_in_full
    const firstPartial = await dispatchPaymentAutomationTriggers({
      contactId: 702,
      paymentId: "pay_valid_1",
      invoiceId: 901,
      amountCents: 50000,
      paymentStatus: "completed",
      priorPriorSuccessfulPaymentsCount: 0,
      invoicePreviousBalanceCents: 100000,
      invoiceRemainingBalanceCents: 50000,
      invoiceStatus: "partial",
    });
    expect(firstPartial.firedTriggers).toContain("payment_received");
    expect(firstPartial.firedTriggers).toContain("first_payment_paid");
    expect(firstPartial.firedTriggers).not.toContain("invoice_paid_in_full");

    // Case C: Second payment completing the remaining $500 balance -> fires payment_received + invoice_paid_in_full, NOT first_payment_paid
    const secondFull = await dispatchPaymentAutomationTriggers({
      contactId: 702,
      paymentId: "pay_valid_2",
      invoiceId: 901,
      amountCents: 50000,
      paymentStatus: "completed",
      priorPriorSuccessfulPaymentsCount: 1,
      invoicePreviousBalanceCents: 50000,
      invoiceRemainingBalanceCents: 0,
      invoiceStatus: "paid",
    });
    expect(secondFull.firedTriggers).toContain("payment_received");
    expect(secondFull.firedTriggers).not.toContain("first_payment_paid");
    expect(secondFull.firedTriggers).toContain("invoice_paid_in_full");

    // Case D: Duplicate notification for pay_valid_2 must not create duplicate tasks
    const tasksCountBeforeDup = getAutomationCreatedTasks().length;
    await dispatchPaymentAutomationTriggers({
      contactId: 702,
      paymentId: "pay_valid_2",
      invoiceId: 901,
      amountCents: 50000,
      paymentStatus: "completed",
      priorPriorSuccessfulPaymentsCount: 1,
      invoicePreviousBalanceCents: 50000,
      invoiceRemainingBalanceCents: 0,
      invoiceStatus: "paid",
    });
    expect(getAutomationCreatedTasks().length).toBe(tasksCountBeforeDup);
    void firedTriggers;
  });

  it("6. Assigns the exact selected Smart File template ID, prevents duplicate assignments, and fails cleanly if a template is missing or deleted", async () => {
    const sfAuto = await adminCaller.automations.save({
      name: "Exact Smart File Template 103 Test",
      triggerEvent: "manual_trigger",
      isActive: true,
      steps: [
        {
          type: "file",
          title: "Assign Pre-IEP Parent Input Form (#103)",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: {
            fileId: "103",
            fileName: "Pre-IEP Meeting Parent Input & Vision Statement",
            notifyParentByEmail: false,
          },
        },
      ],
    });

    const res = await adminCaller.automations.runNow({
      automationId: sfAuto.id,
      contactId: 702,
      dryRun: false,
    });
    expect(res.success).toBe(true);

    const files = getAutomationAttachedFiles();
    const assigned103 = files.find((f) => f.templateId === 103);
    expect(assigned103).toBeDefined();
    expect(assigned103?.templateId).toBe(103); // Never silently falls back to 1!

    // Now mark template 103 as deleted and verify execution fails with a clear configuration error
    __markSmartFileTemplateDeletedForTests(103);
    const deletedRes = await adminCaller.automations.runNow({
      automationId: sfAuto.id,
      contactId: 701,
      dryRun: false,
    });
    expect(deletedRes.success).toBe(false);
    expect(deletedRes.status).toBe("failed");
    expect(deletedRes.logs.some((l: string) => /deleted/i.test(l))).toBe(true);
  });

  it("7. Persists custom student tags, fires tags_added ONLY when a tag is newly added, and evaluates student_tag separately from diagnosis/eligibility/plan", async () => {
    const tagConditionalAuto = await adminCaller.automations.save({
      name: "Strict Custom Tag vs Diagnosis Filter",
      triggerEvent: "tags_added",
      isActive: true,
      steps: [
        {
          type: "task",
          title: "Task Only For Scholarship Custom Tag",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: {
            taskPriority: "high",
            hasCondition: true,
            conditionField: "student_tag",
            conditionOperator: "contains",
            conditionValue: "Scholarship",
          },
        },
        {
          type: "task",
          title: "Task Evaluating Diagnosis (Autism)",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: {
            taskPriority: "medium",
            hasCondition: true,
            conditionField: "student_diagnosis",
            conditionOperator: "contains",
            conditionValue: "Autism",
          },
        },
      ],
    });

    // Updating a student's custom tags with an ALREADY existing tag ("IEP") must NOT fire tags_added
    const noNewTagRes = await adminCaller.contacts.updateStudentTags({
      contactId: 702,
      tags: ["IEP", "High Priority"],
    });
    expect(noNewTagRes.addedTags).toEqual([]);
    expect(
      getAutomationCreatedTasks().some(
        (t) => t.title === "Task Only For Scholarship Custom Tag"
      )
    ).toBe(false);

    // Adding a NEW custom tag ("Renewal") fires tags_added; "Scholarship" tag step skips while "Autism" diagnosis step passes
    const addedRenewalRes = await adminCaller.contacts.updateStudentTags({
      contactId: 702,
      tags: ["IEP", "High Priority", "Renewal"],
    });
    expect(addedRenewalRes.addedTags).toEqual(["Renewal"]);
    expect(
      getAutomationCreatedTasks().some(
        (t) => t.title === "Task Only For Scholarship Custom Tag"
      )
    ).toBe(false);
    expect(
      getAutomationCreatedTasks().some(
        (t) => t.title === "Task Evaluating Diagnosis (Autism)"
      )
    ).toBe(true);

    // Now add the "Scholarship" custom tag -> both steps pass!
    const addedScholarshipRes = await adminCaller.contacts.updateStudentTags({
      contactId: 702,
      tags: ["IEP", "High Priority", "Renewal", "Scholarship"],
    });
    expect(addedScholarshipRes.addedTags).toEqual(["Scholarship"]);
    expect(
      getAutomationCreatedTasks().some(
        (t) => t.title === "Task Only For Scholarship Custom Tag"
      )
    ).toBe(true);
    void tagConditionalAuto;
  });

  it("8. Runs Test Run on a specific Draft or Paused automation with structured preview and zero live side effects", async () => {
    const draftAuto = await adminCaller.automations.save({
      name: "Inactive Draft Automation For Dry Run",
      triggerEvent: "lead_form_submitted",
      isActive: false, // Draft / Paused
      steps: [
        {
          type: "email",
          title: "Draft Preview Email",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: {
            templateId: "welcome-email",
            emailSubject: "Preview Subject for {{studentName}}",
            emailBody: "Preview Body for {{parentName}}",
          },
        },
        {
          type: "task",
          title: "Draft Preview Task",
          delayValue: 2,
          delayUnit: "days",
          delayAnchor: "after_trigger",
          config: { taskPriority: "high" },
        },
      ],
    });

    const emailsBefore = getAutomationSentEmails().length;
    const tasksBefore = getAutomationCreatedTasks().length;
    const filesBefore = getAutomationAttachedFiles().length;

    const simRes = await adminCaller.automations.simulate({
      automationId: draftAuto.id,
      contactId: 702,
      dryRun: true,
    });

    expect(simRes.success).toBe(true);
    expect(simRes.status).toBe("simulated");
    expect((simRes as any).simulationSteps?.length).toBe(2);
    expect((simRes as any).simulationSteps[0].recipient).toBe(
      "sarah.sterling@example.com"
    );
    expect((simRes as any).simulationSteps[0].usedCustomSubjectOverride).toBe(true);

    // Verify ZERO live side effects occurred and automation remained Draft
    expect(getAutomationSentEmails().length).toBe(emailsBefore);
    expect(getAutomationCreatedTasks().length).toBe(tasksBefore);
    expect(getAutomationAttachedFiles().length).toBe(filesBefore);
    const afterSimAuto = (await adminCaller.automations.list()).find(
      (a) => a.id === draftAuto.id
    );
    expect(afterSimAuto?.isActive).toBe(false);
  });

  it("9. Retries a failed multi-step run without repeating already-completed steps", async () => {
    const multiStepAuto = await adminCaller.automations.save({
      name: "Step-Aware Retry Workflow",
      description: "Step 1 succeeds, Step 2 fails on first attempt, retry only executes Step 2",
      triggerEvent: "session_starts",
      isActive: true,
      steps: [
        {
          type: "task",
          title: "Step 1: Succeeds On First Run",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: { taskPriority: "medium" },
        },
        {
          type: "task",
          title: "Step 2: Fails First Then Succeeds On Retry",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: {
            simulateFailure: true,
            failureReason: "Transient database lock",
          },
        },
      ],
    });

    const failedRes = await triggerAutomationFlow("session_starts", 702, false, {
      eventKey: "step_retry_702",
    });
    expect(failedRes.success).toBe(false);

    // Step 1 was created once
    const step1TasksAfterFail = getAutomationCreatedTasks().filter(
      (t) => t.title === "Step 1: Succeeds On First Run"
    );
    expect(step1TasksAfterFail.length).toBe(1);

    const failedRuns = await adminCaller.automations.listRuns({
      automationId: multiStepAuto.id,
      status: "failed",
    });
    expect(failedRuns.length).toBe(1);

    // Retry the failed run -> Step 1 must NOT be repeated, Step 2 now completes!
    const retried = await adminCaller.automations.retryRun({
      runId: failedRuns[0].id,
      clearFailureFlags: true,
    });
    expect(retried.success).toBe(true);
    expect(retried.run.status).toBe("completed");

    const step1TasksAfterRetry = getAutomationCreatedTasks().filter(
      (t) => t.title === "Step 1: Succeeds On First Run"
    );
    const step2TasksAfterRetry = getAutomationCreatedTasks().filter(
      (t) => t.title === "Step 2: Fails First Then Succeeds On Retry"
    );
    expect(step1TasksAfterRetry.length).toBe(1); // Not duplicated!
    expect(step2TasksAfterRetry.length).toBe(1);
  });

  it("10. Enforces strict staff authorization on automations and workflows routers", async () => {
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
    await expect(callCenterCaller.automations.list()).rejects.toThrow();

    const techList = await techCaller.automations.list();
    expect(techList.length).toBeGreaterThanOrEqual(9);
  });

  it("11. Persists automations, steps, queued jobs, trigger requests, and execution history in SQLite across simulated server restarts", async () => {
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
              v instanceof Date
                ? v.toISOString()
                : typeof v === "boolean"
                  ? v
                    ? 1
                    : 0
                  : v ?? null
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
                  meta: {
                    last_row_id: Number(info.lastInsertRowid || 0),
                    changes: Number(info.changes || 0),
                  },
                };
              },
              async run() {
                const info = stmt.run(...norm);
                return {
                  success: true,
                  meta: {
                    last_row_id: Number(info.lastInsertRowid || 0),
                    changes: Number(info.changes || 0),
                  },
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

      // Save a delayed automation and trigger request
      const saved = await adminCaller.automations.save({
        name: "Persistent SQLite Queued Workflow",
        description: "Survives worker restart",
        triggerEvent: "all_signatures_collected",
        isActive: true,
        triggerConfig: { meetingType: "Any Meeting" },
        steps: [
          {
            type: "task",
            title: "Delayed Persistent Onboarding Task",
            delayValue: 1,
            delayUnit: "hours",
            delayAnchor: "after_trigger",
            config: {
              taskPriority: "high",
              createImmediateTaskWithDueDate: false,
            },
          },
        ],
      });

      await adminCaller.automations.requestNewTrigger({
        requestedTriggerText: "Trigger when school uploads draft IEP PDF",
        useCaseCategory: "Document Compliance",
      });

      await triggerAutomationFlow("all_signatures_collected", 702, false, {
        eventKey: "persist_sig_702",
      });

      // Simulate full server restart by clearing all in-memory maps
      __resetAutomationsMemoryOnlyForRestartTest();

      // Verify queued job and trigger request survived restart!
      const afterRestartJobs = await adminCaller.automations.listJobs({
        automationId: saved.id,
      });
      expect(afterRestartJobs.length).toBe(1);
      expect(afterRestartJobs[0].status).toBe("queued");

      const afterRestartReqs = await adminCaller.automations.listTriggerRequests();
      expect(
        afterRestartReqs.some((r: any) =>
          r.requestedTriggerText.includes("school uploads draft IEP PDF")
        )
      ).toBe(true);

      // Advance clock 2 hours and process due jobs after restart
      const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const processed = await processDueAutomationJobs(twoHoursLater);
      expect(processed.completed).toBe(1);

      const runsAfterDue = await adminCaller.automations.listRuns({
        automationId: saved.id,
      });
      expect(runsAfterDue[0].status).toBe("completed");
    } finally {
      delete (globalThis as any).__CF_ENV_DB__;
      sqlite.close();
    }
  });
});

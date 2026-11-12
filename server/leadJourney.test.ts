import { describe, it, expect } from "vitest";
import {
  checkInquiryMatches,
  createServiceInquiry,
  logCallToExistingLead,
  getHydratedLeadWorkspace,
  listHydratedLeads,
  parseDiscoveryPricingBlob,
  serializeDiscoveryPricingBlob,
} from "./services/leadJourneyService";
import {
  updateInquiryDetails,
  scheduleLeadDiscovery,
  startLeadDiscoveryNow,
  completeLeadDiscovery,
  saveLeadDecision,
  reopenLeadFromClosed,
  advanceOnboardingStep,
  activateClientFromLead,
} from "./services/leadJourneyActions";
import {
  resolvePageId,
  resolveLeadCenterStageId,
  getRegisteredSubpagesForPageId,
} from "../client/src/lib/pageIdRegistry";

describe("Lead Center Complete Journey (Inquiry → Discovery → Decision → Onboarding → Active Client)", () => {
  const ownerId = 1;
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testEmail = `mercer.family.${uniqueSuffix}@example.com`;
  const testPhone = `404555${uniqueSuffix.slice(-4)}`;

  let createdLeadId = 0;
  let createdParentContactId = 0;
  let initialStudentIds: number[] = [];

  it("1. Creates a new service inquiry from the Call Center supporting multiple students & detects duplicates", async () => {
    const result = await createServiceInquiry({
      ownerId,
      parentFirstName: "Elena",
      parentLastName: `Mercer-${uniqueSuffix}`,
      parentPhone: testPhone,
      parentEmail: testEmail,
      preferredContactMethod: "Phone",
      availability: "Weekday mornings 9am–11am",
      students: [
        {
          firstName: "Lucas",
          lastName: `Mercer-${uniqueSuffix}`,
          gradeLevel: "4th Grade",
          schoolName: "Peachtree Elementary",
          iepOr504: "IEP",
        },
        {
          firstName: "Maya",
          lastName: `Mercer-${uniqueSuffix}`,
          gradeLevel: "7th Grade",
          schoolName: "Peachtree Middle",
          iepOr504: "504 Plan",
        },
      ],
      concerns: "School denied reading evaluation and reduced speech therapy minutes.",
      desiredOutcome: "Comprehensive reading support and restored speech services.",
      initialCallNotes: "Inbound call from mother; very organized with recent report cards.",
      actorName: "Byron Honea",
    });

    expect(result.leadId).toBeGreaterThan(0);
    expect(result.parentContactId).toBeGreaterThan(0);
    expect(result.studentContactIds.length).toBe(2);
    expect(result.stage).toBe("inquiry");
    expect(result.confirmationText).toBe("Inquiry saved · Ready for discovery");

    createdLeadId = result.leadId;
    createdParentContactId = result.parentContactId;
    initialStudentIds = result.studentContactIds;

    // Duplicate match detection before creating another record
    const matchCheck = await checkInquiryMatches({
      ownerId,
      parentEmail: testEmail,
      parentPhone: testPhone,
      parentLastName: `Mercer-${uniqueSuffix}`,
    });

    expect(matchCheck.hasExactOrStrongMatch).toBe(true);
    expect(matchCheck.exactMatches.length).toBeGreaterThan(0);
    expect(matchCheck.exactMatches[0].existingLeadId).toBe(createdLeadId);
  });

  it("2. Opens the new inquiry in the Lead Center with separate intake, appointment, and stage states", async () => {
    const workspace = await getHydratedLeadWorkspace(createdLeadId, ownerId);
    expect(workspace).not.toBeNull();
    expect(workspace!.journey.stage).toBe("inquiry");
    expect(workspace!.journey.stageLabel).toBe("New Leads");
    expect(workspace!.journey.intakeCompleted).toBe(true);
    expect(workspace!.journey.appointmentState).toBe("needs_scheduling");
    expect(workspace!.journey.statusSummary).toBe("Needs scheduling");
    expect(workspace!.journey.nextActionLabel).toBe("Schedule discovery");
    expect(workspace!.students.length).toBe(2);
    expect(workspace!.journey.concerns).toContain("School denied reading evaluation");
    expect(workspace!.journey.desiredOutcome).toContain("Comprehensive reading support");
    expect(workspace!.journey.blockingIssues.length).toBe(0);

    // Update inquiry details & send scheduling link (keeps lead in New Leads with Awaiting booking -> Follow up)
    const updated = await updateInquiryDetails({
      ownerId,
      leadId: createdLeadId,
      concerns: "School denied reading evaluation, reduced speech minutes, and proposed placement change.",
      desiredOutcome: "Secure independent educational evaluation (IEE) and appropriate IEP goals.",
      timeZone: "Eastern",
      assignedAdvocate: "Byron Honea",
      sendSchedulingLink: true,
    });
    expect(updated!.journey.concerns).toContain("proposed placement change");
    expect(updated!.journey.stage).toBe("inquiry");
    expect(updated!.journey.schedulingLinkSent).toBe(true);
    expect(updated!.journey.appointmentState).toBe("awaiting_booking");
    expect(updated!.journey.statusSummary).toBe("Awaiting booking");
    expect(updated!.journey.nextActionLabel).toBe("Follow up");
  });

  it("3. Schedules discovery using the appointment system while keeping the lead in New Leads until discovery starts", async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const workspace = await scheduleLeadDiscovery({
      ownerId,
      leadId: createdLeadId,
      startTime: tomorrow,
      durationMinutes: 30,
      assignedAdvocateName: "Byron Honea",
      timeZone: "Eastern",
      notes: "Focus on reading evaluation denial and speech minutes",
    });

    expect(workspace).not.toBeNull();
    // Booking an appointment does NOT move a lead into Discovery!
    expect(workspace!.journey.stage).toBe("inquiry");
    expect(workspace!.journey.discoveryState).toBe("scheduled");
    expect(workspace!.journey.appointmentState).toBe("scheduled");
    expect(workspace!.journey.scheduledAppointment).not.toBeNull();
    expect(workspace!.journey.scheduledAppointment!.formattedDateTimeTz).toContain("ET");
    expect(workspace!.appointments.length).toBe(1);
    expect(workspace!.journey.statusSummary).toContain("Discovery scheduled");
    expect(workspace!.journey.nextActionLabel).toBe("Start discovery");

    // Rescheduling updates the existing appointment without creating duplicates
    const nextDay = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const rescheduled = await scheduleLeadDiscovery({
      ownerId,
      leadId: createdLeadId,
      startTime: nextDay,
      durationMinutes: 30,
      assignedAdvocateName: "Byron Honea",
      timeZone: "Central",
      notes: "Moved to Central time per family request",
    });
    expect(rescheduled!.journey.stage).toBe("inquiry");
    expect(rescheduled!.appointments.length).toBe(1);
    expect(rescheduled!.journey.scheduledAppointment!.formattedDateTimeTz).toContain("CT");
  });

  it("4. Starts discovery now (explicitly moving lead into Discovery), saves draft notes, and offers Resume discovery when interrupted", async () => {
    const started = await startLeadDiscoveryNow({
      ownerId,
      leadId: createdLeadId,
      actorName: "Byron Honea",
    });

    expect(started!.journey.stage).toBe("discovery");
    expect(started!.journey.discoveryState).toBe("in_progress");
    expect(started!.journey.hasStartedDiscovery).toBe(true);
    expect(started!.journey.statusSummary).toBe("Discovery in progress");
    expect(started!.journey.nextActionLabel).toBe("Resume discovery");

    // Verify serializeDiscoveryPricingBlob preserves existing top-level fields and journey metadata
    const merged = serializeDiscoveryPricingBlob(
      started!.discoveryCall.pricingNotes,
      {},
      { selectedPlan: "anchor", customNote: "Draft saved" }
    );
    const parsed = parseDiscoveryPricingBlob(merged);
    expect(parsed.rawObject.selectedPlan).toBe("anchor");
    expect(parsed.journey.stage).toBe("discovery");
    expect(parsed.journey.discoveryState).toBe("in_progress");
  });

  it("5. Records non-completed call outcomes (No answer, Reschedule needed) and keeps the lead in Discovery with attempt history", async () => {
    const afterNoAnswer = await completeLeadDiscovery({
      ownerId,
      leadId: createdLeadId,
      outcome: "no_answer",
      note: "Called at scheduled time; left warm voicemail.",
      nextActionLabel: "Retry the call tomorrow",
      theirStoryNotes: "Draft story notes preserved from preparation.",
      actorName: "Byron Honea",
    });

    // Stage, outcome, and next action remain distinct!
    expect(afterNoAnswer!.journey.stage).toBe("discovery");
    expect(afterNoAnswer!.journey.isClosed).toBe(false);
    expect(afterNoAnswer!.journey.discoveryOutcome).toBe("no_answer");
    expect(afterNoAnswer!.journey.nextActionLabel).toBe("Retry the call tomorrow");
    expect(afterNoAnswer!.journey.callAttempts.length).toBe(1);
    expect(afterNoAnswer!.journey.callAttempts[0].outcome).toBe("no_answer");

    // Record second attempt: Reschedule needed (stores in history instead of overwriting first attempt)
    const afterReschedule = await completeLeadDiscovery({
      ownerId,
      leadId: createdLeadId,
      outcome: "reschedule_needed",
      note: "Parent texted asking to move call to afternoon.",
      nextActionLabel: "Call back at 2:00 PM",
      actorName: "Byron Honea",
    });

    expect(afterReschedule!.journey.stage).toBe("discovery");
    expect(afterReschedule!.journey.callAttempts.length).toBe(2);
    expect(afterReschedule!.journey.callAttempts[0].outcome).toBe("reschedule_needed");
    expect(afterReschedule!.journey.callAttempts[1].outcome).toBe("no_answer");
  });

  it("6. Completes discovery and moves the lead to Decision while preserving all prior call attempts", async () => {
    const completed = await completeLeadDiscovery({
      ownerId,
      leadId: createdLeadId,
      outcome: "completed",
      note: "Full 35-minute consultation with both parents.",
      theirStoryNotes: "Lucas needs reading intervention; Maya needs 504 accommodations enforced.",
      howItWorksNotes: "Explained collaborative data-driven advocacy approach.",
      questionNotes: {
        q1: "Evaluation denied in October",
        q2: "Speech reduced from 60 to 30 mins/month",
      },
      actorName: "Byron Honea",
    });

    expect(completed!.journey.stage).toBe("decision");
    expect(completed!.journey.discoveryState).toBe("completed");
    expect(completed!.journey.discoveryOutcome).toBe("completed");
    expect(completed!.journey.callAttempts.length).toBe(3);
    expect(completed!.discoveryCall.theirStoryNotes).toContain("Lucas needs reading intervention");
  });

  it("7 & 8. Tests all four Decision choices (Needs time, Another conversation, Not proceeding + Reopen, Ready to start) and reconciles follow-ups", async () => {
    // 7A. Needs time (with follow-up date)
    const followUpDate = new Date(Date.now() + 5 * 86400000);
    const needsTimeWs = await saveLeadDecision({
      ownerId,
      leadId: createdLeadId,
      choice: "needs_time",
      reason: "Discussing options with spouse",
      followUpDate,
      note: "Sending plan comparison summary.",
      assignedStaff: "Byron Honea",
    });

    expect(needsTimeWs!.journey.stage).toBe("decision");
    expect(needsTimeWs!.journey.decisionChoice).toBe("needs_time");
    expect(needsTimeWs!.journey.statusSummary).toContain("Needs time");
    expect(needsTimeWs!.journey.nextActionLabel).toContain("Follow up");

    // 7B. Deliberately unscheduled Needs time decision (does not pretend a follow-up date exists)
    const unscheduledWs = await saveLeadDecision({
      ownerId,
      leadId: createdLeadId,
      choice: "needs_time",
      reason: "Waiting on school evaluation date",
      followUpDate: null,
    });
    expect(unscheduledWs!.journey.stage).toBe("decision");
    expect(unscheduledWs!.journey.nextActionDueDate).toBeNull();
    expect(unscheduledWs!.journey.nextActionLabel).toContain("Unscheduled");

    // 7C. Another conversation (preserves original discovery notes!)
    const secondConvDate = new Date(Date.now() + 2 * 86400000);
    const anotherConvWs = await saveLeadDecision({
      ownerId,
      leadId: createdLeadId,
      choice: "another_conversation",
      conversationPurpose: "Q&A with co-parent on Family plan",
      conversationScheduledAt: secondConvDate,
    });
    expect(anotherConvWs!.journey.stage).toBe("decision");
    expect(anotherConvWs!.journey.decisionChoice).toBe("another_conversation");
    expect(anotherConvWs!.discoveryCall.theirStoryNotes).toContain(
      "Lucas needs reading intervention"
    );

    // 7D. Not proceeding (closes lead, reconciles outreach) + Explicit Reopen
    const closedWs = await saveLeadDecision({
      ownerId,
      leadId: createdLeadId,
      choice: "not_proceeding",
      closedReason: "Postponing until next IEP cycle",
      note: "Family asked us to check back next semester.",
    });
    expect(closedWs!.journey.isClosed).toBe(true);
    expect(closedWs!.journey.decisionChoice).toBe("not_proceeding");
    expect(closedWs!.journey.reconciledEvents.length).toBeGreaterThan(0);

    const reopenedWs = await reopenLeadFromClosed({
      ownerId,
      leadId: createdLeadId,
      targetStage: "decision",
      note: "Parent called back ready to move forward now.",
    });
    expect(reopenedWs!.journey.isClosed).toBe(false);
    expect(reopenedWs!.journey.stage).toBe("decision");

    // 7E. Ready to proceed -> Prepares offer in Decision; sending links does not satisfy signed/paid
    const readyWs = await saveLeadDecision({
      ownerId,
      leadId: createdLeadId,
      choice: "ready_to_proceed",
      selectedPlanKey: "family",
      enrollmentMode: "standard",
      paymentStructure: "monthly_autopay",
      billingArrangement: "autopay",
      note: "Selected Family Plan for both children.",
    });

    expect(readyWs!.journey.stage).toBe("decision");
    expect(readyWs!.journey.decisionStatusLabel).toBe("Ready to proceed");
    expect(readyWs!.enrollment.activeOffer).not.toBeNull();
    expect(readyWs!.enrollment.activeOffer.selectedPlanKey).toBe("family");
    expect(readyWs!.journey.offerPrepared).toBe(true);

    // Send offer, agreement link, and purchase link (must NOT mark agreement signed or payment complete)
    const afterSendLinks = await advanceOnboardingStep({
      ownerId,
      leadId: createdLeadId,
      action: "send_offer",
      recipient: testEmail,
      messageContent: "Here is your Family Plan offer.",
    });
    expect(afterSendLinks!.journey.offerSent).toBe(true);
    expect(afterSendLinks!.journey.stage).toBe("decision");
  });

  it("9 & 10. Completes Decision checklist (Offer sent → Agreement signed → Payment complete) to auto-progress to Onboarding, then activates Client without duplicating students", async () => {
    const decisionWs = await getHydratedLeadWorkspace(createdLeadId, ownerId);
    expect(decisionWs!.journey.stage).toBe("decision");

    // Differentiates required vs optional items
    const reqItems = decisionWs!.enrollment.onboardingRequirements.filter(
      (r: any) => r.required
    );
    const optItems = decisionWs!.enrollment.onboardingRequirements.filter(
      (r: any) => !r.required
    );
    expect(reqItems.map((r: any) => r.key)).toEqual([
      "agreement",
      "payment",
      "intake",
    ]);
    expect(optItems.map((r: any) => r.key)).toContain("portal_access");
    expect(optItems.map((r: any) => r.key)).toContain("records_upload");

    // Agreement and payment are not yet completed, so activation is blocked
    expect(decisionWs!.enrollment.canActivate).toBe(false);
    expect(decisionWs!.enrollment.onboardingBlockers.length).toBeGreaterThan(0);
    await expect(
      activateClientFromLead({ ownerId, leadId: createdLeadId })
    ).rejects.toThrow(/Cannot activate client yet/);

    // Complete connected Agreement & Payment steps -> auto-progresses into Onboarding once both are satisfied!
    await advanceOnboardingStep({
      ownerId,
      leadId: createdLeadId,
      action: "mark_agreement_signed",
      signerName: `Elena Mercer-${uniqueSuffix}`,
    });

    const afterPaymentWs = await advanceOnboardingStep({
      ownerId,
      leadId: createdLeadId,
      action: "verify_payment",
      paymentReference: "STRIPE-TEST-OK",
    });

    expect(afterPaymentWs!.journey.stage).toBe("onboarding");
    expect(afterPaymentWs!.enrollment.canActivate).toBe(true);
    expect(afterPaymentWs!.enrollment.onboardingBlockers.length).toBe(0);

    // Activate Client
    const activatedWs = await activateClientFromLead({
      ownerId,
      leadId: createdLeadId,
      actorName: "Byron Honea",
    });

    expect(activatedWs!.journey.stage).toBe("active");
    expect(activatedWs!.lead.status).toBe("Won");
    // Ensure student records were NOT duplicated during onboarding or activation
    expect(activatedWs!.students.length).toBe(2);
    expect(activatedWs!.students.map((s: any) => s.id).sort()).toEqual(
      initialStudentIds.slice().sort()
    );
  });

  it("11. Logs a Call Center note to an existing lead and opens at the exact current stage", async () => {
    await logCallToExistingLead({
      ownerId,
      leadId: createdLeadId,
      callNotes: "Follow-up call logged from Call Center.",
      actorName: "Byron Honea",
    });

    const list = await listHydratedLeads(ownerId);
    const found = list.find((l: any) => l.id === createdLeadId);
    expect(found).toBeDefined();
    expect(found!.parentContactId).toBe(createdParentContactId);
    expect(found!.studentCount).toBe(2);
  });

  it("12. Resolves main Lead Center Page ID (PG-003) and all stage subpage IDs in pageIdRegistry", () => {
    expect(resolvePageId("/leads")?.id).toBe("PG-003");
    expect(resolvePageId("/leads/12/inquiry")?.id).toBe("PG-003-INQ");
    expect(resolvePageId("/leads/12/discovery")?.id).toBe("PG-003-DSC");
    expect(resolvePageId("/leads/12/discovery/session")?.id).toBe("PG-003-SES");
    expect(resolvePageId("/leads/12/decision")?.id).toBe("PG-003-DEC");
    expect(resolvePageId("/leads/12/onboarding")?.id).toBe("PG-003-ONB");

    expect(resolveLeadCenterStageId("inquiry")?.id).toBe("PG-003-INQ");
    expect(resolveLeadCenterStageId("discovery", false)?.id).toBe("PG-003-DSC");
    expect(resolveLeadCenterStageId("discovery", true)?.id).toBe("PG-003-SES");
    expect(resolveLeadCenterStageId("decision")?.id).toBe("PG-003-DEC");
    expect(resolveLeadCenterStageId("onboarding")?.id).toBe("PG-003-ONB");

    const subpages = getRegisteredSubpagesForPageId("PG-003");
    const subIds = subpages.map((s) => s.id);
    expect(subIds).toEqual([
      "PG-003-INQ",
      "PG-003-DSC",
      "PG-003-SES",
      "PG-003-DEC",
      "PG-003-ONB",
    ]);
  });

  it("13. Verifies cold-call discovery started immediately, missed/canceled appointment in New Leads, and single lead record preservation", async () => {
    // Path A: Cold-call lead created with minimal intake, started immediately without booking a future appointment
    const coldSuffix = `${uniqueSuffix}-cold`;
    const coldInquiry = await createServiceInquiry({
      ownerId,
      parentFirstName: "Marcus",
      parentLastName: `Vance-${coldSuffix}`,
      parentPhone: `404777${uniqueSuffix.slice(-4)}`,
      students: [{ firstName: "Eli", lastName: `Vance-${coldSuffix}` }],
      concerns: "",
      desiredOutcome: "",
      actorName: "Byron Honea",
    });

    const coldBeforeStart = await getHydratedLeadWorkspace(coldInquiry.leadId, ownerId);
    expect(coldBeforeStart!.journey.stage).toBe("inquiry");
    expect(coldBeforeStart!.journey.intakeCompleted).toBe(false);
    expect(coldBeforeStart!.journey.statusSummary).toBe("Needs scheduling");
    expect(coldBeforeStart!.journey.nextActionLabel).toBe("Schedule discovery");

    // Start discovery immediately on cold call without scheduling an appointment first
    const coldStarted = await startLeadDiscoveryNow({
      ownerId,
      leadId: coldInquiry.leadId,
      actorName: "Byron Honea",
    });
    expect(coldStarted!.journey.stage).toBe("discovery");
    expect(coldStarted!.journey.statusSummary).toBe("Discovery in progress");
    expect(coldStarted!.journey.nextActionLabel).toBe("Resume discovery");
    expect(coldStarted!.appointments.length).toBe(0);

    // Collect missing intake details during discovery
    const coldIntakeCollected = await updateInquiryDetails({
      ownerId,
      leadId: coldInquiry.leadId,
      concerns: "Collected during live cold-call discovery: speech evaluation needed.",
      desiredOutcome: "Full speech-language evaluation within 60 days.",
    });
    expect(coldIntakeCollected!.journey.stage).toBe("discovery");
    expect(coldIntakeCollected!.journey.intakeCompleted).toBe(true);
    expect(coldIntakeCollected!.journey.statusSummary).toBe("Discovery in progress");
    expect(coldIntakeCollected!.journey.nextActionLabel).toBe("Resume discovery");

    // Path B: Lead in New Leads books appointment, then misses/cancels BEFORE discovery starts -> stays in New Leads with Needs rescheduling -> Reschedule discovery
    const cancelSuffix = `${uniqueSuffix}-cancel`;
    const bookedInquiry = await createServiceInquiry({
      ownerId,
      parentFirstName: "Hannah",
      parentLastName: `Abbott-${cancelSuffix}`,
      parentPhone: `404888${uniqueSuffix.slice(-4)}`,
      students: [{ firstName: "Nora", lastName: `Abbott-${cancelSuffix}` }],
      concerns: "IEP annual review preparation",
      desiredOutcome: "Updated reading accommodations",
      actorName: "Byron Honea",
    });

    await scheduleLeadDiscovery({
      ownerId,
      leadId: bookedInquiry.leadId,
      startTime: new Date(Date.now() + 3600000),
      timeZone: "Eastern",
    });

    const afterCancel = await completeLeadDiscovery({
      ownerId,
      leadId: bookedInquiry.leadId,
      outcome: "cancelled",
      note: "Parent had a work conflict and asked to reschedule.",
    });
    expect(afterCancel!.journey.stage).toBe("inquiry");
    expect(afterCancel!.journey.appointmentState).toBe("needs_rescheduling");
    expect(afterCancel!.journey.statusSummary).toBe("Needs rescheduling");
    expect(afterCancel!.journey.nextActionLabel).toBe("Reschedule discovery");

    // Confirm listHydratedLeads has exactly one lead record for each family with matching status and next action
    const allHydrated = await listHydratedLeads(ownerId);
    const coldLeads = allHydrated.filter((l: any) => l.id === coldInquiry.leadId);
    const cancelLeads = allHydrated.filter((l: any) => l.id === bookedInquiry.leadId);
    expect(coldLeads.length).toBe(1);
    expect(coldLeads[0].stage).toBe("discovery");
    expect(coldLeads[0].statusSummary).toBe("Discovery in progress");
    expect(coldLeads[0].nextActionLabel).toBe("Resume discovery");
    expect(cancelLeads.length).toBe(1);
    expect(cancelLeads[0].stage).toBe("inquiry");
    expect(cancelLeads[0].statusSummary).toBe("Needs rescheduling");
    expect(cancelLeads[0].nextActionLabel).toBe("Reschedule discovery");
  });
});

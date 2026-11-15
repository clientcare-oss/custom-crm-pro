import { afterAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import {
  normalizeEmailForMatch,
  normalizeFullNameForMatch,
  normalizePhoneForMatch,
} from "../shared/doNotServe";
import { _execDnsRunInternal, _execDnsSelectInternal } from "./db/doNotServe";
import * as dbAutomations from "./db/automations";
import { processQuoWebhook } from "./quoWebhook";

function makeCaller(user: Record<string, unknown> | null) {
  return appRouter.createCaller({
    req: { headers: {} } as any,
    res: {} as any,
    user: user as any,
  });
}

const ownerCaller = makeCaller({
  id: 1,
  openId: "test-owner-1",
  name: "Casey Rivers",
  email: "casey.rivers@waypoint.invalid",
  role: "admin",
  timezone: "America/New_York",
});

const advocateCaller = makeCaller({
  id: 2,
  openId: "user_test_emily",
  name: "Taylor Brooks",
  email: "taylor.brooks@waypoint.invalid",
  role: "user",
  timezone: "America/New_York",
});

const callCenterCaller = makeCaller({
  id: 9060250,
  openId: "user_3KPhcRBro_wyatt",
  name: "Wyatt Smith",
  email: "wyatt.smith@waypointadvocates.com",
  role: "user",
  timezone: "America/New_York",
});

const parentCaller = makeCaller({
  id: 77701,
  openId: "user_parent_fictional_dns_test",
  name: "Jamie Bell",
  email: "jamie.bell.dns@example.invalid",
  role: "client",
  loginMethod: "clerk",
});

const publicCaller = makeCaller(null);

const createdEntryIds: number[] = [];
const createdContactIds: number[] = [];
const createdLeadIds: number[] = [];
const createdAutomationIds: number[] = [];
const createdCallLogPhones: string[] = [];

afterAll(async () => {
  for (const autoId of createdAutomationIds) {
    await dbAutomations.deleteAutomation(autoId).catch(() => {});
  }
  for (const entryId of createdEntryIds) {
    await _execDnsRunInternal(`DELETE FROM do_not_serve_alert_seen WHERE entry_id = ?`, [entryId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM do_not_serve_resolutions WHERE entry_id = ?`, [entryId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM do_not_serve_audit_log WHERE entry_id = ?`, [entryId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM do_not_serve_notes WHERE entry_id = ?`, [entryId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM do_not_serve_identifiers WHERE entry_id = ?`, [entryId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM do_not_serve_entries WHERE id = ?`, [entryId]).catch(() => {});
  }
  for (const phone of createdCallLogPhones) {
    await _execDnsRunInternal(`DELETE FROM call_logs WHERE fromNumber LIKE ? OR callerPhone LIKE ?`, [`%${phone.slice(-4)}%`, `%${phone.slice(-4)}%`]).catch(() => {});
    try {
      const { getDb } = await import("./db/connection");
      const { callLogs } = await import("../drizzle/schema");
      const { like } = await import("drizzle-orm");
      const database = await getDb();
      if (database) {
        await database.delete(callLogs).where(like(callLogs.fromNumber, `%${phone.slice(-4)}%`)).catch(() => {});
      }
    } catch {}
  }
  for (const leadId of createdLeadIds) {
    await _execDnsRunInternal(`DELETE FROM leads WHERE id = ?`, [leadId]).catch(() => {});
  }
  for (const contactId of createdContactIds) {
    await _execDnsRunInternal(`DELETE FROM appointments WHERE clientId = ? OR contactId = ?`, [contactId, contactId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM messages WHERE senderId = ? OR recipientId = ?`, [contactId, contactId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM contacts WHERE id = ?`, [contactId]).catch(() => {});
  }
});

describe("Do Not Serve — Shared Normalization & Conservative Name Matching", () => {
  it("normalizes full US and international phone numbers across formatting without partial last-4 matching", () => {
    expect(normalizePhoneForMatch("(202) 555-0142")).toBe("+12025550142");
    expect(normalizePhoneForMatch("202-555-0142")).toBe("+12025550142");
    expect(normalizePhoneForMatch("+1 202 555 0142 ext. 88")).toBe("+12025550142");
    expect(normalizePhoneForMatch("1 (202) 555-0142")).toBe("+12025550142");
    expect(normalizePhoneForMatch("001-202-555-0142")).toBe("+12025550142");
    expect(normalizePhoneForMatch("+44 7700 900123")).toBe("+447700900123");
    expect(normalizePhoneForMatch("0044 7700 900123")).toBe("+447700900123");
    // Rejects last-4 or short fragments
    expect(normalizePhoneForMatch("0142")).toBeNull();
    expect(normalizePhoneForMatch("555-0142")).toBe("5550142");
    expect(normalizePhoneForMatch("555-0142")).not.toBe("+12025550142");
  });

  it("normalizes emails and conservative full names while rejecting single-name tokens", () => {
    expect(normalizeEmailForMatch("  Jamie.Bell+Intake@Example.INVALID ")).toBe(
      "jamie.bell+intake@example.invalid"
    );
    expect(normalizeFullNameForMatch("Dr. Jamie   Bell, Jr.")).toBe("jamie bell");
    // Never matches on first-name-only, surname-only, or generic placeholders
    expect(normalizeFullNameForMatch("Jamie")).toBeNull();
    expect(normalizeFullNameForMatch("Bell")).toBeNull();
    expect(normalizeFullNameForMatch("Unknown Caller")).toBeNull();
  });
});

describe("Do Not Serve — Archive Flow, Staff Register, Permissions & Portal Isolation", () => {
  let parentContactId = 0;
  let secondParentContactId = 0;
  let childContactId = 0;
  let archiveEntryId = 0;

  it("blocks Parent Portal / non-staff accounts from every Do Not Serve endpoint", async () => {
    await expect(parentCaller.doNotServe.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(parentCaller.doNotServe.getContextInfo()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(publicCaller.doNotServe.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps Archive status and Do Not Serve status strictly separate, then blacklists from Archive with automatic stamp", async () => {
    const p1 = await ownerCaller.contacts.create({
      firstName: "Jamie",
      lastName: "Bell",
      phone: "(202) 555-0142",
      email: "jamie.bell.dns@example.invalid",
      secondParentName: "Morgan Bell",
      secondParentPhone: "(202) 555-0143",
      secondParentEmail: "morgan.bell.dns@example.invalid",
      company: "Bell Fictional Household",
      jobTitle: "Parent",
    });
    parentContactId = Number((p1 as any).insertId || (p1 as any).id);
    createdContactIds.push(parentContactId);

    const p2 = await ownerCaller.contacts.create({
      firstName: "Avery",
      lastName: "Bell",
      phone: "(202) 555-0144",
      email: "avery.bell.dns@example.invalid",
      company: "Bell Fictional Household",
      jobTitle: "Parent",
    });
    secondParentContactId = Number((p2 as any).insertId || (p2 as any).id);
    createdContactIds.push(secondParentContactId);

    const child = await ownerCaller.contacts.create({
      firstName: "Riley",
      lastName: "Bell",
      parentContactId,
      company: "Bell Fictional Household",
      jobTitle: "Student",
    });
    childContactId = Number((child as any).insertId || (child as any).id);
    createdContactIds.push(childContactId);

    // 1. Archiving alone does NOT add to Do Not Serve
    await ownerCaller.contacts.archive({ id: parentContactId, reason: "Services concluded" });
    const flagsAfterArchiveOnly = await ownerCaller.doNotServe.getActiveContactFlags();
    expect(flagsAfterArchiveOnly[parentContactId]).toBeUndefined();

    // 2. Blacklist client from Archive (Individual scope default)
    const created = await ownerCaller.doNotServe.createFromArchive({
      contactId: parentContactId,
      reasonSummary: "Owner decision. Refer future service requests to management.",
      additionalNotes: "Line one of detailed context.\n\nLine two with fictional review date Nov 14, 2026.",
      appliesTo: "individual",
      supportingLinks: [
        { label: "Internal incident memo", url: "https://internal.waypoint.invalid/memo/101" },
      ],
    });
    archiveEntryId = created.entryId;
    createdEntryIds.push(archiveEntryId);

    expect(created.entry?.displayName).toBe("Jamie Bell");
    expect(created.entry?.appliesTo).toBe("individual");
    expect(created.entry?.createdByName).toBeTruthy();

    // Duplicate active restriction for the same target is prevented
    await expect(
      ownerCaller.doNotServe.createFromArchive({
        contactId: parentContactId,
        reasonSummary: "Duplicate attempt",
        appliesTo: "individual",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });

    // Unarchiving does NOT silently lift the restriction
    await ownerCaller.contacts.unarchive({ id: parentContactId });
    const flagsAfterUnarchive = await ownerCaller.doNotServe.getActiveContactFlags();
    expect(flagsAfterUnarchive[parentContactId]?.entryId).toBe(archiveEntryId);

    // Re-archive for realism
    await ownerCaller.contacts.archive({ id: parentContactId, reason: "Archived after review" });
  });

  it("respects Individual vs Household scope and conservative name-only matching", async () => {
    // Formatted phone variation hits hard_match
    const phoneMatch = await ownerCaller.doNotServe.evaluateCandidate({
      phone: "+1 202-555-0142",
      targetEntityType: "call_session",
      targetEntityId: "call_test_1",
    });
    expect(phoneMatch.hasActiveMatch).toBe(true);
    expect(phoneMatch.highestTier).toBe("hard_match");
    expect(phoneMatch.holdsAutomatedSends).toBe(true);
    expect(phoneMatch.requiresServiceReview).toBe(true);
    expect(phoneMatch.shouldShowPopup).toBe(true);

    // Under Individual scope, sibling/child or another parent sharing surname is NOT restricted
    const childCheck = await ownerCaller.doNotServe.evaluateCandidate({
      contactId: childContactId,
      fullName: "Riley Bell",
      targetEntityType: "contact",
      targetEntityId: String(childContactId),
    });
    expect(childCheck.hasActiveMatch).toBe(false);

    const otherParentCheck = await ownerCaller.doNotServe.evaluateCandidate({
      phone: "(202) 555-0143",
      fullName: "Morgan Bell",
      targetEntityType: "inquiry",
      targetEntityId: "inq_morgan",
    });
    expect(otherParentCheck.hasActiveMatch).toBe(false);

    // Name-only match produces possible_name_match (does NOT hold automated sends or auto-deny)
    const nameCandidate = await ownerCaller.doNotServe.evaluateCandidate({
      fullName: "jamie   bell",
      phone: "(404) 555-0198",
      email: "different.jamie@example.invalid",
      targetEntityType: "lead",
      targetEntityId: "lead_name_only_1",
    });
    expect(nameCandidate.hasActiveMatch).toBe(true);
    expect(nameCandidate.highestTier).toBe("possible_name_match");
    expect(nameCandidate.holdsAutomatedSends).toBe(false);
    expect(nameCandidate.requiresServiceReview).toBe(false);

    // Resolve "Different person" for that specific inquiry without lifting Jamie Bell's restriction
    await ownerCaller.doNotServe.resolveDifferentPerson({
      entryIds: [archiveEntryId],
      targetEntityType: "lead",
      targetEntityId: "lead_name_only_1",
      identifierFingerprint: nameCandidate.identifierFingerprint,
      eventKey: nameCandidate.eventKey,
      reason: "Verified separate family in Atlanta with distinct phone and email.",
      channel: "lead_center",
    });

    const afterDifferentPerson = await ownerCaller.doNotServe.evaluateCandidate({
      fullName: "jamie bell",
      phone: "(404) 555-0198",
      email: "different.jamie@example.invalid",
      targetEntityType: "lead",
      targetEntityId: "lead_name_only_1",
    });
    expect(afterDifferentPerson.differentPersonResolved).toBe(true);
    expect(afterDifferentPerson.hasActiveMatch).toBe(false);

    // If that inquiry's phone changes to the restricted phone, automatic recheck catches it!
    const afterIdentifierChanged = await ownerCaller.doNotServe.evaluateCandidate({
      fullName: "jamie bell",
      phone: "001 (202) 555-0142",
      email: "different.jamie@example.invalid",
      targetEntityType: "lead",
      targetEntityId: "lead_name_only_1",
    });
    expect(afterIdentifierChanged.hasActiveMatch).toBe(true);
    expect(afterIdentifierChanged.highestTier).toBe("hard_match");
  });

  it("extends matching to linked household contacts only when Household scope is explicitly selected", async () => {
    const detailBefore = await ownerCaller.doNotServe.getDetail({ id: archiveEntryId });
    await ownerCaller.doNotServe.updateEntry({
      id: archiveEntryId,
      expectedVersion: detailBefore.entry.version,
      appliesTo: "household",
      reasonSummary: "Updated summary: household-wide restriction per owner review.",
    });

    const secondParentEval = await ownerCaller.doNotServe.evaluateCandidate({
      phone: "(202) 555-0143",
      targetEntityType: "inquiry",
      targetEntityId: "inq_household_2",
    });
    expect(secondParentEval.hasActiveMatch).toBe(true);
    expect(secondParentEval.highestTier).toBe("hard_match");

    const childEval = await ownerCaller.doNotServe.evaluateCandidate({
      contactId: childContactId,
      targetEntityType: "contact",
      targetEntityId: String(childContactId),
    });
    expect(childEval.hasActiveMatch).toBe(true);
  });

  it("preserves original reason, stamps dated notes, enforces sensitive detail redaction & role permissions", async () => {
    await advocateCaller.doNotServe.addNote({
      entryId: archiveEntryId,
      body: "Follow-up note added by advocate with server timestamp.",
    });

    const fullDetail = await ownerCaller.doNotServe.getDetail({ id: archiveEntryId });
    expect(fullDetail.redactedSensitiveFields).toBe(false);
    expect(fullDetail.entry.originalReasonSummary).toBe(
      "Owner decision. Refer future service requests to management."
    );
    expect(fullDetail.entry.reasonSummary).toBe(
      "Updated summary: household-wide restriction per owner review."
    );
    expect(fullDetail.notes.length).toBeGreaterThanOrEqual(2);
    expect(fullDetail.notes[0].authorName).toBe("Taylor Brooks");

    // Correct note preserves previousBody in audit trail
    await advocateCaller.doNotServe.correctNote({
      entryId: archiveEntryId,
      noteId: fullDetail.notes[0].id,
      body: "Corrected follow-up note with clarified date.",
    });

    // Call Center role can view register & match status, but private reason/notes are redacted
    const callCenterDetail = await callCenterCaller.doNotServe.getDetail({ id: archiveEntryId });
    expect(callCenterDetail.redactedSensitiveFields).toBe(true);
    expect(callCenterDetail.notes).toHaveLength(0);
    expect(callCenterDetail.entry.reasonSummary).toContain("Restricted detail");

    // Non-owner/non-admin cannot lift restriction
    await expect(
      advocateCaller.doNotServe.lift({
        id: archiveEntryId,
        reason: "Attempted unauthorized lift",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("deduplicates pop-up alerts per staff member + event while keeping persistent match indicator", async () => {
    const firstCheck = await callCenterCaller.doNotServe.evaluateCandidate({
      phone: "(202) 555-0142",
      targetEntityType: "call_log",
      targetEntityId: "call_991",
      eventScopeKey: "call_991_inbound",
    });
    expect(firstCheck.hasActiveMatch).toBe(true);
    expect(firstCheck.shouldShowPopup).toBe(true);

    await callCenterCaller.doNotServe.acknowledgeAlert({
      eventKey: firstCheck.eventKey,
      entryIds: [archiveEntryId],
      targetEntityType: "call_log",
      targetEntityId: "call_991",
      identifierFingerprint: firstCheck.identifierFingerprint,
      channel: "call_center",
    });

    const secondCheckSameStaff = await callCenterCaller.doNotServe.evaluateCandidate({
      phone: "(202) 555-0142",
      targetEntityType: "call_log",
      targetEntityId: "call_991",
      eventScopeKey: "call_991_inbound",
    });
    // Pop-up suppressed for same event, but persistent warning indicator stays active!
    expect(secondCheckSameStaff.shouldShowPopup).toBe(false);
    expect(secondCheckSameStaff.hasActiveMatch).toBe(true);

    // Another staff member who hasn't seen this event still receives the pop-up
    const otherStaffCheck = await advocateCaller.doNotServe.evaluateCandidate({
      phone: "(202) 555-0142",
      targetEntityType: "call_log",
      targetEntityId: "call_991",
      eventScopeKey: "call_991_inbound",
    });
    expect(otherStaffCheck.shouldShowPopup).toBe(true);
  });
});

describe("Do Not Serve — Connected Channels, Pre-Send Queue Recheck, Undo, Lift & Merge", () => {
  let manualEntryId = 0;

  it("supports manual non-client entries, immediate Undo ('Added in error'), Lift, and Reactivate", async () => {
    const manual = await advocateCaller.doNotServe.createManual({
      displayName: "Morgan Quinn",
      primaryPhone: "(202) 555-0168",
      primaryEmail: "morgan.quinn.dns@example.invalid",
      reasonSummary: "Added manually for non-client screening test.",
      appliesTo: "individual",
    });
    manualEntryId = manual.entryId;
    createdEntryIds.push(manualEntryId);
    expect(manual.entry?.linkedContactId).toBeNull();
    expect(manual.entry?.sourceType).toBe("manual");

    // Immediate Undo records "Added in error" and transitions to lifted while preserving record
    const undone = await advocateCaller.doNotServe.undoCreate({ id: manualEntryId });
    expect(undone.entry.status).toBe("lifted");
    expect(undone.entry.liftedReason).toBe("Added in error");

    // Lifted entry does not trigger active alerts
    const whileLifted = await ownerCaller.doNotServe.evaluateCandidate({
      phone: "2025550168",
      targetEntityType: "inquiry",
      targetEntityId: "lifted_check_1",
    });
    expect(whileLifted.hasActiveMatch).toBe(false);

    // Owner reactivates with required reason and new server stamp
    const reactivated = await ownerCaller.doNotServe.reactivate({
      id: manualEntryId,
      reason: "Confirmed identity — reactivating restriction.",
    });
    expect(reactivated.entry.status).toBe("active");
    expect(reactivated.entry.reactivatedReason).toBe(
      "Confirmed identity — reactivating restriction."
    );
  });

  it("retains inbound Quo calls/texts & public form submissions while leaking zero restriction data publicly", async () => {
    createdCallLogPhones.push("2025550168");
    const webhookRes = await processQuoWebhook(
      Buffer.from(
        JSON.stringify({
          type: "message.received",
          data: {
            object: {
              id: `msg_dns_test_${Date.now()}`,
              from: "+12025550168",
              to: "+17705550199",
              body: "Hello, inquiring about services.",
              direction: "incoming",
            },
          },
        }),
        "utf8"
      )
    );
    expect(webhookRes.status).toBe(200);
    expect((webhookRes.data as any)?.action).toBe("created");
    expect((webhookRes.data as any)?.doNotServeMatched).toBe(true);

    // Outbound email to a restricted recipient requires explicit Do Not Serve review acknowledgment
    await expect(
      ownerCaller.messages.composeAndSendEmail({
        toEmails: ["morgan.quinn.dns@example.invalid"],
        subject: "Service inquiry follow-up",
        bodyHtml: "<p>Hello</p>",
        bodyText: "Hello",
      })
    ).rejects.toThrow(/DO_NOT_SERVE_REVIEW_REQUIRED/);

    // Public Lead Form submission succeeds cleanly with zero Do Not Serve fields in public response
    const publicFormRes = await publicCaller.leadForms.submit({
      slug: "public-intake",
      parentFirstName: "Morgan",
      parentLastName: "Quinn",
      parentEmail: "morgan.quinn.dns@example.invalid",
      parentPhone: "(202) 555-0168",
      studentFirstName: "jordan",
      studentLastName: "Quinn",
      challenges: "Fictional test submission",
    });
    expect(publicFormRes.success).toBe(true);
    if ((publicFormRes as any).leadId) createdLeadIds.push(Number((publicFormRes as any).leadId));
    if (publicFormRes.parentContactId) createdContactIds.push(Number(publicFormRes.parentContactId));
    if (publicFormRes.studentContactId) createdContactIds.push(Number(publicFormRes.studentContactId));
    const serializedPublic = JSON.stringify(publicFormRes).toLowerCase();
    expect(serializedPublic).not.toContain("do not serve");
    expect(serializedPublic).not.toContain("restricted");
    expect(serializedPublic).not.toContain("blacklist");
  });

  it("gates new bookings without authorized override, then audits explicit owner override", async () => {
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    start.setUTCHours(15, 0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    await expect(
      ownerCaller.appointments.create({
        title: "Restricted Consultation Test",
        startTime: start,
        endTime: end,
        parentName: "Morgan Quinn",
        parentPhone: "(202) 555-0168",
        adminOverride: true,
      })
    ).rejects.toThrow(/DO_NOT_SERVE_REVIEW_REQUIRED/);

    // Non-admin cannot override a hard match
    await expect(
      advocateCaller.doNotServe.recordServiceOverride({
        entryIds: [manualEntryId],
        channel: "appointments_create",
        targetEntityType: "appointment_draft",
        targetEntityId: "apt_override_test",
        identifierFingerprint: "phones:+12025550168",
        reason: "Advocate override attempt",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Owner explicit override succeeds and records audit trail
    const booked = await ownerCaller.appointments.create({
      title: "Authorized Exception Review Call",
      startTime: start,
      endTime: end,
      parentName: "Morgan Quinn",
      parentPhone: "(202) 555-0168",
      adminOverride: true,
      doNotServeOverrideReason: "Owner approved one-time administrative closeout call.",
    });
    expect(booked).toBeTruthy();

    const detail = await ownerCaller.doNotServe.getDetail({ id: manualEntryId });
    expect(detail.auditLog.some((a) => a.action === "service_override")).toBe(true);
  });

  it("rechecks queued automation sends immediately before sending and does not auto-send on Lift", async () => {
    // Create an unrestricted fictional contact first
    const cRes = await ownerCaller.contacts.create({
      firstName: "Avery",
      lastName: "Lane",
      phone: "(202) 555-0181",
      email: "avery.lane.dns@example.invalid",
      company: "Lane Fictional Family",
      jobTitle: "Parent",
    });
    const laneContactId = Number((cRes as any).insertId || (cRes as any).id);
    createdContactIds.push(laneContactId);

    const savedAuto = await dbAutomations.saveAutomation({
      name: `DNS Queue Recheck Test ${Date.now()}`,
      description: "Verifies pre-send Do Not Serve hold on previously queued step",
      triggerEvent: "tag_added",
      isActive: true,
      triggerConfig: {},
      steps: [
        {
          type: "email",
          title: "Delayed Follow-Up Email",
          delayValue: 10,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: {
            subject: "Checking in from Waypoint",
            body: "Hello {{parent_first_name}}, following up on your inquiry.",
          },
        },
      ],
    });
    createdAutomationIds.push(savedAuto.id);

    const t0 = new Date("2026-11-14T14:00:00.000Z");
    const triggerRes = await dbAutomations.triggerAutomationFlow("tag_added", laneContactId, false, {
      eventKey: `dns_queue_test_${Date.now()}`,
      nowOverride: t0,
    });
    const queuedJob = triggerRes.jobsCreated.find((j) => j.automationId === savedAuto.id);
    expect(queuedJob).toBeDefined();
    expect(queuedJob?.status).toBe("queued");

    // Now blacklist Avery Lane AFTER the automation email was already queued!
    const laneRestriction = await ownerCaller.doNotServe.createFromArchive({
      contactId: laneContactId,
      reasonSummary: "Restricted before queued follow-up send.",
      appliesTo: "individual",
    });
    createdEntryIds.push(laneRestriction.entryId);

    // Advance clock past the 10-minute delay -> worker MUST recheck and hold!
    const tSend = new Date("2026-11-14T14:15:00.000Z");
    const workerRes = await dbAutomations.processDueAutomationJobs({ now: tSend });
    expect(workerRes.heldCount).toBeGreaterThanOrEqual(1);
    expect(queuedJob?.status).toBe("held_restricted");

    // Lifting the restriction later does NOT automatically release or send held messages
    await ownerCaller.doNotServe.lift({
      id: laneRestriction.entryId,
      reason: "Lifted after management review.",
    });
    const workerAfterLift = await dbAutomations.processDueAutomationJobs({
      now: new Date("2026-11-14T14:30:00.000Z"),
    });
    expect(queuedJob?.status).toBe("held_restricted");
    expect(workerAfterLift.completedCount).toBe(0);
  });

  it("returns one concise flagged summary for batch imports and preserves restrictions across contact merges", async () => {
    // Batch import containing restricted phone (202) 555-0168 + unrestricted person
    const batchRes = await ownerCaller.contacts.importContactsBatch({
      sourceFormat: "csv",
      rows: [
        {
          rowNumber: 1,
          firstName: "Morgan",
          lastName: "Quinn",
          phones: ["202-555-0168"],
          emails: ["morgan.quinn.import@example.invalid"],
          action: "create_separate",
        },
        {
          rowNumber: 2,
          firstName: "Skyler",
          lastName: "Reed",
          phones: ["(202) 555-0195"],
          emails: ["skyler.reed@example.invalid"],
          action: "create_separate",
        },
      ],
    });
    for (const r of batchRes.results) {
      if (r.contactId) createdContactIds.push(r.contactId);
    }
    expect(batchRes.doNotServeFlaggedRows).toHaveLength(1);
    expect(batchRes.doNotServeFlaggedRows[0].highestTier).toBe("hard_match");

    // Merge a restricted duplicate contact into an unrestricted surviving contact -> restriction transfers!
    const dupA = await ownerCaller.contacts.create({
      firstName: "Devon",
      lastName: "hart",
      phone: "(202) 555-0174",
      email: "devon.hart1@example.invalid",
      jobTitle: "Parent",
    });
    const dupAId = Number((dupA as any).insertId || (dupA as any).id);
    createdContactIds.push(dupAId);

    const dupB = await ownerCaller.contacts.create({
      firstName: "Devon",
      lastName: "Hart",
      phone: "(202) 555-0175",
      email: "devon.hart2@example.invalid",
      jobTitle: "Parent",
    });
    const dupBId = Number((dupB as any).insertId || (dupB as any).id);
    createdContactIds.push(dupBId);

    const dnsDup = await ownerCaller.doNotServe.createFromArchive({
      contactId: dupAId,
      reasonSummary: "Restricted prior to duplicate merge.",
      appliesTo: "individual",
    });
    createdEntryIds.push(dnsDup.entryId);

    const mergeRes = await ownerCaller.doNotServe.mergeContacts({
      sourceContactId: dupAId,
      targetContactId: dupBId,
    });
    expect(mergeRes.transferredEntries).toBeGreaterThanOrEqual(1);

    const evalAfterMerge = await ownerCaller.doNotServe.evaluateCandidate({
      contactId: dupBId,
      targetEntityType: "contact",
      targetEntityId: String(dupBId),
    });
    expect(evalAfterMerge.hasActiveMatch).toBe(true);
    expect(evalAfterMerge.highestTier).toBe("hard_match");
  });
});

import { afterAll, afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { __setMockEmailTransportForTests, sendEmailDetailed } from "./_core/email";
import { _execDnsRunInternal } from "./db/doNotServe";

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

const createdEntryIds: number[] = [];
const createdContactIds: number[] = [];
const createdResourceIds: number[] = [];

afterEach(() => {
  __setMockEmailTransportForTests(null);
});

afterAll(async () => {
  __setMockEmailTransportForTests(null);
  for (const resId of createdResourceIds) {
    await _execDnsRunInternal(`DELETE FROM resources WHERE id = ?`, [resId]).catch(() => {});
  }
  for (const entryId of createdEntryIds) {
    await _execDnsRunInternal(`DELETE FROM do_not_serve_alert_seen WHERE entry_id = ?`, [entryId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM do_not_serve_resolutions WHERE entry_id = ?`, [entryId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM do_not_serve_audit_log WHERE entry_id = ?`, [entryId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM do_not_serve_notes WHERE entry_id = ?`, [entryId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM do_not_serve_identifiers WHERE entry_id = ?`, [entryId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM do_not_serve_entries WHERE id = ?`, [entryId]).catch(() => {});
  }
  for (const contactId of createdContactIds) {
    await _execDnsRunInternal(`DELETE FROM client_review_trackers WHERE parentContactId = ? OR studentContactId = ?`, [contactId, contactId]).catch(() => {});
    await _execDnsRunInternal(`DELETE FROM contacts WHERE id = ?`, [contactId]).catch(() => {});
  }
});

describe("Do Not Serve — Marketing Email Suppression Across Outbound Channels", () => {
  const runTag = `${Date.now().toString(36)}` ;
  const harperEmail = `harper.sloane.${runTag}@example.invalid`;
  const rowanEmail = `rowan.sloane.${runTag}@example.invalid`;
  const kendallEmail = `kendall.brooks.${runTag}@example.invalid`;
  let parentContactId = 0;
  let coParentContactId = 0;
  let studentContactId = 0;
  let restrictionId = 0;
  let resourceId = 0;

  it("blocks all marketing, newsletter, review, and resource emails for blacklisted clients", async () => {
    const p1 = await ownerCaller.contacts.create({
      firstName: "Harper",
      lastName: "Sloane",
      phone: "(202) 555-0131",
      email: harperEmail,
      secondParentName: "Rowan Sloane",
      secondParentPhone: "(202) 555-0132",
      secondParentEmail: rowanEmail,
      company: "Sloane Fictional Household",
      jobTitle: "Parent",
    });
    parentContactId = Number((p1 as any).insertId || (p1 as any).id);
    createdContactIds.push(parentContactId);

    const p2 = await ownerCaller.contacts.create({
      firstName: "Rowan",
      lastName: "Sloane",
      phone: "(202) 555-0132",
      email: rowanEmail,
      company: "Sloane Fictional Household",
      jobTitle: "Parent",
    });
    coParentContactId = Number((p2 as any).insertId || (p2 as any).id);
    createdContactIds.push(coParentContactId);

    const st = await ownerCaller.contacts.create({
      firstName: "Quinn",
      lastName: "Sloane",
      parentContactId,
      email: `quinn.sloane.${runTag}@example.invalid`,
      company: "Sloane Fictional Household",
      jobTitle: "Student",
    });
    studentContactId = Number((st as any).insertId || (st as any).id);
    createdContactIds.push(studentContactId);

    await ownerCaller.contacts.archive({ id: parentContactId, reason: "Archived client" });

    const created = await ownerCaller.doNotServe.createFromArchive({
      contactId: parentContactId,
      reasonSummary: "Blacklisted client — do not send marketing or provide services.",
      additionalNotes: "Ensure zero marketing or review outreach is sent.",
      appliesTo: "individual",
    });
    restrictionId = created.entryId;
    createdEntryIds.push(restrictionId);

    // 1. Direct email transport suppresses marketing email BEFORE invoking provider transport
    let transportCalls = 0;
    __setMockEmailTransportForTests(async () => {
      transportCalls++;
      return {
        sent: true,
        status: "submitted_to_provider",
        messageId: "mock-should-never-fire",
        provider: "Mock SMTP",
      };
    });

    const explicitMarketingRes = await sendEmailDetailed({
      to: `  ${harperEmail.toUpperCase()} `,
      subject: "Spring Practice Update",
      html: "<p>Practice news</p>",
      isMarketing: true,
    });
    expect(explicitMarketingRes.sent).toBe(false);
    expect(explicitMarketingRes.status).toBe("suppressed_do_not_serve");
    expect(explicitMarketingRes.suppressedByDoNotServe).toBe(true);
    expect(transportCalls).toBe(0);

    // Implicit marketing subject ("Monthly Newsletter") is also suppressed automatically
    const newsletterRes = await sendEmailDetailed({
      to: harperEmail,
      subject: "Waypoint Monthly Update & Newsletter",
      html: "<p>Newsletter content</p>",
    });
    expect(newsletterRes.sent).toBe(false);
    expect(newsletterRes.status).toBe("suppressed_do_not_serve");
    expect(transportCalls).toBe(0);

    // 2. Gmail Hub compose blocks marketing email unconditionally — even if doNotServeAcknowledged is true!
    await expect(
      ownerCaller.messages.composeAndSendEmail({
        toEmails: [harperEmail],
        subject: "Seasonal Campaign Offer",
        bodyHtml: "<p>Special offer</p>",
        isMarketing: true,
        doNotServeAcknowledged: true,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // 3. Resource share outreach email is blocked for blacklisted contacts
    const resCreated = await ownerCaller.resources.create({
      name: "Fictional Evaluation Clinic",
      specialty: "Neuropsychology",
      email: "clinic@example.invalid",
    });
    resourceId = Number(resCreated.id);
    createdResourceIds.push(resourceId);

    await expect(
      ownerCaller.resources.share({
        resourceId,
        contactId: parentContactId,
        message: "Sharing this clinic resource.",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // 4. Review solicitation eligibility, opportunity creation, and requestReview are suppressed
    const eligibility = await ownerCaller.reviewTracker.checkEligibility({
      accountId: parentContactId,
    });
    expect(eligibility.isEligible).toBe(false);
    expect(eligibility.currentStatus).toBe("suppressed");

    const oppRes = await ownerCaller.reviewTracker.createOpportunity({
      studentId: studentContactId,
      milestoneTitle: "IEP Meeting Completed",
    });
    expect(oppRes.triggered).toBe(false);

    await expect(
      ownerCaller.reviewTracker.requestReview({
        accountId: parentContactId,
        studentId: studentContactId,
        requestChannel: "email",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does NOT suppress marketing solely on a common/name-only match, and respects Individual vs Household scope", async () => {
    let transportCalls = 0;
    __setMockEmailTransportForTests(async () => {
      transportCalls++;
      return {
        sent: true,
        status: "submitted_to_provider",
        messageId: `mock-allowed-${transportCalls}`,
        provider: "Mock SMTP",
      };
    });

    // Different person who happens to share the name "Harper Sloane" with a completely different email/phone
    const batchFiltered = await ownerCaller.doNotServe.filterMarketingRecipients({
      recipients: [
        {
          key: "blacklisted-harper",
          contactId: parentContactId,
          email: harperEmail,
          fullName: "Harper Sloane",
        },
        {
          key: "name-only-harper",
          email: "other.harper.atlanta@example.invalid",
          phone: "(404) 555-0193",
          fullName: "Harper Sloane",
        },
        {
          key: "separate-coparent-individual-scope",
          contactId: coParentContactId,
          email: rowanEmail,
          phone: "(202) 555-0132",
          fullName: "Rowan Sloane",
        },
      ],
    });

    expect(batchFiltered.suppressed.map((s) => s.recipient.key)).toEqual(["blacklisted-harper"]);
    expect(batchFiltered.allowed.map((a) => a.key)).toEqual([
      "name-only-harper",
      "separate-coparent-individual-scope",
    ]);

    // Switching restriction to Household scope extends marketing suppression to household contacts
    const detail = await ownerCaller.doNotServe.getDetail({ id: restrictionId });
    await ownerCaller.doNotServe.updateEntry({
      id: restrictionId,
      expectedVersion: detail.entry.version,
      appliesTo: "household",
    });

    const householdRes = await sendEmailDetailed({
      to: rowanEmail,
      subject: "Waypoint Monthly Newsletter",
      html: "<p>Household member should now be suppressed</p>",
      isMarketing: true,
    });
    expect(householdRes.sent).toBe(false);
    expect(householdRes.status).toBe("suppressed_do_not_serve");
    expect(transportCalls).toBe(0);
  });

  it("suppresses supporter marketing lists for manual Do Not Serve entries and restores eligibility on Lift", async () => {
    const manual = await ownerCaller.doNotServe.createManual({
      displayName: `Kendall Brooks ${runTag}`,
      primaryEmail: kendallEmail,
      primaryPhone: "(202) 555-0179",
      reasonSummary: "Manual Do Not Serve entry — exclude from supporter campaigns.",
      appliesTo: "individual",
    });
    createdEntryIds.push(manual.entryId);

    await ownerCaller.giving.createSupporter({
      name: `Kendall Brooks ${runTag}`,
      email: kendallEmail,
      phone: "(202) 555-0179",
      supporterType: "Newsletter Subscriber",
    });

    const allMatches = await ownerCaller.giving.listSupporters({
      search: kendallEmail,
    });
    expect(allMatches.length).toBeGreaterThanOrEqual(1);
    expect(allMatches[0].marketingSuppressed).toBe(true);

    const activeMarketingList = await ownerCaller.giving.listSupporters({
      search: kendallEmail,
      excludeMarketingSuppressed: true,
    });
    expect(activeMarketingList).toHaveLength(0);

    // Lifting the restriction restores marketing eligibility while keeping audit history intact
    await ownerCaller.doNotServe.lift({
      id: restrictionId,
      reason: "Management lifted restriction after review.",
    });

    let sentCountAfterLift = 0;
    __setMockEmailTransportForTests(async () => {
      sentCountAfterLift++;
      return {
        sent: true,
        status: "submitted_to_provider",
        messageId: "mock-after-lift",
        provider: "Mock SMTP",
      };
    });

    const afterLiftSend = await sendEmailDetailed({
      to: harperEmail,
      subject: "Spring Practice Update",
      html: "<p>Now permitted after lift</p>",
      isMarketing: true,
    });
    expect(afterLiftSend.sent).toBe(true);
    expect(sentCountAfterLift).toBe(1);

    // Reactivating immediately re-suppresses marketing emails
    const afterLiftDetail = await ownerCaller.doNotServe.getDetail({ id: restrictionId });
    await ownerCaller.doNotServe.reactivate({
      id: restrictionId,
      expectedVersion: afterLiftDetail.entry.version,
      reason: "Reactivating restriction per owner instruction.",
    });

    const afterReactivateSend = await sendEmailDetailed({
      to: harperEmail,
      subject: "Spring Practice Update",
      html: "<p>Blocked again after reactivation</p>",
      isMarketing: true,
    });
    expect(afterReactivateSend.sent).toBe(false);
    expect(afterReactivateSend.status).toBe("suppressed_do_not_serve");
    expect(sentCountAfterLift).toBe(1);
  });
});
